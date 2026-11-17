'use strict';

// ======================================================================
// B. HELPER TANGGAL, KUANTIL IQR, FORMATTER & LOCAL STORAGE
// ======================================================================
function parseIsoDate(dateStr) {
  const parts = dateStr.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getIndonesianDayName(dateStr) {
  const dt = parseIsoDate(dateStr);
  const map = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return map[dt.getDay()];
}

function getMonthNameFromDate(dateStr) {
  const m = Number(dateStr.split('-')[1]);
  const names = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return names[m] || 'Lainnya';
}

function formatShortDate(dateStr) {
  const p = dateStr.split('-');
  return `${p[2]}/${p[1]}`;
}

function formatFullDateId(dateStr) {
  const p = dateStr.split('-');
  const shortMonths = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${p[2]} ${shortMonths[Number(p[1])]} ${p[0]}`;
}

function getMondayIso(dateStr) {
  const dt = parseIsoDate(dateStr);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysIso(dateStr, days) {
  const dt = parseIsoDate(dateStr);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function computeLinearPercentile(sortedNums, p) {
  if (!sortedNums.length) return 0;
  if (sortedNums.length === 1) return sortedNums[0];
  const pos = (sortedNums.length - 1) * p;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  const frac = pos - lower;
  return sortedNums[lower] + frac * (sortedNums[upper] - sortedNums[lower]);
}

function formatNum(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return Number(num).toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatRupiah(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadSavedDataset() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeDataset(parsed);
      }
    }
  } catch (e) {
    console.warn('Storage unavailable, using built-in dataset.');
  }
  return normalizeDataset(INITIAL_DATASET);
}

function saveDataset() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(salesData));
  } catch (e) {
    console.warn('Could not persist dataset.');
  }
}

function normalizeDataset(arr) {
  return arr
    .map(item => ({
      date: String(item.date).trim(),
      bulan: item.bulan || getMonthNameFromDate(String(item.date).trim()),
      porsi: Math.max(1, Math.round(Number(item.porsi) || 0)),
      omzet: Math.max(0, Math.round(Number(item.omzet) || 0))
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
