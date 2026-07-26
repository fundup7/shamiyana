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
    <div className="bg-[#FBF6ED] flex flex-col min-h-screen font-sans px-7">
      <div className="pt-8 pb-4">
        <Link href="/" className="w-10 h-10 flex items-center justify-start text-[#1F1F1F]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-start pt-6 pb-20">
        <div className="w-[72px] h-[72px] bg-[#F59032] rounded-2xl flex items-center justify-center mb-8 shadow-sm">
          {/* Tent Icon SVG */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18"></path>
            <path d="M12 5l9 16"></path>
            <path d="M12 5l-9 16"></path>
            <path d="M12 5v16"></path>
            <path d="M12 5V2l3 1.5L12 5"></path>
            <path d="M9 14l3-2 3 2"></path>
          </svg>
        </div>
        
        <div className="mb-4 space-y-1">
          <h2 className="text-[28px] font-extrabold text-[#1F1F1F] leading-[1.1] tracking-tight">ಮರಳಿ ಸುಸ್ವಾಗತ,</h2>
          <h2 className="text-[28px] font-extrabold text-[#1F1F1F] leading-[1.1] tracking-tight">ಪೂರೈಕೆದಾರರೇ</h2>
          <h1 className="text-[18px] font-bold text-[#1F1F1F] leading-snug pt-1">Welcome back, Supplier.</h1>
        </div>

        <p className="text-[14px] text-[#1F1F1F] font-medium mb-8 max-w-[300px] leading-relaxed">
          Log in to manage your inventory and bookings.
        </p>

        {authError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold leading-relaxed">
            ⚠️ {authError}
          </div>
        )}
        
        <div className="space-y-3">
          <button 
            onClick={handleGoogleLogin} 
            disabled={loading || demoLoading}
            className="w-full bg-[#F59032] hover:bg-[#E88022] text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-3 transition active:scale-95 disabled:opacity-50 text-[14px]"
          >
            {loading ? "Connecting to Google..." : (
              <>
                <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-3 text-[11px] text-gray-500 font-bold uppercase tracking-wider">or fast access</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <button 
            onClick={handleDemoLogin} 
            disabled={loading || demoLoading}
            className="w-full bg-white border border-[#F59032] text-[#F59032] hover:bg-[#FDF8F0] font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 text-[13px]"
          >
            {demoLoading ? "Logging in..." : "⚡ Quick Demo Supplier Login (1-Click)"}
          </button>
        </div>
        
        <p className="text-[13px] text-[#505762] mt-6 font-medium">
          ಖಾತೆ ಇಲ್ಲವೇ? Don't have an account? <Link href="/" className="text-[#F59032] font-bold hover:underline">Apply here</Link>
        </p>
      </div>
    </div>
  );
}
