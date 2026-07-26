"use client";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = '/dashboard';
      }
    };
    checkUser();
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) {
        setAuthError(error.message);
        setLoading(false);
      }
    } catch (err: any) {
      setAuthError("Google OAuth error: Please ensure Google provider is enabled in your Supabase Dashboard under Authentication -> Providers.");
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setAuthError(null);
    try {
      const demoEmail = "demo.supplier@shamiyana.hubli";
      const demoPassword = "ShamiyanaDemoUser123!";

      // Try signing in
      const signinRes = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      let session = signinRes.data.session;

      // If user doesn't exist yet, sign them up
      if (signinRes.error && signinRes.error.message.includes("Invalid login credentials")) {
        const signupRes = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
        });
        if (signupRes.error) {
          throw signupRes.error;
        }
        session = signupRes.data.session;
      } else if (signinRes.error) {
        throw signinRes.error;
      }

      if (session) {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to create demo session.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="bg-[#FAF7F2] flex flex-col min-h-screen font-sans">
      {/* Top nav */}
      <div className="px-5 pt-5 pb-3">
        <Link href="/" className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm">
          <svg className="w-5 h-5 text-[#333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-6 pb-20">
        {/* Logo */}
        <div className="w-16 h-16 bg-[#F59032] rounded-2xl flex items-center justify-center mb-8 shadow-md shadow-orange-200">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18"/><path d="M12 5l9 16"/><path d="M12 5l-9 16"/><path d="M12 5v16"/>
            <path d="M12 5V2l3 1.5L12 5"/><path d="M9 14l3-2 3 2"/>
          </svg>
        </div>
        
        {/* Headings */}
        <div className="mb-2">
          <h1 className="text-[30px] font-extrabold text-[#1A1A1A] leading-[1.1] tracking-tight">
            Welcome back
          </h1>
          <p className="text-[16px] text-[#888] mt-1.5 font-medium">ಮರಳಿ ಸುಸ್ವಾಗತ, ಪೂರೈಕೆದಾರರೇ</p>
        </div>

        <p className="text-[14px] text-[#777] mb-8 leading-relaxed max-w-[320px]">
          Log in to manage your inventory and connect with customers.
        </p>

        {/* Error */}
        {authError && (
          <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[13px] font-medium leading-relaxed flex items-start gap-3">
            <span className="text-lg mt-[-2px]">⚠️</span>
            <span>{authError}</span>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-3">
          <button 
            onClick={handleGoogleLogin} 
            disabled={loading || demoLoading}
            className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white font-semibold py-4 rounded-2xl shadow-sm flex items-center justify-center gap-3 transition active:scale-[0.98] disabled:opacity-50 text-[15px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-gray-200" />
            <span className="flex-shrink mx-4 text-[11px] text-[#aaa] font-semibold uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          <button 
            onClick={handleDemoLogin} 
            disabled={loading || demoLoading}
            className="w-full bg-white border border-gray-200 text-[#333] hover:border-[#F59032] hover:text-[#F59032] font-semibold py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 text-[14px]"
          >
            {demoLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#F59032] border-t-transparent rounded-full animate-spin" />
                Logging in...
              </span>
            ) : (
              <>⚡ Quick Demo Login</>
            )}
          </button>
        </div>
        
        <p className="text-[13px] text-[#999] mt-8 text-center">
          Don&apos;t have an account? <Link href="/" className="text-[#F59032] font-semibold hover:underline">Apply here</Link>
        </p>
      </div>
    </div>
  );
}
