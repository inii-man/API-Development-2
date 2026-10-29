# 📖 Modul 08: Glosarium Komprehensif Kosakata & Istilah Teknis Hari 2
**Kamus Lengkap Terjemahan Bahasa Indonesia & Analogi Konseptual dari Seluruh 77 Slide**

Buku ini disusun secara khusus untuk menerjemahkan dan menguraikan seluruh kosakata teknis bahasa Inggris yang digunakan dalam slide presentasi **API Development Training Hari 2**, agar setiap praktikan dapat memahami materi secara mendalam tanpa hambatan terminologi.

---

## 🗂️ Daftar Isi Kategori Istilah

1. [Bagian A: Keamanan API, Otorisasi & Desain Ancaman (BOLA, IDOR, Mass Assignment)](#-bagian-a-keamanan-api-otorisasi--desain-ancaman)
2. [Bagian B: Kontrol Masukan & Protokol HTTP (Injection, Parameter Binding, Error Handling)](#-bagian-b-kontrol-masukan--protokol-http)
3. [Bagian C: Pembatas Laju & Kebijakan Peramban (Rate Limiting, Throttling, CORS, CSRF)](#-bagian-c-pembatas-laju--kebijakan-peramban)
4. [Bagian D: Kriptografi & Manajemen Kunci (scrypt, AES-GCM, Nonce, AAD, Envelope Encryption, KMS)](#-bagian-d-kriptografi--manajemen-kunci)
5. [Bagian E: Ketahanan Sistem & Integrasi Pihak Ketiga (Timeout, Retry, Idempotency, Circuit Breaker, Bulkhead, SSRF)](#-bagian-e-ketahanan-sistem--integrasi-pihak-ketiga)

---

## 🛡️ Bagian A: Keamanan API, Otorisasi & Desain Ancaman

### 1. BOLA (Broken Object Level Authorization)
- **Terjemahan Resmi**: Kegagalan Otorisasi di Tingkat Objek.
- **Rujukan Slide**: Slide 6, 11, 12, 14, 74.
- **Definisi Teknis**: Kerentanan keamanan peringkat #1 di OWASP API Security Top 10 di mana pengguna yang sudah login dengan token sah dapat mengakses, melihat, mengubah, atau menghapus objek data milik pengguna/tim lain karena server tidak mengecek apakah user berhak atas objek spesifik tersebut.
- **Analogi Sederhana**: Anda memegang kunci kamar hotel 301 yang sah, tetapi kunci Anda ternyata bisa dipakai untuk membuka kamar 302 milik orang lain karena pengelola hotel tidak memasang pin khusus per pintu.
- **Risiko Jika Diabaikan**: Kebocoran data privasi massal pengguna (*data breach*).

### 2. IDOR (Insecure Direct Object Reference)
- **Terjemahan Resmi**: Referensi Objek Langsung yang Tidak Aman.
- **Rujukan Slide**: Slide 11.
- **Definisi Teknis**: Bentuk teknis spesifik dari BOLA di mana aplikasi mengekspos identifier internal (seperti ID angka atau UUID di URL `/tasks/101`) tanpa verifikasi wewenang. Penyerang cukup mengganti angka 101 menjadi 102 pada parameter path, query, atau body.
- **Analogi Sederhana**: Mengganti nomor antrean di kertas struk apotek untuk mengambil obat mahal milik pasien lain.

### 3. Threat Modeling (Pemodelan Ancaman)
- **Terjemahan Resmi**: Pemodelan dan Analisis Ancaman Sistem.
- **Rujukan Slide**: Slide 6, 7, 10, 75.
- **Definisi Teknis**: Metode struktural rekayasa perangkat lunak untuk mengidentifikasi apa aset berharga yang harus dilindungi, siapa saja aktor potensial, di mana batas kepercayaan sistem, dan bagaimana fitur dapat disalahgunakan (*abuse cases*) sebelum kode ditulis.
- **Analogi Sederhana**: Arsitek rumah yang memetakan letak jendela, pintu belakang, dan pagar untuk memasang teralis dan kunci gembok sebelum rumah selesai dibangun.

### 4. Trust Boundary (Batas Kepercayaan)
- **Terjemahan Resmi**: Garis Batas Kepercayaan.
- **Rujukan Slide**: Slide 4, 7, 8, 36, 51.
- **Definisi Teknis**: Titik batas arsitektur tempat data berpindah dari satu zona dengan tingkat wewenang/kepercayaan tertentu ke zona lain (misalnya dari peramban internet tidak tepercaya menuju API Gateway internal). Setiap data yang melewati batas ini wajib diperiksa ulang.
- **Analogi Sederhana**: Meja imigrasi di bandara internasional; sebelum melangkah dari zona internasional ke zona domestik, paspor dan barang bawaan Anda harus diperiksa.

### 5. Abuse Case (Kasus Penyalahgunaan)
- **Terjemahan Resmi**: Skenario Eksploitasi / Penyalahgunaan Fitur.
- **Rujukan Slide**: Slide 7, 9, 75.
- **Definisi Teknis**: Kebalikan dari *Use Case* (skenario normal). Abuse case mendokumentasikan cara penyerang memanipulasi fitur sah sistem untuk tujuan jahat atau merugikan bisnis.

### 6. Residual Risk (Risiko Sisa)
- **Terjemahan Resmi**: Risiko Sisa yang Dapat Ditoleransi.
- **Rujukan Slide**: Slide 10, 75.
- **Definisi Teknis**: Tingkat risiko keamanan yang masih tertinggal setelah semua kontrol dan pengamanan teknis dipasang pada sistem.

### 7. Mass Assignment
- **Terjemahan Resmi**: Penetapan Atribut Objek Secara Massal.
- **Rujukan Slide**: Slide 9, 20, 21.
- **Definisi Teknis**: Celah keamanan di mana framework backend secara otomatis memetakan seluruh field dari body request JSON ke dalam model basis data tanpa seleksi, sehingga client dapat menyelipkan properti berwewenang seperti `role: "admin"` atau `is_admin: true`.
- **Analogi Sederhana**: Saat mendaftar anggota perpustakaan, Anda menulis sendiri di formulir 'Hak Akses: Direktur Utama' dan petugas memasukkan data Anda tanpa memeriksa keabsahannya.

### 8. Request Allowlist
- **Terjemahan Resmi**: Daftar Putih Kolom yang Boleh Ditulis Client.
- **Rujukan Slide**: Slide 20, 21.
- **Definisi Teknis**: Kebijakan di mana server hanya menerima dan memproses properti yang secara eksplisit terdaftar dalam skema (misal Zod `.strict()`), dan membuang atau menolak keras field lainnya.

### 9. Output Serializer
- **Terjemahan Resmi**: Penyaring Format Luaran Respons.
- **Rujukan Slide**: Slide 20.
- **Definisi Teknis**: Fungsi atau kelas yang bertugas menyaring data mentah dari basis data sebelum dikirimkan ke client, memastikan field sensitif (seperti `password_hash`, salt, atau token internal) tidak ikut bocor keluar.

---

## 💉 Bagian B: Kontrol Masukan & Protokol HTTP

### 10. Injection (Serangan Injeksi)
- **Terjemahan Resmi**: Serangan Penyelipan Instruksi Jahat.
- **Rujukan Slide**: Slide 16, 17.
- **Definisi Teknis**: Kategori serangan di mana data masukan pengguna ditafsirkan dan dieksekusi oleh penerjemah (*interpreter*) sebagai perintah sistem (misal SQL, OS Shell, Template, atau LDAP).
- **Prinsip Utama (Slide 16)**: *"Data Tetap Data"*. Memisahkan data dari kode instruksi.

### 11. Parameter Binding (Prepared Statement)
- **Terjemahan Resmi**: Pengikatan Parameter Kueri Basis Data.
- **Rujukan Slide**: Slide 17, 18.
- **Definisi Teknis**: Teknik query di mana nilai variabel dikirimkan melalui saluran terpisah dari struktur perintah SQL (menggunakan tanda `?` atau `$1`). Mesin database tidak akan pernah mengeksekusi karakter kutip atau `OR 1=1` di dalam parameter sebagai sintaks query.

### 12. Negative Testing (Pengujian Negatif)
- **Terjemahan Resmi**: Pengujian Respons Terhadap Masukan Tidak Sah.
- **Rujukan Slide**: Slide 19.
- **Definisi Teknis**: Pengujian sistem dengan sengaja mengirimkan data yang salah, melanggar tipe data, atau melebihi batas skema guna memastikan sistem menolak secara aman tanpa membocorkan stack trace internal atau mengalami crash.

### 13. Optimistic Locking (Versioning Concurrency)
- **Terjemahan Resmi**: Penguncian Optimistik Berbasis Versi.
- **Rujukan Slide**: Slide 21, 22.
- **Definisi Teknis**: Mekanisme penanganan konflik data konkurensi di mana setiap baris data memiliki nomor `version` bilangan bulat. Saat update dijalankan, query memeriksa apakah nomor versi masih cocok; jika sudah bertambah karena diubah pengguna lain, server menolak dengan HTTP **409 Conflict** untuk mencegah *Lost Update*.

### 14. Request ID / Correlation ID
- **Terjemahan Resmi**: Pengenal Unik Pelacakan Permintaan.
- **Rujukan Slide**: Slide 23, 24, 70.
- **Definisi Teknis**: String acak unik (misal UUIDv4) yang dibuat oleh middleware di awal pemrosesan request HTTP dan diteruskan ke header, body error, serta file log agar seluruh alur pemrosesan dari frontend hingga microservice hilir dapat dilacak dengan mudah.

### 15. Structured Logging
- **Terjemahan Resmi**: Pencatatan Log Terstruktur Berformat Mesin (JSON).
- **Rujukan Slide**: Slide 24.
- **Definisi Teknis**: Praktik mencatat pesan log dalam format pasangan kunci-nilai JSON standar (misal menggunakan library Pino), bukan teks bebas, sehingga mudah diindeks, dicari, dan dianalisis oleh sistem monitoring modern (seperti Elasticsearch, Datadog, Grafana Loki).

### 16. Log Redaction (Penyensoran Log)
- **Terjemahan Resmi**: Penutupan Otomatis Data Sensitif pada Log.
- **Rujukan Slide**: Slide 24, 51, 71.
- **Definisi Teknis**: Fitur keamanan pada pustaka logger untuk secara otomatis mendeteksi dan mengganti nilai-nilai rahasia (seperti kata sandi, token Authorization, cookie, nomor kartu kredit) dengan label sensor seperti `[REDACTED_RAHASIA]`.

---

## ⏱️ Bagian C: Pembatas Laju & Kebijakan Peramban

### 17. Rate Limiting
- **Terjemahan Resmi**: Pembatasan Frekuensi Laju Permintaan.
- **Rujukan Slide**: Slide 25, 27, 28.
- **Definisi Teknis**: Kontrol server yang secara tegas **menolak langsung** permintaan yang melampaui batas kuota pada periode waktu tertentu dengan mengembalikan status HTTP **429 Too Many Requests**.

### 18. Throttling
- **Terjemahan Resmi**: Pengendalian / Pencekikan Kecepatan Pemrosesan.
- **Rujukan Slide**: Slide 25.
- **Definisi Teknis**: Pengaturan laju di mana sistem **memperlambat atau menunda** pemrosesan permintaan (misal menaruh di antrean queue) daripada langsung menolaknya.

### 19. Fixed Window vs Sliding Window
- **Terjemahan Resmi**: Jendela Waktu Tetap vs Jendela Waktu Geser Dinamis.
- **Rujukan Slide**: Slide 26.
- **Definisi Teknis**: Fixed window menghitung limit dalam interval kaku per menit jam dinding. Sliding window menghitung frekuensi permintaan berdasarkan jendela waktu geser 60 detik ke belakang sehingga meniadakan lonjakan ganda di batas pergantian menit.

### 20. Token Bucket & Leaky Bucket
- **Terjemahan Resmi**: Algoritme Ember Token & Ember Bocor.
- **Rujukan Slide**: Slide 26.
- **Definisi Teknis**: Token bucket memungkinkan lonjakan trafik sesaat (*controlled burst*) selama ada token tersisa di ember. Leaky bucket mengalirkan permintaan keluar dengan laju yang sangat rata dan konstan (*smooth output rate*).

### 21. `Retry-After` Header
- **Terjemahan Resmi**: Header HTTP Waktu Tunggu Percobaan Ulang.
- **Rujukan Slide**: Slide 27, 55, 68.
- **Definisi Teknis**: Header respons standar HTTP (nilai dalam detik atau tanggal) yang menginstruksikan client berapa lama harus beristirahat sebelum boleh mencoba mengirimkan permintaan lagi.

### 22. CORS (Cross-Origin Resource Sharing)
- **Terjemahan Resmi**: Berbagi Sumber Daya Antar-Asal Peramban.
- **Rujukan Slide**: Slide 29, 30, 31, 74.
- **Definisi Teknis**: Mekanisme keamanan berbasis **peramban (browser)** yang mengatur apakah skrip web frontend yang berjalan di domain A diizinkan untuk membaca respons data dari domain B. BUKAN firewall backend!

### 23. Origin
- **Terjemahan Resmi**: Asal Domain Sumber.
- **Rujukan Slide**: Slide 29.
- **Definisi Teknis**: Kombinasi lengkap dari tiga elemen: **Protokol/Scheme + Nama Host/Domain + Nomor Port**. Jika salah satu berbeda, maka browser menganggapnya sebagai *Cross-Origin*.

### 24. Preflight Request (OPTIONS)
- **Terjemahan Resmi**: Permintaan Pra-Pemeriksaan Otomatis Peramban.
- **Rujukan Slide**: Slide 30.
- **Definisi Teknis**: Panggilan HTTP otomatis dengan metode `OPTIONS` yang dikirim oleh peramban sebelum mengirim request nyata (POST/PATCH/DELETE) untuk menanyakan apakah server mengizinkan Origin, Metode, dan Header tersebut.

### 25. CSRF (Cross-Site Request Forgery)
- **Terjemahan Resmi**: Pemalsuan Permintaan Lintas Situs.
- **Rujukan Slide**: Slide 31.
- **Definisi Teknis**: Serangan di mana situs jahat memperdaya browser korban untuk mengirimkan request transaksi tanpa disadari ke aplikasi target di mana korban sedang aktif login menggunakan cookie sesi otomatis.

---

## 🔐 Bagian D: Kriptografi & Manajemen Kunci

### 26. Encoding
- **Terjemahan Resmi**: Pengkodean Format Karakter (Bukan Enkripsi!).
- **Rujukan Slide**: Slide 33.
- **Definisi Teknis**: Mengubah susunan biner menjadi representasi teks tertentu (seperti Base64 atau URL Encoding). Siapapun dapat mengembalikan teks aslinya tanpa kunci. Sama sekali tidak memberikan kerahasiaan data!

### 27. Hashing
- **Terjemahan Resmi**: Pencacahan / Ikhtisar Digital Satu Arah (*Digest*).
- **Rujukan Slide**: Slide 33, 34, 35.
- **Definisi Teknis**: Fungsi matematika yang memetakan data dengan panjang berapapun menjadi string dengan panjang tetap. Bersifat satu arah (*irreversible*)—mustahil memulihkan teks asli dari nilai hash.

### 28. Encryption (Enkripsi)
- **Terjemahan Resmi**: Penyandian Data Dua Arah.
- **Rujukan Slide**: Slide 33, 34.
- **Definisi Teknis**: Proses pengaburan data plaintext menjadi ciphertext menggunakan kunci kriptografi, di mana data aslinya dapat dipulihkan kembali (*reversible*) hanya oleh pihak yang memegang kunci yang tepat.

### 29. Signature / HMAC
- **Terjemahan Resmi**: Tanda Tangan Digital Berbasis Kunci Rahasia Bersama.
- **Rujukan Slide**: Slide 33, 34, 74.
- **Definisi Teknis**: Kode otentikasi pesan (*Hash-based Message Authentication Code*) yang menjamin **keaslian asal pengirim** dan **integritas data**. Data payload tidak disembunyikan; tanda tangan hanya membuktikan data belum diutak-atik.

### 30. scrypt (Adaptive Password KDF)
- **Terjemahan Resmi**: Fungsi Hashing Adaptif Berbasis Memori Tinggi.
- **Rujukan Slide**: Slide 34, 35.
- **Definisi Teknis**: Algoritme hashing lambat (*memory-hard key derivation function*) yang sengaja mengonsumsi banyak RAM dan waktu komputasi, menjadikannya sangat kebal terhadap serangan brute-force massal menggunakan perangkat keras penambang ASIC atau GPU.

### 31. Salt (Garam Kriptografi)
- **Terjemahan Resmi**: String Acak Pengecoh Hashing Kata Sandi.
- **Rujukan Slide**: Slide 34, 35.
- **Definisi Teknis**: Rangkaian byte acak unik yang digabungkan ke kata sandi sebelum di-hash, sehingga dua pengguna yang memiliki kata sandi sama persis akan menghasilkan nilai hash yang sama sekali berbeda di basis data (melumpuhkan serangan *Rainbow Table*).

### 32. Opaque Token
- **Terjemahan Resmi**: Token Akses Gelap Tanpa Struktur Internal.
- **Rujukan Slide**: Slide 34, 35.
- **Definisi Teknis**: String acak bertaraf entropi tinggi (32 byte CSPRNG) yang tidak memuat data JSON apapun di dalamnya (berbeda dari JWT). Di database, token ini disimpan dalam bentuk hash SHA-256.

### 33. AES-256-GCM (Authenticated Encryption)
- **Terjemahan Resmi**: Standar Enkripsi Tingkat Lanjut - Mode Galois/Counter.
- **Rujukan Slide**: Slide 37 – 41.
- **Definisi Teknis**: Algoritme enkripsi simetris bertaraf militer (kunci 256-bit) yang masuk kategori **AEAD**. Selain menjamin kerahasiaan data, mode GCM menghasilkan *Authentication Tag* (GMAC) 16-byte untuk membuktikan bahwa data belum dimanipulasi (*anti-tampering*).

### 34. Nonce / IV (Number used Once)
- **Terjemahan Resmi**: Bilangan Acak yang Hanya Boleh Dipakai Satu Kali.
- **Rujukan Slide**: Slide 37, 38, 41.
- **Definisi Teknis**: Angka acak 12-byte yang **wajib digenerasi baru pada setiap operasi enkripsi AES-GCM**. Menggunakan ulang nonce yang sama dengan kunci yang sama menghancurkan keamanan enkripsi secara fatal!

### 35. AAD (Additional Authenticated Data)
- **Terjemahan Resmi**: Data Konteks Tambahan yang Ikut Diautentikasi.
- **Rujukan Slide**: Slide 38, 39, 41.
- **Definisi Teknis**: Data teks terbuka (seperti ID tenant atau ID record) yang tidak dienkripsi tetapi diikutsertakan dalam kalkulasi otentikasi tag GCM. Ini mengunci ciphertext agar tidak dapat dipindahkan atau dipalsukan ke record milik tenant lain.

### 36. Authentication Tag (Auth Tag)
- **Terjemahan Resmi**: Tag Bukti Keaslian Kriptografis (16 Bytes).
- **Rujukan Slide**: Slide 39, 40, 41.
- **Definisi Teknis**: Sidik jari kriptografis 16-byte yang dihasilkan oleh mode GCM. Saat proses dekripsi, mesin kripto mencocokkan tag ini; jika ciphertext atau AAD diubah bahkan hanya 1 bit, tag tidak akan cocok dan dekripsi gagal total melempar eksepsi.

### 37. Tamper Detection
- **Terjemahan Resmi**: Deteksi Modifikasi / Pemalsuan Data.
- **Rujukan Slide**: Slide 38, 40.
- **Definisi Teknis**: Kemampuan algoritme AEAD untuk segera mengetahui dan menolak data terenkripsi yang telah diubah di tengah jalan oleh pihak ketiga tanpa kunci sah.

### 38. Envelope Encryption (Enkripsi Amplop)
- **Terjemahan Resmi**: Enkripsi Berlapis Kunci Data & Kunci Induk.
- **Rujukan Slide**: Slide 43.
- **Definisi Teknis**: Pola keamanan di mana data dienkripsi dengan **DEK (Data Encryption Key)** lokal, lalu kunci DEK itu sendiri dienkripsi (dibungkus) menggunakan **KEK (Key Encryption Key)** master yang tersimpan aman di dalam modul perangkat keras HSM / KMS.

### 39. DEK vs KEK
- **Terjemahan Resmi**: Kunci Enkripsi Data vs Kunci Enkripsi Kunci Induk.
- **Rujukan Slide**: Slide 43.
- **Definisi Teknis**:
  - **DEK (Data Encryption Key)**: Kunci simetris sekali pakai yang langsung menyentuh data mentah (*plaintext*).
  - **KEK (Key Encryption Key)**: Kunci induk yang dikelola oleh layanan KMS untuk membungkus (*wrap*) dan membuka (*unwrap*) kunci DEK. KEK tidak pernah keluar dari server KMS.

### 40. KMS (Key Management Service)
- **Terjemahan Resmi**: Layanan Manajemen Kunci Terkelola Terpusat.
- **Rujukan Slide**: Slide 41, 44.
- **Definisi Teknis**: Layanan cloud terisolasi (seperti AWS KMS, Google Cloud KMS, HashiCorp Vault) yang menyediakan pembuatan, rotasi otomatis, dan audit akses kunci kriptografi dengan perangkat keras HSM bersertifikasi.

---

## ⚡ Bagian E: Ketahanan Sistem & Integrasi Pihak Ketiga

### 41. Adapter Pattern
- **Terjemahan Resmi**: Pola Arsitektur Adaptor Antarmuka.
- **Rujukan Slide**: Slide 49, 50, 61, 63.
- **Definisi Teknis**: Pola desain struktural yang mengubah antarmuka kontrak vendor pihak ketiga menjadi antarmuka internal yang seragam dan stabil, mengisolasi kode domain aplikasi dari perubahan format vendor.

### 42. Timeout vs Deadline
- **Terjemahan Resmi**: Batas Waktu Satu Panggilan vs Batas Waktu Keseluruhan Transaksi.
- **Rujukan Slide**: Slide 52, 53.
- **Definisi Teknis**: Timeout mengatur waktu tunggu maksimum untuk 1 fase request I/O jaringan (misal 1500ms). Deadline adalah batas waktu total untuk menyelesaikan seluruh intent bisnis dari awal hingga akhir, termasuk waktu jeda retry.

### 43. Cascading Failure
- **Terjemahan Resmi**: Kegagalan Berantai yang Melumpuhkan Sistem.
- **Rujukan Slide**: Slide 9, 58.
- **Definisi Teknis**: Fenomena di mana gangguan kecil pada satu vendor eksternal menyebabkan worker thread dan connection pool di server kita tertahan menunggu timeout, sehingga server kita kehabisan sumber daya dan ikut tumbang melumpuhkan layanan lainnya.

### 44. Exponential Backoff & Jitter
- **Terjemahan Resmi**: Waktu Tunggu Mundur Eksponensial & Variasi Acak.
- **Rujukan Slide**: Slide 55.
- **Definisi Teknis**: Rumus jeda waktu retry di mana waktu tunggu digandakan setiap kali gagal ($200\text{ ms} \rightarrow 400\text{ ms} \rightarrow 800\text{ ms}$) dan ditambah angka acak kecil (Jitter) agar ribuan klien tidak menyerang server secara serentak (*Thundering Herd Problem*).

### 45. Idempotency (Idempotensi)
- **Terjemahan Resmi**: Sifat Operasi yang Menghasilkan Efek Sama Berulang Kali.
- **Rujukan Slide**: Slide 56, 57, 74.
- **Definisi Teknis**: Karakteristik API di mana eksekusi berkali-kali menghasilkan perubahan status bisnis yang sama persis seperti jika hanya dieksekusi satu kali. Menjamin tidak terjadi pemotongan saldo ganda atau pengiriman notifikasi duplikat.

### 46. Idempotency Key
- **Terjemahan Resmi**: Kunci Unik Penjamin Transaksi Tunggal.
- **Rujukan Slide**: Slide 56, 67.
- **Definisi Teknis**: String unik (biasanya UUID) yang dikirim oleh client pada header request. Server menyimpan respons pertama ke basis data; jika request dengan kunci yang sama masuk lagi, server mengembalikan salinan respons lama tanpa mengeksekusi ulang aksi bisnisnya.

### 47. Circuit Breaker
- **Terjemahan Resmi**: Sakelar Pemutus Arus Otomatis.
- **Rujukan Slide**: Slide 58 – 60, 69, 74.
- **Definisi Teknis**: Pola stabilitas sistem yang secara otomatis memutus panggilan (*OPEN*) ke dependency eksternal yang sedang mengalami kegagalan berulang (misal 3 kali berturut-turut), menolak panggilan seketika (HTTP 503) selama masa istirahat (*cooldown 10s*) agar server dan vendor memiliki ruang untuk bernapas dan pulih.

### 48. Circuit CLOSED, OPEN, HALF-OPEN
- **Terjemahan Resmi**: Status Sirkuit: Tertutup (Normal), Terbuka (Jeglek), Setengah Terbuka (Uji Coba).
- **Rujukan Slide**: Slide 58.
- **Definisi Teknis**:
  - **CLOSED**: Lalu lintas normal, kegagalan dihitung.
  - **OPEN**: Panggilan langsung ditolak selama masa cooldown 10 detik.
  - **HALF-OPEN**: Masa cooldown selesai; 1 request percobaan diizinkan lewat untuk menguji apakah vendor sudah sehat kembali.

### 49. Bulkhead Pattern
- **Terjemahan Resmi**: Pola Sekat Kompartemen Kedap Air.
- **Rujukan Slide**: Slide 64.
- **Definisi Teknis**: Isolasi alokasi sumber daya (seperti membatasi kuota memori, antrean thread, atau connection pool) per jenis dependency agar gangguan pada satu vendor tidak menghabiskan kapasitas seluruh sistem.

### 50. SSRF (Server-Side Request Forgery)
- **Terjemahan Resmi**: Pemalsuan Permintaan Jaringan dari Sisi Server.
- **Rujukan Slide**: Slide 71.
- **Definisi Teknis**: Kerentanan di mana penyerang dapat memaksa server backend untuk mengirimkan permintaan HTTP ke alamat jaringan internal terlarang (seperti `127.0.0.1`, subnet privat, atau IP metadata cloud `169.254.169.254`). Dicegah dengan menerapkan allowlist domain ketat dan melarang URL bebas dari input client.

### 51. Fault Injection
- **Terjemahan Resmi**: Suntikan Simulasi Kegagalan Terencana.
- **Rujukan Slide**: Slide 65 – 72.
- **Definisi Teknis**: Metode pengujian rekayasa keandalan (*Chaos Engineering*) di mana kondisi kegagalan (seperti timeout, HTTP 503, respons korup, atau lonjakan 429) sengaja disimulasikan di lingkungan lab untuk memverifikasi bahwa penanganan kesalahan dan mekanisme ketahanan aplikasi bekerja dengan sempurna.
