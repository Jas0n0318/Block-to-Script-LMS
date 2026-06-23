import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Activity, GraduationCap, CheckCircle, Lock, Play,
  Target, TrendingUp, FileText, MessageSquare
} from "lucide-react";
import api from "../../api/client";

interface Progress {
  course: string;
  status: string;
  chaptersCompleted: number;
  chaptersTotal: number;
}

interface Activity {
  action: string;
  detail: string | null;
  time: string;
}

interface NoteData {
  id: number;
  chapterId: number;
  content: string;
  createdAt: string;
}

interface FeedbackData {
  id: number;
  chapterId: number;
  rating: number;
  difficulty: number;
  comment: string | null;
  createdAt: string;
}

interface GoalData {
  id: number;
  weeklyTarget: number;
  startDate: string;
  endDate: string;
}

interface StudentStats {
  username: string;
  progress: Progress[];
  totalChaptersCompleted: number;
  totalChapters: number;
  notes: NoteData[];
  feedback: FeedbackData[];
  goals: GoalData[];
  recentActivity: Activity[];
}

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  UNLOCKED: "bg-blue-50 text-blue-600 border-blue-200",
  LOCKED: "bg-[#D9EAFD] text-[#9AA6B2] border-[#BCCCDC]",
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "已完成",
  UNLOCKED: "進行中",
  LOCKED: "未解鎖",
};

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentStats | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/admin/students/${id}/stats`).then((res) => setStats(res.data));
  }, [id]);

  if (!stats) return null;

  const totalPct = stats.totalChapters > 0
    ? Math.round((stats.totalChaptersCompleted / stats.totalChapters) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-700 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#BCCCDC] px-4 sm:px-6 h-14 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate("/admin/students")}
          className="text-[#9AA6B2] hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-[#D9EAFD]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-slate-700">{stats.username} 的學習進度</span>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          {/* 總覽卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#BCCCDC]/60 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-bold text-slate-600">學習進度</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {stats.totalChaptersCompleted}
                <span className="text-sm text-[#9AA6B2] font-normal"> / {stats.totalChapters} 章節</span>
              </div>
              <div className="mt-2 h-2 bg-[#D9EAFD] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all" style={{ width: `${totalPct}%` }} />
              </div>
            </div>

            <div className="bg-white border border-[#BCCCDC]/60 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm font-bold text-slate-600">學習目標</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {stats.goals.length}
                <span className="text-sm text-[#9AA6B2] font-normal"> 個目標</span>
              </div>
              {stats.goals.length > 0 && (
                <p className="text-xs text-[#9AA6B2] mt-1">每週目標：{stats.goals[0].weeklyTarget} 章</p>
              )}
            </div>

            <div className="bg-white border border-[#BCCCDC]/60 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm font-bold text-slate-600">目標達成率</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {stats.goals.length > 0
                  ? Math.min(100, Math.round((stats.totalChaptersCompleted / (stats.goals[0].weeklyTarget || 1)) * 100))
                  : 0}%
              </div>
              {stats.goals.length > 0 && stats.goals[0].weeklyTarget > 0 && (
                <p className="text-xs text-[#9AA6B2] mt-1">{stats.totalChaptersCompleted} / {stats.goals[0].weeklyTarget} 章</p>
              )}
            </div>
          </div>

          {/* 課程進度 */}
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">課程進度</h2>
            </div>
            <div className="bg-white border border-[#BCCCDC]/60 rounded-xl shadow-sm divide-y divide-[#BCCCDC]/40">
              {stats.progress.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-700 font-medium">{p.course}</span>
                    <span className="text-xs text-[#9AA6B2] ml-2">章節 {p.chaptersCompleted}/{p.chaptersTotal}</span>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_BADGE[p.status] || STATUS_BADGE.LOCKED} flex items-center gap-1.5 shrink-0`}>
                    {p.status === "COMPLETED" ? <CheckCircle className="w-3 h-3" /> :
                     p.status === "UNLOCKED" ? <Play className="w-3 h-3" /> :
                     <Lock className="w-3 h-3" />}
                    {STATUS_LABEL[p.status] || "未知"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 回饋資料 */}
          {stats.feedback.length > 0 && (
            <section>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">章節回饋</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.feedback.map((f) => (
                  <div key={f.id} className="bg-white border border-[#BCCCDC]/60 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-amber-500">
                        {'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}
                      </span>
                      <span className="text-xs text-[#9AA6B2]">難度 {f.difficulty}/5</span>
                    </div>
                    {f.comment && (
                      <p className="text-sm text-slate-600 bg-amber-50 rounded-lg p-2.5">{f.comment}</p>
                    )}
                    <p className="text-xs text-[#9AA6B2] mt-2">章節 #{f.chapterId}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 學習筆記 */}
          {stats.notes.length > 0 && (
            <section>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">學習筆記</h2>
              </div>
              <div className="bg-white border border-[#BCCCDC]/60 rounded-xl shadow-sm divide-y divide-[#BCCCDC]/40">
                {stats.notes.map((n) => (
                  <div key={n.id} className="px-5 py-3.5">
                    <p className="text-sm text-slate-600">{n.content}</p>
                    <p className="text-xs text-[#9AA6B2] mt-1">章節 #{n.chapterId}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 近期活動 */}
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">近期活動</h2>
            </div>
            {stats.recentActivity.length === 0 ? (
              <div className="bg-white border border-[#BCCCDC]/60 rounded-xl p-8 text-center">
                <Activity className="w-10 h-10 text-[#BCCCDC] mx-auto mb-2" />
                <p className="text-sm text-[#9AA6B2]">尚無活動記錄</p>
              </div>
            ) : (
              <div className="bg-white border border-[#BCCCDC]/60 rounded-xl shadow-sm divide-y divide-[#BCCCDC]/40">
                {stats.recentActivity.map((a, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <span className="text-[#9AA6B2] w-32 shrink-0 text-xs">{new Date(a.time).toLocaleString()}</span>
                    <span className="text-blue-600 w-28 shrink-0 font-medium">{a.action}</span>
                    <span className="text-slate-500 truncate">{a.detail || ""}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
