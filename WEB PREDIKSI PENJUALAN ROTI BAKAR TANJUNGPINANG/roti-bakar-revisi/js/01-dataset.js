'use strict';

// ======================================================================
// A. DATASET HISTORIS BERSIH 1 JUNI – 31 JULI 2026 (48 HARI OPERASIONAL)
//    Juni 2026: 26 hari aktif, 859 porsi, Rp 12.677.000
//    Juli 2026: 22 hari aktif, 637 porsi, Rp 9.454.000
//    Total    : 48 hari aktif, 1.496 porsi, Rp 22.131.000
// ======================================================================
const INITIAL_DATASET = [
  { date: '2026-06-01', bulan: 'Juni', porsi: 40, omzet: 576000 },
  { date: '2026-06-02', bulan: 'Juni', porsi: 30, omzet: 451000 },
  { date: '2026-06-03', bulan: 'Juni', porsi: 29, omzet: 445000 },
  { date: '2026-06-04', bulan: 'Juni', porsi: 21, omzet: 305000 },
  { date: '2026-06-05', bulan: 'Juni', porsi: 25, omzet: 364000 },
  { date: '2026-06-06', bulan: 'Juni', porsi: 21, omzet: 309000 },
  { date: '2026-06-07', bulan: 'Juni', porsi: 55, omzet: 808000 },
  { date: '2026-06-09', bulan: 'Juni', porsi: 29, omzet: 417000 },
  { date: '2026-06-10', bulan: 'Juni', porsi: 29, omzet: 407000 },
  { date: '2026-06-11', bulan: 'Juni', porsi: 22, omzet: 322000 },
  { date: '2026-06-12', bulan: 'Juni', porsi: 63, omzet: 949000 },
  { date: '2026-06-13', bulan: 'Juni', porsi: 34, omzet: 506000 },
  { date: '2026-06-14', bulan: 'Juni', porsi: 28, omzet: 409000 },
  { date: '2026-06-16', bulan: 'Juni', porsi: 60, omzet: 885000 },
  { date: '2026-06-18', bulan: 'Juni', porsi: 37, omzet: 545000 },
  { date: '2026-06-19', bulan: 'Juni', porsi: 26, omzet: 376000 },
  { date: '2026-06-20', bulan: 'Juni', porsi: 23, omzet: 333000 },
  { date: '2026-06-21', bulan: 'Juni', porsi: 36, omzet: 533000 },
  { date: '2026-06-22', bulan: 'Juni', porsi: 28, omzet: 410000 },
  { date: '2026-06-23', bulan: 'Juni', porsi: 24, omzet: 358000 },
  { date: '2026-06-25', bulan: 'Juni', porsi: 18, omzet: 272000 },
  { date: '2026-06-26', bulan: 'Juni', porsi: 34, omzet: 509000 },
  { date: '2026-06-27', bulan: 'Juni', porsi: 20, omzet: 302000 },
  { date: '2026-06-28', bulan: 'Juni', porsi: 27, omzet: 402000 },
  { date: '2026-06-29', bulan: 'Juni', porsi: 25, omzet: 379000 },
  { date: '2026-06-30', bulan: 'Juni', porsi: 75, omzet: 1105000 },
  { date: '2026-07-02', bulan: 'Juli', porsi: 22, omzet: 314000 },
  { date: '2026-07-03', bulan: 'Juli', porsi: 27, omzet: 410000 },
  { date: '2026-07-04', bulan: 'Juli', porsi: 28, omzet: 430000 },
  { date: '2026-07-05', bulan: 'Juli', porsi: 36, omzet: 526000 },
  { date: '2026-07-07', bulan: 'Juli', porsi: 39, omzet: 560000 },
  { date: '2026-07-09', bulan: 'Juli', porsi: 11, omzet: 156000 },
  { date: '2026-07-10', bulan: 'Juli', porsi: 44, omzet: 643000 },
  { date: '2026-07-12', bulan: 'Juli', porsi: 32, omzet: 470000 },
  { date: '2026-07-13', bulan: 'Juli', porsi: 18, omzet: 269000 },
  { date: '2026-07-14', bulan: 'Juli', porsi: 29, omzet: 432000 },
  { date: '2026-07-16', bulan: 'Juli', porsi: 27, omzet: 409000 },
  { date: '2026-07-17', bulan: 'Juli', porsi: 26, omzet: 386000 },
  { date: '2026-07-18', bulan: 'Juli', porsi: 27, omzet: 408000 },
  { date: '2026-07-19', bulan: 'Juli', porsi: 24, omzet: 360000 },
  { date: '2026-07-20', bulan: 'Juli', porsi: 42, omzet: 617000 },
  { date: '2026-07-21', bulan: 'Juli', porsi: 16, omzet: 249000 },
  { date: '2026-07-24', bulan: 'Juli', porsi: 30, omzet: 447000 },
  { date: '2026-07-25', bulan: 'Juli', porsi: 17, omzet: 254000 },
  { date: '2026-07-26', bulan: 'Juli', porsi: 37, omzet: 550000 },
  { date: '2026-07-27', bulan: 'Juli', porsi: 35, omzet: 512000 },
  { date: '2026-07-29', bulan: 'Juli', porsi: 50, omzet: 764000 },
  { date: '2026-07-30', bulan: 'Juli', porsi: 20, omzet: 288000 }
];

// 8 Varian Rasa Terlaris Setelah Penyeragaman Topping Bab II Subbab 2.3
// Total 8 varian terlaris = 791 porsi (52,9% dari 1.496 porsi)
// 30 Varian Kombinasi Lainnya = 705 porsi (47,1% dari 1.496 porsi)
const TOP_VARIANTS = [
  { name: 'Cokelat + Keju', count: 174, pct: 174 / 1496, label: '11,6%' },
  { name: 'Cokelat Polos', count: 121, pct: 121 / 1496, label: '8,1%' },
  { name: 'Blueberry + Cokelat', count: 89, pct: 89 / 1496, label: '5,9%' },
  { name: 'Blueberry Polos', count: 86, pct: 86 / 1496, label: '5,7%' },
  { name: 'Blueberry + Keju', count: 85, pct: 85 / 1496, label: '5,7%' },
  { name: 'Srikaya Polos', count: 82, pct: 82 / 1496, label: '5,5%' },
  { name: 'Strawberry + Keju', count: 80, pct: 80 / 1496, label: '5,3%' },
  { name: 'Kacang + Cokelat', count: 74, pct: 74 / 1496, label: '4,9%' }
];

const DAY_NAMES_ORDERED = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const STORAGE_KEY = 'roti_bakar_forecast_dataset_v4';
