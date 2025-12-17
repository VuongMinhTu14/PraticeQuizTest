import { useMemo, useEffect, useState } from "react";
import { Carousel, Card, Table, Empty, Spin, Row, Col, Button } from "antd";
import {
  SmileTwoTone,
  ThunderboltOutlined,
  TrophyFilled,
  FireFilled,
  ClockCircleOutlined,
  FlagTwoTone,
  FieldTimeOutlined,
  ArrowRightOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { Line } from "@ant-design/plots";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../utils/authStore";
import {
  getMyToeicRecentAttempts,
  getMyWritingRecentAttempts,
} from "../../utils/toeicApi";
import "./dashboard.css";

const images = ["/images/1.png", "/images/2.png", "/images/3.png"];

const Dashboard = () => {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [dailyGoal, setDailyGoal] = useState(1); // số lần luyện/ngày
  const [goalInput, setGoalInput] = useState("1");
  const [lastAttemptLocal, setLastAttemptLocal] = useState(null);

  const username = currentUser?.username || currentUser?.displayName || "User";
  const userId =
    currentUser?._id || currentUser?.id || currentUser?.userId || null;

  useEffect(() => {
    const saved = Number(localStorage.getItem("pq_goal_daily") || 1);
    if (!Number.isNaN(saved) && saved > 0) {
      setDailyGoal(saved);
      setGoalInput(String(saved));
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("pq_last_attempt");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setLastAttemptLocal(parsed);
    } catch (e) {
      console.error("parse pq_last_attempt failed", e);
    }
  }, []);

  // ===== FETCH TOEIC MCQ =====
  const {
    data: toeicAttemptsRaw,
    isLoading: loadingToeic,
    isError: toeicError,
  } = useQuery({
    queryKey: ["my-toeic-attempts", userId],
    queryFn: () => getMyToeicRecentAttempts(30),
    enabled: !!userId,
  });

  const toeicAttempts = useMemo(() => {
    return (toeicAttemptsRaw || []).map((a) => {
      const sbp = a.scoreByPart || [];
      const partSummary = sbp.length
        ? sbp
            .map(
              (p) =>
                `${p.partKey.toUpperCase()}: ${p.correct}/${p.total} (${p.percent}%)`
            )
            .join(" · ")
        : "";

      return {
        ...a,
        partSummary,
      };
    });
  }, [toeicAttemptsRaw]);

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

  // ===== COMBINED ATTEMPTS FOR STREAK/GOAL =====
  const combinedAttempts = useMemo(() => {
    const normalizeDate = (d) => {
      const date = new Date(d);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;
    };

    const map = [];
    (toeicAttemptsRaw || []).forEach((a) => {
      if (a?.createdAt) {
        map.push({ dateKey: normalizeDate(a.createdAt) });
      }
    });
    (writingAttemptsRaw || []).forEach((a) => {
      if (a?.createdAt) {
        map.push({ dateKey: normalizeDate(a.createdAt) });
      }
    });
    return map;
  }, [toeicAttemptsRaw, writingAttemptsRaw]);

  const goalAndStreak = useMemo(() => {
    const todayKey = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
    })();

    const countByDay = combinedAttempts.reduce((acc, cur) => {
      acc[cur.dateKey] = (acc[cur.dateKey] || 0) + 1;
      return acc;
    }, {});

    const todayCount = countByDay[todayKey] || 0;

    const uniqueDays = Array.from(new Set(combinedAttempts.map((c) => c.dateKey))).sort(
      (a, b) => (a < b ? 1 : -1)
    );

    const keyToDate = (key) => new Date(`${key}T00:00:00`);
    let streak = 0;
    if (uniqueDays.length > 0 && uniqueDays[0] === todayKey) {
      streak = 1;
      for (let i = 1; i < uniqueDays.length; i++) {
        const prev = keyToDate(uniqueDays[i - 1]);
        const cur = keyToDate(uniqueDays[i]);
        const diffDays = Math.round((prev - cur) / (24 * 60 * 60 * 1000));
        if (diffDays === 1) streak += 1;
        else break;
      }
    }

    const progress = dailyGoal > 0 ? Math.min(todayCount / dailyGoal, 1) : 0;
    return { todayCount, streak, progress };
  }, [combinedAttempts, dailyGoal]);

  // ===== CHUẨN HÓA DATA CHO CHART =====
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
      const score =
        a.predictedToeicScore ?? a.scores?.predictedToeicScore ?? 0;

      return {
        label: a.setTitle || "Đề không tên",
        score,
        dateLabel: d.toLocaleString("vi-VN"),
      };
    });
  }, [writingAttempts]);

  const toeicLineConfig = {
    data: toeicChartData,
    xField: "label",
    yField: "score",
    smooth: true,
    point: { size: 4 },
    xAxis: {
      type: "cat",
      title: { text: "Đề TOEIC" },
    },
    yAxis: { min: 0, max: 100 },
    legend: false,
    tooltip: {
      customContent: (_title, items) => {
        if (!items || items.length === 0) return null;
        const d = items[0].data;

        return `
          <div style="padding:8px 12px;">
            <div><b>${d.setTitle}</b></div>
            <div>${d.dateLabel}</div>
            <div>Kiểu làm: ${d.mode || "-"}</div>
            ${d.partSummary ? `<div>Part: ${d.partSummary}</div>` : ""}
            <div>Điểm: <b>${d.score}%</b></div>
          </div>
        `;
      },
    },
  };

  const writingLineConfig = {
    data: writingChartData,
    xField: "label",
    yField: "score",
    smooth: true,
    point: { size: 4 },
    xAxis: {
      type: "cat",
      title: { text: "Đề writing" },
    },
    yAxis: { min: 0, max: 200 },
    legend: false,
    tooltip: {
      customContent: (_title, items) => {
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
    {
      title: "Chi tiết theo Part",
      dataIndex: "partSummary",
      render: (v) => v || "-",
    },
    {
      title: "",
      render: (_, record) => (
        <a
          style={{ color: "#2563eb", cursor: "pointer" }}
          onClick={() => navigate(`/attempt/${record.id}/review`)}
        >
          Xem chi tiết
        </a>
      ),
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
      title: "Điểm TOEIC (0-200)",
      render: (_, r) => {
        const v =
          r.predictedToeicScore ?? r.scores?.predictedToeicScore ?? null;
        return v == null ? "-" : v;
      },
    },
    {
      title: "Level",
      render: (_, r) => {
        const lvl = r.toeicWritingLevel ?? r.scores?.toeicWritingLevel ?? null;
        return lvl ? `Level ${lvl}` : "-";
      },
    },
    {
      title: "Overall (0-5)",
      render: (_, r) => {
        const v = r.overallScore ?? r.scores?.overallScore ?? null;
        if (v == null) return "-";
        return v.toFixed ? v.toFixed(1) : v;
      },
    },
    {
      title: "",
      render: (_, r) => (
        <a
          style={{ color: "#2563eb", cursor: "pointer" }}
          onClick={() => navigate(`/attempt-writing/${r.id}/review`)}
        >
          Xem chi tiết
        </a>
      ),
    },
  ];

  // ===== DASHBOARD STATS =====
  const computedStats = useMemo(() => {
    const totalToeic = toeicAttempts.length;
    const totalWriting = writingAttempts.length;
    const totalPractice = totalToeic + totalWriting;

    const toeicScores = toeicAttempts
      .map((x) => x.totalScore)
      .filter((v) => v != null);
    const avgToeic =
      toeicScores.length === 0
        ? 0
        : Math.round(
            toeicScores.reduce((sum, v) => sum + Number(v), 0) /
              toeicScores.length
          );
    const bestToeic =
      toeicScores.length === 0 ? 0 : Math.max(...toeicScores.map(Number));

    const writingScores = writingAttempts
      .map((w) => w.predictedToeicScore ?? w.scores?.predictedToeicScore)
      .filter((v) => v != null);
    const avgWriting =
      writingScores.length === 0
        ? 0
        : Math.round(
            writingScores.reduce((sum, v) => sum + Number(v), 0) /
              writingScores.length
          );

    return {
      totalPractice,
      avgToeic,
      bestToeic,
      avgWriting,
    };
  }, [toeicAttempts, writingAttempts]);

  const handleSaveGoal = () => {
    const val = Math.max(1, Number(goalInput) || 1);
    setDailyGoal(val);
    setGoalInput(String(val));
    localStorage.setItem("pq_goal_daily", String(val));
  };

  return (
    <div className="dashboard-page">
      <div className="hero">
        <div className="hero-text">
          <p className="eyebrow">PracticeQuiz / TOEIC Lab</p>
          <h2>
            Xin chào, <strong>{username}</strong> <SmileTwoTone />
          </h2>
          <p className="hero-sub">
            Luyện đề, xem lại, và tăng tốc điểm TOEIC của bạn. Chọn một hành
            động nhanh để bắt đầu ngay.
          </p>
          <div className="hero-actions">
            <Button type="primary" onClick={() => navigate("/practice")}>
              Làm full test ngay
            </Button>
            <Button onClick={() => navigate("/practice/writing")}>
              Luyện Writing
            </Button>
          </div>
          {lastAttemptLocal?.attemptId && (
            <div className="resume-inline">
              <div>
                <div className="resume-label">Tiếp tục lần làm dở</div>
                <div className="resume-set">
                  {lastAttemptLocal.setTitle || `Đề ${lastAttemptLocal.setId}`}
                </div>
              </div>
              <div className="resume-actions">
                <Button
                  type="primary"
                  icon={<ArrowRightOutlined />}
                  onClick={() => navigate(`/attempt/${lastAttemptLocal.attemptId}`)}
                >
                  Tiếp tục
                </Button>
                <Button
                  type="text"
                  shape="circle"
                  icon={<CloseOutlined />}
                  title="Xóa lưu"
                  onClick={() => {
                    localStorage.removeItem("pq_last_attempt");
                    setLastAttemptLocal(null);
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="hero-carousel">
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
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <span className="icon success">
            <ThunderboltOutlined />
          </span>
          <div>
            <div className="label">Lượt luyện trong 30 ngày</div>
            <div className="value">{computedStats.totalPractice}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="icon info">
            <TrophyFilled />
          </span>
          <div>
            <div className="label">Điểm TOEIC TB</div>
            <div className="value">{computedStats.avgToeic}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="icon warn">
            <FireFilled />
          </span>
          <div>
            <div className="label">Best TOEIC</div>
            <div className="value">{computedStats.bestToeic}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="icon neutral">
            <ClockCircleOutlined />
          </span>
          <div>
            <div className="label">Writing (0-200) TB</div>
            <div className="value">{computedStats.avgWriting}</div>
          </div>
        </div>
        <div className="stat-card goal-card">
          <span className="icon goal">
            <FlagTwoTone twoToneColor={["#22c55e", "#16a34a"]} />
          </span>
          <div className="goal-content">
            <div className="label">Goal hôm nay</div>
            <div className="goal-progress">
              <div className="goal-text">
                {goalAndStreak.todayCount}/{dailyGoal} lượt
              </div>
              <div className="goal-bar">
                <div
                  className="goal-fill"
                  style={{ width: `${goalAndStreak.progress * 100}%` }}
                />
              </div>
            </div>
              <div className="goal-input-row">
                <input
                  type="number"
                  min="1"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                />
                <Button type="primary" onClick={handleSaveGoal}>
                  Lưu
                </Button>
              </div>
            </div>
          </div>
        <div className="stat-card streak-card">
          <span className="icon streak">
            <FieldTimeOutlined />
          </span>
          <div>
            <div className="label">Streak luyện</div>
            <div className="value">{goalAndStreak.streak} ngày</div>
            <div className="streak-sub">Tính khi mỗi ngày có ít nhất 1 lượt</div>
          </div>
        </div>
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
                    emptyText: <Empty description="Chưa có bài TOEIC nào" />,
                  }}
                />
              )}
            </Card>
          </Col>

          {/* Writing Chart */}
          <Col xs={24} lg={24}>
            <Card
              title="Điểm TOEIC Writing (0-200) trong 30 ngày gần đây"
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
                    emptyText: <Empty description="Chưa có bài Writing nào" />,
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
