package com.billingcrm.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class InvoiceRequest {

    /** Either customerId OR customerName must be supplied. */
    private Long   customerId;
    private String customerName;

    @Valid
    @NotNull
    @Size(min = 1, message = "Invoice must have at least one item")
    private List<InvoiceItemDTO> items;

    private BigDecimal discountPercent;

    /** ISO 4217 currency code — defaults to INR (₹). */
    private String currency;

    private LocalDate issueDate;
    private LocalDate dueDate;
    private String    notes;
    private String    status;

    // Voice billing metadata
    private String  voiceTranscript;
    private boolean voiceGenerated;

    @Data
    public static class InvoiceItemDTO {

        /**
         * When productId is given it takes priority.
         * When only productName is given, the backend resolves it via fuzzy matching.
         */
        private Long   productId;
        private String productName;

        @NotNull(message = "Description is required")
        private String description;

        private String unit;

        @NotNull(message = "Quantity is required")
        @DecimalMin(value = "0.01", message = "Quantity must be positive")
        private BigDecimal quantity;

        /**
         * Unit price in ₹ (INR).
         * When productId/productName resolves a DB product this may be omitted
         * and the product's catalogue price is used automatically.
         */
        private BigDecimal price;

        @DecimalMin(value = "0.0", message = "GST percentage cannot be negative")
        private BigDecimal gstPercentage;
    }
}