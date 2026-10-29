# 🔬 Modul 06: Panduan Praktik Lab Provider Mock & Fault Injection
**Rujukan Slide: Slide 65 – 72**

Modul ini adalah buku petunjuk praktikum langsung untuk menguji ketahanan TaskHub terhadap 5 skenario kegagalan penyedia eksternal (*Fault Injection*) menggunakan proses terpisah di **port 8000** dan **port 8001**.

---

## 🛠️ 1. Menyiapkan Lingkungan Praktik (Slide 66)

Buka dua jendela terminal terpisah pada direktori proyek:

```bash
# ==============================================================================
# TERMINAL 1: Jalankan Provider Mock (Port 8001) (Slide 66)
# ==============================================================================
npm run mock
# Output yang diharapkan:
# 📡 [MOCK PROVIDER] Berjalan di http://127.0.0.1:8001
#    Endpoint: POST http://127.0.0.1:8001/notify?mode=[ok|busy|fail|slow|bad]

# ==============================================================================
# TERMINAL 2: Jalankan TaskHub API (Port 8000) (Slide 66)
# ==============================================================================
npm start
# Output yang diharapkan:
# 🚀 [TASKHUB API] Berjalan di http://127.0.0.1:8000
# 🌐 [WEB PLAYGROUND] Buka di browser: http://127.0.0.1:8000/playground
```

---

## 🧪 2. Karakteristik 5 Mode Mock Provider (Slide 68)

| Mode | Perilaku Provider Mock (:8001) | Perilaku Adapter TaskHub (:8000) | Status HTTP ke Client |
| :---: | :--- | :--- | :---: |
| **`ok`** | Mengembalikan JSON dengan `notificationId` unik dan mencatat ke SQLite. | Membaca respons sukses dan mencatat keberhasilan ke Circuit Breaker. | **200 OK** |
| **`busy`** | Menolak dengan header `Retry-After: 2` (429 Too Many Requests). | Menunggu jeda `Retry-After` lalu melakukan retry hingga 2 kali. | **200 OK** (jika retry berhasil) atau **503** |
| **`fail`** | Mengembalikan status 503 Service Unavailable seketika. | Melakukan retry 2 kali dengan Exponential Backoff + Jitter. | **503 Service Unavailable** |
| **`slow`** | Menahan koneksi selama **2000 ms** (2 detik). | `AbortSignal.timeout(1500)` memutus koneksi di milidetik ke-1500. | **503 Service Unavailable** (setelah retry) |
| **`bad`** | Mengembalikan status 200 tetapi format JSON korup tanpa `notificationId`. | Mendeteksi pelanggaran skema lalu menerjemahkan menjadi status terkontrol. | **502 Bad Gateway** |

---

## 💻 3. Langkah Praktik Pengujian dengan cURL (Slide 67 – 69)

### Langkah A: Login Sebagai Alice & Dapatkan Token
```bash
curl -i -s -X POST "http://127.0.0.1:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "Password123!"}'
```
*Simpan string token yang muncul di terminal ke dalam variabel lingkungan:*
```bash
export TOKEN="<paste_token_alice_di_sini>"
export TASK_ID="task-alice-101"
```

---

### Langkah B: Uji Mode Normal & Buktikan Idempotensi (Slide 67)
Jalankan request notifikasi dengan menyertakan `Idempotency-Key`:

```bash
curl -i -X POST \
  "http://127.0.0.1:8000/api/v1/tasks/$TASK_ID/notify?mode=ok" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: notify-demo-001"
```
**Hasil Respons 1**:
```json
{
  "success": true,
  "task_id": "task-alice-101",
  "idempotency_key": "notify-demo-001",
  "result": {
    "success": true,
    "notificationId": "notif_9a8f2bc1"
  }
}
```

**Uji Replay (Ulangi Perintah yang Sama Persis)**:
Jalankan kembali cURL di atas dengan kunci yang sama. Perhatikan bahwa `notificationId` yang dikembalikan **SAMA PERSIS (`notif_9a8f2bc1`)**! Ini membuktikan bahwa efek samping bisnis tidak terduplikasi.

---

### Langkah C: Uji Mode Bad (Response Shape Cacat ➔ 502) (Slide 68 & 69)
```bash
curl -i -X POST \
  "http://127.0.0.1:8000/api/v1/tasks/$TASK_ID/notify?mode=bad" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: bad-demo-key-001"
```
**Hasil yang Diharapkan**:
Server TaskHub mengembalikan **HTTP 502 Bad Gateway** dengan kode error `BAD_GATEWAY`. Adapter menolak meneruskan respons korup ke domain internal.

---

### Langkah D: Skenario Fault Injection & Jebolnya Circuit Breaker (Slide 69)

1. **Trigger Intent Gagal 1**:
   ```bash
   curl -i -X POST "http://127.0.0.1:8000/api/v1/tasks/$TASK_ID/notify?mode=fail" \
     -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: fail-key-01"
   ```
   *Status: 503 (Percobaan 1 gagal, retry 2x, total 3x panggilan gagal).*

2. **Trigger Intent Gagal 2**:
   ```bash
   curl -i -X POST "http://127.0.0.1:8000/api/v1/tasks/$TASK_ID/notify?mode=fail" \
     -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: fail-key-02"
   ```
   *Status: 503 (Akumulasi kegagalan = 2).*

3. **Trigger Intent Gagal 3**:
   ```bash
   curl -i -X POST "http://127.0.0.1:8000/api/v1/tasks/$TASK_ID/notify?mode=fail" \
     -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: fail-key-03"
   ```
   *Status: 503 (Akumulasi kegagalan = 3 ➔ **CIRCUIT BREAKER JEGLEK KE POSISI OPEN SELAMA 10 DETIK!**).*

4. **Buktikan Pemblokiran Seketika Saat Circuit OPEN (Slide 69)**:
   Kirimkan permintaan baru bahkan dengan `mode=ok`:
   ```bash
   curl -i -X POST "http://127.0.0.1:8000/api/v1/tasks/$TASK_ID/notify?mode=ok" \
     -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: intent-blocked-01"
   ```
   **Hasil**: Respons **503 Service Unavailable** kembali dalam **0 milidetik** dengan kode:
   `"code": "CIRCUIT_OPEN"`. TaskHub tidak membuang bandwidth menghubungi provider yang sedang down!

5. **Uji Pemulihan Setelah 10 Detik (Slide 69)**:
   Tunggu 10 detik agar masa cooldown berakhir, lalu jalankan kembali perintah `mode=ok`. Server akan memasuki status **HALF-OPEN**, panggilan percobaan berhasil, dan sirkuit kembali pulih ke status **CLOSED**!

---

## 📊 4. Format Lembar Catatan Bukti Pengujian (Slide 70)

Setiap pengujian laboratorium wajib dicatat ke dalam matriks bukti pengujian (*Testing Evidence Sheet*):

| ID Kasus | Skenario Pengujian | Status Diharapkan | Status Aktual | Efek Provider (Record di DB) | Request ID Korelasi | Evaluasi & Tindak Lanjut |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **TC-01** | Happy Path Mode OK | 200 OK | 200 OK | 1 Notifikasi Terbit | `req_1084f1a2` | Sukses, format JSON sesuai kontrak. |
| **TC-02** | Replay Kunci Sama | 200 OK | 200 OK | Tidak ada baris baru (Cached) | `req_2910c83a` | Idempotensi bekerja membendung duplikasi. |
| **TC-03** | Kunci Sama Payload Beda | 409 Conflict | 409 Conflict | Ditolak oleh SQLite mock | `req_881bdf90` | Konflik terdeteksi, data lama terlindungi. |
| **TC-04** | Mode Bad (Schema Cacat) | 502 Bad Gateway | 502 Bad Gateway | 0 Notifikasi | `req_3188fa02` | Adapter sukses melakukan translasi status. |
| **TC-05** | 3 Intent Gagal ➔ Circuit OPEN | 503 CIRCUIT_OPEN | 503 CIRCUIT_OPEN | 0 Panggilan (Blocked) | `req_9921bc44` | Sirkuit jeglek tepat waktu (10s cooldown). |
