# 🛠️ Panduan Lengkap Instalasi & Menjalankan Repositori
### Khusus untuk Pengembang Tingkat Pemula hingga Menengah (*Beginner to Intermediate*)
**Proyek: TaskHub API Hari 2 - Keamanan Lanjutan & Integrasi Eksternal**

Panduan ini ditulis secara runtut, ramah pemula, dan tanpa asumsi bahwa Anda sudah menguasai arsitektur server tingkat lanjut. Ikuti langkah demi langkah di bawah ini untuk menginstal, menjalankan, dan bereksperimen di komputer lokal Anda dalam waktu kurang dari 5 menit!

---

## 🧭 Gambaran Umum: Apa yang Sedang Kita Bangun?

Di pelatihan Hari 2 ini, kita membangun dan menjalankan **dua server lokal sekaligus**:
1. **Server Utama: TaskHub API Gateway (`port 8000`)**
   - Server backend buatan kita yang mengatur otentikasi pengguna, otorisasi data (mencegah BOLA/IDOR), kontrol input (mencegah Mass Assignment), pembatasan laju (*Rate Limiting* 429), dan enkripsi data (*AES-256-GCM*).
2. **Server Tiruan: Provider Mock Service (`port 8001`)**
   - Server yang mensimulasikan sistem pihak ketiga (*third-party vendor*, misalnya vendor SMS/WhatsApp/Push Notification) untuk menguji apakah sistem kita tetap tangguh saat server luar lambat, rusak, atau kelebihan beban (*Fault Injection & Circuit Breaker*).

---

## 📋 Langkah 0: Memeriksa Prasyarat di Komputer Anda

Sebelum mulai, pastikan komputer Anda sudah memiliki **Node.js versi 20 atau lebih tinggi**.

### 1. Periksa Versi Node.js dan npm
Buka aplikasi **Terminal** (di macOS / Linux) atau **PowerShell / Command Prompt** (di Windows), lalu ketik:

```bash
node -v
npm -v
```

**Penjelasan Hasil:**
- Jika muncul tulisan seperti `v20.11.0`, `v22.5.0`, atau `v24.21.0`, selamat! Versi Node.js Anda sudah memenuhi syarat (minimal v20).
- Jika perintah tidak ditemukan (*command not found*) atau versinya masih di bawah `v20.0.0` (misal `v16` atau `v18`):
  - **Pengguna Biasa**: Unduh dan pasang versi terbaru (*LTS*) dari situs resmi: **[https://nodejs.org/](https://nodejs.org/)**.
  - **Pengguna NVM (Node Version Manager)**:
    ```bash
    nvm install 20
    nvm use 20
    ```

> [!NOTE]
> **Mengapa wajib Node.js 20+?**
> Karena materi pelatihan ini memanfaatkan fitur-fitur modern bawaan Node.js tanpa perlu install compiler berat dari luar:
> 1. Modul kriptografi native `node:crypto` (AES-256-GCM dan scrypt).
> 2. Basis data native `node:sqlite` (SQLite bawaan tanpa error kompilasi C++).
> 3. Pengatur batas waktu jaringan native `AbortSignal.timeout()`.

---

## 📂 Langkah 1: Masuk ke Folder Proyek

Pastikan jendela terminal Anda berada di dalam folder proyek ini:

```bash
cd /Users/sulaimansaleh/Documents/API-Development-2
```

*(Arti perintah: `cd` singkatan dari **Change Directory**, yaitu perintah untuk berpindah ke folder yang dituju).*

Untuk memastikan berkas sudah ada di folder tersebut, ketik:
- Di macOS / Linux: `ls`
- Di Windows: `dir`

Anda akan melihat berkas seperti `package.json`, `README.md`, folder `src/`, dan `bahan_ajar/`.

---

## 🔑 Langkah 2: Menyiapkan File Pengaturan Lingkungan (`.env`)

Aplikasi kita memerlukan file konfigurasi bernama `.env` untuk menyimpan nomor port dan kunci rahasia.

### Mengapa ada `.env.example`?
Sesuai prinsip keamanan (Slide 44), **file `.env` asli TIDAK BOLEH di-upload ke GitHub** agar kunci rahasia tidak dicuri peretas. Sebagai gantinya, disediakan file contoh bernama `.env.example`.

### Cara Menyalin File `.env.example` Menjadi `.env`:
Jalankan perintah berikut di terminal:

- **Pengguna macOS / Linux:**
  ```bash
  cp .env.example .env
  ```
- **Pengguna Windows PowerShell:**
  ```powershell
  Copy-Item .env.example .env
  ```
- **Pengguna Windows Command Prompt (CMD):**
  ```cmd
  copy .env.example .env
  ```

### Memahami Isi File `.env`:
Buka file `.env` di editor kode Anda (VSCode / Notepad). Anda akan melihat konfigurasi standar berikut:
```env
PORT=8000                                               # Port server TaskHub
DATABASE_URL=./taskhub.db                               # Lokasi penyimpanan database TaskHub
WEBHOOK_SECRET=super_secret_webhook_signing_key_lab     # Kunci rahasia HMAC
PROVIDER_BASE_URL=http://127.0.0.1:8001                 # Alamat server mock vendor
MOCK_PORT=8001                                          # Port server mock vendor
MOCK_DATABASE_URL=./provider_mock.db                    # Lokasi database mock idempotency
ALLOWED_ORIGIN=https://app.taskhub.example.com          # Origin resmi CORS
```
*(Untuk keperluan latihan lokal, Anda **tidak perlu mengubah** nilai apapun di dalam file `.env` ini!)*

---

## 📦 Langkah 3: Mengunduh Dependensi (`npm install`)

Sekarang, kita perlu mengunduh modul-modul pustaka yang dibutuhkan (seperti Express, Zod, Cors, Pino, express-rate-limit).

Jalankan perintah:
```bash
npm install
```

**Apa yang terjadi di balik layar?**
1. npm membaca berkas `package.json`.
2. npm mengunduh seluruh pustaka yang terdaftar ke dalam folder baru bernama `node_modules/`.
3. npm membuat berkas `package-lock.json` untuk mengunci versi pustaka agar stabil.

**Tanda Berhasil:**
Terminal akan menampilkan pesan:
`added 97 packages, and audited 98 packages... found 0 vulnerabilities`.

---

## 🌱 Langkah 4: Mengisi Data Awal Database (`npm run seed`)

Sebelum server dinyalakan, kita perlu mengisi basis data SQLite lokal dengan akun pengguna dan data tugas awal. Proses ini disebut **Database Seeding**.

Jalankan perintah:
```bash
npm run seed
```

**Hasil yang Muncul di Layar Terminal:**
```text
🌱 [SEEDING] Memulai inisialisasi data pengguna dan tugas TaskHub...
✅ [SEEDING] Berhasil membuat 5 pengguna:
   - alice    | Role: member   | Tim: team-a     | Tenant: tenant-1
   - bob      | Role: member   | Tim: team-b     | Tenant: tenant-1
   - charlie  | Role: manager  | Tim: team-a     | Tenant: tenant-1
   - diana    | Role: admin    | Tim: team-admin | Tenant: tenant-1
   - eve      | Role: member   | Tim: team-x     | Tenant: tenant-2
✅ [SEEDING] Berhasil membuat 4 data tugas awal.
🔑 [INFO LOGIN] Semua akun menggunakan kata sandi: Password123!
🌱 [SEEDING] Selesai.
```

> [!TIP]
> **Catatan Penting Akun Laboratorium:**
> Semua pengguna uji coba di atas menggunakan kata sandi yang sama: **`Password123!`**.
> Jika sewaktu-waktu data di database Anda rusak atau teracak karena eksperimen, Anda cukup menjalankan `npm run seed` kembali untuk mereset data ke kondisi awal yang bersih!

---

## 🚀 Langkah 5: Menjalankan Server (Dua Jendela Terminal)

Karena sistem ini melibatkan **dua server mandiri**, Anda perlu membuka **dua jendela terminal**:

### Jendela Terminal 1: Menjalankan Provider Mock (Port 8001)
Ketik perintah:
```bash
npm run mock
```
**Tanda Berhasil:**
```text
📡 [MOCK PROVIDER] Berjalan di http://127.0.0.1:8001
   Endpoint: POST http://127.0.0.1:8001/notify?mode=[ok|busy|fail|slow|bad]
```
*(Biarkan terminal ini tetap terbuka dan jangan ditutup!)*

---

### Jendela Terminal 2: Menjalankan TaskHub API Gateway (Port 8000)
Buka jendela terminal baru, masuk ke folder proyek (`cd /Users/sulaimansaleh/Documents/API-Development-2`), lalu ketik:
```bash
npm start
```
**Tanda Berhasil:**
```text
🚀 [TASKHUB API] Berjalan di http://127.0.0.1:8000
🌐 [WEB PLAYGROUND] Buka di browser: http://127.0.0.1:8000/playground
📚 [HEALTH CHECK] http://127.0.0.1:8000/health
```
*(Biarkan kedua terminal ini tetap menyala selama Anda belajar dan mencoba aplikasi).*

---

## 🎮 Langkah 6: Mengakses Web Playground Interaktif

Sekarang, buka browser web favorit Anda (Chrome, Edge, Safari, Firefox) dan buka alamat URL:

👉 **[http://127.0.0.1:8000/playground](http://127.0.0.1:8000/playground)**

### Apa yang Bisa Anda Coba di Playground?

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FITUR-FITUR UTAMA WEB PLAYGROUND                    │
├───────────────────┬────────────────────────────────────────────────────┤
│ 1. Ganti Aktor    │ Di kanan atas, pilih "Bob" atau "Alice". Kredensial│
│                   │ token Bearer akan otomatis berganti seketika.      │
├───────────────────┼────────────────────────────────────────────────────┤
│ 2. Tab 1 (BOLA)   │ Pilih aktor "Bob" lalu klik tombol "Eksekusi Uji   │
│                   │ Akses" ke tugas Alice. Saksikan penolakan 403!     │
├───────────────────┼────────────────────────────────────────────────────┤
│ 3. Tab 2 (Input)  │ Centang "Suntikkan role: admin" lalu kirim POST.   │
│                   │ Saksikan proteksi Zod menolak dengan status 422!   │
├───────────────────┼────────────────────────────────────────────────────┤
│ 4. Tab 3 (Rate)   │ Geser slider ke 65 request lalu tembak lonjakan.   │
│                   │ Lihat status 429 Too Many Requests & Retry-After!  │
├───────────────────┼────────────────────────────────────────────────────┤
│ 5. Tab 4 (Kripto) │ Centang "Tamper 1 Bit" lalu klik Enkripsi.         │
│                   │ Lihat kegagalan dekripsi saat data dimanipulasi!   │
├───────────────────┼────────────────────────────────────────────────────┤
│ 6. Tab 5 (Vendor) │ Pilih mode "fail" 3 kali berturut-turut.           │
│                   │ Saksikan Circuit Breaker jeglek (OPEN) 10 detik!   │
├───────────────────┼────────────────────────────────────────────────────┤
│ 7. Tab 7 (Kamus)  │ Cari istilah apapun (misal: "BOLA" atau "scrypt")  │
│                   │ untuk membaca analogi dan penjelasan bahasa Indo.  │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 🧪 Langkah 7: Menjalankan Skrip Pengujian Otomatis

Selain melalui browser, Anda dapat membuktikan seluruh skenario materi Hari 2 secara otomatis melalui terminal.

Buka terminal ketiga (atau gunakan jendela terminal baru):

### 1. Uji Enkripsi AES-256-GCM & Bukti Anti-Tampering (Slide 38 – 40)
```bash
npm run crypto-demo
```
Skrip ini akan membuktikan enkripsi round-trip sukses, lalu sengaja membalik 1 bit data biner (`^= 1`). Anda akan melihat bagaimana mesin kriptografi menolak data yang dirusak tersebut.

### 2. Uji Menyeluruh: BOLA, Mass Assignment, Idempotency & Fault Injection
```bash
npm run test:fault
```
Skrip ini akan menguji alur login Alice, Bob, dan Charlie Manager; memvalidasi penolakan BOLA di 5 jalur; menguji Idempotency Key; menembak 3 kegagalan vendor hingga Circuit Breaker terbuka; dan menunggu 10 detik hingga sirkuit pulih kembali secara otomatis.

---

## ❓ Panduan Pemecahan Masalah (Troubleshooting & FAQ)

### Masalah 1: Muncul Error `EADDRINUSE: address already in use :::8000` atau `:::8001`
- **Penyebab**: Ada proses server sebelumnya yang belum ditutup dan masih memakai port 8000 atau 8001.
- **Solusi (di macOS / Linux)**:
  Cari dan matikan proses tersebut dengan perintah:
  ```bash
  lsof -i :8000
  kill -9 $(lsof -t -i:8000)
  kill -9 $(lsof -t -i:8001)
  ```
- **Solusi (di Windows PowerShell)**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process
  ```

---

### Masalah 2: Muncul Error `Cannot find module 'node:sqlite'`
- **Penyebab**: Versi Node.js yang terpasang di komputer Anda masih di bawah versi 20.
- **Solusi**: Perbarui Node.js ke versi minimal 20 atau 22 melalui **[https://nodejs.org](https://nodejs.org)**.

---

### Masalah 3: Bagaimana Cara Menghentikan Server?
- Klik pada jendela terminal tempat server berjalan, lalu tekan kombinasi tombol keyboard:
  **`Ctrl + C`** (atau `Cmd + C` di Mac). Server akan langsung berhenti dengan rapi.

---

### Masalah 4: Di Mana Saya Bisa Membaca Modul Materi Pembelajaran?
Semua dokumen materi teori dan panduan teknis tersimpan rapi dalam format Markdown di folder [`bahan_ajar/`](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar):
- [Silabus & Roadmap Belajar](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/README.md)
- [Modul 01: Threat Modeling & BOLA](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/01_threat_modeling_dan_bola.md)
- [Modul 02: Kontrol Input & Mass Assignment](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/02_input_control_dan_mass_assignment.md)
- [Modul 03: Rate Limiting & CORS](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/03_rate_limiting_dan_cors.md)
- [Modul 04: Kriptografi & Secret Management](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/04_kriptografi_dan_secret_management.md)
- [Modul 05: Integrasi Pihak Ketiga & Reliability](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/05_integrasi_eksternal_dan_reliability.md)
- [Modul 06: Lab Provider Mock & Fault Injection](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/06_lab_provider_mock_dan_fault_injection.md)
- [Modul 07: Evaluasi & Gap Produksi](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/07_evaluasi_checklist_dan_gap_produksi.md)
- [Modul 08: Glosarium Kosakata Lengkap](file:///Users/sulaimansaleh/Documents/API-Development-2/bahan_ajar/08_glosarium_dan_kamus_istilah.md)

Selamat belajar dan mengeksplorasi arsitektur API yang aman dan tangguh! 🚀
