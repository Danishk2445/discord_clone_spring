package com.mihord.api.upload;

import com.mihord.api.config.AppProperties;
import com.mihord.api.error.ApiException;
import com.mihord.api.util.IdGen;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Set;

@Service
public class UploadService {

    private static final long MAX_BYTES = 10L * 1024L * 1024L;

    private static final Set<String> ALLOWED = Set.of(
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "video/mp4",
        "video/webm",
        "audio/mpeg",
        "audio/ogg",
        "audio/wav",
        "application/pdf",
        "text/plain"
    );

    private final AppProperties props;
    private Path uploadRoot;

    public UploadService(AppProperties props) {
        this.props = props;
    }

    @PostConstruct
    public void init() throws IOException {
        this.uploadRoot = Paths.get(props.getUploadRoot()).toAbsolutePath().normalize();
        Files.createDirectories(uploadRoot);
    }

    public record StoredFile(String url, String name, String contentType, long size) {}

    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("no_file");
        }
        if (file.getSize() > MAX_BYTES) {
            throw ApiException.badRequest("file_too_large");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED.contains(contentType)) {
            throw ApiException.badRequest("unsupported_type");
        }

        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        String year = String.valueOf(now.getYear());
        String month = String.format("%02d", now.getMonthValue());

        Path dir = uploadRoot.resolve(year).resolve(month).normalize();
        if (!dir.startsWith(uploadRoot)) {
            throw ApiException.badRequest("invalid_path");
        }

        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            throw ApiException.badRequest("upload_failed");
        }

        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = extractExtension(original);
        String filename = IdGen.newId("up").replace("_", "-") + ext;
        Path target = dir.resolve(filename).normalize();
        if (!target.startsWith(uploadRoot)) {
            throw ApiException.badRequest("invalid_path");
        }

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw ApiException.badRequest("upload_failed");
        }

        String url = "/uploads/" + year + "/" + month + "/" + filename;
        String safeName = original.length() > 200 ? original.substring(0, 200) : original;
        return new StoredFile(url, safeName, contentType, file.getSize());
    }

    private static String extractExtension(String name) {
        int dot = name.lastIndexOf('.');
        if (dot < 0) return "";
        String raw = name.substring(dot).toLowerCase();
        if (raw.length() > 8) raw = raw.substring(0, 8);
        StringBuilder sb = new StringBuilder(raw.length());
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '.') {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
