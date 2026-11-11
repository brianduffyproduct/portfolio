/* ---------- app ---------- */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const CITIES = [
  ['Los Angeles', 34.05, -118.24, 'America/Los_Angeles'], ['San Francisco', 37.77, -122.42, 'America/Los_Angeles'], ['Seattle', 47.61, -122.33, 'America/Los_Angeles'],
  ['Denver', 39.74, -104.99, 'America/Denver'], ['Chicago', 41.88, -87.63, 'America/Chicago'], ['Houston', 29.76, -95.37, 'America/Chicago'],
  ['New York', 40.71, -74.01, 'America/New_York'], ['Boston', 42.36, -71.06, 'America/New_York'], ['Miami', 25.76, -80.19, 'America/New_York'],
  ['Honolulu', 21.31, -157.86, 'Pacific/Honolulu'], ['Anchorage', 61.22, -149.9, 'America/Anchorage'], ['Toronto', 43.65, -79.38, 'America/Toronto'],
  ['Vancouver', 49.28, -123.12, 'America/Vancouver'], ['Mexico City', 19.43, -99.13, 'America/Mexico_City'], ['Bogotá', 4.71, -74.07, 'America/Bogota'],
  ['Quito (equator)', -0.18, -78.47, 'America/Guayaquil'], ['Lima', -12.05, -77.04, 'America/Lima'], ['São Paulo', -23.55, -46.63, 'America/Sao_Paulo'],
  ['Buenos Aires', -34.6, -58.38, 'America/Argentina/Buenos_Aires'], ['Reykjavík', 64.15, -21.94, 'Atlantic/Reykjavik'], ['London', 51.51, -0.13, 'Europe/London'],
  ['Dublin', 53.35, -6.26, 'Europe/Dublin'], ['Paris', 48.86, 2.35, 'Europe/Paris'], ['Madrid', 40.42, -3.7, 'Europe/Madrid'], ['Rome', 41.9, 12.5, 'Europe/Rome'],
  ['Berlin', 52.52, 13.4, 'Europe/Berlin'], ['Stockholm', 59.33, 18.07, 'Europe/Stockholm'], ['Tromsø (Arctic)', 69.65, 18.96, 'Europe/Oslo'],
  ['Athens', 37.98, 23.73, 'Europe/Athens'], ['Istanbul', 41.01, 28.98, 'Europe/Istanbul'], ['Moscow', 55.76, 37.62, 'Europe/Moscow'], ['Cairo', 30.04, 31.24, 'Africa/Cairo'],
  ['Lagos', 6.52, 3.38, 'Africa/Lagos'], ['Nairobi', -1.29, 36.82, 'Africa/Nairobi'], ['Johannesburg', -26.2, 28.05, 'Africa/Johannesburg'], ['Dubai', 25.2, 55.27, 'Asia/Dubai'],
  ['Tehran', 35.69, 51.39, 'Asia/Tehran'], ['Mumbai', 19.08, 72.88, 'Asia/Kolkata'], ['Delhi', 28.61, 77.21, 'Asia/Kolkata'], ['Bangkok', 13.76, 100.5, 'Asia/Bangkok'],
  ['Singapore', 1.35, 103.82, 'Asia/Singapore'], ['Hong Kong', 22.32, 114.17, 'Asia/Hong_Kong'], ['Beijing', 39.9, 116.41, 'Asia/Shanghai'], ['Seoul', 37.57, 126.98, 'Asia/Seoul'],
  ['Tokyo', 35.68, 139.69, 'Asia/Tokyo'], ['Manila', 14.6, 120.98, 'Asia/Manila'], ['Sydney', -33.87, 151.21, 'Australia/Sydney'], ['Auckland', -36.85, 174.76, 'Pacific/Auckland'],
];
const COL = { sky: '#070b1c', ground: '#14241e', gold: '#e3b95a', teal: '#63d1b0', violet: '#a99bff', rose: '#ea8fb0', blue: '#7fa9ff', con: '#8fa0d8', text: '#ece8da', muted: '#a0a5c6' };
const GLF = '"Noto Sans Symbols","Noto Sans Symbols 2","Segoe UI Symbol","Apple Symbols","DejaVu Sans",sans-serif';
const UIF = '"Albert Sans",' + GLF;
const TV = '︎';
const ELEMENT = ['#e0795a', '#8fb873', '#e6d37a', '#6fa8e8'];
const HOUSE_SKY = [
  'just below the eastern horizon, about to rise', 'below the eastern horizon, climbing toward it', 'under the ground, just past the lowest point',
  'under the ground, sinking toward the lowest point', 'below the western horizon, heading deeper', 'just below the western horizon, newly set',
  'low in the west, about to set', 'coming down the western sky', 'high up, just past its peak',
  'high up, just short of its peak', 'climbing the eastern sky', 'low in the east, newly risen'];

const state = {
  utcMs: Date.now(), lat: 34.05, lon: -118.24, tz: 'America/Los_Angeles', houses: 'placidus',
  ly: { ecl: true, signs: true, cons: true, horizon: true, meridian: true, equator: false, planets: true, arcs: false, trails: false, xray: false, day: false },
  view: 'ground', hover: null, pin: null, playing: false, speed: 'hour', step: -1,
};
const cam = { az: 180, alt: 28, fov: 108, oaz: 200, oel: 22, zoom: 1, frame: 'horizon', tween: null, q: [1, 0, 0, 0] };
let sky = null, dirty = true, domDirty = true, lastDom = 0;

/* ---------- static geometry ---------- */
const f32 = a => new Float32Array(a);
function ring(fn, n = 180) { const a = new Float32Array((n + 1) * 3); for (let i = 0; i <= n; i++) a.set(fn(i / n * 360), i * 3); return a; }
const G = {
  horizon: [ring(a => [Math.sin(a * D2R), 0, -Math.cos(a * D2R)])],
  meridian: [ring(a => [0, Math.sin(a * D2R), Math.cos(a * D2R)])],
  equator: [ring(a => sph(a, 0))],
  ecliptic: [ring(a => sph(a, 0), 240)],
  belt: [ring(a => sph(a, 8)), ring(a => sph(a, -8))],
  dividers: Array.from({ length: 12 }, (_, i) => f32([-8, -4, 0, 4, 8].flatMap(b => sph(i * 30, b)))),
  ticks: [], whole: Array.from({ length: 12 }, (_, i) => { const p = []; for (let b = -90; b <= 90; b += 3) p.push(...sph(i * 30, b)); return f32(p); }),
  ground: [],
};
for (let d = 0; d < 360; d += 5) if (d % 30) { const h = d % 10 ? 0.7 : 1.5; G.ticks.push(f32([...sph(d, -h), ...sph(d, h)])); }
const azAlt = (az, alt) => [Math.sin(az * D2R) * Math.cos(alt * D2R), Math.sin(alt * D2R), -Math.cos(az * D2R) * Math.cos(alt * D2R)];
for (let a = 0; a < 360; a += 6) for (let h = 0; h > -90; h -= 10) G.ground.push([azAlt(a, h), azAlt(a + 6, h), azAlt(a + 6, h - 10), azAlt(a, h - 10)]);

const NS = STAR_DATA.length / 4, starV = new Float32Array(NS * 3), starM = new Float32Array(NS), starC = new Uint8Array(NS);
for (let i = 0; i < NS; i++) { starV.set(sph(STAR_DATA[i * 4] / 100, STAR_DATA[i * 4 + 1] / 100), i * 3); starM[i] = STAR_DATA[i * 4 + 2] / 10; starC[i] = STAR_DATA[i * 4 + 3]; }
const STAR_COL = ['#bcd0ff', '#ffffff', '#fff1cc', '#ffd2a3'];
const starNames = STAR_NAMES.concat([[37.95, 89.26, 'Polaris']]).map(n => ({ v: sph(n[0], n[1]), name: n[2] }));
const ZOD = ['Ari', 'Tau', 'Gem', 'Cnc', 'Leo', 'Vir', 'Lib', 'Sco', 'Oph', 'Sgr', 'Cap', 'Aqr', 'Psc'];
const OTHER = ['Ori', 'UMa', 'UMi', 'Cas', 'Cyg', 'Lyr', 'Aql', 'CMa', 'Cru', 'Cen', 'And', 'Peg', 'Boo', 'Aur', 'Per', 'Her', 'Car'];
const cons = Object.keys(CON_LINES).map(id => {
  const c = [0, 0, 0];
  const lines = CON_LINES[id].map(seg => { const p = []; for (let i = 0; i < seg.length; i += 2) { const v = sph(seg[i], seg[i + 1]); p.push(...v); c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; } return f32(p); });
  const n = Math.hypot(...c) || 1;
  return { id, lines, zodiac: ZOD.includes(id), label: ZOD.includes(id) || OTHER.includes(id), name: CON_INFO[id] ? CON_INFO[id][0] : id, c: [c[0] / n, c[1] / n, c[2] / n] };
});

/* Placidus boundaries are fixed in the local sky for a given latitude. */
let plac = { lat: null, curves: null, H: null, dmax: 0 };
function placHour(n, dsa) {
  const nsa = 180 - dsa;
  switch (n) {
    case 1: return -dsa; case 12: return -dsa * 2 / 3; case 11: return -dsa / 3; case 10: return 0; case 9: return dsa / 3; case 8: return dsa * 2 / 3; case 7: return dsa;
    case 6: return 180 - nsa * 2 / 3; case 5: return 180 - nsa / 3; case 4: return 180; case 3: return -(180 - nsa / 3); default: return -(180 - nsa * 2 / 3);
  }
}
function buildPlacidus(lat) {
  if (plac.lat === lat) return;
  plac = { lat, curves: null, dmax: 90 - Math.abs(lat) - 0.02 };
  if (plac.dmax < 1) return;
  const tp = Math.tan(lat * D2R), N = 96;
  plac.curves = Array.from({ length: 12 }, (_, k) => {
    const a = new Float32Array((N + 1) * 3);
    for (let i = 0; i <= N; i++) { const d = plac.dmax * Math.sin((i / N - 0.5) * Math.PI); const dsa = Math.acos(clamp(-tp * Math.tan(d * D2R), -1, 1)) * R2D; a.set(hourDecToWorld(placHour(k + 1, dsa), d, lat), i * 3); }
    return a;
  });
}
function housePolygon(n) {               // world-frame outline of house n, or null
  if (!sky.cusps) return null;
  const pts = [];
  if (sky.system === 'whole') {
    const l0 = sky.cusps[n - 1];
    for (let b = -88; b <= 88; b += 4) pts.push(mapply(sky.Mhe, sph(l0, b)));
    for (let b = 88; b >= -88; b -= 4) pts.push(mapply(sky.Mhe, sph(l0 + 30, b)));
    return pts;
  }
  if (!plac.curves) return null;
  const A = plac.curves[n - 1], B = plac.curves[n % 12], m = A.length / 3, tp = Math.tan(sky.lat * D2R);
  const cap = (d, from, to) => { const dsa = Math.acos(clamp(-tp * Math.tan(d * D2R), -1, 1)) * R2D, h0 = placHour(from, dsa), dh = norm180(placHour(to, dsa) - h0); for (let i = 1; i < 6; i++) pts.push(hourDecToWorld(h0 + dh * i / 6, d, sky.lat)); };
  const nx = n % 12 + 1;
  for (let i = 0; i < m; i++) pts.push([A[i * 3], A[i * 3 + 1], A[i * 3 + 2]]);
  cap(plac.dmax, n, nx);
  for (let i = m - 1; i >= 0; i--) pts.push([B[i * 3], B[i * 3 + 1], B[i * 3 + 2]]);
  cap(-plac.dmax, nx, n);
  return pts;
}

/* planet paths */
const trailCache = {};
function trailFor(b) {
  const stepMs = b.span * 2 * 864e5 / b.n, c = trailCache[b.id];
  if (c && Math.abs(c.ms - state.utcMs) < stepMs * 0.5) return c;
  const half = b.n / 2, past = new Float32Array((half + 1) * 3), fut = new Float32Array((half + 1) * 3);
  for (let i = 0; i <= half; i++) {
    let e = bodyEcl(b.id, Astronomy.MakeTime(new Date(state.utcMs - (half - i) * stepMs))); past.set(sph(e.lon, e.lat), i * 3);
    e = bodyEcl(b.id, Astronomy.MakeTime(new Date(state.utcMs + i * stepMs))); fut.set(sph(e.lon, e.lat), i * 3);
  }
  return (trailCache[b.id] = { ms: state.utcMs, past: [past], fut: [fut] });
}
const dailyArc = b => [ring(h => hourDecToWorld(h - 180, b.dec, sky.lat), 120)];

/* ---------- camera + projection ---------- */
const cv = $('sky'), ctx = cv.getContext('2d');
let W = 10, H = 10, DPR = 1;
let Rw = [1, 0, 0], Uw = [0, 1, 0], Bw = [0, 0, 1], SC = 1, CX = 0, CY = 0, GROUND = true, PASS = 0, BELOW_F = 0, LAST = true;
const DIST = 3.6, FAR_F = 0.5;
let px = 0, py = 0, pvis = false, pfar = false;
function proj(x, y, z) {
  const xc = x * Rw[0] + y * Rw[1] + z * Rw[2], yc = x * Uw[0] + y * Uw[1] + z * Uw[2], zc = x * Bw[0] + y * Bw[1] + z * Bw[2];
  if (GROUND) { if (zc < -0.88) { pvis = false; return; } const k = 2 / (1 + zc) * SC; px = CX + xc * k; py = CY - yc * k; pvis = true; pfar = false; }
  else { const k = SC / (DIST - zc); px = CX + xc * k; py = CY - yc * k; pvis = true; pfar = zc < 1 / DIST; }
}
function m2q(m) {
  const [a, b, c, d, e, f, g, h, i] = m, tr = a + e + i; let s;
  if (tr > 0) { s = Math.sqrt(tr + 1) * 2; return [s / 4, (h - f) / s, (c - g) / s, (d - b) / s]; }
  if (a > e && a > i) { s = Math.sqrt(1 + a - e - i) * 2; return [(h - f) / s, s / 4, (b + d) / s, (c + g) / s]; }
  if (e > i) { s = Math.sqrt(1 + e - a - i) * 2; return [(c - g) / s, (b + d) / s, s / 4, (f + h) / s]; }
  s = Math.sqrt(1 + i - a - e) * 2; return [(d - b) / s, (c + g) / s, (f + h) / s, s / 4];
}
function q2m([w, x, y, z]) { return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]; }
function slerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map(v => -v); d = -d; }
  let k0 = 1 - t, k1 = t;
  if (d < 0.9995) { const th = Math.acos(d), s = Math.sin(th); k0 = Math.sin((1 - t) * th) / s; k1 = Math.sin(t * th) / s; }
  const q = a.map((v, i) => v * k0 + b[i] * k1), n = Math.hypot(...q); return q.map(v => v / n);
}
function setupCamera(now) {
  CX = W / 2; CY = H / 2;
  if (state.view === 'ground') {
    GROUND = true;
    const a = cam.az * D2R, h = cam.alt * D2R, ca = Math.cos(a), sa = Math.sin(a), ch = Math.cos(h), sh = Math.sin(h);
    Bw = [sa * ch, sh, -ca * ch]; Rw = [ca, 0, sa]; Uw = [-sa * sh, ch, ca * sh];
    SC = (Math.min(W, H) / 2) / (2 * Math.tan(cam.fov * D2R / 4));
    return false;
  }
  GROUND = false;
  const A = cam.oaz * D2R, E = cam.oel * D2R, cA = Math.cos(A), sA = Math.sin(A), cE = Math.cos(E), sE = Math.sin(E);
  let r = [cA, 0, -sA], u = [-sA * sE, cE, -cA * sE], b = [sA * cE, sE, cA * cE];
  if (cam.frame === 'chart') {
    const a = mapply(sky.Mhe, sph(sky.asc, 0)), n = [sky.Mhe[2], sky.Mhe[5], sky.Mhe[8]], ez = cross(n, a);
    const F = v => [-a[0] * v[0] + n[0] * v[1] + ez[0] * v[2], -a[1] * v[0] + n[1] * v[1] + ez[1] * v[2], -a[2] * v[0] + n[2] * v[1] + ez[2] * v[2]];
    r = F(r); u = F(u); b = F(b);
  }
  let q = m2q([...r, ...u, ...b]), moving = false;
  if (cam.tween) {
    const k = clamp((now - cam.tween.t0) / cam.tween.dur, 0, 1), e = k * k * (3 - 2 * k);
    q = slerp(cam.tween.from, q, e);
    if (k >= 1) cam.tween = null; else moving = true;
    const m = q2m(q); r = m.slice(0, 3); u = m.slice(3, 6); b = m.slice(6, 9);
  }
  cam.q = q; Rw = r; Uw = u; Bw = b;
  SC = Math.min(W, H) * 0.43 * cam.zoom * Math.sqrt(DIST * DIST - 1);
  return moving;
}
/* screen -> world direction on the sphere (or null) */
function unproject(sx, sy) {
  const X = (sx - CX) / SC, Y = -(sy - CY) / SC;
  if (GROUND) {
    const r2 = X * X + Y * Y, zc = (4 - r2) / (4 + r2), k = (1 + zc) / 2, xc = X * k, yc = Y * k;
    return [xc * Rw[0] + yc * Uw[0] + zc * Bw[0], xc * Rw[1] + yc * Uw[1] + zc * Bw[1], xc * Rw[2] + yc * Uw[2] + zc * Bw[2]];
  }
  let d = [X * Rw[0] + Y * Uw[0] - Bw[0], X * Rw[1] + Y * Uw[1] - Bw[1], X * Rw[2] + Y * Uw[2] - Bw[2]]; const n = Math.hypot(...d); d = d.map(v => v / n);
  const c = Bw.map(v => v * DIST), cd = c[0] * d[0] + c[1] * d[1] + c[2] * d[2], disc = cd * cd - (DIST * DIST - 1);
  if (disc < 0) return null;
  const t = -cd - Math.sqrt(disc); return [c[0] + t * d[0], c[1] + t * d[1], c[2] + t * d[2]];
}

/* ---------- drawing primitives ---------- */
const passSkip = below => (PASS === 1 && !below) || (PASS === 2 && below) || (below && BELOW_F <= 0);
function strokeLines(lines, M, color, width, alpha, dash) {
  const P = [null, null, null, null];
  for (const a of lines) {
    let have = false, lx = 0, ly = 0, lwy = 0, lfar = false, lb = -1;
    for (let i = 0; i < a.length; i += 3) {
      let x = a[i], y = a[i + 1], z = a[i + 2];
      if (M) { const X = M[0] * x + M[1] * y + M[2] * z, Y = M[3] * x + M[4] * y + M[5] * z; z = M[6] * x + M[7] * y + M[8] * z; x = X; y = Y; }
      proj(x, y, z);
      if (!pvis) { have = false; lb = -1; continue; }
      if (have) {
        const below = (y + lwy) < -1e-6, b = (below ? 1 : 0) | (pfar && lfar ? 2 : 0);
        if (passSkip(below) || (GROUND && Math.abs(px - lx) + Math.abs(py - ly) > 2500)) lb = -1;
        else { const p = P[b] || (P[b] = new Path2D()); if (lb !== b) p.moveTo(lx, ly); p.lineTo(px, py); lb = b; }
      }
      have = true; lx = px; ly = py; lwy = y; lfar = pfar;
    }
  }
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []); ctx.lineJoin = 'round';
  for (let b = 0; b < 4; b++) if (P[b]) { ctx.globalAlpha = alpha * (b & 1 ? BELOW_F : 1) * (b & 2 ? FAR_F : 1); ctx.stroke(P[b]); }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}
/* returns alpha factor for a world point in this pass, 0 when it should not be drawn; leaves px/py set */
function place(w) {
  proj(w[0], w[1], w[2]); if (!pvis) return 0;
  const below = w[1] < -1e-6; if (passSkip(below)) return 0;
  if (px < -80 || py < -40 || px > W + 80 || py > H + 40) return 0;
  return (below ? Math.max(BELOW_F, 0.5) : 1) * (pfar ? 0.5 : 1);
}
function label(text, w, o = {}) {
  const a = place(w); if (!a) return;
  ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 500} ${o.size || 12}px ${UIF}`;
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  const x = px + (o.dx || 0), y = py + (o.dy || 0);
  ctx.globalAlpha = a * (o.alpha || 1) * 0.8; ctx.lineWidth = 3.5; ctx.strokeStyle = COL.sky; ctx.lineJoin = 'round'; ctx.strokeText(text, x, y);
  ctx.globalAlpha = a * (o.alpha || 1); ctx.fillStyle = o.color || COL.text; ctx.fillText(text, x, y); ctx.globalAlpha = 1;
}
function fillPoly(pts, color, alpha) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) { proj(pts[i][0], pts[i][1], pts[i][2]); if (!pvis || Math.abs(px) > 6000 || Math.abs(py) > 6000) return; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
  ctx.closePath(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fill(); ctx.globalAlpha = 1;
}

/* ---------- the scene ---------- */
let hits = [];
const active = () => state.hover || state.pin;
function scene() {
  const L = state.ly, s = sky, act = active(), dayDim = GROUND && L.day ? 1 - 0.93 * dayness() : 1;

  // stars
  const M = s.Mhj;
  for (let i = 0; i < NS; i++) {
    const x0 = starV[i * 3], y0 = starV[i * 3 + 1], z0 = starV[i * 3 + 2];
    const y = M[3] * x0 + M[4] * y0 + M[5] * z0, below = y < 0; if (passSkip(below)) continue;
    proj(M[0] * x0 + M[1] * y0 + M[2] * z0, y, M[6] * x0 + M[7] * y0 + M[8] * z0);
    if (!pvis || px < -4 || py < -4 || px > W + 4 || py > H + 4) continue;
    const m = starM[i], r = Math.max(0.55, 2.7 - 0.44 * m) * (GROUND ? 1 : 0.8);
    ctx.globalAlpha = clamp(1.08 - m * 0.14, 0.2, 1) * (below ? BELOW_F : 1) * (pfar ? FAR_F : 1) * dayDim * (GROUND ? 1 : 0.75);
    ctx.fillStyle = STAR_COL[starC[i]];
    if (r < 1) ctx.fillRect(px - r, py - r, r * 2, r * 2); else { ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill(); }
  }
  ctx.globalAlpha = 1;

  if (L.cons) {
    for (const c of cons) strokeLines(c.lines, M, COL.con, c.zodiac ? 1.15 : 0.7, (c.zodiac ? 0.8 : GROUND ? 0.3 : 0.16) * dayDim);
    for (const c of cons) if (c.zodiac || (c.label && GROUND)) label(c.name, mapply(M, c.c), { italic: true, size: c.zodiac ? 12.5 : 11, color: COL.con, alpha: (c.zodiac ? 1 : 0.6) * dayDim });
    if (GROUND) for (const n of starNames) label(n.name, mapply(M, n.v), { size: 10, color: COL.muted, alpha: 0.75 * dayDim, dx: 6, dy: -7, align: 'left' });
  }
  if (L.equator) {
    strokeLines(G.equator, s.Mhq, COL.blue, 1.1, 0.7, [5, 4]);
    const p = [s.Mhq[2], s.Mhq[5], s.Mhq[8]];
    strokeLines([f32([p[0] * 0.94, p[1] * 0.94, p[2] * 0.94, ...p]), f32([-p[0] * 0.94, -p[1] * 0.94, -p[2] * 0.94, -p[0], -p[1], -p[2]])], null, COL.blue, 2, 0.9);
    label('North celestial pole', p, { size: 11, color: COL.blue, dy: -11 });
    label('South celestial pole', p.map(v => -v), { size: 11, color: COL.blue, dy: 11 });
    label('Celestial equator', mapply(s.Mhq, sph(s.lst + 62, 0)), { size: 11, color: COL.blue, dy: -9 });
  }
  if (L.meridian) {
    strokeLines(G.meridian, null, COL.violet, 1.2, 0.75);
    label('Zenith', [0, 1, 0], { size: 11, color: COL.violet, dy: -10 });
    label('Meridian', azAlt(s.lat >= 0 ? 180 : 0, 62), { size: 11, color: COL.violet, dx: 8, align: 'left' });
  }
  if (L.horizon) {
    strokeLines(G.horizon, null, COL.teal, 1.8, 0.95);
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([t, a]) => label(t, azAlt(a, 0), { size: 14, weight: 700, color: COL.teal, dy: GROUND ? 13 : 0, dx: 0 }));
    if (GROUND) [['NE', 45], ['SE', 135], ['SW', 225], ['NW', 315]].forEach(([t, a]) => label(t, azAlt(a, 0), { size: 11, color: COL.teal, dy: 12, alpha: 0.8 }));
  }

  // houses
  if (s.cusps) {
    const hn = act && act.type === 'house' ? act.n : 0;
    if (s.system === 'whole') strokeLines(G.whole, s.Mhe, COL.rose, 1, 0.5);
    else if (plac.curves) strokeLines(plac.curves, null, COL.rose, 1, 0.6);
    if (hn) {
      if (LAST) { const poly = housePolygon(hn); if (poly) fillPoly(poly, COL.rose, 0.17); }
      const e = s.system === 'whole' ? [G.whole[Math.round(s.cusps[hn - 1] / 30) % 12], G.whole[Math.round(s.cusps[hn % 12] / 30) % 12]] : plac.curves ? [plac.curves[hn - 1], plac.curves[hn % 12]] : [];
      strokeLines(e, s.system === 'whole' ? s.Mhe : null, COL.rose, 2.4, 1);
    }
    for (let i = 0; i < 12; i++) {
      const mid = s.cusps[i] + norm360(s.cusps[(i + 1) % 12] - s.cusps[i]) / 2;
      label(String(i + 1), mapply(s.Mhe, sph(mid, L.signs ? -12.5 : -6)), { size: hn === i + 1 ? 17 : 13, weight: 700, color: COL.rose });
    }
  }

  // ecliptic and signs
  if (L.ecl || L.signs) strokeLines(G.ecliptic, s.Mhe, COL.gold, 2, 0.95);
  if (L.signs) {
    strokeLines(G.belt, s.Mhe, COL.gold, 0.9, 0.35);
    strokeLines(G.dividers, s.Mhe, COL.gold, 1.3, 0.8);
    strokeLines(G.ticks, s.Mhe, COL.gold, 1, 0.5);
    const sn = act && act.type === 'sign' ? act.i : -1;
    if (sn >= 0 && LAST) { const p = []; for (let l = 0; l <= 30; l += 3) p.push(mapply(s.Mhe, sph(sn * 30 + l, 8))); for (let l = 30; l >= 0; l -= 3) p.push(mapply(s.Mhe, sph(sn * 30 + l, -8))); fillPoly(p, COL.gold, 0.22); }
    for (let i = 0; i < 12; i++) label(SIGN_GLYPHS[i] + ' ' + SIGNS[i].toUpperCase(), mapply(s.Mhe, sph(i * 30 + 15, 12.5)), { size: sn === i ? 13.5 : 11.5, weight: 600, color: COL.gold });
  } else if (L.ecl) label('Ecliptic', mapply(s.Mhe, sph(s.mc + 14, 0)), { size: 11, color: COL.gold, dy: -10 });

  // angles
  if (L.ecl || L.signs || s.cusps) {
    [['ASC', s.asc, COL.teal], ['DSC', s.asc + 180, COL.teal], ['MC', s.mc, COL.violet], ['IC', s.mc + 180, COL.violet]].forEach(([t, l, c]) => {
      const w = mapply(s.Mhe, sph(l, 0)), a = place(w); if (!a) return;
      ctx.globalAlpha = a; ctx.fillStyle = COL.text; ctx.strokeStyle = c; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px + 6, py); ctx.lineTo(px, py + 6); ctx.lineTo(px - 6, py); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
      label(t, w, { size: 12.5, weight: 700, color: COL.text, dy: t === 'IC' ? 17 : -16 });
    });
  }

  // planets and their paths
  if (L.planets) {
    const pid = act && act.type === 'planet' ? act.id : null;
    for (const b of s.bodies) {
      const on = pid === b.id;
      if (L.arcs || on) strokeLines(dailyArc(b), null, b.color, on ? 1.6 : 1, on ? 0.9 : 0.5, [2, 4]);
      if (L.trails || on) { const t = trailFor(b); strokeLines(t.past, s.Mhe, b.color, on ? 2.4 : 1.7, 0.95); strokeLines(t.fut, s.Mhe, b.color, on ? 2.4 : 1.7, 0.9, [5, 4]); }
      if (Math.abs(b.lat) > 0.4) strokeLines([f32([...b.ev, ...sph(b.lon, 0)])], s.Mhe, b.color, 1, 0.7);
    }
    const placed = [];
    for (const b of s.bodies) {
      const a = place(b.w); if (!a) continue;
      const on = pid === b.id, r = b.r * (GROUND ? 1 : 0.85);
      ctx.globalAlpha = a;
      if (b.id === 'Sun') { const g = ctx.createRadialGradient(px, py, r * 0.5, px, py, r * 3.2); g.addColorStop(0, 'rgba(255,207,77,.55)'); g.addColorStop(1, 'rgba(255,207,77,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r * 3.2, 0, 6.2832); ctx.fill(); }
      ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = COL.sky; ctx.lineWidth = 1; ctx.stroke();
      if (on) { ctx.strokeStyle = COL.text; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(px, py, r + 6, 0, 6.2832); ctx.stroke(); }
      ctx.globalAlpha = 1;
      hits.push({ id: b.id, x: px, y: py });
      let dy = -1; while (placed.some(p => Math.abs(p.x - px) < 80 && Math.abs(p.y - (py + dy)) < 13)) dy += 14; placed.push({ x: px, y: py + dy });
      label(b.glyph + TV + ' ' + b.id, b.w, { size: on ? 14 : 12.5, weight: on ? 700 : 600, color: b.color, dx: r + 6, dy, align: 'left' });
    }
  }
}

function dayness() { const a = sky.bodies[0].alt; return clamp((a + 10) / 14, 0, 1) ** 1.5; }
function mix(c1, c2, t) { const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), a = p(c1), b = p(c2); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`; }

function render(now) {
  const moving = setupCamera(now);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  hits = [];
  if (GROUND) {
    ctx.fillStyle = state.ly.day ? mix(COL.sky, '#3f74b8', dayness()) : COL.sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COL.ground; ctx.strokeStyle = COL.ground; ctx.lineWidth = 1.2;
    ctx.beginPath(); const q = [0, 0, 0, 0, 0, 0, 0, 0];
    quads: for (const quad of G.ground) {
      for (let i = 0; i < 4; i++) { proj(quad[i][0], quad[i][1], quad[i][2]); if (!pvis) continue quads; q[i * 2] = px; q[i * 2 + 1] = py; }
      ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.lineTo(q[4], q[5]); ctx.lineTo(q[6], q[7]); ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
    PASS = 0; BELOW_F = state.ly.xray ? 0.42 : 0; LAST = true; scene();
  } else {
    ctx.fillStyle = COL.sky; ctx.fillRect(0, 0, W, H);
    const rs = SC / Math.sqrt(DIST * DIST - 1), g = ctx.createRadialGradient(CX - rs * 0.25, CY - rs * 0.3, rs * 0.1, CX, CY, rs);
    g.addColorStop(0, 'rgba(70,90,190,.16)'); g.addColorStop(1, 'rgba(40,50,120,.07)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, rs, 0, 6.2832); ctx.fill(); ctx.strokeStyle = 'rgba(140,155,230,.25)'; ctx.lineWidth = 1; ctx.stroke();
    const camAbove = Bw[1] > 0; BELOW_F = 0.55;
    PASS = camAbove ? 1 : 2; LAST = false; scene();
    drawDiscAndGlobe(camAbove);
    PASS = camAbove ? 2 : 1; LAST = true; hits = []; scene();
  }
  drawWheel();
  return moving;
}
function drawDiscAndGlobe(camAbove) {
  const globe = () => {
    const gr = 0.085, P = [sky.Mhq[2], sky.Mhq[5], sky.Mhq[8]];
    proj(0, -gr, 0); const k = SC / (DIST - (-gr * Bw[1])), r = gr * k, x = px, y = py;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, '#5c8fd6'); g.addColorStop(1, '#1d3a78');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    const s = PASS; PASS = 0;
    const ax = t => [P[0] * t, P[1] * t - gr, P[2] * t];
    strokeLines([f32([...ax(-gr * 1.9), ...ax(gr * 1.9)])], null, COL.blue, 1.4, 0.9);
    strokeLines([ring(a => { const v = mapply(sky.Mhq, sph(a, 0)); return [v[0] * gr, v[1] * gr - gr, v[2] * gr]; }, 48)], null, '#bcd0ff', 0.8, 0.7);
    PASS = s;
  };
  const disc = () => {
    ctx.beginPath(); const a = G.horizon[0];
    for (let i = 0; i < a.length; i += 3) { proj(a[i], a[i + 1], a[i + 2]); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fillStyle = 'rgba(16,44,38,.62)'; ctx.fill();
    const s = PASS; PASS = 0;
    strokeLines([f32([0, 0, -1, 0, 0, 1]), f32([-1, 0, 0, 1, 0, 0])], null, COL.teal, 0.8, 0.3);
    PASS = s;
    proj(0, 0, 0); ctx.fillStyle = COL.text; ctx.beginPath(); ctx.arc(px, py, 3, 0, 6.2832); ctx.fill();
    ctx.font = `600 11px ${UIF}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('you', px + 7, py - 1);
  };
  if (camAbove) { globe(); disc(); } else { disc(); globe(); }
}

/* ---------- chart wheel ---------- */
const wc = $('wheel'), wctx = wc.getContext('2d');
let WS = 400, wheelHits = [], wheelGeo = null;
function drawWheel() {
  const c = wctx, s = sky, S = WS, cx = S / 2, cy = S / 2, act = active(), showCon = state.ly.cons;
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, S, S);
  const R = S / 2 - (showCon ? 50 : 30), rz0 = R * 0.83, rp = R * 0.68, rh1 = R * 0.42, rh0 = R * 0.27;
  const ang = l => Math.PI + (l - s.asc) * D2R, pt = (l, r) => [cx + r * Math.cos(ang(l)), cy - r * Math.sin(ang(l))];
  const wedge = (l0, l1, r0, r1) => { c.beginPath(); c.arc(cx, cy, r1, -ang(l0), -ang(l1), true); c.arc(cx, cy, r0, -ang(l1), -ang(l0), false); c.closePath(); };
  const line = (l, r0, r1) => { c.beginPath(); c.moveTo(...pt(l, r0)); c.lineTo(...pt(l, r1)); c.stroke(); };
  wheelGeo = { cx, cy, R, rz0, rh0 }; wheelHits = [];

  // sky above, ground below: the ASC-DSC line is the horizon
  c.fillStyle = '#101a47'; c.beginPath(); c.arc(cx, cy, rz0, Math.PI, 0); c.closePath(); c.fill();
  c.fillStyle = '#14241e'; c.beginPath(); c.arc(cx, cy, rz0, 0, Math.PI); c.closePath(); c.fill();
  c.font = `600 9.5px ${UIF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(160,165,198,.75)';
  c.fillText('ABOVE THE HORIZON', cx, cy - R * 0.5); c.fillText('BELOW THE HORIZON', cx, cy + R * 0.5);

  // real constellations along the ecliptic, drifted by precession
  if (showCon) {
    const pre = (s.t.tt / 36525) * 1.3969;
    c.font = `italic 500 9.5px ${UIF}`;
    CON_ECL.forEach(([name, l0], i) => {
      const a = l0 + pre, b = CON_ECL[(i + 1) % CON_ECL.length][1] + pre, w = norm360(b - a);
      wedge(a, a + w, R + 5, R + 12); c.fillStyle = COL.con; c.globalAlpha = i % 2 ? 0.75 : 0.35; c.fill(); c.globalAlpha = 1;
      if (w > 12) { const p = pt(a + w / 2, R + 23); c.fillStyle = COL.con; c.fillText(name.slice(0, 3), p[0], p[1]); }
    });
  }

  // zodiac ring
  for (let i = 0; i < 12; i++) {
    wedge(i * 30, i * 30 + 30, rz0, R); c.fillStyle = ELEMENT[i % 4]; c.globalAlpha = act && act.type === 'sign' && act.i === i ? 0.5 : 0.16; c.fill(); c.globalAlpha = 1;
    c.strokeStyle = 'rgba(227,185,90,.6)'; c.lineWidth = 1; line(i * 30, rz0, R);
    const p = pt(i * 30 + 15, (rz0 + R) / 2); c.font = `600 ${Math.round(R * 0.095)}px ${GLF}`; c.fillStyle = COL.gold; c.fillText(SIGN_GLYPHS[i], p[0], p[1] + 1);
  }
  c.strokeStyle = COL.gold; c.lineWidth = 1.4; c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.stroke(); c.beginPath(); c.arc(cx, cy, rz0, 0, 6.2832); c.stroke();
  c.strokeStyle = 'rgba(227,185,90,.55)'; c.lineWidth = 1;
  for (let d = 0; d < 360; d += 5) if (d % 30) line(d, rz0, rz0 - (d % 10 ? 3 : 6));

  // houses
  if (s.cusps) {
    const hn = act && act.type === 'house' ? act.n : 0;
    if (hn) { const a = s.cusps[hn - 1], w = norm360(s.cusps[hn % 12] - a); wedge(a, a + w, rh0, rz0); c.fillStyle = COL.rose; c.globalAlpha = 0.2; c.fill(); c.globalAlpha = 1; }
    c.strokeStyle = 'rgba(234,143,176,.7)'; c.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      line(s.cusps[i], rh0, rz0);
      const mid = s.cusps[i] + norm360(s.cusps[(i + 1) % 12] - s.cusps[i]) / 2, p = pt(mid, (rh0 + rh1) / 2);
      c.font = `${hn === i + 1 ? 700 : 600} ${hn === i + 1 ? 14 : 12}px ${UIF}`; c.fillStyle = COL.rose; c.fillText(String(i + 1), p[0], p[1]);
    }
    c.strokeStyle = 'rgba(234,143,176,.45)'; c.beginPath(); c.arc(cx, cy, rh1, 0, 6.2832); c.stroke(); c.beginPath(); c.arc(cx, cy, rh0, 0, 6.2832); c.stroke();
  }
  // the four angles
  const out = S / 2 - 14;
  [['ASC', s.asc, COL.teal], ['DSC', s.asc + 180, COL.teal], ['MC', s.mc, COL.violet], ['IC', s.mc + 180, COL.violet]].forEach(([t, l, col]) => {
    c.strokeStyle = col; c.lineWidth = 2.2; line(l, rh0, R + (showCon ? 14 : 4));
    const p = pt(l, out); c.font = `700 11px ${UIF}`; c.fillStyle = col; c.fillText(t, p[0], p[1]);
  });
  c.fillStyle = COL.text; c.beginPath(); c.arc(cx, cy, 3, 0, 6.2832); c.fill();

  // planets, nudged apart where they crowd
  if (state.ly.planets) {
    const ps = s.bodies.map(b => ({ b, d: b.lon })).sort((a, b) => a.d - b.d), sep = 8.5;
    for (let k = 0; k < 40; k++) for (let i = 0; i < ps.length; i++) {
      const a = ps[i], b = ps[(i + 1) % ps.length], gap = norm360(b.d - a.d);
      if (gap < sep && ps.length > 1) { const push = (sep - gap) / 2 + 0.01; a.d -= push; b.d += push; }
    }
    const pid = act && act.type === 'planet' ? act.id : null;
    for (const { b, d } of ps) {
      c.strokeStyle = b.color; c.lineWidth = 1.5; line(b.lon, rz0, rz0 - 7);
      const p0 = pt(b.lon, rz0 - 7), p1 = pt(d, rp + R * 0.065), p = pt(d, rp);
      c.globalAlpha = 0.6; c.lineWidth = 1; c.beginPath(); c.moveTo(...p0); c.lineTo(...p1); c.stroke(); c.globalAlpha = 1;
      if (pid === b.id) { c.fillStyle = 'rgba(236,232,218,.16)'; c.strokeStyle = COL.text; c.lineWidth = 1.4; c.beginPath(); c.arc(p[0], p[1], R * 0.07, 0, 6.2832); c.fill(); c.stroke(); }
      c.font = `600 ${Math.round(R * 0.105)}px ${GLF}`; c.fillStyle = b.color; c.fillText(b.glyph + TV, p[0], p[1] + 1);
      wheelHits.push({ id: b.id, x: p[0], y: p[1] });
    }
  }
}
function wheelPick(x, y) {
  const g = wheelGeo; if (!g) return null;
  for (const h of wheelHits) if (Math.hypot(h.x - x, h.y - y) < Math.max(13, g.R * 0.07)) return { type: 'planet', id: h.id };
  const r = Math.hypot(x - g.cx, y - g.cy), lon = norm360(sky.asc + (Math.atan2(g.cy - y, x - g.cx) - Math.PI) * R2D);
  if (r >= g.rz0 && r <= g.R + 2) return { type: 'sign', i: Math.floor(lon / 30) };
  if (r >= g.rh0 * 0.5 && r < g.rz0 && sky.cusps) return { type: 'house', n: sky.houseOfLon(lon) };
  return null;
}

/* ---------- DOM: clock, table, detail ---------- */
const sameSel = (a, b) => (!a && !b) || (a && b && a.type === b.type && a.id === b.id && a.n === b.n && a.i === b.i);
function setHover(h) { if (sameSel(h, state.hover)) return; state.hover = h; dirty = true; domDirty = true; }
function togglePin(h) { state.pin = h && !sameSel(h, state.pin) ? h : null; dirty = true; domDirty = true; }
const pad = n => String(n).padStart(2, '0');
const rows = $('rows');
BODIES.forEach(b => {
  const tr = document.createElement('tr'); tr.dataset.id = b.id; tr.tabIndex = 0;
  tr.innerHTML = `<td><span class="g" style="color:${b.color}">${b.glyph}${TV}</span>${b.id}</td><td></td><td></td><td></td>`;
  tr.addEventListener('mouseenter', () => setHover({ type: 'planet', id: b.id }));
  tr.addEventListener('mouseleave', () => setHover(null));
  tr.addEventListener('click', () => togglePin({ type: 'planet', id: b.id }));
  tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePin({ type: 'planet', id: b.id }); } });
  rows.appendChild(tr);
});
function skyWords(alt, az) { return alt >= 0 ? `<span class="up">${alt.toFixed(0)}° up, ${compass(az)}</span>` : `<span class="down">${(-alt).toFixed(0)}° below, ${compass(az)}</span>`; }
function describe(sel) {
  const s = sky;
  if (!sel) return '<em>Point at a planet, a sign or a house in either view to see where it sits in both. Click to keep it selected.</em>';
  if (sel.type === 'planet') {
    const b = s.bodies.find(x => x.id === sel.id), z = fmtZodiac(b.lon);
    const off = Math.abs(b.lat) < 0.05 ? 'on the ecliptic' : `${Math.abs(b.lat).toFixed(1)}° ${b.lat > 0 ? 'north' : 'south'} of the ecliptic`;
    return `<b>${b.id}</b> is at ${z.text}${b.house ? `, in house ${b.house}` : ''}. In the sky it is ${b.alt >= 0 ? `${b.alt.toFixed(0)}° above the horizon` : `${(-b.alt).toFixed(0)}° below the horizon`} toward the ${compass(b.az)}, ${off}. The dotted line is its path across the sky today. The solid and dashed line is its path through the zodiac.`;
  }
  if (sel.type === 'house') {
    const z = fmtZodiac(s.cusps[sel.n - 1]);
    const how = s.system === 'whole' ? `Whole Sign: it is the whole of ${SIGNS[z.sign]}, the ${sel.n === 1 ? 'rising sign' : `sign ${sel.n - 1} after the rising sign`}.` : `Placidus: it starts at ${z.text} and covers a third of the time a point takes to travel between the ${sel.n > 6 ? 'horizon and its highest point' : 'horizon and its lowest point'}.`;
    return `<b>House ${sel.n}</b> is the slice of sky that is ${HOUSE_SKY[sel.n - 1]}. ${how}`;
  }
  const i = sel.i, mid = mapply(s.Mhe, sph(i * 30 + 15, 0)), alt = Math.asin(mid[1]) * R2D;
  return `<b>${SIGNS[i]}</b> is the stretch of the ecliptic from ${i * 30}° to ${i * 30 + 30}°, counted from the March equinox point. Its middle is ${alt >= 0 ? `${alt.toFixed(0)}° above` : `${(-alt).toFixed(0)}° below`} the horizon right now${s.cusps ? `, in house ${s.houseOfLon(i * 30 + 15)}` : ''}.`;
}
const clockFmt = {};
function updateDom() {
  const s = sky, tz = state.tz;
  const f = clockFmt[tz] || (clockFmt[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }));
  $('clock').textContent = f.format(new Date(state.utcMs));
  const sun = s.bodies[0].alt;
  $('clock2').textContent = `${sun > 0 ? 'Daytime' : sun > -6 ? 'Twilight' : sun > -18 ? 'Dusk or dawn' : 'Night'} · Sun ${sun >= 0 ? sun.toFixed(0) + '° up' : (-sun).toFixed(0) + '° below the horizon'}`;
  const p = tzParts(tz, state.utcMs), ae = document.activeElement;
  if (ae !== $('date')) $('date').value = `${String(p.year).padStart(4, '0')}-${pad(p.month)}-${pad(p.day)}`;
  if (ae !== $('time')) $('time').value = `${pad(p.hour)}:${pad(p.minute)}`;
  if (ae !== $('daytime')) $('daytime').value = p.hour * 60 + p.minute;
  const act = active();
  [...rows.children].forEach((tr, i) => {
    const b = s.bodies[i];
    tr.children[1].textContent = fmtZodiac(b.lon).text; tr.children[2].textContent = b.house || '–'; tr.children[3].innerHTML = skyWords(b.alt, b.az);
    tr.classList.toggle('on', !!(act && act.type === 'planet' && act.id === b.id));
  });
  $('angles').innerHTML = `<span style="--c:var(--teal)"><b>Ascendant</b>${fmtZodiac(s.asc).text}</span><span style="--c:var(--violet)"><b>Midheaven</b>${fmtZodiac(s.mc).text}</span>` +
    (s.cusps ? `<span style="--c:var(--rose)"><b>Houses</b>${s.system === 'whole' ? 'Whole Sign' : 'Placidus'}</span>` : '');
  $('note').hidden = !s.note; $('note').textContent = s.note;
  $('detail').innerHTML = describe(act);
  domDirty = false; lastDom = performance.now();
}

/* ---------- time and place ---------- */
function recompute() {
  buildPlacidus(state.lat);
  sky = computeSky(state.utcMs, state.lat, state.lon, state.houses);
  if (state.pin && state.pin.type === 'house' && !sky.cusps) state.pin = null;
  dirty = true; domDirty = true;
}
const MIN_MS = Date.UTC(1700, 0, 2), MAX_MS = Date.UTC(2200, 11, 30);
function setTime(ms) { state.utcMs = clamp(ms, MIN_MS, MAX_MS); recompute(); }
function fromInputs() {
  const d = $('date').value.split('-').map(Number), t = $('time').value.split(':').map(Number);
  if (d.length < 3 || t.length < 2 || d.some(isNaN) || t.some(isNaN)) return;
  setTime(localToUtc(d[0], d[1], d[2], t[0], t[1], state.tz));
}
function localParts() { return tzParts(state.tz, state.utcMs); }

const citySel = $('city'), tzSel = $('tz');
CITIES.forEach((c, i) => citySel.add(new Option(c[0], i)));
citySel.add(new Option('Custom coordinates', 'custom'));
let zones = []; try { zones = Intl.supportedValuesOf('timeZone'); } catch (e) { zones = []; }
[...new Set(zones.concat(CITIES.map(c => c[3]), ['UTC']))].sort().forEach(z => tzSel.add(new Option(z.replace(/_/g, ' '), z)));
function setPlace(lat, lon, tz, keepClock) {
  const p = localParts();
  state.lat = clamp(lat, -89.9, 89.9); state.lon = clamp(lon, -180, 180);
  if (tz) state.tz = tz;
  $('lat').value = state.lat; $('lon').value = state.lon; tzSel.value = state.tz;
  if (keepClock) state.utcMs = localToUtc(p.year, p.month, p.day, p.hour, p.minute, state.tz);
  cam.az = state.lat >= 0 ? 180 : 0; if (state.view === 'outside') cam.oaz = state.lat >= 0 ? 200 : 20;
  recompute(); showStep();
}
citySel.addEventListener('change', () => { const c = CITIES[citySel.value]; if (c) setPlace(c[1], c[2], c[3], true); });
['lat', 'lon'].forEach(id => $(id).addEventListener('change', () => { const la = parseFloat($('lat').value), lo = parseFloat($('lon').value); if (isNaN(la) || isNaN(lo)) return; citySel.value = 'custom'; setPlace(la, lo, null, false); }));
tzSel.addEventListener('change', () => { const p = localParts(); state.tz = tzSel.value; setTime(localToUtc(p.year, p.month, p.day, p.hour, p.minute, state.tz)); });
$('date').addEventListener('change', fromInputs); $('time').addEventListener('change', fromInputs);
$('moment').addEventListener('submit', e => e.preventDefault());
$('now').addEventListener('click', () => setTime(Date.now()));
$('daytime').addEventListener('input', e => { const p = localParts(), m = +e.target.value; setTime(localToUtc(p.year, p.month, p.day, Math.floor(m / 60), m % 60, state.tz)); });
document.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
  const n = +b.dataset.step, p = localParts();
  if (Math.abs(n) === 30) { const d = new Date(Date.UTC(p.year, p.month - 1 + Math.sign(n), 1)), last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); setTime(localToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, Math.min(p.day, last), p.hour, p.minute, state.tz)); }
  else { const d = new Date(Date.UTC(p.year, p.month - 1, p.day + n)); setTime(localToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), p.hour, p.minute, state.tz)); }
}));
function setPlaying(on) { state.playing = on; $('play').textContent = on ? 'Pause' : 'Play'; $('play').setAttribute('aria-pressed', on); }
$('play').addEventListener('click', () => setPlaying(!state.playing));
$('speed').addEventListener('change', e => { state.speed = e.target.value; });

/* ---------- layers, houses, view ---------- */
Object.keys(state.ly).forEach(k => { const el = $('ly-' + k); el.checked = state.ly[k]; el.addEventListener('change', () => { state.ly[k] = el.checked; dirty = true; endTour(); }); });
document.querySelectorAll('input[name=houses]').forEach(r => r.addEventListener('change', () => { state.houses = r.value; recompute(); endTour(); }));
function syncControls() {
  Object.keys(state.ly).forEach(k => { $('ly-' + k).checked = state.ly[k]; });
  $('hs-' + state.houses).checked = true; $('view-' + state.view).checked = true;
}
function setView(v) {
  const prev = state.view; if (v === prev) return;
  const apply = () => {
    state.view = v;
    if (v === 'chart') { cam.frame = 'chart'; cam.oaz = 0; cam.oel = 90; cam.zoom = 1; }
    else if (v === 'outside') { cam.frame = 'horizon'; cam.oaz = state.lat >= 0 ? 200 : 20; cam.oel = 22; cam.zoom = 1; }
    dirty = true;
  };
  $('view-' + v).checked = true;
  if (reduceMotion) return apply();
  if (prev !== 'ground' && v !== 'ground') { cam.tween = { from: cam.q, t0: performance.now(), dur: 1200 }; return apply(); }
  cam.tween = null; cv.style.opacity = 0; setTimeout(() => { apply(); cv.style.opacity = 1; }, 170);
}
document.querySelectorAll('input[name=view]').forEach(r => r.addEventListener('change', () => { setView(r.value); endTour(); }));

/* ---------- walkthrough ---------- */
const base = { ecl: false, signs: false, cons: true, horizon: true, meridian: false, equator: false, planets: false, arcs: false, trails: false, xray: false, day: false };
const STEPS = [
  { t: 'Your horizon', view: 'ground', houses: 'off', ly: {}, text: () => 'You stand at the centre of a flat circle, the horizon, with the sky as a dome overhead. Only half of the sky is ever in view. The other half is under your feet. Turn on See through the ground to look at it.' },
  { t: 'The ecliptic', view: 'ground', houses: 'off', ly: { ecl: true, planets: true }, text: () => 'The gold line is the ecliptic, the path the Sun traces through the stars over a year. The Moon and planets never stray far from it. Astrology measures every position as a distance along this one line.' },
  { t: 'Twelve signs', view: 'ground', houses: 'off', ly: { ecl: true, planets: true, signs: true }, text: () => 'The tropical zodiac cuts the ecliptic into twelve equal 30° slices, counted from where the Sun sits at the March equinox. The star patterns with the same names have drifted about 24° out of their slices since the system was fixed. Compare each gold label with the constellation of the same name.' },
  { t: 'The sky turns', view: 'ground', houses: 'off', ly: { ecl: true, planets: true, signs: true, meridian: true }, text: () => 'Press Play. The whole belt rises in the east and sets in the west once a day. The Ascendant is the degree of the ecliptic crossing the eastern horizon at this moment. The Midheaven is the degree crossing the meridian, the line that runs overhead from north to south. The Ascendant moves about 1° every four minutes, which is why birth time matters so much.' },
  { t: 'Houses', view: 'outside', houses: 'keep', ly: { ecl: true, planets: true, signs: true, meridian: true }, text: () => 'Houses slice up the sky around you, using your horizon and meridian as the frame. Six sit above the ground and six below. They stay fixed to you while the signs and planets wheel through them, so every planet passes through all twelve houses each day, in reverse order. Switch between Placidus and Whole Sign to see how differently the two systems cut the same sky.' },
  { t: 'Flatten it into a chart', view: 'chart', houses: 'keep', ly: { ecl: true, planets: true, signs: true, meridian: true }, text: () => `Now you are looking straight down on the ecliptic ring with the Ascendant on the left. This is the chart wheel. The horizon becomes the line from ASC to DSC, and the top half is the sky you can see. ${state.lat >= 0 ? 'East is on the left because the wheel is drawn as if you were facing south.' : 'East stays on the left by convention, even though you face north to see the Sun at its highest here.'} Drag the view to tilt it back into three dimensions.` },
];
const stepsEl = $('steps'), stepBtns = [];
const freeBtn = document.createElement('button'); freeBtn.type = 'button'; freeBtn.textContent = 'Free explore'; freeBtn.addEventListener('click', () => { endTour(); }); stepsEl.appendChild(freeBtn);
STEPS.forEach((s, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = `${i + 1}. ${s.t}`; b.addEventListener('click', () => goStep(i)); stepsEl.appendChild(b); stepBtns.push(b); });
function showStep() {
  freeBtn.setAttribute('aria-pressed', state.step < 0);
  stepBtns.forEach((b, i) => b.setAttribute('aria-pressed', i === state.step));
  $('tourtext').textContent = state.step < 0 ? 'New to this? Take the six steps in order. Each one adds one idea to the sky, ending with the chart wheel. You can change anything at any point.' : STEPS[state.step].text();
}
function goStep(i) {
  const s = STEPS[i]; state.step = i;
  Object.assign(state.ly, base, s.ly);
  state.houses = s.houses === 'keep' ? (state.houses === 'off' ? 'placidus' : state.houses) : s.houses;
  state.pin = null; setView(s.view); syncControls(); recompute(); showStep();
}
function endTour() { if (state.step >= 0) { state.step = -1; } showStep(); }

/* ---------- pointer interaction ---------- */
const ptrs = new Map(); let dragMoved = 0, pinch0 = 0;
function zoomBy(f) { if (state.view === 'ground') cam.fov = clamp(cam.fov / f, 25, 150); else cam.zoom = clamp(cam.zoom * f, 0.5, 4); dirty = true; }
function rotateBy(dx, dy) {
  if (state.view === 'ground') { const k = cam.fov / Math.min(W, H) * 1.05; cam.az = norm360(cam.az - dx * k); cam.alt = clamp(cam.alt + dy * k, -89, 89); }
  else { cam.oaz = norm360(cam.oaz - dx * 0.4); cam.oel = clamp(cam.oel + dy * 0.4, -89.9, 90); }
  dirty = true;
}
const local = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function pickSky(x, y) { let best = null, bd = 16; for (const h of hits) { const d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = h; } } return best ? { type: 'planet', id: best.id } : null; }
function probe(x, y) {
  const w = unproject(x, y), el = $('probe');
  if (!w) { el.textContent = 'Drag to turn the sphere. Point at it to read coordinates.'; return; }
  const alt = Math.asin(clamp(w[1], -1, 1)) * R2D, az = norm360(Math.atan2(w[0], -w[2]) * R2D), ev = mapply(mtrans(sky.Mhe), w);
  const lon = norm360(Math.atan2(ev[1], ev[0]) * R2D), lat = Math.asin(clamp(ev[2], -1, 1)) * R2D, z = fmtZodiac(lon), h = houseOfWorld(sky, w);
  el.innerHTML = `Altitude <b>${alt >= 0 ? '+' : '−'}${Math.abs(alt).toFixed(0)}°</b> · Azimuth <b>${az.toFixed(0)}° ${compass(az)}</b> · Zodiac <b>${z.deg}° ${SIGNS[z.sign]}</b>${Math.abs(lat) > 9 ? ` (${Math.abs(lat).toFixed(0)}° off the ecliptic)` : ''}${h ? ` · House <b>${h}</b>` : ''}`;
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.focus({ preventScroll: true }); cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, local(e)); dragMoved = 0; cv.classList.add('dragging'); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
cv.addEventListener('pointermove', e => {
  const p = local(e);
  if (!ptrs.has(e.pointerId)) { setHover(pickSky(p[0], p[1])); probe(p[0], p[1]); return; }
  const q = ptrs.get(e.pointerId); ptrs.set(e.pointerId, p);
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0 > 0) zoomBy(d / pinch0); pinch0 = d; dragMoved = 99; return; }
  const dx = p[0] - q[0], dy = p[1] - q[1]; dragMoved += Math.abs(dx) + Math.abs(dy);
  if (dragMoved > 3) { rotateBy(dx, dy); if (cam.tween) cam.tween = null; }
});
const endPtr = e => { if (!ptrs.has(e.pointerId)) return; const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (!ptrs.size) cv.classList.remove('dragging'); if (e.type === 'pointerup' && dragMoved <= 3) togglePin(pickSky(p[0], p[1])); };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('pointerleave', () => { if (!ptrs.size) setHover(null); });
cv.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoomBy(Math.exp(-e.deltaY * 0.01)); }, { passive: false });
cv.addEventListener('keydown', e => {
  const k = { ArrowLeft: [24, 0], ArrowRight: [-24, 0], ArrowUp: [0, 24], ArrowDown: [0, -24] }[e.key];
  if (k) { e.preventDefault(); rotateBy(k[0], k[1]); } else if (e.key === '+' || e.key === '=') zoomBy(1.2); else if (e.key === '-') zoomBy(1 / 1.2);
});
$('zin').addEventListener('click', () => zoomBy(1.25)); $('zout').addEventListener('click', () => zoomBy(0.8));
const wlocal = e => { const r = wc.getBoundingClientRect(); return [(e.clientX - r.left) * WS / r.width, (e.clientY - r.top) * WS / r.height]; };
wc.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') setHover(wheelPick(...wlocal(e))); });
wc.addEventListener('pointerleave', () => setHover(null));
wc.addEventListener('click', e => togglePin(wheelPick(...wlocal(e))));

/* ---------- sizing + main loop ---------- */
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  const r = cv.getBoundingClientRect(); W = Math.max(50, r.width); H = Math.max(50, r.height); cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const wr = wc.getBoundingClientRect(); WS = Math.max(120, wr.width); wc.width = wc.height = Math.round(WS * DPR);
  dirty = true;
}
new ResizeObserver(resize).observe(cv.parentElement); new ResizeObserver(resize).observe(wc.parentElement);
let lastT = performance.now(), dayAcc = 0;
function tick(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (state.playing) {
    if (state.speed === 'day') { dayAcc += dt * 8; const n = Math.floor(dayAcc); if (n) { dayAcc -= n; setTime(state.utcMs + n * 864e5); } }
    else setTime(state.utcMs + dt * (state.speed === 'hour' ? 3600 : 600) * 1000);
    if (state.utcMs >= MAX_MS) setPlaying(false);
  }
  if (dirty || cam.tween) { dirty = false; if (render(now)) dirty = true; }
  if (domDirty && (!state.playing || now - lastDom > 140)) updateDom();
  requestAnimationFrame(tick);
}

citySel.value = 0; $('lat').value = state.lat; $('lon').value = state.lon; tzSel.value = state.tz;
syncControls(); recompute(); showStep(); resize(); updateDom();
requestAnimationFrame(tick);
if (document.fonts && document.fonts.load) Promise.all(['600 14px "Albert Sans"', 'italic 500 12px "Albert Sans"', '600 16px "Noto Sans Symbols"', '16px "Noto Sans Symbols 2"'].map(f => document.fonts.load(f, 'A♈☉')))
  .then(() => { dirty = true; }).catch(() => {});
})();
