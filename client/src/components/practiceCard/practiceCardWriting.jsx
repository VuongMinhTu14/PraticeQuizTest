// src/components/practiceCard/practiceCardWriting.jsx
import "./practiceCard.css";
import { Link } from "react-router-dom";
import {
  ClockCircleOutlined,
  AppstoreOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  LineChartOutlined,
  EditOutlined,
} from "@ant-design/icons";

const PracticeCardWriting = ({ item }) => {
  const minutes = Math.round((item?.durationSec ?? 0) / 60) || 0;

  return (
    <div className="practice-card writing-card">
      {/* Header nhỏ trên cùng */}
      <div className="pcw-header">
        <span className="pcw-label">
          <EditOutlined /> TOEIC Writing
        </span>
        {item?.level && <span className="pcw-level">{item.level}</span>}
      </div>

      {/* Tiêu đề đề thi */}
      <div className="pcw-title">
        {item?.title ?? "TOEIC Writing Practice Set"}
      </div>

      {/* Meta info: thời gian – số phần – số câu */}
      <div className="pcw-meta">
        <span className="meta-chip">
          <ClockCircleOutlined /> {minutes} phút
        </span>
        <span className="dot">•</span>
        <span className="meta-chip">
          <AppstoreOutlined /> {item?.partsCount ?? 3} phần
        </span>
        <span className="dot">•</span>
        <span className="meta-chip">
          <QuestionCircleOutlined /> {item?.totalQuestions ?? 8} câu
        </span>
      </div>

      {/* Tag chủ đề */}
      <div className="pcw-tags">
        {(item?.tags || ["writing", "email", "essay"]).map((t) => (
          <span key={t} className="pcw-tag">
            #{t}
          </span>
        ))}
      </div>

      {/* Footer: thống kê + nút chi tiết */}
      <div className="pcw-footer">
        <div className="pcw-stats">
          <span className="meta-chip">
            <TeamOutlined /> {item?.stats?.users ?? 0}
          </span>
          <span className="dot">•</span>
          <span className="meta-chip">
            <LineChartOutlined /> {item?.stats?.attempts ?? 0}
          </span>
        </div>

        <Link to={`/practice/writing/${item?.id}`} className="pcw-button">
          Chi tiết
        </Link>
      </div>
    </div>
  );
};

export default PracticeCardWriting;
