package com.billingcrm.service.impl;

import com.billingcrm.dto.request.CustomerRequest;
import com.billingcrm.dto.response.CustomerResponse;
import com.billingcrm.exception.DuplicateResourceException;
import com.billingcrm.exception.ResourceNotFoundException;
import com.billingcrm.mapper.CustomerMapper;
import com.billingcrm.model.Customer;
import com.billingcrm.repository.CustomerRepository;
import com.billingcrm.service.CustomerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerMapper customerMapper;

    @Override
    public CustomerResponse create(CustomerRequest request) {
        if (request.getEmail() != null && customerRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Customer", "email", request.getEmail());
        }
        Customer saved = customerRepository.save(customerMapper.toEntity(request));
        log.info("Created customer id={} name={}", saved.getId(), saved.getName());
        return customerMapper.toResponse(saved);
    }

    @Override
    public CustomerResponse update(Long id, CustomerRequest request) {
        Customer customer = findCustomerById(id);
        if (request.getEmail() != null
                && !request.getEmail().equalsIgnoreCase(customer.getEmail())
                && customerRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Customer", "email", request.getEmail());
        }
        customerMapper.updateEntity(customer, request);
        Customer saved = customerRepository.save(customer);
        log.info("Updated customer id={}", saved.getId());
        return customerMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse findById(Long id) {
        return customerMapper.toResponse(findCustomerById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomerResponse> findAll(String search, String status, Boolean hasTaxId, Pageable pageable) {
        Customer.Status statusEnum = null;
        if (status != null && !status.isBlank()) {
            statusEnum = Customer.Status.valueOf(status.toUpperCase());
        }

        String searchParam = (search == null || search.isBlank())
                ? null
                : "%" + search.toLowerCase() + "%";

        return customerRepository.findByFilters(
                searchParam,
                statusEnum,
                hasTaxId,
                pageable).map(customerMapper::toResponse);
    }

    @Override
    public void delete(Long id) {
        Customer customer = findCustomerById(id);
        customer.setStatus(Customer.Status.SUSPENDED);
        customerRepository.save(customer);
        log.info("Soft-deleted (Suspended) customer id={}", id);
    }

    private Customer findCustomerById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", id));
    }
}