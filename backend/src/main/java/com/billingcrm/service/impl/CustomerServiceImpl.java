package com.billingcrm.service.impl;

import com.billingcrm.dto.request.CustomerRequest;
import com.billingcrm.dto.response.CustomerProfileResponse;
import com.billingcrm.dto.response.CustomerResponse;
import com.billingcrm.dto.response.InvoiceResponse;
import com.billingcrm.exception.DuplicateResourceException;
import com.billingcrm.exception.ResourceNotFoundException;
import com.billingcrm.mapper.CustomerMapper;
import com.billingcrm.mapper.InvoiceMapper;
import com.billingcrm.model.Customer;
import com.billingcrm.model.Invoice;
import com.billingcrm.repository.CustomerProductDiscountRepository;
import com.billingcrm.repository.CustomerRepository;
import com.billingcrm.repository.InvoiceRepository;
import com.billingcrm.repository.ProductRepository;
import com.billingcrm.repository.UserRepository;
import com.billingcrm.service.CustomerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final InvoiceRepository invoiceRepository;
    private final ProductRepository productRepository;
    private final CustomerProductDiscountRepository customerProductDiscountRepository;
    private final UserRepository userRepository;
    private final CustomerMapper customerMapper;
    private final InvoiceMapper invoiceMapper;

    @Override
    public CustomerResponse create(CustomerRequest request, Long userId) {
        if (request.getEmail() != null && customerRepository.existsByUserIdAndEmail(userId, request.getEmail())) {
            throw new DuplicateResourceException("Customer", "email", request.getEmail());
        }
        Customer entity = customerMapper.toEntity(request);
        entity.setUser(userRepository.getReferenceById(userId));
        Customer saved = customerRepository.save(entity);
        log.info("Created customer id={} name={} for user={}", saved.getId(), saved.getName(), userId);
        return customerMapper.toResponse(saved);
    }

    @Override
    public CustomerResponse update(Long id, CustomerRequest request, Long userId) {
        Customer customer = findCustomerById(id, userId);
        if (request.getEmail() != null
                && !request.getEmail().equalsIgnoreCase(customer.getEmail())
                && customerRepository.existsByUserIdAndEmail(userId, request.getEmail())) {
            throw new DuplicateResourceException("Customer", "email", request.getEmail());
        }
        customerMapper.updateEntity(customer, request);
        Customer saved = customerRepository.save(customer);
        log.info("Updated customer id={} for user={}", saved.getId(), userId);
        return customerMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse findById(Long id, Long userId) {
        return customerMapper.toResponse(findCustomerById(id, userId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomerResponse> findAll(String search, String status, Boolean hasTaxId, Long userId, Pageable pageable) {
        Customer.Status statusEnum = null;
        if (status != null && !status.isBlank()) {
            statusEnum = Customer.Status.valueOf(status.toUpperCase());
        }

        String searchParam = (search == null || search.isBlank())
                ? null
                : "%" + search.toLowerCase() + "%";

        return customerRepository.findByFilters(
                searchParam,
                statusEnum,
                hasTaxId,
                userId,
                pageable).map(customerMapper::toResponse);
    }

    @Override
    public void delete(Long id, Long userId) {
        Customer customer = findCustomerById(id, userId);
        customer.setStatus(Customer.Status.SUSPENDED);
        customerRepository.save(customer);
        log.info("Soft-deleted (Suspended) customer id={} for user={}", id, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerProfileResponse getProfile(Long id, Long userId) {
        Customer customer = findCustomerById(id, userId);
        
        // Fetch all invoices for stats
        List<Invoice> allInvoices = invoiceRepository.findByUserIdAndCustomerIdOrderByIssueDateDesc(userId, id);
        
        long totalOrders = allInvoices.size();
        BigDecimal totalSpend = allInvoices.stream()
                .map(i -> i.getFinalAmount() != null ? i.getFinalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal avgSpend = totalOrders > 0 
            ? totalSpend.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP) 
            : BigDecimal.ZERO;

        LocalDate lastVisit = allInvoices.isEmpty() ? null : allInvoices.get(0).getIssueDate();
        
        // Frequency check (visits in last 30 days)
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        long visitsLast30Days = allInvoices.stream()
                .map(Invoice::getIssueDate)
                .filter(d -> d.isAfter(thirtyDaysAgo) || d.isEqual(thirtyDaysAgo))
                .distinct()
                .count();
        
        String frequency;
        if (visitsLast30Days >= 8) frequency = "Frequent";
        else if (visitsLast30Days >= 3) frequency = "Regular";
        else frequency = "Occasional";

        // Frequent Items
        List<CustomerProfileResponse.FrequentItemDTO> frequentItems = productRepository.findTopProductsWithAvgQtyByCustomer(id, userId, PageRequest.of(0, 3))
                .stream()
                .map(obj -> {
                    Object[] array = (Object[]) obj;
                    com.billingcrm.model.Product p = (com.billingcrm.model.Product) array[0];
                    
                    // Lookup specific discount if any
                    BigDecimal specificDiscount = customerProductDiscountRepository
                        .findByCustomerIdAndProductId(id, p.getId())
                        .map(com.billingcrm.model.CustomerProductDiscount::getDiscountPercentage)
                        .orElse(null); // Return null if not set yet

                    return CustomerProfileResponse.FrequentItemDTO.builder()
                            .productId(p.getId())
                            .name(p.getName())
                            .avgQuantity(BigDecimal.valueOf((Double) array[1]).setScale(1, RoundingMode.HALF_UP))
                            .count((Long) array[2])
                            .agreedDiscount(specificDiscount)
                            .build();
                })
                .collect(Collectors.toList());

        // Insights & Suggestions
        List<String> suggestions = new ArrayList<>();
        List<String> insights = new ArrayList<>();
        
        if (!frequentItems.isEmpty()) {
            String topProduct = frequentItems.get(0).getName();
            suggestions.add("Suggest \"" + topProduct + "\" during billing");
            
            frequentItems.forEach(item -> {
                if (item.getCount() > 10) {
                   insights.add("High loyalty for " + item.getName() + " (" + item.getCount() + " purchases)");
                   suggestions.add("Offer 5% discount on " + item.getName() + " if quantity is more than avg " + item.getAvgQuantity());
                }
            });
        }

        // Recent Invoices (Last 10)
        List<InvoiceResponse> recent = allInvoices.stream()
                .limit(10)
                .map(invoiceMapper::toResponse)
                .collect(Collectors.toList());

        // All Configured Discounts for this customer
        List<CustomerProfileResponse.ConfiguredDiscountDTO> configuredDiscounts = customerProductDiscountRepository
            .findByCustomerId(id)
            .stream()
            .map(cpd -> CustomerProfileResponse.ConfiguredDiscountDTO.builder()
                .productId(cpd.getProduct().getId())
                .name(cpd.getProduct().getName())
                .agreedDiscount(cpd.getDiscountPercentage())
                .build())
            .collect(Collectors.toList());

        return CustomerProfileResponse.builder()
                .customer(customerMapper.toResponse(customer))
                .totalOrders(totalOrders)
                .totalSpend(totalSpend)
                .avgSpend(avgSpend)
                .lastVisit(lastVisit)
                .visitFrequency(frequency)
                .visitsLast30Days((int) visitsLast30Days)
                .frequentItems(frequentItems)
                .configuredDiscounts(configuredDiscounts)
                .suggestions(suggestions)
                .insights(insights)
                .recentTransactions(recent)
                .build();
    }

    @Override
    public void updateSpecificDiscount(Long customerId, Long productId, BigDecimal discount, Long userId) {
        Customer customer = findCustomerById(customerId, userId);
        com.billingcrm.model.Product product = productRepository.findByIdAndUserId(productId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Product", productId));

        com.billingcrm.model.CustomerProductDiscount cpd = customerProductDiscountRepository
            .findByCustomerIdAndProductId(customerId, productId)
            .orElse(com.billingcrm.model.CustomerProductDiscount.builder()
                .customer(customer)
                .product(product)
                .build());

        cpd.setDiscountPercentage(discount);
        customerProductDiscountRepository.save(cpd);
        log.info("Updated specific discount for customer={}, product={}, discount={} for user={}", customerId, productId, discount, userId);
    }

    @Override
    public void updateOverallDiscount(Long customerId, BigDecimal discount, Long userId) {
        Customer customer = findCustomerById(customerId, userId);
        customer.setAgreedDiscount(discount);
        customerRepository.save(customer);
        log.info("Updated overall discount for customer={}, discount={} for user={}", customerId, discount, userId);
    }

    private Customer findCustomerById(Long id, Long userId) {
        return customerRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", id));
    }
}