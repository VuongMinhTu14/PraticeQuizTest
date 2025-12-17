import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Button, Table, Tag } from "antd";
import "./ToeicResultPage.css";

const ToeicResultPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // data được truyền từ trang attempt sau khi submit
  const result = location.state?.resultData;

  useEffect(() => {
    if (result?.attemptId) {
      localStorage.removeItem("pq_last_attempt");
    }
  }, [result]);

  useEffect(() => {
    if (!result) {
      // nếu F5 mất state thì quay về practice
      navigate("/dashboard/practice");
    }
  }, [result, navigate]);

  if (!result) return null;

  const { setId, setTitle, totalQuestions, totalCorrect, scorePercent, scoreByPart } = result;
  const displayScore = `${totalCorrect ?? 0}/${totalQuestions ?? 0}`;

  const columns = [
    { title: "Part", dataIndex: "partKey", width: 80 },
    {
      title: "Điểm (đúng/tổng)",
      render: (_, r) => `${r.correct}/${r.total}`,
    },
    {
      title: "Tỉ lệ (%)",
      dataIndex: "percent",
      render: (p) => <Tag color={p >= 70 ? "green" : p >= 40 ? "gold" : "red"}>{p}%</Tag>,
    },
  ];

  return (
    <div className="result-page">
      <div className="result-header">
        <div>
          <h2>Kết quả bài làm TOEIC</h2>
          <div className="result-meta">
            Đề: <b>{setTitle || setId}</b> • Điểm: <b>{displayScore}</b>{" "}
            {scorePercent != null && (
              <Tag
                className="result-percent-tag"
                color={scorePercent >= 70 ? "green" : scorePercent >= 40 ? "gold" : "red"}
              >
                {scorePercent}%
              </Tag>
            )}
          </div>
        </div>
        <div className="result-actions">
          <Button onClick={() => navigate(`/practice/${setId}`)}>Luyện lại bộ đề</Button>
          <Button type="primary" onClick={() => navigate(`/attempt/${attemptId}/review`)}>
            Xem lại bài làm
          </Button>
        </div>
      </div>

      <div className="result-card">
        <h3>Bảng điểm theo Part</h3>
        <Table rowKey="partKey" columns={columns} dataSource={scoreByPart || []} pagination={false} />
      </div>
    </div>
  );
};

export default ToeicResultPage;
