// ==============================================================================
// BERKAS: src/routes/taskRoutes.js
// TUJUAN: Rute CRUD tugas, pengujian BOLA, proteksi Mass Assignment, integrasi eksternal /notify,
//         dan enkripsi rahasia tingkat record (AES-256-GCM).
// RUJUKAN SLIDE:
//   - Slide 12: Uji BOLA (5 operasi: Detail, Update, Delete, Notify, Collection).
//   - Slide 13: List dan pencarian ikut bocor jika tidak difilter (Filter izin & totalItems).
//   - Slide 14: Policy can_access dipakai di semua endpoint lab.
//   - Slide 17: Parameter binding dengan SQLite.
//   - Slide 18: Sort allowlist mapping.
//   - Slide 20 & 21: Mass assignment & Payload yang harus ditolak.
//   - Slide 38 - 41: Enkripsi AES-256-GCM dan metadata record.
//   - Slide 67: Lab panggil notify lewat TaskHub: POST /api/v1/tasks/:id/notify?mode=ok.
// ==============================================================================

import { Router } from "express";
import { randomUUID, randomBytes } from "node:crypto";
import { db, findTaskById, updateTaskWithVersion, deleteTaskById, saveTaskSecret, findTaskSecretByTaskId } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { authorizeTaskAccess, buildTaskAccessFilter } from "../middleware/policy.js";
import { createTaskSchema, updateTaskSchema, serializeTask } from "../schemas/taskSchemas.js";
import { notificationAdapter } from "../services/notificationAdapter.js";
import { encryptAesGcm, decryptAesGcm } from "../services/cryptoService.js";

const router = Router();

// Kunci enkripsi AES-256 master untuk data tugas di lab (Slide 41 & 43: Key Management)
// Di lingkungan produksi, kunci ini disimpan di AWS KMS, Google Cloud KMS, atau HashiCorp Vault.
const LAB_ENCRYPTION_KEY = Buffer.from("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "hex");

// ==============================================================================
// 1. GET /api/v1/tasks - COLLECTION & SEARCH DENGAN FILTER IZIN (Slide 13)
// ==============================================================================
router.get("/", requireAuth, (req, res, next) => {
  try {
    // 1. Membangun filter SQL berdasarkan wewenang user (Slide 13: Scope tepercaya & Filter izin)
    const { whereClause, params } = buildTaskAccessFilter(req.user);

    // 2. Menangani parameter pencarian teks (Slide 13: "Pencarian ikut bocor jika tidak difilter")
    const searchQuery = (req.query.q || "").toString().trim();
    const queryParams = [...params];
    let fullWhereClause = whereClause;

    if (searchQuery) {
      fullWhereClause += " AND (title LIKE ? OR description LIKE ?)";
      queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    // 3. Mengamankan Sort Key melalui Allowlist (Slide 18: "Map sort key publik ke kolom internal melalui allowlist")
    const allowedSortFields = {
      created_at: "created_at",
      updated_at: "updated_at",
      title: "title",
      version: "version",
    };
    const requestedSort = (req.query.sort || "created_at").toString().toLowerCase();
    const sortColumn = allowedSortFields[requestedSort] || "created_at";

    const sortOrder = req.query.order?.toString().toUpperCase() === "ASC" ? "ASC" : "DESC";

    // 4. Pagination (Limit & Offset)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    // 5. Menghitung meta.totalItems yang HANYA menghitung data berhak (Slide 13)
    const countSql = `SELECT COUNT(*) AS total FROM tasks WHERE ${fullWhereClause}`;
    const totalRow = db.prepare(countSql).get(...queryParams);
    const totalItems = totalRow?.total || 0;

    // 6. Mengambil data item dengan limit & offset
    const selectSql = `
      SELECT * FROM tasks
      WHERE ${fullWhereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(selectSql).all(...queryParams, limit, offset);

    // 7. Menyaring output menggunakan serializer (Slide 20: Output Serializer)
    const sanitizedData = rows.map(serializeTask);

    return res.status(200).json({
      success: true,
      data: sanitizedData,
      meta: {
        page,
        limit,
        totalItems, // Slide 13: "meta.totalItems hanya menghitung data yang boleh diakses"
        totalPages: Math.ceil(totalItems / limit) || 1,
        activeFilter: {
          role: req.user.role,
          scopedTeam: req.user.role === "manager" ? req.user.team_id : null,
          scopedTenant: req.user.tenant_id,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 2. POST /api/v1/tasks - PEMBUATAN TASK (MASS ASSIGNMENT PROTECTION) (Slide 20 & 21)
// ==============================================================================
router.post("/", requireAuth, (req, res, next) => {
  try {
    // 1. Validasi body menggunakan skema Zod dengan .strict()
    // Menolak keras jika client menyisipkan field internal seperti `role`, `owner_id`, atau `is_admin` (Slide 21)
    const validatedData = createTaskSchema.parse(req.body);

    // 2. Server menetapkan atribut otoritas secara internal, BUKAN dari input client (Slide 20)
    // "owner_id, role, dan is_admin tetap kewenangan server"
    const newTaskId = `task-${randomUUID().slice(0, 8)}`;
    const ownerId = req.user.id;
    const teamId = req.user.team_id;
    const tenantId = req.user.tenant_id;
    const now = new Date().toISOString();

    // 3. Menyimpan ke database dengan Parameter Binding (Slide 17)
    const stmt = db.prepare(`
      INSERT INTO tasks (id, title, description, status, version, owner_id, team_id, tenant_id, created_at, updated_at)
      VALUES (?, ?, ?, 'open', 1, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newTaskId,
      validatedData.title,
      validatedData.description || "",
      ownerId,
      teamId,
      tenantId,
      now,
      now
    );

    // 4. Mengambil data yang baru dibuat dan menyaringnya melalui Serializer (Slide 20)
    const createdTask = findTaskById(newTaskId);
    return res.status(201).json({
      success: true,
      data: serializeTask(createdTask),
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 3. GET /api/v1/tasks/:id - DETAIL TASK (PROTEKSI BOLA / IDOR) (Slide 12 & 14)
// ==============================================================================
router.get("/:id", requireAuth, authorizeTaskAccess("membaca detail"), (req, res) => {
  // Objek task sudah divalidasi keabsahan hak aksesnya oleh middleware `authorizeTaskAccess`
  return res.status(200).json({
    success: true,
    data: serializeTask(req.task),
  });
});

// ==============================================================================
// 4. PATCH /api/v1/tasks/:id - UPDATE TASK DENGAN OPTIMISTIC LOCKING (Slide 14 & 21)
// ==============================================================================
router.patch("/:id", requireAuth, authorizeTaskAccess("mengubah"), (req, res, next) => {
  try {
    // 1. Validasi skema input (Slide 21)
    const validatedData = updateTaskSchema.parse(req.body);

    // 2. Menyiapkan nilai pembaruan
    const updates = {
      title: validatedData.title !== undefined ? validatedData.title : req.task.title,
      description: validatedData.description !== undefined ? validatedData.description : req.task.description,
      status: validatedData.status !== undefined ? validatedData.status : req.task.status,
    };

    // 3. Melakukan pembaruan dengan memeriksa version untuk mencegah lost update (Slide 21)
    const isUpdated = updateTaskWithVersion(req.task.id, validatedData.version, updates);

    if (!isUpdated) {
      // Version yang dikirim oleh client tidak sesuai dengan version di database saat ini (Konflik Konkurensi)
      return res.status(409).json({
        error: {
          code: "CONCURRENCY_CONFLICT",
          message: `Gagal memperbarui: Versi tugas telah berubah (Optimistic Lock). Versi Anda: ${validatedData.version}, versi terkini: ${req.task.version}. Silakan refresh data.`,
          current_version: req.task.version,
          request_id: req.requestId || "unknown",
        },
      });
    }

    // 4. Mengembalikan data terbaru
    const updatedTask = findTaskById(req.task.id);
    return res.status(200).json({
      success: true,
      data: serializeTask(updatedTask),
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 5. DELETE /api/v1/tasks/:id - HAPUS TASK (PROTEKSI BOLA / IDOR) (Slide 12 & 14)
// ==============================================================================
router.delete("/:id", requireAuth, authorizeTaskAccess("menghapus"), (req, res, next) => {
  try {
    deleteTaskById(req.task.id);
    // Mengembalikan status 204 No Content untuk penghapusan sukses
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 6. POST /api/v1/tasks/:id/notify - INTEGRASI PROVIDER EKSTERNAL (Slide 14, 50, 67)
// ==============================================================================
router.post("/:id/notify", requireAuth, authorizeTaskAccess("mengirim notifikasi"), async (req, res, next) => {
  try {
    // 1. Memeriksa keberadaan header Idempotency-Key (Slide 56 & 67)
    // Sesuai Slide 67: -H "Idempotency-Key: notify-demo-001"
    const idempotencyKey = req.header("Idempotency-Key") || req.header("idempotency-key");

    if (!idempotencyKey) {
      return res.status(400).json({
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "Header 'Idempotency-Key' wajib disertakan pada pemanggilan operasi notifikasi.",
          request_id: req.requestId || "unknown",
        },
      });
    }

    // 2. Mengambil mode lab kegagalan (?mode=ok|busy|fail|slow|bad) (Slide 67 & 68)
    const mode = (req.query.mode || req.header("x-mock-mode") || "ok").toString().toLowerCase();

    // 3. Memanggil NotificationProvider melalui Adapter internal (Slide 49 & 50)
    // Sesuai Slide 50: Client -> TaskHub (port 8000) -> Adapter -> Provider Mock (port 8001)
    const result = await notificationAdapter.send(
      req.task.id,
      req.task.title,
      idempotencyKey,
      mode
    );

    // 4. Mengembalikan respons terkontrol TaskHub ke client (Slide 50)
    return res.status(200).json({
      success: true,
      message: "Notifikasi tugas berhasil dikirimkan ke provider eksternal.",
      task_id: req.task.id,
      idempotency_key: idempotencyKey,
      result: result.providerResponse,
      attempts_used: result.attemptsUsed,
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 7. POST /api/v1/tasks/:id/encrypt-secret - ENKRIPSI RECORD AES-256-GCM (Slide 38 - 41)
// ==============================================================================
router.post("/:id/encrypt-secret", requireAuth, authorizeTaskAccess("mengenkripsi rahasia"), (req, res, next) => {
  try {
    const { secretText } = req.body || {};
    if (!secretText || typeof secretText !== "string") {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Field 'secretText' berupa string wajib diisi untuk dienkripsi.",
          request_id: req.requestId || "unknown",
        },
      });
    }

    // 1. Membentuk AAD (Additional Authenticated Data) untuk mengikat konteks tenant & task (Slide 38 & 41)
    const aad = `taskhub:${req.task.tenant_id}:${req.task.id}:v1`;

    // 2. Menjalankan enkripsi terotentikasi AES-256-GCM
    const encrypted = encryptAesGcm(secretText, LAB_ENCRYPTION_KEY, aad);

    // 3. Menyimpan metadata enkripsi ke database tabel `task_secrets` (Slide 41)
    // "Bersama record: Nonce, ciphertext, metadata algoritme, dan key ID. AAD diautentikasi."
    const secretId = `sec-${randomUUID().slice(0, 8)}`;
    saveTaskSecret({
      id: secretId,
      task_id: req.task.id,
      ciphertext: encrypted.ciphertextHex,
      nonce: encrypted.nonceHex,
      auth_tag: encrypted.authTagHex,
      aad: encrypted.aadString,
      key_id: "lab-key-v1",
      algorithm: encrypted.algorithm,
    });

    return res.status(201).json({
      success: true,
      message: "Data rahasia berhasil dienkripsi dengan AES-256-GCM dan disimpan bersama metadata.",
      secret_id: secretId,
      metadata: {
        task_id: req.task.id,
        algorithm: encrypted.algorithm,
        nonce_hex: encrypted.nonceHex,
        auth_tag_hex: encrypted.authTagHex,
        aad: encrypted.aadString,
        key_id: "lab-key-v1",
        ciphertext_preview: `${encrypted.ciphertextHex.slice(0, 16)}...`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 8. GET /api/v1/tasks/:id/decrypt-secret - DEKRIPSI & UJI MODIFIKASI (Slide 39 & 40)
// ==============================================================================
router.get("/:id/decrypt-secret", requireAuth, authorizeTaskAccess("mendekripsi rahasia"), (req, res, next) => {
  try {
    const record = findTaskSecretByTaskId(req.task.id);
    if (!record) {
      return res.status(404).json({
        error: {
          code: "SECRET_NOT_FOUND",
          message: "Tidak ditemukan catatan terenkripsi untuk tugas ini.",
          request_id: req.requestId || "unknown",
        },
      });
    }

    // Opsi untuk mensimulasikan pemalsuan data (tampering) 1 bit (Slide 40)
    let ciphertextToDecrypt = record.ciphertext;
    const shouldTamper = req.query.tamper === "true";

    if (shouldTamper) {
      const buffer = Buffer.from(ciphertextToDecrypt, "hex");
      buffer[buffer.length - 1] ^= 1; // Membalik 1 bit data (Slide 40)
      ciphertextToDecrypt = buffer.toString("hex");
    }

    // Melakukan dekripsi dan verifikasi authentication tag (Slide 39 & 40)
    const decryptedPlaintext = decryptAesGcm(
      ciphertextToDecrypt,
      LAB_ENCRYPTION_KEY,
      record.nonce,
      record.auth_tag,
      record.aad
    );

    return res.status(200).json({
      success: true,
      decrypted_plaintext: decryptedPlaintext,
      metadata: {
        task_id: req.task.id,
        aad: record.aad,
        algorithm: record.algorithm,
        is_tampered: shouldTamper,
      },
    });
  } catch (err) {
    // Sesuai Slide 40: Jika ciphertext dirusak, dekripsi gagal verifikasi integritas
    return res.status(400).json({
      error: {
        code: "CRYPTO_AUTHENTICATION_FAILED",
        message: "Kegagalan otentikasi data kriptografi: Ciphertext atau AAD telah dimodifikasi (Tampering terdeteksi)!",
        details: err.message,
        request_id: req.requestId || "unknown",
      },
    });
  }
});

export default router;
