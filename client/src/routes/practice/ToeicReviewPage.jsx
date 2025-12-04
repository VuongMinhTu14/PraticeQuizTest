// client/src/layouts/practice/ToeicReviewPage.jsx
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
    (totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0);

  // thời gian làm bài (nếu có createdAt / submittedAt)
  let timeSpentText = "-";
  if (attempt.createdAt && attempt.submittedAt) {
    const start = new Date(attempt.createdAt);
    const end = new Date(attempt.submittedAt);
    const diffSec = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 1000)
    );
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

  return (
    <div className="review-page">
      {/* HEADER */}
      <div className="review-header">
        <div>
          <h2>Xem lại bài làm TOEIC</h2>
          <div className="review-meta">
            Đề: <b>{attempt.setId}</b>
          </div>
        </div>
        <Button onClick={() => navigate(-1)}>⬅ Quay lại</Button>
      </div>

      {/* SUMMARY GIỐNG STUDY4 */}
      <div className="review-summary-grid">
        {/* card lớn bên trái */}
        <div className="rv-summary-card rv-summary-card-main">
          <div className="rv-main-row">
            <div className="rv-main-label">Kết quả làm bài</div>
            <div className="rv-main-value">
              {totalCorrect}/{totalQuestions}
            </div>
          </div>
          <div className="rv-main-sub">
            Độ chính xác:{" "}
            <b>
              {percent}
              %
            </b>{" "}
            (đúng / tổng)
          </div>
          <div className="rv-main-sub">
            Thời gian hoàn thành: <b>{timeSpentText}</b>
          </div>
        </div>

        {/* đúng */}
        <div className="rv-summary-card rv-ok">
          <div className="rv-label">Trả lời đúng</div>
          <div className="rv-value">{totalCorrect}</div>
          <div className="rv-unit">câu hỏi</div>
        </div>

        {/* sai */}
        <div className="rv-summary-card rv-wrong">
          <div className="rv-label">Trả lời sai</div>
          <div className="rv-value">{wrongCount}</div>
          <div className="rv-unit">câu hỏi</div>
        </div>

        {/* bỏ qua */}
        <div className="rv-summary-card rv-skip">
          <div className="rv-label">Bỏ qua</div>
          <div className="rv-value">{skippedCount}</div>
          <div className="rv-unit">câu hỏi</div>
        </div>

        {/* điểm % */}
        <div className="rv-summary-card rv-score">
          <div className="rv-label">Điểm</div>
          <div className="rv-value">{percent}</div>
          <div className="rv-unit">%</div>
        </div>
      </div>

      {/* BẢNG THEO PART */}
      <div className="rv-part-card">
        <h3>Chi tiết theo Part</h3>
        <table className="rv-part-table">
          <thead>
            <tr>
              <th>Part</th>
              <th>Đúng / Tổng</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {scoreByPart.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 10 }}>
                  Chưa có dữ liệu theo Part.
                </td>
              </tr>
            ) : (
              scoreByPart.map((p) => (
                <tr key={p.partKey}>
                  <td>{PART_LABELS[p.partKey] || p.partKey.toUpperCase()}</td>
                  <td>
                    {p.correct}/{p.total}
                  </td>
                  <td>{p.percent ?? 0}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* LIST CÂU HỎI */}
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

              {q.questionText && (
                <div className="rq-text">{q.questionText}</div>
              )}

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
