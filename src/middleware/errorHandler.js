// ==============================================================================
// BERKAS: src/middleware/errorHandler.js
// TUJUAN: Menyeragamkan format respons kesalahan (Error Handler Konsisten di Express).
// RUJUKAN SLIDE:
//   - Slide 19: "Error terkendali: Tidak ada detail query atau stack trace internal."
//   - Slide 22: "Urutan kontrol input: 413 (Ukuran), 415 (Content-Type), 400 (Parse JSON), 422 (Skema)."
//   - Slide 23: "Format baku: { error: { code, message, request_id } }. Code stabil untuk mesin; message untuk manusia."
// ==============================================================================

import { ZodError } from "zod";

/**
 * Middleware Express untuk penanganan error terpusat (4 parameter: err, req, res, next).
 * Sesuai Slide 23: Semua error yang keluar dari API TaskHub memiliki bentuk seragam ini.
 */
export function globalErrorHandler(err, req, res, next) {
  // 1. Mengambil Request ID yang sudah dibuat di awal alur (Slide 23 & 24)
  const requestId = req.requestId || "req_unknown";

  // 2. KASUS 1: Error Validasi Skema Zod (Slide 21 & 22 -> HTTP 422 Unprocessable Entity)
  if (err instanceof ZodError || err.name === "ZodError") {
    const issues = err.issues || err.errors || [];
    const errorDetails = issues.map((e) => ({
      path: Array.isArray(e.path) ? e.path.join(".") : String(e.path || ""),
      message: e.message,
    }));

    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Payload yang dikirimkan tidak sesuai dengan skema kontrak API.",
        details: errorDetails,
        request_id: requestId,
      },
    });
  }

  // 3. KASUS 2: Error Syntax JSON Parser (Slide 22 -> HTTP 400 Bad Request jika JSON rusak)
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: {
        code: "MALFORMED_JSON",
        message: "Format tubuh permintaan (JSON) rusak atau tidak valid.",
        request_id: requestId,
      },
    });
  }

  // 4. KASUS 3: Error Ukuran Payload Melebihi Batas (Slide 22 -> HTTP 413 Payload Too Large)
  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Ukuran data yang dikirim melebihi kapasitas maksimum yang diizinkan server.",
        request_id: requestId,
      },
    });
  }

  // 5. KASUS 4: Error Content-Type Tidak Didukung (Slide 22 -> HTTP 415 Unsupported Media Type)
  if (err.status === 415) {
    return res.status(415).json({
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Content-Type tidak didukung. Header 'Content-Type: application/json' diperlukan.",
        request_id: requestId,
      },
    });
  }

  // 6. KASUS 5: Error CORS / Akses Ditolak Browser (Slide 29 & 30)
  if (err.status === 403 && err.message.includes("CORS")) {
    return res.status(403).json({
      error: {
        code: "CORS_FORBIDDEN",
        message: err.message,
        request_id: requestId,
      },
    });
  }

  // 7. KASUS 6: Error Status Kustom yang Ditentukan oleh Aplikasi
  const statusCode = typeof err.status === "number" ? err.status : 500;

  // Sesuai Slide 19: JANGAN PERNAH membocorkan stack trace internal atau query SQL ke client produksi!
  const isServerInternalError = statusCode >= 500;
  const userSafeMessage = isServerInternalError
    ? "Terjadi kesalahan internal pada server. Silakan hubungi tim dukungan teknis dengan menyertakan Request ID."
    : err.message || "Permintaan tidak dapat diproses.";

  return res.status(statusCode).json({
    error: {
      code: err.code || (isServerInternalError ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED"),
      message: userSafeMessage,
      request_id: requestId,
    },
  });
}
