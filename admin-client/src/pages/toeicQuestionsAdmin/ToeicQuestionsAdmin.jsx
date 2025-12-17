import { useEffect, useState } from "react";
import "./ToeicQuestionsAdmin.css";
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
  Upload,
} from "antd";
import {
  getToeicSetsAdmin,
  getToeicQuestionsAdmin,
  createToeicQuestionAdmin,
  importToeicQuestionsAdmin,
  deleteToeicQuestionAdmin,
  uploadToeicQuestionImageAdmin,
  uploadToeicQuestionAudioAdmin,
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

const LISTENING_PARTS = ["p1", "p2", "p3", "p4"];
const IMAGE_PARTS = ["p1", "p6", "p7"]; // P1: photo, P6–7: passage image

const API_BASE = import.meta.env.VITE_API_ENDPOINT || "http://localhost:11111";
const resolveMediaUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

const ToeicQuestionsAdmin = () => {
  const [msgApi, contextHolder] = message.useMessage();

  const [sets, setSets] = useState([]);
  const [setId, setSetId] = useState(null);
  const [partKey, setPartKey] = useState("p1");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal thêm câu
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();

  // Modal import
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPartKey, setImportPartKey] = useState("p1");

  // Load list đề
  useEffect(() => {
    const loadSets = async () => {
      try {
        const list = await getToeicSetsAdmin();
        setSets(list || []);
        if (list?.length && !setId) {
          setSetId(list[0].id);
        }
      } catch (err) {
        msgApi.error("Không tải được danh sách đề");
      }
    };
    loadSets();
  }, []);

  // Load câu hỏi
  const reloadQuestions = async (currSet = setId, currPart = partKey) => {
    if (!currSet || !currPart) {
      setRows([]);
      return;
    }

    try {
      setLoading(true);
      const qs = await getToeicQuestionsAdmin(currSet, currPart);

      // Filter chắc chắn ở FE: chỉ giữ đúng part đang chọn
      const filtered = (qs || []).filter(
        (q) => !q.partKey || q.partKey === currPart
      );

      setRows(filtered);
    } catch (err) {
      console.error(err);
      msgApi.error("Không tải được câu hỏi");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadQuestions();
  }, [setId, partKey]);

  // Delete
  const handleDelete = async (record) => {
    Modal.confirm({
      title: "Xoá câu hỏi?",
      content: `Bạn chắc muốn xoá câu ${record.number}?`,
      okText: "Xoá",
      okType: "danger",
      onOk: async () => {
        try {
          await deleteToeicQuestionAdmin(record.id);
          msgApi.success("Đã xoá");
          reloadQuestions();
        } catch {
          msgApi.error("Lỗi xoá câu");
        }
      },
    });
  };

  // Upload ảnh (P1,6,7)
  const handleUploadImage = async (record, file) => {
    if (!IMAGE_PARTS.includes(partKey)) {
      msgApi.warning("Ảnh chỉ dùng cho Part 1, 6 và 7");
      return false;
    }
    try {
      setLoading(true);
      const res = await uploadToeicQuestionImageAdmin(record.id, file);
      if (!res?.ok) msgApi.error("Upload ảnh thất bại");
      else {
        msgApi.success("Đã upload ảnh");
        reloadQuestions();
      }
    } finally {
      setLoading(false);
    }
    return false;
  };

  // Upload audio
  const handleUploadAudio = async (record, file) => {
    if (!LISTENING_PARTS.includes(partKey)) {
      msgApi.warning("Audio chỉ cho Part 1–4");
      return false;
    }
    try {
      setLoading(true);
      const res = await uploadToeicQuestionAudioAdmin(record.id, file);
      if (!res?.ok) msgApi.error("Upload audio thất bại");
      else {
        msgApi.success("Đã upload audio");
        reloadQuestions();
      }
    } finally {
      setLoading(false);
    }
    return false;
  };

  // =========================
  // COLUMNS TABLE
  // =========================
  const columns = [
    {
      title: "Số",
      dataIndex: "number",
      width: 60,
    },
    {
      title: "Nội dung",
      dataIndex: "questionText",
      render: (t, r) => (
        <div>
          {r.passageOrder ? (
            <div style={{ fontSize: 11, color: "#555" }}>
              📘 Passage {r.passageOrder} — ID: {r.passageId}
            </div>
          ) : null}

          {r.passageText ? (
            <div
              style={{
                background: "#f3f4ff",
                padding: 8,
                borderRadius: 6,
                marginBottom: 6,
                whiteSpace: "pre-line",
              }}
            >
              {r.passageText}
            </div>
          ) : null}

          <div>{t}</div>
        </div>
      ),
    },

    {
      title: IMAGE_PARTS.includes(partKey) ? "Ảnh" : "Ảnh (P1,6,7)",
      dataIndex: "imageUrl",
      width: 140,
      render: (_, record) => {
        const hasImage = !!record.imageUrl;
        return (
          <div className="q-media-cell">
            {hasImage ? (
              <img
                src={resolveMediaUrl(record.imageUrl)}
                alt=""
                className="q-thumb"
              />
            ) : (
              <div className="q-thumb q-thumb-empty">No image</div>
            )}

            {IMAGE_PARTS.includes(partKey) && (
              <Upload
                showUploadList={false}
                accept="image/*"
                beforeUpload={(f) => handleUploadImage(record, f)}
              >
                <Button size="small" style={{ marginTop: 4 }}>
                  {hasImage ? "Đổi ảnh" : "Upload ảnh"}
                </Button>
              </Upload>
            )}
          </div>
        );
      },
    },

    {
      title: "Audio (P1–4)",
      dataIndex: "audioUrl",
      width: 140,
      render: (_, record) => {
        const hasAudio = !!record.audioUrl;
        return (
          <div className="q-media-cell">
            {hasAudio ? (
              <audio
                controls
                className="q-audio-mini"
                src={resolveMediaUrl(record.audioUrl)}
              />
            ) : (
              <div className="q-thumb q-thumb-empty">No audio</div>
            )}

            {LISTENING_PARTS.includes(partKey) && (
              <Upload
                showUploadList={false}
                accept="audio/*"
                beforeUpload={(f) => handleUploadAudio(record, f)}
              >
                <Button size="small" style={{ marginTop: 4 }}>
                  {hasAudio ? "Đổi audio" : "Upload audio"}
                </Button>
              </Upload>
            )}
          </div>
        );
      },
    },

    {
      title: "Hành động",
      width: 90,
      render: (_, rec) => (
        <Button danger size="small" onClick={() => handleDelete(rec)}>
          Xoá
        </Button>
      ),
    },
  ];

  // =========================
  // Thêm câu hỏi
  // =========================
  const openAddModal = () => {
    if (!setId) return msgApi.warning("Chọn đề trước");
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
      const v = await addForm.validateFields();

      const payload = {
        number: v.number,
        questionText: v.questionText,
        choices: [
          { label: "A", text: v.choiceA },
          { label: "B", text: v.choiceB },
          { label: "C", text: v.choiceC },
          { label: "D", text: v.choiceD },
        ],
        correctOption: v.correctOption,

        passageId: v.passageId || "",
        passageOrder: v.passageOrder || null,
        passageText: v.passageText || "",
      };

      await createToeicQuestionAdmin(setId, v.partKey, payload);
      msgApi.success("Đã thêm câu");

      setAddOpen(false);
      reloadQuestions();
    } catch (err) {
      if (!err.errorFields) msgApi.error("Lỗi thêm câu");
    }
  };

  // =========================
  // IMPORT (CSV + JSON)
  // =========================
  const parseCsv = (text) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    const result = [];

    for (const line of lines) {
      const parts = line.split(";").map((x) => x.trim());

      /**
       * CSV format:
       * 0 number
       * 1 question
       * 2 A
       * 3 B
       * 4 C
       * 5 D
       * 6 correct
       * 7 passageId
       * 8 passageOrder
       * 9 passageText
       * 10 imageUrl (optional)
       * 11 audioUrl (optional)
       */

      if (parts.length < 7) continue;

      const [
        numStr,
        qText,
        a,
        b,
        c,
        d,
        correctRaw,
        passageId = "",
        passageOrder = "",
        passageText = "",
        imageUrl = "",
        audioUrl = "",
      ] = parts;

      const number = Number(numStr);
      if (!number || !qText) continue;

      const correct = (correctRaw || "").toUpperCase();

      result.push({
        number,
        questionText: qText,
        choices: [
          { label: "A", text: a },
          { label: "B", text: b },
          { label: "C", text: c },
          { label: "D", text: d },
        ],
        correctOption: ["A", "B", "C", "D"].includes(correct) ? correct : "A",

        passageId: passageId || undefined,
        passageOrder: passageOrder ? Number(passageOrder) : null,
        passageText: passageText || undefined,

        imageUrl: imageUrl || undefined,
        audioUrl: audioUrl || undefined,
      });
    }
    return result;
  };

  const handleImportOk = async () => {
    if (!setId) return msgApi.warning("Chọn đề");

    const trimmed = (importText || "").trim();
    if (!trimmed) return msgApi.warning("Chưa nhập dữ liệu");

    let questions = [];

    try {
      if (trimmed.startsWith("[")) {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) throw new Error();
        questions = parsed;
      } else {
        questions = parseCsv(trimmed);
      }
    } catch {
      return msgApi.error("Lỗi định dạng CSV/JSON");
    }

    if (!questions.length) return msgApi.warning("Không có câu hợp lệ");

    await importToeicQuestionsAdmin(setId, importPartKey, questions);
    msgApi.success(`Import ${questions.length} câu OK`);

    setImportOpen(false);
    reloadQuestions();
  };

  // =========================
  // UI RENDER
  // =========================

  return (
    <div className="page-container">
      {contextHolder}

      {/* HEADER */}
      <div className="page-header">
        <div className="qh-title-row">
          <h2>Câu hỏi TOEIC</h2>
          <div className="qh-actions">
            <Button type="primary" onClick={openAddModal}>
              Thêm câu hỏi
            </Button>
            <Button onClick={() => setImportOpen(true)}>
              Import CSV / JSON
            </Button>
          </div>
        </div>

        <div className="qh-filters">
          <Select
            style={{ minWidth: 220 }}
            value={setId}
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

      {/* TABLE */}
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 10 }}
      />

      {/* ADD MODAL */}
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
              options={sets.map((s) => ({ value: s.id, label: s.title }))}
            />
          </Form.Item>

          <Form.Item label="Part" name="partKey">
            <Select options={PART_OPTIONS} />
          </Form.Item>

          <Form.Item label="Số câu" name="number" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Nội dung câu hỏi"
            name="questionText"
            rules={[{ required: true }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            label="Đáp án A"
            name="choiceA"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Đáp án B"
            name="choiceB"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Đáp án C"
            name="choiceC"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Đáp án D"
            name="choiceD"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Đáp án đúng" name="correctOption">
            <Radio.Group>
              <Radio value="A">A</Radio>
              <Radio value="B">B</Radio>
              <Radio value="C">C</Radio>
              <Radio value="D">D</Radio>
            </Radio.Group>
          </Form.Item>

          {/* PASSAGE FIELDS */}
          <Form.Item label="Passage ID" name="passageId">
            <Input placeholder="VD: P7_G1" />
          </Form.Item>
          <Form.Item label="Thứ tự đoạn (1–3)" name="passageOrder">
            <InputNumber min={1} max={3} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Nội dung đoạn văn" name="passageText">
            <TextArea rows={4} placeholder="Chỉ nhập khi là đoạn 1,2 hoặc 3" />
          </Form.Item>
        </Form>
      </Modal>

      {/* IMPORT MODAL */}
      <Modal
        title="Import câu hỏi (CSV / JSON)"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={handleImportOk}
        okText="Import"
        cancelText="Hủy"
      >
        <div style={{ marginBottom: 12 }}>
          <b>Cấu trúc CSV:</b>
          <pre style={{ background: "#f3f4f6", padding: 8 }}>
number;question;A;B;C;D;correct;passageId;passageOrder;passageText;imageUrl;audioUrl
          </pre>
        </div>

        <Select
          style={{ width: "100%", marginBottom: 10 }}
          value={importPartKey}
          onChange={setImportPartKey}
          options={PART_OPTIONS}
        />

        <TextArea
          rows={10}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Dán CSV hoặc JSON vào đây..."
        />
      </Modal>
    </div>
  );
};

export default ToeicQuestionsAdmin;
