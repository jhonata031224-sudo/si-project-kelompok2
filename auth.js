// js/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAqa9FTlNuVXGHnINFN1qz8-aoGTrn-0g4",
  authDomain: "prince-games-f170a.firebaseapp.com",
  projectId: "prince-games-f170a",
  storageBucket: "prince-games-f170a.firebasestorage.app",
  messagingSenderId: "245728198046",
  appId: "1:245728198046:web:b613645f5f51b9fc3f6a8f",
  measurementId: "G-DEYHC96NNP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const notify = (icon, title) => {
    Swal.fire({
        toast: true, position: 'top', showConfirmButton: false, timer: 3000,
        icon: icon, title: title, background: '#11171f', color: '#fff'
    });
};

// --- FUNGSI DAFTAR PELANGGAN ---
window.handleRegisterPelanggan = async () => {
    const user = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value;

    if (!user || !pass) return notify('warning', 'Username/Password wajib diisi!');

    try {
        const emailVirtual = `${user.toLowerCase()}@prince.com`;
        await createUserWithEmailAndPassword(auth, emailVirtual, pass);
        
        // Jika berhasil, tampilkan pesan sukses hijau
        Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: 'Akun Anda sudah terdaftar. Silakan masuk.',
            background: '#11171f',
            color: '#fff'
        });
        
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    } catch (error) {
        console.error("Error Daftar:", error.code);
        // Memberikan info lebih spesifik jika username sudah ada
        if (error.code === 'auth/email-already-in-use') {
            notify('error', 'Username sudah dipakai! Gunakan nama lain.');
        } else {
            notify('error', 'Gagal Daftar! Pastikan password minimal 6 karakter.');
        }
    }
};

// --- FUNGSI LOGIN PELANGGAN ---
window.handleLoginPelanggan = async () => {
    const userField = document.getElementById('username-cust');
    const passField = document.getElementById('pass-cust');

    if (!userField || !passField) return console.error("ID Input tidak ditemukan!");

    const user = userField.value.trim();
    const pass = passField.value;

    if (!user || !pass) return notify('warning', 'Username/Password kosong!');

    try {
        const emailVirtual = `${user.toLowerCase()}@prince.com`;
        await signInWithEmailAndPassword(auth, emailVirtual, pass);
        notify('success', 'Berhasil Masuk!');
        setTimeout(() => { window.location.href = 'dashboard-customer.html'; }, 1500);
    } catch (error) {
        notify('error', 'Username atau Password salah!');
    }
};

// --- FUNGSI OWNER ---
window.handleLoginOwner = async () => {
    const email = document.getElementById('owner-email').value;
    const pass = document.getElementById('owner-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        notify('success', 'Halo Bos! Selamat Datang.');
        setTimeout(() => { window.location.href = 'dashboard-owner.html'; }, 2000);
    } catch (e) { notify('error', 'Akses Ditolak!'); }
};

// --- FUNGSI STAFF ---
window.handleLoginStaff = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        notify('success', 'Login Staff Berhasil!');
        setTimeout(() => { window.location.href = 'dashboard-staff.html'; }, 2000);
    } catch (e) { notify('error', 'Email/Password Salah!'); }
};