package com.billingcrm.service.impl;

import com.billingcrm.dto.request.AuthRequest;
import com.billingcrm.dto.response.AuthResponse;
import com.billingcrm.exception.DuplicateResourceException;
import com.billingcrm.model.User;
import com.billingcrm.repository.UserRepository;
import com.billingcrm.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthServiceImpl {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    public AuthResponse.TokenResponse login(AuthRequest.Login request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        String email = auth.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new com.billingcrm.exception.ResourceNotFoundException("User", 0L)); // Using 0L as
                                                                                                        // placeholder
                                                                                                        // for email
                                                                                                        // lookup

        String token = jwtService.generateToken(user);
        log.info("User logged in: {}", user.getEmail());
        return buildTokenResponse(token, user);
    }

    public AuthResponse.TokenResponse register(AuthRequest.Register request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }
        User.Role role = User.Role.USER;
        if (request.getRole() != null) {
            try {
                role = User.Role.valueOf(request.getRole().toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .enabled(true)
                .build();
        userRepository.save(user);
        String token = jwtService.generateToken(user);
        log.info("User registered: {}", user.getEmail());
        return buildTokenResponse(token, user);
    }

    private AuthResponse.TokenResponse buildTokenResponse(String token, User user) {
        return AuthResponse.TokenResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(jwtExpirationMs / 1000)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .role(user.getRole().name())
                        .build())
                .build();
    }
}