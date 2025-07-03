"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Process the auth callback
    const processCallback = async () => {
      try {
        // Get the URL hash (for PKCE flow)
        const hash = window.location.hash;
        
        // Check if we have a session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth error:", error.message);
        }
        
        console.log("Auth callback processed:", !!data.session);
        
        // Show a success message to the user
        if (data.session) {
          // If we have a session, user is authenticated
          alert("Your email has been verified successfully! You are now logged in.");
        } else if (hash && hash.includes("access_token")) {
          // If we have an access token in the hash but no session yet
          alert("Email verification successful! Please log in now.");
        } else {
          // Generic success message as fallback
          alert("Email verification processed. You can now log in to your account.");
        }
        
        // Redirect to the home page after a short delay
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } catch (err) {
        console.error("Error in auth callback:", err);
        alert("There was an issue processing your verification. Please try logging in directly.");
        router.push('/');
      }
    };

    processCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center p-8 max-w-md w-full bg-gray-800 rounded-xl shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-4">Processing verification...</h1>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <p className="text-gray-300 mt-4">You&apos;ll be redirected in a moment.</p>
      </div>
    </div>
  );
}
