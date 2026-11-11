/* ---------- astronomy core (uses global Astronomy = astronomy-engine) ---------- */
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const norm360 = x => ((x % 360) + 360) % 360;
const norm180 = x => { x = norm360(x); return x > 180 ? x - 360 : x; };

const BODIES = [
  { id: 'Sun', glyph: '☉', color: '#ffcf4d', r: 6.5, span: 90, n: 60 },
  { id: 'Moon', glyph: '☽', color: '#e9ecf5', r: 5.5, span: 7, n: 56 },
  { id: 'Mercury', glyph: '☿', color: '#b8c4d2', r: 3.6, span: 60, n: 80 },
  { id: 'Venus', glyph: '♀', color: '#f7e7ae', r: 4.4, span: 150, n: 90 },
  { id: 'Mars', glyph: '♂', color: '#ff7b5e', r: 4, span: 200, n: 90 },
  { id: 'Jupiter', glyph: '♃', color: '#f1bd8f', r: 4.6, span: 365, n: 80 },
  { id: 'Saturn', glyph: '♄', color: '#dcc680', r: 4.2, span: 540, n: 90 },
  { id: 'Uranus', glyph: '♅', color: '#8fe6e2', r: 3.4, span: 730, n: 90 },
  { id: 'Neptune', glyph: '♆', color: '#86a2ff', r: 3.4, span: 730, n: 90 },
  { id: 'Pluto', glyph: '♇', color: '#cfa6e6', r: 3, span: 1095, n: 90 },
];
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const SIGN_GLYPHS = SIGNS.map((_, i) => String.fromCharCode(0x2648 + i) + '︎');
// Where the ecliptic enters each IAU constellation (J2000 ecliptic longitude, degrees)
const CON_ECL = [['Pisces', 351.6], ['Aries', 29.0], ['Taurus', 53.4], ['Gemini', 90.4], ['Cancer', 118.2], ['Leo', 138.1], ['Virgo', 174.1], ['Libra', 217.8], ['Scorpius', 241.1], ['Ophiuchus', 247.9], ['Sagittarius', 266.6], ['Capricornus', 299.7], ['Aquarius', 327.9]];

/* 3x3 matrices, row-major arrays of 9 */
function mmul(a, b) {
  const o = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return o;
}
function mapply(m, v) {
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
}
function mtrans(m) { return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]; }
function fromAE(r) { const o = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = r.rot[j][i]; return o; }
function sph(lonDeg, latDeg) { const l = lonDeg * D2R, b = latDeg * D2R, c = Math.cos(b); return [c * Math.cos(l), c * Math.sin(l), Math.sin(b)]; }

function bodyEcl(id, t) {
  if (id === 'Sun') { const s = Astronomy.SunPosition(t); return { lon: s.elon, lat: s.elat }; }
  if (id === 'Moon') { const m = Astronomy.EclipticGeoMoon(t); return { lon: norm360(m.lon), lat: m.lat }; }
  const e = Astronomy.Ecliptic(Astronomy.GeoVector(id, t, true));
  return { lon: e.elon, lat: e.elat };
}

/* World frame: x = east, y = up (zenith), z = south.
   hourDec -> world for hour angle H and declination d (degrees). */
function hourDecToWorld(H, d, phi) {
  const h = H * D2R, dd = d * D2R, p = phi * D2R, cd = Math.cos(dd), sd = Math.sin(dd);
  const m = cd * Math.cos(h), w = cd * Math.sin(h);
  return [-w, m * Math.cos(p) + sd * Math.sin(p), m * Math.sin(p) - sd * Math.cos(p)];
}

function placidusCusps(ramc, eps, phi) {
  const e = eps * D2R, tp = Math.tan(phi * D2R);
  const lamOf = a => Math.atan2(Math.sin(a * D2R), Math.cos(a * D2R) * Math.cos(e));
  const solve = (off, f, lower) => {
    let a = ramc + off;
    for (let i = 0; i < 60; i++) {
      const dec = Math.asin(Math.sin(e) * Math.sin(lamOf(a)));
      const x = -tp * Math.tan(dec);
      if (Math.abs(x) >= 1) return NaN;
      const dsa = Math.acos(x) * R2D;
      a = lower ? ramc + 180 - (180 - dsa) * f : ramc + dsa * f;
    }
    return norm360(lamOf(a) * R2D);
  };
  return { c11: solve(30, 1 / 3, false), c12: solve(60, 2 / 3, false), c2: solve(120, 2 / 3, true), c3: solve(150, 1 / 3, true) };
}

/* Everything the views need for one moment and place. */
function computeSky(utcMs, latDeg, lonDeg, houseSystem) {
  const t = Astronomy.MakeTime(new Date(utcMs));
  const lst = norm360(Astronomy.SiderealTime(t) * 15 + lonDeg);
  const L = lst * D2R, p = latDeg * D2R;
  const cL = Math.cos(L), sL = Math.sin(L), cp = Math.cos(p), sp = Math.sin(p);
  const Mhq = [-sL, cL, 0, cL * cp, sL * cp, sp, cL * sp, sL * sp, -cp];      // world <- equator of date
  const Rqe = fromAE(Astronomy.Rotation_ECT_EQD(t));                           // equator <- ecliptic of date
  const Rej = fromAE(Astronomy.Rotation_EQJ_ECT(t));                           // ecliptic of date <- J2000 equator
  const Mhe = mmul(Mhq, Rqe), Mhj = mmul(Mhe, Rej);
  const eps = Math.atan2(Rqe[7], Rqe[8]) * R2D;

  // Ascendant: ecliptic point on the eastern horizon. Midheaven: ecliptic point on the upper meridian.
  let asc = Math.atan2(-Mhe[3], Mhe[4]) * R2D;
  if (mapply(Mhe, sph(asc, 0))[0] < 0) asc += 180;
  asc = norm360(asc);
  let mc = Math.atan2(-Mhe[0], Mhe[1]) * R2D;
  const mv = mapply(Mhe, sph(mc, 0));
  if (mv[1] * cp + mv[2] * sp < 0) mc += 180;
  mc = norm360(mc);

  let system = houseSystem, cusps = null, note = '';
  if (system === 'placidus') {
    const c = placidusCusps(lst, eps, latDeg);
    if ([c.c11, c.c12, c.c2, c.c3].some(isNaN)) { system = 'whole'; note = 'Placidus houses break down this close to the poles, so Whole Sign is shown.'; }
    else cusps = [asc, c.c2, c.c3, norm360(mc + 180), norm360(c.c11 + 180), norm360(c.c12 + 180), norm360(asc + 180), norm360(c.c2 + 180), norm360(c.c3 + 180), mc, c.c11, c.c12];
  }
  if (system === 'whole') { const s0 = Math.floor(asc / 30) * 30; cusps = Array.from({ length: 12 }, (_, i) => norm360(s0 + 30 * i)); }

  const houseOfLon = lon => {
    if (!cusps) return 0;
    for (let i = 0; i < 12; i++) { const a = cusps[i], w = norm360(cusps[(i + 1) % 12] - a); if (norm360(lon - a) < w) return i + 1; }
    return 12;
  };
  const bodies = BODIES.map(b => {
    const e = bodyEcl(b.id, t), ev = sph(e.lon, e.lat), w = mapply(Mhe, ev);
    const q = mapply(Rqe, ev);
    return { ...b, lon: e.lon, lat: e.lat, ev, w, dec: Math.asin(q[2]) * R2D, alt: Math.asin(w[1]) * R2D, az: norm360(Math.atan2(w[0], -w[2]) * R2D), house: houseOfLon(e.lon) };
  });
  return { t, utcMs, lat: latDeg, lon: lonDeg, lst, eps, Mhq, Mhe, Mhj, Rqe, asc, mc, cusps, system, requested: houseSystem, note, bodies, houseOfLon };
}

/* House of an arbitrary sky direction (world vector). */
function houseOfWorld(sky, w) {
  if (!sky.cusps) return 0;
  const ev = mapply(mtrans(sky.Mhe), w);
  if (sky.system === 'whole') return sky.houseOfLon(norm360(Math.atan2(ev[1], ev[0]) * R2D));
  const q = mapply(mtrans(sky.Mhq), w);
  const dec = Math.asin(Math.max(-1, Math.min(1, q[2])));
  const H = norm180(sky.lst - Math.atan2(q[1], q[0]) * R2D);
  const x = -Math.tan(sky.lat * D2R) * Math.tan(dec);
  if (Math.abs(x) >= 1) return 0;
  const dsa = Math.acos(x) * R2D, nsa = 180 - dsa, aH = Math.abs(H), east = H < 0;
  if (aH <= dsa) { const k = Math.min(2, Math.floor(aH / dsa * 3)); return east ? 10 + k : 9 - k; }
  const k = Math.min(2, Math.floor((180 - aH) / nsa * 3));
  return east ? 3 - k : 4 + k;
}

function fmtZodiac(lon) {
  lon = norm360(lon); const s = Math.floor(lon / 30); let d = lon - s * 30; let deg = Math.floor(d), min = Math.floor((d - deg) * 60);
  return { sign: s, deg, min, text: `${deg}°${String(min).padStart(2, '0')}′ ${SIGNS[s]}` };
}
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compass = az => COMPASS[Math.round(norm360(az) / 22.5) % 16];

/* ---------- time zones ---------- */
const _dtf = {};
function tzParts(tz, ms) {
  const f = _dtf[tz] || (_dtf[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }));
  const o = {}; for (const p of f.formatToParts(new Date(ms))) if (p.type !== 'literal') o[p.type] = +p.value;
  return o;
}
function tzOffsetMs(tz, ms) { const o = tzParts(tz, ms); return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - Math.floor(ms / 1000) * 1000; }
function localToUtc(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  let utc = guess - tzOffsetMs(tz, guess);
  const off2 = tzOffsetMs(tz, utc);
  return guess - off2;
}
