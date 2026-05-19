package com.mihord.api;

import com.mihord.api.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class MihordApplication {
    public static void main(String[] args) {
        SpringApplication.run(MihordApplication.class, args);
    }
}
