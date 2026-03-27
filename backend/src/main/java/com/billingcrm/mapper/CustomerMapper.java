package com.billingcrm.mapper;

import com.billingcrm.dto.request.CustomerRequest;
import com.billingcrm.dto.response.CustomerResponse;
import com.billingcrm.model.Customer;
import org.springframework.stereotype.Component;

@Component
public class CustomerMapper {

    public Customer toEntity(CustomerRequest req) {
        return Customer.builder()
                .name(req.getName())
                .phone(req.getPhone())
                .email(req.getEmail())
                .company(req.getCompany())
                .address(req.getAddress())
                .city(req.getCity())
                .state(req.getState())
                .country(req.getCountry())
                .postalCode(req.getPostalCode())
                .taxId(req.getTaxId())
                .notes(req.getNotes())
                .status(req.getStatus() != null
                        ? Customer.Status.valueOf(req.getStatus().toUpperCase())
                        : Customer.Status.ACTIVE)
                .build();
    }

    public CustomerResponse toResponse(Customer c) {
        return CustomerResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .phone(c.getPhone())
                .email(c.getEmail())
                .company(c.getCompany())
                .address(c.getAddress())
                .city(c.getCity())
                .state(c.getState())
                .country(c.getCountry())
                .postalCode(c.getPostalCode())
                .taxId(c.getTaxId())
                .notes(c.getNotes())
                .status(c.getStatus().name())
                .totalInvoices(c.getInvoices() != null ? c.getInvoices().size() : 0L)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    public void updateEntity(Customer customer, CustomerRequest req) {
        if (req.getName() != null)
            customer.setName(req.getName());
        if (req.getPhone() != null)
            customer.setPhone(req.getPhone());
        if (req.getEmail() != null)
            customer.setEmail(req.getEmail());
        if (req.getCompany() != null)
            customer.setCompany(req.getCompany());
        if (req.getAddress() != null)
            customer.setAddress(req.getAddress());
        if (req.getCity() != null)
            customer.setCity(req.getCity());
        if (req.getState() != null)
            customer.setState(req.getState());
        if (req.getCountry() != null)
            customer.setCountry(req.getCountry());
        if (req.getPostalCode() != null)
            customer.setPostalCode(req.getPostalCode());
        if (req.getTaxId() != null)
            customer.setTaxId(req.getTaxId());
        if (req.getNotes() != null)
            customer.setNotes(req.getNotes());
        if (req.getStatus() != null)
            customer.setStatus(Customer.Status.valueOf(req.getStatus().toUpperCase()));
    }
}