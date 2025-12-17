import { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Select, Spin, Alert } from "antd";
import { fetchAdminOverview } from "../../api/adminApi";
import "./Dashboard.css";

const shortDate = (dateStr = "") => dateStr.slice(5);

const MiniBar = ({ data = [], color = "#2563eb" }) => {
  const max = Math.max(...data.map((d) => d.count), 0);
  return (
    <div className="mini-bar">
      {data.map((d) => {
        const height = max ? Math.max(4, (d.count / max) * 48) : 4;
        return (
          <div className="mini-bar-col" key={d.date} title={`${d.date}: ${d.count}`}>
            <div className="mini-bar-count">{d.count}</div>
            <div className="mini-bar-item" style={{ height, backgroundColor: color }} />
            <div className="mini-bar-label">{shortDate(d.date)}</div>
          </div>
        );
      })}
    </div>
  );
};

const ChartCard = ({ title, data = [], color }) => {
  const total = data.reduce((s, d) => s + (d.count || 0), 0);
  const first = data[0]?.date;
  const last = data[data.length - 1]?.date;
  const peak = data.reduce(
    (acc, d) => (d.count > acc.count ? d : acc),
    data[0] || { count: 0, date: "" }
  );
  const low = data.reduce(
    (acc, d) => (d.count < acc.count ? d : acc),
    data[0] || { count: 0, date: "" }
  );

  return (
    <Card title={title} className="chart-card">
      <div className="chart-meta-row">
        <span className="chart-meta-total">{total} lượt</span>
        <span className="chart-meta-range">
          {first && last ? `${shortDate(first)} → ${shortDate(last)}` : "Chưa có dữ liệu"}
        </span>
      </div>
      <div className="chart-meta-sub">
        <span>Cao nhất: {peak?.count ?? 0} ({peak?.date ? shortDate(peak.date) : "-"})</span>
        <span>Thấp nhất: {low?.count ?? 0} ({low?.date ? shortDate(low.date) : "-"})</span>
      </div>
      <MiniBar data={data} color={color} />
    </Card>
  );
};

const StatCard = ({ title, value, suffix, color }) => (
  <Card className="stat-card" bordered={false}>
    <Statistic title={title} value={value ?? "-"} suffix={suffix} valueStyle={{ color }} />
  </Card>
);

const Dashboard = () => {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  const load = async (range) => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetchAdminOverview(range);
      setData(res);
    } catch (e) {
      setErr(e?.message || "Khong tai duoc thong ke");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
          <div>
            <h2>Dashboard hệ thống</h2>
            <div className="dashboard-sub">
              Thống kê user, lượt làm bài Listening & Reading, lượt làm bài Writing, fallback AI (range {data?.range?.from} &rarr; {data?.range?.to})
            </div>
          </div>
        <Select
          value={days}
          onChange={setDays}
          options={[
            { value: 7, label: "7 ngay" },
            { value: 30, label: "30 ngay" },
            { value: 90, label: "90 ngay" },
          ]}
        />
      </div>

      {loading && <Spin />}
      {err && <Alert type="error" message={err} />}

      {!loading && !err && data && (
        <>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <StatCard title="Tổng user" value={data.totals?.users} color="#111827" />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard title="User mới" value={data.recent?.newUsers} suffix={`/${days} ngày`} color="#2563eb" />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard title="Attempt L&R" value={data.totals?.toeicAttempts} color="#16a34a" />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard title="Attempt Writing" value={data.totals?.writingAttempts} color="#9333ea" />
            </Col>
          </Row>

          <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
            <Col xs={24} sm={12} md={8}>
              <ChartCard
                title="Lượt làm Listening & Reading (theo ngày)"
                data={data.charts?.toeicAttemptsByDate || []}
                color="#2563eb"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <ChartCard
                title="Lượt làm Writing (theo ngày)"
                data={data.charts?.writingAttemptsByDate || []}
                color="#a855f7"
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <ChartCard
                title="User mới (theo ngày)"
                data={data.charts?.newUsersByDate || []}
                color="#10b981"
              />
            </Col>
          </Row>

          <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="Avg TOEIC % (recent)"
                value={data.averages?.toeicPercent}
                suffix="%"
                color="#2563eb"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="Avg Writing overall (recent)"
                value={data.averages?.writingOverall}
                suffix="/5"
                color="#a855f7"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="Attempt L&R (recent)"
                value={data.recent?.toeicAttempts}
                suffix={`/ ${days} ngày`}
                color="#16a34a"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="Attempt Writing (recent)"
                value={data.recent?.writingAttempts}
                suffix={`/ ${days} ngày`}
                color="#9333ea"
              />
            </Col>
          </Row>

          <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
            <Col xs={24} sm={12} md={6}>
              <StatCard
                title="Fallback AI Writing (recent)"
                value={data.fallbackAi}
                suffix={`/${days} ngày`}
                color="#dc2626"
              />
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Dashboard;
