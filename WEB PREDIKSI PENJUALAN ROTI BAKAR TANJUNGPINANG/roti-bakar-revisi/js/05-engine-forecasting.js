'use strict';

// ======================================================================
// D. HYBRID CONTINUOUS TIME SERIES + IQR OUTLIER CAPPING ENGINE
// ======================================================================
function computeHybridTimeSeries() {
  const fullSorted = normalizeDataset(salesData);
  const totalAllPorsi = fullSorted.reduce((s, r) => s + r.porsi, 0);
  const totalAllOmzet = fullSorted.reduce((s, r) => s + r.omzet, 0);
  const avgPrice = totalAllPorsi > 0 ? totalAllOmzet / totalAllPorsi : 14793;
  const rawDailyMean = fullSorted.length > 0 ? totalAllPorsi / fullSorted.length : 0;

  // 0. Compute IQR Upper Bound (Q3 + 1.5 * IQR) per Bab II Subbab 2.3
  const sortedPorsi = fullSorted.map(r => r.porsi).sort((a, b) => a - b);
  const q1 = computeLinearPercentile(sortedPorsi, 0.25);
  const q3 = computeLinearPercentile(sortedPorsi, 0.75);
  const iqr = q3 - q1;
  const upperIqr = q3 + 1.5 * iqr; // 36.0 + 1.5 * 12.25 = 54.375 (~54.4 porsi)

  // Apply optional IQR capping for model training series
  const trainingSeries = fullSorted.map(r => {
    const isOutlier = r.porsi > upperIqr;
    const modelPorsi = (outlierMode === 'iqr_cap' && isOutlier) ? upperIqr : r.porsi;
    return {
      ...r,
      isOutlier,
      modelPorsi
    };
  });

  const outlierCount = trainingSeries.filter(r => r.isOutlier).length;
  const totalModelPorsi = trainingSeries.reduce((s, r) => s + r.modelPorsi, 0);
  const modelDailyMean = trainingSeries.length > 0 ? totalModelPorsi / trainingSeries.length : 0;

  // 1. Day-of-Week Seasonal Indices across full active dataset (using modelPorsi)
  const dayStats = {};
  DAY_NAMES_ORDERED.forEach(d => {
    dayStats[d] = { day: d, count: 0, totalPorsi: 0, mean: 0, index: 1 };
  });

  trainingSeries.forEach(r => {
    const dName = getIndonesianDayName(r.date);
    if (dayStats[dName]) {
      dayStats[dName].count += 1;
      dayStats[dName].totalPorsi += r.modelPorsi;
    }
  });

  DAY_NAMES_ORDERED.forEach(d => {
    const st = dayStats[d];
    st.mean = st.count > 0 ? st.totalPorsi / st.count : modelDailyMean;
    st.index = modelDailyMean > 0 ? st.mean / modelDailyMean : 1;
  });

  // 2. Continuous Daily SMA-N across ALL days first (Hybrid scheme)
  const effDailyN = Math.min(dailyWindowN, Math.max(1, trainingSeries.length));
  const dailyFullEnriched = trainingSeries.map((row, idx) => {
    const dayName = getIndonesianDayName(row.date);
    const isWeekend = dayName === 'Sabtu' || dayName === 'Minggu';
    const seasonalIdx = dayStats[dayName] ? dayStats[dayName].index : 1;
    let smaVal = null;
    let predPorsi = null;
    let absErr = null;
    let sqErr = null;
    let ape = null;

    if (idx >= effDailyN) {
      let sum = 0;
      for (let k = 1; k <= effDailyN; k++) {
        sum += trainingSeries[idx - k].modelPorsi;
      }
      smaVal = sum / effDailyN;
      predPorsi = smaVal * seasonalIdx;
      const err = row.porsi - predPorsi;
      absErr = Math.abs(err);
      sqErr = err * err;
      ape = row.porsi > 0 ? (absErr / row.porsi) * 100 : 0;
    }

    return {
      ...row,
      indexGlobal: idx + 1,
      dayName,
      isWeekend,
      seasonalIdx,
      smaVal,
      predPorsi,
      absErr,
      sqErr,
      ape
    };
  });

  // Filter daily view according to Global Month Filter
  const dailyVisible = selectedMonth === 'ALL'
    ? dailyFullEnriched
    : dailyFullEnriched.filter(r => r.bulan === selectedMonth);

  const visibleTotalPorsi = dailyVisible.reduce((s, r) => s + r.porsi, 0);
  const visibleTotalOmzet = dailyVisible.reduce((s, r) => s + r.omzet, 0);
  const visibleMean = dailyVisible.length > 0 ? visibleTotalPorsi / dailyVisible.length : 0;

  // Baseline Daily SMA for next-day projection (from tail of active scope)
  const dailyTailSource = dailyVisible.length >= effDailyN ? dailyVisible : dailyFullEnriched;
  const tailSlice = dailyTailSource.slice(-effDailyN);
  const nextDailySma = tailSlice.length > 0
    ? tailSlice.reduce((s, r) => s + r.modelPorsi, 0) / tailSlice.length
    : 0;

  const targetDayObj = dayStats[targetDay] || { index: 1, mean: modelDailyMean };
  const dailyForecastPorsi = Math.max(1, Math.round(nextDailySma * targetDayObj.index));
  const dailyForecastOmzet = dailyForecastPorsi * avgPrice;

  // Daily Accuracy (MAE, RMSE & MAPE) on visible evaluated rows
  const dailyEvalRows = dailyVisible.filter(r => r.predPorsi !== null);
  const dailyMae = dailyEvalRows.length > 0
    ? dailyEvalRows.reduce((s, r) => s + r.absErr, 0) / dailyEvalRows.length
    : 0;
  const dailyRmse = dailyEvalRows.length > 0
    ? Math.sqrt(dailyEvalRows.reduce((s, r) => s + r.sqErr, 0) / dailyEvalRows.length)
    : 0;
  const dailyMape = dailyEvalRows.length > 0
    ? dailyEvalRows.reduce((s, r) => s + r.ape, 0) / dailyEvalRows.length
    : 0;

  // 3. Continuous Weekly Aggregation (Monday–Sunday Calendar Weeks across months)
  const weekMap = new Map();
  trainingSeries.forEach(r => {
    const monIso = getMondayIso(r.date);
    if (!weekMap.has(monIso)) {
      const sunIso = addDaysIso(monIso, 6);
      weekMap.set(monIso, {
        weekStart: monIso,
        weekEnd: sunIso,
        rangeLabel: `${formatShortDate(monIso)} - ${formatShortDate(sunIso)}`,
        daysCount: 0,
        porsi: 0,
        modelPorsi: 0,
        omzet: 0,
        monthsSet: new Set()
      });
    }
    const w = weekMap.get(monIso);
    w.daysCount += 1;
    w.porsi += r.porsi;
    w.modelPorsi += r.modelPorsi;
    w.omzet += r.omzet;
    w.monthsSet.add(r.bulan);
  });

  const weeksRaw = Array.from(weekMap.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const effWeeklyN = Math.min(weeklyWindowN, Math.max(1, weeksRaw.length));
  const avgDaysPerWeek = weeksRaw.length > 0
    ? weeksRaw.reduce((s, w) => s + w.daysCount, 0) / weeksRaw.length
    : 6;

  const weeksFullEnriched = weeksRaw.map((w, idx) => {
    const monthsArr = Array.from(w.monthsSet);
    const isBridge = monthsArr.length > 1;
    const bulanLabel = isBridge ? monthsArr.join('–') : monthsArr[0];
    let smaVal = null;
    let absErr = null;
    let sqErr = null;
    let ape = null;

    if (idx >= effWeeklyN) {
      let sum = 0;
      for (let k = 1; k <= effWeeklyN; k++) {
        sum += weeksRaw[idx - k].modelPorsi;
      }
      smaVal = sum / effWeeklyN;
      const err = w.porsi - smaVal;
      absErr = Math.abs(err);
      sqErr = err * err;
      ape = w.porsi > 0 ? (absErr / w.porsi) * 100 : 0;
    }

    return {
      ...w,
      weekNumber: idx + 1,
      pekanLabel: `Pekan ${idx + 1}`,
      isBridge,
      bulanLabel,
      monthsArr,
      smaVal,
      absErr,
      sqErr,
      ape
    };
  });

  const weeksVisible = selectedMonth === 'ALL'
    ? weeksFullEnriched
    : weeksFullEnriched.filter(w => w.monthsArr.includes(selectedMonth));

  const weeklyTailSource = weeksVisible.length >= effWeeklyN ? weeksVisible : weeksFullEnriched;
  const weeklyTail = weeklyTailSource.slice(-effWeeklyN);
  const nextWeeklySma = weeklyTail.length > 0
    ? weeklyTail.reduce((s, w) => s + w.modelPorsi, 0) / weeklyTail.length
    : 0;

  const weeklyScaleFactor = avgDaysPerWeek > 0 ? (weeklyOpenDays / avgDaysPerWeek) : 1;
  const weeklyForecastPorsi = Math.max(1, Math.round(nextWeeklySma * weeklyScaleFactor));
  const weeklyForecastOmzet = weeklyForecastPorsi * avgPrice;
  const visibleWeeklyMean = weeksVisible.length > 0
    ? weeksVisible.reduce((s, w) => s + w.porsi, 0) / weeksVisible.length
    : 0;

  const weeklyEvalRows = weeksVisible.filter(w => w.smaVal !== null);
  const weeklyMae = weeklyEvalRows.length > 0
    ? weeklyEvalRows.reduce((s, w) => s + w.absErr, 0) / weeklyEvalRows.length
    : 0;
  const weeklyRmse = weeklyEvalRows.length > 0
    ? Math.sqrt(weeklyEvalRows.reduce((s, w) => s + w.sqErr, 0) / weeklyEvalRows.length)
    : 0;
  const weeklyMape = weeklyEvalRows.length > 0
    ? weeklyEvalRows.reduce((s, w) => s + w.ape, 0) / weeklyEvalRows.length
    : 0;

  const nextWeekNum = (weeksVisible.length > 0 ? weeksVisible[weeksVisible.length - 1].weekNumber : weeksFullEnriched.length) + 1;

  // 4. Monthly Aggregation
  const monthMap = new Map();
  trainingSeries.forEach(r => {
    if (!monthMap.has(r.bulan)) {
      monthMap.set(r.bulan, {
        bulan: r.bulan,
        daysCount: 0,
        porsi: 0,
        modelPorsi: 0,
        omzet: 0
      });
    }
    const m = monthMap.get(r.bulan);
    m.daysCount += 1;
    m.porsi += r.porsi;
    m.modelPorsi += r.modelPorsi;
    m.omzet += r.omzet;
  });

  const monthsAll = Array.from(monthMap.values()).map(m => ({
    ...m,
    avgDaily: m.daysCount > 0 ? m.porsi / m.daysCount : 0
  }));

  const monthsVisible = selectedMonth === 'ALL'
    ? monthsAll
    : monthsAll.filter(m => m.bulan === selectedMonth);

  const monthlySma2 = monthsAll.length > 0
    ? monthsAll.reduce((s, m) => s + m.modelPorsi, 0) / monthsAll.length
    : 0;

  const activeDailyRateForMonth = selectedMonth === 'ALL' ? modelDailyMean : (dailyVisible.reduce((s, r) => s + r.modelPorsi, 0) / Math.max(1, dailyVisible.length));
  const monthlyDailyRateProj = activeDailyRateForMonth * monthlyOpenDays;

  const monthlyForecastPorsi = monthlyMethod === 'sma2'
    ? Math.max(1, Math.round(monthlySma2))
    : Math.max(1, Math.round(monthlyDailyRateProj));
  const monthlyForecastOmzet = monthlyForecastPorsi * avgPrice;

  let monthlyMae = 0;
  let monthlyRmse = 0;
  let monthlyMape = 0;
  if (monthsAll.length >= 2) {
    const juneModelPorsi = monthsAll[0].modelPorsi;
    const julyActualPorsi = monthsAll[1].porsi;
    monthlyMae = Math.abs(julyActualPorsi - juneModelPorsi);
    monthlyRmse = monthlyMae;
    monthlyMape = julyActualPorsi > 0 ? (monthlyMae / julyActualPorsi) * 100 : 0;
  }

  const scopeLabel = selectedMonth === 'ALL'
    ? 'Semua Bulan (Juni & Juli 2026)'
    : `${selectedMonth} 2026`;

  return {
    avgPrice,
    rawDailyMean,
    modelDailyMean,
    q1,
    q3,
    iqr,
    upperIqr,
    outlierCount,
    dayStats,
    scopeLabel,
    visibleDaysCount: dailyVisible.length,
    visibleTotalPorsi,
    visibleTotalOmzet,
    visibleMean,
    daily: {
      effN: effDailyN,
      allRows: dailyFullEnriched,
      rows: dailyVisible,
      nextSma: nextDailySma,
      targetIndex: targetDayObj.index,
      targetDayMean: targetDayObj.mean,
      forecastPorsi: dailyForecastPorsi,
      forecastOmzet: dailyForecastOmzet,
      mae: dailyMae,
      rmse: dailyRmse,
      mape: dailyMape
    },
    weekly: {
      effN: effWeeklyN,
      allRows: weeksFullEnriched,
      rows: weeksVisible,
      avgDaysPerWeek,
      nextSma: nextWeeklySma,
      scaleFactor: weeklyScaleFactor,
      forecastPorsi: weeklyForecastPorsi,
      forecastOmzet: weeklyForecastOmzet,
      visibleMean: visibleWeeklyMean,
      mae: weeklyMae,
      rmse: weeklyRmse,
      mape: weeklyMape,
      nextTitle: `Pekan ${nextWeekNum}`
    },
    monthly: {
      allRows: monthsAll,
      rows: monthsVisible,
      sma2: monthlySma2,
      activeDailyRate: activeDailyRateForMonth,
      forecastPorsi: monthlyForecastPorsi,
      forecastOmzet: monthlyForecastOmzet,
      mae: monthlyMae,
      rmse: monthlyRmse,
      mape: monthlyMape
    }
  };
}
