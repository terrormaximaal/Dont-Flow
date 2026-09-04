/* Converts a binary FBX to the OBJ the reference pipeline reads: one group per
   mesh (its name, so the parts keep their identity), positions, normals and
   UVs, and triangles as v/vt/vn. three.js can read the FBX; nothing else here
   can, and the pipeline downstream only speaks OBJ. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const src = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  p.on('console', m => { const t = m.text(); if (!/texture|Texture/.test(t)) console.log('LOG', t); });
  /* A file:// page cannot XHR its own directory (CORS), so the loader is given
     an http origin and the request is fulfilled from disk. */
  await p.route('https://ref.local/**', (r) => {
    const u = new URL(r.request().url()).pathname.slice(1);
    const f = path.join(path.dirname(src), decodeURIComponent(u));
    if (fs.existsSync(f)) r.fulfill({ status: 200, body: fs.readFileSync(f) });
    else r.fulfill({ status: 404, body: '' });
  });
  await p.route('https://ref.local/index.html', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset=utf8><body>' }));
  await p.goto('https://ref.local/index.html');
  for (const f of ['three.min.js', 'fbx/examples/js/libs/fflate.min.js',
                   'fbx/examples/js/curves/NURBSUtils.js', 'fbx/examples/js/curves/NURBSCurve.js',
                   'fbx/examples/js/loaders/FBXLoader.js']) {
    await p.addScriptTag({ path: __dirname + '/' + f });
  }
  const obj = await p.evaluate(async (name) => {
    const loader = new THREE.FBXLoader();
    const group = await new Promise((res, rej) => loader.load(name, res, undefined, rej));
    const lines = [], parts = [];
    let vo = 1, to = 1, no = 1;
    const P = new THREE.Vector3(), N = new THREE.Vector3(), mat3 = new THREE.Matrix3();
    group.updateMatrixWorld(true);
    group.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry;
      const pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
      if (!pos) return;
      const idx = g.index ? g.index.array : null;
      const n = pos.count;
      mat3.getNormalMatrix(o.matrixWorld);
      lines.push('g ' + (o.name || 'mesh' + parts.length).replace(/\s+/g, '_'));
      for (let i = 0; i < n; i++) {
        P.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        lines.push('v ' + P.x.toFixed(5) + ' ' + P.y.toFixed(5) + ' ' + P.z.toFixed(5));
      }
      for (let i = 0; i < n; i++) {
        if (nrm) { N.fromBufferAttribute(nrm, i).applyMatrix3(mat3).normalize(); } else N.set(0, 1, 0);
        lines.push('vn ' + N.x.toFixed(5) + ' ' + N.y.toFixed(5) + ' ' + N.z.toFixed(5));
      }
      for (let i = 0; i < n; i++) {
        lines.push('vt ' + (uv ? uv.getX(i).toFixed(6) + ' ' + uv.getY(i).toFixed(6) : '0 0'));
      }
      const tri = (a, c, e) => lines.push('f ' + (vo+a) + '/' + (to+a) + '/' + (no+a) + ' ' +
        (vo+c) + '/' + (to+c) + '/' + (no+c) + ' ' + (vo+e) + '/' + (to+e) + '/' + (no+e));
      if (idx) for (let i = 0; i < idx.length; i += 3) tri(idx[i], idx[i+1], idx[i+2]);
      else for (let i = 0; i < n; i += 3) tri(i, i + 1, i + 2);
      parts.push([o.name || 'mesh' + parts.length, n, (idx ? idx.length : n) / 3]);
      vo += n; to += n; no += n;
    });
    return { obj: lines.join('\n') + '\n', parts };
  }, path.basename(src));
  fs.writeFileSync(out, obj.obj);
  console.log('groepen:');
  for (const [n, v, t] of obj.parts) console.log('  %s  %d verts  %d tris', n.padEnd(28), v, t);
  console.log('geschreven:', out, (obj.obj.length / 1048576).toFixed(1), 'MB');
  await b.close();
})();
