// src/routes/attempt/attemptWritingPage.jsx
import "./attemptPage.css";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message, Button, Modal, Input } from "antd";
import {
  getWritingAttempt,
  submitWritingAttempt,
  getWritingQuestionsOfSet,
} from "../../utils/toeicApi";

const { TextArea } = Input;

const PART_LABELS = {
  w1_5: "Questions 1–5",
  w6_7: "Questions 6–7",
  w8: "Question 8",
};

const API_BASE =
  import.meta.env.VITE_API_ENDPOINT || "http://localhost:11111";
const resolveMediaUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

const AttemptWritingPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [msgApi, contextHolder] = message.useMessage();

  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: text }

  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [leftSec, setLeftSec] = useState(null);

    useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);

        // 1) Lấy meta attempt
        const at = await getWritingAttempt(attemptId);
        if (!alive) return;
        setMeta(at);

        // 2) Lấy toàn bộ câu hỏi của đề
        const allQuestions = await getWritingQuestionsOfSet(at.setId);
        if (!alive) return;

        // Nếu có selectedParts thì lọc theo, còn không thì lấy hết 8 câu
        let filtered = allQuestions;
        if (Array.isArray(at.selectedParts) && at.selectedParts.length) {
          const allow = new Set(at.selectedParts);
          filtered = allQuestions.filter((q) => allow.has(q.partKey));
        }

        setQuestions(filtered);

        // 3) Khởi tạo câu trả lời (nếu BE có lưu answers thì map lại, còn không bỏ qua)
        const initAnswers = {};
        if (Array.isArray(at.answers)) {
          at.answers.forEach((a) => {
            if (a.questionId && typeof a.answerText === "string") {
              initAnswers[a.questionId] = a.answerText;
            }
          });
        }
        setAnswers(initAnswers);

        // 4) Câu active đầu tiên
        if (filtered.length) {
          setActiveQuestionId(filtered[0].id);
        }

        // 5) Thời gian
        if (at.timeLimitSec) setLeftSec(at.timeLimitSec);
        else setLeftSec(null);
      } catch (err) {
        console.error("getWritingAttempt error:", err);
        msgApi.error("Không tải được bài TOEIC Writing");
      } finally {
        if (alive) setLoading(false);
      }
    };

    if (attemptId) load();
    return () => {
      alive = false;
    };
  }, [attemptId, msgApi]);


  // timer
  useEffect(() => {
    if (leftSec == null || leftSec <= 0) return;
    const id = setInterval(() => {
      setLeftSec((prev) => {
        if (prev == null) return null;
        if (prev <= 1) {
          clearInterval(id);
          Modal.warning({
            title: "Hết giờ",
            content: "Thời gian đã hết, hệ thống sẽ tự động nộp bài.",
            onOk: () => handleSubmit(true),
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftSec]);

  const formatTime = (sec) => {
    if (sec == null) return "∞";
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const activeQuestion = useMemo(
    () => questions.find((q) => q.id === activeQuestionId),
    [questions, activeQuestionId]
  );

  const handleChangeAnswer = (qId, value) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const answeredCount = useMemo(
    () =>
      questions.filter((q) => (answers[q.id] || "").trim().length > 0).length,
    [questions, answers]
  );

  // group theo phần (w1_5, w6_7, w8)
  const questionsByPart = useMemo(() => {
    const map = {};
    questions.forEach((q) => {
      const key = q.partKey || "w1_5";
      if (!map[key]) map[key] = [];
      map[key].push(q);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => (a.number || 0) - (b.number || 0))
    );
    return map;
  }, [questions]);

  const handleSubmit = async (auto = false) => {
    if (submitting) return;

    if (!auto) {
      const confirm = await new Promise((resolve) => {
        Modal.confirm({
          title: "Nộp bài TOEIC Writing?",
          content:
            "Sau khi nộp, bạn sẽ không thể chỉnh sửa câu trả lời nữa.",
          okText: "Nộp bài",
          cancelText: "Hủy",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirm) return;
    }

    try {
      setSubmitting(true);
      const payloadAnswers = questions.map((q) => ({
        questionId: q.id,
        answerText: answers[q.id] || "",
      }));

      const res = await submitWritingAttempt(attemptId, payloadAnswers);
      if (!res.ok) {
        msgApi.error(res.msg || "Nộp bài Writing thất bại");
        setSubmitting(false);
        return;
      }

      msgApi.success("Đã nộp bài, AI đang chấm!");

      navigate(`/practice/writing/${meta.setId}`, {
        state: { lastWritingResult: res.data, fromAttemptId: attemptId },
      });
    } catch (err) {
      console.error("submitWritingAttempt error:", err);
      msgApi.error("Có lỗi khi nộp bài, thử lại sau");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="attempt-page">
        {contextHolder}
        <p>Đang tải bài TOEIC Writing...</p>
      </div>
    );
  }

  if (!meta || !questions.length) {
    return (
      <div className="attempt-page">
        {contextHolder}
        <button
          type="button"
          className="btn-back"
          onClick={() => navigate(-1)}
        >
          ← Quay lại
        </button>
        <p>Không tìm thấy nội dung bài viết.</p>
      </div>
    );
  }

  return (
    <div className="attempt-page">
      {contextHolder}

      <button
        type="button"
        className="btn-back"
        onClick={() => navigate(-1)}
      >
        ← Quay lại
      </button>

      {/* HEADER */}
      <div className="attempt-header">
        <div>
          <h1 className="attempt-title">Bài luyện TOEIC Writing</h1>
          <p className="attempt-meta">
            Đề: <b>{meta.setTitle}</b> · Chế độ:{" "}
            <b>{meta.mode === "full" ? "Full test" : "Luyện theo phần"}</b> ·
            Thời gian:{" "}
            {meta.timeLimitSec
              ? `${Math.round(meta.timeLimitSec / 60)} phút`
              : "Không giới hạn"}
          </p>
          <p className="attempt-meta">
            Đã trả lời: {answeredCount}/{questions.length} câu
          </p>
        </div>

        <div className="attempt-timer">
          <div className="attempt-timer-label">Thời gian còn lại</div>
          <div className="timer-box">{formatTime(leftSec)}</div>
        </div>
      </div>

      {/* BODY LAYOUT */}
      <div className="attempt-layout">
        {/* MAIN LEFT */}
        <div className="attempt-main">
          {activeQuestion && (
            <div className="attempt-question">
              <div className="q-header">
                <b>
                  Question {activeQuestion.number} (
                  {PART_LABELS[activeQuestion.partKey] ||
                    activeQuestion.partKey}
                  )
                </b>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.2fr)",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                {/* left: prompt + image */}
                <div>
                  {activeQuestion.imageUrl && (
                    <div className="q-media">
                      <img
                        src={resolveMediaUrl(activeQuestion.imageUrl)}
                        alt="Writing prompt"
                        className="q-image"
                      />
                    </div>
                  )}

                  <div className="q-text">
                    {activeQuestion.wordPair && (
                      <p>
                        <b>Word Pair: </b>
                        {activeQuestion.wordPair}
                      </p>
                    )}

                    <p>{activeQuestion.prompt}</p>

                    {activeQuestion.extraText && (
                      <p style={{ marginTop: 8, fontStyle: "italic" }}>
                        {activeQuestion.extraText}
                      </p>
                    )}
                  </div>
                </div>

                {/* right: textarea */}
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      marginBottom: 4,
                      color: "#6b7280",
                    }}
                  >
                    Viết câu trả lời của bạn:
                    {activeQuestion.minWords || activeQuestion.maxWords ? (
                      <>
                        {" "}
                        (khoảng{" "}
                        {activeQuestion.minWords
                          ? `${activeQuestion.minWords}–`
                          : ""}
                        {activeQuestion.maxWords || ""} từ)
                      </>
                    ) : null}
                  </div>

                  <TextArea
                    rows={14}
                    value={answers[activeQuestion.id] || ""}
                    onChange={(e) =>
                      handleChangeAnswer(activeQuestion.id, e.target.value)
                    }
                    placeholder="Viết câu / đoạn văn tại đây..."
                  />

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      textAlign: "right",
                      color: "#6b7280",
                    }}
                  >
                    Word count:{" "}
                    {(
                      answers[activeQuestion.id] || ""
                    )
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean).length || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="attempt-actions attempt-actions--bottom-mobile">
            <Button
              type="primary"
              size="large"
              onClick={() => handleSubmit(false)}
              loading={submitting}
              block
            >
              {submitting ? "Đang nộp..." : "Nộp bài"}
            </Button>
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="attempt-sidebar">
          <div className="attempt-sidebar-card">
            <div className="sidebar-section">
              <div className="sidebar-title">Thời gian còn lại</div>
              <div className="sidebar-timer">{formatTime(leftSec)}</div>
              {meta.timeLimitSec && (
                <div className="sidebar-sub">
                  Giới hạn: {Math.round(meta.timeLimitSec / 60)} phút
                </div>
              )}
            </div>

            <div className="sidebar-section">
              <div className="sidebar-title">Tiến độ</div>
              <div className="sidebar-sub">
                Đã trả lời:{" "}
                <b>
                  {answeredCount}/{questions.length}
                </b>
              </div>
            </div>

            <div className="sidebar-submit-btn">
              <Button
                type="primary"
                size="large"
                onClick={() => handleSubmit(false)}
                loading={submitting}
                block
              >
                {submitting ? "Đang nộp..." : "Nộp bài"}
              </Button>
            </div>

            <div className="sidebar-questions">
              <div className="sidebar-questions-title">
                Questions 1–8
              </div>
              <div className="sidebar-questions-grid">
                {questions.map((q) => {
                  const isAnswered =
                    (answers[q.id] || "").trim().length > 0;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={
                        "sidebar-q-item" +
                        (isAnswered ? " answered" : "") +
                        (activeQuestionId === q.id ? " active" : "")
                      }
                      onClick={() => setActiveQuestionId(q.id)}
                    >
                      {q.number}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sidebar-note">
              Nhấn vào số câu để chuyển nhanh giữa các câu Writing. Hãy
              kiểm tra lại một lần nữa trước khi bấm <b>Nộp bài</b>.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AttemptWritingPage;
