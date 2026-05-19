package com.mihord.api.util;

import java.security.SecureRandom;

public final class IdGen {
    private static final char[] ALPHABET =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-".toCharArray();

    private static final SecureRandom RNG = new SecureRandom();

    private IdGen() {}

    public static String nanoid(int length) {
        char[] out = new char[length];
        for (int i = 0; i < length; i++) {
            out[i] = ALPHABET[RNG.nextInt(ALPHABET.length)];
        }
        return new String(out);
    }

    public static String newId(String prefix) {
        return prefix + "_" + nanoid(12);
    }

    public static long now() {
        return System.currentTimeMillis();
    }

    /** Invite codes: 8-char alphanumeric (no underscore/dash). */
    private static final char[] INVITE_ALPHABET =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".toCharArray();

    public static String inviteCode() {
        char[] out = new char[8];
        for (int i = 0; i < 8; i++) {
            out[i] = INVITE_ALPHABET[RNG.nextInt(INVITE_ALPHABET.length)];
        }
        return new String(out);
    }

    public static String randomDiscriminator() {
        int n = RNG.nextInt(10000);
        return String.format("%04d", n);
    }
}
