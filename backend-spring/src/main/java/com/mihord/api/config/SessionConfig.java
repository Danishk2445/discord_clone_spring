package com.mihord.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

import java.time.Duration;

@Configuration
public class SessionConfig {

    private final AppProperties props;

    public SessionConfig(AppProperties props) {
        this.props = props;
    }

    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName("mihord_session");
        serializer.setCookiePath("/");
        serializer.setSameSite("Lax");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(props.getIsProd());
        serializer.setCookieMaxAge((int) Duration.ofDays(30).toSeconds());
        serializer.setUseBase64Encoding(true);
        return serializer;
    }
}
