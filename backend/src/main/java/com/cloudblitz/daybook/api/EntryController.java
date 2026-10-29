package com.cloudblitz.daybook.api;

import com.cloudblitz.daybook.api.dto.EntryRequest;
import com.cloudblitz.daybook.api.dto.EntryResponse;
import com.cloudblitz.daybook.api.dto.PageResponse;
import com.cloudblitz.daybook.api.dto.StatsResponse;
import com.cloudblitz.daybook.domain.Entry;
import com.cloudblitz.daybook.domain.EntryCategory;
import com.cloudblitz.daybook.domain.EntryStatus;
import com.cloudblitz.daybook.service.EntryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/entries")
@Tag(name = "Entries", description = "Create, search and manage ledger entries")
public class EntryController {

    private final EntryService service;

    public EntryController(EntryService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Search entries with filters, sorting and pagination")
    public PageResponse<EntryResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) EntryStatus status,
            @RequestParam(required = false) EntryCategory category,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "entryDate") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Page<Entry> result = service.search(q, status, category, from, to, minAmount, maxAmount,
                page, size, sortBy, direction);
        return PageResponse.of(result, EntryResponse::from);
    }

    @GetMapping("/stats")
    @Operation(summary = "Aggregated totals for the dashboard")
    public StatsResponse stats() {
        return service.stats();
    }

    @GetMapping("/meta")
    @Operation(summary = "Filter vocabulary used by the client")
    public Map<String, List<Map<String, String>>> meta() {
        return Map.of(
                "categories", Arrays.stream(EntryCategory.values())
                        .map(c -> Map.of("value", c.name(), "label", c.label()))
                        .toList(),
                "statuses", Arrays.stream(EntryStatus.values())
                        .map(s -> Map.of("value", s.name(), "label", s.label()))
                        .toList());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Fetch a single entry")
    public EntryResponse get(@PathVariable UUID id) {
        return EntryResponse.from(service.get(id));
    }

    @PostMapping
    @Operation(summary = "Create an entry")
    public ResponseEntity<EntryResponse> create(@Valid @RequestBody EntryRequest request) {
        Entry created = service.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(EntryResponse.from(created));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Replace an entry")
    public EntryResponse update(@PathVariable UUID id, @Valid @RequestBody EntryRequest request) {
        return EntryResponse.from(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an entry")
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
