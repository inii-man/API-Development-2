# 📋 Modul 07: Evaluasi, Threat Review & Analisis Gap Produksi
**Rujukan Slide: Slide 73 – 77**

Modul penutup ini merangkum **8 Kunci Evaluasi Hari 2**, menyediakan format baku **Lembar Threat Review**, serta membedah **Production Gap Analysis** (perbedaan antara implementasi kode praktikum laboratorium dengan kebutuhan arsitektur sistem berskala produksi penuh).

---

## 🔑 1. Delapan Kunci Evaluasi Hari 2 (Slide 74)

Seluruh peserta pelatihan diharapkan menguasai batas jaminan teknis dari masing-masing kontrol keamanan dan keandalan berikut:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    DELAPAN PRINSIP EVALUASI HARI 2 (Slide 74)                  │
├────┬────────────────────────────────────────────────────────────────────────────┤
│ 01 │ HTTPS / TLS tidak otomatis mengenkripsi database atau file backup.        │
│ 02 │ Kata sandi wajib di-hash adaptif (scrypt), bukan dienkripsi reversibel.   │
│ 03 │ HMAC menjaga integritas & keaslian asal data, bukan menyembunyikan isi.   │
│ 04 │ UUID acak BUKAN kontrol otorisasi (hanya pengaburan / security obscurity). │
│ 05 │ CORS hanya kebijakan peramban, bukan pengganti autentikasi atau CSRF.     │
│ 06 │ Timeout bukan bukti transaksi gagal ("Tidak ada respons != Tidak ada efek")│
│ 07 │ Retry pada metode POST WAJIB disertai Idempotency Key & Rekonsiliasi.     │
│ 08 │ Circuit Breaker TIDAK menggantikan fungsi Timeout atau Rate Limiting!     │
└────┴────────────────────────────────────────────────────────────────────────────┘
```

### Penjelasan Mendalam Tiap Poin:
1. **Poin 1 (TLS vs Storage)**: TLS 1.3 hanya melindungi paket data saat terbang di kabel jaringan (*in-transit*). Setelah paket mendarat di RAM server dan disimpan ke harddisk, data kembali menjadi plaintext kecuali Anda memasang enkripsi kolom AES-GCM (*at-rest*).
2. **Poin 2 (Password Hashing)**: Menyimpan password terenkripsi reversibel adalah dosa arsitektur. Jika peretas mencuri kunci dekripsi, mereka bisa membalikkan seluruh password nasabah. Password harus di-hash searah dengan algoritme memory-hard (*scrypt*).
3. **Poin 3 (HMAC)**: Tanda tangan HMAC tidak menyamarkan teks JSON. Payload webhook tetap bisa dibaca oleh siapapun yang melihat paket. HMAC hanya menjamin bahwa pengirimnya adalah pemegang kunci rahasia dan isinya belum diubah oleh *Man-in-the-Middle*.
4. **Poin 4 (UUID vs Otorisasi)**: Mengganti auto-increment integer ID dengan UUID v4 tidak menghentikan serangan BOLA. Jika pengguna A berhasil mendapatkan UUID milik pengguna B, mereka tetap bisa mencuri data jika server tidak mengecek `can_access`.
5. **Poin 5 (CORS)**: Jangan pernah mengandalkan CORS untuk melindungi data rahasia dari pencuri. Peretas tidak menggunakan browser untuk menyerang; mereka menggunakan skrip otomatis dan `curl` yang mengabaikan header CORS.
6. **Poin 6 (Timeout)**: Jika panggilan pembayaran mengalami timeout 1500ms, jangan berasumsi pembayaran gagal. Provider mungkin sudah mendebit rekening pelanggan. Sistem harus menandai status transaksi sebagai `PENDING` dan menjalankan pengecekan status (*query status / rekonsiliasi*).
7. **Poin 7 (Retry POST)**: Mengulang permintaan POST tanpa Idempotency Key adalah penyebab utama insiden saldo terpotong ganda. Server penerima wajib menyimpan riwayat kunci idempotensi.
8. **Poin 8 (Circuit Breaker vs Timeout)**: Circuit Breaker hanya bertindak sebagai pemutus darurat saat kegagalan berulang. Circuit breaker tidak mengatur berapa lama satu request boleh menunggu (tugas Timeout) dan tidak membatasi kuota pengguna normal (tugas Rate Limiter).

---

## 📑 2. Lembar Kerja Threat Review (Slide 75)

Untuk setiap fitur baru yang dibangun di lingkungan industri, tim pengembang wajib menyusun artefak **Threat Review Sheet**:

| Konteks Endpoint / Aset | Ancaman Potensial (*Abuse Case*) | Penilaian Risiko (Dampak × Kemungkinan) | Kontrol Teknis yang Diterapkan | Kasus Uji & Bukti Aktual | Penanggung Jawab (*Owner*) & Target |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **`GET /tasks/:id`** | BOLA: Member membaca tugas anggota tim lain. | **Tinggi × Tinggi** = Kritis | Middleware OLA `authorizeTaskAccess` | Bob akses task Alice ➔ HTTP 403 Forbidden | Backend Team (Sprint 1) |
| **`POST /tasks`** | Mass Assignment: Client menyuntikkan `role: admin`. | **Tinggi × Sedang** = Signifikan | Skema Zod `.strict()` & Request Allowlist | Kirim `role: admin` ➔ HTTP 422 Unprocessable | Security Lead (Sprint 1) |
| **`POST /auth/login`** | Brute force password via bot script. | **Tinggi × Tinggi** = Kritis | `authRateLimiter` (10 req/menit per IP) + scrypt | Request ke-11 ➔ HTTP 429 Too Many Requests | DevOps / SecOps |
| **Log Server Pino** | Kebocoran token Bearer atau kata sandi ke file log. | **Tinggi × Rendah** = Menengah | Pino Redaction (`[REDACTED_RAHASIA]`) | Log audit dicek ➔ Header Authorization disensor | Platform Team |
| **`POST /tasks/:id/notify`** | Outage eksternal melumpuhkan worker server. | **Kritis × Sedang** = Tinggi | Timeout 1500ms, Circuit Breaker (threshold 3) | 3 Intent gagal ➔ HTTP 503 CIRCUIT_OPEN langsung | Integration Lead |

---

## 🏭 3. Analisis Kesenjangan Produksi (*Production Gap Analysis*) (Slide 76 & 77)

Repositori ini dirancang khusus untuk keperluan edukasi dan pembuktian konsep (*Proof of Concept*). Berikut adalah daftar hal-hal yang **cukup untuk lab**, tetapi **wajib ditingkatkan di sistem produksi nyata**:

| Komponen | Implementasi Lab Hari Ini | Kebutuhan Sistem Produksi Nyata |
| :--- | :--- | :--- |
| **Penyimpanan Rate Limit** | Memori lokal Express (`express-rate-limit`). | Klaster **Redis terdistribusi** atau WAF terpusat (AWS WAF / Cloudflare) agar kuota konsisten antar-replika pod. |
| **Penyimpanan Kunci Kripto** | Buffer memori lokal / `.env`. | Layanan **KMS Terkelola (AWS KMS / GCP Cloud KMS / Vault)** dengan modul HSM bersertifikasi FIPS 140-2. |
| **Circuit Breaker** | Variabel memori lokal singleton kelas `Circuit`. | State machine terdistribusi (misal via Redis atau Service Mesh Envoy/Istio) dengan dukungan probe Half-Open lintas replika. |
| **Basis Data** | SQLite file tunggal (`taskhub.db`). | PostgreSQL / MySQL berkinerja tinggi dengan konfigurasi Multi-AZ Replication, Read-Replicas, dan Connection Pooling (PgBouncer). |
| **Penanganan Timeout** | Retry langsung di proses Node.js. | Antrean pesan asinkron (*Message Broker*) seperti **RabbitMQ, Apache Kafka, atau AWS SQS** dengan Dead-Letter Queue (DLQ). |
| **Audit Kepatuhan** | Pengujian fungsional unit & cURL script. | Audit Keamanan Pihak Ketiga (*Penetration Testing* independen, DAST/SAST reguler, dan *Load Testing* skala besar). |

---

## 📚 4. Rujukan Standar & Pendalaman Materi (Slide 77)

1. **OWASP API Security Top 10**:
   - Standar panduan internasional untuk ancaman API modern (API1: BOLA, API2: Broken Authentication, API3: Broken Object Property Level Authorization / Mass Assignment).
   - [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/): REST Security, Authorization, Cryptographic Storage, Key Management, and Secrets Management.
2. **IETF RFC 9700**:
   - Best Current Practices for OAuth 2.0 Security in Web and Native Applications.
3. **Dokumentasi Resmi Standar Stack**:
   - [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
   - [Zod TypeScript-first Schema Validation](https://zod.dev/)
   - [Node.js Crypto Official Documentation](https://nodejs.org/api/crypto.html)
4. **Stripe Idempotent Requests Architecture**:
   - Standar industri terpopuler untuk implementasi `Idempotency-Key` pada sistem pembayaran global.
