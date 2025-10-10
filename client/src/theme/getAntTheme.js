import { theme } from "antd";
export default function getAntTheme(pathname) {
  const isDark = pathname.startsWith("/game");
  if (isDark) {
    return {
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: "#1677ff",
        borderRadius: 10,
        colorBgLayout: "#0b1220",
        colorBgContainer: "#0f172a",
        colorText: "#e5e7eb"
      },
    };
  }
  return {
    algorithm: theme.defaultAlgorithm,
    token: {
      colorPrimary: "#1677ff",
      borderRadius: 10,
      colorBgLayout: "#f5f8ff",  // trắng – xanh nhạt
      colorBgContainer: "#ffffff"
    },
  };
}
