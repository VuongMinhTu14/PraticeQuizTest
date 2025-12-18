import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, Tag, Spin, Button, message } from "antd";
import { getWritingAttemptReview } from "../../utils/toeicApi";
import { scoreWritingLocal } from "../../utils/localWritingApi";
import "./ToeicWritingReviewPage.css";

const toScore = (val) => (typeof val === "number" ? val : "-");
const pickOverall = (obj) =>
  obj?.overall ?? obj?.overallScore ?? obj?.score ?? null;
const pickFeedback = (ai) =>
  ai?.feedback || ai?.summary || ai?.comment || "";
const pickStudyList = (ai) => {
  if (Array.isArray(ai?.studyPlan)) return ai.studyPlan;
  if (Array.isArray(ai?.suggestions)) return ai.suggestions;
  return [];
};

export default function ToeicWritingReviewPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const localLlamaMap = useMemo(() => {
    const arr = location.state?.localLlamaAnswers;
    if (!Array.isArray(arr)) return new Map();
    return new Map(arr.map((a) => [String(a.questionId), a.ai]));
  }, [location.state]);

  const [data, setData] = useState(null);
  const [localScore, setLocalScore] = useState({
    loading: false,
    result: location.state?.localScore || null,
    error: "",
  });
  const [msgApi, contextHolder] = message.useMessage();

  useEffect(() => {
    (async () => {
      try {
        const r = await getWritingAttemptReview(attemptId);
        setData(r);
        if (r?.attempt?.llamaResult && !localScore.result) {
          setLocalScore((prev) => ({ ...prev, result: r.attempt.llamaResult }));
        }
      } catch (err) {
        console.error(err);
        msgApi.error("Không tải được phần review bài viết.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const questionText = useMemo(() => {
    if (!data?.items) return "";
    return data.items
      .map(
        (q) =>
          `Question ${q.number} (${q.partKey?.toUpperCase()}): ${q.prompt || ""}`
      )
      .join("\n\n");
  }, [data]);

  const answerText = useMemo(() => {
    if (!data?.items) return "";
    return data.items
      .map((q) => `Question ${q.number}: ${q.answerText || ""}`)
      .join("\n\n");
  }, [data]);

  const handleLocalScore = async () => {
    if (!answerText.trim()) {
      msgApi.warning("Chưa có bài làm để chấm.");
      return;
    }
    try {
      setLocalScore({ loading: true, result: null, error: "" });
      const res = await scoreWritingLocal({
        answerText,
        questionText,
      });
      setLocalScore({ loading: false, result: res, error: "" });
    } catch (err) {
      console.error(err);
      setLocalScore({
        loading: false,
        result: null,
        error:
          err?.response?.data?.msg ||
          err?.message ||
          "Chấm offline lỗi, vui lòng kiểm tra service local.",
      });
    }
  };

  if (!data) {
    return (
      <div className="center">
        <Spin />
      </div>
    );
  }

  const { attempt, items } = data;
  const summary = attempt.summary || {};
  const llamaData = localScore.result || attempt.llamaResult || null;
  const submissionMethod =
    attempt.submissionMethod || (items.some((q) => q.ai) ? "gemini" : null);
  const hasGemini = submissionMethod === "gemini" || items.some((q) => q.ai);

  return (
    <div className="writing-review-page">
      {contextHolder}

      <div className="review-header">
        <h2>Review bài TOEIC Writing</h2>
        <button onClick={() => navigate(-1)}>⟵ Quay lại</button>
      </div>

      <div className="review-summary">
        <Card className="sum-card">
          <h3>Điểm dự đoán TOEIC</h3>
          <div className="score">{summary.predictedToeicScore ?? "-"}</div>
        </Card>

        <Card className="sum-card">
          <h3>Overall (0-5)</h3>
          <div className="score">
            {summary.avgOverallScore != null
              ? summary.avgOverallScore.toFixed(1)
              : "-"}
          </div>
        </Card>

        <Card className="sum-card">
          <h3>Phương thức nộp</h3>
          <div className="score">
            {submissionMethod === "llama" ? "Llama" : "Gemini"}
          </div>
        </Card>
      </div>

      <div className="review-llama">
        <div className="llama-head">
          <div>
            <div className="llama-title">So sánh kết quả</div>
            <div className="llama-note">
              Chọn Llama để giảm tải quota Gemini. Có thể chấm lại offline bất kỳ lúc nào.
            </div>
          </div>
          <Button
            type="primary"
            onClick={handleLocalScore}
            loading={localScore.loading}
          >
            {localScore.loading ? "Đang chấm..." : "Chấm lại bằng Llama 8B"}
          </Button>
        </div>

        <div className="llama-grid">
          {hasGemini ? (
            <Card className="llama-card">
              <div className="llama-label">Gemini (server)</div>
              <div className="llama-score">
                Overall: {summary.avgOverallScore?.toFixed(1) ?? "-"} /5
              </div>
              <div className="llama-sub">
                Toeic dự đoán: {summary.predictedToeicScore ?? "-"}
              </div>
            </Card>
          ) : (
            <Card className="llama-card">
              <div className="llama-label">Gemini (server)</div>
              <div className="llama-empty">
                Bạn đã nộp bằng Llama, không gọi Gemini cho lần này.
              </div>
            </Card>
          )}

          <Card className="llama-card">
            <div className="llama-label">Llama 8B (offline)</div>
            {llamaData ? (
              <>
                <div className="llama-score">
                  Overall: {pickOverall(llamaData) ?? "-"} /5
                </div>
                <div className="llama-sub">
                  Toeic dự đoán: {llamaData.predictedToeicScore ?? "-"}
                </div>
                {llamaData.criteria && (
                  <div className="llama-criteria">
                    {Object.entries(llamaData.criteria).map(([k, v]) => (
                      <span key={k}>
                        {k}: <b>{v}</b>
                      </span>
                    ))}
                  </div>
                )}
                {Array.isArray(llamaData.suggestions) && (
                  <ul className="llama-suggestion">
                    {llamaData.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                )}
                {(llamaData.summary || llamaData.feedback) && (
                  <div className="llama-summary">
                    {llamaData.summary || llamaData.feedback}
                  </div>
                )}
              </>
            ) : (
              <div className="llama-empty">
                Bấm “Chấm lại bằng Llama 8B” để xem kết quả offline hoặc nộp bài bằng Llama.
              </div>
            )}

            {localScore.error && (
              <div className="llama-error">{localScore.error}</div>
            )}
          </Card>
        </div>
      </div>

      <div className="review-list">
        {items.map((q) => {
          const ai = localLlamaMap.get(String(q.questionId)) || q.ai || null;
          const feedbackText = ai ? pickFeedback(ai) : "";
          const studyPlan = ai ? pickStudyList(ai) : [];
          const taskScore = ai
            ? toScore(ai.taskScore ?? ai.task ?? ai.criteria?.task)
            : "-";
          const grammarScore = ai
            ? toScore(ai.grammarScore ?? ai.grammar ?? ai.criteria?.grammar)
            : "-";
          const vocabScore = ai
            ? toScore(ai.vocabularyScore ?? ai.vocabulary ?? ai.criteria?.vocabulary)
            : "-";
          const orgScore = ai
            ? toScore(ai.organizationScore ?? ai.organization ?? ai.criteria?.organization)
            : "-";
          const overallScore = ai ? toScore(pickOverall(ai)) : "-";
          const predictedToeic =
            ai?.predictedToeicScore ?? ai?.toeicScore ?? ai?.toeicWritingLevel ?? "-";

          return (
            <Card key={q.questionId} className="q-card">
              <div className="q-title">
                Câu {q.number} ({q.partKey.toUpperCase()})
              </div>

              <div className="q-prompt">{q.prompt}</div>

              <div className="q-answer">
                <b>Bài viết của bạn:</b>
                <div className="q-text">{q.answerText || "(Chưa trả lời)"}</div>
              </div>

              {ai ? (
                <div className="q-ai">
                  <div className="q-ai-tags">
                    <Tag color="green">Task: {taskScore}</Tag>
                    <Tag color="blue">Grammar: {grammarScore}</Tag>
                    <Tag color="purple">Vocab: {vocabScore}</Tag>
                    <Tag color="cyan">Org: {orgScore}</Tag>
                    <Tag color="gold">Overall: {overallScore}</Tag>
                    <Tag color="volcano">Toeic: {predictedToeic}</Tag>
                  </div>

                  <div className="ai-feedback">
                    <b>Feedback AI:</b>
                    <br />
                    {feedbackText ||
                      "AI chưa trả về nhận xét chi tiết cho câu này."}
                  </div>

                  {studyPlan.length > 0 && (
                    <ul className="ai-study">
                      {studyPlan.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="q-ai">
                  <Tag color="default">
                    Chưa có feedback chi tiết (nộp bằng Llama hoặc thiếu dữ liệu).
                  </Tag>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
