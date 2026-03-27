package com.billingcrm.service;

import com.billingcrm.dto.request.InvoiceRequest;
import com.billingcrm.dto.response.InvoiceResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InvoiceService {
    InvoiceResponse create(InvoiceRequest req, Long userId);

    InvoiceResponse findById(Long id);

    InvoiceResponse updateStatus(Long id, String status);

    Page<InvoiceResponse> findAll(String search, String status, Long customerId, LocalDate startDate, LocalDate endDate,
            BigDecimal minAmount, Pageable pageable);

    void delete(Long id);
}