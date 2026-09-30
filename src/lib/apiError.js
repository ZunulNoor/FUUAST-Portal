// Translates technical failures into plain user language.
// Server validation messages (400/409/422) pass through — they already name
// the actual problem. Everything else becomes actionable, non-technical text.
export function friendlyError(error, fallback) {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.error?.message;
  if (error?.code === 'ECONNABORTED') {
    return 'The request timed out. Check your connection and try again.';
  }
  if (!error?.response) {
    return 'No connection to the server. Check your internet and try again.';
  }
  if (status === 401) return 'Your session expired. Please sign in again.';
  if (status === 403) return "You don't have permission to do this.";
  if (status === 404) return 'This record no longer exists. Refresh the list and try again.';
  if (status === 429) return 'Too many tries. Wait a moment and try again.';
  if (status === 409 || status === 400 || status === 422) {
    return serverMessage || 'Please check your entries and try again.';
  }
  if (status >= 500) return 'Something went wrong on our side. Try again in a bit.';
  return serverMessage || fallback || 'Something went wrong. Try again.';
}
