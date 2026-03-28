package com.billingcrm.repository;

import com.billingcrm.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

        Optional<Customer> findByUserIdAndEmail(Long userId, String email);

        boolean existsByUserIdAndEmail(Long userId, String email);

        /** Exact case-insensitive name match */
        Optional<Customer> findByUserIdAndNameIgnoreCase(Long userId, String name);

        /** Partial name match — used when exact lookup fails */
        List<Customer> findByUserIdAndNameContainingIgnoreCase(Long userId, String name);

        @Query("""
                        SELECT c FROM Customer c
                        WHERE c.user.id = :userId AND
                               (:search IS NULL OR
                               LOWER(c.name)    LIKE :search OR
                               LOWER(c.email)   LIKE :search OR
                               LOWER(COALESCE(c.phone, '')) LIKE :search OR
                               LOWER(COALESCE(c.company, '')) LIKE :search)
                        AND (:status IS NULL OR c.status = :status)
                        AND (:hasTaxId IS NULL OR (
                             (:hasTaxId = true AND c.taxId IS NOT NULL AND c.taxId != '') OR
                             (:hasTaxId = false AND (c.taxId IS NULL OR c.taxId = ''))
                        ))
                        """)
        Page<Customer> findByFilters(
                        @Param("search") String search,
                        @Param("status") Customer.Status status,
                        @Param("hasTaxId") Boolean hasTaxId,
                        @Param("userId") Long userId,
                        Pageable pageable);

        long countByUserIdAndStatus(Long userId, Customer.Status status);

        Optional<Customer> findByIdAndUserId(Long id, Long userId);
}