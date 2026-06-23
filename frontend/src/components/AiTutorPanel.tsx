import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { HardHat, X, Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import api from "../api/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  courseId?: number;
}

export default function AiTutorPanel({ courseId }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "實習生，有什麼問題嗎？工地主任在此。" },
  ]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const voiceEnabledRef = useRef(true);
  const [isListening, setIsListening] = useState(false);
  const [shaking, setShaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number>(0);
  const shakeTimer = useRef<number>(0);
  const prevCourseId = useRef<number | undefined>(undefined);
  const token = useAuthStore((s) => s.token);
  const isSpeakingRef = useRef(false);
  const ttsQueueRef = useRef<string[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const ttsBuffer = useRef("");
  const ttsTimer = useRef<number>(0);

  useEffect(() => {
    const load = () => { voicesRef.current = speechSynthesis.getVoices(); };
    if (speechSynthesis.getVoices().length) {
      load();
    } else {
      speechSynthesis.addEventListener("voiceschanged", load, { once: true });
    }
    speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    return () => { speechSynthesis.cancel(); };
  }, []);

  // -- TTS --
  const speak = useCallback((text: string) => {
    if (!voiceEnabledRef.current || !text.trim()) return;
    ttsQueueRef.current.push(text);
    if (isSpeakingRef.current) return;
    isSpeakingRef.current = true;

    const processQueue = () => {
      if (ttsQueueRef.current.length === 0) {
        isSpeakingRef.current = false;
        return;
      }
      const chunk = ttsQueueRef.current.shift()!;
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = "zh-TW";
      utterance.rate = 1.2;
      utterance.pitch = 1.0;
      const voice = voicesRef.current.find(
        (v) => v.lang === "zh-TW" && (v.name.includes("David") || v.name.includes("Danny"))
      ) || voicesRef.current.find((v) => v.lang === "zh-TW") || null;
      if (voice) utterance.voice = voice;
      utterance.onend = processQueue;
      utterance.onerror = processQueue;
      speechSynthesis.speak(utterance);
    };

    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.addEventListener("voiceschanged", () => {
        speechSynthesis.removeEventListener("voiceschanged", () => {});
        processQueue();
      }, { once: true });
    } else {
      processQueue();
    }
  }, [voiceEnabled]);

  // -- TTS Buffer --
  const flushTTS = useCallback(() => {
    if (!ttsBuffer.current.trim()) return;
    speak(ttsBuffer.current);
    ttsBuffer.current = "";
  }, [speak]);

  const bufferSpeak = useCallback((text: string) => {
    if (!voiceEnabledRef.current || !text) return;
    ttsBuffer.current += text;
    clearTimeout(ttsTimer.current);
    const last = ttsBuffer.current[ttsBuffer.current.length - 1];
    if (/[。！？\n]/.test(last)) {
      flushTTS();
    } else {
      ttsTimer.current = window.setTimeout(flushTTS, 400);
    }
  }, [flushTTS]);

  // -- STT --
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-TW";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.start();
    setIsListening(true);
  }, []);

  // -- WebSocket --
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && prevCourseId.current === courseId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      wsRef.current?.close();
      wsRef.current = null;
    }
    prevCourseId.current = courseId;

    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const protocol = apiUrl.startsWith("https") ? "wss:" : "ws:";
    const host = apiUrl.replace(/^https?:\/\//, "");
    const ws = new WebSocket(`${protocol}//${host}/api/ai-tutor/chat`);

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      setConnected(true);
      ws.send(JSON.stringify({ token, course_id: courseId }));
    };

    ws.onmessage = (e) => {
      let data: any;
      try {
        data = JSON.parse(e.data);
      } catch {
        if (e.data === "__pong__") return;
        setMessages((prev) => [...prev, { role: "assistant", content: e.data }]);
        return;
      }

      if (data.type === "intervention") {
        setOpen(true);
        setShaking(true);
        clearTimeout(shakeTimer.current);
        shakeTimer.current = window.setTimeout(() => setShaking(false), 2000);
        bufferSpeak(data.content);
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
        return;
      }

      if (data.type === "chunk") {
        bufferSpeak(data.content);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last.role === "assistant") {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, content: last.content + data.content };
            return updated;
          }
          return [...prev, { role: "assistant", content: data.content }];
        });
        return;
      }

      if (data.type === "done") {
        flushTTS();
        return;
      }

      if (data.type === "error") {
        setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ " + data.content }]);
      }
    };

    ws.onerror = () => {
      if (wsRef.current !== ws) return;
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      reconnectTimer.current = window.setTimeout(connect, 3000);
    };

    wsRef.current = ws;
  }, [token, courseId, bufferSpeak, flushTTS]);

  // Connect on mount, always keep alive
  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectTimer.current);
      clearTimeout(shakeTimer.current);
      clearTimeout(ttsTimer.current);
      speechSynthesis.cancel();
    };
  }, [connect]);

  // Listen for urgent events from CoursePage (via window custom event)
  useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as CustomEvent;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "urgent_event",
          action: evt.detail.action,
          detail: evt.detail.detail,
        }));
      }
    };
    window.addEventListener("ai-urgent-event", handler);
    return () => window.removeEventListener("ai-urgent-event", handler);
  }, []);

  // Listen for blockly events from CoursePage (via window custom event)
  useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as CustomEvent;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "event",
          action: evt.detail.action,
          detail: evt.detail.detail,
        }));
      }
    };
    window.addEventListener("ai-blockly-event", handler);
    return () => window.removeEventListener("ai-blockly-event", handler);
  }, []);

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current) return;
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    wsRef.current.send(JSON.stringify({ type: "chat", content: input }));
    api.post("/api/tracking", { events: [{ actionType: "ai_query", courseId, detail: input.slice(0, 200) }] }).catch(() => {});
    setInput("");
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) {
    return (
      <>
        <style>{`
          @keyframes shake-pulse {
            0%, 100% { transform: translateX(0) rotate(0deg) scale(1); }
            10% { transform: translateX(-6px) rotate(-4deg) scale(1.1); }
            20% { transform: translateX(6px) rotate(4deg) scale(1.05); }
            30% { transform: translateX(-4px) rotate(-2deg) scale(1.1); }
            40% { transform: translateX(4px) rotate(2deg) scale(1); }
            50% { transform: translateX(-2px) rotate(-1deg) scale(1.05); }
            60%, 100% { transform: translateX(0) rotate(0deg) scale(1); }
          }
        `}</style>
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 bg-amber-500 hover:bg-amber-400 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50"
          style={shaking ? { animation: "shake-pulse 2s ease-in-out" } : undefined}
          title="呼叫工地主任"
        >
          <HardHat className="w-7 h-7" />
        </button>
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          20% { transform: translateX(-5px) rotate(-3deg); }
          40% { transform: translateX(5px) rotate(3deg); }
          60% { transform: translateX(-4px) rotate(-2deg); }
          80% { transform: translateX(4px) rotate(2deg); }
        }
      `}</style>
      <div className="fixed bottom-4 right-4 w-80 h-96 bg-white border border-[#BCCCDC] rounded-xl shadow-xl flex flex-col z-50 overflow-hidden">
        <div className="bg-amber-500 text-white px-4 py-2.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex"
              style={shaking ? { animation: "shake-pulse 2s ease-in-out" } : undefined}
            >
              <HardHat className="w-4 h-4" />
            </span>
            <span className="font-bold text-sm">工地主任</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { speechSynthesis.cancel(); clearTimeout(ttsTimer.current); ttsQueueRef.current = []; ttsBuffer.current = ""; isSpeakingRef.current = false; setVoiceEnabled((v) => { const nv = !v; voiceEnabledRef.current = nv; return nv; }); }}
              className="text-white/80 hover:text-white transition-colors"
              title={voiceEnabled ? "關閉主任語音" : "開啟主任語音"}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
          {!connected && (
            <div className="text-center text-xs text-[#9AA6B2] py-2">連線中...</div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2 leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-[#D9EAFD] text-slate-700"
                }`}
              >
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-[#BCCCDC]/50 flex gap-2 shrink-0">
          <div className="flex-1 flex items-center border border-[#BCCCDC] rounded-lg bg-white overflow-hidden">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="問問題..."
              className="flex-1 px-3 py-2 text-sm text-slate-700 placeholder-[#9AA6B2] outline-none border-0"
              disabled={!connected}
            />
            <button
              onClick={startListening}
              disabled={!connected}
              className={`px-2 py-2 transition-colors ${
                isListening
                  ? "text-red-500"
                  : "text-[#9AA6B2] hover:text-slate-600"
              }`}
              title="語音輸入"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={sendMessage}
            disabled={!connected}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
