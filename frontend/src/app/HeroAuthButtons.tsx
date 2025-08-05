"use client";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export default function HeroAuthButtons() {
  const { user, supabase } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  // Hide buttons when user scrolls past hero section
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight * 0.8; // Hide when 80% through hero section
      setIsVisible(scrollY < heroHeight);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Play sound function
  function playSound(src: string) {
    try {
      const audio = new window.Audio(src);
      audio.play().catch(e => console.error("Audio play error:", e));
    } catch (e) {
      console.error("Audio error:", e);
    }
  }

  // Clear document context function
  const clearDocumentContext = async (silent = false) => {
    try {
      const res = await fetch("https://codegeass321-backendserver.hf.space/api/clear", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Origin": window.location.origin
        }
      });
      
      const data = await res.json();
      console.log('Clear context response:', data);
      
      if (!silent) {
        console.log("Context cleared with notification");
      }
    } catch (error) {
      console.error('Error clearing context:', error);
    }
  };

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          playSound('/wrongpass.mp3');
        }
        else {
          setShowModal(false);
          setSuccessMsg('Login successful!');
          playSound('/rightpass.mp3');
          
          // First clear document context
          await clearDocumentContext(true);
          
          // Set a brief timeout to show the success message before refreshing
          setTimeout(() => {
            // Force page refresh to ensure clean state
            window.location.reload();
          }, 1000);
        }
      } else {
        // Get the site URL for redirects - prioritize env var, fallback to window.location.origin
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        const redirectTo = `${siteUrl}/auth/callback`;
        
        console.log("Using redirect URL:", redirectTo);
        
        // Sign up with redirect URL to fix localhost issue
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo
          }
        });
        
        if (error) setError(error.message);
        else {
          setShowModal(false);
          setSuccessMsg('Registration successful! Please check your email to verify your account.');
          setTimeout(() => setSuccessMsg(''), 3500);
        }
      }
    } catch {
      setError('Something went wrong.');
    }
    setLoading(false);
  }

  const handleLogout = async () => {
    await clearDocumentContext(true);
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Auth buttons with responsive sizing and mobile optimization */}
      <div 
        className={`fixed top-4 right-4 md:top-6 md:right-6 lg:top-8 lg:right-8 z-[9999] flex gap-2 md:gap-3 items-center transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {user ? (
          <>
            <span className="text-gray-300 text-sm md:text-base font-medium hidden sm:block truncate max-w-32 md:max-w-40">{user.email}</span>
            <button
              className="px-3 py-1.5 md:px-4 md:py-2 lg:px-5 lg:py-2.5 rounded-lg text-sm md:text-base bg-white/20 text-red-400 border border-red-200/50 hover:bg-white/30 transition font-medium backdrop-blur-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              className="px-3 py-1.5 md:px-4 md:py-2 lg:px-5 lg:py-2.5 rounded-lg text-sm md:text-base bg-white/20 text-white border border-blue-200/50 hover:bg-white/30 transition font-medium backdrop-blur-sm"
              onClick={() => { setIsLogin(true); setShowModal(true); }}
            >
              Login
            </button>
            <button
              className="px-3 py-1.5 md:px-4 md:py-2 lg:px-5 lg:py-2.5 rounded-lg text-sm md:text-base bg-white/20 text-white border border-blue-200/50 hover:bg-white/30 transition font-medium backdrop-blur-sm"
              onClick={() => { setIsLogin(false); setShowModal(true); }}
            >
              Sign Up
            </button>
          </>
        )}
      </div>

      {/* Auth modal with mobile optimization */}
      {showModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form onSubmit={handleAuth} className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg rounded-2xl sm:rounded-3xl p-4 sm:p-8 w-full max-w-xs flex flex-col gap-3 sm:gap-4 animate-pop">
            <h2 className="text-lg sm:text-2xl font-extrabold text-center mb-2 text-blue-700 drop-shadow cursive-welcome">{isLogin ? 'Login' : 'Sign Up'}</h2>
            <input
              type="email"
              className="border-2 border-blue-300 rounded px-3 py-2 text-sm sm:text-base focus:border-blue-700 focus:ring-2 focus:ring-blue-200 bg-white/90"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="border-2 border-blue-300 rounded px-3 py-2 text-sm sm:text-base focus:border-blue-700 focus:ring-2 focus:ring-blue-200 bg-white/90"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {error && <div className="text-red-600 text-xs sm:text-sm text-center font-semibold">{error}</div>}
            <button
              type="submit"
              className="bg-blue-200 text-blue-900 py-2 rounded-lg text-sm sm:text-base font-bold hover:bg-blue-300 transition shadow border border-blue-300"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
            </button>
            <button
              type="button"
              className="text-xs text-blue-400 mt-2 hover:underline hover:text-blue-600 transition"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Success message */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 z-[10000] -translate-x-1/2 bg-green-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg font-semibold text-center text-xs sm:text-sm animate-pop max-w-xs sm:max-w-md">
          {successMsg}
        </div>
      )}
    </>
  );
}
