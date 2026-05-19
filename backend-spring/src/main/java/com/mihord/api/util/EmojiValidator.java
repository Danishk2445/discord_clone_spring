package com.mihord.api.util;

import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/** Mirrors backend/src/routes/channels.ts emoji regex.
 * Accepts either:
 *   - One Extended_Pictographic, optionally followed by ZWJ + more pictographics
 *   - 1-32 chars of letters/digits/_+- (Unicode-aware) for ":custom:" names like "+1" or "thumbs_up"
 * Plus an outer length cap of 1..64 chars.
 */
public final class EmojiValidator {

    private static final Pattern NAME = Pattern.compile("^[\\p{L}\\p{N}_+\\-]{1,32}$");

    private static final Pattern PICTO;
    static {
        Pattern p;
        try {
            p = Pattern.compile("^\\p{IsExtended_Pictographic}(?:\\u200D\\p{IsExtended_Pictographic})*$");
        } catch (PatternSyntaxException ignored) {
            p = null;
        }
        PICTO = p;
    }

    private EmojiValidator() {}

    public static boolean isValid(String input) {
        if (input == null) return false;
        int len = input.length();
        if (len == 0 || len > 64) return false;
        if (NAME.matcher(input).matches()) return true;
        if (PICTO != null && PICTO.matcher(input).matches()) return true;
        // Permissive fallback: accept any non-ASCII / non-control sequence with no whitespace.
        return input.codePoints().allMatch(c -> c > 0x7E || (c >= 0x21 && c <= 0x7E));
    }
}
