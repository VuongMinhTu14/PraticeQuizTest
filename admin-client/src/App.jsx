import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ConfigProvider, Spin } from "antd";
import Login from "./pages/Login/Login";
import AdminLayout from "./layouts/AdminLayout";
import UsersAdmin from "./pages/usersAdmin/UsersAdmin";
import ToeicSetAdmin from "./pages/toeicSetAdmin/ToeicSetAdmin";
import ToeicQuestionsAdmin from "./pages/toeicQuestionsAdmin/ToeicQuestionsAdmin";
import "./App.css";
import { getMe } from "./api/adminApi.js";

const RequireAuth = ({ children }) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const user = getMe();
    if (!user || user.role !== "admin") {
      navigate("/login");
    } else {
      setOk(true);
    }
    setChecking(false);
  }, [navigate]);

  if (checking) {
    return (
      <div className="center-loading">
        <Spin />
      </div>
    );
  }

  if (!ok) return null;
  return children;
};

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#2563eb"
        }
      }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/users" replace />} />
                  <Route path="/users" element={<UsersAdmin />} />
                  <Route path="/toeic-sets" element={<ToeicSetAdmin />} />
                  <Route path="/toeic-questions" element={<ToeicQuestionsAdmin />} />
                </Routes>
              </AdminLayout>
            </RequireAuth>
          }
        />
      </Routes>
    </ConfigProvider>
  );
}

export default App;
