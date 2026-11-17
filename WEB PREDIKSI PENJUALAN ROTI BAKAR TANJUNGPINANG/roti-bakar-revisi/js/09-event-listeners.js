'use strict';

// ======================================================================
// H. EVENT LISTENERS (MULTI-MENU, CONTROLS, CRUD, CSV IMPORT/EXPORT)
// ======================================================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Top 6-Menu Navigation Tabs
  document.querySelectorAll('.menu-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeMenu = btn.dataset.menu || 'dashboard';
      applyMenuVisibility();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Quick Jump Buttons
  document.querySelectorAll('[data-jump-menu]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeMenu = btn.getAttribute('data-jump-menu') || 'dashboard';
      applyMenuVisibility();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Raw Material Checkbox Styling
  document.querySelectorAll('.raw-mat-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const card = cb.closest('.raw-mat-card');
      if (card) card.classList.toggle('checked', cb.checked);
    });
  });

  // Copy Shopping List Button (using execCommand for 100% file:// & iframe support)
  document.getElementById('copy-shopping-list-btn').addEventListener('click', () => {
    const totalText = document.getElementById('stok-page-total').textContent;
    const packsText = document.getElementById('stok-page-packs').textContent;
    const scopeText = document.getElementById('stok-page-scope').textContent;
    const totalNum = Number(totalText.replace(/[^0-9]/g, '')) || 39;

    const lines = [
      `DAFTAR PERSIAPAN STOK ROTI BAKAR KHAS BANDUNG`,
      `Periode: ${scopeText}`,
      `Total Roti Tawar (+10% Safety Stock): ${totalText} (${packsText})`,
      `------------------------------------------------------------`
    ];
    TOP_VARIANTS.forEach((v, i) => {
      const qty = Math.max(1, Math.round(totalNum * v.pct));
      lines.push(`${i + 1}. ${v.name} (${v.label}): ${qty} tangkup`);
    });

    const ta = document.createElement('textarea');
    ta.value = lines.join('\n');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Daftar belanja stok berhasil disalin ke clipboard!', 'success');
    } catch (e) {
      showToast('Gagal menyalin daftar stok.', 'warning');
    }
    document.body.removeChild(ta);
  });

  // 2. Scale Tabs (Per-Hari, Per-Minggu, Per-Bulan)
  document.querySelectorAll('.scale-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeScale = btn.dataset.scale || 'daily';
      tableViewMode = activeScale;
      renderAll();
    });
  });

  // 3. Global Month Filter & Outlier IQR Capping Dropdowns
  document.getElementById('global-month-select').addEventListener('change', e => {
    selectedMonth = e.target.value;
    renderAll();
  });

  document.getElementById('outlier-mode-select').addEventListener('change', e => {
    outlierMode = e.target.value;
    renderAll();
    if (outlierMode === 'iqr_cap') {
      showToast('Mode Capping Batas Atas IQR (54,4 porsi) diaktifkan pada pelatihan model.', 'info');
    } else {
      showToast('Mode Data Aktual Asli (tanpa pembatasan pencilan) diaktifkan.', 'info');
    }
  });

  // 4. Daily Controls
  document.querySelectorAll('.daily-win-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.daily-win-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dailyWindowN = Number(btn.dataset.n) || 3;
      renderAll();
    });
  });

  document.getElementById('target-day-select').addEventListener('change', e => {
    targetDay = e.target.value;
    renderAll();
  });

  // 5. Weekly Controls
  document.querySelectorAll('.weekly-win-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.weekly-win-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      weeklyWindowN = Number(btn.dataset.wn) || 2;
      renderAll();
    });
  });

  document.getElementById('weekly-open-days').addEventListener('input', e => {
    weeklyOpenDays = Number(e.target.value) || 6;
    document.getElementById('weekly-open-days-label').textContent = `${weeklyOpenDays} Hari`;
    renderAll();
  });

  // 6. Monthly Controls
  document.getElementById('monthly-method-select').addEventListener('change', e => {
    monthlyMethod = e.target.value;
    renderAll();
  });

  document.getElementById('monthly-open-days').addEventListener('input', e => {
    monthlyOpenDays = Number(e.target.value) || 24;
    document.getElementById('monthly-open-days-label').textContent = `${monthlyOpenDays} Hari`;
    renderAll();
  });

  // 7. Table Sub-Tabs
  document.querySelectorAll('.tbl-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tableViewMode = btn.dataset.tblview || 'daily';
      renderAll();
    });
  });

  // 8. CRUD Form Add / Update Transaction
  document.getElementById('transaction-form').addEventListener('submit', e => {
    e.preventDefault();
    const dateVal = document.getElementById('input-date').value.trim();
    const porsiVal = Math.round(Number(document.getElementById('input-porsi').value));
    const rawOmzet = document.getElementById('input-omzet').value.trim();

    if (!dateVal || isNaN(porsiVal) || porsiVal <= 0) {
      showToast('Masukkan tanggal dan jumlah porsi yang valid.', 'warning');
      return;
    }

    const model = computeHybridTimeSeries();
    const omzetVal = rawOmzet !== '' && Number(rawOmzet) > 0
      ? Math.round(Number(rawOmzet))
      : Math.round(porsiVal * model.avgPrice);

    const bulanVal = getMonthNameFromDate(dateVal);
    const existingIdx = salesData.findIndex(item => item.date === dateVal);
    if (existingIdx >= 0) {
      salesData[existingIdx] = { date: dateVal, bulan: bulanVal, porsi: porsiVal, omzet: omzetVal };
      showToast(`Data tanggal ${formatFullDateId(dateVal)} diperbarui (${porsiVal} porsi).`, 'success');
    } else {
      salesData.push({ date: dateVal, bulan: bulanVal, porsi: porsiVal, omzet: omzetVal });
      salesData = normalizeDataset(salesData);
      showToast(`Data tanggal ${formatFullDateId(dateVal)} ditambahkan (${porsiVal} porsi).`, 'success');
    }

    document.getElementById('input-porsi').value = '';
    document.getElementById('input-omzet').value = '';
    saveDataset();
    renderAll();
  });

  // 9. Reset Dataset (Inline 2-step confirmation without confirm())
  const resetBtn = document.getElementById('reset-data-btn');
  resetBtn.addEventListener('click', () => {
    if (!resetConfirmPending) {
      resetConfirmPending = true;
      resetBtn.textContent = 'Klik Sekali Lagi untuk Konfirmasi Reset';
      resetBtn.style.background = '#FEF3C7';
      setTimeout(() => {
        resetConfirmPending = false;
        resetBtn.textContent = 'Reset Awal (48 Hari)';
        resetBtn.style.background = '';
      }, 3500);
      return;
    }
    resetConfirmPending = false;
    resetBtn.textContent = 'Reset Awal (48 Hari)';
    resetBtn.style.background = '';
    salesData = normalizeDataset(INITIAL_DATASET);
    saveDataset();
    renderAll();
    showToast('Dataset dikembalikan ke 48 hari aktif awal (1 Juni – 31 Juli 2026).', 'success');
  });

  // 10. Export CSV
  document.getElementById('export-csv-btn').addEventListener('click', () => {
    const model = computeHybridTimeSeries();
    const header = ['No', 'Tanggal', 'Bulan', 'Hari', 'Aktual_Porsi', 'Basis_Latih', 'Omzet_Rp', `SMA_${model.daily.effN}`, 'Indeks_Hari', 'Prediksi_Model'];
    const lines = [header.join(',')];
    model.daily.rows.forEach((r, i) => {
      lines.push([
        i + 1,
        r.date,
        r.bulan,
        r.dayName,
        r.porsi,
        r.modelPorsi.toFixed(2),
        r.omzet,
        r.smaVal !== null ? r.smaVal.toFixed(2) : '',
        r.seasonalIdx.toFixed(3),
        r.predPorsi !== null ? r.predPorsi.toFixed(2) : ''
      ].join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecasting_roti_bakar_${selectedMonth.toLowerCase()}_${outlierMode}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('File CSV hasil perhitungan berhasil diunduh.', 'success');
  });

  // 11. Import CSV
  const fileInput = document.getElementById('csv-file-input');
  document.getElementById('import-csv-btn').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = String(ev.target.result || '');
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const parsed = [];
        lines.forEach(line => {
          const cols = line.split(/[;,]/).map(c => c.replace(/^"|"$/g, '').trim());
          const dateCol = cols.find(c => /^\d{4}-\d{2}-\d{2}$/.test(c));
          if (dateCol) {
            const nums = cols
              .filter(c => c !== dateCol && !isNaN(Number(c)) && Number(c) > 0)
              .map(Number);
            if (nums.length >= 1) {
              const porsi = nums[0] < 1000 ? Math.round(nums[0]) : Math.round(nums[1] || 25);
              const omzet = nums.find(n => n >= 10000) || Math.round(porsi * 14793);
              parsed.push({
                date: dateCol,
                bulan: getMonthNameFromDate(dateCol),
                porsi,
                omzet
              });
            }
          }
        });

        if (parsed.length === 0) {
          showToast('Tidak ditemukan baris tanggal YYYY-MM-DD yang valid pada file CSV.', 'warning');
          return;
        }
        salesData = normalizeDataset(parsed);
        saveDataset();
        renderAll();
        showToast(`Berhasil mengimpor ${salesData.length} hari transaksi dari CSV.`, 'success');
      } catch (err) {
        showToast('Gagal membaca file CSV: ' + err.message, 'error');
      } finally {
        fileInput.value = '';
      }
    };
    reader.readAsText(file);
  });

  // Initial Render
  renderAll();
});
