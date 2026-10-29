# 🛡️ TaskHub API Training - Hari 2
### Keamanan Lanjutan dan Integrasi Eksternal (*Reliability & Resilience*)
**Node.js 20+ · Express · SQLite · node:crypto · TaskHub**

Repositori ini adalah implementasi referensi lengkap untuk silabus resmi pelatihan **API Development Training Hari 2 (Sesi 4 dan 5 NQA)**. Seluruh kode, pustaka, middleware, dan skrip pengujian dibangun dari dasar untuk membuktikan konsep keamanan dan perilaku API saat dependensi pihak ketiga mengalami kegagalan.

---

## 🌟 Fitur Utama Repositori

1. **🎮 Interactive Web Playground (`/playground`)**: Antarmuka web modern dengan *dark-mode glassmorphism* untuk menguji seluruh materi: BOLA/IDOR, Mass Assignment, Rate Limiting 429, simulasi manipulasi AES-256-GCM 1-bit, dan Fault Injection Mock Provider secara visual tanpa perlu menghafal curl.
2. **📖 8 Modul Bahan Ajar Komprehensif (`bahan_ajar/`)**: Menjelaskan seluruh 77 slide pelatihan NQA dari dasar filosofi hingga arsitektur produksi, disertai diagram alur (*Mermaid*) dan petunjuk praktikum.
3. **📚 Glosarium Lengkap 51 Kosakata Teknis (`bahan_ajar/08_glosarium_dan_kamus_istilah.md`)**: Menerjemahkan dan menguraikan seluruh kosakata sulit bahasa Inggris (BOLA, IDOR, Nonce, AAD, DEK, KEK, Jitter, Backoff, Circuit Breaker, Bulkhead, SSRF, scrypt, HMAC, dll.) beserta analogi dunia nyata.
4. **📝 Komentar Lini demi Lini di Setiap File Kode**: Setiap berkas kode sumber dilengkapi dokumentasi berbahasa Indonesia yang menerangkan *apa* fungsinya, *mengapa* dibuat demikian sesuai slide, dan *risiko keamanan* apa yang dicegah.
5. **🔌 Arsitektur Dwi-Server Terisolasi**:
   - **TaskHub API Gateway (`port 8000`)**: Server utama yang menerapkan autentikasi Bearer, otorisasi `can_access`, validasi skema Zod, Pino structured logging, rate limiting, dan adapter out-bound.
   - **Provider Mock Service (`port 8001`)**: Server tiruan pihak ketiga yang mengimplementasikan persistensi **Idempotency Key** di SQLite serta 5 mode kegagalan (*fault injection*: `ok`, `busy`, `fail`, `slow`, `bad`).

---

## 🏛️ Arsitektur Topologi Sistem (Slide 8 & 50)

```
┌────────────────────────────────────────────────────────┐
│ BROWSER CLIENT / CURL (Zona Tidak Tepercaya)           │
└───────────────────────────┬────────────────────────────┘
                            │ 1. HTTP Request (Bearer Token + Idempotency-Key)
                            ▼
┌────────────────────────────────────────────────────────┐
│ TASKHUB API GATEWAY (Express :8000)                    │
│ ------------------------------------------------------ │
│ • Request ID Middleware (crypto.randomUUID)            │
│ • Structured Logging (Pino dengan sensor token)        │
│ • CORS Middleware & Rate Limiter (60 req/min/IP)       │
│ • 5 Lapisan Kontrol Input: 413 ➔ 415 ➔ 400 ➔ 422       │
│ • BOLA / IDOR Protection (can_access Policy)           │
│ • SQLite Database (Prepared Statements anti-injeksi)   │
└───────────────────────────┬────────────────────────────┘
                            │ 2. NotificationAdapter (Timeout 1500ms,
                            │    Exponential Backoff & Jitter, Circuit Breaker)
                            ▼
┌────────────────────────────────────────────────────────┐
│ PROVIDER MOCK SERVICE (Express :8001)                  │
│ ------------------------------------------------------ │
│ • Persistensi Idempotency Key & Hash di SQLite         │
│ • Deteksi Konflik Payload (409 Conflict)               │
│ • 5 Mode Fault Injection: ok, busy, fail, slow, bad    │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Panduan Memulai Cepat (Quickstart)

> [!TIP]
> 📖 **Panduan Instalasi Khusus Pemula s/d Menengah:**
> Jika Anda baru pertama kali menjalankan proyek Node.js atau membutuhkan panduan langkah-demi-langkah yang sangat detail disertai penjelasan setiap perintah dan pemecahan masalah (troubleshooting), silakan baca:
> 👉 [**PANDUAN_INSTALASI.md (Klik di sini untuk panduan ramah pemula)**](file:///Users/sulaimansaleh/Documents/API-Development-2/PANDUAN_INSTALASI.md)

### 1. Prasyarat Lingkungan
Pastikan Anda menggunakan **Node.js versi 20 ke atas**:
```bash
node -v # Minimal v20.x.x
npm -v
```

### 2. Instalasi Dependensi
```bash
cd /Users/sulaimansaleh/Documents/API-Development-2
npm install
```

### 3. Inisialisasi Basis Data (Seeding)
Isi data awal pengguna (Alice, Bob, Charlie Manager, Diana Admin, Eve) dan tugas:
```bash
npm run seed
```

### 4. Menjalankan Server
Buka dua terminal terpisah:

**Terminal 1 (Jalankan Mock Provider di port 8001):**
```bash
npm run mock
```

**Terminal 2 (Jalankan TaskHub API di port 8000):**
```bash
npm start
```

### 5. Akses Web Playground
Buka peramban favorit Anda dan kunjungi:
👉 **[http://127.0.0.1:8000/playground](http://127.0.0.1:8000/playground)**

---

## 🧪 Skrip Pengujian Otomatis

Repositori ini menyertakan skrip otomatis untuk membuktikan seluruh teori di slide:

### 1. Uji Enkripsi AES-256-GCM & Manipulasi 1-Bit (Slide 38 – 40)
Membuktikan bahwa manipulasi bit (tampering) pada ciphertext akan ditolak secara kriptografis oleh GMAC Authentication Tag:
```bash
npm run crypto-demo
```

### 2. Uji Menyeluruh: BOLA, Mass Assignment & Fault Injection (Slide 12, 21, 69)
Menjalankan pengujian end-to-end:
- Penolakan akses Bob terhadap tugas Alice (BOLA ➔ 403 Forbidden).
- Penolakan Manager Tim A terhadap tugas Bob di Tim B (403 Forbidden).
- Penolakan injeksi `is_admin` / `role` (Mass Assignment ➔ 422 Unprocessable Entity).
- Jaminan Idempotency Key (pengulangan transaksi menghasilkan respons identik).
- 3 intent gagal berturut-turut memicu **Circuit Breaker jeglek ke posisi OPEN selama 10 detik** (503 CIRCUIT_OPEN).
```bash
npm run test:fault
```

---

## 📚 Daftar Modul Bahan Ajar (`bahan_ajar/`)

| Modul | Judul Materi | Rujukan Slide |
| :--- | :--- | :---: |
| [**Modul 00**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/00_prasyarat_dan_arsitektur.md) | Prasyarat Belajar & Arsitektur Lab TaskHub | Slide 1 – 5, 8, 50 |
| [**Modul 01**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/01_threat_modeling_dan_bola.md) | Threat Modeling & Mitigasi BOLA / IDOR | Slide 6 – 14 |
| [**Modul 02**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/02_input_control_dan_mass_assignment.md) | Kontrol Input, Mass Assignment & Error Handling | Slide 15 – 24 |
| [**Modul 03**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/03_rate_limiting_dan_cors.md) | Rate Limiting & Kebijakan Browser CORS | Slide 25 – 31 |
| [**Modul 04**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/04_kriptografi_dan_secret_management.md) | Kriptografi, Key Management & Secret Safety | Slide 32 – 46 |
| [**Modul 05**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/05_integrasi_eksternal_dan_reliability.md) | Integrasi Pihak Ketiga & Pola Reliability | Slide 47 – 64, 71 |
| [**Modul 06**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/06_lab_provider_mock_dan_fault_injection.md) | Panduan Praktik Lab Provider Mock & Fault Injection | Slide 65 – 72 |
| [**Modul 07**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/07_evaluasi_checklist_dan_gap_produksi.md) | Evaluasi, Threat Review & Analisis Gap Produksi | Slide 73 – 77 |
| [**Modul 08**](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/08_glosarium_dan_kamus_istilah.md) | Glosarium Komprehensif Kosakata & Istilah Teknis | Semua 77 Slide |

---

## 📂 Struktur Berkas Repositori

```
API-Development-2/
├── package.json               # Konfigurasi dependensi Node.js ES Modules & skrip
├── .env.example               # Contoh template environment variables (Slide 45)
├── .env                       # Variabel lingkungan aktif untuk laboratorium
├── .gitignore                 # Larangan commit secret, token, dan sqlite (Slide 44)
├── openapi.yaml               # Spesifikasi resmi OpenAPI 3.1.0 untuk TaskHub API
├── postman_collection.json    # Koleksi Postman siap pakai untuk pengujian
├── README.md                  # Dokumentasi utama proyek
├── bahan_ajar/                # Modul kurikulum edukasi lengkap (Modul 00 s/d 08)
│   ├── README.md
│   ├── 00_prasyarat_dan_arsitektur.md
│   ├── 01_threat_modeling_dan_bola.md
│   ├── 02_input_control_dan_mass_assignment.md
│   ├── 03_rate_limiting_dan_cors.md
│   ├── 04_kriptografi_dan_secret_management.md
│   ├── 05_integrasi_eksternal_dan_reliability.md
│   ├── 06_lab_provider_mock_dan_fault_injection.md
│   ├── 07_evaluasi_checklist_dan_gap_produksi.md
│   └── 08_glosarium_dan_kamus_istilah.md
├── playground/                # Antarmuka web interaktif (HTML5 + CSS Modern + JS)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── provider-mock/             # Layanan eksternal tiruan (Port 8001)
│   ├── index.js               # Server Express Mock (mode: ok, busy, fail, slow, bad)
│   └── db.js                  # Persistensi SQLite untuk rekaman idempotensi (Slide 56)
├── scripts/                   # Skrip utilitas dan pengujian otomatis
│   ├── aes_gcm_demo.js        # Demonstrasi mandiri round-trip AES-256-GCM (Slide 38-40)
│   ├── seed.js                # Inisialisasi basis data awal (Alice, Bob, Charlie, dll)
│   └── test_fault_injection.js# Test runner otomatis BOLA, Idempotency & Circuit Breaker
└── src/                       # Server inti TaskHub API (Port 8000)
    ├── index.js               # Titik masuk utama server Express
    ├── config.js              # Validasi konfigurasi lingkungan dengan Zod (Slide 45)
    ├── logger.js              # Logging terstruktur Pino dengan sensor data rahasia
    ├── db.js                  # SQLite database helper & prepared statements
    ├── middleware/
    │   ├── auth.js            # Validasi Bearer Token (SHA-256 opaque hash)
    │   ├── corsConfig.js      # Konfigurasi keamanan CORS (Slide 30)
    │   ├── errorHandler.js    # Penanganan error konsisten Express (Slide 23)
    │   ├── policy.js          # Kebijakan can_access anti-BOLA/IDOR (Slide 14)
    │   ├── rateLimiter.js     # Rate limiter 60 req/min/IP (Slide 27)
    │   └── requestId.js       # Generator Request ID (crypto.randomUUID) (Slide 24)
    ├── routes/
    │   ├── authRoutes.js      # /api/v1/auth/login dan /me
    │   ├── debugRoutes.js     # Endpoint diagnostik untuk Web Playground
    │   └── taskRoutes.js      # /api/v1/tasks CRUD, /notify, dan AES-GCM secret
    ├── schemas/
    │   └── taskSchemas.js     # Skema Zod .strict() & output serializers (Slide 20-22)
    └── services/
        ├── circuitBreaker.js  # State machine Circuit Breaker (Slide 58-60)
        ├── cryptoService.js   # scrypt, SHA-256, dan AES-256-GCM AEAD (Slide 34-40)
        └── notificationAdapter.js # Adapter ke vendor dengan timeout & retry (Slide 49-63)
```

---

## 👥 Pengguna Uji Laboratorium (Seed Accounts)

Seluruh akun menggunakan kata sandi default: `Password123!`

| Pengguna | Peran (*Role*) | Tim | Tenant | Peruntukan Pengujian |
| :--- | :--- | :--- | :--- | :--- |
| **alice** | `member` | `team-a` | `tenant-1` | Pemilik tugas `task-alice-101`, pengirim notifikasi |
| **bob** | `member` | `team-b` | `tenant-1` | Simulasi penyerang BOLA (mencoba mengakses data Alice) |
| **charlie** | `manager` | `team-a` | `tenant-1` | Pengujian wewenang manajerial tim (ditolak atas tugas Bob Tim B) |
| **diana** | `admin` | `team-admin` | `tenant-1` | Pengujian hak akses menyeluruh dalam satu tenant |
| **eve** | `member` | `team-x` | `tenant-2` | Pengujian isolasi multi-tenant batas tenant |

---

## 📜 Lisensi & Atribusi
Materi pembelajaran ini dikembangkan berdasarkan silabus resmi **API Development Training Hari 2** untuk tujuan edukasi internal dan riset arsitektur perangkat lunak.
