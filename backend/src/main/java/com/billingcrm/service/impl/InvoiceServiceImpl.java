package com.billingcrm.service.impl;

import com.billingcrm.dto.request.InvoiceRequest;
import com.billingcrm.dto.response.InvoiceResponse;
import com.billingcrm.exception.BadRequestException;
import com.billingcrm.exception.ResourceNotFoundException;
import com.billingcrm.mapper.InvoiceMapper;
import com.billingcrm.model.*;
import com.billingcrm.repository.*;
import com.billingcrm.service.InvoiceService;
import com.billingcrm.service.ProductMatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InvoiceServiceImpl implements InvoiceService {

    private static final String DEFAULT_CURRENCY = "INR"; // ₹

    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final InvoiceMapper invoiceMapper;
    private final ProductMatchService productMatchService;
    private final CustomerProductDiscountRepository customerProductDiscountRepository;

    @Override
    public InvoiceResponse create(InvoiceRequest req, Long userId) {

        try {
            // ── 1. Resolve Customer ─────────────────────────────────────────
            Customer customer = resolveCustomer(req, userId);

            // ── 2. Resolve Creator ─────────────────────────────────────────
            User user = userRepository.getReferenceById(userId);

            boolean isB2B = (customer.getTaxId() != null && !customer.getTaxId().isBlank());
            LocalDate issueDate = (req.getIssueDate() != null ? req.getIssueDate() : LocalDate.now());
            LocalDate dueDate = req.getDueDate();
            
            if (dueDate == null && isB2B) {
                dueDate = issueDate.plusMonths(1);
            }

            // ── 3. Build Invoice shell ──────────────────────────────────────
            Invoice invoice = Invoice.builder()
                    .invoiceNumber(generateInvoiceNumber(userId))
                    .customer(customer)
                    .user(user)
                    .currency(req.getCurrency() != null && !req.getCurrency().isBlank()
                            ? req.getCurrency().toUpperCase()
                            : DEFAULT_CURRENCY)
                    .issueDate(issueDate)
                    .dueDate(dueDate)
                    .notes(req.getNotes())
                    .voiceTranscript(req.getVoiceTranscript())
                    .voiceGenerated(req.isVoiceGenerated())
                    .status(parseStatus(req.getStatus(), Invoice.Status.UNPAID))
                    .build();

            // ── 4. Build Line Items ─────────────────────────────────────────
            List<String> errors = new ArrayList<>();
            BigDecimal totalAmount = BigDecimal.ZERO;
            BigDecimal totalGST = BigDecimal.ZERO;
            List<InvoiceItem> items = new ArrayList<>();

            for (int i = 0; i < req.getItems().size(); i++) {
                InvoiceRequest.InvoiceItemDTO itemReq = req.getItems().get(i);
                try {
                    InvoiceItem item = resolveLineItem(itemReq, invoice, userId);
                    items.add(item);
                    totalAmount = totalAmount.add(item.getPrice()
                            .multiply(item.getQuantity()).setScale(2, RoundingMode.HALF_UP));
                    totalGST = totalGST.add(item.getGstAmount());
                } catch (BadRequestException | ResourceNotFoundException ex) {
                    errors.add("Item " + (i + 1) + ": " + ex.getMessage());
                }
            }

            if (!errors.isEmpty()) {
                throw new BadRequestException("Invoice creation failed:\n" + String.join("\n", errors));
            }
            invoice.setItems(items);

            // ── 5. Resolve Targeted Discount ─────────────────────────────────
            BigDecimal discountPercent = BigDecimal.ZERO;
            BigDecimal discountAmount = BigDecimal.ZERO;

            if (isB2B) {
                // B2B: Flat Rate dynamic logic (10% or 20%)
                LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
                long ordersLastMonth = invoiceRepository.findByUserIdAndCustomerIdOrderByIssueDateDesc(userId, customer.getId()).stream()
                        .map(Invoice::getIssueDate)
                        .filter(d -> d.isAfter(thirtyDaysAgo) || d.isEqual(thirtyDaysAgo))
                        .distinct()
                        .count();
                
                discountPercent = BigDecimal.valueOf(ordersLastMonth < 10 ? 10 : 20);
                discountAmount = totalAmount
                        .multiply(discountPercent)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            } else {
                // B2C: Specific reward logic for top 3 purchases
                // Fetch top 3 product IDs
                List<Long> topProductIds = productRepository.findTopProductsWithAvgQtyByCustomer(customer.getId(), userId, org.springframework.data.domain.PageRequest.of(0, 3))
                        .stream()
                        .map(obj -> {
                            Object[] array = (Object[]) obj;
                            return ((com.billingcrm.model.Product) array[0]).getId();
                        })
                        .toList();

                for (InvoiceItem item : items) {
                    if (item.getProduct() != null && topProductIds.contains(item.getProduct().getId())) {
                        // Priority 1: Specific discount set for this customer/product
                        // Priority 2: General Customer Agreed Discount
                        // Priority 3: Default 5%
                        BigDecimal itemDiscountPercent = customerProductDiscountRepository
                            .findByCustomerIdAndProductId(customer.getId(), item.getProduct().getId())
                            .map(com.billingcrm.model.CustomerProductDiscount::getDiscountPercentage)
                            .orElse(customer.getAgreedDiscount() != null && customer.getAgreedDiscount().compareTo(BigDecimal.ZERO) > 0 
                                ? customer.getAgreedDiscount() 
                                : BigDecimal.ZERO);
                        
                        BigDecimal itemBase = item.getPrice().multiply(item.getQuantity());
                        BigDecimal itemDiscount = itemBase.multiply(itemDiscountPercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                        discountAmount = discountAmount.add(itemDiscount);
                        
                        // Note: If multiple top products have different rates, 
                        // the final 'discountPercent' shown on invoice summary might be misleading (weighted average).
                        // For simplicity, we'll just set it to the last applied percent or keep 5% if we want to be safe.
                        discountPercent = itemDiscountPercent; 
                    }
                }
            }

            // Override if manual discount is set in request (usually for Manual Billing)
            if (req.getDiscountPercent() != null && req.getDiscountPercent().compareTo(BigDecimal.ZERO) > 0) {
                discountPercent = req.getDiscountPercent();
                discountAmount = totalAmount.multiply(discountPercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            }

            // ── 6. Compute Final Totals ──────────────────────────────────────
            // finalAmount = (totalAmount - discount) + GST
            BigDecimal finalAmount = totalAmount
                    .subtract(discountAmount)
                    .add(totalGST)
                    .setScale(2, RoundingMode.HALF_UP);

            invoice.setDiscountPercent(discountPercent);
            invoice.setTotalAmount(totalAmount);
            invoice.setTotalGST(totalGST);
            invoice.setDiscountAmount(discountAmount);
            invoice.setFinalAmount(finalAmount);

            Invoice saved = invoiceRepository.save(invoice);
            log.info("Created invoice {} for user={} — customer='{}' items={} finalAmount=₹{}",
                    saved.getInvoiceNumber(), userId, customer.getName(),
                    saved.getItems().size(), saved.getFinalAmount());
            InvoiceResponse response = invoiceMapper.toResponse(saved);
            response.setSuccess(true);
            return response;

        } catch (BadRequestException ex) {
            // This catches the "Customer not found" or "Status is SUSPENDED" messages
            log.warn("Invoice creation blocked: {}", ex.getMessage());

            // Return a response that contains the error message
            // instead of throwing the exception further
            return InvoiceResponse.builder()
                    .errorMessage(ex.getMessage())
                    .success(false)
                    .build();
        }
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse findById(Long id, Long userId) {
        return invoiceMapper.toResponse(fetchById(id, userId));
    }

    @Override
    public InvoiceResponse updateStatus(Long id, String status, Long userId) {
        Invoice invoice = fetchById(id, userId);
        invoice.setStatus(parseStatus(status, invoice.getStatus()));
        return invoiceMapper.toResponse(invoiceRepository.save(invoice));
    }
 
    @Override
    public InvoiceResponse updateDueDate(Long id, LocalDate dueDate, Long userId) {
        Invoice invoice = fetchById(id, userId);
        invoice.setDueDate(dueDate);
        return invoiceMapper.toResponse(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InvoiceResponse> findAll(
            String search, String status, Long customerId, LocalDate startDate, LocalDate endDate, BigDecimal minAmount,
            String type, Long userId, Pageable pageable) {

        Invoice.Status statusEnum = null;
        if (status != null && !status.isBlank()) {
            try {
                statusEnum = Invoice.Status.fromString(status);
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Invalid status: " + status);
            }
        }

        String searchPattern = (search == null || search.isBlank())
                ? null
                : "%" + search.trim().toLowerCase() + "%";

        return invoiceRepository.findByFilters(
                searchPattern, statusEnum, customerId, startDate, endDate, minAmount, type, userId, pageable)
                .map(invoiceMapper::toResponse);
    }

    @Override
    public void delete(Long id, Long userId) {
        Invoice invoice = fetchById(id, userId);
        if (invoice.getStatus() == Invoice.Status.PAID) {
            throw new BadRequestException("Cannot delete a paid invoice");
        }
        invoiceRepository.delete(invoice);
        log.info("Deleted invoice id={} for user={}", id, userId);
    }

    @Override
    public void refreshOverdueInvoices(Long userId) {
        int updated = invoiceRepository.updateOverdueStatus(
                LocalDate.now(), 
                Invoice.Status.UNPAID, 
                Invoice.Status.OVERDUE, 
                userId
        );
        if (updated > 0) {
            log.info("Auto-updated {} invoices to OVERDUE for user={}", updated, userId);
        }
    }

    // ── Private: Customer Resolution ────────────────────────────────────

    private Customer resolveCustomer(InvoiceRequest req, Long userId) {
        Customer customer;

        // 1. Strict ID Lookup
        if (req.getCustomerId() != null) {
            customer = customerRepository.findByIdAndUserId(req.getCustomerId(), userId)
                    .orElseThrow(() -> new BadRequestException("Customer ID " + req.getCustomerId() + " not found for this user."));
        }
        // 2. Strict Name Lookup (No Fuzzy, No Auto-Create)
        else if (req.getCustomerName() != null && !req.getCustomerName().isBlank()) {
            String name = req.getCustomerName().trim();
            customer = customerRepository.findByUserIdAndNameIgnoreCase(userId, name)
                    .orElseThrow(() -> new BadRequestException(
                            "Customer '" + name + "' not found for this user. Please register them first."));
        } else {
            throw new BadRequestException("Either a valid Customer ID or Name must be provided.");
        }

        // 3. Status Check (Now safe because customer is guaranteed to be initialized)
        if (customer.getStatus() != Customer.Status.ACTIVE) {
            throw new BadRequestException(
                    "Cannot bill " + customer.getName() + " because their status is " + customer.getStatus());
        }

        return customer;
    }

    // ── Private: Line Item Resolution ───────────────────────────────────

    private InvoiceItem resolveLineItem(InvoiceRequest.InvoiceItemDTO req, Invoice invoice, Long userId) {

        Product product = null;

        // Priority 1: explicit productId
        if (req.getProductId() != null) {
            product = productRepository.findByIdAndUserId(req.getProductId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Product", req.getProductId()));
        }
        // Priority 2: resolve by name (fuzzy)
        else if (req.getProductName() != null && !req.getProductName().isBlank()) {
            product = productMatchService.resolve(req.getProductName(), userId);
        }

        // ── Status Check ────────────────────────────────────────────────────
        if (product != null && product.getStatus() != Product.Status.AVAILABLE) {
            throw new BadRequestException(
                    "Product '" + product.getName() + "' is currently OUT_OF_STOCK and cannot be added to new invoices.");
        }

        // Resolve price — explicit > product catalogue
        BigDecimal price;
        if (req.getPrice() != null && req.getPrice().compareTo(BigDecimal.ZERO) > 0) {
            price = req.getPrice().setScale(2, RoundingMode.HALF_UP);
        } else if (product != null) {
            price = product.getPrice().setScale(2, RoundingMode.HALF_UP);
        } else {
            throw new BadRequestException(
                    "Price must be specified when product cannot be resolved: '"
                            + req.getDescription() + "'");
        }

        // Resolve GST — explicit > product catalogue > 0
        BigDecimal gstPct;
        if (req.getGstPercentage() != null
                && req.getGstPercentage().compareTo(BigDecimal.ZERO) >= 0) {
            gstPct = req.getGstPercentage();
        } else if (product != null) {
            gstPct = product.getGstPercentage();
        } else {
            gstPct = BigDecimal.ZERO;
        }

        BigDecimal quantity = req.getQuantity().setScale(2, RoundingMode.HALF_UP);
        // gstAmount = price × quantity × gstPct / 100
        BigDecimal lineBase = price.multiply(quantity).setScale(2, RoundingMode.HALF_UP);
        BigDecimal gstAmount = lineBase
                .multiply(gstPct)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal lineTotal = lineBase.add(gstAmount);

        String description = req.getDescription() != null && !req.getDescription().isBlank()
                ? req.getDescription()
                : (product != null ? product.getName() : "Item");

        String unit = req.getUnit() != null
                ? req.getUnit()
                : (product != null ? product.getUnit() : null);

        return InvoiceItem.builder()
                .invoice(invoice)
                .product(product)
                .description(description)
                .unit(unit)
                .quantity(quantity)
                .price(price)
                .gstPercentage(gstPct)
                .gstAmount(gstAmount)
                .total(lineTotal)
                .build();
    }

    // ── Private: Invoice Number Generator ───────────────────────────────

    private String generateInvoiceNumber(Long userId) {
        String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int next = invoiceRepository.findMaxSequenceForDate(datePrefix, userId)
                .map(m -> m + 1)
                .orElse(1);
        return String.format("INV-%s-%04d", datePrefix, next);
    }

    // ── Private: Helpers ─────────────────────────────────────────────────

    private Invoice fetchById(Long id, Long userId) {
        return invoiceRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
    }

    private static Invoice.Status parseStatus(String raw, Invoice.Status fallback) {
        if (raw == null || raw.isBlank())
            return fallback;
        try {
            return Invoice.Status.fromString(raw);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid invoice status: " + raw);
        }
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}