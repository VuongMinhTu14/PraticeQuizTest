import { Layout, Button } from "antd";
import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { getMe, logoutAdmin } from "../api/adminApi";
import "./AdminLayout.css";

const { Sider, Header, Content } = Layout;

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();
  const me = getMe();

  const handleLogout = () => {
    logoutAdmin();
    navigate("/login", { replace: true });
  };

  return (
    <Layout className="admin-root">
      <Sider width={220} className="admin-sider">
        <div className="brand">PracticeQuiz Manager</div>

        <nav className="nav">
          <Link
            to="/dashboard"
            className={`nav-item ${path.startsWith("/dashboard") ? "active" : ""}`}
          >
            <DashboardOutlined /> <span>Dashboard</span>
          </Link>

          <Link
            to="/users"
            className={`nav-item ${path.startsWith("/users") ? "active" : ""}`}
          >
            <UserOutlined /> <span>Người dùng</span>
          </Link>

          <Link
            to="/toeic-sets"
            className={`nav-item ${path.startsWith("/toeic-sets") ? "active" : ""}`}
          >
            <FileTextOutlined /> <span>Đề TOEIC</span>
          </Link>

          <Link
            to="/toeic-questions"
            className={`nav-item ${path.startsWith("/toeic-questions") ? "active" : ""}`}
          >
            <FileSearchOutlined /> <span>Câu hỏi</span>
          </Link>

          <Link
            to="/toeic-writing-sets"
            className={`nav-item ${path.startsWith("/toeic-writing-sets") ? "active" : ""}`}
          >
            <EditOutlined /> <span>Đề TOEIC Writing</span>
          </Link>

          <Link
            to="/toeic-writing-questions"
            className={`nav-item ${
              path.startsWith("/toeic-writing-questions") ? "active" : ""
            }`}
          >
            <EditOutlined /> <span>Câu hỏi Writing</span>
          </Link>
        </nav>
      </Sider>

      <Layout>
        <Header className="admin-header">
          <div className="admin-header-right">
            <span className="admin-user-label">{me?.email || "Admin"}</span>
            <Button size="small" className="admin-logout-btn" onClick={handleLogout}>
              Đăng xuất
            </Button>
          </div>
        </Header>

        <Content className="admin-content">{children || <Outlet />}</Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
