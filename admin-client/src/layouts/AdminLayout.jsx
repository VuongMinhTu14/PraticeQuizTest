import { Layout } from "antd";
import { Outlet, useLocation, Link } from "react-router-dom";
import {
  UserOutlined,
  FileTextOutlined,
  FileSearchOutlined,
  EditOutlined,
} from "@ant-design/icons";
import "./AdminLayout.css";

const { Sider, Header, Content } = Layout;

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <Layout className="admin-root">
      <Sider width={220} className="admin-sider">
        <div className="brand">PracticeQuiz Manager</div>

        <nav className="nav">
          {/* Người dùng */}
          <Link
            to="/users"
            className={`nav-item ${path.startsWith("/users") ? "active" : ""}`}
          >
            <UserOutlined /> <span>Người dùng</span>
          </Link>

          {/* Đề TOEIC (multiple-choice) */}
          <Link
            to="/toeic-sets"
            className={`nav-item ${
              path.startsWith("/toeic-sets") ? "active" : ""
            }`}
          >
            <FileTextOutlined /> <span>Đề TOEIC</span>
          </Link>

          {/* Câu hỏi (multiple-choice) */}
          <Link
            to="/toeic-questions"
            className={`nav-item ${
              path.startsWith("/toeic-questions") ? "active" : ""
            }`}
          >
            <FileSearchOutlined /> <span>Câu hỏi</span>
          </Link>

          {/* Đề Writing */}
          <Link
            to="/toeic-writing-sets"
            className={`nav-item ${
              path.startsWith("/toeic-writing-sets") ? "active" : ""
            }`}
          >
            <EditOutlined /> <span>Đề TOEIC Writing</span>
          </Link>

          {/* Câu hỏi Writing */}
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
          <div className="admin-header-right">Admin Panel</div>
        </Header>

        <Content className="admin-content">
          {children || <Outlet />}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
