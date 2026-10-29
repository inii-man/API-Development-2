// ==============================================================================
// BERKAS: playground/app.js
// TUJUAN: Logika interaktif Web Playground TaskHub Hari 2.
// MENCAKUP:
//   1. Manajemen sesi & Aktor switcher (Alice, Bob, Charlie, Diana, Eve)
//   2. Lab BOLA & IDOR Studio
//   3. Lab Input Control & Mass Assignment
//   4. Lab Rate Limiter & CORS Simulator
//   5. Lab Kriptografi AES-256-GCM & Tamper Detection
//   6. Lab Integrasi Eksternal, Idempotensi & Fault Injection
//   7. Live Log Inspector
//   8. Kamus & Glosarium Interaktif 77 Slide
// ==============================================================================

// Variabel status global playground
let currentUsers = [];
let currentUser = null;
let currentToken = "";

// ==============================================================================
// 1. DATA GLOSARIUM KOSAKATA LENGKAP (77 SLIDE BAHAN AJAR)
// ==============================================================================
const GLOSSARY_DATA = [
  {
    term: "BOLA (Broken Object Level Authorization)",
    cat: "security",
    slide: "Slide 6, 11-14",
    def: "Celah keamanan nomor 1 di OWASP API Security Top 10, di mana pengguna yang sudah login dapat mengakses atau memodifikasi objek milik pengguna lain karena server tidak memeriksa wewenang di tingkat objek spesifik.",
    analogy: "Anda punya kunci kamar hotel yang sah (Token Valid), tetapi Anda bisa membuka pintu kamar tamu sebelah karena kuncinya master tanpa izin resepsionis."
  },
  {
    term: "IDOR (Insecure Direct Object Reference)",
    cat: "security",
    slide: "Slide 11",
    def: "Subtipe dari masalah otorisasi di mana aplikasi mengekspos referensi langsung ke objek internal (misal: ID / UUID di URL `/tasks/101`) tanpa kontrol akses yang memadai.",
    analogy: "Mengganti angka nomor faktur di URL browser dari 101 menjadi 102 lalu bisa melihat faktur orang lain."
  },
  {
    term: "Mass Assignment",
    cat: "security",
    slide: "Slide 20-21",
    def: "Kerentanan di mana client mengirim properti tambahan yang tidak diharapkan (seperti role: admin atau is_admin: true) dan server langsung menyimpannya ke database tanpa penyaringan allowlist.",
    analogy: "Saat mengisi formulir pendaftaran member biasa, Anda diam-diam menulis sendiri jabatan 'Direktur Utama' di kolom formulir, dan panitia menyetujuinya tanpa verifikasi."
  },
  {
    term: "Trust Boundary (Batas Kepercayaan)",
    cat: "security",
    slide: "Slide 7-8",
    def: "Garis batas arsitektur tempat data berpindah dari zona tidak tepercaya (misal client browser / internet) ke zona tepercaya (server internal / database). Setiap data yang melintasi batas ini wajib divalidasi ulang.",
    analogy: "Pintu pemeriksaan imigrasi dan bea cukai di bandara internasional sebelum penumpang diizinkan masuk ke dalam negeri."
  },
  {
    term: "Parameter Binding (Prepared Statement)",
    cat: "security",
    slide: "Slide 16-17",
    def: "Teknik eksekusi query database di mana nilai masukan pengguna dipisahkan secara fisik dari struktur perintah SQL (Prinsip: 'Data tetap data'). Mencegah SQL Injection 100%.",
    analogy: "Memberikan surat di dalam amplop tertutup kepada kurir, bukan membacakan isi surat sebagai instruksi navigasi mengemudi kurir."
  },
  {
    term: "Request ID (Correlation ID)",
    cat: "security",
    slide: "Slide 23-24",
    def: "Identifier acak unik (biasanya UUIDv4) yang dibuat oleh server untuk setiap HTTP request. ID ini dicatat di header, log terstruktur, dan badan pesan error agar tim engineer bisa melacak insiden tanpa meminta token sensitif pengguna.",
    analogy: "Nomor karcis antrean rumah sakit yang digunakan dokter dan apoteker untuk melacak rekam medis Anda."
  },
  {
    term: "Rate Limiting vs Throttling",
    cat: "reliability",
    slide: "Slide 25",
    def: "Rate Limiting adalah tindakan menolak langsung request yang melebihi batas kuota (mengembalikan 429 Too Many Requests). Throttling adalah tindakan memperlambat laju atau menunda pemrosesan antrean agar server tidak kolaps.",
    analogy: "Rate limiting: Pintu tol ditutup saat kapasitas penuh. Throttling: Mobil diatur berjalan lambat 20 km/jam saat padat."
  },
  {
    term: "Fixed Window vs Sliding Window",
    cat: "reliability",
    slide: "Slide 26",
    def: "Fixed Window menghitung limit dalam blok waktu kaku (misal 10:00:00 - 10:01:00) yang rentan lonjakan di perbatasan menit. Sliding Window menghitung jendela geser dinamis sehingga batas laju request jauh lebih halus.",
    analogy: "Fixed window: Jatah makan 1 piring per jam pas. Sliding window: Jatah makan dihitung dari 60 menit terakhir ke belakang."
  },
  {
    term: "CORS (Cross-Origin Resource Sharing)",
    cat: "security",
    slide: "Slide 29-31",
    def: "Mekanisme keamanan berbasis BROWSER yang mengatur apakah skrip JavaScript di origin A boleh membaca respons dari origin B. BUKAN firewall dan tidak mencegah akses via curl!",
    analogy: "Satpam sekolah yang melarang siswa membawa pulang dokumen rahasia ke rumah, tetapi kurir pos dari luar kota tetap bisa datang mengambil barang."
  },
  {
    term: "Preflight Request (HTTP OPTIONS)",
    cat: "security",
    slide: "Slide 30",
    def: "Request pendahuluan otomatis yang dikirim browser dengan metode OPTIONS sebelum mengirim request non-sederhana (seperti POST dengan JSON atau header khusus) untuk menanyakan izin ke server.",
    analogy: "Mengetuk pintu dan bertanya 'Bolehkah saya masuk membawa koper?' sebelum benar-benar melangkah masuk."
  },
  {
    term: "CSRF (Cross-Site Request Forgery)",
    cat: "security",
    slide: "Slide 31",
    def: "Serangan di mana situs jahat memperdaya browser korban untuk mengeksekusi aksi yang tidak diinginkan pada aplikasi web tempat korban sedang aktif login menggunakan cookie otomatis.",
    analogy: "Penipu meminjam cap stempel resmi Anda yang tertinggal di atas meja untuk menandatangani surat transfer dana."
  },
  {
    term: "scrypt (Adaptive Password Hashing)",
    cat: "crypto",
    slide: "Slide 34-35",
    def: "Fungsi turunan kunci kriptografis lambat berbasis memori (Memory-Hard Function) yang dirancang khusus untuk hashing kata sandi manusia. Tahan terhadap serangan cracking perangkat keras ASIC dan GPU.",
    analogy: "Gembok berkombinasi yang sengaja dibuat berat dan membutuhkan tenaga besar untuk diputar, sehingga mustahil dicoba 1 juta kali dalam sedetik."
  },
  {
    term: "Opaque Token",
    cat: "crypto",
    slide: "Slide 34-35",
    def: "String token acak tanpa arti internal (berbeda dari JWT yang memuat klaim JSON). Disimpan dalam bentuk hash SHA-256 di database server sehingga jika database bocor, token aslinya tidak dapat diketahui penyerang.",
    analogy: "Nomor resi penitipan barang di loker. Nomor itu sendiri tidak menjelaskan apa isi barang Anda sampai diverifikasi oleh petugas loker."
  },
  {
    term: "AES-256-GCM (Authenticated Encryption)",
    cat: "crypto",
    slide: "Slide 37-41",
    def: "Algoritme enkripsi simetris modern (AEAD - Authenticated Encryption with Associated Data). Selain mengenkripsi kerahasiaan data (Confidentiality), AES-GCM menghasilkan tag otentikasi 16-byte untuk menjamin integritas (Integrity).",
    analogy: "Brankas baja anti-bobol yang dilapisi segel lilin hologram resmi; jika brankas dicongkel walau 1 milimeter, segel hologram akan rusak dan alarm berbunyi."
  },
  {
    term: "Nonce (Number used Once) / IV",
    cat: "crypto",
    slide: "Slide 37-38",
    def: "Angka acak unik sepanjang 12 byte yang WAJIB digenerasi baru pada setiap operasi enkripsi AES-GCM. Menggunakan ulang nonce yang sama dengan kunci yang sama menghancurkan keamanan enkripsi secara fatal!",
    analogy: "Nomor seri tiket lotre unik. Tidak boleh ada dua pemenang dengan nomor seri tiket yang sama."
  },
  {
    term: "AAD (Additional Authenticated Data)",
    cat: "crypto",
    slide: "Slide 38-41",
    def: "Data konteks (seperti ID tenant, ID record, versi) yang TIDAK dienkripsi tetapi dimasukkan ke dalam perhitungan Authentication Tag kriptografis untuk mencegah serangan pemindahan ciphertext antar-record (Ciphertext Copy-Paste Attack).",
    analogy: "Label nama penerima yang dilem di luar paket brankas; isi surat di dalam terkunci, tetapi nama di luar paket dijamin asli dan tidak bisa ditukar."
  },
  {
    term: "Envelope Encryption (DEK & KEK)",
    cat: "crypto",
    slide: "Slide 43",
    def: "Teknik di mana data dienkripsi dengan DEK (Data Encryption Key), lalu DEK itu sendiri dienkripsi (dibungkus/wrapped) menggunakan KEK (Key Encryption Key) yang tersimpan aman di KMS (Key Management Service).",
    analogy: "Surat rahasia Anda kunci di brankas kecil kamar, lalu kunci brankas kecil itu Anda simpan di dalam brankas baja bank sentral."
  },
  {
    term: "Timeout vs Deadline",
    cat: "reliability",
    slide: "Slide 52-53",
    def: "Timeout adalah batas waktu tunggu untuk satu operasi HTTP tunggal (misal 1500ms). Deadline adalah batas waktu total untuk menyelesaikan keseluruhan intent bisnis, termasuk seluruh percobaan ulang (retry) dan waktu tunggu tidur (sleep).",
    analogy: "Timeout: Menunggu kasir melayani transaksi Anda maks 2 menit. Deadline: Batas waktu total Anda harus sampai di bandara maks 30 menit dari sekarang."
  },
  {
    term: "Exponential Backoff & Jitter",
    cat: "reliability",
    slide: "Slide 55",
    def: "Strategi retry di mana jeda waktu tunggu dilipatgandakan secara eksponensial (misal 200ms -> 400ms -> 800ms) dan ditambahkan variasi acak (Jitter) agar ribuan client yang gagal tidak serempak menyerang server kembali di detik yang sama (Thundering Herd).",
    analogy: "Jika pintu bioskop macet, penonton diatur mundur secara bertahap dan acak beberapa langkah, bukan mendobrak pintu bersamaan."
  },
  {
    term: "Retry-After",
    cat: "reliability",
    slide: "Slide 27, 55, 68",
    def: "Header resmi HTTP respons (biasanya pada status 429 atau 503) yang memberitahu client berapa detik harus menunggu sebelum boleh mencoba mengirimkan permintaan lagi.",
    analogy: "Tanda 'Toko Istirahat, Silakan Kembali 15 Menit Lagi' yang dipasang pemilik toko di depan pintu."
  },
  {
    term: "Idempotency & Idempotency Key",
    cat: "reliability",
    slide: "Slide 56-57",
    def: "Sifat operasi di mana eksekusi berkali-kali menghasilkan efek bisnis yang sama persis dengan eksekusi satu kali. Idempotency Key adalah tanda pengenal unik intent transaksi yang dikirim client agar server tidak menagih biaya/notifikasi ganda saat terjadi jaringan putus (network retry).",
    analogy: "Tombol 'Pesan Sekarang' di aplikasi belanja; jika Anda menekan tombol 5 kali karena koneksi lambat, uang Anda hanya terpotong 1 kali."
  },
  {
    term: "Circuit Breaker",
    cat: "reliability",
    slide: "Slide 58-60, 69",
    def: "Pola stabilitas sistem dengan 3 status (CLOSED, OPEN, HALF-OPEN). Jika dependency eksternal gagal terus-menerus (misal 3 kali berturut-turut), sirkuit berpindah ke OPEN untuk menolak panggilan sementara waktu (cooldown 10s) guna mencegah kelumpuhan total server (Cascading Failure).",
    analogy: "Sakelar MCB meteran listrik rumah yang otomatis jeglek (putus) jika terjadi korsleting, agar kabel rumah Anda tidak terbakar."
  },
  {
    term: "Bulkhead Pattern",
    cat: "reliability",
    slide: "Slide 64",
    def: "Pola isolasi sumber daya (seperti memisahkan connection pool atau worker queue antar vendor) agar jika satu vendor pihak ketiga macet, antrean vendor lain tidak ikut mogok.",
    analogy: "Sekat-sekat kedap air di lambung kapal laut; jika lambung depan bocor terkena karang, air tidak menjalar ke lambung penumpang dan mesin."
  },
  {
    term: "SSRF (Server-Side Request Forgery)",
    cat: "security",
    slide: "Slide 71",
    def: "Celah keamanan di mana penyerang memanipulasi server untuk mengirimkan permintaan jaringan ke sistem internal rahasia (seperti 127.0.0.1, private network, atau cloud metadata 169.254.169.254). Diatasi dengan allowlist domain dan melarang URL bebas dari input pengguna.",
    analogy: "Menipu kurir pengantar paket agar membobol brankas dokumen rahasia di ruang kantor belakang yang tidak boleh dimasuki orang luar."
  },
  {
    term: "Fault Injection",
    cat: "reliability",
    slide: "Slide 65-72",
    def: "Praktik sengaja memasukkan kegagalan (seperti timeout, HTTP 503, lonjakan 429, atau data rusak) ke dalam sistem laboratorium untuk menguji dan membuktikan bahwa kode penanganan kesalahan kita benar-benar bekerja.",
    analogy: "Latihan simulasi kebakaran di gedung perkantoran untuk memastikan sirine, pintu darurat, dan tangga evakuasi berfungsi dengan sempurna."
  }
];

// ==============================================================================
// 2. INITIALIZATION
// ==============================================================================
document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupGlossary();
  await loadUsersAndSetupSession();
  setupBolaTab();
  setupInputTab();
  setupRateLimitTab();
  setupCryptoTab();
  setupProviderTab();
  setupLogsTab();

  // Polling status circuit breaker berkala (tiap 2.5 detik)
  setInterval(pollCircuitStatus, 2500);
});

// ==============================================================================
// 3. TABS NAVIGATION LOGIC
// ==============================================================================
function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");

      tabButtons.forEach((b) => b.classList.remove("active"));
      tabPanels.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });
}

// ==============================================================================
// 4. USERS & SESSION MANAGEMENT
// ==============================================================================
async function loadUsersAndSetupSession() {
  try {
    const res = await fetch("/api/v1/debug/users");
    const data = await res.json();
    if (data.success && data.users) {
      currentUsers = data.users;
      populateUserDropdown();
      setActiveUser("alice");
    }
  } catch (err) {
    console.error("Gagal memuat pengguna:", err);
  }
}

function populateUserDropdown() {
  const select = document.getElementById("user-select");
  select.innerHTML = "";

  currentUsers.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.username;
    opt.textContent = `${u.username.toUpperCase()} (${u.role} · ${u.team_id} · ${u.tenant_id})`;
    select.appendChild(opt);
  });

  select.addEventListener("change", (e) => {
    setActiveUser(e.target.value);
  });
}

function setActiveUser(username) {
  const user = currentUsers.find((u) => u.username === username);
  if (!user) return;

  currentUser = user;
  currentToken = user.sample_token;

  document.getElementById("user-select").value = username;
  document.getElementById("active-token-display").textContent = `Bearer ${currentToken.slice(0, 20)}...`;
  document.getElementById("tag-role").textContent = `Role: ${user.role}`;
  document.getElementById("tag-team").textContent = `Team: ${user.team_id}`;
  document.getElementById("tag-tenant").textContent = `Tenant: ${user.tenant_id}`;

  // Salin token button
  document.getElementById("btn-copy-token").onclick = () => {
    navigator.clipboard.writeText(currentToken);
    alert(`Token Bearer untuk ${user.username} disalin ke clipboard!`);
  };
}

// ==============================================================================
// 5. TAB 1: BOLA & IDOR STUDIO
// ==============================================================================
function setupBolaTab() {
  const btn = document.getElementById("btn-execute-bola");
  btn.addEventListener("click", async () => {
    const targetTaskId = document.getElementById("bola-target-task").value;
    const action = document.querySelector('input[name="bola-action"]:checked').value;

    let method = "GET";
    let endpoint = `/api/v1/tasks/${targetTaskId}`;
    let body = null;
    let headers = {
      Authorization: `Bearer ${currentToken}`,
      "Content-Type": "application/json",
    };

    if (action === "update") {
      method = "PATCH";
      body = JSON.stringify({ title: `Diperbarui oleh ${currentUser.username}`, version: 1 });
    } else if (action === "delete") {
      method = "DELETE";
    } else if (action === "notify") {
      method = "POST";
      endpoint = `/api/v1/tasks/${targetTaskId}/notify?mode=ok`;
      headers["Idempotency-Key"] = `bola-test-${Date.now()}`;
    } else if (action === "collection") {
      method = "GET";
      endpoint = `/api/v1/tasks`;
    }

    // Update curl preview
    let curlStr = `curl -i -X ${method} "http://127.0.0.1:8000${endpoint}" \\\n  -H "Authorization: Bearer ${currentToken.slice(0, 16)}..."`;
    if (headers["Idempotency-Key"]) {
      curlStr += ` \\\n  -H "Idempotency-Key: ${headers["Idempotency-Key"]}"`;
    }
    if (body) {
      curlStr += ` \\\n  -d '${body}'`;
    }
    document.getElementById("bola-curl-preview").textContent = curlStr;

    // Execute request
    try {
      const res = await fetch(endpoint, { method, headers, body });
      const statusChip = document.getElementById("bola-status-chip");
      statusChip.textContent = `STATUS: ${res.status} ${res.statusText}`;
      statusChip.className = "status-code-chip " + (res.ok ? "status-2xx" : (res.status >= 500 ? "status-5xx" : "status-4xx"));

      let resJson = {};
      const resText = await res.text();
      try { resJson = JSON.parse(resText); } catch { resJson = { raw: resText }; }

      document.getElementById("bola-response-json").textContent = JSON.stringify(resJson, null, 2);

      // Security explanation
      const explBox = document.getElementById("bola-security-expl");
      if (res.status === 403) {
        explBox.innerHTML = `
          <strong style="color: #f87171;">🛡️ PENOLAKAN BOLA / IDOR BERHASIL (Status 403 Forbidden)!</strong>
          <p>Pengguna <strong>${currentUser.username}</strong> (${currentUser.role}, tim: ${currentUser.team_id}) terbukti <strong>DITOLAK</strong> saat mencoba ${action} pada tugas milik orang/tim lain.</p>
          <p>Sesuai Slide 12 & 14: Kebijakan <code>can_access</code> di server bekerja optimal mencegah pembocoran objek!</p>
        `;
      } else if (res.status === 200 || res.status === 201 || res.status === 204) {
        explBox.innerHTML = `
          <strong style="color: #34d399;">✅ OPERASI DIIZINKAN (Status ${res.status})</strong>
          <p>Pengguna <strong>${currentUser.username}</strong> memiliki hak wewenang yang sah atas resource ini sesuai kebijakan RBAC dan batas tim/tenant.</p>
        `;
      } else {
        explBox.innerHTML = `<span>Kode respons: ${res.status}. Lihat rincian error pada JSON di atas.</span>`;
      }
    } catch (err) {
      document.getElementById("bola-response-json").textContent = `Network Error: ${err.message}`;
    }
  });
}

// ==============================================================================
// 6. TAB 2: INPUT CONTROL & MASS ASSIGNMENT
// ==============================================================================
function setupInputTab() {
  const btn = document.getElementById("btn-send-input-test");
  btn.addEventListener("click", async () => {
    const titleVal = document.getElementById("input-title").value;
    const descVal = document.getElementById("input-desc").value;

    const injectRole = document.getElementById("chk-inject-role").checked;
    const injectIsAdmin = document.getElementById("chk-inject-isadmin").checked;
    const injectOwner = document.getElementById("chk-inject-owner").checked;
    const oversizeTitle = document.getElementById("chk-oversize-title").checked;
    const malformedJson = document.getElementById("chk-malformed-json").checked;
    const badContentType = document.getElementById("chk-bad-content-type").checked;

    // Reset pipeline tracker visual
    ["step-413", "step-415", "step-400", "step-422", "step-domain"].forEach((id) => {
      const el = document.getElementById(id);
      el.classList.remove("active-layer", "passed-layer");
    });

    let payloadObj = {
      title: oversizeTitle ? "A".repeat(150) : titleVal,
      description: descVal,
    };

    if (injectRole) payloadObj.role = "admin";
    if (injectIsAdmin) payloadObj.is_admin = true;
    if (injectOwner) payloadObj.owner_id = "hacker-999";

    let bodyStr = JSON.stringify(payloadObj);
    if (malformedJson) {
      bodyStr = "{ title: 'rusak', tidak_ada_tutup_kurung ";
    }

    document.getElementById("input-sent-payload").textContent = bodyStr;

    let headers = {
      Authorization: `Bearer ${currentToken}`,
      "Content-Type": badContentType ? "text/plain" : "application/json",
    };

    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers,
        body: bodyStr,
      });

      const statusChip = document.getElementById("input-status-chip");
      statusChip.textContent = `STATUS: ${res.status}`;
      statusChip.className = "status-code-chip " + (res.ok ? "status-2xx" : (res.status >= 500 ? "status-5xx" : "status-4xx"));

      const resJson = await res.json().catch(() => ({}));
      document.getElementById("input-response-json").textContent = JSON.stringify(resJson, null, 2);

      // Highlight pipeline step
      if (res.status === 413) {
        document.getElementById("step-413").classList.add("active-layer");
      } else if (res.status === 415) {
        document.getElementById("step-413").classList.add("passed-layer");
        document.getElementById("step-415").classList.add("active-layer");
      } else if (res.status === 400) {
        document.getElementById("step-413").classList.add("passed-layer");
        document.getElementById("step-415").classList.add("passed-layer");
        document.getElementById("step-400").classList.add("active-layer");
      } else if (res.status === 422) {
        document.getElementById("step-413").classList.add("passed-layer");
        document.getElementById("step-415").classList.add("passed-layer");
        document.getElementById("step-400").classList.add("passed-layer");
        document.getElementById("step-422").classList.add("active-layer");
      } else if (res.status === 201) {
        ["step-413", "step-415", "step-400", "step-422", "step-domain"].forEach((id) => {
          document.getElementById(id).classList.add("passed-layer");
        });
      }
    } catch (err) {
      document.getElementById("input-response-json").textContent = `Error: ${err.message}`;
    }
  });
}

// ==============================================================================
// 7. TAB 3: RATE LIMITING & CORS
// ==============================================================================
function setupRateLimitTab() {
  const slider = document.getElementById("burst-count");
  const sliderVal = document.getElementById("burst-count-val");
  slider.addEventListener("input", () => {
    sliderVal.textContent = slider.value;
  });

  const btnBurst = document.getElementById("btn-fire-burst");
  btnBurst.addEventListener("click", async () => {
    const count = parseInt(slider.value, 10);
    const terminal = document.getElementById("burst-log-terminal");
    terminal.innerHTML = `<p class="term-dim">⚡ Memulai penembakan ${count} request sekaligus...</p>`;

    let successCount = 0;
    let rateLimitedCount = 0;

    const promises = Array.from({ length: count }).map(async (_, idx) => {
      try {
        const res = await fetch("/health");
        if (res.status === 429) {
          rateLimitedCount++;
          const retryAfter = res.headers.get("Retry-After") || "60";
          return `[Req #${idx + 1}] ⛔ HTTP 429 Too Many Requests (Retry-After: ${retryAfter}s)`;
        } else if (res.ok) {
          successCount++;
          return `[Req #${idx + 1}] 🟢 HTTP 200 OK`;
        } else {
          return `[Req #${idx + 1}] ⚠️ HTTP ${res.status}`;
        }
      } catch (err) {
        return `[Req #${idx + 1}] ❌ Error: ${err.message}`;
      }
    });

    const results = await Promise.all(promises);
    terminal.innerHTML = results.slice(0, 30).map((r) => `<p>${r}</p>`).join("");
    if (results.length > 30) {
      terminal.innerHTML += `<p class="term-dim">... dan ${results.length - 30} request lainnya.</p>`;
    }

    // Update meter
    const fill = document.getElementById("rate-meter-fill");
    const meterText = document.getElementById("rate-meter-text");
    const totalRequestsRecorded = Math.min(60, successCount);
    fill.style.width = `${Math.min(100, (totalRequestsRecorded / 60) * 100)}%`;
    meterText.textContent = `${totalRequestsRecorded} / 60 (429 Ditolak: ${rateLimitedCount})`;
  });

  // CORS test
  const btnCors = document.getElementById("btn-test-cors");
  btnCors.addEventListener("click", async () => {
    const origin = document.getElementById("cors-origin-select").value;
    const output = document.getElementById("cors-headers-output");
    output.textContent = `Menguji Origin: ${origin} ...`;

    try {
      // Kirim request ke endpoint tasks dengan header Origin simulasi
      const res = await fetch("/api/v1/tasks", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          Origin: origin,
        },
      });

      const allowedOrigin = res.headers.get("access-control-allow-origin");
      const allowedMethods = res.headers.get("access-control-allow-methods");
      const allowedHeaders = res.headers.get("access-control-allow-headers");

      output.textContent = JSON.stringify(
        {
          tested_origin: origin,
          http_status: res.status,
          cors_headers_received: {
            "access-control-allow-origin": allowedOrigin || "(Tidak Dikirim / Ditolak)",
            "access-control-allow-methods": allowedMethods || "(None)",
            "access-control-allow-headers": allowedHeaders || "(None)",
          },
          conclusion: allowedOrigin ? "✅ DISETUJUI OLEH SERVER" : "⛔ DIBLOKIR / TIDAK DIIZINKAN",
        },
        null,
        2
      );
    } catch (err) {
      output.textContent = `Error: ${err.message}`;
    }
  });
}

// ==============================================================================
// 8. TAB 4: KRIPTOGRAFI & AES-256-GCM
// ==============================================================================
function setupCryptoTab() {
  const btn = document.getElementById("btn-run-crypto");
  btn.addEventListener("click", async () => {
    const plaintext = document.getElementById("crypto-plaintext").value;
    const aad = document.getElementById("crypto-aad").value;
    const tamper = document.getElementById("chk-crypto-tamper").checked;

    try {
      const res = await fetch("/api/v1/debug/crypto-interactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaintext, aad, tamper }),
      });

      const data = await res.json();
      const statusChip = document.getElementById("crypto-status-chip");

      if (data.tampered && data.verification_failed) {
        statusChip.textContent = "INTEGRITY VIOLATION (TAMPER DETECTED)";
        statusChip.className = "status-code-chip status-5xx";
      } else {
        statusChip.textContent = "VERIFIED (GMAC AUTH OK)";
        statusChip.className = "status-code-chip status-2xx";
      }

      document.getElementById("crypto-enc-output").textContent = JSON.stringify(
        {
          algorithm: data.encryption_result?.algorithm,
          nonce_12bytes: data.encryption_result?.nonceHex,
          authTag_16bytes: data.encryption_result?.authTagHex,
          aad_context: data.aad,
          ciphertext_hex: data.encryption_result?.ciphertextHex,
        },
        null,
        2
      );

      document.getElementById("crypto-dec-output").textContent = JSON.stringify(
        {
          decrypted_plaintext: data.decryption_result,
          verification_failed: data.verification_failed,
          crypto_exception: data.error_message || "None (Tag GMAC Sesuai)",
        },
        null,
        2
      );

      const tamperBox = document.getElementById("crypto-tamper-box");
      if (data.tampered) {
        tamperBox.style.display = "block";
        tamperBox.className = "info-alert";
        tamperBox.innerHTML = `
          <strong style="color: #f87171;">🛡️ Pembuktian Slide 40 Berhasil:</strong>
          <p>Ciphertext dimanipulasi 1 bit (XOR 1). Mesin kriptografi <code>aes-256-gcm</code> langsung <strong>menolak</strong> dan melempar eksepsi: <em>"${data.error_message}"</em>.</p>
          <p>Data palsu TIDAK BISA dipulihkan sebagai plaintext!</p>
        `;
      } else {
        tamperBox.style.display = "none";
      }
    } catch (err) {
      document.getElementById("crypto-dec-output").textContent = `Error: ${err.message}`;
    }
  });
}

// ==============================================================================
// 9. TAB 5: INTEGRASI & FAULT INJECTION
// ==============================================================================
function setupProviderTab() {
  const btnIdem = document.getElementById("btn-generate-idem-key");
  btnIdem.addEventListener("click", () => {
    document.getElementById("fault-idempotency-key").value = `notif-key-${Math.random().toString(36).slice(2, 10)}`;
  });

  const btnCall = document.getElementById("btn-call-notify");
  btnCall.addEventListener("click", async () => {
    const mode = document.getElementById("fault-mode-select").value;
    const idemKey = document.getElementById("fault-idempotency-key").value;
    const alterPayload = document.getElementById("chk-alter-payload").checked;

    // Ambil target task Alice
    const taskId = "task-alice-101";

    let headers = {
      Authorization: `Bearer ${currentToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idemKey,
      "X-Mock-Mode": mode,
    };

    let endpoint = `/api/v1/tasks/${taskId}/notify?mode=${mode}`;
    if (alterPayload) {
      // Ubah payload di mock langsung untuk menguji tabrakan 409
      endpoint += "&altered=true";
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
      });

      const statusChip = document.getElementById("notify-status-chip");
      statusChip.textContent = `STATUS: ${res.status}`;
      statusChip.className = "status-code-chip " + (res.ok ? "status-2xx" : (res.status >= 500 ? "status-5xx" : "status-4xx"));

      const resJson = await res.json().catch(() => ({}));
      document.getElementById("notify-response-json").textContent = JSON.stringify(resJson, null, 2);

      // Refresh status sirkuit & mock records
      await pollCircuitStatus();
      await refreshMockRecords();
    } catch (err) {
      document.getElementById("notify-response-json").textContent = `Error: ${err.message}`;
    }
  });

  const btnResetCb = document.getElementById("btn-reset-circuit");
  btnResetCb.addEventListener("click", async () => {
    await fetch("/api/v1/debug/circuit-reset", { method: "POST" });
    await pollCircuitStatus();
    alert("Circuit Breaker berhasil di-reset ke CLOSED!");
  });

  const btnRefreshRec = document.getElementById("btn-refresh-mock-records");
  btnRefreshRec.addEventListener("click", refreshMockRecords);
}

async function pollCircuitStatus() {
  try {
    const res = await fetch("/api/v1/debug/circuit-status");
    const data = await res.json();
    if (!data.circuit) return;

    const cb = data.circuit;
    const pill = document.getElementById("global-circuit-pill");
    const text = document.getElementById("global-circuit-text");
    const badge = document.getElementById("cb-state-badge");
    const failCount = document.getElementById("cb-fail-count");
    const cooldownText = document.getElementById("cb-cooldown-text");

    text.textContent = `CIRCUIT: ${cb.state}`;
    pill.className = "circuit-indicator " + cb.state.toLowerCase();

    badge.textContent = cb.state;
    badge.className = "badge " + (cb.state === "CLOSED" ? "badge-green" : (cb.state === "OPEN" ? "badge-red" : "badge-yellow"));

    failCount.textContent = `${cb.failures} / ${cb.threshold}`;
    cooldownText.textContent = `Cooldown: ${cb.cooldown_remaining_seconds} detik`;
  } catch {}
}

async function refreshMockRecords() {
  try {
    // Port 8001 mock records
    const res = await fetch("http://127.0.0.1:8001/records");
    const data = await res.json();
    const tbody = document.getElementById("tbody-mock-records");
    if (!data.records || data.records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center">Belum ada rekaman tersimpan di SQLite Mock</td></tr>`;
      return;
    }

    tbody.innerHTML = data.records.slice(0, 10).map((r) => {
      let notifId = "-";
      try {
        const parsed = JSON.parse(r.response_body);
        notifId = parsed.notificationId || "-";
      } catch {}

      return `
        <tr>
          <td><code>${r.idempotency_key}</code></td>
          <td><code>${r.payload_hash.slice(0, 10)}...</code></td>
          <td><span class="badge ${r.response_status === 200 ? 'badge-green' : 'badge-red'}">${r.response_status}</span></td>
          <td><code>${notifId}</code></td>
        </tr>
      `;
    }).join("");
  } catch {
    document.getElementById("tbody-mock-records").innerHTML = `
      <tr><td colspan="4" class="text-center text-dim">Mock Provider (:8001) tidak terjangkau langsung via browser.</td></tr>
    `;
  }
}

// ==============================================================================
// 10. TAB 6: OBSERVABILITY & LOGS
// ==============================================================================
function setupLogsTab() {
  const container = document.getElementById("logs-container");
  const btnRefresh = document.getElementById("btn-refresh-logs");
  const btnClear = document.getElementById("btn-clear-logs-view");

  async function fetchLogs() {
    try {
      const res = await fetch("/api/v1/debug/logs");
      const data = await res.json();
      if (!data.logs || data.logs.length === 0) {
        container.innerHTML = `<p class="term-dim">// Belum ada log tercatat.</p>`;
        return;
      }

      container.innerHTML = data.logs.map((log) => {
        const statusClass = log.status >= 500 ? "status-5xx" : (log.status >= 400 ? "status-4xx" : "status-2xx");
        return `
          <div class="log-row">
            <div class="log-left">
              <span class="log-req-id">${log.request_id}</span>
              <span class="log-method">${log.method}</span>
              <span class="log-path">${log.path}</span>
            </div>
            <div class="log-right">
              <span class="status-code-chip ${statusClass}">${log.status}</span>
              <span class="log-latency">${log.latency_ms}ms</span>
            </div>
          </div>
        `;
      }).join("");
    } catch (err) {
      container.innerHTML = `<p class="text-dim">Gagal memuat log: ${err.message}</p>`;
    }
  }

  btnRefresh.addEventListener("click", fetchLogs);
  btnClear.addEventListener("click", () => {
    container.innerHTML = `<p class="term-dim">// Tampilan dibersihkan.</p>`;
  });

  // Muat pertama kali
  fetchLogs();
}

// ==============================================================================
// 11. TAB 7: GLOSARIUM KOSAKATA LENGKAP
// ==============================================================================
function setupGlossary() {
  const grid = document.getElementById("glossary-grid");
  const searchInput = document.getElementById("glossary-search");
  const filterPills = document.querySelectorAll(".filter-pill");

  let activeCategory = "all";

  function render() {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = GLOSSARY_DATA.filter((item) => {
      const matchesCat = activeCategory === "all" || item.cat === activeCategory;
      const matchesQuery = item.term.toLowerCase().includes(query) ||
                           item.def.toLowerCase().includes(query) ||
                           item.analogy.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<p class="text-dim">Tidak ada istilah yang cocok dengan pencarian '${query}'.</p>`;
      return;
    }

    grid.innerHTML = filtered.map((item) => `
      <div class="glossary-card">
        <div class="glossary-title-row">
          <span class="glossary-title">${item.term}</span>
          <span class="glossary-cat-tag">${item.slide}</span>
        </div>
        <p class="glossary-def">${item.def}</p>
        <div class="glossary-analogy">💡 <strong>Analogi:</strong> ${item.analogy}</div>
      </div>
    `).join("");
  }

  searchInput.addEventListener("input", render);

  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      filterPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      activeCategory = pill.getAttribute("data-cat");
      render();
    });
  });

  render();
}
