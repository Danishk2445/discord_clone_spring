package com.mihord.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String corsOrigin = "http://localhost:3000";
    private String uploadRoot = "./data/uploads";
    private boolean isProd = false;

    public String getCorsOrigin() { return corsOrigin; }
    public void setCorsOrigin(String corsOrigin) { this.corsOrigin = corsOrigin; }

    public String getUploadRoot() { return uploadRoot; }
    public void setUploadRoot(String uploadRoot) { this.uploadRoot = uploadRoot; }

    public boolean getIsProd() { return isProd; }
    public void setIsProd(boolean prod) { this.isProd = prod; }
}
