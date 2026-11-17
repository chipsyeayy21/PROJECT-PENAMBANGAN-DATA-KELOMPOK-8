'use strict';

// Application State
let salesData = loadSavedDataset();
let activeMenu = 'dashboard';   // 'dashboard' | 'stok' | 'rekap' | 'metodologi' | 'tentang' | 'all'
let selectedMonth = 'ALL';      // 'ALL' | 'Juni' | 'Juli'
let outlierMode = 'raw';        // 'raw' | 'iqr_cap'
let activeScale = 'daily';      // 'daily' | 'weekly' | 'monthly'
let tableViewMode = 'daily';    // 'daily' | 'weekly' | 'monthly'
let dailyWindowN = 3;           // 3 | 5 | 7 | 14
let targetDay = 'Senin';        // 'Senin' .. 'Minggu'
let weeklyWindowN = 2;          // 2 | 3 | 4
let weeklyOpenDays = 6;         // 3 .. 7
let monthlyMethod = 'sma2';     // 'sma2' | 'daily_rate'
let monthlyOpenDays = 24;       // 20 .. 30
let resetConfirmPending = false;
