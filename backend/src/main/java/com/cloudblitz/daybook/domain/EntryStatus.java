package com.cloudblitz.daybook.domain;

public enum EntryStatus {
    DRAFT("Draft"),
    ACTIVE("Active"),
    SETTLED("Settled"),
    ARCHIVED("Archived");

    private final String label;

    EntryStatus(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
