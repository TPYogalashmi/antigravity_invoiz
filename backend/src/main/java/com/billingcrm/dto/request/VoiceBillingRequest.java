package com.billingcrm.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VoiceBillingRequest {

    @NotBlank(message = "Transcript is required")
    private String transcript;

    /** Optional: pre-resolved customer ID to skip name-based lookup */
    private Long customerId;
}