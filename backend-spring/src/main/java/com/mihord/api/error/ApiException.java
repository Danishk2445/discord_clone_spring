package com.mihord.api.error;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code) {
        super(code);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }

    public static ApiException badRequest(String code) { return new ApiException(HttpStatus.BAD_REQUEST, code); }
    public static ApiException unauthorized(String code) { return new ApiException(HttpStatus.UNAUTHORIZED, code); }
    public static ApiException forbidden(String code) { return new ApiException(HttpStatus.FORBIDDEN, code); }
    public static ApiException notFound(String code) { return new ApiException(HttpStatus.NOT_FOUND, code); }
    public static ApiException conflict(String code) { return new ApiException(HttpStatus.CONFLICT, code); }
    public static ApiException gone(String code) { return new ApiException(HttpStatus.GONE, code); }
}
