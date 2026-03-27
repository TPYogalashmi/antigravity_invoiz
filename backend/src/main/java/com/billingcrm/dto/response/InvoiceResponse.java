package com.billingcrm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceResponse {

    private Long id;
    private String invoiceNumber;
    private CustomerSummary customer;
    private String createdByName;
    private List<InvoiceItemResponse> items;
    private boolean success;
    private String errorMessage;

    private BigDecimal totalAmount;
    private BigDecimal totalGST;
    private BigDecimal discountPercent;
    private BigDecimal discountAmount;
    private BigDecimal finalAmount;

    private String currency;
    private String status;
    private LocalDate issueDate;
    private LocalDate dueDate;
    private String notes;
    private String voiceTranscript;
    private boolean voiceGenerated;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerSummary {
        private Long id;
        private String name;
        private String email;
        private String phone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceItemResponse {
        private Long id;
        private Long productId;
        private String productName;
        private String description;
        private String unit;
        private BigDecimal quantity;
        private BigDecimal price;
        private BigDecimal gstPercentage;
        private BigDecimal gstAmount;
        private BigDecimal total;

    }
}