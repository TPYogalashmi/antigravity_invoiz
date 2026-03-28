package com.billingcrm.service.impl;

import com.billingcrm.dto.request.ProductRequest;
import com.billingcrm.dto.response.ProductResponse;
import com.billingcrm.exception.DuplicateResourceException;
import com.billingcrm.exception.ResourceNotFoundException;
import com.billingcrm.mapper.ProductMapper;
import com.billingcrm.model.Product;
import com.billingcrm.repository.ProductRepository;
import com.billingcrm.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final ProductMapper productMapper;

    @Override
    public ProductResponse create(ProductRequest request, Long userId) {
        if (request.getSku() != null && !request.getSku().isBlank()
                && productRepository.existsBySkuAndUserId(request.getSku(), userId)) {
            throw new DuplicateResourceException("Product", "SKU", request.getSku());
        }
        Product entity = productMapper.toEntity(request);
        entity.setUser(userRepository.getReferenceById(userId));
        Product saved = productRepository.save(entity);
        log.info("Created product id={} name={} for user={}", saved.getId(), saved.getName(), userId);
        return productMapper.toResponse(saved);
    }

    @Override
    public ProductResponse update(Long id, ProductRequest request, Long userId) {
        Product product = findProductById(id, userId);
        if (request.getSku() != null && !request.getSku().isBlank()
                && !request.getSku().equals(product.getSku())
                && productRepository.existsBySkuAndUserId(request.getSku(), userId)) {
            throw new DuplicateResourceException("Product", "SKU", request.getSku());
        }
        productMapper.updateEntity(product, request);
        Product saved = productRepository.save(product);
        log.info("Updated product id={} for user={}", saved.getId(), userId);
        return productMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse findById(Long id, Long userId) {
        return productMapper.toResponse(findProductById(id, userId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> findAll(String search, String status, boolean onlyName, Long userId, Pageable pageable) {
        Product.Status statusEnum = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                statusEnum = Product.Status.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                log.warn("Invalid status passed: {}", status);
                statusEnum = null; // Fallback to no filter if invalid
            }
        }

        return productRepository.findByFilters(
                search,
                statusEnum,
                userId,
                pageable).map(productMapper::toResponse);
    }

    @Override
    public void delete(Long id, Long userId) {
        Product product = findProductById(id, userId);
        productRepository.delete(product);
        log.info("Deleted product id={} for user={}", id, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> findFrequentByCustomer(Long customerId, int limit, Long userId) {
        log.info("Fetching frequent products for customerId={} with limit={} for user={}", customerId, limit, userId);
        return productRepository.findTopProductsWithAvgQtyByCustomer(customerId, userId, PageRequest.of(0, limit))
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

    private Product findProductById(Long id, Long userId) {
        return productRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }
}