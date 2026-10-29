package com.cloudblitz.daybook.api.dto;

import com.cloudblitz.daybook.domain.EntryCategory;
import com.cloudblitz.daybook.domain.EntryStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Payload for creating and updating an entry. {@code title} is the only field
 * with a required value beyond the enums; everything else has a sensible default.
 */
public record EntryRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 160, message = "Title must be at most 160 characters")
        String title,

        @NotNull(message = "Category is required")
        EntryCategory category,

        @NotNull(message = "Status is required")
        EntryStatus status,

        @DecimalMin(value = "0.00", message = "Amount cannot be negative")
        @Digits(integer = 12, fraction = 2, message = "Amount must have at most 2 decimals")
        BigDecimal amount,

        @Size(min = 3, max = 3, message = "Currency must be a 3 letter code")
        String currency,

        @NotNull(message = "Entry date is required")
        LocalDate entryDate,

        @Size(max = 80, message = "Owner must be at most 80 characters")
        String owner,

        @Size(max = 4000, message = "Notes must be at most 4000 characters")
        String notes
) {
}
