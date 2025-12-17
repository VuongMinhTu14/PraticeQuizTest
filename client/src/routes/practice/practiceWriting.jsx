// src/routes/practice/practiceWriting.jsx
import "./practice.css";
import { useEffect, useState } from "react";
import PracticeCardWriting from "../../components/practiceCard/practiceCardWriting";
import { listWritingSets } from "../../utils/toeicApi";

const PracticeWriting = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    listWritingSets()
      .then((list) => {
        if (alive) setItems(list || []);
      })
      .catch((err) => {
        console.error("listWritingSets error:", err);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="practice-page">
      <h1 className="practice-heading">Luyện TOEIC Writing</h1>
      <div className="cards">
        {items.map((it) => (
          <PracticeCardWriting key={it.id} item={it} />
        ))}
        {!items.length && (
          <div style={{ marginTop: 16, fontSize: 14 }}>
            Hiện chưa có đề writing nào.
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeWriting;
