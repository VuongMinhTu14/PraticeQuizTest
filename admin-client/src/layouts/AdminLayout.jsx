import { Layout } from "antd";
import { Outlet, useLocation, Link } from "react-router-dom";
import { UserOutlined, FileTextOutlined, FileSearchOutlined } from "@ant-design/icons";
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
        </nav>
      </Sider>
      <Layout>
        <Header className="admin-header">
          <div className="admin-header-right">Admin Panel</div>
        </Header>
        <Content className="admin-content">
          {/* children chứa Routes con */}
          {children || <Outlet />}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
