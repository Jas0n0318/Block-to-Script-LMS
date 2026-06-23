import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target, BookOpen, TrendingUp, Trash2, Edit3, Check,
  ArrowLeft, LogOut, BarChart3, Sparkles
} from "lucide-react";
import api from "../api/client";
import { useAuthStore } from "../stores/authStore";

interface Goal {
  id: number;
  weeklyTarget: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface TopicProgress {
  title: string;
  completed: number;
  total: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [topics, setTopics] = useState<TopicProgress[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [weeklyTarget, setWeeklyTarget] = useState(5);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);

  const fetchData = async () => {
    try {
      const [gRes, tRes] = await Promise.all([
        api.get("/api/goals"),
        api.get("/api/topics"),
      ]);
      setGoals(gRes.data || []);

      let completed = 0;
      let total = 0;
      const topicData: TopicProgress[] = [];
      for (const t of tRes.data) {
        const cRes = await api.get(`/api/topics/${t.id}/courses`);
        const courses = cRes.data.courses || [];
        const c = courses.filter((co: any) => co.status === "COMPLETED").length;
        completed += c;
        total += courses.length;
        topicData.push({ title: t.title, completed: c, total: courses.length });
      }
      setTotalCompleted(completed);
      setTotalCourses(total);
      setTopics(topicData);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    await api.post("/api/goals", { weeklyTarget, startDate, endDate });
    setShowForm(false);
    fetchData();
  };

  const handleUpdate = async () => {
    if (!editingGoal) return;
    await api.put(`/api/goals/${editingGoal.id}`, { weeklyTarget, startDate, endDate });
    setEditingGoal(null);
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    await api.delete(`/api/goals/${id}`);
    fetchData();
  };

  const openEdit = (g: Goal) => {
    setEditingGoal(g);
    setWeeklyTarget(g.weeklyTarget);
    setStartDate(g.startDate);
    setEndDate(g.endDate);
    setShowForm(true);
  };

  const pct = totalCourses > 0 ? Math.round((totalCompleted / totalCourses) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-700 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#BCCCDC] px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/topics")} className="text-[#9AA6B2] hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-[#D9EAFD]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-slate-700">學習進度</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#9AA6B2] hidden sm:block">{user?.username}</span>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-[#9AA6B2] hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50">
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">登出</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        {/* 總覽卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#BCCCDC]/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-bold text-slate-600">課程進度</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{totalCompleted}<span className="text-sm text-[#9AA6B2] font-normal"> / {totalCourses}</span></div>
            <div className="mt-2 h-2 bg-[#D9EAFD] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="bg-white border border-[#BCCCDC]/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-slate-600">學習目標</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{goals.length ? 1 : 0}<span className="text-sm text-[#9AA6B2] font-normal"> 個目標</span></div>
            {goals.length > 0 && (
              <p className="text-xs text-[#9AA6B2] mt-1">每週目標：{goals[0].weeklyTarget} 章</p>
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
              {goals.length > 0 ? Math.min(100, Math.round((totalCompleted / (goals[0].weeklyTarget || 1)) * 100)) : 0}%
            </div>
            {goals.length > 0 && goals[0].weeklyTarget > 0 && (
              <p className="text-xs text-[#9AA6B2] mt-1">{totalCompleted} / {goals[0].weeklyTarget} 章</p>
            )}
          </div>
        </div>

        {/* 學習目標（單一目標模式） */}
        <div className="bg-white border border-[#BCCCDC]/60 rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-[#BCCCDC]/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              <h2 className="font-bold text-slate-700">學習目標設定</h2>
            </div>
            {goals.length > 0 && !showForm && (
              <button onClick={() => { openEdit(goals[0]); }} className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 font-medium">
                <Edit3 className="w-4 h-4" />編輯目標
              </button>
            )}
          </div>

          <div className="p-6">
            {showForm ? (
              <div className="bg-[#F8FAFC] border border-[#BCCCDC] rounded-lg p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">每週目標（章節數）</label>
                    <input type="number" min={1} value={weeklyTarget} onChange={(e) => setWeeklyTarget(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full border border-[#BCCCDC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">開始日期</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-[#BCCCDC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">結束日期</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-[#BCCCDC] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={editingGoal ? handleUpdate : handleCreate}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-5 py-2 rounded-lg transition-all">
                    {editingGoal ? "更新目標" : "建立目標"}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditingGoal(null); }}
                    className="text-sm text-[#9AA6B2] hover:text-slate-700 px-3 py-2">取消</button>
                </div>
              </div>
            ) : goals.length > 0 ? (
              <div className="bg-[#F8FAFC] border border-[#D9EAFD] rounded-lg px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">每週完成 {goals[0].weeklyTarget} 個章節</p>
                      <p className="text-xs text-[#9AA6B2] mt-0.5">{goals[0].startDate} ~ {goals[0].endDate}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(goals[0].id)}
                    className="text-red-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-[#9AA6B2] mb-4">尚未設定學習目標，開始規劃你的學習節奏</p>
                <button onClick={() => { setEditingGoal(null); setWeeklyTarget(5); setShowForm(true); }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-all">
                  設定學習目標
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 各主題進度 */}
        <div className="bg-white border border-[#BCCCDC]/60 rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-[#BCCCDC]/40">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />各主題進度
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {topics.map((t, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600 font-medium">{t.title}</span>
                  <span className="text-[#9AA6B2]">{t.completed}/{t.total}</span>
                </div>
                <div className="h-2 bg-[#D9EAFD] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all" style={{ width: `${t.total > 0 ? (t.completed / t.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pb-6">
          <div className="inline-flex items-center gap-2 text-xs text-[#9AA6B2] bg-white border border-[#BCCCDC]/60 rounded-full px-4 py-2 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>設定學習目標，保持穩定的學習節奏</span>
          </div>
        </div>
      </main>
    </div>
  );
}
