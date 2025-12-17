import "./practiceCoach.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, message } from "antd";
import {
  getMyToeicRecentAttempts,
  getToeicSets,
  createToeicAttempt,
} from "../../utils/toeicApi";
import useAuthStore from "../../utils/authStore";
import PracticeCard from "../../components/practiceCard/practiceCard";

const normalizePartKey = (k) => (k || "").toLowerCase();

const PracticeCoach = () => {
  const { currentUser } = useAuthStore();
  const userId = currentUser?._id || currentUser?.id || currentUser?.userId || null;
  const nav = useNavigate();
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [loadingDrill, setLoadingDrill] = useState("");
  const [msgApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const raw = localStorage.getItem("pq_bookmarks_sets");
    if (!raw) return;
    try {
      setBookmarkedIds(new Set(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleBookmark = (id) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("pq_bookmarks_sets", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const { data: attemptsRaw } = useQuery({
    queryKey: ["coach-attempts", userId],
    queryFn: () => getMyToeicRecentAttempts(45),
    enabled: !!userId,
  });

  const { data: setsRaw } = useQuery({
    queryKey: ["coach-sets"],
    queryFn: () => getToeicSets(),
  });

  const partWeakness = useMemo(() => {
    if (!attemptsRaw) return [];
    const scoreMap = {};
    attemptsRaw.forEach((att) => {
      const hasByPart = Array.isArray(att.scoreByPart) && att.scoreByPart.length > 0;
      if (hasByPart) {
        att.scoreByPart.forEach((p) => {
          const key = normalizePartKey(p.partKey);
          if (!key) return;
          if (!scoreMap[key]) scoreMap[key] = [];
          scoreMap[key].push(Number(p.percent) || 0);
        });
      } else if (Array.isArray(att.selectedParts) && att.selectedParts.length) {
        const proxy =
          typeof att.totalScore === "number"
            ? att.totalScore
            : typeof att.scorePercent === "number"
            ? att.scorePercent
            : att.totalCorrect != null && att.totalQuestions
            ? Math.round((att.totalCorrect / att.totalQuestions) * 100)
            : null;
        if (proxy != null) {
          att.selectedParts.forEach((pk) => {
            const key = normalizePartKey(pk);
            if (!key) return;
            if (!scoreMap[key]) scoreMap[key] = [];
            scoreMap[key].push(proxy);
          });
        }
      }
    });
    const arr = Object.entries(scoreMap).map(([partKey, list]) => {
      const avg = list.length
        ? Math.round(list.reduce((s, v) => s + v, 0) / list.length)
        : 0;
      return { partKey, avg, count: list.length };
    });
    arr.sort((a, b) => a.avg - b.avg);
    return arr;
  }, [attemptsRaw]);

  const recommendSets = useMemo(() => {
    if (!attemptsRaw) return [];

    const fallbackByAttempt = () => {
      const sorted = [...attemptsRaw].sort((a, b) => {
        const aScore =
          typeof a.totalScore === "number"
            ? a.totalScore
            : typeof a.scorePercent === "number"
            ? a.scorePercent
            : 999;
        const bScore =
          typeof b.totalScore === "number"
            ? b.totalScore
            : typeof b.scorePercent === "number"
            ? b.scorePercent
            : 999;
        return aScore - bScore;
      });
      const seen = new Set();
      const res = [];
      sorted.forEach((att) => {
        const setId = att.setId || att.id;
        if (!setId || seen.has(setId)) return;
        seen.add(setId);
        const match =
          (setsRaw || []).find((s) => s.id === setId) || {
            id: setId,
            title: att.setTitle || `Đề ${setId}`,
            parts: att.selectedParts || [],
            stats: {},
          };
        res.push(match);
      });
      return res.slice(0, 6);
    };

    if (!setsRaw || !partWeakness.length) return fallbackByAttempt();

    const worstParts = partWeakness.slice(0, 3).map((p) => p.partKey);
    const scored = setsRaw.map((s) => {
      const parts = (s.parts || []).map((p) => normalizePartKey(p.key));
      const hit = parts.filter((p) => worstParts.includes(p));
      return { ...s, hitCount: hit.length };
    });
    const filtered = scored
      .filter((s) => s.hitCount > 0)
      .sort(
        (a, b) =>
          b.hitCount - a.hitCount ||
          (b.stats?.attempts || 0) - (a.stats?.attempts || 0)
      )
      .slice(0, 6);

    return filtered.length ? filtered : fallbackByAttempt();
  }, [setsRaw, partWeakness, attemptsRaw]);

  const pickSetWithPart = (partKey) => {
    if (!setsRaw) return null;
    const target = normalizePartKey(partKey);
    return setsRaw.find((s) =>
      (s.parts || []).some((p) => normalizePartKey(p.key) === target)
    );
  };

  const startDrill = async ({ partKey, limitSec }) => {
    if (!currentUser) {
      msgApi.warning("Đăng nhập để luyện nhanh.");
      return;
    }
    const set = pickSetWithPart(partKey) || setsRaw?.[0];
    if (!set) {
      msgApi.error("Chưa có đề phù hợp để luyện nhanh.");
      return;
    }
    try {
      setLoadingDrill(partKey);
      const res = await createToeicAttempt(set.id, {
        selectedParts: [partKey],
        timeLimitSec: limitSec,
      });
      if (!res.ok) {
        msgApi.error(res.msg || "Không tạo được bài luyện nhanh.");
        return;
      }
      nav(`/attempt/${res.attemptId}`);
    } catch (err) {
      console.error("start drill error:", err);
      msgApi.error("Không tạo được bài luyện nhanh, thử lại sau.");
    } finally {
      setLoadingDrill("");
    }
  };

  const quickActions = [
    {
      title: "10 câu ngẫu nhiên",
      desc: "Luyện nhanh ~10 câu, giới hạn thời gian 7 phút.",
      cta: loadingDrill === "p5" ? "Đang tạo..." : "Bắt đầu",
      onClick: () => startDrill({ partKey: "p5", limitSec: 420 }),
      loading: loadingDrill === "p5",
    },
    {
      title: "Drill Part 5 (5 phút)",
      desc: "Ngữ pháp/điền từ, tập trung tốc độ.",
      cta: loadingDrill === "p5-5" ? "Đang tạo..." : "Bắt đầu",
      onClick: () => startDrill({ partKey: "p5", limitSec: 300 }),
      loading: loadingDrill === "p5-5",
    },
    {
      title: "Drill Part 2 (nghe ngắn)",
      desc: "Câu hỏi-đáp ngắn, warm-up listening.",
      cta: loadingDrill === "p2" ? "Đang tạo..." : "Bắt đầu",
      onClick: () => startDrill({ partKey: "p2", limitSec: 300 }),
      loading: loadingDrill === "p2",
    },
  ];

  return (
    <div className="coach-page">
      <div className="coach-hero">
        <div>
          <p className="eyebrow">Coach & luyện nhanh</p>
          <h1>Lộ trình cá nhân</h1>
          <p className="hero-sub">
            Gợi ý dựa trên điểm thấp gần đây. Bấm chọn để vào luyện ngay.
          </p>
        </div>
        <div className="hero-actions">
          <Button type="primary" onClick={() => nav("/practice")}>
            Chọn đề
          </Button>
          <Button ghost onClick={() => nav("/practice/writing")}>
            Luyện Writing
          </Button>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h3>Luyện nhanh</h3>
          <span className="sub">Các bài luyện ngắn, phù hợp khi bạn ít thời gian.</span>
        </div>
        {contextHolder}
        <div className="quick-grid">
          {quickActions.map((q) => (
            <div key={q.title} className="quick-card">
              <div className="quick-title">{q.title}</div>
              <div className="quick-desc">{q.desc}</div>
              <Button type="primary" onClick={q.onClick} loading={q.loading}>
                {q.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h3>Gợi ý lộ trình</h3>
          <span className="sub">Đề ưu tiên dựa trên part bạn đang yếu.</span>
        </div>
        {(!attemptsRaw || !attemptsRaw.length) && (
          <div className="empty">Cần ít nhất 1 bài gần đây để gợi ý. Hãy làm nhanh 1 đề nhé.</div>
        )}
        {attemptsRaw && attemptsRaw.length > 0 && recommendSets.length === 0 && (
          <div className="empty">Chưa đủ dữ liệu để gợi ý. Thử luyện thêm các part khác.</div>
        )}
        {recommendSets.length > 0 && (
          <div className="cards">
            {recommendSets.map((it) => (
              <PracticeCard
                key={it.id}
                item={it}
                bookmarked={bookmarkedIds.has(it.id)}
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>
        )}
      </div>

      {bookmarkedIds.size > 0 && (
        <div className="section">
          <div className="section-head">
            <h3>Đề đã lưu</h3>
            <span className="sub">Bookmark để luyện lại nhanh.</span>
          </div>
          <div className="cards">
            {(setsRaw || [])
              .filter((s) => bookmarkedIds.has(s.id))
              .map((it) => (
                <PracticeCard
                  key={it.id}
                  item={it}
                  bookmarked
                  onToggleBookmark={toggleBookmark}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeCoach;


