# ⏱️ Modul 03: Rate Limiting & Kebijakan Browser CORS
**Rujukan Slide: Slide 25 – 31**

Modul ini mengulas dua mekanisme perlindungan batas sistem: **Rate Limiting** (pengendalian laju permintaan untuk mencegah kelumpuhan sumber daya komputasi) dan **CORS** (kebijakan peramban untuk mengatur interaksi lintas domain secara aman).

---

## 🚦 1. Rate Limiting vs Throttling (Slide 25)

Meskipun sering tertukar dalam percakapan sehari-hari, kedua istilah ini memiliki pendekatan teknis yang berbeda:

- **Rate Limiting (Pembatasan Laju)**: Tindakan **menolak langsung** permintaan yang datang ketika jumlahnya melampaui ambang batas tertentu pada periode waktu tertentu. Server merespons dengan status kode **HTTP 429 Too Many Requests**.
- **Throttling (Pencekikan / Pengendalian Kecepatan)**: Tindakan **memperlambat proses atau menunda eksekusi** permintaan (misalnya menahan antrean) agar konsumsi sumber daya sistem tetap berada di bawah batas kapasitas maksimum yang diizinkan.

> [!NOTE]
> Standar implementasi yang baik mewajibkan server mendokumentasikan dengan jelas:
> 1. **Key yang dihitung**: Berdasarkan alamat IP, ID pengguna, API Key, atau Tenant.
> 2. **Batas kuota**: Misal 60 permintaan.
> 3. **Jendela periode**: Misal per 1 menit (60 detik).
> 4. **Tindakan saat terlampaui**: Menolak dengan header `Retry-After`.

---

## ⚙️ 2. Komparasi Empat Algoritme Pembatas Laju (Slide 26)

| Algoritme | Karakteristik & Mekanisme Kerja | Kelebihan | Kekurangan |
| :--- | :--- | :--- | :--- |
| **Fixed Window** | Membagi waktu ke dalam blok tetap (misal 10:00:00 – 10:01:00). Kuota di-reset tepat saat jarum menit berganti. | Sangat sederhana diimplementasikan dan hemat memori. | Rentan lonjakan (*burst*) di perbatasan menit (misal 60 req di detik 59 dan 60 req di detik 01 = 120 req dalam 2 detik!). |
| **Sliding Window** | Menghitung bobot permintaan dari jendela sebelumnya ditambah jendela saat ini secara kontinu. | Menghaluskan batas kuota dan meniadakan celah lonjakan ganda di batas waktu. | Membutuhkan kalkulasi komputasi sedikit lebih tinggi. |
| **Token Bucket** | Ember diisi sejumlah token secara berkala. Setiap request mengambil 1 token. Jika ember kosong, request ditolak. | Mengizinkan lonjakan singkat (*controlled burst*) selama ada token tersisa di ember. | Perlu melacak jumlah token dan timestamp pengisian terakhir. |
| **Leaky Bucket** | Permintaan masuk ke ember bocor dan diproses keluar dengan kecepatan konstan yang stabil. | Menghasilkan laju pemrosesan yang sangat rata dan konstan (*smooth traffic*). | Permintaan yang masuk saat ember penuh akan langsung dibuang (*packet drop*). |

---

## 💻 3. Rate Limit di Express: Lab vs Produksi (Slide 27 & 28)

### Implementasi Laboratorium: `express-rate-limit` (Slide 27)
Pada lingkungan pelatihan lokal, kita menggunakan paket middleware `express-rate-limit`:

```javascript
// src/middleware/rateLimiter.js
import rateLimit from "express-rate-limit";

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 Menit
  limit: 60,           // 60 request per menit per alamat IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    // Memberikan header Retry-After kepada client yang terblokir
    res.setHeader("Retry-After", "60");
    res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Terlalu banyak permintaan. Kuota batas laju terlampaui.",
        retry_after_seconds: 60,
        request_id: req.requestId,
      },
    });
  },
});
```

### Kesenjangan Menuju Lingkungan Produksi Terdistribusi (Slide 27 & 28)
- **Kelemahan Memory Store Lokal**: Jika aplikasi dideploy dengan 5 replika kontainer (misalnya di Kubernetes), memori lokal Express **tidak terbagi**. Pengguna yang sama bisa mengirim $5 \times 60 = 300$ request sebelum terblokir jika request didistribusikan oleh load balancer!
- **Solusi Produksi**: Gunakan penyimpanan terdistribusi terpusat seperti **Redis** (`rate-limit-redis`) atau terapkan rate limiter di lapisan terdepan (**API Gateway, Reverse Proxy Nginx/Envoy, atau Cloud WAF**).
- **Segmentasi Batas (Differentiated Limits)**: Bedakan batas laju untuk:
  - Endpoint publik / halaman statis: Batas longgar (misal 100 req/menit).
  - Endpoint login / reset password: Batas sangat ketat (misal 5 - 10 percobaan/menit) untuk mencegah brute-force.
  - Endpoint kalkulasi mahal / ekspor laporan: Batas khusus berbasis kuota tenant berbayar.

---

## 🌐 4. CORS: Kebijakan Browser, Bukan Autentikasi (Slide 29)

Salah satu kesalahpahaman paling umum di kalangan pengembang adalah menganggap CORS sebagai fitur keamanan server atau pengganti otentikasi.

> [!WARNING]
> **Fakta Krusial Tentang CORS (Slide 29):**
> 1. **CORS adalah kebijakan PERAMBAN (Browser Policy)** yang membatasi skrip JavaScript frontend agar tidak bisa membaca konten respons dari domain lain sembarangan (*Same-Origin Policy*).
> 2. **CORS BUKAN FIREWALL:** Utilitas baris perintah seperti `curl`, skrip Python/Node.js, dan aplikasi backend-ke-backend sama sekali tidak mematuhi header CORS dan tidak terhalang oleh aturan CORS!
> 3. **Definisi Origin:** Sebuah Origin didefinisikan secara mutlak oleh tiga serangkai:
>    $$\text{Origin} = \text{Scheme (http/https)} + \text{Host (domain/IP)} + \text{Port}$$
>    Contoh: `http://localhost:3000` **berbeda** dari `http://localhost:8000` walaupun berjalan di mesin komputer yang sama!

---

## 🔒 5. Konfigurasi Aman Paket `cors` di Express (Slide 30)

Berikut adalah penerapan konfigurasi paket `cors` standar TaskHub sesuai Slide 30:

```javascript
// src/middleware/corsConfig.js
import cors from "cors";

// Hanya daftarkan domain aplikasi frontend resmi yang dipercaya
const allowedOrigins = [
  "https://app.taskhub.example.com",
  "http://127.0.0.1:8000" // Diizinkan untuk testing lab lokal
];

export const corsMiddleware = cors({
  origin: allowedOrigins,
  credentials: false, // JANGAN gunakan origin '*' bersama credentials: true!
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "Idempotency-Key", // Header wajib untuk integrasi lab Hari 2
    "X-Request-Id"
  ],
  maxAge: 600, // Simpan cache preflight browser selama 10 menit
});
```

> [!CAUTION]
> **Dosa Besar Konfigurasi CORS (Slide 30):**
> Menggabungkan `origin: "*"` dengan `credentials: true` adalah kerentanan keamanan fatal yang ditolak oleh spesifikasi browser modern. Jika server merefleksikan kembali origin penyerang dan mengizinkan kredensial, situs penyerang dapat mencuri cookie sesi dan data sensitif pengguna korban secara bebas!

---

## 🍪 6. CORS, Cookie, dan CSRF (Slide 31)

Ketika aplikasi web menggunakan cookie untuk otentikasi sesi:
- **Atribut Cookie Wajib**:
  - `HttpOnly`: Mencegah JavaScript peramban membaca isi cookie (mitigasi pencurian sesi lewat celah XSS).
  - `Secure`: Cookie hanya dikirimkan melalui koneksi terenkripsi HTTPS.
  - `SameSite=Strict` atau `SameSite=Lax`: Melindungi aplikasi dari serangan lintas origin otomatis (*CSRF Protection*).
- **API JSON Tidak Otomatis Bebas CSRF (Slide 31)**:
  Banyak pengembang mengira API JSON aman dari CSRF. Padahal, jika endpoint menerima data tanpa validasi `Content-Type` yang ketat, atau jika menggunakan token berbasis cookie tanpa token CSRF pendamping, penyerang tetap bisa mengeksploitasi formulir peramban untuk memicu aksi yang tidak diinginkan.
