import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, UserPlus } from "lucide-react";
import api from "../api/client";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/auth/register", { username, password });
      navigate("/login");
    } catch {
      setError("註冊失敗，可能帳號已存在");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-white border border-[#BCCCDC]/60 rounded-2xl p-8 shadow-sm space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center mx-auto">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">註冊新帳號</h1>
            <p className="text-sm text-[#9AA6B2]">建立你的學習帳號，開始創作之旅</p>
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
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            註冊
          </button>

          <p className="text-xs text-center text-[#9AA6B2]">
            已有帳號？<Link to="/login" className="text-blue-500 hover:text-blue-600 font-medium">登入</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
