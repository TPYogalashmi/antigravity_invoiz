package com.billingcrm.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "voice_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VoiceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(columnDefinition = "TEXT")
    private String transcript;

    @Column(columnDefinition = "TEXT")
    private String aiResponse;

    private String detectedIntent;
    private Double confidenceScore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "generated_invoice_id")
    private Invoice generatedInvoice;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.PROCESSED;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public enum Status {
        PROCESSING, PROCESSED, FAILED
    }
}