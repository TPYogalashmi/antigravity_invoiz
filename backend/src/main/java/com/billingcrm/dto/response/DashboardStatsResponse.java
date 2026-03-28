package com.billingcrm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DashboardStatsResponse {
    // KPI Cards
    private BigDecimal revenueToday;
    private BigDecimal revenueMonth;
    private BigDecimal avgBillToday;
    private BigDecimal avgBillMonth;
    private long ordersToday;
    private long ordersMonth;
    private long totalUnpaidBills;
    private long totalOverdueBills;

    // Charts
    private List<DailyRevenue> revenueTrend;
    private List<DailyRevenue> previousMonthTrend;
    
    // Insights
    private CustomerStatusDistribution customerStatus;
    private List<TopProduct> topProductsToday;
    private List<ProductSummary> outOfStockItems;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DailyRevenue {
        private String date;
        private BigDecimal revenue;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CustomerStatusDistribution {
        private long active;
        private long suspended;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TopProduct {
        private String name;
        private BigDecimal avgQuantity;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProductSummary {
        private String name;
        private String alias;
    }
}