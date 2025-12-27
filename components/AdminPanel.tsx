
import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, firebaseInstance } from '../services/firebase';

interface AdminPanelProps {
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [validity, setValidity] = useState(30);
    const [role, setRole] = useState('user');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', msg: '' });
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [renewModal, setRenewModal] = useState<{ isOpen: boolean, email: string, days: number }>({ isOpen: false, email: '', days: 30 });

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const snapshot = await db.collection('users').get();
            const list = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            setUsers(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [activeTab]);

    // Cálculo de usuários online (visto nos últimos 5 minutos)
    const onlineUsers = useMemo(() => {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        return users.filter(u => {
            if (!u.lastSeen) return false;
            const lastSeenDate = u.lastSeen.toDate();
            return lastSeenDate.getTime() > fiveMinutesAgo;
        });
    }, [users]);

    const onlineCount = onlineUsers.length;

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', msg: '' });

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + validity);

            await db.collection('users').doc(user.uid).set({
                name,
                email,
                role,
                expirationDate: firebaseInstance.firestore.Timestamp.fromDate(expirationDate),
                createdAt: firebaseInstance.firestore.Timestamp.fromDate(new Date()),
                lastSeen: firebaseInstance.firestore.Timestamp.fromDate(new Date())
            });

            setStatus({ type: 'success', msg: 'Usuário criado com sucesso!' });
            setName(''); setEmail(''); setPassword('');
            fetchUsers();
        } catch (err: any) {
            setStatus({ type: 'error', msg: 'Erro: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleRenew = async () => {
        setLoading(true);
        try {
            const query = await db.collection('users').where('email', '==', renewModal.email).get();
            if (!query.empty) {
                const doc = query.docs[0];
                const newExp = new Date();
                newExp.setDate(newExp.getDate() + renewModal.days);
                await doc.ref.update({
                    expirationDate: firebaseInstance.firestore.Timestamp.fromDate(newExp)
                });
                setRenewModal({ ...renewModal, isOpen: false });
                fetchUsers();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-[#0a0a0c] w-full max-w-2xl rounded-[3rem] border border-white/10 p-8 md:p-12 shadow-2xl relative">
                
                {/* Botão de Fechar */}
                <button onClick={onClose} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors">
                    <i className="fa-solid fa-circle-xmark text-2xl"></i>
                </button>

                {/* Header Admin */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <h2 className="text-3xl font-black italic text-white tracking-tighter">PAINEL <span className="text-emerald-500">ADMIN</span></h2>
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] mt-1">Gestão de Membros e Sessões</p>
                    </div>

                    {/* Widget de Usuários Online */}
                    <div className="relative group z-50">
                        <div className="bg-emerald-500/5 border border-emerald-500/20 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-inner cursor-help transition-all hover:bg-emerald-500/10">
                            <div className="relative">
                                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute inset-0"></div>
                                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative"></div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[14px] font-black text-white tabular-nums leading-none">{onlineCount} MEMBROS</span>
                                <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest mt-1">CONECTADOS AGORA</span>
                            </div>
                        </div>

                        {/* Tooltip Lista de Usuários */}
                        <div className="absolute top-full right-0 mt-4 w-64 bg-[#0a0a0c]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top translate-y-2 group-hover:translate-y-0">
                            <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3 pb-2 border-b border-white/5">
                                Usuários Ativos
                            </div>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scroll">
                                {onlineUsers.length > 0 ? (
                                    onlineUsers.map(u => (
                                        <div key={u.id} className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                                            <span className="text-[10px] font-bold text-white/80 truncate">{u.email}</span>
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-[10px] text-white/20 italic">Ninguém mais online</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mb-8 border-b border-white/5 pb-4">
                    <button onClick={() => setActiveTab('create')} className={`text-[10px] font-black uppercase tracking-widest pb-2 transition-all ${activeTab === 'create' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-white/20'}`}>Criar Usuário</button>
                    <button onClick={() => setActiveTab('list')} className={`text-[10px] font-black uppercase tracking-widest pb-2 transition-all ${activeTab === 'list' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-white/20'}`}>Gerenciar Membros ({users.length})</button>
                </div>

                {activeTab === 'create' ? (
                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Nome Completo</label>
                            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm outline-none focus:border-emerald-500/50" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">E-mail</label>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm outline-none focus:border-emerald-500/50" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Senha</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    required 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-6 pr-12 text-sm outline-none focus:border-emerald-500/50" 
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
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Dias de Validade</label>
                            <input type="number" required value={validity} onChange={e => setValidity(Number(e.target.value))} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm outline-none focus:border-emerald-500/50" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Cargo</label>
                            <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm outline-none focus:border-emerald-500/50 text-white/60 appearance-none">
                                <option value="user">Usuário</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            {status.msg && (
                                <p className={`text-[10px] font-black uppercase text-center mb-4 ${status.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{status.msg}</p>
                            )}
                            <button disabled={loading} className="w-full bg-emerald-500 text-black font-black uppercase tracking-widest py-5 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50">
                                {loading ? 'PROCESSANDO...' : 'CADASTRAR ACESSO'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scroll">
                        {loadingUsers ? (
                            <div className="py-20 text-center text-white/20 animate-pulse text-[10px] font-black uppercase">Carregando lista...</div>
                        ) : users.length === 0 ? (
                            <div className="py-20 text-center text-white/20 text-[10px] font-black uppercase">Nenhum usuário encontrado</div>
                        ) : users.map(u => {
                            const isExpired = new Date() > u.expirationDate.toDate();
                            const isOnline = u.lastSeen && u.lastSeen.toDate().getTime() > (Date.now() - 5 * 60 * 1000);
                            
                            return (
                                <div key={u.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`}></div>
                                        <div>
                                            <p className="text-sm font-bold text-white/80">{u.email}</p>
                                            <div className="flex gap-4 mt-1">
                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Criado: {u.createdAt.toDate().toLocaleDateString()}</span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${isExpired ? 'text-rose-500' : 'text-emerald-500/50'}`}>Expira: {u.expirationDate.toDate().toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setRenewModal({ isOpen: true, email: u.email, days: 30 })} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Renovar</button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {renewModal.isOpen && (
                <div className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-[#0a0a0c] w-full max-w-sm rounded-[2rem] border border-white/10 p-8 shadow-2xl">
                        <h3 className="text-xl font-black text-white mb-6 tracking-tight">RENOVAR ACESSO</h3>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Membro: {renewModal.email}</p>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Novos Dias</label>
                                <input type="number" value={renewModal.days} onChange={e => setRenewModal({ ...renewModal, days: Number(e.target.value) })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-emerald-500/50" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setRenewModal({ ...renewModal, isOpen: false })} className="flex-1 py-3 text-[10px] font-black uppercase text-white/30 hover:text-white transition-colors">Cancelar</button>
                                <button onClick={handleRenew} className="flex-1 bg-emerald-500 text-black py-3 rounded-xl text-[10px] font-black uppercase shadow-lg">Confirmar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
