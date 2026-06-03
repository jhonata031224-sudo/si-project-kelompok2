// js/services/authService.js
import { auth, db, notify } from '../firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Objek untuk melacak percobaan gagal
let loginAttempts = {
    owner: 0,
    staff: 0,
    pelanggan: 0
};

// Fungsi pembantu untuk mengecek batas kegagalan
const checkAttempts = (role) => {
    loginAttempts[role]++;
    if (loginAttempts[role] >= 5) {
        notify('warning', `Batas Keamanan Tercapai! Percobaan ke-${loginAttempts[role]} gagal. Form akan dikosongkan.`);
        // Mengosongkan form berdasarkan id umum
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => input.value = "");
        loginAttempts[role] = 0; // Reset hitungan setelah 5 kali
        return true;
    }
    return false;
};

// --- LOGIKA LOGIN OWNER ---
export const loginOwner = async (email, pass) => {
    // Validasi Hardcoded sesuai permintaan
    if (email !== "dinarjhonata03@gmail.com" || pass !== "12345678") {
        checkAttempts('owner');
        notify('error', `Email atau Password Owner Salah! (Gagal ${loginAttempts.owner}/5)`);
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        notify('success', 'Selamat Datang Boss Dinar!');
        setTimeout(() => location.href = '../../../pages/owner/dashboard-owner.html', 1500);
    } catch (e) {
        notify('error', 'Sistem gagal mengenali akses owner.');
    }
};

// --- LOGIKA LOGIN STAFF ---
export const loginStaff = async (email, pass) => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        notify('success', 'Staff Berhasil Masuk!');
        setTimeout(() => location.href = '../../../pages/staff/dashboard-staff.html', 1500);
    } catch (e) {
        checkAttempts('staff');
        notify('error', `Email atau Password Staff Salah! (Gagal ${loginAttempts.staff}/5)`);
    }
};

// --- LOGIKA LOGIN PELANGGAN (Username ke Virtual Email) ---
export const loginPelanggan = async (username, pass) => {
    const virtualEmail = `${username.toLowerCase()}@prince.com`;
    try {
        await signInWithEmailAndPassword(auth, virtualEmail, pass);
        notify('success', 'Berhasil Masuk ke Prince Games!');
        setTimeout(() => location.href = '../../../pages/pelanggan/dashboard-customer.html', 1500);
    } catch (e) {
        checkAttempts('pelanggan');
        notify('error', `Username "${username}" atau Password Salah! (Gagal ${loginAttempts.pelanggan}/5)`);
    }
};

// --- LOGIKA DAFTAR (Universal) ---
export const registerUser = async (emailOrUsername, pass, role) => {
    let finalEmail = emailOrUsername;
    
    // Jika pelanggan, ubah ke virtual email
    if (role === 'customer') {
        finalEmail = `${emailOrUsername.toLowerCase()}@prince.com`;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, pass);
        // Simpan role ke Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
            email: finalEmail,
            role: role,
            createdAt: new Date()
        });
        notify('success', `Daftar Berhasil sebagai ${role}!`);
        return true;
    } catch (e) {
        notify('error', 'Gagal Daftar! Mungkin email/username sudah ada atau koneksi bermasalah.');
        return false;
    }
};