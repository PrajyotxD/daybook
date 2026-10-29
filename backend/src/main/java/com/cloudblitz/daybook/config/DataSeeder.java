package com.cloudblitz.daybook.config;

import com.cloudblitz.daybook.domain.Entry;
import com.cloudblitz.daybook.domain.EntryCategory;
import com.cloudblitz.daybook.domain.EntryStatus;
import com.cloudblitz.daybook.repository.EntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Seeds a realistic dataset for local development and demos. Never runs in prod.
 */
@Component
@Profile({"dev", "demo"})
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final EntryRepository repository;

    public DataSeeder(EntryRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            return;
        }

        LocalDate today = LocalDate.now();
        List<Entry> entries = List.of(
                entry("Northwind onboarding — phase 2", EntryCategory.OPERATIONS, EntryStatus.ACTIVE,
                        "18400.00", today.minusDays(2), "Maya Chen", "Kick-off complete. Access provisioning finishes Friday."),
                entry("Q3 cloud spend reconciliation", EntryCategory.FINANCE, EntryStatus.DRAFT,
                        "72950.00", today.minusDays(4), "Daniel Okafor", "Waiting on the ECS savings plan invoice."),
                entry("Design system audit", EntryCategory.PRODUCT, EntryStatus.ACTIVE,
                        "4200.00", today.minusDays(6), "Iris Vandenberg", "Found 14 duplicated button variants and 3 stale tokens."),
                entry("Checkout latency regression", EntryCategory.ENGINEERING, EntryStatus.ACTIVE,
                        "0.00", today.minusDays(9), "Rahul Menon", "p95 up 320ms after the payment provider switch."),
                entry("September lifecycle campaign", EntryCategory.MARKETING, EntryStatus.SETTLED,
                        "12800.00", today.minusDays(13), "Sofia Almeida", "42% open rate, 6.1% click-through."),
                entry("Backend hiring loop", EntryCategory.PEOPLE, EntryStatus.ACTIVE,
                        "9500.00", today.minusDays(16), "Daniel Okafor", "Two senior offers out, one onsite pending."),
                entry("SOC 2 evidence collection", EntryCategory.OPERATIONS, EntryStatus.DRAFT,
                        "25000.00", today.minusDays(21), "Maya Chen", "Access review exports still missing for three systems."),
                entry("Warehouse connector rewrite", EntryCategory.ENGINEERING, EntryStatus.ACTIVE,
                        "31600.00", today.minusDays(27), "Rahul Menon", "Moved to a queue-based sync, 4x throughput."),
                entry("Brand refresh — print run", EntryCategory.MARKETING, EntryStatus.SETTLED,
                        "6100.00", today.minusDays(34), "Sofia Almeida", "5,000 brochures delivered to the Amsterdam office."),
                entry("Annual insurance renewal", EntryCategory.FINANCE, EntryStatus.SETTLED,
                        "18750.00", today.minusDays(41), "Priya Nair", "Renewed with a 4% premium increase."),
                entry("Mobile app accessibility pass", EntryCategory.PRODUCT, EntryStatus.ARCHIVED,
                        "7800.00", today.minusDays(48), "Iris Vandenberg", "Closed 31 WCAG findings, 4 deferred."),
                entry("Legacy CRM decommission", EntryCategory.OPERATIONS, EntryStatus.ARCHIVED,
                        "0.00", today.minusDays(57), "Maya Chen", "Data archived to S3 Glacier, accounts disabled."),
                entry("Partner summit logistics", EntryCategory.MARKETING, EntryStatus.SETTLED,
                        "22300.00", today.minusDays(63), "Sofia Almeida", "38 partners attended, 9 pipeline opportunities."),
                entry("Platform observability upgrade", EntryCategory.ENGINEERING, EntryStatus.ACTIVE,
                        "14200.00", today.minusDays(72), "Rahul Menon", "OpenTelemetry collectors rolled out to all services."),
                entry("Quarterly board pack", EntryCategory.FINANCE, EntryStatus.ARCHIVED,
                        "0.00", today.minusDays(84), "Priya Nair", "Filed after the September board meeting."),
                entry("Customer advisory board", EntryCategory.PRODUCT, EntryStatus.SETTLED,
                        "3400.00", today.minusDays(96), "Iris Vandenberg", "Six customers, roadmap validated for Q4."),
                entry("Office relocation — Cape Town", EntryCategory.OPERATIONS, EntryStatus.SETTLED,
                        "46800.00", today.minusDays(112), "Maya Chen", "Move completed over one weekend, no downtime."),
                entry("Engineering offsite", EntryCategory.PEOPLE, EntryStatus.ARCHIVED,
                        "15900.00", today.minusDays(140), "Priya Nair", "Two-day planning session in Lisbon."),
                entry("Data residency review", EntryCategory.ENGINEERING, EntryStatus.DRAFT,
                        "0.00", today.minusDays(11), "Rahul Menon", "Evaluating eu-central-1 for EU customer data."),
                entry("Referral program launch", EntryCategory.MARKETING, EntryStatus.DRAFT,
                        "5200.00", today.minusDays(19), "Sofia Almeida", "Awaiting legal sign-off on reward terms.")
        );

        repository.saveAll(entries);
        log.info("Seeded {} demo entries", entries.size());
    }

    private Entry entry(String title, EntryCategory category, EntryStatus status, String amount,
                        LocalDate date, String owner, String notes) {
        return new Entry(title, category, status, new BigDecimal(amount), "USD", date, owner, notes);
    }
}
