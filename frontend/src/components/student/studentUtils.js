/**
 * Student Academic Toolkit - Utility Helpers
 * Standardizes API error formatting to guarantee human-readable errors
 * and prevent raw Pydantic validation errors from ever showing as "[object Object]".
 */

export function formatApiError(errJson, fallback = 'Operation failed.') {
  if (!errJson) return fallback;

  // Check detail, message, or error properties
  const detail = errJson.detail || errJson.message || errJson.error;
  if (!detail) return fallback;

  // If already a clean string
  if (typeof detail === 'string') return detail;

  // If array of validation errors (Pydantic / FastAPI default)
  if (Array.isArray(detail)) {
    const messages = detail
      .map(item => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          // Format field name and error message
          const field = Array.isArray(item.loc) ? item.loc.slice(1).join('.') : '';
          const msg = item.msg || item.message || JSON.stringify(item);
          return field ? `${field}: ${msg}` : msg;
        }
        return String(item);
      })
      .filter(Boolean);

    return messages.length > 0 ? messages.join('; ') : fallback;
  }

  // If single object
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  return String(detail);
}
