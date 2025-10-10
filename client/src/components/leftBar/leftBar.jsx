import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Typography, Button, Tooltip } from "antd";
import {
  HomeOutlined,
  ReadOutlined,
  RocketOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
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

  // ✅ Đồng bộ theme lên body để topbar & toàn site đổi glass đúng màu
  useEffect(() => {
    document.body.dataset.theme = mode;
  }, [mode]);

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith("/practice")) return "practice";
    if (location.pathname.startsWith("/game")) return "game";
    return "dashboard";
  }, [location.pathname]);

  const onMenuClick = ({ key }) => {
    if (key === "dashboard") {
      setMode("light");
      nav("/");
    } else if (key === "practice") {
      setMode("light");
      nav("/practice");
    } else if (key === "game") {
      setMode("dark");
      nav("/game");
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
      {/* Logo / Brand */}
      <div className="leftbar-brand">
        <Tooltip title="PracticeQuiz" open={collapsed ? undefined : false} placement="right">
          <Text strong className={`leftbar-logo ${mode}`}>
            {collapsed ? "PQ" : "PracticeQuiz"}
          </Text>
        </Tooltip>
      </div>

      {/* Menu */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        onClick={onMenuClick}
        className="leftbar-menu"
        items={[
          { key: "dashboard", icon: <HomeOutlined />, label: "Dashboard" },
          { key: "practice", icon: <ReadOutlined />, label: "Practice" },
          { key: "game", icon: <RocketOutlined />, label: "Game" },
        ]}
      />

      {/* Trigger thu/phóng */}
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
