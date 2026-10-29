// ==============================================================================
// BERKAS: src/config.js
// TUJUAN: Memvalidasi variabel lingkungan (Environment Variables) saat aplikasi startup.
// RUJUKAN SLIDE: Slide 44 (Secret manager, bukan env var & repo) & Slide 45 (dotenv, validasi env Zod).
// PRINSIP KEAMANAN: Fail-Fast (Aplikasi langsung berhenti jika ada konfigurasi penting yang hilang).
// ==============================================================================

// Mengimpor library dotenv untuk membaca file konfigurasi lokal (.env)
import "dotenv/config";

// Mengimpor Zod untuk validasi skema dan pengetikan runtime yang ketat
import { z } from "zod";

// Mendefinisikan skema validasi variabel lingkungan menggunakan Zod
// Hal ini memastikan aplikasi tidak berjalan dengan nilai rahasia kosong atau URL cacat.
const EnvSchema = z.object({
  // Port untuk server TaskHub API (default 8000 sesuai Slide 8 dan Slide 50)
  PORT: z.string().default("8000").transform((val) => parseInt(val, 10)),

  // Lokasi berkas database SQLite TaskHub (Slide 17)
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi (misal: ./taskhub.db)"),

  // Kunci rahasia untuk menandatangani HMAC webhook (Slide 45)
  WEBHOOK_SECRET: z.string().min(16, "WEBHOOK_SECRET minimal 16 karakter demi keamanan"),

  // URL dasar layanan Provider Eksternal (Mock Service berjalan di port 8001 sesuai Slide 66)
  PROVIDER_BASE_URL: z.string().url("PROVIDER_BASE_URL harus berupa URL yang valid (misal: http://127.0.0.1:8001)"),

  // Port untuk server Provider Mock (default 8001)
  MOCK_PORT: z.string().default("8001").transform((val) => parseInt(val, 10)),

  // Lokasi berkas database SQLite untuk Provider Mock (penyimpanan idempotensi Slide 56)
  MOCK_DATABASE_URL: z.string().default("./provider_mock.db"),

  // Origin yang diizinkan untuk browser CORS (Slide 30)
  ALLOWED_ORIGIN: z.string().default("https://app.taskhub.example.com"),
});

// Fungsi pembantu untuk mem-parsing dan memvalidasi `process.env`
function validateConfig() {
  // Melakukan parsing terhadap process.env berdasarkan skema EnvSchema
  const result = EnvSchema.safeParse(process.env);

  // Jika validasi gagal, tampilkan pesan error yang informatif lalu hentikan proses (Fail-Fast)
  if (!result.success) {
    console.error("❌ [FATAL CONFIG ERROR] Konfigurasi environment (.env) tidak valid:");
    // Menampilkan daftar kesalahan spesifik tanpa membocorkan nilai rahasia
    console.error(result.error.format());
    process.exit(1);
  }

  // Mengembalikan objek konfigurasi yang sudah divalidasi dan aman digunakan
  return result.data;
}

// Mengekspor objek konfigurasi tunggal (singleton) untuk digunakan di seluruh aplikasi
export const settings = validateConfig();
