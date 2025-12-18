import "./practiceDetail.css";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ClockCircleOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import { Button, message } from "antd";
import {
  getToeicSet,
  createToeicAttempt,
  getToeicLastResult,
} from "../../utils/toeicApi";

const PracticeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const navResult = location.state?.lastResult || null;

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState([]);
  const [limit, setLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [lastResult, setLastResult] = useState(navResult);
  const [lastAttemptLocal, setLastAttemptLocal] = useState(null);

  const [msgApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const raw = localStorage.getItem("pq_last_attempt");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setLastAttemptLocal(parsed);
    } catch (e) {
      console.error("parse pq_last_attempt failed", e);
    }
  }, []);

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

  const selectedProgress = useMemo(() => {
    const total = test?.parts?.length || 0;
    const count = selected.length;
    const percent = total === 0 ? 0 : Math.round((count / total) * 100);
    return { total, count, percent };
  }, [selected, test]);

  const handleStartPractice = async () => {
    if (!test) return;
    if (selected.length === 0) {
      msgApi.warning("Chọn ít nhất 1 phần thi để luyện tập nha!");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        selectedParts: selected,
        timeLimitSec: limit ? Number(limit) * 60 : null,
      };

      const res = await createToeicAttempt(test.id, payload);

      if (!res.ok) {
        msgApi.error(res.msg || "Không tạo được bài luyện tập");
        return;
      }

      msgApi.success("Tạo bài luyện tập thành công, bắt đầu thôi!");
      localStorage.setItem(
        "pq_last_attempt",
        JSON.stringify({
          attemptId: res.attemptId,
          setId: test.id,
          setTitle: test.title,
          mode: "practice",
          createdAt: new Date().toISOString(),
        })
      );
      navigate(`/attempt/${res.attemptId}`);
    } catch (err) {
      console.error("createAttempt error:", err);
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.msg;

      if (status === 401) {
        msgApi.warning(serverMsg || "Bạn cần đăng nhập để luyện đề");
      } else {
        msgApi.error(serverMsg || "Không tạo được bài luyện, thử lại sau");
      }
    } finally {
      setSubmitting(false);
    }
  };

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
        timeLimitSec: test.durationSec || null,
      };

      const res = await createToeicAttempt(test.id, payload);

      if (!res.ok) {
        msgApi.error(res.msg || "Không tạo được full test");
        return;
      }

      msgApi.success("Full test đã sẵn sàng, cố lên!");
      localStorage.setItem(
        "pq_last_attempt",
        JSON.stringify({
          attemptId: res.attemptId,
          setId: test.id,
          setTitle: test.title,
          mode: "full",
          createdAt: new Date().toISOString(),
        })
      );
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

  if (!id) {
    return (
      <div className="detail-page">
        {contextHolder}
        <p>Đường dẫn không hợp lệ (thiếu mã đề?).</p>
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

      <Button className="btn-back" htmlType="button" onClick={() => navigate(-1)}>
        {"<"} Quay lại
      </Button>

      <div className="detail-hero-card">
        <div>
          <div className="chip">#TOEIC</div>
          <h1 className="title">{test.title}</h1>
          <p className="hero-note">
            Luyện theo part hoặc làm full test với thời gian chuẩn, điểm sẽ lưu về dashboard
            của bạn.
          </p>

          <div className="hero-meta">
            <span>
              <ClockCircleOutlined /> Thời gian: {minutes} phút
            </span>
            <span>|</span>
            <span>
              <FileTextOutlined /> {test.parts?.length || 0} phần thi
            </span>
            <span>|</span>
            <span>
              <CheckSquareOutlined /> {test.totalQuestions} câu hỏi
            </span>
          </div>
        </div>

        <div className="hero-side">
          <div className="info-block">
            <div className="info-label">Tổng quan</div>
            <div className="info-row">
              <span>Thời lượng</span>
              <strong>{minutes} phút</strong>
            </div>
            <div className="info-row">
              <span>Part</span>
              <strong>{test.parts?.length || 0}</strong>
            </div>
            <div className="info-row">
              <span>Tổng câu</span>
              <strong>{test.totalQuestions}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-left">
          {lastAttemptLocal?.setId === test.id && (
            <div className="resume-card">
              <div>
                <div className="resume-title">Bạn còn dang dở một lần làm</div>
                <div className="resume-sub">Đề: {lastAttemptLocal.setTitle || test.title}</div>
              </div>
              <Button
                type="primary"
                className="resume-btn"
                onClick={() => navigate(`/attempt/${lastAttemptLocal.attemptId}`)}
              >
                Tiếp tục
              </Button>
            </div>
          )}

          {lastResult && lastResult.setId === test.id && (
            <div className="result-card">
              <div className="result-header">
                <div>
                  <p className="sub">Kết quả gần nhất</p>
                  <h3>{lastResult.scorePercent}%</h3>
                </div>
                <div className="score-box">
                  <div>Đúng</div>
                  <strong>
                    {lastResult.scoreRaw}/
                    {lastResult.totalQuestions || test.totalQuestions}
                  </strong>
                </div>
              </div>

              {Array.isArray(lastResult.scoreByPart) && (
                <div className="result-parts">
                  {lastResult.scoreByPart.map((p) => (
                    <span key={p.partKey} className="part-badge">
                      {p.partKey.toUpperCase()}: {p.correct}/{p.total}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="tags-block">
            <div className="label">Tags</div>
            <div className="tag-row">
              {(test.parts || [])
                .flatMap((p) => p.tags || [])
                .slice(0, 20)
                .map((tag) => (
                  <span key={tag} className="tag">
                    #{tag}
                  </span>
                ))}
            </div>
          </div>
        </div>

        <div className="detail-right">
          <div className="panel action-card">
            <div className="panel-title">Luyện theo part</div>
            <p className="muted">
              Chọn part muốn luyện, đặt thời gian (tuỳ chọn) và bắt đầu.
            </p>

            <div className="progress">
              <div className="progress-head">
                <span>
                  Đã chọn {selectedProgress.count}/{selectedProgress.total} part
                </span>
                <span>{selectedProgress.percent}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${selectedProgress.percent}%` }}
                />
              </div>
            </div>

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
                      {p.name} <span className="count">({p.questions} câu)</span>
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
                Giới hạn thời gian <span className="hint">(để trống = không giới hạn)</span>
              </div>
              <select className="time-select" value={limit} onChange={(e) => setLimit(e.target.value)}>
                <option value="">-- Chọn thời gian --</option>
                <option value="15">15 phút</option>
                <option value="30">30 phút</option>
                <option value="45">45 phút</option>
                <option value="60">60 phút</option>
                <option value="90">90 phút</option>
                <option value="120">120 phút</option>
              </select>
            </div>

            <Button className="btn-start" block onClick={handleStartPractice} loading={submitting}>
              {submitting ? "Đang tạo bài luyện..." : "Luyện theo part"}
            </Button>
          </div>

          <div className="panel action-card full-card">
            <div className="panel-title">Full test</div>
            <p className="muted">
              Làm {test.parts?.length || 0} part ({test.totalQuestions} câu) trong {minutes} phút
              theo thời gian chuẩn. Điểm lưu vào dashboard.
            </p>

            <ul className="bullet">
              <li>Listening: Parts 1-4 (audio + hình).</li>
              <li>Reading: Parts 5-7.</li>
              <li>Một bộ thời gian chung cho toàn bài.</li>
            </ul>

            <Button
              type="primary"
              className="btn-start"
              block
              onClick={handleStartFullTest}
              loading={submitting}
            >
              {submitting ? "Đang tạo full test..." : "Bắt đầu full test"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeDetail;
