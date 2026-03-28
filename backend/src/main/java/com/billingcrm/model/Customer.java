package com.billingcrm.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Email
    @Column
    private String email;

    private String phone;
    private String company;
    private String address;
    private String city;
    private String state;
    private String country;
    private String postalCode;
    private String taxId;
    @Column(precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal agreedDiscount = java.math.BigDecimal.ZERO;

    private String notes;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.ACTIVE;

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Invoice> invoices = new ArrayList<>();

    @org.springframework.data.annotation.CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @org.springframework.data.annotation.LastModifiedDate
    private LocalDateTime updatedAt;

    public enum Status {
        ACTIVE, INACTIVE, SUSPENDED, BLACKLISTED
    }
}