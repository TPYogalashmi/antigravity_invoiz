package com.billingcrm.repository;

import com.billingcrm.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("SELECT p FROM Product p WHERE " +
            "(:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.alias) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
            "(:status IS NULL OR p.status = :status)")
    Page<Product> findAll(@Param("search") String search,
                    @Param("status") Product.Status status,
                    Pageable pageable);

    @Query("SELECT p FROM Product p WHERE " +
            "(:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.alias) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
            "(:status IS NULL OR p.status = :status)")
    Page<Product> findByFilters(
                    @Param("search") String search,
                    @Param("status") Product.Status status,
                    Pageable pageable);

    boolean existsBySku(String sku);

    List<Product> findByNameIgnoreCaseAndStatus(String name, Product.Status status);

    List<Product> findByAliasIgnoreCaseAndStatus(String alias, Product.Status status);

    List<Product> findByNameContainingIgnoreCaseAndStatus(String name, Product.Status status);

    @Query("""
            SELECT p, AVG(ii.quantity) as avgQty, COUNT(DISTINCT i.id) as purchaseCount FROM Product p
            JOIN InvoiceItem ii ON ii.product.id = p.id
            JOIN Invoice i ON ii.invoice.id = i.id
            WHERE i.customer.id = :customerId
            GROUP BY p.id
            ORDER BY COUNT(DISTINCT i.id) DESC
            """)
    List<Object[]> findTopProductsWithAvgQtyByCustomer(@Param("customerId") Long customerId, Pageable pageable);

    @Query("""
            SELECT p.name, AVG(ii.quantity) FROM Product p
            JOIN InvoiceItem ii ON ii.product.id = p.id
            JOIN Invoice i ON ii.invoice.id = i.id
            WHERE i.issueDate = :date
            GROUP BY p.id
            ORDER BY SUM(ii.quantity) DESC
            """)
    List<Object[]> findTopProductsByDate(@Param("date") LocalDate date, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.status = 'OUT_OF_STOCK'")
    List<Product> findOutOfStockProducts();
}
