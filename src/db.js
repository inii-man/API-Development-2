// ==============================================================================
// BERKAS: src/db.js
// TUJUAN: Manajemen basis data SQLite TaskHub dengan Parameter Binding anti-SQL Injection.
// RUJUKAN SLIDE:
//   - Slide 16: "Data tetap data. Kontrol utama adalah memisahkan data dari instruksi."
//   - Slide 17: "Kode: Prisma parameter binding. Jangan bangun SQL dari template string atau input mentah."
//   - Slide 35: "Password scrypt, token hash SHA-256."
//   - Slide 41: "Metadata enkripsi disimpan bersama record (Nonce, Ciphertext, Auth Tag, AAD)."
// ==============================================================================

// Mengimpor modul bawaan SQLite dari Node.js 20+
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { settings } from "./config.js";

// Menentukan path absolut berkas SQLite TaskHub
const dbPath = resolve(process.cwd(), settings.DATABASE_URL || "./taskhub.db");

// Menginisialisasi koneksi basis data TaskHub
export const db = new DatabaseSync(dbPath);

// Mengaktifkan WAL mode dan foreign key constraints
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// ==============================================================================
// INISIALISASI SKEMA TABEL TASKHUB
// ==============================================================================

// 1. Tabel Users: Menyimpan akun pengguna, hak akses RBAC, dan tenant
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('member', 'manager', 'admin')),
    team_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// 2. Tabel Tokens: Menyimpan hash SHA-256 dari opaque token (Slide 35)
db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// 3. Tabel Tasks: Menyimpan resource tugas dengan versioning untuk optimistic locking
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK(status IN ('open', 'done')),
    version INTEGER NOT NULL DEFAULT 1,
    owner_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// 4. Tabel Task Secrets: Menyimpan metadata enkripsi AES-256-GCM (Slide 41)
db.exec(`
  CREATE TABLE IF NOT EXISTS task_secrets (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    ciphertext TEXT NOT NULL,
    nonce TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    aad TEXT NOT NULL,
    key_id TEXT NOT NULL,
    algorithm TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
`);

// ==============================================================================
// PREPARED STATEMENTS (Slide 17: "Data tetap data. Parameter binding!")
// ==============================================================================

// Mencari user berdasarkan username (Login)
const stmtFindUserByUsername = db.prepare("SELECT * FROM users WHERE username = ?");
export function findUserByUsername(username) {
  return stmtFindUserByUsername.get(username) || null;
}

// Mencari user berdasarkan ID
const stmtFindUserById = db.prepare("SELECT id, username, email, role, team_id, tenant_id, created_at FROM users WHERE id = ?");
export function findUserById(id) {
  return stmtFindUserById.get(id) || null;
}

// Menyimpan token session (menggunakan SHA-256 hash)
const stmtInsertToken = db.prepare("INSERT INTO tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)");
export function saveTokenSession(tokenHash, userId, expiresAt) {
  stmtInsertToken.run(tokenHash, userId, expiresAt, new Date().toISOString());
}

// Mencari session aktif berdasarkan hash token
const stmtFindSessionByTokenHash = db.prepare(`
  SELECT t.token_hash, t.expires_at, u.id, u.username, u.email, u.role, u.team_id, u.tenant_id
  FROM tokens t
  JOIN users u ON t.user_id = u.id
  WHERE t.token_hash = ?
`);
export function findSessionByTokenHash(tokenHash) {
  return stmtFindSessionByTokenHash.get(tokenHash) || null;
}

// Mencari task berdasarkan ID
const stmtFindTaskById = db.prepare("SELECT * FROM tasks WHERE id = ?");
export function findTaskById(id) {
  return stmtFindTaskById.get(id) || null;
}

// Memperbarui task dengan Optimistic Locking (memeriksa version)
const stmtUpdateTask = db.prepare(`
  UPDATE tasks
  SET title = ?, description = ?, status = ?, version = version + 1, updated_at = ?
  WHERE id = ? AND version = ?
`);
export function updateTaskWithVersion(id, currentVersion, updates) {
  const info = stmtUpdateTask.run(
    updates.title,
    updates.description,
    updates.status,
    new Date().toISOString(),
    id,
    currentVersion
  );
  return info.changes > 0;
}

// Menghapus task berdasarkan ID
const stmtDeleteTask = db.prepare("DELETE FROM tasks WHERE id = ?");
export function deleteTaskById(id) {
  const info = stmtDeleteTask.run(id);
  return info.changes > 0;
}

// Menyimpan rahasia terenkripsi AES-256-GCM bersama metadata (Slide 41)
const stmtInsertTaskSecret = db.prepare(`
  INSERT INTO task_secrets (id, task_id, ciphertext, nonce, auth_tag, aad, key_id, algorithm, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
export function saveTaskSecret(secretRecord) {
  stmtInsertTaskSecret.run(
    secretRecord.id,
    secretRecord.task_id,
    secretRecord.ciphertext,
    secretRecord.nonce,
    secretRecord.auth_tag,
    secretRecord.aad,
    secretRecord.key_id,
    secretRecord.algorithm,
    new Date().toISOString()
  );
}

// Mengambil rahasia terenkripsi berdasarkan task_id
const stmtFindTaskSecret = db.prepare("SELECT * FROM task_secrets WHERE task_id = ? ORDER BY created_at DESC LIMIT 1");
export function findTaskSecretByTaskId(taskId) {
  return stmtFindTaskSecret.get(taskId) || null;
}
