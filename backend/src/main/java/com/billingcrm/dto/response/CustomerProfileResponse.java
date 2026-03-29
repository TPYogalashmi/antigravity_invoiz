package com.billingcrm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerProfileResponse {
    private CustomerResponse customer;
    
    // Purchase Summary
    private long totalOrders;
    private BigDecimal totalSpend;
    private BigDecimal avgSpend;
    private LocalDate lastVisit;
    private String visitFrequency; // Frequent, Regular, Occasional
    private int visitsLast30Days;

    // Frequently Bought
    private List<FrequentItemDTO> frequentItems;

    // Smart Insights
    private List<String> suggestions;
    private List<String> insights;

    // Recent Transactions
    private List<InvoiceResponse> recentTransactions;

    // All Unpaid/Overdue Items
    private List<InvoiceResponse> pendingTransactions;

    // Recently Configured or All Individual Product Discounts
    private List<ConfiguredDiscountDTO> configuredDiscounts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FrequentItemDTO {
        private Long productId;
        private String name;
        private long count;
        private BigDecimal avgQuantity;
        private BigDecimal agreedDiscount; // Individual product discount for this customer
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConfiguredDiscountDTO {
        private Long productId;
        private String name;
        private BigDecimal agreedDiscount;
    }
}
