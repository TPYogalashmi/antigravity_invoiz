package com.billingcrm.controller;

import com.billingcrm.dto.request.ProductRequest;
import com.billingcrm.dto.response.ApiResponse;
import com.billingcrm.dto.response.ProductResponse;
import com.billingcrm.service.ProductService;
import com.billingcrm.model.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> create(
            @Valid @RequestBody ProductRequest request,
            @AuthenticationPrincipal User user) {
        ProductResponse response = productService.create(request, user.getId());
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Product created", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ProductResponse>>> findAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false, defaultValue = "false") boolean onlyName,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            @AuthenticationPrincipal User user) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Page<ProductResponse> products = productService.findAll(search, status, onlyName, user.getId(), PageRequest.of(page, size, sort));
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> findById(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(productService.findById(id, user.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success("Product updated", productService.update(id, request, user.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        productService.delete(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Product deleted", null));
    }

    @GetMapping("/frequent")
    public ResponseEntity<ApiResponse<java.util.List<ProductResponse>>> findFrequent(
            @RequestParam Long customerId,
            @RequestParam(defaultValue = "5") int limit,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(productService.findFrequentByCustomer(customerId, limit, user.getId())));
    }
}