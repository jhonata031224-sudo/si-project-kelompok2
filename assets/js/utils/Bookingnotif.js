// assets/js/utils/bookingnotif.js
// Notifikasi pelanggan:
//  1. H-10 menit sebelum startTime booking (unit berstatus 'Dipesan')
//  2. Saat unit berubah menjadi 'Digunakan' (unit aktif, siap dimainkan)

import { db } from '../firebase-config.js';
import {
    collection, query, where, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── Konstanta ────────────────────────────────────────────────────────────────
const REMIND_BEFORE_MS = 10 * 60 * 1000; // 10 menit
const CHECK_INTERVAL   = 30_000;          // cek tiap 30 detik

// ── Storage helpers (mencegah notif dobel) ──────────────────────────────────
function getNotifFlag(key)        { try { return localStorage.getItem(key); } catch { return null; } }
function setNotifFlag(key, val)   { try { localStorage.setItem(key, val);  } catch {} }

// ── Web Audio: suara ping lembut ─────────────────────────────────────────────
function playPing(type = 'soon') {
    try {
        const ctx   = new (window.AudioContext || window.webkitAudioContext)();
        const notes = type === 'aktif' ? [659, 784, 1047] : [523, 659, 784]; // E5 G5 C6 / C5 E5 G5
        notes.forEach((freq, i) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine'; osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.15;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.35, t + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            osc.start(t); osc.stop(t + 0.4);
        });
    } catch (e) { console.warn('Audio error:', e); }
}

// ── Inject CSS sekali ─────────────────────────────────────────────────────────
function injectStyle() {
    if (document.getElementById('bk-notif-style')) return;
    const s = document.createElement('style');
    s.id = 'bk-notif-style';
    s.textContent = `
        @keyframes bkToastIn  { from { transform:translateX(120%); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes bkToastOut { from { transform:translateX(0); opacity:1; }   to { transform:translateX(120%); opacity:0; } }
        @keyframes bkPulse    { 0%,100% { box-shadow:0 0 0 0 rgba(0,217,255,0.4); } 50% { box-shadow:0 0 0 10px rgba(0,217,255,0); } }
        @keyframes bkGlow     { 0%,100% { box-shadow:0 0 0 0 rgba(34,197,94,0.45); } 50% { box-shadow:0 0 0 10px rgba(34,197,94,0); } }

        #bk-toast-wrap {
            position: fixed; bottom: 90px; right: 16px;
            z-index: 99999; display: flex; flex-direction: column; gap: 10px;
            pointer-events: none;
        }
        .bk-toast {
            background: #0a1628;
            border-radius: 16px;
            padding: 13px 15px;
            min-width: 240px; max-width: 310px;
            display: flex; align-items: flex-start; gap: 11px;
            box-shadow: 0 10px 36px rgba(0,0,0,0.6);
            animation: bkToastIn 0.38s cubic-bezier(0.34,1.56,0.64,1) both;
            pointer-events: all;
        }
        .bk-toast.soon  { border: 1px solid rgba(0,217,255,0.35); }
        .bk-toast.aktif { border: 1px solid rgba(34,197,94,0.40); }
        .bk-toast .bk-icon {
            width: 36px; height: 36px; border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; font-size: 16px;
        }
        .bk-toast.soon  .bk-icon { background: rgba(0,217,255,0.12); animation: bkPulse 1.8s infinite; }
        .bk-toast.aktif .bk-icon { background: rgba(34,197,94,0.12);  animation: bkGlow  1.8s infinite; }
        .bk-toast .bk-body .bk-title { font-size: 12px; font-weight: 800; color: #fff; line-height: 1.3; }
        .bk-toast .bk-body .bk-sub   { font-size: 10px; color: #9ca3af; margin-top: 3px; line-height: 1.4; }
        .bk-toast.soon  .bk-body .bk-title { color: #00d9ff; }
        .bk-toast.aktif .bk-body .bk-title { color: #22c55e; }

        .bk-popup {
            border: 1px solid rgba(0,217,255,0.15) !important;
            border-radius: 24px !important;
            max-width: 360px !important;
        }
        .bk-popup-aktif {
            border: 1px solid rgba(34,197,94,0.25) !important;
            border-radius: 24px !important;
            max-width: 360px !important;
        }
    `;
    document.head.appendChild(s);
}

// ── Toast kecil ───────────────────────────────────────────────────────────────
function showToast(type, unit) {
    let wrap = document.getElementById('bk-toast-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'bk-toast-wrap';
        document.body.appendChild(wrap);
    }

    const isSoon  = type === 'soon';
    const icon    = isSoon ? '⏰' : '🎮';
    const title   = isSoon ? '10 Menit Lagi!' : 'Unit Siap Dimainkan!';
    const sub     = isSoon
        ? `Booking ${unit.console || 'unitmu'} segera dimulai. Siap-siap ya!`
        : `${unit.console || 'Unit'} kamu sudah aktif. Selamat main! 🕹️`;

    const el = document.createElement('div');
    el.className = `bk-toast ${isSoon ? 'soon' : 'aktif'}`;
    el.innerHTML = `
        <div class="bk-icon">${icon}</div>
        <div class="bk-body">
            <div class="bk-title">${title}</div>
            <div class="bk-sub">${sub}</div>
        </div>
    `;
    wrap.appendChild(el);

    setTimeout(() => {
        el.style.animation = 'bkToastOut 0.3s ease forwards';
        setTimeout(() => el.remove(), 300);
    }, 6000);
}

// ── Popup besar ───────────────────────────────────────────────────────────────
function showPopup(type, unit) {
    const consoleName = unit.console || 'Unit';
    const isSoon      = type === 'soon';

    const startStr = unit.startTime
        ? new Date(unit.startTime).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })
        : '—';
    const endStr = unit.endTime
        ? new Date(unit.endTime).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })
        : '—';

    if (isSoon) {
        Swal.fire({
            background: '#0a1628',
            color: '#fff',
            showConfirmButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-check" style="margin-right:6px"></i> Siap!',
            cancelButtonText: 'Tutup',
            confirmButtonColor: '#00d9ff',
            cancelButtonColor: '#1f2937',
            allowOutsideClick: false,
            customClass: { popup: 'bk-popup' },
            html: `
                <div style="text-align:center;padding:8px 0 4px">
                    <div style="width:68px;height:68px;border-radius:50%;background:rgba(0,217,255,0.08);border:2px solid rgba(0,217,255,0.35);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:30px">⏰</div>
                    <p style="font-size:18px;font-weight:900;letter-spacing:-0.5px;margin-bottom:4px;color:#00d9ff">10 Menit Lagi!</p>
                    <p style="font-size:11px;color:#9ca3af;margin-bottom:16px">Booking kamu akan segera dimulai</p>
                    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(0,217,255,0.12);border-radius:12px;padding:12px 14px;text-align:left;display:flex;flex-direction:column;gap:9px">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">UNIT</span>
                            <span style="font-size:13px;font-weight:800;color:#fff">${consoleName}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">JADWAL MULAI</span>
                            <span style="font-size:13px;font-weight:800;color:#00d9ff">${startStr}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">SELESAI</span>
                            <span style="font-size:12px;font-weight:700;color:#9ca3af">${endStr}</span>
                        </div>
                    </div>
                    <p style="font-size:10px;color:#f59e0b;margin-top:14px;font-weight:600">⚠️ Segera menuju tempat agar tidak telat ya!</p>
                </div>
            `
        });
    } else {
        // Popup unit aktif
        Swal.fire({
            background: '#0a1628',
            color: '#fff',
            showConfirmButton: true,
            confirmButtonText: '🎮 Ayo Main!',
            confirmButtonColor: '#22c55e',
            allowOutsideClick: false,
            customClass: { popup: 'bk-popup-aktif' },
            html: `
                <div style="text-align:center;padding:8px 0 4px">
                    <div style="width:68px;height:68px;border-radius:50%;background:rgba(34,197,94,0.08);border:2px solid rgba(34,197,94,0.4);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:30px;animation:bkGlow 1.5s infinite">🎮</div>
                    <p style="font-size:18px;font-weight:900;letter-spacing:-0.5px;margin-bottom:4px;color:#22c55e">Unit Siap!</p>
                    <p style="font-size:11px;color:#9ca3af;margin-bottom:16px">Unit kamu sudah aktif & siap dimainkan</p>
                    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(34,197,94,0.15);border-radius:12px;padding:12px 14px;text-align:left;display:flex;flex-direction:column;gap:9px">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">UNIT</span>
                            <span style="font-size:13px;font-weight:800;color:#fff">${consoleName}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">WAKTU MULAI</span>
                            <span style="font-size:13px;font-weight:800;color:#22c55e">${startStr}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">SELESAI</span>
                            <span style="font-size:12px;font-weight:700;color:#9ca3af">${endStr}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">STATUS</span>
                            <span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:6px;background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25)">Aktif ✓</span>
                        </div>
                    </div>
                    <p style="font-size:10px;color:#f59e0b;margin-top:14px;font-weight:600">🕹️ Selamat bermain! Jangan lupa pantau waktu ya.</p>
                </div>
            `
        });
    }
}

// ── Main listener ─────────────────────────────────────────────────────────────
export function listenBookingNotif(uid) {
    if (!uid) return () => {};
    injectStyle();

    // Listen units milik user ini (Dipesan atau Digunakan)
    const qUnits = query(
        collection(db, 'units'),
        where('customerId', '==', uid)
    );

    let prevStatuses = {}; // unitId → status sebelumnya
    let isFirstLoad  = true;
    let timerHandle  = null;

    // ── onSnapshot: deteksi unit jadi 'Digunakan' ────────────────────────────
    const unsubUnits = onSnapshot(qUnits, snap => {
        if (isFirstLoad) {
            snap.docs.forEach(d => {
                prevStatuses[d.id] = d.data().status || '';
            });
            isFirstLoad = false;

            // Mulai polling H-10 dari data awal
            startCountdownCheck(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            return;
        }

        snap.docChanges().forEach(change => {
            if (change.type === 'removed') {
                delete prevStatuses[change.doc.id];
                return;
            }

            const unit      = { id: change.doc.id, ...change.doc.data() };
            const newStatus = unit.status || '';
            const oldStatus = prevStatuses[change.doc.id] || '';
            prevStatuses[change.doc.id] = newStatus;

            // Unit baru jadi 'Digunakan' (aktif) dari status lain (Dipesan / apapun)
            if (newStatus === 'Digunakan' && oldStatus !== 'Digunakan') {
                const flagKey = `bk_aktif_${change.doc.id}_${unit.startTime || ''}`;
                if (!getNotifFlag(flagKey)) {
                    setNotifFlag(flagKey, '1');
                    playPing('aktif');
                    showToast('aktif', unit);
                    setTimeout(() => showPopup('aktif', unit), 700);
                }
            }
        });

        // Update countdown checker dengan data terbaru
        const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        startCountdownCheck(allDocs);
    });

    // ── Polling H-10 menit ───────────────────────────────────────────────────
    function startCountdownCheck(units) {
        if (timerHandle) clearInterval(timerHandle);
        timerHandle = setInterval(() => checkSoonUnits(units), CHECK_INTERVAL);
        checkSoonUnits(units); // langsung cek sekali
    }

    function checkSoonUnits(units) {
        const now = Date.now();
        units.forEach(unit => {
            if (unit.status !== 'Dipesan') return;
            if (!unit.startTime) return;

            const diff = unit.startTime - now;
            if (diff <= REMIND_BEFORE_MS && diff > 0) {
                // Kunci per unit per jadwal → tidak dobel
                const flagKey = `bk_soon_${unit.id}_${unit.startTime}`;
                if (!getNotifFlag(flagKey)) {
                    setNotifFlag(flagKey, '1');
                    playPing('soon');
                    showToast('soon', unit);
                    setTimeout(() => showPopup('soon', unit), 700);
                }
            }
        });
    }

    // Return cleanup function
    return () => {
        unsubUnits();
        if (timerHandle) clearInterval(timerHandle);
    };
}