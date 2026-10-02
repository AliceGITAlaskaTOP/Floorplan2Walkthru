import { readFile, writeFile, mkdir, rm, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

// Split the 38 MB embedded GLB for static hosts with a 25 MiB file limit.
// All mesh, material and image bytes are preserved; only packaging changes.
const folder = 'dist/assets/furniture/modern_diningtable_set_4chairs_woodtable_vase';
const source = await readFile(`${folder}/dining_table_set.glb`);
if (source.readUInt32LE(0) !== 0x46546c67 || source.readUInt32LE(4) !== 2) throw new Error('Invalid GLB');
const jsonLength = source.readUInt32LE(12);
const model = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
const binStart = 20 + jsonLength + 8;
const binary = source.subarray(binStart);
if (model.buffers.length !== 1 || model.buffers[0].byteLength > binary.length) throw new Error('Unsupported GLB layout');
await mkdir(`${folder}/dining_table_parts`, { recursive: true });
const buffers = [];
for (const [i, view] of model.bufferViews.entries()) {
  if (view.buffer !== 0) throw new Error('Unsupported external buffer');
  const bytes = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  if (bytes.length !== view.byteLength) throw new Error('Invalid buffer view');
  const uri = `dining_table_parts/part-${i}.bin`;
  await writeFile(`${folder}/${uri}`, bytes);
  buffers.push({ uri, byteLength: bytes.length });
  view.buffer = i;
  view.byteOffset = 0;
}
model.buffers = buffers;
await writeFile(`${folder}/dining_table_set.gltf`, JSON.stringify(model));
await rm(`${folder}/dining_table_set.glb`);

async function checkFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) await checkFiles(filename);
    else if ((await stat(filename)).size > 25 * 1024 * 1024) throw new Error(`Static asset exceeds 25 MiB: ${filename}`);
  }
}
await checkFiles('dist');
console.log(`Static assets ready; large GLB split losslessly into ${buffers.length} buffers.`);
