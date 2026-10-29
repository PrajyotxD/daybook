package com.cloudblitz.daybook.repository;

import com.cloudblitz.daybook.domain.Entry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface EntryRepository extends JpaRepository<Entry, UUID>, JpaSpecificationExecutor<Entry> {

    @Query("select e.category, count(e), coalesce(sum(e.amount), 0) from Entry e group by e.category")
    List<Object[]> aggregateByCategory();

    @Query("select e.status, count(e) from Entry e group by e.status")
    List<Object[]> aggregateByStatus();

    @Query("select count(e) from Entry e where e.entryDate >= :from")
    long countSince(@Param("from") LocalDate from);

    @Query("select coalesce(sum(e.amount), 0) from Entry e")
    BigDecimal sumAmount();

    @Query("select coalesce(avg(e.amount), 0) from Entry e where e.amount is not null")
    BigDecimal averageAmount();

    @Query("select e.entryDate, e.amount from Entry e where e.entryDate >= :from")
    List<Object[]> findDateAndAmountSince(@Param("from") LocalDate from);
}
