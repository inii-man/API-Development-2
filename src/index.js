// ==============================================================================
// BERKAS: src/index.js
// TUJUAN: Server Utama TaskHub API (Port 8000).
// RUJUKAN SLIDE:
//   - Slide 1: NODE.JS 20+ · EXPRESS · TASKHUB (API Development Training Hari 2)
//   - Slide 8: Trust boundary: Client -> TaskHub API (8000) -> Provider Mock (8001)
//   - Slide 22: Urutan kontrol input: Ukuran (413), Content-Type (415), Parse (400), Skema (422)
//   - Slide 23 & 24: Request ID middleware & Pino structured logging
//   - Slide 27: express-rate-limit (60 req/menit/IP, 429 + Retry-After)
//   - Slide 30: Paket cors (allowedOrigins, methods, allowedHeaders)
//   - Slide 66: node --watch src/index.js # TaskHub, port 8000
// ==============================================================================

import express from "express";
import { resolve } from "node:path";
import { settings } from "./config.js";
import { httpLoggerMiddleware, logger } from "./logger.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { corsMiddleware } from "./middleware/corsConfig.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { globalErrorHandler } from "./middleware/errorHandler.js";

// Rute modul
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import debugRoutes from "./routes/debugRoutes.js";

// 1. Inisialisasi aplikasi Express
const app = express();
const PORT = settings.PORT || 8000;

// 2. Middleware Request ID (Slide 24: crypto.randomUUID untuk mengikat log dan tracing)
app.use(requestIdMiddleware);

// 3. Middleware Structured Logging Pino (Slide 24: request_id, method, path tanpa query, status, latency)
app.use(httpLoggerMiddleware);

// 4. Middleware Keamanan CORS (Slide 29 & 30: Mengatur browser lintas origin secara aman)
app.use(corsMiddleware);

// 5. Middleware Rate Limiter Global (Slide 27: 60 request/menit/IP dengan status 429 & Retry-After)
app.use(apiRateLimiter);

// ------------------------------------------------------------------------------
// PENEGAKAN URUTAN KONTROL INPUT (Slide 22)
// ------------------------------------------------------------------------------

// TAHAP 1 & TAHAP 3: Kontrol Ukuran (413) & Parse JSON (400 jika rusak) (Slide 22)
// Membatasi ukuran payload maksimal 50KB untuk mencegah serangan Resource Exhaustion / CPU overload (Slide 9 & 22)
app.use(
  express.json({
    limit: "50kb",
  })
);

// TAHAP 2: Kontrol Content-Type (Slide 22 -> 415 Unsupported Media Type)
// Memastikan request body yang masuk pada metode POST dan PATCH menyertakan Content-Type application/json
app.use((req, res, next) => {
  if (["POST", "PATCH", "PUT"].includes(req.method)) {
    const contentType = req.header("content-type");
    // Jika ada body yang dikirim tetapi content-type bukan application/json
    if (req.body && Object.keys(req.body).length > 0 && (!contentType || !contentType.includes("application/json"))) {
      const err = new Error("Header 'Content-Type: application/json' wajib disertakan.");
      err.status = 415; // Slide 22: Content-Type -> 415
      err.code = "UNSUPPORTED_MEDIA_TYPE";
      return next(err);
    }
  }
  next();
});

// ------------------------------------------------------------------------------
// SERVING WEB PLAYGROUND & DOKUMENTASI INTERAKTIF
// ------------------------------------------------------------------------------
const playgroundPath = resolve(process.cwd(), "playground");
app.use("/playground", express.static(playgroundPath));

// Redirect halaman utama ke Interactive Web Playground
app.get("/", (req, res) => {
  res.redirect("/playground");
});

// ------------------------------------------------------------------------------
// REGISTRASI RUTE ENDPOINT REST API (v1)
// ------------------------------------------------------------------------------
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/debug", debugRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "TaskHub API (Training Hari 2)",
    port: PORT,
    timestamp: new Date().toISOString(),
    request_id: req.requestId,
  });
});

// Penanganan rute 404 jika endpoint tidak ditemukan
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Alamat endpoint '${req.method} ${req.path}' tidak ditemukan pada server TaskHub.`,
      request_id: req.requestId || "unknown",
    },
  });
});

// ------------------------------------------------------------------------------
// CENTRALIZED ERROR HANDLER (Slide 23)
// ------------------------------------------------------------------------------
// Menjamin seluruh respons error memiliki format baku tanpa kebocoran stack trace internal (Slide 19 & 23)
app.use(globalErrorHandler);

// Menjalankan server TaskHub di port 8000 (Slide 8 & 66)
app.listen(PORT, () => {
  logger.info(`🚀 [TASKHUB API] Berjalan di http://127.0.0.1:${PORT}`);
  logger.info(`🌐 [WEB PLAYGROUND] Buka di browser: http://127.0.0.1:${PORT}/playground`);
  logger.info(`📚 [HEALTH CHECK] http://127.0.0.1:${PORT}/health`);
});
