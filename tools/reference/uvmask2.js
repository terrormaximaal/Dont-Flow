// classes of the diffuse texture, one digit per texel: 0 body, 1 dark (glass,
// grille, tyre), 2 bright (lamp lens, chrome), 3 red (tail lamp). Width and
// height are the texture's own.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage();
  const png = fs.readFileSync(process.argv[2]).toString('base64');
  const r = await p.evaluate(async (png) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
    const W = img.width, H = img.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H).data; const out = new Array(W * H);
    let n = [0, 0, 0, 0];
    for (let i = 0; i < W * H; i++) {
      const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2], s = R + G + B;
      let k = 0;
      if (R > 80 && R > G * 1.35 && R > B * 1.35) k = 3;
      else if (s < 190) k = 1;
      else if (s > 600) k = 2;
      out[i] = k; n[k]++;
    }
    return { W, H, s: out.join(''), n };
  }, png);
  fs.writeFileSync(process.argv[3], r.W + ' ' + r.H + '\n' + r.s);
  console.log('masker', r.W + 'x' + r.H, 'body/donker/licht/rood =', r.n.join('/'));
  await b.close();
})();
