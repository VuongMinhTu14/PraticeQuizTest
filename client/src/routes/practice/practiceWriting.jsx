import { useQuery } from "@tanstack/react-query";
import { listWritingSets } from "../../utils/toeicApi";
import { useNavigate } from "react-router-dom";
import "./practiceWriting.css";

const PracticeWriting = () => {
  const nav = useNavigate();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["writingSets"],
    queryFn: listWritingSets,
  });

  const handleOpen = (id) => {
    nav(`/practice/writing/${id}`);
  };

  return (
    <div className="practice-page">
      <h1 className="practice-heading">TOEIC Writing (AI chấm điểm)</h1>
      <p className="practice-subtitle">
        Chọn một đề writing, viết bài và để AI chấm điểm + dự đoán điểm TOEIC.
      </p>

      {isLoading && <div>Đang tải danh sách đề...</div>}
      {isError && <div>Lỗi: {error.message}</div>}

      <div className="practice-grid">
        {data?.length === 0 && <p>Chưa có đề writing nào được publish.</p>}

        {data?.map((item) => (
          <div
            key={item.id}
            className="practice-card"
            onClick={() => handleOpen(item.id)}
          >
            <div className="practice-card-title">{item.title}</div>
            <div className="practice-card-meta">
              <span className="tag">{item.taskType}</span>
              {item.year && <span className="year">Year: {item.year}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PracticeWriting;
