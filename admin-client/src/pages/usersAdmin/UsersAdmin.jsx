import { useEffect, useState } from "react";
import { Table, Button, Popconfirm, message } from "antd";
import { getUsers, resetUserPoints, deleteUser } from "../../api/adminApi.js";
import "./UsersAdmin.css";

const UsersAdmin = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msgApi, contextHolder] = message.useMessage();

  const load = async () => {
    try {
      setLoading(true);
      const list = await getUsers();
      setRows(list || []);
    } catch (err) {
      msgApi.error(err.message || "Không tải được danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleReset = async (record) => {
    try {
      await resetUserPoints(record.id);
      msgApi.success("Đã reset điểm người dùng");
      load();
    } catch (err) {
      msgApi.error(err.message || "Không reset được điểm");
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteUser(record.id);
      msgApi.success("Đã xóa người dùng");
      load();
    } catch (err) {
      msgApi.error(err.message || "Không xóa được người dùng");
    }
  };

  const columns = [
    {
      title: "Email",
      dataIndex: "email"
    },
    {
      title: "DisplayName",
      dataIndex: "displayName"
    },
    {
      title: "Username",
      dataIndex: "username"
    },
    {
      title: "Điểm",
      dataIndex: "points",
      width: 80
    },
    {
      title: "Hành động",
      key: "actions",
      width: 200,
      render: (_, record) => (
        <div className="user-actions">
          <Button size="small" onClick={() => handleReset(record)}>
            Reset điểm
          </Button>
          <Popconfirm
            title="Xóa người dùng?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDelete(record)}
          >
            <Button size="small" danger>
              Xóa
            </Button>
          </Popconfirm>
        </div>
      )
    }
  ];

  return (
    <div className="users-page">
      {contextHolder}
      <h2>Người dùng</h2>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default UsersAdmin;
