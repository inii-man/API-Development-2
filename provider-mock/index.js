// ==============================================================================
// BERKAS: provider-mock/index.js
// TUJUAN: Menjalankan server tiruan (Mock Provider) pihak ketiga di port 8001
//         untuk menguji ketahanan TaskHub terhadap berbagai skenario kegagalan.
// RUJUKAN SLIDE:
//   - Slide 8 & 50: Alur lab: Client -> TaskHub 8000 -> Provider Mock 8001
//   - Slide 56: Idempotency key, hash payload, respons disimpan di SQLite, 409 jika payload berbeda
//   - Slide 66: Provider mock Express: proses terpisah di port 8001 (mode: ok, busy, fail, slow, bad)
//   - Slide 68: Lima mode mock dan hasil yang diharapkan
// ==============================================================================

// Mengimpor Express framework
import express from "express";

// Mengimpor crypto untuk menghasilkan UUID dan SHA-256 hash payload
import { createHash, randomUUID } from "node:crypto";

// Mengimpor konfigurasi aplikasi
import { settings } from "../src/config.js";

// Mengimpor helper basis data SQLite untuk persistensi idempotensi (Slide 56)
import { getIdempotencyRecord, saveIdempotencyRecord, clearMockRecords, mockDb } from "./db.js";

// Menginisialisasi aplikasi Express untuk Provider Mock
const app = express();

// Middleware JSON parser untuk membaca request body (maksimum 100kb untuk lab)
app.use(express.json({ limit: "100kb" }));

// Port Provider Mock (Slide 66: port 8001)
const PORT = settings.MOCK_PORT || 8001;

// ==============================================================================
// ENDPOINT UTAMA: POST /notify (Slide 62, 67, 68)
// ==============================================================================
app.post("/notify", async (req, res) => {
  // 1. Membaca header Idempotency-Key yang dikirimkan oleh Adapter TaskHub (Slide 62)
  const idempotencyKey = req.header("Idempotency-Key") || req.header("idempotency-key");

  // 2. Menentukan mode kegagalan (Fault Injection Mode) (Slide 68)
  // Bisa dikirim melalui query parameter (?mode=...) atau header (X-Mock-Mode)
  const mode = (req.query.mode || req.header("x-mock-mode") || "ok").toString().toLowerCase();

  // 3. Mengambil body request { taskId, title }
  const { taskId, title } = req.body || {};

  // 4. Menghitung hash SHA-256 dari payload untuk mendeteksi integritas intent (Slide 56)
  // Sesuai Slide 56: "Mock menyimpan key, hash payload, dan respons di SQLite."
  const payloadString = JSON.stringify({ taskId: taskId || null, title: title || null });
  const payloadHash = createHash("sha256").update(payloadString).digest("hex");

  // 5. Pengecekan Idempotensi jika header Idempotency-Key disertakan oleh pemanggil (Slide 56)
  if (idempotencyKey) {
    const existing = getIdempotencyRecord(idempotencyKey);

    if (existing) {
      // KASUS A: Kunci sama + Payload sama -> Kembalikan respons yang sama persis (Slide 56)
      if (existing.payload_hash === payloadHash) {
        res.setHeader("X-Cache-Lookup", "HIT-IDEMPOTENCY");
        return res.status(existing.response_status).json(JSON.parse(existing.response_body));
      }

      // KASUS B: Kunci sama + Payload berbeda -> Tolak dengan 409 Conflict! (Slide 56)
      // "Intent sama memakai key dan payload sama. Intent baru memakai key baru."
      return res.status(409).json({
        error: "IDEMPOTENCY_CONFLICT",
        message: "Idempotency-Key sudah pernah digunakan dengan payload yang berbeda.",
        idempotency_key: idempotencyKey,
      });
    }
  }

  // ============================================================================
  // SIMULASI LIMA MODE KEGAGALAN PROVIDER (Slide 68: ok, busy, fail, slow, bad)
  // ============================================================================

  switch (mode) {
    // --------------------------------------------------------------------------
    // MODE 1: OK (Slide 68)
    // Perilaku: Status 200 dengan notificationId unik
    // --------------------------------------------------------------------------
    case "ok": {
      const responsePayload = {
        success: true,
        notificationId: `notif_${randomUUID().slice(0, 8)}`,
        taskId: taskId || "unknown",
        title: title || "untitled",
        deliveredAt: new Date().toISOString(),
      };

      // Simpan respons ke basis data jika menggunakan Idempotency-Key (Slide 56)
      if (idempotencyKey) {
        saveIdempotencyRecord(idempotencyKey, payloadHash, 200, responsePayload);
      }

      return res.status(200).json(responsePayload);
    }

    // --------------------------------------------------------------------------
    // MODE 2: BUSY (Slide 68)
    // Perilaku: Status 429 Too Many Requests dengan header 'Retry-After: 2'
    // --------------------------------------------------------------------------
    case "busy": {
      // Menyertakan header Retry-After dalam hitungan detik (Slide 55 & 68)
      res.setHeader("Retry-After", "2");
      return res.status(429).json({
        error: "RATE_LIMITED",
        message: "Provider sedang sibuk (Too Many Requests). Silakan coba lagi setelah 2 detik.",
        retry_after_seconds: 2,
      });
    }

    // --------------------------------------------------------------------------
    // MODE 3: FAIL (Slide 68)
    // Perilaku: Status 503 Service Unavailable (kegagalan sementara server pihak ketiga)
    // --------------------------------------------------------------------------
    case "fail": {
      return res.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: "Provider internal error (503 Service Unavailable).",
      });
    }

    // --------------------------------------------------------------------------
    // MODE 4: SLOW (Slide 68)
    // Perilaku: Menunggu 2000ms (2 detik), melampaui timeout client TaskHub (1500ms)
    // Menguji AbortSignal.timeout(1500) di sisi TaskHub Adapter!
    // --------------------------------------------------------------------------
    case "slow": {
      // Menahan koneksi selama 2000 milidetik (Slide 68: "Menunggu 2 detik")
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const slowResponse = {
        success: true,
        notificationId: `notif_delayed_${randomUUID().slice(0, 8)}`,
        note: "Respons ini selesai setelah 2000ms (tetapi kemungkinan TaskHub sudah memutus koneksi/timeout).",
      };

      // Catat ke SQLite jika client menggunakan Idempotency-Key
      // Slide 53: "Timeout setelah request terkirim: hasilnya belum diketahui. Tidak ada respons != tidak ada efek."
      if (idempotencyKey) {
        saveIdempotencyRecord(idempotencyKey, payloadHash, 200, slowResponse);
      }

      return res.status(200).json(slowResponse);
    }

    // --------------------------------------------------------------------------
    // MODE 5: BAD (Slide 68)
    // Perilaku: Mengembalikan status 200 tetapi format JSON salah (tidak memiliki notificationId)
    // Adapter TaskHub harus mendeteksi skema cacat ini dan menerjemahkannya menjadi 502 Bad Gateway!
    // --------------------------------------------------------------------------
    case "bad": {
      // Mengirim struktur respons yang menyalahi kontrak API (Slide 68 & 69)
      return res.status(200).json({
        status: "weird_corrupted_response",
        corrupted: true,
        missing_id: true,
        data: null,
      });
    }

    // --------------------------------------------------------------------------
    // DEFAULT: Jika parameter mode tidak dikenali
    // --------------------------------------------------------------------------
    default: {
      return res.status(400).json({
        error: "INVALID_MOCK_MODE",
        message: `Mode '${mode}' tidak valid. Pilihan yang tersedia: ok, busy, fail, slow, bad.`,
      });
    }
  }
});

// ==============================================================================
// ENDPOINT DIAGNOSTIK UNTUK WEB PLAYGROUND & INSPEKTOR LAB
// ==============================================================================

// Melihat seluruh rekaman idempotensi yang tersimpan di SQLite Mock
app.get("/records", (req, res) => {
  const rows = mockDb.prepare("SELECT * FROM idempotency_records ORDER BY created_at DESC LIMIT 50").all();
  res.json({ count: rows.length, records: rows });
});

// Mengosongkan rekaman idempotensi mock untuk reset lab
app.post("/clear", (req, res) => {
  clearMockRecords();
  res.json({ success: true, message: "Rekaman idempotensi Mock Provider berhasil dikosongkan." });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "Provider Mock", port: PORT });
});

// Menjalankan server Mock Provider
app.listen(PORT, () => {
  console.log(`📡 [MOCK PROVIDER] Berjalan di http://127.0.0.1:${PORT}`);
  console.log(`   Endpoint: POST http://127.0.0.1:${PORT}/notify?mode=[ok|busy|fail|slow|bad]`);
});
