const nepaliDateModule = require('nepali-date-converter');
const NepaliDate = nepaliDateModule.default || nepaliDateModule;

/**
 * Normalizes any AD date value from DB/API to YYYY-MM-DD.
 */
function normalizeAdDateString(dateInput) {
  if (!dateInput) return '';

  const str = String(dateInput).trim();
  if (!str) return '';

  if (str.includes('T')) {
    return str.slice(0, 10);
  }

  return str.slice(0, 10);
}

/**
 * Formats an AD date from DB for display in Bikram Sambat (BS).
 */
function formatAdDateForDisplay(adDateInput, format = 'DD MMMM YYYY') {
  const normalized = normalizeAdDateString(adDateInput);
  if (!normalized) return 'N/A';

  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) return normalized;

  try {
    const nepaliDate = new NepaliDate(new Date(year, month - 1, day));
    return nepaliDate.format(format);
  } catch {
    return normalized;
  }
}

/**
 * PDF-safe BS date using ASCII-only romanized month names (Helvetica compatible).
 * Example: "15 Magh 2082 (BS)"
 */
function formatAdDateForPdf(adDateInput) {
  const normalized = normalizeAdDateString(adDateInput);
  if (!normalized) return 'N/A';

  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) return normalized;

  try {
    const nepaliDate = new NepaliDate(new Date(year, month - 1, day));
    return `${nepaliDate.format('DD MMM YYYY')} (BS)`;
  } catch {
    return normalized;
  }
}

/**
 * Formats an AD datetime (ISO) for display with BS date and time.
 */
function formatAdDateTimeForDisplay(isoString) {
  if (!isoString) return 'N/A';

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'N/A';

  const datePart = formatAdDateForDisplay(date.toISOString().slice(0, 10));
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${datePart} ${timePart}`;
}

/**
 * PDF-safe datetime with ASCII-only BS date and English time.
 */
function formatAdDateTimeForPdf(isoString) {
  if (!isoString) return 'N/A';

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'N/A';

  const datePart = formatAdDateForPdf(date.toISOString().slice(0, 10));
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${datePart} at ${timePart}`;
}

/**
 * Nepali BS date for PDF with Devanagari numerals and month names.
 */
function formatAdDateForPdfNepali(adDateInput) {
  const normalized = normalizeAdDateString(adDateInput);
  if (!normalized) return 'उपलब्ध छैन';

  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) return normalized;

  try {
    const nepaliDate = new NepaliDate(new Date(year, month - 1, day));
    return `${nepaliDate.format('DD MMMM YYYY', 'np')} (वि.सं.)`;
  } catch {
    return normalized;
  }
}

module.exports = {
  normalizeAdDateString,
  formatAdDateForDisplay,
  formatAdDateForPdf,
  formatAdDateForPdfNepali,
  formatAdDateTimeForDisplay,
  formatAdDateTimeForPdf,
};
