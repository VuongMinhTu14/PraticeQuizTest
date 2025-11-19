import "./attemptPage.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { message } from "antd";
import { getToeicQuestions, getToeicAttempt } from "../../utils/toeicApi";

const AttemptPage = () => {
  const { attemptId } = useParams();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [meta, setMeta] = useState(null);
  const [answers, setAnswers] = useState({});
  const [msgApi, contextHolder] = message.useMessage();

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        const at = await getToeicAttempt(attemptId);
        if (!alive) return;
        setMeta(at);

        const allQuestions = [];
        for (const partKey of at.selectedParts) {
          const qs = await getToeicQuestions(at.setId, partKey);
          allQuestions.push(...qs);
        }

        if (!alive) return;
        setQuestions(allQuestions);
      } catch (err) {
        console.error(err);
        if (alive) msgApi.error("Không tải được câu hỏi cho bài luyện");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [attemptId, msgApi]);

  const handleChoose = (questionId, optionLabel) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionLabel,
    }));
  };

  const handleSubmit = () => {
    console.log("USER ANSWERS:", answers);
    msgApi.info("Đáp án đã được lưu tạm (demo, chưa chấm điểm).");
  };

  if (loading) {
    return (
      <div className="attempt-page">
        {contextHolder}
        <p>Đang tải câu hỏi...</p>
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

      <header className="attempt-header">
        <div className="attempt-title">Bài luyện TOEIC</div>
        {meta && (
          <div className="attempt-meta">
            <span>Đề: {meta.setTitle || meta.setId}</span>
            <span>•</span>
            <span>Phần: {meta.selectedParts.join(", ")}</span>
          </div>
        )}
      </header>

      <main className="attempt-content">
        <ol className="question-list">
          {questions.map((q) => {
            const selected = answers[q.id];
            return (
              <li key={q.id} className="question-card">
                <div className="question-header">
                  <div className="question-number">
                    Câu {q.number}{" "}
                    <span className="question-part">({q.partKey})</span>
                  </div>
                  {q.passageId && (
                    <div className="question-badge">
                      Passage: {q.passageId}
                    </div>
                  )}
                </div>

                <div className="question-text">{q.questionText}</div>

                <ul className="option-list">
                  {q.choices?.map((c) => {
                    const isSelected = selected === c.label;
                    return (
                      <li
                        key={c.label}
                        className={`option-item ${
                          isSelected ? "selected" : ""
                        }`}
                        onClick={() => handleChoose(q.id, c.label)}
                      >
                        <div className="option-radio">
                          <span className="circle">
                            {isSelected && <span className="dot" />}
                          </span>
                          <span className="option-label">{c.label}</span>
                        </div>
                        <div className="option-text">{c.text}</div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </main>

      <footer className="attempt-footer">
        <button className="submit-btn" onClick={handleSubmit}>
          Nộp bài (demo)
        </button>
      </footer>
    </div>
  );
};

export default AttemptPage;
