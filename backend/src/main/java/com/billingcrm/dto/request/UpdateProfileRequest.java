package com.billingcrm.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UpdateProfileRequest {
    @NotBlank
    private String name;
    private String shopName;
    private String phoneNo;
    private Boolean isGstRegistered;
    private String gstNo;
    
    // Address
    private String doorNo;
    private String streetName;
    private String landmark;
    private String area;
    private String city;
    private String state;
    private String pincode;

    private String currentPassword;
    private String newPassword;
}
