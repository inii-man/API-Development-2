// ==============================================================================
// BERKAS: src/services/notificationAdapter.js
// TUJUAN: Mengimplementasikan pola Adapter untuk integrasi ke provider eksternal,
//         dilengkapi timeout (AbortSignal), retry terbatas dengan exponential backoff & jitter,
//         penerjemahan error, dan proteksi Circuit Breaker.
// RUJUKAN SLIDE:
//   - Slide 49: Adapter terjemahkan domain internal ke kontrak provider
//   - Slide 50: Alur integrasi: Client -> TaskHub (8000) -> Adapter -> Provider Mock (8001)
//   - Slide 52: Timeout versus deadline: AbortSignal.timeout(1500)
//   - Slide 53: Timeout setelah request terkirim: hasilnya belum diketahui
//   - Slide 54: Retry: kapan layak (429, 502, 503, 504, timeout) & kapan tidak (401, 403, 409, 422)
//   - Slide 55: Exponential backoff, jitter, dan menghormati header Retry-After
//   - Slide 56: Idempotency-Key tidak boleh berubah saat retry
//   - Slide 61 & 62: Kode dasar NotificationProvider dengan AbortSignal.timeout(1500)
//   - Slide 63: Yang harus ditambahkan pada adapter (Retry terbatas, Klasifikasi error, Isolasi)
//   - Slide 69: Penolakan 503 CIRCUIT_OPEN langsung saat sirkuit terbuka
// ==============================================================================

import { settings } from "../config.js";
import { notificationCircuit } from "./circuitBreaker.js";
import { logger } from "../logger.js";

/**
 * Kelas Adapter NotificationProvider
 * Berfungsi sebagai gerbang isolasi antara domain TaskHub dan sistem vendor eksternal.
 */
export class NotificationProvider {
  /**
   * Menginisialisasi adapter dengan URL dasar penyedia (Slide 61)
   * @param {string} baseUrl - Alamat provider eksternal (misal: http://127.0.0.1:8001)
   */
  constructor(baseUrl) {
    this.baseUrl = baseUrl || settings.PROVIDER_BASE_URL;

    // Batas waktu tunggu satu fase HTTP request dalam milidetik (Slide 62: 1500ms)
    this.timeoutMs = 1500;

    // Batas maksimum percobaan retry (Slide 55 & 69: Maksimum tiga percobaan)
    this.maxRetries = 2; // 1 percobaan awal + 2 retry = total 3 percobaan
  }

  /**
   * Mengirimkan notifikasi ke provider dengan seluruh pengaman reliability terpasang.
   *
   * @param {string} taskId - ID tugas yang dinotifikasikan
   * @param {string} title - Judul tugas
   * @param {string} idempotencyKey - Kunci idempotensi unik dari client
   * @param {string} [mode="ok"] - Mode simulasi kegagalan untuk lab (?mode=ok|busy|fail|slow|bad)
   * @returns {Promise<object>} Respons hasil dari provider atau adapter
   */
  async send(taskId, title, idempotencyKey, mode = "ok") {
    // --------------------------------------------------------------------------
    // 1. PEMERIKSAAN CIRCUIT BREAKER (Slide 58, 59, 69)
    // --------------------------------------------------------------------------
    // Jika circuit breaker sedang berstatus OPEN (Slide 69: "Setelah tiga intent gagal: 503 CIRCUIT_OPEN langsung"),
    // kita LANGSUNG menolak request tanpa membuang-buang bandwidth dan resource server!
    if (notificationCircuit.blocked()) {
      const statusInfo = notificationCircuit.getStatusInfo();
      const err = new Error(
        `Dependency eksternal sedang mengalami pemadaman (Circuit Breaker OPEN). ` +
        `Panggilan ditolak sementara demi melindungi sistem. Sisa waktu cooldown: ${statusInfo.cooldown_remaining_seconds} detik.`
      );
      err.code = "CIRCUIT_OPEN";
      err.status = 503; // Service Unavailable
      throw err;
    }

    // Variabel pelacak percobaan retry
    let attempt = 0;
    let lastError = null;

    // --------------------------------------------------------------------------
    // 2. PERULANGAN EKSEKUSI DENGAN RETRY TERBATAS (Slide 54 & 55)
    // --------------------------------------------------------------------------
    while (attempt <= this.maxRetries) {
      attempt++;

      try {
        logger.info(
          { attempt, taskId, idempotencyKey, mode },
          `[ADAPTER] Mengirim notifikasi ke provider (Percobaan ${attempt}/${this.maxRetries + 1})...`
        );

        // Membentuk URL tujuan dengan query parameter mode lab
        const targetUrl = `${this.baseUrl}/notify?mode=${encodeURIComponent(mode)}`;

        // Membuat HTTP Request dengan AbortSignal.timeout(1500) (Slide 62)
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Slide 56 & 63: "Intent stabil: Idempotency key tidak berubah saat retry."
            "Idempotency-Key": idempotencyKey,
            "X-Mock-Mode": mode,
          },
          body: JSON.stringify({ taskId, title }),
          // Timeout 1500 milidetik (Slide 62: signal: AbortSignal.timeout(1500))
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        // ----------------------------------------------------------------------
        // 3. KLASIFIKASI KODE STATUS RESPON PROVIDER (Slide 54 & 63)
        // ----------------------------------------------------------------------

        // KASUS A: SUKSES (Status 200 OK)
        if (response.ok) {
          const data = await response.json();

          // Validasi bentuk schema (Response Shape Validation) (Slide 68 & 69: Mode bad -> 502)
          // Jika provider mengembalikan 200 tetapi datanya korup (tidak ada notificationId)
          if (!data || typeof data !== "object" || !data.notificationId) {
            const badSchemaError = new Error(
              "Format respons dari provider tidak sesuai kontrak (Response Shape Rusak/Bad)."
            );
            badSchemaError.code = "BAD_GATEWAY";
            badSchemaError.status = 502; // Slide 69: Mode bad: 502
            // Catat kegagalan ke circuit breaker
            notificationCircuit.result(false);
            throw badSchemaError;
          }

          // Catat keberhasilan ke circuit breaker untuk mereset counter (Slide 60)
          notificationCircuit.result(true);

          return {
            success: true,
            providerResponse: data,
            attemptsUsed: attempt,
          };
        }

        // KASUS B: ERROR PERMANEN - JANGAN DIRETRY! (Slide 54 & 63)
        // 401/403: Masalah kredensial/wewenang -> Retry tidak akan mengubah hasil.
        // 422: Payload salah -> Retry dengan payload yang sama akan selalu gagal.
        // 409: Konflik Idempotensi (Slide 56: Kunci sama + payload beda) -> Menolak perubahan intent!
        if ([401, 403, 409, 422].includes(response.status)) {
          const errorBody = await response.json().catch(() => ({}));
          const permanentError = new Error(
            errorBody.message || `Provider mengembalikan kesalahan permanen (${response.status}).`
          );
          permanentError.code = errorBody.error || "PROVIDER_REJECTED";
          permanentError.status = response.status;

          // Catat ke circuit breaker (hanya jika kesalahan server fatal)
          if (response.status === 409) {
            // 409 adalah penolakan bisnis/klien, bukan kegagalan server provider
          } else {
            notificationCircuit.result(false);
          }

          throw permanentError;
        }

        // KASUS C: ERROR SEMENTARA YANG LAYAK DIRETRY (Slide 54)
        // 429 (Too Many Requests), 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout)
        if ([429, 502, 503, 504, 500].includes(response.status)) {
          const retryAfterHeader = response.headers.get("retry-after");
          let delayMs = 0;

          // Slide 55: Menghormati header Retry-After dari provider
          if (response.status === 429 && retryAfterHeader) {
            const seconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(seconds) && seconds > 0) {
              // Dibatasi dengan batas atas (cap kecil 2 detik) agar responsif di lab
              delayMs = Math.min(seconds * 1000, 3000);
            }
          }

          // Jika tidak ada header Retry-After, terapkan Exponential Backoff + Jitter (Slide 55)
          if (delayMs === 0) {
            // Formula Backoff: baseDelay * 2^(attempt-1) + acak jitter (0 - 100ms)
            const baseDelay = 200;
            const jitter = Math.floor(Math.random() * 100);
            delayMs = baseDelay * Math.pow(2, attempt - 1) + jitter;
          }

          lastError = new Error(`Provider mengembalikan status HTTP ${response.status} (Percobaan ${attempt})`);
          lastError.status = response.status;

          // Jika masih memiliki kuota retry, tunggu lalu lanjutkan perulangan
          if (attempt <= this.maxRetries) {
            logger.warn(
              { status: response.status, attempt, delayMs },
              `[ADAPTER] Menunggu ${delayMs}ms sebelum retry (Backoff + Jitter)...`
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          } else {
            // Kuota retry habis
            break;
          }
        }

        // Tangani status code tak terduga lainnya
        throw new Error(`Provider status tak terduga: ${response.status}`);
      } catch (err) {
        lastError = err;

        // KASUS D: TIMEOUT ATAU KONEKSI TERPUTUS (Slide 52, 53, 68)
        // Timeout terjadi ketika provider tidak merespons dalam 1500ms (AbortError)
        if (err.name === "TimeoutError" || err.name === "AbortError") {
          logger.warn(
            { attempt, taskId },
            `[ADAPTER] Request timeout (${this.timeoutMs}ms terlampaui). Slide 53: "Tidak ada respons != tidak ada efek".`
          );

          // Coba ulang jika kuota retry masih ada
          if (attempt <= this.maxRetries) {
            const jitter = Math.floor(Math.random() * 100);
            await new Promise((resolve) => setTimeout(resolve, 300 + jitter));
            continue;
          }
        }

        // Jika error adalah error permanen (401, 403, 409, 422, atau 502 bad schema), langsung lempar keluar
        if (err.status && [401, 403, 409, 422, 502].includes(err.status)) {
          throw err;
        }

        // Lanjutkan perulangan jika masih boleh retry
        if (attempt <= this.maxRetries) {
          continue;
        }
      }
    }

    // --------------------------------------------------------------------------
    // 4. SELURUH PERCOBAAN RETRY GAGAL (Slide 58, 60, 69)
    // --------------------------------------------------------------------------
    // Catat 1 kegagalan intent bisnis ke state machine Circuit Breaker!
    // Slide 69: "Maksimum tiga percobaan; setelahnya API menjawab 503."
    notificationCircuit.result(false);

    const finalError = new Error(
      `Panggilan provider eksternal gagal setelah ${attempt} percobaan. ` +
      (lastError?.message || "Layanan tidak merespons.")
    );
    finalError.code = "EXTERNAL_SERVICE_UNAVAILABLE";
    finalError.status = 503; // Slide 69: Menjawab 503
    throw finalError;
  }
}

// Mengekspor instance adapter default
export const notificationAdapter = new NotificationProvider();
