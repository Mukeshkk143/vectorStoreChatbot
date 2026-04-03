import { useState, useEffect } from 'react';
import Chatbot from './components/Chatbot';
import Login from './components/Login';
import Tools from './components/Tools';
import { loginUser, checkChatbotStatus } from './api/chatbotApi';
import './App.css';

const AUTH_STORAGE_KEY = "nexusai.token";

function App() {
  const [auth, setAuth] = useState(() => ({
    email: "",
    password: "",
    error: "",
    token: typeof window !== "undefined" ? window.sessionStorage.getItem(AUTH_STORAGE_KEY) : null,
    loading: false
  }));

  const [tokenStatus, setTokenStatus] = useState("checking");
  const [currentPage, setCurrentPage] = useState("chat"); // chat | tools

  const authenticated = !!auth.token && tokenStatus === "valid";

  useEffect(() => {
    async function verifyToken() {
      if (!auth.token) {
        setTokenStatus("expired");
        return;
      }
      try {
        await checkChatbotStatus(auth.token);
        setTokenStatus("valid");
      } catch {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
        }
        setAuth(curr => ({ ...curr, token: null }));
        setTokenStatus("expired");
      }
    }
    verifyToken();
  }, [auth.token]);

  async function handleLogin(event) {
    event.preventDefault();
    if (!auth.email || !auth.password) {
      setAuth(current => ({ ...current, error: "Please enter email and password." }));
      return;
    }

    setAuth(current => ({ ...current, loading: true, error: "" }));
    try {
      const data = await loginUser(auth.email, auth.password);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(AUTH_STORAGE_KEY, data.token || data.access_token);
      }
      setAuth(current => ({
        ...current,
        token: data.token,
        loading: false,
        password: "",
      }));
      setTokenStatus("valid");
    } catch (err) {
      setAuth(current => ({
        ...current,
        error: err.message || "Invalid email or password.",
        loading: false,
      }));
    }
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setAuth({ email: "", password: "", error: "", token: null, loading: false });
    setTokenStatus("expired");
  }

  function handleAuthError() {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setAuth({ email: "", password: "", error: "", token: null, loading: false });
    setTokenStatus("expired");
  }

  return (
    <main className="h-screen w-full bg-[#0a0a0a] text-[#ececf1] flex flex-col overflow-hidden relative font-sans">
      {tokenStatus === "checking" ? (
        <div className="flex-1 w-full flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-[#10a37f] rounded-full animate-spin"></div>
          <p className="text-[14px] text-[#6e6e80] animate-pulse">Verifying session...</p>
        </div>
      ) : !authenticated ? (
        <div className="flex-1 w-full flex flex-col items-center justify-center p-4 gap-5">
          {tokenStatus === "expired" && auth.token === null && (
            <div className="w-full max-w-[420px] flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3.5">
              <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-[14px] text-amber-200/80">Authentication required. Please sign in to continue.</p>
            </div>
          )}
          <Login auth={auth} setAuth={setAuth} handleLogin={handleLogin} />
        </div>
      ) : (
        currentPage === "tools" ? (
          <Tools token={auth.token} onBack={() => setCurrentPage("chat")} />
        ) : (
          <Chatbot token={auth.token} handleLogout={handleLogout} onAuthError={handleAuthError} onNavigateTools={() => setCurrentPage("tools")} />
        )
      )}
    </main>
  );
}

export default App;
