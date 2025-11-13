import React from "react";
import "./practice.css";
import TestCard from "../../components/testCard/testCard";

const Practice = () => {
  // sau này phần này sẽ fetch từ API /mock
  const tests = [
    {
      id: "toeic_free",
      title: "TOEIC (Free)",
      durationSec: 2700,
      partsCount: 4,
      totalQuestions: 100,
      isFree: true,
      tags: ["TOEIC", "Free"],
      stats: { attempts: 5231, users: 2100 },
    },
    {
      id: "ielts_premium",
      title: "Đề Premium (ETH)",
      durationSec: 3600,
      partsCount: 4,
      totalQuestions: 40,
      isFree: false,
      coinPrice: 20,
      tags: ["IELTS", "Premium"],
      stats: { attempts: 1350, users: 640 },
    },
  ];

  return (
    <div className="practice-page">
      <h1 className="practice-heading">Luyện đề thi</h1>

      <div className="cards">
        {tests.map((item) => (
          <TestCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

export default Practice;
