package com.mihord.api.upload;

import com.mihord.api.auth.CurrentUser;
import com.mihord.api.user.UserEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final UploadService uploads;

    public UploadController(UploadService uploads) {
        this.uploads = uploads;
    }

    @PostMapping
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @CurrentUser UserEntity user) {
        UploadService.StoredFile stored = uploads.store(file);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "attachment", Map.of(
                "url", stored.url(),
                "name", stored.name(),
                "contentType", stored.contentType(),
                "size", stored.size()
            )
        ));
    }
}
