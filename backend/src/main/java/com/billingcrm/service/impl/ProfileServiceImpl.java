package com.billingcrm.service.impl;

import com.billingcrm.dto.request.UpdateProfileRequest;
import com.billingcrm.dto.response.UserProfileResponse;
import com.billingcrm.exception.ResourceNotFoundException;
import com.billingcrm.model.User;
import com.billingcrm.repository.UserRepository;
import com.billingcrm.service.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ProfileServiceImpl implements ProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserProfileResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", 0L));
        return mapToResponse(user);
    }

    @Override
    public UserProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", 0L));

        user.setName(request.getName());
        user.setShopName(request.getShopName());
        user.setPhoneNo(request.getPhoneNo());
        
        // Logical constraint: GST No cannot be changed once given
        if (user.getGstNo() == null || user.getGstNo().trim().isEmpty()) {
            user.setGstNo(request.getGstNo());
            user.setIsGstRegistered(request.getIsGstRegistered());
        } else if (request.getGstNo() != null && !request.getGstNo().equals(user.getGstNo())) {
             // Silently ignore or throw error? Let's just not change it.
        }

        // Address update
        user.setDoorNo(request.getDoorNo());
        user.setStreetName(request.getStreetName());
        user.setLandmark(request.getLandmark());
        user.setArea(request.getArea());
        user.setCity(request.getCity());
        user.setState(request.getState());
        user.setPincode(request.getPincode());

        // Password update
        if (request.getCurrentPassword() != null && !request.getCurrentPassword().isEmpty() 
            && request.getNewPassword() != null && !request.getNewPassword().isEmpty()) {
            
            if (passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            } else {
                throw new com.billingcrm.exception.BadRequestException("Current password does not match");
            }
        }

        userRepository.save(user);
        return mapToResponse(user);
    }

    private UserProfileResponse mapToResponse(User user) {
        return UserProfileResponse.builder()
                .name(user.getName())
                .shopName(user.getShopName())
                .email(user.getEmail())
                .phoneNo(user.getPhoneNo())
                .isGstRegistered(user.getIsGstRegistered())
                .gstNo(user.getGstNo())
                .doorNo(user.getDoorNo())
                .streetName(user.getStreetName())
                .landmark(user.getLandmark())
                .area(user.getArea())
                .city(user.getCity())
                .state(user.getState())
                .pincode(user.getPincode())
                .build();
    }
}
