
import React, { useState } from 'react';
import { auth, db } from '../services/firebase';
import { sendLoginNotification } from '../services/telegram';

interface LoginScreenProps {
    onLoginSuccess: (isAdmin?: boolean, goToAdmin?: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [adminMode, setAdminMode] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
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
            const isAdmin = userData.role === 'admin';

            // Se tentou entrar como admin mas não é admin
            if (adminMode && !isAdmin) {
                await auth.signOut();
                setError('Acesso negado. Esta conta não possui privilégios de administrador.');
                setLoading(false);
                return;
            }

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

            sessionStorage.setItem('userRole', isAdmin ? 'admin' : 'user');

            // --- NOTIFICAÇÃO TELEGRAM ---
            sendLoginNotification(email, userData.role || 'user', adminMode)
                .catch(err => console.error("Erro ao enviar notificação de login:", err));
            // -----------------------------

            // goToAdmin = true apenas se loginMode é admin E o usuário é admin
            onLoginSuccess(isAdmin, adminMode && isAdmin);
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
            style={{ background: 'radial-gradient(ellipse at center, #0D0D12 0%, #07070A 70%)' }}>
            <div className="w-full max-w-[400px] flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">

                {/* Logo */}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-2xl overflow-hidden"
                    style={{ background: 'rgba(200,169,110,0.08)', border: '1px solid rgba(200,169,110,0.2)' }}>
                    <img src="https://i.ibb.co/G4Y8sHMk/Chat-GPT-Image-21-de-abr-de-2025-16-14-34-1.png" alt="RW" className="w-11 h-11 object-contain" />
                </div>

                <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                    RW <span style={{ color: 'var(--accent)' }}>TIPS</span>
                </h1>
                <p className="text-xs mb-8" style={{ color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
                    PLATAFORMA DE ANÁLISE PRO
                </p>

                {/* Card */}
                <div className="w-full rounded-2xl p-8"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

                    {/* Toggle Membro / Admin */}
                    <div className="flex w-full p-1 rounded-xl mb-6"
                        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                        <button type="button" onClick={() => { setAdminMode(false); setError(''); }}
                            className="flex-1 py-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2"
                            style={!adminMode
                                ? { background: 'var(--accent)', color: '#07070A' }
                                : { color: 'var(--text-muted)' }}>
                            <i className="fa-solid fa-user text-[9px]"></i> Membro
                        </button>
                        <button type="button" onClick={() => { setAdminMode(true); setError(''); }}
                            className="flex-1 py-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2"
                            style={adminMode
                                ? { background: 'var(--accent)', color: '#07070A' }
                                : { color: 'var(--text-muted)' }}>
                            <i className="fa-solid fa-shield-halved text-[9px]"></i> Admin
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-medium pl-0.5" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>E-mail</label>
                            <input type="email" required placeholder="seu@email.com"
                                className="w-full rounded-xl py-3.5 px-4 text-sm outline-none transition-all"
                                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-medium pl-0.5" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>Senha</label>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} required placeholder="••••••••"
                                    className="w-full rounded-xl py-3.5 pl-4 pr-11 text-sm outline-none transition-all"
                                    style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                    value={password} onChange={(e) => setPassword(e.target.value)} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 transition-colors"
                                    style={{ color: 'var(--text-muted)' }}>
                                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--negative-dim)', border: '1px solid rgba(248,113,113,0.2)' }}>
                                <p className="text-xs font-medium" style={{ color: 'var(--negative)' }}>{error}</p>
                            </div>
                        )}

                        <button disabled={loading}
                            className="w-full py-4 rounded-xl text-sm font-semibold uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
                            style={{ background: 'var(--accent)', color: '#07070A', letterSpacing: '0.12em' }}>
                            {loading ? 'Autenticando...' : adminMode ? 'Entrar como Admin' : 'Entrar'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center gap-3 w-full justify-center">
                    <a href="https://t.me/assuncaoIII" target="_blank"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-medium transition-all"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                        <i className="fa-brands fa-telegram" style={{ color: '#2AABEE' }}></i>
                        Suporte via Telegram
                    </a>
                </div>
            </div>
        </div>
    );
};
