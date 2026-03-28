package com.billingcrm.repository;

import com.billingcrm.model.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

        Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

        boolean existsByInvoiceNumber(String invoiceNumber);

        Page<Invoice> findByCustomerId(Long customerId, Pageable pageable);

        java.util.List<Invoice> findByCustomerIdOrderByIssueDateDesc(Long customerId);

        @Query("""
               SELECT i FROM Invoice i
               LEFT JOIN i.customer c
               WHERE (:search IS NULL OR
                      LOWER(i.invoiceNumber) LIKE :search OR
                      LOWER(c.name) LIKE :search OR
                      LOWER(c.company) LIKE :search OR
                      LOWER(c.phone) LIKE :search)
               AND (:status IS NULL OR i.status = :status)
               AND (:customerId IS NULL OR c.id = :customerId)
               AND (:startDate IS NULL OR i.issueDate >= :startDate)
               AND (:endDate IS NULL OR i.issueDate <= :endDate)
               AND (:minAmount IS NULL OR i.finalAmount >= :minAmount)
               AND (:type IS NULL OR 
                    (:type = 'B2B' AND c.taxId IS NOT NULL) OR 
                    (:type = 'B2C' AND c.taxId IS NULL))
               """)
        Page<Invoice> findByFilters(
                        @Param("search") String search,
                        @Param("status") Invoice.Status status,
                        @Param("customerId") Long customerId,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate,
                        @Param("minAmount") BigDecimal minAmount,
                        @Param("type") String type,
                        Pageable pageable);

        @Query("SELECT COALESCE(SUM(i.finalAmount),0) FROM Invoice i WHERE i.status = 'PAID'")
        BigDecimal sumTotalRevenue();

        @Query("SELECT COALESCE(SUM(i.finalAmount),0) FROM Invoice i WHERE i.status = 'UNPAID'")
        BigDecimal sumUnpaidRevenue();

        long countByStatus(Invoice.Status status);

        @Query("SELECT COUNT(i) FROM Invoice i WHERE i.dueDate < :today AND i.status = 'UNPAID'")
        long countOverdue(@Param("today") LocalDate today);

        @Query("SELECT MAX(CAST(SUBSTRING(i.invoiceNumber, LENGTH(i.invoiceNumber) - 3) AS int)) " +
               "FROM Invoice i WHERE i.invoiceNumber LIKE CONCAT('INV-', :prefix, '-%')")
        Optional<Integer> findMaxSequenceForDate(@Param("prefix") String datePrefix);

        @Query("SELECT COALESCE(SUM(i.finalAmount),0) FROM Invoice i WHERE i.issueDate = :date")
        BigDecimal sumRevenueByDate(@Param("date") LocalDate date);

        @Query("SELECT COALESCE(SUM(i.finalAmount),0) FROM Invoice i WHERE i.issueDate >= :startDate AND i.issueDate <= :endDate")
        BigDecimal sumRevenueBetweenDates(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

        @Query("SELECT COUNT(i) FROM Invoice i WHERE i.issueDate = :date")
        long countTotalOrdersByDate(@Param("date") LocalDate date);

        @Query("SELECT COUNT(i) FROM Invoice i WHERE i.issueDate >= :startDate AND i.issueDate <= :endDate")
        long countTotalOrdersBetweenDates(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

        @Query("SELECT i.issueDate, SUM(i.finalAmount) FROM Invoice i WHERE i.issueDate >= :startDate AND i.issueDate <= :endDate GROUP BY i.issueDate ORDER BY i.issueDate ASC")
        List<Object[]> getDailyRevenueBetweenDates(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}