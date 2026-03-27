package com.billingcrm.repository;

import com.billingcrm.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

        boolean existsBySku(String sku);

        /** Exact case-insensitive name match */
        List<Product> findByNameIgnoreCaseAndStatus(String name, Product.Status status);

        /** Exact case-insensitive alias match */
        List<Product> findByAliasIgnoreCaseAndStatus(String alias, Product.Status status);

        /** Substring / contains match — used for fuzzy pre-filtering */
        List<Product> findByNameContainingIgnoreCaseAndStatus(String name, Product.Status status);

        /** Return ALL active product names for in-memory fuzzy scoring */
        @Query("SELECT p FROM Product p WHERE p.status = 'AVAILABLE'")
        List<Product> findAllActive();

        @Query("""
                        SELECT p FROM Product p
                        WHERE (:search IS NULL OR
                               LOWER(p.name)  LIKE :search OR
                               LOWER(p.alias) LIKE :search OR
                               (:onlyName = false AND LOWER(p.description) LIKE :search) OR
                               (:onlyName = false AND LOWER(p.sku) LIKE :search))
                        AND (:status IS NULL OR p.status = :status)
                        """)
        Page<Product> findByFilters(
                        @Param("search") String search,
                        @Param("status") Product.Status status,
                        @Param("onlyName") boolean onlyName,
                        Pageable pageable);
}
