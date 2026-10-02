let timer: ReturnType<typeof setTimeout> | undefined;
export function showStatus(message: string, error = false, persist = false) {
  const el = document.getElementById('scene-status');
  if (!el) return;
  clearTimeout(timer);
  el.textContent = message;
  el.classList.toggle('error', error);
  if (!persist) timer = setTimeout(() => { el.textContent = ''; }, error ? 12000 : 6500);
}
export function showError(error: unknown) {
  console.error(error);
  showStatus(error instanceof Error ? error.message : 'Не удалось выполнить действие. Попробуйте ещё раз.', true);
}
