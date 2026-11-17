'use strict';

// ======================================================================
// G. MAIN RENDER ORCHESTRATOR
// ======================================================================
function renderAll() {
  try {
    const model = computeHybridTimeSeries();
    const d = model.daily;
    const w = model.weekly;
    const m = model.monthly;

    // Update Outlier Badge
    const iqrBadge = document.getElementById('iqr-status-badge');
    if (outlierMode === 'iqr_cap') {
      iqrBadge.textContent = `Capping ${model.outlierCount} Pencilan`;
      iqrBadge.style.background = '#FFE4E6';
      iqrBadge.style.color = '#BE123C';
      iqrBadge.style.borderColor = '#FECDD3';
    } else {
      iqrBadge.textContent = 'Data Asli';
      iqrBadge.style.background = '#FEF3C7';
      iqrBadge.style.color = '#92400E';
      iqrBadge.style.borderColor = '#FCD34D';
    }

    // Toggle Scale Controls
    document.getElementById('controls-daily').classList.toggle('hidden', activeScale !== 'daily');
    document.getElementById('controls-weekly').classList.toggle('hidden', activeScale !== 'weekly');
    document.getElementById('controls-monthly').classList.toggle('hidden', activeScale !== 'monthly');

    document.querySelectorAll('.scale-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.scale === activeScale);
    });

    document.getElementById('sim-scope-badge').textContent =
      `Tampilan: ${model.visibleDaysCount} Hari Aktif • ${model.visibleTotalPorsi.toLocaleString('id-ID')} Porsi (${formatRupiah(model.visibleTotalOmzet)})`;

    let stockBasePorsi = d.forecastPorsi;
    let stockTitle = 'TOTAL ROTI TAWAR DISIAPKAN (+10% SAFETY STOCK)';

    if (activeScale === 'daily') {
      document.getElementById('sim-panel-title').textContent =
        `Parameter Per-Hari (Days) — ${model.scopeLabel}`;
      document.getElementById('sim-panel-desc').textContent =
        `SMA-${d.effN} dihitung kontinu pada seluruh ${salesData.length} hari aktif (${outlierMode === 'iqr_cap' ? 'dengan pembatasan pencilan IQR ' + formatNum(model.upperIqr, 1) + ' porsi' : 'tanpa pembatasan pencilan'}), lalu difilter tampilannya sesuai bulan terpilih.`;

      document.getElementById('kpi1-label').textContent = `PROYEKSI PORSI HARIAN (${targetDay.toUpperCase()})`;
      document.getElementById('kpi1-value').textContent = `${d.forecastPorsi} Porsi`;
      document.getElementById('kpi1-sub-left').textContent = `Indeks Pola Hari (${targetDay}):`;
      document.getElementById('kpi1-sub-right').textContent = `${formatNum(d.targetIndex, 2)}x`;

      document.getElementById('kpi2-label').textContent = 'PROYEKSI OMZET HARIAN (RP)';
      document.getElementById('kpi2-value').textContent = formatRupiah(d.forecastOmzet);
      document.getElementById('kpi2-sub-left').textContent = 'Harga rata-rata/porsi:';
      document.getElementById('kpi2-sub-right').textContent = formatRupiah(model.avgPrice);

      document.getElementById('kpi3-label').textContent = `NILAI DASAR SMA-${d.effN} (KONTINU)`;
      document.getElementById('kpi3-value').textContent = `${formatNum(d.nextSma, 2)} Porsi`;
      document.getElementById('kpi3-sub-left').textContent = 'Rata-rata tampilan:';
      document.getElementById('kpi3-sub-right').textContent = `${formatNum(model.visibleMean, 2)} porsi/hr`;

      document.getElementById('kpi4-label').textContent = 'EVALUASI AKURASI (MAPE %)';
      document.getElementById('kpi4-value').textContent = `${formatNum(d.mape, 1)}%`;
      document.getElementById('kpi4-sub-left').textContent = 'MAE & RMSE:';
      document.getElementById('kpi4-sub-right').textContent = `MAE ${formatNum(d.mae, 2)} | RMSE ${formatNum(d.rmse, 2)}`;

      document.getElementById('math-details-container').innerHTML = `
        <div class="math-row"><span>1. Nilai Dasar SMA-${d.effN} (${outlierMode === 'iqr_cap' ? 'Capped IQR ≤ ' + formatNum(model.upperIqr, 1) : 'Kontinu'}):</span><strong>${formatNum(d.nextSma, 2)} porsi/hari</strong></div>
        <div class="math-row"><span>2. Rata-rata Hari ${targetDay} (${model.dayStats[targetDay].count}x buka):</span><strong>${formatNum(d.targetDayMean, 2)} porsi/hari</strong></div>
        <div class="math-row"><span>3. Indeks Pola Hari (${targetDay} / Rerata Basis):</span><strong>${formatNum(d.targetIndex, 3)}x</strong></div>
        <div class="math-row math-row-highlight"><span>4. Proyeksi 1 Hari (${formatNum(d.nextSma, 2)} &times; ${formatNum(d.targetIndex, 2)}):</span><strong>${d.forecastPorsi} Porsi (${formatRupiah(d.forecastOmzet)})</strong></div>
        <div class="math-row"><span>5. Metrik Evaluasi Laporan (MAE / RMSE / MAPE):</span><strong>${formatNum(d.mae, 2)} / ${formatNum(d.rmse, 2)} porsi / ${formatNum(d.mape, 1)}%</strong></div>
      `;

      stockBasePorsi = d.forecastPorsi;
      stockTitle = `TOTAL ROTI TAWAR HARIAN (${targetDay.toUpperCase()}) (+10% SAFETY STOCK)`;
    } else if (activeScale === 'weekly') {
      document.getElementById('sim-panel-title').textContent =
        `Parameter Per-Minggu (Weeks) — ${model.scopeLabel}`;
      document.getElementById('sim-panel-desc').textContent =
        `Weekly SMA-${w.effN} dihitung secara kontinu lintas bulan (Senin–Minggu, Pekan 1–9) dan disesuaikan dengan target ${weeklyOpenDays} hari buka pekan depan.`;

      document.getElementById('kpi1-label').textContent = `PROYEKSI PORSI MINGGUAN (${w.nextTitle.toUpperCase()})`;
      document.getElementById('kpi1-value').textContent = `${w.forecastPorsi} Porsi`;
      document.getElementById('kpi1-sub-left').textContent = 'Asumsi hari buka:';
      document.getElementById('kpi1-sub-right').textContent = `${weeklyOpenDays} Hari`;

      document.getElementById('kpi2-label').textContent = 'PROYEKSI OMZET MINGGUAN (RP)';
      document.getElementById('kpi2-value').textContent = formatRupiah(w.forecastOmzet);
      document.getElementById('kpi2-sub-left').textContent = 'Harga rata-rata/porsi:';
      document.getElementById('kpi2-sub-right').textContent = formatRupiah(model.avgPrice);

      document.getElementById('kpi3-label').textContent = `WEEKLY SMA-${w.effN} (KONTINU)`;
      document.getElementById('kpi3-value').textContent = `${formatNum(w.nextSma, 1)} Porsi`;
      document.getElementById('kpi3-sub-left').textContent = 'Rata-rata pekan tampil:';
      document.getElementById('kpi3-sub-right').textContent = `${formatNum(w.visibleMean, 1)} porsi/mgg`;

      document.getElementById('kpi4-label').textContent = 'EVALUASI AKURASI MINGGUAN (MAPE)';
      document.getElementById('kpi4-value').textContent = `${formatNum(w.mape, 1)}%`;
      document.getElementById('kpi4-sub-left').textContent = 'MAE & RMSE:';
      document.getElementById('kpi4-sub-right').textContent = `MAE ${formatNum(w.mae, 1)} | RMSE ${formatNum(w.rmse, 1)}`;

      document.getElementById('math-details-container').innerHTML = `
        <div class="math-row"><span>1. Nilai Dasar Weekly SMA-${w.effN} (Kontinu):</span><strong>${formatNum(w.nextSma, 1)} porsi/pekan</strong></div>
        <div class="math-row"><span>2. Rerata Hari Buka Historis per Pekan:</span><strong>${formatNum(w.avgDaysPerWeek, 2)} hari/pekan</strong></div>
        <div class="math-row"><span>3. Faktor Penyesuaian (${weeklyOpenDays} / ${formatNum(w.avgDaysPerWeek, 2)}):</span><strong>${formatNum(w.scaleFactor, 3)}x</strong></div>
        <div class="math-row math-row-highlight"><span>4. Proyeksi ${w.nextTitle} (${weeklyOpenDays} Hari Buka):</span><strong>${w.forecastPorsi} Porsi (${formatRupiah(w.forecastOmzet)})</strong></div>
        <div class="math-row"><span>5. Metrik Evaluasi Mingguan (MAE / RMSE / MAPE):</span><strong>${formatNum(w.mae, 1)} / ${formatNum(w.rmse, 1)} porsi / ${formatNum(w.mape, 1)}%</strong></div>
      `;

      stockBasePorsi = w.forecastPorsi;
      stockTitle = `TOTAL ROTI TAWAR MINGGUAN (${w.nextTitle.toUpperCase()}) (+10% SAFETY STOCK)`;
    } else {
      document.getElementById('sim-panel-title').textContent =
        `Parameter Per-Bulan (Months) — ${model.scopeLabel}`;
      document.getElementById('sim-panel-desc').textContent =
        `Perbandingan performa Juni 2026 (859 porsi / Rp 12.677.000) vs Juli 2026 (637 porsi / Rp 9.454.000) serta proyeksi estimasi bulan Agustus 2026.`;

      document.getElementById('kpi1-label').textContent = 'PROYEKSI PORSI BULAN AGUSTUS 2026';
      document.getElementById('kpi1-value').textContent = `${m.forecastPorsi} Porsi`;
      document.getElementById('kpi1-sub-left').textContent = 'Target hari buka:';
      document.getElementById('kpi1-sub-right').textContent = `${monthlyOpenDays} Hari`;

      document.getElementById('kpi2-label').textContent = 'PROYEKSI OMZET BULAN AGUSTUS (RP)';
      document.getElementById('kpi2-value').textContent = formatRupiah(m.forecastOmzet);
      document.getElementById('kpi2-sub-left').textContent = 'Harga rata-rata/porsi:';
      document.getElementById('kpi2-sub-right').textContent = formatRupiah(model.avgPrice);

      document.getElementById('kpi3-label').textContent = 'RATA-RATA BULANAN (SMA-2)';
      document.getElementById('kpi3-value').textContent = `${formatNum(m.sma2, 1)} Porsi`;
      document.getElementById('kpi3-sub-left').textContent = 'Laju harian aktif:';
      document.getElementById('kpi3-sub-right').textContent = `${formatNum(m.activeDailyRate, 2)} porsi/hr`;

      document.getElementById('kpi4-label').textContent = 'SELISIH ANTARBULAN (JUNI VS JULI)';
      document.getElementById('kpi4-value').textContent = `${formatNum(m.mape, 1)}%`;
      document.getElementById('kpi4-sub-left').textContent = 'MAE & RMSE:';
      document.getElementById('kpi4-sub-right').textContent = `${Math.round(m.mae)} porsi`;

      document.getElementById('math-details-container').innerHTML = `
        <div class="math-row"><span>1. Realisasi Bulan Juni 2026 (26 Hari):</span><strong>859 Porsi (Rp 12.677.000)</strong></div>
        <div class="math-row"><span>2. Realisasi Bulan Juli 2026 (22 Hari):</span><strong>637 Porsi (Rp 9.454.000)</strong></div>
        <div class="math-row"><span>3. Rata-rata SMA-2 Bulanan:</span><strong>${formatNum(m.sma2, 1)} porsi/bulan</strong></div>
        <div class="math-row math-row-highlight"><span>4. Proyeksi Agustus 2026 (${monthlyMethod === 'sma2' ? 'SMA-2 Bulanan' : monthlyOpenDays + ' Hari Buka'}):</span><strong>${m.forecastPorsi} Porsi (${formatRupiah(m.forecastOmzet)})</strong></div>
        <div class="math-row"><span>5. Kebutuhan Roti Tawar Bulanan (+10%):</span><strong>${Math.ceil(m.forecastPorsi * 1.1)} tangkup</strong></div>
      `;

      stockBasePorsi = m.forecastPorsi;
      stockTitle = 'TOTAL ROTI TAWAR BULANAN (AGUSTUS 2026) (+10% SAFETY STOCK)';
    }

    // Update Stock & 8 Top Variants Card
    const totalStock = Math.ceil(stockBasePorsi * 1.10);
    const extraStock = totalStock - stockBasePorsi;
    document.getElementById('stock-banner-title').textContent = stockTitle;
    document.getElementById('stock-banner-sub').textContent =
      `Proyeksi dasar ${stockBasePorsi.toLocaleString('id-ID')} porsi + ${extraStock.toLocaleString('id-ID')} porsi cadangan aman`;
    document.getElementById('stock-banner-qty').textContent = `${totalStock.toLocaleString('id-ID')} tangkup`;

    let allocatedTop8 = 0;
    document.getElementById('top-variants-grid').innerHTML = TOP_VARIANTS.map(v => {
      const qty = Math.max(1, Math.round(totalStock * v.pct));
      allocatedTop8 += qty;
      return `
        <div class="variant-chip">
          <div>
            <div class="variant-name">${escapeHtml(v.name)}</div>
            <div class="variant-pct">Proporsi Bab II: ${v.label} (${v.count} porsi)</div>
          </div>
          <span class="variant-qty">${qty} tangkup</span>
        </div>
      `;
    }).join('');

    const remQty = Math.max(1, totalStock - allocatedTop8);
    document.getElementById('other-variants-qty').textContent = `${remQty.toLocaleString('id-ID')} tangkup`;

    // Render Charts, Extra Menu Pages & Full-Width Table
    renderMainChart(model);
    renderSeasonalChart(model);
    renderMenuExtras(model, stockBasePorsi, totalStock, extraStock, stockTitle);
    renderDatasetTable(model);
    applyMenuVisibility();

  } catch (err) {
    console.error('Render error:', err);
    showToast('Terjadi kesalahan perhitungan: ' + err.message, 'error');
  }
}
