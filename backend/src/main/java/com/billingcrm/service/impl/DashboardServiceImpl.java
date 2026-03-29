package com.billingcrm.service.impl;

import com.billingcrm.dto.response.DashboardStatsResponse;
import com.billingcrm.model.Customer;
import com.billingcrm.model.Invoice;
import com.billingcrm.repository.CustomerRepository;
import com.billingcrm.repository.InvoiceRepository;
import com.billingcrm.repository.ProductRepository;
import com.billingcrm.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;

    @Override
    @Transactional
    public DashboardStatsResponse getStats(Long userId) {
        LocalDate today = LocalDate.now();
        
        // Auto-update overdue statuses whenever dashboard/login happens
        invoiceRepository.updateOverdueStatus(today, Invoice.Status.UNPAID, Invoice.Status.OVERDUE, userId);
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate startOfPrevMonth = startOfMonth.minusMonths(1);
        LocalDate endOfPrevMonth = startOfMonth.minusDays(1);

        // 1. Revenue & Orders KPIs
        BigDecimal revenueToday = invoiceRepository.sumRevenueByDate(today, userId);
        BigDecimal revenueMonth = invoiceRepository.sumRevenueBetweenDates(startOfMonth, today, userId);
        long ordersToday = invoiceRepository.countTotalOrdersByDate(today, userId);
        long ordersMonth = invoiceRepository.countTotalOrdersBetweenDates(startOfMonth, today, userId);
        
        BigDecimal avgBillToday = ordersToday > 0 ? revenueToday.divide(BigDecimal.valueOf(ordersToday), RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal avgBillMonth = ordersMonth > 0 ? revenueMonth.divide(BigDecimal.valueOf(ordersMonth), RoundingMode.HALF_UP) : BigDecimal.ZERO;

        // 2. Trends (Filling gaps for all days of the month)
        List<DashboardStatsResponse.DailyRevenue> currentMonthTrend = getTrendWithGaps(startOfMonth, today, userId);
        List<DashboardStatsResponse.DailyRevenue> prevMonthTrend = getTrendWithGaps(startOfPrevMonth, endOfPrevMonth, userId);

        // 3. Top Products Today
        List<DashboardStatsResponse.TopProduct> topProducts = productRepository.findTopProductsByDate(today, userId, PageRequest.of(0, 3))
                .stream()
                .map(obj -> DashboardStatsResponse.TopProduct.builder()
                        .name((String) obj[0])
                        .avgQuantity(BigDecimal.valueOf(obj[1] != null ? ((Number) obj[1]).doubleValue() : 0.0))
                        .build())
                .collect(Collectors.toList());

        // 4. Out of Stock
        List<DashboardStatsResponse.ProductSummary> oosItems = productRepository.findOutOfStockProducts(userId)
                .stream()
                .map(p -> DashboardStatsResponse.ProductSummary.builder()
                        .name(p.getName())
                        .alias(p.getAlias())
                        .build())
                .collect(Collectors.toList());

        return DashboardStatsResponse.builder()
                .revenueToday(revenueToday)
                .revenueMonth(revenueMonth)
                .avgBillToday(avgBillToday)
                .avgBillMonth(avgBillMonth)
                .ordersToday(ordersToday)
                .ordersMonth(ordersMonth)
                .totalUnpaidBills(invoiceRepository.countByUserIdAndStatus(userId, Invoice.Status.UNPAID))
                .totalOverdueBills(invoiceRepository.countByUserIdAndStatus(userId, Invoice.Status.OVERDUE))
                .revenueTrend(currentMonthTrend)
                .previousMonthTrend(prevMonthTrend)
                .customerStatus(DashboardStatsResponse.CustomerStatusDistribution.builder()
                        .active(customerRepository.countByUserIdAndStatus(userId, Customer.Status.ACTIVE))
                        .suspended(customerRepository.countByUserIdAndStatus(userId, Customer.Status.SUSPENDED))
                        .build())
                .topProductsToday(topProducts)
                .outOfStockItems(oosItems)
                .build();
    }

    private List<DashboardStatsResponse.DailyRevenue> getTrendWithGaps(LocalDate start, LocalDate end, Long userId) {
        log.debug("Fetching trend data for userId={} from {} to {}", userId, start, end);
        List<Object[]> rawData = invoiceRepository.getDailyRevenueBetweenDates(start, end, userId);
        log.debug("Found {} data points in DB for trend", rawData.size());

        Map<LocalDate, BigDecimal> existingData = rawData.stream()
                .collect(Collectors.toMap(
                        obj -> (LocalDate) obj[0],
                        obj -> (BigDecimal) obj[1]
                ));

        List<DashboardStatsResponse.DailyRevenue> trend = new ArrayList<>();
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            trend.add(DashboardStatsResponse.DailyRevenue.builder()
                    .date(date.format(DateTimeFormatter.ISO_LOCAL_DATE))
                    .revenue(existingData.getOrDefault(date, BigDecimal.ZERO))
                    .build());
        }
        return trend;
    }
}