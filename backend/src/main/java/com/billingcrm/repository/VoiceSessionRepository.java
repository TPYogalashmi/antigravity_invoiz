package com.billingcrm.repository;

import com.billingcrm.model.VoiceSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VoiceSessionRepository extends JpaRepository<VoiceSession, Long> {
    Page<VoiceSession> findByUserId(Long userId, Pageable pageable);
    long countByUserId(Long userId);
}