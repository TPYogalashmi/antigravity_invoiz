package com.billingcrm.service;

import com.billingcrm.dto.response.DashboardStatsResponse;

public interface DashboardService {
    DashboardStatsResponse getStats(Long userId);
}