
import React, { useState } from 'react';
import { useAuth } from '../services/authContext';
import { Loader2, Lock, Mail, ArrowRight, User, Eye, EyeOff } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login, signup, loading, error, clearError } = useAuth();
  
  // Modes: Login vs Signup
  const [isLogin, setIsLogin] = useState(true);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      if (!email || !password) return;
      await login(email, password, rememberMe);
    } else {
      if (!email || !password || !name) return;
      if (password !== confirmPassword) {
        alert("Les mots de passe ne correspondent pas.");
        return;
      }
      await signup(email, password, name);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 font-sans transition-colors duration-300">
      <div className="w-full max-w-md animate-in slide-in-from-bottom-10 fade-in duration-500">
        
        {/* Logo Header */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto mb-6 text-indigo-600 flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
             <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" />
                <path d="M8 7v10M16 7v10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1" />
             </svg>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">HotelOS</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Plateforme de Gestion Hôtelière</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl p-8 border border-slate-100 dark:border-slate-700/50 relative overflow-hidden transition-all duration-300">
          <h2 className="text-xl font-black mb-8 dark:text-white">{isLogin ? 'Connexion' : 'Création de compte'}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* SIGN UP: Name Field */}
            {!isLogin && (
              <div className="space-y-2 animate-in slide-in-from-right-10 fade-in">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nom & Prénom</label>
                <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-colors">
                  <User size={20} className="text-slate-400" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="bg-transparent outline-none flex-1 font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Professionnel</label>
              <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-colors">
                <Mail size={20} className="text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@hotel.com"
                  className="bg-transparent outline-none flex-1 font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Mot de passe</label>
              <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-colors">
                <Lock size={20} className="text-slate-400" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent outline-none flex-1 font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-indigo-500 transition-colors">
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            {/* SIGN UP: Confirm Password */}
            {!isLogin && (
              <div className="space-y-2 animate-in slide-in-from-right-10 fade-in">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Confirmer le mot de passe</label>
                <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-colors">
                  <Lock size={20} className="text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-transparent outline-none flex-1 font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* LOGIN ONLY: Remember Me */}
            {isLogin && (
              <div className="flex items-center gap-3 px-2">
                 <label className="relative flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      checked={rememberMe} 
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 group-hover:border-indigo-400'}`}>
                       <svg className={`w-3 h-3 text-white transition-transform ${rememberMe ? 'scale-100' : 'scale-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">Se souvenir de moi</span>
                 </label>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold text-center animate-in shake">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 rounded-[24px] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <>{isLogin ? 'Se connecter' : 'S\'inscrire'} <ArrowRight size={20} /></>}
            </button>
          </form>
          
          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <button 
              type="button"
              onClick={() => { setIsLogin(!isLogin); clearError(); }}
              className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
            >
              {isLogin ? "Pas encore de compte ? Créer un accès" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
