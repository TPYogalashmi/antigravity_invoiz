package com.billingcrm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UserProfileResponse {
    private String name;
    private String shopName;
    private String email;
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
}
