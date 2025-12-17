import "./practiceDetail.css";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ClockCircleOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import { Button, message } from "antd";
import {
  getToeicSet,
  createToeicAttempt,
  getToeicLastResult,
} from "../../utils/toeicApi";

const PracticeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const navResult = location.state?.lastResult || null;

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState([]);
  const [limit, setLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [lastResult, setLastResult] = useState(navResult);
  const [lastAttemptLocal, setLastAttemptLocal] = useState(null);

  const [msgApi, contextHolder] = message.useMessage();

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

  // ===== LOAD CHI TIáº¾T Äá»€ =====
  useEffect(() => {
    if (!id) return;

    let alive = true;
    setLoading(true);

    getToeicSet(id)
      .then((data) => {
        if (!alive) return;
        setTest(data);
        setSelected([]);
      })
      .catch((err) => {
        console.error("getToeicSet error:", err);
        if (alive)
          msgApi.error("KhÃ´ng táº£i Ä‘Æ°á»£c thÃ´ng tin Ä‘á» thi TOEIC");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id, msgApi]);

  // ===== Láº¤Y Káº¾T QUáº¢ Gáº¦N NHáº¤T =====
  useEffect(() => {
    let alive = true;

    if (navResult) {
      setLastResult(navResult);
      return;
    }

    const fetchLast = async () => {
      try {
        const res = await getToeicLastResult(id);
        if (!alive) return;

        if (res.ok && res.data) setLastResult(res.data);
        else setLastResult(null);
      } catch (err) {
        console.error("getToeicLastResult error:", err);
      }
    };

    if (id) fetchLast();

    return () => {
      alive = false;
    };
  }, [id, navResult]);

  const togglePart = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectedProgress = useMemo(() => {
    const total = test?.parts?.length || 0;
    const count = selected.length;
    const percent = total === 0 ? 0 : Math.round((count / total) * 100);
    return { total, count, percent };
  }, [selected, test]);

  // ====== Báº®T Äáº¦U LUYá»†N THEO PART ======
  const handleStartPractice = async () => {
    if (!test) return;
    if (selected.length === 0) {
      msgApi.warning("Chá»n Ã­t nháº¥t 1 pháº§n thi Ä‘á»ƒ luyá»‡n táº­p nha!");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        selectedParts: selected,
        timeLimitSec: limit ? Number(limit) * 60 : null,
      };

      const res = await createToeicAttempt(test.id, payload);

      if (!res.ok) {
        msgApi.error(res.msg || "KhÃ´ng táº¡o Ä‘Æ°á»£c bÃ i luyá»‡n táº­p");
        return;
      }

      msgApi.success("Táº¡o bÃ i luyá»‡n táº­p thÃ nh cÃ´ng, báº¯t Ä‘áº§u thÃ´i!");
      localStorage.setItem(
        "pq_last_attempt",
        JSON.stringify({
          attemptId: res.attemptId,
          setId: test.id,
          setTitle: test.title,
          mode: "practice",
          createdAt: new Date().toISOString(),
        })
      );
      navigate(`/attempt/${res.attemptId}`);
    } catch (err) {
      console.error("createAttempt error:", err);
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.msg;

      if (status === 401) {
        msgApi.warning(serverMsg || "Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ luyá»‡n Ä‘á»");
      } else {
        msgApi.error(serverMsg || "KhÃ´ng táº¡o Ä‘Æ°á»£c bÃ i luyá»‡n táº­p, thá»­ láº¡i sau");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ====== Báº®T Äáº¦U FULL TEST ======
  const handleStartFullTest = async () => {
    if (!test) return;

    const allParts = (test.parts || []).map((p) => p.key);
    if (allParts.length === 0) {
      msgApi.error("Äá» nÃ y chÆ°a cÃ³ cáº¥u trÃºc part, khÃ´ng thá»ƒ lÃ m full test");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        selectedParts: allParts,
        timeLimitSec: test.durationSec || null,
      };

      const res = await createToeicAttempt(test.id, payload);

      if (!res.ok) {
        msgApi.error(res.msg || "KhÃ´ng táº¡o Ä‘Æ°á»£c full test");
        return;
      }

      msgApi.success("Full test Ä‘Ã£ sáºµn sÃ ng, cá»‘ lÃªn!");
      localStorage.setItem(
        "pq_last_attempt",
        JSON.stringify({
          attemptId: res.attemptId,
          setId: test.id,
          setTitle: test.title,
          mode: "full",
          createdAt: new Date().toISOString(),
        })
      );
      navigate(`/attempt/${res.attemptId}`);
    } catch (err) {
      console.error("createFullTest error:", err);
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.msg;

      if (status === 401) {
        msgApi.warning(serverMsg || "Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ lÃ m full test");
      } else {
        msgApi.error(serverMsg || "KhÃ´ng táº¡o Ä‘Æ°á»£c full test, thá»­ láº¡i sau");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!id) {
    return (
      <div className="detail-page">
        {contextHolder}
        <p>ÄÆ°á»ng dáº«n khÃ´ng há»£p lá»‡ (thiáº¿u mÃ£ Ä‘á»).</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="detail-page">
        {contextHolder}
        <p>Äang táº£i thÃ´ng tin Ä‘á» thi...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="detail-page">
        {contextHolder}
        <p>KhÃ´ng tÃ¬m tháº¥y Ä‘á» thi TOEIC nÃ y.</p>
      </div>
    );
  }

  const minutes = Math.round((test.durationSec ?? 0) / 60);

  return (
    <div className="detail-page">
      {contextHolder}

      <Button className="btn-back" htmlType="button" onClick={() => navigate(-1)}>
        {"<"} Quay láº¡i
      </Button>

      <div className="detail-hero-card">
        <div>
          <div className="chip">#TOEIC</div>
          <h1 className="title">{test.title}</h1>
          <p className="hero-note">
            Luyá»‡n theo part hoáº·c lÃ m full test vá»›i thá»i gian chuáº©n, Ä‘iá»ƒm sáº½ lÆ°u
            vá» dashboard cá»§a báº¡n.
          </p>

          <div className="hero-meta">
            <span>
              <ClockCircleOutlined /> Thá»i gian: {minutes} phÃºt
            </span>
            <span>|</span>
            <span>
              <FileTextOutlined /> {test.parts?.length || 0} pháº§n thi
            </span>
            <span>|</span>
            <span>
              <CheckSquareOutlined /> {test.totalQuestions} cÃ¢u há»i
            </span>
          </div>
        </div>

        <div className="hero-side">
          <div className="info-block">
            <div className="info-label">Tá»•ng quan</div>
            <div className="info-row">
              <span>Thá»i lÆ°á»£ng</span>
              <strong>{minutes} phÃºt</strong>
            </div>
            <div className="info-row">
              <span>Part</span>
              <strong>{test.parts?.length || 0}</strong>
            </div>
            <div className="info-row">
              <span>Tá»•ng cÃ¢u</span>
              <strong>{test.totalQuestions}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-left">
          {lastAttemptLocal?.setId === test.id && (
            <div className="resume-card">
              <div>
                <div className="resume-title">Báº¡n cÃ²n dá»Ÿ má»™t láº§n lÃ m</div>
                <div className="resume-sub">Äá»: {lastAttemptLocal.setTitle || test.title}</div>
              </div>
              <Button
                type="primary"
                className="resume-btn"
                onClick={() => navigate(`/attempt/${lastAttemptLocal.attemptId}`)}
              >
                Tiáº¿p tá»¥c
              </Button>
            </div>
          )}

          {lastResult && lastResult.setId === test.id && (
            <div className="result-card">
              <div className="result-header">
                <div>
                  <p className="sub">Káº¿t quáº£ gáº§n nháº¥t</p>
                  <h3>{lastResult.scorePercent}%</h3>
                </div>
                <div className="score-box">
                  <div>ÄÃºng</div>
                  <strong>
                    {lastResult.scoreRaw}/
                    {lastResult.totalQuestions || test.totalQuestions}
                  </strong>
                </div>
              </div>

              {Array.isArray(lastResult.scoreByPart) && (
                <div className="result-parts">
                  {lastResult.scoreByPart.map((p) => (
                    <span key={p.partKey} className="part-badge">
                      {p.partKey.toUpperCase()}: {p.correct}/{p.total}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="tags-block">
            <div className="label">Tags</div>
            <div className="tag-row">
              {(test.parts || [])
                .flatMap((p) => p.tags || [])
                .slice(0, 20)
                .map((tag) => (
                  <span key={tag} className="tag">
                    #{tag}
                  </span>
                ))}
            </div>
          </div>
        </div>

        <div className="detail-right">
          <div className="panel action-card">
            <div className="panel-title">Luyá»‡n theo part</div>
            <p className="muted">
              Chá»n part báº¡n muá»‘n luyá»‡n, Ä‘áº·t thá»i gian (tuá»³ chá»n) vÃ  báº¯t Ä‘áº§u.
            </p>

            <div className="progress">
              <div className="progress-head">
                <span>
                  ÄÃ£ chá»n {selectedProgress.count}/{selectedProgress.total} part
                </span>
                <span>{selectedProgress.percent}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${selectedProgress.percent}%` }}
                />
              </div>
            </div>

            <div className="parts">
              {test.parts?.map((p) => (
                <label
                  key={p.key}
                  className={`part ${
                    selected.includes(p.key) ? "checked" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(p.key)}
                    onChange={() => togglePart(p.key)}
                  />

                  <div className="part-main">
                    <div className="part-title">
                      {p.name}{" "}
                      <span className="count">({p.questions} cÃ¢u há»i)</span>
                    </div>
                    <div className="tag-row">
                      {p.tags?.slice(0, 10).map((tag) => (
                        <span key={tag} className="tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="time-block">
              <div className="label">
                Giá»›i háº¡n thá»i gian{" "}
                <span className="hint">(Ä‘á»ƒ trá»‘ng = khÃ´ng giá»›i háº¡n)</span>
              </div>
              <select
                className="time-select"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              >
                <option value="">-- Chá»n thá»i gian --</option>
                <option value="15">15 phÃºt</option>
                <option value="30">30 phÃºt</option>
                <option value="45">45 phÃºt</option>
                <option value="60">60 phÃºt</option>
                <option value="90">90 phÃºt</option>
                <option value="120">120 phÃºt</option>
              </select>
            </div>

            <Button
              className="btn-start"
              block
              onClick={handleStartPractice}
              loading={submitting}
            >
              {submitting ? "Äang táº¡o bÃ i luyá»‡n..." : "Luyá»‡n theo part"}
            </Button>
          </div>

          <div className="panel action-card full-card">
            <div className="panel-title">Full test</div>
            <p className="muted">
              LÃ m {test.parts?.length || 0} part ({test.totalQuestions} cÃ¢u) trong{" "}
              {minutes} phÃºt theo thá»i gian chuáº©n. Äiá»ƒm lÆ°u vÃ o dashboard.
            </p>

            <ul className="bullet">
              <li>Listening: Parts 1-4 (audio + hÃ¬nh).</li>
              <li>Reading: Parts 5-7.</li>
              <li>Má»™t bá»™ thá»i gian chung cho toÃ n bÃ i.</li>
            </ul>

            <Button
              type="primary"
              className="btn-start"
              block
              onClick={handleStartFullTest}
              loading={submitting}
            >
              {submitting ? "Äang táº¡o full test..." : "Báº¯t Ä‘áº§u full test"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeDetail;


