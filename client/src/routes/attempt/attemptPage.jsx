// src/routes/attempt/AttemptPage.jsx
import "./attemptPage.css";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message, Radio, Button, Modal } from "antd";
import {
  getToeicAttempt,
  getToeicQuestions,
  submitToeicAttempt,
} from "../../utils/toeicApi";

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

  // ============================================
  // LOAD ATTEMPT + QUESTIONS
  // ============================================
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);

        // lấy metadata attempt
        const at = await getToeicAttempt(attemptId);
        if (!alive) return;
        setMeta(at);

        // load toàn bộ câu hỏi của từng part đã chọn
        const all = [];
        for (const p of at.selectedParts) {
          const qs = await getToeicQuestions(at.setId, p);
          if (Array.isArray(qs)) all.push(...qs);
        }

        if (!alive) return;
        setQuestions(all);
      } catch (err) {
        console.error("load attempt error:", err);
        if (alive) msgApi.error("Không tải được thông tin bài luyện");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => (alive = false);
  }, [attemptId, msgApi]);

  // chọn đáp án
  const onSelectAnswer = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmit = () => {
    if (!questions.length) return;

    Modal.confirm({
      title: "Nộp bài?",
      content: "Sau khi nộp sẽ không chỉnh sửa được đáp án.",
      okText: "Nộp bài",
      cancelText: "Hủy",
      onOk: async () => {
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

          const result = res.data; // { setId, scoreRaw, ... }

          msgApi.success("Nộp bài thành công!");

          // chuyển về trang practice detail
          navigate(`/practice/${result.setId}`, {
            state: { lastResult: result },
          });
        } catch (err) {
          console.error("submit attempt error:", err);
          msgApi.error("Không nộp được bài, thử lại sau");
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  // ============================================
  // RENDER
  // ============================================
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

      <h1 className="attempt-title">Bài luyện TOEIC</h1>

      {meta && (
        <p className="attempt-meta">
          Đề: <b>{meta.setTitle}</b> · Phần:{" "}
          {meta.selectedParts?.join(", ")} · Thời gian:{" "}
          {Math.round((meta.durationSec ?? 0) / 60)} phút
        </p>
      )}

      {/* DANH SÁCH CÂU HỎI */}
      <ol className="attempt-question-list">
        {questions.map((q) => (
          <li key={q.id} className="attempt-question">
            <div className="q-header">
              <b>
                Câu {q.number}: ({q.partKey.toUpperCase()})
              </b>
            </div>

            <div className="q-text">{q.questionText}</div>

            <Radio.Group
              value={answers[q.id]}
              onChange={(e) => onSelectAnswer(q.id, e.target.value)}
              className="q-options"
            >
              {q.choices?.map((c) => (
                <Radio key={c.label} value={c.label} className="q-option">
                  <b>{c.label}.</b> {c.text}
                </Radio>
              ))}
            </Radio.Group>
          </li>
        ))}
      </ol>

      <div className="attempt-actions">
        <Button
          type="primary"
          size="large"
          onClick={handleSubmit}
          loading={submitting}
        >
          {submitting ? "Đang nộp..." : "Nộp bài"}
        </Button>
      </div>
    </div>
  );
};

export default AttemptPage;
