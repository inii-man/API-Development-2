// ==============================================================================
// BERKAS: src/services/circuitBreaker.js
// TUJUAN: Implementasi pola ketahanan (Reliability Pattern) Circuit Breaker.
// RUJUKAN SLIDE:
//   - Slide 58: Circuit breaker: closed, open, half-open
//   - Slide 59: Kode: kelas Circuit (1/2)
//   - Slide 60: Kode: kelas Circuit (2/2)
//   - Slide 69: Setelah tiga intent gagal: 503 CIRCUIT_OPEN langsung
// ==============================================================================

/**
 * Kelas Circuit merepresentasikan state machine Circuit Breaker.
 * Mencegah cascading failure dengan menghentikan sementara panggilan ke dependency
 * eksternal yang sedang mengalami kegagalan berulang.
 */
export class Circuit {
  // Menghitung jumlah kegagalan berturut-turut (Slide 59)
  failures = 0;

  // Timestamp (ms) batas waktu pemblokiran sirkuit saat berstatus OPEN (Slide 59)
  until = 0;

  // Batas toleransi kegagalan sebelum circuit berpindah ke status OPEN (Slide 60: >= 3)
  threshold = 3;

  // Durasi masa istirahat (cooldown) saat circuit OPEN dalam milidetik (Slide 60: 10_000 ms = 10 detik)
  cooldownMs = 10_000;

  /**
   * Memeriksa apakah sirkuit saat ini sedang memblokir panggilan (Slide 59).
   * @returns {boolean} true jika waktu sekarang masih dalam masa cooldown (OPEN)
   */
  blocked() {
    return Date.now() < this.until;
  }

  /**
   * Mencatat hasil operasi ke sirkuit (Slide 60).
   * @param {boolean} ok - true jika panggilan eksternal berhasil, false jika gagal
   */
  result(ok) {
    if (ok) {
      // Jika berhasil, pulihkan sirkuit ke kondisi normal (CLOSED)
      this.failures = 0;
      this.until = 0;
    } else {
      // Jika gagal, tambahkan counter kegagalan
      this.failures += 1;

      // Jika jumlah kegagalan mencapai batas (3 intent), buka sirkuit selama 10 detik (Slide 60 & 69)
      if (this.failures >= this.threshold) {
        this.until = Date.now() + this.cooldownMs;
      }
    }
  }

  /**
   * Mengetahui status terkini sirkuit: CLOSED, OPEN, atau HALF-OPEN (Slide 58)
   * @returns {'CLOSED' | 'OPEN' | 'HALF-OPEN'}
   */
  getState() {
    const now = Date.now();
    if (now < this.until) {
      return "OPEN";
    }
    // Jika masa cooldown habis tetapi sebelumnya pernah gagal, masuki fase uji coba (HALF-OPEN)
    if (this.failures >= this.threshold && now >= this.until && this.until > 0) {
      return "HALF-OPEN";
    }
    return "CLOSED";
  }

  /**
   * Mengambil informasi diagnostik detail untuk ditampilkan di Web Playground
   * @returns {object} Metadata status sirkuit
   */
  getStatusInfo() {
    const state = this.getState();
    const remainingMs = Math.max(0, this.until - Date.now());
    return {
      state,
      failures: this.failures,
      threshold: this.threshold,
      blocked: this.blocked(),
      cooldown_remaining_seconds: Math.ceil(remainingMs / 1000),
      until_timestamp: this.until,
    };
  }

  /**
   * Mengatur ulang (reset) state sirkuit ke kondisi awal (berguna untuk pengujian lab)
   */
  reset() {
    this.failures = 0;
    this.until = 0;
  }
}

// Mengekspor instance singleton tunggal untuk adapter notifikasi TaskHub
export const notificationCircuit = new Circuit();
