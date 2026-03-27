package com.billingcrm.service;

import com.billingcrm.dto.request.ProductRequest;
import com.billingcrm.dto.response.ProductResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ProductService {
    ProductResponse create(ProductRequest request);
    ProductResponse update(Long id, ProductRequest request);
    ProductResponse findById(Long id);
    Page<ProductResponse> findAll(String search, String status, boolean onlyName, Pageable pageable);
    void delete(Long id);
}