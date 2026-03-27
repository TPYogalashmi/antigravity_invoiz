package com.billingcrm.mapper;

import com.billingcrm.dto.response.InvoiceResponse;
import com.billingcrm.model.Invoice;
import com.billingcrm.model.InvoiceItem;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class InvoiceMapper {

    public InvoiceResponse toResponse(Invoice inv) {
        return InvoiceResponse.builder()
                .id(inv.getId())
                .invoiceNumber(inv.getInvoiceNumber())
                .customer(mapCustomer(inv))
                .createdByName(inv.getCreatedBy() != null ? inv.getCreatedBy().getName() : null)
                .items(mapItems(inv.getItems()))
                .totalAmount(inv.getTotalAmount())
                .totalGST(inv.getTotalGST())
                .discountPercent(inv.getDiscountPercent())
                .discountAmount(inv.getDiscountAmount())
                .finalAmount(inv.getFinalAmount())
                .currency(inv.getCurrency())
                .status(inv.getStatus().name())
                .issueDate(inv.getIssueDate())
                .dueDate(inv.getDueDate())
                .notes(inv.getNotes())
                .voiceTranscript(inv.getVoiceTranscript())
                .voiceGenerated(inv.isVoiceGenerated())
                .createdAt(inv.getCreatedAt())
                .updatedAt(inv.getUpdatedAt())
                .success(true)
                .build();
    }

    private InvoiceResponse.CustomerSummary mapCustomer(Invoice inv) {
        if (inv.getCustomer() == null)
            return null;
        return InvoiceResponse.CustomerSummary.builder()
                .id(inv.getCustomer().getId())
                .name(inv.getCustomer().getName())
                .email(inv.getCustomer().getEmail())
                .phone(inv.getCustomer().getPhone())
                .build();
    }

    private List<InvoiceResponse.InvoiceItemResponse> mapItems(List<InvoiceItem> items) {
        if (items == null)
            return List.of();
        return items.stream().map(item -> InvoiceResponse.InvoiceItemResponse.builder()
                .id(item.getId())
                .productId(item.getProduct() != null ? item.getProduct().getId() : null)
                .productName(item.getProduct() != null ? item.getProduct().getName() : null)
                .description(item.getDescription())
                .unit(item.getUnit())
                .quantity(item.getQuantity())
                .price(item.getPrice())
                .gstPercentage(item.getGstPercentage())
                .gstAmount(item.getGstAmount())
                .total(item.getTotal())
                .build()).collect(Collectors.toList());
    }
}