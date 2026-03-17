/**
 * Formats an ISO date string to Vietnam local time (ICT).
 * Ensures the date is treated as UTC if no timezone is provided.
 */
export function formatToLocalTime(isoStr: string): string {
  if (!isoStr) return '';
  
  // If no timezone offset (ends with Z or has +HH:mm/-HH:mm), assume UTC
  const hasTimezone = isoStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(isoStr);
  const normalized = hasTimezone ? isoStr : isoStr + 'Z';
  
  const date = new Date(normalized);
  
  // Using vi-VN locale for consistency with user's request
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Formats an ISO date string to Vietnam local date and time.
 */
export function formatToLocalDateTime(isoStr: string): string {
  if (!isoStr) return '—';
  
  const hasTimezone = isoStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(isoStr);
  const normalized = hasTimezone ? isoStr : isoStr + 'Z';
  
  const date = new Date(normalized);
  
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
