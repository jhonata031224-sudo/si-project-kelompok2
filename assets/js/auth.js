// js/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
    signOut, onAuthStateChanged, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, updateDoc, onSnapshot, collection, setDoc, getDoc, getDocs, addDoc, deleteDoc, query, orderBy, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAqa9FTlNuVXGHnINFN1qz8-aoGTrn-0g4",
    authDomain: "prince-games-f170a.firebaseapp.com",
    projectId: "prince-games-f170a",
    storageBucket: "prince-games-f170a.firebasestorage.app",
    messagingSenderId: "245728198046",
    appId: "1:245728198046:web:b6136"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const swalBg = () => localStorage.getItem('pg_theme') === 'light'
    ? { background: '#ffffff', color: '#1a202c', border: 'rgba(0,0,0,0.30)', inputBg: 'rgba(0,0,0,0.04)' }
    : { background: '#11171f', color: '#fff',    border: 'rgba(255,255,255,0.18)', inputBg: 'rgba(255,255,255,0.05)' };

const notify = (icon, title, text = "") => {
    Swal.fire({
        icon, title, text,
        ...swalBg(),
        confirmButtonColor: '#00d9ff', timer: 2500
    });
};

// --- FUNGSI LOGOUT UNIVERSAL ---
// --- LUPA PASSWORD (UNIVERSAL, SEMUA ROLE) ---
// role: 'pelanggan' → pakai username | 'staff'/'owner' → pakai email
window.forgotPassword = async (role = 'staff') => {
    const isPelanggan = role === 'pelanggan';
    const bg = swalBg();

    const inputFieldHtml = isPelanggan ? `
        <div style="margin-bottom:14px;text-align:left">
            <label style="display:block;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8899aa;margin-bottom:6px">Username</label>
            <div style="position:relative;display:flex;align-items:center">
                <span style="position:absolute;left:13px;color:#8899aa;font-size:13px;pointer-events:none">
                    <i class="fas fa-user"></i>
                </span>
                <input id="swal-fp-username" type="text" placeholder="Masukkan username kamu"
                    autocomplete="username"
                    style="width:100%;box-sizing:border-box;background:${bg.inputBg};border:1px solid ${bg.border};border-radius:10px;padding:12px 14px 12px 38px;color:${bg.color};font-size:14px;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color .2s">
            </div>
        </div>
        <div style="text-align:left">
            <label style="display:block;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8899aa;margin-bottom:6px">New Password</label>
            <div style="position:relative;display:flex;align-items:center">
                <span style="position:absolute;left:13px;color:#8899aa;font-size:13px;pointer-events:none">
                    <i class="fas fa-lock"></i>
                </span>
                <input id="swal-fp-newpass" type="password" placeholder="Password baru"
                    style="width:100%;box-sizing:border-box;background:${bg.inputBg};border:1px solid ${bg.border};border-radius:10px;padding:12px 38px 12px 38px;color:${bg.color};font-size:14px;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color .2s">
                <button type="button" onclick="(function(){const i=document.getElementById('swal-fp-newpass');i.type=i.type==='password'?'text':'password';this.querySelector('i').className=i.type==='password'?'fas fa-eye':'fas fa-eye-slash'}).call(this)"
                    style="position:absolute;right:12px;background:none;border:none;color:#8899aa;cursor:pointer;padding:4px;font-size:14px;display:flex;align-items:center">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
        <div style="margin-top:14px;text-align:left">
            <label style="display:block;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8899aa;margin-bottom:6px">Confirm Password</label>
            <div style="position:relative;display:flex;align-items:center">
                <span style="position:absolute;left:13px;color:#8899aa;font-size:13px;pointer-events:none">
                    <i class="fas fa-lock"></i>
                </span>
                <input id="swal-fp-confirmpass" type="password" placeholder="Ulangi password baru"
                    style="width:100%;box-sizing:border-box;background:${bg.inputBg};border:1px solid ${bg.border};border-radius:10px;padding:12px 38px 12px 38px;color:${bg.color};font-size:14px;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color .2s">
                <button type="button" onclick="(function(){const i=document.getElementById('swal-fp-confirmpass');i.type=i.type==='password'?'text':'password';this.querySelector('i').className=i.type==='password'?'fas fa-eye':'fas fa-eye-slash'}).call(this)"
                    style="position:absolute;right:12px;background:none;border:none;color:#8899aa;cursor:pointer;padding:4px;font-size:14px;display:flex;align-items:center">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    ` : `
        <div style="margin-bottom:14px;text-align:left">
            <label style="display:block;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8899aa;margin-bottom:6px">Email</label>
            <div style="position:relative;display:flex;align-items:center">
                <span style="position:absolute;left:13px;color:#8899aa;font-size:13px;pointer-events:none">
                    <i class="fas fa-envelope"></i>
                </span>
                <input id="swal-fp-email" type="email" placeholder="contoh@email.com"
                    autocomplete="email"
                    style="width:100%;box-sizing:border-box;background:${bg.inputBg};border:1px solid ${bg.border};border-radius:10px;padding:12px 14px 12px 38px;color:${bg.color};font-size:14px;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color .2s">
            </div>
        </div>
        <div style="text-align:left">
            <label style="display:block;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8899aa;margin-bottom:6px">New Password</label>
            <div style="position:relative;display:flex;align-items:center">
                <span style="position:absolute;left:13px;color:#8899aa;font-size:13px;pointer-events:none">
                    <i class="fas fa-lock"></i>
                </span>
                <input id="swal-fp-newpass" type="password" placeholder="Password baru"
                    style="width:100%;box-sizing:border-box;background:${bg.inputBg};border:1px solid ${bg.border};border-radius:10px;padding:12px 38px 12px 38px;color:${bg.color};font-size:14px;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color .2s">
                <button type="button" onclick="(function(){const i=document.getElementById('swal-fp-newpass');i.type=i.type==='password'?'text':'password';this.querySelector('i').className=i.type==='password'?'fas fa-eye':'fas fa-eye-slash'}).call(this)"
                    style="position:absolute;right:12px;background:none;border:none;color:#8899aa;cursor:pointer;padding:4px;font-size:14px;display:flex;align-items:center">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
        <div style="margin-top:14px;text-align:left">
            <label style="display:block;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8899aa;margin-bottom:6px">Confirm Password</label>
            <div style="position:relative;display:flex;align-items:center">
                <span style="position:absolute;left:13px;color:#8899aa;font-size:13px;pointer-events:none">
                    <i class="fas fa-lock"></i>
                </span>
                <input id="swal-fp-confirmpass" type="password" placeholder="Ulangi password baru"
                    style="width:100%;box-sizing:border-box;background:${bg.inputBg};border:1px solid ${bg.border};border-radius:10px;padding:12px 38px 12px 38px;color:${bg.color};font-size:14px;font-family:'Space Grotesk',sans-serif;outline:none;transition:border-color .2s">
                <button type="button" onclick="(function(){const i=document.getElementById('swal-fp-confirmpass');i.type=i.type==='password'?'text':'password';this.querySelector('i').className=i.type==='password'?'fas fa-eye':'fas fa-eye-slash'}).call(this)"
                    style="position:absolute;right:12px;background:none;border:none;color:#8899aa;cursor:pointer;padding:4px;font-size:14px;display:flex;align-items:center">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `;

    const { value: formData } = await Swal.fire({
        title: 'Reset Password',
        html: `<div style="margin-top:4px">${inputFieldHtml}</div>`,
        confirmButtonText: 'SUBMIT',
        confirmButtonColor: '#00d9ff',
        showCancelButton: true,
        cancelButtonText: 'Batal',
        cancelButtonColor: '#374151',
        ...bg,
        width: isPelanggan ? 400 : 400,
        customClass: {
            confirmButton: 'swal-submit-btn',
            popup: 'swal-reset-popup'
        },
        focusConfirm: false,
        preConfirm: () => {
            const newPass    = document.getElementById('swal-fp-newpass').value;
            const confirmPass = document.getElementById('swal-fp-confirmpass').value;

            if (isPelanggan) {
                const username = document.getElementById('swal-fp-username').value.trim().toLowerCase();
                if (!username) { Swal.showValidationMessage('Username tidak boleh kosong'); return false; }
                if (!newPass)  { Swal.showValidationMessage('Password baru tidak boleh kosong'); return false; }
                if (newPass.length < 8) { Swal.showValidationMessage('Password minimal 8 karakter'); return false; }
                if (newPass !== confirmPass) { Swal.showValidationMessage('Password tidak cocok'); return false; }
                return { type: 'pelanggan', username, newPass };
            } else {
                const email = document.getElementById('swal-fp-email').value.trim();
                if (!email) { Swal.showValidationMessage('Email tidak boleh kosong'); return false; }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Swal.showValidationMessage('Format email tidak valid'); return false; }
                if (!newPass)  { Swal.showValidationMessage('Password baru tidak boleh kosong'); return false; }
                if (newPass.length < 8) { Swal.showValidationMessage('Password minimal 8 karakter'); return false; }
                if (newPass !== confirmPass) { Swal.showValidationMessage('Password tidak cocok'); return false; }
                return { type: role, email, newPass };
            }
        }
    });

    if (!formData) return;

    try {
        if (formData.type === 'pelanggan') {
            // Pelanggan: cari email dari username, lalu kirim reset email
            const fakeEmail = `${formData.username}@prince.com`;
            // Verifikasi username ada di Firestore
            const usernameDoc = await getDoc(doc(db, 'usernames', formData.username));
            if (!usernameDoc.exists()) {
                Swal.fire({ icon: 'error', title: 'Gagal', text: 'Username tidak ditemukan di sistem.', confirmButtonColor: '#00d9ff', ...bg });
                return;
            }
            await sendPasswordResetEmail(auth, fakeEmail);
            Swal.fire({
                icon: 'success',
                title: 'Kata Sandi Berhasil Diubah!',
                html: `<p style="font-size:13px;color:#8899aa">Kata sandi untuk akun<br><b style="color:#00d9ff">${formData.username}</b><br>telah berhasil diperbarui.</p>`,
                confirmButtonColor: '#00d9ff',
                confirmButtonText: 'OK',
                ...bg
            });
        } else {
            // Staff / Owner: kirim reset email langsung
            await sendPasswordResetEmail(auth, formData.email);
            Swal.fire({
                icon: 'success',
                title: 'Kata Sandi Berhasil Diubah!',
                html: `<p style="font-size:13px;color:#8899aa">Kata sandi untuk akun<br><b style="color:#00d9ff">${formData.email}</b><br>telah berhasil diperbarui.</p>`,
                confirmButtonColor: '#00d9ff',
                confirmButtonText: 'OK',
                ...bg
            });
        }
    } catch (err) {
        let msg = 'Terjadi kesalahan. Coba lagi.';
        if (err.code === 'auth/user-not-found')    msg = 'Akun tidak ditemukan di sistem.';
        if (err.code === 'auth/invalid-email')     msg = 'Format email tidak valid.';
        if (err.code === 'auth/too-many-requests') msg = 'Terlalu banyak permintaan. Coba lagi nanti.';
        Swal.fire({ icon: 'error', title: 'Gagal', text: msg, confirmButtonColor: '#00d9ff', ...bg });
    }
};

export const handleLogout = async (targetUrl = '../../pages/auth/login-pelanggan.html') => {
    const result = await Swal.fire({
        title: 'Logout?',
        text: "Sesi Anda akan berakhir.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#00d9ff',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Ya, Keluar',
        ...swalBg()
    });
    if (result.isConfirmed) {
        try {
            await signOut(auth);
            window.location.href = targetUrl;
        } catch (error) {
            console.error("Logout Error:", error);
        }
    }
};

// --- LOGIKA LOGIN OWNER ---
window.handleLoginOwner = async () => {
    const email = document.getElementById('owner-email').value.trim();
    const pass = document.getElementById('owner-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        notify('success', 'Selamat Datang Owner!');
        setTimeout(() => window.location.href = '../../pages/owner/dashboard-owner.html', 1500);
    } catch (error) {
        if (typeof window.setLoading === 'function') window.setLoading(false);
        const msg = {
            'auth/user-not-found':      'Akun tidak ditemukan!',
            'auth/wrong-password':      'Password salah!',
            'auth/invalid-credential':  'Email atau password salah!',
            'auth/invalid-email':       'Format email tidak valid!',
            'auth/too-many-requests':   'Terlalu banyak percobaan, coba lagi nanti!',
            'auth/network-request-failed': 'Gagal terhubung ke internet!',
        }[error.code] || 'Login gagal, periksa email dan password.';
        notify('error', 'Login Gagal', msg);
    }
};

// --- LOGIKA DAFTAR OWNER ---
window.handleRegisterOwner = async () => {
    const email = document.getElementById('owner-email').value.trim();
    const pass = document.getElementById('owner-pass').value;
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const uid = cred.user.uid;

        await setDoc(doc(db, 'owners', uid), {
            email,
            role: 'owner',
            createdAt: new Date().toISOString()
        });

        notify('success', 'Akun Owner Dibuat!', 'Silakan masuk.');
        setTimeout(() => window.location.href = '../../pages/auth/login-owner.html', 1800);
    } catch (error) {
        const btn = document.getElementById('regBtn');
        if (btn) {
            btn.classList.remove('loading');
            btn.innerHTML = 'Daftar sebagai Owner <i class="fas fa-arrow-right"></i>';
        }
        const msg = {
            'auth/email-already-in-use':    'Email sudah terdaftar!',
            'auth/weak-password':           'Password terlalu lemah, minimal 8 karakter!',
            'auth/invalid-email':           'Format email tidak valid!',
            'auth/network-request-failed':  'Gagal terhubung ke internet!',
            'auth/too-many-requests':       'Terlalu banyak percobaan, coba lagi nanti!',
        }[error.code] || `Pendaftaran gagal: ${error.message}`;
        notify('error', 'Gagal Daftar', msg);
    }
};

// --- LOGIKA LOGIN PELANGGAN ---
window.handleLoginPelanggan = async () => {
    const username = document.getElementById('username-cust').value.trim().toLowerCase();
    const pass = document.getElementById('pass-cust').value;
    const email = `${username}@prince.com`;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        notify('success', 'Selamat Datang Pelanggan!');
        setTimeout(() => window.location.href = '../../pages/pelanggan/dashboard-customer.html', 1500);
    } catch (error) {
        if (typeof window.setLoading === 'function') window.setLoading(false);
        notify('error', 'Login Gagal', 'Username atau password salah!');
    }
};

// --- LOGIKA DAFTAR PELANGGAN ---
window.handleRegisterPelanggan = async () => {
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const pass = document.getElementById('reg-password').value;
    const noWA = document.getElementById('reg-nowa') ? document.getElementById('reg-nowa').value.trim() : '';
    const email = `${username}@prince.com`;

    try {
        const usernameDoc = await getDoc(doc(db, "usernames", username));
        if (usernameDoc.exists()) {
            const btn = document.getElementById('regBtn');
            if (btn) {
                btn.classList.remove('loading');
                btn.innerHTML = 'Buat Akun <i class="fas fa-arrow-right"></i>';
            }
            notify('error', 'Username Sudah Dipakai', 'Coba username lain.');
            return;
        }

        // Cek apakah No. WA sudah dipakai
        if (noWA) {
            const waSnap = await getDocs(query(collection(db, "pelanggan"), where("noWA", "==", noWA)));
            if (!waSnap.empty) {
                const btn = document.getElementById('regBtn');
                if (btn) { btn.classList.remove('loading'); btn.innerHTML = 'Buat Akun <i class="fas fa-arrow-right"></i>'; }
                notify('error', 'No. WA Sudah Terdaftar', 'Gunakan nomor WhatsApp lain.');
                return;
            }
        }

        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const uid = cred.user.uid;

        await setDoc(doc(db, "pelanggan", uid), {
            username,
            email,
            noWA: noWA || '',
            namaLengkap: username,
            role: "pelanggan",
            createdAt: new Date().toISOString()
        });
        await setDoc(doc(db, "usernames", username), { uid });

        notify('success', 'Akun Dibuat!', 'Silakan masuk.');
        setTimeout(() => window.location.href = '../../pages/auth/login-pelanggan.html', 1800);

    } catch (error) {
        const btn = document.getElementById('regBtn');
        if (btn) {
            btn.classList.remove('loading');
            btn.innerHTML = 'Buat Akun <i class="fas fa-arrow-right"></i>';
        }
        const msg = {
            "auth/email-already-in-use":   "Username sudah terdaftar!",
            "auth/weak-password":          "Password terlalu lemah, minimal 8 karakter!",
            "auth/invalid-email":          "Username mengandung karakter tidak valid!",
            "auth/network-request-failed": "Gagal terhubung ke internet!",
            "auth/too-many-requests":      "Terlalu banyak percobaan, coba lagi nanti!",
            "auth/configuration-not-found":"Konfigurasi Firebase tidak valid!",
        }[error.code] || `Pendaftaran gagal: ${error.message}`;
        notify('error', 'Gagal Daftar', msg);
    }
};

// --- LOGIKA LOGIN STAFF ---
window.handleLoginStaff = async () => {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        notify('success', 'Selamat Datang Staff!');
        setTimeout(() => window.location.href = '../../pages/staff/pilih-shift.html', 1500);
    } catch (error) {
        if (typeof window.setLoading === 'function') window.setLoading(false);
        if (typeof window.showToast === 'function') {
            window.showToast('error', 'Email atau password salah!');
        } else {
            notify('error', 'Gagal', 'Kredensial Staff salah!');
        }
    }
};

// --- LOGIKA DAFTAR STAFF ---
window.handleRegisterStaff = async () => {
    const email = document.getElementById('staff-email').value.trim();
    const pass = document.getElementById('staff-pass').value;

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const uid = cred.user.uid;

        await setDoc(doc(db, "staff", uid), {
            email,
            role: "staff",
            createdAt: new Date().toISOString()
        });

        if (typeof window.showToast === 'function') {
            window.showToast('success', 'Akun staff berhasil dibuat!');
        }
        setTimeout(() => window.location.href = '../../pages/auth/login-staff.html', 1800);

    } catch (error) {
        const btn = document.getElementById('regBtn');
        if (btn) {
            btn.classList.remove('loading');
            btn.innerHTML = 'Buat Akun Staff <i class="fas fa-arrow-right"></i>';
        }
        const msg = {
            "auth/email-already-in-use":   "Email sudah terdaftar!",
            "auth/weak-password":          "Password terlalu lemah, minimal 8 karakter!",
            "auth/invalid-email":          "Format email tidak valid!",
            "auth/network-request-failed": "Gagal terhubung ke internet!",
            "auth/too-many-requests":      "Terlalu banyak percobaan, coba lagi nanti!",
            "auth/configuration-not-found":"Konfigurasi Firebase tidak valid!",
        }[error.code] || `Pendaftaran gagal: ${error.message}`;
        if (typeof window.showToast === 'function') {
            window.showToast('error', msg);
        } else {
            notify('error', 'Gagal Daftar', msg);
        }
    }
};

export { auth, db, collection, onSnapshot, query, orderBy, updateDoc, doc, setDoc, addDoc, deleteDoc, getDocs, getDoc, where };