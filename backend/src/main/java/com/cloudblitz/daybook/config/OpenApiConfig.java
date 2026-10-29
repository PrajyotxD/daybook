package com.cloudblitz.daybook.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI entriesOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Daybook API")
                        .version("1.0.0")
                        .description("REST API for Daybook, the CloudBlitz entry ledger.")
                        .contact(new Contact().name("CloudBlitz Platform").email("platform@cloudblitz.dev")))
                .servers(List.of(new Server().url("/").description("Current host")));
    }
}
