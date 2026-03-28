package com.billingcrm.service;

import com.billingcrm.dto.request.CustomerRequest;
import com.billingcrm.dto.response.CustomerProfileResponse;
import com.billingcrm.dto.response.CustomerResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CustomerService {
    CustomerResponse create(CustomerRequest request);
    CustomerResponse update(Long id, CustomerRequest request);
    CustomerResponse findById(Long id);
    Page<CustomerResponse> findAll(String search, String status, Boolean hasTaxId, Pageable pageable);
    void delete(Long id);
    CustomerProfileResponse getProfile(Long id);
    void updateSpecificDiscount(Long customerId, Long productId, java.math.BigDecimal discount);
    void updateOverallDiscount(Long customerId, java.math.BigDecimal discount);
}