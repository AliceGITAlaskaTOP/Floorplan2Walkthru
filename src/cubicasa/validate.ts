/** Reject unsupported drawings before replacing a working scene. */
export function validatePlanSvg(svg: string) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') {
    throw new Error('Файл не является корректной SVG-планировкой.');
  }
  const rooms = doc.querySelectorAll('g.Space > polygon');
  const walls = doc.querySelectorAll('g.Wall > polygon');
  if (!rooms.length || !walls.length) {
    throw new Error('Нужен SVG в формате CubiCasa: с размеченными комнатами (Space) и стенами (Wall). Пример можно скачать в разделе «Помощь».');
  }
}
