import { useState, useEffect, useRef } from "react";
import { sendChatMessage, createChatSession, getChatSessions, updateChatSession, deleteChatSession, getMessages, clearMessages, uploadDocument } from "../api/chatbotApi";
import DataAnalysisModal from "./DataAnalysisModal";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Convert DB messages to UI format
function dbToUiMessages(dbMessages) {
  const uiMessages = [];
  for (const m of dbMessages) {
    uiMessages.push({ id: m._id + "_u", role: "user", content: m.userMessage, time: new Date(m.createdAt).getTime() });
    uiMessages.push({ id: m._id + "_a", role: "assistant", content: m.aiMessage, time: new Date(m.createdAt).getTime() });
  }
  return uiMessages;
}

export default function Chatbot({ token, handleLogout, onAuthError, onNavigateTools }) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isDataAnalysisModalOpen, setIsDataAnalysisModalOpen] = useState(false);

  const userMenuRef = useRef(null);
  const plusMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const [messageStore, setMessageStore] = useState({});

  const activeChat = chats.find(c => c._id === activeChatId);
  const activeMessages = (activeChatId && messageStore[activeChatId]) || [];

  function handleApiError(err) {
    if (err.message && (err.message.includes("401") || err.message.toLowerCase().includes("token") || err.message.toLowerCase().includes("authorization"))) {
      onAuthError?.();
      return true;
    }
    return false;
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, isTyping]);

  // Load sessions on mount
  useEffect(() => {
    async function load() {
      try {
        const sessions = await getChatSessions(token);
        setChats(sessions);
        if (sessions.length > 0) {
          setActiveChatId(sessions[0]._id);
        }
      } catch (err) {
        console.error("Failed to load sessions:", err);
        handleApiError(err);
      } finally {
        setLoadingChats(false);
      }
    }
    load();
  }, [token]);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeChatId) return;
    // Skip if already loaded
    if (messageStore[activeChatId]) return;

    async function loadMessages() {
      setLoadingMessages(true);
      try {
        const dbMessages = await getMessages(token, activeChatId);
        const uiMessages = dbToUiMessages(dbMessages);
        if (uiMessages.length === 0) {
          uiMessages.push({ id: generateId(), role: "assistant", content: "Hello! How can I help you today?", time: Date.now() });
        }
        setMessageStore(prev => ({ ...prev, [activeChatId]: uiMessages }));
      } catch (err) {
        console.error("Failed to load messages:", err);
        setMessageStore(prev => ({ ...prev, [activeChatId]: [{ id: generateId(), role: "assistant", content: "Failed to load chat history.", time: Date.now() }] }));
      } finally {
        setLoadingMessages(false);
      }
    }
    loadMessages();
  }, [activeChatId]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target)) {
        setIsPlusMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ──── Create New Chat ────
  async function createNewChat() {
    try {
      const session = await createChatSession(token, "New Chat");
      setChats([session, ...chats]);
      setActiveChatId(session._id);
      setMessageStore(prev => ({
        ...prev,
        [session._id]: [{ id: generateId(), role: "assistant", content: "Hello! How can I help you today?", time: Date.now() }]
      }));
    } catch (err) {
      console.error("Failed to create session:", err);
      handleApiError(err);
    }
  }

  // ──── Delete Session ────
  async function handleDeleteSession(sessionId, e) {
    e.stopPropagation();
    try {
      await deleteChatSession(token, sessionId);
      const remaining = chats.filter(c => c._id !== sessionId);
      setChats(remaining);
      if (activeChatId === sessionId) {
        setActiveChatId(remaining.length > 0 ? remaining[0]._id : null);
      }
      const nextStore = { ...messageStore };
      delete nextStore[sessionId];
      setMessageStore(nextStore);
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  }

  // ──── Clear Chat ────
  async function handleClearChat() {
    if (!activeChatId) return;
    try {
      await clearMessages(token, activeChatId);
      setMessageStore(prev => ({
        ...prev,
        [activeChatId]: [{ id: generateId(), role: "assistant", content: "Chat cleared. How can I help you?", time: Date.now() }]
      }));
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }
  }

  // ──── Send Message ────
  async function sendMessage(e) {
    e.preventDefault();
    const prompt = draft.trim();
    if (!prompt || isTyping || !activeChatId) return;

    const userMessage = { id: generateId(), role: "user", content: prompt, time: Date.now() };

    // Auto-rename on first user message
    const chat = chats.find(c => c._id === activeChatId);
    const msgs = messageStore[activeChatId] || [];
    if (chat && msgs.filter(m => m.role === "user").length === 0) {
      const newTitle = prompt.slice(0, 30) + (prompt.length > 30 ? "..." : "");
      setChats(curr => curr.map(c => c._id === activeChatId ? { ...c, chatName: newTitle } : c));
      updateChatSession(token, activeChatId, newTitle).catch(console.error);
    }

    setMessageStore(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), userMessage] }));
    setDraft("");
    setIsTyping(true);

    try {
      const response = await sendChatMessage(token, activeChatId, prompt);
      const botMessage = {
        id: generateId(),
        role: "assistant",
        content: response.aiMessage || response.reply || response.response || response.message || JSON.stringify(response),
        time: response.createdAt ? new Date(response.createdAt).getTime() : Date.now()
      };
      setMessageStore(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), botMessage] }));
    } catch (err) {
      setMessageStore(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), { id: generateId(), role: "assistant", content: `Error: ${err.message}`, time: Date.now() }]
      }));
      handleApiError(err);
    } finally {
      setIsTyping(false);
    }
  }

  // ──── Handle File Upload ────
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Max size is 5MB.");
      return;
    }

    // Validate type (PDF)
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are supported.");
      return;
    }

    setIsTyping(true);
    const systemMessageId = generateId();

    // Optimistic UI: show uploading message
    setMessageStore(prev => ({
      ...prev,
      [activeChatId]: [
        ...(prev[activeChatId] || []),
        { id: systemMessageId, role: "assistant", content: `⏳ Uploading "${file.name}" and generating embeddings...`, time: Date.now() }
      ]
    }));

    try {
      const response = await uploadDocument(token, activeChatId, file);

      // Update the system message with success
      setMessageStore(prev => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] || []).map(m =>
          m.id === systemMessageId
            ? { ...m, content: `✅ Successfully uploaded and indexed: ${file.name}. You can now ask questions about its content.` }
            : m
        )
      }));
    } catch (err) {
      console.error("Upload failed:", err);
      setMessageStore(prev => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] || []).map(m =>
          m.id === systemMessageId
            ? { ...m, content: `❌ Failed to upload "${file.name}": ${err.message}` }
            : m
        )
      }));
    } finally {
      setIsTyping(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col h-full w-full relative z-10">
      {/* Header */}
      <header className="flex h-14 w-full items-center justify-between border-b border-[#2a2a2a] bg-[#171717] px-5 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10a37f]/10 text-[#10a37f]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">NexusAI</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear Chat Button (visible when a chat is active) */}
          {activeChat && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#6e6e80] transition-colors hover:bg-[#2a2a2a] hover:text-[#c5c5d2]"
              title="Clear chat"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Clear
            </button>
          )}

          {/* User Icon */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10a37f] text-white text-xs font-semibold transition-opacity hover:opacity-90"
            >
              U
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] shadow-xl z-50 overflow-hidden py-1">
                <button
                  onClick={() => { setUserMenuOpen(false); onNavigateTools?.(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#c5c5d2] hover:bg-[#2a2a2a] transition-colors"
                >
                  <svg className="w-4 h-4 text-[#10a37f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.58-3.22a2.24 2.24 0 01-1.09-2.61L6.2 5.1a2.24 2.24 0 012.61-1.09l5.58 3.22a2.24 2.24 0 011.09 2.61l-1.45 4.24a2.24 2.24 0 01-2.61 1.09z" /><path strokeLinecap="round" strokeLinejoin="round" d="M14.58 8.83l5.58 3.22a2.24 2.24 0 011.09 2.61l-1.45 4.24a2.24 2.24 0 01-2.61 1.09l-5.58-3.22" /></svg>
                  Manage Tools
                </button>
                <div className="border-t border-[#2a2a2a] my-1"></div>
                <button
                  onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#ef4444] hover:bg-[#2a2a2a] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex w-full flex-1 overflow-hidden z-10">
        {/* Sidebar */}
        <aside className="w-[260px] flex-shrink-0 flex flex-col bg-[#171717] overflow-hidden">
          <div className="p-3">
            <button
              onClick={createNewChat}
              className="w-full flex items-center gap-2 rounded-lg border border-[#3a3a3a] bg-transparent px-3 py-2.5 text-[13px] font-medium text-[#c5c5d2] transition-colors hover:bg-[#2a2a2a]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
            {loadingChats ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-[#10a37f] rounded-full animate-spin"></div>
              </div>
            ) : chats.length === 0 ? (
              <p className="text-[12px] text-[#6e6e80] px-3 py-4">No conversations yet.</p>
            ) : (
              chats.map(chat => (
                <div
                  key={chat._id}
                  className={`group flex items-center rounded-lg transition-colors cursor-pointer ${activeChatId === chat._id ? "bg-[#2a2a2a]" : "hover:bg-[#212121]"
                    }`}
                >
                  <button
                    onClick={() => setActiveChatId(chat._id)}
                    className="flex-1 text-left truncate px-3 py-2.5 text-[13px] text-[#c5c5d2]"
                  >
                    {chat.chatName}
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(chat._id, e)}
                    className="hidden group-hover:flex items-center justify-center w-7 h-7 mr-1 rounded text-[#6e6e80] hover:text-[#ef4444] transition-colors"
                    title="Delete conversation"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <section className="flex flex-1 flex-col overflow-hidden relative bg-[#0a0a0a]">
          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#10a37f]/10 border border-[#10a37f]/20">
                <svg className="w-9 h-9 text-[#10a37f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">How can I help you today?</h2>
              <p className="text-[14px] text-[#8e8ea0] max-w-md text-center">Start a new conversation by clicking "New chat" in the sidebar.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto w-full px-4 py-6">
                {loadingMessages ? (
                  <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-[#2a2a2a] border-t-[#10a37f] rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-4">
                    {activeMessages.map((message) => (
                      <article
                        key={message.id}
                        className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold mt-1 ${message.role === "user"
                            ? "bg-[#6e6e80]/20 text-[#c5c5d2]"
                            : "bg-[#10a37f] text-white"
                            }`}>
                            {message.role === "user" ? "U" : "N"}
                          </div>
                          <div className={`rounded-2xl px-4 py-3 ${message.role === "user"
                            ? "bg-[#2f2f2f] rounded-tr-sm"
                            : "bg-[#1e1e1e] border border-[#2a2a2a] rounded-tl-sm"
                            }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[12px] font-semibold text-[#c5c5d2]">
                                {message.role === "user" ? "You" : "NexusAI"}
                              </span>
                              {message.time && (
                                <span className="text-[11px] text-[#6e6e80]">{formatTime(message.time)}</span>
                              )}
                            </div>
                            <div className="whitespace-pre-line text-[14px] leading-relaxed text-[#d1d5db] text-start">
                              {message.content}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}

                    {isTyping && (
                      <article className="flex w-full justify-start">
                        <div className="flex gap-3 max-w-[80%]">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold bg-[#10a37f] text-white mt-1">
                            N
                          </div>
                          <div className="rounded-2xl px-4 py-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-tl-sm">
                            <p className="text-[12px] font-semibold text-[#c5c5d2] mb-1">NexusAI</p>
                            <div className="flex items-center gap-1.5 h-6">
                              <div className="w-2 h-2 bg-[#6e6e80] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                              <div className="w-2 h-2 bg-[#6e6e80] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                              <div className="w-2 h-2 bg-[#6e6e80] rounded-full animate-bounce"></div>
                            </div>
                          </div>
                        </div>
                      </article>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-[#2a2a2a] bg-[#0a0a0a] px-4 py-4 shrink-0">
                <div className="max-w-3xl mx-auto flex items-end gap-2">

                  {/* Plus Button + Popup Menu */}
                  <div className="relative shrink-0 mb-[3px]" ref={plusMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsPlusMenuOpen(prev => !prev)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] text-[#8e8ea0] hover:text-[#10a37f] hover:border-[#10a37f]/50 hover:bg-[#10a37f]/10 transition-all"
                      title="More options"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>

                    {/* Popup Menu */}
                    {isPlusMenuOpen && (
                      <div className="absolute left-0 bottom-[52px] w-52 rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] shadow-2xl z-50 overflow-hidden py-1.5">
                        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#6e6e80]">Features</p>
                        <button
                          onClick={() => { setIsPlusMenuOpen(false); setIsDataAnalysisModalOpen(true); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-[#c5c5d2] hover:bg-[#2a2a2a] transition-colors"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10a37f]/10 text-[#10a37f] shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                          </span>
                          Data Analysis
                        </button>
                        <button
                          onClick={() => { setIsPlusMenuOpen(false); fileInputRef.current?.click(); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-[#c5c5d2] hover:bg-[#2a2a2a] transition-colors"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10a37f]/10 text-[#10a37f] shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          </span>
                          Upload PDF
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf"
                    className="hidden"
                  />

                  {/* Chat Input Form */}
                  <form onSubmit={sendMessage} className="relative flex-1">
                    <textarea
                      rows={1}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                      placeholder="Message NexusAI..."
                      className="w-full resize-none rounded-xl border border-[#3a3a3a] bg-[#171717] pl-4 pr-14 py-3.5 text-[15px] text-white outline-none placeholder:text-[#6e6e80] focus:border-[#4a4a4a] transition-colors"
                      style={{
                        height: draft.includes("\n") || draft.length > 60 ? "100px" : "52px",
                        minHeight: "52px",
                        maxHeight: "200px",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || isTyping}
                      className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                      </svg>
                    </button>
                  </form>
                </div>
                <p className="mt-2.5 text-center text-[11px] text-[#6e6e80]">
                  NexusAI may produce inaccurate information. Consider verifying important details.
                </p>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Data Analysis Modal */}
      {isDataAnalysisModalOpen && (
        <DataAnalysisModal
          token={token}
          sessionId={activeChatId}
          onClose={() => setIsDataAnalysisModalOpen(false)}
          onSuccess={(configs) => {
            setMessageStore(prev => ({
              ...prev,
              [activeChatId]: [
                ...(prev[activeChatId] || []),
                { id: generateId(), role: "assistant", content: `✅ Data analysis configured for ${configs.length} URL${configs.length > 1 ? 's' : ''}. Now Start asking questions.`, time: Date.now() }
              ]
            }));
          }}
        />
      )}
    </div>
  );
}
