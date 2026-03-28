package com.billingcrm.service;

import com.billingcrm.dto.request.UpdateProfileRequest;
import com.billingcrm.dto.response.UserProfileResponse;

public interface ProfileService {
    UserProfileResponse getProfile(String email);
    UserProfileResponse updateProfile(String email, UpdateProfileRequest request);
}
