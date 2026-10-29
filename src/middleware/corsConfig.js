// ==============================================================================
// BERKAS: src/middleware/corsConfig.js
// TUJUAN: Konfigurasi Cross-Origin Resource Sharing (CORS) di Express.
// RUJUKAN SLIDE:
//   - Slide 29: CORS adalah kebijakan browser, bukan autentikasi. Origin = scheme + host + port.
//               CORS tidak mencegah curl atau server-to-server dan bukan firewall!
//   - Slide 30: Implementasi paket cors dengan allowedOrigins, methods, allowedHeaders.
//               PENTING: Jangan gunakan origin "*" bersama credentials: true!
//   - Slide 31: CORS, cookie, dan CSRF (Origin tepercaya, SameSite, HttpOnly).
// ==============================================================================

import cors from "cors";
import { settings } from "../config.js";

// Daftar origin yang diizinkan untuk mengakses API TaskHub (Slide 30)
// Di lingkungan produksi: Hanya domain web frontend resmi TaskHub
// Di lingkungan lab: Ditambahkan localhost/127.0.0.1 agar Web Playground dapat mengirim request
export const allowedOrigins = [
  settings.ALLOWED_ORIGIN,                  // "https://app.taskhub.example.com" (Slide 30)
  "http://127.0.0.1:8000",                  // Alamat lokal server
  "http://localhost:8000",                  // Alamat lokal hostname
  "http://127.0.0.1:3000",                  // Contoh aplikasi SPA frontend lokal (Slide 29)
  "http://localhost:3000",
];

/**
 * Middleware CORS Express yang dikonfigurasi secara ketat dan aman (Slide 30).
 */
export const corsMiddleware = cors({
  // 1. Validasi Origin: Memeriksa apakah origin pemanggil ada di dalam allowlist
  origin: (origin, callback) => {
    // Memperbolehkan request tanpa origin (seperti curl, mobile native apps, atau Postman)
    // Sesuai Slide 29: CORS hanya dipaksakan oleh BROWSER, bukan oleh curl atau server-to-server.
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      // Origin terdaftar dalam allowlist -> Izinkan
      return callback(null, true);
    } else {
      // Origin asing di luar daftar -> Tolak akses lintas origin (Slide 9 & 31)
      const error = new Error(`Akses diblokir oleh kebijakan CORS TaskHub untuk origin: ${origin}`);
      error.status = 403;
      return callback(error, false);
    }
  },

  // 2. Credentials: false (Slide 30: "credentials: false")
  // Jangan sekali-kali menggabungkan origin "*" dengan credentials: true karena membocorkan cookie pengguna!
  credentials: false,

  // 3. Metode HTTP yang diizinkan secara eksplisit (Slide 30)
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],

  // 4. Header request yang diizinkan untuk dikirimkan oleh browser frontend (Slide 30)
  allowedHeaders: [
    "Authorization",    // Header Bearer token otentikasi
    "Content-Type",     // Header tipe payload JSON
    "Idempotency-Key",  // Header kunci idempotensi untuk operasi retry (Slide 30 & 62)
    "X-Request-Id",     // Header korelasi request ID (Slide 24)
    "X-Mock-Mode",      // Header lab fault injection
  ],

  // 5. Header respons yang diizinkan untuk dibaca oleh kode JavaScript di browser client
  exposedHeaders: [
    "X-Request-Id",
    "Retry-After",
    "RateLimit-Limit",
    "RateLimit-Remaining",
    "RateLimit-Reset",
  ],

  // 6. Masa simpan cache preflight request (OPTIONS) oleh browser dalam detik (10 menit)
  maxAge: 600,
});
