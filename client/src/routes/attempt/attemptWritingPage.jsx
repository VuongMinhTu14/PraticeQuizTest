import "./attemptWritingPage.css";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message, Button, Modal, Input } from "antd";
import {
  getWritingAttempt,
  submitWritingAttempt,
  submitWritingAttemptLlama,
  getWritingQuestionsOfSet,
} from "../../utils/toeicApi";
import { scoreWritingLocal } from "../../utils/localWritingApi";

const { TextArea } = Input;

const PART_LABELS = {
  w1_5: "Questions 1-5",
  w6_7: "Questions 6-7",
  w8: "Question 8",
};

const API_BASE = import.meta.env.VITE_API_ENDPOINT || "http://localhost:11111";
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
  const [answers, setAnswers] = useState({});
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitPanel, setSubmitPanel] = useState(null); // "sidebar" | "mobile" | null

  const [localScoring, setLocalScoring] = useState({
    loading: false,
    result: null,
    error: "",
  });

  const [leftSec, setLeftSec] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        const at = await getWritingAttempt(attemptId);
        if (!alive) return;
        setMeta(at);

        const allQuestions = await getWritingQuestionsOfSet(at.setId);
        if (!alive) return;

        let filtered = allQuestions;
        if (Array.isArray(at.selectedParts) && at.selectedParts.length) {
          const allow = new Set(at.selectedParts);
          filtered = allQuestions.filter((q) => allow.has(q.partKey));
        }
        setQuestions(filtered);

        const initAnswers = {};
        if (Array.isArray(at.answers)) {
          at.answers.forEach((a) => {
            if (a.questionId && typeof a.answerText === "string") {
              initAnswers[a.questionId] = a.answerText;
            }
          });
        }
        setAnswers(initAnswers);
        if (filtered.length) setActiveQuestionId(filtered[0].id);
        if (at.timeLimitSec) setLeftSec(at.timeLimitSec);
      } catch (err) {
        console.error("getWritingAttempt error:", err);
        msgApi.error("Không tải được bài TOEIC Writing.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    if (attemptId) load();
    return () => {
      alive = false;
    };
  }, [attemptId, msgApi]);

  useEffect(() => {
    if (leftSec == null || leftSec <= 0) return;
    const id = setInterval(() => {
      setLeftSec((prev) => {
        if (prev == null) return null;
        if (prev <= 1) {
          clearInterval(id);
          Modal.confirm({
            title: "Hết thời gian làm bài",
            content: "Thời gian đã hết, chọn cách nộp bài bạn muốn:",
            okText: "Nộp Gemini",
            cancelText: "Nộp Llama (offline)",
            onOk: () => handleSubmitGemini(true),
            onCancel: () => handleSubmitLlama(),
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
    if (sec == null) return "--:--";
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
    () => questions.filter((q) => (answers[q.id] || "").trim().length > 0).length,
    [questions, answers]
  );

  const toggleSubmitPanel = (place) => {
    setSubmitPanel((prev) => (prev === place ? null : place));
  };

  const handleSubmitGemini = async (auto = false) => {
    if (submitting) return;
    if (!auto) {
      const confirm = await new Promise((resolve) => {
        Modal.confirm({
          title: "Nộp bài TOEIC Writing (Gemini)?",
          content:
            "Sau khi nộp, bạn sẽ không chỉnh sửa được câu trả lời nữa. AI server (Gemini) sẽ chấm điểm.",
          okText: "Nộp bài Gemini",
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
        msgApi.error(res.msg || "Nộp bài Writing thất bại.");
        setSubmitting(false);
        return;
      }
      msgApi.success("Đã nộp bài, AI Gemini đang chấm!");
      navigate(`/practice/writing/${meta.setId}`, {
        state: { lastWritingResult: res.data, fromAttemptId: attemptId },
      });
    } catch (err) {
      console.error("submitWritingAttempt error:", err);
      msgApi.error("Có lỗi khi nộp bài, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
      setSubmitPanel(null);
    }
  };

  const handleSubmitLlama = async () => {
    if (submitting) return;
    const payloadAnswers = questions.map((q) => ({
      questionId: q.id,
      answerText: answers[q.id] || "",
      number: q.number,
      partKey: q.partKey,
    }));
    const hasAnswer = payloadAnswers.some((a) => (a.answerText || "").trim());
    if (!hasAnswer) {
      msgApi.warning("Hãy nhập câu trả lời trước khi nộp/chấm.");
      return;
    }

    try {
      setSubmitting(true);
      const llamaAnswers = [];
      for (const q of questions) {
        const text = answers[q.id] || "";
        if (!text.trim()) {
          llamaAnswers.push({ questionId: q.id, ai: null });
          continue;
        }
        const score = await scoreWritingLocal({
          answerText: text,
          questionText: q.prompt || "",
          questionNumber: q.number,
          partKey: q.partKey,
        });
        llamaAnswers.push({
          questionId: q.id,
          ai: score,
        });
      }

      const saved = await submitWritingAttemptLlama(attemptId, {
        answers: payloadAnswers,
        llamaAnswers,
      });
      if (!saved.ok) {
        msgApi.error(saved.msg || "Lưu kết quả Llama thất bại.");
      } else {
        msgApi.success("Nộp bài & chấm offline (Llama) thành công.");
        setLeftSec(null);
        navigate(`/attempt-writing/${attemptId}/review`, {
          state: { localScore: saved.data?.llamaResult || null, from: "llama-offline" },
        });
      }
    } catch (err) {
      console.error("local submit error:", err);
      msgApi.error(
        err?.response?.data?.msg || "Chấm offline lỗi, kiểm tra service local (Ollama)."
      );
    } finally {
      setSubmitting(false);
      setSubmitPanel(null);
    }
  };

  const aggregateLlama = (llamaAnswers = []) => {
    const graded = llamaAnswers.filter((a) => a.ai);
    const n = graded.length || 1;
    const sum = graded.reduce(
      (acc, a) => {
        acc.task += a.ai.taskScore || 0;
        acc.grammar += a.ai.grammarScore || 0;
        acc.vocab += a.ai.vocabularyScore || 0;
        acc.org += a.ai.organizationScore || 0;
        acc.overall += a.ai.overallScore ?? a.ai.overall ?? 0;
        acc.toeic += a.ai.predictedToeicScore || 0;
        return acc;
      },
      { task: 0, grammar: 0, vocab: 0, org: 0, overall: 0, toeic: 0 }
    );
    const crit = {
      task: Number((sum.task / n).toFixed(2)),
      grammar: Number((sum.grammar / n).toFixed(2)),
      vocabulary: Number((sum.vocab / n).toFixed(2)),
      organization: Number((sum.org / n).toFixed(2)),
    };
    const avgOverall = Number((sum.overall / n).toFixed(2));
    const predicted = Math.max(0, Math.min(200, Math.round((sum.toeic || avgOverall * 40) / n)));
    return {
      overall: avgOverall,
      overallScore: avgOverall,
      predictedToeicScore: predicted,
      criteria: crit,
      suggestions: [],
      summary: "",
    };
  };

  const handleSubmitHybrid = async () => {
    if (submitting) return;

    const payloadAnswers = questions.map((q) => ({
      questionId: q.id,
      answerText: answers[q.id] || "",
    }));
    const hasAnswer = payloadAnswers.some((a) => (a.answerText || "").trim());
    if (!hasAnswer) {
      msgApi.warning("Hãy nhập câu trả lời trước khi nộp.");
      return;
    }

    setSubmitting(true);

    const llamaPromise = (async () => {
      const llamaAnswers = [];
      for (const q of questions) {
        const text = answers[q.id] || "";
        if (!text.trim()) {
          llamaAnswers.push({ questionId: q.id, ai: null });
          continue;
        }
        const score = await scoreWritingLocal({
          answerText: text,
          questionText: q.prompt || "",
          questionNumber: q.number,
          partKey: q.partKey,
        });
        llamaAnswers.push({ questionId: q.id, ai: score });
      }
      return llamaAnswers;
    })();

    const geminiPromise = submitWritingAttempt(attemptId, payloadAnswers);

    try {
      const [geminiRes, llamaRes] = await Promise.allSettled([geminiPromise, llamaPromise]);

      if (geminiRes.status !== "fulfilled") {
        throw geminiRes.reason;
      }

      let llamaAnswers = [];
      if (llamaRes.status === "fulfilled") {
        llamaAnswers = llamaRes.value || [];
      } else {
        msgApi.warning(
          "Gemini đã chấm xong, nhưng feedback Llama đang lỗi. Bạn có thể chấm lại trong trang review."
        );
      }

      const llamaAgg = llamaAnswers.length ? aggregateLlama(llamaAnswers) : null;

      msgApi.success("Đã nộp: điểm tổng từ Gemini, feedback chi tiết từ Llama.");
      navigate(`/attempt-writing/${attemptId}/review`, {
        state: {
          from: "hybrid",
          localScore: llamaAgg,
          localLlamaAnswers: llamaAnswers,
        },
      });
    } catch (err) {
      console.error("hybrid submit error:", err);
      msgApi.error("Nộp song song thất bại, vui lòng thử lại hoặc nộp từng chế độ.");
    } finally {
      setSubmitting(false);
      setSubmitPanel(null);
    }
  };

  const handleLocalScore = async () => {
    if (!questions.length) return;
    const combinedAnswer = questions
      .map((q) => `Question ${q.number}: ${answers[q.id] || ""}`)
      .join("\n\n");
    if (!combinedAnswer.trim()) {
      msgApi.warning("Hãy nhập câu trả lời trước khi chấm offline.");
      return;
    }
    try {
      setLocalScoring({ loading: true, result: null, error: "" });
      const res = await scoreWritingLocal({
        answerText: combinedAnswer,
        questionText: questions.map((q) => q.prompt).join("\n"),
      });
      setLocalScoring({ loading: false, result: res, error: "" });
    } catch (err) {
      console.error("local score error:", err);
      setLocalScoring({
        loading: false,
        result: null,
        error: err?.response?.data?.msg || "Chấm offline lỗi, kiểm tra service local.",
      });
    }
  };

  const renderSubmitPanel = (place) => (
    <div className={`submit-panel ${submitPanel === place ? "open" : ""}`}>
      <Button
        type="primary"
        ghost
        size="large"
        onClick={handleSubmitGemini}
        loading={submitting}
        block
      >
        {submitting ? "Đang nộp..." : "Nộp bài (Gemini)"}
      </Button>
      <Button size="large" onClick={handleSubmitLlama} loading={submitting} block>
        {submitting ? "Đang chấm..." : "Nộp bài (Llama)"}
      </Button>
      <Button size="large" onClick={handleSubmitHybrid} loading={submitting} block>
        {submitting ? "Đang nộp song song..." : "Nộp song song"}
      </Button>
    </div>
  );

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
        <button type="button" className="btn-back" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
        <p>Không tìm thấy nội dung bài viết.</p>
      </div>
    );
  }

  return (
    <div className="attempt-page">
      {contextHolder}

      {localScoring.error && <div className="attempt-alert error">{localScoring.error}</div>}
      {localScoring.result && (
        <div className="attempt-alert success">
          <div>
            <b>Chấm nhanh (Llama 8B):</b> Overall {localScoring.result.overall ?? "-"}
          </div>
          {localScoring.result.criteria && (
            <div className="criteria-row">
              {Object.entries(localScoring.result.criteria).map(([k, v]) => (
                <span key={k}>
                  {k}: <b>{v}</b>
                </span>
              ))}
            </div>
          )}
          {Array.isArray(localScoring.result.suggestions) && (
            <ul className="suggestion-list">
              {localScoring.result.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {localScoring.result.summary && <div>{localScoring.result.summary}</div>}
        </div>
      )}

      <button type="button" className="btn-back" onClick={() => navigate(-1)}>
        ← Quay lại
      </button>

      <div className="attempt-header">
        <div>
          <h1 className="attempt-title">Bài luyện TOEIC Writing</h1>
          <p className="attempt-meta">
            Đề: <b>{meta.setTitle}</b> • Chế độ:{" "}
            <b>{meta.mode === "full" ? "Full test" : "Luyện theo phần"}</b> • Thời gian:{" "}
            {meta.timeLimitSec ? `${Math.round(meta.timeLimitSec / 60)} phút` : "Không giới hạn"}
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

      <div className="attempt-layout">
        <div className="attempt-main">
          {activeQuestion && (
            <div className="attempt-question">
              <div className="q-header">
                <b>
                  Question {activeQuestion.number} (
                  {PART_LABELS[activeQuestion.partKey] || activeQuestion.partKey})
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
                        {activeQuestion.minWords ? `${activeQuestion.minWords}-` : ""}
                        {activeQuestion.maxWords || ""} từ)
                      </>
                    ) : null}
                  </div>

                  <TextArea
                    rows={14}
                    value={answers[activeQuestion.id] || ""}
                    onChange={(e) => handleChangeAnswer(activeQuestion.id, e.target.value)}
                    placeholder="Viết câu/đoạn văn tại đây..."
                  />

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      textAlign: "right",
                      color: "#6b7280",
                    }}
                  >
                    Số từ:{" "}
                    {(answers[activeQuestion.id] || "")
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean).length || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="attempt-actions attempt-actions--bottom-mobile">
            <div className="submit-box">
              <Button
                type="primary"
                size="large"
                onClick={() => toggleSubmitPanel("mobile")}
                block
              >
                Nộp bài
              </Button>
              {renderSubmitPanel("mobile")}
            </div>
          </div>
        </div>

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

            <div className="sidebar-submit-btn submit-box">
              <Button
                type="primary"
                size="large"
                onClick={() => toggleSubmitPanel("sidebar")}
                block
              >
                Nộp bài
              </Button>
              {renderSubmitPanel("sidebar")}
            </div>
            <div className="sidebar-questions">
              <div className="sidebar-questions-title">Questions 1-8</div>
              <div className="sidebar-questions-grid">
                {questions.map((q) => {
                  const isAnswered = (answers[q.id] || "").trim().length > 0;
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
              Nhấn vào số câu để chuyển nhanh giữa các câu Writing. Kiểm tra kỹ trước khi bấm
              <b> Nộp bài</b>.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AttemptWritingPage;
