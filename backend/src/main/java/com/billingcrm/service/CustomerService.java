package com.billingcrm.service;

import com.billingcrm.dto.request.CustomerRequest;
import com.billingcrm.dto.response.CustomerProfileResponse;
import com.billingcrm.dto.response.CustomerResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CustomerService {
    CustomerResponse create(CustomerRequest request, Long userId);
    CustomerResponse update(Long id, CustomerRequest request, Long userId);
    CustomerResponse findById(Long id, Long userId);
    Page<CustomerResponse> findAll(String search, String status, Boolean hasTaxId, Long userId, Pageable pageable);
    void delete(Long id, Long userId);
    CustomerProfileResponse getProfile(Long id, Long userId);
    void updateSpecificDiscount(Long customerId, Long productId, java.math.BigDecimal discount, Long userId);
    void updateOverallDiscount(Long customerId, java.math.BigDecimal discount, Long userId);
}