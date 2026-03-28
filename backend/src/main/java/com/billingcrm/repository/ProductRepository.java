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

    @Query("SELECT p FROM Product p WHERE p.user.id = :userId AND " +
            "(:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.alias) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
            "(:status IS NULL OR p.status = :status)")
    Page<Product> findAll(@Param("search") String search,
                    @Param("status") Product.Status status,
                    @Param("userId") Long userId,
                    Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.user.id = :userId AND " +
            "(:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.alias) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
            "(:status IS NULL OR p.status = :status)")
    Page<Product> findByFilters(
                    @Param("search") String search,
                    @Param("status") Product.Status status,
                    @Param("userId") Long userId,
                    Pageable pageable);

    boolean existsBySkuAndUserId(String sku, Long userId);

    List<Product> findByUserIdAndNameIgnoreCaseAndStatus(Long userId, String name, Product.Status status);

    List<Product> findByUserIdAndAliasIgnoreCaseAndStatus(Long userId, String alias, Product.Status status);

    List<Product> findByUserIdAndNameContainingIgnoreCaseAndStatus(Long userId, String name, Product.Status status);

    @Query("""
            SELECT p, AVG(ii.quantity) as avgQty, COUNT(DISTINCT i.id) as purchaseCount FROM Product p
            JOIN InvoiceItem ii ON ii.product.id = p.id
            JOIN Invoice i ON ii.invoice.id = i.id
            WHERE i.customer.id = :customerId AND p.user.id = :userId AND i.user.id = :userId
            GROUP BY p.id
            ORDER BY COUNT(DISTINCT i.id) DESC
            """)
    List<Object[]> findTopProductsWithAvgQtyByCustomer(@Param("customerId") Long customerId, @Param("userId") Long userId, Pageable pageable);

    @Query("""
            SELECT p.name, AVG(ii.quantity) FROM Product p
            JOIN InvoiceItem ii ON ii.product.id = p.id
            JOIN Invoice i ON ii.invoice.id = i.id
            WHERE i.issueDate = :date AND p.user.id = :userId AND i.user.id = :userId
            GROUP BY p.id
            ORDER BY SUM(ii.quantity) DESC
            """)
    List<Object[]> findTopProductsByDate(@Param("date") LocalDate date, @Param("userId") Long userId, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.user.id = :userId AND p.status = 'OUT_OF_STOCK'")
    List<Product> findOutOfStockProducts(@Param("userId") Long userId);

    java.util.Optional<Product> findByIdAndUserId(Long id, Long userId);
 
    List<Product> findByUserId(Long userId);
}
