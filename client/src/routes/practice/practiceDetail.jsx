// src/routes/practice/PracticeDetail.jsx
import "./practiceDetail.css";
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ClockCircleOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import { message } from "antd";
import {
  getToeicSet,
  createToeicAttempt,
  getToeicLastResult,
} from "../../utils/toeicApi";

const PracticeDetail = () => {
  const { id } = useParams(); // /practice/:id  (setId)
  const navigate = useNavigate();
  const location = useLocation();

  const navResult = location.state?.lastResult || null;

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  // ----- TAB -----
  // "practice" | "full"
  const [activeTab, setActiveTab] = useState("practice");

  // ----- Luyện tập theo part -----
  const [selected, setSelected] = useState([]); // list key part
  const [limit, setLimit] = useState(""); // phút, '' = không giới hạn
  const [submitting, setSubmitting] = useState(false);

  // ----- Kết quả gần nhất -----
  const [lastResult, setLastResult] = useState(navResult);

  const [msgApi, contextHolder] = message.useMessage();

  // ===== LOAD CHI TIẾT ĐỀ =====
  useEffect(() => {
    if (!id) return;

    let alive = true;
    setLoading(true);

    getToeicSet(id)
      .then((data) => {
        if (!alive) return;
        setTest(data);
        setSelected([]);
      })
      .catch((err) => {
        console.error("getToeicSet error:", err);
        if (alive) msgApi.error("Không tải được thông tin đề thi TOEIC");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id, msgApi]);

  // ===== LẤY KẾT QUẢ GẦN NHẤT =====
  useEffect(() => {
    let alive = true;

    if (navResult) {
      setLastResult(navResult);
      return;
    }

    const fetchLast = async () => {
      try {
        const res = await getToeicLastResult(id);
        if (!alive) return;

        if (res.ok && res.data) setLastResult(res.data);
        else setLastResult(null);
      } catch (err) {
        console.error("getToeicLastResult error:", err);
      }
    };

    if (id) fetchLast();

    return () => {
      alive = false;
    };
  }, [id, navResult]);

  const togglePart = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // ====== BẮT ĐẦU LÀM BÀI – CHẾ ĐỘ LUYỆN TẬP ======
  const handleStartPractice = async () => {
    if (!test) return;
    if (selected.length === 0) {
      msgApi.warning("Chọn ít nhất 1 phần thi để luyện nha!");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        selectedParts: selected,
        timeLimitSec: limit ? Number(limit) * 60 : null,
      };

      const res = await createToeicAttempt(test.id, payload); // { ok, attemptId }

      if (!res.ok) {
        msgApi.error(res.msg || "Không tạo được bài luyện tập");
        return;
      }

      msgApi.success("Tạo bài luyện tập thành công, bắt đầu nào!");
      navigate(`/attempt/${res.attemptId}`);
    } catch (err) {
      console.error("createAttempt error:", err);
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.msg;

      if (status === 401) {
        msgApi.warning(serverMsg || "Bạn cần đăng nhập để luyện đề");
      } else {
        msgApi.error(serverMsg || "Không tạo được bài luyện tập, thử lại sau");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ====== BẮT ĐẦU LÀM BÀI – CHẾ ĐỘ FULL TEST ======
  const handleStartFullTest = async () => {
    if (!test) return;

    const allParts = (test.parts || []).map((p) => p.key);
    if (allParts.length === 0) {
      msgApi.error("Đề này chưa có cấu trúc part, không thể làm full test");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        selectedParts: allParts,
        // full test thì dùng đúng thời gian chuẩn của đề
        timeLimitSec: test.durationSec || null,
      };

      const res = await createToeicAttempt(test.id, payload);

      if (!res.ok) {
        msgApi.error(res.msg || "Không tạo được full test");
        return;
      }

      msgApi.success("Full test đã sẵn sàng, cố lên nhé!");
      navigate(`/attempt/${res.attemptId}`);
    } catch (err) {
      console.error("createFullTest error:", err);
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

  // ===== RENDER =====
  if (!id) {
    return (
      <div className="detail-page">
        {contextHolder}
        <p>Đường dẫn không hợp lệ (thiếu mã đề).</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="detail-page">
        {contextHolder}
        <p>Đang tải thông tin đề thi...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="detail-page">
        {contextHolder}
        <p>Không tìm thấy đề thi TOEIC này.</p>
      </div>
    );
  }

  const minutes = Math.round((test.durationSec ?? 0) / 60);

  return (
    <div className="detail-page">
      {contextHolder}

      {/* nút quay lại */}
      <button
        type="button"
        className="btn-back"
        onClick={() => navigate(-1)}
      >
        ← Quay lại
      </button>

      {/* KẾT QUẢ GẦN NHẤT */}
      {lastResult && lastResult.setId === test.id && (
        <div className="result-latest-box">
          <div className="result-latest-title">Kết quả gần nhất của bạn</div>

          <div className="result-summary">
            Tổng:{" "}
            <b>
              {lastResult.scoreRaw}/
              {lastResult.totalQuestions || test.totalQuestions}
            </b>{" "}
            câu đúng ({lastResult.scorePercent}%)
          </div>

          {Array.isArray(lastResult.scoreByPart) && (
            <table className="result-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Đúng / Tổng</th>
                </tr>
              </thead>
              <tbody>
                {lastResult.scoreByPart.map((p) => (
                  <tr key={p.partKey}>
                    <td>
                      <span className="part-badge">
                        {p.partKey.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {p.correct}/{p.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* HEADER */}
      <div className="detail-header">
        <div className="chip">#TOEIC</div>
        <h1 className="title">{test.title}</h1>

        <div className="header-meta">
          <span>
            <ClockCircleOutlined /> Thời gian làm bài: {minutes} phút
          </span>
          <span>•</span>
          <span>
            <FileTextOutlined /> {test.parts?.length || 0} phần thi
          </span>
          <span>•</span>
          <span>
            <CheckSquareOutlined /> {test.totalQuestions} câu hỏi
          </span>
        </div>

        <div className="note">
          <b>Luyện tập</b>: chọn part, thời gian tuỳ ý.{" "}
          <br />
          <b>Full test</b>: làm đủ 7 part với thời gian chuẩn, dùng để quy đổi
          sang điểm TOEIC sát thực tế hơn.
        </div>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "practice" ? "active" : ""}`}
          onClick={() => setActiveTab("practice")}
        >
          Luyện tập
        </button>
        <button
          className={`tab ${activeTab === "full" ? "active" : ""}`}
          onClick={() => setActiveTab("full")}
        >
          Full test
        </button>
        <button className="tab" disabled>
          Thảo luận
        </button>
      </div>

      {/* PANEL THEO TAB */}
      {activeTab === "practice" && (
        <div className="panel">
          <div className="panel-title">Chọn phần thi bạn muốn làm</div>

          <div className="parts">
            {test.parts?.map((p) => (
              <label
                key={p.key}
                className={`part ${selected.includes(p.key) ? "checked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(p.key)}
                  onChange={() => togglePart(p.key)}
                />

                <div className="part-main">
                  <div className="part-title">
                    {p.name}{" "}
                    <span className="count">({p.questions} câu hỏi)</span>
                  </div>
                  <div className="tag-row">
                    {p.tags?.slice(0, 10).map((tag) => (
                      <span key={tag} className="tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="time-block">
            <div className="label">
              Giới hạn thời gian{" "}
              <span className="hint">(để trống = không giới hạn)</span>
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
              <option value="90">90 phút</option>
              <option value="120">120 phút</option>
            </select>
          </div>

          <button
            className="btn-start"
            onClick={handleStartPractice}
            disabled={submitting}
          >
            {submitting ? "Đang tạo bài luyện..." : "Luyện tập"}
          </button>
        </div>
      )}

      {activeTab === "full" && (
        <div className="panel">
          <div className="panel-title">Làm full test TOEIC</div>
          <p style={{ marginBottom: 12, fontSize: 14 }}>
            Bạn sẽ làm <b>đủ {test.parts?.length || 0} part</b> với tổng cộng{" "}
            <b>{test.totalQuestions}</b> câu hỏi trong vòng{" "}
            <b>{minutes} phút</b>. Hệ thống sẽ tính điểm tổng quát và lưu vào
            dashboard.
          </p>

          <ul style={{ fontSize: 14, marginLeft: 18, marginBottom: 16 }}>
            <li>Listening: Parts 1–4 (có audio + hình).</li>
            <li>Reading: Parts 5–7.</li>
            <li>Bạn chỉ có 1 bộ thời gian duy nhất cho toàn bài.</li>
          </ul>

          <button
            className="btn-start"
            onClick={handleStartFullTest}
            disabled={submitting}
          >
            {submitting ? "Đang tạo full test..." : "Bắt đầu full test"}
          </button>
        </div>
      )}
    </div>
  );
};

export default PracticeDetail;
