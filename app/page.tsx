"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

import {
  Activity, ArrowUp, Bot, Check, ChevronDown, Code2, Copy, Cpu,
  Menu, MessageSquarePlus, PanelLeftClose, Plus, Sparkles,
  StopCircle, X, Zap
} from "lucide-react";

type ModelEntry = readonly [id: string, name: string];

type ModelGroup = {
  readonly label: string;
  readonly models: readonly ModelEntry[];
};

const groups: readonly ModelGroup[] = [
  {
    label: "OPUS",
    models: [
      ["claude-opus-5-5", "Claude Opus 5.5"],
      ["claude-opus-5", "Claude Opus 5"],
      ["claude-opus-4-8", "Claude Opus 4.8"],
      ["claude-opus-4-7", "Claude Opus 4.7"],
      ["claude-opus-4-6", "Claude Opus 4.6"],
      ["claude-opus-4-5", "Claude Opus 4.5"]
    ]
  },
  {
    label: "SONNET",
    models: [
      ["claude-sonnet-5-5", "Claude Sonnet 5.5"],
      ["claude-sonnet-5", "Claude Sonnet 5"],
      ["claude-sonnet-4-6", "Claude Sonnet 4.6"],
      ["claude-sonnet-4-5", "Claude Sonnet 4.5"]
    ]
  },
  {
    label: "HAIKU",
    models: [
      ["claude-haiku-5-5", "Claude Haiku 5.5"],
      ["claude-haiku-4-5", "Claude Haiku 4.5"]
    ]
  }
];

const KEY = "valen-tools-chat-v1";

// FIX: components untuk markdown dibuat sekali di luar, biar gak dibuat baru tiap render
const markdownComponents = {
  pre: ({ children }: any) => (
    <CodeBlock streaming={false}>{children}</CodeBlock>
  ),
};

const CodeBlock = React.memo(function CodeBlock({
  children,
  streaming
}: {
  children: React.ReactNode;
  streaming: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const codeNode = React.Children
    .toArray(children)
    .find(React.isValidElement) as React.ReactElement<any> | undefined;

  const languageClass = String(codeNode?.props?.className ?? "");
  const language =
    languageClass.match(/language-([\w+#.-]+)/i)?.[1]?.toLowerCase() ?? "text";

  const raw = useMemo(() => String(
    codeNode?.props?.children ?? children ?? ""
  ).replace(/\n$/, ""), [codeNode?.props?.children, children]);

  const highlighted = useMemo(() => {
    if (!streaming && language !== "text" && hljs.getLanguage(language)) {
      try {
        return hljs.highlight(raw, { language, ignoreIllegals: true }).value;
      } catch {
        return raw;
      }
    }
    return raw;
  }, [raw, language, streaming]);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }, [raw]);

  return (
    <div className="code-card">
      <div className="code-toolbar">
        <span className="code-language">{language}</span>
        <button
          type="button"
          className="code-copy"
          onClick={copyCode}
          aria-label="Copy code"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="code-pre">
        <code
          className={`hljs${!streaming && language !== "text" ? "" : " code-plain"}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
});

// FIX: Pisah jadi komponen sendiri + memo, biar pesan lama gak ke-render ulang pas streaming
const MessageItem = React.memo(function MessageItem({
  message,
  modelName,
  copied,
  onCopy,
  busy,
}: {
  message: any;
  modelName: string;
  copied: string;
  onCopy: (id: string, text: string) => void;
  busy: boolean;
}) {
  const text = useMemo(() => message.parts
    .filter((part: any) => part.type === "text")
    .map((part: any) => part.text)
    .join(""), [message.parts]);

  // Komponen pre yang tau status streaming pesan ini
  const components = useMemo(() => ({
    pre: ({ children }: any) => (
      <CodeBlock streaming={busy && message.role === "assistant"}>{children}</CodeBlock>
    ),
  }), [busy, message.role]);

  return (
    <article className={`message ${message.role}`}>
      <div className="message-avatar">
        {message.role === "user" ? "V" : <Sparkles size={15} />}
      </div>
      <div className="message-content">
        <div className="message-meta">
          <b>{message.role === "user" ? "You" : "VALEN AI"}</b>
          <span>{message.role === "assistant" ? modelName : "MESSAGE"}</span>
        </div>
        <div className="markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {text}
          </ReactMarkdown>
        </div>
        {message.role === "assistant" && text && (
          <button className="copy-btn" onClick={() => onCopy(message.id, text)}>
            {copied === message.id ? <Check size={13} /> : <Copy size={13} />}
            {copied === message.id ? "Copied" : "Copy response"}
          </button>
        )}
      </div>
    </article>
  );
});

export default function Home() {
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [input, setInput] = useState("");
  const [sidebar, setSidebar] = useState(true);
  const [copied, setCopied] = useState("");
  const [ready, setReady] = useState(false);

  const modelRef = useRef(model);
  // FIX: Jangan tulis ref pas render, pake effect
  useEffect(() => { modelRef.current = model; }, [model]);

  const bottom = useRef<HTMLDivElement>(null);

  // FIX: Transport dibikin sekali aja, jangan tiap render
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    body: () => ({ model: modelRef.current })
  }), []);

  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    error
  } = useChat({ transport });

  // Load sekali di awal
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      // Abaikan riwayat yang rusak.
    }
    setReady(true);
  }, [setMessages]);

  // FIX PALING PENTING: Simpan cuma pas status ready + debounce 500ms
  // Jangan stringify tiap token streaming
  useEffect(() => {
    if (!ready) return;
    if (status !== "ready") return;

    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(messages));
      } catch {}
    }, 500);
    return () => window.clearTimeout(t);
  }, [messages, ready, status]);

  // FIX: Scroll cuma pas pesan baru / status berubah, dan jangan scroll kalau user lagi scroll ke atas
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length, status]);

  const busy = status !== "ready";

  const modelName = useMemo(() =>
    groups.flatMap(group => group.models).find(([id]) => id === model)?.[1] ?? "Claude Sonnet 4.6"
  , [model]);

  const fresh = useCallback(() => {
    if (status !== "ready") stop();
    setMessages([]);
    localStorage.removeItem(KEY);
    setInput("");
  }, [status, stop, setMessages]);

  const submit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || status !== "ready") return;
    sendMessage({ text });
    setInput("");
  }, [input, status, sendMessage]);

  const copy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1300);
    } catch {
      setCopied("");
    }
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(e as any);
    }
  }, [submit]);

  return (
    <main className="shell">
      <aside className={`sidebar ${sidebar ? "open" : "closed"}`}>
        <div className="brand">
          <div className="brand-mark">V</div>
          <div className="brand-copy">
            <b>VALEN <i>TOOLS</i></b>
            <small>PERSONAL AI WORKSPACE</small>
          </div>
          <button className="icon-btn mobile-only" onClick={() => setSidebar(false)}>
            <X size={18} />
          </button>
        </div>

        <button className="new-chat" onClick={fresh}>
          <Plus size={17} />
          New conversation
          <span>⌘ K</span>
        </button>

        <div className="side-label">WORKSPACE</div>
        <div className="side-item active">
          <Bot size={17} />
          AI Assistant
          <span className="live-dot" />
        </div>

        <div className="side-label">SESSION</div>
        <div className="session-card">
          <div className="session-icon"><MessageSquarePlus size={16} /></div>
          <div>
            <b>Personal session</b>
            <small>{messages.length ? `${messages.length} messages` : "Ready for a new idea"}</small>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="status-line"><span className="status-dot" />SYSTEM ONLINE</div>
          <div className="profile">
            <div className="avatar">V</div>
            <div><b>Valen</b><small>Private workspace</small></div>
            <span className="profile-more">•••</span>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="top-left">
            <button className="icon-btn" onClick={() => setSidebar(!sidebar)}>
              <PanelLeftClose size={18} />
            </button>
            <div className="breadcrumb">Workspace <span>/</span> <b>AI Assistant</b></div>
          </div>
          <div className="top-right">
            <div className="secure-pill"><span /> PRIVATE</div>
            <button className="icon-btn" onClick={fresh}><MessageSquarePlus size={18} /></button>
          </div>
        </header>

        <div className="workspace">
          <div className="chat-column">
            <div className="chat-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" />VALEN INTELLIGENCE</div>
                <h1>AI Assistant<span>.</span></h1>
                <p>Your private space to think, build, and create.</p>
              </div>
              <div className="model-wrap">
                <label>ACTIVE MODEL</label>
                <div className="select-box">
                  <Cpu size={15} />
                  <select value={model} onChange={e => setModel(e.target.value)}>
                    {groups.map(group => (
                      <optgroup key={group.label} label={group.label}>
                        {group.models.map(item => (
                          <option key={item[0]} value={item[0]}>{item[1]}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            <div className={`messages ${messages.length ? "has-messages" : "empty"}`}>
              {!messages.length ? (
                <div className="welcome">
                  <div className="orb">
                    <div className="orb-inner"><Sparkles size={27} /></div>
                    <span className="orb-ring ring-one" />
                    <span className="orb-ring ring-two" />
                  </div>
                  <div className="welcome-kicker"><Zap size={13} />READY WHEN YOU ARE</div>
                  <h2>What are we<br /><em>working on</em> today?</h2>
                  <p>Ask anything, explore an idea, or turn a rough thought<br className="desktop-break" />into something real.</p>
                  <div className="suggestions">
                    {[
                      ["Explain a concept", "Break down a complex topic simply."],
                      ["Write some code", "Build, debug, or improve a project."],
                      ["Brainstorm ideas", "Explore fresh directions and concepts."]
                    ].map((suggestion, index) => (
                      <button
                        className="suggestion"
                        key={suggestion[0]}
                        onClick={() => setInput([
                          "Jelaskan konsep yang sulit dengan sederhana.",
                          "Bantu saya membuat dan menjelaskan kode.",
                          "Bantu saya brainstorming ide project."
                        ][index])}
                      >
                        <span className="suggestion-icon">
                          {index === 0 ? <Activity size={17} /> : index === 1 ? <Code2 size={17} /> : <Sparkles size={17} />}
                        </span>
                        <span><b>{suggestion[0]}</b><small>{suggestion[1]}</small></span>
                        <ArrowUp size={15} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="message-list">
                  {messages.map(message => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      modelName={modelName}
                      copied={copied}
                      onCopy={copy}
                      busy={busy}
                    />
                  ))}
                  {busy && (
                    <div className="typing"><span /><span /><span /><small>VALEN is thinking...</small></div>
                  )}
                  <div ref={bottom} />
                </div>
              )}
            </div>

            {error && (
              <div className="error-box">
                <b>Request failed</b>
                <span>{error.message || "Periksa API key dan konfigurasi VannAPI."}</span>
              </div>
            )}

            <div className="composer-wrap">
              <form className="composer" onSubmit={submit}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Message VALEN AI..."
                  rows={1}
                  disabled={busy}
                />
                <div className="composer-bottom">
                  <div className="composer-hint">
                    <span className="key">↵</span> send
                    <span className="hint-divider">·</span>
                    <span className="key">⇧ ↵</span> new line
                  </div>
                  {busy ? (
                    <button type="button" className="send-btn stop" onClick={stop}><StopCircle size={17} /></button>
                  ) : (
                    <button type="submit" className="send-btn" disabled={!input.trim()}><ArrowUp size={18} /></button>
                  )}
                </div>
              </form>
              <div className="disclaimer">VALEN AI can make mistakes. Check important information.</div>
            </div>
          </div>
        </div>
      </section>

      {!sidebar && (
        <button className="mobile-menu" onClick={() => setSidebar(true)}><Menu size={20} /></button>
      )}
    </main>
  );
}
