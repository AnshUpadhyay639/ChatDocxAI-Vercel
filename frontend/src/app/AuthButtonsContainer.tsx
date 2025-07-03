"use client";
import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function AuthButtonsContainer() {
  const { user, supabase } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

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
        const { error } = await supabase.auth.signUp({ email, password });
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
    // Clear document context before signing out
    await clearDocumentContext(true);
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <>
      {/* Auth buttons with absolute positioning and high z-index */}
      <div 
        id="auth-buttons-root"
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 999999,
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          pointerEvents: 'auto'
        }}
      >
        {user ? (
          <>
            <span className="text-gray-500 font-semibold" style={{pointerEvents: 'auto'}}>{user.email}</span>
            <button
              id="logout-button"
              className="auth-button px-3 py-1 rounded-lg bg-white/20 text-red-600 border border-blue-100 hover:bg-white/40 transition shadow-none text-sm font-medium backdrop-blur-sm"
              onClick={handleLogout}
              style={{
                pointerEvents: 'auto',
                cursor: 'pointer',
                opacity: 1,
                visibility: 'visible'
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              id="login-button"
              className="auth-button px-3 py-1 rounded bg-white/20 text-white border border-blue-200 hover:bg-white/40 transition text-sm font-medium shadow-none backdrop-blur-sm"
              onClick={() => { setIsLogin(true); setShowModal(true); }}
              style={{
                pointerEvents: 'auto',
                cursor: 'pointer',
                opacity: 1,
                visibility: 'visible'
              }}
            >
              Login
            </button>
            <button
              id="signup-button"
              className="auth-button px-3 py-1 rounded bg-white/20 text-white border border-blue-200 hover:bg-white/40 transition text-sm font-medium shadow-none backdrop-blur-sm"
              onClick={() => { setIsLogin(false); setShowModal(true); }}
              style={{
                pointerEvents: 'auto',
                cursor: 'pointer',
                opacity: 1,
                visibility: 'visible'
              }}
            >
              Sign Up
            </button>
          </>
        )}
      </div>

      {/* Auth modal */}
      {showModal && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{pointerEvents: 'auto'}}>
          <form onSubmit={handleAuth} className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg rounded-3xl p-8 w-full max-w-xs flex flex-col gap-4 animate-pop">
            <h2 className="text-2xl font-extrabold text-center mb-2 text-blue-700 drop-shadow cursive-welcome">{isLogin ? 'Login' : 'Sign Up'}</h2>
            <input
              type="email"
              className="border-2 border-blue-300 rounded px-3 py-2 focus:border-blue-700 focus:ring-2 focus:ring-blue-200"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="border-2 border-blue-300 rounded px-3 py-2 focus:border-blue-700 focus:ring-2 focus:ring-blue-200 bg-white/10 backdrop-blur placeholder:text-blue-900/60 text-blue-900/90"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {error && <div className="text-red-600 text-sm text-center font-semibold">{error}</div>}
            <button
              type="submit"
              className="bg-blue-200 text-blue-900 py-2 rounded-lg font-bold hover:bg-blue-300 transition shadow border border-blue-300"
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
        <div className="fixed top-8 left-1/2 z-[1000000] -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg font-semibold text-center animate-pop">
          {successMsg}
        </div>
      )}
    </>
  );
}
