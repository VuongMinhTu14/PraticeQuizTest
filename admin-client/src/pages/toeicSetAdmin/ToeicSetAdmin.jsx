import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  message,
  Select
} from "antd";
import {
  getToeicSetsAdmin,
  createToeicSetAdmin,
  updateToeicSetAdmin,
  deleteToeicSetAdmin
} from "../../api/adminApi.js";
import "./ToeicSetAdmin.css";

const emptyForm = {
  _id: "",              // 🆕 mã đề tự nhập
  title: "",
  durationSec: 120 * 60,
  totalQuestions: 200,
  isFree: true,
  status: "draft"
};

const ToeicSetAdmin = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [msgApi, contextHolder] = message.useMessage();

  const load = async () => {
    try {
      setLoading(true);
      const list = await getToeicSetsAdmin();
      setRows(list || []);
    } catch (err) {
      msgApi.error(err.message || "Không tải được danh sách đề TOEIC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue(emptyForm);
    setOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      _id: record.id, // 🆕 hiển thị mã đề nhưng lát nữa mình disable
      title: record.title,
      durationSec: record.durationSec,
      totalQuestions: record.totalQuestions,
      isFree: record.isFree,
      status: record.status
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        // khi update không cho đổi _id, nhưng nếu backend không dùng cũng không sao
        await updateToeicSetAdmin(editing.id, values);
        msgApi.success("Đã cập nhật đề");
      } else {
        await createToeicSetAdmin(values); // values có cả _id
        msgApi.success("Đã tạo đề mới");
      }
      setOpen(false);
      load();
    } catch (err) {
      if (err?.errorFields) return; // lỗi validate form
      msgApi.error(err.message || "Lưu đề không thành công");
    }
  };

  const handleDelete = async (record) => {
    Modal.confirm({
      title: "Xóa đề TOEIC?",
      content: `Xóa bộ đề: ${record.title}`,
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      async onOk() {
        try {
          await deleteToeicSetAdmin(record.id);
          msgApi.success("Đã xóa đề");
          load();
        } catch (err) {
          msgApi.error(err.message || "Không xóa được đề");
        }
      }
    });
  };

  const columns = [
    {
      title: "Mã đề",
      dataIndex: "id",
      width: 160
    },
    { title: "Tiêu đề", dataIndex: "title" },
    {
      title: "Thời gian (phút)",
      dataIndex: "durationSec",
      width: 130,
      render: (v) => Math.round((v || 0) / 60)
    },
    {
      title: "Số câu",
      dataIndex: "totalQuestions",
      width: 90
    },
    {
      title: "Free",
      dataIndex: "isFree",
      width: 70,
      render: (v) => (v ? "✔" : "")
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 110
    },
    {
      title: "Hành động",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <div className="set-actions">
          <Button size="small" onClick={() => openEdit(record)}>
            Sửa
          </Button>
          <Button size="small" danger onClick={() => handleDelete(record)}>
            Xóa
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="sets-page">
      {contextHolder}
      <div className="sets-header">
        <h2>Đề TOEIC</h2>
        <Button type="primary" onClick={openCreate}>
          + Tạo đề
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editing ? "Sửa đề TOEIC" : "Tạo đề TOEIC"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText="Lưu"
      >
        <Form layout="vertical" form={form}>
          {/* 🆕 Mã đề (tự nhập khi tạo, khóa khi sửa) */}
          <Form.Item
            name="_id"
            label="Mã đề (vd: ts_2024_set9)"
            rules={[
              { required: true, message: "Nhập mã đề" },
              {
                pattern: /^ts_\d{4}_[a-zA-Z0-9_-]+$/,
                message: "Định dạng gợi ý: ts_2024_set9"
              }
            ]}
          >
            <Input disabled={!!editing} />
          </Form.Item>

          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: "Nhập tiêu đề" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="durationSec"
            label="Thời gian (giây)"
            rules={[{ required: true }]}
          >
            <InputNumber min={60} step={60} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="totalQuestions"
            label="Tổng số câu"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="isFree" label="Miễn phí?" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true, message: "Chọn trạng thái" }]}
          >
            <Select
              options={[
                { label: "Draft", value: "draft" },
                { label: "Published", value: "published" }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ToeicSetAdmin;
