package com.billingcrm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DashboardStatsResponse {
    private BigDecimal totalRevenue;
    private BigDecimal pendingRevenue;
    private long totalCustomers;
    private long activeCustomers;
    private long totalInvoices;
    private long pendingInvoices;
    private long overdueInvoices;
    private long paidInvoices;
    private long voiceSessions;
}