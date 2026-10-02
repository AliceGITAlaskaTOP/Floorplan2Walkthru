import { showStatus } from './ui/status';

// Keep a useful plan available on browsers without GPU/WebGL2 support.
const canvas = document.createElement('canvas');
let webgl: WebGL2RenderingContext | null = null;
try { webgl = canvas.getContext('webgl2'); } catch { /* handled below */ }
if (webgl) {
  webgl.getExtension('WEBGL_lose_context')?.loseContext();
  import('./main').catch((error) => {
    console.error(error);
    void showFallback('Не удалось запустить 3D. Попробуйте обновить страницу или открыть сайт в другом браузере.');
  });
} else {
  void showFallback('В этом браузере недоступен WebGL 2. Для 3D включите аппаратное ускорение или откройте сайт в современном Chrome, Edge, Firefox или Safari.');
}

async function showFallback(message: string) {
  document.getElementById('loading-screen')!.classList.add('hidden');
  document.body.classList.add('no-webgl');
  for (const control of document.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('#picker-bar button, #scene-toolbar button, #pano-quality')) {
    control.disabled = true;
  }
  const help = document.getElementById('btn-help') as HTMLButtonElement;
  help.disabled = false;
  const overlay = document.getElementById('controls-overlay')!;
  help.addEventListener('click', () => overlay.classList.toggle('hidden'));
  document.getElementById('controls-close')!.addEventListener('click', () => overlay.classList.add('hidden'));
  const fallback = document.createElement('main');
  fallback.className = 'webgl-fallback';
  const heading = document.createElement('h1'); heading.textContent = 'Планировка в 2D';
  const note = document.createElement('p'); note.textContent = message;
  const preview = document.createElement('img'); preview.alt = 'Планировка выбранного примера';
  const retry = document.createElement('button'); retry.className = 'picker-btn'; retry.textContent = 'Повторить запуск 3D';
  retry.addEventListener('click', () => location.reload());
  fallback.append(heading, note, preview, retry);
  document.body.append(fallback);
  try {
    const { loadManifest, loadPlanBundle } = await import('./cubicasa/metadata');
    const { parseCubiCasa } = await import('./cubicasa/parser');
    const { BirdsEyeRenderer } = await import('./scene/birdsEye');
    const plans = await loadManifest();
    const select = document.getElementById('plan-picker') as HTMLSelectElement;
    select.replaceChildren(...plans.map(plan => new Option(plan.name, plan.id)));
    const renderer = new BirdsEyeRenderer();
    const render = async () => {
      const bundle = await loadPlanBundle(select.value);
      const plan = parseCubiCasa(bundle.svgText, bundle.meta);
      preview.src = renderer.capture(plan, []);
      showStatus(`${plan.rooms.length} помещений · ${plan.walls.length} стен · ${plan.doors.length} дверей · ${plan.windows.length} окон. Режим 2D.`, false, true);
    };
    select.addEventListener('change', () => { void render().catch(error => showStatus(String(error), true)); });
    await render();
  } catch (error) { showStatus('Не удалось загрузить планировку. Обновите страницу.', true, true); }
}
