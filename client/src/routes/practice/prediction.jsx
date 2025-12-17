import "./prediction.css";
import { useEffect, useState } from "react";
import { Card, Spin, Alert, Tag, Progress } from "antd";
import { getMyLatestPrediction } from "../../utils/toeicApi";

const ScoreBox = ({ label, value, unit, className }) => (
  <div className={`pred-box ${className || ""}`}>
    <div className="pred-box-label">{label}</div>
    <div className="pred-box-value">
      {value != null ? (
        <>
          <span className="pred-box-number">{value}</span>
          {unit && <span className="pred-box-unit">{unit}</span>}
        </>
      ) : (
        <span className="pred-box-dash">-</span>
      )}
    </div>
  </div>
);

const PredictionPage = () => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");
    getMyLatestPrediction()
      .then((d) => {
        if (!alive) return;
        setData(d);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message || "Lỗi tải dữ liệu dự đoán");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const missing = data?.missing || [];
  const confidence = data?.confidence || "low";
  const confidenceColor =
    confidence === "high" ? "green" : confidence === "medium" ? "blue" : "orange";

  return (
    <div className="practice-page">
      <h1 className="practice-heading">Dự đoán điểm thi</h1>
      <p className="prediction-sub">
        Dựa trên lịch sử Listening/Reading và Writing gần nhất. Nếu thiếu dữ liệu, hệ thống sẽ báo phần
        cần bổ sung.
      </p>

      {loading && <Spin />}
      {err && <Alert type="error" message={err} />}

      {!loading && !err && data && (
        <div className="cards prediction-wrapper">
          <Card title="Tổng quan" bordered className="prediction-card">
            <div className="prediction-score-grid">
              <ScoreBox
                label="Tổng dự đoán"
                value={data.predictedTotal}
                unit="/ 990"
                className="accent-total"
              />
              <ScoreBox
                label="Listening"
                value={data.predictedListening}
                unit="/ 400"
                className="accent-listening"
              />
              <ScoreBox
                label="Reading"
                value={data.predictedReading}
                unit="/ 400"
                className="accent-reading"
              />
              <ScoreBox
                label="Writing"
                value={data.predictedWriting}
                unit="/ 200"
                className="accent-writing"
              />
            </div>

            <div className="prediction-meta-grid">
              <div className="pred-confidence-card">
                <div className="pred-chip">Độ tin cậy</div>
                <Tag
                  color={confidenceColor}
                  className="pred-tag"
                  style={{ fontSize: 14, padding: "4px 10px" }}
                >
                  {confidence.toUpperCase()}
                </Tag>
              </div>

              <div className="pred-progress-card">
                <div className="pred-progress-label">Overall L+R (%)</div>
                <Progress
                  percent={data.overallPercent ?? 0}
                  status="active"
                  showInfo={!!data.overallPercent}
                  strokeColor={{ from: "#60a5fa", to: "#1d4ed8" }}
                  trailColor="#e5e7eb"
                />
              </div>

              <div className="pred-progress-card">
                <div className="pred-progress-label">Overall Writing (0-5)</div>
                <Progress
                  percent={((data.writingOverallScore || 0) / 5) * 100}
                  showInfo
                  strokeColor={{ from: "#c084fc", to: "#7c3aed" }}
                  trailColor="#e5e7eb"
                />
              </div>
            </div>

            {missing.length > 0 && (
              <Alert
                className="prediction-missing"
                type="warning"
                message={`Thiếu dữ liệu: ${missing.join(", ")}`}
                description="Hãy làm thêm bài L+R và Writing để hệ thống dự đoán chính xác hơn."
              />
            )}

            <div className="prediction-source">
              Nguồn dữ liệu: {data.sources?.toeicAttempts || 0} attempt TOEIC,{" "}
              {data.sources?.writingAttempts || 0} attempt Writing (tối đa 3 gần nhất).
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PredictionPage;
