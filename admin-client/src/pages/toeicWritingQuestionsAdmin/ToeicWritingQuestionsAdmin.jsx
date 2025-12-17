// src/pages/toeicWritingAdmin/ToeicWritingQuestionsAdmin.jsx
import { useEffect, useState } from "react";
import {
  Table,
  Select,
  Button,
  Modal,
  message,
  Upload,
  Input,
} from "antd";

import {
  adminListWritingSets,
  adminGetWritingQuestions,
  adminImportWritingQuestions,
  adminDeleteWritingQuestion,
  adminUploadWritingQuestionImage,
} from "../../api/adminApi";

// import "./toeicWritingAdmin.css"; // nếu bạn đang dùng css này

const { TextArea } = Input;

const WRITING_PART_OPTIONS = [
  { value: "w1_5", label: "Questions 1–5 (Picture)" },
  { value: "w6_7", label: "Questions 6–7 (Email)" },
  { value: "w8", label: "Question 8 (Essay)" },
];

const API_BASE = import.meta.env.VITE_API_ENDPOINT || "http://localhost:11111";
const resolveMediaUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

const ToeicWritingQuestionsAdmin = () => {
  const [sets, setSets] = useState([]);
  const [setId, setSetId] = useState(null);

  const [partKey, setPartKey] = useState("w1_5");        // part đang xem trên bảng
  const [importPartKey, setImportPartKey] = useState("w1_5"); // part sẽ import vào

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [msgApi, contextHolder] = message.useMessage();

  // luôn sync part đang xem với part mặc định khi mở modal
  useEffect(() => {
    setImportPartKey(partKey);
  }, [partKey]);

  // ===== LOAD SETS =====
  useEffect(() => {
    const load = async () => {
      try {
        const list = await adminListWritingSets();
        setSets(list || []);
        if (list?.length && !setId) {
          setSetId(list[0]._id);
        }
      } catch (err) {
        console.error(err);
        msgApi.error(err.message || "Lỗi tải danh sách đề writing");
      }
    };
    load();
  }, []);

  // ===== LOAD QUESTIONS =====
  const loadQuestions = async (currSetId = setId, currPart = partKey) => {
    if (!currSetId) {
      setRows([]);
      return;
    }
    try {
      setLoading(true);
      const qs = await adminGetWritingQuestions(currSetId, currPart);
      setRows(qs || []);
    } catch (err) {
      console.error(err);
      msgApi.error(err.message || "Lỗi tải câu hỏi writing");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (setId) loadQuestions(setId, partKey);
  }, [setId, partKey]);

  // ===== DELETE QUESTION =====
  const handleDeleteQuestion = (record) => {
    Modal.confirm({
      title: "Xoá câu hỏi?",
      content: `Bạn chắc chắn muốn xoá câu số ${record.number}?`,
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: async () => {
        try {
          await adminDeleteWritingQuestion(record._id);
          msgApi.success("Đã xoá câu hỏi");
          loadQuestions();
        } catch (err) {
          console.error(err);
          msgApi.error(err.message || "Xoá câu hỏi thất bại");
        }
      },
    });
  };

  // ===== UPLOAD IMAGE (Q1–5) =====
  const handleUploadImage = async (record, file) => {
    if (record.partKey !== "w1_5" && record.partKey !== "w6_7") {
      msgApi.warning("Ảnh chỉ dùng cho Questions 1–7");
      return false;
    }
    try {
      setLoading(true);
      const res = await adminUploadWritingQuestionImage(record._id, file);
      if (!res?.ok) {
        msgApi.error(res?.msg || "Upload ảnh thất bại");
      } else {
        msgApi.success("Upload ảnh thành công");
        loadQuestions();
      }
    } catch (err) {
      console.error(err);
      msgApi.error("Upload ảnh lỗi");
    } finally {
      setLoading(false);
    }
    return false; // chặn antd upload mặc định
  };

  // ===== IMPORT QUESTIONS =====

  // CSV format: number;prompt;subPrompt;imageUrl
  const parseCsv = (text) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    const result = [];
    for (const line of lines) {
      const [numStr, prompt, subPrompt = "", imageUrl = ""] = line
        .split(";")
        .map((s) => s.trim());

      const number = Number(numStr);
      if (!number || !prompt) continue;

      result.push({
        number,
        prompt,
        subPrompt,
        imageUrl: imageUrl || undefined,
      });
    }
    return result;
  };

  const handleImport = async () => {
    if (!setId) {
      msgApi.warning("Chọn đề trước khi import");
      return;
    }
    const raw = (importText || "").trim();
    if (!raw) {
      msgApi.warning("Chưa nhập dữ liệu import");
      return;
    }

    let questions = [];
    try {
      if (raw.startsWith("[")) {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error("JSON phải là array");
        questions = parsed;
      } else {
        questions = parseCsv(raw);
      }
    } catch (err) {
      console.error(err);
      msgApi.error("Lỗi parse JSON/CSV, kiểm tra lại định dạng");
      return;
    }

    if (!questions.length) {
      msgApi.warning("Không có câu hợp lệ trong dữ liệu");
      return;
    }

    const targetPartKey = importPartKey || partKey;

    try {
      setLoading(true);
      await adminImportWritingQuestions(setId, targetPartKey, questions);
      msgApi.success(
        `Import ${questions.length} câu hỏi writing vào ${WRITING_PART_OPTIONS.find(
          (p) => p.value === targetPartKey
        )?.label || targetPartKey} thành công`
      );
      setImportOpen(false);
      setImportText("");
      // sau khi import xong thì nếu đang xem đúng part thì reload
      loadQuestions(setId, partKey);
    } catch (err) {
      console.error(err);
      msgApi.error(err.message || "Import câu hỏi writing thất bại");
    } finally {
      setLoading(false);
    }
  };

  // ===== TABLE COLUMNS =====
  const columns = [
    {
      title: "Số câu",
      dataIndex: "number",
      width: 80,
    },
    {
      title: "Prompt",
      dataIndex: "prompt",
      render: (_, record) => (
        <div>
          {record.subPrompt && (
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginBottom: 4,
                whiteSpace: "pre-line",
              }}
            >
              {record.subPrompt}
            </div>
          )}
          <div style={{ whiteSpace: "pre-line" }}>{record.prompt}</div>
        </div>
      ),
    },
    {
      title: "Ảnh (Q1–7)",
      dataIndex: "imageUrl",
      width: 220,
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
            {(record.partKey === "w1_5" || partKey === "w6_7") && (
              <Upload
                showUploadList={false}
                accept="image/*"
                beforeUpload={(file) => handleUploadImage(record, file)}
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
      title: "Hành động",
      width: 120,
      render: (_, record) => (
        <Button danger size="small" onClick={() => handleDeleteQuestion(record)}>
          Xoá
        </Button>
      ),
    },
  ];

  // ===== RENDER =====
  return (
    <div className="page-container">
      {contextHolder}

      <div className="page-header">
        <div className="qh-title-row">
          <h2>TOEIC Writing – Câu hỏi</h2>
          <Button type="primary" onClick={() => setImportOpen(true)}>
            Import câu hỏi
          </Button>
        </div>
        <p style={{ color: "#6b7280" }}>
          Chọn đề &amp; part để quản lý 8 câu hỏi Writing (1–5: Picture, 6–7:
          Email, 8: Essay).
        </p>
      </div>

      <div className="q-toolbar">
        <Select
          style={{ minWidth: 280 }}
          placeholder="Chọn đề writing"
          value={setId}
          onChange={(value) => setSetId(value)}
          options={sets.map((s) => ({
            value: s._id,
            label: `${s._id} — ${s.title}`,
          }))}
        />

        <Select
          style={{ minWidth: 220 }}
          value={partKey}
          onChange={(value) => setPartKey(value)}
          options={WRITING_PART_OPTIONS}
        />
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="Import câu hỏi Writing (JSON hoặc CSV)"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={handleImport}
        okText="Import"
        cancelText="Huỷ"
        width={800}
      >
        <p style={{ marginBottom: 8 }}>Bạn có thể dán:</p>
        <ul style={{ paddingLeft: 20, fontSize: 13, marginBottom: 8 }}>
          <li>
            JSON:{" "}
            <code>[&#123; number, prompt, subPrompt, imageUrl &#125;, ...]</code>
          </li>
          <li>
            Hoặc CSV (mỗi dòng):{" "}
            <code>number;prompt;subPrompt;imageUrl</code>
          </li>
        </ul>

        <pre
          style={{
            background: "#f3f4f6",
            padding: 8,
            fontSize: 12,
            marginBottom: 10,
          }}
        >{`Ví dụ CSV:
1;Write a sentence based on the picture.;Word pair: box/very;
2;Write a sentence based on the picture.;Word pair: house/front;`}</pre>

        {/* chọn part sẽ import vào */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 13, marginRight: 8 }}>
            Import vào part:
          </span>
          <Select
            style={{ minWidth: 240 }}
            value={importPartKey}
            onChange={(v) => setImportPartKey(v)}
            options={WRITING_PART_OPTIONS}
          />
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

export default ToeicWritingQuestionsAdmin;
