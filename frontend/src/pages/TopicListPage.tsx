import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Lock, Unlock, CheckCircle,
  Code, Gamepad2, LogOut, Copy, Check, GraduationCap,
  LayoutDashboard, ArrowRight, Sparkles
} from "lucide-react";
import api from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { copyToClipboard } from "../utils/clipboard";

interface Course {
  id: number;
  title: string;
  orderIndex: number;
  status: string;
}

interface Topic {
  id: number;
  title: string;
  description: string;
  orderIndex: number;
  courses: Course[];
}

const TOPIC_ACCENTS = [
  { icon: Gamepad2, bg: "bg-emerald-100", text: "text-emerald-600", bar: "from-emerald-500 to-emerald-400" },
  { icon: LayoutDashboard, bg: "bg-blue-100", text: "text-blue-600", bar: "from-blue-500 to-blue-400" },
  { icon: Code, bg: "bg-violet-100", text: "text-violet-600", bar: "from-violet-500 to-violet-400" },
];

export default function TopicListPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const navigate = useNavigate();
  const { user, student_token, logout } = useAuthStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get("/api/topics").then((res) => {
      const data: Topic[] = res.data;
      Promise.all(
        data.map((t) =>
          api.get(`/api/topics/${t.id}/courses`).then((r) => ({
            ...t,
            courses: r.data.courses,
          }))
        )
      ).then(setTopics);
    });
  }, []);

  const completedCount = (courses: Course[]) =>
    courses.filter((c) => c.status === "COMPLETED").length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800">
      {/* 頂部 */}
      <header className="border-b border-[#BCCCDC] bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm sm:text-base text-slate-700">
              Block-to-Script LMS
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {student_token && (
              <div className="hidden sm:flex items-center gap-2 bg-[#D9EAFD] border border-[#BCCCDC] rounded-lg px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <code className="text-xs text-[#9AA6B2] font-mono">{student_token.slice(0, 8)}...</code>
                <button
                  onClick={() => {
                    copyToClipboard(student_token);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-[#9AA6B2] hover:text-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
            <span className="text-sm text-[#9AA6B2] hidden sm:block">{user?.username}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-[#9AA6B2] hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">登出</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* 歡迎區 */}
          <div className="text-center mb-12 sm:mb-18">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-slate-800">
              你的學習旅程
            </h1>
            <p className="text-[#9AA6B2] text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              完成每個課程的挑戰，從 Roblox Studio 新手成為遊戲開發大師
            </p>
          </div>

          {topics.length === 0 && (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-[#BCCCDC] mx-auto mb-4" />
              <p className="text-[#9AA6B2]">目前尚無主題，請聯繫教師</p>
            </div>
          )}

          {/* 主題卡片流 */}
          <div>
            {topics.map((topic, tIdx) => {
              const completed = completedCount(topic.courses);
              const total = topic.courses.length;
              const pct = Math.round((completed / (total || 1)) * 100);
              const accent = TOPIC_ACCENTS[tIdx % TOPIC_ACCENTS.length];
              const AccentIcon = accent.icon;
              const isLast = tIdx === topics.length - 1;

              return (
                <div
                  key={topic.id}
                  className="bg-white rounded-2xl border border-[#BCCCDC]/60 shadow-sm hover:shadow-md transition-shadow"
                  style={isLast ? {} : { marginBottom: "64px" }}
                >
                  <div className="p-6 sm:p-8">
                    {/* 頭部 */}
                    <div className="flex items-start gap-3 sm:gap-4 mb-5">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${accent.bg} ${accent.text}`}>
                        <AccentIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{topic.title}</h2>
                        <p className="text-sm text-[#9AA6B2] mt-0.5 leading-relaxed">{topic.description}</p>
                      </div>
                    </div>

                    {/* 進度條 */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-[#9AA6B2]">學習進度</span>
                        <span className="text-slate-600 font-mono font-semibold">{completed}/{total} 課程</span>
                      </div>
                      <div className="h-2 bg-[#D9EAFD] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${accent.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* 課程列表 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {topic.courses.map((c) => {
                        const isCompleted = c.status === "COMPLETED";
                        const isUnlocked = c.status === "UNLOCKED";
                        const isLocked = c.status === "LOCKED";

                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              if (!isLocked) {
                                if (topic.orderIndex === 0) navigate("/setup");
                                else navigate(`/courses/${c.id}`);
                              }
                            }}
                            disabled={isLocked}
                            className={`relative flex items-center gap-3.5 px-5 py-4 rounded-xl text-left transition-all ${
                              isCompleted
                                ? "bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                                : isUnlocked
                                ? "bg-[#D9EAFD] border border-[#BCCCDC] text-slate-700 hover:bg-[#cde0f5]"
                                : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#9AA6B2] cursor-not-allowed"
                            }`}
                          >
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isCompleted ? "bg-emerald-100" :
                              isUnlocked ? "bg-white/60" :
                              "bg-slate-100"
                            }`}>
                              {isCompleted ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                               isUnlocked ? <Unlock className="w-4 h-4 text-blue-500" /> :
                               <Lock className="w-3.5 h-3.5 text-[#BCCCDC]" />}
                            </span>

                            <div className="flex-1 min-w-0">
                              <div className={`text-xs font-mono mb-0.5 ${
                                isCompleted ? "text-emerald-400" :
                                isUnlocked ? "text-[#9AA6B2]" :
                                "text-[#BCCCDC]"
                              }`}>
                                課程 {c.orderIndex}
                              </div>
                              <div className={`text-sm font-medium truncate ${
                                isCompleted ? "text-emerald-700" :
                                isUnlocked ? "text-slate-700" :
                                "text-[#BCCCDC]"
                              }`}>
                                {c.title}
                              </div>
                            </div>

                            {!isLocked && (
                              <ArrowRight className={`w-4 h-4 shrink-0 ${
                                isCompleted ? "text-emerald-400" : "text-[#9AA6B2]"
                              }`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 結尾提示 */}
          <div className="mt-12 sm:mt-16 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-[#9AA6B2] bg-white border border-[#BCCCDC]/60 rounded-full px-4 py-2 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>完成所有課程挑戰，解鎖更多主題</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
