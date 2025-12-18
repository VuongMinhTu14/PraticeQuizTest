import "./practiceDetail.css";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ClockCircleOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  LeftOutlined,
} from "@ant-design/icons";
import { Button, message } from "antd";
import {
  getWritingSet,
  getWritingLastAttempt,
  createWritingAttempt,
} from "../../utils/toeicApi";

const WRITING_PARTS = [
  { key: "w1_5", name: "Questions 1-5 (Picture)" },
  { key: "w6_7", name: "Questions 6-7 (Email)" },
  { key: "w8", name: "Question 8 (Essay)" },
];

const PracticeWritingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [msgApi, contextHolder] = message.useMessage();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("practice");
  const [selectedParts, setSelectedParts] = useState([]);
  const [limit, setLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [lastAttempt, setLastAttempt] = useState(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);

    getWritingSet(id)
      .then((data) => {
        if (!alive) return;
        setTest(data);
        setSelectedParts([]);
      })
      .catch((err) => {
        console.error("getWritingSet error:", err);
        msgApi.error("Không tải được đề TOEIC Writing");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id, msgApi]);

  useEffect(() => {
    if (!id) return;
    let alive = true;

    getWritingLastAttempt(id)
      .then((data) => {
        if (!alive) return;
        setLastAttempt(data || null);
      })
      .catch((err) => {
        console.error("getWritingLastAttempt error:", err);
      });

    return () => {
      alive = false;
    };
  }, [id]);

  const togglePart = (key) => {
    setSelectedParts((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleStartPractice = async () => {
    if (!test) return;
    if (selectedParts.length === 0) {
      msgApi.warning("Chọn ít nhất 1 phần để luyện.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        selectedParts,
        timeLimitSec: limit ? Number(limit) * 60 : null,
      };

      const res = await createWritingAttempt(test.id, payload);
      if (!res.ok) {
        msgApi.error(res.msg || "Không tạo được bài Writing");
        return;
      }

      msgApi.success("Tạo bài TOEIC Writing thành công!");
      navigate(`/attempt-writing/${res.attemptId}`);
    } catch (err) {
      console.error("createWritingAttempt error:", err);
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.msg;

      if (status === 401) {
        msgApi.warning(serverMsg || "Bạn cần đăng nhập để luyện Writing");
      } else {
        msgApi.error(serverMsg || "Không tạo được bài Writing, thử lại sau");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartFull = async () => {
    if (!test) return;

    const allParts = WRITING_PARTS.map((p) => p.key);

    try {
      setSubmitting(true);
      const payload = {
        selectedParts: allParts,
        timeLimitSec: test.durationSec || null,
      };

      const res = await createWritingAttempt(test.id, payload);
      if (!res.ok) {
        msgApi.error(res.msg || "Không tạo được full Writing test");
        return;
      }

      msgApi.success("Full TOEIC Writing đã sẵn sàng!");
      navigate(`/attempt-writing/${res.attemptId}`);
    } catch (err) {
      console.error("createWritingAttempt error:", err);
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.msg;

      if (status === 401) {
        msgApi.warning(serverMsg || "Bạn cần đăng nhập để làm full test");
      } else {
        msgApi.error(serverMsg || "Không tạo được full test, thử lại sau");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!id) {
    return (
      <div className="detail-page">
        {contextHolder}
        <p>Đường dẫn không hợp lệ (thiếu mã đề writing).</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="detail-page">
        {contextHolder}
        <p>Đang tải đề TOEIC Writing...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="detail-page">
        {contextHolder}
        <p>Không tìm thấy đề TOEIC Writing này.</p>
      </div>
    );
  }

  const minutes = Math.round((test.durationSec ?? 0) / 60);

  return (
    <div className="detail-page">
      {contextHolder}

      <Button
        type="default"
        className="btn-back"
        icon={<LeftOutlined />}
        onClick={() => navigate(-1)}
      >
        Quay lại
      </Button>

      {lastAttempt && (
        <div className="result-latest-box">
          <div className="result-latest-title">Kết quả TOEIC Writing gần nhất</div>
          <div className="result-summary">
            Điểm dự đoán TOEIC Writing:{" "}
            <b>{lastAttempt.summary?.predictedToeicScore ?? "?"}</b>/200
          </div>
          <table className="result-table">
            <tbody>
              <tr>
                <td>Task achievement</td>
                <td>{lastAttempt.summary?.taskScore ?? "-"} /5</td>
              </tr>
              <tr>
                <td>Grammar</td>
                <td>{lastAttempt.summary?.grammarScore ?? "-"} /5</td>
              </tr>
              <tr>
                <td>Vocabulary</td>
                <td>{lastAttempt.summary?.vocabularyScore ?? "-"} /5</td>
              </tr>
              <tr>
                <td>Organization</td>
                <td>{lastAttempt.summary?.organizationScore ?? "-"} /5</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="detail-header">
        <div className="chip">#TOEIC Writing</div>
        <h1 className="title">{test.title}</h1>

        <div className="header-meta">
          <span>
            <ClockCircleOutlined /> Thời gian làm bài: {minutes} phút
          </span>
          <span className="meta-divider">|</span>
          <span>
            <FileTextOutlined /> 3 phần (Q1-5, Q6-7, Q8)
          </span>
          <span className="meta-divider">|</span>
          <span>
            <CheckSquareOutlined /> {test.totalQuestions ?? 8} câu hỏi
          </span>
        </div>

        <div className="note">
          <b>Luyện theo phần</b>: Chọn cụm câu (1-5, 6-7 hoặc 8) để luyện nhanh. <br />
          <b>Full test</b>: Làm đủ 8 câu để mô phỏng đề TOEIC Writing thật.
        </div>
      </div>

      <div className="tabs">
        <Button
          className={`tab-btn ${activeTab === "practice" ? "active" : ""}`}
          shape="round"
          type={activeTab === "practice" ? "primary" : "default"}
          onClick={() => setActiveTab("practice")}
        >
          Luyện theo phần
        </Button>
        <Button
          className={`tab-btn ${activeTab === "full" ? "active" : ""}`}
          shape="round"
          type={activeTab === "full" ? "primary" : "default"}
          onClick={() => setActiveTab("full")}
        >
          Full Writing Test
        </Button>
        <Button className="tab-btn" shape="round" disabled>
          Thảo luận
        </Button>
      </div>

      {activeTab === "practice" && (
        <div className="panel">
          <div className="panel-title">Chọn phần Writing muốn luyện</div>

          <div className="parts">
            {WRITING_PARTS.map((p) => (
              <label
                key={p.key}
                className={`part ${selectedParts.includes(p.key) ? "checked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedParts.includes(p.key)}
                  onChange={() => togglePart(p.key)}
                />

                <div className="part-main">
                  <div className="part-title">
                    {p.name}
                    <span className="count">
                      {p.key === "w8" ? " (1 câu essay)" : " (nhiều câu ngắn)"}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="time-block">
            <div className="label">
              Giới hạn thời gian <span className="hint">(để trống = không giới hạn)</span>
            </div>
            <select
              className="time-select"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            >
              <option value="">-- Chọn thời gian --</option>
              <option value="15">15 phút</option>
              <option value="30">30 phút</option>
              <option value="45">45 phút</option>
              <option value="60">60 phút</option>
              <option value="75">75 phút</option>
            </select>
          </div>

          <Button
            className="btn-start"
            type="primary"
            block
            onClick={handleStartPractice}
            loading={submitting}
          >
            {submitting ? "Đang tạo bài..." : "Bắt đầu luyện"}
          </Button>
        </div>
      )}

      {activeTab === "full" && (
        <div className="panel">
          <div className="panel-title">Làm full TOEIC Writing</div>
          <p style={{ fontSize: 14, marginBottom: 12 }}>
            Bạn sẽ làm đủ <b>8 câu Writing</b> trong <b>{minutes} phút</b>. Hệ thống AI sẽ chấm theo rubric
            và quy đổi ra <b>điểm TOEIC Writing (0-200)</b>.
          </p>

          <ul style={{ fontSize: 14, marginLeft: 18, marginBottom: 16 }}>
            <li>Questions 1-5: Viết câu dựa trên hình và gợi ý từ.</li>
            <li>Questions 6-7: Trả lời email công việc.</li>
            <li>Question 8: Viết opinion essay.</li>
          </ul>

          <Button
            className="btn-start"
            type="primary"
            block
            onClick={handleStartFull}
            loading={submitting}
          >
            {submitting ? "Đang tạo bài..." : "Bắt đầu full test"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PracticeWritingDetail;
