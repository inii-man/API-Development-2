// ==============================================================================
// BERKAS: src/routes/authRoutes.js
// TUJUAN: Rute autentikasi pengguna (Login & Profil Sesi).
// RUJUKAN SLIDE:
//   - Slide 7: Aktor: Member, manager, admin, client, provider.
//   - Slide 34 & 35: Verifikasi kata sandi dengan scrypt; token acak disimpan hash SHA-256.
//   - Slide 44: "Jangan commit output login atau token ke repository."
// ==============================================================================

import { Router } from "express";
import { findUserByUsername, saveTokenSession } from "../db.js";
import { verifyPassword, generateOpaqueToken, hashOpaqueToken } from "../services/cryptoService.js";
import { loginSchema, serializeUser } from "../schemas/taskSchemas.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/**
 * POST /api/v1/auth/login
 * Masuk menggunakan username dan password untuk mendapatkan Bearer Token.
 * Dilindungi oleh authRateLimiter khusus (Slide 28: Limit login per akun dan IP).
 */
router.post("/login", authRateLimiter, async (req, res, next) => {
  try {
    // 1. Validasi input body menggunakan Zod schema
    const { username, password } = loginSchema.parse(req.body);

    // 2. Mencari data akun pengguna berdasarkan username menggunakan Parameter Binding (Slide 17)
    const user = findUserByUsername(username);

    // Jika pengguna tidak ditemukan, tolak dengan pesan umum (mencegah username enumeration)
    if (!user) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Nama pengguna atau kata sandi yang Anda masukkan salah.",
          request_id: req.requestId || "unknown",
        },
      });
    }

    // 3. Verifikasi kata sandi menggunakan scrypt adaptif (Slide 34 & 35)
    const isPasswordValid = verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Nama pengguna atau kata sandi yang Anda masukkan salah.",
          request_id: req.requestId || "unknown",
        },
      });
    }

    // 4. Menghasilkan Opaque Bearer Token 32-byte acak berkekuatan kriptografis tinggi (Slide 35)
    const rawToken = generateOpaqueToken();

    // 5. Menghitung hash SHA-256 untuk disimpan ke basis data (Slide 34: "Simpan hash di database")
    const tokenHash = hashOpaqueToken(rawToken);

    // 6. Menetapkan masa berlaku token (24 jam dari sekarang)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 7. Menyimpan sesi ke tabel `tokens`
    saveTokenSession(tokenHash, user.id, expiresAt);

    // 8. Mengembalikan token mentah HANYA ke client yang berhasil login (Slide 20: Output Serializer)
    return res.status(200).json({
      success: true,
      token: rawToken, // Client menyimpan ini dan mengirimkannya lewat header `Authorization: Bearer <token>`
      token_type: "Bearer",
      expires_at: expiresAt,
      user: serializeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/me
 * Mengambil informasi pengguna yang saat ini sedang login.
 */
router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});

export default router;
