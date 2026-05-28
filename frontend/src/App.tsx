import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TopicListPage from "./pages/TopicListPage";
import CoursePage from "./pages/CoursePage";
import SetupPage from "./pages/SetupPage";
import StudentListPage from "./pages/admin/StudentListPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/topics"
          element={<ProtectedRoute><TopicListPage /></ProtectedRoute>}
        />
        <Route
          path="/courses/:courseId"
          element={<ProtectedRoute><CoursePage /></ProtectedRoute>}
        />
        <Route
          path="/setup"
          element={<ProtectedRoute><SetupPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/students"
          element={<ProtectedRoute><StudentListPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/students/:id"
          element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>}
        />
        <Route path="/" element={<Navigate to="/topics" replace />} />
        <Route path="*" element={<Navigate to="/topics" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
