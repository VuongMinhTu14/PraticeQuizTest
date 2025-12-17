import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Popconfirm,
  message,
  Input,
  Select,
  Tag,
  Switch,
  Space,
} from "antd";
import {
  getUsers,
  resetUserPoints,
  deleteUser,
  updateUserAdmin,
} from "../../api/adminApi.js";
import "./UsersAdmin.css";

const roleOptions = [
  { label: "Tất cả", value: "" },
  { label: "User", value: "user" },
  { label: "Admin", value: "admin" },
];

const statusOptions = [
  { label: "Tất cả", value: "" },
  { label: "Đang hoạt động", value: "active" },
  { label: "Đã khóa", value: "disabled" },
];

const UsersAdmin = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: "", role: "", status: "" });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [msgApi, contextHolder] = message.useMessage();

  const load = async (page = pagination.current, pageSize = pagination.pageSize, nextFilters = filters) => {
    try {
      setLoading(true);
      const res = await getUsers({
        page,
        limit: pageSize,
        search: nextFilters.search || undefined,
        role: nextFilters.role || undefined,
        status: nextFilters.status || undefined,
      });
      setRows(res.items || []);
      setPagination({
        current: res.page || page,
        pageSize: res.pageSize || pageSize,
        total: res.total || 0,
      });
    } catch (err) {
      msgApi.error(err.message || "Không tải được danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleRoleChange = async (record, value) => {
    try {
      await updateUserAdmin(record.id, { role: value });
      msgApi.success("Cập nhật role");
      load(pagination.current, pagination.pageSize);
    } catch (err) {
      msgApi.error(err.message || "Không cập nhật được role");
    }
  };

  const handleStatusChange = async (record, checked) => {
    try {
      await updateUserAdmin(record.id, { status: checked ? "active" : "disabled" });
      msgApi.success("Cập nhật trạng thái");
      load(pagination.current, pagination.pageSize);
    } catch (err) {
      msgApi.error(err.message || "Không cập nhật được trạng thái");
    }
  };

  const columns = [
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Tên hiển thị",
      dataIndex: "displayName",
    },
    {
      title: "Username",
      dataIndex: "username",
    },
    {
      title: "Điểm",
      dataIndex: "points",
      width: 80,
    },
    {
      title: "Role",
      key: "role",
      width: 140,
      render: (_, record) => (
        <Select
          size="small"
          value={record.role}
          style={{ width: 120 }}
          onChange={(v) => handleRoleChange(record, v)}
          options={[
            { label: "user", value: "user" },
            { label: "admin", value: "admin" },
          ]}
        />
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 160,
      render: (_, record) => (
        <Space>
          <Tag color={record.status === "active" ? "green" : "red"}>
            {record.status === "active" ? "Đang hoạt động" : "Đã khóa"}
          </Tag>
          <Switch
            checked={record.status === "active"}
            onChange={(checked) => handleStatusChange(record, checked)}
            size="small"
          />
        </Space>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      width: 170,
      render: (value) => (value ? new Date(value).toLocaleString() : "-"),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 240,
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
      ),
    },
  ];

  const onSearch = (value) => {
    const nextFilters = { ...filters, search: value };
    setFilters(nextFilters);
    load(1, pagination.pageSize, nextFilters);
  };

  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    load(1, pagination.pageSize, nextFilters);
  };

  const handleTableChange = (pager) => {
    setPagination((prev) => ({ ...prev, current: pager.current, pageSize: pager.pageSize }));
    load(pager.current, pager.pageSize);
  };

  return (
    <div className="users-page">
      {contextHolder}
      <div className="users-header">
        <h2>Người dùng</h2>
        <div className="users-filters">
          <Input.Search
            placeholder="Tìm email/username/displayName"
            allowClear
            onSearch={onSearch}
            style={{ width: 280 }}
          />
          <Select
            value={filters.role}
            options={roleOptions}
            onChange={(v) => handleFilterChange("role", v)}
            style={{ width: 150 }}
          />
          <Select
            value={filters.status}
            options={statusOptions}
            onChange={(v) => handleFilterChange("status", v)}
            style={{ width: 170 }}
          />
          <Button onClick={() => load()}>Refresh</Button>
        </div>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default UsersAdmin;
