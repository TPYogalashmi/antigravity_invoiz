package com.billingcrm.service.impl;

import com.billingcrm.dto.response.DashboardStatsResponse;
import com.billingcrm.model.Customer;
import com.billingcrm.model.Invoice;
import com.billingcrm.repository.CustomerRepository;
import com.billingcrm.repository.InvoiceRepository;
import com.billingcrm.repository.ProductRepository;
import com.billingcrm.service.DashboardService;
import lombok.RequiredArgsConstructor;
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
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;

    @Override
    public DashboardStatsResponse getStats() {
        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate startOfPrevMonth = startOfMonth.minusMonths(1);
        LocalDate endOfPrevMonth = startOfMonth.minusDays(1);

        // 1. Revenue & Orders KPIs
        BigDecimal revenueToday = invoiceRepository.sumRevenueByDate(today);
        BigDecimal revenueMonth = invoiceRepository.sumRevenueBetweenDates(startOfMonth, today);
        long ordersToday = invoiceRepository.countTotalOrdersByDate(today);
        long ordersMonth = invoiceRepository.countTotalOrdersBetweenDates(startOfMonth, today);
        
        BigDecimal avgBillToday = ordersToday > 0 ? revenueToday.divide(BigDecimal.valueOf(ordersToday), RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal avgBillMonth = ordersMonth > 0 ? revenueMonth.divide(BigDecimal.valueOf(ordersMonth), RoundingMode.HALF_UP) : BigDecimal.ZERO;

        // 2. Trends (Filling gaps for all days of the month)
        List<DashboardStatsResponse.DailyRevenue> currentMonthTrend = getTrendWithGaps(startOfMonth, today);
        List<DashboardStatsResponse.DailyRevenue> prevMonthTrend = getTrendWithGaps(startOfPrevMonth, endOfPrevMonth);

        // 3. Top Products Today
        List<DashboardStatsResponse.TopProduct> topProducts = productRepository.findTopProductsByDate(today, PageRequest.of(0, 3))
                .stream()
                .map(obj -> DashboardStatsResponse.TopProduct.builder()
                        .name((String) obj[0])
                        .avgQuantity(BigDecimal.valueOf(obj[1] != null ? ((Number) obj[1]).doubleValue() : 0.0))
                        .build())
                .collect(Collectors.toList());

        // 4. Out of Stock
        List<DashboardStatsResponse.ProductSummary> oosItems = productRepository.findOutOfStockProducts()
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
                .totalUnpaidBills(invoiceRepository.countByStatus(Invoice.Status.UNPAID))
                .totalOverdueBills(invoiceRepository.countOverdue(today))
                .revenueTrend(currentMonthTrend)
                .previousMonthTrend(prevMonthTrend)
                .customerStatus(DashboardStatsResponse.CustomerStatusDistribution.builder()
                        .active(customerRepository.countByStatus(Customer.Status.ACTIVE))
                        .suspended(customerRepository.countByStatus(Customer.Status.SUSPENDED))
                        .build())
                .topProductsToday(topProducts)
                .outOfStockItems(oosItems)
                .build();
    }

    private List<DashboardStatsResponse.DailyRevenue> getTrendWithGaps(LocalDate start, LocalDate end) {
        Map<LocalDate, BigDecimal> existingData = invoiceRepository.getDailyRevenueBetweenDates(start, end)
                .stream()
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