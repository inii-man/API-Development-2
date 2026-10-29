# 📚 Silabus & Modul Bahan Ajar: API Development Training (Hari 2)
**Fokus: Keamanan Lanjutan dan Integrasi Eksternal (Reliability & Resilience)**

Selamat datang di materi pembelajaran resmi **API Development Training - Hari 2**.
Dokumen ini disusun untuk memberikan pemahaman menyeluruh terhadap **77 slide presentasi pelatihan resmi NQA**. Modul ini menjembatani teori keamanan arsitektur REST dengan implementasi praktis berbasis kode pada stack **Node.js 20+, Express, SQLite, dan modul bawaan `node:crypto`**.

---

## 🎯 Tujuan Pelatihan Hari 2 (Slide 1 & 4)

Tujuan utama dari Hari 2 adalah **menghasilkan keputusan teknis yang dapat dijelaskan dan diuji secara empiris**:
1. **Desain Ancaman (Threat Modeling)**: Menerapkan pendekatan *Security by Design* dan mengidentifikasi *Trust Boundaries*.
2. **Kontrol API (API Controls)**: Mencegah serangan *Broken Object Level Authorization (BOLA)*, *Mass Assignment*, serangan injeksi, serta mengelola laju permintaan (*Rate Limiting*) dan kebijakan peramban (*CORS*).
3. **Perlindungan Data (Data Protection)**: Memilih dan mengimplementasikan teknik kriptografi yang tepat (*scrypt* untuk kata sandi, *SHA-256* untuk token opaque, dan *AES-256-GCM* untuk kerahasiaan & integritas data), serta memahami siklus hidup kunci (*Key Management*).
4. **Konsumsi Provider (External Integration)**: Mengonsumsi API pihak ketiga secara aman melalui pola *Adapter* internal tanpa mengekspos rincian vendor ke controller.
5. **Keandalan & Ketahanan (Reliability)**: Membuktikan perilaku API saat dependency gagal dengan menerapkan *Timeout*, *Exponential Backoff & Jitter*, *Idempotency Key*, dan *Circuit Breaker*.

---

## ⏱️ Struktur Agenda & Alokasi Waktu (Slide 2)

| Sesi | Topik Utama | Alokasi Waktu | Rujukan Slide |
| :--- | :--- | :--- | :--- |
| **01** | **Sesi 4: Keamanan API Lanjutan** (Threat, BOLA, Input, Rate Limit, CORS, Kriptografi, Secret) | 150 Menit | Slide 6 – 46 |
| **02** | **Sesi 5: Integrasi Eksternal** (Adapter, Timeout, Retry, Idempotency, Circuit Breaker) | 90 Menit | Slide 47 – 64 |
| **03** | **Lab Provider Mock & Fault Injection** (Praktik pengujian mode ok, busy, fail, slow, bad) | 90 Menit | Slide 65 – 72 |
| **04** | **Evaluasi, Threat Review & Gap Analysis** (8 Kunci Evaluasi & Rencana Produksi) | 30 Menit | Slide 73 – 77 |

---

## 🧭 Peta Modul Belajar Mandiri

Setiap modul di bawah ini mengulas topik secara mendalam disertai penjelasan kode lini demi lini:

1. [**Modul 00: Prasyarat Belajar & Arsitektur Lab TaskHub**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/00_prasyarat_dan_arsitektur.md)
   - Prasyarat pengetahuan konseptual dan kesiapan lingkungan Node.js 20+.
   - Topologi Port: TaskHub API Gateway (`port 8000`) dan Mock Provider (`port 8001`).
   - Batas Praktik (*Rules of Engagement*): `127.0.0.1` dan data sintetis (Slide 5).

2. [**Modul 01: Threat Modeling & Mitigasi BOLA / IDOR**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/01_threat_modeling_dan_bola.md)
   - 4 Pertanyaan dasar Threat Modeling (Slide 7).
   - 7 Ancaman nyata di TaskHub beserta matriks dampaknya (Slide 9 & 10).
   - Anatomi serangan BOLA & IDOR: Mengapa UUID dan Token Valid bukan otorisasi (Slide 11).
   - Uji 5 Operasi BOLA & pembuktian penolakan akses lintas tim (Alice vs Bob vs Charlie Manager Tim A) (Slide 12).
   - Pencegahan kebocoran data pada Collection, Pencarian, dan `meta.totalItems` (Slide 13 & 14).

3. [**Modul 02: Kontrol Input, Mass Assignment & Error Handling**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/02_input_control_dan_mass_assignment.md)
   - Prinsip *"Data Tetap Data"* & Parameter Binding SQL (Slide 16 & 17).
   - Pengamanan Sort Allowlist, Shell Execution, dan Upload File (Slide 18).
   - Negative Testing dengan data sintetis di localhost (Slide 19).
   - Pertahanan *Mass Assignment*: Request Allowlist vs Output Serializer (Slide 20 & 21).
   - Urutan 5 Lapisan Kontrol Input: 413, 415, 400, 422, dan aturan domain (Slide 22).
   - Format Error Handler Konsisten & Pino Structured Logging dengan Request ID (Slide 23 & 24).

4. [**Modul 03: Rate Limiting & Kebijakan Browser CORS**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/03_rate_limiting_dan_cors.md)
   - Perbedaan mendasar *Rate Limiting* (menolak 429) vs *Throttling* (memperlambat) (Slide 25).
   - Komparasi 4 Algoritme Pembatas Laju: Fixed Window, Sliding Window, Token Bucket, Leaky Bucket (Slide 26).
   - Implementasi `express-rate-limit` (60 req/menit/IP + `Retry-After`) vs Redis Produksi (Slide 27 & 28).
   - Membedah hakikat CORS: Kebijakan browser, bukan firewall atau autentikasi (Slide 29).
   - Konfigurasi aman paket `cors` di Express & pencegahan bahaya `*` + credentials (Slide 30 & 31).

5. [**Modul 04: Kriptografi, Key Management & Secret Safety**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/04_kriptografi_dan_secret_management.md)
   - Perbedaan mendasar Encoding, Hashing, Enkripsi, dan Signature/MAC (Slide 33).
   - Menempatkan teknik yang tepat: *scrypt* untuk password vs *SHA-256* untuk token opaque (Slide 34 & 35).
   - Kerahasiaan *Data in Transit* (TLS) vs *Data at Rest* (Slide 36).
   - Praktik Enkripsi Terotentikasi: AES-256-GCM, Nonce 12-byte unik, dan AAD (Slide 37 - 39).
   - Pembuktian deteksi modifikasi/tampering 1 bit (Slide 40).
   - Pemisahan Metadata vs Key Storage, Siklus Hidup Kunci (8 tahap), dan *Envelope Encryption* (DEK & KEK) (Slide 41 - 43).
   - Validasi Env Zod, `.env.example`, dan SOP tanggap darurat kebocoran secret (Slide 44 - 46).

6. [**Modul 05: Integrasi Pihak Ketiga & Pola Reliability**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/05_integrasi_eksternal_dan_reliability.md)
   - Pola *Adapter*: Memisahkan keputusan domain dari kontrak vendor (Slide 49 & 50).
   - Perbedaan *Timeout* (`AbortSignal.timeout`) vs *Deadline* (Slide 52).
   - Paradigma kritis: *"Timeout setelah request terkirim: Tidak ada respons != Tidak ada efek!"* (Slide 53).
   - Klasifikasi Retry: Kapan layak (429, 502, 503, 504) dan Kapan dilarang (401, 403, 409, 422) (Slide 54).
   - Strategi *Exponential Backoff*, *Jitter*, dan menghormati header `Retry-After` (Slide 55).
   - Jaminan *Idempotency Key*: Deduplikasi intent & deteksi konflik payload 409 (Slide 56 & 57).
   - Pola *Circuit Breaker*: State Machine CLOSED, OPEN, HALF-OPEN (Slide 58 - 60).
   - Pola *Bulkhead*, Fallback Bisnis yang aman, dan pencegahan *SSRF* (Slide 64 & 71).

7. [**Modul 06: Panduan Praktik Lab Provider Mock & Fault Injection**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/06_lab_provider_mock_dan_fault_injection.md)
   - Panduan menjalankan arsitektur dwi-server: TaskHub (:8000) dan Provider Mock (:8001) (Slide 66).
   - Menguji 5 mode kegagalan provider: `ok`, `busy`, `fail`, `slow`, dan `bad` (Slide 68).
   - Perintah cURL interaktif dan observasi kegagalan terisolasi (Slide 67).
   - Skenario *Fault Injection*: Membuktikan Circuit Breaker jeglek (OPEN) setelah 3 kegagalan (Slide 69).
   - Prosedur pencatatan bukti pengujian (*Testing Evidence Matrix*) (Slide 70).

8. [**Modul 07: Evaluasi, Threat Review & Analisis Gap Produksi**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/07_evaluasi_checklist_dan_gap_produksi.md)
   - Membedah 8 Kunci Evaluasi Hari 2 (Slide 74).
   - Lembar Kerja *Threat Review* (Slide 75).
   - Output Kelompok & Artefak yang siap direview (Slide 76).
   - Analisis Kesenjangan Produksi (*Production Gap Analysis*) (Slide 76 & 77).

9. [**Modul 08: Glosarium Komprehensif Kosakata & Istilah Teknis**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/08_glosarium_dan_kamus_istilah.md)
   - Kamus lengkap menerjemahkan seluruh istilah teknis bahasa Inggris yang muncul di 77 slide.
   - Dilengkapi definisi formal, analogi bahasa manusia, risiko pengabaian, dan contoh konkret.

---

## 🚀 Cara Menjalankan Lingkungan Praktik

Untuk mulai bereksperimen, ikuti langkah cepat berikut di terminal:

```bash
# 1. Pastikan Anda berada di direktori project
cd /Users/sulaimansaleh/Documents/API-Development-2

# 2. Inisialisasi basis data awal (Seeding user Alice, Bob, Charlie, Diana, Eve)
npm run seed

# 3. Jalankan Mock Provider di port 8001 (Terminal 1)
npm run mock

# 4. Jalankan TaskHub API di port 8000 (Terminal 2)
npm start

# 5. Buka Web Playground Interaktif di peramban Anda:
# http://127.0.0.1:8000/playground
```
