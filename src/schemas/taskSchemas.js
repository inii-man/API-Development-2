// ==============================================================================
// BERKAS: src/schemas/taskSchemas.js
// TUJUAN: Validasi skema input (Zod) dan pencegahan celah keamanan Mass Assignment.
// RUJUKAN SLIDE:
//   - Slide 20: Mass assignment: field internal tidak boleh ditulis client.
//               Request allowlist vs Output serializer.
//   - Slide 21: Kasus lab: payload yang harus ditolak (role, owner_id, is_admin, dll).
//   - Slide 22: Urutan kontrol input: Ukuran (413), Content-Type (415), Parse (400), Schema (422).
// ==============================================================================

import { z } from "zod";

// ==============================================================================
// 1. REQUEST ALLOWLIST SCHEMAS (Slide 20 & 21)
// ==============================================================================

/**
 * Skema pembuatan task baru (POST /api/v1/tasks).
 * Menggunakan `.strict()` untuk MENOLAK keras jika client mencoba menyelipkan
 * field internal terlarang seperti `owner_id`, `role`, `is_admin`, atau `team_id`!
 */
export const createTaskSchema = z
  .object({
    // Judul tugas: Wajib string, minimal 1 karakter, maksimal 100 karakter (Slide 21)
    title: z
      .string({ required_error: "Field 'title' wajib diisi berupa string" })
      .trim()
      .min(1, "Judul tugas tidak boleh kosong")
      .max(100, "Judul tugas tidak boleh melebihi 100 karakter"),

    // Deskripsi tugas: Opsional, maksimal 500 karakter
    description: z
      .string()
      .trim()
      .max(500, "Deskripsi tidak boleh melebihi 500 karakter")
      .optional()
      .default(""),
  })
  // .strict() memastikan jika ada properti tak dikenal (seperti role / is_admin),
  // Zod akan melempar error validasi (Slide 20 & 21: Mass Assignment Prevention)
  .strict({
    message: "Payload mengandung field internal yang tidak diizinkan untuk ditulis oleh client (Mass Assignment terdeteksi)!",
  });

/**
 * Skema pembaruan task (PATCH /api/v1/tasks/:id).
 * Memeriksa `version` sebagai integer untuk Optimistic Concurrency Control (Slide 21).
 */
export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    status: z.enum(["open", "done"], {
      errorMap: () => ({ message: "Status tidak sah: nilai yang diizinkan hanya 'open' atau 'done'" }),
    }).optional(),

    // Slide 21: "version bukan integer -> Tipe salah"
    version: z
      .number({ required_error: "Field 'version' wajib disertakan untuk optimistic locking" })
      .int("Version harus berupa bilangan bulat (integer)"),
  })
  .strict({
    message: "Field pembaruan tidak diizinkan. Jangan menyelipkan field internal!",
  });

/**
 * Skema login pengguna
 */
export const loginSchema = z
  .object({
    username: z.string().trim().min(1, "Username wajib diisi"),
    password: z.string().min(1, "Password wajib diisi"),
  })
  .strict();

// ==============================================================================
// 2. OUTPUT SERIALIZER (Slide 20)
// ==============================================================================

/**
 * Output Serializer untuk menyaring data yang dikirim kembali ke client.
 * Memastikan kolom internal / sensitif basis data tidak bocor keluar (Slide 20).
 *
 * @param {object} taskRecord - Baris record mentah dari tabel tasks
 * @returns {object} Objek publik yang aman dilihat client
 */
export function serializeTask(taskRecord) {
  if (!taskRecord) return null;

  return {
    id: taskRecord.id,
    title: taskRecord.title,
    description: taskRecord.description || "",
    status: taskRecord.status,
    version: taskRecord.version,
    owner_id: taskRecord.owner_id,
    team_id: taskRecord.team_id,
    tenant_id: taskRecord.tenant_id,
    created_at: taskRecord.created_at,
    updated_at: taskRecord.updated_at,
  };
}

/**
 * Serializer untuk profil pengguna
 */
export function serializeUser(userRecord) {
  if (!userRecord) return null;

  return {
    id: userRecord.id,
    username: userRecord.username,
    email: userRecord.email,
    role: userRecord.role,
    team_id: userRecord.team_id,
    tenant_id: userRecord.tenant_id,
  };
}
