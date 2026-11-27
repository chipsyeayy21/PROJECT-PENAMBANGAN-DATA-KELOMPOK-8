/* Tabel rekap & halaman ekstra (stok, metodologi, tentang) */
'use strict';

// ======================================================================
// F. RENDERER TABEL FULL-WIDTH & EKSTRA MENU PAGES
// ======================================================================
function renderDatasetTable(model) {
  const thead = document.getElementById('table-head');
  const tbody = document.getElementById('table-body');
  const scopeInfo = document.getElementById('table-scope-info');

  document.querySelectorAll('.tbl-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tblview === tableViewMode);
  });

  if (tableViewMode === 'daily') {
    const rows = model.daily.rows;
    scopeInfo.textContent = `Menampilkan ${rows.length} hari aktif (${model.scopeLabel})`;
    thead.innerHTML = `
      <tr>
        <th>No</th>
        <th>Tanggal</th>
        <th>Bulan</th>
        <th>Hari</th>
        <th class="text-right">Aktual (Porsi)</th>
        <th class="text-right">Basis Latih</th>
        <th class="text-right">Omzet (Rp)</th>
        <th class="text-right">SMA-${model.daily.effN} (Kontinu)</th>
        <th class="text-right">Indeks Hari</th>
        <th class="text-right">Prediksi Model</th>
        <th class="text-center">Aksi</th>
      </tr>
    `;

    tbody.innerHTML = rows.map((r, i) => {
      const badgeClass = r.isWeekend ? 'badge-weekend' : 'badge-weekday';
      const outlierTag = r.isOutlier ? `<span class="badge-outlier" title="Melebihi batas atas IQR (${formatNum(model.upperIqr, 2)} porsi)">Pencilan &gt; IQR</span>` : '';
      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${formatFullDateId(r.date)}</strong>${outlierTag}</td>
          <td>${escapeHtml(r.bulan)}</td>
          <td><span class="${badgeClass}">${escapeHtml(r.dayName)}</span></td>
          <td class="text-right"><strong>${r.porsi}</strong></td>
          <td class="text-right" style="color:${r.isOutlier && outlierMode === 'iqr_cap' ? '#BE123C' : '#6B4730'}; font-weight:700;">${formatNum(r.modelPorsi, r.modelPorsi % 1 === 0 ? 0 : 1)}</td>
          <td class="text-right">${formatRupiah(r.omzet)}</td>
          <td class="text-right" style="color:#0284C7; font-weight:700;">${r.smaVal !== null ? formatNum(r.smaVal, 2) : '-'}</td>
          <td class="text-right">${formatNum(r.seasonalIdx, 2)}x</td>
          <td class="text-right">${r.predPorsi !== null ? formatNum(r.predPorsi, 1) : '-'}</td>
          <td class="text-center">
            <button type="button" class="btn-danger-mini delete-row-btn" data-date="${r.date}">Hapus</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.delete-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetDate = btn.getAttribute('data-date');
        if (salesData.length <= 5) {
          showToast('Minimal 5 hari data harus tetap dipertahankan.', 'warning');
          return;
        }
        salesData = salesData.filter(item => item.date !== targetDate);
        saveDataset();
        renderAll();
        showToast(`Data tanggal ${formatFullDateId(targetDate)} dihapus.`, 'info');
      });
    });
    return;
  }

  if (tableViewMode === 'weekly') {
    const rows = model.weekly.rows;
    scopeInfo.textContent = `Menampilkan ${rows.length} pekan kalender Senin–Minggu (${model.scopeLabel})`;
    thead.innerHTML = `
      <tr>
        <th>Pekan</th>
        <th>Rentang Tanggal</th>
        <th>Periode Bulan</th>
        <th class="text-center">Hari Buka</th>
        <th class="text-right">Total Porsi</th>
        <th class="text-right">Total Omzet (Rp)</th>
        <th class="text-right">Weekly SMA-${model.weekly.effN}</th>
        <th class="text-right">Error (%)</th>
      </tr>
    `;

    tbody.innerHTML = rows.map(w => {
      const tag = w.isBridge
        ? `<span class="badge-bridge">${escapeHtml(w.bulanLabel)} (Lintas Bulan)</span>`
        : `<span class="badge-weekday">${escapeHtml(w.bulanLabel)}</span>`;
      return `
        <tr>
          <td><strong>${escapeHtml(w.pekanLabel)}</strong></td>
          <td>${escapeHtml(w.rangeLabel)}</td>
          <td>${tag}</td>
          <td class="text-center">${w.daysCount} hari</td>
          <td class="text-right"><strong>${w.porsi} porsi</strong></td>
          <td class="text-right">${formatRupiah(w.omzet)}</td>
          <td class="text-right" style="color:#0284C7; font-weight:700;">${w.smaVal !== null ? formatNum(w.smaVal, 1) : '-'}</td>
          <td class="text-right">${w.ape !== null ? formatNum(w.ape, 1) + '%' : '-'}</td>
        </tr>
      `;
    }).join('');
    return;
  }

  // Monthly Rekap Table
  const mRows = model.monthly.rows;
  scopeInfo.textContent = `Menampilkan rekapitulasi ${mRows.length} bulan (${model.scopeLabel})`;
  thead.innerHTML = `
    <tr>
      <th>Bulan (2026)</th>
      <th class="text-center">Hari Aktif</th>
      <th class="text-center">Hari Libur</th>
      <th class="text-right">Total Terjual (Porsi)</th>
      <th class="text-right">Rata-rata / Hari</th>
      <th class="text-right">Total Omzet (Rp)</th>
    </tr>
  `;

  tbody.innerHTML = mRows.map(m => {
    const libur = m.bulan === 'Juni' ? '4 hari' : (m.bulan === 'Juli' ? '9 hari' : '-');
    return `
      <tr>
        <td><strong>${escapeHtml(m.bulan)} 2026</strong></td>
        <td class="text-center">${m.daysCount} hari</td>
        <td class="text-center">${libur}</td>
        <td class="text-right"><strong>${m.porsi.toLocaleString('id-ID')} porsi</strong></td>
        <td class="text-right">${formatNum(m.avgDaily, 2)} porsi/hr</td>
        <td class="text-right" style="color:var(--emerald-primary); font-weight:800;">${formatRupiah(m.omzet)}</td>
      </tr>
    `;
  }).join('');
}

function applyMenuVisibility() {
  document.querySelectorAll('.menu-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.menu === activeMenu);
  });

  document.querySelectorAll('[data-menu-groups]').forEach(sec => {
    const groups = (sec.getAttribute('data-menu-groups') || '').split(',');
    const visible = activeMenu === 'all' || groups.includes(activeMenu);
    sec.classList.toggle('hidden', !visible);
  });
}

function renderMenuExtras(model, baseStock, totalStock, extraStock, stockTitle) {
  const d = model.daily;
  const w = model.weekly;
  const m = model.monthly;

  const scaleBadge = activeScale === 'daily'
    ? `Skala Per-Hari (${targetDay}) — ${model.scopeLabel}`
    : (activeScale === 'weekly'
        ? `Skala Per-Minggu (${w.nextTitle}, ${weeklyOpenDays} hr) — ${model.scopeLabel}`
        : `Skala Per-Bulan (Agustus 2026) — ${model.scopeLabel}`);

  const breadPacks = Math.max(1, Math.ceil(totalStock / 10));
  document.getElementById('stok-page-base').textContent = `${baseStock.toLocaleString('id-ID')} Porsi`;
  document.getElementById('stok-page-scope').textContent = scaleBadge;
  document.getElementById('stok-page-extra').textContent = `+${extraStock.toLocaleString('id-ID')} Tangkup`;
  document.getElementById('stok-page-total').textContent = `${totalStock.toLocaleString('id-ID')} Tangkup`;
  document.getElementById('stok-page-packs').textContent = `${breadPacks.toLocaleString('id-ID')} Bungkus`;
  document.getElementById('raw-mat-roti').textContent = `${breadPacks.toLocaleString('id-ID')} bungkus (${totalStock} porsi)`;

  const ingredientHints = {
    'Cokelat + Keju': 'Estimasi bahan: meses cokelat + keju parut + margarin (174 porsi historis)',
    'Cokelat Polos': 'Estimasi bahan: meses cokelat + susu kental manis (121 porsi historis)',
    'Blueberry + Cokelat': 'Estimasi bahan: selai blueberry + meses cokelat (89 porsi historis)',
    'Blueberry Polos': 'Estimasi bahan: selai blueberry + margarin (86 porsi historis)',
    'Blueberry + Keju': 'Estimasi bahan: selai blueberry + keju parut (85 porsi historis)',
    'Srikaya Polos': 'Estimasi bahan: selai srikaya + margarin (82 porsi historis)',
    'Strawberry + Keju': 'Estimasi bahan: selai strawberry + keju parut (80 porsi historis)',
    'Kacang + Cokelat': 'Estimasi bahan: selai kacang + meses cokelat (74 porsi historis)'
  };

  let allocatedTop8 = 0;
  let rowsHtml = TOP_VARIANTS.map((v, idx) => {
    const basePorsi = Math.max(1, Math.round(baseStock * v.pct));
    const prepPorsi = Math.max(1, Math.round(totalStock * v.pct));
    allocatedTop8 += prepPorsi;
    return `
      <tr>
        <td>
          <label class="stock-check-item">
            <input type="checkbox" class="stok-row-cb" />
          </label>
        </td>
        <td><span class="badge-weekend">#${idx + 1}</span></td>
        <td><strong>${escapeHtml(v.name)}</strong></td>
        <td class="text-right">${v.label} (${v.count} porsi)</td>
        <td class="text-right">${basePorsi.toLocaleString('id-ID')} porsi</td>
        <td class="text-right" style="color:var(--emerald-primary); font-weight:800;">${prepPorsi.toLocaleString('id-ID')} tangkup</td>
        <td style="font-size:12px; color:var(--text-muted);">${escapeHtml(ingredientHints[v.name] || 'Selai / topping')}</td>
      </tr>
    `;
  }).join('');

  const remBase = Math.max(1, baseStock - TOP_VARIANTS.reduce((s, v) => s + Math.max(1, Math.round(baseStock * v.pct)), 0));
  const remPrep = Math.max(1, totalStock - allocatedTop8);
  rowsHtml += `
    <tr style="background:#FAF8F5;">
      <td>
        <label class="stock-check-item">
          <input type="checkbox" class="stok-row-cb" />
        </label>
      </td>
      <td><span class="badge-weekday">Lainnya</span></td>
      <td><strong>27 Varian Kombinasi Lainnya</strong></td>
      <td class="text-right">47,1% (705 porsi)</td>
      <td class="text-right">${remBase.toLocaleString('id-ID')} porsi</td>
      <td class="text-right" style="color:var(--text-roast); font-weight:800;">${remPrep.toLocaleString('id-ID')} tangkup</td>
      <td style="font-size:12px; color:var(--text-muted);">Cadangan kombinasi selai nanas, kacang, strawberry, keju &amp; cokelat</td>
    </tr>
  `;

  const tbody = document.getElementById('stok-checklist-tbody');
  tbody.innerHTML = rowsHtml;
  tbody.querySelectorAll('.stok-row-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const tr = cb.closest('tr');
      if (tr) tr.classList.toggle('stock-row-checked', cb.checked);
    });
  });

  // Update Live Numbers on Metodologi Page
  document.getElementById('met-live-sma').textContent =
    `Nilai Aktif: SMA-${d.effN} Harian = ${formatNum(d.nextSma, 2)} porsi | Weekly SMA-${w.effN} = ${formatNum(w.nextSma, 1)} porsi`;
  document.getElementById('met-live-index').textContent =
    `Nilai Aktif: I_${targetDay} = ${formatNum(d.targetIndex, 2)}x (Rerata hari ${targetDay}: ${formatNum(d.targetDayMean, 2)} porsi/hr; basis rerata: ${formatNum(model.modelDailyMean, 2)} porsi/hr)`;
  document.getElementById('met-live-forecast').textContent =
    `Proyeksi Aktif: Harian (${targetDay}) = ${d.forecastPorsi} porsi | Mingguan (${w.nextTitle}) = ${w.forecastPorsi} porsi | Bulanan (Agustus) = ${m.forecastPorsi} porsi`;
  document.getElementById('met-live-stock').textContent =
    `Nilai Aktif: ${stockTitle.replace(' (+10% SAFETY STOCK)', '')} = ${baseStock} porsi → Stok +10% = ${totalStock} tangkup (${breadPacks} bungkus roti)`;
  document.getElementById('met-live-acc').textContent =
    `Evaluasi Aktif (${outlierMode === 'iqr_cap' ? 'Capping IQR' : 'Data Asli'}): MAE = ${formatNum(d.mae, 2)} porsi | RMSE = ${formatNum(d.rmse, 2)} porsi | MAPE = ${formatNum(d.mape, 1)}%`;
}
