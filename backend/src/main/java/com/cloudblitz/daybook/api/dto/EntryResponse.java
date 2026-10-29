package com.cloudblitz.daybook.api.dto;

import com.cloudblitz.daybook.domain.Entry;
import com.cloudblitz.daybook.domain.EntryCategory;
import com.cloudblitz.daybook.domain.EntryStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record EntryResponse(
        UUID id,
        String reference,
        String title,
        EntryCategory category,
        String categoryLabel,
        EntryStatus status,
        String statusLabel,
        BigDecimal amount,
        String currency,
        LocalDate entryDate,
        String owner,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {

    public static EntryResponse from(Entry entry) {
        return new EntryResponse(
                entry.getId(),
                entry.getReference(),
                entry.getTitle(),
                entry.getCategory(),
                entry.getCategory().label(),
                entry.getStatus(),
                entry.getStatus().label(),
                entry.getAmount(),
                entry.getCurrency(),
                entry.getEntryDate(),
                entry.getOwner(),
                entry.getNotes(),
                entry.getCreatedAt(),
                entry.getUpdatedAt()
        );
    }
}
