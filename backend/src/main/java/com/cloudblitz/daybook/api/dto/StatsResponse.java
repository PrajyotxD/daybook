package com.cloudblitz.daybook.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record StatsResponse(
        long totalEntries,
        BigDecimal totalAmount,
        BigDecimal averageAmount,
        long last30Days,
        long draftCount,
        long activeCount,
        long settledCount,
        long archivedCount,
        List<CategoryStat> byCategory,
        List<MonthlyPoint> monthly
) {

    public record CategoryStat(String category, String label, long count, BigDecimal amount) {
    }

    public record MonthlyPoint(String month, long count, BigDecimal amount) {
    }
}
