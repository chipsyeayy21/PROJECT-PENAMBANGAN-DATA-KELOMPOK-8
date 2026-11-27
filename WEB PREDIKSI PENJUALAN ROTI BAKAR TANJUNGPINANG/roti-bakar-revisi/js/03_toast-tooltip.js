/* Toast notifikasi & tooltip SVG */
'use strict';

// ======================================================================
// C. TOAST & SVG TOOLTIP HANDLERS
// ======================================================================
let toastTimer = null;
function showToast(msg, type = 'info') {
  const el = document.getElementById('toast-banner');
  el.textContent = msg;
  el.className = `toast-box toast-${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add('hidden');
  }, 3600);
}

const tooltipEl = document.getElementById('chart-tooltip');
function attachSvgTooltips(containerEl) {
  containerEl.querySelectorAll('[data-tip]').forEach(node => {
    node.style.cursor = 'pointer';
    node.addEventListener('mouseenter', e => {
      tooltipEl.innerHTML = node.getAttribute('data-tip');
      tooltipEl.classList.remove('hidden');
      positionTooltip(e);
    });
    node.addEventListener('mousemove', positionTooltip);
    node.addEventListener('mouseleave', () => {
      tooltipEl.classList.add('hidden');
    });
  });
}

function positionTooltip(e) {
  const pad = 14;
  let left = e.clientX + pad;
  let top = e.clientY + pad;
  const rect = tooltipEl.getBoundingClientRect();
  if (left + rect.width > window.innerWidth - 10) {
    left = e.clientX - rect.width - pad;
  }
  if (top + rect.height > window.innerHeight - 10) {
    top = e.clientY - rect.height - pad;
  }
  tooltipEl.style.left = `${Math.max(8, left)}px`;
  tooltipEl.style.top = `${Math.max(8, top)}px`;
}
