# 🏛️ Modul 00: Prasyarat Belajar & Arsitektur Lab TaskHub
**Rujukan Slide: Slide 1, 4, 5, 8, dan 50**

Modul ini menetapkan landasan teknis, batasan praktikum, dan pemetaan arsitektur sistem sebelum Anda melangkah ke bab-bab pengujian keamanan dan keandalan.

---

## 🎯 1. Prasyarat Belajar (Prerequisites)

Untuk menyerap materi Hari 2 secara maksimal, peserta diharapkan memiliki latar belakang dasar berikut:

### A. Pengetahuan Konseptual
- **Dasar REST & HTTP (Materi Hari 1)**: Memahami konsep *Resource*, perbedaan metode HTTP (`GET`, `POST`, `PATCH`, `DELETE`), header standar (`Authorization`, `Content-Type`), serta kode status (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `500`).
- **Autentikasi Berbasis Token**: Memahami bahwa client mengirimkan token identitas pada setiap request melalui header `Authorization: Bearer <token>`.
- **Dasar Basis Data Relasional**: Memahami konsep tabel relasional, Primary Key, Foreign Key, serta bahaya penggabungan string (concatenation) pada perintah SQL.
- **Asinkronitas di JavaScript / Node.js**: Memahami konsep `Promise`, `async/await`, `setTimeout`, dan pemanggilan API via `fetch`.

### B. Kebutuhan Perangkat Lunak & Lingkungan
- **Node.js Versi 20 ke atas (Node.js 20+)**:
  - Pelatihan ini memanfaatkan modul bawaan `node:crypto` terbaru (dukungan stabil AES-GCM & CSPRNG), `node:sqlite` bawaan, serta dukungan native `AbortSignal.timeout()`.
  - Periksa versi di terminal: `node --version` (harus menampilkan `v20.x.x` atau lebih tinggi).
- **Peramban Web Modern**: Google Chrome, Mozilla Firefox, Apple Safari, atau Microsoft Edge untuk mengakses antarmuka interaktif **Web Playground**.
- **Perangkat HTTP Client**: Perintah terminal `curl` atau aplikasi GUI seperti Postman/Insomnia.

---

## 🛑 2. Batas Praktik & Aturan Laboratorium (Slide 5)

> [!IMPORTANT]
> **Aturan Lab: Hanya Localhost atau Sistem yang Diizinkan (Slide 5)**
> - Alamat IP sasaran pengujian **hanya `127.0.0.1`** (localhost).
> - Seluruh data yang digunakan adalah **Data Sintetis** (data buatan semata).
> - **DILARANG KERAS** melakukan serangan brute force nyata, *load testing* tanpa batas, pemindaian port publik, atau mengirimkan payload berbahaya ke jaringan eksternal tanpa izin resmi.
> - Tujuan lab adalah **menguji kontrol sistem secara terukur**, bukan merusak ketersediaan layanan pihak lain.

---

## 🗺️ 3. Arsitektur Topologi Sistem (Slide 8 & 50)

Arsitektur praktikum Hari 2 memisahkan aplikasi menjadi **dua proses mandiri** yang berkomunikasi melalui protokol HTTP loopback:

```mermaid
flowchart LR
    subgraph Zona_Tidak_Tepercaya["Zona Tidak Tepercaya (Untrusted Zone)"]
        Client["Browser Client / Curl"]
    end

    subgraph Zona_Internal_TaskHub["Zona Aplikasi Internal (Port 8000)"]
        Proxy["Reverse Proxy / Ingress"]
        TaskHub["TaskHub API Gateway\n(Express :8000)"]
        DB[(TaskHub DB\nSQLite)]
    end

    subgraph Zona_Eksternal["Zona Eksternal Vendor (Port 8001)"]
        ProviderMock["Provider Mock Service\n(Express :8001)"]
        MockDB[(Mock Idempotency\nSQLite)]
    end

    Client -->|1. Request HTTP| Proxy
    Proxy -->|2. Forward| TaskHub
    TaskHub -->|Query Data| DB
    TaskHub -->|3. Adapter Outbound\n(POST /notify)| ProviderMock
    ProviderMock -->|Cek & Simpan Key| MockDB
    ProviderMock -->|4. Respons Vendor| TaskHub
    TaskHub -->|5. Respons Terkontrol| Client

    style Zona_Tidak_Tepercaya fill:#1f1315,stroke:#ef4444,stroke-width:2px
    style Zona_Internal_TaskHub fill:#0f172a,stroke:#3b82f6,stroke-width:2px
    style Zona_Eksternal fill:#161f18,stroke:#10b981,stroke-width:2px
```

### Rincian Komponen Arsitektur:

1. **Client (Browser Playground & Terminal cURL)**:
   - Merepresentasikan pengguna akhir atau aplikasi web frontend.
   - Sesuai Slide 50: **Client HANYA memanggil TaskHub (`port 8000`)**. Client tidak pernah diizinkan memanggil penyedia eksternal secara langsung karena alasan keamanan kredensial dan penegakan kebijakan (*policy enforcement*).

2. **TaskHub API (`http://127.0.0.1:8000`)**:
   - Server utama yang bertindak sebagai gerbang backend (API Gateway).
   - Menjalankan seluruh kontrol keamanan:
     - Autentikasi Bearer Token (Slide 35).
     - Kebijakan otorisasi level objek `can_access` untuk mencegah BOLA/IDOR (Slide 14).
     - Validasi skema input Zod & proteksi Mass Assignment (Slide 20 - 22).
     - Rate Limiting 60 req/menit/IP (Slide 27).
     - Kebijakan peramban CORS (Slide 30).
     - Logging terstruktur Pino dengan korelasi `request_id` (Slide 24).
     - Menampung **NotificationAdapter** yang membungkus komunikasi ke provider eksternal (Slide 49 & 61).

3. **Provider Mock (`http://127.0.0.1:8001`)**:
   - Berjalan sebagai proses Node.js terpisah (Slide 66).
   - Mensimulasikan server pihak ketiga (misalnya gateway SMS/WhatsApp/Push Notification).
   - Menyediakan 5 mode kegagalan terprogram (*fault injection*): `ok`, `busy` (429), `fail` (503), `slow` (delay 2 detik), dan `bad` (JSON rusak) (Slide 68).
   - Memiliki basis data SQLite lokal untuk mencatat dan membuktikan mekanisme **Idempotency Key** (Slide 56).

---

## 🛡️ 4. Batas Kepercayaan (Trust Boundaries) (Slide 7 & 8)

Dalam perancangan keamanan berbasis ancaman (*Threat Modeling*), **Trust Boundary** adalah titik perpindahan data antar-entitas yang memiliki tingkat kepercayaan atau wewenang berbeda:

| Batas Kepercayaan | Sumber (Pengirim) | Target (Penerima) | Risiko Utama | Tindakan Wajib di Server |
| :--- | :--- | :--- | :--- | :--- |
| **Batas 1: Client ➔ TaskHub** | Browser / Internet (Tidak Tepercaya) | API Gateway | BOLA, Injeksi, Mass Assignment, DoS | Validasi skema ketat, otorisasi `can_access`, rate limiting, ukuran payload |
| **Batas 2: TaskHub ➔ Database** | API Controller | SQLite Database | SQL Injection, Kebocoran Data | Parameter Binding (`?`), Enkripsi AES-256-GCM pada field rahasia |
| **Batas 3: TaskHub ➔ Provider Mock** | Internal Adapter | Vendor Pihak Ketiga | Kebocoran Secret, Duplikasi Transaksi, Cascading Outage | Redaksi kredensial di log, kirim Idempotency-Key, pasang Circuit Breaker |
| **Batas 4: Provider Mock ➔ TaskHub** | Vendor Pihak Ketiga | Adapter TaskHub | Format Data Rusak, Penolakan Layanan | Response Shape Validation, terjemahkan respons menjadi status terkontrol (502) |

> [!NOTE]
> Slide 51 menegaskan: *"Respons provider tidak lebih tepercaya daripada input pengguna."*
> Sistem kita tidak boleh berasumsi bahwa respons dari pihak ketiga selalu valid dan ramah. Jika provider mengembalikan respons yang tidak sesuai kontrak, adapter wajib menanganinya secara elegan tanpa membuat server kita crash.
