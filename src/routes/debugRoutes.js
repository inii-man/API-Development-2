// ==============================================================================
// BERKAS: src/routes/debugRoutes.js
// TUJUAN: Rute diagnostik dan pemantauan (Observability) untuk mendukung Web Playground.
// RUJUKAN SLIDE:
//   - Slide 24: Request ID middleware dan structured logging (Inspeksi log)
//   - Slide 58 - 60: Pemantauan state Circuit Breaker (CLOSED, OPEN, HALF-OPEN)
//   - Slide 71: Observability pada integrasi (Request count, latency, retry count, circuit state)
// ==============================================================================

import { Router } from "express";
import { notificationCircuit } from "../services/circuitBreaker.js";
import { inMemoryLogs } from "../logger.js";
import { db } from "../db.js";
import { generateOpaqueToken, hashOpaqueToken, encryptAesGcm, decryptAesGcm } from "../services/cryptoService.js";

const router = Router();

// Kunci enkripsi playground sementara
const PLAYGROUND_KEY = Buffer.from("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "hex");

/**
 * GET /api/v1/debug/circuit-status
 * Mengembalikan status sirkuit saat ini untuk divisualisasikan pada Web Playground (Slide 58).
 */
router.get("/circuit-status", (req, res) => {
  return res.status(200).json({
    success: true,
    circuit: notificationCircuit.getStatusInfo(),
  });
});

/**
 * POST /api/v1/debug/circuit-reset
 * Mengatur ulang status Circuit Breaker ke posisi CLOSED (awal) untuk mempermudah lab.
 */
router.post("/circuit-reset", (req, res) => {
  notificationCircuit.reset();
  return res.status(200).json({
    success: true,
    message: "Circuit Breaker berhasil di-reset ke status CLOSED.",
    circuit: notificationCircuit.getStatusInfo(),
  });
});

/**
 * GET /api/v1/debug/logs
 * Mengambil log terstruktur terbaru dari memori server untuk live log viewer (Slide 24).
 */
router.get("/logs", (req, res) => {
  return res.status(200).json({
    success: true,
    count: inMemoryLogs.length,
    logs: inMemoryLogs,
  });
});

/**
 * GET /api/v1/debug/users
 * Mengambil daftar pengguna laboratorium beserta instant login token untuk mempermudah pengujian di Web Playground.
 */
router.get("/users", (req, res) => {
  const users = db.prepare("SELECT id, username, email, role, team_id, tenant_id FROM users").all();

  // Menyiapkan token akses cepat untuk tiap user agar praktikan playground tidak perlu login manual terus-menerus
  const usersWithTokens = users.map((u) => {
    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare("INSERT INTO tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
      tokenHash,
      u.id,
      expiresAt,
      new Date().toISOString()
    );

    return {
      ...u,
      sample_token: rawToken,
    };
  });

  return res.status(200).json({
    success: true,
    users: usersWithTokens,
  });
});

/**
 * POST /api/v1/debug/crypto-interactive
 * Menguji enkripsi/dekripsi AES-256-GCM dan simulasi pemalsuan (tampering) 1 bit secara langsung.
 */
router.post("/crypto-interactive", (req, res) => {
  try {
    const { plaintext, aad, tamper } = req.body || {};

    if (!plaintext) {
      return res.status(400).json({ error: "Plaintext wajib diisi" });
    }

    const aadString = aad || "taskhub:lab:demo:v1";

    // 1. Enkripsi
    const enc = encryptAesGcm(plaintext, PLAYGROUND_KEY, aadString);

    // 2. Jika opsi tamper aktif, balik 1 bit pada byte terakhir
    let cipherToDecrypt = enc.ciphertextHex;
    let bitTampered = false;

    if (tamper === true) {
      const buf = Buffer.from(cipherToDecrypt, "hex");
      buf[buf.length - 1] ^= 1;
      cipherToDecrypt = buf.toString("hex");
      bitTampered = true;
    }

    // 3. Dekripsi
    let decrypted = null;
    let verificationError = null;

    try {
      decrypted = decryptAesGcm(cipherToDecrypt, PLAYGROUND_KEY, enc.nonceHex, enc.authTagHex, aadString);
    } catch (err) {
      verificationError = err.message;
    }

    return res.status(200).json({
      success: true,
      original_plaintext: plaintext,
      aad: aadString,
      encryption_result: enc,
      tampered: bitTampered,
      decryption_result: decrypted,
      verification_failed: !!verificationError,
      error_message: verificationError,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
