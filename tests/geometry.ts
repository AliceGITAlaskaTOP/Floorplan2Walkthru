import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadManifest, loadPlanBundle } from '../src/cubicasa/metadata';
import { validatePlanSvg } from '../src/cubicasa/validate';
import { parseCubiCasa } from '../src/cubicasa/parser';
import { generateScene } from '../src/scene/meshGen';
import { createMaterials } from '../src/scene/materials';

const output = document.getElementById('results')!;
const results: string[] = [];
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const report = (message: string) => { results.push(message); output.textContent = results.join('\n'); };
function verifyMeshes(root: THREE.Object3D) {
  let count = 0;
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute('position');
    assert(position?.count > 0, 'Mesh must contain vertices');
    for (const value of position.array) assert(Number.isFinite(value), 'Vertex coordinates must be finite');
    const index = object.geometry.getIndex();
    if (index) for (const value of index.array) assert(value < position.count, 'Mesh index out of bounds');
    count++;
  });
  return count;
}
try {
  for (const id of (await loadManifest()).map(plan => plan.id)) {
    const bundle = await loadPlanBundle(id);
    validatePlanSvg(bundle.svgText);
    const plan = parseCubiCasa(bundle.svgText, bundle.meta);
    assert(plan.rooms.length > 0 && plan.walls.length > 0, 'Missing rooms/walls');
    for (const door of plan.doors) assert(plan.walls.some(wall => wall.id === door.wallId), 'Door without a wall');
    const scene = generateScene(plan, createMaterials());
    const count = verifyMeshes(scene);
    assert(count > plan.walls.length, '3D scene not generated');
    const copy = parseCubiCasa(bundle.svgText, JSON.parse(JSON.stringify(bundle.meta)));
    assert(JSON.stringify(copy) === JSON.stringify(plan), 'Geometry must survive metadata round-trip');
    report(`PASS ${id}: ${plan.rooms.length} rooms, ${plan.walls.length} walls, ${plan.doors.length} doors, ${plan.windows.length} windows; ${count} valid 3D meshes; round-trip identical`);
  }
  for (const svg of ['<not-svg>', '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>']) {
    let rejected = false;
    try { validatePlanSvg(svg); } catch { rejected = true; }
    assert(rejected, 'Unsupported SVG must be rejected');
  }
  report('PASS malformed SVG and unannotated drawing rejected');
  const model = await new GLTFLoader().loadAsync('/dist/assets/furniture/modern_diningtable_set_4chairs_woodtable_vase/dining_table_set.gltf');
  const count = verifyMeshes(model.scene);
  assert(count > 0, 'Split model failed to load');
  report(`PASS production dining-table model: ${count} meshes, external binary buffers and textures loaded`);
  report('ALL CHECKS PASSED');
} catch (error) { report(`FAIL ${String(error)}`); console.error(error); }
