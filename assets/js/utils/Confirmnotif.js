// assets/js/utils/confirmnotif.js
// Notifikasi popup pelanggan saat:
//  1. Booking dikonfirmasi staff → status 'Aktif' atau 'Menunggu Pembayaran'
//  2. Rental bawa pulang dikonfirmasi → status 'Aktif'
//  3. Booking/Rental ditolak → status 'Ditolak'

import { db } from '../auth.js';
import {
    collection, query, where, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── Status yang dianggap "dikonfirmasi" ───────────────────────────────────────
// Booking cash  → 'Menunggu Pembayaran'  (staff sudah approve, tinggal bayar)
// Booking ewallet → 'Aktif'
// Rental        → 'Aktif'
const STATUS_KONFIRMASI = [
    'aktif',
    'menunggu pembayaran',   // booking cash: sudah di-acc staff, tinggal bayar
    'disetujui',
    'aktif rental',
    'siap diambil',
    'dikonfirmasi'
];
const STATUS_DITOLAK = ['ditolak', 'dibatalkan staff', 'dibatalkan', 'batal'];

// Status awal (sebelum staff action) — jangan trigger notif dari sini
const STATUS_AWAL = ['menunggu konfirmasi staff', 'menunggu', 'pending'];

function isKonfirmasi(status) {
    const s = (status || '').toLowerCase().trim();
    return STATUS_KONFIRMASI.some(k => s === k || s.includes(k));
}
function isDitolak(status) {
    const s = (status || '').toLowerCase().trim();
    return STATUS_DITOLAK.some(k => s === k || s.includes(k));
}
function isStatusAwal(status) {
    const s = (status || '').toLowerCase().trim();
    return !status || STATUS_AWAL.some(k => s === k || s.includes(k));
}

// ── LocalStorage helpers (cegah notif dobel) ─────────────────────────────────
function getFlag(key)      { try { return localStorage.getItem(key); }    catch { return null; } }
function setFlag(key, val) { try { localStorage.setItem(key, val); }      catch {} }

// ── Web Audio: suara notifikasi ───────────────────────────────────────────────
function playSound(type = 'approve') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (type === 'approve') {
            [523, 659, 784, 1047].forEach((freq, i) => {
                const osc = ctx.createOscillator(), gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine'; osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.14;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.35, t + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
                osc.start(t); osc.stop(t + 0.38);
            });
        } else {
            [440, 370, 294].forEach((freq, i) => {
                const osc = ctx.createOscillator(), gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine'; osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.25;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
                osc.start(t); osc.stop(t + 0.5);
            });
        }
    } catch (e) { console.warn('Audio error:', e); }
}

// ── Inject CSS sekali ─────────────────────────────────────────────────────────
function injectStyle() {
    if (document.getElementById('confirm-notif-style')) return;
    const s = document.createElement('style');
    s.id = 'confirm-notif-style';
    s.textContent = `
        @keyframes cnToastIn  { from { transform:translateX(120%); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes cnToastOut { from { transform:translateX(0); opacity:1; }   to { transform:translateX(120%); opacity:0; } }
        @keyframes cnPing     { 0% { transform:scale(0.6); opacity:0; } 60% { transform:scale(1.15); opacity:1; } 100% { transform:scale(1); } }
        @keyframes cnGlow     { 0%,100% { box-shadow:0 0 0 0 rgba(34,197,94,0.5); } 50% { box-shadow:0 0 0 12px rgba(34,197,94,0); } }
        @keyframes cnPulseRed { 0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow:0 0 0 10px rgba(239,68,68,0); } }

        #cn-toast-wrap {
            position: fixed; bottom: 90px; right: 16px;
            z-index: 99999; display: flex; flex-direction: column; gap: 10px;
            pointer-events: none;
        }
        .cn-toast {
            background: #0a1628; border-radius: 16px; padding: 13px 15px;
            min-width: 245px; max-width: 315px;
            display: flex; align-items: flex-start; gap: 11px;
            box-shadow: 0 10px 36px rgba(0,0,0,0.65);
            animation: cnToastIn 0.38s cubic-bezier(0.34,1.56,0.64,1) both;
            pointer-events: all;
        }
        .cn-toast.approve { border: 1px solid rgba(34,197,94,0.4); }
        .cn-toast.reject  { border: 1px solid rgba(239,68,68,0.35); }
        .cn-toast .cn-icon {
            width: 36px; height: 36px; border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; font-size: 16px;
        }
        .cn-toast.approve .cn-icon { background: rgba(34,197,94,0.12); animation: cnGlow 1.8s infinite; }
        .cn-toast.reject  .cn-icon { background: rgba(239,68,68,0.12); animation: cnPulseRed 1.8s infinite; }
        .cn-toast .cn-title { font-size: 12px; font-weight: 800; line-height: 1.3; }
        .cn-toast .cn-sub   { font-size: 10px; color: #9ca3af; margin-top: 3px; line-height: 1.4; }
        .cn-toast.approve .cn-title { color: #22c55e; }
        .cn-toast.reject  .cn-title { color: #ef4444; }

        .cn-popup        { border: 1px solid rgba(34,197,94,0.2) !important; border-radius: 24px !important; max-width: 360px !important; }
        .cn-popup-pay    { border: 1px solid rgba(251,146,60,0.3) !important; border-radius: 24px !important; max-width: 360px !important; }
        .cn-popup-reject { border: 1px solid rgba(239,68,68,0.2) !important; border-radius: 24px !important; max-width: 360px !important; }
    `;
    document.head.appendChild(s);
}

// ── Toast kecil ───────────────────────────────────────────────────────────────
function showToast(type, item, itemType) {
    let wrap = document.getElementById('cn-toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'cn-toast-wrap'; document.body.appendChild(wrap); }

    const isApprove = type === 'approve';
    const isPay     = type === 'pay';
    const label     = itemType === 'booking' ? 'Booking' : 'Rental';
    const icon      = isPay ? '💳' : isApprove ? '✅' : '❌';
    const title     = isPay
        ? `${label} Disetujui — Segera Bayar!`
        : isApprove ? `${label} Dikonfirmasi! 🎉` : `${label} Ditolak`;
    const sub = isPay
        ? `${item.console || 'Unit'} · Selesaikan pembayaran cash-mu`
        : isApprove
            ? `${item.console || 'Unit'} · ${item.duration || '?'} Jam — siap untukmu!`
            : `${item.console || 'Unit'} · Hubungi staff untuk info lebih lanjut.`;

    const toastType = isPay ? 'approve' : (isApprove ? 'approve' : 'reject');
    const el = document.createElement('div');
    el.className = `cn-toast ${toastType}`;
    el.innerHTML = `
        <div class="cn-icon">${icon}</div>
        <div>
            <div class="cn-title">${title}</div>
            <div class="cn-sub">${sub}</div>
        </div>
    `;
    wrap.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'cnToastOut 0.3s ease forwards';
        setTimeout(() => el.remove(), 300);
    }, 6000);
}

// ── Popup besar ───────────────────────────────────────────────────────────────
function showPopup(type, item, itemType) {
    const isApprove = type === 'approve';
    const isPay     = type === 'pay';     // cash: sudah disetujui, tinggal bayar
    const isBooking = itemType === 'booking';
    const label     = isBooking ? 'Booking' : 'Rental Bawa Pulang';
    const consoleName = item.console || 'Unit';
    const durStr    = item.duration ? item.duration + ' Jam' : '—';
    const grandTotal = item.grandTotal || item.total || 0;

    const dateStr = item.date
        ? (item.date + (item.time ? ' · ' + item.time : ''))
        : '—';
    const endStr  = item.endTime
        ? new Date(item.endTime).toLocaleString('id-ID', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
        : '—';

    if (isPay) {
        // Booking cash: sudah di-acc staff, pelanggan harus bayar dulu
        Swal.fire({
            background: '#0a1628', color: '#fff',
            showConfirmButton: true, showCancelButton: true,
            confirmButtonText: '<i class="fas fa-money-bill-wave" style="margin-right:6px"></i> Bayar Sekarang',
            cancelButtonText: 'Nanti',
            confirmButtonColor: '#fb923c',
            cancelButtonColor: '#1f2937',
            allowOutsideClick: false,
            customClass: { popup: 'cn-popup-pay' },
            html: `
                <div style="text-align:center;padding:8px 0 4px">
                    <div style="width:70px;height:70px;border-radius:50%;background:rgba(251,146,60,0.08);border:2px solid rgba(251,146,60,0.4);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;animation:cnPing 0.6s ease;font-size:30px">💳</div>
                    <p style="font-size:19px;font-weight:900;letter-spacing:-0.5px;margin-bottom:4px;color:#fb923c">${label} Disetujui!</p>
                    <p style="font-size:11px;color:#9ca3af;margin-bottom:16px">Pesananmu sudah di-acc staff — selesaikan pembayaran cash</p>
                    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(251,146,60,0.2);border-radius:14px;padding:13px 15px;text-align:left;display:flex;flex-direction:column;gap:10px">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">UNIT</span>
                            <span style="font-size:13px;font-weight:800;color:#fff">${consoleName}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">DURASI</span>
                            <span style="font-size:13px;font-weight:700;color:#fff">${durStr}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">JADWAL</span>
                            <span style="font-size:12px;font-weight:700;color:#fb923c">${dateStr}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">TOTAL BAYAR</span>
                            <span style="font-size:14px;font-weight:900;color:#fb923c">Rp ${grandTotal.toLocaleString('id-ID')}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">STATUS</span>
                            <span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:6px;background:rgba(251,146,60,0.12);color:#fb923c;border:1px solid rgba(251,146,60,0.3)">⏳ Menunggu Pembayaran</span>
                        </div>
                    </div>
                    <p style="font-size:10px;color:#f59e0b;margin-top:14px;font-weight:600">⚠️ Segera datang & bayar ke staff agar booking tidak batal!</p>
                </div>
            `
        }).then(result => {
            if (result.isConfirmed) window.location.href = 'dashboard-customer.html?history=1';
        });

    } else if (isApprove) {
        Swal.fire({
            background: '#0a1628', color: '#fff',
            showConfirmButton: true, showCancelButton: true,
            confirmButtonText: '<i class="fas fa-circle-check" style="margin-right:6px"></i> Lihat Detail',
            cancelButtonText: 'Tutup',
            confirmButtonColor: '#22c55e',
            cancelButtonColor: '#1f2937',
            allowOutsideClick: false,
            customClass: { popup: 'cn-popup' },
            html: `
                <div style="text-align:center;padding:8px 0 4px">
                    <div style="width:70px;height:70px;border-radius:50%;background:rgba(34,197,94,0.08);border:2px solid rgba(34,197,94,0.4);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;animation:cnPing 0.6s ease">
                        <i class="fas fa-circle-check" style="font-size:30px;color:#22c55e"></i>
                    </div>
                    <p style="font-size:19px;font-weight:900;letter-spacing:-0.5px;margin-bottom:4px;color:#22c55e">${label} Dikonfirmasi! 🎉</p>
                    <p style="font-size:11px;color:#9ca3af;margin-bottom:16px">Staff sudah mengkonfirmasi pesananmu</p>
                    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(34,197,94,0.15);border-radius:14px;padding:13px 15px;text-align:left;display:flex;flex-direction:column;gap:10px">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">${isBooking ? 'UNIT' : 'KONSOL'}</span>
                            <span style="font-size:13px;font-weight:800;color:#fff">${consoleName}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">DURASI</span>
                            <span style="font-size:13px;font-weight:700;color:#fff">${durStr}</span>
                        </div>
                        ${isBooking ? `
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">JADWAL</span>
                            <span style="font-size:12px;font-weight:700;color:#22c55e">${dateStr}</span>
                        </div>` : `
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">BATAS KEMBALI</span>
                            <span style="font-size:11px;font-weight:700;color:#f59e0b">${endStr}</span>
                        </div>`}
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">STATUS</span>
                            <span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:6px;background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25)">✓ Dikonfirmasi</span>
                        </div>
                    </div>
                    <p style="font-size:10px;color:#f59e0b;margin-top:14px;font-weight:600">
                        ${isBooking ? '📅 Datang tepat waktu sesuai jadwal ya!' : '📦 Segera ambil konsol & siapkan jaminanmu!'}
                    </p>
                </div>
            `
        }).then(result => {
            if (result.isConfirmed) window.location.href = 'dashboard-customer.html?history=1';
        });

    } else {
        // Ditolak
        Swal.fire({
            background: '#0a1628', color: '#fff',
            showConfirmButton: true,
            confirmButtonText: 'Mengerti',
            confirmButtonColor: '#ef4444',
            customClass: { popup: 'cn-popup-reject' },
            html: `
                <div style="text-align:center;padding:8px 0 4px">
                    <div style="width:70px;height:70px;border-radius:50%;background:rgba(239,68,68,0.08);border:2px solid rgba(239,68,68,0.35);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
                        <i class="fas fa-circle-xmark" style="font-size:30px;color:#ef4444"></i>
                    </div>
                    <p style="font-size:19px;font-weight:900;letter-spacing:-0.5px;margin-bottom:4px;color:#ef4444">${label} Ditolak</p>
                    <p style="font-size:11px;color:#9ca3af;margin-bottom:12px">
                        Pesanan <strong style="color:#fff">${consoleName}</strong> tidak dapat diproses saat ini.
                    </p>
                    <p style="font-size:11px;color:#f59e0b;font-weight:600">💬 Hubungi staff untuk informasi lebih lanjut.</p>
                </div>
            `
        });
    }
}

// ── Listener generik ──────────────────────────────────────────────────────────
function listenKoleksi(uid, koleksi, extraWhere, itemType) {
    let q = query(collection(db, koleksi), where('userId', '==', uid));
    if (extraWhere) q = query(collection(db, koleksi), where('userId', '==', uid), where(...extraWhere));

    let isFirst      = true;
    let prevStatuses = {};

    return onSnapshot(q, snap => {
        if (isFirst) {
            snap.docs.forEach(d => { prevStatuses[d.id] = d.data().status || ''; });
            isFirst = false;
            console.log(`[confirmnotif] ${koleksi} listener siap, ${snap.docs.length} dokumen dipantau`);
            return;
        }

        snap.docChanges().forEach(change => {
            if (change.type === 'removed') { delete prevStatuses[change.doc.id]; return; }

            const item      = { id: change.doc.id, ...change.doc.data() };
            const newStatus = item.status || '';
            const oldStatus = prevStatuses[change.doc.id] || '';
            prevStatuses[change.doc.id] = newStatus;

            if (newStatus === oldStatus) return;

            console.log(`[confirmnotif] ${koleksi} ${item.id}: "${oldStatus}" → "${newStatus}"`);

            // Booking cash: Menunggu Konfirmasi → Menunggu Pembayaran
            const isNowPay = newStatus.toLowerCase().includes('menunggu pembayaran');
            if (isNowPay && isStatusAwal(oldStatus)) {
                const flagKey = `cn_${itemType}_pay_${item.id}`;
                if (!getFlag(flagKey)) {
                    setFlag(flagKey, '1');
                    playSound('approve');
                    showToast('pay', item, itemType);
                    setTimeout(() => showPopup('pay', item, itemType), 700);
                }
                return;
            }

            // Dikonfirmasi langsung (ewallet / rental)
            if (isKonfirmasi(newStatus) && isStatusAwal(oldStatus)) {
                const flagKey = `cn_${itemType}_acc_${item.id}`;
                if (!getFlag(flagKey)) {
                    setFlag(flagKey, '1');
                    playSound('approve');
                    showToast('approve', item, itemType);
                    setTimeout(() => showPopup('approve', item, itemType), 700);
                }
                return;
            }

            // Ditolak
            if (isDitolak(newStatus) && !isDitolak(oldStatus)) {
                const flagKey = `cn_${itemType}_reject_${item.id}`;
                if (!getFlag(flagKey)) {
                    setFlag(flagKey, '1');
                    playSound('reject');
                    showToast('reject', item, itemType);
                    setTimeout(() => showPopup('reject', item, itemType), 700);
                }
            }
        });
    }, err => {
        console.error(`[confirmnotif] Error listener ${koleksi}:`, err);
    });
}

// ── Export utama ──────────────────────────────────────────────────────────────
export function listenKonfirmasiNotif(uid) {
    if (!uid) { console.warn('[confirmnotif] uid kosong, listener tidak dimulai'); return () => {}; }
    injectStyle();

    console.log('[confirmnotif] Memulai listener untuk uid:', uid);

    // Listen semua booking milik user (tidak pakai where type karena booking tidak punya field type)
    const unsubBooking = listenKoleksi(uid, 'bookings', null, 'booking');

    // Listen rental bawa_pulang milik user
    const unsubRental  = listenKoleksi(uid, 'rentals', ['type', '==', 'bawa_pulang'], 'rental');

    return () => {
        unsubBooking();
        unsubRental();
        console.log('[confirmnotif] Listener dibersihkan');
    };
}