// client/src/routes/dashboard/dashboard.jsx
import { useMemo } from "react";
import { Carousel, Card, Table, Empty, Spin, Row, Col } from "antd";
import { SmileTwoTone } from "@ant-design/icons";
import { Line } from "@ant-design/plots";
import { useQuery } from "@tanstack/react-query";

import useAuthStore from "../../utils/authStore";
import {
  getMyToeicRecentAttempts,
  getMyWritingRecentAttempts,
} from "../../utils/toeicApi";

import "./dashboard.css";

const Dashboard = () => {
  const { currentUser } = useAuthStore();

  const username =
    currentUser?.username || currentUser?.displayName || "User";

  // lấy userId dùng cho query key
  const userId =
    currentUser?._id || currentUser?.id || currentUser?.userId || null;

  const images = ["/images/1.png", "/images/2.png", "/images/3.png"];

  // ===== FETCH TOEIC MCQ =====
  const {
    data: toeicAttemptsRaw,
    isLoading: loadingToeic,
    isError: toeicError,
  } = useQuery({
    queryKey: ["my-toeic-attempts", userId],
    queryFn: () => getMyToeicRecentAttempts(30),
    enabled: !!userId, // chỉ gọi khi đã có user
  });

  const toeicAttempts = toeicAttemptsRaw || [];

  // ===== FETCH WRITING =====
  const {
    data: writingAttemptsRaw,
    isLoading: loadingWriting,
    isError: writingError,
  } = useQuery({
    queryKey: ["my-writing-attempts", userId],
    queryFn: () => getMyWritingRecentAttempts(30),
    enabled: !!userId,
  });

  const writingAttempts = writingAttemptsRaw || [];

  // ===== CHUẨN HOÁ DATA CHO CHART =====

  const toeicChartData = useMemo(() => {
    const sorted = [...(toeicAttempts || [])].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    return sorted.map((a, idx) => {
      const d = new Date(a.createdAt);
      return {
        label:
          (a.setTitle || "Đề không tên") +
          (sorted.filter((x) => x.setId === a.setId).length > 1
            ? ` (#${idx + 1})`
            : ""),
        score: a.totalScore ?? 0,
        setTitle: a.setTitle || "Đề không tên",
        mode: a.mode === "full" ? "Full test" : "Theo part",
        partSummary: a.partSummary || "",
        dateLabel: d.toLocaleString("vi-VN"),
      };
    });
  }, [toeicAttempts]);

  const writingChartData = useMemo(() => {
    const sorted = [...(writingAttempts || [])].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    return sorted.map((a) => {
      const d = new Date(a.createdAt);
      return {
        // trục X là tên đề (category)
        label: a.setTitle || "Đề không tên",
        score: a.predictedToeicScore ?? 0,
        dateLabel: d.toLocaleString("vi-VN"), // dùng cho tooltip
      };
    });
  }, [writingAttempts]);

  const toeicLineConfig = {
    data: toeicChartData,
    xField: "label",   // 🔥 trục X là tên đề
    yField: "score",
    smooth: true,
    point: { size: 4 },
    xAxis: {
      type: "cat",     // category axis
      title: { text: "Đề TOEIC" },
    },
    yAxis: { min: 0, max: 100 },
    legend: false,
    tooltip: {
      customContent: (title, items) => {
        if (!items || items.length === 0) return null;
        const d = items[0].data;

        return `
          <div style="padding:8px 12px;">
            <div><b>${d.setTitle}</b></div>
            <div>${d.dateLabel}</div>
            <div>Kiểu làm: ${d.mode || "-"}</div>
            ${
              d.partSummary
                ? `<div>Part: ${d.partSummary}</div>`
                : ""
            }
            <div>Điểm: <b>${d.score}%</b></div>
          </div>
        `;
      },
    },
  };

  const writingLineConfig = {
    data: writingChartData,
    xField: "label",      // trục X là tên đề
    yField: "score",
    smooth: true,
    point: { size: 4 },
    xAxis: {
      type: "cat",        // category axis
      title: { text: "Đề writing" },
    },
    yAxis: { min: 0, max: 200 },
    legend: false,        // một đường duy nhất, không cần legend
    tooltip: {
      customContent: (title, items) => {
        if (!items?.length) return null;
        const d = items[0].data;
        return `
          <div style="padding:8px 12px;">
            <div><b>${d.label}</b></div>
            <div>${d.dateLabel}</div>
            <div>Điểm: <b>${d.score}</b></div>
          </div>
        `;
      },
    },
  };

  // ===== COLUMNS TABLE =====
  const toeicColumns = [
    {
      title: "Ngày làm bài",
      dataIndex: "createdAt",
      render: (v) => new Date(v).toLocaleString("vi-VN"),
    },
    {
      title: "Đề",
      dataIndex: "setTitle",
    },
    {
      title: "Kiểu làm",
      dataIndex: "mode",
      render: (v) => (v === "full" ? "Full test" : "Theo part"),
    },
    {
      title: "Điểm (%)",
      dataIndex: "totalScore",
      render: (v) => (v == null ? "-" : `${v}%`),
    },
    {
      title: "Số câu đúng",
      render: (_, r) =>
        r.totalCorrect != null && r.totalQuestions != null
          ? `${r.totalCorrect}/${r.totalQuestions}`
          : "-",
    },
  ];

  const writingColumns = [
    {
      title: "Ngày làm bài",
      dataIndex: "createdAt",
      render: (v) => new Date(v).toLocaleString("vi-VN"),
    },
    {
      title: "Đề",
      dataIndex: "setTitle",
    },
    {
      title: "Điểm TOEIC (0–200)",
      dataIndex: "predictedToeicScore",
      render: (v) => (v == null ? "-" : v),
    },
    {
      title: "Level",
      dataIndex: "toeicWritingLevel",
      render: (v) => (v ? `Level ${v}` : "-"),
    },
    {
      title: "Overall (0–5)",
      dataIndex: "overallScore",
      render: (v) =>
        v == null ? "-" : v.toFixed ? v.toFixed(1) : v,
    },
  ];

  return (
    <div className="dashboard-page">
      <h2>
        Xin chào, <strong>{username}</strong> <SmileTwoTone />
      </h2>

      <div className="slide-container">
        <Carousel autoplay dots={{ className: "custom-dots" }}>
          {images.map((src, i) => (
            <div key={i} className="slide-frame">
              <div className="slide-media">
                <img src={src} alt={`slide-${i}`} loading="lazy" />
              </div>
            </div>
          ))}
        </Carousel>
      </div>

      <div className="dashboard-stats">
        <Row gutter={[16, 16]}>
          {/* TOEIC MCQ Chart */}
          <Col xs={24} lg={24}>
            <Card
              title="Điểm các đề TOEIC trong 30 ngày gần đây"
              className="stats-card"
            >
              {!userId ? (
                <Empty description="Đăng nhập để xem lịch sử TOEIC" />
              ) : loadingToeic ? (
                <Spin />
              ) : toeicError ? (
                <div>Lỗi tải dữ liệu TOEIC.</div>
              ) : toeicChartData.length === 0 ? (
                <Empty description="Bạn chưa làm đề TOEIC nào trong 30 ngày qua" />
              ) : (
                <Line {...toeicLineConfig} />
              )}
            </Card>
          </Col>

          {/* TOEIC MCQ Table */}
          <Col xs={24} lg={24}>
            <Card title="Chi tiết bài làm TOEIC" className="stats-card">
              {!userId ? (
                <Empty description="Đăng nhập để xem lịch sử TOEIC" />
              ) : loadingToeic ? (
                <Spin />
              ) : toeicError ? (
                <div>Lỗi tải dữ liệu TOEIC.</div>
              ) : (
                <Table
                  rowKey="id"
                  dataSource={toeicAttempts}
                  columns={toeicColumns}
                  pagination={{ pageSize: 5 }}
                  locale={{
                    emptyText: (
                      <Empty description="Chưa có bài TOEIC nào" />
                    ),
                  }}
                />
              )}
            </Card>
          </Col>

          {/* Writing Chart */}
          <Col xs={24} lg={24}>
            <Card
              title="Điểm TOEIC Writing (0–200) trong 30 ngày gần đây"
              className="stats-card"
            >
              {!userId ? (
                <Empty description="Đăng nhập để xem lịch sử Writing" />
              ) : loadingWriting ? (
                <Spin />
              ) : writingError ? (
                <div>Lỗi tải dữ liệu Writing.</div>
              ) : writingChartData.length === 0 ? (
                <Empty description="Bạn chưa có bài Writing nào trong 30 ngày qua" />
              ) : (
                <Line {...writingLineConfig} />
              )}
            </Card>
          </Col>

          {/* Writing Table */}
          <Col xs={24} lg={24}>
            <Card title="Chi tiết bài TOEIC Writing" className="stats-card">
              {!userId ? (
                <Empty description="Đăng nhập để xem lịch sử Writing" />
              ) : loadingWriting ? (
                <Spin />
              ) : writingError ? (
                <div>Lỗi tải dữ liệu Writing.</div>
              ) : (
                <Table
                  rowKey="id"
                  dataSource={writingAttempts}
                  columns={writingColumns}
                  pagination={{ pageSize: 5 }}
                  locale={{
                    emptyText: (
                      <Empty description="Chưa có bài Writing nào" />
                    ),
                  }}
                />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;
