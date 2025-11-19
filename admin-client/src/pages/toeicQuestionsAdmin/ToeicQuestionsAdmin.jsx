import { useEffect, useState } from "react";
import {
  Table,
  Select,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Radio,
  message,
} from "antd";
import {
  getToeicSetsAdmin,
  getToeicQuestionsAdmin,
  createToeicQuestionAdmin,
  importToeicQuestionsAdmin,
  deleteToeicQuestionAdmin,
} from "../../api/adminApi";

const { TextArea } = Input;

const PART_OPTIONS = [
  { value: "p1", label: "Part 1" },
  { value: "p2", label: "Part 2" },
  { value: "p3", label: "Part 3" },
  { value: "p4", label: "Part 4" },
  { value: "p5", label: "Part 5" },
  { value: "p6", label: "Part 6" },
  { value: "p7", label: "Part 7" },
];

const ToeicQuestionsAdmin = () => {
  const [msgApi, contextHolder] = message.useMessage();

  const [sets, setSets] = useState([]);
  const [setId, setSetId] = useState(null);
  const [partKey, setPartKey] = useState("p1");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal thêm 1 câu hỏi
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();

  // modal import
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPartKey, setImportPartKey] = useState("p1");

  useEffect(() => {
    const loadSets = async () => {
      try {
        const list = await getToeicSetsAdmin();
        setSets(list || []);
        if (list && list.length && !setId) {
          setSetId(list[0].id);
        }
      } catch (err) {
        console.error(err);
        msgApi.error("Không tải được danh sách đề");
      }
    };
    loadSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadQuestions = async () => {
      if (!setId || !partKey) {
        setRows([]);
        return;
      }
      try {
        setLoading(true);
        const qs = await getToeicQuestionsAdmin(setId, partKey);
        setRows(qs || []);
      } catch (err) {
        console.error(err);
        msgApi.error("Không tải được câu hỏi");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [setId, partKey, msgApi]);

  const handleDelete = async (record) => {
    Modal.confirm({
      title: "Xoá câu hỏi",
      content: `Bạn chắc chắn muốn xoá câu ${record.number}?`,
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: async () => {
        try {
          await deleteToeicQuestionAdmin(record.id);
          msgApi.success("Đã xoá câu hỏi");

          const qs = await getToeicQuestionsAdmin(setId, partKey);
          setRows(qs || []);
        } catch (err) {
          console.error(err);
          msgApi.error("Xoá câu hỏi thất bại");
        }
      },
    });
  };

  const columns = [
    {
      title: "Số câu",
      dataIndex: "number",
      width: 80,
    },
    // cột Part không cần nữa vì đã filter theo Part rồi
    {
      title: "Nội dung",
      dataIndex: "questionText",
      render: (text) => <span>{text}</span>,
    },
    {
      title: "Hành động",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Button danger size="small" onClick={() => handleDelete(record)}>
          Xoá
        </Button>
      ),
    },
  ];

  // ========== Thêm câu hỏi ==========
  const openAddModal = () => {
    if (!setId) {
      msgApi.warning("Chọn đề trước đã");
      return;
    }
    addForm.resetFields();
    addForm.setFieldsValue({
      setId,
      partKey,
      number: rows.length ? rows[rows.length - 1].number + 1 : 1,
      correctOption: "A",
    });
    setAddOpen(true);
  };

  const handleAddOk = async () => {
    try {
      const values = await addForm.validateFields();

      if (!values.setId) {
        msgApi.warning("Chọn đề");
        return;
      }

      const targetSetId = values.setId;
      const targetPartKey = values.partKey || partKey;

      const payload = {
        number: values.number,
        questionText: values.questionText,
        choices: [
          { label: "A", text: values.choiceA },
          { label: "B", text: values.choiceB },
          { label: "C", text: values.choiceC },
          { label: "D", text: values.choiceD },
        ],
        correctOption: values.correctOption,
      };

      await createToeicQuestionAdmin(targetSetId, targetPartKey, payload);
      msgApi.success("Đã thêm câu hỏi");

      setAddOpen(false);

      // reload nếu đang đứng đúng set + part
      if (targetSetId === setId && targetPartKey === partKey) {
        const qs = await getToeicQuestionsAdmin(setId, partKey);
        setRows(qs || []);
      }
    } catch (err) {
      if (err?.errorFields) return; // lỗi validate form
      console.error(err);
      msgApi.error("Thêm câu hỏi thất bại");
    }
  };

  // ========== Import CSV / JSON ==========
  const openImportModal = () => {
    if (!setId) {
      msgApi.warning("Chọn đề trước đã");
      return;
    }
    setImportPartKey(partKey || "p1");
    setImportText("");
    setImportOpen(true);
  };

  const parseCsv = (text) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    const questions = [];

    for (const line of lines) {
      const parts = line.split(";").map((x) => x.trim());

      if (parts.length < 7) continue;

      const [numStr, qText, a, b, c, d, correct] = parts;
      const number = Number(numStr) || 0;
      const correctUpper = (correct || "").toUpperCase();

      if (!number || !qText) continue;

      questions.push({
        number,
        questionText: qText,
        choices: [
          { label: "A", text: a },
          { label: "B", text: b },
          { label: "C", text: c },
          { label: "D", text: d },
        ],
        correctOption: ["A", "B", "C", "D"].includes(correctUpper)
          ? correctUpper
          : "A",
      });
    }

    return questions;
  };

  const handleImportOk = async () => {
    if (!setId) {
      msgApi.warning("Chọn đề trước đã");
      return;
    }

    const targetPart = importPartKey || partKey || "p1";

    try {
      let questions = [];

      const trimmed = (importText || "").trim();
      if (!trimmed) {
        msgApi.warning("Dán JSON hoặc CSV vào trước đã");
        return;
      }

      if (trimmed.startsWith("[")) {
        // JSON
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          msgApi.error("JSON phải là một mảng câu hỏi");
          return;
        }
        questions = parsed;
      } else {
        // CSV
        questions = parseCsv(trimmed);
      }

      if (!questions.length) {
        msgApi.warning("Không tìm thấy câu hỏi hợp lệ");
        return;
      }

      await importToeicQuestionsAdmin(setId, targetPart, questions);
      msgApi.success(`Import ${questions.length} câu hỏi thành công`);

      setImportOpen(false);

      // reload nếu đang đúng part
      if (targetPart === partKey) {
        const qs = await getToeicQuestionsAdmin(setId, partKey);
        setRows(qs || []);
      }
    } catch (err) {
      console.error(err);
      msgApi.error("Import câu hỏi thất bại");
    }
  };

  return (
    <div className="page-container">
      {contextHolder}

      <div className="page-header">
        <div className="qh-title-row">
          <h2>Câu hỏi TOEIC</h2>
          <div className="qh-actions">
            <Button type="primary" onClick={openAddModal}>
              Thêm câu hỏi
            </Button>
            <Button onClick={openImportModal}>Import CSV / JSON</Button>
          </div>
        </div>

        <div className="qh-filters">
          <Select
            style={{ minWidth: 220 }}
            placeholder="Chọn đề"
            value={setId || undefined}
            onChange={setSetId}
            options={sets.map((s) => ({ value: s.id, label: s.title }))}
          />

          <Select
            style={{ minWidth: 140 }}
            value={partKey}
            onChange={setPartKey}
            options={PART_OPTIONS}
          />
        </div>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 10 }}
      />

      {/* Modal thêm 1 câu hỏi */}
      <Modal
        title="Thêm câu hỏi"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={handleAddOk}
        okText="Lưu"
        cancelText="Huỷ"
        destroyOnClose
      >
        <Form layout="vertical" form={addForm}>
          <Form.Item label="Đề" name="setId">
            <Select
              placeholder="Chọn đề"
              options={sets.map((s) => ({ value: s.id, label: s.title }))}
            />
          </Form.Item>

          <Form.Item label="Part" name="partKey">
            <Select options={PART_OPTIONS} />
          </Form.Item>

          <Form.Item
            label="Số câu"
            name="number"
            rules={[{ required: true, message: "Nhập số câu" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Nội dung câu hỏi"
            name="questionText"
            rules={[{ required: true, message: "Nhập nội dung câu hỏi" }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            label="Đáp án A"
            name="choiceA"
            rules={[{ required: true, message: "Nhập đáp án A" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Đáp án B"
            name="choiceB"
            rules={[{ required: true, message: "Nhập đáp án B" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Đáp án C"
            name="choiceC"
            rules={[{ required: true, message: "Nhập đáp án C" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Đáp án D"
            name="choiceD"
            rules={[{ required: true, message: "Nhập đáp án D" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Đáp án đúng"
            name="correctOption"
            rules={[{ required: true, message: "Chọn đáp án đúng" }]}
          >
            <Radio.Group>
              <Radio value="A">A</Radio>
              <Radio value="B">B</Radio>
              <Radio value="C">C</Radio>
              <Radio value="D">D</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal import */}
      <Modal
        title="Import câu hỏi (CSV / JSON)"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={handleImportOk}
        okText="Import"
        cancelText="Huỷ"
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 8 }}>Chọn đề & part muốn import</div>
          <Select
            style={{ width: "100%", marginBottom: 8 }}
            value={setId}
            onChange={setSetId}
            options={sets.map((s) => ({ value: s.id, label: s.title }))}
          />
          <Select
            style={{ width: "100%" }}
            value={importPartKey}
            onChange={setImportPartKey}
            options={PART_OPTIONS}
          />
        </div>

        <p style={{ marginBottom: 8 }}>
          <b>JSON:</b> dán mảng câu hỏi giống cấu trúc backend đang dùng.
          <br />
          <b>CSV:</b> mỗi dòng:
          <code> number;question;A;B;C;D;correct </code>
          (ví dụ:
          <code>1;What is he doing?;Working;Eating;Driving;Running;A</code>)
        </p>

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

export default ToeicQuestionsAdmin;
