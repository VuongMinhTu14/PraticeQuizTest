import { useMemo } from "react";
import { Layout, ConfigProvider, theme } from "antd";
import { motion } from "framer-motion";
import useThemeStore from "./store/themeStore";
import LeftBar from "./components/leftBar/leftBar";
import TopBar from "./components/topBar/topBar";
import "./app.css";

const { Content } = Layout;

const App = ({ children }) => {
  const { mode } = useThemeStore();

  // AntD theme theo mode (dark cho Game)
  const antTheme = useMemo(() => {
    const isDark = mode === "dark";
    return {
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: isDark
        ? {
            colorPrimary: "#1677ff",
            colorBgLayout: "#0b1220",
            colorBgContainer: "#0f172a",
            colorText: "#e5e7eb",
            borderRadius: 10,
          }
        : {
            colorPrimary: "#1677ff",
            colorBgLayout: "#f5f8ff", // xanh rất nhạt để tập trung
            colorBgContainer: "#ffffff",
            borderRadius: 10,
          },
    };
  }, [mode]);

  const bgColor = mode === "dark" ? "#0b1220" : "#f5f8ff";

  return (
    <ConfigProvider theme={antTheme}>
      <Layout className="app-layout">
        <LeftBar />
        <Layout className="app-right">
          <TopBar />
          {/* NỀN có animation khi đổi theme */}
          <motion.div
            animate={{ backgroundColor: bgColor }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="app-bg"
          >
            <Content className="app-content">{children}</Content>
          </motion.div>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
