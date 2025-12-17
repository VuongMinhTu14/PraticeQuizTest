import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Typography, Button, Tooltip } from "antd";
import {
  HomeOutlined,
  ReadOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import useThemeStore from "../../store/themeStore";
import "./leftBar.css";

const { Sider } = Layout;
const { Text } = Typography;

const LeftBar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const nav = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useThemeStore();

  useEffect(() => {
    document.body.dataset.theme = mode;
  }, [mode]);

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith("/practice/prediction")) return "practice-prediction";
    if (location.pathname.startsWith("/practice/writing")) return "practice-writing";
    if (location.pathname.startsWith("/practice/coach")) return "coach";
    if (location.pathname.startsWith("/practice")) return "practice-mcq";
    return "dashboard";
  }, [location.pathname]);

  const onMenuClick = ({ key }) => {
    if (key === "dashboard") {
      setMode("light");
      nav("/");
    } else if (key === "practice-mcq") {
      setMode("light");
      nav("/practice");
    } else if (key === "coach") {
      setMode("light");
      nav("/practice/coach");
    } else if (key === "practice-writing") {
      setMode("light");
      nav("/practice/writing");
    } else if (key === "practice-prediction") {
      setMode("light");
      nav("/practice/prediction");
    }
  };

  return (
    <Sider
      theme={mode === "dark" ? "dark" : "light"}
      collapsed={collapsed}
      collapsedWidth={72}
      width={240}
      trigger={null}
      breakpoint="lg"
      className={`leftbar-sider ${mode}`}
      style={{
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div className="leftbar-brand">
        <Tooltip title="PracticeQuiz" open={collapsed ? undefined : false} placement="right">
          <Text strong className={`leftbar-logo ${mode}`}>
            {collapsed ? "PQ" : "PracticeQuiz"}
          </Text>
        </Tooltip>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        onClick={onMenuClick}
        className="leftbar-menu"
        items={[
          { key: "dashboard", icon: <HomeOutlined />, label: "Dashboard" },
          { key: "coach", icon: <ThunderboltOutlined />, label: "Coach & Luyện nhanh" },
          {
            key: "practice-group",
            icon: <ReadOutlined />,
            label: "Practice",
            children: [
              { key: "practice-mcq", label: "Trắc nghiệm TOEIC" },
              { key: "practice-writing", label: "Practice Writing" },
              { key: "practice-prediction", label: "Dự đoán điểm" },
            ],
          },
        ]}
      />

      <div className="leftbar-trigger">
        <Button
          type="primary"
          shape="circle"
          size="large"
          className={`trigger-btn ${mode}`}
          onClick={() => setCollapsed((v) => !v)}
          icon={collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
        />
      </div>
    </Sider>
  );
};

export default LeftBar;
