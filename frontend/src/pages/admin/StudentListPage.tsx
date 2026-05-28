import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, Users, Eye, BarChart3, Trash2, KeyRound, Unlock } from "lucide-react";
import api from "../../api/client";
import { useAuthStore } from "../../stores/authStore";

interface Student {
  id: number;
  username: string;
  totalCourses: number;
  completedCourses: number;
  totalErrors: number;
  aiQueries: number;
}

export default function StudentListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const loadStudents = () => {
    api.get("/api/admin/students").then((res) => setStudents(res.data));
  };

  useEffect(() => {
    if (user?.role !== "teacher") {
      navigate("/topics");
      return;
    }
    loadStudents();
  }, []);

  const handleUnlockAll = async (id: number, username: string) => {
    if (!window.confirm(`確定解鎖「${username}」的全部課程？該學生將可預覽所有課程內容。`)) return;
    try {
      await api.post(`/api/admin/students/${id}/unlock-all`);
      alert("已解鎖全部課程");
      loadStudents();
    } catch {
      alert("解鎖失敗");
    }
  };

  const handleDelete = async (id: number, username: string) => {
    if (!window.confirm(`確定刪除學生「${username}」？此操作無法復原。`)) return;
    try {
      await api.delete(`/api/admin/students/${id}`);
      loadStudents();
    } catch {
      alert("刪除失敗");
    }
  };

  const handleResetPassword = async (id: number, username: string) => {
    const newPassword = window.prompt(`請輸入「${username}」的新密碼：`);
    if (!newPassword || newPassword.length < 3) {
      alert("密碼至少 3 個字元");
      return;
    }
    try {
      await api.post(`/api/admin/students/${id}/reset-password`, { newPassword });
      alert("密碼已重設成功");
    } catch {
      alert("重設失敗");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-700 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#BCCCDC] px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-slate-700">教師儀表板</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#9AA6B2] hidden sm:block">{user?.username}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-[#9AA6B2] hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">登出</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">學生學習進度總覽</h1>
          </div>

          <div className="bg-white border border-[#BCCCDC]/60 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#D9EAFD]/50 border-b border-[#BCCCDC]">
                    <th className="text-left px-4 py-3 font-bold text-slate-700">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#9AA6B2]" />
                        姓名
                      </div>
                    </th>
                    <th className="text-center px-4 py-3 font-bold text-slate-700">完成章節</th>
                    <th className="text-center px-4 py-3 font-bold text-slate-700">積木錯誤</th>
                    <th className="text-center px-4 py-3 font-bold text-slate-700">AI 提問</th>
                    <th className="text-center px-4 py-3 font-bold text-slate-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-[#9AA6B2]">尚無學生資料</td>
                    </tr>
                  )}
                  {students.map((s, i) => (
                    <tr key={s.id} className={`border-b border-[#BCCCDC]/40 hover:bg-[#F8FAFC] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]/50"}`}>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{s.username}</td>
                      <td className="text-center px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className="font-bold text-slate-700">{s.completedCourses}</span>
                          <span className="text-[#9AA6B2]">/ {s.totalCourses}</span>
                        </span>
                      </td>
                      <td className="text-center px-4 py-3.5">
                        <span className={`text-sm font-medium ${s.totalErrors > 0 ? "text-red-500" : "text-emerald-500"}`}>
                          {s.totalErrors}
                        </span>
                      </td>
                      <td className="text-center px-4 py-3.5">
                        <span className="text-sm text-blue-600 font-medium">{s.aiQueries}</span>
                      </td>
                      <td className="text-center px-4 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/admin/students/${s.id}`)}
                            className="inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-600 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            詳情
                          </button>
                          <button
                            onClick={() => handleUnlockAll(s.id, s.username)}
                            className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            解鎖全部
                          </button>
                          <button
                            onClick={() => handleResetPassword(s.id, s.username)}
                            className="inline-flex items-center gap-1.5 text-amber-600 hover:text-amber-700 text-xs font-bold bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            重設密碼
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.username)}
                            className="inline-flex items-center gap-1.5 text-red-500 hover:text-red-600 text-xs font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
