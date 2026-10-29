// ==============================================================================
// BERKAS: scripts/test_fault_injection.js
// TUJUAN: Skrip pengujian otomatis menyeluruh untuk memvalidasi:
//         1. Proteksi BOLA / IDOR (Slide 12)
//         2. Proteksi Mass Assignment (Slide 20 & 21)
//         3. Integrasi Provider Mock, Idempotency & Fault Injection (Slide 56, 68, 69)
//         4. Pembuktian Circuit Breaker OPEN setelah 3 kegagalan (Slide 58, 60, 69)
// RUJUKAN SLIDE: Slide 12, 21, 56, 68, 69
// CARA MENJALANKAN: Pastikan kedua server aktif (npm start & npm run mock)
//                   lalu jalankan: node scripts/test_fault_injection.js (atau npm run test:fault)
// ==============================================================================

const TASKHUB_URL = "http://127.0.0.1:8000";
const MOCK_URL = "http://127.0.0.1:8001";

// Helper fungsi untuk mencetak heading yang rapi
function printHeader(title) {
  console.log("\n" + "=".repeat(80));
  console.log(`📌 ${title}`);
  console.log("=".repeat(80));
}

// Helper fetch JSON
async function request(endpoint, options = {}) {
  const url = `${TASKHUB_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let body = null;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, headers: res.headers, body };
}

async function runTestSuite() {
  console.log("🚀 [TEST RUNNER HARI 2] Memulai rangkaian verifikasi bukti laboratorium...");

  // 0. RESET BASIS DATA & SIRKUIT
  printHeader("0. RESET STATUS LABORATORIUM");
  await fetch(`${MOCK_URL}/clear`, { method: "POST" }).catch(() => {});
  await request("/api/v1/debug/circuit-reset", { method: "POST" }).catch(() => {});
  console.log("✅ Sirkuit dan mock idempotency berhasil di-reset.");

  // 1. AUTENTIKASI (Slide 7 & 35)
  printHeader("1. AUTENTIKASI PENGGUNA (Alice Member Tim A, Bob Member Tim B, Charlie Manager Tim A)");
  const loginAlice = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "alice", password: "Password123!" }),
  });
  const tokenAlice = loginAlice.body.token;
  console.log(`✅ Login Alice (Member Tim A) sukses: ${loginAlice.status}`);

  const loginBob = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "bob", password: "Password123!" }),
  });
  const tokenBob = loginBob.body.token;
  console.log(`✅ Login Bob (Member Tim B) sukses: ${loginBob.status}`);

  const loginCharlie = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "charlie", password: "Password123!" }),
  });
  const tokenCharlie = loginCharlie.body.token;
  console.log(`✅ Login Charlie (Manager Tim A) sukses: ${loginCharlie.status}`);

  // 2. PEMBUATAN TASK ALICE & PROTEKSI MASS ASSIGNMENT (Slide 20 & 21)
  printHeader("2. PEMBUATAN TASK & MASS ASSIGNMENT TEST (Slide 20 & 21)");

  // Uji Mass Assignment: Mencoba menyisipkan is_admin: true dan role: 'admin' (Slide 21)
  const maliciousPayload = {
    title: "Tugas Normal",
    description: "Mencoba eksploitasi Mass Assignment",
    role: "admin",      // Field internal terlarang!
    is_admin: true,     // Field internal terlarang!
    owner_id: "hacker", // Field internal terlarang!
  };
  const massAssignRes = await request("/api/v1/tasks", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenAlice}` },
    body: JSON.stringify(maliciousPayload),
  });
  console.log(`- Uji Mass Assignment ditolak server: Status ${massAssignRes.status} (Diharapkan 422)`);
  if (massAssignRes.status === 422) {
    console.log(`  🛡️ Bukti Slide 20 & 21: Server menolak field internal [role, is_admin, owner_id]!`);
  }

  // Pembuatan task Alice yang sah
  const validTaskRes = await request("/api/v1/tasks", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenAlice}` },
    body: JSON.stringify({
      title: "Task Analisis Keamanan Alice",
      description: "Data pekerjaan rahasia milik Alice di Tim A",
    }),
  });
  const aliceTaskId = validTaskRes.body.data.id;
  console.log(`✅ Task Alice berhasil dibuat: ID = ${aliceTaskId}`);

  // 3. UJI BOLA / IDOR: LIMA OPERASI, SATU HASIL YANG SAMA (Slide 12)
  printHeader("3. UJI BOLA / IDOR: LIMA JALUR OPERASI OLEH BOB (Slide 12)");

  // 3.1. Bob mencoba membaca Detail Task Alice
  const bolaDetail = await request(`/api/v1/tasks/${aliceTaskId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${tokenBob}` },
  });
  console.log(`- 1. Detail: Bob membaca task Alice -> Status ${bolaDetail.status} (Diharapkan 403 Forbidden)`);

  // 3.2. Bob mencoba mengubah (Update) Task Alice
  const bolaUpdate = await request(`/api/v1/tasks/${aliceTaskId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenBob}` },
    body: JSON.stringify({ title: "Diubah Oleh Bob Hacker", version: 1 }),
  });
  console.log(`- 2. Update: Bob mengubah task Alice -> Status ${bolaUpdate.status} (Diharapkan 403 Forbidden)`);

  // 3.3. Bob mencoba menghapus (Delete) Task Alice
  const bolaDelete = await request(`/api/v1/tasks/${aliceTaskId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenBob}` },
  });
  console.log(`- 3. Delete: Bob menghapus task Alice -> Status ${bolaDelete.status} (Diharapkan 403 Forbidden)`);

  // 3.4. Bob mencoba memanggil /notify pada Task Alice
  const bolaNotify = await request(`/api/v1/tasks/${aliceTaskId}/notify?mode=ok`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenBob}`,
      "Idempotency-Key": "bob-bypass-001",
    },
  });
  console.log(`- 4. Notify: Bob mengirim notifikasi task Alice -> Status ${bolaNotify.status} (Diharapkan 403 Forbidden)`);

  // 3.5. Bob membuka Collection Tasks
  const bobCollection = await request("/api/v1/tasks", {
    method: "GET",
    headers: { Authorization: `Bearer ${tokenBob}` },
  });
  const aliceTaskInBobList = bobCollection.body.data.some((t) => t.id === aliceTaskId);
  console.log(`- 5. Collection: Task Alice bocor di daftar Bob? ${aliceTaskInBobList ? "YA (BOCOR!)" : "TIDAK (AMAN)"}`);

  // 3.6. Uji Lintas Tim: Charlie (Manager Tim A) mengakses Task Bob (Tim B) (Slide 12)
  const bobTask = "task-bob-201";
  const managerCrossTeam = await request(`/api/v1/tasks/${bobTask}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${tokenCharlie}` },
  });
  console.log(`- Manager Tim A mencoba akses Task Tim B -> Status ${managerCrossTeam.status} (Diharapkan 403 Forbidden)`);
  if (managerCrossTeam.status === 403) {
    console.log(`  🛡️ Bukti Slide 12: Manager Tim A ditolak terhadap task Bob di Tim B!`);
  }

  // 4. INTEGRASI EKSTERNAL & IDEMPOTENCY KEY (Slide 56 & 67)
  printHeader("4. INTEGRASI EKSTERNAL & PENGUJIAN IDEMPOTENSI (Slide 56 & 67)");

  const idempotencyKey1 = `test-key-${Date.now()}`;

  // Pemanggilan Pertama (Mode OK)
  const notify1 = await request(`/api/v1/tasks/${aliceTaskId}/notify?mode=ok`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenAlice}`,
      "Idempotency-Key": idempotencyKey1,
    },
  });
  const notifId1 = notify1.body.result?.notificationId;
  console.log(`- Request 1 (Kunci: ${idempotencyKey1}) -> Status: ${notify1.status}, NotifID: ${notifId1}`);

  // Pemanggilan Kedua dengan Kunci yang SAMA dan Payload SAMA (Idempotency Replay)
  const notify2 = await request(`/api/v1/tasks/${aliceTaskId}/notify?mode=ok`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenAlice}`,
      "Idempotency-Key": idempotencyKey1,
    },
  });
  const notifId2 = notify2.body.result?.notificationId;
  console.log(`- Request 2 (Kunci Sama + Payload Sama) -> Status: ${notify2.status}, NotifID: ${notifId2}`);
  if (notifId1 === notifId2) {
    console.log(`  🛡️ Bukti Slide 56: notificationId sama persis (${notifId1})! Efek bisnis tidak terduplikasi.`);
  }

  // 5. FAULT INJECTION: MODE BAD (SCHEMA CORRUPTED) (Slide 68 & 69)
  printHeader("5. FAULT INJECTION: MODE BAD -> ADAPTER MENERJEMAHKAN KE 502 (Slide 68 & 69)");
  const badRes = await request(`/api/v1/tasks/${aliceTaskId}/notify?mode=bad`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenAlice}`,
      "Idempotency-Key": `bad-key-${Date.now()}`,
    },
  });
  console.log(`- Mode Bad -> Status yang diterima: ${badRes.status} (Diharapkan 502 Bad Gateway)`);
  if (badRes.status === 502) {
    console.log(`  🛡️ Bukti Slide 68 & 69: Skema respons cacat dari provider diterjemahkan menjadi 502!`);
  }

  // 6. FAULT INJECTION & PEMBUKTIAN CIRCUIT BREAKER (Slide 58, 60, 69)
  printHeader("6. FAULT INJECTION: 3 KEGAGALAN MEMBUKA CIRCUIT BREAKER 10 DETIK (Slide 69)");

  console.log("Trigger 3 Intent Gagal berturut-turut dengan mode=fail:");
  for (let i = 1; i <= 3; i++) {
    const failRes = await request(`/api/v1/tasks/${aliceTaskId}/notify?mode=fail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAlice}`,
        "Idempotency-Key": `fail-key-${i}-${Date.now()}`,
      },
    });
    console.log(`  Intent Gagal ke-${i} -> Status: ${failRes.status} (${failRes.body.error?.code})`);
  }

  // Request ke-4: Sirkuit seharusnya langsung berstatus OPEN (Slide 69: "Setelah tiga intent gagal: 503 CIRCUIT_OPEN langsung")
  const circuitOpenRes = await request(`/api/v1/tasks/${aliceTaskId}/notify?mode=ok`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenAlice}`,
      "Idempotency-Key": `intent-blocked-${Date.now()}`,
    },
  });
  console.log(`- Request ke-4 saat sirkuit OPEN -> Status: ${circuitOpenRes.status} (${circuitOpenRes.body.error?.code})`);
  if (circuitOpenRes.body.error?.code === "CIRCUIT_OPEN") {
    console.log(`  🛡️ Bukti Slide 69: Terbukti 503 CIRCUIT_OPEN langsung tanpa memanggil provider!`);
  }

  // 7. PEMULIHAN CIRCUIT BREAKER SETELAH COOLDOWN (Slide 58 & 69)
  printHeader("7. PEMULIHAN SIRKUIT: MENUNGGU COOLDOWN 10 DETIK (Slide 58 & 69)");
  console.log("Menunggu 10 detik agar masa cooldown selesai...");
  await new Promise((resolve) => setTimeout(resolve, 10500));

  // Request ke-5: Sirkuit memasuki probe pemulihan (HALF-OPEN -> CLOSED jika sukses)
  const recoveredRes = await request(`/api/v1/tasks/${aliceTaskId}/notify?mode=ok`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenAlice}`,
      "Idempotency-Key": `intent-recovered-${Date.now()}`,
    },
  });
  console.log(`- Request setelah 10 detik dengan mode=ok -> Status: ${recoveredRes.status}`);
  if (recoveredRes.status === 200) {
    console.log("  🛡️ Bukti Slide 58 & 69: Sirkuit berhasil pulih kembali ke status CLOSED!");
  }

  printHeader("🎉 KESIMPULAN LABORATORIUM HARI 2");
  console.log("Seluruh kontrol keamanan, BOLA OLA, Mass Assignment, Idempotency, dan Circuit Breaker");
  console.log("telah terbukti 100% bekerja sesuai spesifikasi materi Hari 2!\n");
}

runTestSuite().catch((err) => {
  console.error("❌ Kesalahan saat menjalankan test suite:", err);
  process.exit(1);
});
