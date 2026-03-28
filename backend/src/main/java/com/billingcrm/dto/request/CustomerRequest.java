package com.billingcrm.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CustomerRequest {

    @NotBlank(message = "Name is required")
    @jakarta.validation.constraints.Size(min = 3, message = "Name must be at least 3 characters")
    private String name;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be exactly 10 digits")
    private String phone;

    @Email(message = "Valid email address required")
    private String email;

    private String company;
    private String address;
    private String city;
    private String state;
    private String country;
    private String postalCode;
    private String taxId;
    private java.math.BigDecimal agreedDiscount;
    private String notes;
    private String status;
}