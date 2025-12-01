// client/src/routes/practice/practiceWritingDetail.jsx
import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWritingSet,
  createWritingAttemptUser,
  getWritingLastAttempt,
} from "../../utils/toeicApi";
import "./practiceWritingDetail.css";

const wordCount = (text) =>
  text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const PracticeWritingDetail = () => {
  const { id } = useParams(); // tw_2025_email_01
  const queryClient = useQueryClient();

  const [answerText, setAnswerText] = useState("");
  const [latestResult, setLatestResult] = useState(null); // lưu kết quả sau khi nộp

  // Lấy thông tin đề
  const {
    data: setData,
    isLoading: loadingSet,
    error: setError,
  } = useQuery({
    queryKey: ["writingSet", id],
    queryFn: () => getWritingSet(id),
  });

  // Lấy attempt gần nhất
  const {
    data: lastAttempt,
    isLoading: loadingLast,
  } = useQuery({
    queryKey: ["writingLastAttempt", id],
    queryFn: () => getWritingLastAttempt(id),
  });

  // Khi có attempt gần nhất, fill lại bài làm & kết quả
  useEffect(() => {
    if (lastAttempt) {
      setAnswerText(lastAttempt.answerText || "");
      setLatestResult(lastAttempt);
    }
  }, [lastAttempt]);

  const minWords = setData?.minWords || 0;
  const maxWords = setData?.maxWords || 9999;

  const currentWordCount = useMemo(() => wordCount(answerText), [answerText]);

  const canSubmit =
    currentWordCount >= minWords && currentWordCount <= maxWords;

  // Gửi bài để chấm
  const mutateGrade = useMutation({
    mutationFn: (text) => createWritingAttemptUser(id, text),
    onSuccess: (data) => {
      // data chính là attempt vừa tạo
      setLatestResult(data);
      alert("Đã chấm điểm xong! Kéo xuống xem kết quả nha.");
      // refresh last-attempt
      queryClient.invalidateQueries(["writingLastAttempt", id]);
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.msg || err.message || "Lỗi khi chấm điểm";
      alert(msg);
    },
  });

  if (loadingSet) {
    return (
      <div className="practice-writing-page">
        <h1 className="writing-title">TOEIC Writing (AI chấm điểm)</h1>
        <p>Đang tải đề viết...</p>
      </div>
    );
  }

  if (setError || !setData) {
    return (
      <div className="practice-writing-page">
        <h1 className="writing-title">TOEIC Writing (AI chấm điểm)</h1>
        <p className="error-text">
          Không tải được đề writing: {setError?.message}
        </p>
      </div>
    );
  }

  const result = latestResult; // cho dễ đọc
  const scores = result?.scores;

  return (
    <div className="practice-writing-page">
      {/* Header đề */}
      <div className="writing-header">
        <h1 className="writing-title">{setData.title}</h1>
        <div className="writing-meta">
          <span className="badge badge-type">{setData.taskType}</span>
          <span className="badge badge-year">Year: {setData.year}</span>
        </div>
      </div>

      {/* Đề bài */}
      <section className="writing-section writing-prompt">
        <h2 className="section-title">Đề bài</h2>
        <p className="prompt-text">{setData.prompt}</p>
        <p className="word-require">
          Yêu cầu số từ: từ {minWords} từ đến {maxWords} từ
        </p>
      </section>

      {/* Bài làm */}
      <section className="writing-section writing-answer">
        <div className="answer-header">
          <h2 className="section-title">Bài làm của bạn</h2>
          <span className="word-count">
            Số từ: {currentWordCount} / min {minWords}
          </span>
        </div>

        <textarea
          className="answer-textarea"
          rows={10}
          placeholder="Hãy viết email / bài luận của bạn ở đây..."
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
        />

        <div className="answer-actions">
          <button
            className="btn-primary"
            disabled={!canSubmit || mutateGrade.isPending}
            onClick={() => mutateGrade.mutate(answerText)}
          >
            {mutateGrade.isPending ? "Đang chấm điểm..." : "Nộp bài & AI chấm điểm"}
          </button>
          {!canSubmit && (
            <span className="hint-text">
              Bài phải có ít nhất {minWords} từ (và không quá {maxWords} từ) mới
              được chấm.
            </span>
          )}
        </div>
      </section>

      {/* Kết quả chấm điểm */}
      <section className="writing-section writing-result">
        <h2 className="section-title">Kết quả gần nhất</h2>

        {loadingLast && !result && <p>Đang tải kết quả...</p>}

        {!result && !loadingLast && (
          <p className="hint-text">
            Bạn chưa có bài nào được chấm. Hãy viết bài và bấm "Nộp bài & AI
            chấm điểm".
          </p>
        )}

        {result && (
            <div className="result-layout">
                <div className="result-main-card">
                <div className="overall-score">
                    <div className="overall-label">Overall score</div>
                    <div className="overall-value">
                    {(() => {
                        const val =
                        scores?.overall ??
                        scores?.overallScore ??
                        0;
                        return val.toFixed ? val.toFixed(1) : val;
                    })()}
                    /5.0
                    </div>
                </div>

                <div className="result-grid">
                    <div className="result-item">
                    <div className="result-label">Task achievement</div>
                    <div className="result-value">
                        {(() => {
                        const val =
                            scores?.task ??
                            scores?.taskScore ??
                            0;
                        return val.toFixed ? val.toFixed(1) : val;
                        })()}
                        /5
                    </div>
                    </div>

                    <div className="result-item">
                    <div className="result-label">Grammar</div>
                    <div className="result-value">
                        {(() => {
                        const val =
                            scores?.grammar ??
                            scores?.grammarScore ??
                            0;
                        return val.toFixed ? val.toFixed(1) : val;
                        })()}
                        /5
                    </div>
                    </div>

                    <div className="result-item">
                    <div className="result-label">Vocabulary</div>
                    <div className="result-value">
                        {(() => {
                        const val =
                            scores?.vocab ??
                            scores?.vocabularyScore ??
                            0;
                        return val.toFixed ? val.toFixed(1) : val;
                        })()}
                        /5
                    </div>
                    </div>

                    <div className="result-item">
                    <div className="result-label">Organization</div>
                    <div className="result-value">
                        {(() => {
                        const val =
                            scores?.organization ??
                            scores?.organizationScore ??
                            0;
                        return val.toFixed ? val.toFixed(1) : val;
                        })()}
                        /5
                    </div>
                    </div>

                    <div className="result-item">
                    <div className="result-label">Predicted TOEIC Writing</div>
                    <div className="result-value">
                        {scores?.predictedToeicScore ??
                        scores?.predictedToeic ??
                        0}
                        /200
                    </div>
                    </div>

                    <div className="result-item">
                    <div className="result-label">Level</div>
                    <div className="result-value">
                        {scores?.toeicWritingLevel
                        ? `Level ${scores.toeicWritingLevel}`
                        : "-"}
                    </div>
                    </div>
                </div>
                </div>

                <div className="feedback-card">
                <h3 className="feedback-title">Nhận xét chi tiết</h3>
                <p className="feedback-text">
                    {result.feedback ||
                    "AI chưa trả về nhận xét chi tiết cho bài này."}
                </p>
                </div>
            </div>
            )}
      </section>
    </div>
  );
};

export default PracticeWritingDetail;
