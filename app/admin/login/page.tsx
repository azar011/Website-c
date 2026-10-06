'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('admin_session_auth', '1');
        }
        if (data.admin?.role === 'SUPER_ADMIN') {
          window.location.replace('/admin/users');
        } else {
          window.location.replace('/admin');
        }
      } else {
        setErrorMsg(data.error || 'Invalid credentials');
      }
    } catch {
      setErrorMsg('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#17062b] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(125,45,215,0.4),rgba(15,4,28,0.98))] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Ambient lighting glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-purple-600/15 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />

      {/* Subtle diamond sparkle star in bottom right */}
      <div className="fixed bottom-10 right-10 pointer-events-none opacity-20 hidden sm:block">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-purple-300 animate-pulse"
          style={{ animationDuration: '4s' }}
        >
          <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
        </svg>
      </div>

      {/* Brand Header */}
      <div className="flex flex-col items-center mb-7 sm:mb-8 text-center z-10">
        <div className="relative w-36 h-28 sm:w-44 sm:h-32 mb-1.5 flex items-center justify-center">
          <Image
            src="/logo-3d.png"
            alt="XamPlus Logo"
            width={200}
            height={140}
            className="w-full h-full object-contain drop-shadow-[0_16px_32px_rgba(110,40,220,0.45)]"
            priority
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          XamPlus Admin
        </h1>
        <p className="text-xs sm:text-[13px] text-purple-200/60 mt-1 font-normal tracking-wide">
          Online Assessment & Examination Management Portal
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[440px] bg-[#22103d]/45 backdrop-blur-2xl border border-white/[0.12] rounded-[28px] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden">
        {/* Soft top highlight line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Administrator Sign In
            </h2>
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest bg-white/[0.08] px-3 py-1 rounded-full border border-purple-400/25 shadow-sm">
              SECURED JWT
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-purple-100/90 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-purple-300/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full text-xs sm:text-sm pl-11 pr-4 py-3.5 rounded-2xl bg-[#0f0520]/80 border border-white/[0.08] text-white placeholder:text-purple-300/30 outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/25 transition shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-purple-100/90 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-purple-300/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full text-xs sm:text-sm pl-11 pr-11 py-3.5 rounded-2xl bg-[#0f0520]/80 border border-white/[0.08] text-white placeholder:text-purple-300/30 outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/25 transition shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-purple-300/40 hover:text-purple-200 transition"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-[#6e38f7] hover:bg-[#7b46fa] active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-purple-900/50 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 mt-5 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Note on Students */}
        <div className="mt-5 text-center">
          <p className="text-xs text-purple-200/50">
            Students do not need an account.{' '}
            <Link href="/" className="text-purple-300 hover:text-purple-100 hover:underline transition">
              Go to Student Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
