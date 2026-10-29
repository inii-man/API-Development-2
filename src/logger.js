// ==============================================================================
// BERKAS: src/logger.js
// TUJUAN: Menghasilkan structured logging (JSON) menggunakan Pino dengan proteksi data sensitif.
// RUJUKAN SLIDE: Slide 24 (Request ID middleware dan structured logging).
// PRINSIP KEAMANAN: Jangan pernah mencatat token, kata sandi, cookie, atau signature mentah ke log!
// ==============================================================================

// Mengimpor library pino untuk structured logging berperforma tinggi
import pino from "pino";

// Menyiapkan array memori ringkas untuk menampung log terbaru agar bisa dilihat di Web Playground
export const inMemoryLogs = [];
const MAX_IN_MEMORY_LOGS = 100;

// Fungsi helper untuk menyimpan log ke memori lokal playground (tanpa data sensitif)
export function recordLogForPlayground(logEntry) {
  // Menambahkan timestamp jika belum ada
  const entry = {
    timestamp: new Date().toISOString(),
    ...logEntry,
  };
  // Menyimpan ke awal array (terbaru di atas)
  inMemoryLogs.unshift(entry);
  // Membatasi kapasitas agar tidak membebani memori server
  if (inMemoryLogs.length > MAX_IN_MEMORY_LOGS) {
    inMemoryLogs.pop();
  }
}

// Menginisialisasi instance Pino logger
export const logger = pino({
  // Menetapkan level log minimum (info, warn, error)
  level: process.env.LOG_LEVEL || "info",

  // Mengonfigurasi redaksi otomatis (Redaction) untuk field sensitif (Slide 24 & 51)
  redact: {
    paths: [
      "req.headers.authorization", // Jangan mencatat token Bearer (Slide 24)
      "req.headers.cookie",        // Jangan mencatat cookie otentikasi (Slide 24)
      "password",                  // Jangan mencatat kata sandi pengguna
      "token",                     // Jangan mencatat token akses mentah
      "secret",                    // Jangan mencatat secret webhook / API key
      "apiKey",                    // Jangan mencatat credential vendor
      "body.password",             // Jangan mencatat password dalam body request
      "body.creditCard",           // Jangan mencatat informasi finansial/PII
    ],
    // Mengganti teks yang diredaksi dengan label sensor yang jelas
    censor: "[REDACTED_RAHASIA]",
  },

  // Konfigurasi format waktu ISO 8601 standar
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Middleware Express kustom untuk mencatat HTTP access log dengan format terstruktur
// Sesuai Slide 24: request_id, method, path tanpa query, status, latency.
export function httpLoggerMiddleware(req, res, next) {
  // Mencatat waktu mulai request dalam milidetik (performance measurement)
  const startTime = Date.now();

  // Menangkap event 'finish' ketika response selesai dikirimkan ke client
  res.on("finish", () => {
    // Menghitung latensi total dalam satuan milidetik (ms)
    const latencyMs = Date.now() - startTime;

    // Mengambil path URL tanpa query string (Slide 24: "path tanpa query")
    // Mencegah kebocoran token yang salah tempat dimasukkan ke dalam query URL!
    const base = req.baseUrl || "";
    const cleanPath = base + (req.path === "/" ? "" : req.path);

    // Mempersiapkan struktur log standar JSON
    const logData = {
      request_id: req.requestId || "unknown", // Mengikat log dengan ID unik request
      method: req.method,                    // Metode HTTP (GET, POST, PATCH, dll)
      path: cleanPath || req.path,           // Alamat endpoint tanpa parameter query
      status: res.statusCode,                // Kode status respons HTTP (200, 404, 500, dll)
      latency_ms: latencyMs,                 // Waktu pemrosesan server dalam milidetik
      user_id: req.user?.id || null,         // Identitas user jika sudah diautentikasi
      role: req.user?.role || null,          // Peran hak akses (member, manager, admin)
      ip: req.ip || req.socket.remoteAddress,// Alamat IP pemanggil (untuk audit)
    };

    // Mencatat ke konsol/file menggunakan Pino
    if (res.statusCode >= 500) {
      logger.error(logData, "HTTP Request Selesai dengan Kesalahan Server");
    } else if (res.statusCode >= 400) {
      logger.warn(logData, "HTTP Request Selesai dengan Penolakan Client");
    } else {
      logger.info(logData, "HTTP Request Selesai dengan Sukses");
    }

    // Mengirim salinan yang aman ke memori viewer playground
    recordLogForPlayground(logData);
  });

  // Melanjutkan alur eksekusi ke middleware berikutnya
  next();
}
