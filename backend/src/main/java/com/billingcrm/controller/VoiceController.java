package com.billingcrm.controller;
 
import com.billingcrm.client.AiServiceClient;
import com.billingcrm.dto.request.InvoiceRequest;
import com.billingcrm.dto.request.VoiceBillingRequest;
import com.billingcrm.dto.response.ApiResponse;
import com.billingcrm.dto.response.InvoiceResponse;
import com.billingcrm.exception.BadRequestException;
import com.billingcrm.model.User;
import com.billingcrm.model.VoiceSession;
import com.billingcrm.repository.VoiceSessionRepository;
import com.billingcrm.service.InvoiceService;
import com.billingcrm.service.ProductMatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
 
    @PostMapping("/process-voice")
    @SuppressWarnings("unchecked")
    public ResponseEntity<ApiResponse<Map<String, Object>>> processVoice(
            @Valid @RequestBody VoiceBillingRequest request,
            @AuthenticationPrincipal User user) {
 
        log.info("[VoiceController] process-voice — user={} transcript: {}", user.getEmail(), request.getTranscript());
 
        List<com.billingcrm.model.Product> allProducts = productRepository.findByUserId(user.getId());
        List<String> inventory = new java.util.ArrayList<>();
        for (com.billingcrm.model.Product p : allProducts) {
            inventory.add(p.getName());
            if (p.getAlias() != null && !p.getAlias().isBlank()) {
                inventory.add(p.getAlias());
            }
        }
 
        Map<String, Object> aiResult = aiServiceClient.detectIntent(request.getTranscript(), inventory);
 
        if (aiResult.get("items") instanceof List<?> items) {
            for (Object item : items) {
                if (item instanceof Map<?, ?> itemMap) {
                    Map<String, Object> writableMap = (Map<String, Object>) itemMap;
                    String rawName = (String) writableMap.get("name");
                    if (rawName != null && !rawName.isBlank()) {
                        try {
                            com.billingcrm.model.Product p = productMatchService.resolve(rawName.trim(), user.getId());
                            String status = p.getStatus().name();
                            writableMap.put("status", status);
                            writableMap.put("fullName", p.getName());
                            writableMap.put("price", p.getPrice());
                        } catch (Exception e) {
                            log.warn("[VoiceController] Could not resolve item '{}': {}", rawName, e.getMessage());
                            writableMap.put("status", "NOT_FOUND");
                        }
                    }
                }
            }
        }
 
        persistVoiceSession(request.getTranscript(), aiResult, null, user);
        return ResponseEntity.ok(ApiResponse.success("Voice processed", aiResult));
    }
 
    @PostMapping("/process-voice/generate-invoice")
    public ResponseEntity<ApiResponse<InvoiceResponse>> generateInvoiceFromVoice(
            @Valid @RequestBody VoiceBillingRequest request,
            @AuthenticationPrincipal User user) {
 
        log.info("[VoiceController] generate-invoice — user={} transcript: {}", user.getEmail(), request.getTranscript());
 
        List<String> inventory = productRepository.findByUserId(user.getId()).stream()
                .map(com.billingcrm.model.Product::getName)
                .toList();
 
        Map<String, Object> aiResult = aiServiceClient.detectIntent(request.getTranscript(), inventory);
 
        InvoiceRequest invoiceReq = buildInvoiceRequest(aiResult, request);
        InvoiceResponse invoice = invoiceService.create(invoiceReq, user.getId());
        persistVoiceSession(request.getTranscript(), aiResult, invoice.getId(), user);
 
        return ResponseEntity.ok(ApiResponse.success("Invoice generated from voice", invoice));
    }
 
    @SuppressWarnings("unchecked")
    private InvoiceRequest buildInvoiceRequest(
            Map<String, Object> ai, VoiceBillingRequest voiceReq) {
 
        InvoiceRequest req = new InvoiceRequest();
        req.setVoiceTranscript(voiceReq.getTranscript());
        req.setVoiceGenerated(true);
        req.setCurrency("INR");
        req.setStatus("DRAFT");
 
        if (voiceReq.getCustomerId() != null) {
            req.setCustomerId(voiceReq.getCustomerId());
        } else {
            String customerName = ai.containsKey("customerName") && ai.get("customerName") != null
                ? ai.get("customerName").toString().trim()
                : null;
            if (customerName == null || customerName.isBlank()) {
                throw new BadRequestException("Customer name could not be extracted.");
            }
            req.setCustomerName(customerName);
        }
 
        if (ai.containsKey("dueInDays") && ai.get("dueInDays") != null) {
            int days = Integer.parseInt(ai.get("dueInDays").toString());
            req.setDueDate(LocalDate.now().plusDays(days));
        }
 
        if (ai.containsKey("notes") && ai.get("notes") != null) {
            req.setNotes(ai.get("notes").toString());
        }
 
        if (ai.containsKey("discountPercent") && ai.get("discountPercent") != null) {
            req.setDiscountPercent(new BigDecimal(ai.get("discountPercent").toString()));
        }
 
        Object rawItems = ai.get("items");
        if (!(rawItems instanceof List<?> itemList) || itemList.isEmpty()) {
            throw new BadRequestException("No items detected.");
        }
 
        List<InvoiceRequest.InvoiceItemDTO> items = new ArrayList<>();
        for (Object rawItem : itemList) {
            if (!(rawItem instanceof Map<?, ?> itemMap)) continue;
 
            String productName = itemMap.containsKey("name") && itemMap.get("name") != null
                ? itemMap.get("name").toString().trim()
                : null;
 
            if (productName == null || productName.isBlank()) continue;
 
            BigDecimal quantity = itemMap.containsKey("quantity") && itemMap.get("quantity") != null
                ? new BigDecimal(itemMap.get("quantity").toString())
                : BigDecimal.ONE;
 
            InvoiceRequest.InvoiceItemDTO item = new InvoiceRequest.InvoiceItemDTO();
            item.setProductName(productName);
            item.setDescription(productName);
            item.setQuantity(quantity);
            items.add(item);
        }
 
        if (items.isEmpty()) {
            throw new BadRequestException("No valid items extracted.");
        }
 
        req.setItems(items);
        return req;
    }
 
    private void persistVoiceSession(
            String transcript,
            Map<String, Object> aiResult,
            Long invoiceId,
            User user) {
        try {
            if (user == null) return;
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
        } catch (Exception e) {
            log.warn("[VoiceController] Failed to persist VoiceSession: {}", e.getMessage());
        }
    }
}