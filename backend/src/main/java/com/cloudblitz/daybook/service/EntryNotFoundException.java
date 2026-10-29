package com.cloudblitz.daybook.service;

import java.util.UUID;

public class EntryNotFoundException extends RuntimeException {

    public EntryNotFoundException(UUID id) {
        super("Entry " + id + " was not found");
    }
}
