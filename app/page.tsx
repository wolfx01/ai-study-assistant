"use client";
import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { uploadLimit } from "@/lib/upload";
type Message = { role: "user" | "assistant"; content: string };
type User = { id: string; name: string; email: string };
type Conversation = { id: string; title: string };
async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
const jsonPost = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const selection = useRef(0);
  async function loadConversations() { const data = await api("/api/conversations"); setConversations(data.conversations); }
  useEffect(() => {
    api("/api/auth/me").then(async data => { setUser(data.user); if (data.user) await loadConversations(); }).catch(err => setError(err.message)).finally(() => setReady(true));
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await api(`/api/auth/${mode}`, jsonPost({ email: form.get("email"), password: form.get("password"), name: form.get("name") }));
      setUser(data.user); setMessages([]); setActive(null); setInput(""); setStatus(""); await loadConversations();
    } catch (err) { setError(err instanceof Error ? err.message : "Authentication failed."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    try { await api("/api/auth/logout", { method: "POST" }); selection.current++; setUser(null); setMessages([]); setConversations([]); setActive(null); setInput(""); setStatus(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Logout failed."); }
    finally { setBusy(false); }
  }
  async function selectConversation(id: string) {
    const version = ++selection.current; setBusy(true); setError("");
    try { const data = await api(`/api/conversations/${id}`); if (version === selection.current) { setActive(id); setMessages(data.conversation.messages); setStatus(""); } }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load conversation."); }
    finally { if (version === selection.current) setBusy(false); }
  }
  async function send(event: FormEvent) {
    event.preventDefault(); if (busy || !input.trim()) return;
    const query = input.trim(); const previous = messages;
    setBusy(true); setError(""); setInput(""); setMessages([...messages, { role: "user", content: query }]);
    try {
      let id = active;
      if (!id) { const data = await api("/api/conversations", { method: "POST" }); id = data.conversation.id; setActive(id); }
      const data = await api("/api/chat", jsonPost({ conversationId: id, query }));
      setMessages(data.messages); await loadConversations();
    } catch (err) { setMessages(previous); setInput(query); setError(err instanceof Error ? err.message : "Connection failed."); }
    finally { setBusy(false); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file || uploading) return; event.target.value = "";
    if (file.size > uploadLimit(file.name)) { setStatus(/\.pdf$/i.test(file.name) ? "Maximum PDF size is 10 MB." : "Maximum text file size is 200 KB."); return; }
    setUploading(true); setStatus(`Uploading ${file.name}…`);
    const form = new FormData(); form.append("file", file);
    try { await api("/api/upload", { method: "POST", body: form }); setStatus(`${file.name} is ready. You can ask me about it now.`); }
    catch (err) { setStatus(err instanceof Error ? err.message : "Upload failed."); }
    finally { setUploading(false); }
  }
  if (!ready) return <main className="auth-screen"><p>Loading…</p></main>;
  if (!user) return <main className="auth-screen"><section className="auth-story"><div className="story-brand"><span className="wordmark">s<span>.</span></span> Study Assistant</div><div className="story-content"><span className="eyebrow">A LITTLE SPACE TO THINK</span><h2>Good questions.<br />Clearer <em>thinking.</em></h2><p>A place for your notes, your next idea, and the things you’re still figuring out.</p><div className="paper-scene" aria-hidden="true"><div className="paper-back"></div><div className="paper-front"><span className="paper-label">NOTES TO SELF</span><div className="paper-line"></div><div className="paper-line short"></div><div className="paper-highlight">Make room for a new idea.</div><div className="paper-line"></div><span className="paper-doodle">↗</span></div><span className="scene-caption">Start with what you know.</span></div></div><div className="story-footer">A notebook. A conversation. A little more clarity.</div></section><section className="auth-card"><span className="eyebrow">YOUR PERSONAL WORKSPACE</span><h2>{mode === "login" ? "Nice to see you again." : "Make yourself at home."}</h2><p>{mode === "login" ? "Pick up where you left off." : "Keep your notes and conversations together."}</p>
    <form key={mode} className="auth-form" onSubmit={authenticate}>
      {mode === "register" && <label>Name<input name="name" autoComplete="name" required maxLength={80} /></label>}
      <label>Email address<input name="email" type="email" placeholder="you@example.com" autoComplete="email" required maxLength={254} /></label>
      <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={128} /></label>
      {error && <div className="notice error" role="alert">{error}</div>}
      <button disabled={busy} type="submit">{busy ? "One moment…" : mode === "login" ? "Log in →" : "Create account →"}</button>
    </form><button className="secondary auth-switch" disabled={busy} onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}</button><p className="auth-note">Your notes have a place of their own.</p></section></main>;
  return <main className="shell">
    <header><div className="brand"><span className="wordmark">s<span>.</span></span><div><h1>Study Assistant</h1><p>A little space to think</p></div></div><div className="actions">
      <button className="secondary" disabled={busy || uploading} onClick={() => { selection.current++; setActive(null); setMessages([]); setError(""); setStatus(""); setInput(""); }}>New chat</button>
      <input ref={fileInput} type="file" accept=".txt,.md,.pdf" hidden onChange={upload} /><button disabled={uploading || busy} onClick={() => fileInput.current?.click()}>{uploading ? "Adding your notes…" : "+ Add a document"}</button>
      </div></header>
    <div className="workspace"><aside className="history"><div className="history-heading"><h3>Your conversations</h3><span>{conversations.length.toString().padStart(2, "0")}</span></div><div className="history-list">{!conversations.length && <div className="history-empty"><span aria-hidden="true">↳</span><p>Start a conversation.<br />It’ll find a home here.</p></div>}{conversations.map(chat => <button key={chat.id} className={`history-item ${active === chat.id ? "selected" : ""}`} disabled={busy || uploading} onClick={() => selectConversation(chat.id)}><span className="chat-mark" aria-hidden="true">↳</span>{chat.title}</button>)}</div><div className="sidebar-note"><span className="eyebrow">A SMALL REMINDER</span><p>You don’t have to have<br />all the answers to begin.</p></div><div className="account"><span className="account-avatar">{user.name.slice(0,1).toUpperCase()}</span><div><strong>{user.name}</strong><span title={user.email}>{user.email}</span></div><button className="logout" aria-label="Log out" title="Log out" disabled={busy || uploading} onClick={logout}>↪</button></div></aside><div className="conversation"><div className="conversation-heading"><span>{active ? conversations.find(chat => chat.id === active)?.title || "Your conversation" : "A fresh page"}</span><span className="saved-indicator"><i></i> Saved to your account</span></div>
    {status && <div className="notice" role="status">{status}</div>}
    <section className="chat" aria-label="Conversation" aria-live="polite">
      {!messages.length && <div className="welcome"><span className="welcome-label"><span className="little-line"></span> LET’S MAKE SOME SENSE OF IT</span><h2>A good place<br />for your <em>next question.</em></h2><p>Bring your notes, a curious thought, or something you’re stuck on.<br />We’ll work through it together.</p><div className="suggestions">{[{ label: "Understand my notes", detail: "Turn the complicated into clear", query: "Help me understand the key ideas in my uploaded documents." }, { label: "Get a fresh perspective", detail: "Look at something a little differently", query: "Review my uploaded documents and suggest one useful insight I might have missed." }, { label: "Work through a problem", detail: "One step at a time", query: "Walk me through calculating (450 * 12) + 85, step by step." }].map((item, index) => <button className="suggestion" key={item.label} onClick={() => setInput(item.query)}><span className="suggestion-number">0{index + 1}</span><strong>{item.label}</strong><span>{item.detail}</span><span className="suggestion-arrow" aria-hidden="true">↗</span></button>)}</div></div>}
      {messages.map((message, index) => <div className={`message ${message.role}`} key={index}><span className="avatar">{message.role === "assistant" ? "s." : user.name.slice(0,1).toUpperCase()}</span><div className="message-content"><span className="message-label">{message.role === "assistant" ? "Study Assistant" : "You"}</span><div className="bubble" dir="auto">{message.content}</div></div></div>)}
      {busy && <div className="message assistant"><span className="avatar">s.</span><div className="bubble thinking">Just a moment<span className="thinking-dots">…</span></div></div>}<div ref={end} />
    </section>{error && <div className="notice error" role="alert">{error}</div>}
    <footer><form onSubmit={send}><label className="sr-only" htmlFor="question">Your question</label><input id="question" value={input} onChange={event => setInput(event.target.value)} placeholder="What’s on your mind?" maxLength={8000} disabled={busy} autoComplete="off" required /><button disabled={busy || !input.trim()} type="submit" aria-label="Send message">{busy ? "…" : "↑"}</button></form><div className="composer-help"><span>PDF, TXT & MD welcome</span><span>A little curiosity goes a long way.</span></div></footer>
    </div></div></main>;
}
