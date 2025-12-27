
declare const firebase: any;

const firebaseConfig = {
    apiKey: "AIzaSyALiAKWq7Z6B9ut6KCHt9L4g8Vt8VHF6iM",
    authDomain: "rw-tips.firebaseapp.com",
    projectId: "rw-tips",
    storageBucket: "rw-tips.appspot.com",
    messagingSenderId: "806941219354",
    appId: "1:806941219354:web:6f904532b6884251444fa3",
    measurementId: "G-64HF8TWQV4",
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export const auth = firebase.auth();
export const firebaseInstance = firebase;

// Export modular Firestore for Bankroll Manager compatibility
// We import from the installed package to get the modular SDK functions
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// The partial config used above is also valid for modular SDK
// To avoid conflicts with the global firebase (compat) app and potential version mismatches,
// we initialize a SPECIFIC named app for the modular SDK parts.
let modularApp;
try {
    // Check if app already initialized to avoid duplicate app error on hot reload
    modularApp = getApp("BankrollApp");
} catch (e) {
    modularApp = initializeApp(firebaseConfig, "BankrollApp");
}

export const dbModular = getFirestore(modularApp);

/**
 * Verifica se existe uma sessão ativa válida.
 * Retorna true se os tokens estiverem presentes e dentro da validade.
 */
export const checkSession = (): boolean => {
    try {
        const loggedIn = sessionStorage.getItem('loggedIn') === 'true';
        const token = localStorage.getItem('authToken');
        const expiry = localStorage.getItem('tokenExpiry');
        
        if (!loggedIn || !token || !expiry) return false;
        
        const isExpired = Date.now() > Number(expiry);
        if (isExpired) {
            // Não chamamos logout() aqui para evitar recursão em ciclos de renderização
            return false;
        }
        
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Realiza o logout limpando todos os dados de autenticação.
 */
export const logout = async () => {
    try {
        await auth.signOut();
    } catch (e) {
        console.warn("Firebase signout error:", e);
    }
    
    // Limpeza de storage
    sessionStorage.removeItem('loggedIn');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('tokenExpiry');
    
    // Não utilizamos window.location.reload() para evitar falhas no ambiente de preview
};
