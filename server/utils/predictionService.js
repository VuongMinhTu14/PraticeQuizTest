import ToeicAttempt from "../models/toeicAttempt.model.js";
import ToeicWritingAttempt from "../models/toeicWritingAttempt.model.js";

const LISTENING_PARTS = ["p1", "p2", "p3", "p4"];
const READING_PARTS = ["p5", "p6", "p7"];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const aggregateToeic = (attempts) => {
  if (!attempts.length) {
    return {
      listeningPercent: null,
      readingPercent: null,
      overallPercent: null,
      totalQuestions: 0,
      totalCorrect: 0,
    };
  }

  let listenCorrect = 0;
  let listenTotal = 0;
  let readCorrect = 0;
  let readTotal = 0;
  let overallCorrect = 0;
  let overallTotal = 0;

  attempts.forEach((a) => {
    (a.scoreByPart || []).forEach((p) => {
      if (LISTENING_PARTS.includes(p.partKey)) {
        listenCorrect += p.correct || 0;
        listenTotal += p.total || 0;
      } else if (READING_PARTS.includes(p.partKey)) {
        readCorrect += p.correct || 0;
        readTotal += p.total || 0;
      }
    });
    overallCorrect += a.totalCorrect || 0;
    overallTotal += a.totalQuestions || 0;
  });

  const listeningPercent =
    listenTotal > 0 ? Math.round((listenCorrect / listenTotal) * 100) : null;
  const readingPercent =
    readTotal > 0 ? Math.round((readCorrect / readTotal) * 100) : null;
  const overallPercent =
    overallTotal > 0 ? Math.round((overallCorrect / overallTotal) * 100) : null;

  return {
    listeningPercent,
    readingPercent,
    overallPercent,
    totalQuestions: overallTotal,
    totalCorrect: overallCorrect,
  };
};

const aggregateWriting = (attempts) => {
  if (!attempts.length) {
    return { predictedWriting: null, overallScore: null };
  }
  const n = attempts.length;
  const predictedWriting = Math.round(
    attempts.reduce((s, a) => s + (a.summary?.predictedToeicScore || 0), 0) / n
  );
  const overallScore = Number(
    (
      attempts.reduce((s, a) => s + (a.summary?.avgOverallScore || 0), 0) / n
    ).toFixed(2)
  );
  return { predictedWriting, overallScore };
};

function confidenceLevel(toeicCount, writingCount) {
  const enoughToeic = toeicCount >= 3;
  const enoughWriting = writingCount >= 3;
  if (enoughToeic && enoughWriting) return "high";
  if (toeicCount >= 1 || writingCount >= 1) return "medium";
  return "low";
}

export async function buildUserPrediction(userId) {
  const [toeicAttempts, writingAttempts] = await Promise.all([
    ToeicAttempt.find({ userId, status: "submitted" })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean(),
    ToeicWritingAttempt.find({ userId, isSubmitted: true })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean(),
  ]);

  const toeicAgg = aggregateToeic(toeicAttempts);
  const writingAgg = aggregateWriting(writingAttempts);

  // Listening/Reading 0-800 (chia đôi)
  const listeningPercent = toeicAgg.listeningPercent ?? toeicAgg.overallPercent;
  const readingPercent = toeicAgg.readingPercent ?? toeicAgg.overallPercent;

  const predictedListening =
    listeningPercent != null
      ? Math.round(clamp(listeningPercent, 0, 100) / 100 * 400)
      : null;
  const predictedReading =
    readingPercent != null
      ? Math.round(clamp(readingPercent, 0, 100) / 100 * 400)
      : null;

  const predictedWriting = writingAgg.predictedWriting; // 0-200

  let predictedTotal = null;
  if (predictedListening != null && predictedReading != null && predictedWriting != null) {
    predictedTotal = predictedListening + predictedReading + predictedWriting;
  } else if (predictedListening != null && predictedReading != null) {
    predictedTotal = predictedListening + predictedReading;
  }

  const confidence = confidenceLevel(toeicAttempts.length, writingAttempts.length);

  const missing = [];
  if (predictedListening == null) missing.push("listening");
  if (predictedReading == null) missing.push("reading");
  if (predictedWriting == null) missing.push("writing");

  return {
    predictedTotal,
    predictedListening,
    predictedReading,
    predictedWriting,
    overallPercent: toeicAgg.overallPercent,
    writingOverallScore: writingAgg.overallScore,
    confidence,
    sources: {
      toeicAttempts: toeicAttempts.length,
      writingAttempts: writingAttempts.length,
    },
    missing,
  };
}

export default buildUserPrediction;
