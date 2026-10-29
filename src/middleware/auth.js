// ==============================================================================
// BERKAS: src/middleware/auth.js
// TUJUAN: Memvalidasi identitas pengguna melalui Bearer Token (Autentikasi).
// RUJUKAN SLIDE:
//   - Slide 11: Token valid dan UUID acak tidak menyelesaikan masalah bila policy tidak diperiksa.
//   - Slide 34: Token opaque disimpan dalam bentuk hash di database.
//   - Slide 35: Token acak dengan entropi tinggi; Lab menyimpan hash SHA-256 token.
// ==============================================================================

import { hashOpaqueToken } from "../services/cryptoService.js";
import { findSessionByTokenHash } from "../db.js";

/**
 * Middleware untuk memvalidasi header Authorization: Bearer <token>.
 * Memeriksa keabsahan token dan masa berlakunya tanpa menyimpan token mentah di basis data.
 */
export function requireAuth(req, res, next) {
  // 1. Mengambil header Authorization dari HTTP request
  const authHeader = req.header("Authorization") || req.header("authorization");

  // 2. Memeriksa keberadaan dan format header "Bearer <token>"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Header Authorization Bearer token wajib disertakan untuk mengakses endpoint ini.",
        request_id: req.requestId || "unknown",
      },
    });
  }

  // 3. Mengekstrak string token mentah dari header
  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({
      error: {
        code: "INVALID_TOKEN_FORMAT",
        message: "Format Bearer token tidak valid atau kosong.",
        request_id: req.requestId || "unknown",
      },
    });
  }

  // 4. Menghitung hash SHA-256 dari token mentah (Slide 34 & 35)
  // Sistem mencocokkan hash token ke basis data, BUKAN token mentah dalam teks terbuka.
  const tokenHash = hashOpaqueToken(token);

  // 5. Mencari sesi aktif di tabel `tokens` yang berelasi dengan tabel `users` (Slide 35)
  const session = findSessionByTokenHash(tokenHash);

  if (!session) {
    return res.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Token tidak dikenal atau sudah kedaluwarsa. Silakan login kembali.",
        request_id: req.requestId || "unknown",
      },
    });
  }

  // 6. Memeriksa apakah token sudah melewati batas masa berlaku (expiry time)
  const expiresAt = new Date(session.expires_at).getTime();
  if (Date.now() > expiresAt) {
    return res.status(401).json({
      error: {
        code: "TOKEN_EXPIRED",
        message: "Masa berlaku token telah habis. Silakan login ulang untuk mendapatkan token baru.",
        request_id: req.requestId || "unknown",
      },
    });
  }

  // 7. Menyematkan identitas user yang terverifikasi ke objek `req.user`
  // Sesuai Slide 13: "Scope tepercaya: Identitas dan tenant dari sumber yang diverifikasi."
  req.user = {
    id: session.id,
    username: session.username,
    email: session.email,
    role: session.role,         // member | manager | admin
    team_id: session.team_id,   // misal: team-a, team-b
    tenant_id: session.tenant_id,// misal: tenant-1, tenant-2
  };

  // 8. Melanjutkan ke middleware/handler berikutnya
  next();
}
