// client/src/routes/toeic/AttemptPage.jsx
import "./attemptPage.css";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message, Radio, Button, Modal } from "antd";
import {
  getToeicAttempt,
  getToeicQuestions,
  submitToeicAttempt,
} from "../../utils/toeicApi";

const API_BASE =
  import.meta.env.VITE_API_ENDPOINT || "http://localhost:11111";

const resolveMediaUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
};

const PART_LABELS = {
  p1: "Part 1",
  p2: "Part 2",
  p3: "Part 3",
  p4: "Part 4",
  p5: "Part 5",
  p6: "Part 6",
  p7: "Part 7",
};

const PART_ORDER = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
const READING_PARTS = ["p6", "p7"];

const getPassageKey = (q) => {
  if (q.passageId) return `${q.partKey}::${q.passageId}`;
  return `${q.partKey}::single-${q.id}`;
};

const AttemptPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [msgApi, contextHolder] = message.useMessage();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [meta, setMeta] = useState(null);

  // answers: { questionId: "A" }
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // timer
  const [leftSec, setLeftSec] = useState(null);

  // chọn part bên trong bài (giống Study4)
  const [activePart, setActivePart] = useState(null);

  // nút lên đầu trang
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ===== LOAD ATTEMPT + QUESTIONS =====
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);

        const at = await getToeicAttempt(attemptId);
        if (!alive) return;

        setMeta(at);

        if (at.timeLimitSec) {
          setLeftSec(at.timeLimitSec);
        } else {
          setLeftSec(null);
        }

        const partKeys = at.selectedParts || [];
        const promises = partKeys.map((p) => getToeicQuestions(at.setId, p));
        const results = await Promise.all(promises);

        if (!alive) return;

        const allQs = [];
        results.forEach((arr) => {
          if (Array.isArray(arr)) allQs.push(...arr);
        });

        allQs.sort((a, b) => (a.number || 0) - (b.number || 0));
        setQuestions(allQs);

        // set activePart mặc định: ưu tiên Part 1..7 theo thứ tự, nhưng chỉ trong selectedParts
        const candidate =
          at.selectedParts?.find((pk) => PART_ORDER.includes(pk)) || null;
        setActivePart(candidate);
      } catch (err) {
        console.error("load attempt error:", err);
        if (alive) msgApi.error("Không tải được thông tin bài luyện");
      } finally {
        if (alive) setLoading(false);
      }
    };

    if (attemptId) load();
    return () => {
      alive = false;
    };
  }, [attemptId, msgApi]);

  // ===== COUNTDOWN TIMER =====
  useEffect(() => {
    if (leftSec == null || leftSec <= 0) return;
    const id = setInterval(() => {
      setLeftSec((prev) => {
        if (prev == null) return null;
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [leftSec]);

  const formatTime = (sec) => {
    if (sec == null) return "∞";
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ===== ANSWERS =====
  const onSelectAnswer = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const answeredCount = useMemo(
    () => Object.keys(answers).filter((k) => !!answers[k]).length,
    [answers]
  );

  // Hỏi theo part đang chọn
  const questionsByPart = useMemo(() => {
    const map = {};
    questions.forEach((q) => {
      if (!map[q.partKey]) map[q.partKey] = [];
      map[q.partKey].push(q);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => (a.number || 0) - (b.number || 0))
    );
    return map;
  }, [questions]);

  const visibleQuestions = useMemo(() => {
    if (!activePart) return questions;
    return questionsByPart[activePart] || [];
  }, [questions, questionsByPart, activePart]);

  const answeredInPart = useMemo(() => {
    return visibleQuestions.filter((q) => !!answers[q.id]).length;
  }, [visibleQuestions, answers]);

  // GROUP đoạn văn cho P6–P7 dựa trên visibleQuestions
  const readingGroups = useMemo(() => {
    if (!activePart || !READING_PARTS.includes(activePart)) return [];

    const map = new Map();
    visibleQuestions.forEach((q) => {
      const key = getPassageKey(q);
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          partKey: q.partKey,
          firstNumber: q.number,
          lastNumber: q.number,
          imageUrl: q.imageUrl || null,
          passageText: q.passageText || "",
        };
        map.set(key, g);
      }
      g.lastNumber = Math.max(g.lastNumber || q.number, q.number);
      if (!g.imageUrl && q.imageUrl) g.imageUrl = q.imageUrl;
      if (!g.passageText && q.passageText) g.passageText = q.passageText;
    });

    return Array.from(map.values()).sort(
      (a, b) => (a.firstNumber || 0) - (b.firstNumber || 0)
    );
  }, [visibleQuestions, activePart]);

  const isReadingLayout =
    activePart && READING_PARTS.includes(activePart) && readingGroups.length;

  const isFullTest = (meta?.selectedParts || []).length >= 7;

  // ===== SUBMIT =====
const doSubmit = async () => {
  try {
    setSubmitting(true);
    const payloadAnswers = questions
      .map((q) => ({
        questionId: q.id,
        selectedOption: answers[q.id] || null,
      }))
      .filter((a) => !!a.selectedOption);

    const res = await submitToeicAttempt(attemptId, payloadAnswers);
    if (!res?.ok) {
      msgApi.error(res?.msg || "Nộp bài thất bại");
      return;
    }

    const d = res.data; // server trả về data trong submitAttempt

    msgApi.success("Nộp bài thành công!");

    // 🚀 ĐI TỚI TRANG RESULT THAY VÌ /practice/:setId
    navigate(`/attempt/${d.attemptId}/result`, {
      state: {
        resultData: {
          attemptId: d.attemptId,
          setId: d.setId,
          setTitle: meta?.setTitle,
          mode: d.mode,
          selectedParts: d.selectedParts,
          totalQuestions: d.totalQuestions,
          totalCorrect: d.totalCorrect,
          scorePercent: d.scorePercent,
          scoreByPart: d.scoreByPart,
        },
      },
    });
  } catch (err) {
    console.error("submit attempt error:", err);
    msgApi.error("Không nộp được bài, thử lại sau");
  } finally {
    setSubmitting(false);
  }
};

  const handleSubmit = () => {
    if (!questions.length) return;
    Modal.confirm({
      title: "Nộp bài?",
      content: "Sau khi nộp sẽ không chỉnh sửa được đáp án.",
      okText: "Nộp bài",
      cancelText: "Hủy",
      onOk: () => doSubmit(), // ✅ chỉ gọi doSubmit ở đây
    });
  };

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="attempt-page">
        {contextHolder}
        <p>Đang tải bài luyện...</p>
      </div>
    );
  }

  if (!questions.length) {
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
        <p>Không có câu hỏi nào trong bài luyện này.</p>
      </div>
    );
  }

  return (
    <div className="attempt-page">
      {contextHolder}

      {/* nút quay lại */}
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
          <h1 className="attempt-title">Bài luyện TOEIC</h1>

          {meta && (
            <p className="attempt-meta">
              Đề: <b>{meta.setTitle}</b> · Chế độ:{" "}
              <b>{isFullTest ? "Full test (7 parts)" : "Luyện theo part"}</b> ·
              Part: {meta.selectedParts?.join(", ")} · Thời gian:{" "}
              {meta.timeLimitSec
                ? `${Math.round(meta.timeLimitSec / 60)} phút`
                : "Không giới hạn"}
            </p>
          )}

          <p className="attempt-meta">
            Đã trả lời (tổng): {answeredCount}/{questions.length} câu
          </p>
          {activePart && (
            <p className="attempt-meta">
              Đang xem <b>{PART_LABELS[activePart]}</b> – Đã trả lời:{" "}
              {answeredInPart}/{visibleQuestions.length} câu
            </p>
          )}
        </div>

        <div className="attempt-timer">
          <div className="attempt-timer-label">Thời gian còn lại</div>
          <div className="timer-box">{formatTime(leftSec)}</div>
        </div>
      </div>

      {/* PART TABS (giống Study4) */}
      <div className="attempt-part-tabs">
        {(meta?.selectedParts || []).map((pk) => (
          <button
            key={pk}
            type="button"
            className={
              "part-tab-btn" + (pk === activePart ? " part-tab-btn--active" : "")
            }
            onClick={() => {
              setActivePart(pk);
              scrollToTop();
            }}
          >
            {PART_LABELS[pk] || pk.toUpperCase()}
          </button>
        ))}
      </div>

      {/* LAYOUT */}
      <div className="attempt-layout">
        {isReadingLayout ? (
          <>
            {/* MAIN: 2 khung – trái ảnh, phải câu hỏi */}
            <div className="attempt-reading-main">
              {/* LEFT: PASSAGES (images) */}
              <div className="reading-passages-panel">
                <h3 className="panel-title">Đoạn văn</h3>
                {readingGroups.map((g) => (
                  <div
                    key={g.key}
                    id={`passage-${g.key}`}
                    className="reading-passage-card"
                  >
                    <div className="passage-header">
                      <span className="badge">
                        {PART_LABELS[g.partKey]} · Câu {g.firstNumber}
                        {g.lastNumber && g.lastNumber !== g.firstNumber
                          ? `–${g.lastNumber}`
                          : ""}
                      </span>
                    </div>

                    {g.imageUrl && (
                      <div className="passage-image-wrap">
                        <img
                          src={resolveMediaUrl(g.imageUrl)}
                          alt="Passage"
                          className="passage-image"
                        />
                      </div>
                    )}

                    {!g.imageUrl && g.passageText && (
                      <p
                        className="passage-text"
                        style={{ whiteSpace: "pre-line" }}
                      >
                        {g.passageText}
                      </p>
                    )}

                    {!g.imageUrl && !g.passageText && (
                      <p className="hint-text">
                        Chưa có nội dung đoạn văn (imageUrl/passageText).
                      </p>
                    )}
                  </div>
                ))}

                {!readingGroups.length && (
                  <p className="hint-text">
                    Không tìm thấy đoạn văn cho part này.
                  </p>
                )}
              </div>

              {/* RIGHT: QUESTIONS */}
              <div className="reading-questions-panel">
                <ol className="attempt-question-list">
                  {visibleQuestions.map((q, index) => {
                    const labelNumber = q.number ?? index + 1;
                    const passageKey = getPassageKey(q);

                    return (
                      <li
                        key={q.id}
                        id={`q-${q.id}`}
                        className="attempt-question"
                      >
                        <div className="q-header">
                          <b>
                            Câu {labelNumber}: ({q.partKey?.toUpperCase()})
                          </b>

                          {q.passageId && (
                            <button
                              type="button"
                              className="btn-link-small"
                              onClick={() => {
                                const el = document.getElementById(
                                  `passage-${passageKey}`
                                );
                                if (el) {
                                  el.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                                }
                              }}
                            >
                              Xem đoạn văn
                            </button>
                          )}
                        </div>

                        {q.questionText && (
                          <div className="q-text">{q.questionText}</div>
                        )}

                        <Radio.Group
                          value={answers[q.id]}
                          onChange={(e) =>
                            onSelectAnswer(q.id, e.target.value)
                          }
                          className="q-options"
                        >
                          {q.choices?.map((c) => (
                            <Radio
                              key={c.label}
                              value={c.label}
                              className="q-option"
                            >
                              <b>{c.label}.</b> {c.text}
                            </Radio>
                          ))}
                        </Radio.Group>
                      </li>
                    );
                  })}
                </ol>

                <div className="attempt-actions attempt-actions--bottom-mobile">
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleSubmit}
                    loading={submitting}
                    block
                  >
                    {submitting ? "Đang nộp..." : "Nộp bài"}
                  </Button>
                </div>
              </div>
            </div>

            {/* SIDEBAR */}
            <aside className="attempt-sidebar">
              <div className="attempt-sidebar-card">
                <div className="sidebar-section">
                  <div className="sidebar-title">Thời gian còn lại</div>
                  <div className="sidebar-timer">{formatTime(leftSec)}</div>
                  {meta?.timeLimitSec && (
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
                  {activePart && (
                    <div className="sidebar-sub">
                      Trong {PART_LABELS[activePart]}:{" "}
                      <b>
                        {answeredInPart}/{visibleQuestions.length}
                      </b>
                    </div>
                  )}
                </div>

                <div className="sidebar-submit-btn">
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleSubmit}
                    loading={submitting}
                    block
                  >
                    {submitting ? "Đang nộp..." : "Nộp bài"}
                  </Button>
                </div>

                <div className="sidebar-questions">
                  <div className="sidebar-questions-title">
                    Câu hỏi ({PART_LABELS[activePart]})
                  </div>
                  <div className="sidebar-questions-grid">
                    {visibleQuestions.map((q, idx) => {
                      const isAnswered = !!answers[q.id];
                      const label = q.number ?? idx + 1;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          className={
                            "sidebar-q-item" +
                            (isAnswered ? " answered" : "")
                          }
                          onClick={() => {
                            const el = document.getElementById(`q-${q.id}`);
                            if (el) {
                              el.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="sidebar-note">
                  Nhấn vào số câu để nhảy nhanh tới câu đó.
                  Hãy kiểm tra lại lần cuối trước khi bấm <b>Nộp bài</b>.
                </div>
              </div>
            </aside>
          </>
        ) : (
          <>
            {/* Layout cũ: 1 cột câu hỏi (Listening, Part 5, ...) */}
            <div className="attempt-main">
              <ol className="attempt-question-list">
                {visibleQuestions.map((q, index) => {
                  const labelNumber = q.number ?? index + 1;

                  return (
                    <li
                      key={q.id}
                      id={`q-${q.id}`}
                      className="attempt-question"
                    >
                      <div className="q-header">
                        <b>
                          Câu {labelNumber}: ({q.partKey?.toUpperCase()})
                        </b>
                      </div>

                      {/* IMAGE – Part 1 */}
                      {q.imageUrl && q.partKey === "p1" && (
                        <div className="q-media">
                          <img
                            src={resolveMediaUrl(q.imageUrl)}
                            alt={`Question ${labelNumber}`}
                            className="q-image"
                          />
                        </div>
                      )}

                      {/* AUDIO – parts 1–4 */}
                      {q.audioUrl &&
                        ["p1", "p2", "p3", "p4"].includes(q.partKey) && (
                          <div className="q-media">
                            <audio
                              controls
                              className="q-audio"
                              src={resolveMediaUrl(q.audioUrl)}
                            >
                              Trình duyệt không hỗ trợ audio.
                            </audio>
                          </div>
                        )}

                      {/* TEXT */}
                      {/* Hide question text for Part 1 & 2 */}
                      {q.questionText && !["p1", "p2"].includes(q.partKey) && (
                        <div className="q-text">{q.questionText}</div>
                      )}

                      {/* OPTIONS */}
                      <Radio.Group
                        value={answers[q.id]}
                        onChange={(e) =>
                          onSelectAnswer(q.id, e.target.value)
                        }
                        className="q-options"
                      >
                        {q.choices?.map((c) => (
                          <Radio
                            key={c.label}
                            value={c.label}
                            className="q-option"
                          >
                            <b>{c.label}.</b>{" "}
                            {["p1", "p2"].includes(q.partKey) ? "" : c.text}
                          </Radio>
                        ))}
                      </Radio.Group>
                    </li>
                  );
                })}
              </ol>

              <div className="attempt-actions attempt-actions--bottom-mobile">
                <Button
                  type="primary"
                  size="large"
                  onClick={handleSubmit}
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
                  {meta?.timeLimitSec && (
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
                  {activePart && (
                    <div className="sidebar-sub">
                      Trong {PART_LABELS[activePart]}:{" "}
                      <b>
                        {answeredInPart}/{visibleQuestions.length}
                      </b>
                    </div>
                  )}
                </div>

                <div className="sidebar-submit-btn">
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleSubmit}
                    loading={submitting}
                    block
                  >
                    {submitting ? "Đang nộp..." : "Nộp bài"}
                  </Button>
                </div>

                <div className="sidebar-questions">
                  <div className="sidebar-questions-title">
                    Câu hỏi ({activePart ? PART_LABELS[activePart] : "Tất cả"})
                  </div>
                  <div className="sidebar-questions-grid">
                    {visibleQuestions.map((q, idx) => {
                      const isAnswered = !!answers[q.id];
                      const label = q.number ?? idx + 1;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          className={
                            "sidebar-q-item" +
                            (isAnswered ? " answered" : "")
                          }
                          onClick={() => {
                            const el = document.getElementById(`q-${q.id}`);
                            if (el) {
                              el.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="sidebar-note">
                  Nhấn vào số câu để nhảy nhanh tới câu đó.
                  Hãy kiểm tra lại lần cuối trước khi bấm <b>Nộp bài</b>.
                </div>
              </div>
            </aside>
          </>
        )}
      </div>

      {showScrollTop && (
        <button
          type="button"
          className="scroll-top-btn"
          onClick={scrollToTop}
        >
          ↑ Lên đầu
        </button>
      )}
    </div>
  );
};

export default AttemptPage;
