// ==============================================================================
// BERKAS: scripts/seed.js
// TUJUAN: Mengisi data awal (seeding) ke basis data TaskHub untuk pengujian laboratorium.
// RUJUKAN SLIDE:
//   - Slide 7: Aktor: Member, manager, admin, client, provider.
//   - Slide 12: Uji BOLA: Buat task Alice, login Bob; Manager Tim A ditolak terhadap task Bob Tim B.
//   - Slide 35: Kata sandi disimpan dengan scrypt + salt.
// CARA MENJALANKAN: node scripts/seed.js  ATAU  npm run seed
// ==============================================================================

import { db } from "../src/db.js";
import { hashPassword } from "../src/services/cryptoService.js";

console.log("🌱 [SEEDING] Memulai inisialisasi data pengguna dan tugas TaskHub...");

// Bersihkan data lama agar kondisi laboratorium konsisten
db.exec("DELETE FROM task_secrets;");
db.exec("DELETE FROM tasks;");
db.exec("DELETE FROM tokens;");
db.exec("DELETE FROM users;");

// Kata sandi default untuk semua akun lab (mudah diingat untuk pengujian)
const defaultPassword = "Password123!";
const defaultPasswordHash = hashPassword(defaultPassword);

// Daftar pengguna laboratorium dengan berbagai peran dan tim (Slide 7 & 12)
const users = [
  {
    id: "user-alice-001",
    username: "alice",
    email: "alice@tim-a.example.com",
    role: "member",
    team_id: "team-a",
    tenant_id: "tenant-1",
  },
  {
    id: "user-bob-002",
    username: "bob",
    email: "bob@tim-b.example.com",
    role: "member",
    team_id: "team-b",
    tenant_id: "tenant-1",
  },
  {
    id: "user-charlie-003",
    username: "charlie",
    email: "charlie.manager@tim-a.example.com",
    role: "manager",
    team_id: "team-a", // Manager Tim A (berhak atas task Alice, tapi TIDAK berhak atas task Bob Tim B! Slide 12)
    tenant_id: "tenant-1",
  },
  {
    id: "user-diana-004",
    username: "diana",
    email: "diana.admin@corp.example.com",
    role: "admin",
    team_id: "team-admin", // Admin memiliki akses menyeluruh dalam satu tenant
    tenant_id: "tenant-1",
  },
  {
    id: "user-eve-005",
    username: "eve",
    email: "eve@tenant2.example.com",
    role: "member",
    team_id: "team-x",
    tenant_id: "tenant-2", // Berada di Tenant berbeda untuk pengujian isolasi multi-tenant (Slide 13)
  },
];

// Memasukkan pengguna ke tabel users dengan prepared statement (Slide 17)
const insertUserStmt = db.prepare(`
  INSERT INTO users (id, username, email, password_hash, role, team_id, tenant_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const u of users) {
  insertUserStmt.run(
    u.id,
    u.username,
    u.email,
    defaultPasswordHash,
    u.role,
    u.team_id,
    u.tenant_id,
    new Date().toISOString()
  );
}

console.log(`✅ [SEEDING] Berhasil membuat ${users.length} pengguna:`);
users.forEach((u) => console.log(`   - ${u.username.padEnd(8)} | Role: ${u.role.padEnd(8)} | Tim: ${u.team_id.padEnd(8)} | Tenant: ${u.tenant_id}`));

// Daftar tugas awal untuk pengujian BOLA (Slide 12)
const tasks = [
  {
    id: "task-alice-101",
    title: "Implementasi Modul Desain Alice",
    description: "Tugas rahasia Tim A milik Alice yang tidak boleh dibaca atau diubah oleh Bob.",
    status: "open",
    version: 1,
    owner_id: "user-alice-001",
    team_id: "team-a",
    tenant_id: "tenant-1",
  },
  {
    id: "task-alice-102",
    title: "Review Kontrak API TaskHub Alice",
    description: "Dokumentasi spesifikasi endpoint notifikasi ke mock provider.",
    status: "open",
    version: 1,
    owner_id: "user-alice-001",
    team_id: "team-a",
    tenant_id: "tenant-1",
  },
  {
    id: "task-bob-201",
    title: "Optimasi Query Database Bob",
    description: "Tugas milik Bob di Tim B. Manager Tim A (Charlie) TIDAK boleh mengakses tugas ini! (Slide 12)",
    status: "open",
    version: 1,
    owner_id: "user-bob-002",
    team_id: "team-b",
    tenant_id: "tenant-1",
  },
  {
    id: "task-eve-301",
    title: "Laporan Keuangan Tenant 2 Milik Eve",
    description: "Data sensitif tenant-2. Pengguna tenant-1 tidak boleh melihat record ini.",
    status: "open",
    version: 1,
    owner_id: "user-eve-005",
    team_id: "team-x",
    tenant_id: "tenant-2",
  },
];

// Memasukkan data tasks dengan prepared statement
const insertTaskStmt = db.prepare(`
  INSERT INTO tasks (id, title, description, status, version, owner_id, team_id, tenant_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const t of tasks) {
  insertTaskStmt.run(
    t.id,
    t.title,
    t.description,
    t.status,
    t.version,
    t.owner_id,
    t.team_id,
    t.tenant_id,
    new Date().toISOString(),
    new Date().toISOString()
  );
}

console.log(`✅ [SEEDING] Berhasil membuat ${tasks.length} data tugas awal.`);
console.log("🔑 [INFO LOGIN] Semua akun menggunakan kata sandi:", defaultPassword);
console.log("🌱 [SEEDING] Selesai.");
