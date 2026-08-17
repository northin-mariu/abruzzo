/* painted-bg.js - hand-painted background layer. Inlined verbatim from the project.
   <painted-bg ground="aperol" layout="edges" count="11" seed="5507"></painted-bg> */
(function () {
  const C = {
    aperol: '#EE4E1E', spritz: '#F2792B', apricot: '#F9B98A', blood: '#D6321E',
    cream: '#FAF3E5', paper: '#F6EFE3', shade: '#EADFCD', white: '#FFFFFF',
    cobalt: '#1E4FD8', magenta: '#E5308C', pink: '#F0559B', lime: '#B9D63B',
    grass: '#4CB847', orange: '#F5821F', teal: '#1BA6A0', violet: '#7D4BC3',
    lemon: '#F5D93B', stucco: '#E9A18B', pool: '#2A7FB0', fig: '#8D3B5E',
    terracotta: '#C0552F', marigold: '#F2C14E', vermilion: '#E8442B'
  };
  const PAL = {
    aperol: ['aperol', 'spritz', 'apricot', 'lemon'],
    citrus: ['aperol', 'spritz', 'lemon', 'teal'],
    'cream-on-orange': ['cream', 'lemon', 'apricot'],
    'two-colour': ['aperol', 'cream'],
    zing: ['magenta', 'lime', 'orange', 'teal', 'lemon']
  };
  const DEFAULT_PAL = {
    aperol: 'cream-on-orange', spritz: 'cream-on-orange', blood: 'cream-on-orange',
    cobalt: 'cream-on-orange', magenta: 'cream-on-orange',
    apricot: 'two-colour', cream: 'aperol', paper: 'aperol', shade: 'aperol', white: 'citrus'
  };
  const DEFAULT_COUNT = { scatter: 9, edges: 11, band: 7, corner: 7, diagonal: 8, giant: 3, confetti: 22 };
  const DEFAULT_SCALE = { scatter: [2.4, 4.2], edges: [2.2, 3.6], band: [2.4, 3.6], corner: [2.6, 4.4], diagonal: [2.4, 3.8], giant: [7.5, 11], confetti: [0.9, 1.7] };

  const rng = (seed) => function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const r1 = (x) => Math.round(x * 10) / 10;

  function blobPath(rand, n, jit, squash) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + (rand() - 0.5) * 0.16;
      const rr = 48 * (1 - jit * rand());
      pts.push([50 + Math.cos(a) * rr, 50 + Math.sin(a) * rr * squash]);
    }
    let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
    }
    return d + 'Z';
  }
  function halfPath(rand) {
    const n = 7, pts = [];
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + i / n * Math.PI, rr = 47 * (1 - 0.14 * rand());
      pts.push([50 + Math.cos(a) * rr, 70 + Math.sin(a) * rr * 1.05]);
    }
    let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i], pv = pts[i - 1];
      d += `Q${r1((pv[0] + p[0]) / 2 + (rand() - 0.5) * 8)} ${r1((pv[1] + p[1]) / 2 + (rand() - 0.5) * 8)} ${r1(p[0])} ${r1(p[1])}`;
    }
    return d + `Q${r1(50 + (rand() - 0.5) * 12)} ${r1(74 + rand() * 6)} ${r1(pts[0][0])} ${r1(pts[0][1])}Z`;
  }
  function strokePath(rand) {
    const n = 6, left = [], right = [];
    for (let i = 0; i <= n; i++) {
      const y = 6 + i / n * 88, cx = 50 + Math.sin(i / n * 2.2) * 5 + (rand() - 0.5) * 4;
      const w = (20 + Math.sin(i / n * Math.PI) * 10) * (0.85 + rand() * 0.3);
      left.push([cx - w, y]); right.push([cx + w, y]);
    }
    let d = `M${r1(left[0][0])} ${r1(left[0][1])}`;
    for (let i = 1; i <= n; i++) d += `Q${r1(left[i - 1][0] + (rand() - 0.5) * 6)} ${r1((left[i - 1][1] + left[i][1]) / 2)} ${r1(left[i][0])} ${r1(left[i][1])}`;
    d += `Q${r1((left[n][0] + right[n][0]) / 2)} ${r1(left[n][1] + 4 + rand() * 6)} ${r1(right[n][0])} ${r1(right[n][1])}`;
    for (let i = n - 1; i >= 0; i--) d += `Q${r1(right[i + 1][0] + (rand() - 0.5) * 6)} ${r1((right[i + 1][1] + right[i][1]) / 2)} ${r1(right[i][0])} ${r1(right[i][1])}`;
    return d + 'Z';
  }
  const shape = { blob: (rand) => blobPath(rand, 9 + Math.floor(rand() * 2), 0.2, 0.85 + rand() * 0.25), half: halfPath, stroke: strokePath };

  function positions(mode, rand, count, rows) {
    if (rows > 1) {
      const out = [];
      for (let r = 0; r < rows; r++) for (const p of positionsOne(mode, rand, count)) out.push([p[0], p[1] + r * 1080]);
      return out;
    }
    return positionsOne(mode, rand, count);
  }
  function positionsOne(mode, rand, count) {
    const pts = [], jit = (m) => (rand() - 0.5) * m;
    if (mode === 'edges') {
      const ring = [[-60, -60], [420, -90], [900, -70], [1400, -80], [1780, -40], [1820, 340], [1780, 760], [1380, 880], [900, 900], [420, 880], [-70, 820], [-90, 380]];
      for (let k = 0; k < count; k++) { const p = ring[k % ring.length]; pts.push([p[0] + jit(120), p[1] + jit(110)]); }
    } else if (mode === 'corner') {
      for (let k = 0; k < count; k++) pts.push([-140 + rand() * 760, -140 + rand() * 700]);
    } else if (mode === 'band') {
      for (let k = 0; k < count; k++) pts.push([-120 + k * (2100 / count) + jit(90), -120 + jit(180)]);
    } else if (mode === 'diagonal') {
      for (let k = 0; k < count; k++) { const t = count > 1 ? k / (count - 1) : 0.5; pts.push([-140 + t * 1900 + jit(140), -160 + t * 1160 + jit(140)]); }
    } else if (mode === 'giant') {
      const spots = [[-320, -380], [980, 180], [420, 620], [1420, -260], [160, 760]];
      for (let k = 0; k < count; k++) { const p = spots[k % spots.length]; pts.push([p[0] + jit(140), p[1] + jit(140)]); }
    } else if (mode === 'confetti') {
      for (let k = 0; k < count; k++) pts.push([-60 + rand() * 1980, -60 + rand() * 1120]);
    } else {
      const gx = 4, gy = 3, cells = [...Array(gx * gy).keys()];
      for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
      for (let k = 0; k < count; k++) { const c = cells[k % cells.length]; pts.push([c % gx * 480 + rand() * 180 - 70, Math.floor(c / gx) * 360 + rand() * 160 - 80]); }
    }
    return pts;
  }

  class PaintedBg extends HTMLElement {
    static get observedAttributes() { return ['ground', 'palette', 'layout', 'count', 'seed', 'scale', 'rows']; }
    constructor() { super(); this.attachShadow({ mode: 'open' }); }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      const ground = this.getAttribute('ground') || 'aperol';
      const layout = this.getAttribute('layout') || 'scatter';
      const palName = this.getAttribute('palette') || DEFAULT_PAL[ground] || 'aperol';
      const cols = (PAL[palName] || PAL.aperol).map((n) => C[n] || n);
      const count = parseInt(this.getAttribute('count') || DEFAULT_COUNT[layout] || 9, 10);
      const seed = parseInt(this.getAttribute('seed') || 3301, 10);
      const sr = (this.getAttribute('scale') || (DEFAULT_SCALE[layout] || [2.4, 4.2]).join(',')).split(',').map(Number);
      const rows = Math.max(1, parseInt(this.getAttribute('rows') || 1, 10));
      const rand = rng(seed), pos = positions(layout, rand, count, rows), kinds = ['blob', 'blob', 'blob', 'half', 'stroke'];
      const total = pos.length;
      let marks = '';
      for (let k = 0; k < total; k++) {
        const sc = sr[0] + rand() * (sr[1] - sr[0]);
        const x = Math.round(pos[k][0]), y = Math.round(pos[k][1]);
        const rot = Math.round((rand() - 0.5) * 70);
        const kind = kinds[Math.floor(rand() * kinds.length)];
        const col = cols[Math.floor(rand() * cols.length)];
        marks += `<path d="${shape[kind](rand)}" fill="${col}" transform="translate(${x},${y}) scale(${sc.toFixed(2)}) rotate(${rot} 50 50)"/>`;
        if (rand() < 0.42) {
          const c2 = cols[Math.floor(rand() * cols.length)];
          if (c2 !== col) marks += `<path d="${blobPath(rand, 9, 0.22, 0.9)}" fill="${c2}" transform="translate(${Math.round(x + sc * (26 + rand() * 46))},${Math.round(y + sc * (28 + rand() * 46))}) scale(${(sc * 0.44).toFixed(2)}) rotate(${Math.round((rand() - 0.5) * 60)} 50 50)"/>`;
        }
        if (rand() < 0.5) marks += `<path d="${blobPath(rand, 8, 0.3, 1)}" fill="${cols[Math.floor(rand() * cols.length)]}" transform="translate(${Math.round(x + sc * (rand() * 130 - 20))},${Math.round(y + sc * (rand() * 130 - 10))}) scale(${(sc * 0.13).toFixed(2)})"/>`;
      }
      this.style.display = 'block';
      this.style.background = C[ground] || ground;
      this.style.overflow = 'hidden';
      this.shadowRoot.innerHTML = `<style>:host{display:block;overflow:hidden}svg{display:block;width:100%;height:100%}</style><svg viewBox="0 0 1920 ${1080 * rows}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style="display:block" aria-hidden="true">${marks}</svg>`;
    }
  }
  if (!customElements.get('painted-bg')) customElements.define('painted-bg', PaintedBg);
})();
