# PRINCE GAMES — Struktur Proyek

```
PRINCEGAMES/
│
├── pages/                  → Semua halaman HTML per role
│   ├── auth/               → Halaman masuk & daftar (semua role)
│   │   ├── index.html              Landing page / pilih role
│   │   ├── login-owner.html
│   │   ├── login-staff.html
│   │   ├── login-pelanggan.html
│   │   ├── daftar-owner.html
│   │   ├── daftar-staff.html
│   │   └── daftar-pelanggan.html
│   │
│   ├── owner/              → Halaman khusus Owner
│   │   ├── dashboard-owner.html    KPI, pendapatan, laporan
│   │   ├── manage-owner.html       Kelola unit & harga
│   │   ├── history-owner.html      Riwayat semua transaksi
│   │   ├── export-owner.html       Export laporan
│   │   └── init-units.html         Setup awal unit
│   │
│   ├── staff/              → Halaman khusus Staff
│   │   ├── dashboard-staff.html    Kontrol sesi, booking, F&B
│   │   ├── history-staff.html      Riwayat sesi staff
│   │   └── pilih-shift.html        Pilih shift kerja
│   │
│   ├── pelanggan/          → Halaman khusus Pelanggan
│   │   ├── dashboard-customer.html Dashboard & riwayat pelanggan
│   │   ├── booking.html            Form booking sesi
│   │   ├── payment.html            Pembayaran rental
│   │   ├── payment-booking.html    Pembayaran booking
│   │   └── rental-bawapulang.html  Rental bawa pulang (step wizard)
│   │
│   └── shared/             → Halaman yang dipakai lebih dari 1 role
│
├── assets/                 → File statis (CSS, JS, gambar)
│   ├── css/
│   │   └── style.css               Global stylesheet
│   └── js/
│       ├── auth.js                 Firestore helpers & auth exports
│       ├── firebase-config.js      Konfigurasi Firebase
│       ├── services/
│       │   └── authService.js      Service login/logout/register
│       └── utils/
│           └── rentalnotif.js      Notifikasi rental real-time
│
└── docs/                   → File debug & patch (bukan produksi)
    ├── debug-history.html
    └── PATCH-rental-bawapulang.html
```

## Alur Navigasi

```
index.html (auth/)
    ├── login-owner     → dashboard-owner  → manage / history / export
    ├── login-staff     → pilih-shift      → dashboard-staff → history-staff
    └── login-pelanggan → dashboard-customer → booking → payment
                                             └── rental-bawapulang → payment
```

## Catatan
- Semua path asset sudah disesuaikan dengan struktur baru (`../../assets/...`)
- Semua link antar halaman sudah diperbarui ke path relatif baru
- Folder `shared/` disiapkan untuk halaman yang nantinya dipakai lebih dari 1 role
- Folder `docs/` berisi file maintenance, **jangan deploy ke produksi**
