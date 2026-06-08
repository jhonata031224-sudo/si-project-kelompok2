// assets/js/utils/confirmnotif.js
// Notifikasi realtime ke pelanggan saat staff klik Setujui atau Tolak

import { db } from '../auth.js';
import {
    collection, query, where, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── Status yang ditulis staff ke Firestore ────────────────────────────────────
// Setujui booking (ewallet)  → 'Aktif'
// Setujui booking (cash)     → 'Menunggu Pembayaran'
// Setujui rental             → 'Aktif'
// Tolak                      → 'Ditolak'

const STATUS_DISETUJUI        = 'aktif';
const STATUS_MENUNGGU_BAYAR   = 'menunggu pembayaran';
const STATUS_DITOLAK          = 'ditolak';

function normalize(s) { return (s || '').toLowerCase().trim(); }

// ── sessionStorage: cegah notif muncul dobel dalam satu sesi ─────────────────
// Pakai sessionStorage (bukan localStorage) agar tiap buka tab baru / refresh
// tetap bisa menerima notif jika status berubah lagi di sesi yang berbeda.
function getFlag(key)      { try { return sessionStorage.getItem(key); }  catch { return null; } }
function setFlag(key)      { try { sessionStorage.setItem(key, '1'); }    catch {} }

// ── Suara via Web Audio API ───────────────────────────────────────────────────
function playSound(type) {
    try {
        const ctx    = new (window.AudioContext || window.webkitAudioContext)();
        const notes  = type === 'approve'
            ? [523, 659, 784, 1047]   // nada naik — disetujui
            : [440, 370, 294];         // nada turun — ditolak
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator(), g = ctx.createGain();
            osc.connect(g); g.connect(ctx.destination);
            osc.type = 'sine'; osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.15;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.35, t + 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.start(t); osc.stop(t + 0.45);
        });
    } catch(e) {}
}

// ── CSS (inject sekali) ───────────────────────────────────────────────────────
function injectCSS() {
    if (document.getElementById('cn-style')) return;
    const el = document.createElement('style');
    el.id = 'cn-style';
    el.textContent = `
        @keyframes cnSlideIn  { from { transform:translateX(110%); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes cnSlideOut { from { transform:translateX(0); opacity:1; }   to { transform:translateX(110%); opacity:0; } }
        @keyframes cnBounce   { 0%{transform:scale(.5);opacity:0} 65%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }

        #cn-toasts {
            position:fixed; bottom:90px; right:16px; z-index:99999;
            display:flex; flex-direction:column; gap:10px; pointer-events:none;
        }
        .cn-t {
            background:#0d1b2a; border-radius:14px; padding:12px 14px;
            min-width:240px; max-width:300px;
            display:flex; align-items:center; gap:10px;
            box-shadow:0 8px 30px rgba(0,0,0,.6);
            animation:cnSlideIn .35s cubic-bezier(.34,1.56,.64,1) both;
            pointer-events:all; cursor:pointer;
        }
        .cn-t.ok   { border:1px solid rgba(34,197,94,.4); }
        .cn-t.pay  { border:1px solid rgba(251,146,60,.4); }
        .cn-t.no   { border:1px solid rgba(239,68,68,.35); }
        .cn-t .cn-ico { width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0; }
        .cn-t.ok  .cn-ico { background:rgba(34,197,94,.12); }
        .cn-t.pay .cn-ico { background:rgba(251,146,60,.12); }
        .cn-t.no  .cn-ico { background:rgba(239,68,68,.12); }
        .cn-t .cn-ttl { font-size:12px;font-weight:800;line-height:1.3; }
        .cn-t.ok  .cn-ttl { color:#22c55e; }
        .cn-t.pay .cn-ttl { color:#fb923c; }
        .cn-t.no  .cn-ttl { color:#ef4444; }
        .cn-t .cn-sub { font-size:10px;color:#9ca3af;margin-top:2px; }

        .cn-popup      { border:1px solid rgba(34,197,94,.25) !important; border-radius:22px !important; max-width:350px !important; }
        .cn-popup-pay  { border:1px solid rgba(251,146,60,.3) !important; border-radius:22px !important; max-width:350px !important; }
        .cn-popup-no   { border:1px solid rgba(239,68,68,.25) !important; border-radius:22px !important; max-width:350px !important; }
    `;
    document.head.appendChild(el);
}

// ── Toast kecil ───────────────────────────────────────────────────────────────
function toast(variant, icon, title, sub) {
    let wrap = document.getElementById('cn-toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'cn-toasts'; document.body.appendChild(wrap); }

    const el = document.createElement('div');
    el.className = `cn-t ${variant}`;
    el.innerHTML = `<div class="cn-ico">${icon}</div><div><div class="cn-ttl">${title}</div><div class="cn-sub">${sub}</div></div>`;
    wrap.appendChild(el);

    const remove = () => { el.style.animation = 'cnSlideOut .3s ease forwards'; setTimeout(() => el.remove(), 300); };
    el.onclick = remove;
    setTimeout(remove, 6000);
}

// ── Popup besar ───────────────────────────────────────────────────────────────
function popup(variant, item, itemType) {
    const isBooking = itemType === 'booking';
    const label     = isBooking ? 'Booking' : 'Rental Bawa Pulang';
    const nama      = item.console || 'Unit';
    const dur       = (item.duration || '?') + ' Jam';
    const total     = (item.grandTotal || item.total || 0).toLocaleString('id-ID');
    const jadwal    = item.date ? item.date + (item.time ? ' · ' + item.time : '') : '—';
    const batas     = item.endTime
        ? new Date(item.endTime).toLocaleString('id-ID', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
        : '—';

    // ── Baris detail reusable ──
    const row = (label, val, color = '#fff') =>
        `<div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:10px;color:#6b7280;font-weight:700">${label}</span>
            <span style="font-size:12px;font-weight:800;color:${color}">${val}</span>
        </div>`;

    if (variant === 'ok' || variant === 'pay') {
        const isOk       = variant === 'ok';
        const accent     = isOk ? '#22c55e' : '#fb923c';
        const borderRgba = isOk ? 'rgba(34,197,94,.15)' : 'rgba(251,146,60,.2)';
        const popupClass = isOk ? 'cn-popup' : 'cn-popup-pay';
        const icoColor   = isOk ? 'rgba(34,197,94,.08)' : 'rgba(251,146,60,.08)';
        const icoBorder  = isOk ? 'rgba(34,197,94,.4)' : 'rgba(251,146,60,.4)';
        const icoEl      = isOk
            ? `<i class="fas fa-circle-check" style="font-size:30px;color:${accent}"></i>`
            : `<span style="font-size:30px">💳</span>`;
        const headline   = isOk ? `${label} Dikonfirmasi! 🎉` : `${label} Disetujui!`;
        const subline    = isOk
            ? 'Staff sudah mengkonfirmasi pesananmu'
            : 'Pesananmu di-acc — selesaikan pembayaran cash ke staff';
        const catatan    = isOk
            ? (isBooking ? '📅 Datang tepat waktu sesuai jadwal ya!' : '📦 Segera ambil konsol & siapkan jaminanmu!')
            : '⚠️ Segera datang & bayar ke staff agar booking tidak batal!';

        const detailRows = isBooking
            ? [row('UNIT', nama), row('DURASI', dur), row('JADWAL', jadwal, accent), row('TOTAL', 'Rp ' + total, accent)]
            : [row('KONSOL', nama), row('DURASI', dur), row('BATAS KEMBALI', batas, '#f59e0b')];

        Swal.fire({
            background: '#0a1628', color: '#fff',
            showConfirmButton: true, showCancelButton: true,
            confirmButtonText: isOk ? '✓ Lihat Detail' : '💳 Menuju Pembayaran',
            cancelButtonText: 'Tutup',
            confirmButtonColor: accent,
            cancelButtonColor: '#1f2937',
            allowOutsideClick: true,
            customClass: { popup: popupClass },
            html: `
                <div style="text-align:center;padding:6px 0">
                    <div style="width:68px;height:68px;border-radius:50%;background:${icoColor};border:2px solid ${icoBorder};
                         display:flex;align-items:center;justify-content:center;margin:0 auto 14px;animation:cnBounce .5s ease">
                        ${icoEl}
                    </div>
                    <p style="font-size:18px;font-weight:900;letter-spacing:-.5px;margin-bottom:4px;color:${accent}">${headline}</p>
                    <p style="font-size:11px;color:#9ca3af;margin-bottom:16px">${subline}</p>
                    <div style="background:rgba(255,255,255,.04);border:1px solid ${borderRgba};border-radius:12px;padding:12px 14px;
                         display:flex;flex-direction:column;gap:9px">
                        ${detailRows.join('')}
                    </div>
                    <p style="font-size:10px;color:#f59e0b;margin-top:14px;font-weight:600">${catatan}</p>
                </div>
            `
        }).then(r => { if (r.isConfirmed) window.location.href = 'dashboard-customer.html?history=1'; });

    } else {
        // Ditolak
        Swal.fire({
            background: '#0a1628', color: '#fff',
            showConfirmButton: true,
            confirmButtonText: 'Mengerti',
            confirmButtonColor: '#ef4444',
            allowOutsideClick: true,
            customClass: { popup: 'cn-popup-no' },
            html: `
                <div style="text-align:center;padding:6px 0">
                    <div style="width:68px;height:68px;border-radius:50%;background:rgba(239,68,68,.08);border:2px solid rgba(239,68,68,.35);
                         display:flex;align-items:center;justify-content:center;margin:0 auto 14px;animation:cnBounce .5s ease">
                        <i class="fas fa-circle-xmark" style="font-size:30px;color:#ef4444"></i>
                    </div>
                    <p style="font-size:18px;font-weight:900;letter-spacing:-.5px;margin-bottom:4px;color:#ef4444">${label} Ditolak</p>
                    <p style="font-size:11px;color:#9ca3af;margin-bottom:12px">
                        Pesanan <strong style="color:#fff">${nama}</strong> tidak dapat diproses.
                    </p>
                    <p style="font-size:11px;color:#f59e0b;font-weight:600">💬 Hubungi staff untuk info lebih lanjut.</p>
                </div>
            `
        });
    }
}

// ── Listener utama ────────────────────────────────────────────────────────────
function buatListener(uid, namaKoleksi, itemType, filterExtra) {
    let q = query(collection(db, namaKoleksi), where('userId', '==', uid));
    if (filterExtra) {
        q = query(collection(db, namaKoleksi), where('userId', '==', uid), where(filterExtra[0], filterExtra[1], filterExtra[2]));
    }

    const statusSebelumnya = {};
    let pertamaKali = true;

    return onSnapshot(q, snap => {
        if (pertamaKali) {
            // Simpan status awal, jangan trigger notif
            snap.docs.forEach(d => { statusSebelumnya[d.id] = normalize(d.data().status); });
            pertamaKali = false;
            return;
        }

        snap.docChanges().forEach(change => {
            if (change.type === 'removed') { delete statusSebelumnya[change.doc.id]; return; }

            const item    = { id: change.doc.id, ...change.doc.data() };
            const baru    = normalize(item.status);
            const lama    = statusSebelumnya[change.doc.id] ?? '';
            statusSebelumnya[change.doc.id] = baru;

            // Tidak ada perubahan status → skip
            if (baru === lama) return;

            // ── Disetujui (ewallet / rental) → 'Aktif' ───────────────────
            if (baru === STATUS_DISETUJUI && lama !== STATUS_DISETUJUI) {
                const key = `cn_ok_${item.id}`;
                if (getFlag(key)) return;
                setFlag(key);
                playSound('approve');
                toast('ok', '✅', itemType === 'booking' ? 'Booking Dikonfirmasi! 🎉' : 'Rental Disetujui! 🎉',
                      `${item.console || 'Unit'} · ${item.duration || '?'} Jam`);
                setTimeout(() => popup('ok', item, itemType), 800);
            }

            // ── Disetujui booking cash → 'Menunggu Pembayaran' ───────────
            else if (baru === STATUS_MENUNGGU_BAYAR && lama !== STATUS_MENUNGGU_BAYAR) {
                const key = `cn_pay_${item.id}`;
                if (getFlag(key)) return;
                setFlag(key);
                playSound('approve');
                toast('pay', '💳', 'Booking Disetujui — Segera Bayar!',
                      `${item.console || 'Unit'} · Selesaikan pembayaran cash`);
                setTimeout(() => popup('pay', item, itemType), 800);
            }

            // ── Ditolak → 'Ditolak' ───────────────────────────────────────
            else if (baru === STATUS_DITOLAK && lama !== STATUS_DITOLAK) {
                const key = `cn_no_${item.id}`;
                if (getFlag(key)) return;
                setFlag(key);
                playSound('reject');
                toast('no', '❌', itemType === 'booking' ? 'Booking Ditolak' : 'Rental Ditolak',
                      `${item.console || 'Unit'} · Hubungi staff`);
                setTimeout(() => popup('no', item, itemType), 800);
            }
        });
    }, err => console.error('[confirmnotif]', namaKoleksi, err));
}

// ── Export ────────────────────────────────────────────────────────────────────
export function listenKonfirmasiNotif(uid) {
    if (!uid) return () => {};
    injectCSS();

    // Safety: tutup popup Swal yang mungkin nyangkut dari sesi sebelumnya
    try { if (typeof Swal !== 'undefined') Swal.close(); } catch(e) {}

    const unsubBooking = buatListener(uid, 'bookings', 'booking', null);
    const unsubRental  = buatListener(uid, 'rentals',  'rental',  ['type', '==', 'bawa_pulang']);

    return () => { unsubBooking(); unsubRental(); };
}