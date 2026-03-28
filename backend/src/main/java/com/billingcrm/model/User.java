package com.billingcrm.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column
    private String shopName;

    @Email
    @NotBlank
    @Column(nullable = false, unique = true)
    private String email;

    @Column
    private String phoneNo;

    @NotBlank
    @Column(nullable = false)
    private String password;

    @Column
    @Builder.Default
    private Boolean isGstRegistered = false;

    @Column
    private String gstNo;

    // Address fields
    @Column private String doorNo;
    @Column private String streetName;
    @Column private String landmark;
    @Column private String area;
    @Column private String city;
    @Column private String state;
    @Column private String pincode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum Role {
        ADMIN, USER, MANAGER
    }
}