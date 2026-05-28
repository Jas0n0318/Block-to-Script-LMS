import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as Blockly from "blockly";
import {
  BookOpen, Puzzle, Code, Gamepad2, Lock, CheckCircle,
  ChevronRight, ArrowLeft, Copy, Download, Sparkles, Trophy, Key
} from "lucide-react";
import api from "../api/client";
import BlocklyWorkspace from "../components/BlocklyWorkspace";
import LuaCodeBlock from "../components/LuaCodeBlock";
import AiTutorPanel from "../components/AiTutorPanel";
import { useAuthStore } from "../stores/authStore";
import { copyToClipboard } from "../utils/clipboard";

interface Chapter {
  id: number;
  title: string;
  type: "READING" | "BLOCKLY" | "CLOZE" | "PRACTICE";
  orderIndex: number;
  content: string | null;
  blocklyAnswer: string | null;
  luaCode: string | null;
  luaAnswers: string | null;
  completed: boolean;
}

interface Course {
  id: number;
  title: string;
  rbxlUrl: string | null;
  unlockEvent: string | null;
  status: string;
  chapters: Chapter[];
}

const TYPE_ICONS = {
  READING: BookOpen,
  BLOCKLY: Puzzle,
  CLOZE: Code,
  PRACTICE: Gamepad2,
};

const TYPE_LABELS = {
  READING: "閱讀",
  BLOCKLY: "積木測驗",
  CLOZE: "程式填空",
  PRACTICE: "實作挑戰",
};

const TYPE_BADGES = {
  READING: "bg-blue-50 text-blue-600 border-blue-200",
  BLOCKLY: "bg-amber-50 text-amber-600 border-amber-200",
  CLOZE: "bg-purple-50 text-purple-600 border-purple-200",
  PRACTICE: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);

  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const student_token = useAuthStore((s) => s.student_token);

  // Page dwell tracking
  const dwellStartRef = useRef<number>(Date.now());
  const dwellChapterRef = useRef<{ id: number; type: string; title: string } | null>(null);

  const trackDwell = () => {
    const ch = dwellChapterRef.current;
    if (!ch || !course?.id) return;
    const elapsed = Math.round((Date.now() - dwellStartRef.current) / 1000);
    if (elapsed < 3) return;
    api.post("/api/tracking", {
      events: [{ actionType: "page_dwell", courseId: course.id, detail: JSON.stringify({ type: ch.type, title: ch.title, chapterId: ch.id }), duration: elapsed }]
    }).catch(() => {});
  };

  const fetchCourse = async () => {
    if (!courseId) return false;
    try {
      const res = await api.get(`/api/courses/${courseId}`);
      const isCompleted = res.data.status === "COMPLETED";
      setCourse(res.data);
      if (!isCompleted) {
        const firstUnfinished = res.data.chapters.findIndex((ch: Chapter) => !ch.completed);
        if (firstUnfinished !== -1) setActiveIdx(firstUnfinished);
      } else {
        setActiveIdx(res.data.chapters.length - 1);
      }
      return isCompleted;
    } catch {
      navigate("/topics");
      return false;
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    const el = sidebarRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx]);

  // Track dwell on chapter change
  useEffect(() => {
    trackDwell();
    if (course?.chapters[activeIdx]) {
      dwellStartRef.current = Date.now();
      dwellChapterRef.current = {
        id: course.chapters[activeIdx].id,
        type: course.chapters[activeIdx].type,
        title: course.chapters[activeIdx].title,
      };
    }
  }, [activeIdx]);

  // Final dwell on unmount / page close
  useEffect(() => {
    const handle = () => trackDwell();
    window.addEventListener("beforeunload", handle);
    return () => {
      trackDwell();
      window.removeEventListener("beforeunload", handle);
    };
  }, []);

  const saveChapterProgress = async (chapterId: number) => {
    if (!courseId) return;
    try {
      const res = await api.patch(`/api/courses/${courseId}/chapters`, { chapterId, completed: true });
      setCourse((prev) => {
        if (!prev) return null;
        const newChapters = prev.chapters.map((ch) =>
          ch.id === chapterId ? { ...ch, completed: true } : ch
        );
        return { ...prev, chapters: newChapters, status: res.data.status };
      });
      if (activeIdx < (course?.chapters.length || 0) - 1) {
        setActiveIdx(activeIdx + 1);
      } else if (res.data.status === "COMPLETED") {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    } catch (e) {
      console.error("Failed to save progress", e);
    }
  };

  const currentChapter = course?.chapters[activeIdx];
  const completedCount = course?.chapters.filter((ch) => ch.completed).length || 0;
  const totalCount = course?.chapters.length || 1;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const canAccess = (idx: number) => {
    if (!course) return false;
    if (course.status === "COMPLETED") return true;
    if (idx === 0) return true;
    return course.chapters[idx - 1].completed;
  };

  const stripBlocklyMeta = (xml: string) =>
    xml.replace(/\s+(id|x|y|disabled|collapsed|inline|icon)="[^"]*"/g, "").replace(/\s+xmlns="[^"]*"/g, "").replace(/>\s+</g, "><");

  const checkBlockly = () => {
    if (!workspaceRef.current || !currentChapter?.blocklyAnswer) return;
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspaceRef.current));
    const normalized = stripBlocklyMeta(xml);
    const answer = stripBlocklyMeta(currentChapter.blocklyAnswer);
    if (normalized === answer) {
      saveChapterProgress(currentChapter.id);
      api.post("/api/tracking", { events: [{ actionType: "block_success", courseId: course?.id }] });
      window.dispatchEvent(new CustomEvent("ai-blockly-event", { detail: { action: "blockly_success", detail: currentChapter?.title } }));
    } else {
      api.post("/api/tracking", { events: [{ actionType: "block_error", courseId: course?.id, detail: xml }] });
      window.dispatchEvent(new CustomEvent("ai-blockly-event", { detail: { action: "blockly_error", detail: currentChapter?.title } }));
      alert("積木順序不太對，再試一次！");
    }
  };

  const renderMarkdown = (text: string | null) => {
    if (!text) return null;
    const lines = text.split("\n");
    const out: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: React.ReactNode[] = [];

    const flushTable = () => {
      if (tableRows.length > 0) {
        out.push(
          <div key={`table-${out.length}`} className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">{tableRows}</table>
          </div>
        );
        tableRows = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("## ")) {
        flushTable(); inTable = false;
        out.push(<h2 key={i} className="text-xl font-bold mt-6 mb-3 text-slate-800 flex items-center gap-2"><span className="w-1 h-6 bg-blue-500 rounded-full inline-block" />{line.slice(3)}</h2>);
      } else if (line.startsWith("### ")) {
        flushTable(); inTable = false;
        out.push(<h3 key={i} className="text-lg font-bold mt-5 mb-2 text-slate-700">{line.slice(4)}</h3>);
      } else if (line.startsWith("|") && line.endsWith("|")) {
        const cells = line.split("|").filter(Boolean).map((c) => c.trim());
        const isHeader = lines[i + 1]?.startsWith("|---");
        if (!inTable) {
          inTable = true;
          flushTable();
          const headers = cells.map((c, ci) => <th key={ci} className="border border-[#BCCCDC] px-3 py-2 bg-[#D9EAFD] text-slate-700 font-bold text-left">{c}</th>);
          tableRows.push(<thead key={`th-${i}`}><tr>{headers}</tr></thead>);
        } else if (isHeader) {
          i++;
        } else {
          const row = cells.map((c, ci) => <td key={ci} className="border border-[#BCCCDC] px-3 py-2 text-slate-600">{c}</td>);
          tableRows.push(<tr key={`tr-${i}`}>{row}</tr>);
        }
      } else if (line.startsWith("- ")) {
        flushTable(); inTable = false;
        out.push(<li key={i} className="text-slate-600 ml-5 list-disc leading-relaxed mb-1">{line.slice(2)}</li>);
      } else if (line.startsWith("1. ")) {
        flushTable(); inTable = false;
        out.push(<li key={i} className="text-slate-600 ml-5 list-decimal leading-relaxed mb-1">{line.slice(3)}</li>);
      } else if (line.match(/^`{3,}/)) {
        flushTable(); inTable = false;
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].match(/^`{3,}/)) {
          codeLines.push(lines[i]);
          i++;
        }
        out.push(
          <pre key={i} className="bg-slate-50 text-emerald-700 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono leading-relaxed border border-[#D9EAFD]">
            {codeLines.join("\n")}
          </pre>
        );
      } else if (line.match(/^https?:\/\//)) {
        out.push(
          <a key={i} href={line.trim()} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline inline-block my-1">{line.trim()}</a>
        );
      } else if (line.startsWith("**") && line.endsWith("**")) {
        out.push(<p key={i} className="font-bold text-slate-700 my-2">{line.slice(2, -2)}</p>);
      } else if (line.trim() === "") {
        flushTable(); inTable = false;
        out.push(<div key={i} className="h-2" />);
      } else {
        flushTable(); inTable = false;
        const rendered = line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-800">$1</strong>')
          .replace(/`(.*?)`/g, '<code class="bg-[#D9EAFD] text-slate-700 px-1 rounded text-sm">$1</code>');
        out.push(<p key={i} className="text-slate-600 leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: rendered }} />);
      }
    }
    flushTable();
    return out;
  };

  if (!course || !currentChapter) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="animate-pulse text-[#9AA6B2]">載入中...</div>
      </div>
    );
  }

  const ChapterIcon = TYPE_ICONS[currentChapter.type];
  const isLastChapter = activeIdx === course.chapters.length - 1;
  const isCourseCompleted = course.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-700 flex flex-col">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <Trophy className="w-24 h-24 text-yellow-500 animate-bounce" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-200/40 to-transparent" />
        </div>
      )}

      <AiTutorPanel courseId={course.id} />

      {/* ────── 頂部欄 ────── */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#BCCCDC] px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate("/topics")}
          className="text-[#9AA6B2] hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-[#D9EAFD]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm text-[#9AA6B2]">
          <button onClick={() => navigate("/topics")} className="hover:text-slate-700 transition-colors">主題列表</button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-700 font-medium truncate max-w-[200px] sm:max-w-[400px]">{course.title}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
            isCourseCompleted
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "bg-blue-50 text-blue-600 border-blue-200"
          }`}>
            {isCourseCompleted ? "已完成" : "進行中"}
          </span>
        </div>
      </header>

      {/* ────── 主體（側欄 + 內容） ────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左側導覽 */}
        <aside className="w-72 bg-white border-r border-[#BCCCDC]/50 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-[#BCCCDC]/50">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-slate-500 font-medium">課程進度</span>
              <span className="text-[#9AA6B2]">{completedCount}/{totalCount}</span>
            </div>
            <div className="h-1.5 bg-[#D9EAFD] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <nav ref={sidebarRef} className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
            {course.chapters.map((ch, idx) => {
              const active = idx === activeIdx;
              const accessible = canAccess(idx);
              const completed = ch.completed;
              const IconComp = TYPE_ICONS[ch.type];

              return (
                <button
                  key={ch.id}
                  onClick={() => accessible && setActiveIdx(idx)}
                  disabled={!accessible}
                  className={`relative w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    active
                      ? "bg-blue-50 ring-1 ring-blue-200"
                      : completed
                      ? "hover:bg-[#D9EAFD]/50"
                      : accessible
                      ? "hover:bg-[#F8FAFC]"
                      : ""
                  } ${!accessible ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                    completed
                      ? "bg-emerald-100 text-emerald-600"
                      : active
                      ? "bg-blue-100 text-blue-600"
                      : "bg-[#D9EAFD] text-[#9AA6B2]"
                  }`}>
                    {completed ? <CheckCircle className="w-4 h-4" /> : accessible ? <IconComp className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
                  </span>

                  <span className={`text-sm truncate ${
                    active ? "text-slate-800 font-medium" : completed ? "text-slate-500" : "text-[#9AA6B2]"
                  }`}>
                    {ch.title}
                  </span>

                  {completed && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-auto" />}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-[#BCCCDC]/50">
            <div className="text-xs text-[#9AA6B2] text-center">
              {completedCount === totalCount ? "課程完成！" : `${completedCount}/${totalCount} 章節完成`}
            </div>
          </div>
        </aside>

        {/* 右側主內容 */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* 章節標題區 */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${TYPE_BADGES[currentChapter.type]}`}>
                  {TYPE_LABELS[currentChapter.type]}
                </span>
                <span className="text-sm text-[#9AA6B2]">步驟 {activeIdx + 1} / {totalCount}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#BCCCDC] text-slate-600 shrink-0">
                  <ChapterIcon className="w-5 h-5" />
                </span>
                {currentChapter.title}
              </h1>
            </div>

            {/* 內容卡片 */}
            <div className="bg-white border border-[#BCCCDC]/60 rounded-xl p-8 shadow-sm space-y-6">

              {/* READING */}
              {currentChapter.type === "READING" && (
                <div>
                  <div className="leading-relaxed">
                    {renderMarkdown(currentChapter.content)}
                  </div>
                  {!currentChapter.completed && (
                    <div className="mt-8 flex justify-center">
                      <button
                        onClick={() => {
                          saveChapterProgress(currentChapter.id);
                          api.post("/api/tracking", { events: [{ actionType: "reading_done", courseId: course?.id }] });
                        }}
                        className="bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95 text-white px-8 py-3.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2"
                      >
                        <BookOpen className="w-5 h-5" />
                        閱讀完成，進入下一關
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  {currentChapter.completed && (
                    <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold">
                        <CheckCircle className="w-5 h-5" />
                        章節已完成
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* BLOCKLY */}
              {currentChapter.type === "BLOCKLY" && (
                <div className="space-y-6">
                  <div className="bg-white border border-[#BCCCDC]/60 rounded-xl p-6">
                    <BlocklyWorkspace onWorkspaceReady={(ws) => { workspaceRef.current = ws; }} />
                  </div>
                  {!currentChapter.completed ? (
                    <div className="flex justify-center">
                      <button
                        onClick={checkBlockly}
                        className="bg-amber-500 hover:bg-amber-600 hover:scale-105 active:scale-95 text-white px-8 py-3.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2"
                      >
                        <Puzzle className="w-5 h-5" />
                        檢查積木答案
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold">
                        <CheckCircle className="w-5 h-5" />
                        積木測驗已通過
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CLOZE */}
              {currentChapter.type === "CLOZE" && (
                <div className="space-y-6">
                  <div className="bg-white border border-[#BCCCDC]/60 rounded-xl p-6">
                    <LuaCodeBlock
                      code={currentChapter.luaCode || ""}
                      answers={(() => { try { return currentChapter.luaAnswers ? JSON.parse(currentChapter.luaAnswers) : []; } catch { return []; } })()}
                      onFillComplete={() => {
                        saveChapterProgress(currentChapter.id);
                        api.post("/api/tracking", { events: [{ actionType: "cloze_done", courseId: course?.id }] });
                      }}
                    />
                  </div>
                  {currentChapter.completed && (
                    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold">
                        <CheckCircle className="w-5 h-5" />
                        程式填空已通過
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PRACTICE */}
              {currentChapter.type === "PRACTICE" && (
                <div className="space-y-6">
                  <div className="leading-relaxed">
                    {renderMarkdown(currentChapter.content)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {course.rbxlUrl && (
                      <a
                        href={course.rbxlUrl}
                        download
                        className="flex items-center gap-4 bg-[#D9EAFD]/50 hover:bg-[#D9EAFD] border border-[#BCCCDC] rounded-xl p-6 transition-all hover:scale-[1.02] group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <Download className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-700">下載 .rbxl 模板</div>
                          <div className="text-xs text-[#9AA6B2] mt-0.5">在 Roblox Studio 中開啟</div>
                        </div>
                      </a>
                    )}

                    {course.unlockEvent && (
                      <div className="flex items-center gap-4 bg-[#D9EAFD]/50 border border-[#BCCCDC] rounded-xl p-6">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                          <Key className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-700">你的專屬 Token</div>
                          <code className="block text-xs font-mono text-slate-500 truncate mt-0.5 bg-white/60 px-2 py-1 rounded">
                            {student_token}
                          </code>
                        </div>
                        <button
                          onClick={() => {
                            copyToClipboard(student_token || "");
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="shrink-0 bg-white hover:bg-[#D9EAFD] hover:scale-105 active:scale-95 transition-all p-2 rounded-lg border border-[#BCCCDC]"
                          title="複製 Token"
                        >
                          {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-[#9AA6B2]" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {course.unlockEvent ? (
                    <>
                      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-sm text-slate-600 leading-relaxed flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <span>請在 Roblox Studio 中完成目標。完成後系統會自動透過 Webhook 標記為已完成。</span>
                        </p>
                      </div>

                      {!currentChapter.completed && (
                        <div className="flex justify-center">
                          <button
                            onClick={async () => {
                              const completed = await fetchCourse();
                              if (completed) {
                                window.dispatchEvent(new CustomEvent("ai-urgent-event", { detail: { action: "webhook_unlock", detail: course?.title } }));
                              } else {
                                alert("尚未收到 Webhook 訊號。請確認：\n\n1. Token 已正確填入 Workspace.Token\n2. Game Settings → Allow HTTP Requests 已啟用\n3. 已在測試模式中走到 FinishPart 觸碰終點\n4. 後端伺服器有在執行（port 8001）");
                              }
                            }}
                            className="bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95 text-white px-8 py-3.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2"
                          >
                            <Key className="w-5 h-5" />
                            檢查 Webhook 解鎖狀態
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {!currentChapter.completed && (
                        <div className="flex justify-center">
                          <button
                            onClick={() => {
                              saveChapterProgress(currentChapter.id);
                              api.post("/api/tracking", { events: [{ actionType: "practice_done", courseId: course?.id }] });
                              window.dispatchEvent(new CustomEvent("ai-urgent-event", { detail: { action: "practice_complete", detail: course?.title } }));
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 hover:scale-105 active:scale-95 text-white px-8 py-3.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" />
                            完成學習
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {currentChapter.completed && (
                    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold">
                        <CheckCircle className="w-5 h-5" />
                        實作已完成
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 底部導覽 */}
            <div className="flex items-center justify-between mt-10 gap-4">
              {activeIdx > 0 ? (
                <button
                  onClick={() => setActiveIdx(activeIdx - 1)}
                  className="flex items-center gap-1.5 text-[#9AA6B2] hover:text-slate-700 hover:bg-white px-4 py-2.5 rounded-lg transition-all text-sm border border-transparent hover:border-[#BCCCDC]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  上一章
                </button>
              ) : <div />}

              {isLastChapter && isCourseCompleted ? (
                <button
                  onClick={() => navigate("/topics")}
                  className="bg-emerald-500 hover:bg-emerald-600 hover:scale-105 active:scale-95 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2"
                >
                  <Trophy className="w-5 h-5" />
                  課程完成！返回列表
                </button>
              ) : activeIdx < totalCount - 1 && canAccess(activeIdx + 1) ? (
                <button
                  onClick={() => setActiveIdx(activeIdx + 1)}
                  className="flex items-center gap-1.5 text-[#9AA6B2] hover:text-slate-700 hover:bg-white px-4 py-2.5 rounded-lg transition-all text-sm border border-transparent hover:border-[#BCCCDC]"
                >
                  下一章
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : <div />}
            </div>

            {isCourseCompleted && (
              <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-lg">
                  <Trophy className="w-6 h-6" />
                  恭喜完成本課程！
                </div>
                <p className="text-[#9AA6B2] text-sm mt-1">所有章節皆已完成，可以回到主題列表繼續下一堂課。</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
