import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getWritingAttemptReview } from "../../utils/toeicApi";
import { Card, Tag, Spin } from "antd";
import "./ToeicWritingReviewPage.css";

export default function ToeicWritingReviewPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await getWritingAttemptReview(attemptId);
        setData(r);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [attemptId]);

  if (!data) return <div className="center"><Spin /></div>;

  const { attempt, items } = data;
  const summary = attempt.summary;

  return (
    <div className="writing-review-page">

      <div className="review-header">
        <h2>Review bài TOEIC Writing</h2>
        <button onClick={() => navigate(-1)}>⬅ Quay lại</button>
      </div>

      {/* SUMMARY */}
      <div className="review-summary">
        <Card className="sum-card">
          <h3>Điểm dự đoán TOEIC</h3>
          <div className="score">{summary.predictedToeicScore ?? "-"}</div>
        </Card>

        <Card className="sum-card">
          <h3>Overall (0–5)</h3>
          <div className="score">{summary.avgOverallScore?.toFixed(1) ?? "-"}</div>
        </Card>

        <Card className="sum-card">
          <h3>Level</h3>
          <div className="score">
            Level {Math.ceil((summary.predictedToeicScore || 0) / 25)}
          </div>
        </Card>
      </div>

      {/* LIST QUESTIONS */}
      <div className="review-list">
        {items.map(q => (
          <Card key={q.questionId} className="q-card">
            <div className="q-title">
              Câu {q.number} ({q.partKey.toUpperCase()})
            </div>

            <div className="q-prompt">{q.prompt}</div>

            <div className="q-answer">
              <b>Bài viết của bạn:</b>
              <div className="q-text">{q.answerText || "(Không trả lời)"}</div>
            </div>

            {q.ai && (
              <div className="q-ai">
                <Tag color="green">Task: {q.ai.taskScore}</Tag>
                <Tag color="blue">Grammar: {q.ai.grammarScore}</Tag>
                <Tag color="purple">Vocab: {q.ai.vocabularyScore}</Tag>
                <Tag color="cyan">Org: {q.ai.organizationScore}</Tag>

                <div className="ai-feedback">
                  <b>Feedback AI:</b><br />
                  {q.ai.feedback}
                </div>

                <ul className="ai-study">
                  {q.ai.studyPlan.map((s,i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>

    </div>
  );
}
