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

    @Override
    public InvoiceResponse create(InvoiceRequest req, Long userId) {

        try {
            // ── 1. Resolve Customer ─────────────────────────────────────────
            Customer customer = resolveCustomer(req);

            // ── 2. Resolve Creator ─────────────────────────────────────────
            User createdBy = userId != null
                    ? userRepository.findById(userId).orElse(null)
                    : null;

            // ── 3. Build Invoice shell ──────────────────────────────────────
            Invoice invoice = Invoice.builder()
                    .invoiceNumber(generateInvoiceNumber())
                    .customer(customer)
                    .createdBy(createdBy)
                    .currency(req.getCurrency() != null && !req.getCurrency().isBlank()
                            ? req.getCurrency().toUpperCase()
                            : DEFAULT_CURRENCY)
                    .issueDate(req.getIssueDate() != null ? req.getIssueDate() : LocalDate.now())
                    .dueDate(req.getDueDate())
                    .notes(req.getNotes())
                    .voiceTranscript(req.getVoiceTranscript())
                    .voiceGenerated(req.isVoiceGenerated())
                    .status(parseStatus(req.getStatus(), Invoice.Status.PENDING))
                    .discountPercent(req.getDiscountPercent() != null
                            ? req.getDiscountPercent().max(BigDecimal.ZERO)
                            : BigDecimal.ZERO)
                    .build();

            // ── 4. Build Line Items ─────────────────────────────────────────
            List<String> errors = new ArrayList<>();
            BigDecimal totalAmount = BigDecimal.ZERO;
            BigDecimal totalGST = BigDecimal.ZERO;

            for (int i = 0; i < req.getItems().size(); i++) {
                InvoiceRequest.InvoiceItemDTO itemReq = req.getItems().get(i);

                try {
                    InvoiceItem item = resolveLineItem(itemReq, invoice);
                    invoice.getItems().add(item);
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

            // ── 5. Compute Totals ───────────────────────────────────────────
            BigDecimal discountAmount = totalAmount
                    .multiply(invoice.getDiscountPercent())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            // finalAmount = (totalAmount - discount) + GST
            BigDecimal finalAmount = totalAmount
                    .subtract(discountAmount)
                    .add(totalGST)
                    .setScale(2, RoundingMode.HALF_UP);

            invoice.setTotalAmount(totalAmount);
            invoice.setTotalGST(totalGST);
            invoice.setDiscountAmount(discountAmount);
            invoice.setFinalAmount(finalAmount);

            Invoice saved = invoiceRepository.save(invoice);
            log.info("Created invoice {} — customer='{}' items={} finalAmount=₹{}",
                    saved.getInvoiceNumber(), customer.getName(),
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
    public InvoiceResponse findById(Long id) {
        return invoiceMapper.toResponse(fetchById(id));
    }

    @Override
    public InvoiceResponse updateStatus(Long id, String status) {
        Invoice invoice = fetchById(id);
        invoice.setStatus(parseStatus(status, invoice.getStatus()));
        return invoiceMapper.toResponse(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InvoiceResponse> findAll(
            String search, String status, Long customerId, LocalDate startDate, LocalDate endDate, BigDecimal minAmount,
            String type, Pageable pageable) {

        Invoice.Status statusEnum = null;
        if (status != null && !status.isBlank()) {
            try {
                statusEnum = Invoice.Status.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Invalid status: " + status);
            }
        }

        String searchPattern = (search == null || search.isBlank())
                ? null
                : "%" + search.trim().toLowerCase() + "%";

        return invoiceRepository.findByFilters(
                searchPattern, statusEnum, customerId, startDate, endDate, minAmount, type, pageable)
                .map(invoiceMapper::toResponse);
    }

    @Override
    public void delete(Long id) {
        Invoice invoice = fetchById(id);
        if (invoice.getStatus() == Invoice.Status.PAID) {
            throw new BadRequestException("Cannot delete a paid invoice");
        }
        invoiceRepository.delete(invoice);
        log.info("Deleted invoice id={}", id);
    }

    // ── Private: Customer Resolution ────────────────────────────────────

    private Customer resolveCustomer(InvoiceRequest req) {
        Customer customer;

        // 1. Strict ID Lookup
        if (req.getCustomerId() != null) {
            customer = customerRepository.findById(req.getCustomerId())
                    .orElseThrow(() -> new BadRequestException("Customer ID " + req.getCustomerId() + " not found."));
        }
        // 2. Strict Name Lookup (No Fuzzy, No Auto-Create)
        else if (req.getCustomerName() != null && !req.getCustomerName().isBlank()) {
            String name = req.getCustomerName().trim();
            customer = customerRepository.findByNameIgnoreCase(name)
                    .orElseThrow(() -> new BadRequestException(
                            "Customer '" + name + "' not found. Please register them first."));
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

    private InvoiceItem resolveLineItem(InvoiceRequest.InvoiceItemDTO req, Invoice invoice) {

        Product product = null;

        // Priority 1: explicit productId
        if (req.getProductId() != null) {
            product = productRepository.findById(req.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", req.getProductId()));
        }
        // Priority 2: resolve by name (fuzzy)
        else if (req.getProductName() != null && !req.getProductName().isBlank()) {
            product = productMatchService.resolve(req.getProductName());
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

    private String generateInvoiceNumber() {
        String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int next = invoiceRepository.findMaxSequenceForDate(datePrefix)
                .map(m -> m + 1)
                .orElse(1);
        return String.format("INV-%s-%04d", datePrefix, next);
    }

    // ── Private: Helpers ─────────────────────────────────────────────────

    private Invoice fetchById(Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
    }

    private static Invoice.Status parseStatus(String raw, Invoice.Status fallback) {
        if (raw == null || raw.isBlank())
            return fallback;
        try {
            return Invoice.Status.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid invoice status: " + raw);
        }
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}