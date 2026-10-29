// ==============================================================================
// BERKAS: src/middleware/rateLimiter.js
// TUJUAN: Membatasi laju request masuk untuk mencegah resource exhaustion & DoS.
// RUJUKAN SLIDE:
//   - Slide 25: Rate limiting dan throttling (menolak request melebihi batas pada periode tertentu)
//   - Slide 26: Algoritme pembatas laju (Fixed Window vs Sliding Window vs Token Bucket)
//   - Slide 27: "express-rate-limit untuk lab. 60 request/menit/IP; 429 dengan Retry-After."
//   - Slide 28: Perilaku di lingkungan produksi (Redis, WAF, tenant quota)
// ==============================================================================

import rateLimit from "express-rate-limit";

/**
 * Middleware Rate Limiter standar laboratorium TaskHub (Slide 27).
 * Membatasi setiap IP maksimal 60 request per menit.
 */
export const apiRateLimiter = rateLimit({
  // Durasi jendela waktu: 1 menit (60 * 1000 milidetik)
  windowMs: 60 * 1000,

  // Batas maksimum request per jendela waktu (Slide 27: 60 request/menit/IP)
  limit: 60,

  // Standar HTTP Headers: draft-6/draft-7 (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
  standardHeaders: true,

  // Mengabaikan header legacy X-RateLimit-*
  legacyHeaders: false,

  // Kustomisasi pesan dan struktur respons 429 (Slide 23 & 27: 429 dengan Retry-After)
  handler: (req, res, next, options) => {
    // Menghitung sisa detik hingga jendela rate limit direset (Slide 27 & 55)
    const retryAfterSeconds = Math.ceil((options.windowMs) / 1000);

    // Menyematkan header Retry-After standar HTTP
    res.setHeader("Retry-After", String(retryAfterSeconds));

    // Mengembalikan format JSON error yang konsisten sesuai standar TaskHub (Slide 23)
    res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Terlalu banyak permintaan (Too Many Requests). Kuota batas laju terlampaui.",
        retry_after_seconds: retryAfterSeconds,
        request_id: req.requestId || "unknown",
      },
    });
  },
});

/**
 * Rate Limiter khusus untuk rute autentikasi/login yang lebih ketat.
 * Mencegah serangan brute force kata sandi (Slide 28: "Limit login per akun dan IP").
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  limit: 10,           // Maksimal 10 percobaan login per menit
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.setHeader("Retry-After", "60");
    res.status(429).json({
      error: {
        code: "AUTH_RATE_LIMIT_EXCEEDED",
        message: "Terlalu banyak percobaan login. Akun dan IP dibatasi sementara demi keamanan.",
        retry_after_seconds: 60,
        request_id: req.requestId || "unknown",
      },
    });
  },
});
