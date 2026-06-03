// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAqa9FTlNuVXGHnINFN1qz8-aoGTrn-0g4",
    authDomain: "prince-games-f170a.firebaseapp.com",
    projectId: "prince-games-f170a",
    storageBucket: "prince-games-f170a.firebasestorage.app",
    messagingSenderId: "245728198046",
    appId: "1:245728198046:web:b6136e05459f23a96677f5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Fungsi Notifikasi Global menggunakan SweetAlert2
export const notify = (icon, text) => {
    Swal.fire({
        icon: icon,
        title: icon === 'success' ? 'Berhasil' : 'Gagal',
        text: text,
        background: '#11171f',
        color: '#fff',
        confirmButtonColor: '#00d9ff'
    });
};