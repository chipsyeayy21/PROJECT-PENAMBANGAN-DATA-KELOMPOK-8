/* Renderer grafik SVG interaktif */
'use strict';

// ======================================================================
// E. RENDERER GRAFIK SVG INTERAKTIF
// ======================================================================
function renderMainChart(model) {
  const container = document.getElementById('chart1-container');
  const legendEl = document.getElementById('chart1-legend');
  const titleEl = document.getElementById('chart1-title');
  const subEl = document.getElementById('chart1-subtitle');
  const badgeEl = document.getElementById('chart1-badge');

  const W = 720;
  const H = 310;
  const padL = 46;
  const padR = 24;
  const padT = 30;
  const padB = 46;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  if (activeScale === 'daily') {
    const rows = model.daily.rows;
    const forecastVal = model.daily.forecastPorsi;
    titleEl.textContent = 'Tren Penjualan Aktual vs Moving Average';
    subEl.textContent = `Perbandingan volume harian (porsi), garis SMA-${model.daily.effN}${outlierMode === 'iqr_cap' ? ' (Capped IQR 54,4)' : ''}, dan proyeksi hari ${targetDay}.`;
    badgeEl.textContent = `${rows.length} Hari Data`;

    legendEl.innerHTML = `
      <span class="legend-item"><span class="legend-swatch" style="background:#4A2C18;"></span>Penjualan Aktual (Porsi)</span>
      <span class="legend-item"><span class="legend-line-dash"></span>Garis SMA-${model.daily.effN} (${outlierMode === 'iqr_cap' ? 'IQR Capped' : 'Kontinu'})</span>
      <span class="legend-item"><span class="legend-swatch" style="background:#137A55; border-radius:50%;"></span>Proyeksi (${targetDay}: ${forecastVal} porsi)</span>
    `;

    const allVals = rows.flatMap(r => [r.porsi, r.smaVal || 0]).concat([forecastVal]);
    const maxVal = Math.max(80, Math.ceil(Math.max(...allVals) / 10) * 10);
    const totalPts = rows.length + 1;
    const stepX = totalPts > 1 ? plotW / (totalPts - 1) : plotW;

    const getX = i => padL + i * stepX;
    const getY = v => padT + plotH - (v / maxVal) * plotH;

    let gridSvg = '';
    for (let g = 0; g <= 4; g++) {
      const val = Math.round((maxVal / 4) * g);
      const y = getY(val);
      gridSvg += `
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#EFE4D6" stroke-width="1" />
        <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10.5" fill="#8C6A53" font-weight="700">${val}</text>
      `;
    }

    // Optional IQR Upper Bound Reference Line when Capping is active
    let iqrLineSvg = '';
    if (outlierMode === 'iqr_cap') {
      const iqrY = getY(model.upperIqr);
      iqrLineSvg = `
        <line x1="${padL}" y1="${iqrY}" x2="${W - padR}" y2="${iqrY}" stroke="#BE123C" stroke-width="1.3" stroke-dasharray="3,3" />
        <text x="${W - padR - 4}" y="${iqrY - 5}" text-anchor="end" font-size="9.5" fill="#BE123C" font-weight="800">Batas Atas IQR (${formatNum(model.upperIqr, 1)})</text>
      `;
    }

    const actualPts = rows.map((r, i) => `${getX(i).toFixed(1)},${getY(r.porsi).toFixed(1)}`).join(' ');
    const areaPts = `${padL},${padT + plotH} ${actualPts} ${getX(rows.length - 1).toFixed(1)},${padT + plotH}`;

    const smaCoords = [];
    rows.forEach((r, i) => {
      if (r.smaVal !== null) {
        smaCoords.push({ x: getX(i), y: getY(r.smaVal), val: r.smaVal, date: r.date });
      }
    });
    const smaPtsStr = smaCoords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

    let xLabelsSvg = '';
    const stepLabel = Math.max(1, Math.ceil(rows.length / 9));
    rows.forEach((r, i) => {
      if (i % stepLabel === 0 || i === rows.length - 1) {
        xLabelsSvg += `<text x="${getX(i)}" y="${H - 16}" text-anchor="middle" font-size="10" fill="#6B4730" font-weight="700">${formatShortDate(r.date)}</text>`;
      }
    });

    const projX = getX(rows.length);
    const projY = getY(forecastVal);
    xLabelsSvg += `<text x="${projX}" y="${H - 16}" text-anchor="middle" font-size="10" fill="#137A55" font-weight="800">Besok</text>`;

    let pointsSvg = '';
    rows.forEach((r, i) => {
      const cx = getX(i);
      const cy = getY(r.porsi);
      const smaText = r.smaVal !== null ? `${formatNum(r.smaVal, 2)} porsi` : 'Belum tersedia (-)';
      const outlierNote = r.isOutlier
        ? `<br/><span style="color:#FDA4AF;">&#9888; Pencilan &gt; IQR (${outlierMode === 'iqr_cap' ? 'dibatasi ke ' + formatNum(r.modelPorsi, 1) : 'nilai asli'})</span>`
        : '';
      const tip = escapeHtml(
        `<strong>${r.dayName}, ${formatFullDateId(r.date)}</strong><br/>` +
        `Aktual: <strong>${r.porsi} porsi</strong> (${formatRupiah(r.omzet)})<br/>` +
        `SMA-${model.daily.effN}: ${smaText}<br/>` +
        `Indeks ${r.dayName}: ${formatNum(r.seasonalIdx, 2)}x` +
        outlierNote
      );
      const ptFill = r.isOutlier ? '#BE123C' : '#4A2C18';
      const ptRadius = r.isOutlier ? '4.4' : '3.6';
      pointsSvg += `
        <circle cx="${cx}" cy="${cy}" r="${ptRadius}" fill="${ptFill}" stroke="#FFFFFF" stroke-width="1.2" data-tip="${tip}" />
      `;
    });

    smaCoords.forEach(c => {
      pointsSvg += `<circle cx="${c.x}" cy="${c.y}" r="2.6" fill="#0284C7" />`;
    });

    const lastX = getX(rows.length - 1);
    const lastY = getY(rows[rows.length - 1].porsi);
    const projTip = escapeHtml(
      `<strong>Proyeksi Hari ${targetDay}</strong><br/>` +
      `Estimasi: <strong>${forecastVal} porsi</strong> (${formatRupiah(model.daily.forecastOmzet)})<br/>` +
      `Basis SMA-${model.daily.effN}: ${formatNum(model.daily.nextSma, 2)} &times; ${formatNum(model.daily.targetIndex, 2)}x`
    );

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik Tren Harian">
        <defs>
          <linearGradient id="dailyAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#C86D1F" stop-opacity="0.24" />
            <stop offset="100%" stop-color="#C86D1F" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        ${gridSvg}
        ${iqrLineSvg}
        <polygon points="${areaPts}" fill="url(#dailyAreaGrad)" />
        <polyline fill="none" stroke="#4A2C18" stroke-width="2.3" points="${actualPts}" />
        <polyline fill="none" stroke="#0284C7" stroke-width="2.2" stroke-dasharray="5,4" points="${smaPtsStr}" />
        <line x1="${lastX}" y1="${lastY}" x2="${projX}" y2="${projY}" stroke="#137A55" stroke-width="2" stroke-dasharray="4,3" />
        ${pointsSvg}
        <circle cx="${projX}" cy="${projY}" r="6.5" fill="#137A55" stroke="#FFFFFF" stroke-width="2" data-tip="${projTip}" />
        <text x="${projX}" y="${projY - 11}" text-anchor="middle" font-size="11" fill="#137A55" font-weight="800">${forecastVal}</text>
        ${xLabelsSvg}
      </svg>
    `;
    attachSvgTooltips(container);
    return;
  }

  if (activeScale === 'weekly') {
    const rows = model.weekly.rows;
    const forecastVal = model.weekly.forecastPorsi;
    titleEl.textContent = 'Tren Penjualan Mingguan vs Weekly Moving Average (Combo Chart)';
    subEl.textContent = `Batang penjualan aktual per pekan, garis biru putus-putus Weekly SMA-${model.weekly.effN}, dan proyeksi ${model.weekly.nextTitle}.`;
    badgeEl.textContent = `${rows.length} Pekan + Proyeksi`;

    legendEl.innerHTML = `
      <span class="legend-item"><span class="legend-swatch" style="background:#4A2C18;"></span>Pekan Reguler</span>
      <span class="legend-item"><span class="legend-swatch" style="background:#C86D1F;"></span>Pekan Lintas Bulan (Jun–Jul)</span>
      <span class="legend-item"><span class="legend-swatch" style="background:#137A55;"></span>Proyeksi ${model.weekly.nextTitle} (${weeklyOpenDays} hr)</span>
      <span class="legend-item"><span class="legend-line-dash"></span>Garis Weekly SMA-${model.weekly.effN}</span>
    `;

    const items = rows.map(w => ({
      label: w.pekanLabel,
      subLabel: w.rangeLabel,
      porsi: w.porsi,
      daysCount: w.daysCount,
      smaVal: w.smaVal,
      isBridge: w.isBridge,
      isForecast: false,
      omzet: w.omzet
    }));

    items.push({
      label: model.weekly.nextTitle,
      subLabel: `Proyeksi (${weeklyOpenDays} hr)`,
      porsi: forecastVal,
      daysCount: weeklyOpenDays,
      smaVal: forecastVal,
      isBridge: false,
      isForecast: true,
      omzet: model.weekly.forecastOmzet
    });

    const maxVal = Math.max(240, Math.ceil(Math.max(...items.map(it => Math.max(it.porsi, it.smaVal || 0))) / 30) * 30);
    const colW = plotW / items.length;
    const barW = Math.min(44, colW * 0.56);
    const getY = v => padT + plotH - (v / maxVal) * plotH;

    let gridSvg = '';
    for (let g = 0; g <= 4; g++) {
      const val = Math.round((maxVal / 4) * g);
      const y = getY(val);
      gridSvg += `
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#EFE4D6" stroke-width="1" />
        <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10.5" fill="#8C6A53" font-weight="700">${val}</text>
      `;
    }

    let barsSvg = '';
    const smaDots = [];

    items.forEach((it, idx) => {
      const cx = padL + colW * idx + colW / 2;
      const bx = cx - barW / 2;
      const by = getY(it.porsi);
      const bh = padT + plotH - by;
      const fill = it.isForecast ? '#137A55' : (it.isBridge ? '#C86D1F' : '#4A2C18');
      const daysColor = it.isForecast ? '#137A55' : (it.isBridge ? '#C86D1F' : '#8C6A53');

      const tip = escapeHtml(
        `<strong>${it.label} (${it.subLabel})</strong><br/>` +
        `Volume: <strong>${it.porsi} porsi</strong> (${it.daysCount} hari buka)<br/>` +
        `Omzet: ${formatRupiah(it.omzet)}<br/>` +
        `Weekly SMA-${model.weekly.effN}: ${it.smaVal !== null ? formatNum(it.smaVal, 1) + ' porsi' : '-'}`
      );

      barsSvg += `
        <rect x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="6" fill="${fill}" data-tip="${tip}" />
        <text x="${cx}" y="${by - 18}" text-anchor="middle" font-size="10" fill="${daysColor}" font-weight="700">${it.daysCount} hr</text>
        <text x="${cx}" y="${by - 6}" text-anchor="middle" font-size="11" fill="#2A180D" font-weight="800">${it.porsi}</text>
        <text x="${cx}" y="${H - 22}" text-anchor="middle" font-size="10.5" fill="${it.isForecast ? '#137A55' : '#4A2C18'}" font-weight="800">${it.label}</text>
        <text x="${cx}" y="${H - 9}" text-anchor="middle" font-size="9" fill="#8C6A53">${it.subLabel}</text>
      `;

      if (it.smaVal !== null) {
        smaDots.push({ x: cx, y: getY(it.smaVal), val: it.smaVal });
      }
    });

    const smaLinePts = smaDots.map(d => `${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(' ');
    let smaDotsSvg = '';
    smaDots.forEach(d => {
      smaDotsSvg += `
        <circle cx="${d.x}" cy="${d.y}" r="5.2" fill="#0284C7" stroke="#FFFFFF" stroke-width="2" />
      `;
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik Combo Mingguan">
        ${gridSvg}
        ${barsSvg}
        <polyline fill="none" stroke="#0284C7" stroke-width="3" stroke-dasharray="7,4" points="${smaLinePts}" />
        ${smaDotsSvg}
      </svg>
    `;
    attachSvgTooltips(container);
    return;
  }

  // Monthly Mode
  const mRows = model.monthly.rows;
  const mForecast = model.monthly.forecastPorsi;
  titleEl.textContent = 'Perbandingan Penjualan Bulanan & Proyeksi Agustus 2026';
  subEl.textContent = `Perbandingan total porsi historis dan estimasi bulan Agustus 2026 (${monthlyOpenDays} hari buka).`;
  badgeEl.textContent = `${mRows.length} Bulan + Proyeksi`;

  legendEl.innerHTML = `
    <span class="legend-item"><span class="legend-swatch" style="background:#4A2C18;"></span>Penjualan Aktual Bulanan</span>
    <span class="legend-item"><span class="legend-swatch" style="background:#137A55;"></span>Proyeksi Agustus 2026 (${mForecast} porsi)</span>
  `;

  const mItems = mRows.map(m => ({
    label: `${m.bulan} 2026`,
    sub: `${m.daysCount} hari aktif`,
    porsi: m.porsi,
    omzet: m.omzet,
    isForecast: false
  }));
  mItems.push({
    label: 'Agustus 2026 (Proyeksi)',
    sub: `Target ${monthlyOpenDays} hari`,
    porsi: mForecast,
    omzet: model.monthly.forecastOmzet,
    isForecast: true
  });

  const maxVal = Math.max(950, Math.ceil(Math.max(...mItems.map(i => i.porsi)) / 100) * 100);
  const colW = plotW / mItems.length;
  const barW = Math.min(78, colW * 0.45);
  const getY = v => padT + plotH - (v / maxVal) * plotH;

  let gridSvg = '';
  for (let g = 0; g <= 4; g++) {
    const val = Math.round((maxVal / 4) * g);
    const y = getY(val);
    gridSvg += `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#EFE4D6" stroke-width="1" />
      <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10.5" fill="#8C6A53" font-weight="700">${val}</text>
    `;
  }

  let barsSvg = '';
  mItems.forEach((it, idx) => {
    const cx = padL + colW * idx + colW / 2;
    const bx = cx - barW / 2;
    const by = getY(it.porsi);
    const bh = padT + plotH - by;
    const fill = it.isForecast ? '#137A55' : '#4A2C18';
    const tip = escapeHtml(
      `<strong>${it.label}</strong> (${it.sub})<br/>` +
      `Volume: <strong>${it.porsi} porsi</strong><br/>` +
      `Omzet: ${formatRupiah(it.omzet)}`
    );
    barsSvg += `
      <rect x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="8" fill="${fill}" data-tip="${tip}" />
      <text x="${cx}" y="${by - 8}" text-anchor="middle" font-size="12" fill="#2A180D" font-weight="800">${it.porsi} porsi</text>
      <text x="${cx}" y="${H - 22}" text-anchor="middle" font-size="11" fill="${it.isForecast ? '#137A55' : '#4A2C18'}" font-weight="800">${it.label}</text>
      <text x="${cx}" y="${H - 9}" text-anchor="middle" font-size="10" fill="#8C6A53">${it.sub}</text>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik Perbandingan Bulanan">
      ${gridSvg}
      ${barsSvg}
    </svg>
  `;
  attachSvgTooltips(container);
}

function renderSeasonalChart(model) {
  const container = document.getElementById('chart2-container');
  const legendEl = document.getElementById('chart2-legend');
  const subEl = document.getElementById('chart2-subtitle');

  subEl.textContent = `Rata-rata penjualan & indeks pengali 7 hari${outlierMode === 'iqr_cap' ? ' (Setelah Capping IQR)' : ''}. Hari target (${targetDay}) disorot emas.`;
  legendEl.innerHTML = `
    <span class="legend-item"><span class="legend-swatch" style="background:#C86D1F;"></span>Hari Target Dipilih (${targetDay})</span>
    <span class="legend-item"><span class="legend-swatch" style="background:#5C3A21;"></span>Hari Lainnya (Senin–Minggu)</span>
  `;

  const W = 520;
  const H = 310;
  const padL = 40;
  const padR = 16;
  const padT = 32;
  const padB = 46;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const daysArr = DAY_NAMES_ORDERED.map(d => model.dayStats[d]);
  const maxMean = Math.max(45, Math.ceil(Math.max(...daysArr.map(d => d.mean)) / 10) * 10);
  const colW = plotW / daysArr.length;
  const barW = Math.min(38, colW * 0.62);
  const getY = v => padT + plotH - (v / maxMean) * plotH;

  let gridSvg = '';
  for (let g = 0; g <= 4; g++) {
    const val = Math.round((maxMean / 4) * g);
    const y = getY(val);
    gridSvg += `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#EFE4D6" stroke-width="1" />
      <text x="${padL - 7}" y="${y + 4}" text-anchor="end" font-size="10.5" fill="#8C6A53" font-weight="700">${val}</text>
    `;
  }

  let barsSvg = '';
  daysArr.forEach((d, idx) => {
    const cx = padL + colW * idx + colW / 2;
    const bx = cx - barW / 2;
    const by = getY(d.mean);
    const bh = padT + plotH - by;
    const isTarget = d.day === targetDay;
    const fill = isTarget ? '#C86D1F' : '#5C3A21';

    const tip = escapeHtml(
      `<strong>Hari ${d.day}</strong> (${d.count}x buka)<br/>` +
      `Rata-rata: <strong>${formatNum(d.mean, 2)} porsi/hari</strong><br/>` +
      `Indeks Pola Hari: <strong>${formatNum(d.index, 2)}x</strong>`
    );

    barsSvg += `
      <rect x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="6" fill="${fill}" data-tip="${tip}" />
      <text x="${cx}" y="${by - 17}" text-anchor="middle" font-size="9.5" fill="${isTarget ? '#C86D1F' : '#8C6A53'}" font-weight="800">${formatNum(d.index, 2)}x</text>
      <text x="${cx}" y="${by - 5}" text-anchor="middle" font-size="10.5" fill="#2A180D" font-weight="800">${formatNum(d.mean, 1)}</text>
      <text x="${cx}" y="${H - 22}" text-anchor="middle" font-size="10.5" fill="${isTarget ? '#C86D1F' : '#4A2C18'}" font-weight="800">${d.day.slice(0, 3)}</text>
      <text x="${cx}" y="${H - 9}" text-anchor="middle" font-size="9" fill="#8C6A53">${d.count} hr</text>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik Indeks Pola Hari">
      ${gridSvg}
      ${barsSvg}
    </svg>
  `;
  attachSvgTooltips(container);
}
