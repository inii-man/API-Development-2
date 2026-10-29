// ==============================================================================
// BERKAS: src/middleware/policy.js
// TUJUAN: Menegakkan kebijakan otorisasi level objek (Object Level Authorization - OLA)
//         dan mencegah celah BOLA (Broken Object Level Authorization) serta IDOR.
// RUJUKAN SLIDE:
//   - Slide 6: Threat modeling dan BOLA
//   - Slide 11: BOLA dan IDOR: akses objek yang tidak berhak. Token valid & UUID acak
//               bukan jaminan jika policy tidak diperiksa.
//   - Slide 12: Uji BOLA: 5 operasi, 1 hasil yang sama (Detail, update, delete, notify, collection).
//               Manager Tim A harus ditolak terhadap task Bob di Tim B!
//   - Slide 13: List & pencarian bocor jika tidak difilter: Buang item sebelum pagination & totalItems.
//   - Slide 14: Policy can_access dipakai di semua endpoint lab (Collection, Detail, PATCH, DELETE, Notify).
// ==============================================================================

import { findTaskById } from "../db.js";

/**
 * Fungsi murni (pure policy) untuk menentukan apakah pengguna memiliki izin terhadap objek Task.
 * Sesuai Slide 12, 13, 14:
 * 1. Batas Tenant: Pengguna tidak boleh mengakses tugas dari tenant lain.
 * 2. Admin: Memiliki akses penuh terhadap seluruh tugas di dalam tenant miliknya.
 * 3. Manager: Hanya berhak mengakses tugas milik anggota di tim yang sama (team_id).
 *    -> Manager Tim A DITOLAK terhadap tugas milik Bob di Tim B! (Slide 12)
 * 4. Member: Hanya berhak mengakses tugas miliknya sendiri (owner_id === user.id).
 *
 * @param {object} user - Identitas pengguna dari req.user { id, role, team_id, tenant_id }
 * @param {object} task - Objek tugas dari database { id, owner_id, team_id, tenant_id }
 * @returns {boolean} true jika diizinkan, false jika dilarang (BOLA terdeteksi)
 */
export function canAccessTask(user, task) {
  // 1. Validasi keberadaan entitas
  if (!user || !task) return false;

  // 2. Proteksi Isolasi Multi-Tenant (Slide 13)
  // Menolak mentah-mentah jika tenant_id tidak cocok, apa pun perannya
  if (user.tenant_id !== task.tenant_id) {
    return false;
  }

  // 3. Hak Akses Admin (Superuser dalam tenant yang bersangkutan)
  if (user.role === "admin") {
    return true;
  }

  // 4. Hak Akses Manager (Scope Tingkat Tim)
  // Sesuai Slide 12: "Manager tim A juga harus ditolak terhadap task bob tim B."
  if (user.role === "manager") {
    return user.team_id === task.team_id;
  }

  // 5. Hak Akses Member Biasa (Scope Kepemilikan Pribadi)
  // Sesuai Slide 11 & 12: Member hanya boleh membaca atau mengubah task miliknya sendiri
  if (user.role === "member") {
    return user.id === task.owner_id;
  }

  // Default aman: Tolak jika peran tidak dikenali (Least Privilege Principle)
  return false;
}

/**
 * Middleware Express untuk memverifikasi hak akses objek Task sebelum aksi dilakukan.
 * Diterapkan pada endpoint detail GET, PATCH, DELETE, dan POST /notify (Slide 14).
 *
 * @param {string} actionName - Nama aksi untuk kebutuhan logging/audit (misal: "baca", "ubah", "kirim_notif")
 */
export function authorizeTaskAccess(actionName = "akses") {
  return (req, res, next) => {
    // 1. Mengambil taskId dari parameter URL (:id)
    const taskId = req.params.id;

    if (!taskId) {
      return res.status(400).json({
        error: {
          code: "MISSING_TASK_ID",
          message: "Parameter ID tugas wajib disertakan pada path URL.",
          request_id: req.requestId || "unknown",
        },
      });
    }

    // 2. Mengambil data tugas dari database menggunakan prepared statement aman (Slide 17)
    const task = findTaskById(taskId);

    // 3. Jika task tidak ditemukan di database
    if (!task) {
      return res.status(404).json({
        error: {
          code: "TASK_NOT_FOUND",
          message: `Tugas dengan ID '${taskId}' tidak ditemukan.`,
          request_id: req.requestId || "unknown",
        },
      });
    }

    // 4. PENEGAKAN KEBIJAKAN can_access (Slide 11 & 14)
    // Memeriksa apakah user yang sedang login berhak atas task ini
    const isAllowed = canAccessTask(req.user, task);

    if (!isAllowed) {
      // Sesuai Slide 11 & 12: Penolakan BOLA / IDOR yang tegas dengan status HTTP 403 Forbidden!
      return res.status(403).json({
        error: {
          code: "BOLA_ACCESS_DENIED",
          message: `Akses ditolak: Anda (${req.user.username}, role: ${req.user.role}, team: ${req.user.team_id}) tidak memiliki wewenang untuk ${actionName} tugas '${task.id}' milik ${task.owner_id} (${task.team_id}).`,
          resource_id: task.id,
          request_id: req.requestId || "unknown",
        },
      });
    }

    // 5. Menyimpan objek tugas yang terverifikasi ke dalam req.task
    // Handler berikutnya tidak perlu query ulang ke database!
    req.task = task;

    // 6. Izin sah, lanjutkan eksekusi
    next();
  };
}

/**
 * Menghasilkan filter SQL WHERE yang aman untuk endpoint Collection / Pencarian (Slide 13).
 * Mencegah data pengguna/tim lain bocor pada list dan penghitungan totalItems!
 *
 * @param {object} user - User yang diautentikasi
 * @returns {{ whereClause: string, params: Array }}
 */
export function buildTaskAccessFilter(user) {
  const clauses = ["tenant_id = ?"];
  const params = [user.tenant_id];

  if (user.role === "admin") {
    // Admin melihat semua task di dalam tenant miliknya
  } else if (user.role === "manager") {
    // Manager hanya melihat task timnya sendiri (Slide 12 & 13)
    clauses.push("team_id = ?");
    params.push(user.team_id);
  } else {
    // Member biasa hanya melihat task yang ia buat sendiri
    clauses.push("owner_id = ?");
    params.push(user.id);
  }

  return {
    whereClause: clauses.join(" AND "),
    params,
  };
}
