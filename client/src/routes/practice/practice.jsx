import "./practice.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PracticeCard from "../../components/practiceCard/practiceCard";
import { getToeicSets, getMyToeicRecentAttempts } from "../../utils/toeicApi.js";
import useAuthStore from "../../utils/authStore";

const Practice = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("popular");
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [lastAttemptLocal, setLastAttemptLocal] = useState(null);
  const nav = useNavigate();
  const { currentUser } = useAuthStore();
  const userId =
    currentUser?._id || currentUser?.id || currentUser?.userId || null;

  useEffect(() => {
    let alive = true;
    getToeicSets().then((list) => {
      if (alive) setItems(list || []);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("pq_bookmarks_sets");
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        setBookmarkedIds(new Set(arr));
      } catch {}
    }
    const rawLast = localStorage.getItem("pq_last_attempt");
    if (rawLast) {
      try {
        setLastAttemptLocal(JSON.parse(rawLast));
      } catch {}
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

  const filtered = useMemo(() => {
    let list = [...items];
    const keyword = search.trim().toLowerCase();

    if (keyword) {
      list = list.filter((it) => {
        const title = it?.title?.toLowerCase() || "";
        const tags = (it?.tags || []).map((t) => t.toLowerCase());
        return (
          title.includes(keyword) ||
          tags.some((t) => t.includes(keyword))
        );
      });
    }

    list.sort((a, b) => {
      if (sortKey === "popular") {
        return (b?.stats?.attempts || 0) - (a?.stats?.attempts || 0);
      }
      if (sortKey === "short") {
        return (a?.durationSec || 0) - (b?.durationSec || 0);
      }
      if (sortKey === "questions") {
        return (b?.totalQuestions || 0) - (a?.totalQuestions || 0);
      }
      return 0;
    });

    return list;
  }, [items, search, sortKey]);

  const { data: recentAttemptsRaw } = useQuery({
    queryKey: ["practice-recent", userId],
    queryFn: () => getMyToeicRecentAttempts(30),
    enabled: !!userId,
  });

  const recentSets = useMemo(() => {
    if (!recentAttemptsRaw) return [];
    const seen = new Set();
    const list = [];
    for (const att of recentAttemptsRaw) {
      const setId = att.setId || att.id;
      if (!setId || seen.has(setId)) continue;
      seen.add(setId);
      const matched = items.find((it) => it.id === setId) || {
        id: setId,
        title: att.setTitle || `Đề ${setId}`,
        totalQuestions: att.totalQuestions,
        partsCount: att.partsCount,
        durationSec: att.durationSec,
      };
      list.push({
        ...matched,
        lastScore: att.totalScore ?? null,
        lastDate: att.createdAt,
      });
      if (list.length >= 6) break;
    }
    return list;
  }, [recentAttemptsRaw, items]);

  const suggestions = useMemo(() => {
    const list = [...items].sort(
      (a, b) => (b?.stats?.attempts || 0) - (a?.stats?.attempts || 0)
    );
    const recentIds = new Set(recentSets.map((r) => r.id));
    const filtered = list.filter((it) => !recentIds.has(it.id));
    return filtered.slice(0, 4);
  }, [items, recentSets]);

  const savedSets = useMemo(() => {
    if (!bookmarkedIds.size) return [];
    return items.filter((it) => bookmarkedIds.has(it.id));
  }, [items, bookmarkedIds]);

  const improveSets = useMemo(() => {
    if (!recentAttemptsRaw) return [];
    const attempts = [...recentAttemptsRaw]
      .filter((a) => typeof a.totalScore === "number")
      .sort((a, b) => (a.totalScore ?? 0) - (b.totalScore ?? 0));

    const seen = new Set();
    const res = [];
    for (const att of attempts) {
      if ((att.totalScore ?? 100) > 70) continue;
      const setId = att.setId || att.id;
      if (!setId || seen.has(setId)) continue;
      seen.add(setId);
      const matched = items.find((it) => it.id === setId);
      if (matched) {
        res.push({ ...matched, lastScore: att.totalScore });
      }
      if (res.length >= 4) break;
    }
    return res;
  }, [recentAttemptsRaw, items]);

  return (
    <div className="practice-page">
      <div className="practice-hero">
        <div>
          <p className="eyebrow">Danh sách đề</p>
          <h1 className="practice-heading">Luyện đề TOEIC</h1>
          <p className="practice-sub">
            Chọn đề phù hợp, lọc theo nhu cầu và vào làm ngay.
          </p>
        </div>
        <div className="filter-row">
          <div className="search">
            <input
              type="text"
              placeholder="Tìm theo tên đề, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="sort">
            <label htmlFor="sort">Sắp xếp</label>
            <select
              id="sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="popular">Được làm nhiều</option>
              <option value="short">Thời lượng ngắn</option>
              <option value="questions">Nhiều câu hỏi</option>
            </select>
          </div>
        </div>
      </div>

      {recentSets.length > 0 && (
        <div className="section">
          <div className="section-head">
            <h3>Đã làm gần đây</h3>
            <span className="sub">
              Bạn có thể vào lại đề cũ để luyện tiếp hoặc làm lại.
            </span>
          </div>
          <div className="recent-grid">
            {recentSets.map((it) => (
              <div key={it.id} className="recent-card">
                <div>
                  <div className="recent-title">{it.title}</div>
                  {it.lastScore != null && (
                    <div className="recent-meta">
                      Điểm gần nhất: <b>{it.lastScore}%</b>
                    </div>
                  )}
                </div>
                <button
                  className="recent-btn"
                  onClick={() => nav(`/practice/${it.id}`)}
                >
                  Làm lại
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {lastAttemptLocal?.attemptId && (
        <div className="section">
          <div className="section-head">
            <h3>Tiếp tục lần làm dở</h3>
          </div>
          <div className="recent-grid">
            <div className="recent-card">
              <div>
                <div className="recent-title">
                  {lastAttemptLocal.setTitle || `Đề ${lastAttemptLocal.setId}`}
                </div>
                <div className="recent-meta">Bạn có thể vào tiếp tục.</div>
              </div>
              <button
                className="recent-btn"
                onClick={() => nav(`/attempt/${lastAttemptLocal.attemptId}`)}
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {savedSets.length > 0 && (
        <div className="section">
          <div className="section-head">
            <h3>Đề đã lưu</h3>
            <span className="sub">Các đề bạn đã bookmark.</span>
          </div>
          <div className="cards">
            {savedSets.map((it) => (
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

      {improveSets.length > 0 && (
        <div className="section">
          <div className="section-head">
            <h3>Gợi ý cải thiện</h3>
            <span className="sub">Các đề điểm chưa cao, nên luyện lại.</span>
          </div>
          <div className="cards">
            {improveSets.map((it) => (
              <PracticeCard
                key={it.id}
                item={it}
                bookmarked={bookmarkedIds.has(it.id)}
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="section">
          <div className="section-head">
            <h3>Gợi ý cho bạn</h3>
            <span className="sub">
              Các đề được làm nhiều, phù hợp để ôn nhanh.
            </span>
          </div>
          <div className="cards">
            {suggestions.map((it) => (
              <PracticeCard
                key={it.id}
                item={it}
                bookmarked={bookmarkedIds.has(it.id)}
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>
        </div>
      )}

      <div className="cards">
        {filtered.length === 0 ? (
          <div className="empty">
            Không tìm thấy đề phù hợp. Thử từ khóa khác hoặc gỡ bộ lọc.
          </div>
        ) : (
          filtered.map((it) => (
            <PracticeCard
              key={it.id}
              item={it}
              bookmarked={bookmarkedIds.has(it.id)}
              onToggleBookmark={toggleBookmark}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Practice;
