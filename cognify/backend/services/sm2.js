/**
 * SuperMemo SM-2 Spaced Repetition Algorithm Implementation
 * Calculates intervals and ease factors based on recall quality.
 */

const QUALITY_RATINGS = {
  AGAIN: 0, // Complete blackout / failed recall
  HARD: 3,  // Correct recall with significant hesitation
  GOOD: 4,  // Correct recall after a hesitation
  EASY: 5,  // Perfect, instantaneous recall
};

/**
 * Calculates updated SM-2 parameters for a card.
 * @param {Object} params
 * @param {number} params.repetition - Current successful repetition count
 * @param {number} params.interval - Current interval in days
 * @param {number} params.easeFactor - Current ease factor (default: 2.5)
 * @param {number} params.rating - Quality grade (0 to 5, where < 3 is failure)
 * @returns {Object} { repetition, interval, easeFactor, nextReviewDate, lastReviewedAt }
 */
function calculateSM2({
  repetition = 0,
  interval = 1,
  easeFactor = 2.5,
  rating = 4,
}) {
  const currentRep = Number(repetition) || 0;
  const currentInterval = Number(interval) || 1;
  const currentEF = Math.max(Number(easeFactor) || 2.5, 1.3);
  const q = Math.min(Math.max(Number(rating) || 0, 0), 5);

  let nextRep = currentRep;
  let nextInterval = currentInterval;
  let nextEF = currentEF;

  if (q < 3) {
    // Failed recall (Again): reset repetition count and interval
    nextRep = 0;
    nextInterval = 1;
  } else {
    // Successful recall: advance interval according to SM-2 formula
    if (currentRep === 0) {
      nextInterval = 1;
    } else if (currentRep === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(currentInterval * currentEF);
    }
    nextRep += 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  nextEF = currentEF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (nextEF < 1.3) {
    nextEF = 1.3; // SM-2 standard lower bound
  }

  const now = new Date();
  const nextReview = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

  return {
    repetition: nextRep,
    interval: nextInterval,
    easeFactor: parseFloat(nextEF.toFixed(2)),
    nextReviewDate: nextReview.toISOString(),
    lastReviewedAt: now.toISOString(),
    ratingName: q === 5 ? 'Easy' : q === 4 ? 'Good' : q === 3 ? 'Hard' : 'Again',
  };
}

/**
 * Analyzes review history logs to compute 7-day retention progress metrics.
 */
function compute7DayRetention(reviewLogs = [], allCards = []) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Daily review counts and success rates for last 7 days
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    last7Days.push({
      date: dateKey,
      day: dayLabel,
      totalReviews: 0,
      successfulReviews: 0,
      retentionRate: 0,
    });
  }

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentLogs = reviewLogs.filter(log => new Date(log.reviewed_at) >= sevenDaysAgo);

  let totalSuccessful = 0;
  for (const log of recentLogs) {
    const logDate = new Date(log.reviewed_at).toISOString().split('T')[0];
    const dayBucket = last7Days.find(d => d.date === logDate);
    const isSuccess = Number(log.rating) >= 3;

    if (dayBucket) {
      dayBucket.totalReviews += 1;
      if (isSuccess) dayBucket.successfulReviews += 1;
      dayBucket.retentionRate = Math.round((dayBucket.successfulReviews / dayBucket.totalReviews) * 100);
    }

    if (isSuccess) totalSuccessful += 1;
  }

  const totalReviews7d = recentLogs.length;
  const overallRetentionRate = totalReviews7d > 0
    ? Math.round((totalSuccessful / totalReviews7d) * 100)
    : 0;

  // Due cards calculation
  const dueCards = allCards.filter(card => {
    if (!card.next_review_date) return true; // new card is due
    return new Date(card.next_review_date) <= now;
  });

  return {
    last7Days,
    dailyActivity: last7Days,
    totalReviews7d,
    overallRetentionRate,
    overallRecallRate: overallRetentionRate,
    dueCardsCount: dueCards.length,
    totalCardsCount: allCards.length,
    masteredCardsCount: allCards.filter(c => (c.repetition || 0) >= 3).length,
  };
}

module.exports = {
  QUALITY_RATINGS,
  calculateSM2,
  compute7DayRetention,
};
