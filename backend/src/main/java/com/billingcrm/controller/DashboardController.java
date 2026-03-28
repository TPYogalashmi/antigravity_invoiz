package com.billingcrm.controller;

import com.billingcrm.dto.response.ApiResponse;
import com.billingcrm.dto.response.DashboardStatsResponse;
import com.billingcrm.model.User;
import com.billingcrm.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getStats(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getStats(user.getId())));
    }
}