import "./authPage.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiRequest from "../../utils/apiRequest";
import useAuthStore from "../../utils/authStore";
import { Alert } from "antd";
import { AnimatePresence, motion } from "framer-motion";

const fadeCard = {
  initial: { opacity: 0, y: 8, filter: "blur(2px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(2px)" },
  transition: { duration: 0.22, ease: "easeOut" },
};

const AuthPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOkMsg(""); setLoading(true);

    const form = new FormData(e.currentTarget);
    const raw = Object.fromEntries(form);

    try {
      const endpoint = isRegister ? "/user/register" : "/user/login";
      const payload = isRegister
        ? { username: raw.username?.trim(), displayName: raw.displayName?.trim(), email: raw.email?.trim(), password: raw.password }
        : { email: raw.email?.trim(), password: raw.password };

      const { data } = await apiRequest.post(endpoint, payload);
      if (!data?.ok) throw new Error(data?.msg || "Request failed");

      setAuth({ user: data.user, token: data.token });
      localStorage.setItem("pq_token", data.token);

      setOkMsg(isRegister ? "Tạo tài khoản thành công!" : "Đăng nhập thành công!");
      setTimeout(() => navigate("/"), 700);
    } catch (e) {
      setErr(e?.response?.data?.msg || e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pq-auth">
      <div className="pq-auth__card">
        <div className="pq-auth__logo">PQ</div>
        <h1 className="pq-auth__title">{isRegister ? "Create an Account" : "Login to your account"}</h1>

        {(okMsg || err) && (
          <div className="pq-auth__alert">
            {okMsg && <Alert message={okMsg} type="success" showIcon closable onClose={() => setOkMsg("")} />}
            {err && <Alert message={err} type="error" showIcon closable onClose={() => setErr("")} />}
          </div>
        )}

        <AnimatePresence mode="wait">
          {isRegister ? (
            <motion.form key="register" onSubmit={handleSubmit} className="pq-auth__form pq-auth__form--register" {...fadeCard}>
              <div className="pq-auth__group">
                <label htmlFor="username">Username</label>
                <input id="username" name="username" type="text" placeholder="Username" required />
              </div>
              <div className="pq-auth__group">
                <label htmlFor="displayName">Display Name</label>
                <input id="displayName" name="displayName" type="text" placeholder="Name" required />
              </div>
              <div className="pq-auth__group">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" placeholder="Email" required />
              </div>
              <div className="pq-auth__group">
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" placeholder="Password" required />
              </div>

              <button className="pq-auth__btn pq-auth__btn--primary" disabled={loading}>
                {loading ? "Loading..." : "Register"}
              </button>

              <p className="pq-auth__switch" onClick={() => { setIsRegister(false); setErr(""); setOkMsg(""); }}>
                Do you have an account? <b>Login</b>
              </p>
            </motion.form>
          ) : (
            <motion.form key="login" onSubmit={handleSubmit} className="pq-auth__form pq-auth__form--login" {...fadeCard}>
              <div className="pq-auth__group">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" placeholder="Email" required />
              </div>
              <div className="pq-auth__group">
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" placeholder="Password" required />
              </div>

              <button className="pq-auth__btn pq-auth__btn--primary" disabled={loading}>
                {loading ? "Loading..." : "Login"}
              </button>

              <p className="pq-auth__switch" onClick={() => { setIsRegister(true); setErr(""); setOkMsg(""); }}>
                Don&apos;t have an account? <b>Register</b>
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AuthPage;
