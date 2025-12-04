import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  Form,
  Input,
  Upload,
  message,
  Space,
  Typography,
  Tabs,
  Table,
} from "antd";
import {
  UploadOutlined,
  UserOutlined,
  LockOutlined,
} from "@ant-design/icons";
import useAuthStore from "../../utils/authStore";
import "./profilePage.css";
import {
  updateProfile,
  uploadAvatar,
  changePassword,
} from "../../utils/userApi";
import {
  getMyToeicRecentAttempts,
  getMyWritingRecentAttempts,
} from "../../utils/toeicApi";

const { Title, Text } = Typography;
const API_BASE =
  import.meta.env.VITE_API_ENDPOINT || "http://localhost:11111";

/* ========== BẢNG KẾT QUẢ TOEIC (TRẮC NGHIỆM) ========== */

const ToeicRecentTable = () => {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // lấy trong 365 ngày cho nhiều dữ liệu
        const data = await getMyToeicRecentAttempts(365);
        setItems(data || []);
      } catch (err) {
        console.error(err);
        message.error("Không tải được lịch sử TOEIC");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    {
      title: "Ngày làm bài",
      key: "date",
      render: (_, record) =>
        record.createdAtText ||
        record.dateText ||
        record.createdAtFormatted ||
        record.createdAt,
    },
    {
      title: "Đề",
      dataIndex: "setId",
      key: "setId",
    },
    {
      title: "Kiểu làm",
      key: "mode",
      render: (record) => record.modeText || record.mode || "Theo part",
    },
    {
      title: "",
      key: "action",
      render: (record) => {
        const attemptId = record.attemptId || record._id || record.id;
        return (
          <Button
            type="link"
            onClick={() =>
              nav(`/attempt/${attemptId}/review`)
            }
          >
            Xem chi tiết
          </Button>
        );
      },
    },
  ];

  return (
    <Card title="Chi tiết bài làm TOEIC" className="profile-card-full">
      <Table
        rowKey={(r, idx) => r.attemptId || r._id || r.id || idx}
        loading={loading}
        dataSource={items}
        columns={columns}
        pagination={{
          current: page,
          pageSize,
          total: items.length,
          onChange: (p) => setPage(p),
        }}
      />
    </Card>
  );
};

/* ========== BẢNG KẾT QUẢ TOEIC WRITING ========== */

const WritingRecentTable = () => {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getMyWritingRecentAttempts(365);
        setItems(data || []);
      } catch (err) {
        console.error(err);
        message.error("Không tải được lịch sử TOEIC Writing");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    {
      title: "Ngày làm bài",
      key: "date",
      render: (_, record) =>
        record.createdAtText ||
        record.dateText ||
        record.createdAtFormatted ||
        record.createdAt,
    },
    {
      title: "Đề",
      dataIndex: "setId",
      key: "setId",
    },
    {
      title: "Overall (0–5)",
      key: "overall",
      render: (record) =>
        record.overallScore ?? record.overall ?? record.overallPoint,
    },
    {
      title: "",
      key: "action",
      render: (record) => {
        const attemptId = record.attemptId || record._id || record.id;
        return (
          <Button
            type="link"
            onClick={() =>
              nav(`/attempt-writing/${attemptId}/review`)
            }
          >
            Xem chi tiết
          </Button>
        );
      },
    },
  ];

  return (
    <Card
      title="Chi tiết bài TOEIC Writing"
      className="profile-card-full"
    >
      <Table
        rowKey={(r, idx) => r.attemptId || r._id || r.id || idx}
        loading={loading}
        dataSource={items}
        columns={columns}
        pagination={{
          current: page,
          pageSize,
          total: items.length,
          onChange: (p) => setPage(p),
        }}
      />
    </Card>
  );
};

/* ========== TRANG PROFILE CHÍNH ========== */

const ProfilePage = () => {
  const { currentUser, setCurrentUser } = useAuthStore();
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      message.warning("Bạn cần đăng nhập để xem hồ sơ cá nhân");
      nav("/auth");
    }
  }, [currentUser, nav]);

  if (!currentUser) return null;

  // ----- SỬA USERNAME -----
  const handleUpdateUsername = async (values) => {
    try {
      setLoadingUsername(true);
      await updateProfile({ username: values.username });
      message.success("Cập nhật username thành công");

      setCurrentUser({
        ...currentUser,
        username: values.username,
      });
    } catch (err) {
      console.error(err);
      message.error(
        err?.response?.data?.msg || "Cập nhật username thất bại"
      );
    } finally {
      setLoadingUsername(false);
    }
  };

  // ----- ĐỔI AVATAR -----
  const handleUploadAvatar = async ({ file }) => {
    try {
      setLoadingAvatar(true);
      const res = await uploadAvatar(file);

      const raw = res.data?.data?.profileImage || res.data?.profileImage;
      const profileImage = raw?.startsWith("http")
        ? raw
        : `${API_BASE}${raw}`;

      message.success("Đổi ảnh đại diện thành công");
      setCurrentUser({ ...currentUser, profileImage });
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.msg || "Đổi ảnh thất bại");
    } finally {
      setLoadingAvatar(false);
    }
  };

  // ----- ĐỔI MẬT KHẨU -----
  const handleChangePassword = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.warning("Mật khẩu mới và xác nhận không khớp");
      return;
    }
    try {
      setLoadingPassword(true);
      await changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success("Đổi mật khẩu thành công");
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.msg || "Đổi mật khẩu thất bại");
    } finally {
      setLoadingPassword(false);
    }
  };

  const displayName = currentUser.displayName || currentUser.username || "User";

  const infoTab = (
    <div className="profile-content">
      {/* Sửa username */}
      <Card title="Sửa username" className="profile-card">
        <Form
          layout="vertical"
          initialValues={{ username: currentUser.username }}
          onFinish={handleUpdateUsername}
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "Vui lòng nhập username" }]}
          >
            <Input placeholder="Nhập username mới" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loadingUsername}
            >
              Lưu thay đổi
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Thay đổi ảnh đại diện */}
      <Card title="Thay đổi ảnh đại diện" className="profile-card">
        <Space direction="vertical">
          <Text type="secondary">
            Chọn file ảnh (jpg, png) làm avatar mới của bạn.
          </Text>
          <Upload
            showUploadList={false}
            customRequest={handleUploadAvatar}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />} loading={loadingAvatar}>
              Chọn ảnh từ máy
            </Button>
          </Upload>
        </Space>
      </Card>

      {/* Đổi mật khẩu */}
      <Card title="Đổi mật khẩu" className="profile-card">
        <Form layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            label="Mật khẩu hiện tại"
            name="oldPassword"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập mật khẩu hiện tại",
              },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Mật khẩu ít nhất 6 ký tự" },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item
            label="Nhập lại mật khẩu mới"
            name="confirmPassword"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập lại mật khẩu mới",
              },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loadingPassword}
            >
              Đổi mật khẩu
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );

  const resultTab = (
    <div className="profile-results">
      <ToeicRecentTable />
      <WritingRecentTable />
    </div>
  );

  return (
    <div className="profile-page">
      <div className="profile-header">
        <Space align="center" size={24}>
          <Avatar
            size={80}
            src={currentUser.profileImage}
            icon={<UserOutlined />}
          />
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>
              {displayName}
            </Title>
            <Text type="secondary">
              @{currentUser.username} · {currentUser.email}
            </Text>
            <br />
            <Text>
              Điểm hiện tại: <strong>{currentUser.points ?? 0}</strong>
            </Text>
          </div>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="info"
        items={[
          {
            key: "info",
            label: "Thông tin cá nhân",
            children: infoTab,
          },
          {
            key: "results",
            label: "Kết quả luyện thi",
            children: resultTab,
          },
        ]}
      />
    </div>
  );
};

export default ProfilePage;
