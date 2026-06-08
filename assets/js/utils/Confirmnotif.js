// assets/js/utils/confirmnotif.js
// Notifikasi popup pelanggan saat:
//  1. Booking dikonfirmasi staff (status: 'Menunggu Konfirmasi Staff' → 'Aktif')
//  2. Rental bawa pulang dikonfirmasi staff (status: 'Menunggu Konfirmasi Staff' → 'Aktif' / disetujui)
//  3. Booking/Rental ditolak staff (status → 'Dibatalkan Staff' / 'Ditolak')

import { db } from '../auth.js';
import {
    collection, query, where, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_KONFIRMASI = ['aktif', 'disetujui', 'aktif rental', 'siap diambil', 'dikonfirmasi'];
const STATUS_DITOLAK    = ['ditolak', 'dibatalkan staff', 'dibatalkan', 'batal'];

function isKonfirmasi(status) {
    const s = (status || '').toLowerCase();
    return STATUS_KONFIRMASI.some(k => s.includes(k));
}
function isDitolak(status) {
    const s = (status || '').toLowerCase();
    return STATUS_DITOLAK.some(k => s.includes(k));
}

// ── LocalStorage helpers (cegah notif dobel) ─────────────────────────────────
function getFlag(key)      { try { return localStorage.getItem(key); }    catch { return null; } }
function setFlag(key, val) { try { localStorage.setItem(key, val); }      catch {} }

// ── Web Audio: suara notifikasi ───────────────────────────────────────────────
function playSound(type = 'approve') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (type === 'approve') {
            // Nada naik — pertanda baik 🎵
            [523, 659, 784, 1047].forEach((freq, i) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine'; osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.14;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.35, t + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
                osc.start(t); osc.stop(t + 0.38);
            });
        } else {
            // Nada turun — tanda ditolak
            [440, 370, 294].forEach((freq, i) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
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
        @keyframes cnPing     { 0%   { transform:scale(0.6); opacity:0; } 60% { transform:scale(1.15); opacity:1; } 100% { transform:scale(1); } }
        @keyframes cnGlow     { 0%,100% { box-shadow:0 0 0 0 rgba(34,197,94,0.5); } 50% { box-shadow:0 0 0 12px rgba(34,197,94,0); } }
        @keyframes cnPulseRed { 0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow:0 0 0 10px rgba(239,68,68,0); } }

        #cn-toast-wrap {
            position: fixed; bottom: 90px; right: 16px;
            z-index: 99999; display: flex; flex-direction: column; gap: 10px;
            pointer-events: none;
        }
        .cn-toast {
            background: #0a1628;
            border-radius: 16px;
            padding: 13px 15px;
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
        .cn-toast.approve .cn-icon { background: rgba(34,197,94,0.12);  animation: cnGlow 1.8s infinite; }
        .cn-toast.reject  .cn-icon { background: rgba(239,68,68,0.12);  animation: cnPulseRed 1.8s infinite; }
        .cn-toast .cn-title { font-size: 12px; font-weight: 800; line-height: 1.3; }
        .cn-toast .cn-sub   { font-size: 10px; color: #9ca3af; margin-top: 3px; line-height: 1.4; }
        .cn-toast.approve .cn-title { color: #22c55e; }
        .cn-toast.reject  .cn-title { color: #ef4444; }

        .cn-popup         { border: 1px solid rgba(34,197,94,0.2) !important; border-radius: 24px !important; max-width: 360px !important; }
        .cn-popup-reject  { border: 1px solid rgba(239,68,68,0.2) !important; border-radius: 24px !important; max-width: 360px !important; }
    `;
    document.head.appendChild(s);
}

// ── Toast kecil (non-blocking) ────────────────────────────────────────────────
function showToast(type, item, itemType) {
    let wrap = document.getElementById('cn-toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'cn-toast-wrap'; document.body.appendChild(wrap); }

    const isApprove = type === 'approve';
    const label     = itemType === 'booking' ? 'Booking' : 'Rental';
    const icon      = isApprove ? '✅' : '❌';
    const title     = isApprove ? `${label} Dikonfirmasi! 🎉` : `${label} Ditolak`;
    const sub       = isApprove
        ? `${item.console || 'Unit'} · ${item.duration || '?'} Jam — siap untukmu!`
        : `${item.console || 'Unit'} · Hubungi staff untuk info lebih lanjut.`;

    const el = document.createElement('div');
    el.className = `cn-toast ${isApprove ? 'approve' : 'reject'}`;
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

// ── Popup besar (blocking) ────────────────────────────────────────────────────
function showPopup(type, item, itemType) {
    const isApprove  = type === 'approve';
    const isBooking  = itemType === 'booking';
    const label      = isBooking ? 'Booking' : 'Rental Bawa Pulang';
    const consoleName = item.console || 'Unit';
    const durStr     = item.duration ? item.duration + ' Jam' : '—';

    // Format waktu
    const startStr = item.startTime
        ? (isNaN(item.startTime)
            ? item.startTime  // sudah string jam (misal "14:00")
            : new Date(item.startTime).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }))
        : '—';
    const endStr = item.endTime
        ? new Date(item.endTime).toLocaleString('id-ID', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
        : '—';
    const dateStr = item.date
        ? (item.date + (item.time ? ' · ' + item.time : ''))
        : '—';

    if (isApprove) {
        Swal.fire({
            background: '#0a1628',
            color: '#fff',
            showConfirmButton: true,
            showCancelButton: true,
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
                        ${isBooking
                            ? '📅 Datang tepat waktu sesuai jadwal ya!'
                            : '📦 Segera ambil konsol & siapkan jaminanmu!'}
                    </p>
                </div>
            `
        }).then(result => {
            if (result.isConfirmed) {
                // Arahkan ke halaman riwayat / dashboard
                const historyPage = document.querySelector('a[href*="history"]')?.href
                    || '../pelanggan/dashboard-customer.html?history=1';
                window.location.href = historyPage;
            }
        });

    } else {
        // Ditolak
        Swal.fire({
            background: '#0a1628',
            color: '#fff',
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
                    <p style="font-size:11px;color:#f59e0b;font-weight:600">
                        💬 Hubungi staff untuk informasi lebih lanjut.
                    </p>
                </div>
            `
        });
    }
}

// ── Listener Booking ──────────────────────────────────────────────────────────
function listenBookingKonfirmasi(uid) {
    const q = query(
        collection(db, 'bookings'),
        where('userId', '==', uid)
    );

    let isFirst = true;
    let prevStatuses = {};

    return onSnapshot(q, snap => {
        if (isFirst) {
            snap.docs.forEach(d => { prevStatuses[d.id] = d.data().status || ''; });
            isFirst = false;
            return;
        }

        snap.docChanges().forEach(change => {
            if (change.type === 'removed') { delete prevStatuses[change.doc.id]; return; }

            const item      = { id: change.doc.id, ...change.doc.data() };
            const newStatus = item.status || '';
            const oldStatus = prevStatuses[change.doc.id] || '';
            prevStatuses[change.doc.id] = newStatus;

            if (newStatus === oldStatus) return;

            // Dikonfirmasi (Menunggu → Aktif)
            if (isKonfirmasi(newStatus) && !isKonfirmasi(oldStatus)) {
                const flagKey = `cn_bk_acc_${item.id}`;
                if (!getFlag(flagKey)) {
                    setFlag(flagKey, '1');
                    playSound('approve');
                    showToast('approve', item, 'booking');
                    setTimeout(() => showPopup('approve', item, 'booking'), 700);
                }
            }
            // Ditolak
            else if (isDitolak(newStatus) && !isDitolak(oldStatus)) {
                const flagKey = `cn_bk_reject_${item.id}`;
                if (!getFlag(flagKey)) {
                    setFlag(flagKey, '1');
                    playSound('reject');
                    showToast('reject', item, 'booking');
                    setTimeout(() => showPopup('reject', item, 'booking'), 700);
                }
            }
        });
    });
}

// ── Listener Rental Bawa Pulang ───────────────────────────────────────────────
function listenRentalKonfirmasi(uid) {
    const q = query(
        collection(db, 'rentals'),
        where('userId', '==', uid),
        where('type', '==', 'bawa_pulang')
    );

    let isFirst = true;
    let prevStatuses = {};

    return onSnapshot(q, snap => {
        if (isFirst) {
            snap.docs.forEach(d => { prevStatuses[d.id] = d.data().status || ''; });
            isFirst = false;
            return;
        }

        snap.docChanges().forEach(change => {
            if (change.type === 'removed') { delete prevStatuses[change.doc.id]; return; }

            const item      = { id: change.doc.id, ...change.doc.data() };
            const newStatus = item.status || '';
            const oldStatus = prevStatuses[change.doc.id] || '';
            prevStatuses[change.doc.id] = newStatus;

            if (newStatus === oldStatus) return;

            // Dikonfirmasi
            if (isKonfirmasi(newStatus) && !isKonfirmasi(oldStatus)) {
                const flagKey = `cn_rl_acc_${item.id}`;
                if (!getFlag(flagKey)) {
                    setFlag(flagKey, '1');
                    playSound('approve');
                    showToast('approve', item, 'rental');
                    setTimeout(() => showPopup('approve', item, 'rental'), 700);
                }
            }
            // Ditolak
            else if (isDitolak(newStatus) && !isDitolak(oldStatus)) {
                const flagKey = `cn_rl_reject_${item.id}`;
                if (!getFlag(flagKey)) {
                    setFlag(flagKey, '1');
                    playSound('reject');
                    showToast('reject', item, 'rental');
                    setTimeout(() => showPopup('reject', item, 'rental'), 700);
                }
            }
        });
    });
}

// ── Export utama: panggil satu fungsi ini ─────────────────────────────────────
export function listenKonfirmasiNotif(uid) {
    if (!uid) return () => {};
    injectStyle();

    const unsubBooking = listenBookingKonfirmasi(uid);
    const unsubRental  = listenRentalKonfirmasi(uid);

    // Return cleanup
    return () => {
        unsubBooking();
        unsubRental();
    };
}