// ==============================================================================
// BERKAS: scripts/aes_gcm_demo.js
// TUJUAN: Mendemonstrasikan enkripsi terotentikasi (Authenticated Encryption) AES-256-GCM,
//         verifikasi integritas AAD, dan pembuktian bahwa manipulasi data (tampering) 1 bit
//         akan langsung ditolak secara kriptografis oleh auth tag.
// RUJUKAN SLIDE:
//   - Slide 38: Kode: AES-GCM round-trip dan deteksi modifikasi (1/2)
//   - Slide 39: Kode: AES-GCM round-trip dan deteksi modifikasi (2/2)
//   - Slide 40: Kode: modifikasi ciphertext harus ditolak
// CARA MENJALANKAN: node scripts/aes_gcm_demo.js  ATAU  npm run crypto-demo
// ==============================================================================

// Mengimpor primitif kriptografi dari modul bawaan node:crypto (Node.js 20+)
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

console.log("================================================================================");
console.log("🔐 LAB HARI 2: DEMONSTRASI AES-256-GCM ROUND-TRIP & TAMPER DETECTION");
console.log("================================================================================\n");

// 1. Menghasilkan kunci acak baru tiap run (Slide 38: "Key baru tiap run, bukan storage persisten")
const key = randomBytes(32); // 256-bit Key
console.log("1. [KEY GENERATION] Kunci 32-byte (256-bit) berhasil dibangkitkan:");
console.log(`   DEK (Data Encryption Key): ${key.toString("hex")}\n`);

// 2. Menghasilkan Nonce acak 12-byte unik (Slide 37: "Nonce unik per key. Jangan reuse nonce!")
const nonce = randomBytes(12);
console.log("2. [NONCE GENERATION] Nonce/IV 12-byte unik:");
console.log(`   Nonce: ${nonce.toString("hex")}\n`);

// 3. Menyiapkan AAD (Additional Authenticated Data) untuk mengikat konteks tenant & record (Slide 38 & 41)
const aad = Buffer.from("taskhub:tenant-A:record-123:v1");
console.log("3. [AAD SETUP] Additional Authenticated Data (konteks terikat tanpa dienkripsi):");
console.log(`   AAD: "${aad.toString("utf8")}"\n`);

// 4. Inisialisasi Cipher AES-256-GCM dan set AAD (Slide 38)
const cipher = createCipheriv("aes-256-gcm", key, nonce);
cipher.setAAD(aad);

// 5. Enkripsi Plaintext menjadi Ciphertext (Slide 39)
const plaintext = "data sensitif transaksi pelanggan #9872";
const ciphertext = Buffer.concat([
  cipher.update(plaintext, "utf8"),
  cipher.final(),
]);
console.log("4. [ENCRYPTION] Data berhasil dienkripsi:");
console.log(`   Plaintext Asli : "${plaintext}"`);
console.log(`   Ciphertext Hex : ${ciphertext.toString("hex")}\n`);

// 6. Mengambil Authentication Tag (16 bytes) (Slide 39)
const authTag = cipher.getAuthTag();
console.log("5. [AUTH TAG] Authentication Tag 16-byte (Integritas GMAC):");
console.log(`   AuthTag Hex    : ${authTag.toString("hex")}\n`);

// 7. Dekripsi Round-Trip Normal (Slide 39)
console.log("6. [ROUND-TRIP DECRYPTION] Mendekripsi ciphertext yang valid...");
const decipher = createDecipheriv("aes-256-gcm", key, nonce);
decipher.setAAD(aad);
decipher.setAuthTag(authTag);

const plain = Buffer.concat([
  decipher.update(ciphertext),
  decipher.final(),
]).toString("utf8");

console.log(`   Hasil Dekripsi : "${plain}"`);
if (plain === plaintext) {
  console.log("   ✅ Status: Plaintext cocok 100% dengan teks asli!\n");
} else {
  throw new Error("❌ Plaintext tidak cocok!");
}

// 8. Uji Modifikasi / Tampering (Slide 40)
console.log("7. [TAMPER TEST] Mencoba memanipulasi (tamper) 1 bit pada ciphertext...");
const changed = Buffer.from(ciphertext);

// Melakukan operasi bitwise XOR pada byte terakhir untuk membalik 1 bit data (Slide 40)
changed[changed.length - 1] ^= 1;
console.log(`   Ciphertext Asli    : ...${ciphertext.slice(-8).toString("hex")}`);
console.log(`   Ciphertext Dirusak : ...${changed.slice(-8).toString("hex")}`);

const d = createDecipheriv("aes-256-gcm", key, nonce);
d.setAAD(aad);
d.setAuthTag(authTag);

let rejected = false;
let errorMessage = "";

try {
  // Upaya mendekripsi data yang telah diubah
  Buffer.concat([d.update(changed), d.final()]);
} catch (err) {
  // Mesin kripto mendeteksi bahwa authTag tidak cocok dengan ciphertext yang dimanipulasi!
  rejected = true;
  errorMessage = err.message;
}

if (!rejected) {
  throw new Error("❌ GAGAL: Modifikasi seharusnya ditolak tetapi lolos!");
} else {
  console.log(`   ✅ BERHASIL DITOLAK! Sistem melempar eksepsi kripto:`);
  console.log(`      "${errorMessage}"`);
  console.log("   🛡️ Kesimpulan Slide 40: Ciphertext yang berubah TIDAK DITERIMA sebagai plaintext.");
}

console.log("\n================================================================================");
console.log("🎉 SELURUH SKENARIO LAB KRIPTOGRAFI HARI 2 TERBUKTI SUKSES!");
console.log("================================================================================");
