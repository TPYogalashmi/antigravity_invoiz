package com.billingcrm.service.impl;

import com.billingcrm.dto.response.DashboardStatsResponse;
import com.billingcrm.model.Customer;
import com.billingcrm.model.Invoice;
import com.billingcrm.repository.CustomerRepository;
import com.billingcrm.repository.InvoiceRepository;
import com.billingcrm.repository.VoiceSessionRepository;
import com.billingcrm.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final InvoiceRepository      invoiceRepository;
    private final CustomerRepository     customerRepository;
    private final VoiceSessionRepository voiceSessionRepository;

    @Override
    public DashboardStatsResponse getStats() {
        return DashboardStatsResponse.builder()
            .totalRevenue(invoiceRepository.sumTotalRevenue())
            .pendingRevenue(invoiceRepository.sumUnpaidRevenue())
            .totalCustomers(customerRepository.count())
            .activeCustomers(customerRepository.countByStatus(Customer.Status.ACTIVE))
            .totalInvoices(invoiceRepository.count())
            .pendingInvoices(invoiceRepository.countByStatus(Invoice.Status.UNPAID))
            .overdueInvoices(invoiceRepository.countOverdue(LocalDate.now()))
            .paidInvoices(invoiceRepository.countByStatus(Invoice.Status.PAID))
            .voiceSessions(voiceSessionRepository.count())
            .build();
    }
}