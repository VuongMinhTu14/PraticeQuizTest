import "./practiceCard.css";
import { useNavigate } from "react-router-dom";
import { Button } from "antd";
import {
  ClockCircleOutlined,
  AppstoreOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  LineChartOutlined,
  StarFilled,
} from "@ant-design/icons";

const PracticeCard = ({ item, bookmarked = false, onToggleBookmark }) => {
  const minutes = Math.max(1, Math.round((item?.durationSec ?? 0) / 60));
  const partsCount = item?.partsCount ?? 0;
  const totalQuestions = item?.totalQuestions ?? 0;
  const navigate = useNavigate();

  return (
    <div className="practice-card">
      <button
        className={`bookmark-btn ${bookmarked ? "active" : ""}`}
        title={bookmarked ? "Bỏ lưu" : "Lưu đề"}
        onClick={() => onToggleBookmark?.(item.id)}
      >
        <StarFilled />
      </button>

      <div className="title">{item?.title ?? "Untitled Set"}</div>

      <div className="meta">
        <span className="meta-chip">
          <ClockCircleOutlined /> {minutes} phút
        </span>
        <span className="dot">|</span>
        <span className="meta-chip">
          <AppstoreOutlined /> {partsCount} phần
        </span>
        <span className="dot">|</span>
        <span className="meta-chip">
          <QuestionCircleOutlined /> {totalQuestions} câu
        </span>
      </div>

      <div className="tags">
        {item?.tags?.map((t) => (
          <span key={t} className="tag">
            #{t}
          </span>
        ))}
      </div>

      <div className="footer">
        <div className="stats">
          <span className="meta-chip">
            <TeamOutlined /> {item?.stats?.users ?? 0}
          </span>
          <span className="dot">|</span>
          <span className="meta-chip">
            <LineChartOutlined /> {item?.stats?.attempts ?? 0}
          </span>
        </div>

        <Button
          type="primary"
          size="middle"
          onClick={() => navigate(`/practice/${item?.id}`)}
        >
          Chi tiết
        </Button>
      </div>
    </div>
  );
};

export default PracticeCard;
