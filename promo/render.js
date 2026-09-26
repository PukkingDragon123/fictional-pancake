// Renders the itch.io cover (630x500) and banner (960x320) as looping GIFs.
//   node promo/render.js            (needs Playwright; writes promo/*.gif and *.png)
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.join(root, 'index.html'));
  await p.waitForTimeout(1200);
  await p.addScriptTag({ path: path.join(__dirname, 'gifenc.js') });
  await p.addScriptTag({ path: path.join(__dirname, 'scenes.js') });
  for (const [name, w, h, n, delay] of [['cover', 315, 250, 48, 6], ['banner', 480, 160, 48, 6]]) {
    const res = await p.evaluate(([name, w, h, n, delay]) => {
      const { out, still } = Promo.frames(Promo[name], w, h, n);
      const gif = GifEnc.encode(out, w * 2, h * 2, delay);
      let s = ''; for (let i = 0; i < gif.length; i += 0x8000) s += String.fromCharCode.apply(null, gif.subarray(i, i + 0x8000));
      return { gif: btoa(s), still };
    }, [name, w, h, n, delay]);
    fs.writeFileSync(path.join(__dirname, name + '.gif'), Buffer.from(res.gif, 'base64'));
    fs.writeFileSync(path.join(__dirname, name + '.png'), Buffer.from(res.still.split(',')[1], 'base64'));
    console.log(name, (fs.statSync(path.join(__dirname, name + '.gif')).size / 1024).toFixed(0) + ' KB');
  }
  if (errs.length) console.log('page errors:', errs);
  await b.close();
})();
