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

  const images = ["/images/1.png", "/images/2.png", "/images/3.png"];

  // ===== FETCH TOEIC MCQ =====
  const {
    data: toeicAttempts = [],
    isLoading: loadingToeic,
    isError: toeicError,
  } = useQuery({
    queryKey: ["my-toeic-attempts"],
    queryFn: () => getMyToeicRecentAttempts(30),
  });

  // ===== FETCH WRITING =====
  const {
    data: writingAttempts = [],
    isLoading: loadingWriting,
    isError: writingError,
  } = useQuery({
    queryKey: ["my-writing-attempts"],
    queryFn: () => getMyWritingRecentAttempts(30),
  });

  // ===== CHUẨN HOÁ DATA CHO CHART =====

  const toeicChartData = useMemo(
  () =>
    (toeicAttempts || []).map((a) => ({
      // dùng full datetime để mỗi attempt là 1 mốc riêng
      date: new Date(a.createdAt).toLocaleString("vi-VN"),

      score: a.totalScore ?? 0,             // % đúng
      setTitle: a.setTitle || "Đề không tên",

      // thêm info để tooltip dùng
      mode: a.mode === "full" ? "Full test" : "Theo part",
      partSummary: a.partSummary || "",     // ví dụ: "P1, P2"
    })),
  [toeicAttempts]
  );

  const writingChartData = useMemo(
    () =>
      (writingAttempts || []).map((a) => ({
        date: new Date(a.createdAt).toLocaleString("vi-VN"),
        score: a.predictedToeicScore ?? 0,
        setTitle: a.setTitle || "Đề không tên",
      })),
    [writingAttempts]
  );

  const toeicLineConfig = {
    data: toeicChartData,
    xField: "date",
    yField: "score",
    smooth: true,
    point: { size: 4 },
    yAxis: { min: 0, max: 100 },

    tooltip: {
      customContent: (title, items) => {
        if (!items || items.length === 0) return null;
        const d = items[0].data;

        return `
          <div style="padding:8px 12px;">
            <div><b>${d.date}</b></div>
            <div style="margin-top:4px;">
              <div><b>${d.setTitle}</b></div>
              <div>Kiểu làm: ${d.mode || "-"}</div>
              ${
                d.partSummary
                  ? `<div>Part: ${d.partSummary}</div>`
                  : ""
              }
              <div>Điểm: <b>${d.score}%</b></div>
            </div>
          </div>
        `;
      },
    },
  };

  const writingLineConfig = {
    data: writingChartData,
    xField: "date",
    yField: "score",
    seriesField: "setTitle",
    smooth: true,
    point: { size: 4 },
    yAxis: { min: 0, max: 200 },
    legend: { position: "top" },
    tooltip: {
      formatter: (item) => ({
        name: item.setTitle,
        value: item.score,
      }),
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
              {loadingToeic ? (
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
              {loadingToeic ? (
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
              {loadingWriting ? (
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
              {loadingWriting ? (
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
