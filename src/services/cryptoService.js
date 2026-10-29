// ==============================================================================
// BERKAS: src/services/cryptoService.js
// TUJUAN: Layanan kriptografi lengkap menggunakan modul bawaan Node.js (node:crypto).
// RUJUKAN SLIDE:
//   - Slide 33 (Perbedaan Encoding, Hashing, Enkripsi, dan Signature)
//   - Slide 34 & 35 (scrypt untuk kata sandi, SHA-256 untuk opaque token)
//   - Slide 37, 38, 39, 40 (AES-256-GCM authenticated encryption & deteksi modifikasi/tamper)
//   - Slide 41 (Struktur penyimpanan metadata kriptografi: Nonce, AAD, Tag, Ciphertext)
// ==============================================================================

// Mengimpor fungsi-fungsi kriptografi standar dari pustaka inti Node.js
import {
  randomBytes,       // Menghasilkan byte acak kriptografis (CSPRNG)
  scryptSync,        // Algoritme Key Derivation Function (KDF) adaptif berbasis memori untuk password
  timingSafeEqual,   // Komparasi buffer tahan serangan timing attack
  createHash,        // Penghasil hash cepat (SHA-256)
  createHmac,        // Penghasil Keyed-Hash Message Authentication Code (HMAC)
  createCipheriv,    // Membuat cipher enkripsi dengan Initialization Vector / Nonce
  createDecipheriv,  // Membuat decipher dekripsi
} from "node:crypto";

// ==============================================================================
// 1. ADAPTIVE PASSWORD HASHING DENGAN SCRYPT (Slide 34 & 35)
// ==============================================================================

/**
 * Melakukan hashing kata sandi pengguna menggunakan scrypt dengan Salt unik.
 * Mengapa scrypt? Sesuai Slide 35: Kata sandi manusia mudah ditebak, sehingga membutuhkan
 * fungsi hash lambat (memory-hard) untuk menahan serangan brute-force / GPU ASIC.
 * JANGAN PERNAH menggunakan MD5 atau SHA-256 murni untuk password!
 *
 * @param {string} password - Kata sandi teks murni (plaintext)
 * @returns {string} String format gabungan: "salt:derivedKeyHex"
 */
export function hashPassword(password) {
  // 1. Menghasilkan Salt acak 16-byte dengan entropi tinggi
  const salt = randomBytes(16).toString("hex");

  // 2. Menjalankan scrypt untuk menghasilkan kunci turunan sepanjang 64 byte
  // Parameter scrypt standar: N=16384, r=8, p=1 (tahan komputasi paralel kartu grafis)
  const derivedKey = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });

  // 3. Menggabungkan salt dan hash dengan delimiter titik dua ':' untuk disimpan di database
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Memverifikasi apakah kata sandi yang dimasukkan cocok dengan hash yang tersimpan.
 *
 * @param {string} password - Kata sandi yang dicoba oleh pengguna saat login
 * @param {string} storedHash - String salt dan hash yang diambil dari tabel database
 * @returns {boolean} true jika cocok, false jika tidak cocok
 */
export function verifyPassword(password, storedHash) {
  // 1. Memisahkan salt dan kunci turunan yang tersimpan
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;

  // 2. Mengubah kunci yang tersimpan menjadi Buffer
  const keyBuffer = Buffer.from(key, "hex");

  // 3. Menghitung ulang hash menggunakan kata sandi masukan dan salt yang sama
  const derivedKey = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });

  // 4. Membandingkan dengan timingSafeEqual agar waktu pencocokan selalu konstan (mencegah timing attack)
  return timingSafeEqual(keyBuffer, derivedKey);
}

// ==============================================================================
// 2. OPAQUE TOKEN HASHING DENGAN SHA-256 (Slide 34 & 35)
// ==============================================================================

/**
 * Menghasilkan token acak bertaraf kriptografis (Opaque Bearer Token).
 * Sesuai Slide 35: Token memiliki entropi acak yang sangat tinggi (256-bit).
 *
 * @returns {string} Token heksadesimal acak sepanjang 64 karakter (32 bytes)
 */
export function generateOpaqueToken() {
  // Menghasilkan 32 bytes acak berkekuatan tinggi
  return randomBytes(32).toString("hex");
}

/**
 * Menghitung hash SHA-256 dari opaque token untuk disimpan ke database.
 * Sesuai Slide 34: Token opaque disimpan dalam bentuk hash di database.
 * Jika database bocor, penyerang tidak dapat menggunakan hash SHA-256 untuk menyamar sebagai user,
 * karena token aslinya tidak dapat dibalik (one-way digest).
 *
 * @param {string} token - Token mentah yang dipegang oleh client
 * @returns {string} Hash SHA-256 berupa string hex
 */
export function hashOpaqueToken(token) {
  // Membuat digest satu arah SHA-256 dari string token
  return createHash("sha256").update(token).digest("hex");
}

// ==============================================================================
// 3. AUTHENTICATED ENCRYPTION DENGAN AES-256-GCM (Slide 37 - 41)
// ==============================================================================

/**
 * Mengenkripsi data sensitif menggunakan algoritme standar industri AES-256-GCM.
 * Menyediakan kerahasiaan (confidentiality) sekaligus integritas data (authenticity).
 *
 * Sesuai Slide 38:
 * - Algoritme: aes-256-gcm
 * - Kunci (Key): 32 bytes (256-bit)
 * - Nonce (Initialization Vector): 12 bytes unik per operasi enkripsi (JANGAN PERNAH REUSE!)
 * - AAD (Additional Authenticated Data): Konteks yang tidak dienkripsi tetapi diautentikasi (mengikat tenant/record)
 *
 * @param {string} plaintext - Teks rahasia yang ingin dienkripsi
 * @param {Buffer} key - Kunci enkripsi 32-byte (Data Encryption Key / DEK)
 * @param {string|Buffer} aad - Additional Authenticated Data (misal: "taskhub:tenant-A:record-123:v1")
 * @returns {object} Objek berisi ciphertext, nonce, authTag, dan aad (dalam hex/string)
 */
export function encryptAesGcm(plaintext, key, aad) {
  // 1. Memvalidasi panjang kunci enkripsi (wajib tepat 32 bytes untuk AES-256)
  if (key.length !== 32) {
    throw new Error("Panjang kunci AES-256 harus tepat 32 bytes!");
  }

  // 2. Menghasilkan Nonce acak unik 12-byte (Slide 37: "Nonce unik per key. Jangan reuse nonce!")
  const nonce = randomBytes(12);

  // 3. Mengubah AAD menjadi Buffer jika berupa string
  const aadBuffer = Buffer.isBuffer(aad) ? aad : Buffer.from(String(aad), "utf8");

  // 4. Menginisialisasi cipher AES-256-GCM
  const cipher = createCipheriv("aes-256-gcm", key, nonce);

  // 5. Menetapkan Additional Authenticated Data (AAD) (Slide 38: cipher.setAAD(aad))
  cipher.setAAD(aadBuffer);

  // 6. Mengenkripsi plaintext menjadi ciphertext (Slide 39)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  // 7. Mengambil Authentication Tag (16 bytes) yang menjamin pesan tidak dimanipulasi
  const authTag = cipher.getAuthTag();

  // 8. Mengembalikan artefak lengkap yang perlu disimpan bersama record (Slide 41)
  return {
    ciphertextHex: ciphertext.toString("hex"),
    nonceHex: nonce.toString("hex"),
    authTagHex: authTag.toString("hex"),
    aadString: aadBuffer.toString("utf8"),
    algorithm: "aes-256-gcm",
  };
}

/**
 * Mendekripsi data terenkripsi AES-256-GCM dan memverifikasi integritas tag otentikasi.
 * Jika ciphertext atau AAD telah diubah bahkan 1 bit saja, dekripsi akan GAGAL dan melempar eksepsi!
 *
 * Sesuai Slide 39 & 40:
 * - decipher.setAAD(aad)
 * - decipher.setAuthTag(authTag)
 * - Buffer.concat([decipher.update(ciphertext), decipher.final()])
 *
 * @param {string} ciphertextHex - Ciphertext dalam format string hex
 * @param {Buffer} key - Kunci dekripsi 32-byte yang sama
 * @param {string} nonceHex - Nonce 12-byte dalam format hex
 * @param {string} authTagHex - Authentication tag 16-byte dalam format hex
 * @param {string} aadString - AAD yang diharapkan
 * @returns {string} Plaintext hasil dekripsi jika verifikasi integritas valid
 */
export function decryptAesGcm(ciphertextHex, key, nonceHex, authTagHex, aadString) {
  // 1. Mengubah parameter hex menjadi Buffer biner
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const nonce = Buffer.from(nonceHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const aad = Buffer.from(aadString, "utf8");

  // 2. Menginisialisasi decipher AES-256-GCM dengan key dan nonce asli
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);

  // 3. Menetapkan AAD yang harus cocok persis dengan saat enkripsi
  decipher.setAAD(aad);

  // 4. Menetapkan Authentication Tag yang akan diverifikasi oleh perangkat keras/kripto
  decipher.setAuthTag(authTag);

  // 5. Melakukan dekripsi. Jika data dimodifikasi (tampered), decipher.final() akan THROW ERROR!
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  // 6. Mengembalikan teks asli yang sudah terbukti asli dan belum dimodifikasi
  return plaintext;
}

// ==============================================================================
// 4. HMAC SIGNATURE (Slide 33 & 34)
// ==============================================================================

/**
 * Menghitung signature HMAC-SHA256 untuk menjamin integritas dan keaslian payload webhook.
 * Sesuai Slide 33: "Signature/MAC: Integritas dan asal, tidak menyembunyikan isi."
 *
 * @param {string} payloadString - String body yang akan dikirim
 * @param {string} secret - Kunci rahasia bersama (Shared Secret)
 * @returns {string} Signature hex
 */
export function signHmacSha256(payloadString, secret) {
  return createHmac("sha256", secret).update(payloadString).digest("hex");
}
