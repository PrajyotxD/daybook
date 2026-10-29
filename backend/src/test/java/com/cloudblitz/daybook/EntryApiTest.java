package com.cloudblitz.daybook;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EntryApiTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String VALID_BODY = """
            {
              "title": "Smoke test entry",
              "category": "FINANCE",
              "status": "DRAFT",
              "amount": 1250.50,
              "currency": "USD",
              "entryDate": "2026-10-01",
              "owner": "QA Bot",
              "notes": "created by the integration test"
            }
            """;

    @Test
    void createsEntryAndReturnsGeneratedReference() throws Exception {
        mvc.perform(post("/api/entries").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.reference", startsWith("ENT-")))
                .andExpect(jsonPath("$.categoryLabel").value("Finance"))
                .andExpect(jsonPath("$.statusLabel").value("Draft"))
                .andExpect(jsonPath("$.amount").value(1250.50));
    }

    @Test
    void rejectsMissingTitle() throws Exception {
        String invalid = VALID_BODY.replace("\"title\": \"Smoke test entry\",", "");
        mvc.perform(post("/api/entries").contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title", notNullValue()));
    }

    @Test
    void searchesByTitle() throws Exception {
        String marker = "Searchable " + UUID.randomUUID().toString().substring(0, 6);
        String body = VALID_BODY.replace("Smoke test entry", marker);

        mvc.perform(post("/api/entries").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/entries").param("q", marker).param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].title").value(marker));
    }

    @Test
    void returnsStatsPayload() throws Exception {
        mvc.perform(post("/api/entries").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/entries/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEntries", notNullValue()))
                .andExpect(jsonPath("$.byCategory", hasSize(7)))
                .andExpect(jsonPath("$.monthly", hasSize(6)));
    }

    @Test
    void deletesEntry() throws Exception {
        String response = mvc.perform(post("/api/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andReturn().getResponse().getContentAsString();

        String id = objectMapper.readTree(response).get("id").asText();

        mvc.perform(delete("/api/entries/" + id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/entries/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void returns404ForUnknownEntry() throws Exception {
        mvc.perform(get("/api/entries/" + UUID.randomUUID()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Entry not found"));
    }
}
