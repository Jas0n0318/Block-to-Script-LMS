import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, LogIn } from "lucide-react";
import api from "../api/client";
import { useAuthStore } from "../stores/authStore";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/api/auth/login", { username, password });
      setAuth(res.data.user, res.data.access_token, res.data.student_token);
      navigate(res.data.user.role === "teacher" ? "/admin/students" : "/topics");
    } catch {
      setError("登入失敗，請檢查帳號密碼");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-white border border-[#BCCCDC]/60 rounded-2xl p-8 shadow-sm space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mx-auto">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Block-to-Script LMS</h1>
            <p className="text-sm text-[#9AA6B2]">登入你的學習帳號</p>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="帳號"
            className="w-full border border-[#BCCCDC] rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder-[#9AA6B2] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密碼"
            className="w-full border border-[#BCCCDC] rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder-[#9AA6B2] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 active:scale-[0.98] text-white rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            登入
          </button>

          <p className="text-xs text-center text-[#9AA6B2]">
            還沒有帳號？<Link to="/register" className="text-blue-500 hover:text-blue-600 font-medium">註冊</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
