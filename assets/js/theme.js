/**
 * theme.js — PrinceGames Dark / Light Mode
 * Include di semua halaman sebelum </body>
 * Tombol dipasang di topbar / header secara otomatis
 */

(function () {
  /* ── 1. Variabel warna Dark & Light ── */
  const THEMES = {
    dark: {
      '--bg':       '#0d1117',
      '--surface':  '#161b22',
      '--surface2': '#1c2128',
      '--border':   'rgba(255,255,255,0.08)',
      '--border2':  'rgba(255,255,255,0.05)',
      '--text':     '#e6edf3',
      '--muted':    '#7d8590',
      /* customer page */
      '--card':     'rgba(17,23,31,0.9)',
      /* auth/shared */
      '--card-bg':  'rgba(13,21,32,0.85)',
    },
    light: {
      '--bg':       '#f0f4f8',
      '--surface':  '#ffffff',
      '--surface2': '#eaf0f6',
      '--border':   'rgba(0,0,0,0.10)',
      '--border2':  'rgba(0,0,0,0.07)',
      '--text':     '#0d1117',
      '--muted':    '#5a6a7a',
      '--card':     'rgba(255,255,255,0.95)',
      '--card-bg':  'rgba(240,244,248,0.95)',
    },
  };

  /* warna aksen tetap sama di kedua mode */
  const ACCENT = {
    '--cyan':   '#00d9ff',
    '--purple': '#b026ff',
    '--green':  '#3fb950',
    '--orange': '#f78166',
    '--red':    '#ff4d4f',
    '--yellow': '#e3b341',
  };

  /* ── 2. Apply tema ke :root ── */
  function applyTheme(mode) {
    const root = document.documentElement;
    const vars = { ...THEMES[mode], ...ACCENT };
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

    /* body background langsung (beberapa halaman pakai background-color inline) */
    document.body.style.backgroundColor = THEMES[mode]['--bg'];
    document.body.style.color = THEMES[mode]['--text'];

    /* simpan preferensi */
    localStorage.setItem('pg-theme', mode);

    /* update semua tombol toggle yang ada di halaman */
    document.querySelectorAll('.pg-theme-btn').forEach(btn => {
      btn.innerHTML = mode === 'dark'
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
      btn.title = mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });

    /* tambah class ke body supaya bisa di-style manual jika perlu */
    document.body.classList.toggle('light-mode', mode === 'light');
  }

  /* ── 3. Toggle ── */
  function toggleTheme() {
    const current = localStorage.getItem('pg-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  /* ── 4. Buat elemen tombol ── */
  function createBtn() {
    const btn = document.createElement('button');
    btn.className = 'pg-theme-btn nav-btn';   /* nav-btn = style existing topbar */
    btn.style.cssText = 'padding:6px 10px;font-size:13px;min-width:32px;';
    btn.onclick = toggleTheme;
    return btn;
  }

  /* ── 5. Inject tombol ke topbar / header ── */
  function injectButton() {
    /* Coba berbagai selector yang dipakai di halaman-halaman PrinceGames */
    const targets = [
      '#topbar-actions',           /* dashboard-owner, dashboard-staff */
      '.btn-out-hdr',              /* dashboard-customer (insert before) */
      'header .flex',              /* fallback */
      '.topbar',                   /* fallback */
    ];

    let injected = false;

    /* Kasus khusus: #topbar-actions → append langsung (sebelum logout) */
    const topbarActions = document.getElementById('topbar-actions');
    if (topbarActions) {
      const logoutBtn = topbarActions.querySelector('.btn-logout');
      const btn = createBtn();
      if (logoutBtn) topbarActions.insertBefore(btn, logoutBtn);
      else topbarActions.appendChild(btn);
      injected = true;
    }

    /* Kasus: header customer (ada .btn-out-hdr) */
    if (!injected) {
      const outBtn = document.querySelector('.btn-out-hdr');
      if (outBtn) {
        const btn = createBtn();
        outBtn.parentElement.insertBefore(btn, outBtn);
        injected = true;
      }
    }

    /* Fallback: tempel di topbar paling kanan */
    if (!injected) {
      const topbar = document.querySelector('.topbar') || document.querySelector('header');
      if (topbar) {
        const btn = createBtn();
        btn.style.marginLeft = 'auto';
        topbar.appendChild(btn);
      }
    }
  }

  /* ── 6. Inisialisasi ── */
  function init() {
    const saved = localStorage.getItem('pg-theme') || 'dark';
    applyTheme(saved);   /* apply dulu sebelum tombol muncul → no flash */
    injectButton();
  }

  /* Jalankan setelah DOM siap */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* expose ke global jika perlu dipanggil manual */
  window.pgTheme = { toggle: toggleTheme, apply: applyTheme };
})();
