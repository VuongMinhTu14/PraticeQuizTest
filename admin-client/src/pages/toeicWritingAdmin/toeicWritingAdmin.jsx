import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Space,
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

import "./toeicWritingAdmin.css";

const { TextArea } = Input;

const TASK_TYPE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "opinion_essay", label: "Opinion Essay" },
  { value: "picture", label: "Picture" },
  { value: "other", label: "Khác" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

const ToeicWritingAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // IMPORT STATE
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importType, setImportType] = useState("json"); // 'json' | 'csv'
  const [importText, setImportText] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await adminListWritingSets();
      setItems(data);
    } catch (err) {
      console.error(err);
      message.error(err.message || "Lỗi load danh sách đề writing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      taskType: "email",
      status: "draft",
      minWords: 120,
      maxWords: 180,
      maxScore: 200,
    });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditing(record);
    form.setFieldsValue({
      _id: record._id,
      title: record.title,
      taskType: record.taskType,
      prompt: record.prompt,
      instructions: record.instructions,
      minWords: record.minWords,
      maxWords: record.maxWords,
      year: record.year,
      source: record.source,
      maxScore: record.maxScore,
      rubric: record.rubric,
      tags: record.tags?.join(", "),
      status: record.status,
    });
    setModalOpen(true);
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: "Xoá đề writing",
      content: `Bạn chắc chắn muốn xoá đề "${record.title}"?`,
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: async () => {
        try {
          await adminDeleteWritingSet(record._id);
          message.success("Đã xoá đề writing");
          fetchData();
        } catch (err) {
          console.error(err);
          message.error(err.message || "Xoá đề writing thất bại");
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const tagsArr =
        values.tags
          ?.split(",")
          .map((t) => t.trim())
          .filter(Boolean) || [];

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
        tags: tagsArr,
        status: values.status,
      };

      if (editing) {
        await adminUpdateWritingSet(editing._id, payload);
        message.success("Cập nhật đề writing thành công");
      } else {
        await adminCreateWritingSet(payload);
        message.success("Tạo đề writing thành công");
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      if (err?.errorFields) return; // lỗi validate form
      console.error(err);
      message.error(err.message || "Lưu đề writing thất bại");
    }
  };

  // --------- IMPORT HANDLER (giữ nguyên logic cũ) ---------
  const parseCsvToObjects = (text) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return [];

    const header = lines[0].split(",").map((h) => h.trim());
    const idx = (name) => header.indexOf(name);

    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",");
      if (row.length < header.length) continue;

      const obj = {
        _id: row[idx("_id")]?.trim(),
        title: row[idx("title")]?.trim(),
        taskType: row[idx("taskType")]?.trim() || "email",
        prompt: row[idx("prompt")]?.trim(),
        year: row[idx("year")] ? Number(row[idx("year")]) : undefined,
        status: row[idx("status")]?.trim() || "draft",
      };
      result.push(obj);
    }
    return result;
  };

  const handleImport = async () => {
    try {
      if (!importText.trim()) {
        message.warning("Vui lòng dán nội dung JSON/CSV trước");
        return;
      }

      let itemsToCreate = [];

      if (importType === "json") {
        let parsed = JSON.parse(importText);
        if (!Array.isArray(parsed)) {
          parsed = [parsed];
        }
        itemsToCreate = parsed;
      } else {
        itemsToCreate = parseCsvToObjects(importText);
      }

      if (!itemsToCreate.length) {
        message.warning("Không đọc được dữ liệu từ nội dung import");
        return;
      }

      let success = 0;
      let failed = 0;

      for (const item of itemsToCreate) {
        try {
          if (!item._id || !item.title || !item.prompt) {
            failed++;
            continue;
          }

          await adminCreateWritingSet({
            taskType: "email",
            minWords: 120,
            maxWords: 180,
            maxScore: 200,
            status: "draft",
            ...item,
          });
          success++;
        } catch (err) {
          console.error("import one failed", err);
          failed++;
        }
      }

      message.success(`Import xong: ${success} thành công, ${failed} lỗi`);
      setImportModalOpen(false);
      setImportText("");
      fetchData();
    } catch (err) {
      console.error(err);
      message.error("Import thất bại, kiểm tra lại format JSON/CSV");
    }
  };

  const columns = [
    {
      title: "Mã đề",
      dataIndex: "_id",
      key: "_id",
      width: 180,
    },
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
    },
    {
      title: "Loại task",
      dataIndex: "taskType",
      key: "taskType",
      width: 120,
      render: (v) => {
        const found = TASK_TYPE_OPTIONS.find((o) => o.value === v);
        return found ? found.label : v;
      },
    },
    {
      title: "Năm",
      dataIndex: "year",
      key: "year",
      width: 80,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v) =>
        v === "published" ? <Tag color="green">Published</Tag> : <Tag>Draft</Tag>,
    },
    {
      title: "Tags",
      dataIndex: "tags",
      key: "tags",
      ellipsis: true,
      render: (tags) =>
        tags?.map((t) => (
          <Tag key={t} color="blue">
            {t}
          </Tag>
        )),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Sửa
          </Button>
          <Button size="small" danger onClick={() => handleDelete(record)}>
            Xoá
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="writing-admin-page">
      <h1 className="writing-admin-title">Quản lý đề TOEIC Writing</h1>
      <p className="writing-admin-subtitle">
        CRUD &amp; Import đề writing (email, essay, picture...).
      </p>

      <div className="writing-admin-actions">
        <Button type="primary" onClick={openCreateModal}>
          + Tạo đề Writing mới
        </Button>

        <Button onClick={() => setImportModalOpen(true)}>
          Import JSON / CSV
        </Button>
      </div>

      <div className="writing-admin-table-wrapper">
        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* Modal tạo / sửa */}
      <Modal
        title={editing ? "Sửa đề Writing" : "Tạo đề Writing mới"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width={800}
        okText="Lưu"
        cancelText="Huỷ"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            taskType: "email",
            status: "draft",
            minWords: 120,
            maxWords: 180,
            maxScore: 200,
          }}
        >
          {!editing && (
            <Form.Item
              name="_id"
              label="Mã đề (unique)"
              rules={[{ required: true, message: "Nhập mã đề" }]}
            >
              <Input placeholder="vd: tw_2025_email_01" />
            </Form.Item>
          )}

          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: "Nhập tiêu đề" }]}
          >
            <Input placeholder="TOEIC Writing - Email complaint about delivery delay" />
          </Form.Item>

          <Form.Item
            name="taskType"
            label="Loại task"
            rules={[{ required: true, message: "Chọn loại task" }]}
          >
            <Select options={TASK_TYPE_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="prompt"
            label="Đề bài (prompt)"
            rules={[{ required: true, message: "Nhập đề bài" }]}
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item name="instructions" label="Gợi ý / hướng dẫn thêm">
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item label="Giới hạn số từ">
            <div className="word-limit-group">
              <Form.Item name="minWords" noStyle>
                <InputNumber className="word-limit-input" min={0} placeholder="Min" />
              </Form.Item>
              <span>-</span>
              <Form.Item name="maxWords" noStyle>
                <InputNumber className="word-limit-input" min={0} placeholder="Max" />
              </Form.Item>
            </div>
          </Form.Item>

          <Form.Item name="year" label="Năm">
            <InputNumber min={2000} max={2100} />
          </Form.Item>

          <Form.Item name="source" label="Nguồn đề">
            <Input placeholder="ETS mock test, custom..." />
          </Form.Item>

          <Form.Item name="maxScore" label="Thang điểm tối đa">
            <InputNumber min={0} max={400} />
          </Form.Item>

          <Form.Item name="rubric" label="Rubric rút gọn cho AI">
            <TextArea rows={3} placeholder="Mô tả cách chấm: task, grammar, vocabulary, organization..." />
          </Form.Item>

          <Form.Item name="tags" label="Tags (ngăn cách bởi dấu phẩy)">
            <Input placeholder="email, complaint, delivery" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true, message: "Chọn trạng thái" }]}
          >
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal import JSON / CSV */}
      <Modal
        title="Import đề Writing (JSON / CSV)"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        onOk={handleImport}
        okText="Import"
        cancelText="Huỷ"
        width={800}
      >
        <p style={{ marginBottom: 8 }}>
          Chọn loại dữ liệu và dán nội dung JSON/CSV vào ô bên dưới.
        </p>

        <Radio.Group
          className="writing-import-type"
          value={importType}
          onChange={(e) => setImportType(e.target.value)}
        >
          <Radio.Button value="json">JSON</Radio.Button>
          <Radio.Button value="csv">CSV</Radio.Button>
        </Radio.Group>

        <TextArea
          rows={12}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default ToeicWritingAdmin;
