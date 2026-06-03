// js/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged 
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

const notify = (icon, title, text = "") => {
    Swal.fire({
        icon, title, text,
        background: '#11171f', color: '#fff',
        confirmButtonColor: '#00d9ff', timer: 2500
    });
};

// --- FUNGSI LOGOUT UNIVERSAL ---
export const handleLogout = async (targetUrl = '../../pages/auth/login-pelanggan.html') => {
    const result = await Swal.fire({
        title: 'Logout?',
        text: "Sesi Anda akan berakhir.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#00d9ff',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Ya, Keluar',
        background: '#11171f',
        color: '#fff'
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
    const email = document.getElementById('owner-email').value;
    const pass = document.getElementById('owner-pass').value;
    if (email !== "dinarjhonata03@gmail.com" || pass !== "12345678") {
        if (typeof window.setLoading === 'function') window.setLoading(false);
        notify('error', 'Akses Ditolak', 'Kredensial Owner salah!');
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        notify('success', 'Selamat Datang Owner!');
        setTimeout(() => window.location.href = '../../pages/owner/dashboard-owner.html', 1500);
    } catch (error) {
        if (typeof window.setLoading === 'function') window.setLoading(false);
        notify('error', 'Login Gagal', 'Periksa koneksi atau akun Anda.');
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