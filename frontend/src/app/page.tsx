"use client";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { fetchUserChats, saveUserChat, deleteAllUserChats } from "./supabaseChats";
import type { Chat } from "./supabaseChats";
import type { User } from '@supabase/supabase-js';

const welcomes = [
	{ text: "नमस्ते", lang: "Hindi" },
	{ text: "ようこそ", lang: "Japanese" },
	{ text: "欢迎", lang: "Chinese" },
	{ text: "Bienvenue", lang: "French" },
	{ text: "Bem-vindo", lang: "Portuguese" },
	{ text: "Willkommen", lang: "German" },
	{ text: "Добро пожаловать", lang: "Russian" },
	{ text: "أهلاً وسهلاً", lang: "Arabic" },
	{ text: "Welcome", lang: "English" },
];

const welcomeColors = [
	"#FFB300", // Hindi - saffron
	"#0099FF", // Japanese - blue
	"#43A047", // Chinese - green
	"#E91E63", // French - pink
	"#8D6E63", // Portuguese - brown
	"#3949AB", // German - indigo
	"#FF7043", // Russian - orange
	"#8E24AA", // Arabic - purple
	"#FFFFFF", // English - white
];

function DotsLoader() {
	return (
		<span className="inline-flex items-center h-6">
			<svg
				width="32"
				height="16"
				viewBox="0 0 32 16"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle cx="4" cy="8" r="4" fill="#fff">
					<animate
						attributeName="cy"
						values="8;4;8"
						dur="0.6s"
						repeatCount="indefinite"
						begin="0s"
					/>
				</circle>
				<circle cx="16" cy="8" r="4" fill="#fff">
					<animate
						attributeName="cy"
						values="8;4;8"
						dur="0.6s"
						repeatCount="indefinite"
						begin="0.2s"
					/>
				</circle>
				<circle cx="28" cy="8" r="4" fill="#fff">
					<animate
						attributeName="cy"
						values="8;4;8"
						dur="0.6s"
						repeatCount="indefinite"
						begin="0.4s"
					/>
				</circle>
			</svg>
			<span className="ml-2 text-xs text-white">Transcribing audio...</span>
		</span>
	);
}

export default function Home() {
	const { user, supabase } = useAuth();
	const [messages, setMessages] = useState([
		{
			role: "assistant",
			content: "Hi! Upload a document or ask me anything (text or audio).",
		},
	]);
	const [input, setInput] = useState("");
	const [files, setFiles] = useState<File[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [recording, setRecording] = useState(false);
	const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
	const [loading, setLoading] = useState(false);
	const [recordError, setRecordError] = useState<string | null>(null);
	const [docxProcessing, setDocxProcessing] = useState(false);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const [welcomeIdx, setWelcomeIdx] = useState(0);
	const [flip, setFlip] = useState(false);
	const [rouletteDone, setRouletteDone] = useState(false);
	const [inertia, setInertia] = useState(false);
	const heroRef = useRef<HTMLDivElement>(null);
	const [scrollY, setScrollY] = useState(0);
	const [heroWasHidden, setHeroWasHidden] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [chatHistory, setChatHistory] = useState<Chat[]>([]);
	const [chatError, setChatError] = useState<string | null>(null);
	const [micLevel, setMicLevel] = useState(0); // 0-1, for mic button fill
	const animationFrameRef = useRef<number | null>(null); // Restore animationFrameRef for mic level animation cancellation

	useEffect(() => {
		if (user) {
			fetchUserChats(user.id)
				.then((data) => {
					console.log('fetchUserChats data:', data);
					setChatHistory(data);
				})
				.catch((err) => {
					setChatHistory([]);
					setChatError(err.message || JSON.stringify(err));
					console.error('Fetch chat error:', err);
				});
		} else {
			setChatHistory([]);
			setChatError(null);
		}
	}, [user]);

	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (!rouletteDone) {
			let count = 0;
			interval = setInterval(() => {
				setFlip(true);
				setTimeout(() => {
					setWelcomeIdx((idx) => (idx + 1) % welcomes.length);
					setFlip(false);
				}, 60);
				count++;
				if (count > 22) {
					clearInterval(interval);
					// Inertia phase: slow down and bounce
					let inertiaCount = 0;
					setTimeout(() => {
						setInertia(true);
						const inertiaSteps = [120, 180, 240, 320, 400];
						function inertiaStep() {
							if (inertiaCount < inertiaSteps.length) {
								setFlip(true);
								setTimeout(() => {
									setWelcomeIdx((idx) => (idx + 1) % welcomes.length);
									setFlip(false);
									inertiaCount++;
									setTimeout(inertiaStep, inertiaSteps[inertiaCount] || 0);
								}, 120);
							} else {
								setTimeout(() => {
									setWelcomeIdx(welcomes.length - 1); // stop at 'Welcome'
									setInertia(false);
									setRouletteDone(true);
								}, 400);
							}
						}
						inertiaStep();
					}, 60);
				}
			}, 80);
		}
		return () => clearInterval(interval);
	}, [rouletteDone]);

	useEffect(() => {
		const handleScroll = () => {
			setScrollY(window.scrollY);
			// If hero section is fully hidden and then becomes visible again, reset welcome animation
			if (window.scrollY > window.innerHeight * 0.5) {
				setHeroWasHidden(true);
			} else if (heroWasHidden && window.scrollY < window.innerHeight * 0.2) {
				setWelcomeIdx(0);
				setRouletteDone(false);
				setHeroWasHidden(false);
			}
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [heroWasHidden]);

	// Calculate fade and scale based on scroll position
	const fade = Math.max(0, 1 - scrollY / 300);
	const scale = Math.max(0.85, 1 - scrollY / 1200);
	const bgFade = Math.max(0, 0.45 - scrollY / 800);

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() && !audioBlob) return;
		playSound("/send.wav"); // Play send sound
		// Add user message (text or placeholder for audio)
		setMessages((msgs) => [...msgs, { role: "user", content: input || "[audio]" }]);
		setLoading(true);
		const formData = new FormData(); // To store the text input OR audio blob in K-V pairs & send to backend
		if (input.trim()) {
			formData.append("text", input);
		}
		if (audioBlob) {
			formData.append("audio", audioBlob, "audio.webm");
		}
		// Clear input and audio blob
		setInput("");
		setAudioBlob(null);
		// Wait for the UI to update so the animation is visible
		await new Promise((resolve) => setTimeout(resolve, 0));
		// Save user message
		if (user && input.trim()) {
			try {
				console.log("user.id value and type:", user.id, typeof user.id);
				console.log("Saving chat with:", user.id, 'user', input.trim());
				await saveUserChat(user.id, 'user', input.trim());
			} catch (err) {
				setChatError("Save chat error: " + JSON.stringify(err, null, 2));
				console.error('Save chat error:', err);
			}
		}
		try {
			const res = await fetch("https://codegeass321-backendserver.hf.space/proxy/8000/ask", {
				method: "POST",
				headers: {
					"Accept": "application/json",
					"Origin": window.location.origin
				},
				body: formData,
			});
			
			// Check if response is OK (status in the range 200-299)
			if (!res.ok) {
				console.error('API Error:', res.status, res.statusText);
				const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
				throw new Error(`API Error ${res.status}: ${errorData.message || res.statusText}`);
			}
			
			const data = await res.json();
			console.log('API Response:', data); // Debug the response
			
			setMessages((msgs) => {
				// If the last user message was audio, replace its content with the transcription
				if (
					msgs.length > 0 &&
					msgs[msgs.length - 1].role === "user" &&
					msgs[msgs.length - 1].content === "[audio]" &&
					data.transcribed
				) {
					const updated = [...msgs];
					updated[updated.length - 1] = { role: "user", content: data.transcribed };
					return [
						...updated,
						{ role: "assistant", content: data.answer || data.message || "[No answer]" },
					];
				}
				return [
					...msgs,
					{ role: "assistant", content: data.answer || data.message || "[No answer]" },
				];
			});
			// Save assistant/model response
			if (user && (data.answer || data.message)) {
				try {
					await saveUserChat(user.id, 'assistant', data.answer || data.message || "[No answer]");
				} catch (err) {
					setChatError("Save chat error: " + JSON.stringify(err, null, 2));
					console.error('Save chat error:', err);
				}
			}
			// Refresh chat history after both messages are saved
			if (user) {
				fetchUserChats(user.id)
					.then((data) => {
						console.log('fetchUserChats data:', data);
						setChatHistory(data);
					})
					.catch((err) => {
						setChatError("Fetch chat error: " + (err.message || JSON.stringify(err)));
						console.error('Fetch chat error:', err);
					});
			}
		} catch (error) {
			console.error('Ask API error:', error);
			setMessages((msgs) => [
				...msgs,
				{ role: "assistant", content: `Error contacting backend: ${error instanceof Error ? error.message : 'Unknown error'}` },
			]);
		}
		setLoading(false);
		setChatError(null);
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
		setFiles(selectedFiles);
		setDocxProcessing(true); // Start docx processing animation
		setUploading(true);
		const formData = new FormData();
		
		// Log files being uploaded for debugging
		console.log(`Uploading ${selectedFiles.length} files:`);
		selectedFiles.forEach((f, index) => {
			console.log(`File ${index + 1}: ${f.name}, Type: ${f.type}, Size: ${f.size} bytes`);
			formData.append("files", f); // Make sure "files" matches the backend parameter name
		});
		
		try {
			console.log("Sending upload request to backend...");
			const res = await fetch("https://codegeass321-backendserver.hf.space/proxy/8000/upload", {
				method: "POST",
				// Don't set Content-Type header - browser will set it with boundary for multipart/form-data
				headers: {
					"Accept": "application/json",
					"Origin": window.location.origin
				},
				body: formData,
			});
			
			// Check if response is OK (status in the range 200-299)
			if (!res.ok) {
				console.error('Upload API Error:', res.status, res.statusText);
				let errorMessage = 'Unknown error';
				try {
					const errorData = await res.json();
					errorMessage = errorData.message || res.statusText;
					console.error('Error details:', errorData);
				} catch (jsonError) {
					console.error('Could not parse error response as JSON', jsonError);
					try {
						const textError = await res.text();
						console.error('Error response text:', textError);
						errorMessage = textError || res.statusText;
					} catch (textError) {
						console.error('Could not get error response text', textError);
					}
				}
				
				throw new Error(`Upload API Error ${res.status}: ${errorMessage}`);
			}
			
			const data = await res.json();
			console.log('Upload API Response:', data); // Debug the response
			
			setMessages((msgs) => [
				...msgs,
				{ role: "assistant", content: data.message || "File(s) uploaded!" },
			]);
		} catch (error) {
			console.error('Upload error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			setMessages((msgs) => [
				...msgs,
				{ role: "assistant", content: `Error uploading file(s): ${errorMessage}` },
			]);
		} finally {
			setUploading(false);
			setDocxProcessing(false); // End docx processing animation
		}
	};

	// Play sound utility
	function playSound(src: string) {
		const audio = new window.Audio(src);
		audio.volume = 0.7;
		audio.play();
	}

	// Improved audio recording logic
	const startRecording = async () => {
		playSound("/mic_on.wav"); // Play start sound
		setRecordError(null);
		if (!navigator.mediaDevices || !window.MediaRecorder) {
			setRecordError("Audio recording is not supported in this browser.");
			return;
		}
		const audioChunks: Blob[] = []; // use const
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new window.MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			// --- Web Audio API for pitch detection ---
			const AudioContextClass = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext);
			const audioCtx = new AudioContextClass();
			const source = audioCtx.createMediaStreamSource(stream);
			const analyser = audioCtx.createAnalyser();
			analyser.fftSize = 2048;
			source.connect(analyser);
			// Removed unused: const analyserRef = useRef<AnalyserNode | null>(null);
			function getPitchLevel() {
				const buffer = new Float32Array(analyser.fftSize);
				analyser.getFloatTimeDomainData(buffer);
				// Simple volume (RMS) for now, can be replaced with pitch detection
				let sum = 0;
				for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
				const rms = Math.sqrt(sum / buffer.length);
				// Map RMS to 0-1 (clamp)
				setMicLevel(Math.min(1, rms * 10));
				animationFrameRef.current = requestAnimationFrame(getPitchLevel);
			}
			getPitchLevel();
			// --- End Web Audio API ---
			mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
			mediaRecorder.onstop = async () => {
				playSound("/mic_off.wav");
				const audio = new Blob(audioChunks, { type: "audio/wav" });
				setAudioBlob(audio);
				setRecording(false);
				setMicLevel(0);
				if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
				if (audioCtx) audioCtx.close();
				stream.getTracks().forEach((track) => track.stop());
			};
			mediaRecorder.start();
			setRecording(true);
		} catch (err) {
			if (
				err &&
				typeof err === "object" &&
				"name" in err &&
				(err as { name?: string }).name === "NotAllowedError"
			) {
				setRecordError("Microphone access denied. Please allow microphone access.");
			} else {
				setRecordError(
					"Could not start recording: " +
						(err && typeof err === "object" && "message" in err
							? (err as { message?: string }).message
							: "Unknown error")
				);
			}
			setRecording(false);
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current) {
			mediaRecorderRef.current.stop();
		}
		setRecording(false);
		setMicLevel(0);
	};

	const contextText =
		"Upload your documents and ask questions using the power of Retrieval-Augmented Generation and Gemini AI. Experience seamless document understanding, instant answers, and multilingual support—all in one intelligent chat platform.";
	const [typedContext, setTypedContext] = useState("");

	useEffect(() => {
		setTypedContext("");
		let i = 0;
		const typeInterval = setInterval(() => {
			setTypedContext(contextText.slice(0, i + 1));
			i++;
			if (i >= contextText.length) clearInterval(typeInterval);
		}, 18);
		return () => clearInterval(typeInterval);
	}, []);

	useEffect(() => {
		const el = document.getElementById('chat-container');
		function handleFullscreenChange() {
			setIsFullscreen(!!document.fullscreenElement && document.fullscreenElement === el);
		}
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
	}, []);

	function AuthButtons() {
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      // No-op, handled by AuthContext
    });
    // Removed: supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      console.log("Supabase session:", data.session);
    });
  }, []);

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
          setTimeout(() => setSuccessMsg(''), 2500);
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
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-40 flex gap-2 items-center">
        {user ? (
          <>
            <span className="text-gray-500 font-semibold">{user.email}</span>
            <button
              className="px-3 py-1 rounded-lg bg-white/30 text-red-600 border border-blue-100 hover:bg-white/50 transition shadow-none text-sm font-medium backdrop-blur-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              className="px-3 py-1 rounded bg-white/20 text-white border border-blue-200 hover:bg-white/40 transition text-sm font-medium shadow-none backdrop-blur-sm"
              onClick={() => { setIsLogin(true); setShowModal(true); }}
            >
              Login
            </button>
            <button
              className="px-3 py-1 rounded bg-white/20 text-white border border-blue-200 hover:bg-white/40 transition text-sm font-medium shadow-none backdrop-blur-sm"
              onClick={() => { setIsLogin(false); setShowModal(true); }}
            >
              Sign Up
            </button>
          </>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
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
      {successMsg && (
        <div className="fixed top-8 left-1/2 z-50 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg font-semibold text-center animate-pop">
          {successMsg}
        </div>
      )}
    </>
  );
}

// Add FaceWithEyes component above Home
function FaceWithEyes() {
  const faceRef = useRef<HTMLDivElement>(null);
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      const face = faceRef.current;
      const leftEye = leftEyeRef.current;
      const rightEye = rightEyeRef.current;
      if (!face || !leftEye || !rightEye) return;
      const rect = face.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const angle = Math.atan2(dy, dx);
      const dist = Math.min(10, Math.hypot(dx, dy) / 12); // max 10px
      const ex = Math.cos(angle) * dist;
      const ey = Math.sin(angle) * dist;
      leftEye.style.transform = `translate(${ex}px, ${ey}px)`;
      rightEye.style.transform = `translate(${ex}px, ${ey}px)`;
    }
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 24, position: 'relative' }}>
      {/* Speech bubble with pointer, shifted right */}
      <div style={{
        position: 'relative',
        marginBottom: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end', // align to right
        width: '100%',
        maxWidth: 340,
      }}>
        <div style={{
          background: 'rgba(20,20,20,0.72)',
          color: '#d1d5db',
          borderRadius: 20,
          padding: '7px 10px',
          fontSize: 15,
          fontWeight: 400,
          border: '1px solid #444',
          boxShadow: '0 2px 12px #0004',
          textAlign: 'center',
          minWidth: 0,
          maxWidth: 300,
          letterSpacing: '0.001em',
          fontFamily: 'inherit',
          lineHeight: 1,
          opacity: 0.80,
          zIndex: 2,
          position: 'relative',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginRight: -130, // shift right
        }}>
          Scroll down to get started!
        </div>
        {/* Downward pointer (triangle), also shifted right */}
        <div style={{
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '12px solid #232323',
          marginTop: -1,
          filter: 'drop-shadow(0 2px 2px #0006)',
          alignSelf: 'flex-end',
          marginRight: 30, // shift pointer to match bubble
        }} />
      </div>
      {/* Smaller face with two white eyes that follow the cursor */}
      <div ref={faceRef} style={{
        width: 70,
        height: 70,
        background: '#232323',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: '0 2px 12px #0008',
      }}>
        <div ref={leftEyeRef} style={{
          width: 10,
          height: 10,
          background: '#fff',
          borderRadius: '50%',
          position: 'absolute',
          left: 15,
          top: 20,
          transition: 'transform 0.13s cubic-bezier(.4,1.6,.6,1)',
        }} />
        <div ref={rightEyeRef} style={{
          width: 10,
          height: 10,
          background: '#fff',
          borderRadius: '50%',
          position: 'absolute',
          left: 27,
          top: 20,
          transition: 'transform 0.13s cubic-bezier(.4,1.6,.6,1)',
        }} />
      </div>
    </div>
  );
}

	return (
		<div>
			{/* Hero Section */}
			<section
				ref={heroRef}
				className="hero-section flex flex-col items-center justify-center py-24"
				style={{
					background: `rgba(0,0,0,${bgFade})`,
					transition: "background 0.3s",
				}}
			>
				<div
					style={{
						opacity: fade,
						transform: `scale(${scale})`,
						transition: "opacity 0.3s, transform 0.3s",
					}}
				>
					<div className="mb-4 flex justify-center w-full">
						<span
							className={`inline-block text-5xl md:text-6xl font-extrabold drop-shadow-lg text-center transition-transform duration-300 perspective-1000 cursive-welcome ${flip ? (inertia ? "flip-animate-inertia" : "flip-animate-vert") : ""}`}
							style={{ minWidth: 220, color: welcomeColors[welcomeIdx] }}
						>
							{welcomes[welcomeIdx].text}
						</span>
					</div>
					<div className="vogue-font text-7xl md:text-9xl font-black text-white mb-2 drop-shadow-lg text-center tracking-wide leading-tight">
						<h1 className="matte-texture text-[clamp(3rem,10vw,7rem)] font-bold uppercase tracking-widest text-center select-none transition-all duration-500">
              CHATDOCX <br />AI
            </h1>
						
					</div>
					<div className="flex justify-center w-full">
						<p className="sleek-desc text-lg md:text-xl text-gray-400 font-medium mb-12 text-center max-w-xl drop-shadow min-h-[3.5rem] italic">
							{typedContext}
							<span
								className="inline-block w-2 h-6 align-middle bg-gray-400 animate-pulse ml-1"
								style={{ opacity: typedContext.length < contextText.length ? 1 : 0 }}
							></span>
						</p>
					</div>
					{/* Replace scroll down arrow with animated face that follows the cursor */}
					<div className="flex justify-center w-full">
						<FaceWithEyes />
					</div>
				</div>
			</section>
			{/* Main Chat Section */}
			<section className="main-chat-section flex flex-col items-center justify-end min-h-screen pb-8">
				<div
					className={`w-full max-w-4xl flex flex-col flex-1 rounded-3xl shadow-2xl p-14 gap-10 bg-white/60 dark:bg-black/30 backdrop-blur-lg mt-24 mb-2 min-h-[75vh] border-2 border-white/60 dark:border-gray-200/20 relative${isFullscreen ? ' fullscreen-bg' : ''}`}
					id="chat-container"
				>
					<button
						className="absolute top-4 right-4 z-20 bg-gray-800/80 text-white p-2 rounded-lg text-lg shadow hover:bg-gray-900/90 transition flex items-center justify-center"
						style={{outline: 'none'}}
						onClick={() => {
							const el = document.getElementById('chat-container');
							if (el) {
								if (!document.fullscreenElement) {
									el.requestFullscreen();
								} else {
									document.exitFullscreen();
								}
							}
						}}
						title="Toggle Fullscreen"
						aria-label="Toggle Fullscreen"
					>
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M3 8V3H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
							<path d="M17 8V3H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
							<path d="M3 12V17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
							<path d="M17 12V17H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
					</button>
					{chatError && (
          <div className="mb-4 text-center text-red-600 bg-red-100/70 border border-red-300 rounded-lg py-2 px-4 font-semibold shadow animate-pop">
            {chatError}
          </div>
        )}
					<div
						className="flex-1 overflow-y-auto min-h-[50vh] space-y-6 rounded-3xl p-8 border border-white/20 dark:border-gray-200/10 bg-white/30 dark:bg-gray-900/40"
						style={{
							backgroundImage: "url(/bg2.png)",
							backgroundSize: "cover",
							backgroundPosition: "center",
							backgroundRepeat: "no-repeat",
							backgroundAttachment: "local",
						}}
					>
						{messages.map((msg, i) => (
							<div
								key={i}
								className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
							>
								{msg.role === "assistant" ? (
									<div
										className={`px-4 py-2 rounded-2xl max-w-[80%] whitespace-pre-line shadow-lg text-sm bg-white/40 dark:bg-gray-900/50 backdrop-blur-md border border-white/20 dark:border-gray-200/10 text-white`}
										dangerouslySetInnerHTML={{ __html: formatAssistantMessage(msg.content) }}
									/>
								) : (
									<div
										className={`px-4 py-2 rounded-2xl max-w-[80%] whitespace-pre-line shadow-lg text-sm bg-white/40 dark:bg-gray-900/50 backdrop-blur-md border border-white/20 dark:border-gray-200/10 text-white` + (msg.role === "user" ? " rounded-br-none" : " rounded-bl-none")}
										{...(msg.role === "assistant" ? { dangerouslySetInnerHTML: { __html: formatAssistantMessage(msg.content) } } : {})}
									>
										{msg.role === "user"
											? (msg.content === "[audio]" ? <DotsLoader /> : msg.content)
											: null}
									</div>
								)}
							</div>
						))}
					</div>
					{/* Redesigned chat input area */}
					<form
						onSubmit={handleSend}
						className="max-w-3xl w-full mx-auto relative bg-muted rounded-3xl p-2 border flex items-center gap-2 mt-2"
					>
						<input
							ref={fileInputRef}
							type="file"
							className="hidden"
							onChange={handleFileChange}
							accept=".pdf,.doc,.docx,.txt,.csv,.json,.pptx,.xml,.xlsx"
							multiple
						/>
						{/* Minimal Paperclip (pin) SVG */}
						<button
							type="button"
							className="h-10 w-10 flex items-center justify-center rounded-full border border-input bg-background hover:bg-background/50 text-xl text-gray-700 dark:text-gray-200"
							onClick={() => {
								playSound("/clip.wav");
								fileInputRef.current?.click();
							}}
							disabled={uploading}
							aria-label="Upload document(s)"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="22"
								height="22"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path
									d="M8 12.5V17a4 4 0 0 0 8 0V7a4 4 0 0 0-8 0v9a2 2 0 0 0 4 0V8.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</button>
						{/* Textarea for chat input */}
						<div className="relative flex-1">
							{/* Only show textarea if not recording */}
							{!recording && (
								<textarea
									className={`resize-none w-full min-h-10 max-h-32 bg-transparent border-0 px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 bg-muted rounded-2xl transition-all duration-500 ${docxProcessing ? "pointer-events-none" : ""}`}
									placeholder={docxProcessing ? "processing your docx" : "Ask a question..."}
									value={input}
									onChange={(e) => setInput(e.target.value)}
									disabled={uploading || loading || docxProcessing}
									rows={1}
									style={{ height: "44px" }}
								/>
							)}
							{/* Listening animation bar with placeholder (dedicated listening-bar class) */}
							{recording && (
								<div className="absolute left-0 top-0 w-full h-full flex items-center z-40 pointer-events-none">
									<div className="liquid-bar w-full h-full rounded-2xl" style={{ zIndex: 1, width: '100%' }}></div>
									<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-900 font-bold text-base select-none drop-shadow-lg" style={{ zIndex: 2 }}>Listening...</span>
								</div>
							)}
							{docxProcessing && (
								<div className="absolute left-0 top-0 w-full h-full pointer-events-none overflow-hidden rounded-2xl z-10">
									<div className="liquid-bar w-full h-full"></div>
								</div>
							)}
						</div>
						{/* Refined Microphone SVG with base further from mic */}
						<button
							type="button"
							className={`h-10 w-10 flex items-center justify-center rounded-full border border-input bg-background hover:bg-background/50 text-xl text-gray-700 dark:text-gray-200 relative overflow-hidden ${recording ? "bg-red-600 text-white" : ""}`}
							onClick={recording ? stopRecording : startRecording}
							disabled={uploading || loading}
							aria-label="Record audio"
						>
							{/* Animated red fill based on micLevel */}
							{recording && (
								<div style={{
									position: 'absolute',
									left: 0,
									bottom: 0,
									width: '100%',
									height: `${Math.round(micLevel * 100)}%`,
									background: 'linear-gradient(180deg, #fca5a5 0%, #f87171 100%)', // lighter red gradient
									borderRadius: '9999px',
									transition: 'height 0.1s',
									zIndex: 1,
									pointerEvents: 'none',
								}} />
							)}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="22"
								height="22"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth="2"
								style={{ position: 'relative', zIndex: 2 }}
							>
								<rect x="9" y="3" width="6" height="12" rx="3" />
								<line
									x1="12"
									y1="15"
									x2="12"
									y2="19"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
								/>
								<rect x="8" y="20.5" width="8" height="2" rx="1" fill="currentColor" stroke="none" />
								<path d="M5 10v2a7 7 0 0 0 14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
							</svg>
						</button>
						{/* Send button */}
						<button
							type="submit"
							className="h-10 w-10 flex items-center justify-center rounded-full border border-input bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
							disabled={(!input.trim() && !audioBlob) || uploading || loading}
							aria-label="Send message"
						>
							{loading ? (
								<span className="animate-pulse">...</span>
							) : (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="m5 12 7-7 7 7" />
									<path d="M12 19V5" />
								</svg>
							)}
						</button>
					</form>
					{/* Show selected files and audio status below input */}
					<div className="flex items-center gap-2 mt-2 min-h-[1.5rem]">
						{files.length > 0 && !uploading && (
							<span className="text-xs text-gray-600 dark:text-gray-300">
								{files.map((f) => f.name).join(", ")}
							</span>
						)}
						{audioBlob && <span className="text-xs text-gray-600 dark:text-gray-300">Audio ready to send</span>}
						{recordError && <span className="text-xs text-red-600 ml-2">{recordError}</span>}
						{/* Backend test button */}
						<button 
							type="button" 
							className="ml-auto text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition"
							onClick={testBackendConnection}
						>
							Test Backend
						</button>
					</div>
				</div>
				{/* Footer with copyright and creator credit */}
      <footer style={{
        width: '100%',
        marginTop: 80,
        padding: '8px 0 2px 0',
        textAlign: 'center',
        fontFamily: 'monospace',
        background: 'transparent',
        opacity: 0.85,
        lineHeight: 1.1,
      }}>
        <div className="text-xs text-gray-400" style={{margin: 0, padding: 0, lineHeight: 1.1}}>RAG Chat UI &copy; 2025</div>
        <div style={{
          fontSize: 12,
          color: '#888',
          letterSpacing: '0.01em',
          lineHeight: 1.1,
          margin: 0,
          padding: 1,
        }}>
          Created by <a href="https://github.com/AnshUpadhyay639" target="_blank" rel="noopener noreferrer" style={{ color: '#6ba4ff', textDecoration: 'none', fontWeight: 500 }}>AnshUpadhyay639</a><br />
          <span style={{ fontSize: 11, color: '#aaa', lineHeight: 1.0, margin: 0, padding: 1 }}>2003anshupadhyay@gmail.com</span>
        </div>
      </footer>
				<AuthButtons />
				<SimpleSidebar chatHistory={chatHistory} setMessages={setMessages} user={user} setChatHistory={setChatHistory} />
			</section>
		</div>
	);
}

// Simple slide-out sidebar component
function SimpleSidebar({ chatHistory, setMessages, user, setChatHistory }: { chatHistory: Chat[]; setMessages: (messages: { role: string; content: string }[]) => void; user: User | null; setChatHistory: (chats: Chat[]) => void }) {
  const [open, setOpen] = useState(false);
  // Play sound utility for sidebar
  function playSidebarSound(src: string) {
    const audio = new window.Audio(src);
    audio.volume = 0.7;
    audio.play();
  }
  return (
    <>
      {/* Hamburger button */}
      <button
        className="fixed top-4 left-4 z-40 w-10 h-10 flex flex-col items-center justify-center bg-gray-900/80 rounded-lg shadow-lg hover:bg-gray-900/90 transition"
        onClick={() => {
          playSidebarSound('/sidebar.mp3');
          setOpen(true);
        }}
        aria-label="Open sidebar menu"
      >
        <span className="block w-6 h-0.5 bg-white mb-1 rounded"></span>
        <span className="block w-6 h-0.5 bg-white mb-1 rounded"></span>
        <span className="block w-6 h-0.5 bg-white rounded"></span>
      </button>
      {/* Slide-out sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"} bg-white/30 backdrop-blur-lg shadow-2xl rounded-r-3xl`}
        style={{backdropFilter: 'blur(16px)'}}
      >
        <div className="p-4 border-b border-white/40 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Chat History</h2>
          <button
            className="ml-2 p-2 rounded hover:bg-red-100 transition"
            title="Delete all chat history"
            onClick={async () => {
              if (!user) return;
              if (confirm("Are you sure you want to delete all your chat history? This cannot be undone.")) {
                playSidebarSound('/bin.mp3');
                try {
                  await deleteAllUserChats(user.id);
                  fetchUserChats(user.id).then(setChatHistory);
                } catch (err) {
                  const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
                  alert("Failed to delete chat history: " + errorMsg);
                }
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6m4-6v6" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-80px)]">
          {chatHistory.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-4">
              No chat history found.
            </div>
          ) : (
            chatHistory
              .filter(chat => chat.role === 'user')
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map((chat, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer"
                  onClick={() => {
                    setMessages(
                      chatHistory
                        .filter(c => new Date(c.created_at) >= new Date(chat.created_at))
                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                        .map(c => ({ role: c.role, content: c.content }))
                    );
                    setOpen(false);
                  }}
                >
                  <div className="text-xs text-gray-400 mb-1">
                    {new Date(chat.created_at).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-800 truncate">
                    {chat.content}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
      {/* Overlay when sidebar is open */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

// Helper to format assistant message markdown to HTML
function formatAssistantMessage(text: string) {
	// Replace **bold** with <b>bold</b>
	let html = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
	// Replace __underline__ with <u>underline</u>
	html = html.replace(/__(.*?)__/g, '<u>$1</u>');
	// Replace *italic* with <i>italic</i>
	html = html.replace(/\*(?!\*)([^*]+)\*/g, '<i>$1</i>');
	// Replace `code` with <code>code</code>
	html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
	// Replace newlines with <br>
	html = html.replace(/\n/g, '<br>');
	// Add more formatting as needed
	return html;
}

// Function to test backend connectivity
const testBackendConnection = async () => {
	try {
		const res = await fetch("https://codegeass321-backendserver.hf.space/proxy/8000/status");
		const data = await res.json();
		console.log("Backend status:", data);
		alert(`Backend Status: ${JSON.stringify(data, null, 2)}`);
		return data;
	} catch (error) {
		console.error("Backend connection test failed:", error);
		alert(`Backend connection failed: ${error instanceof Error ? error.message : String(error)}`);
		return null;
	}
};
