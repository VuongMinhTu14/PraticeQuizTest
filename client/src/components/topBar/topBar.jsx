import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TrophyOutlined } from "@ant-design/icons";
import useAuthStore from "../../utils/authStore";
import useThemeStore from "../../store/themeStore"; // để lấy mode hiện tại
import "./topBar.css";

const TopBar = () => {
  const { currentUser, logout } = useAuthStore();
  const { mode } = useThemeStore(); // light hoặc dark
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("pq_token");
    setOpen(false);
    nav("/auth");
  };

  const username = currentUser?.username || currentUser?.displayName || "User";
  const points = currentUser?.points ?? 0;

  return (
    <header className={`topbar ${mode === "dark" ? "dark" : "light"}`}>
      <div />
      <div className="actions" ref={ref}>
        {!currentUser ? (
          <Link to="/auth" className="btn btn-black">
            Sign up / Login
          </Link>
        ) : (
          <div className="userbox">
            <button
              className={`welcome-btn ${mode === "dark" ? "dark" : "light"}`}
              onClick={() => setOpen((v) => !v)}
            >
              <span>
                Welcome, <strong>{username}</strong>
              </span>
              <span
                className={`points-badge ${
                  mode === "dark" ? "dark" : "light"
                }`}
                title={`${points} points`}
              >
                <TrophyOutlined className="points-icon" />
                {points}
              </span>
            </button>

            {open && (
              <div
                className={`dropdown ${mode === "dark" ? "dark" : "light"}`}
              >
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setOpen(false);
                    nav(`/profile/${currentUser?.username || "me"}`);
                  }}
                >
                  Profile
                </button>
                <div className="divider" />
                <button className="dropdown-item danger" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
