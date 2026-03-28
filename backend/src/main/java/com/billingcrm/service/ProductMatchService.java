package com.billingcrm.service;

import com.billingcrm.exception.BadRequestException;
import com.billingcrm.exception.ResourceNotFoundException;
import com.billingcrm.model.Product;
import com.billingcrm.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.text.similarity.JaroWinklerSimilarity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Matches a raw product name string to an actual Product entity in the
 * database.
 *
 * Matching strategy (in order):
 * 1. Exact case-insensitive name match
 * 2. Contains match (DB-level LIKE)
 * 3. In-memory Jaro-Winkler fuzzy match across all active products
 *
 * Rejects if the best fuzzy score is below FUZZY_THRESHOLD.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProductMatchService {

    private static final double FUZZY_THRESHOLD = 0.72;

    private final ProductRepository productRepository;
    private final JaroWinklerSimilarity jaroWinkler = new JaroWinklerSimilarity();

    /**
     * Resolve a raw name to a Product (Active or Inactive) for a specific user.
     * Never returns null — throws a meaningful exception when no match is found.
     */
    public Product resolve(String rawName, Long userId) {
        if (rawName == null || rawName.isBlank()) {
            throw new BadRequestException("Product name must not be blank");
        }

        String name = rawName.trim();

        // 1. Exact Name/Alias match (Prefer AVAILABLE)
        List<Product> exactActive = productRepository.findByUserIdAndNameIgnoreCaseAndStatus(userId, name, Product.Status.AVAILABLE);
        if (!exactActive.isEmpty()) return exactActive.get(0);

        List<Product> exactAliasActive = productRepository.findByUserIdAndAliasIgnoreCaseAndStatus(userId, name, Product.Status.AVAILABLE);
        if (!exactAliasActive.isEmpty()) return exactAliasActive.get(0);

        List<Product> exactInactive = productRepository.findByUserIdAndNameIgnoreCaseAndStatus(userId, name, Product.Status.OUT_OF_STOCK);
        if (!exactInactive.isEmpty()) return exactInactive.get(0);

        List<Product> exactAliasInactive = productRepository.findByUserIdAndAliasIgnoreCaseAndStatus(userId, name, Product.Status.OUT_OF_STOCK);
        if (!exactAliasInactive.isEmpty()) return exactAliasInactive.get(0);

        // 2. Contains match (Prefer AVAILABLE)
        List<Product> containsActive = productRepository.findByUserIdAndNameContainingIgnoreCaseAndStatus(userId, name, Product.Status.AVAILABLE);
        if (!containsActive.isEmpty()) {
            return containsActive.stream().min(Comparator.comparingInt(p -> p.getName().length())).get();
        }

        List<Product> containsInactive = productRepository.findByUserIdAndNameContainingIgnoreCaseAndStatus(userId, name, Product.Status.OUT_OF_STOCK);
        if (!containsInactive.isEmpty()) {
            return containsInactive.stream().min(Comparator.comparingInt(p -> p.getName().length())).get();
        }

        // 3. Full fuzzy match across ALL user's products
        List<Product> allProducts = productRepository.findByUserId(userId);
        if (allProducts.isEmpty()) {
            throw new ResourceNotFoundException("No products exist for this user.");
        }

        Optional<ScoredProduct> best = allProducts.stream()
                .map(p -> {
                    double nameScore = score(name, p.getName());
                    double aliasScore = p.getAlias() != null ? score(name, p.getAlias()) : 0.0;
                    return new ScoredProduct(p, Math.max(nameScore, aliasScore));
                })
                .max(Comparator.comparingDouble(ScoredProduct::score));

        if (best.isEmpty() || best.get().score() < FUZZY_THRESHOLD) {
            throw new BadRequestException(String.format("No product matching '%s' found.", name));
        }

        return best.get().product();
    }

    private double score(String query, String candidate) {
        return jaroWinkler.apply(
                query.toLowerCase().trim(),
                candidate.toLowerCase().trim());
    }

    private record ScoredProduct(Product product, double score) {
    }
}