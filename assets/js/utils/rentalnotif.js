// js/services/rentalNotif.js
// Realtime notifikasi suara + popup ketika status rental bawa pulang berubah

import { db, collection, onSnapshot, query, where } from '../auth.js';

// ── Status yang dianggap "DISETUJUI" staff ───────────────────────────────────
const STATUS_DISETUJUI = ['disetujui', 'aktif', 'aktif rental', 'siap diambil', 'dikonfirmasi'];
const STATUS_DITOLAK   = ['ditolak', 'dibatalkan', 'batal'];

function isDisetujui(status) {
    const s = (status || '').toLowerCase();
    return STATUS_DISETUJUI.some(k => s.includes(k));
}

function isDitolak(status) {
    const s = (status || '').toLowerCase();
    return STATUS_DITOLAK.some(k => s.includes(k));
}

// ── Simpan status sebelumnya di localStorage ─────────────────────────────────
function getSavedStatus(rentalId) {
    try { return localStorage.getItem('rental_status_' + rentalId) || ''; } catch { return ''; }
}
function saveStatus(rentalId, status) {
    try { localStorage.setItem('rental_status_' + rentalId, status); } catch {}
}

// ── Buat suara notifikasi via Web Audio API ──────────────────────────────────
function playNotifSound(type = 'approve') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        if (type === 'approve') {
            // Nada naik (ding ding ding) — pertanda baik
            const notes = [523, 659, 784]; // C5, E5, G5
            notes.forEach((freq, i) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type      = 'sine';
                osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.18;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.4, t + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
                osc.start(t);
                osc.stop(t + 0.4);
            });
        } else {
            // Nada turun (ding... dung) — tanda ditolak
            const notes = [440, 330];
            notes.forEach((freq, i) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type      = 'sine';
                osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.3;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.start(t);
                osc.stop(t + 0.55);
            });
        }
    } catch (e) {
        console.warn('Audio tidak bisa diputar:', e);
    }
}

// ── Tampilkan popup notifikasi custom ────────────────────────────────────────
function showNotifPopup(type, rental) {
    const consoleName = rental.console || 'Konsol';
    const dur         = rental.duration ? rental.duration + ' Jam' : '';
    const endTime     = rental.endTime
        ? new Date(rental.endTime).toLocaleString('id-ID', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
        : '—';

    if (type === 'approve') {
        Swal.fire({
            background: '#0a1628',
            color: '#fff',
            showConfirmButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-history" style="margin-right:6px"></i> Lihat Riwayat',
            cancelButtonText: 'Tutup',
            confirmButtonColor: '#00d9ff',
            cancelButtonColor: '#1f2937',
            allowOutsideClick: false,
            customClass: { popup: 'notif-popup-rental' },
            html: `
                <div style="text-align:center;padding:8px 0 4px">
                    <div style="width:64px;height:64px;border-radius:50%;background:rgba(0,217,255,0.1);border:2px solid rgba(0,217,255,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;animation:notifPing 0.6s ease">
                        <i class="fas fa-circle-check" style="font-size:28px;color:#00d9ff"></i>
                    </div>
                    <p style="font-size:18px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px">Rental Disetujui! 🎮</p>
                    <p style="font-size:11px;color:#9ca3af;margin-bottom:16px">Staff sudah mengkonfirmasi permintaanmu</p>
                    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(0,217,255,0.15);border-radius:12px;padding:12px 14px;text-align:left;display:flex;flex-direction:column;gap:8px">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">KONSOL</span>
                            <span style="font-size:13px;font-weight:800;color:#fff">${consoleName} ${dur ? '· ' + dur : ''}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">KEMBALI SEBELUM</span>
                            <span style="font-size:11px;font-weight:700;color:#00d9ff">${endTime}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <span style="font-size:10px;color:#6b7280;font-weight:700">STATUS</span>
                            <span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:6px;background:rgba(0,217,255,0.12);color:#00d9ff;border:1px solid rgba(0,217,255,0.25)">${rental.status}</span>
                        </div>
                    </div>
                    <p style="font-size:10px;color:#f59e0b;margin-top:14px;font-weight:600">⚠️ Segera ambil konsol & bawa jaminanmu ke tempat!</p>
                </div>
            `
        }).then(result => {
            if (result.isConfirmed) {
                window.location.href = 'history-customer.html';
            }
        });
    } else {
        Swal.fire({
            background: '#0a1628',
            color: '#fff',
            showConfirmButton: true,
            confirmButtonText: 'Mengerti',
            confirmButtonColor: '#ef4444',
            customClass: { popup: 'notif-popup-rental' },
            html: `
                <div style="text-align:center;padding:8px 0 4px">
                    <div style="width:64px;height:64px;border-radius:50%;background:rgba(239,68,68,0.1);border:2px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
                        <i class="fas fa-circle-xmark" style="font-size:28px;color:#ef4444"></i>
                    </div>
                    <p style="font-size:18px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px">Rental Ditolak</p>
                    <p style="font-size:11px;color:#9ca3af;margin-bottom:8px">Permintaan rental <strong style="color:#fff">${consoleName}</strong> tidak bisa diproses.</p>
                    <p style="font-size:10px;color:#f59e0b;font-weight:600">Hubungi staff untuk informasi lebih lanjut.</p>
                </div>
            `
        });
    }
}

// ── Inject CSS animasi notif ─────────────────────────────────────────────────
function injectNotifStyle() {
    if (document.getElementById('rental-notif-style')) return;
    const style = document.createElement('style');
    style.id = 'rental-notif-style';
    style.textContent = `
        @keyframes notifPing {
            0%   { transform: scale(0.5); opacity: 0; }
            60%  { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(1); }
        }
        .notif-popup-rental {
            border: 1px solid rgba(0,217,255,0.15) !important;
            border-radius: 24px !important;
            max-width: 360px !important;
        }

        /* Toast kecil di sudut layar */
        #rental-toast-container {
            position: fixed;
            bottom: 90px;
            right: 16px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: none;
        }
        .rental-toast {
            background: #0f1e35;
            border: 1px solid rgba(0,217,255,0.25);
            border-radius: 14px;
            padding: 12px 14px;
            min-width: 230px;
            max-width: 300px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            animation: toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
            pointer-events: all;
        }
        .rental-toast.toast-reject {
            border-color: rgba(239,68,68,0.3);
        }
        @keyframes toastIn {
            from { transform: translateX(120%); opacity: 0; }
            to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastOut {
            from { transform: translateX(0); opacity: 1; }
            to   { transform: translateX(120%); opacity: 0; }
        }
        .rental-toast .t-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 14px;
        }
        .rental-toast .t-title {
            font-size: 12px;
            font-weight: 800;
            color: #fff;
            line-height: 1.3;
        }
        .rental-toast .t-sub {
            font-size: 10px;
            color: #6b7280;
            margin-top: 2px;
        }
    `;
    document.head.appendChild(style);
}

// ── Toast kecil di sudut layar (non-blocking) ────────────────────────────────
function showToast(type, rental) {
    let container = document.getElementById('rental-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'rental-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const isApprove = type === 'approve';
    toast.className = 'rental-toast' + (isApprove ? '' : ' toast-reject');
    toast.innerHTML = `
        <div class="t-icon" style="background:${isApprove ? 'rgba(0,217,255,0.12)' : 'rgba(239,68,68,0.12)'}">
            <i class="fas ${isApprove ? 'fa-circle-check' : 'fa-circle-xmark'}" style="color:${isApprove ? '#00d9ff' : '#ef4444'}"></i>
        </div>
        <div>
            <div class="t-title">${isApprove ? '🎮 Rental Disetujui!' : '❌ Rental Ditolak'}</div>
            <div class="t-sub">${rental.console || 'Konsol'} · ${rental.duration ? rental.duration + 'j' : ''}</div>
        </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ── Main: mulai listen perubahan rental user ──────────────────────────────────
export function listenRentalNotif(uid) {
    if (!uid) return () => {};
    injectNotifStyle();

    // Hanya dengarkan rental bawa pulang milik user ini
    const q = query(
        collection(db, 'rentals'),
        where('userId', '==', uid),
        where('type', '==', 'bawa_pulang')
    );

    let isFirstLoad = true;

    const unsub = onSnapshot(q, snap => {
        if (isFirstLoad) {
            // Simpan status awal tanpa trigger notif
            snap.docs.forEach(d => {
                saveStatus(d.id, d.data().status || '');
            });
            isFirstLoad = false;
            return;
        }

        snap.docChanges().forEach(change => {
            if (change.type !== 'modified') return;

            const rental    = { id: change.doc.id, ...change.doc.data() };
            const newStatus = rental.status || '';
            const oldStatus = getSavedStatus(change.doc.id);

            // Simpan status terbaru
            saveStatus(change.doc.id, newStatus);

            // Tidak perlu notif kalau status sama
            if (newStatus === oldStatus) return;

            // Cek apakah baru disetujui
            if (isDisetujui(newStatus) && !isDisetujui(oldStatus)) {
                playNotifSound('approve');
                showToast('approve', rental);
                // Sedikit delay supaya toast muncul dulu, baru popup besar
                setTimeout(() => showNotifPopup('approve', rental), 600);
            }
            // Cek apakah baru ditolak
            else if (isDitolak(newStatus) && !isDitolak(oldStatus)) {
                playNotifSound('reject');
                showToast('reject', rental);
                setTimeout(() => showNotifPopup('reject', rental), 600);
            }
        });
    });

    return unsub;
}