package com.billingcrm.service;

import com.billingcrm.dto.request.ProductRequest;
import com.billingcrm.dto.response.ProductResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ProductService {
    ProductResponse create(ProductRequest request, Long userId);
    ProductResponse update(Long id, ProductRequest request, Long userId);
    ProductResponse findById(Long id, Long userId);
    Page<ProductResponse> findAll(String search, String status, boolean onlyName, Long userId, Pageable pageable);
    void delete(Long id, Long userId);
    java.util.List<ProductResponse> findFrequentByCustomer(Long customerId, int limit, Long userId);
}