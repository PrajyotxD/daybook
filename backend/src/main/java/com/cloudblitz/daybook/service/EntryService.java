package com.cloudblitz.daybook.service;

import com.cloudblitz.daybook.api.dto.EntryRequest;
import com.cloudblitz.daybook.api.dto.StatsResponse;
import com.cloudblitz.daybook.domain.Entry;
import com.cloudblitz.daybook.domain.EntryCategory;
import com.cloudblitz.daybook.domain.EntryStatus;
import com.cloudblitz.daybook.repository.EntryRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class EntryService {

    private static final Set<String> SORTABLE = Set.of(
            "entryDate", "createdAt", "updatedAt", "amount", "title", "status", "category", "reference");
    private static final int MAX_PAGE_SIZE = 100;

    private final EntryRepository repository;

    public EntryService(EntryRepository repository) {
        this.repository = repository;
    }

    public Page<Entry> search(String query, EntryStatus status, EntryCategory category,
                              LocalDate from, LocalDate to, BigDecimal minAmount, BigDecimal maxAmount,
                              int page, int size, String sortBy, String direction) {

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.clamp(size, 1, MAX_PAGE_SIZE),
                buildSort(sortBy, direction));

        return repository.findAll(buildSpecification(query, status, category, from, to, minAmount, maxAmount), pageable);
    }

    public Entry get(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntryNotFoundException(id));
    }

    @Transactional
    public Entry create(EntryRequest request) {
        Entry entry = new Entry(
                request.title().trim(),
                request.category(),
                request.status(),
                request.amount(),
                normaliseCurrency(request.currency()),
                request.entryDate(),
                trimToNull(request.owner()),
                trimToNull(request.notes()));
        return repository.save(entry);
    }

    @Transactional
    public Entry update(UUID id, EntryRequest request) {
        Entry entry = get(id);
        entry.setTitle(request.title().trim());
        entry.setCategory(request.category());
        entry.setStatus(request.status());
        entry.setAmount(request.amount());
        entry.setCurrency(normaliseCurrency(request.currency()));
        entry.setEntryDate(request.entryDate());
        entry.setOwner(trimToNull(request.owner()));
        entry.setNotes(trimToNull(request.notes()));
        return repository.save(entry);
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new EntryNotFoundException(id);
        }
        repository.deleteById(id);
    }

    public StatsResponse stats() {
        Map<EntryStatus, Long> statusCounts = new EnumMap<>(EntryStatus.class);
        for (EntryStatus status : EntryStatus.values()) {
            statusCounts.put(status, 0L);
        }
        for (Object[] row : repository.aggregateByStatus()) {
            statusCounts.put((EntryStatus) row[0], toLong(row[1]));
        }

        Map<EntryCategory, Object[]> categoryRows = new LinkedHashMap<>();
        for (Object[] row : repository.aggregateByCategory()) {
            categoryRows.put((EntryCategory) row[0], row);
        }
        List<StatsResponse.CategoryStat> byCategory = new ArrayList<>();
        for (EntryCategory category : EntryCategory.values()) {
            Object[] row = categoryRows.get(category);
            long count = row == null ? 0L : toLong(row[1]);
            BigDecimal amount = row == null ? BigDecimal.ZERO : toMoney(row[2]);
            byCategory.add(new StatsResponse.CategoryStat(category.name(), category.label(), count, amount));
        }
        byCategory.sort((a, b) -> Long.compare(b.count(), a.count()));

        return new StatsResponse(
                repository.count(),
                toMoney(repository.sumAmount()),
                toMoney(repository.averageAmount()).setScale(2, RoundingMode.HALF_UP),
                repository.countSince(LocalDate.now().minusDays(30)),
                statusCounts.get(EntryStatus.DRAFT),
                statusCounts.get(EntryStatus.ACTIVE),
                statusCounts.get(EntryStatus.SETTLED),
                statusCounts.get(EntryStatus.ARCHIVED),
                byCategory,
                monthlySeries());
    }

    /** Last six calendar months, oldest first, including months with no entries. */
    private List<StatsResponse.MonthlyPoint> monthlySeries() {
        YearMonth start = YearMonth.now().minusMonths(5);
        Map<YearMonth, long[]> counts = new LinkedHashMap<>();
        Map<YearMonth, BigDecimal> amounts = new LinkedHashMap<>();
        for (int i = 0; i < 6; i++) {
            YearMonth month = start.plusMonths(i);
            counts.put(month, new long[]{0L});
            amounts.put(month, BigDecimal.ZERO);
        }

        for (Object[] row : repository.findDateAndAmountSince(start.atDay(1))) {
            LocalDate date = (LocalDate) row[0];
            YearMonth month = YearMonth.from(date);
            long[] bucket = counts.get(month);
            if (bucket == null) {
                continue;
            }
            bucket[0] = bucket[0] + 1;
            if (row[1] != null) {
                amounts.merge(month, toMoney(row[1]), BigDecimal::add);
            }
        }

        List<StatsResponse.MonthlyPoint> points = new ArrayList<>();
        counts.forEach((month, bucket) ->
                points.add(new StatsResponse.MonthlyPoint(month.toString(), bucket[0], amounts.get(month))));
        return points;
    }

    private Specification<Entry> buildSpecification(String query, EntryStatus status, EntryCategory category,
                                                    LocalDate from, LocalDate to,
                                                    BigDecimal minAmount, BigDecimal maxAmount) {
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (query != null && !query.isBlank()) {
                String needle = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), needle),
                        cb.like(cb.lower(cb.coalesce(root.get("notes"), "")), needle),
                        cb.like(cb.lower(cb.coalesce(root.get("owner"), "")), needle),
                        cb.like(cb.lower(root.get("reference")), needle)));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (category != null) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("entryDate"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("entryDate"), to));
            }
            if (minAmount != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("amount"), minAmount));
            }
            if (maxAmount != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("amount"), maxAmount));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSort(String sortBy, String direction) {
        String field = SORTABLE.contains(sortBy) ? sortBy : "entryDate";
        Sort.Direction dir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(dir, field).and(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private static String normaliseCurrency(String currency) {
        return currency == null || currency.isBlank() ? "USD" : currency.trim().toUpperCase(Locale.ROOT);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    private static BigDecimal toMoney(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        return BigDecimal.valueOf(((Number) value).doubleValue());
    }
}
