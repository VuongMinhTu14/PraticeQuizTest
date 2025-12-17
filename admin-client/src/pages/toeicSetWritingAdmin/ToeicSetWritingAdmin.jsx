import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  message,
  Radio,
} from "antd";
import {
  adminListWritingSets,
  adminCreateWritingSet,
  adminUpdateWritingSet,
  adminDeleteWritingSet,
} from "../../api/adminApi";
// import "./ToeicSetWritingAdmin.css"; // bạn tạo file css riêng hoặc reuse css cũ

const { TextArea } = Input;

const TASK_OPTIONS = [
  { label: "Mixed (đủ 3 phần)", value: "mixed" },
  { label: "Email", value: "email" },
  { label: "Opinion essay", value: "opinion_essay" },
  { label: "Picture-based", value: "picture" },
];

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
];

const ToeicSetWritingAdmin = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create
  const [form] = Form.useForm();

  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState("json");
  const [importText, setImportText] = useState("");
  const [msgApi, contextHolder] = message.useMessage();

  // ===== LOAD DATA =====
  const fetchData = async () => {
    try {
      setLoading(true);
      const list = await adminListWritingSets();
      setRows(list || []);
    } catch (err) {
      console.error(err);
      msgApi.error(err.message || "Lỗi tải danh sách đề writing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ===== CRUD =====
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      taskType: "mixed",
      status: "draft",
      minWords: 120,
      maxWords: 180,
      maxScore: 200,
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      _id: record._id,
      title: record.title,
      taskType: record.taskType || "mixed",
      prompt: record.prompt,
      instructions: record.instructions,
      minWords: record.minWords,
      maxWords: record.maxWords,
      year: record.year,
      source: record.source,
      maxScore: record.maxScore,
      rubric: record.rubric,
      status: record.status || "draft",
    });
    setModalOpen(true);
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: "Xoá đề Writing?",
      content: `Bạn chắc chắn muốn xoá đề ${record._id}?`,
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: async () => {
        try {
          await adminDeleteWritingSet(record._id);
          msgApi.success("Đã xoá đề Writing");
          fetchData();
        } catch (err) {
          console.error(err);
          msgApi.error(err.message || "Xoá đề Writing thất bại");
        }
      },
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        _id: values._id,
        title: values.title,
        taskType: values.taskType,
        prompt: values.prompt,
        instructions: values.instructions,
        minWords: values.minWords,
        maxWords: values.maxWords,
        year: values.year,
        source: values.source,
        maxScore: values.maxScore,
        rubric: values.rubric,
        status: values.status,
      };

      if (editing) {
        await adminUpdateWritingSet(editing._id, {
          ...payload,
          _id: undefined, // không cho đổi mã
        });
        msgApi.success("Cập nhật đề Writing thành công");
      } else {
        await adminCreateWritingSet(payload);
        msgApi.success("Tạo đề Writing thành công");
      }

      setModalOpen(false);
      setEditing(null);
      fetchData();
    } catch (err) {
      if (err?.errorFields) return; // lỗi validate form của antd
      console.error(err);
      msgApi.error(err.message || "Lưu đề Writing thất bại");
    }
  };

  // ===== IMPORT JSON / CSV =====
  const parseImportText = () => {
    const raw = (importText || "").trim();
    if (!raw) return [];

    if (importMode === "json") {
      let data = JSON.parse(raw);
      if (!Array.isArray(data)) data = [data];
      return data;
    }

    // CSV: _id;title;taskType;year;status
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    return lines.map((line) => {
      const [id, title, taskType, yearStr, status] = line
        .split(";")
        .map((s) => s.trim());

      return {
        _id: id,
        title,
        taskType: taskType || "mixed",
        year: yearStr ? Number(yearStr) : undefined,
        status: status || "draft",
      };
    });
  };

  const handleImport = async () => {
    try {
      const items = parseImportText();
      if (!items.length) {
        msgApi.warning("Không có dòng hợp lệ để import");
        return;
      }

      let ok = 0;
      let fail = 0;

      for (const item of items) {
        try {
          if (!item._id || !item.title) {
            fail++;
            continue;
          }
          await adminCreateWritingSet({
            taskType: "mixed",
            minWords: 120,
            maxWords: 180,
            maxScore: 200,
            status: "draft",
            prompt:
              item.prompt ||
              "Sample prompt. Bạn hãy chỉnh sửa prompt chi tiết hơn sau khi import.",
            ...item,
          });
          ok++;
        } catch (e) {
          console.error("import one failed", e);
          fail++;
        }
      }

      msgApi.success(`Import xong: ${ok} thành công, ${fail} lỗi`);
      setImportOpen(false);
      setImportText("");
      fetchData();
    } catch (err) {
      console.error(err);
      msgApi.error("Lỗi parse JSON/CSV, kiểm tra lại định dạng");
    }
  };

  // ===== TABLE COLUMNS =====
  const columns = [
    {
      title: "Mã đề",
      dataIndex: "_id",
      width: 140,
    },
    {
      title: "Tiêu đề",
      dataIndex: "title",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {record.prompt?.slice(0, 80)}
            {record.prompt && record.prompt.length > 80 ? "..." : ""}
          </div>
        </div>
      ),
    },
    {
      title: "Loại task",
      dataIndex: "taskType",
      width: 140,
      render: (v) => {
        const map = {
          email: "Email",
          picture: "Picture",
          opinion_essay: "Essay",
          mixed: "Mixed",
        };
        return map[v] || v;
      },
    },
    {
      title: "Năm",
      dataIndex: "year",
      width: 80,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 110,
      render: (v) => (
        <Tag color={v === "published" ? "green" : "default"}>
          {v === "published" ? "Published" : "Draft"}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      width: 160,
      render: (_, record) => (
        <>
          <Button size="small" onClick={() => openEdit(record)}>
            Sửa
          </Button>
          <Button
            size="small"
            danger
            style={{ marginLeft: 8 }}
            onClick={() => handleDelete(record)}
          >
            Xoá
          </Button>
        </>
      ),
    },
  ];

  // ===== RENDER =====
  return (
    <div className="sets-page">
      {contextHolder}

      <div className="sets-header">
        <h2>Quản lý đề TOEIC Writing</h2>
        <div className="set-actions">
          <Button style={{ marginRight: 8 }} onClick={() => setImportOpen(true)}>
            Import JSON / CSV
          </Button>
          <Button type="primary" onClick={openCreate}>
            + Tạo đề Writing mới
          </Button>
        </div>
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      {/* Modal tạo / sửa */}
      <Modal
        title={editing ? "Sửa đề TOEIC Writing" : "Tạo đề TOEIC Writing"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onOk={handleSave}
        okText="Lưu"
        cancelText="Cancel"
        width={720}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            taskType: "mixed",
            status: "draft",
            minWords: 120,
            maxWords: 180,
            maxScore: 200,
          }}
        >
          <Form.Item
            name="_id"
            label="Mã đề (vd: TW2025_SET1)"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <Input disabled={!!editing} />
          </Form.Item>

          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="taskType" label="Loại task">
            <Select options={TASK_OPTIONS} />
          </Form.Item>

          <Form.Item name="prompt" label="Prompt chính" rules={[{ required: true, message: "Bắt buộc" }]}>
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item name="instructions" label="Hướng dẫn thêm">
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item label="Giới hạn số từ" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <Form.Item name="minWords" style={{ flex: 1 }}>
                <InputNumber style={{ width: "100%" }} placeholder="Min words" />
              </Form.Item>
              <Form.Item name="maxWords" style={{ flex: 1 }}>
                <InputNumber style={{ width: "100%" }} placeholder="Max words" />
              </Form.Item>
            </div>
          </Form.Item>

          <Form.Item name="maxScore" label="Điểm tối đa">
            <InputNumber style={{ width: 160 }} />
          </Form.Item>

          <Form.Item name="year" label="Năm">
            <InputNumber style={{ width: 160 }} />
          </Form.Item>

          <Form.Item name="source" label="Nguồn (ETS, tự biên soạn, ...)">
            <Input />
          </Form.Item>

          <Form.Item name="rubric" label="Rubric chấm điểm">
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal import */}
      <Modal
        title="Import đề Writing (JSON hoặc CSV)"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={handleImport}
        okText="Import"
        cancelText="Cancel"
        width={800}
      >
        <Radio.Group
          style={{ marginBottom: 8 }}
          value={importMode}
          onChange={(e) => setImportMode(e.target.value)}
        >
          <Radio.Button value="json">JSON</Radio.Button>
          <Radio.Button value="csv">CSV</Radio.Button>
        </Radio.Group>

        <div style={{ fontSize: 13, marginBottom: 8 }}>
          <div>CSV mỗi dòng: <code>_id;title;taskType;year;status</code></div>
          <div>Ví dụ: <code>TW2025_SET1;Sample test;mixed;2025;draft</code></div>
        </div>

        <TextArea
          rows={10}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Dán JSON hoặc CSV vào đây..."
        />
      </Modal>
    </div>
  );
};

export default ToeicSetWritingAdmin;
