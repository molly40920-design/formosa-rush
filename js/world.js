// 寶島狂飆 — procedural Taipei
(function () {
  const W = {};
  const FONT = '"Noto Sans TC","Microsoft JhengHei","PingFang TC","Heiti TC",sans-serif';
  W.FONT = FONT;
  W.SLAB = 0.18;

  // ---------------- Districts ----------------
  const D = {
    ximen: { id: 'ximen', zh: '西門町', en: 'XIMENDING', desc: '電影街、刺青街與潮流聖地', h: [9, 30], neon: 0.85, old: 1 },
    wanhua: { id: 'wanhua', zh: '萬華', en: 'WANHUA', desc: '艋舺老街，龍山寺的香火', h: [8, 26], neon: 0.5, old: 1 },
    station: { id: 'station', zh: '台北車站', en: 'TAIPEI MAIN STATION', desc: '北車地下街，迷路是一種修行', h: [18, 60], neon: 0.35, old: 0.7 },
    bo_ai: { id: 'bo_ai', zh: '博愛特區', en: 'ZHONGZHENG', desc: '總統府與二二八和平公園', h: [14, 40], neon: 0.15, old: 0.6 },
    cks: { id: 'cks', zh: '中正紀念堂', en: 'LIBERTY SQUARE', desc: '自由廣場與國家兩廳院', h: [12, 36], neon: 0.2, old: 0.7 },
    zhongshan: { id: 'zhongshan', zh: '中山', en: 'ZHONGSHAN', desc: '條通、飯店與林蔭大道', h: [16, 50], neon: 0.45, old: 0.7 },
    east: { id: 'east', zh: '忠孝東區', en: 'EAST DISTRICT', desc: '忠孝復興，週年慶人擠人', h: [24, 80], neon: 0.5, old: 0.5 },
    daan: { id: 'daan', zh: '大安', en: "DA'AN", desc: '森林公園與巷弄咖啡', h: [14, 45], neon: 0.25, old: 0.75 },
    xinyi: { id: 'xinyi', zh: '信義', en: 'XINYI', desc: '101 與台北的天際線', h: [40, 170], neon: 0.1, old: 0, tower: true },
  };
  W.D = D;
  W.districtAt = function (x, z) {
    if (x < -760) return D.wanhua;
    if (x < -600) return z < 220 ? D.ximen : D.wanhua;
    if (z < -330 && x < 180) return D.zhongshan;
    if (x < -160 && z < -130) return D.station;
    if (x < 0 && z >= 80) return D.cks;
    if (x < -160) return D.bo_ai;
    if (x < 620 && z < -60) return D.east;
    if (x < 760) return D.daan;
    return D.xinyi;
  };

  // ---------------- Road network ----------------
  const mainX = [[-940, 14, '環河南路'], [-760, 16, '康定路'], [-600, 26, '中華路'], [-460, 16, '重慶南路'], [-320, 30, '中山南路'], [-160, 18, '杭州南路'], [0, 24, '新生南路'], [180, 24, '建國南路'], [330, 24, '復興南路'], [480, 32, '敦化南路', true], [620, 20, '光復南路'], [760, 26, '基隆路'], [940, 14, '松仁路']];
  const mainZ = [[-590, 14, '民族東路'], [-450, 18, '民生東路'], [-330, 24, '市民大道'], [-200, 28, '忠孝東路'], [-60, 32, '仁愛路', true], [80, 24, '信義路'], [220, 20, '和平東路'], [400, 18, '辛亥路'], [590, 14, '興隆路']];
  function makeLines(mains) {
    const out = [];
    for (let i = 0; i < mains.length; i++) {
      const m = mains[i];
      out.push({ c: m[0], w: m[1], name: m[2], main: true, trees: !!m[3] });
      if (i < mains.length - 1) {
        const n = mains[i + 1];
        out.push({ c: (m[0] + n[0]) / 2, w: 10, name: m[2] + '巷', main: false });
      }
    }
    return out;
  }
  W.X = makeLines(mainX);
  W.Z = makeLines(mainZ);
  W.bounds = { x0: -948, x1: 948, z0: -598, z1: 598 };

  // Landmark areas (whole road-bounded rectangles)
  W.landmarks = [
    { id: 'station', zh: '台北車站', rect: [-600, -330, -320, -200], slab: '#bdb6a8' },
    { id: 'redhouse', zh: '西門紅樓', rect: [-680, -130, -600, -60], slab: '#a8795f' },
    { id: 'office', zh: '總統府', rect: [-460, -60, -320, 80], slab: '#b9b3a6' },
    { id: 'park228', zh: '二二八和平公園', rect: [-320, -60, -160, 80], slab: '#5f8a4a', park: true },
    { id: 'cks', zh: '中正紀念堂', rect: [-320, 80, 0, 400], slab: '#d9d5cc' },
    { id: 'daanpark', zh: '大安森林公園', rect: [0, 80, 180, 220], slab: '#5a8a45', park: true },
    { id: 'longshan', zh: '龍山寺', rect: [-940, 80, -760, 220], slab: '#b4a894' },
    { id: 'sysmh', zh: '國父紀念館', rect: [620, -200, 760, -60], slab: '#c9c3b5' },
    { id: 't101', zh: '台北101', rect: [760, 80, 940, 220], slab: '#bfc3c4' },
  ];
  W.pedZones = [[-760, -200, -600, 80, '西門徒步區'], [-900, 310, -800, 400, '萬福市場'], [-600, -420, -460, -360, '寧夏夜市']];
  const inside = (x, z, r, m = 1) => x > r[0] + m && x < r[2] - m && z > r[1] + m && z < r[3] - m;

  function buildGraph() {
    const nx = W.X.length, nz = W.Z.length;
    W.nodes = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) W.nodes.push({ id: i * nz + j, i, j, x: W.X[i].c, z: W.Z[j].c, adj: [] });
    W.segs = [];
    const addSeg = (a, b, line, axis) => {
      const A = W.nodes[a], B = W.nodes[b];
      const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
      for (const L of W.landmarks) if (inside(mx, mz, L.rect)) return;
      const zone = W.pedZones.find((r) => inside(mx, mz, r));
      const ped = !!zone;
      const s = { id: W.segs.length, a, b, w: line.w, main: line.main, trees: line.trees, name: zone ? zone[4] : line.name, axis, ped, len: Math.hypot(B.x - A.x, B.z - A.z) };
      W.segs.push(s);
      A.adj.push({ to: b, seg: s });
      B.adj.push({ to: a, seg: s });
    };
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz - 1; j++) addSeg(i * nz + j, i * nz + j + 1, W.X[i], 'z');
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx - 1; i++) addSeg(i * nz + j, (i + 1) * nz + j, W.Z[j], 'x');
    W.nodeAt = (i, j) => W.nodes[i * nz + j];
  }

  W.nearestNode = function (x, z, drivable) {
    let best = null, bd = Infinity;
    const i0 = lineIndex(W.X, x), j0 = lineIndex(W.Z, z);
    for (let i = Math.max(0, i0 - 2); i <= Math.min(W.X.length - 1, i0 + 2); i++)
      for (let j = Math.max(0, j0 - 2); j <= Math.min(W.Z.length - 1, j0 + 2); j++) {
        const n = W.nodeAt(i, j);
        if (!n.adj.length) continue;
        if (drivable && !n.adj.some((e) => !e.seg.ped)) continue;
        const d = U.dist2(x, z, n.x, n.z);
        if (d < bd) { bd = d; best = n; }
      }
    return best;
  };
  function lineIndex(lines, c) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < lines.length; i++) { const d = Math.abs(lines[i].c - c); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  // which road segment (if any) is under a point
  W.roadAt = function (x, z) {
    let best = null, bw = 0;
    for (const L of W.X) if (Math.abs(x - L.c) < L.w / 2 && (!best || L.w > bw)) { best = L; bw = L.w; }
    for (const L of W.Z) if (Math.abs(z - L.c) < L.w / 2 && (!best || L.w > bw)) { best = L; bw = L.w; }
    if (best && W.landmarks.some((l) => inside(x, z, l.rect, 0))) return null;
    const zone = best && !best.main && W.pedZones.find((r) => inside(x, z, r, 0));
    if (zone) return { name: zone[4] };
    return best;
  };

  // A* on the road graph
  W.path = function (fromX, fromZ, toX, toZ, drivable = true) {
    const s = W.nearestNode(fromX, fromZ, drivable), t = W.nearestNode(toX, toZ, drivable);
    if (!s || !t) return [];
    const g = new Map([[s.id, 0]]), came = new Map(), closed = new Set();
    const h = (n) => (Math.abs(n.x - t.x) + Math.abs(n.z - t.z)) * 0.85;
    const heap = [[h(s), s.id]];
    const push = (e) => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    let guard = 0;
    while (heap.length && guard++ < 20000) {
      const cur = pop()[1];
      if (closed.has(cur)) continue;
      if (cur === t.id) break;
      closed.add(cur);
      const N = W.nodes[cur];
      for (const e of N.adj) {
        if (drivable && e.seg.ped) continue;
        if (closed.has(e.to)) continue;
        const cost = g.get(cur) + e.seg.len * (e.seg.main ? 0.85 : 1.15);
        if (!g.has(e.to) || cost < g.get(e.to)) {
          g.set(e.to, cost); came.set(e.to, cur); push([cost + h(W.nodes[e.to]), e.to]);
        }
      }
    }
    const out = [];
    let c = t.id;
    if (c !== s.id && !came.has(c)) return [];
    while (c !== undefined) { out.unshift(W.nodes[c]); if (c === s.id) break; c = came.get(c); }
    return out;
  };

  // ---------------- Collision grid ----------------
  const CELL = 20;
  W.grid = new Map();
  W.aabbs = [];
  W.addAABB = function (x0, z0, x1, z1, h, tag) {
    const b = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h: h || 30, tag, stamp: 0 };
    W.aabbs.push(b);
    for (let ix = Math.floor(b.x0 / CELL); ix <= Math.floor(b.x1 / CELL); ix++)
      for (let iz = Math.floor(b.z0 / CELL); iz <= Math.floor(b.z1 / CELL); iz++) {
        const k = ix * 10007 + iz;
        let arr = W.grid.get(k);
        if (!arr) W.grid.set(k, (arr = []));
        arr.push(b);
      }
    return b;
  };
  let stamp = 1;
  W.query = function (x0, z0, x1, z1) {
    stamp++;
    const out = [];
    for (let ix = Math.floor(x0 / CELL); ix <= Math.floor(x1 / CELL); ix++)
      for (let iz = Math.floor(z0 / CELL); iz <= Math.floor(z1 / CELL); iz++) {
        const arr = W.grid.get(ix * 10007 + iz);
        if (!arr) continue;
        for (const b of arr) if (b.stamp !== stamp) { b.stamp = stamp; out.push(b); }
      }
    return out;
  };
  // push a circle out of boxes; returns {nx,nz,depth} of strongest hit or null
  W.collideCircle = function (p, r, y, vehicle) {
    const bs = W.query(p.x - r, p.z - r, p.x + r, p.z + r);
    let hit = null;
    for (const b of bs) {
      if (y !== undefined && y > b.h) continue;
      if (b.veh && !vehicle) continue;
      const cx = U.clamp(p.x, b.x0, b.x1), cz = U.clamp(p.z, b.z0, b.z1);
      let dx = p.x - cx, dz = p.z - cz;
      let d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      let d = Math.sqrt(d2), nx, nz, depth;
      if (d < 1e-4) {
        // center inside: push out through nearest face
        const l = p.x - b.x0, rr = b.x1 - p.x, t = p.z - b.z0, bb = b.z1 - p.z;
        const m = Math.min(l, rr, t, bb);
        if (m === l) { nx = -1; nz = 0; depth = l + r; } else if (m === rr) { nx = 1; nz = 0; depth = rr + r; } else if (m === t) { nx = 0; nz = -1; depth = t + r; } else { nx = 0; nz = 1; depth = bb + r; }
      } else { nx = dx / d; nz = dz / d; depth = r - d; }
      p.x += nx * depth; p.z += nz * depth;
      if (!hit || depth > hit.depth) hit = { nx, nz, depth, box: b };
    }
    return hit;
  };
  // is point inside a solid (for camera)
  W.solidAt = function (x, y, z) {
    const bs = W.query(x, z, x, z);
    for (const b of bs) if (!b.veh && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y < b.h) return true;
    return false;
  };
  // ray vs boxes (2.5D, uses height), returns distance or Infinity
  W.raycast = function (ox, oy, oz, dx, dy, dz, maxD) {
    let best = maxD;
    const steps = Math.ceil(maxD / CELL) + 1;
    stamp++;
    for (let s = 0; s <= steps; s++) {
      const t = Math.min(s * CELL, maxD);
      const px = ox + dx * t, pz = oz + dz * t;
      for (let ix = Math.floor(px / CELL) - 1; ix <= Math.floor(px / CELL) + 1; ix++)
        for (let iz = Math.floor(pz / CELL) - 1; iz <= Math.floor(pz / CELL) + 1; iz++) {
          const arr = W.grid.get(ix * 10007 + iz);
          if (!arr) continue;
          for (const b of arr) {
            if (b.stamp === stamp) continue;
            b.stamp = stamp;
            if (b.veh) continue;
            const hitT = rayBox(ox, oy, oz, dx, dy, dz, b);
            if (hitT < best) best = hitT;
          }
        }
      if (t > best) break;
    }
    return best;
  };
  function rayBox(ox, oy, oz, dx, dy, dz, b) {
    let tmin = 0, tmax = Infinity;
    const ax = [[ox, dx, b.x0, b.x1], [oy, dy, -1, b.h], [oz, dz, b.z0, b.z1]];
    for (const [o, d, lo, hi] of ax) {
      if (Math.abs(d) < 1e-8) { if (o < lo || o > hi) return Infinity; continue; }
      let t1 = (lo - o) / d, t2 = (hi - o) / d;
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
    return tmin;
  }

  // ---------------- Cells & walk areas ----------------
  function buildCells() {
    W.cells = [];
    for (let i = 0; i < W.X.length - 1; i++)
      for (let j = 0; j < W.Z.length - 1; j++) {
        const A = W.X[i], B = W.X[i + 1], C = W.Z[j], E = W.Z[j + 1];
        const cell = { i, j, x0: A.c + A.w / 2, x1: B.c - B.w / 2, z0: C.c + C.w / 2, z1: E.c - E.w / 2, sides: { w: A, e: B, n: C, s: E }, reserved: [] };
        cell.cx = (cell.x0 + cell.x1) / 2; cell.cz = (cell.z0 + cell.z1) / 2;
        cell.lm = W.landmarks.find((l) => inside(cell.cx, cell.cz, l.rect, 0)) || null;
        cell.district = W.districtAt(cell.cx, cell.cz);
        W.cells.push(cell);
      }
    for (const L of W.landmarks) {
      const cs = W.cells.filter((c) => c.lm === L);
      L.x0 = Math.min(...cs.map((c) => c.x0)); L.x1 = Math.max(...cs.map((c) => c.x1));
      L.z0 = Math.min(...cs.map((c) => c.z0)); L.z1 = Math.max(...cs.map((c) => c.z1));
      L.cx = (L.x0 + L.x1) / 2; L.cz = (L.z0 + L.z1) / 2;
    }
    W.lm = {};
    for (const L of W.landmarks) W.lm[L.id] = L;
  }
  W.cellAt = function (x, z) {
    for (const L of W.landmarks) if (x >= L.x0 && x <= L.x1 && z >= L.z0 && z <= L.z1) return { lm: L, x0: L.x0, x1: L.x1, z0: L.z0, z1: L.z1 };
    let i = -1, j = -1;
    for (let k = 0; k < W.X.length - 1; k++) if (x >= W.X[k].c && x < W.X[k + 1].c) i = k;
    for (let k = 0; k < W.Z.length - 1; k++) if (z >= W.Z[k].c && z < W.Z[k + 1].c) j = k;
    if (i < 0 || j < 0) return null;
    const c = W.cells[i * (W.Z.length - 1) + j];
    if (x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1) return c;
    return null;
  };
  W.groundAt = (x, z) => (W.cellAt(x, z) ? W.SLAB : 0);

  // ---------------- Textures ----------------
  function makeTextures() {
    const T = {};
    const rnd = U.rand;
    // residential facade: 4x4 window cells, white wall so vertex color tints it
    const winLayout = [];
    T.res = U.canvasTex(512, 512, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = 'rgba(0,0,0,0.05)';
      for (let y = 0; y < 512; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
      for (let cy = 0; cy < 4; cy++)
        for (let cx = 0; cx < 4; cx++) {
          const x = cx * 128, y = cy * 128;
          const type = rnd();
          g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 18, y + 112, 92, 6); // ledge
          if (type < 0.15) { continue; }
          g.fillStyle = '#2b3440'; g.fillRect(x + 22, y + 26, 84, 74);
          g.fillStyle = '#44525f'; g.fillRect(x + 22, y + 26, 84, 10);
          g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x + 26, y + 40, 20, 56);
          winLayout.push([cx, cy]);
          if (type < 0.6) { // 鐵窗 iron window cage
            g.strokeStyle = 'rgba(200,200,190,0.95)'; g.lineWidth = 3;
            g.strokeRect(x + 16, y + 20, 96, 88);
            for (let k = 1; k < 7; k++) { g.beginPath(); g.moveTo(x + 16 + k * 13.7, y + 20); g.lineTo(x + 16 + k * 13.7, y + 108); g.stroke(); }
          } else if (type < 0.8) { // AC unit
            g.fillStyle = '#e6e6df'; g.fillRect(x + 70, y + 88, 34, 22); g.fillStyle = '#9a9a92'; g.fillRect(x + 74, y + 92, 26, 2); g.fillRect(x + 74, y + 97, 26, 2);
          }
        }
    }, { repeat: true });
    T.resEm = U.canvasTex(512, 512, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
      const warm = ['#ffd68a', '#ffe7b0', '#fff4de', '#bfe3ff', '#ffc070'];
      for (const [cx, cy] of winLayout) if (rnd() < 0.55) { g.fillStyle = U.pick(warm); g.fillRect(cx * 128 + 22, cy * 128 + 26, 84, 74); }
    }, { repeat: true });
    // office glass curtain wall
    const offLit = [];
    T.office = U.canvasTex(256, 256, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
      for (let cy = 0; cy < 4; cy++)
        for (let cx = 0; cx < 4; cx++) {
          const x = cx * 64, y = cy * 64;
          const grd = g.createLinearGradient(x, y, x + 64, y + 64);
          grd.addColorStop(0, '#7f98ab'); grd.addColorStop(1, '#4d6275');
          g.fillStyle = grd; g.fillRect(x + 3, y + 6, 58, 50);
          g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 3, y + 6, 58, 6);
          offLit.push([cx, cy]);
        }
    }, { repeat: true });
    T.officeEm = U.canvasTex(256, 256, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
      for (const [cx, cy] of offLit) if (rnd() < 0.5) { g.fillStyle = rnd() < 0.7 ? '#dfeeff' : '#fff1c8'; g.fillRect(cx * 64 + 3, cy * 64 + 6, 58, 50); }
    }, { repeat: true });
    // storefronts: 4 shop panels across
    const shopCols = ['#ffefd0', '#e8f6ff', '#fff8e8', '#ffe0e0', '#e9ffe9', '#fff3c4', '#f1e6ff', '#ffe9d6'];
    T.shop = U.canvasTex(1024, 128, (g) => {
      for (let k = 0; k < 8; k++) {
        const x = k * 128;
        g.fillStyle = '#d9d4ca'; g.fillRect(x, 0, 128, 128);
        if (rnd() < 0.2) { // closed rolling shutter 鐵捲門
          g.fillStyle = '#a7aaa6'; g.fillRect(x + 6, 14, 116, 114);
          g.fillStyle = 'rgba(0,0,0,0.15)'; for (let y = 16; y < 128; y += 5) g.fillRect(x + 6, y, 116, 1);
        } else {
          g.fillStyle = U.pick(shopCols); g.fillRect(x + 6, 14, 116, 114);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          for (let s = 0; s < 3; s++) g.fillRect(x + 14 + s * 36, 60 + rnd() * 30, 22, 70); // shelves/people
          g.fillStyle = 'rgba(40,40,40,0.8)'; g.fillRect(x + 6, 14, 116, 4); g.fillRect(x + 62, 14, 3, 114);
        }
      }
    }, { repeat: true });
    T.shopEm = U.canvasTex(1024, 128, (g) => {
      const d = T.shop.image.getContext('2d').getImageData(0, 0, 1024, 128);
      const img = g.createImageData(1024, 128);
      for (let i = 0; i < d.data.length; i += 4) {
        const bright = d.data[i] + d.data[i + 1] + d.data[i + 2] > 640;
        img.data[i] = bright ? d.data[i] : 0; img.data[i + 1] = bright ? d.data[i + 1] : 0; img.data[i + 2] = bright ? d.data[i + 2] : 0; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, { repeat: true });
    // 好鄰居 convenience store front
    T.store = U.canvasTex(512, 128, (g) => {
      g.fillStyle = '#f7f8fb'; g.fillRect(0, 0, 512, 128);
      g.fillStyle = '#1d5fbf'; g.fillRect(0, 0, 512, 30); g.fillStyle = '#ffd23f'; g.fillRect(0, 30, 512, 5);
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(150, 15, 10, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = '900 22px ' + FONT; g.textAlign = 'center'; g.fillText('好鄰居 GOOD NEIGHBOR', 270, 23);
      g.fillStyle = '#e8fbff'; g.fillRect(8, 36, 496, 92);
      g.fillStyle = 'rgba(0,0,0,0.2)'; for (let s = 0; s < 9; s++) g.fillRect(20 + s * 54, 64, 36, 64);
      g.fillStyle = '#333'; g.fillRect(250, 36, 4, 92);
    });
    // sidewalk tiles
    // red brick with arched windows (紅樓, 總統府)
    T.brick = U.canvasTex(256, 256, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < 256; x += 16) { g.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.1})`; g.fillRect(x + 1, y + 1, 14, 6); }
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, 118, 256, 10);
      for (const x of [40, 168]) {
        g.fillStyle = '#f1e7d4'; g.beginPath(); g.moveTo(x - 30, 236); g.lineTo(x - 30, 170); g.arc(x, 170, 30, Math.PI, 0); g.lineTo(x + 30, 236); g.fill();
        g.fillStyle = '#2b3440'; g.beginPath(); g.moveTo(x - 22, 236); g.lineTo(x - 22, 172); g.arc(x, 172, 22, Math.PI, 0); g.lineTo(x + 22, 236); g.fill();
        g.fillStyle = '#f1e7d4'; g.beginPath(); g.moveTo(x - 30, 108); g.lineTo(x - 30, 44); g.arc(x, 44, 30, Math.PI, 0); g.lineTo(x + 30, 108); g.fill();
        g.fillStyle = '#2b3440'; g.beginPath(); g.moveTo(x - 22, 108); g.lineTo(x - 22, 46); g.arc(x, 46, 22, Math.PI, 0); g.lineTo(x + 22, 108); g.fill();
      }
    }, { repeat: true });
    T.tile = U.canvasTex(128, 128, (g) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
      g.fillStyle = 'rgba(0,0,0,0.13)';
      for (let k = 0; k <= 128; k += 32) { g.fillRect(k, 0, 2, 128); g.fillRect(0, k, 128, 2); }
      for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.06})`; g.fillRect(rnd() * 128, rnd() * 128, 3, 3); }
    }, { repeat: true });
    T.asphalt = U.canvasTex(256, 256, (g) => {
      g.fillStyle = '#48494c'; g.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 4000; k++) { const v = 50 + rnd() * 40; g.fillStyle = `rgb(${v},${v},${v + 3})`; g.fillRect(rnd() * 256, rnd() * 256, 1.5, 1.5); }
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(20,20,22,0.25)'; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 20 + rnd() * 30, 8 + rnd() * 20, rnd() * 3, 0, 7); g.fill(); }
    }, { repeat: true });
    T.grass = U.canvasTex(128, 128, (g) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
      for (let k = 0; k < 1500; k++) { g.fillStyle = `rgba(0,${40 + rnd() * 60},0,${rnd() * 0.2})`; g.fillRect(rnd() * 128, rnd() * 128, 1.5, 3); }
    }, { repeat: true });
    T.glow = U.canvasTex(128, 128, (g) => {
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, 'rgba(255,220,160,1)'); r.addColorStop(0.4, 'rgba(255,200,130,0.4)'); r.addColorStop(1, 'rgba(255,190,120,0)');
      g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    });
    detailTextures(T);
    return T;
  }

  function detailTextures(T) {
    const rnd = U.artRandom(4817);
    const g = T.res.image.getContext('2d');
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.strokeStyle = '#d1cec4'; g.lineWidth = 0.7;
    for (let y = 0; y < 512; y += 8) for (let x = 0; x < 512; x += 16) g.strokeRect(x, y, 16, 8);
    for (let i = 0; i < 180; i++) {
      const x = rnd() * 512, y = rnd() * 512, h = 12 + rnd() * 55;
      const stain = g.createLinearGradient(0, y, 0, y + h);
      stain.addColorStop(0, 'rgba(85,79,60,0.18)'); stain.addColorStop(1, 'rgba(85,79,60,0)');
      g.fillStyle = stain; g.fillRect(x, y, 1 + rnd() * 5, h);
    }
    g.restore();
    for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
      const x = cx * 128, y = cy * 128;
      g.fillStyle = '#929892'; g.fillRect(x + 62, y + 29, 2, 68);
      g.fillStyle = '#c6c7be'; g.fillRect(x + 24, y + 96, 80, 2);
      g.fillStyle = 'rgba(31,34,32,0.28)'; g.fillRect(x + 20, y + 110, 89, 3);
    }
    T.res.needsUpdate = true;
    T.resRelief = U.canvasTex(512, 512, (c) => {
      c.fillStyle = '#b0b0b0'; c.fillRect(0, 0, 512, 512);
      c.strokeStyle = '#888'; c.lineWidth = 1;
      for (let y = 0; y < 512; y += 8) for (let x = 0; x < 512; x += 16) c.strokeRect(x, y, 16, 8);
      for (let y = 0; y < 512; y += 128) for (let x = 0; x < 512; x += 128) {
        c.fillStyle = '#505050'; c.fillRect(x + 22, y + 26, 84, 74);
        c.fillStyle = '#d0d0d0'; c.fillRect(x + 62, y + 26, 2, 74); c.fillRect(x + 18, y + 108, 92, 4);
      }
    }, { repeat: true, data: true });
    const em = T.resEm.image.getContext('2d');
    em.fillStyle = '#000';
    for (let y = 0; y < 512; y += 128) for (let x = 0; x < 512; x += 128) {
      em.fillRect(x + 62, y + 26, 3, 74);
      for (let k = 1; k < 7; k++) em.fillRect(x + 16 + k * 13.7, y + 26, 2, 74);
    }
    T.resEm.needsUpdate = true;
    const road = T.asphalt.image.getContext('2d');
    road.strokeStyle = 'rgba(19,21,23,0.42)'; road.lineWidth = 0.7;
    for (let k = 0; k < 7; k++) {
      let x = rnd() * 256, y = rnd() * 256;
      road.beginPath(); road.moveTo(x, y);
      for (let j = 0; j < 6; j++) { x += rnd() * 20 - 10; y += rnd() * 14; road.lineTo(x, y); }
      road.stroke();
    }
    road.fillStyle = 'rgba(19,20,22,0.15)'; road.fillRect(67, 24, 38, 94);
    road.strokeStyle = 'rgba(20,22,23,0.24)'; road.lineWidth = 2;
    for (const x of [175, 202]) { road.beginPath(); road.moveTo(x, 0); road.bezierCurveTo(x - 6, 80, x + 8, 140, x, 256); road.stroke(); }
    T.asphalt.needsUpdate = true;
    T.roadRelief = U.canvasTex(256, 256, (c) => {
      c.fillStyle = '#d4d4d4'; c.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 6000; k++) { const v = 145 + rnd() * 95; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(rnd() * 256, rnd() * 256, 1, 1); }
      for (let k = 0; k < 12; k++) {
        const x = rnd() * 256, y = rnd() * 256, r = 8 + rnd() * 27;
        const p = c.createRadialGradient(x, y, 0, x, y, r);
        p.addColorStop(0, '#606060'); p.addColorStop(1, 'rgba(100,100,100,0)'); c.fillStyle = p; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }, { repeat: true, data: true });
    T.roadRelief.repeat.set(300, 200);
    const tile = T.tile.image.getContext('2d');
    tile.fillStyle = '#a7a39b'; tile.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < 128; x += 32) {
      const v = 190 + rnd() * 42;
      tile.fillStyle = `rgb(${v},${v * 0.96},${v * 0.92})`; tile.fillRect(x + 1, y + 1, 30, 14);
      tile.fillStyle = 'rgba(70,61,52,0.12)'; tile.fillRect(x + 1, y + 13, 30, 2);
    }
    T.tile.needsUpdate = true;
    T.tileRelief = U.canvasTex(128, 128, (c) => { c.drawImage(T.tile.image, 0, 0); }, { repeat: true, data: true });
    T.roof = U.canvasTex(128, 128, (c) => {
      c.fillStyle = '#c2c0b6'; c.fillRect(0, 0, 128, 128);
      for (let k = 0; k < 2000; k++) { c.fillStyle = `rgba(51,48,38,${rnd() * 0.14})`; c.fillRect(rnd() * 128, rnd() * 128, 2, 2); }
      c.strokeStyle = '#999a90'; c.lineWidth = 1; c.strokeRect(1, 1, 126, 126);
    }, { repeat: true });
    T.ripple = U.canvasTex(128, 128, (c) => {
      const img = c.createImageData(128, 128);
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        const a = x / 128 * Math.PI * 2, b = y / 128 * Math.PI * 2, i = (y * 128 + x) * 4;
        img.data[i] = 128 + 16 * Math.cos(a * 4 + Math.sin(b * 3)) + 8 * Math.cos(a * 9 - b * 5);
        img.data[i + 1] = 128 + 16 * Math.cos(b * 3 + Math.sin(a * 2)) + 8 * Math.cos(b * 7 + a * 3);
        img.data[i + 2] = 252; img.data[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    }, { repeat: true, data: true });
  }

  // Neon / lightbox sign atlas: 32 vertical (128x512) on top half, 32 horizontal (512x128) below
  const VT = ['牛肉麵', 'KTV', '旅社', '當舖', '眼鏡', '珍珠奶茶', '牙醫', '小吃', '通訊行', '按摩', '鹽酥雞', '診所', '補習班', '滷肉飯', '刺青', '電影院', '網咖', '火鍋', '檳榔', '彩券', '藥局', '麻辣鍋', '刈包', '豆花', '便當', '卡拉OK', '茶行', '銀樓', '蚵仔煎', '理髮', '麵線', '熱炒'];
  const HT = ['老王牛肉麵', '阿嬤滷肉飯', '大腸包小腸', '林記豆花', '好運彩券行', '正宗胡椒餅', '春水茶飲', '明亮眼鏡', '全民網咖', '大台北當舖', '金好吃便當', '一鍋入魂麻辣鍋', '巷口鹽酥雞', '小籠包專賣', '阿姨早餐店', '蚵仔麵線', '台北通訊', '快樂KTV', '幸福旅社', '夜貓子熱炒', '超級牙醫診所', '星光補習班', '黑糖珍奶', '花園刺青', '大同電器行', '阿財燒臘', '溫州大餛飩', '水果行', '手搖飲料', '自助洗衣', '中藥行', '好地方咖啡'];
  W.foodSigns = [0, 1, 2, 3, 5, 6, 10, 12, 13, 14, 15, 19, 22, 25, 26, 28, 31];
  W.HT = HT;
  function makeSignAtlas() {
    const neon = ['#ff3b6b', '#35e0ff', '#ffe14a', '#7dff6a', '#ff8a2a', '#d86bff', '#ff5ad1', '#6be1ff'];
    const rnd = U.rand;
    return U.canvasTex(2048, 2048, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, 2048, 2048);
      VT.forEach((t, k) => {
        const x = (k % 16) * 128, y = Math.floor(k / 16) * 512;
        const lightbox = rnd() < 0.45;
        const c = U.pick(neon);
        const chars = t.length > 4 ? [t.slice(0, 2), t.slice(2)] : t.split('');
        if (t === 'KTV' || t === '卡拉OK') chars.splice(0, chars.length, ...(t === 'KTV' ? ['K', 'T', 'V'] : ['卡', '拉', 'O', 'K']));
        if (lightbox) {
          g.fillStyle = U.pick(['#fdfcf5', '#fff2a8', '#ffffff', '#e8f4ff']); g.fillRect(x + 6, y + 6, 116, 500);
          g.strokeStyle = U.pick(['#d0201a', '#1b4fb5', '#118a3c']); g.lineWidth = 8; g.strokeRect(x + 10, y + 10, 108, 492);
          g.fillStyle = U.pick(['#d0201a', '#1b4fb5', '#111', '#118a3c']);
          g.shadowBlur = 0;
        } else {
          g.fillStyle = '#12091a'; g.fillRect(x + 6, y + 6, 116, 500);
          g.strokeStyle = c; g.lineWidth = 5; g.shadowColor = c; g.shadowBlur = 18; g.strokeRect(x + 14, y + 14, 100, 484);
          g.fillStyle = '#fff';
        }
        const n = chars.length, fs = Math.min(96, 440 / n);
        g.font = `900 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        chars.forEach((ch, ci) => {
          if (!lightbox) { g.shadowColor = c; g.shadowBlur = 22; g.fillStyle = c; g.fillText(ch, x + 64, y + 256 + (ci - (n - 1) / 2) * (440 / n)); g.shadowBlur = 6; g.fillStyle = '#fff'; }
          g.fillText(ch, x + 64, y + 256 + (ci - (n - 1) / 2) * (440 / n));
        });
        g.shadowBlur = 0;
      });
      HT.forEach((t, k) => {
        const x = (k % 4) * 512, y = 1024 + Math.floor(k / 4) * 128;
        const style = rnd();
        const bgs = [['#c4161c', '#fff'], ['#fdf6d8', '#b0151b'], ['#123f8c', '#fff'], ['#fff', '#0f5e2e'], ['#ffd400', '#1b1b1b'], ['#1a1a1a', '#ffd400']];
        const [bg, fg] = U.pick(bgs);
        g.fillStyle = bg; g.fillRect(x + 4, y + 8, 504, 112);
        if (style < 0.4) { const c = U.pick(neon); g.strokeStyle = c; g.lineWidth = 6; g.shadowColor = c; g.shadowBlur = 14; g.strokeRect(x + 12, y + 16, 488, 96); g.shadowBlur = 0; }
        g.fillStyle = fg; g.font = `900 ${Math.min(76, 460 / t.length)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(t, x + 256, y + 66);
      });
    });
  }
  const vUV = (k) => { const x = (k % 16) * 128, y = Math.floor(k / 16) * 512; return [x / 2048, 1 - (y + 512) / 2048, (x + 128) / 2048, 1 - y / 2048]; };
  const hUV = (k) => { const x = (k % 4) * 512, y = 1024 + Math.floor(k / 4) * 128; return [x / 2048, 1 - (y + 128) / 2048, (x + 512) / 2048, 1 - y / 2048]; };

  W.labelTex = function (text, bg, fg, w = 512, h = 128, sub) {
    return U.canvasTex(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 ${Math.min(h * 0.62, (w * 0.9) / text.length)}px ${FONT}`;
      g.fillText(text, w / 2, sub ? h * 0.42 : h / 2);
      if (sub) { g.font = `700 ${h * 0.18}px ${FONT}`; g.fillText(sub, w / 2, h * 0.82); }
    });
  };

  // ---------------- Chunked builders ----------------
  const CHUNK = 200;
  const chunks = new Map();
  function B(mat, x, z) {
    const k = mat + ':' + Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK);
    let b = chunks.get(k);
    if (!b) { b = { mat, gb: new U.GeoBuilder(1) }; chunks.set(k, b); }
    return b.gb;
  }

  // ---------------- Build ----------------
  W.build = async function (scene, progress) {
    const tick = async (p, msg) => { progress && progress(p, msg); await new Promise((r) => setTimeout(r, 0)); };
    U.seed(20260929);
    W.scene = scene;
    buildGraph();
    buildCells();
    await tick(0.08, '鋪設馬路');
    const fresh = !W.tex;
    const T = W.tex || (W.tex = makeTextures());
    if (fresh) T.signs = makeSignAtlas();
    const M = fresh ? (W.mat = {
      res: U.surface({ map: T.res, emissiveMap: T.resEm, emissive: 0x000000, vertexColors: true, roughness: 0.88 }, { bumpMap: T.resRelief, bumpScale: 0.045 }),
      office: U.surface({ map: T.office, emissiveMap: T.officeEm, emissive: 0x000000, vertexColors: true, roughness: 0.3, metalness: 0.28, envMapIntensity: 0.8 }),
      shop: U.surface({ map: T.shop, emissiveMap: T.shopEm, emissive: 0x333333, vertexColors: true, roughness: 0.65 }),
      store: U.surface({ map: T.store, emissiveMap: T.store, emissive: 0x444444, roughness: 0.6 }),
      detail: new THREE.MeshLambertMaterial({ vertexColors: true }),
      brick: new THREE.MeshLambertMaterial({ map: T.brick, vertexColors: true }),
      slab: U.surface({ map: T.tile, vertexColors: true }, { bumpMap: T.tileRelief, bumpScale: 0.025 }),
      roof: U.surface({ map: T.roof, roughness: 0.95 }),
      grass: new THREE.MeshLambertMaterial({ map: T.grass, vertexColors: true }),
      mark: new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      sign: new THREE.MeshBasicMaterial({ map: T.signs, color: 0xdddddd }),
      glow: new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x000000 }),
      lamp: new THREE.MeshBasicMaterial({ color: 0x777766 }),
      arcade: U.surface({ vertexColors: true, roughness: 0.92, emissive: 0xffce89, emissiveIntensity: 0 }),
      arcadeLight: new THREE.MeshBasicMaterial({ color: 0xbbb6a4 }),
    }) : W.mat;

    // ground
    if (fresh) {
    T.asphalt.repeat.set(690, 690);
    M.road = U.surface({ map: T.asphalt, roughness: 0.96, envMapIntensity: 0.6 }, { bumpMap: T.roadRelief, bumpScale: 0.018, roughnessMap: T.roadRelief });
    M.res.onBeforeCompile = (s) => {
      s.vertexShader = 'varying float wallHeight;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nwallHeight = position.y;');
      s.fragmentShader = 'varying float wallHeight;\n' + s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.78, 1.0, smoothstep(4.0, 10.0, wallHeight));');
    };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), M.road);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    W.ground = ground;
    ground.userData.keep = true;
    M.t101 = U.surface({ vertexColors: true, emissive: 0x000000, roughness: 0.32, metalness: 0.3, envMapIntensity: 0.75 });
    M.t101band = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x000000 });
    M.pool = new THREE.MeshBasicMaterial({ map: T.glow, color: 0xffdfaa, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    W.rngAfterTex = U.rngState();
    }
    // every region continues the seeded stream from the same point, so each one is identical on every visit
    U.seed((W.rngAfterTex + (W.region.salt || 0)) >>> 0);

    buildRoadMarkings();
    await tick(0.18, '蓋人行道');
    buildSlabs();
    await tick(0.26, '蓋房子');
    buildLandmarks();
    await tick(0.4, '蓋房子');
    let n = 0;
    const cellsToBuild = W.cells.filter((c) => !c.lm);
    reserveMRT();
    // spread convenience stores across the city: pick cells at least 150 m apart
    const storeCells = [];
    for (const c of cellsToBuild.slice().sort(() => U.rand() - 0.5)) {
      if (c.district.old < 0.4 || storeCells.length >= 24) continue;
      if (storeCells.some((o) => U.dist2(o.cx, o.cz, c.cx, c.cz) < 150 * 150)) continue;
      storeCells.push(c); c.wantStore = true;
    }
    for (const c of cellsToBuild) {
      buildCellLots(c);
      if (++n % 40 === 0) await tick(0.4 + (0.35 * n) / cellsToBuild.length, '掛招牌');
    }
    // keep a city-wide sample of restaurants for delivery jobs
    W.restaurants = W.restaurants.sort(() => U.rand() - 0.5).slice(0, 60);
    await tick(0.78, '種行道樹');
    buildStreetProps();
    buildOuter();
    await tick(0.9, '合併幾何');
    for (const [, b] of chunks) {
      if (!b.gb.count()) continue;
      const mesh = new THREE.Mesh(b.gb.build(), M[b.mat]);
      mesh.castShadow = b.mat !== 'sign' && b.mat !== 'mark' && b.mat !== 'slab' && b.mat !== 'grass';
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      scene.add(mesh);
    }
    chunks.clear();
    buildWorldWalls();
    buildFloodZones();
    await tick(1, '完成');
  };

  // ----- markings: center lines, lane dashes, crosswalks, ped-street paving
  function buildRoadMarkings() {
    const white = U.col('#e9e7df'), yellow = U.col('#e8b92e'), brick = U.col('#b8866a');
    const y = 0.025;
    const Q = (x0, z0, x1, z1, col, x, z) => {
      B('mark', x, z).quad([new THREE.Vector3(x0, y, z0), new THREE.Vector3(x0, y, z1), new THREE.Vector3(x1, y, z1), new THREE.Vector3(x1, y, z0)], col);
    };
    const QR = (x0, z0, x1, z1, col) => Q(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), col, (x0 + x1) / 2, (z0 + z1) / 2);
    for (const s of W.segs) {
      const A = W.nodes[s.a], Bn = W.nodes[s.b];
      if (s.ped) {
        // paved pedestrian street
        if (s.axis === 'z') QR(A.x - s.w / 2, A.z, A.x + s.w / 2, Bn.z, brick);
        else QR(A.x, A.z - s.w / 2, Bn.x, A.z + s.w / 2, brick);
        continue;
      }
      if (!s.main) continue;
      const crossA = s.axis === 'z' ? W.Z[A.j].w : W.X[A.i].w;
      const crossB = s.axis === 'z' ? W.Z[Bn.j].w : W.X[Bn.i].w;
      const t0 = crossA / 2 + 5, t1 = s.len - crossB / 2 - 5;
      if (t1 <= t0) continue;
      const along = (t, off) => (s.axis === 'z' ? [A.x + off, A.z + t] : [A.x + t, A.z + off]);
      const rect = (ta, tb, oa, ob, col) => { const p = along(ta, oa), q = along(tb, ob); QR(p[0], p[1], q[0], q[1], col); };
      if (s.id % 3 === 0) {
        const p = along((t0 + t1) / 2, s.w * 0.22);
        B('mark', p[0], p[1]).geo(new THREE.CylinderGeometry(0.42, 0.42, 0.012, 16), p[0], 0.015, p[1], 1, 1, 1, U.col('#343735'));
        for (let k = -2; k <= 2; k++) rect((t0 + t1) / 2 - 0.27, (t0 + t1) / 2 + 0.27, s.w * 0.22 + k * 0.1, s.w * 0.22 + k * 0.1 + 0.025, U.col('#60625d'));
      }
      // double yellow centre (or median planter handles it)
      if (!s.trees) { rect(t0, t1, -0.35, -0.15, yellow); rect(t0, t1, 0.15, 0.35, yellow); }
      // lane dashes
      if (s.w >= 20) for (const off of [-s.w / 4, s.w / 4]) for (let t = t0; t < t1 - 3; t += 9) rect(t, t + 4, off - 0.08, off + 0.08, white);
      // edge line
      for (const off of [-s.w / 2 + 0.6, s.w / 2 - 0.6]) rect(t0, t1, off - 0.08, off + 0.08, white);
      // crosswalks + stop lines at both ends
      for (const [tc, dir] of [[crossA / 2 + 0.6, 1], [s.len - crossB / 2 - 0.6, -1]]) {
        for (let o = -s.w / 2 + 0.8; o < s.w / 2 - 0.5; o += 1.2) rect(tc, tc + dir * 3.2, o, o + 0.6, white);
        rect(tc + dir * 4, tc + dir * 4.4, -s.w / 2, s.w / 2, white);
        // 機車待轉區 box on the right side
        if (s.w >= 24) rect(tc + dir * 5.5, tc + dir * 8.5, dir > 0 ? -s.w / 2 + 1 : s.w / 2 - 4, dir > 0 ? -s.w / 2 + 4 : s.w / 2 - 1, white);
      }
    }
  }

  // ----- sidewalk slabs (per cell) and landmark plazas
  function slabBox(mat, x0, z0, x1, z1, color, h = W.SLAB) {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    B(mat, cx, cz).box(cx, h / 2, cz, w, h, d, color, { uvFn: (u, v, n, lx, ly, lz) => [(cx + lx * w) / 4, (cz + lz * d) / 4] });
  }
  function buildSlabs() {
    for (const c of W.cells) if (!c.lm) slabBox('slab', c.x0, c.z0, c.x1, c.z1, U.col(c.district.slab || (c.district.id === 'ximen' ? '#b89e8c' : c.district.id === 'xinyi' ? '#c4c2bc' : '#aaa59b')));
    for (const L of W.landmarks) {
      if (L.park) {
        slabBox('slab', L.x0, L.z0, L.x1, L.z1, U.col('#aaa59b'));
        slabBox('grass', L.x0 + 4, L.z0 + 4, L.x1 - 4, L.z1 - 4, U.col(L.slab), W.SLAB + 0.04);
      } else slabBox('slab', L.x0, L.z0, L.x1, L.z1, U.col(L.slab));
    }
  }

  // ----- MRT kiosks (reserve corners so buildings don't overlap)
  W.mrt = [];
  const MRT_DEF = [
    ['西門', 'Ximen', -600, -60, 1, 1], ['台北車站', 'Taipei Main', -320, -200, -1, -1], ['中山', 'Zhongshan', -320, -450, 1, 1],
    ['中正紀念堂', 'CKS Memorial Hall', -320, 80, 1, 1], ['大安森林公園', "Da'an Park", 0, 150, 1, -1], ['龍山寺', 'Longshan Temple', -760, 80, -1, 1],
    ['忠孝復興', 'Zhongxiao Fuxing', 330, -200, -1, 1], ['忠孝敦化', 'Zhongxiao Dunhua', 480, -200, 1, -1], ['國父紀念館', 'S.Y.S. Memorial Hall', 620, -200, 1, 1],
    ['市政府', 'Taipei City Hall', 760, -60, 1, -1], ['台北101/世貿', 'Taipei 101', 760, 80, 1, 1],
  ];
  function reserveMRT() {
    for (const [zh, en, nx, nz, sx, sz] of W.region.mrt || []) {
      const lx = W.X.find((l) => l.c === nx), lz = W.Z.find((l) => l.c === nz);
      const x = nx + sx * (lx.w / 2 + 3.2), z = nz + sz * (lz.w / 2 + 3.2);
      W.mrt.push({ zh, en, x, z, face: { x: -sx, z: -sz } });
      const c = W.cellAt(x, z);
      if (c && c.reserved) c.reserved.push([x - 5, z - 5, x + 5, z + 5]);
    }
    // gas stations take a whole corner of a block next to a main-road intersection
    W.gasSites = [];
    for (const [name, nx, nz, sx, sz] of W.region.gas || []) {
      const lx = W.X.find((l) => l.c === nx), lz = W.Z.find((l) => l.c === nz);
      const x0 = nx + sx * (lx.w / 2), z0 = nz + sz * (lz.w / 2);
      const x1 = x0 + sx * 26, z1 = z0 + sz * 20;
      const r = [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)];
      const c = W.cellAt((r[0] + r[2]) / 2, (r[1] + r[3]) / 2);
      if (c && c.reserved) c.reserved.push(r);
      W.gasSites.push({ name, x: (r[0] + r[2]) / 2, z: (r[1] + r[3]) / 2, rect: r, sx, sz });
    }
  }

  // ----- lots & buildings
  const RES_COL = ['#cfc7b8', '#bdb9b0', '#d9d3c5', '#aea69a', '#c9b9a6', '#a3a8aa', '#cfb1a2', '#b7c0b3', '#d6cdb8', '#c2b49a', '#e0dcd2', '#9fa39c'];
  const OFF_COL = ['#8aa0b0', '#9aabb5', '#7a90a2', '#b0bcc4', '#8c9aa0', '#a2b4bf'];
  const ROOF_ADD = ['#6f8fa8', '#8d989e', '#b0623f', '#d9d9d2', '#4f7d9e'];
  W.lots = [];
  W.stores = [];
  W.restaurants = [];
  W.frontages = [];

  function buildCellLots(c) {
    const d = c.district;
    const ix0 = c.x0 + 4, ix1 = c.x1 - 4, iz0 = c.z0 + 4, iz1 = c.z1 - 4;
    const W_ = ix1 - ix0, D_ = iz1 - iz0;
    if (W_ < 8 || D_ < 8) return;
    const lots = [];
    const tower = d.tower && U.rand() < 0.85;
    if (tower) {
      // big podium towers
      const nx = W_ > 90 ? 2 : 1, nz = D_ > 90 ? 2 : 1;
      for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) lots.push([ix0 + (a * W_) / nx, iz0 + (b * D_) / nz, ix0 + ((a + 1) * W_) / nx, iz0 + ((b + 1) * D_) / nz]);
    } else {
      // two rows of street-facing lots when deep enough
      const rows = D_ > 34 ? 2 : 1;
      for (let r = 0; r < rows; r++) {
        const z0 = iz0 + (r * D_) / rows, z1 = iz0 + ((r + 1) * D_) / rows;
        let x = ix0;
        while (x < ix1 - 1) {
          let w = U.rr(9, d.lotW || (d.id === 'east' ? 30 : 22));
          if (ix1 - (x + w) < 8) w = ix1 - x;
          lots.push([x, z0, x + w, z1]);
          x += w;
        }
      }
    }
    for (const L of lots) {
      if (c.reserved.some((r) => r[0] < L[2] && r[2] > L[0] && r[1] < L[3] && r[3] > L[1])) {
        // leave as a small plaza; shrink lot away from the reserved corner when possible
        continue;
      }
      if (d.sparse && U.rand() < d.sparse) continue;
      if (!tower && U.rand() < 0.05) { buildParkingLot(L, c); continue; }
      buildLot(L, c, tower);
    }
  }

  function buildParkingLot(L, c) {
    const [x0, z0, x1, z1] = L;
    B('detail', x0, z0).box((x0 + x1) / 2, W.SLAB + 0.02, (z0 + z1) / 2, x1 - x0 - 1, 0.04, z1 - z0 - 1, U.col('#55575a'));
    W.parkingSpots = W.parkingSpots || [];
    W.parkingSpots.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2 });
  }

  function buildLot(L, c, tower) {
    const d = c.district;
    const [x0, z0, x1, z1] = L;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, dd = z1 - z0;
    const sides = [];
    if (Math.abs(z0 - (c.z0 + 4)) < 0.5) sides.push('n');
    if (Math.abs(z1 - (c.z1 - 4)) < 0.5) sides.push('s');
    if (Math.abs(x0 - (c.x0 + 4)) < 0.5) sides.push('w');
    if (Math.abs(x1 - (c.x1 - 4)) < 0.5) sides.push('e');
    let H = U.rr(d.h[0], d.h[1]);
    if (tower) H = U.rr(60, 190) * (U.rand() < 0.3 ? 0.6 : 1);
    const floorH = 3.2;
    H = Math.max(floorH * 3 + 4.2, Math.round((H - 4.2) / floorH) * floorH + 4.2);
    const old = !tower && U.rand() < d.old;
    const office = tower || (!old && U.rand() < 0.6) || H > 55;
    const col = U.col(office ? U.pick(OFF_COL) : U.pick(RES_COL));
    const lot = { x0, z0, x1, z1, h: H, sides, district: d.id };
    W.lots.push(lot);
    const y0 = W.SLAB;

    if (tower) {
      // podium + setback tower
      const ph = 12;
      B('shop', cx, cz).box(cx, y0 + ph / 2, cz, w, ph, dd, U.col('#e6e2da'), { facade: [12, ph] });
      const tw = w * U.rr(0.55, 0.8), td = dd * U.rr(0.55, 0.8);
      B('office', cx, cz).box(cx, y0 + ph + (H - ph) / 2, cz, tw, H - ph, td, col, { facade: [14, 12.8, U.ri(0, 3) * 0.25, U.ri(0, 3) * 0.25] });
      B('detail', cx, cz).box(cx, y0 + H + 1.5, cz, tw * 0.5, 3, td * 0.5, U.col('#8a8f94'));
      if (H > 120) B('detail', cx, cz).box(cx, y0 + H + 8, cz, 0.6, 14, 0.6, U.col('#cccccc'));
      W.addAABB(x0, z0, x1, z1, H, 'bld');
    } else {
      const arc = old ? 3 : 0; // 騎樓 arcade depth
      const gx0 = x0 + (sides.includes('w') ? arc : 0), gx1 = x1 - (sides.includes('e') ? arc : 0);
      const gz0 = z0 + (sides.includes('n') ? arc : 0), gz1 = z1 - (sides.includes('s') ? arc : 0);
      const gH = 4.2;
      const isStore = old && sides.length && c.wantStore && !c.hasStore;
      if (isStore) c.hasStore = true;
      const gm = isStore ? 'store' : 'shop';
      B(gm, cx, cz).box((gx0 + gx1) / 2, y0 + gH / 2, (gz0 + gz1) / 2, gx1 - gx0, gH, gz1 - gz0, U.col(isStore ? '#ffffff' : '#ffffff'), { facade: isStore ? [gx1 - gx0, gH] : [6, gH, 0, U.ri(0, 7) * 0.125] });
      const mat = office ? 'office' : 'res';
      B(mat, cx, cz).box(cx, y0 + gH + (H - gH) / 2, cz, w, H - gH, dd, col, { facade: office ? [14, 12.8, 0, U.ri(0, 3) * 0.25] : [14, 12.8, U.ri(0, 3) * 0.25, U.ri(0, 3) * 0.25] });
      W.addAABB(gx0, gz0, gx1, gz1, H, 'bld');
      if (arc) {
        // arcade pillars along each street side
        const pc = U.col('#bdb5a8');
        for (const s of sides) {
          const horiz = s === 'n' || s === 's';
          const len = horiz ? w : dd;
          const n = Math.max(2, Math.round(len / 5));
          const acx = horiz ? cx : s === 'w' ? x0 + arc / 2 : x1 - arc / 2;
          const acz = horiz ? (s === 'n' ? z0 + arc / 2 : z1 - arc / 2) : cz;
          // Continuous warm soffit and spaced recessed lamps, batched with city chunks.
          B('arcade', acx, acz).box(acx, y0 + gH - 0.055, acz, horiz ? len : arc, 0.09, horiz ? arc : len, U.col('#e4d7bd'));
          for (let k = 0; k < n; k++) {
            const lx = horiz ? x0 + (k + 0.5) * len / n : acx;
            const lz = horiz ? acz : z0 + (k + 0.5) * len / n;
            B('arcadeLight', lx, lz).box(lx, y0 + gH - 0.115, lz, horiz ? 1.4 : 0.22, 0.045, horiz ? 0.22 : 1.4, U.col('#ffffff'));
          }
          for (let k = 0; k <= n; k++) {
            const t = k / n;
            const px = horiz ? x0 + 0.4 + t * (w - 0.8) : s === 'w' ? x0 + 0.4 : x1 - 0.4;
            const pz = horiz ? (s === 'n' ? z0 + 0.4 : z1 - 0.4) : z0 + 0.4 + t * (dd - 0.8);
            B('detail', px, pz).box(px, y0 + gH / 2, pz, 0.7, gH, 0.7, pc);
            W.addAABB(px - 0.35, pz - 0.35, px + 0.35, pz + 0.35, gH, 'pillar');
          }
          // vehicle-only barrier along the arcade so cars can't drive under the 騎樓
          const bx0 = horiz ? x0 : s === 'w' ? x0 : x1 - 0.8, bx1 = horiz ? x1 : s === 'w' ? x0 + 0.8 : x1;
          const bz0 = horiz ? (s === 'n' ? z0 : z1 - 0.8) : z0, bz1 = horiz ? (s === 'n' ? z0 + 0.8 : z1) : z1;
          W.addAABB(bx0, bz0, bx1, bz1, 1.2, 'arcade').veh = true;
        }
      }
      // roof additions: 頂樓加蓋 & water tower
      const r = U.rand();
      if (r < 0.55 && !office) {
        const aw = w * U.rr(0.5, 0.85), ad = dd * U.rr(0.5, 0.85);
        const ax = cx + U.rr(-1, 1) * (w - aw) / 2, az = cz + U.rr(-1, 1) * (dd - ad) / 2;
        B('detail', ax, az).box(ax, y0 + H + 1.3, az, aw, 2.6, ad, U.col(U.pick(ROOF_ADD)));
        B('detail', ax, az).box(ax, y0 + H + 2.75, az, aw + 0.4, 0.2, ad + 0.4, U.shade(U.pick(ROOF_ADD), 0.8), { rz: 0.05 });
      }
      if (U.rand() < 0.6) {
        const tx = cx + U.rr(-0.3, 0.3) * w, tz = cz + U.rr(-0.3, 0.3) * dd;
        B('detail', tx, tz).geo(TANK, tx, y0 + H + 1.6, tz, 1, 1, 1, U.col(U.rand() < 0.5 ? '#c8ccd0' : '#e4e2d8'));
      }
      // parapet
      B('detail', cx, cz).box(cx, y0 + H + 0.45, cz, w + 0.1, 0.9, dd + 0.1, U.shade(col.getHex(), 0.85), { uvFn: null });
      B('roof', cx, cz).quad([new THREE.Vector3(x0 + 0.2, y0 + H + 0.91, z0 + 0.2), new THREE.Vector3(x0 + 0.2, y0 + H + 0.91, z1 - 0.2), new THREE.Vector3(x1 - 0.2, y0 + H + 0.91, z1 - 0.2), new THREE.Vector3(x1 - 0.2, y0 + H + 0.91, z0 + 0.2)], U.col('#ffffff'), [0, 0, 0, dd / 4, w / 4, dd / 4, w / 4, 0]);
      // facade AC units
      for (const s of sides) {
        const nAC = U.ri(0, 4);
        for (let k = 0; k < nAC; k++) {
          const fy = y0 + gH + 1 + U.ri(0, Math.floor((H - gH - 3) / floorH)) * floorH;
          const [px, pz, rot] = facadePoint(L, s, U.rr(0.15, 0.85), 0.3);
          B('detail', px, pz).box(px, fy, pz, 0.9, 0.6, 0.5, U.col('#e8e6de'), { ry: rot });
        }
      }
      // signs
      for (const s of sides) {
        if (old && U.rand() < 0.85) {
          const k = U.ri(0, HT.length - 1);
          addHSign(L, s, k, y0 + gH + 0.2);
          if (W.foodSigns.includes(k)) {
            const [px, pz] = facadePoint(L, s, 0.5, arc ? 2 : 1.5);
            W.restaurants.push({ name: HT[k], x: px, z: pz });
          }
        }
        if (U.rand() < d.neon * 0.8) addVSign(L, s, U.ri(0, VT.length - 1), y0 + gH + 1.2, Math.min(H - gH - 2, U.rr(4, 8)));
        if (U.rand() < d.neon * 0.4 && H > 14) addVSign(L, s, U.ri(0, VT.length - 1), y0 + gH + 1.2, Math.min(H - gH - 2, U.rr(4, 8)), 0.8);
        const [fx, fz, , nx, nz] = facadePoint(L, s, 0.5, arc ? 1.5 : 1.5);
        W.frontages.push({ x: fx + nx * 1.5, z: fz + nz * 1.5, nx, nz, district: d.id });
      }
      if (isStore) {
        const s = sides[0];
        const [px, pz, , nx, nz] = facadePoint(L, s, 0.5, arc + 1.5);
        W.stores.push({ x: px, z: pz, nx, nz });
      }
    }
  }
  const PRISM = new THREE.CylinderGeometry(0.577, 0.577, 1, 3);
  const TANK = (() => {
    const g = new THREE.CylinderGeometry(0.9, 0.9, 1.6, 10);
    return g;
  })();

  // point on the outer face of a lot: returns [x,z,rotY,nx,nz]
  function facadePoint(L, s, t, out) {
    const [x0, z0, x1, z1] = L;
    if (s === 'n') return [x0 + t * (x1 - x0), z0 - out, 0, 0, -1];
    if (s === 's') return [x0 + t * (x1 - x0), z1 + out, Math.PI, 0, 1];
    if (s === 'w') return [x0 - out, z0 + t * (z1 - z0), Math.PI / 2, -1, 0];
    return [x1 + out, z0 + t * (z1 - z0), -Math.PI / 2, 1, 0];
  }
  function addHSign(L, s, k, y) {
    const [x0, z0, x1, z1] = L;
    const horiz = s === 'n' || s === 's';
    const len = (horiz ? x1 - x0 : z1 - z0) * U.rr(0.6, 0.9);
    const hgt = Math.min(1.3, len / 4);
    const [px, pz, , nx, nz] = facadePoint(L, s, 0.5, 0.12);
    const uv = hUV(k);
    const tx = -nz, tz = nx; // tangent (so text reads left->right when facing sign)
    const hl = len / 2;
    const p = (a, b) => new THREE.Vector3(px + tx * a, y + b, pz + tz * a);
    // quad facing outward normal (nx,nz): order bottom-left, bottom-right, top-right, top-left seen from outside
    const bl = p(-hl * -1, 0), br = p(hl * -1, 0), tr = p(hl * -1, hgt), tl = p(-hl * -1, hgt);
    B('sign', px, pz).quad([bl, br, tr, tl], U.col('#ffffff'), [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]]);
  }
  function addVSign(L, s, k, y, h, t = U.rr(0.15, 0.85)) {
    const [px, pz, , nx, nz] = facadePoint(L, s, t, 0);
    const out = 1.4, wd = h / 4 * 1.0;
    const cx = px + nx * (out / 2 + 0.2), cz = pz + nz * (out / 2 + 0.2);
    // sign plane is perpendicular to facade: spans along normal
    const uv = vUV(k);
    const a = new THREE.Vector3(px + nx * 0.2, 0, pz + nz * 0.2), b = new THREE.Vector3(px + nx * (0.2 + out), 0, pz + nz * (0.2 + out));
    const tx = -nz, tz = nx;
    const e = 0.09;
    const col = U.col('#ffffff');
    // side 1 (facing +tangent)
    const s1 = (v, yy) => new THREE.Vector3(v.x + tx * e, yy, v.z + tz * e);
    const s2 = (v, yy) => new THREE.Vector3(v.x - tx * e, yy, v.z - tz * e);
    B('sign', cx, cz).quad([s1(a, y), s1(b, y), s1(b, y + h), s1(a, y + h)], col, [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]]);
    B('sign', cx, cz).quad([s2(b, y), s2(a, y), s2(a, y + h), s2(b, y + h)], col, [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]]);
    B('detail', cx, cz).box(cx, y + h / 2, cz, Math.abs(nx) > 0.5 ? out : 0.16, h + 0.2, Math.abs(nz) > 0.5 ? out : 0.16, U.col('#2a2a2e'));
  }

  // ----- street props: trees, lamps, parked scooters, medians
  W.trees = [];
  W.lamps = [];
  function buildStreetProps() {
    const treePos = [], lampPos = [], scooterPos = [];
    for (const s of W.segs) {
      if (s.ped) continue;
      const A = W.nodes[s.a], Bn = W.nodes[s.b];
      const crossA = s.axis === 'z' ? W.Z[A.j].w : W.X[A.i].w;
      const crossB = s.axis === 'z' ? W.Z[Bn.j].w : W.X[Bn.i].w;
      const t0 = crossA / 2 + 4, t1 = s.len - crossB / 2 - 4;
      if (t1 <= t0) continue;
      const P = (t, off) => (s.axis === 'z' ? [A.x + off, A.z + t] : [A.x + t, A.z + off]);
      if (s.trees) {
        // median planter with trees (仁愛路/敦化南路)
        const a = P(t0 + 6, -1.6), b = P(t1 - 6, 1.6);
        const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), z0 = Math.min(a[1], b[1]), z1 = Math.max(a[1], b[1]);
        B('detail', (x0 + x1) / 2, (z0 + z1) / 2).box((x0 + x1) / 2, 0.25, (z0 + z1) / 2, x1 - x0, 0.5, z1 - z0, U.col('#8f8a80'));
        B('grass', (x0 + x1) / 2, (z0 + z1) / 2).box((x0 + x1) / 2, 0.52, (z0 + z1) / 2, x1 - x0 - 0.4, 0.05, z1 - z0 - 0.4, U.col('#4d7a3a'), { uvFn: (u, v) => [u * 20, v] });
        W.addAABB(x0, z0, x1, z1, 0.8, 'median');
        for (let t = t0 + 9; t < t1 - 8; t += 9) { const p = P(t, 0); treePos.push([p[0], 0.5, p[1], 1.2]); }
      }
      if (s.main) {
        for (const side of [-1, 1]) {
          for (let t = t0 + 6; t < t1 - 2; t += 32) { const p = P(t, side * (s.w / 2 + 0.7)); lampPos.push([p[0], p[1], s.axis === 'z' ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : side > 0 ? Math.PI : 0]); }
          if (s.w >= 24) for (let t = t0 + 14; t < t1 - 4; t += 13) if (U.rand() < 0.75) { const p = P(t, side * (s.w / 2 + 1.6)); treePos.push([p[0], W.SLAB, p[1], U.rr(0.8, 1.1)]); }
        }
      }
      // parked scooter rows along curbs of old districts (機車格)
      const dist = W.districtAt((A.x + Bn.x) / 2, (A.z + Bn.z) / 2);
      if (dist.old > 0.4) for (const side of [-1, 1]) {
        if (U.rand() > 0.3) continue;
        const len = U.rr(5, Math.min(16, t1 - t0 - 2));
        const ts = U.rr(t0 + 1, t1 - len);
        const off = side * (s.w / 2 + 1.1);
        for (let t = ts; t < ts + len; t += 0.95) { const p = P(t, off); scooterPos.push([p[0], p[1], s.axis === 'z' ? Math.PI / 2 : 0]); }
        const a = P(ts, off - 0.9), b = P(ts + len, off + 0.9);
        W.addAABB(a[0], a[1], b[0], b[1], 1.1, 'scooters');
      }
    }
    // park trees
    for (const L of W.landmarks) {
      if (!L.park) continue;
      for (let k = 0; k < (L.trees != null ? L.trees : L.id === 'daanpark' ? 150 : 90); k++) {
        const x = U.rr(L.x0 + 8, L.x1 - 8), z = U.rr(L.z0 + 8, L.z1 - 8);
        if (L.pond && x > L.pond[0] - 4 && x < L.pond[2] + 4 && z > L.pond[1] - 4 && z < L.pond[3] + 4) continue;
        if (Math.abs(x - L.cx) < 6 || Math.abs(z - L.cz) < 6) continue; // paths
        treePos.push([x, W.SLAB, z, U.rr(1, 1.6)]);
      }
    }
    if (W.extraTrees) for (const t of W.extraTrees) treePos.push(t);
    // tree instanced meshes
    const trunkG = new THREE.CylinderGeometry(0.18, 0.28, 3, 6); trunkG.translate(0, 1.5, 0);
    const crownG = new THREE.IcosahedronGeometry(2.2, 1); crownG.translate(0, 4.4, 0); crownG.scale(1, 0.85, 1);
    const trunk = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x5a4636 }), treePos.length);
    const crown = new THREE.InstancedMesh(crownG, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), treePos.length);
    const canopy = new U.GeoBuilder(1), leaf = new THREE.IcosahedronGeometry(1, 1);
    for (const [x, y, z, r, color] of [[-0.85, 3.8, 0, 1.65, '#b5c59a'], [0.8, 4.05, 0.35, 1.7, '#aabb91'], [0, 5.05, -0.2, 1.5, '#d4d8ad']]) canopy.geo(leaf, x, y, z, r, r * 0.8, r, U.col(color));
    leaf.dispose();
    crown.material.vertexColors = true;
    crown.userData.lowGeometry = crownG; crown.userData.detailGeometry = canopy.build();
    if (G.settings.quality !== 'low') crown.geometry = crown.userData.detailGeometry;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
    const greens = ['#3f6f33', '#4d7f3a', '#355f2c', '#5a8a3e', '#2f5a2a'];
    treePos.forEach((t, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), U.rand() * 6.28);
      sc.set(t[3], t[3] * U.rr(0.9, 1.2), t[3]);
      m.compose(pos.set(t[0], t[1], t[2]), q, sc);
      trunk.setMatrixAt(i, m); crown.setMatrixAt(i, m);
      crown.setColorAt(i, U.col(U.pick(greens)));
      W.addAABB(t[0] - 0.3, t[2] - 0.3, t[0] + 0.3, t[2] + 0.3, 4, 'tree');
    });
    trunk.castShadow = crown.castShadow = true; crown.receiveShadow = true;
    W.scene.add(trunk, crown);
    // street lamps
    const poleG = new U.GeoBuilder(1);
    poleG.geo(new THREE.CylinderGeometry(0.1, 0.14, 1, 6), 0, 4, 0, 1, 8, 1, U.col('#6d7275'));
    poleG.box(0, 7.9, 1.2, 0.12, 0.12, 2.4, U.col('#6d7275'));
    const poles = new THREE.InstancedMesh(poleG.build(), new THREE.MeshLambertMaterial({ vertexColors: true }), lampPos.length);
    const headG = new THREE.BoxGeometry(0.5, 0.18, 0.9); headG.translate(0, 7.8, 2.3);
    const heads = new THREE.InstancedMesh(headG, W.mat.lamp, lampPos.length);
    // Each lamp faces the road (+Z). Split at the curb, 0.7 m from its pole,
    // so both halves hug their actual receiver instead of floating over asphalt.
    const poolG = new U.GeoBuilder(1);
    for (const [a, b, y] of [[-6, 0.7, W.SLAB + 0.025], [0.7, 12, 0.025]]) {
      poolG.quad([new THREE.Vector3(-9,y,a),new THREE.Vector3(-9,y,b),new THREE.Vector3(9,y,b),new THREE.Vector3(9,y,a)], U.col('#ffffff'), [0,(a+6)/18,0,(b+6)/18,1,(b+6)/18,1,(a+6)/18]);
    }
    const pools = new THREE.InstancedMesh(poolG.build(), W.mat.pool, lampPos.length);
    W.lamps.length = 0;
    lampPos.forEach((l, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), l[2]);
      m.compose(pos.set(l[0], W.SLAB, l[1]), q, sc.set(1, 1, 1));
      poles.setMatrixAt(i, m); heads.setMatrixAt(i, m);
      m.compose(pos.set(l[0], 0, l[1]), q, sc.set(1, 1, 1)); pools.setMatrixAt(i, m);
      W.lamps.push({ x: l[0] + Math.sin(l[2]) * 2.3, y: W.SLAB + 7.65, z: l[1] + Math.cos(l[2]) * 2.3 });
      W.addAABB(l[0] - 0.2, l[1] - 0.2, l[0] + 0.2, l[1] + 0.2, 8, 'lamp');
    });
    poles.castShadow = true;
    W.scene.add(poles, heads, pools);
    // parked scooters: low-poly, instanced per 200 m chunk so off-screen rows are culled
    const sg = Models.scooterGeoLow();
    const smat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const scols = ['#e8e8e8', '#222', '#c7302b', '#2f5fa8', '#e9d8b0', '#7fb8c9', '#9a9a9a', '#f2c230', '#5e8f5a'];
    const byChunk = new Map();
    for (const s of scooterPos) { const k = Math.floor(s[0] / 200) + ',' + Math.floor(s[1] / 200); if (!byChunk.has(k)) byChunk.set(k, []); byChunk.get(k).push(s); }
    for (const [, list] of byChunk) {
      const im = new THREE.InstancedMesh(sg, smat, list.length);
      list.forEach((s, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s[2] + U.rr(-0.15, 0.15) + (U.rand() < 0.5 ? Math.PI : 0));
        m.compose(pos.set(s[0], 0, s[1]), q, sc.set(1, 1, 1));
        im.setMatrixAt(i, m);
        im.setColorAt(i, U.col(U.pick(scols)));
      });
      im.computeBoundingSphere();
      W.scene.add(im);
    }
    W.parkedScooters = scooterPos.length;
    // MRT kiosks
    for (const k of W.mrt) buildMRT(k);
  }

  function buildMRT(k) {
    const g = B('detail', k.x, k.z);
    const ry = Math.atan2(k.face.x, k.face.z);
    g.box(k.x, W.SLAB + 1.4, k.z, 3.2, 2.8, 3.2, U.col('#7c8a93'), { ry });
    g.box(k.x, W.SLAB + 2.95, k.z, 4.2, 0.3, 4.2, U.col('#2a4f8a'), { ry });
    W.addAABB(k.x - 1.6, k.z - 1.6, k.x + 1.6, k.z + 1.6, 3, 'mrt');
    // sign pole with station name
    const px = k.x + k.face.x * 2.8, pz = k.z + k.face.z * 2.8;
    g.box(px, W.SLAB + 1.6, pz, 0.14, 3.2, 0.14, U.col('#555'));
    const tex = W.labelTex('捷運 ' + k.zh, '#1f4f9c', '#ffffff', 512, 128, 'MRT ' + k.en);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.65, 0.08), mat);
    sign.position.set(px, W.SLAB + 3.5, pz);
    sign.rotation.y = ry + Math.PI / 2;
    W.scene.add(sign);
    const lg = new THREE.Group(); lg.position.set(k.x, W.SLAB + 3.7, k.z); lg.rotation.y = ry;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 20), new THREE.MeshBasicMaterial({ color: 0x1f64c8 }));
    disc.rotation.x = Math.PI / 2; lg.add(disc);
    W.scene.add(lg);
  }

  // ----- landmarks
  W.lmPOI = {};
  function buildLandmarks() {
    const lmB = (x, z) => B('detail', x, z);
    const box = (x, y, z, w, h, d, c, o) => lmB(x, z).box(x, y, z, w, h, d, U.col(c), o || {});
    const y0 = W.SLAB;
    const coneRoof = (x, y, z, w, d, h, c, seg = 4, ry = Math.PI / 4) => lmB(x, z).geo(new THREE.ConeGeometry(0.7071, 1, seg), x, y + h / 2, z, w, h, d, U.col(c), { ry });
    const solid = (x, z, w, d, h) => W.addAABB(x - w / 2, z - d / 2, x + w / 2, z + d / 2, h, 'lm');
    const label = (text, x, y, z, w, h, ry, bg = '#1a1a1a', fg = '#ffffff', sub) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: W.labelTex(text, bg, fg, 512, sub ? 160 : 128, sub), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.rotation.y = ry; W.scene.add(m); return m;
    };

    const kit = (W.kit = { W, B, lmB, box, y0, coneRoof, solid, label, PRISM, special, RES_COL });
    // a temple hall: red columns, gabled roof with swallowtail ridge ends
    kit.temple = (x, z, w, d, h, rh, wall = '#8e2a1f', red = '#b3261e', roof = '#48604f') => {
      box(x, y0 + 0.6, z, w + 4, 1.2, d + 4, '#c9bfae');
      box(x, y0 + 1.2 + h / 2, z, w, h, d, wall);
      for (let k = 0; k <= 6; k++) box(x - w / 2 + (k * w) / 6, y0 + 1.2 + h / 2, z + d / 2 + 1, 0.8, h, 0.8, red);
      const alongZ = d > w;
      const L = (alongZ ? d : w) + 5, D = (alongZ ? w : d) + 5;
      const yb = y0 + 1.2 + h;
      box(x, yb + 0.2, z, w + 5, 0.4, d + 5, '#3a2a22');
      lmB(x, z).geo(PRISM, x, yb + 0.4 + rh / 3, z, D, L, rh / 0.866, U.col(roof), alongZ ? { rx: -Math.PI / 2 } : { rz: Math.PI / 2, rx: -Math.PI / 2 });
      const ry = alongZ ? Math.PI / 2 : 0, ax = alongZ ? 0 : 1, az = alongZ ? 1 : 0, top = yb + 0.4 + rh;
      box(x, top + 0.2, z, alongZ ? 0.7 : L * 0.82, 0.7, alongZ ? L * 0.82 : 0.7, '#d9a62e');
      for (const sgn of [-1, 1]) {
        const ex = x + ax * sgn * (L * 0.41 + 1), ez = z + az * sgn * (L * 0.41 + 1);
        lmB(ex, ez).box(ex, top + 0.9, ez, 2.8, 0.45, 0.6, U.col('#d9a62e'), { ry, rz: -sgn * 0.62 });
      }
      solid(x, z, w + 4, d + 4, h + rh + 2);
    };
    W.region.build(kit);
  }
  function taipeiLandmarks(K) {
    const { lmB, box, y0, coneRoof, solid, label } = K;
    // --- 台北車站
    {
      const L = W.lm.station, cx = L.cx, cz = L.cz - 6;
      box(cx, y0 + 12, cz, 190, 24, 76, '#d8c7a2');
      box(cx, y0 + 6, cz + 38.5, 170, 12, 1, '#3b4650'); // glass band
      for (let k = -8; k <= 8; k++) box(cx + k * 10, y0 + 12, cz + 39.5, 1.6, 24, 1.6, '#e8dcc0');
      coneRoof(cx, y0 + 24, cz, 200, 84, 8, '#7a5a3a');
      coneRoof(cx, y0 + 32, cz, 120, 50, 7, '#6b4d33');
      box(cx, y0 + 30, cz, 128, 1, 54, '#e3d6b6');
      solid(cx, cz, 190, 76, 40);
      label('台北車站', cx, y0 + 20, cz + 40.6, 36, 6, 0, '#1a1a1a', '#f3e2b8', 'TAIPEI MAIN STATION');
      W.lmPOI.station = { x: cx, z: L.z1 + 2 };
      W.lmPOI.train = { x: cx, z: L.z1 - 3, name: '台北車站' };
      // taxi stand island
      box(cx + 70, y0 + 0.2, L.z1 - 8, 30, 0.4, 3, '#999');
    }
    // --- 西門紅樓 (octagon + cross hall)
    {
      const L = W.lm.redhouse, cx = L.x1 - 22, cz = L.cz;
      B('brick', cx, cz).geo(new THREE.CylinderGeometry(11, 11, 1, 8, 1, true), cx, y0 + 6, cz, 1, 12, 1, U.col('#c05a42'), { uvFn: (u, v) => [u * 8, v * 1.6] });
      lmB(cx, cz).geo(new THREE.CylinderGeometry(10.9, 10.9, 1, 8), cx, y0 + 6, cz, 1, 11.9, 1, U.col('#a8412e'));
      lmB(cx, cz).geo(new THREE.CylinderGeometry(9, 12, 1, 8), cx, y0 + 13.5, cz, 1, 3, 1, U.col('#5b5c5e'));
      lmB(cx, cz).geo(new THREE.CylinderGeometry(1.5, 1.5, 1, 8), cx, y0 + 16, cz, 1, 3, 1, U.col('#e8e0d0'));
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; box(cx + Math.cos(a) * 11.05, y0 + 5, cz + Math.sin(a) * 11.05, 0.3, 2.4, 2.4, '#f1e7d4', { ry: -a }); }
      B('brick', cx, cz).box(cx - 24, y0 + 5, cz, 26, 10, 18, U.col('#c05a42'), { facade: [7, 10] });
      box(cx - 24, y0 + 10.5, cz, 27, 1, 19, '#5b5c5e');
      solid(cx, cz, 22, 22, 16); solid(cx - 24, cz, 26, 18, 11);
      label('西門紅樓', cx + 11.3, y0 + 9, cz, 8, 2, Math.PI / 2, '#f1e7d4', '#8a2a1c');
      W.lmPOI.redhouse = { x: L.x1 + 4, z: cz };
      // 西門町 arches at ped entrances off 中華路
      for (const z of [-130, -60, 10]) {
        const ax = -612;
        box(ax, y0 + 3, z - 4.6, 0.6, 6, 0.6, '#333'); box(ax, y0 + 3, z + 4.6, 0.6, 6, 0.6, '#333');
        label('西門町 XIMEN', ax, y0 + 6.3, z, 9.8, 1.6, Math.PI / 2, '#e6224b', '#ffffff');
      }
    }
    // --- 總統府 (faces east)
    {
      const L = W.lm.office, cx = L.cx - 8, cz = L.cz;
      B('brick', cx, cz).box(cx, y0 + 11, cz, 28, 22, 104, U.col('#bb5f47'), { facade: [7, 11] });
      for (let yy = 3; yy < 22; yy += 4) box(cx + 14.1, y0 + yy, cz, 0.3, 0.7, 104, '#efe6d6');
      box(cx + 14.2, y0 + 14, cz, 0.3, 4, 104, '#4b3b33');
      B('brick', cx, cz).box(cx + 18, y0 + 20, cz, 12, 40, 14, U.col('#bb5f47'), { facade: [6, 10] });
      for (let yy = 4; yy < 40; yy += 5) box(cx + 24.1, y0 + yy, cz, 0.3, 0.8, 14, '#efe6d6');
      box(cx + 18, y0 + 42, cz, 9, 6, 11, '#efe6d6');
      coneRoof(cx + 18, y0 + 45, cz, 10, 12, 6, '#5e6a60');
      box(cx + 18, y0 + 53, cz, 0.3, 4, 0.3, '#ddd');
      solid(cx, cz, 28, 104, 24); solid(cx + 18, cz, 12, 14, 50);
      // flag
      box(L.x1 - 10, y0 + 7, cz, 0.2, 14, 0.2, '#ddd');
      W.lmPOI.office = { x: L.x1 + 3, z: cz };
      // gardens
      W.extraTrees = W.extraTrees || [];
      for (let k = 0; k < 10; k++) W.extraTrees.push([L.x1 - 6, W.SLAB, L.z0 + 10 + k * 13, 1]);
    }
    // --- 二二八公園 pond & pavilion & monument
    {
      const L = W.lm.park228;
      L.pond = [L.cx - 30, L.cz - 20, L.cx - 8, L.cz + 2];
      box((L.pond[0] + L.pond[2]) / 2, y0 + 0.24, (L.pond[1] + L.pond[3]) / 2, L.pond[2] - L.pond[0], 0.04, L.pond[3] - L.pond[1], '#3d6f8a');
      box(L.cx + 30, y0 + 10, L.cz + 20, 3, 20, 3, '#e9e6e0'); coneRoof(L.cx + 30, y0 + 20, L.cz + 20, 3.4, 3.4, 4, '#e9e6e0');
      solid(L.cx + 30, L.cz + 20, 3, 3, 24);
      // 亭子 pavilion
      const px = L.cx - 20, pz = L.cz + 30;
      for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) box(px + a, y0 + 1.6, pz + b, 0.4, 3.2, 0.4, '#b13a2a');
      coneRoof(px, y0 + 3.2, pz, 9, 9, 3, '#3f5a4a');
    }
    // --- 中正紀念堂
    {
      const L = W.lm.cks;
      const hx = L.x1 - 55, hz = L.cz;
      // terraced base
      box(hx, y0 + 2, hz, 76, 4, 76, '#efece6'); box(hx, y0 + 6, hz, 62, 4, 62, '#efece6'); box(hx, y0 + 9.5, hz, 50, 3, 50, '#f4f2ee');
      // stairs to the west
      for (let k = 0; k < 10; k++) box(hx - 38 - (10 - k) * 1.2 + 0.6, y0 + ((k + 1) * 1.05) / 2, hz, 1.2, (k + 1) * 1.05, 18, '#f7f5f1');
      box(hx, y0 + 21, hz, 40, 20, 40, '#f7f6f2');
      box(hx - 20.2, y0 + 17, hz, 0.4, 12, 8, '#233a6a');
      coneRoof(hx, y0 + 31, hz, 56, 56, 9, '#2c4fa0', 8, Math.PI / 8);
      box(hx, y0 + 41, hz, 26, 4, 26, '#f7f6f2', { ry: Math.PI / 8 });
      coneRoof(hx, y0 + 43, hz, 36, 36, 11, '#2c4fa0', 8, Math.PI / 8);
      lmB(hx, hz).geo(new THREE.SphereGeometry(1, 10, 8), hx, y0 + 55, hz, 1.6, 1.6, 1.6, U.col('#e2b33c'));
      solid(hx, hz, 76, 76, 58);
      // 自由廣場 gate at the west
      const gx = L.x0 + 14, gz = L.cz;
      for (let k = -2; k <= 2; k++) if (k !== 0) box(gx, y0 + 8, gz + k * 11, 8, 16, 5, '#f7f6f2');
      box(gx, y0 + 18, gz, 9, 4, 52, '#f7f6f2');
      box(gx, y0 + 20.5, gz, 10, 1, 54, '#2c4fa0');
      lmB(gx, gz).geo(new THREE.CylinderGeometry(0.01, 6, 1, 4), gx, y0 + 23, gz, 1, 4, 9, U.col('#2c4fa0'), { ry: Math.PI / 4 });
      for (let k = -2; k <= 2; k++) if (k !== 0) solid(gx, gz + k * 11, 8, 5, 16);
      label('自由廣場', gx + 4.6, y0 + 17.8, gz, 14, 3.2, Math.PI / 2, '#f7f6f2', '#1a1a1a');
      // theatre & concert hall
      for (const [dz, name] of [[-95, '國家戲劇院'], [95, '國家音樂廳']]) {
        const tx = L.cx - 20, tz = L.cz + dz;
        box(tx, y0 + 3, tz, 70, 6, 36, '#efece6');
        box(tx, y0 + 11, tz, 60, 10, 28, '#c23a2c');
        coneRoof(tx, y0 + 16, tz, 84, 44, 12, '#e3a13a');
        coneRoof(tx, y0 + 28, tz, 40, 20, 5, '#e3a13a');
        solid(tx, tz, 70, 36, 30);
      }
      // walkway trees
      W.extraTrees = W.extraTrees || [];
      for (let x = L.x0 + 30; x < hx - 44; x += 10) { W.extraTrees.push([x, W.SLAB, L.cz - 40, 1.1]); W.extraTrees.push([x, W.SLAB, L.cz + 40, 1.1]); }
      W.lmPOI.cks = { x: L.x0 - 4, z: L.cz };
    }
    // --- 大安森林公園
    {
      const L = W.lm.daanpark;
      L.pond = [L.cx + 20, L.cz - 30, L.cx + 55, L.cz - 8];
      box((L.pond[0] + L.pond[2]) / 2, y0 + 0.24, (L.pond[1] + L.pond[3]) / 2, L.pond[2] - L.pond[0], 0.04, L.pond[3] - L.pond[1], '#3b6e86');
      // amphitheatre shell
      const ax = L.cx - 40, az = L.cz + 25;
      lmB(ax, az).geo(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI, 0, Math.PI / 2), ax, y0, az, 12, 9, 8, U.col('#f2f2ee'), { ry: Math.PI / 2 });
      solid(ax, az, 8, 16, 9);
    }
    // --- 龍山寺 (faces south)
    {
      const L = W.lm.longshan, cx = L.cx, cz = L.cz + 5;
      const red = '#b3261e', roof = '#48604f', gold = '#d9a62e';
      const hall2 = (x, z, w, d, h, rh) => {
        box(x, y0 + 0.6, z, w + 4, 1.2, d + 4, '#c9bfae');
        box(x, y0 + 1.2 + h / 2, z, w, h, d, '#8e2a1f');
        for (let k = 0; k <= 6; k++) box(x - w / 2 + (k * w) / 6, y0 + 1.2 + h / 2, z + d / 2 + 1, 0.8, h, 0.8, red);
        // gabled roof (triangular prism) with a ridge and upturned swallowtail ends (燕尾脊)
        const alongZ = d > w;
        const L = (alongZ ? d : w) + 5, D = (alongZ ? w : d) + 5;
        const yb = y0 + 1.2 + h;
        box(x, yb + 0.2, z, w + 5, 0.4, d + 5, '#3a2a22');
        lmB(x, z).geo(PRISM, x, yb + 0.4 + rh / 3, z, D, L, rh / 0.866, U.col(roof), alongZ ? { rx: -Math.PI / 2 } : { rz: Math.PI / 2, rx: -Math.PI / 2 });
        const ry = alongZ ? Math.PI / 2 : 0;
        const ax = alongZ ? 0 : 1, az = alongZ ? 1 : 0;
        const top = yb + 0.4 + rh;
        box(x, top + 0.2, z, alongZ ? 0.7 : L * 0.82, 0.7, alongZ ? L * 0.82 : 0.7, '#d9a62e');
        for (const sgn of [-1, 1]) {
          const ex = x + ax * sgn * (L * 0.41 + 1), ez = z + az * sgn * (L * 0.41 + 1);
          lmB(ex, ez).box(ex, top + 0.9, ez, 2.8, 0.45, 0.6, U.col('#d9a62e'), { ry, rz: -sgn * 0.62 });
          lmB(ex, ez).box(x + ax * sgn * (L * 0.41 + 2.2), top + 1.8, z + az * sgn * (L * 0.41 + 2.2), 0.9, 0.35, 0.5, U.col('#3fa0a8'), { ry, rz: -sgn * 1.1 });
        }
        // little dragons / pearl on the ridge
        lmB(x, z).geo(new THREE.SphereGeometry(0.6, 8, 6), x, top + 1.2, z, 1, 1, 1, U.col('#e24a3b'));
        solid(x, z, w + 4, d + 4, h + rh + 2);
      };
      hall2(cx, cz + 34, 56, 12, 7, 5); // front hall
      hall2(cx, cz, 30, 22, 9, 7); // main hall
      hall2(cx, cz - 34, 60, 14, 8, 5); // rear hall
      hall2(cx - 36, cz, 10, 56, 6, 4); hall2(cx + 36, cz, 10, 56, 6, 4);
      lmB(cx, cz + 18).geo(new THREE.CylinderGeometry(1.4, 1.1, 1, 12), cx, y0 + 1.2, cz + 18, 1, 2.4, 1, U.col('#6a5a3a'));
      solid(cx, cz + 18, 2.4, 2.4, 3);
      W.lmPOI.longshan = { x: cx, z: L.z1 + 4 };
      W.lanterns = [];
      for (let k = -3; k <= 3; k++) W.lanterns.push([cx + k * 7, y0 + 7.2, cz + 42]);
      // 阿嬤麵線攤 on the sidewalk south-east of the temple
      const sx = L.x1 - 12, sz = L.z1 - 2.5;
      box(sx, y0 + 0.5, sz, 2.4, 1, 1.2, '#c59a5a'); box(sx, y0 + 1.05, sz, 2.6, 0.1, 1.4, '#eee');
      lmB(sx, sz).geo(new THREE.ConeGeometry(2, 0.8, 10), sx, y0 + 2.8, sz, 1, 1, 1, U.col('#e24a3b'));
      box(sx, y0 + 1.6, sz, 0.08, 2.4, 0.08, '#555');
      lmB(sx, sz).geo(new THREE.CylinderGeometry(0.4, 0.4, 1, 10), sx + 0.6, y0 + 1.3, sz, 1, 0.5, 1, U.col('#9a9a9a'));
      label('阿嬤麵線', sx, y0 + 1.6, sz + 0.75, 2.2, 0.55, 0, '#f6e7c1', '#9b1c12');
      W.addAABB(sx - 1.2, sz - 0.6, sx + 1.2, sz + 0.6, 1.2, 'stall');
      W.lmPOI.ama = { x: sx, z: sz + 1.9 };
    }
    // --- 國父紀念館
    {
      const L = W.lm.sysmh, cx = L.cx, cz = L.cz;
      box(cx, y0 + 1, cz, 64, 2, 64, '#e8e4dc');
      box(cx, y0 + 9, cz, 50, 14, 50, '#f1eee6');
      for (let k = -5; k <= 5; k++) for (const s of [-1, 1]) { box(cx + k * 4.8, y0 + 9, cz + s * 26, 1.2, 14, 1.2, '#b8b0a2'); box(cx + s * 26, y0 + 9, cz + k * 4.8, 1.2, 14, 1.2, '#b8b0a2'); }
      box(cx, y0 + 16.6, cz, 60, 1.2, 60, '#d8a53a');
      coneRoof(cx, y0 + 17, cz, 66, 66, 12, '#e0ae3e');
      solid(cx, cz, 54, 54, 28);
      W.lmPOI.sysmh = { x: cx, z: L.z1 + 2 };
    }
    // --- 台北101
    {
      const L = W.lm.t101, cx = L.cx + 10, cz = L.cz + 5;
      const glass = '#4f8a80', dark = '#2f5a55';
      const g = new U.GeoBuilder(1);
      g.box(cx - 10, y0 + 15, cz + 30, 110, 30, 40, U.col('#cfd3d4')); // mall podium
      g.geo(new THREE.CylinderGeometry(0.7071, 0.7071, 1, 4), cx, y0 + 30, cz - 12, 44 * 1.0, 60, 44, U.col(glass), { ry: Math.PI / 4 });
      let y = y0 + 60;
      for (let s = 0; s < 8; s++) {
        g.geo(new THREE.CylinderGeometry(0.7071 * 1.26, 0.7071 * 1.0, 1, 4), cx, y + 17, cz - 12, 30, 34, 30, U.col(s % 2 ? glass : '#56938a'), { ry: Math.PI / 4 });
        g.box(cx, y + 34.3, cz - 12, 37, 0.8, 37, U.col(dark));
        y += 34.6;
      }
      g.geo(new THREE.CylinderGeometry(0.7071 * 0.8, 0.7071, 1, 4), cx, y + 10, cz - 12, 26, 20, 26, U.col(glass), { ry: Math.PI / 4 });
      g.geo(new THREE.CylinderGeometry(0.7071 * 0.7, 0.7071 * 0.8, 1, 4), cx, y + 26, cz - 12, 16, 12, 16, U.col(glass), { ry: Math.PI / 4 });
      g.geo(new THREE.CylinderGeometry(0.4, 1.2, 1, 8), cx, y + 62, cz - 12, 1, 60, 1, U.col('#b8c0c0'));
      // ruyi ornaments
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.geo(new THREE.CylinderGeometry(3, 3, 1, 12), cx + a * 22.5, y0 + 54, cz - 12 + b * 22.5, 1, 6, 1, U.col('#c7a043'), { rx: b ? Math.PI / 2 : 0, rz: a ? Math.PI / 2 : 0 });
      const mesh = new THREE.Mesh(g.build(), W.mat.t101);
      mesh.castShadow = true; mesh.receiveShadow = true;
      W.scene.add(mesh);
      W.t101 = { x: cx, z: cz - 12, top: y + 92 };
      // night band lights
      const bandG = new U.GeoBuilder(1);
      let yb = y0 + 60;
      for (let s = 0; s < 8; s++) { bandG.box(cx, yb + 33.6, cz - 12, 37.6, 0.35, 37.6, U.col('#ffffff')); yb += 34.6; }
      W.scene.add(new THREE.Mesh(bandG.build(), W.mat.t101band));
      solid(cx - 10, cz + 30, 110, 40, 30); solid(cx, cz - 12, 50, 50, 500);
      label('TAIPEI 101', cx - 10, y0 + 24, cz + 50.2, 26, 5, 0, '#1b1b1b', '#e9c46a');
      W.lmPOI.t101 = { x: cx, z: L.z0 - 4 };
    }
    // --- special buildings in normal cells: hospital, police, SOGA
    special(-320, -200, 'hospital');
    special(-160, -200, 'police');
    special(330, -200, 'soga');
    special(-850, 220, 'garage');
    buildMarket();
  }

  // 萬福市場: a covered wet-market street right behind the scooter shop
  function buildMarket() {
    const x = -850, z0 = 316, z1 = 394, y0 = 0.02;
    const tarps = ['#e24a3b', '#2f6fb3', '#f2c230', '#3f8f5a', '#e27ba0', '#f28c28'];
    const goods = ['#9ccc65', '#e53935', '#ffb74d', '#fff176', '#8d6e63', '#f5f5f5', '#4fc3f7', '#ce93d8'];
    W.stalls = [];
    let k = 0;
    for (let z = z0; z < z1; z += 11) for (const side of [-1, 1]) {
      const sx = x + side * 3.4, sz = z + 4;
      const g = B('detail', sx, sz);
      g.box(sx, y0 + 0.45, sz, 1.6, 0.9, 3.6, U.col('#b98b5e'));
      for (let i = 0; i < 6; i++) g.box(sx + U.rr(-0.5, 0.5), y0 + 1.0, sz + U.rr(-1.5, 1.5), 0.35, 0.2, 0.35, U.col(U.pick(goods)));
      g.box(sx + side * 0.6, y0 + 1.25, sz, 0.08, 2.5, 0.08, U.col('#666'));
      g.box(sx, y0 + 2.6, sz, 2.4, 0.08, 4.4, U.col(U.pick(tarps)), { rz: side * 0.12 });
      W.addAABB(sx - 0.8, sz - 1.8, sx + 0.8, sz + 1.8, 1.1, 'stall');
      W.stalls.push({ x: sx - side * 1.6, z: sz, side, name: ['菜攤', '豬肉攤', '水果攤', '魚攤', '豆腐攤', '雜貨攤', '花攤', '雞蛋行'][k++ % 8] });
      W.lanterns = W.lanterns || [];
      W.lanterns.push([sx - side * 0.2, y0 + 2.35, sz]);
    }
    // entrance arch on 和平東路 side
    const ag = B('detail', x, z0 - 4);
    ag.box(x - 4.6, 3, z0 - 5, 0.4, 6, 0.4, U.col('#8a2a1f')); ag.box(x + 4.6, 3, z0 - 5, 0.4, 6, 0.4, U.col('#8a2a1f'));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.5), new THREE.MeshBasicMaterial({ map: W.labelTex('萬福市場', '#8a2a1f', '#ffe9b0'), side: THREE.DoubleSide }));
    m.position.set(x, 6.1, z0 - 5); W.scene.add(m);
    W.lmPOI.market = { x, z: z0 + 20 };
  }

  function special(nx, nz, kind) {
    const c = W.cells.find((c) => Math.abs(c.sides.w.c - nx) < 1 && Math.abs(c.sides.n.c - nz) < 1);
    if (!c) return;
    c.lm = { id: kind, special: true };
    const x0 = c.x0 + 4, x1 = c.x1 - 4, z0 = c.z0 + 4, z1 = c.z1 - 4, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const y0 = W.SLAB;
    const g = B('detail', cx, cz);
    const N = W.region.names || {};
    const label = (t, bg, fg, y, w, h, sub) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: W.labelTex(t, bg, fg, 512, sub ? 160 : 128, sub) }));
      m.position.set(cx, y, z0 - 0.15); m.rotation.y = Math.PI; W.scene.add(m);
    };
    if (kind === 'hospital') {
      B('res', cx, cz).box(cx, y0 + 14, cz, x1 - x0, 28, z1 - z0, U.col('#eeeeea'), { facade: [14, 12.8] });
      label((N.hospital || ['市立醫院', 'CITY HOSPITAL'])[0], '#ffffff', '#c8102e', y0 + 22, 16, 3.4, (N.hospital || ['市立醫院', 'CITY HOSPITAL'])[1]);
      g.box(cx, y0 + 30, cz, 6, 1.6, 1.6, U.col('#d71a28')); g.box(cx, y0 + 30, cz, 1.6, 6, 1.6, U.col('#d71a28'));
      W.addAABB(x0, z0, x1, z1, 28, 'bld');
      W.lmPOI.hospital = { x: cx, z: c.z0 - 2 };
    } else if (kind === 'police') {
      B('res', cx, cz).box(cx, y0 + 10, cz, x1 - x0, 20, z1 - z0, U.col('#dfe6ee'), { facade: [14, 12.8] });
      g.box(cx, y0 + 4.5, z0 - 0.1, x1 - x0, 1.2, 0.2, U.col('#1d3f8f'));
      label((N.police || ['警察局', 'POLICE'])[0], '#1d3f8f', '#ffffff', y0 + 7, 16, 2.6, (N.police || ['警察局', 'POLICE'])[1]);
      W.addAABB(x0, z0, x1, z1, 20, 'bld');
      W.lmPOI.police = { x: cx, z: c.z0 - 2 };
    } else if (kind === 'garage') {
      // 阿福機車行: open-front scooter repair shop with homes above; the player's base
      const gw = 20, gd = 16;
      const gx0 = cx - gw / 2, gx1 = cx + gw / 2, gz1 = z0 + gd;
      g.box(gx0 + 0.2, y0 + 2.1, z0 + gd / 2, 0.4, 4.2, gd, U.col('#9a9a92'));
      g.box(gx1 - 0.2, y0 + 2.1, z0 + gd / 2, 0.4, 4.2, gd, U.col('#9a9a92'));
      g.box(cx, y0 + 2.1, gz1 - 0.2, gw, 4.2, 0.4, U.col('#7d8a8f'));
      g.box(cx, y0 + 0.02, z0 + gd / 2, gw, 0.04, gd, U.col('#5a5d60'));
      B('res', cx, cz).box(cx, y0 + 4.2 + 6, z0 + gd / 2, gw, 12, gd, U.col('#cfc7b8'), { facade: [14, 12.8] });
      // rolled-up shutter, tool wall, tyres, lifts
      g.box(cx, y0 + 4.0, z0 + 0.3, gw - 0.8, 0.4, 0.5, U.col('#a7aaa6'));
      g.box(cx, y0 + 2.2, gz1 - 0.5, 12, 2.2, 0.1, U.col('#3c4a55'));
      for (let i = 0; i < 9; i++) g.box(cx - 5 + i * 1.25, y0 + 2.3 + (i % 3) * 0.5, gz1 - 0.6, 0.12, 0.5, 0.08, U.col(U.pick(['#d0d0d0', '#c0392b', '#f1c40f'])));
      for (let i = 0; i < 4; i++) g.geo(new THREE.TorusGeometry(0.32, 0.12, 6, 12), gx1 - 1.4, y0 + 0.14 + i * 0.25, gz1 - 2, 1, 1, 1, U.col('#1b1b1b'), { rx: Math.PI / 2 });
      for (const [lx, col] of [[cx - 5, '#e24a3b'], [cx + 1, '#2f6fb3']]) {
        g.box(lx, y0 + 0.35, z0 + 8, 1.2, 0.7, 2.6, U.col('#555'));
        g.geo(Models.scooterGeoLow(), lx, y0 + 0.7, z0 + 8, 1, 1, 1, U.col(col));
      }
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), new THREE.MeshBasicMaterial({ map: W.labelTex('阿福機車行', '#c62828', '#ffffff', 512, 128) }));
      sign.position.set(cx, y0 + 4.9, z0 - 0.12); sign.rotation.y = Math.PI; W.scene.add(sign);
      W.addAABB(gx0, z0, gx0 + 0.4, gz1, 16, 'bld'); W.addAABB(gx1 - 0.4, z0, gx1, gz1, 16, 'bld'); W.addAABB(gx0, gz1 - 0.4, gx1, gz1, 16, 'bld');
      W.addAABB(cx - 5.6, z0 + 6.7, cx - 4.4, z0 + 9.3, 1, 'lift'); W.addAABB(cx + 0.4, z0 + 6.7, cx + 1.6, z0 + 9.3, 1, 'lift');
      // neighbours on either side and behind
      for (const [bx0, bx1, bz0, bz1, h] of [[x0, gx0 - 0.5, z0, z1, 14.2], [gx1 + 0.5, x1, z0, z1, 17.4], [gx0, gx1, gz1 + 0.5, z1, 11]]) {
        const bcx = (bx0 + bx1) / 2, bcz = (bz0 + bz1) / 2;
        B('shop', bcx, bcz).box(bcx, y0 + 2.1, bcz, bx1 - bx0, 4.2, bz1 - bz0, U.col('#ffffff'), { facade: [6, 4.2] });
        B('res', bcx, bcz).box(bcx, y0 + 4.2 + (h - 4.2) / 2, bcz, bx1 - bx0, h - 4.2, bz1 - bz0, U.col(U.pick(RES_COL)), { facade: [14, 12.8] });
        W.addAABB(bx0, bz0, bx1, bz1, h, 'bld');
      }
      W.lmPOI.garage = { x: cx, z: z0 + 4 };
      W.lmPOI.garageFront = { x: cx + 6, z: c.z0 - 2.5 };
    } else if (kind === 'soga') {
      B('shop', cx, cz).box(cx, y0 + 3, cz, x1 - x0, 6, z1 - z0, U.col('#fff'), { facade: [6, 6] });
      g.box(cx, y0 + 34, cz, x1 - x0, 56, z1 - z0, U.col('#efefeb'));
      g.box(cx, y0 + 58, cz, x1 - x0 + 0.4, 5, z1 - z0 + 0.4, U.col('#c8102e'));
      label('SOGA 百貨', '#c8102e', '#ffffff', y0 + 58, 26, 4.4);
      W.addAABB(x0, z0, x1, z1, 62, 'bld');
      W.lmPOI.soga = { x: cx, z: c.z0 - 2 };
    }
  }

  // ----- distant scenery, per side of the map: 'city' | 'river' | 'sea' | 'fields' | 'hills'
  function buildOuter() {
    const b = W.bounds, O = W.region.outer || {};
    const kind = (s) => O[s] || 'city';
    const open = (s) => kind(s) === 'city' || kind(s) === 'fields';
    const ring = (x0, z0, x1, z1, lo = 10, hi = 55, gap = 1) => {
      for (let x = x0; x < x1; x += U.rr(18, 34) * gap) for (let z = z0; z < z1; z += U.rr(18, 34) * gap) {
        const h = U.rr(lo, hi), w = U.rr(12, 22), d = U.rr(12, 22);
        B('res', x, z).box(x, h / 2, z, w, h, d, U.col(U.pick(RES_COL)), { facade: [14, 12.8, U.ri(0, 3) * 0.25, U.ri(0, 3) * 0.25] });
      }
    };
    const flat = (r, y, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r[2] - r[0], r[3] - r[1]), mat); m.rotation.x = -Math.PI / 2; m.position.set((r[0] + r[2]) / 2, y, (r[1] + r[3]) / 2); W.scene.add(m); return m; };
    const seaMat = new THREE.MeshLambertMaterial({ color: 0x2c6079 }), fieldMat = new THREE.MeshLambertMaterial({ color: 0x5f8a47 });
    const FAR = 2600;
    const xa = open('w') ? b.x0 - 260 : b.x0 + 10, xb = open('e') ? b.x1 + 260 : b.x1 - 10;
    const strips = { n: [xa, b.z0 - 260, xb, b.z0 - 12], s: [xa, b.z1 + 12, xb, b.z1 + 260], w: [b.x0 - 260, b.z0 - 12, b.x0 - 12, b.z1 + 12], e: [b.x1 + 12, b.z0 - 12, b.x1 + 260, b.z1 + 12] };
    const beyond = { n: [-FAR, b.z0 - FAR, FAR, b.z0 - 9], s: [-FAR, b.z1 + 9, FAR, b.z1 + FAR], w: [b.x0 - FAR, -FAR, b.x0 - 9, FAR], e: [b.x1 + 9, -FAR, b.x1 + FAR, FAR] };
    const mg = new U.GeoBuilder(1);
    const mc = ['#40593f', '#3a5238', '#4a6446', '#56705a'];
    const dome = new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const s of ['n', 's', 'w', 'e']) {
      const k = kind(s), r = strips[s];
      if (k === 'city') ring(r[0], r[1], r[2], r[3]);
      else if (k === 'river') {
        const water = new THREE.Mesh(new THREE.PlaneGeometry(420, 3000), new THREE.MeshLambertMaterial({ color: 0x3f6173 }));
        water.rotation.x = -Math.PI / 2; water.position.set(b.x0 - 230, -0.6, 0);
        W.scene.add(water);
        B('detail', b.x0 - 6, 0).box(b.x0 - 6, 1.5, 0, 6, 3, 1400, U.col('#8e8d86'));
        ring(b.x0 - 460, -700, b.x0 - 240, 700);
      } else if (k === 'sea') {
        flat(beyond[s], 0.22, seaMat);
        const horiz = s === 'n' || s === 's';
        const wx = horiz ? (b.x0 + b.x1) / 2 : s === 'w' ? b.x0 - 6 : b.x1 + 6, wz = horiz ? (s === 'n' ? b.z0 - 6 : b.z1 + 6) : (b.z0 + b.z1) / 2;
        B('detail', wx, wz).box(wx, 0.7, wz, horiz ? b.x1 - b.x0 + 30 : 3, 1.4, horiz ? 3 : b.z1 - b.z0 + 30, U.col('#8e8d86'));
      } else {
        flat(beyond[s], 0.1, fieldMat);
        if (k === 'fields') ring(r[0], r[1], r[2], r[3], 4, 9, 3.4);
        else for (let i = 0; i < 9; i++) {
          const t = (i + 0.5) / 9, off = U.rr(270, 440), wd = U.rr(260, 400), h = U.rr(60, 150);
          const x = s === 'w' ? b.x0 - off : s === 'e' ? b.x1 + off : U.lerp(b.x0 - 200, b.x1 + 200, t);
          const z = s === 'n' ? b.z0 - off : s === 's' ? b.z1 + off : U.lerp(b.z0 - 200, b.z1 + 200, t);
          mg.geo(dome, x, -5, z, wd / 2, h, wd * 0.45, U.col(U.pick(mc)), { ry: U.rand() * 3 });
        }
      }
    }
    // far mountains all around, except out at sea
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * Math.PI * 2;
      const r = U.rr(1500, 1900);
      const x = Math.cos(a) * r * 1.2, z = Math.sin(a) * r;
      const h = U.rr(110, 260) * (z < 0 ? 1.4 : 1), wd = U.rr(420, 800);
      const side = Math.abs(x) / 1.2 > Math.abs(z) ? (x < 0 ? 'w' : 'e') : z < 0 ? 'n' : 's';
      if (kind(side) === 'sea') continue;
      mg.geo(dome, x, -5, z, wd / 2, h, wd * 0.4, U.col(U.pick(mc)), { ry: U.rand() * 3 });
    }
    if (W.region.outerExtra) W.region.outerExtra(mg, dome);
    const mm = new THREE.Mesh(mg.build(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    W.scene.add(mm);
  }

  // roads that flood in heavy rain (the signature weather mechanic)
  W.floodLevel = 0;
  const floodGrid = new Map();
  function buildFloodZones() {
    const gb = new U.GeoBuilder(1);
    const white = U.col('#ffffff');
    W.floodRects = [];
    for (const s of W.segs) {
      const A = W.nodes[s.a], Bn = W.nodes[s.b];
      const mx = (A.x + Bn.x) / 2, mz = (A.z + Bn.z) / 2;
      const low = !!W.region.flood && W.region.flood(mx, mz);
      if (!low) continue;
      const hw = s.w / 2;
      const r = s.axis === 'z' ? [A.x - hw, Math.min(A.z, Bn.z) - hw, A.x + hw, Math.max(A.z, Bn.z) + hw] : [Math.min(A.x, Bn.x) - hw, A.z - hw, Math.max(A.x, Bn.x) + hw, A.z + hw];
      W.floodRects.push(r);
      gb.quad([new THREE.Vector3(r[0], 0, r[1]), new THREE.Vector3(r[0], 0, r[3]), new THREE.Vector3(r[2], 0, r[3]), new THREE.Vector3(r[2], 0, r[1])], white, [r[0] / 8, r[1] / 8, r[0] / 8, r[3] / 8, r[2] / 8, r[3] / 8, r[2] / 8, r[1] / 8]);
      for (let ix = Math.floor(r[0] / 20); ix <= Math.floor(r[2] / 20); ix++) for (let iz = Math.floor(r[1] / 20); iz <= Math.floor(r[3] / 20); iz++) {
        const k = ix * 10007 + iz;
        if (!floodGrid.has(k)) floodGrid.set(k, []);
        floodGrid.get(k).push(r);
      }
    }
    if (!W.floodRects.length) { W.floodMesh = null; return; }
    if (!W.mat.flood) {
    const tex = U.canvasTex(128, 128, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,255,255,${0.2 + U.rand() * 0.3})`; g.fillStyle = 'rgba(160,190,210,0.25)'; g.beginPath(); g.ellipse(U.rand() * 128, U.rand() * 128, 6 + U.rand() * 14, 2 + U.rand() * 4, 0, 0, 7); g.fill(); }
    }, { repeat: true });
    W.mat.flood = U.surface({ map: tex, color: 0x536c70, roughness: 0.2, metalness: 0.12, envMapIntensity: 1.1, transparent: true, opacity: 0.7, depthWrite: false, emissive: 0x030506 }, { normalMap: W.tex.ripple, normalScale: new THREE.Vector2(0.45, 0.45) });
    }
    const mesh = new THREE.Mesh(gb.build(), W.mat.flood);
    mesh.visible = false;
    mesh.renderOrder = 2;
    W.scene.add(mesh);
    W.floodMesh = mesh;
  }
  // water depth (m) at a point on a flooded road, 0 elsewhere
  W.floodAt = function (x, z) {
    if (W.floodLevel <= 0.01) return 0;
    const a = floodGrid.get(Math.floor(x / 20) * 10007 + Math.floor(z / 20));
    if (!a) return 0;
    for (const r of a) if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) return W.floodLevel;
    return 0;
  };
  W.setFlood = function (level, t) {
    W.floodLevel = level;
    if (!W.floodMesh) return;
    W.floodMesh.visible = level > 0.01;
    W.floodMesh.position.y = level;
    if (W.mat.flood.map) W.mat.flood.map.offset.set(t * 0.02, t * 0.013);
    if (W.mat.flood.normalMap) W.mat.flood.normalMap.offset.set(t * 0.012, -t * 0.009);
  };

  function buildWorldWalls() {
    const b = W.bounds, t = 4;
    W.addAABB(b.x0 - t, b.z0 - t, b.x1 + t, b.z0, 999, 'wall');
    W.addAABB(b.x0 - t, b.z1, b.x1 + t, b.z1 + t, 999, 'wall');
    W.addAABB(b.x0 - t, b.z0, b.x0, b.z1, 999, 'wall');
    W.addAABB(b.x1, b.z0, b.x1 + t, b.z1, 999, 'wall');
  }

  // ---------------- 2D map for minimap / full map ----------------
  W.buildMapCanvas = function () {
    const s = 1; // px per metre
    const b = W.bounds;
    const w = Math.ceil((b.x1 - b.x0) * s), h = Math.ceil((b.z1 - b.z0) * s);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const X = (x) => (x - b.x0) * s, Z = (z) => (z - b.z0) * s;
    g.fillStyle = '#23262c'; g.fillRect(0, 0, w, h);
    for (const cell of W.cells) {
      if (cell.lm && !cell.lm.special) continue;
      g.fillStyle = '#3a3e46'; g.fillRect(X(cell.x0), Z(cell.z0), (cell.x1 - cell.x0) * s, (cell.z1 - cell.z0) * s);
    }
    for (const L of W.landmarks) {
      g.fillStyle = L.park ? '#2f5a34' : '#4a4640';
      g.fillRect(X(L.x0), Z(L.z0), (L.x1 - L.x0) * s, (L.z1 - L.z0) * s);
    }
    g.fillStyle = '#51565f';
    for (const lot of W.lots) g.fillRect(X(lot.x0) + 1, Z(lot.z0) + 1, (lot.x1 - lot.x0) * s - 2, (lot.z1 - lot.z0) * s - 2);
    for (const s2 of W.segs) {
      if (!s2.ped) continue;
      const A = W.nodes[s2.a], Bn = W.nodes[s2.b];
      g.strokeStyle = '#7a5646'; g.lineWidth = s2.w * s;
      g.beginPath(); g.moveTo(X(A.x), Z(A.z)); g.lineTo(X(Bn.x), Z(Bn.z)); g.stroke();
    }
    // landmark shapes
    const lmCol = { station: '#b89a6a', redhouse: '#b3482f', office: '#a5523e', cks: '#e8e6e0', longshan: '#b3261e', sysmh: '#e0ae3e', t101: '#4f8a80' };
    for (const L of W.landmarks) {
      if (L.water) { g.fillStyle = '#2b4a5c'; g.fillRect(X(L.water[0]), Z(L.water[1]), (L.water[2] - L.water[0]) * s, (L.water[3] - L.water[1]) * s); }
      const col = L.col || (W.regionId === 'taipei' && lmCol[L.id]);
      if (!col) continue;
      g.fillStyle = col;
      const ww = (L.x1 - L.x0) * 0.45, hh = (L.z1 - L.z0) * 0.45;
      g.fillRect(X(L.cx) - ww / 2, Z(L.cz) - hh / 2, ww, hh);
    }
    // water
    g.fillStyle = '#2b4a5c';
    const O = W.region.outer || {}, wet = (k) => O[k] === 'sea' || O[k] === 'river';
    if (wet('w')) g.fillRect(0, 0, 4, h);
    if (wet('e')) g.fillRect(w - 4, 0, 4, h);
    if (wet('n')) g.fillRect(0, 0, w, 4);
    if (wet('s')) g.fillRect(0, h - 4, w, 4);
    // road names on main roads
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = `700 11px ${FONT}`; g.textAlign = 'center';
    const nameX = (b.x0 + b.x1) / 2 + (b.x1 - b.x0) * 0.127, nameZ = (b.z0 + b.z1) / 2 - (b.z1 - b.z0) * 0.1;
    for (const L of W.Z) if (L.main) g.fillText(L.name, X(nameX), Z(L.c) + 4);
    g.save();
    for (const L of W.X) if (L.main) { g.save(); g.translate(X(L.c) + 4, Z(nameZ)); g.rotate(-Math.PI / 2); g.fillText(L.name, 0, 0); g.restore(); }
    g.restore();
    W.mapCanvas = c;
    W.mapScale = s;
    return c;
  };

  // ---------------- Regions ----------------
  // Each region is its own map; World.setRegion() swaps the road grid and clears everything built for the last one.
  W.REGIONS = {
    taipei: {
      id: 'taipei', zh: '台北市', en: 'TAIPEI CITY', desc: '首都。101、西門町，還有巷子裡的人情', salt: 0,
      districts: D, districtAt: W.districtAt, mainX, mainZ, landmarks: W.landmarks, pedZones: W.pedZones, mrt: MRT_DEF,
      gas: [['建國仁愛站', 180, -60, 1, 1], ['光復信義站', 620, 80, -1, 1], ['康定民生站', -760, -330, 1, -1], ['復興和平站', 330, 220, 1, 1]],
      names: { hospital: ['台大醫院', 'NTU HOSPITAL'], police: ['台北市警察局', 'TAIPEI CITY POLICE'] },
      build: taipeiLandmarks,
      flood: (mx, mz) => (mx < -690 && mz > -60) || (mx > -10 && mx < 340 && mz > 210 && mz < 410),
      outer: { w: 'river' },
      outerExtra: (mg, dome) => mg.geo(dome, 1250, -5, 250, 160, 150, 120, U.col('#3f5d3c')), // 象山
      nightMarket: { name: '寧夏夜市', xa: -600, xb: -460, z: -390 },
      gates: [{ side: 'w', at: -200, to: 'newtaipei', road: '忠孝橋' }, { side: 'n', at: 760, to: 'keelung', road: '國道1號' }, { side: 'e', at: 220, to: 'yilan', road: '國道5號' }],
      shops: { clothes: [-700, -60, 'ximen', 'XIMEN STREET WEAR'], barber: [-880, 300, 'wanhua', '老街理髮廳'], noodle: [-420, -150, 'station', '老王牛肉麵'], dealer: [420, -120, 'east', '寶島汽車展示中心'], netcafe: [250, -150, 'east', '極速網咖 24H'], ktv: [-650, 20, 'ximen', '好聲音 KTV'] },
      labels: [['西門町', -680, -120], ['萬華', -850, 300], ['台北車站', -460, -300], ['中山', -150, -500], ['博愛特區', -380, 150], ['中正紀念堂', -160, 460], ['忠孝東區', 330, -270], ['大安', 330, 150], ['信義', 850, -150]],
    },
  };
  W.setRegion = function (id) {
    const R = (Object.prototype.hasOwnProperty.call(W.REGIONS, id) && W.REGIONS[id]) || W.REGIONS.taipei;
    W.region = R; W.regionId = R.id;
    W.D = R.districts; W.districtAt = R.districtAt;
    W.X = makeLines(R.mainX); W.Z = makeLines(R.mainZ);
    W.bounds = { x0: W.X[0].c - 8, x1: W.X[W.X.length - 1].c + 8, z0: W.Z[0].c - 8, z1: W.Z[W.Z.length - 1].c + 8 };
    W.landmarks = R.landmarks; W.pedZones = R.pedZones || [];
    W.grid.clear(); W.aabbs.length = 0; floodGrid.clear(); chunks.clear();
    W.lots = []; W.stores = []; W.restaurants = []; W.frontages = []; W.mrt = []; W.gasSites = []; W.lmPOI = {};
    W.lanterns = []; W.extraTrees = []; W.stalls = []; W.parkingSpots = []; W.floodRects = [];
    W.nightMarket = null; W.t101 = null; W.floodMesh = null; W.glowMat = null;
  };
  W.setRegion('taipei');

  window.World = W;
})();
