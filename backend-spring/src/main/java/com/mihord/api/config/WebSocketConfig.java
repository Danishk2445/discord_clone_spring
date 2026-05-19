package com.mihord.api.config;

import com.mihord.api.ws.RealtimeHandler;
import com.mihord.api.ws.RealtimeHandshakeInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final RealtimeHandler handler;
    private final RealtimeHandshakeInterceptor interceptor;
    private final AppProperties props;

    public WebSocketConfig(RealtimeHandler handler,
                           RealtimeHandshakeInterceptor interceptor,
                           AppProperties props) {
        this.handler = handler;
        this.interceptor = interceptor;
        this.props = props;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws")
            .addInterceptors(interceptor)
            .setAllowedOrigins(props.getCorsOrigin());
    }

    @Bean
    public ServletServerContainerFactoryBean wsContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxTextMessageBufferSize(65_536);
        container.setMaxBinaryMessageBufferSize(65_536);
        return container;
    }
}
