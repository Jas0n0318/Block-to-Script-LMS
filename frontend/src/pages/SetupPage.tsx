import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Rocket, Download, Globe, Monitor, CheckCircle, Trophy,
  ArrowLeft, Copy, Check, Sparkles, Play, Server
} from "lucide-react";
import api from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { copyToClipboard } from "../utils/clipboard";

interface Chapter {
  id: number;
  title: string;
  type: string;
  completed: boolean;
}

const STEP_ICONS = [Rocket, Globe, Monitor, Download, Monitor, Trophy];

export default function SetupPage() {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const user = useAuthStore((s) => s.user);
  const student_token = useAuthStore((s) => s.student_token);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const fetchSetup = async () => {
    try {
      const res = await api.get("/api/topics");
      const setupTopic = res.data.find((t: any) => t.orderIndex === 0);
      if (!setupTopic) { navigate("/topics"); return; }

      const coursesRes = await api.get(`/api/topics/${setupTopic.id}/courses`);
      const setupCourse = coursesRes.data.courses[0];
      if (!setupCourse || setupCourse.status === "LOCKED") { navigate("/topics"); return; }

      setCourseId(setupCourse.id);
      const detailRes = await api.get(`/api/courses/${setupCourse.id}`);
      setChapters(detailRes.data.chapters);

      const firstUnfinished = detailRes.data.chapters.findIndex((ch: Chapter) => !ch.completed);
      if (firstUnfinished !== -1) setActiveIdx(firstUnfinished);
      else setActiveIdx(detailRes.data.chapters.length - 1);
    } catch {
      navigate("/topics");
    }
  };

  useEffect(() => {
    fetchSetup();
  }, []);

  useEffect(() => {
    const el = sidebarRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx]);

  const saveStep = async (chapterId: number) => {
    if (!courseId) return;
    try {
      await api.patch(`/api/courses/${courseId}/chapters`, { chapterId, completed: true });
      setChapters(prev => prev.map(ch => ch.id === chapterId ? { ...ch, completed: true } : ch));
      if (activeIdx < chapters.length - 1) setActiveIdx(activeIdx + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const checkCompletion = async () => {
    if (!courseId) return;
    setChecking(true);
    try {
      const res = await api.get(`/api/courses/${courseId}`);
      if (res.data.status === "COMPLETED") {
        setChapters(res.data.chapters);
        setActiveIdx(res.data.chapters.length - 1);
      } else {
        alert("尚未收到完成訊號，請確認已在 Roblox Studio 中完成測試。");
      }
    } catch {
      alert("檢查失敗，請稍後再試。");
    }
    setChecking(false);
  };

  if (chapters.length === 0) return null;

  const currentChapter = chapters[activeIdx];
  const StepIcon = STEP_ICONS[activeIdx] || Rocket;
  const completedCount = chapters.filter((ch) => ch.completed).length;
  const totalCount = chapters.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);
  const isLastStep = activeIdx === chapters.length - 1;

  const canAccess = (idx: number) => {
    if (idx === 0) return true;
    return chapters[idx - 1].completed;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-700 flex flex-col">
      {/* 頂部欄 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#BCCCDC] px-4 sm:px-6 h-14 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate("/topics")}
          className="text-[#9AA6B2] hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-[#D9EAFD]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm text-[#9AA6B2]">
          <button onClick={() => navigate("/topics")} className="hover:text-slate-700 transition-colors">主題列表</button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-[#9AA6B2] hidden sm:block">{user?.username}</span>
        </div>
      </header>

      {/* 主體（側欄 + 內容） */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左側導覽 */}
        <aside className="w-72 bg-white border-r border-[#BCCCDC]/50 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-[#BCCCDC]/50">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-slate-500 font-medium">設定進度</span>
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
            {chapters.map((ch, idx) => {
              const active = idx === activeIdx;
              const accessible = canAccess(idx);
              const completed = ch.completed;
              const Icon = STEP_ICONS[idx] || Rocket;

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
                    {completed ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
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
              {completedCount === totalCount ? "設定完成！" : `${completedCount}/${totalCount} 步驟完成`}
            </div>
          </div>
        </aside>

        {/* 右側主內容 */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* 步驟標題 */}
            <div className="mb-8">
              <span className="text-sm text-[#9AA6B2]">步驟 {activeIdx + 1} / {totalCount}</span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3 mt-1">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#BCCCDC] text-slate-600 shrink-0">
                  <StepIcon className="w-5 h-5" />
                </span>
                {currentChapter.title}
              </h1>
            </div>

            {/* 內容卡片 */}
            <div className="bg-white border border-[#BCCCDC]/60 rounded-xl p-8 shadow-sm space-y-6">
              {/* 步驟 0：歡迎 */}
              {activeIdx === 0 && (
                <div className="text-center max-w-lg mx-auto">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Rocket className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-slate-600 text-lg leading-relaxed mb-8">
                    歡迎來到 Block-to-Script LMS！在開始學習之前，我們需要先設定你的開發環境。
                  </p>
                  <button
                    onClick={() => saveStep(currentChapter.id)}
                    className="bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-sm transition-all flex items-center gap-2 mx-auto"
                  >
                    <Play className="w-5 h-5" />
                    開始設定
                  </button>
                </div>
              )}

              {/* 步驟 1：註冊 Roblox */}
              {activeIdx === 1 && (
                <div className="max-w-lg mx-auto">
                  <p className="text-slate-600 text-center mb-8 text-lg">
                    你已經下載並註冊 Roblox 了嗎？這是進入元宇宙的第一步。
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => saveStep(currentChapter.id)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 hover:scale-105 active:scale-95 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      已下載 / 註冊
                    </button>
                    <a
                      href="https://www.roblox.com"
                      target="_blank"
                      className="flex-1 bg-[#D9EAFD] hover:bg-[#cde0f5] text-slate-700 py-4 rounded-xl font-bold text-center transition-all border border-[#BCCCDC] flex items-center justify-center gap-2"
                    >
                      <Globe className="w-5 h-5" />
                      前往官網
                    </a>
                  </div>
                </div>
              )}

              {/* 步驟 2：安裝 Studio */}
              {activeIdx === 2 && (
                <div className="max-w-lg mx-auto">
                  <p className="text-slate-600 text-center mb-6 text-lg">
                    你必須安裝 <strong className="text-slate-800">Roblox Studio</strong> 才能開始創作。
                  </p>
                  <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl mb-8">
                    <ol className="space-y-3">
                      {[
                        <>前往 <a href="https://create.roblox.com" target="_blank" className="text-blue-600 underline font-medium">create.roblox.com</a></>,
                        "點擊「Start Creating」",
                        "下載並安裝 Studio",
                      ].map((text, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-600">
                          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <button
                    onClick={() => saveStep(currentChapter.id)}
                    className="w-full bg-blue-500 hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Monitor className="w-5 h-5" />
                    我已安裝完成
                  </button>
                </div>
              )}

              {/* 步驟 3：下載測試檔 */}
              {activeIdx === 3 && (
                <div className="text-center max-w-lg mx-auto">
                  <p className="text-slate-600 mb-6">下載我們的環境測試專案檔案。</p>
                  <div className="bg-[#F8FAFC] border-2 border-dashed border-[#BCCCDC] p-8 rounded-2xl mb-8">
                    <Download className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                    <p className="text-lg font-mono font-bold text-slate-700 mb-4">0_EnvironmentTest.rbxl</p>
                    <a
                      href="/0_EnvironmentTest.rbxl"
                      download
                      className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95 text-white px-8 py-3.5 rounded-xl font-bold transition-all"
                    >
                      <Download className="w-5 h-5" />
                      下載檔案
                    </a>
                  </div>
                  <button
                    onClick={() => saveStep(currentChapter.id)}
                    className="text-[#9AA6B2] hover:text-slate-700 underline text-sm transition-colors"
                  >
                    已下載完成，下一步
                  </button>
                </div>
              )}

              {/* 步驟 4：Token + 測試 */}
              {activeIdx === 4 && (
                <div className="max-w-lg mx-auto space-y-6">
                  <div className="bg-[#F8FAFC] border border-[#BCCCDC] rounded-xl p-5">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Server className="w-4 h-4 text-blue-500" />
                      你的個人 Token
                    </h4>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-white border border-[#BCCCDC] p-3 rounded-lg font-mono text-sm text-slate-600 select-all break-all">
                        {student_token}
                      </code>
                      <button
                        onClick={() => { copyToClipboard(student_token || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="bg-white border border-[#BCCCDC] hover:bg-[#D9EAFD] hover:scale-105 active:scale-95 transition-all px-3.5 rounded-lg"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-[#9AA6B2]" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#D9EAFD]/30 border border-[#BCCCDC] rounded-xl p-5">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">操作步驟</h4>
                    <ol className="space-y-2.5">
                      {[
                        "在 Studio 開啟下載的檔案",
                        "將 Token 貼入 Workspace.Token.Value",
                        "確保 Security 中的 Allow HTTP Requests 已勾選",
                        "按下 Play 並完成地圖引導",
                      ].map((text, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                          {text}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <button
                    onClick={checkCompletion}
                    disabled={checking}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {checking ? "驗證中..." : "我已完成測試，檢查狀態"}
                  </button>

                  <div className="pt-4 border-t border-[#BCCCDC]/50">
                    <button
                      onClick={async () => {
                        try {
                    const res = await fetch(`/api/webhook/ping`);
                    const data = await res.json();
                    alert(data.status === "pong" ? "✅ 伺服器連線正常！" : "❌ 伺服器回應異常");
                  } catch { alert("❌ 無法連線到後端伺服器"); }
                      }}
                      className="w-full text-xs text-[#9AA6B2] hover:text-blue-500 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Server className="w-3.5 h-3.5" />
                      測試伺服器連線狀態
                    </button>
                  </div>
                </div>
              )}

              {/* 步驟 5：完成 */}
              {activeIdx === 5 && (
                <div className="text-center max-w-lg mx-auto">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">環境設定完成！</h2>
                  <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                    你已經具備了開始學習 Roblox 創作的所有條件。
                  </p>
                  <button
                    onClick={() => navigate("/topics")}
                    className="w-full bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 hover:scale-[1.02] active:scale-[0.98] text-white py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Sparkles className="w-5 h-5" />
                    前往課程列表
                  </button>
                </div>
              )}
            </div>

            {/* 底部導覽 */}
            <div className="flex items-center justify-between mt-6 gap-3">
              {activeIdx > 0 ? (
                <button
                  onClick={() => setActiveIdx(activeIdx - 1)}
                  className="flex items-center gap-1.5 text-[#9AA6B2] hover:text-slate-700 hover:bg-white px-4 py-2.5 rounded-lg transition-all text-sm border border-transparent hover:border-[#BCCCDC]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  上一步
                </button>
              ) : <div />}

              {isLastStep && completedCount === totalCount ? (
                <button
                  onClick={() => navigate("/topics")}
                  className="bg-emerald-500 hover:bg-emerald-600 hover:scale-105 active:scale-95 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2"
                >
                  <Trophy className="w-5 h-5" />
                  設定完成！返回列表
                </button>
              ) : !currentChapter.completed ? (
                <div />
              ) : activeIdx < totalCount - 1 ? (
                <button
                  onClick={() => setActiveIdx(activeIdx + 1)}
                  className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 px-4 py-2.5 rounded-lg transition-all text-sm font-medium"
                >
                  下一步
                </button>
              ) : <div />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}