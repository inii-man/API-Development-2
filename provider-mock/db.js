// ==============================================================================
// BERKAS: provider-mock/db.js
// TUJUAN: Manajemen basis data SQLite untuk Provider Mock guna menyimpan state Idempotency.
// RUJUKAN SLIDE:
//   - Slide 56: Mock menyimpan key, hash payload, dan respons di SQLite.
//   - Slide 56: Tanpa penyimpanan hasil di server/provider, key tidak memberi jaminan.
// ==============================================================================

// Mengimpor modul bawaan SQLite tersinkronisasi dari Node.js 20+
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { settings } from "../src/config.js";

// Menentukan path berkas SQLite untuk Provider Mock
const dbPath = resolve(process.cwd(), settings.MOCK_DATABASE_URL || "./provider_mock.db");

// Menginisialisasi koneksi basis data
export const mockDb = new DatabaseSync(dbPath);

// Mengaktifkan WAL mode (Write-Ahead Logging) untuk konkurensi optimal
mockDb.exec("PRAGMA journal_mode = WAL;");

// Membuat tabel penyimpanan idempotensi jika belum ada (Slide 56)
// Kolom:
// - idempotency_key: Kunci unik dari client (Primary Key)
// - payload_hash: Hash SHA-256 dari body request untuk mendeteksi modifikasi intent
// - response_status: Kode status HTTP yang disimpan (misal 200)
// - response_body: Isi respons JSON yang disimpan untuk di-replay
// - created_at: Waktu pertama kali request diproses
mockDb.exec(`
  CREATE TABLE IF NOT EXISTS idempotency_records (
    idempotency_key TEXT PRIMARY KEY,
    payload_hash TEXT NOT NULL,
    response_status INTEGER NOT NULL,
    response_body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

/**
 * Mencari catatan idempotensi berdasarkan kunci unik.
 * @param {string} key - Idempotency Key
 * @returns {object|null} Baris record atau null jika belum pernah diproses
 */
export function getIdempotencyRecord(key) {
  // Menggunakan Parameter Binding untuk keamanan (Slide 17: "Data tetap data")
  const stmt = mockDb.prepare("SELECT * FROM idempotency_records WHERE idempotency_key = ?");
  const row = stmt.get(key);
  return row || null;
}

/**
 * Menyimpan hasil respons baru ke dalam tabel idempotensi.
 * @param {string} key - Idempotency Key
 * @param {string} payloadHash - Hash SHA-256 dari body request
 * @param {number} status - Status code HTTP respons (misal 200)
 * @param {object} body - Objek respons JSON
 */
export function saveIdempotencyRecord(key, payloadHash, status, body) {
  const stmt = mockDb.prepare(`
    INSERT INTO idempotency_records (idempotency_key, payload_hash, response_status, response_body, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(key, payloadHash, status, JSON.stringify(body), new Date().toISOString());
}

/**
 * Menghapus seluruh riwayat idempotensi mock (berguna untuk reset laboratorium)
 */
export function clearMockRecords() {
  mockDb.exec("DELETE FROM idempotency_records;");
}
