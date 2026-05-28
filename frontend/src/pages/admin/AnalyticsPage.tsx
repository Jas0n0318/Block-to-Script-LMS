import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Activity, GraduationCap, CheckCircle, Lock, Play } from "lucide-react";
import api from "../../api/client";

interface Activity {
  action: string;
  detail: string | null;
  time: string;
}

interface Progress {
  course: string;
  status: string;
  score: number | null;
}

interface StudentStats {
  username: string;
  progress: Progress[];
  recentActivity: Activity[];
}

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  unlocked: "bg-blue-50 text-blue-600 border-blue-200",
  locked: "bg-[#D9EAFD] text-[#9AA6B2] border-[#BCCCDC]",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "已完成",
  unlocked: "進行中",
  locked: "未解鎖",
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
          <span className="font-bold text-sm text-slate-700">{stats.username} 的學習報告</span>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
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
                  <span className="text-sm text-slate-700 font-medium">{p.course}</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_BADGE[p.status] || STATUS_BADGE.locked} flex items-center gap-1.5`}>
                    {p.status === "completed" ? <CheckCircle className="w-3 h-3" /> :
                     p.status === "unlocked" ? <Play className="w-3 h-3" /> :
                     <Lock className="w-3 h-3" />}
                    {STATUS_LABEL[p.status] || "未知"}
                  </span>
                </div>
              ))}
            </div>
          </section>

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
