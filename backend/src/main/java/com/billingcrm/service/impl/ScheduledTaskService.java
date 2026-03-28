package com.billingcrm.service.impl;
 
import com.billingcrm.model.Invoice;
import com.billingcrm.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
 
import java.time.LocalDate;
 
@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledTaskService {
 
    private final InvoiceRepository invoiceRepository;
 
    /**
     * Daily background job to update overdue statuses at midnight.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void runDailyOverdueCheck() {
        log.info("Starting daily background overdue check...");
        int updated = invoiceRepository.updateAllOverdueStatus(LocalDate.now(), Invoice.Status.UNPAID, Invoice.Status.OVERDUE);
        log.info("Finished background overdue check. Updated {} invoices to OVERDUE.", updated);
    }
}
