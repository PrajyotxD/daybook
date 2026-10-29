package com.cloudblitz.daybook;

import com.cloudblitz.daybook.domain.Entry;
import com.cloudblitz.daybook.domain.EntryCategory;
import com.cloudblitz.daybook.domain.EntryStatus;
import com.cloudblitz.daybook.repository.EntryRepository;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Boots the production profile against a real PostgreSQL instance: Flyway applies the
 * migration, Hibernate validates the entity mapping against it, and a row round-trips.
 */
@SpringBootTest
@ActiveProfiles("prod")
class PostgresSchemaTest {

    private static EmbeddedPostgres postgres;

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) throws IOException {
        postgres = EmbeddedPostgres.builder().start();
        registry.add("spring.datasource.url", () -> postgres.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> "2");
    }

    @AfterAll
    static void shutdown() throws IOException {
        if (postgres != null) {
            postgres.close();
        }
    }

    @Autowired
    private EntryRepository repository;

    @Test
    void migrationsApplyAndEntityMappingValidates() {
        assertThat(repository.count()).isZero();

        Entry saved = repository.save(new Entry(
                "Schema smoke test",
                EntryCategory.FINANCE,
                EntryStatus.ACTIVE,
                new BigDecimal("199.90"),
                "USD",
                LocalDate.now(),
                "Schema Test",
                "written against PostgreSQL"));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getReference()).startsWith("ENT-");
        assertThat(repository.findById(saved.getId())).isPresent();
    }
}
