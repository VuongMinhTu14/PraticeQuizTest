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
  getToeicLastResult, // 🔹 API lấy lần làm gần nhất
} from "../../utils/toeicApi";

const PracticeDetail = () => {
  const { id } = useParams(); // /practice/:id  (setId)
  const navigate = useNavigate();
  const location = useLocation();

  // kết quả vừa làm xong nếu được redirect từ AttemptPage
  const navResult = location.state?.lastResult || null;

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]); // list key part
  const [limit, setLimit] = useState(""); // phút, '' = không giới hạn
  const [submitting, setSubmitting] = useState(false);

  // kết quả gần nhất (ưu tiên lấy từ navResult, nếu F5 / vào lại thì lấy từ BE)
  const [lastResult, setLastResult] = useState(navResult);

  const [msgApi, contextHolder] = message.useMessage();

  // ===== LOAD CHI TIẾT ĐỀ =====
  useEffect(() => {
    if (!id) return; // URL lỗi

    let alive = true;
    setLoading(true);

    getToeicSet(id)
      .then((data) => {
        if (!alive) return;
        setTest(data);
        setSelected([]); // reset lựa chọn part
      })
      .catch((err) => {
        console.error("getToeicSet error:", err);
        if (alive) {
          msgApi.error("Không tải được thông tin đề thi TOEIC");
        }
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

    // nếu vừa submit xong navigate về thì đã có navResult
    if (navResult) {
      setLastResult(navResult);
      return;
    }

    // nếu không có navResult (F5 / vào lại từ menu) thì hỏi backend
    const fetchLast = async () => {
      try {
        const res = await getToeicLastResult(id); // { ok, data }
        if (!alive) return;

        if (res.ok && res.data) {
          setLastResult(res.data);
        } else {
          setLastResult(null);
        }
      } catch (err) {
        console.error("getToeicLastResult error:", err);
        // im lặng, không hiển thị cũng được
      }
    };

    if (id) {
      fetchLast();
    }

    return () => {
      alive = false;
    };
  }, [id, navResult]);

  const togglePart = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // ===== BẮT ĐẦU LÀM BÀI =====
  const handleStart = async () => {
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

      {/* KẾT QUẢ GẦN NHẤT CỦA ĐỀ NÀY (NẾU CÓ) */}
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

      {/* HEADER ĐỀ */}
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
          Chế độ <b>Luyện tập</b> cho phép chọn part và giới hạn thời gian tuỳ ý.
          Sau này sẽ có thêm chế độ <b>Làm full test</b> để quy đổi sang điểm TOEIC
          chính xác hơn.
        </div>
      </div>

      {/* TABS (mới chỉ active tab Luyện tập) */}
      <div className="tabs">
        <button className="tab active">Luyện tập</button>
        <button className="tab" disabled>
          Full test (sắp ra mắt)
        </button>
        <button className="tab" disabled>
          Thảo luận
        </button>
      </div>

      {/* CHỌN PART + GIỚI HẠN THỜI GIAN */}
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
          onClick={handleStart}
          disabled={submitting}
        >
          {submitting ? "Đang tạo bài luyện..." : "Luyện tập"}
        </button>
      </div>
    </div>
  );
};

export default PracticeDetail;
