package com.billingcrm.controller;

import com.billingcrm.client.AiServiceClient;
import com.billingcrm.dto.request.InvoiceRequest;
import com.billingcrm.dto.request.VoiceBillingRequest;
import com.billingcrm.dto.response.ApiResponse;
import com.billingcrm.dto.response.InvoiceResponse;
import com.billingcrm.exception.BadRequestException;
import com.billingcrm.model.VoiceSession;
import com.billingcrm.repository.UserRepository;
import com.billingcrm.repository.VoiceSessionRepository;
import com.billingcrm.service.InvoiceService;
import com.billingcrm.service.ProductMatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Slf4j
public class VoiceController {

    private final AiServiceClient        aiServiceClient;
    private final InvoiceService         invoiceService;
    private final ProductMatchService    productMatchService;
    private final com.billingcrm.repository.ProductRepository productRepository;
    private final VoiceSessionRepository voiceSessionRepository;
    private final UserRepository         userRepository;

    // ── 1. Receive transcript, call AI, return structured intent ──────────
    @PostMapping("/process-voice")
    @SuppressWarnings("unchecked")
    public ResponseEntity<ApiResponse<Map<String, Object>>> processVoice(
            @Valid @RequestBody VoiceBillingRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        log.info("[VoiceController] process-voice — transcript: {}", request.getTranscript());

        // Fetch dynamic inventory (Names + Aliases) for accurate NLP matching
        List<com.billingcrm.model.Product> allProducts = productRepository.findAll();
        List<String> inventory = new java.util.ArrayList<>();
        for (com.billingcrm.model.Product p : allProducts) {
            inventory.add(p.getName());
            if (p.getAlias() != null && !p.getAlias().isBlank()) {
                inventory.add(p.getAlias());
            }
        }

        Map<String, Object> aiResult = aiServiceClient.detectIntent(request.getTranscript(), inventory);

        // ── ENRICHMENT: Resolve product availability for UI warnings ──
        if (aiResult.get("items") instanceof List<?> items) {
            for (Object item : items) {
                if (item instanceof Map<?, ?> itemMap) {
                    Map<String, Object> writableMap = (Map<String, Object>) itemMap;
                    String rawName = (String) writableMap.get("name");
                    if (rawName != null && !rawName.isBlank()) {
                        try {
                            com.billingcrm.model.Product p = productMatchService.resolve(rawName.trim());
                            String status = p.getStatus().name(); // Use .name() for exact "INACTIVE"
                            writableMap.put("status", status);
                            writableMap.put("fullName", p.getName());
                            writableMap.put("price", p.getPrice());
                            log.info("[VoiceController] Enriched item '{}': status={}, fullName='{}'", 
                                rawName, status, p.getName());
                        } catch (Exception e) {
                            log.warn("[VoiceController] Could not resolve item '{}': {}", rawName, e.getMessage());
                            writableMap.put("status", "NOT_FOUND");
                        }
                    }
                }
            }
        }

        persistVoiceSession(request.getTranscript(), aiResult, null, principal);
        return ResponseEntity.ok(ApiResponse.success("Voice processed", aiResult));
    }

    // ── 2. Full pipeline: transcript → AI → invoice ───────────────────────
    @PostMapping("/process-voice/generate-invoice")
    public ResponseEntity<ApiResponse<InvoiceResponse>> generateInvoiceFromVoice(
            @Valid @RequestBody VoiceBillingRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        log.info("[VoiceController] generate-invoice — transcript: {}", request.getTranscript());

        // Step A: call Flask NLP with dynamic inventory (including inactive)
        List<String> inventory = productRepository.findAll().stream()
                .map(com.billingcrm.model.Product::getName)
                .toList();

        Map<String, Object> aiResult = aiServiceClient.detectIntent(request.getTranscript(), inventory);

        log.info("[VoiceController] NLP RESPONSE: {}", aiResult);

        // Step B: build InvoiceRequest from NLP result
        InvoiceRequest invoiceReq = buildInvoiceRequest(aiResult, request);

        log.info("[VoiceController] InvoiceRequest built — customer='{}' items={}",
            invoiceReq.getCustomerName(), invoiceReq.getItems().size());

        // Step C: create invoice
        Long userId = resolveUserId(principal);
        InvoiceResponse invoice = invoiceService.create(invoiceReq, userId);

        log.info("[VoiceController] INVOICE CREATED — number={} customer='{}' total=₹{}",
            invoice.getInvoiceNumber(),
            invoice.getCustomer() != null ? invoice.getCustomer().getName() : "?",
            invoice.getFinalAmount());

        // Step D: persist voice session
        persistVoiceSession(request.getTranscript(), aiResult, invoice.getId(), principal);

        return ResponseEntity.ok(ApiResponse.success("Invoice generated from voice", invoice));
    }

    // ── Map AI NLP result → InvoiceRequest ───────────────────────────────

    @SuppressWarnings("unchecked")
    private InvoiceRequest buildInvoiceRequest(
            Map<String, Object> ai, VoiceBillingRequest voiceReq) {

        InvoiceRequest req = new InvoiceRequest();
        req.setVoiceTranscript(voiceReq.getTranscript());
        req.setVoiceGenerated(true);
        req.setCurrency("INR");
        req.setStatus("DRAFT");

        // ── Customer ──────────────────────────────────────────────────
        if (voiceReq.getCustomerId() != null) {
            req.setCustomerId(voiceReq.getCustomerId());
        } else {
            String customerName = ai.containsKey("customerName") && ai.get("customerName") != null
                ? ai.get("customerName").toString().trim()
                : null;
            if (customerName == null || customerName.isBlank()) {
                throw new BadRequestException(
                    "Customer name could not be extracted from the voice input. "
                    + "Please say something like: 'Create invoice for [customer name]'.");
            }
            req.setCustomerName(customerName);
            log.info("[VoiceController] Resolved customer from NLP: '{}'", customerName);
        }

        // ── Due date ──────────────────────────────────────────────────
        if (ai.containsKey("dueInDays") && ai.get("dueInDays") != null) {
            int days = Integer.parseInt(ai.get("dueInDays").toString());
            req.setDueDate(LocalDate.now().plusDays(days));
        }

        // ── Notes ─────────────────────────────────────────────────────
        if (ai.containsKey("notes") && ai.get("notes") != null) {
            req.setNotes(ai.get("notes").toString());
        }

        // ── Discount ──────────────────────────────────────────────────
        if (ai.containsKey("discountPercent") && ai.get("discountPercent") != null) {
            req.setDiscountPercent(new BigDecimal(ai.get("discountPercent").toString()));
        }

        // ── Items ─────────────────────────────────────────────────────
        Object rawItems = ai.get("items");
        if (!(rawItems instanceof List<?> itemList) || itemList.isEmpty()) {
            throw new BadRequestException(
                "No items were detected in the voice input. "
                + "Please mention the products and quantities you want to invoice.");
        }

        List<InvoiceRequest.InvoiceItemDTO> items = new ArrayList<>();
        for (Object rawItem : itemList) {
            if (!(rawItem instanceof Map<?, ?> itemMap)) continue;

            String productName = itemMap.containsKey("name") && itemMap.get("name") != null
                ? itemMap.get("name").toString().trim()
                : null;

            if (productName == null || productName.isBlank()) {
                log.warn("[VoiceController] Skipping item with blank name: {}", itemMap);
                continue;
            }

            BigDecimal quantity = itemMap.containsKey("quantity") && itemMap.get("quantity") != null
                ? new BigDecimal(itemMap.get("quantity").toString())
                : BigDecimal.ONE;

            if (quantity.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException(
                    "Invalid quantity (" + quantity + ") for item '" + productName + "'");
            }

            log.info("[VoiceController] Item mapped — name='{}' quantity={}", productName, quantity);

            InvoiceRequest.InvoiceItemDTO item = new InvoiceRequest.InvoiceItemDTO();
            item.setProductName(productName);
            item.setDescription(productName);
            item.setQuantity(quantity);
            // price + gstPercentage resolved from DB via ProductMatchService
            items.add(item);
        }

        if (items.isEmpty()) {
            throw new BadRequestException(
                "No valid items could be extracted from the voice input.");
        }

        req.setItems(items);
        return req;
    }

    // ── Persist VoiceSession (non-critical) ───────────────────────────────

    private void persistVoiceSession(
            String transcript,
            Map<String, Object> aiResult,
            Long invoiceId,
            UserDetails principal) {
        try {
            if (principal == null) return;
            userRepository.findByEmail(principal.getUsername()).ifPresent(user -> {
                VoiceSession session = VoiceSession.builder()
                    .user(user)
                    .transcript(transcript)
                    .aiResponse(aiResult.toString())
                    .detectedIntent(aiResult.containsKey("intent")
                        ? aiResult.get("intent").toString() : "UNKNOWN")
                    .confidenceScore(aiResult.containsKey("confidence") && aiResult.get("confidence") != null
                        ? Double.valueOf(aiResult.get("confidence").toString()) : null)
                    .status(VoiceSession.Status.PROCESSED)
                    .build();
                voiceSessionRepository.save(session);
                log.debug("[VoiceController] VoiceSession saved for user={}", user.getEmail());
            });
        } catch (Exception e) {
            log.warn("[VoiceController] Failed to persist VoiceSession: {}", e.getMessage());
        }
    }

    private Long resolveUserId(UserDetails principal) {
        if (principal == null) return null;
        return userRepository.findByEmail(principal.getUsername())
            .map(u -> u.getId())
            .orElse(null);
    }
}