package com.billingcrm.controller;

import com.billingcrm.dto.request.UpdateProfileRequest;
import com.billingcrm.dto.response.ApiResponse;
import com.billingcrm.dto.response.UserProfileResponse;
import com.billingcrm.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(Principal principal) {
        return ResponseEntity.ok(ApiResponse.success(
            "Profile fetched successfully", 
            profileService.getProfile(principal.getName())
        ));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            Principal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
            "Profile updated successfully", 
            profileService.updateProfile(principal.getName(), request)
        ));
    }
}
