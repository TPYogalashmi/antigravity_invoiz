package com.billingcrm.controller;

import com.billingcrm.dto.request.InvoiceRequest;
import com.billingcrm.dto.response.ApiResponse;
import com.billingcrm.dto.response.InvoiceResponse;
import com.billingcrm.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import com.billingcrm.model.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;
import java.math.BigDecimal;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;

@RestController
@RequestMapping("/invoices")
@RequiredArgsConstructor
@Slf4j
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping
    public ResponseEntity<ApiResponse<InvoiceResponse>> create(
            @Valid @RequestBody InvoiceRequest request,
            @AuthenticationPrincipal User user) {

        InvoiceResponse response = invoiceService.create(request, user.getId());
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Invoice created", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<InvoiceResponse>>> findAll(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "customerId", required = false) Long customerId,
            @RequestParam(name = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(name = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(name = "minAmount", required = false) BigDecimal minAmount,
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            @RequestParam(name = "sortBy", defaultValue = "createdAt") String sortBy,
            @RequestParam(name = "sortDir", defaultValue = "desc") String sortDir,
            @AuthenticationPrincipal User user) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Page<InvoiceResponse> invoices = invoiceService.findAll(search, status, customerId, startDate, endDate,
                minAmount, type, user.getId(), PageRequest.of(page, size, sort));
        return ResponseEntity.ok(ApiResponse.success(invoices));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> findById(
            @PathVariable(name = "id") Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.findById(id, user.getId())));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<InvoiceResponse>> updateStatus(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "status") String status,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
                ApiResponse.success("Status updated", invoiceService.updateStatus(id, status, user.getId())));
    }
 
    @PatchMapping("/{id}/due-date")
    public ResponseEntity<ApiResponse<InvoiceResponse>> updateDueDate(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "dueDate") @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate dueDate,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(
                ApiResponse.success("Due date updated", invoiceService.updateDueDate(id, dueDate, user.getId())));
    }

    @PostMapping("/refresh-overdue")
    public ResponseEntity<ApiResponse<Void>> refreshOverdue(
            @AuthenticationPrincipal User user) {
        invoiceService.refreshOverdueInvoices(user.getId());
        return ResponseEntity.ok(ApiResponse.success("Overdue statuses refreshed", null));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable(name = "id") Long id,
            @AuthenticationPrincipal User user) {
        invoiceService.delete(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Invoice deleted", null));
    }
}