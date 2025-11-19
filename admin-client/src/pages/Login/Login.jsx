import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { loginAdmin } from "../../api/adminApi.js";
import "./Login.css";

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [msgApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();

  const onFinish = async (values) => {
  try {
    setLoading(true);
    const user = await loginAdmin(values.email, values.password);
    msgApi.success(`Xin chào ${user.displayName || user.email}`);
    navigate("/users");
  } catch (err) {
    msgApi.error(err.message || "Đăng nhập thất bại");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="login-page">
      {contextHolder}
      <Card className="login-card">
        <Title level={3} className="login-title">
          PracticeQuiz Admin
        </Title>
        <Text type="secondary">
          Chỉ dành cho quản trị viên. Tài khoản phải có role <b>admin</b>.
        </Text>

        <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Nhập email" }]}
          >
            <Input placeholder="admin@gmail.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: "Nhập mật khẩu" }]}
          >
            <Input.Password placeholder="••••••" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            className="login-btn"
          >
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
