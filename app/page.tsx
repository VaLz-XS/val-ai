 "use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import { Activity, ArrowUp, Bot, Check, ChevronDown, Code2, Copy, Cpu, Menu, MessageSquarePlus, PanelLeftClose, Plus, Sparkles, StopCircle, X, Zap } from "lucide-react";

const groups = [
 {label:"OPUS",models:[["claude-opus-5-5","Claude Opus 5.5"],["claude-opus-5","Claude Opus 5"],["claude-opus-4-8","Claude Opus 4.8"],["claude-opus-4-7","Claude Opus 4.7"],["claude-opus-4-6","Claude Opus 4.6"],["claude-opus-4-5","Claude Opus 4.5"]]},
 {label:"SONNET",models:[["claude-sonnet-5-5","Claude Sonnet 5.5"],["claude-sonnet-5","Claude Sonnet 5"],["claude-sonnet-4-6","Claude Sonnet 4.6"],["claude-sonnet-4-5","Claude Sonnet 4.5"]]},
 {label:"HAIKU",models:[["claude-haiku-5-5","Claude Haiku 5.5"],["claude-haiku-4-5","Claude Haiku 4.5"]]}
] as const;
const KEY="valen-tools-chat-v1";

function CodeBlock({ children }: { children: React.ReactNode }) {
 const [copied, setCopied] = useState(false);
 const codeNode = React.Children.toArray(children).find(React.isValidElement) as React.ReactElement<any> | undefined;
 const languageClass = String(codeNode?.props?.className ?? "");
 const language = languageClass.match(/language-([\w+#.-]+)/i)?.[1]?.toLowerCase() ?? "text";
 const raw = String(codeNode?.props?.children ?? children ?? "").replace(/\n$/, "");

 let highlighted = "";
 try {
  highlighted = language !== "text" && hljs.getLanguage(language)
   ? hljs.highlight(raw, { language, ignoreIllegals: true }).value
   : hljs.highlightAuto(raw).value;
 } catch {
  highlighted = hljs.highlightAuto(raw).value;
 }

 async function copyCode() {
  try {
   await navigator.clipboard.writeText(raw);
   setCopied(true);
   window.setTimeout(() => setCopied(false), 1400);
  } catch {
   // Clipboard may be unavailable on non-HTTPS origins.
  }
 }

 return (
  <div className="code-card">
   <div className="code-toolbar">
    <span className="code-language">{language}</span>
    <button type="button" className="code-copy" onClick={copyCode} aria-label="Copy code">
     {copied ? <Check size={13} /> : <Copy size={13} />}
     {copied ? "Copied" : "Copy"}
    </button>
   </div>
   <pre className="code-pre"><code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
  </div>
 );
}

export default function Home() {
 const [model,setModel]=useState("claude-sonnet-4-6");
 const [input,setInput]=useState("");
 const [sidebar,setSidebar]=useState(true);
 const [copied,setCopied]=useState("");
 const [ready,setReady]=useState(false);
 const modelRef=useRef(model); modelRef.current=model;
 const bottom=useRef<HTMLDivElement>(null);
 const {messages,sendMessage,status,stop,setMessages,error}=useChat({transport:new DefaultChatTransport({api:"/api/chat",body:()=>({model:modelRef.current})})});
 useEffect(()=>{try{const v=localStorage.getItem(KEY);if(v)setMessages(JSON.parse(v));}catch{}setReady(true);},[setMessages]);
 useEffect(()=>{if(ready)localStorage.setItem(KEY,JSON.stringify(messages));bottom.current?.scrollIntoView({behavior:"smooth"});},[messages,ready]);
 const busy=status!=="ready";
 const modelName=groups.flatMap(g=>g.models).find(m=>m[0]===model)?.[1]||"Claude Sonnet 4.6";
 function fresh(){if(busy)stop();setMessages([]);localStorage.removeItem(KEY);setInput("");}
 function submit(e:React.FormEvent){e.preventDefault();const text=input.trim();if(!text||busy)return;sendMessage({text});setInput("");}
 async function copy(id:string,text:string){try{await navigator.clipboard.writeText(text);setCopied(id);setTimeout(()=>setCopied(""),1300);}catch{}}
 return <main className="shell">
  <aside className={`sidebar ${sidebar?"open":"closed"}`}>
   <div className="brand"><div className="brand-mark">V</div><div className="brand-copy"><b>VALEN <i>TOOLS</i></b><small>PERSONAL AI WORKSPACE</small></div><button className="icon-btn mobile-only" onClick={()=>setSidebar(false)}><X size={18}/></button></div>
   <button className="new-chat" onClick={fresh}><Plus size={17}/> New conversation <span>⌘ K</span></button>
   <div className="side-label">WORKSPACE</div><div className="side-item active"><Bot size={17}/> AI Assistant <span className="live-dot"/></div>
   <div className="side-label">SESSION</div><div className="session-card"><div className="session-icon"><MessageSquarePlus size={16}/></div><div><b>Personal session</b><small>{messages.length?`${messages.length} messages`:"Ready for a new idea"}</small></div></div>
   <div className="sidebar-bottom"><div className="status-line"><span className="status-dot"/> SYSTEM ONLINE</div><div className="profile"><div className="avatar">V</div><div><b>Valen</b><small>Private workspace</small></div><span className="profile-more">•••</span></div></div>
  </aside>
  <section className="main-area">
   <header className="topbar"><div className="top-left"><button className="icon-btn" onClick={()=>setSidebar(!sidebar)}><PanelLeftClose size={18}/></button><div className="breadcrumb">Workspace <span>/</span> <b>AI Assistant</b></div></div><div className="top-right"><div className="secure-pill"><span/> PRIVATE</div><button className="icon-btn" onClick={fresh}><MessageSquarePlus size={18}/></button></div></header>
   <div className="workspace"><div className="chat-column">
    <div className="chat-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> VALEN INTELLIGENCE</div><h1>AI Assistant<span>.</span></h1><p>Your private space to think, build, and create.</p></div><div className="model-wrap"><label>ACTIVE MODEL</label><div className="select-box"><Cpu size={15}/><select value={model} onChange={e=>setModel(e.target.value)}>{groups.map(g=><optgroup key={g.label} label={g.label}>{g.models.map(m=><option key={m[0]} value={m[0]}>{m[1]}</option>)}</optgroup>)}</select><ChevronDown size={14}/></div></div></div>
    <div className={`messages ${messages.length?"has-messages":"empty"}`}>{!messages.length?<div className="welcome"><div className="orb"><div className="orb-inner"><Sparkles size={27}/></div><span className="orb-ring ring-one"/><span className="orb-ring ring-two"/></div><div className="welcome-kicker"><Zap size={13}/> READY WHEN YOU ARE</div><h2>What are we<br/><em>working on</em> today?</h2><p>Ask anything, explore an idea, or turn a rough thought<br className="desktop-break"/> into something real.</p><div className="suggestions">{[["Explain a concept","Break down a complex topic simply."],["Write some code","Build, debug, or improve a project."],["Brainstorm ideas","Explore fresh directions and concepts."]].map((s,i)=><button className="suggestion" key={s[0]} onClick={()=>setInput(["Jelaskan konsep yang sulit dengan sederhana.","Bantu saya membuat dan menjelaskan kode.","Bantu saya brainstorming ide project."][i])}><span className="suggestion-icon">{i===0?<Activity size={17}/>:i===1?<Code2 size={17}/>:<Sparkles size={17}/>}</span><span><b>{s[0]}</b><small>{s[1]}</small></span><ArrowUp size={15}/></button>)}</div></div>:<div className="message-list">{messages.map(m=>{const text=m.parts.filter((p:any)=>p.type==="text").map((p:any)=>p.text).join("");return <article className={`message ${m.role}`} key={m.id}><div className="message-avatar">{m.role==="user"?"V":<Sparkles size={15}/>}</div><div className="message-content"><div className="message-meta"><b>{m.role==="user"?"You":"VALEN AI"}</b><span>{m.role==="assistant"?modelName:"MESSAGE"}</span></div><div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: ({ children }) => <CodeBlock>{children}</CodeBlock> }}>{text}</ReactMarkdown></div>{m.role==="assistant"&&text&&<button className="copy-btn" onClick={()=>copy(m.id,text)}>{copied===m.id?<Check size={13}/>:<Copy size={13}/>} {copied===m.id?"Copied":"Copy response"}</button>}</div></article>})}{busy&&<div className="typing"><span/><span/><span/><small>VALEN is thinking...</small></div>}<div ref={bottom}/></div>}</div>
    {error&&<div className="error-box"><b>Request failed</b><span>{error.message||"Periksa API key dan konfigurasi VannAPI."}</span></div>}
    <div className="composer-wrap"><form className="composer" onSubmit={submit}><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit(e);}}} placeholder="Message VALEN AI..." rows={1} disabled={busy}/><div className="composer-bottom"><div className="composer-hint"><span className="key">↵</span> send <span className="hint-divider">·</span> <span className="key">⇧ ↵</span> new line</div>{busy?<button type="button" className="send-btn stop" onClick={stop}><StopCircle size={17}/></button>:<button type="submit" className="send-btn" disabled={!input.trim()}><ArrowUp size={18}/></button>}</div></form><div className="disclaimer">VALEN AI can make mistakes. Check important information.</div></div>
   </div></div>
  </section>{!sidebar&&<button className="mobile-menu" onClick={()=>setSidebar(true)}><Menu size={20}/></button>}
 </main>;
}
