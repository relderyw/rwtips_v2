
import React, { useState } from 'react';
import { auth, db } from '../services/firebase';

interface LoginScreenProps {
    onLoginSuccess: (isAdmin?: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                await auth.signOut();
                setError('Dados do usuário não encontrados no banco de dados.');
                setLoading(false);
                return;
            }

            const userData = userDoc.data();
            const currentDate = new Date();
            const expirationDate = userData.expirationDate.toDate();

            if (currentDate > expirationDate) {
                await auth.signOut();
                setError('Sua assinatura expirou. Entre em contato com o suporte.');
                setLoading(false);
                return;
            }

            // --- LÓGICA DE SESSÃO ÚNICA ---
            const newSessionId = Date.now().toString();
            await db.collection('users').doc(user.uid).update({
                activeSessionId: newSessionId
            });
            localStorage.setItem('activeSessionId', newSessionId);
            // ------------------------------

            const token = await user.getIdToken();
            
            localStorage.setItem('authToken', token);
            localStorage.setItem('userEmail', email);
            localStorage.setItem('tokenExpiry', expirationDate.getTime().toString());
            sessionStorage.setItem('loggedIn', 'true');
            
            const isAdmin = userData.role === 'admin';
            onLoginSuccess(isAdmin);
        } catch (err: any) {
            console.error("Auth Error:", err.code, err.message);
            
            if (err.code === 'auth/invalid-login-credentials' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('E-mail ou senha inválidos. Verifique suas credenciais.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Muitas tentativas falhas. Tente novamente mais tarde.');
            } else if (err.code === 'auth/network-request-failed') {
                setError('Falha de conexão. Verifique sua internet.');
            } else {
                setError('Erro ao autenticar: ' + (err.message || 'Falha desconhecida'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#030303] p-6">
            <div className="w-full max-w-md bg-[#0a0a0c] border border-white/10 rounded-[3rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,1)] flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 flex items-center justify-center mb-8 shadow-2xl relative group overflow-hidden">
                    <img src="https://i.ibb.co/G4Y8sHMk/Chat-GPT-Image-21-de-abr-de-2025-16-14-34-1.png" alt="RW" className="w-14 h-14 object-contain group-hover:scale-110 transition-transform" />
                </div>
                
                <h2 className="text-3xl font-black italic tracking-tighter text-white mb-2">👑RW <span className="text-emerald-500">TIPS🎮</span></h2>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-10 text-center">Acesso exclusivo para membros pro</p>

                <form onSubmit={handleLogin} className="w-full space-y-5">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">E-mail de Usuário</label>
                        <input 
                            type="email" 
                            required
                            placeholder="seu@email.com"
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/10"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Senha de Acesso</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="••••••••"
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-6 pr-12 text-sm outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/10"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors p-2"
                            >
                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center animate-pulse">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    <button 
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-xs"
                    >
                        {loading ? 'AUTENTICANDO...' : 'ENTRAR'}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-white/5 w-full flex flex-col gap-4">
                    <p className="text-center text-[10px] font-bold text-white/10 uppercase tracking-widest">Suporte Direto</p>
                    <div className="flex gap-4">
                        <a href="https://wa.me/5592994951771" target="_blank" className="flex-1 bg-white/[0.02] border border-white/5 py-3 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all">
                            <i className="fa-brands fa-whatsapp text-emerald-500"></i> WhatsApp
                        </a>
                        <a href="https://t.me/assuncaoIII" target="_blank" className="flex-1 bg-white/[0.02] border border-white/5 py-3 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest hover:bg-blue-500/5 hover:border-blue-500/20 transition-all">
                            <i className="fa-brands fa-telegram text-blue-500"></i> Telegram
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
