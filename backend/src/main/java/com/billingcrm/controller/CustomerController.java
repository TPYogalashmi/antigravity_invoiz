package com.billingcrm.controller;

import com.billingcrm.dto.request.CustomerRequest;
import com.billingcrm.dto.response.ApiResponse;
import com.billingcrm.dto.response.CustomerProfileResponse;
import com.billingcrm.dto.response.CustomerResponse;
import com.billingcrm.service.CustomerService;
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
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerResponse>> create(
            @Valid @RequestBody CustomerRequest request,
            @AuthenticationPrincipal User user) {
        CustomerResponse response = customerService.create(request, user.getId());
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Customer created", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<CustomerResponse>>> findAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean hasTaxId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @AuthenticationPrincipal User user) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Page<CustomerResponse> customers = customerService.findAll(search, status, hasTaxId, user.getId(), PageRequest.of(page, size, sort));
        return ResponseEntity.ok(ApiResponse.success(customers));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerResponse>> findById(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(customerService.findById(id, user.getId())));
    }

    @GetMapping("/{id}/profile")
    public ResponseEntity<ApiResponse<CustomerProfileResponse>> getProfile(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getProfile(id, user.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success("Customer updated", customerService.update(id, request, user.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        customerService.delete(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Customer suspended", null));
    }

    @PatchMapping("/{id}/specific-discounts/{productId}")
    public ResponseEntity<ApiResponse<Void>> updateSpecificDiscount(
            @PathVariable Long id,
            @PathVariable Long productId,
            @RequestParam java.math.BigDecimal discount,
            @AuthenticationPrincipal User user) {
        customerService.updateSpecificDiscount(id, productId, discount, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Discount updated", null));
    }

    @PatchMapping("/{id}/overall-discount")
    public ResponseEntity<ApiResponse<Void>> updateOverallDiscount(
            @PathVariable Long id,
            @RequestParam java.math.BigDecimal discount,
            @AuthenticationPrincipal User user) {
        customerService.updateOverallDiscount(id, discount, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Overall discount updated", null));
    }
}