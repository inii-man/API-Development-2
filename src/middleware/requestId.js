// ==============================================================================
// BERKAS: src/middleware/requestId.js
// TUJUAN: Menghasilkan ID unik untuk setiap HTTP request menggunakan UUIDv4 acak.
// RUJUKAN SLIDE:
//   - Slide 23: Format error mencantumkan "request_id": "req_abc123"
//   - Slide 24: "Middleware Express memberi request_id (crypto.randomUUID) untuk satu request.
//                Sertakan di header dan body error."
// PRINSIP KEAMANAN: Membantu pelacakan log dan troubleshooting tanpa membagikan kredensial/token.
// ==============================================================================

import { randomUUID } from "node:crypto";

/**
 * Middleware untuk menyematkan Request ID ke setiap request dan response.
 */
export function requestIdMiddleware(req, res, next) {
  // 1. Memeriksa apakah client sudah mengirim header X-Request-Id (misal dari API Gateway / Ingress)
  // Jika tidak ada, bangkitkan UUID acak bertaraf kriptografis (Slide 24)
  const incomingId = req.header("X-Request-Id") || req.header("x-request-id");
  const requestId = incomingId || `req_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

  // 2. Menyimpan ID ke objek `req` agar dapat dibaca oleh controller, logger, dan error handler
  req.requestId = requestId;

  // 3. Mengirimkan ID kembali ke client melalui HTTP Response Header (Slide 24: "Sertakan di header")
  res.setHeader("X-Request-Id", requestId);

  // 4. Melanjutkan ke middleware selanjutnya
  next();
}
