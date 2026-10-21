/* ==========================================================================
   F-LOFT — интерактивная 3D-модель площадки (два уровня).
   Подход взят с greygreen.spaceandplace.moscow: панель зон, переключатели «Формат», «День / Вечер», «Этаж», облёт камеры.

   ИСТОЧНИКИ ТОЧНОСТИ. Геометрия снята с поэтажных планов БТИ F-LOFT (Яндекс Диск «Планировки и чертежи / Общие пустые»:
   1 ЭТАЖ.png, 2 ЭТАЖ.png): зал 29,57 м, 5 окон, колонны 6,2 м, коридор-балкон 2-го этажа 30,1 × 2,4 м, мостик 5,4 × 3,2 м,
   две прямые лестницы, ниша бара со вторым светом, welcome-зона с проёмом, «второй зал» 133 м², гримёрные 39 и 17 м².
   Сцена 4,8 × 3,6 м и LED-экран ~5,1 × 2,9 м — из презентации и инвентаря. Мебель и её количество — из «Мебель и оборудование FormatLoft».
   Приблизительно: высота 2-го уровня (2,9 м), точные ширины окон и проёмов (сняты с планов «на глаз»), отделка, декор.
   Оси: x — вдоль зала (0 — стена за сценой, 29,57 — стена с проёмом в welcome), z — поперёк (0 — окна на юг, 21,65 — север).
   Сцена построена зеркально (root.scale.z = -1), чтобы совпадала с реальностью: стоя лицом к сцене, окна слева.
   ========================================================================== */
(function () {
  'use strict';
  var T = window.THREE;
  var BASE = ''; try { var cs = document.currentScript; if (cs && cs.src) BASE = cs.src.replace(/js\/hall(3d)?\.js.*$/, ''); } catch (e) {}   // каталог, откуда загружена сцена (на сайте картинки зон лежат рядом)
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- ПАРАМЕТРЫ (метры, оценка по видео и площадям 840 + 360 м²) ---------- */
  var D = {
    L: 45, W: 21.65, H: 5.4,           // здание по плану БТИ
    gY: 2.9,                           // отметка пола 2-го уровня (оценка)
    hallL: 29.57, hallW: 14.85,        // главный зал (428 м² по БТИ)
    alc: { x0: 8.9, x1: 17.9 },        // ниша бара со вторым светом
    colX: [5.4, 11.6, 17.9, 24.0], colZ: [8.66, 12.0],
    posts: [2.5, 8.0, 15.2, 20.6, 27.5],
    corr: { x1: 30.13, z0: 12.4, z1: 14.85 },     // коридор-балкон (90 м² вместе с мостиком)
    stub: { x0: 11.9, x1: 17.6, z0: 9.2 },        // мостик в зал
    stairs: [{ x0: 5.8, x1: 7.1 }, { x0: 22.5, x1: 23.8 }], stairZ0: 8.2,
    stage: { x1: 3.9, z0: 5.0, z1: 9.8, h: 0.45 }, // подиум 4,8 × 3,6 м
    win: { list: [[0.9, 4.1], [6.75, 9.5], [13.2, 16.5], [19.5, 22.0], [25.3, 28.5]], sill: 1.1, h: 3.55 },
    lobby: { x1: 38.9, z1: 12.4, op: [9.0, 11.4], door: [31.0, 35.5] }
  };
  D.lobby.x0 = D.hallL;

  /* ---------- сцена, камера, управление ---------- */
  var canvas = $('#c');
  var renderer;
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); }
  catch (e) { var fb = $('#fallback'); if (fb) fb.hidden = false; return; }
  var COARSE = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2));   // на телефоне легче по нагрузке
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  var scene = new T.Scene();
  var root = new T.Group(); root.scale.z = -1; scene.add(root);   // зеркало по z: реальная ориентация зала
  function zf(a) { return [a[0], a[1], -a[2]]; }
  var camera = new T.PerspectiveCamera(40, 1, 0.1, 500);
  var controls = new T.OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.075;
  controls.maxPolarAngle = Math.PI * 0.497; controls.minDistance = 1.5; controls.maxDistance = 95;
  controls.screenSpacePanning = true;

  var G = {};      // группы
  ['shell', 'ground', 'upper', 'decor', 'lounge', 'lightDay', 'lightEve', 'beams'].forEach(function (k) { G[k] = new T.Group(); root.add(G[k]); });
  G.fmt = {};
  ['empty', 'buffet', 'banquet', 'theatre'].forEach(function (k) { G.fmt[k] = new T.Group(); root.add(G.fmt[k]); });
  var winDecor = new T.Group(); root.add(winDecor);
  var cut = [{ obj: winDecor, ax: 'z', side: -1, at: 0 }];    // стены, которые «срезаются», когда камера снаружи: {obj, ax:'x'|'z', side:+1|-1, at}
  var emissives = [];   // материалы, чья яркость зависит от дня/вечера: {m, day, eve, dayColor, eveColor}

  /* ---------- вспомогательное ---------- */
  var geoCache = {};
  function boxGeo(w, h, d) { var k = w + '|' + h + '|' + d; return geoCache[k] || (geoCache[k] = new T.BoxGeometry(w, h, d)); }
  function mesh(g, geo, mat, x, y, z, o) {
    var m = new T.Mesh(geo, mat); m.position.set(x, y, z);
    m.castShadow = !(o && o.cast === false); m.receiveShadow = !(o && o.recv === false);
    if (o && o.ry) m.rotation.y = o.ry; if (o && o.rx) m.rotation.x = o.rx; if (o && o.rz) m.rotation.z = o.rz;
    g.add(m); return m;
  }
  // коробка: центр (x,y,z), размеры w (по x), h (по y), d (по z)
  function box(g, w, h, d, mat, x, y, z, o) { return mesh(g, boxGeo(w, h, d), mat, x, y, z, o); }
  // коробка по углам: x0..x1, y0..y1, z0..z1
  function boxR(g, x0, x1, y0, y1, z0, z1, mat, o) { return box(g, x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, o); }
  function mk(o) { return new T.MeshStandardMaterial(o); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var seed = 7; function sr() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }   // детерминированный «случай»
  function tex(w, h, draw, rx, ry) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t;
  }

  /* ---------- текстуры (процедурные) ---------- */
  var TX = {};
  TX.concrete = tex(512, 512, function (c, w, h) {
    c.fillStyle = '#7d7a73'; c.fillRect(0, 0, w, h);
    for (var i = 0; i < 28; i++) { var g = c.createRadialGradient(sr() * w, sr() * h, 4, sr() * w, sr() * h, 120 + sr() * 120); g.addColorStop(0, 'rgba(40,38,34,' + (0.05 + sr() * 0.07) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
    for (i = 0; i < 4200; i++) { c.fillStyle = sr() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'; c.fillRect(sr() * w, sr() * h, 1 + sr() * 2, 1 + sr() * 2); }
    c.strokeStyle = 'rgba(30,28,24,0.12)'; c.lineWidth = 1; for (i = 0; i < 5; i++) { c.beginPath(); c.moveTo(sr() * w, sr() * h); for (var k = 0; k < 4; k++) c.lineTo(sr() * w, sr() * h); c.stroke(); }
  }, 10, 5);
  TX.woodFloor = tex(512, 256, function (c, w, h) {
    c.fillStyle = '#4b3224'; c.fillRect(0, 0, w, h);
    var pw = 32; for (var x = 0; x < w; x += pw) {
      var s = 0.82 + sr() * 0.36; c.fillStyle = 'rgb(' + Math.round(75 * s) + ',' + Math.round(50 * s) + ',' + Math.round(36 * s) + ')'; c.fillRect(x, 0, pw - 1, h);
      c.strokeStyle = 'rgba(20,10,5,0.28)'; for (var j = 0; j < 7; j++) { c.beginPath(); c.moveTo(x + sr() * pw, 0); c.lineTo(x + sr() * pw, h); c.stroke(); }
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(x + pw - 1, 0, 1, h);
    }
  }, 6, 2);
  TX.woodFascia = tex(512, 128, function (c, w, h) {
    c.fillStyle = '#7a5a3c'; c.fillRect(0, 0, w, h);
    for (var y = 0; y < h; y += 21) { var s = 0.8 + sr() * 0.4; c.fillStyle = 'rgb(' + Math.round(122 * s) + ',' + Math.round(90 * s) + ',' + Math.round(60 * s) + ')'; c.fillRect(0, y, w, 20); c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(0, y + 20, w, 1); }
    for (var i = 0; i < 700; i++) { c.fillStyle = 'rgba(40,24,12,0.12)'; c.fillRect(sr() * w, sr() * h, 20 + sr() * 50, 1); }
  }, 8, 1);
  TX.brick = tex(256, 256, function (c, w, h) {
    c.fillStyle = '#c9c6bd'; c.fillRect(0, 0, w, h);
    var bh = 22, bw = 64; for (var r = 0; r * bh < h + bh; r++) for (var x = -bw; x < w + bw; x += bw) {
      var ox = (r % 2) * (bw / 2), s = 0.93 + sr() * 0.07;
      c.fillStyle = 'rgb(' + Math.round(240 * s) + ',' + Math.round(238 * s) + ',' + Math.round(232 * s) + ')'; c.fillRect(x + ox + 2, r * bh + 2, bw - 4, bh - 4);
    }
  }, 1, 2);
  TX.leaf = tex(768, 512, function (c, w, h) {
    c.fillStyle = '#f0efe6'; c.fillRect(0, 0, w, h);
    var cols = [['#f2d03c', '#6fa63a'], ['#bfd24a', '#2f7d3a'], ['#8fc04a', '#1f6a38'], ['#e6c93a', '#4f9a3a']];
    for (var i = 0; i < 17; i++) {
      var cx = (i % 6) * 135 + 40 + sr() * 40, cy = Math.floor(i / 6) * 175 + 90 + sr() * 30, rot = -0.9 + sr() * 1.8, L = 110 + sr() * 60, Wd = 42 + sr() * 18, cc = cols[i % 4];
      c.save(); c.translate(cx, cy); c.rotate(rot);
      var g = c.createLinearGradient(0, -L, 0, L); g.addColorStop(0, cc[0]); g.addColorStop(1, cc[1]);
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -L); c.bezierCurveTo(Wd * 1.6, -L * 0.3, Wd * 1.2, L * 0.6, 0, L); c.bezierCurveTo(-Wd * 1.2, L * 0.6, -Wd * 1.6, -L * 0.3, 0, -L); c.fill();
      c.strokeStyle = 'rgba(20,70,40,0.75)'; c.lineWidth = 3; c.stroke(); c.beginPath(); c.moveTo(0, -L * 0.9); c.lineTo(0, L * 0.9); c.stroke();
      c.lineWidth = 1.6; for (var k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(0, k * L * 0.2); c.lineTo(Wd * 1.0, k * L * 0.2 - L * 0.12); c.moveTo(0, k * L * 0.2); c.lineTo(-Wd * 1.0, k * L * 0.2 - L * 0.12); c.stroke(); }
      c.restore();
    }
  });
  TX.frost = tex(512, 512, function (c, w, h) {
    c.fillStyle = 'rgba(236,240,236,1)'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(90,130,95,0.45)'; c.lineWidth = 2;
    for (var i = 0; i < 12; i++) { var x = sr() * w, y = sr() * h, r = 40 + sr() * 50; c.beginPath(); for (var a = 0; a < 7; a++) { var an = a * Math.PI / 3.5 + sr() * 0.3; c.moveTo(x, y); c.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); } c.stroke(); c.beginPath(); c.arc(x, y, 5, 0, 7); c.stroke(); }
  });
  TX.facet = tex(256, 512, function (c, w, h) {
    c.fillStyle = '#f2f1f4'; c.fillRect(0, 0, w, h);
    var cw = 64, ch = 64; for (var y = 0; y < h; y += ch) for (var x = 0; x < w; x += cw) {
      var a = 215 + Math.floor(sr() * 38), b = 190 + Math.floor(sr() * 50);
      c.fillStyle = 'rgb(' + a + ',' + a + ',' + (a + 5) + ')'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + cw, y); c.lineTo(x + cw / 2, y + ch); c.fill();
      c.fillStyle = 'rgb(' + b + ',' + b + ',' + (b + 8) + ')'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + cw / 2, y + ch); c.lineTo(x, y + ch); c.fill();
      c.fillStyle = 'rgb(255,255,255)'; c.globalAlpha = 0.7; c.beginPath(); c.moveTo(x + cw, y); c.lineTo(x + cw, y + ch); c.lineTo(x + cw / 2, y + ch); c.fill(); c.globalAlpha = 1;
    }
  });
  TX.tile = tex(256, 256, function (c, w, h) {
    c.fillStyle = '#0d1a2c'; c.fillRect(0, 0, w, h);
    for (var y = 0; y < h; y += 64) for (var x = 0; x < w; x += 64) { c.fillStyle = 'rgb(' + (18 + Math.floor(sr() * 8)) + ',' + (44 + Math.floor(sr() * 12)) + ',' + (80 + Math.floor(sr() * 16)) + ')'; c.fillRect(x + 1, y + 1, 62, 62); }
  }, 6, 1);
  TX.mosaic = tex(512, 512, function (c, w, h) {
    for (var y = 0; y < h; y += 8) for (var x = 0; x < w; x += 8) {
      var t = (Math.sin(x * 0.02 + Math.sin(y * 0.03) * 2) + Math.cos(y * 0.025 + x * 0.01)) * 0.5, l = 32 + t * 14 + sr() * 10;
      c.fillStyle = 'hsl(' + (185 + t * 22) + ',68%,' + l + '%)'; c.fillRect(x, y, 7, 7);
    }
  }, 1, 1);
  TX.rug = tex(256, 256, function (c, w, h) {
    c.fillStyle = '#3a3a40'; c.fillRect(0, 0, w, h);
    var s = 32; for (var y = -s; y < h + s; y += s) for (var x = -s; x < w + s; x += s) {
      var tone = 70 + Math.floor(sr() * 90); c.fillStyle = 'rgb(' + tone + ',' + tone + ',' + (tone + 8) + ')';
      c.beginPath(); c.moveTo(x + s / 2, y); c.lineTo(x + s, y + s / 2); c.lineTo(x + s / 2, y + s); c.lineTo(x, y + s / 2); c.closePath(); c.fill();
    }
  }, 1, 1);
  TX.parquet = tex(256, 256, function (c, w, h) {
    c.fillStyle = '#4f4a44'; c.fillRect(0, 0, w, h);
    var pl = 64, pw = 16; for (var y = 0; y < h; y += pw * 2) for (var x = 0; x < w; x += pl) {
      for (var k = 0; k < 2; k++) { var s = 0.8 + sr() * 0.35; c.save(); c.translate(x + (k ? pl / 2 : 0), y + k * pw); c.fillStyle = 'rgb(' + Math.round(88 * s) + ',' + Math.round(80 * s) + ',' + Math.round(72 * s) + ')'; c.fillRect(1, 1, pl / 2 - 2, pw - 2); c.restore(); }
    }
  }, 14, 5);
  TX.patina = tex(512, 512, function (c, w, h) {
    c.fillStyle = '#17383f'; c.fillRect(0, 0, w, h);
    for (var i = 0; i < 40; i++) { var g = c.createRadialGradient(sr() * w, sr() * h, 4, sr() * w, sr() * h, 60 + sr() * 160); var warm = sr() > 0.7; g.addColorStop(0, warm ? 'rgba(150,120,70,0.35)' : (sr() > 0.5 ? 'rgba(20,90,100,0.45)' : 'rgba(10,25,40,0.5)')); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
    for (i = 0; i < 2600; i++) { c.fillStyle = sr() > 0.5 ? 'rgba(200,220,210,0.05)' : 'rgba(0,0,0,0.07)'; c.fillRect(sr() * w, sr() * h, 1 + sr() * 4, 1 + sr() * 2); }
  }, 1, 1);
  TX.persian = tex(256, 256, function (c, w, h) {
    c.fillStyle = '#6b2a22'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d6b27a'; c.lineWidth = 6; c.strokeRect(12, 12, w - 24, h - 24); c.strokeStyle = '#2a1a2e'; c.lineWidth = 3; c.strokeRect(26, 26, w - 52, h - 52);
    c.fillStyle = '#2c3c63'; c.beginPath(); c.moveTo(w / 2, 40); c.lineTo(w - 50, h / 2); c.lineTo(w / 2, h - 40); c.lineTo(50, h / 2); c.closePath(); c.fill();
    c.fillStyle = '#c9a15d'; c.beginPath(); c.moveTo(w / 2, 80); c.lineTo(w - 90, h / 2); c.lineTo(w / 2, h - 80); c.lineTo(90, h / 2); c.closePath(); c.fill();
    for (var i = 0; i < 60; i++) { c.fillStyle = 'rgba(230,200,150,0.5)'; c.fillRect(sr() * w, sr() * h, 3, 3); }
  }, 1, 1);
  TX.ledCanvas = document.createElement('canvas'); TX.ledCanvas.width = 768; TX.ledCanvas.height = 416;
  TX.led = new T.CanvasTexture(TX.ledCanvas); TX.led.encoding = T.sRGBEncoding; TX.led.repeat.x = -1; TX.led.offset.x = 1;   // компенсирует зеркало сцены
  function drawLed(t) {
    var c = TX.ledCanvas.getContext('2d'), w = 768, h = 416;
    var g = c.createLinearGradient(0, 0, w, h); var s = (Math.sin(t * 0.0004) + 1) / 2;
    g.addColorStop(0, 'hsl(' + (262 + s * 20) + ',65%,22%)'); g.addColorStop(0.55, 'hsl(' + (225 + s * 20) + ',70%,34%)'); g.addColorStop(1, 'hsl(' + (20 - s * 15) + ',75%,40%)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(70,140,255,0.55)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(120, 0); c.lineTo(0, h * 0.6); c.fill();
    c.fillStyle = 'rgba(90,60,200,0.5)'; c.beginPath(); c.moveTo(w, 0); c.lineTo(w - 150, 0); c.lineTo(w, h * 0.7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.08)'; for (var i = 0; i < 8; i++) { c.fillRect(0, i * 52, w, 1); }
    c.fillStyle = '#d6131c'; c.beginPath(); c.arc(w / 2, h / 2 - 28, 74, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '700 66px "Mulish",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('F', w / 2, h / 2 - 26);
    c.font = '600 34px "Tenor Sans","Mulish",Arial,sans-serif'; c.fillText('FORMAT LOFT', w / 2, h / 2 + 88);
    TX.led.needsUpdate = true;
  }
  drawLed(0);

  /* ---------- материалы ---------- */
  var M = {
    concrete: mk({ map: TX.concrete, roughness: 0.45, metalness: 0.06, color: 0xd6cdbb }),
    white: mk({ color: 0xd9d6cf, roughness: 0.92 }),
    whiteCeil: mk({ color: 0xe8e6e2, roughness: 0.95 }),
    brick: mk({ map: TX.brick, roughness: 0.9, color: 0xffffff }),
    woodFloor: mk({ map: TX.woodFloor, roughness: 0.55, metalness: 0.03, color: 0xd9ac78 }),
    woodFascia: mk({ map: TX.woodFascia, roughness: 0.75 }),
    woodDark: mk({ color: 0x3b2a1e, roughness: 0.7 }),
    steel: mk({ color: 0x1c1b1f, roughness: 0.42, metalness: 0.75 }),
    steelPurple: mk({ color: 0x34353b, roughness: 0.45, metalness: 0.7 }),
    black: mk({ color: 0x0f0f11, roughness: 0.6, metalness: 0.2 }),
    curtain: mk({ color: 0x0d0d10, roughness: 0.96, side: T.DoubleSide }),
    leatherBlack: mk({ color: 0x0c0d10, roughness: 0.34, metalness: 0.1 }),
    leatherTan: mk({ color: 0xc08033, roughness: 0.4, metalness: 0.08 }),
    greenWall: mk({ color: 0x1f3d36, roughness: 0.95 }),
    greenFloor: mk({ color: 0x2a6d62, roughness: 0.9 }),
    drawers: mk({ color: 0x0f5a45, roughness: 0.55 }),
    pot: mk({ color: 0xd8d6d2, roughness: 0.6 }),
    leafG: mk({ color: 0x1f5a2b, roughness: 0.7, side: T.DoubleSide }),
    leafG2: mk({ color: 0x2f7a35, roughness: 0.7, side: T.DoubleSide }),
    stem: mk({ color: 0x4a6b2f, roughness: 0.8 }),
    painting: mk({ map: TX.leaf, roughness: 0.8 }),
    facet: mk({ map: TX.facet, roughness: 0.85, emissive: 0xffffff, emissiveMap: TX.facet, emissiveIntensity: 0 }),
    tile: mk({ map: TX.tile, roughness: 0.35, metalness: 0.1 }),
    mosaic: mk({ map: TX.mosaic, roughness: 0.3, metalness: 0.2 }),
    frost: mk({ map: TX.frost, roughness: 0.35, transparent: true, opacity: 0.82, side: T.DoubleSide }),
    glass: mk({ color: 0xcfe4ff, roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.5, emissive: 0xbcd8ff, emissiveIntensity: 0.9, side: T.DoubleSide }),
    rug: mk({ map: TX.rug, roughness: 0.95 }),
    stageTop: mk({ color: 0x1b1b21, roughness: 0.5, metalness: 0.2 }),
    led: new T.MeshBasicMaterial({ map: TX.led, toneMapped: false }),
    ledOff: mk({ color: 0x050507, roughness: 0.3 }),
    cloth: mk({ color: 0xd7cdbf, roughness: 0.95 }),
    chair: mk({ color: 0x15161a, roughness: 0.6 }),
    chairSeat: mk({ color: 0x24252b, roughness: 0.7 }),
    chrome: mk({ color: 0xbfc3c8, roughness: 0.25, metalness: 0.95 }),
    neon: new T.MeshBasicMaterial({ color: 0xf3eaff, toneMapped: false }),
    stripLed: new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    crystal: mk({ color: 0xe9f1ff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.8, emissive: 0xaab8ff, emissiveIntensity: 0.5 }),
    grass: mk({ color: 0xcfcbc1, roughness: 1 }),
    poster: mk({ color: 0xc9573b, roughness: 0.7 }),
    frame: mk({ color: 0xf4f2ee, roughness: 0.6 }),
    fire: mk({ color: 0x111113, roughness: 0.5 }),
    radiator: mk({ color: 0xf2f2f0, roughness: 0.5 }),
    beamBlack: mk({ color: 0x121214, roughness: 0.8 }),
    dish: mk({ color: 0x7a2c20, roughness: 0.6 }),
    soffit: mk({ color: 0x1b1c1f, roughness: 0.8, metalness: 0.3 }),
    navy: mk({ color: 0x1b1832, roughness: 0.95 }),
    stepGrey: mk({ color: 0x8c8a8f, roughness: 0.7 }),
    violet: new T.MeshBasicMaterial({ color: 0xc070ff, toneMapped: false }),
    panelDark: mk({ color: 0x2a2d32, roughness: 0.6, metalness: 0.2 }),
    patina: mk({ map: TX.patina, roughness: 0.6, metalness: 0.15, color: 0x8fa09f }),
    barDark: mk({ color: 0x1b2a2e, roughness: 0.55, metalness: 0.15 }),
    barTop: mk({ color: 0x5a5148, roughness: 0.4 }),
    shelf: mk({ color: 0x2a2f33, roughness: 0.7 }),
    glassClear: mk({ color: 0xdfeefa, roughness: 0.05, transparent: true, opacity: 0.5 }),
    quilt: mk({ color: 0xe9e7e2, roughness: 0.9 }),
    marble: mk({ color: 0xe8e8ea, roughness: 0.25 }),
    marbleDark: mk({ color: 0x35353a, roughness: 0.3 }),
    mirror: mk({ color: 0x9fb0c2, roughness: 0.08, metalness: 0.95 }),
    persian: mk({ map: TX.persian, roughness: 0.95 }),
    floorDark: mk({ color: 0x3b3b3f, roughness: 0.5 }),
    parquet: mk({ map: TX.parquet, roughness: 0.55 }),
    glassPane: mk({ color: 0xd8e8f4, roughness: 0.08, transparent: true, opacity: 0.22, side: T.DoubleSide }),
    tvOn: new T.MeshBasicMaterial({ color: 0x3a6fff, toneMapped: false }),
    leatherGreen: mk({ color: 0x10261f, roughness: 0.38, metalness: 0.1 }),
    shelfArch: mk({ color: 0x2b2d2e, roughness: 0.8 }),
    cushionYellow: mk({ color: 0xd9a21b, roughness: 0.8 }),
    cushionNavy: mk({ color: 0x1d2b52, roughness: 0.8 }),
    dishDark: mk({ color: 0x2a2c33, roughness: 0.6 })
  };
  emissives.push({ m: M.glass, day: 1.0, eve: 0.06, dayColor: 0xc8dcff, eveColor: 0x2a3a66 });
  emissives.push({ m: M.facet, day: 0.0, eve: 0.85, dayColor: 0xffffff, eveColor: 0xffa24a });

  /* ---------- свободное место: исключения для колонн и зон ---------- */
  function nearCol(x, z, r) {
    for (var i = 0; i < D.colX.length; i++) for (var j = 0; j < D.colZ.length; j++) if (Math.abs(x - D.colX[i]) < r + 0.35 && Math.abs(z - D.colZ[j]) < r + 0.3) return true;
    return false;
  }

  /* ======================================================================
     ОБОЛОЧКА (по планам БТИ): пол, стены, окна, шторы, вход, welcome, помещения 1-го этажа
     ====================================================================== */
  function buildShell() {
    var g = G.shell, w = D.win;
    mesh(g, new T.PlaneGeometry(400, 400), M.grass, 20, -0.06, 10, { rx: -Math.PI / 2, cast: false });
    boxR(g, 0, D.L, -0.3, 0, 0, D.W, M.concrete, { cast: false });
    // западная стена (за сценой), восточная, северная (кирпич)
    var gx0 = new T.Group(); boxR(gx0, 0, 0.3, 0, D.H, 0, D.W, M.white); g.add(gx0); cut.push({ obj: gx0, ax: 'x', side: -1, at: 0 });
    var gx1 = new T.Group(); boxR(gx1, D.L - 0.3, D.L, 0, D.H, 0, D.W, M.white); g.add(gx1); cut.push({ obj: gx1, ax: 'x', side: 1, at: D.L });
    var gz1 = new T.Group(); var nb = boxR(gz1, 0, D.L, 0, D.H, D.W - 0.3, D.W, M.brick); g.add(gz1); cut.push({ obj: gz1, ax: 'z', side: 1, at: D.W });
    var wallTex = TX.brick.clone(); wallTex.repeat.set(24, 3); wallTex.needsUpdate = true; nb.material = mk({ map: wallTex, roughness: 0.9 });
    // северная стена бара: патина тёмно-бирюзового цвета (двойная высота)
    box(gz1, D.alc.x1 - D.alc.x0, D.H - 0.2, 0.05, M.patina, (D.alc.x0 + D.alc.x1) / 2, D.H / 2 + 0.1, D.W - 0.33, { cast: false });
    // южная стена: 5 окон зала + глухая часть и вход со двора
    var gw = new T.Group(); g.add(gw); cut.push({ obj: gw, ax: 'z', side: -1, at: 0 });
    var x = 0;
    w.list.forEach(function (p) {
      var wx = p[0], ww = p[1] - p[0];
      boxR(gw, x, wx, 0, D.H, 0, 0.36, M.white);
      boxR(gw, wx, wx + ww, 0, w.sill, 0, 0.36, M.white);
      boxR(gw, wx, wx + ww, w.sill + w.h, D.H, 0, 0.36, M.white);
      mesh(gw, new T.PlaneGeometry(ww, w.h), M.glass, wx + ww / 2, w.sill + w.h / 2, 0.18, { cast: false, recv: false });
      boxR(gw, wx - 0.02, wx + ww + 0.02, w.sill, w.sill + 0.06, 0.1, 0.26, M.steel); boxR(gw, wx - 0.02, wx + ww + 0.02, w.sill + w.h - 0.06, w.sill + w.h, 0.1, 0.26, M.steel);
      boxR(gw, wx - 0.02, wx + 0.04, w.sill, w.sill + w.h, 0.1, 0.26, M.steel); boxR(gw, wx + ww - 0.04, wx + ww + 0.02, w.sill, w.sill + w.h, 0.1, 0.26, M.steel);
      var cols = Math.max(2, Math.round(ww / 1.1));
      for (var k = 1; k < cols; k++) boxR(gw, wx + k * ww / cols - 0.025, wx + k * ww / cols + 0.025, w.sill, w.sill + w.h, 0.12, 0.24, M.steel);
      for (k = 1; k < 4; k++) boxR(gw, wx, wx + ww, w.sill + k * w.h / 4 - 0.025, w.sill + k * w.h / 4 + 0.025, 0.12, 0.24, M.steel);
      x = wx + ww;
      box(winDecor, ww * 0.85, 0.6, 0.1, M.radiator, wx + ww / 2, 0.4, 0.5, { cast: false });
      curtain(wx - 0.3, wx + 0.7, 0.0, w.sill + w.h + 0.6, 0.62); curtain(wx + ww - 0.7, wx + ww + 0.3, 0.0, w.sill + w.h + 0.6, 0.62);
    });
    var L = D.lobby, d0 = L.door[0], d1 = L.door[1];
    boxR(gw, x, d0, 0, D.H, 0, 0.36, M.white); boxR(gw, d1, D.L, 0, D.H, 0, 0.36, M.white); boxR(gw, d0, d1, 2.7, D.H, 0, 0.36, M.white);
    mesh(gw, new T.PlaneGeometry(d1 - d0, 2.7), M.glass, (d0 + d1) / 2, 1.35, 0.18, { cast: false, recv: false });
    boxR(gw, d0 - 0.04, d0 + 0.06, 0, 2.72, 0.1, 0.28, M.steel); boxR(gw, d1 - 0.06, d1 + 0.04, 0, 2.72, 0.1, 0.28, M.steel); boxR(gw, (d0 + d1) / 2 - 0.03, (d0 + d1) / 2 + 0.03, 0, 2.72, 0.1, 0.28, M.steel); boxR(gw, d0, d1, 2.66, 2.72, 0.1, 0.28, M.steel);
    // крыльцо снаружи
    for (var s = 0; s < 3; s++) boxR(g, d0 - 0.4 - s * 0.2, d1 + 0.4 + s * 0.2, -0.3, 0 - 0.05 + 0.0, -0.3 * (s + 1), 0, M.concrete, { cast: false });

    // стена между залом и welcome (x = 29.57) с проёмом
    var ew = D.hallL, op = L.op;
    boxR(g, ew, ew + 0.3, 0, D.H, 0.36, op[0], M.white); boxR(g, ew, ew + 0.3, 0, D.H, op[1], L.z1, M.white);
    boxR(g, ew, ew + 0.3, 2.8, D.H, op[0], op[1], M.white);
    boxR(g, ew - 0.03, ew + 0.33, 0, 2.8, op[0], op[0] + 0.07, M.steel); boxR(g, ew - 0.03, ew + 0.33, 0, 2.8, op[1] - 0.07, op[1], M.steel); boxR(g, ew - 0.03, ew + 0.33, 2.73, 2.8, op[0], op[1], M.steel);   // чёрный дверной портал
    // восточный объём (санузлы, служебные помещения) и объём над welcome
    boxR(g, L.x1, D.L - 0.3, 0, D.H, 0.36, D.W - 0.3, M.white);
    boxR(g, 36.5, L.x1, 0, D.gY - 0.14, L.z1, D.W - 0.3, M.white);
    // welcome-зона: тёмно-синие стены, светлая ступень, фиолетовая подсветка
    boxR(g, ew + 0.3, L.x1, 0, 3.3, 0.36, 0.7, M.navy); boxR(g, ew + 0.3, d0, 0, 3.3, 1.2, 1.5, M.navy); boxR(g, d1, L.x1, 0, 3.3, 1.2, 1.5, M.navy);
    boxR(g, ew + 0.3, L.x1, 0, 3.3, L.z1 - 0.3, L.z1, M.navy); boxR(g, L.x1 - 0.2, L.x1, 0, 3.3, 1.2, L.z1, M.navy);
    boxR(g, ew + 0.3, L.x1, 0.0, 0.14, 1.5, L.z1 - 0.3, M.stepGrey, { cast: false });
    boxR(g, ew - 0.5, ew + 0.3, 0.0, 0.07, op[0], op[1], M.stepGrey, { cast: false }); boxR(g, ew - 1.0, ew - 0.5, 0.0, 0.035, op[0], op[1], M.stepGrey, { cast: false });
    box(g, 8.0, 0.05, 0.05, M.violet, 34.0, 0.2, L.z1 - 0.35, { cast: false, recv: false });
    // помещения 1-го этажа под антресолью: гримёрные/склад (31, 33) и «второй зал» (43)
    var rm = G.ground;
    boxR(rm, 0.3, 8.9, 0, D.gY - 0.14, D.hallW, D.W - 0.3, M.white);
    boxR(rm, D.alc.x1, 29.4, 0, D.gY - 0.14, 15.1, D.W - 0.3, M.white);
    boxR(rm, 29.4, 36.5, 0, D.gY - 0.14, L.z1, D.W - 0.3, M.white);
    // тёмная облицовка фасада помещений со стороны зала
    boxR(rm, 0.3, 8.9, 0, D.gY - 0.2, D.hallW - 0.07, D.hallW, M.panelDark);
    boxR(rm, D.alc.x1, 29.4, 0, D.gY - 0.2, 15.1 - 0.07, 15.1, M.panelDark);
    boxR(rm, 29.4, 36.5, 0, D.gY - 0.2, L.z1 - 0.07 + 0.0, L.z1 + 0.02, M.panelDark);
    [[2.6, 0.9], [7.0, 0.9], [20.2, 1.0], [24.0, 1.0], [27.2, 1.0]].forEach(function (d) { boxR(rm, d[0], d[0] + d[1], 0, 2.15, (d[0] > 29 ? L.z1 : (d[0] < 9 ? D.hallW : 15.1)) - 0.09, (d[0] > 29 ? L.z1 : (d[0] < 9 ? D.hallW : 15.1)) + 0.02, M.black); });
    // боковые стены ниши бара: тёмный графит, на восточной — доска из старого дерева (по фото)
    boxR(rm, D.alc.x0, D.alc.x0 + 0.06, 0, D.gY - 0.2, D.hallW, D.W - 0.3, M.panelDark);
    boxR(rm, D.alc.x1 - 0.06, D.alc.x1, 0, D.gY - 0.2, 15.1, D.W - 0.3, M.panelDark);
    boxR(rm, D.alc.x1 - 0.1, D.alc.x1 - 0.06, 0.3, 2.5, 16.6, 20.6, M.woodFascia);
    boxR(g, D.alc.x0 - 0.0, D.alc.x0 + 0.0, 0, 0, 0, 0, M.white);
  }

  function curtain(x0, x1, y0, y1, depth) {
    var w = x1 - x0, h = y1 - y0, segs = Math.max(8, Math.round(w * 14));
    var geo = new T.PlaneGeometry(w, h, segs, 1), p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) { var px = p.getX(i); p.setZ(i, Math.sin(px * 22) * 0.07 + (p.getY(i) < 0 ? 0.015 : 0)); }
    geo.computeVertexNormals();
    var m = new T.Mesh(geo, M.curtain); m.position.set((x0 + x1) / 2, y0 + h / 2, depth); m.castShadow = true; winDecor.add(m);
  }

  /* ======================================================================
     КОЛОННЫ, БАЛКИ, ВОЗДУХОВОДЫ, СВЕТ ПОД ПОТОЛКОМ
     ====================================================================== */
  function buildStructure() {
    var g = G.beams, hz = D.hallW;
    D.colX.forEach(function (cx) { D.colZ.forEach(function (cz) {
      boxR(g, cx - 0.33, cx + 0.33, 0, D.H, cz - 0.23, cz + 0.23, M.white);
      boxR(g, cx - 0.37, cx + 0.37, 0, 0.12, cz - 0.27, cz + 0.27, M.white);
    }); });
    // тонкие стальные стойки антресоли
    D.posts.forEach(function (px) { boxR(g, px - 0.08, px + 0.08, 0, D.gY - 0.2, D.corr.z0 + 0.1, D.corr.z0 + 0.26, M.steel); });
    // главные балки по x (по линиям колонн) и поперечные
    D.colZ.forEach(function (z) { boxR(g, 0.3, D.hallL, D.H - 0.55, D.H - 0.05, z - 0.2, z + 0.2, M.white); });
    for (var bx = 2; bx < D.hallL - 0.5; bx += 3) boxR(g, bx - 0.12, bx + 0.12, D.H - 0.42, D.H - 0.05, 0.3, hz, M.white);
    // воздуховоды вдоль зала
    [3.2, 6.2].forEach(function (z, i) {
      var r = i === 0 ? 0.3 : 0.24, yy = D.H - 0.95;
      mesh(g, new T.CylinderGeometry(r, r, D.hallL - 1, 24), M.white, (D.hallL - 1) / 2 + 0.5, yy, z, { rz: Math.PI / 2 });
      for (var k = 1; k < 7; k++) mesh(g, new T.CylinderGeometry(r + 0.04, r + 0.04, 0.1, 24), M.white, k * 4, yy, z, { rz: Math.PI / 2, cast: false });
    });
    // линейные светильники рядами
    [3.4, 6.9, 10.4].forEach(function (z) {
      for (var x = 3; x < D.hallL - 1; x += 4.4) {
        box(g, 2.6, 0.05, 0.1, M.stripLed, x, D.H - 1.45, z, { cast: false, recv: false });
        box(g, 0.02, 0.5, 0.02, M.steel, x - 1.1, D.H - 1.2, z, { cast: false }); box(g, 0.02, 0.5, 0.02, M.steel, x + 1.1, D.H - 1.2, z, { cast: false });
      }
    });
    [[8.5, 4.8], [17.0, 7.4], [25.0, 4.8]].forEach(function (c) { box(g, 0.85, 0.14, 0.85, M.white, c[0], D.H - 0.12, c[1], { cast: false }); box(g, 0.6, 0.02, 0.6, M.black, c[0], D.H - 0.2, c[1], { cast: false }); });   // потолочные кассетные кондиционеры
    for (var tx = 4; tx < D.hallL - 1; tx += 3) [2.0, 13.8].forEach(function (z) { mesh(g, new T.CylinderGeometry(0.07, 0.1, 0.22, 10), M.black, tx, D.H - 0.55, z, { rx: 0.5 * (z < 7 ? 1 : -1), cast: false }); });
  }

  /* ======================================================================
     СЦЕНА 4,8 × 3,6 м, LED-ЭКРАН ~5,1 × 2,9 м, ФЕРМА, ЗВУК
     ====================================================================== */
  function buildStage() {
    var g = G.decor, s = D.stage, cz = (s.z0 + s.z1) / 2, sw = s.z1 - s.z0;
    // низкий подиум с чёрным ковролином; экран — тёмно-серая плоская стена без рамы (по фото)
    boxR(g, 0.3, s.x1, 0, s.h, s.z0, s.z1, M.stageTop);
    boxR(g, 0.3, s.x1 + 0.02, 0, s.h - 0.02, s.z0 - 0.02, s.z1 + 0.02, M.black);
    var ledW = 5.12, ledH = 2.95, ly = s.h + 0.12;
    mesh(g, new T.PlaneGeometry(ledW, ledH), M.led, 0.33, ly + ledH / 2, cz, { cast: false, recv: false, ry: Math.PI / 2 });
    // чёрный стол диджея/ведущего справа на подиуме
    box(g, 0.7, 0.8, 1.9, M.black, 2.7, s.h + 0.4, s.z1 - 1.3); box(g, 0.72, 0.04, 1.95, M.stageTop, 2.7, s.h + 0.82, s.z1 - 1.3);
    // подвесная ферма с «головами» перед экраном (к потолку, без стоек)
    var ty = D.H - 0.85;
    boxR(g, 1.9, 2.3, ty, ty + 0.4, s.z0 - 0.5, s.z1 + 0.5, M.steel); boxR(g, 1.9, 2.3, ty + 0.38, ty + 0.4, s.z0 - 0.5, s.z1 + 0.5, M.chrome);
    [s.z0 - 0.3, s.z1 + 0.3].forEach(function (z) { box(g, 0.03, 0.55, 0.03, M.steel, 2.1, D.H - 0.5, z, { cast: false }); });
    for (var i2 = 0; i2 < 6; i2++) { var lz = s.z0 + 0.3 + i2 * (sw - 0.6) / 5; mesh(g, new T.CylinderGeometry(0.1, 0.15, 0.34, 12), M.black, 2.1, ty - 0.15, lz, { rx: 0.45 * (lz < cz ? 1 : -1), cast: false }); }
    // два линейных массива по 4 кабинета, подвешены по краям экрана
    [s.z0 - 0.75, s.z1 + 0.75].forEach(function (z) {
      for (var k = 0; k < 4; k++) boxR(g, 0.6, 1.15, 4.95 - (k + 1) * 0.5, 4.95 - k * 0.5 - 0.02, z - 0.45, z + 0.45, M.black);
      box(g, 0.02, 0.6, 0.02, M.steel, 0.9, 5.25, z, { cast: false });
    });
    var cols = [0x55b5ff, 0xb066ff, 0xff7aa5, 0x55b5ff, 0xb066ff, 0xff9a55];
    for (i2 = 0; i2 < 6; i2++) {
      var bz = s.z0 + 0.3 + i2 * (sw - 0.6) / 5, cone = new T.Mesh(new T.ConeGeometry(0.95, 4.2, 20, 1, true), new T.MeshBasicMaterial({ color: cols[i2], transparent: true, opacity: 0.1, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
      cone.position.set(2.1 + 1.1, ty - 1.9, bz + (bz < cz ? -0.6 : 0.6)); cone.rotation.z = 0.5; cone.rotation.x = (bz < cz ? 0.18 : -0.18); G.lightEve.add(cone);
    }
  }

  /* ======================================================================
     ЛЮСТРА, ПАННО, ПАНЕЛИ, КАМИН
     ====================================================================== */
  function buildChandelier(x, y, z, sc) {
    var g = new T.Group(); g.position.set(x, y, z); g.scale.setScalar(sc || 1); G.decor.add(g);
    box(g, 0.02, 1.2, 0.02, M.steel, 0, 0.9, 0, { cast: false });
    for (var tier = 0; tier < 4; tier++) { var r = 0.9 - tier * 0.18, n = 16 - tier * 2; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; mesh(g, new T.OctahedronGeometry(0.07 + tier * 0.005, 0), M.crystal, Math.cos(a) * r, 0.1 - tier * 0.28, Math.sin(a) * r, { cast: false }); } }
    for (i = 0; i < 12; i++) mesh(g, new T.OctahedronGeometry(0.1, 0), M.crystal, rnd(-0.3, 0.3), -0.2 - i * 0.07, rnd(-0.3, 0.3), { cast: false });
    [[0, 0.35], [0.5, 0.15]].forEach(function (p) {
      var pts = [[-1.5, 0, -0.2], [1.5, 0.4, 0], [0.0, 0.1, 1.45], [-1.5, 0, -0.2]];
      for (var i = 0; i < 3; i++) { var a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        var tube = mesh(g, new T.CylinderGeometry(0.025, 0.025, len, 6), M.neon, (a[0] + b[0]) / 2, p[1] + (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, { cast: false, recv: false });
        tube.lookAt(new T.Vector3(b[0], p[1] + b[1], b[2])); tube.rotateX(Math.PI / 2); tube.position.set((a[0] + b[0]) / 2, p[1] + (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); }
    });
    var l = new T.PointLight(0xc9b8ff, 2.2, 18, 1.8); l.position.set(x, y - 0.5, z); G.lightEve.add(l);
  }
  function buildWallDecor() {
    var g = winDecor;
    // большое панно с листьями между окнами у сцены + малые картины
    box(g, 2.4, 2.4, 0.05, M.painting, 5.4, 2.6, 0.45, { cast: false }); boxR(g, 4.15, 6.65, 1.35, 3.85, 0.4, 0.43, M.frame, { cast: false });
    // светящиеся белые панели-силуэты между остальными окнами
    [11.35, 18.2].forEach(function (x) { box(g, 1.3, 3.5, 0.07, M.facet, x, 2.95, 0.42, { cast: false }); });
    // камин в простенке (22–25,3 м): тёмный корпус, деревянная колонна, плакат
    box(g, 1.7, 1.15, 0.5, M.fire, 23.65, 0.58, 0.7); box(g, 1.8, 0.08, 0.6, M.fire, 23.65, 1.18, 0.7);
    boxR(g, 23.2, 24.1, 1.2, D.H - 0.2, 0.38, 0.52, M.woodFascia); box(g, 0.8, 1.1, 0.05, M.poster, 22.6, 2.0, 0.42, { cast: false });
    // зелёное панно у проёма в welcome (восточная стена зала) и две картины
    box(G.decor, 0.05, 2.7, 2.3, M.painting, D.hallL - 0.03, 2.6, 4.9, { cast: false });
    box(G.decor, 0.05, 1.3, 0.9, M.painting, D.hallL - 0.03, 2.5, 6.9, { cast: false }); box(G.decor, 0.05, 1.0, 0.8, M.painting, D.hallL - 0.03, 2.0, 7.9, { cast: false });
    // белые панели-силуэты на стене рядом с проёмом
    box(G.decor, 0.06, 3.2, 1.2, M.facet, D.hallL - 0.04, 2.9, 1.7, { cast: false });
  }

  /* ======================================================================
     МЕБЕЛЬ И ДЕКОР
     ====================================================================== */
  function chesterfield(g, x, z, ry, w) {
    var gr = new T.Group(); gr.position.set(x, 0, z); gr.rotation.y = ry || 0; g.add(gr); w = w || 2.1;
    box(gr, w, 0.42, 0.9, M.leatherBlack, 0, 0.3, 0); box(gr, w, 0.62, 0.22, M.leatherBlack, 0, 0.72, -0.34);
    [-1, 1].forEach(function (s) { mesh(gr, new T.CylinderGeometry(0.2, 0.2, 0.9, 16), M.leatherBlack, s * (w / 2 - 0.1), 0.62, 0, { rx: Math.PI / 2 }); box(gr, 0.2, 0.62, 0.9, M.leatherBlack, s * (w / 2 - 0.1), 0.4, 0); });
    for (var i = 0; i < 6; i++) box(gr, 0.2, 0.2, 0.03, M.steel, -w / 2 + 0.4 + i * (w - 0.8) / 5, 0.78, -0.22, { cast: false });
    return gr;
  }
  function chesterTan(g, x, z, ry, w) { var gr = chesterfield(g, x, z, ry, w); gr.traverse(function (o) { if (o.isMesh && o.material === M.leatherBlack) o.material = M.leatherTan; }); return gr; }
  function channelSofa(g, x, z, ry) {
    var gr = new T.Group(); gr.position.set(x, 0, z); gr.rotation.y = ry || 0; g.add(gr);
    box(gr, 2.2, 0.5, 0.95, M.leatherTan, 0, 0.35, 0); box(gr, 2.2, 0.6, 0.3, M.leatherTan, 0, 0.78, -0.33);
    [-1, 1].forEach(function (s) { box(gr, 0.28, 0.62, 0.95, M.leatherTan, s * 1.1, 0.45, 0); });
    for (var i = 0; i < 9; i++) box(gr, 0.015, 0.5, 0.96, M.woodDark, -0.9 + i * 0.225, 0.4, 0, { cast: false });
  }
  function butterfly(g, x, z, ry, mat) {
    var gr = new T.Group(); gr.position.set(x, 0, z); gr.rotation.y = ry || 0; g.add(gr);
    box(gr, 0.7, 0.04, 0.7, mat || M.leatherBlack, 0, 0.42, 0.05, { rx: -0.2 }); box(gr, 0.7, 0.75, 0.04, mat || M.leatherBlack, 0, 0.78, -0.3, { rx: 0.25 });
    [-1, 1].forEach(function (s) { box(gr, 0.03, 0.6, 0.03, M.steel, s * 0.33, 0.28, 0.12, { rx: 0.1 }); box(gr, 0.03, 0.03, 0.7, M.steel, s * 0.33, 0.04, 0, { cast: false }); });
  }
  function coffeeTable(g, x, z, ry) {
    var gr = new T.Group(); gr.position.set(x, 0, z); gr.rotation.y = ry || 0; g.add(gr);
    box(gr, 1.3, 0.06, 0.65, M.woodDark, 0, 0.42, 0); [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { box(gr, 0.03, 0.4, 0.03, M.steel, a * 0.55, 0.2, b * 0.25, { rz: a * 0.2 }); }); });
  }
  function drawers(g, x, z, ry) {
    var gr = new T.Group(); gr.position.set(x, 0, z); gr.rotation.y = ry || 0; g.add(gr);
    box(gr, 2.2, 0.95, 0.45, M.drawers, 0, 0.7, 0); [-1, 1].forEach(function (s) { box(gr, 0.04, 0.25, 0.04, M.steel, s * 1.0, 0.12, 0, { cast: false }); });
    for (var r = 0; r < 4; r++) for (var c = 0; c < 8; c++) box(gr, 0.025, 0.025, 0.02, M.chrome, -0.9 + c * 0.26, 0.38 + r * 0.22, 0.23, { cast: false });
  }
  function brickCube(g, x, z, h, s) { h = h || 1.1; s = s || 0.55; return box(g, s, h, s, M.brick, x, h / 2, z); }
  function plant(g, x, z, scale, bamboo) {
    var gr = new T.Group(); gr.position.set(x, 0, z); gr.scale.setScalar(scale || 1); g.add(gr);
    mesh(gr, new T.CylinderGeometry(0.34, 0.26, 0.55, 12), M.pot, 0, 0.28, 0);
    if (bamboo) {
      for (var i = 0; i < 9; i++) { var a = i * 0.7, r = 0.1 + sr() * 0.12, h = 1.8 + sr() * 0.8; mesh(gr, new T.CylinderGeometry(0.018, 0.022, h, 6), M.stem, Math.cos(a) * r, 0.5 + h / 2, Math.sin(a) * r, { rz: (sr() - 0.5) * 0.12, cast: false });
        for (var k = 0; k < 4; k++) mesh(gr, new T.SphereGeometry(0.28, 8, 6), M.leafG2, Math.cos(a) * r + (sr() - 0.5) * 0.3, 0.9 + h - k * 0.35, Math.sin(a) * r + (sr() - 0.5) * 0.3, { cast: false }).scale.set(1, 0.45, 0.6); }
    } else {
      for (i = 0; i < 11; i++) { var an = i / 11 * Math.PI * 2, tilt = 0.25 + sr() * 0.55, len = 1.0 + sr() * 0.8; var pv = new T.Group(); pv.rotation.y = an; pv.rotation.z = -tilt; gr.add(pv); pv.position.y = 0.5;
        var leaf = mesh(pv, new T.SphereGeometry(0.5, 10, 6), i % 2 ? M.leafG : M.leafG2, 0, len * 0.55, 0, { cast: false }); leaf.scale.set(0.16, len * 0.62, 0.045); }
    }
  }
  function cocktail(g, x, z) {   // круглый стол с мраморной столешницей на чёрной треноге
    mesh(g, new T.CylinderGeometry(0.4, 0.4, 0.04, 22), M.marble, x, 1.1, z); mesh(g, new T.CylinderGeometry(0.03, 0.04, 1.08, 8), M.steel, x, 0.54, z, { cast: false });
    mesh(g, new T.CylinderGeometry(0.28, 0.28, 0.025, 16), M.marble, x, 0.4, z, { cast: false });
  }
  function floorLamp(g, x, y, z) { box(g, 0.03, 1.5, 0.03, M.steel, x, y + 0.75, z, { cast: false }); mesh(g, new T.CylinderGeometry(0.2, 0.3, 0.38, 14), M.black, x, y + 1.6, z, { cast: false }); }
  function buildFurniture() {
    var g = G.decor, L = G.lounge;
    // лаунж у окон ближе к сцене: коричневый диван, кресла-«бабочки», зелёный комод-картотека, персидский ковёр
    channelSofa(g, 7.2, 1.45, 0); butterfly(g, 4.5, 2.7, -0.5, M.leatherBlack); butterfly(g, 9.0, 2.6, 0.7, M.leatherTan); coffeeTable(g, 7.2, 2.8, 0);
    chesterfield(g, 4.6, 3.6, Math.PI / 2, 1.6);
    drawers(g, 4.6, 0.75, 0); plant(g, 3.0, 1.2, 1.05); plant(g, 10.6, 1.0, 1.1, true);
    box(g, 4.4, 0.02, 3.0, M.persian, 7.0, 0.01, 3.3, { cast: false });
    // лаунж у камина ближе ко входу (убирается под банкет, фуршет и конференцию)
    chesterTan(L, 23.65, 3.6, Math.PI, 2.3); butterfly(L, 21.6, 2.4, 0.5, M.leatherBlack); butterfly(L, 25.7, 2.4, -0.5, M.leatherBlack); coffeeTable(L, 23.65, 2.3, 0);
    chesterfield(L, 19.2, 1.5, 0); chesterfield(L, 28.2, 1.5, 0, 1.9);
    brickCube(L, 20.9, 1.6, 0.42, 0.7); brickCube(L, 26.4, 1.5, 0.42, 0.7);
    plant(L, 18.4, 1.0, 1.2); box(L, 4.2, 0.02, 3.0, M.rug, 23.2, 0.012, 3.1, { cast: false });
    // белые кирпичные кубы-пьедесталы в пустом зале и на фуршете
    var cubes = [[12.8, 4.8], [14.6, 9.2], [17.0, 4.0], [19.8, 8.4], [22.0, 12.8], [27.5, 11.8], [10.2, 11.5]];
    cubes.forEach(function (c, i) { var hh = i % 3 === 0 ? 0.55 : 1.1; brickCube(G.fmt.empty, c[0], c[1], hh, 0.55); brickCube(G.fmt.buffet, c[0], c[1], hh, 0.55); });
    plant(G.fmt.empty, 15.5, 6.0, 1.2); plant(G.fmt.buffet, 15.5, 6.0, 1.2);
    // стационарный бар в нише под вторым светом: тёмная стойка, полки с бокалами, тёплая подсветка
    var bz = D.W - 1.4, bx0 = D.alc.x0 + 1.0, bx1 = D.alc.x1 - 1.0;
    box(g, bx1 - bx0, 1.05, 0.7, M.barDark, (bx0 + bx1) / 2, 0.52, bz); box(g, bx1 - bx0 + 0.1, 0.05, 0.85, M.barTop, (bx0 + bx1) / 2, 1.08, bz);
    boxR(g, bx0 + 0.2, bx1 - 0.2, 1.3, 3.2, D.W - 0.7, D.W - 0.35, M.shelf); box(g, bx1 - bx0 - 0.6, 0.04, 0.3, M.glassClear, (bx0 + bx1) / 2, 1.9, D.W - 0.55, { cast: false }); box(g, bx1 - bx0 - 0.6, 0.04, 0.3, M.glassClear, (bx0 + bx1) / 2, 2.5, D.W - 0.55, { cast: false });
    box(g, 3.5, 0.9, 0.7, M.quilt, 12.0, 0.45, D.W - 3.4); box(g, 3.6, 0.04, 0.8, M.white, 12.0, 0.92, D.W - 3.4);
    box(g, 3.5, 0.9, 0.7, M.quilt, 15.0, 0.45, D.W - 3.4); box(g, 3.6, 0.04, 0.8, M.white, 15.0, 0.92, D.W - 3.4);
    for (var i = 0; i < 4; i++) cocktail(g, 11.0 + i * 1.8, D.W - 5.4);
    // волнистый светильник над баром (цепочка светящихся сегментов)
    for (i = 0; i < 24; i++) { var tx = D.alc.x0 + 1.2 + i * 0.3; box(g, 0.32, 0.06, 0.08, M.stripLed, tx, D.H - 1.2 + Math.sin(i * 0.7) * 0.25, D.W - 2.2 + Math.cos(i * 0.7) * 0.1, { cast: false, recv: false, rz: Math.cos(i * 0.7) * 0.5 }); }
    // welcome-зона: красные картины, коричневый честерфилд на светлой ступени, бамбук, зеркало
    var er = G.decor, Lb = D.lobby;
    box(er, 1.9, 1.3, 0.04, M.frame, 33.0, 2.0, Lb.z1 - 0.34, { cast: false }); box(er, 1.75, 1.15, 0.03, M.dish, 33.0, 2.0, Lb.z1 - 0.37, { cast: false });
    box(er, 1.9, 1.3, 0.04, M.frame, 36.0, 2.0, Lb.z1 - 0.34, { cast: false }); box(er, 1.75, 1.15, 0.03, M.dishDark, 36.0, 2.0, Lb.z1 - 0.37, { cast: false });
    chesterTan(er, 34.5, Lb.z1 - 1.2, Math.PI, 2.2).position.y = 0.14;
    plant(er, 31.6, Lb.z1 - 1.0, 1.1, true); plant(er, 38.0, 3.2, 1.0, true);
    box(er, 0.05, 1.9, 0.9, M.mirror, 38.7, 1.5, 6.8, { cast: false });
    var pl = new T.PointLight(0xb056ff, 2.2, 8, 1.9); pl.position.set(34.5, 0.9, 6.5); G.lightEve.add(pl);
  }

  /* ======================================================================
     ВТОРОЙ УРОВЕНЬ по плану БТИ: коридор-балкон 90 м², мостик в зал, 2 лестницы,
     «второй зал» 133 м², гримёрные 39 и 17 м², второй свет над баром
     ====================================================================== */
  function railing(g, x0, x1, z, axis) {
    var y0 = D.gY + 0.0, h = 1.05, len = x1 - x0, bays = Math.max(1, Math.round(len / 2.4)), step = len / bays;
    var pos = function (t) { return axis === 'x' ? [x0 + t, z] : [z, x0 + t]; };
    for (var i = 0; i <= bays; i++) { var p = pos(i * step); box(g, 0.06, h, 0.06, M.steel, p[0], y0 + h / 2, p[1]); }
    var mid = pos(len / 2), sx = axis === 'x' ? len : 0.05, sz = axis === 'x' ? 0.05 : len;
    box(g, axis === 'x' ? len : 0.07, 0.07, axis === 'x' ? 0.07 : len, M.steel, mid[0], y0 + h, mid[1]);
    [0.25, 0.5, 0.75].forEach(function (f) { box(g, sx, 0.04, sz, M.steel, mid[0], y0 + h * f, mid[1], { cast: false }); });
  }
  function slab(g, x0, x1, z0, z1) {
    boxR(g, x0, x1, D.gY - 0.28, D.gY - 0.02, z0, z1, M.soffit, { cast: false });
    return boxR(g, x0, x1, D.gY - 0.02, D.gY, z0, z1, M.woodFloor, { recv: true });
  }
  function glassWall(g, x0, x1, z, doors) {   // стеклянная перегородка с чёрными профилями и дверями
    var y = D.gY, n = Math.max(2, Math.round((x1 - x0) / 1.3)), step = (x1 - x0) / n;
    box(g, x1 - x0, D.H - 0.1 - y, 0.04, M.glassPane, (x0 + x1) / 2, (y + D.H - 0.1) / 2, z, { cast: false });
    for (var i = 0; i <= n; i++) boxR(g, x0 + i * step - 0.03, x0 + i * step + 0.03, y, D.H - 0.1, z - 0.06, z + 0.06, M.steel);
    boxR(g, x0, x1, D.H - 0.16, D.H - 0.1, z - 0.06, z + 0.06, M.steel); boxR(g, x0, x1, y, y + 0.06, z - 0.06, z + 0.06, M.steel);
    (doors || []).forEach(function (dx) { boxR(g, dx, dx + 0.9, y, y + 2.1, z - 0.07, z + 0.07, M.black); boxR(g, dx - 0.04, dx + 0.94, y + 2.1, y + 2.16, z - 0.08, z + 0.08, M.steel); box(g, 0.04, 0.5, 0.05, M.chrome, dx + 0.8, y + 1.0, z - 0.1, { cast: false }); });
  }
  function buildUpper() {
    var g = G.upper, y = D.gY, c = D.corr, st = D.stub, W3 = D.W - 0.3;
    // коридор-балкон 30,1 × 2,4 м и мостик 5,4 × 3,2 м в зал
    slab(g, 0.3, c.x1, c.z0, c.z1); slab(g, st.x0, st.x1, st.z0, c.z0);
    box(g, c.x1 - 0.3, 0.55, 0.14, M.woodFascia, (0.3 + c.x1) / 2, y - 0.2, c.z0 - 0.03);
    box(g, st.x1 - st.x0, 0.55, 0.14, M.woodFascia, (st.x0 + st.x1) / 2, y - 0.2, st.z0 - 0.03); [st.x0, st.x1].forEach(function (x) { box(g, 0.14, 0.55, c.z0 - st.z0, M.woodFascia, x, y - 0.2, (st.z0 + c.z0) / 2); });
    // ограждение: вдоль зала (с проёмами у лестниц и мостика), вокруг мостика, и над нишей бара
    var gaps = [[D.stairs[0].x0 - 0.1, D.stairs[0].x1 + 0.1], [st.x0, st.x1], [D.stairs[1].x0 - 0.1, D.stairs[1].x1 + 0.1]], px = 0.3;
    gaps.forEach(function (gp) { railing(g, px, gp[0], c.z0 + 0.04, 'x'); px = gp[1]; });
    railing(g, px, c.x1, c.z0 + 0.04, 'x');
    railing(g, st.x0, st.x1, st.z0 + 0.04, 'x'); railing(g, st.z0, c.z0, st.x0 + 0.04, 'z'); railing(g, st.z0, c.z0, st.x1 - 0.04, 'z');
    railing(g, D.alc.x0, D.alc.x1, c.z1 - 0.04, 'x');
    // торец коридора: бирюзовая керамическая стена
    box(g, 0.1, 2.6, c.z1 - c.z0, M.mosaic, 0.4, y + 1.3, (c.z0 + c.z1) / 2);
    // гримёрные 42 (39 м²) и 43 (17 м²): стеклянная перегородка с дверями, тёмный пол
    slab(g, 0.3, 8.9, c.z1, W3).material = M.floorDark;
    glassWall(g, 0.3, 8.9, c.z1, [2.6, 7.0]);
    boxR(g, 6.1, 6.16, y, D.H - 0.1, c.z1, W3, M.white, { cast: false }); boxR(g, 8.9, 8.96, y, D.H - 0.1, c.z1, W3, M.panelDark, { cast: false });
    box(g, 0.05, 1.7, 0.7, M.mirror, 0.4, y + 1.0, 17.6, { cast: false });
    // «второй зал» 133 м²: паркет «ёлочкой», стекло к коридору, ТВ 86", диваны, караоке
    slab(g, D.alc.x1, c.x1, c.z1, W3).material = M.parquet; slab(g, c.x1, 36.5, c.z0, W3).material = M.parquet;
    glassWall(g, D.alc.x1, c.x1, c.z1, [20.4, 25.6]);
    boxR(g, D.alc.x1, D.alc.x1 + 0.06, y, D.H - 0.1, c.z1, W3, M.panelDark, { cast: false });
    boxR(g, c.x1, 36.5, y, D.H - 0.1, c.z0, c.z0 + 0.06, M.white, { cast: false }); boxR(g, 36.44, 36.5, y, D.H - 0.1, c.z0, W3, M.white, { cast: false });
    var R = new T.Group(); R.position.y = y; g.add(R);
    box(R, 0.06, 1.15, 1.95, M.black, 36.35, 1.15, 18.8, { cast: false }); box(R, 0.02, 1.05, 1.85, M.tvOn, 36.31, 1.15, 18.8, { cast: false });
    box(R, 0.04, 0.9, 0.4, M.black, 36.3, 0.45, 16.4); box(R, 0.04, 0.9, 0.4, M.black, 36.3, 0.45, 21.0);
    var sofa1 = chesterfield(R, 27.0, 16.0, 0, 2.3), sofa2 = chesterfield(R, 27.0, 20.7, Math.PI, 2.3), sofa3 = chesterfield(R, 33.2, 18.8, -Math.PI / 2, 2.3);
    [sofa1, sofa2, sofa3].forEach(function (s) { s.traverse(function (o) { if (o.isMesh && o.material === M.leatherBlack) o.material = M.leatherGreen; }); });
    coffeeTable(R, 27.0, 18.3, 0); coffeeTable(R, 31.2, 18.8, Math.PI / 2);
    [[22.4, 21.2], [30.0, 21.2]].forEach(function (p) { box(R, 0.9, 1.7, 0.35, M.shelfArch, p[0], 0.85, p[1]); floorLamp(R, p[0] + 0.9, 0, p[1]); });
    for (var i = 0; i < 5; i++) box(R, 0.9, 0.04, 0.08, M.stripLed, 20 + i * 3.4, D.H - y - 0.3, c.z1 + 0.4, { cast: false, recv: false });
    // балкон: серые ковры, подвесные кашпо, два столика на мостике
    box(g, 3.2, 0.02, 1.8, M.rug, 22.5, y + 0.012, 13.6, { cast: false }); box(g, 3.2, 0.02, 1.8, M.rug, 4.0, y + 0.012, 13.6, { cast: false });
    for (i = 0; i < 9; i++) { var hx = 2.5 + i * 3.3, hang = new T.Group(); hang.position.set(hx, D.H - 0.9, c.z0 + 0.5); g.add(hang);
      box(hang, 0.012, 0.9, 0.012, M.steel, 0, 0.45, 0, { cast: false }); mesh(hang, new T.CylinderGeometry(0.22, 0.14, 0.2, 10), M.black, 0, 0, 0);
      for (var k = 0; k < 6; k++) { var lf = mesh(hang, new T.SphereGeometry(0.18, 8, 6), M.leafG2, rnd(-0.18, 0.18), -0.1 - sr() * 0.55, rnd(-0.18, 0.18), { cast: false }); lf.scale.set(0.5, 1.6, 0.4); } }
    [[14.0, 10.8], [15.5, 11.4]].forEach(function (p) { mesh(g, new T.CylinderGeometry(0.4, 0.4, 0.04, 20), M.marbleDark, p[0], y + 0.72, p[1]); mesh(g, new T.CylinderGeometry(0.03, 0.04, 0.7, 8), M.steel, p[0], y + 0.36, p[1], { cast: false }); });
    for (i = 0; i < 8; i++) box(g, 0.9, 0.04, 0.08, M.stripLed, 2.5 + i * 3.6, D.H - 0.2, (c.z0 + c.z1) / 2, { cast: false, recv: false });
    buildStair(g, D.stairs[0]); buildStair(g, D.stairs[1]);
    buildChandelier(14.7, D.H - 1.1, 7.2, 0.85);
  }
  function buildStair(g, s) {   // прямой марш по оси z: из зала на балкон; ферма из чёрной стали, деревянные ступени
    var steps = 16, z0 = D.stairZ0, z1 = D.corr.z0, sw = s.x1 - s.x0, cx = (s.x0 + s.x1) / 2, rise = D.gY / steps, run = (z1 - z0) / steps;
    for (var i = 0; i < steps; i++) { var zs = z0 + i * run, ys = rise * (i + 1); boxR(g, s.x0, s.x1, ys - 0.06, ys, zs, zs + run + 0.02, M.woodDark); }
    var len = Math.sqrt((z1 - z0) * (z1 - z0) + D.gY * D.gY), ang = Math.atan2(D.gY, z1 - z0);
    [s.x0 - 0.04, s.x1 + 0.04].forEach(function (x) {
      var str = box(g, 0.07, 0.3, len, M.steelPurple, x, D.gY / 2 - 0.12, (z0 + z1) / 2); str.rotation.x = -ang;
      var rail = box(g, 0.06, 0.06, len, M.steel, x, D.gY / 2 + 0.95, (z0 + z1) / 2); rail.rotation.x = -ang;
      for (var k = 0; k <= 8; k++) { var t = k / 8, pz = z0 + (z1 - z0) * t, py = D.gY * t;
        box(g, 0.05, 1.05, 0.05, M.steel, x, py + 0.5, pz);
        if (k < 8) { var dg = box(g, 0.04, 1.15, 0.04, M.steelPurple, x, py + D.gY / 16 + 0.45, pz + (z1 - z0) / 16, { cast: false }); dg.rotation.x = (k % 2 ? -1 : 1) * 0.6; } }
    });
  }

  /* ======================================================================
     ФОРМАТЫ РАССАДКИ (до 300 / до 200 / до 300 гостей)
     ====================================================================== */
  function instanced(g, geo, mat, mats, cast) {
    var im = new T.InstancedMesh(geo, mat, mats.length); var d = new T.Object3D();
    mats.forEach(function (m, i) { d.position.set(m.x, m.y, m.z); d.rotation.set(m.rx || 0, m.ry || 0, 0); d.scale.set(m.sx || 1, m.sy || 1, m.sz || 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.castShadow = !!cast; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; g.add(im); return im;
  }
  function chairsAt(g, list, cushions) {
    var seat = [], back = [], seatA = [], seatB = [];
    list = list.filter(function (c) { return !nearCol(c.x, c.z, 0.2); });
    list.forEach(function (c, i) {
      var s = Math.sin(c.ry || 0), co = Math.cos(c.ry || 0), it = { x: c.x, y: 0.45, z: c.z, ry: c.ry };
      (cushions ? (i % 2 ? seatA : seatB) : seat).push(it); back.push({ x: c.x - s * 0.19, y: 0.72, z: c.z - co * 0.19, ry: c.ry });
    });
    var all = seat.concat(seatA, seatB);
    if (cushions) { instanced(g, boxGeo(0.4, 0.06, 0.4), M.cushionYellow, seatA, true); instanced(g, boxGeo(0.4, 0.06, 0.4), M.cushionNavy, seatB, true); } else instanced(g, boxGeo(0.4, 0.05, 0.4), M.chairSeat, seat, true);
    instanced(g, boxGeo(0.4, 0.46, 0.04), M.chair, back, true);
    instanced(g, boxGeo(0.34, 0.45, 0.34), M.chair, all.map(function (s) { return { x: s.x, y: 0.225, z: s.z, ry: s.ry, sx: 0.12, sz: 0.12 }; }), false);
  }
  function buildFormats() {
    // --- банкет: 20 круглых столов по 10 мест = 200 ---
    var gB = G.fmt.banquet, tabs = [], chairs = [], xs = [9.9, 15.0, 20.8, 26.2], zs = [1.9, 4.6, 7.3, 10.0, 12.7];
    xs.forEach(function (tx) { zs.forEach(function (tz) { tabs.push({ x: tx, z: tz });
      for (var k = 0; k < 10; k++) { var a = k / 10 * Math.PI * 2; chairs.push({ x: tx + Math.cos(a) * 1.28, z: tz + Math.sin(a) * 1.28, ry: -a - Math.PI / 2 }); } }); });
    instanced(gB, new T.CylinderGeometry(0.9, 0.9, 0.04, 28), M.white, tabs.map(function (t) { return { x: t.x, y: 0.76, z: t.z }; }), true);
    instanced(gB, new T.CylinderGeometry(0.95, 0.95, 0.74, 28), M.cloth, tabs.map(function (t) { return { x: t.x, y: 0.37, z: t.z }; }), true);
    instanced(gB, new T.CylinderGeometry(0.17, 0.17, 0.05, 12), M.dish, tabs.map(function (t) { return { x: t.x, y: 0.8, z: t.z }; }), false);
    chairsAt(gB, chairs, false);
    // --- конференция: 20 рядов × 15 = 300, проход по центру, жёлтые и синие подушки ---
    var gT = G.fmt.theatre, rows = [];
    for (var i = 0; i < 20; i++) for (var k = 0; k < 15; k++) { var zz = k < 8 ? 1.0 + k * 0.78 : 7.9 + (k - 8) * 0.78; rows.push({ x: 11.0 + i * 0.85, z: zz, ry: -Math.PI / 2 }); }
    chairsAt(gT, rows, true);
    box(gT, 0.5, 1.1, 0.5, M.black, 5.2, D.stage.h + 0.55, 5.8); box(gT, 1.0, 0.04, 3.2, M.black, 2.4, D.stage.h + 0.75, 8.6); [7.2, 9.6].forEach(function (z) { box(gT, 0.04, 0.72, 0.04, M.steel, 2.4, D.stage.h + 0.38, z); });
    // --- фуршет: коктейльные столы на мраморных столешницах, две линии подачи ---
    var gF = G.fmt.buffet, ct = [];
    for (i = 0; i < 8; i++) for (var j = 0; j < 5; j++) { var cx = 10.6 + i * 2.35, cz = 2.2 + j * 2.5; if (nearCol(cx, cz, 0.55)) continue; if (cx > 17.2 && cx < 24 && cz > 5.6 && cz < 8.2) continue; ct.push({ x: cx, z: cz }); }
    instanced(gF, new T.CylinderGeometry(0.4, 0.4, 0.04, 22), M.marble, ct.map(function (t) { return { x: t.x, y: 1.1, z: t.z }; }), true);
    instanced(gF, new T.CylinderGeometry(0.03, 0.04, 1.08, 8), M.steel, ct.map(function (t) { return { x: t.x, y: 0.54, z: t.z }; }), false);
    [[19.0, 6.9], [22.4, 6.9]].forEach(function (p) { box(gF, 3.0, 0.9, 0.8, M.quilt, p[0], 0.45, p[1]); box(gF, 3.1, 0.04, 0.9, M.white, p[0], 0.92, p[1]); for (var q = 0; q < 5; q++) box(gF, 0.35, 0.1, 0.35, M.dish, p[0] - 1.1 + q * 0.55, 0.99, p[1], { cast: false }); });
  }

  /* ======================================================================
     СВЕТ
     ====================================================================== */
  function buildLights() {
    var hemiDay = new T.HemisphereLight(0xdfeaff, 0x8a8372, 0.5); G.lightDay.add(hemiDay);
    var sun = new T.DirectionalLight(0xfff0d8, 1.25); sun.position.set(-16, 30, -26); sun.target.position.set(22, 0, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(COARSE ? 1024 : 2048, COARSE ? 1024 : 2048); var sc = sun.shadow.camera; sc.left = -36; sc.right = 36; sc.top = 36; sc.bottom = -36; sc.near = 1; sc.far = 100; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
    G.lightDay.add(sun); G.lightDay.add(sun.target);
    var fill = new T.PointLight(0xfff4e6, 0.45, 40, 1.4); fill.position.set(15, 5.0, 7.5); G.lightDay.add(fill);
    var hemiEve = new T.HemisphereLight(0x3d4466, 0x14100e, 0.2); G.lightEve.add(hemiEve);
    var moon = new T.DirectionalLight(0x6f86d8, 0.22); moon.position.set(-10, 20, -20); G.lightEve.add(moon);
    [[8, 4.8, 8], [15, 4.8, 8], [22, 4.8, 8], [28, 4.6, 7]].forEach(function (p) { var l = new T.PointLight(0xffc790, 1.25, 14, 1.8); l.position.set(p[0], p[1], p[2]); G.lightEve.add(l); });
    var led = new T.PointLight(0x4a8cff, 3.4, 14, 1.8); led.position.set(2.8, 2.6, 7.4); G.lightEve.add(led);
    var lounge = new T.PointLight(0xffb070, 1.5, 11, 1.8); lounge.position.set(23, 1.6, 3.2); G.lightEve.add(lounge);
    var bar = new T.PointLight(0x4ad0d0, 1.2, 10, 1.7); bar.position.set(13, 3.0, 19.5); G.lightEve.add(bar);
    var gal = new T.PointLight(0xffd7a0, 1.6, 13, 1.7); gal.position.set(15, D.gY + 1.6, 13.6); G.lightEve.add(gal);
    var vip = new T.PointLight(0xff7a9a, 1.8, 12, 1.7); vip.position.set(28, D.gY + 1.6, 18); G.lightEve.add(vip);
  }

  /* ======================================================================
     СБОРКА
     ====================================================================== */
  buildShell(); buildStructure(); buildStage(); buildChandelier(18.0, D.H - 1.0, 7.4, 1.0); buildWallDecor(); buildFurniture(); buildUpper(); buildFormats(); buildLights();

  /* ======================================================================
     РЕЖИМЫ И ИНТЕРФЕЙС
     ====================================================================== */
  var state = { mode: 'evening', level: 'both', fmt: 'empty', zone: 0, auto: true };
  var FMT = {
    empty: { name: 'Пустой зал', cap: 'Зал без расстановки: сцена, лаунж, декор на месте', note: '' },
    buffet: { name: 'Фуршет', cap: 'Фуршет — до 300 гостей', note: 'На схеме: коктейльные столы, 2 линии подачи; стационарный бар в нише' },
    banquet: { name: 'Банкет', cap: 'Банкет — до 200 гостей', note: 'На схеме: 20 круглых столов по 10 мест' },
    theatre: { name: 'Конференция', cap: 'Конференция — до 300 гостей', note: 'На схеме: 20 рядов по 15 мест. В аренду входят 170 стульев' }
  };
  var ZONES = [
    { id: 'entry', t: 'Вход и welcome-зона', lvl: 'both', img: BASE + 'assets/zones/entry.webp', p: [34.5, 2.6, 7], cam: [25.6, 1.7, 6.4], tg: [33.0, 1.4, 12.0],
      s: 'Со двора гости попадают в тёмную welcome-зону с подсветкой и картинами, дальше через проём выходят в зал. Здесь же гардероб и туалеты.', f: ['Отдельный вход со стороны двора', 'Гардероб и туалетные блоки', 'Welcome-зона 46,8 м² по плану БТИ'] },
    { id: 'hall', t: 'Главный зал, 428 м²', lvl: 'both', img: BASE + 'assets/zones/hall.webp', p: [15, 3.6, 5], cam: [32, 12.5, -11], tg: [15, 1.2, 8],
      s: 'Длинный зал: полированный бетон серо-бежевого оттенка, белые колонны и балки, пять больших окон с тёмными шторами. Расстановку можно менять: фуршет, банкет, конференция.', f: ['Потолки 5,4 м', 'Фуршет и конференция — до 300 гостей', 'Банкет — до 200 гостей'] },
    { id: 'stage', t: 'Сцена и LED-экран', lvl: 'both', img: BASE + 'assets/zones/stage.webp', p: [2.2, 3.5, 7.4], cam: [19, 3.0, 7.4], tg: [1.5, 2.2, 7.4],
      s: 'Сцена 4,8 × 3,6 м, светодиодный экран около 5,1 × 2,9 м, линейные массивы NEXO, ферма с приборами. Вечером экран и лучи работают как главный фон.', f: ['Сцена-подиум 4,8 × 3,6 м', 'LED-экран, звук и свет площадки', 'Цифровой микшер, 4 микрофона'] },
    { id: 'lounge', t: 'Лаунж у окон', lvl: 'both', img: BASE + 'assets/zones/lounge.webp', p: [23.6, 2.2, 3.6], cam: [18.2, 2.3, 9.4], tg: [23.6, 1.0, 2.0],
      s: 'Кожаные честерфилды, камин, кресла-бабочки, ковры и зелёный комод-картотека у больших окон. Днём свет от окон, вечером тёплая подсветка стен.', f: ['6 чёрных диванов, 2 коричневых, кресла', 'Камин и ковры', 'Входит в аренду зала'] },
    { id: 'bar', t: 'Бар и фуршетная зона', lvl: 'both', img: BASE + 'assets/zones/bar.webp', p: [13.4, 3.6, 19.4], cam: [13.4, 7.2, 7.5], tg: [13.4, 1.5, 19.6],
      s: 'Стационарный бар в нише с двойной высотой: тёмная стойка, полки с бокалами, патинированная бирюзовая стена и волнистый светильник. Рядом линии подачи для фуршета.', f: ['Стационарный бар', '10 мраморных коктейльных столов', 'Кейтеринг 3F — партнёр площадки'] },
    { id: 'balcony', t: 'Балкон 2-го уровня и лестницы', lvl: 'both', img: BASE + 'assets/zones/balcony.webp', p: [10, D.gY + 1.5, 13.6], cam: [27, 6.8, 5.0], tg: [10, 3.4, 13.6],
      s: 'Коридор-балкон 30 м вдоль зала, мостик, две стальные лестницы с деревянными ступенями и вид сверху на сцену и весь зал. На торце бирюзовая керамическая стена.', f: ['Балкон и мостик — 90 м²', 'Две лестницы из зала', 'Вид сверху на сцену'] },
    { id: 'vip', t: 'Второй зал и VIP, 2 этаж', lvl: 'both', img: BASE + 'assets/zones/vip.webp', p: [27, D.gY + 1.8, 18.4], cam: [24, 7.4, 5.0], tg: [27, 3.4, 18.8],
      s: 'Светлый зал 133 м² с паркетом «ёлочкой» над помещением 1 этажа: кожаные диваны, ТВ 86 дюймов, караоке и подсветка. Для VIP, отдыха и небольших мероприятий.', f: ['133 м² по плану БТИ', 'Караоке AST-Zoom2, ТВ 86 дюймов', 'Стеклянная перегородка к балкону'] },
    { id: 'dress', t: 'Гримёрные', lvl: 'both', img: BASE + 'assets/zones/dress.webp', p: [4.0, D.gY + 1.6, 18.0], cam: [10, 7.0, 5.5], tg: [4, 3.5, 17.5],
      s: 'Две комнаты 39 и 17 м² за стеклянной перегородкой на балконе. Подходят для команды, артистов и хранения вещей.', f: ['Гримёрки для команды', '39 м² и 17 м²', 'Стеклянные двери на балкон'] }
  ];
  var VIEW0 = { cam: [34, 27, -28], tg: [20, 1.0, 10.5] };

  /* день / вечер */
  function applyMode(m) {
    state.mode = m; var day = m === 'day';
    G.lightDay.visible = day; G.lightEve.visible = !day;
    renderer.toneMappingExposure = day ? 0.85 : 0.82;
    emissives.forEach(function (e) { e.m.emissiveIntensity = day ? e.day : e.eve; e.m.emissive.setHex(day ? e.dayColor : e.eveColor); });
    M.led.map = day ? null : TX.led; M.led.color.setHex(day ? 0x070708 : 0xffffff); M.led.needsUpdate = true;
    M.stripLed.color.setHex(day ? 0xdddddd : 0xffffff);
    M.neon.color.setHex(day ? 0xdcd5ea : 0xf3eaff);
    M.grass.color.setHex(day ? 0xc9c6bc : 0x24232a);
    renderer.shadowMap.needsUpdate = true;
    (document.querySelector('.t3') || document.body).setAttribute('data-mode', m);
    $$('button[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === m ? 'true' : 'false'); });
  }
  /* этаж */
  function applyLevel(l) {
    state.level = l;
    G.upper.visible = l !== '1';
    G.ground.visible = l !== '2'; G.decor.visible = l !== '2'; G.fmt.empty.visible = false;
    ['empty', 'buffet', 'banquet', 'theatre'].forEach(function (k) { G.fmt[k].visible = state.fmt === k && l !== '2'; });
    G.lounge.visible = state.fmt === 'empty' && l !== '2';
    $$('[data-level]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-level') === l ? 'true' : 'false'); });
  }
  function applyFmt(f) {
    state.fmt = f; applyLevel(state.level);
    var i = FMT[f]; $('#fmtCap').textContent = i.cap; $('#fmtNote').textContent = i.note;
    $$('[data-fmt]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-fmt') === f ? 'true' : 'false'); });
  }

  /* зоны */
  var hot = $('#hots'), hotEls = [];
  ZONES.forEach(function (z, i) {
    var b = document.createElement('button'); b.className = 'hot'; b.type = 'button'; b.innerHTML = '<i>' + (i + 1) + '</i><span>' + z.t + '</span>';
    b.addEventListener('click', function () { goZone(i); }); hot.appendChild(b); hotEls.push(b);
  });
  var tabs = $('#zoneTabs');
  ZONES.forEach(function (z, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = i + 1; b.setAttribute('aria-label', z.t); b.addEventListener('click', function () { goZone(i); }); tabs.appendChild(b); });
  function showZone(i) {
    state.zone = i; var z = ZONES[i];
    $('#zIdx').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(ZONES.length).padStart(2, '0');
    $('#zTitle').textContent = z.t; $('#zText').textContent = z.s; $('#zImg').src = z.img; $('#zImg').alt = z.t;
    var f = $('#zFacts'); f.innerHTML = ''; z.f.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; f.appendChild(li); });
    $$('#zoneTabs button').forEach(function (b, k) { b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    hotEls.forEach(function (h, k) { h.classList.toggle('on', k === i); });
  }
  var tween = null;
  function flyTo(cam, tg, ms) {
    var c0 = camera.position.clone(), t0 = controls.target.clone(), c1 = new T.Vector3().fromArray(zf(cam)), t1 = new T.Vector3().fromArray(zf(tg)), t = 0, dur = ms || 1400;
    tween = { c0: c0, t0: t0, c1: c1, t1: t1, t: 0, dur: dur, start: performance.now() };
  }
  function goZone(i) { state.auto = false; $('#auto').setAttribute('aria-pressed', 'false'); controls.autoRotate = false; applyLevel(ZONES[i].lvl); showZone(i); flyTo(ZONES[i].cam, ZONES[i].tg, 1500); }
  function overview() { state.auto = true; $('#auto').setAttribute('aria-pressed', 'true'); flyTo(VIEW0.cam, VIEW0.tg, 1500); }

  $$('button[data-mode]').forEach(function (b) { b.addEventListener('click', function () { applyMode(b.getAttribute('data-mode')); }); });
  $$('[data-level]').forEach(function (b) { b.addEventListener('click', function () { applyLevel(b.getAttribute('data-level')); }); });
  $$('[data-fmt]').forEach(function (b) { b.addEventListener('click', function () { applyFmt(b.getAttribute('data-fmt')); }); });
  $('#zPrev').addEventListener('click', function () { goZone((state.zone + ZONES.length - 1) % ZONES.length); });
  $('#zNext').addEventListener('click', function () { goZone((state.zone + 1) % ZONES.length); });
  $('#overview').addEventListener('click', overview);
  $('#auto').addEventListener('click', function () { state.auto = !state.auto; $('#auto').setAttribute('aria-pressed', state.auto ? 'true' : 'false'); controls.autoRotate = state.auto; });
  controls.addEventListener('start', function () { tween = null; });

  /* закрыть / открыть панель с описанием зоны */
  (function () {
    var panel = $('.t3__story') || $('.story'), cl = $('#zClose'), op = $('#zOpen'); if (!panel || !cl || !op) return;
    cl.addEventListener('click', function () { panel.hidden = true; op.hidden = false; op.focus(); });
    op.addEventListener('click', function () { panel.hidden = false; op.hidden = true; cl.focus(); });
    var more = $('#zMore');
    if (more) more.addEventListener('click', function () { var o = panel.classList.toggle('is-open'); more.setAttribute('aria-expanded', o ? 'true' : 'false'); more.textContent = o ? 'Свернуть' : 'Подробнее'; });
  })();

  /* размер */
  function resize() {
    var r = canvas.getBoundingClientRect(), w = Math.max(320, r.width), h = Math.max(320, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 58 : (w / h < 1.2 ? 48 : 40); camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  /* старт */
  camera.position.fromArray(zf(VIEW0.cam)); controls.target.fromArray(zf(VIEW0.tg)); controls.autoRotateSpeed = 0.35; controls.update();
  applyMode('evening'); applyFmt('empty'); applyLevel('both'); showZone(1);

  /* встроенный режим (секция .t3 на главной): страница не должна «залипать» на модели */
  var EMBED = !!document.querySelector('.t3'), onScreen = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; }, { rootMargin: '80px' }).observe(canvas);
  if (EMBED) {
    var coarse = window.matchMedia('(pointer: coarse)').matches, ctl = $('#t3Ctl');
    controls.enableZoom = false;                                   // колесо листает страницу, пока по модели не кликнули
    canvas.addEventListener('mousedown', function () { controls.enableZoom = true; });
    canvas.addEventListener('mouseleave', function () { controls.enableZoom = false; });
    if (coarse && ctl) {                                           // на телефоне касание модели не блокирует прокрутку
      controls.enabled = false; ctl.hidden = false;
      ctl.addEventListener('click', function () {
        controls.enabled = !controls.enabled; ctl.setAttribute('aria-pressed', controls.enabled ? 'true' : 'false');
        ctl.textContent = controls.enabled ? 'Вернуть прокрутку страницы' : 'Крутить модель пальцем';
      });
    }
  }
  var v = new T.Vector3(), last = 0, reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) state.auto = false;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!onScreen || document.hidden) return;
    if (tween) { var k = Math.min(1, (now - tween.start) / tween.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.c0, tween.c1, e); controls.target.lerpVectors(tween.t0, tween.t1, e); if (k >= 1) tween = null; }
    controls.autoRotate = state.auto && !tween && !reduced; controls.update();
    G.beams.visible = camera.position.y < D.H - 0.15;
    // срез стен, когда камера снаружи
    cut.forEach(function (c) { var p = camera.position, o = c.ax === 'x' ? p.x : -p.z; c.obj.visible = !(c.side > 0 ? o > c.at + 0.2 : o < c.at - 0.2); });
    if (state.mode === 'evening' && now - last > 110) { drawLed(now); last = now; }
    // метки зон
    var rc = canvas.getBoundingClientRect();
    hotEls.forEach(function (h, i) { var z = ZONES[i]; v.set(z.p[0], z.p[1], -z.p[2]).project(camera);
      var vis = v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      h.style.display = vis ? '' : 'none'; if (vis) h.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * rc.width) + 'px,' + ((-v.y * 0.5 + 0.5) * rc.height) + 'px) translate(-50%,-50%)'; });
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  $('#loading') && ($('#loading').hidden = true);

  // для проверки и внешнего управления
  window.__hall = { setMode: applyMode, setLevel: applyLevel, setFmt: applyFmt, goZone: goZone, overview: overview, cam: camera, controls: controls, state: state, D: D };
})();
