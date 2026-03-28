package com.billingcrm.service.impl;

import com.billingcrm.dto.request.ProductRequest;
import com.billingcrm.dto.response.ProductResponse;
import com.billingcrm.exception.DuplicateResourceException;
import com.billingcrm.exception.ResourceNotFoundException;
import com.billingcrm.mapper.ProductMapper;
import com.billingcrm.model.Product;
import com.billingcrm.repository.ProductRepository;
import com.billingcrm.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    @Override
    public ProductResponse create(ProductRequest request) {
        if (request.getSku() != null && !request.getSku().isBlank()
                && productRepository.existsBySku(request.getSku())) {
            throw new DuplicateResourceException("Product", "SKU", request.getSku());
        }
        Product saved = productRepository.save(productMapper.toEntity(request));
        log.info("Created product id={} name={}", saved.getId(), saved.getName());
        return productMapper.toResponse(saved);
    }

    @Override
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = findProductById(id);
        if (request.getSku() != null && !request.getSku().isBlank()
                && !request.getSku().equals(product.getSku())
                && productRepository.existsBySku(request.getSku())) {
            throw new DuplicateResourceException("Product", "SKU", request.getSku());
        }
        productMapper.updateEntity(product, request);
        Product saved = productRepository.save(product);
        log.info("Updated product id={}", saved.getId());
        return productMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse findById(Long id) {
        return productMapper.toResponse(findProductById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> findAll(String search, String status, boolean onlyName, Pageable pageable) {
        Product.Status statusEnum = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                statusEnum = Product.Status.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                log.warn("Invalid status passed: {}", status);
                statusEnum = null; // Fallback to no filter if invalid
            }
        }

        String searchParam = (search == null || search.isBlank())
                ? null
                : "%" + search.toLowerCase() + "%";

        return productRepository.findByFilters(
                search,
                statusEnum,
                pageable).map(productMapper::toResponse);
    }

    @Override
    public void delete(Long id) {
        Product product = findProductById(id);
        productRepository.delete(product);
        log.info("Deleted product id={}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> findFrequentByCustomer(Long customerId, int limit) {
        log.info("Fetching frequent products for customerId={} with limit={}", customerId, limit);
        return productRepository.findTopProductsWithAvgQtyByCustomer(customerId, PageRequest.of(0, limit))
                .stream()
                .map(row -> {
                    com.billingcrm.model.Product p = (com.billingcrm.model.Product) row[0];
                    Double avgQty = (Double) row[1];
                    ProductResponse resp = productMapper.toResponse(p);
                    resp.setSuggestedQuantity(avgQty);
                    return resp;
                })
                .collect(Collectors.toList());
    }

    private Product findProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }
}