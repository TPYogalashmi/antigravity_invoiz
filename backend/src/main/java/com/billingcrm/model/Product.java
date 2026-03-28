package com.billingcrm.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column
    private String alias;

    @Column(columnDefinition = "TEXT")
    private String description;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @NotNull
    @Column(nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal gstPercentage = BigDecimal.ZERO;

    @Column
    private String sku;

    @Column
    private String unit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.AVAILABLE;

    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal agreedDiscount = BigDecimal.ZERO;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<InvoiceItem> invoiceItems = new ArrayList<>();

    @org.springframework.data.annotation.CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @org.springframework.data.annotation.LastModifiedDate
    private LocalDateTime updatedAt;

    public enum Status {
        AVAILABLE, OUT_OF_STOCK
    }
}