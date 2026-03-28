package com.billingcrm.repository;

import com.billingcrm.model.CustomerProductDiscount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerProductDiscountRepository extends JpaRepository<CustomerProductDiscount, Long> {
    Optional<CustomerProductDiscount> findByCustomerIdAndProductId(Long customerId, Long productId);
    List<CustomerProductDiscount> findByCustomerId(Long customerId);
}
