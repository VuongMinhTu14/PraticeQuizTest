import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToeicAttemptReview } from "../../utils/toeicApi";
import { Radio, Spin, Tag, Button } from "antd";
import "./ToeicReviewPage.css";

const PART_LABELS = {
  p1: "Part 1",
  p2: "Part 2",
  p3: "Part 3",
  p4: "Part 4",
  p5: "Part 5",
  p6: "Part 6",
  p7: "Part 7",
};

const PART_WEIGHTS = {
  // Listening 100 questions
  p1: 6,
  p2: 25,
  p3: 39,
  p4: 30,
  // Reading 100 questions
  p5: 30,
  p6: 16,
  p7: 54,
};

const LISTENING_PARTS = ["p1", "p2", "p3", "p4"];
const READING_PARTS = ["p5", "p6", "p7"];

const ToeicReviewPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getToeicAttemptReview(attemptId);
        if (!res.ok) throw new Error(res.msg || "Error");
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [attemptId]);

  if (loading || !data) {
    return (
      <div className="review-page review-page--center">
        <Spin />
      </div>
    );
  }

  const { attempt, items } = data;

  const totalQuestions = attempt.totalQuestions ?? items.length;
  const totalCorrect = attempt.totalCorrect ?? 0;
  const answeredCount = items.filter((q) => q.userAnswer != null).length;
  const wrongCount = Math.max(answeredCount - totalCorrect, 0);
  const skippedCount = Math.max(totalQuestions - answeredCount, 0);
  const percent =
    attempt.scorePercent ??
    (totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0);

  const displayScore = `${totalCorrect}/${totalQuestions}`;

  let timeSpentText = "-";
  if (attempt.createdAt && attempt.submittedAt) {
    const start = new Date(attempt.createdAt);
    const end = new Date(attempt.submittedAt);
    const diffSec = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
    const h = Math.floor(diffSec / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((diffSec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (diffSec % 60).toString().padStart(2, "0");
    timeSpentText = `${h}:${m}:${s}`;
  }

  const scoreByPart = attempt.scoreByPart || [];
  const listeningParts = scoreByPart.filter((p) => LISTENING_PARTS.includes(p.partKey));
  const readingParts = scoreByPart.filter((p) => READING_PARTS.includes(p.partKey));

  const sumCorrect = (arr) => arr.reduce((s, p) => s + (p.correct || 0), 0);
  const sumTotal = (arr) => arr.reduce((s, p) => s + (p.total || 0), 0);

  const totalListeningCorrect = sumCorrect(listeningParts);
  const totalListeningQuestions = sumTotal(listeningParts);
  const totalReadingCorrect = sumCorrect(readingParts);
  const totalReadingQuestions = sumTotal(readingParts);

  const estimatedListening =
    totalListeningQuestions > 0
      ? Math.round((totalListeningCorrect / totalListeningQuestions) * 495)
      : null;
  const estimatedReading =
    totalReadingQuestions > 0
      ? Math.round((totalReadingCorrect / totalReadingQuestions) * 495)
      : null;
  const estimatedTotal =
    estimatedListening != null && estimatedReading != null
      ? estimatedListening + estimatedReading
      : null;

  const sectionWeight = {
    listening: LISTENING_PARTS.reduce((s, k) => s + PART_WEIGHTS[k], 0),
    reading: READING_PARTS.reduce((s, k) => s + PART_WEIGHTS[k], 0),
  };

  const scoreByPartWithEst = scoreByPart.map((p) => {
    const isListening = LISTENING_PARTS.includes(p.partKey);
    const base = isListening ? sectionWeight.listening : sectionWeight.reading;
    const weight = PART_WEIGHTS[p.partKey] || 0;
    const partMax = (495 * weight) / base;
    const estimated =
      p.total > 0 && weight > 0 ? Math.round((p.correct / p.total) * partMax) : null;
    return { ...p, estimatedScore: estimated };
  });

  return (
    <div className="review-page">
      <div className="review-header">
        <div>
          <h2>Xem lại bài làm TOEIC</h2>
          <div className="review-meta">
            Đề: <b>{attempt.setId}</b>
          </div>
        </div>
        <Button onClick={() => navigate(-1)}>← Quay lại</Button>
      </div>

      <div className="review-summary-grid">
        <div className="rv-summary-card rv-summary-card-main">
          <div className="rv-main-row">
            <div className="rv-main-label">Kết quả bài làm</div>
            <div className="rv-main-value">{displayScore}</div>
          </div>
          <div className="rv-main-sub">
            Tỉ lệ: <b>{percent}%</b> (đúng/tổng)
          </div>
          <div className="rv-main-sub">
            Thời gian hoàn thành: <b>{timeSpentText}</b>
          </div>
          <div className="rv-main-sub">
            Ước tính điểm Listening / Reading:{" "}
            <b>
              {estimatedListening != null ? `${estimatedListening}/495` : "-"} •{" "}
              {estimatedReading != null ? `${estimatedReading}/495` : "-"}
            </b>
            {estimatedTotal != null && (
              <>
                {" "}
                (Tổng ~ <b>{estimatedTotal}/990</b>)
              </>
            )}
          </div>
        </div>

        <div className="rv-summary-card rv-ok">
          <div className="rv-label">Trả lời đúng</div>
          <div className="rv-value">{totalCorrect}</div>
          <div className="rv-unit">câu hỏi</div>
        </div>

        <div className="rv-summary-card rv-wrong">
          <div className="rv-label">Trả lời sai</div>
          <div className="rv-value">{wrongCount}</div>
          <div className="rv-unit">câu hỏi</div>
        </div>

        <div className="rv-summary-card rv-skip">
          <div className="rv-label">Bỏ qua</div>
          <div className="rv-value">{skippedCount}</div>
          <div className="rv-unit">câu hỏi</div>
        </div>

        <div className="rv-summary-card rv-score-card">
          <div className="rv-label">Listening</div>
          <div className="rv-value rv-value-score">
            {estimatedListening != null ? `${estimatedListening}/495` : "-/495"}
          </div>
        </div>

        <div className="rv-summary-card rv-score-card">
          <div className="rv-label">Reading</div>
          <div className="rv-value rv-value-score">
            {estimatedReading != null ? `${estimatedReading}/495` : "-/495"}
          </div>
        </div>

        <div className="rv-summary-card rv-score-card rv-score-total">
          <div className="rv-label">Tổng điểm</div>
          <div className="rv-value rv-value-score">
            {estimatedTotal != null ? `${estimatedTotal}/990` : "-/990"}
          </div>
        </div>
      </div>

      <div className="rv-part-card">
        <h3>Chi tiết theo Part</h3>
        <table className="rv-part-table">
          <thead>
            <tr>
              <th>Part</th>
              <th>Điểm (đúng/tổng)</th>
              <th>%</th>
              <th>Ước điểm</th>
            </tr>
          </thead>
          <tbody>
            {scoreByPartWithEst.length === 0 ? (
              <tr>
                <td colSpan={4} className="rv-empty-row">
                  Chưa có dữ liệu theo Part.
                </td>
              </tr>
            ) : (
              scoreByPartWithEst.map((p) => (
                <tr key={p.partKey}>
                  <td>{PART_LABELS[p.partKey] || p.partKey.toUpperCase()}</td>
                  <td>
                    {p.correct}/{p.total}
                  </td>
                  <td>{p.percent ?? 0}%</td>
                  <td>{p.estimatedScore != null ? `${p.estimatedScore.toFixed(0)}` : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="review-list">
        {items.map((q) => {
          const user = q.userAnswer;
          const correct = q.correctOption;

          return (
            <div key={q.questionId} className="review-question">
              <div className="rq-header">
                <span className="rq-number">
                  Câu {q.number} ({q.partKey.toUpperCase()})
                </span>
                <span>
                  {user === null ? (
                    <Tag color="default">Chưa trả lời</Tag>
                  ) : q.isCorrect ? (
                    <Tag color="green">Đúng</Tag>
                  ) : (
                    <Tag color="red">Sai</Tag>
                  )}
                </span>
              </div>

              {q.questionText && <div className="rq-text">{q.questionText}</div>}

              <div className="rq-options">
                <Radio.Group value={user} disabled>
                  {(q.choices || []).map((c) => {
                    const isUser = c.label === user;
                    const isCorrect = c.label === correct;

                    let cls = "rq-option";
                    if (isCorrect) cls += " rq-option--correct";
                    if (isUser && !q.isCorrect) cls += " rq-option--user-wrong";
                    if (isUser && q.isCorrect) cls += " rq-option--user-correct";

                    return (
                      <div key={c.label} className={cls}>
                        <Radio value={c.label}>
                          <b>{c.label}.</b> {c.text}
                        </Radio>
                      </div>
                    );
                  })}
                </Radio.Group>
              </div>

              {q.explanation && (
                <div className="rq-explanation">
                  <b>Giải thích:</b> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ToeicReviewPage;
