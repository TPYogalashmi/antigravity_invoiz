package com.billingcrm.client;

import com.billingcrm.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class AiServiceClient {

    private final WebClient webClient;

    public AiServiceClient(
            @Value("${app.ai-service.base-url:http://localhost:5000/api}") String baseUrl) {
        this.webClient = WebClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
            .defaultHeader("Accept",       MediaType.APPLICATION_JSON_VALUE)
            .build();
        log.info("[AiServiceClient] Configured — baseUrl={}", baseUrl);
    }

    /**
     * POST /api/nlp/intent
     * Sends transcript + inventory → returns structured billing intent.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> detectIntent(String transcript, List<String> inventory) {
        log.info("[AiServiceClient] Calling /nlp/intent — items in inventory: {}", 
            inventory != null ? inventory.size() : 0);

        Map<?, ?> raw = webClient.post()
            .uri("/nlp/intent")
            .bodyValue(Map.of(
                "transcript", transcript,
                "inventory",  inventory != null ? inventory : List.of()
            ))
            .retrieve()
            .bodyToMono(Map.class)
            .timeout(Duration.ofSeconds(30))
            .onErrorResume(WebClientResponseException.class, ex -> {
                log.error("[AiServiceClient] /nlp/intent HTTP error {} — body: {}",
                    ex.getStatusCode(), ex.getResponseBodyAsString());
                return Mono.error(new BadRequestException(
                    "AI NLP service error (" + ex.getStatusCode() + "): "
                    + ex.getResponseBodyAsString()));
            })
            .onErrorResume(Exception.class, ex -> {
                if (ex instanceof BadRequestException) return Mono.error(ex);
                log.error("[AiServiceClient] /nlp/intent unreachable: {}", ex.getMessage());
                return Mono.error(new BadRequestException(
                    "Flask AI service is unreachable. "
                    + "Ensure it is running and try again."));
            })
            .block();

        if (raw == null) {
            throw new BadRequestException("AI service returned an empty response for /nlp/intent");
        }

        // Validate required fields
        if (!raw.containsKey("intent")) {
            throw new BadRequestException(
                "AI service response missing required field: 'intent'");
        }
        if (!raw.containsKey("items") || !(raw.get("items") instanceof List<?>)) {
            throw new BadRequestException(
                "AI service response missing valid 'items' list");
        }

        log.info("[AiServiceClient] NLP RESPONSE — intent={} customer={} items={}",
            raw.get("intent"), raw.get("customerName"), raw.get("items"));

        return (Map<String, Object>) raw;
    }
}