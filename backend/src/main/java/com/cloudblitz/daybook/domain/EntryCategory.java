package com.cloudblitz.daybook.domain;

/**
 * Business area an entry belongs to. Stored as a string so the list can evolve
 * without a database migration.
 */
public enum EntryCategory {
    OPERATIONS("Operations"),
    FINANCE("Finance"),
    ENGINEERING("Engineering"),
    PRODUCT("Product"),
    MARKETING("Marketing"),
    PEOPLE("People"),
    OTHER("Other");

    private final String label;

    EntryCategory(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
