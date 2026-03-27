package com.billingcrm.controller;

import com.billingcrm.dto.request.AuthRequest;
import com.billingcrm.dto.response.ApiResponse;
import com.billingcrm.dto.response.AuthResponse;
import com.billingcrm.service.impl.AuthServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthServiceImpl authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse.TokenResponse>> login(
            @Valid @RequestBody AuthRequest.Login request) {
        AuthResponse.TokenResponse token = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", token));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse.TokenResponse>> register(
            @Valid @RequestBody AuthRequest.Register request) {
        AuthResponse.TokenResponse token = authService.register(request);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.success("Registration successful", token));
    }
}