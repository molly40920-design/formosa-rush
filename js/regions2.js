// 寶島狂飆 — the rest of Taiwan: central, south, east and the outlying islands
(function () {
  const W = World, R = W.REGIONS, F = Regions.fn;
  const { mkD, cyl, taper, ball, tree, water, trainSet, station, hsrStation, paddy, pavilion, airliner } = F;
  const C = (h) => U.col(h);
  let K = null, y0 = 0;
  const use = (kit) => { K = kit; y0 = kit.y0; F.kit(kit); };

  // ---------- road grid templates ----------
  const AX = [-560, -400, -240, -80, 80, 240, 400, 560], AZ = [-400, -260, -120, 20, 160, 300, 400];
  const BX = [-700, -540, -380, -220, -60, 100, 260, 420, 580, 700], BZ = [-460, -320, -180, -40, 100, 240, 380, 460];
  const CX = [-400, -240, -80, 80, 240, 400], CZ = [-280, -140, 0, 140, 280];
  const lines = (cs, names, wide = []) => cs.map((c, i) => [c, i === 0 || i === cs.length - 1 ? 14 : wide.includes(i) ? 26 : 22, names[i], wide.includes(i)]);
  // slots that every template keeps free of landmarks
  const A_STD = {
    pedZone: (name) => [[-80, 320, 80, 380, name]], nm: (name) => ({ name, xa: -80, xb: 80, z: 350 }),
    gas: (a, b) => [[a, 80, -120, 1, 1], [b, 400, 160, -1, -1]],
    shops: (p) => ({ clothes: [0, -60, null, p + '服飾'], barber: [-160, 230, null, p + '理髮廳'], noodle: [160, 90, null, p + '牛肉麵'], dealer: [160, -60, null, `寶島汽車 ${p}展示中心`], netcafe: [-160, 90, null, '極速網咖 24H'], ktv: [0, 240, null, '好聲音 KTV'] }),
  };
  const B_STD = {
    pedZone: (name) => [[100, 140, 260, 200, name]], nm: (name) => ({ name, xa: 100, xb: 260, z: 170 }),
    gas: (a, b) => [[a, -540, -320, 1, 1], [b, 260, 380, 1, -1]],
    mrt: (n) => [[n[0], n[1], -380, -180, -1, 1], [n[2], n[3], -380, -40, 1, -1], [n[4], n[5], 100, -320, 1, 1], [n[6], n[7], 260, 100, 1, 1], [n[8], n[9], 580, 240, -1, -1]],
    shops: (p) => ({ clothes: [-300, -100, null, p + '服飾'], barber: [150, 300, null, p + '理髮廳'], noodle: [-450, -250, null, p + '牛肉麵'], dealer: [320, -100, null, `寶島汽車 ${p}展示中心`], netcafe: [-140, -110, null, '極速網咖 24H'], ktv: [180, 60, null, '好聲音 KTV'] }),
  };
  const C_STD = {
    pedZone: (name) => [[80, 180, 240, 240, name]], nm: (name) => ({ name, xa: 80, xb: 240, z: 210 }),
    gas: (a) => [[a, -80, 140, -1, 1]],
    shops: (p) => ({ clothes: [0, -70, null, p + '服飾'], barber: [-160, 70, null, p + '理髮廳'], noodle: [160, 70, null, p + '小吃'], dealer: [0, 200, null, `寶島汽車 ${p}展示中心`], netcafe: [-160, -200, null, '極速網咖 24H'], ktv: [160, -70, null, '好聲音 KTV'] }),
  };
  const specialsA = (police = [-240, 20]) => { K.special(80, 160, 'hospital'); K.special(police[0], police[1], 'police'); };
  const specialsB = () => { K.special(-60, -40, 'hospital'); K.special(100, -180, 'police'); };
  const specialsC = () => { K.special(80, 0, 'hospital'); K.special(-240, 0, 'police'); };

  // ---------- more building blocks ----------
  const box = (...a) => K.box(...a);
  function sign(text, x, z, w, bg = '#3f5a4a', fg = '#ffffff', sub) {
    K.label(text, x, y0 + 3.2, z, w, sub ? 3 : 2.4, 0, bg, fg, sub);
    for (const s of [-1, 1]) box(x + s * (w / 2 - 0.6), y0 + 1.4, z, 0.35, 2.8, 0.35, '#555555');
  }
  function lighthouse(x, z, h = 24) {
    cyl(x, y0, z, 4.2, 1.2, '#d8d4c8', 12);
    taper(x, y0 + 1.2, z, 2.7, 1.7, h, '#fbfbf7', 14);
    cyl(x, y0 + 1.2 + h, z, 2.4, 0.5, '#2a2d30'); cyl(x, y0 + 1.7 + h, z, 1.5, 2.6, '#ffe9a0', 10);
    taper(x, y0 + 4.3 + h, z, 1.9, 0.1, 2, '#2a2d30', 10);
    K.solid(x, z, 6, 6, h + 6);
  }
  function pagoda(x, z, tiers, wall, roof) {
    for (let i = 0; i < tiers; i++) {
      const r = 4.4 - i * 0.28;
      cyl(x, y0 + i * 4.2, z, r, 3.4, wall, 8);
      taper(x, y0 + i * 4.2 + 3.4, z, r + 1.9, r - 0.3, 0.9, roof, 8);
    }
    taper(x, y0 + tiers * 4.2, z, 1.2, 0.05, 4, '#d9a62e', 8);
    K.solid(x, z, 9, 9, tiers * 4.2 + 4);
  }
  function buddha(x, z, s, c = '#3a3632') {
    cyl(x, y0, z, 9 * s, 3 * s, '#c9bfae', 16);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ball(x + Math.cos(a) * 7.4 * s, y0 + 3.6 * s, z + Math.sin(a) * 7.4 * s, 2 * s, 1.1 * s, 2 * s, '#e8b9c0'); }
    ball(x, y0 + 5.4 * s, z, 7.4 * s, 2.6 * s, 6 * s, c);
    ball(x, y0 + 10.2 * s, z, 4.8 * s, 5.4 * s, 4 * s, c);
    ball(x, y0 + 16.6 * s, z, 2.7 * s, 3 * s, 2.7 * s, c);
    ball(x, y0 + 19.6 * s, z, 1.2 * s, 1.1 * s, 1.2 * s, c);
    for (const sx of [-1, 1]) ball(x + sx * 4.2 * s, y0 + 8.4 * s, z + 2 * s, 1.5 * s, 3.2 * s, 2 * s, c);
    K.solid(x, z, 18 * s, 18 * s, 22 * s);
  }
  function turbine(x, z, h = 46) {
    taper(x, y0, z, 1.3, 0.6, h, '#f4f6f7', 10);
    box(x, y0 + h + 0.6, z, 1.6, 1.6, 4, '#f4f6f7');
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.4; box(x - Math.sin(a) * 10, y0 + h + 0.6 + Math.cos(a) * 10, z + 2.2, 0.9, 20, 0.25, '#ffffff', { rz: a }); }
    K.solid(x, z, 2.6, 2.6, h);
  }
  function balloon(x, y, z, c1, c2) {
    ball(x, y, z, 7, 8.6, 7, c1); ball(x, y + 1, z, 7.15, 2.4, 7.15, c2); ball(x, y - 4.4, z, 5.2, 1.6, 5.2, c2);
    taper(x, y - 12.4, z, 0.9, 3.4, 5, c1, 10);
    box(x, y - 13.6, z, 1.7, 1.5, 1.7, '#8a5a2a');
  }
  function ferry(x, z, len = 46, stripe = '#1f4f9c') {
    box(x, y0 + 2, z, len, 4, 9, '#f5f5f2'); box(x, y0 + 0.9, z, len + 0.2, 1, 9.2, stripe);
    K.lmB(x, z).geo(new THREE.CylinderGeometry(4.5, 4.5, 4, 3), x + len / 2 + 2.2, y0 + 2, z, 1, 1, 1, C('#f5f5f2'), { ry: -Math.PI / 2 });
    box(x - 3, y0 + 5.4, z, len * 0.62, 2.8, 7, '#fbfbf9'); box(x - 3, y0 + 5.6, z, len * 0.62 + 0.1, 1, 7.1, '#22303a');
    cyl(x - len * 0.2, y0 + 6.8, z, 1.3, 2.6, stripe);
  }
  // sea / air terminal for the islands (stands in for the railway station)
  function terminal(L, zh, en, air) {
    const cx = L.cx, cz = L.cz + 10;
    box(cx, y0 + 5, cz, 70, 10, 24, '#dfe5ea');
    box(cx, y0 + 3, cz + 12.2, 46, 6, 0.5, '#2f3a44');
    box(cx, y0 + 10.5, cz, 74, 1, 28, '#3b6ea5');
    K.solid(cx, cz, 70, 24, 12);
    K.label(zh, cx, y0 + 8, cz + 12.5, Math.min(30, zh.length * 6.5), 3.8, 0, '#1b2a36', '#ffffff', en);
    if (air) { box(cx, y0 + 0.04, L.z0 + 24, L.x1 - L.x0 - 8, 0.06, 30, '#3a3d40'); airliner(cx - 2, L.z0 + 27, '#1f8a4c'); }
    else { water(L, L.x0 + 4, L.z0 + 4, L.x1 - 4, cz - 30); ferry(cx - 6, cz - 40, 50); for (let x = L.x0 + 14; x < L.x1 - 8; x += 12) cyl(x, y0, cz - 27.5, 0.35, 0.9, '#2a2d30'); }
    W.lmPOI.train = { x: cx, z: cz + 20, name: zh };
  }
  function ferris(x, z, r, c = '#e84b3c') {
    const yc = y0 + r + 6;
    for (const s of [-1, 1]) { box(x - r * 0.42, y0 + (r + 6) / 2, z + s * 2.4, 1, r + 9, 1, '#f4f6f7', { rz: -0.42 }); box(x + r * 0.42, y0 + (r + 6) / 2, z + s * 2.4, 1, r + 9, 1, '#f4f6f7', { rz: 0.42 }); }
    const n = 20, cols = ['#ffd54f', '#4fc3f7', '#f06292', '#81c784', '#ffffff'];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, px = x + Math.sin(a) * r, py = yc + Math.cos(a) * r;
      box(x + Math.sin(a + Math.PI / n) * r * 0.99, yc + Math.cos(a + Math.PI / n) * r * 0.99, z, (2 * Math.PI * r) / n + 0.3, 0.5, 0.5, c, { rz: -(a + Math.PI / n) });
      if (k % 2 === 0) box(x + Math.sin(a) * r * 0.5, yc + Math.cos(a) * r * 0.5, z, 0.25, r, 0.25, '#f4f6f7', { rz: -a });
      box(px, py - 1.4, z, 2.2, 2, 2.2, cols[k % cols.length]);
    }
    cyl(x, yc - 1.2, z - 1.5, 1.2, 2.4, '#f4f6f7', 10, { rx: Math.PI / 2 });
    K.solid(x, z, r * 0.9, 6, 8);
  }
  function beach(L, side, depth, sea = '#2f8a9a') {
    // sand is the landmark slab; the far side is water
    const r = side === 's' ? [L.x0 + 2, L.z1 - depth, L.x1 - 2, L.z1 - 2] : side === 'e' ? [L.x1 - depth, L.z0 + 2, L.x1 - 2, L.z1 - 2] : [L.x0 + 2, L.z0 + 2, L.x1 - 2, L.z0 + depth];
    water(L, r[0], r[1], r[2], r[3], sea);
    return r;
  }
  function parasol(x, z, c) { box(x, y0 + 1.2, z, 0.1, 2.4, 0.1, '#eeeeee'); K.lmB(x, z).geo(new THREE.ConeGeometry(1.7, 0.7, 10), x, y0 + 2.6, z, 1, 1, 1, C(c)); box(x + 0.9, y0 + 0.25, z + 0.6, 0.7, 0.14, 1.9, '#f5f5f2'); }
  const palm = (x, z) => tree(x, z, 1.25);
  function rock(x, z, s, c = '#6a6a66') { ball(x, y0 + s * 0.4, z, s, s * 0.8, s * 0.9, c); K.solid(x, z, s * 1.5, s * 1.4, s); }

  // =====================================================================
  // 苗栗縣
  // =====================================================================
  const ML = mkD([
    { id: 'miaoli', zh: '苗栗市', en: 'MIAOLI', desc: '山城，客家小炒的香味', h: [8, 22], neon: 0.5, old: 0.9 },
    { id: 'toufen', zh: '頭份・竹南', en: 'TOUFEN', desc: '工業區與老街', h: [8, 26], neon: 0.45, old: 0.8 },
    { id: 'tongxiao', zh: '通霄・苑裡', en: 'TONGXIAO', desc: '海線小鎮，藺草與海風', h: [4, 10], neon: 0.2, old: 0.7, sparse: 0.4 },
    { id: 'dahu', zh: '大湖・三義', en: 'DAHU', desc: '草莓、木雕和舊山線', h: [4, 10], neon: 0.2, old: 0.7, sparse: 0.4 },
  ]);
  R.miaoli = {
    id: 'miaoli', zh: '苗栗縣', en: 'MIAOLI COUNTY', desc: '山城。客家圓樓、草莓園和龍騰斷橋', salt: 107,
    districts: ML, districtAt: (x, z) => (z < -120 && x < 240 ? ML.toufen : x < -240 ? ML.tongxiao : x >= 240 ? ML.dahu : ML.miaoli),
    mainX: lines(AX, ['海線公路', '中正路', '國華路', '中山路', '為公路', '經國路', '大湖路', '山線公路'], [2]),
    mainZ: lines(AZ, ['尖豐路', '中華路', '信義路', '府前路', '至公路', '新東街', '苗栗大道'], [2]),
    landmarks: [
      { id: 'train', zh: '苗栗車站', rect: [-80, 20, 80, 160], slab: '#bdb6a8', col: '#b89a6a' },
      { id: 'tulou', zh: '客家圓樓', rect: [-400, -260, -240, -120], slab: '#c9c0ae', col: '#d9c7a2' },
      { id: 'berry', zh: '大湖草莓園', rect: [240, -400, 560, -120], slab: '#6fa04a', park: true, trees: 12 },
      { id: 'longteng', zh: '龍騰斷橋', rect: [400, 160, 560, 300], slab: '#5a8a45', park: true, trees: 34 },
    ],
    pedZones: A_STD.pedZone('英才夜市'), nightMarket: A_STD.nm('英才夜市'), gas: A_STD.gas('為公站', '大湖站'),
    names: { hospital: ['苗栗醫院', 'MIAOLI HOSPITAL'], police: ['苗栗縣警察局', 'MIAOLI COUNTY POLICE'] },
    outer: { w: 'sea', e: 'hills' },
    gates: [{ side: 'n', at: -240, to: 'hsinchu', road: '國道1號' }, { side: 's', at: 80, to: 'taichung', road: '國道1號' }],
    shops: A_STD.shops('山城'),
    build(kit) {
      use(kit);
      station(W.lm.train, '苗栗車站', 'MIAOLI STATION', { wall: '#d9d2c2', roof: '#5a4632' });
      { // 客家圓樓: a ring-shaped earthen house
        const L = W.lm.tulou, cx = L.cx, cz = L.cz - 6;
        cyl(cx, y0, cz, 30, 14, '#d9c7a2', 28); cyl(cx, y0 + 4.6, cz, 30.15, 0.5, '#8a5a3a', 28); cyl(cx, y0 + 9.2, cz, 30.15, 0.5, '#8a5a3a', 28);
        taper(cx, y0 + 14, cz, 32.5, 27, 2.6, '#4a3a30', 28); cyl(cx, y0 + 14.05, cz, 20, 0.2, '#b9ad98', 28);
        box(cx, y0 + 3, cz + 29.6, 7, 6, 1.4, '#3a2a22');
        K.solid(cx, cz, 52, 52, 17);
        sign('客家圓樓', cx, L.z1 - 5, 11, '#7a4a3a', '#ffe9b0', 'HAKKA ROUND HOUSE');
      }
      { // strawberry fields and the giant strawberry
        const L = W.lm.berry;
        paddy(L, 2);
        for (let k = 0; k < 90; k++) ball(U.rr(L.x0 + 12, L.x1 - 12), y0 + 0.34, U.rr(L.z0 + 12, L.z1 - 12), 0.28, 0.24, 0.28, '#e53935');
        const sx = L.x0 + 26, sz = L.z1 - 22;
        K.lmB(sx, sz).geo(new THREE.ConeGeometry(5, 9, 14), sx, y0 + 5.2, sz, 1, 1, 1, C('#e53935'), { rx: Math.PI });
        ball(sx, y0 + 9.6, sz, 5, 2, 5, '#e53935'); taper(sx, y0 + 11, sz, 3.4, 0.4, 1.4, '#3f8f3a', 7);
        for (let k = 0; k < 16; k++) { const a = k * 2.4; ball(sx + Math.cos(a) * 3.6, y0 + 6 + (k % 5), sz + Math.sin(a) * 3.6, 0.22, 0.3, 0.22, '#ffe082'); }
        K.solid(sx, sz, 7, 7, 12);
        sign('大湖草莓園', sx + 18, L.z1 - 8, 12, '#c62828', '#ffffff', 'STRAWBERRY FARM');
      }
      { // 龍騰斷橋: the brick piers of a railway bridge that fell in 1935
        const L = W.lm.longteng;
        for (let k = 0; k < 6; k++) {
          const px = L.x0 + 22 + k * 20, h = [22, 24, 16, 25, 12, 20][k];
          K.B('brick', px, L.cz).box(px, y0 + h / 2, L.cz, 6, h, 8, C('#b5664a'), { facade: [3, 4] });
          if (k === 0 || k === 3) K.B('brick', px, L.cz).box(px + 8, y0 + h - 1.5, L.cz, 12, 3, 7.4, C('#b5664a'), { rz: k ? -0.12 : 0.1 });
          K.solid(px, L.cz, 6, 8, h);
        }
        sign('龍騰斷橋', L.cx, L.z1 - 6, 10, '#7a4a3a', '#ffe9b0', 'LONGTENG BRIDGE RUINS');
      }
      specialsA();
    },
  };

  // =====================================================================
  // 台中市
  // =====================================================================
  const TC = mkD([
    { id: 'central', zh: '中區・舊城', en: 'OLD TOWN', desc: '太陽餅、宮原和綠川', h: [10, 34], neon: 0.7, old: 1 },
    { id: 'qiqi', zh: '七期', en: 'XITUN 7TH', desc: '豪宅、百貨和歌劇院', h: [40, 120], neon: 0.12, old: 0.4, tower: true, slab: '#c4c2bc' },
    { id: 'beitun', zh: '北屯・逢甲', en: 'BEITUN', desc: '學生、夜市和排隊名店', h: [12, 40], neon: 0.65, old: 0.8 },
    { id: 'nanqu', zh: '南區・大里', en: 'SOUTH', desc: '老工廠與新社區', h: [8, 26], neon: 0.4, old: 0.9 },
    { id: 'coast', zh: '清水・梧棲', en: 'COAST', desc: '海線，風很大', h: [6, 16], neon: 0.25, old: 0.7, sparse: 0.25 },
    { id: 'taiping', zh: '太平・豐原', en: 'TAIPING', desc: '山腳下的市鎮', h: [8, 22], neon: 0.35, old: 0.8 },
  ]);
  R.taichung = {
    id: 'taichung', zh: '台中市', en: 'TAICHUNG CITY', desc: '中部第一大城。歌劇院、台中公園和逢甲夜市', salt: 108, mrtName: '台中捷運',
    districts: TC, districtAt: (x, z) => (x < -540 ? TC.coast : x >= 420 ? TC.taiping : z >= 240 ? TC.nanqu : x < -60 && z < -40 ? TC.qiqi : x >= 100 ? TC.beitun : TC.central),
    mainX: lines(BX, ['臨港路', '沙田路', '文心路', '惠中路', '台灣大道', '五權路', '三民路', '東光路', '太原路', '中興路'], [2, 4]),
    mainZ: lines(BZ, ['中清路', '市政路', '公益路', '向上路', '建國路', '復興路', '國光路', '中投公路'], [2]),
    landmarks: [
      { id: 'train', zh: '台中車站', rect: [-60, 100, 100, 240], slab: '#bdb6a8', col: '#b5553c' },
      { id: 'opera', zh: '國家歌劇院', rect: [-220, -320, -60, -180], slab: '#c9c6bd', col: '#f4f2ee' },
      { id: 'maple', zh: '秋紅谷', rect: [-380, -320, -220, -180], slab: '#5a8a45', park: true, trees: 60 },
      { id: 'tcpark', zh: '台中公園', rect: [-540, -40, -380, 100], slab: '#5f8a4a', park: true, trees: 70 },
      { id: 'gaomei', zh: '高美濕地', rect: [-700, -460, -540, -180], slab: '#8a9a7a', col: '#6f8a8a' },
    ],
    pedZones: B_STD.pedZone('逢甲夜市'), nightMarket: B_STD.nm('逢甲夜市'), gas: B_STD.gas('沙田站', '國光站'),
    mrt: B_STD.mrt(['市政府', 'Taichung City Hall', '文心森林公園', 'Wenxin Forest Park', '北屯總站', 'Beitun Main', '大慶', 'Daqing', '舊社', 'Jiushe']),
    names: { hospital: ['台中醫院', 'TAICHUNG HOSPITAL'], police: ['台中市警察局', 'TAICHUNG CITY POLICE'] },
    outer: { w: 'sea', e: 'hills' },
    gates: [{ side: 'n', at: 100, to: 'miaoli', road: '國道1號' }, { side: 's', at: -220, to: 'changhua', road: '國道1號' }, { side: 'e', at: -180, to: 'nantou', road: '國道6號' }],
    shops: B_STD.shops('中區'),
    build(kit) {
      use(kit);
      { // the old red-brick station with its central tower
        const s = station(W.lm.train, '台中車站', 'TAICHUNG STATION', { wall: '#b5553c', roof: '#3f4a4a', trim: '#efe6d6', h: 12 });
        box(s.cx, y0 + 11, s.cz + 4, 12, 22, 12, '#b5553c'); K.coneRoof(s.cx, y0 + 22, s.cz + 4, 15, 15, 9, '#3f4a4a');
        for (let yy = 4; yy < 22; yy += 5) box(s.cx, y0 + yy, s.cz + 10.1, 12.2, 0.7, 0.3, '#efe6d6');
      }
      { // 歌劇院: a white block pierced by curved openings
        const L = W.lm.opera, cx = L.cx, cz = L.cz - 6;
        box(cx, y0 + 12, cz, 92, 24, 58, '#f4f2ee');
        for (let k = -3; k <= 3; k++) { K.lmB(cx, cz).geo(new THREE.CylinderGeometry(5.4, 5.4, 0.6, 18), cx + k * 12.4, y0 + (k % 2 ? 9 : 14), cz + 29.1, 1, 1, 1.35, C('#22303a'), { rx: Math.PI / 2 }); }
        for (let k = -2; k <= 2; k++) K.lmB(cx, cz).geo(new THREE.CylinderGeometry(4, 4, 0.6, 18), cx + k * 16, y0 + 4.2, cz + 29.1, 1, 1, 1, C('#22303a'), { rx: Math.PI / 2 });
        box(cx, y0 + 24.6, cz, 80, 1.2, 46, '#5f8a4a');
        K.solid(cx, cz, 92, 58, 26);
        box(cx, y0 + 0.24, L.z1 - 12, 60, 0.04, 10, '#3d6f8a');
        sign('臺中國家歌劇院', cx - 44, L.z1 - 5, 15, '#f4f2ee', '#1a1a1a', 'NATIONAL TAICHUNG THEATER');
      }
      { // 秋紅谷: a sunken lake park with a red bridge
        const L = W.lm.maple;
        L.pond = [L.cx - 40, L.cz - 26, L.cx + 40, L.cz + 22];
        box(L.cx, y0 + 0.24, L.cz - 2, 80, 0.04, 48, '#3d6f8a');
        box(L.cx, y0 + 1.3, L.cz - 2, 3, 0.4, 52, '#c0392b'); for (const s of [-1, 1]) box(L.cx + s * 1.4, y0 + 1.9, L.cz - 2, 0.16, 0.9, 52, '#c0392b');
        sign('秋紅谷', L.cx, L.z1 - 5, 8, '#3f5a4a', '#ffffff', 'MAPLE GARDEN');
      }
      { // 台中公園: the lake and its twin pavilion
        const L = W.lm.tcpark;
        L.pond = [L.cx - 36, L.cz - 26, L.cx + 30, L.cz + 20];
        box(L.cx - 3, y0 + 0.24, L.cz - 3, 66, 0.04, 46, '#3d6f8a');
        box(L.cx - 3, y0 + 0.5, L.cz - 3, 17, 0.5, 9, '#d8d4c8');
        for (const dx of [-7, 1]) { for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) box(L.cx + dx + a, y0 + 2.2, L.cz - 3 + b, 0.4, 3.4, 0.4, '#f4f2ee'); K.coneRoof(L.cx + dx, y0 + 3.9, L.cz - 3, 9.4, 9.4, 4, '#b13a2a'); }
        box(L.cx + 14, y0 + 0.5, L.cz - 3, 26, 0.3, 2.2, '#d8d4c8');
        sign('台中公園 湖心亭', L.cx, L.z1 - 5, 14, '#3f5a4a', '#ffffff');
      }
      { // 高美濕地: tidal flats, a boardwalk and a row of wind turbines
        const L = W.lm.gaomei;
        water(L, L.x0 + 4, L.z0 + 6, L.cx - 18, L.z1 - 8, '#6f9aa0');
        box(L.cx + 4, y0 + 0.2, L.cz, L.x1 - L.cx - 26, 0.1, L.z1 - L.z0 - 20, '#9aa58a');
        box(L.cx - 30, y0 + 0.7, L.cz, 60, 0.3, 3, '#a9865e');
        for (let k = 0; k < 6; k++) turbine(L.cx + 26, L.z0 + 26 + k * 44);
        sign('高美濕地', L.x1 - 16, L.z1 - 6, 10, '#3f6f7a', '#ffffff', 'GAOMEI WETLANDS');
      }
      specialsB();
    },
  };

  // =====================================================================
  // 彰化縣
  // =====================================================================
  const CH = mkD([
    { id: 'city', zh: '彰化市', en: 'CHANGHUA', desc: '肉圓、爌肉飯，大佛看著你吃', h: [8, 26], neon: 0.6, old: 1 },
    { id: 'lukang', zh: '鹿港', en: 'LUKANG', desc: '一府二鹿三艋舺，紅磚老街', h: [5, 14], neon: 0.45, old: 1, slab: '#b89e8c' },
    { id: 'yuanlin', zh: '員林', en: 'YUANLIN', desc: '百果山與蜜餞', h: [8, 22], neon: 0.5, old: 0.9 },
    { id: 'bagua', zh: '八卦山', en: 'BAGUA HILLS', desc: '山腳下的花田', h: [4, 10], neon: 0.2, old: 0.7, sparse: 0.35 },
  ]);
  R.changhua = {
    id: 'changhua', zh: '彰化縣', en: 'CHANGHUA COUNTY', desc: '八卦山大佛、扇形車庫與鹿港老街', salt: 109,
    districts: CH, districtAt: (x, z) => (x < -240 ? CH.lukang : z >= 300 ? CH.yuanlin : x >= 240 ? CH.bagua : CH.city),
    mainX: lines(AX, ['鹿草路', '彰鹿路', '金馬路', '中正路', '中山路', '卦山路', '大彰路', '山腳路'], [2]),
    mainZ: lines(AZ, ['彰美路', '民族路', '彰南路', '三民路', '中興路', '員林大道', '莒光路'], [2]),
    landmarks: [
      { id: 'train', zh: '彰化車站', rect: [-80, 20, 80, 160], slab: '#bdb6a8', col: '#b89a6a' },
      { id: 'buddha', zh: '八卦山大佛', rect: [240, -120, 400, 20], slab: '#5a8a45', park: true, trees: 50 },
      { id: 'fan', zh: '扇形車庫', rect: [-240, 20, -80, 160], slab: '#8f9396', col: '#5d6b75' },
      { id: 'mazu', zh: '鹿港天后宮', rect: [-400, -260, -240, -120], slab: '#b4a894', col: '#b3261e' },
    ],
    pedZones: A_STD.pedZone('精誠夜市'), nightMarket: A_STD.nm('精誠夜市'), gas: A_STD.gas('中山站', '大彰站'),
    names: { hospital: ['彰化醫院', 'CHANGHUA HOSPITAL'], police: ['彰化縣警察局', 'CHANGHUA COUNTY POLICE'] },
    outer: { w: 'sea', e: 'hills', s: 'fields' },
    gates: [{ side: 'n', at: -240, to: 'taichung', road: '國道1號' }, { side: 's', at: 80, to: 'yunlin', road: '國道1號' }, { side: 'e', at: 20, to: 'nantou', road: '台14線' }],
    shops: A_STD.shops('半線'),
    build(kit) {
      use(kit);
      station(W.lm.train, '彰化車站', 'CHANGHUA STATION', { wall: '#d6d0c4', roof: '#4f5b63' });
      { // the Great Buddha on its lotus, guarded by lions
        const L = W.lm.buddha;
        L.pond = [L.cx - 14, L.cz - 34, L.cx + 14, L.cz - 6];
        buddha(L.cx, L.cz - 20, 1.25);
        for (const s of [-1, 1]) { ball(L.cx + s * 16, y0 + 2, L.cz + 6, 1.8, 2, 2.8, '#c9bfae'); K.solid(L.cx + s * 16, L.cz + 6, 3.4, 5, 4); }
        for (let k = 0; k < 6; k++) box(L.cx, y0 + 0.2 + k * 0.1, L.cz + 22 + k * 2.4, 16, 0.3, 2.4, '#c9bfae');
        K.temple(L.cx, L.z0 + 12, 30, 10, 6, 4);
        sign('八卦山大佛', L.cx, L.z1 - 5, 12, '#3a3632', '#ffd76a', 'BAGUASHAN GREAT BUDDHA');
      }
      { // the fan-shaped roundhouse: stalls radiating from a turntable
        const L = W.lm.fan, cx = L.cx, cz = L.cz + 26;
        cyl(cx, y0, cz, 10, 0.3, '#5a5d60', 20); box(cx, y0 + 0.6, cz, 2.6, 0.5, 19, '#8a5a3a', { ry: 0.5 });
        for (let k = 0; k < 9; k++) {
          const a = -Math.PI / 2 + (k - 4) * 0.2, d = 44, px = cx + Math.cos(a) * d, pz = cz + Math.sin(a) * d;
          box(px, y0 + 4, pz, 22, 8, 8.6, '#9aa0a4', { ry: -a }); box(px, y0 + 8.4, pz, 23, 0.8, 9.4, '#5d6b75', { ry: -a });
          box(cx + Math.cos(a) * 22, y0 + 0.1, cz + Math.sin(a) * 22, 22, 0.12, 1.6, '#6a5a4a', { ry: -a });
          if (k % 3 === 1) { const ex = cx + Math.cos(a) * 26, ez = cz + Math.sin(a) * 26; K.lmB(ex, ez).geo(new THREE.CylinderGeometry(1.3, 1.3, 9, 12), ex, y0 + 2.4, ez, 1, 1, 1, C('#1c1c1c'), { rz: Math.PI / 2, ry: -a }); box(ex, y0 + 1, ez, 9.4, 1, 2.4, '#8a1c12', { ry: -a }); K.solid(ex, ez, 6, 6, 4); }
        }
        K.solid(cx, cz - 44, 66, 22, 9);
        sign('扇形車庫', cx, L.z1 - 4, 10, '#22303a', '#ffffff', 'FAN-SHAPED ROUNDHOUSE');
      }
      { // 鹿港天后宮
        const L = W.lm.mazu, cx = L.cx, cz = L.cz;
        K.temple(cx, cz + 26, 42, 11, 7, 5); K.temple(cx, cz - 6, 28, 20, 9, 7); K.temple(cx, cz - 36, 44, 11, 7, 5);
        for (let k = -3; k <= 3; k++) W.lanterns.push([cx + k * 6, y0 + 7.2, cz + 33]);
        K.label('鹿港天后宮', cx, y0 + 9.6, cz + 33.2, 13, 2.2, 0, '#8e2a1f', '#ffd76a');
      }
      specialsA([-80, -260]);
    },
  };

  // =====================================================================
  // 南投縣
  // =====================================================================
  const NTO = mkD([
    { id: 'puli', zh: '埔里', en: 'PULI', desc: '台灣的正中心，水很甜', h: [6, 18], neon: 0.5, old: 0.9 },
    { id: 'caotun', zh: '草屯・南投', en: 'CAOTUN', desc: '盆地邊的小城', h: [8, 22], neon: 0.45, old: 0.9 },
    { id: 'yuchi', zh: '魚池', en: 'YUCHI', desc: '日月潭畔，紅茶香', h: [4, 12], neon: 0.25, old: 0.7, sparse: 0.4 },
    { id: 'jiji', zh: '集集', en: 'JIJI', desc: '綠色隧道與小火車', h: [5, 12], neon: 0.4, old: 1, sparse: 0.2 },
  ]);
  R.nantou = {
    id: 'nantou', zh: '南投縣', en: 'NANTOU COUNTY', desc: '唯一不靠海的縣。日月潭、清境與集集小火車', salt: 110,
    districts: NTO, districtAt: (x, z) => (x >= 240 ? NTO.yuchi : z >= 300 ? NTO.jiji : x < -240 ? NTO.caotun : NTO.puli),
    mainX: lines(AX, ['中潭公路', '碧山路', '中正路', '中山路', '信義路', '魚池街', '環潭公路', '伊達邵路'], [2]),
    mainZ: lines(AZ, ['仁愛路', '中台路', '西安路', '南昌街', '民生路', '集集街', '綠色隧道'], [2]),
    landmarks: [
      { id: 'train', zh: '集集車站', rect: [-80, 20, 80, 160], slab: '#bdb6a8', col: '#8a5a3a' },
      { id: 'chungtai', zh: '中台禪寺', rect: [-400, -260, -240, -120], slab: '#c9c6bd', col: '#d9a62e' },
      { id: 'lake', zh: '日月潭', rect: [240, -400, 560, -120], slab: '#5a8a45', park: true, trees: 60 },
      { id: 'farm', zh: '清境農場', rect: [400, 160, 560, 300], slab: '#7fb05a', park: true, trees: 14 },
    ],
    pedZones: A_STD.pedZone('埔里夜市'), nightMarket: A_STD.nm('埔里夜市'), gas: A_STD.gas('信義站', '環潭站'),
    names: { hospital: ['南投醫院', 'NANTOU HOSPITAL'], police: ['南投縣警察局', 'NANTOU COUNTY POLICE'] },
    outer: { w: 'hills', e: 'hills', n: 'hills', s: 'hills' },
    gates: [{ side: 'n', at: -240, to: 'taichung', road: '國道6號' }, { side: 'w', at: -120, to: 'changhua', road: '台14線' }],
    shops: A_STD.shops('埔里'),
    build(kit) {
      use(kit);
      station(W.lm.train, '集集車站', 'JIJI STATION', { wall: '#8a5a3a', roof: '#3a3a3a', trim: '#efe6d6', h: 8, train: ['#f2c230', '#1f4f9c'] });
      { // 中台禪寺: a stepped tower with a golden crown
        const L = W.lm.chungtai, cx = L.cx, cz = L.cz - 8;
        box(cx, y0 + 7, cz, 84, 14, 50, '#d9d2c2'); box(cx, y0 + 22, cz, 50, 16, 36, '#cfc7b8'); box(cx, y0 + 44, cz, 28, 28, 26, '#c9c0ae');
        box(cx, y0 + 62, cz, 18, 8, 18, '#d9a62e'); taper(cx, y0 + 66, cz, 10, 3, 10, '#d9a62e', 12); ball(cx, y0 + 79, cz, 3.4, 4.4, 3.4, '#e2b33c');
        for (const s of [-1, 1]) { box(cx + s * 34, y0 + 18, cz, 12, 8, 30, '#cfc7b8'); taper(cx + s * 34, y0 + 22, cz, 6, 1.5, 6, '#d9a62e', 10); }
        box(cx, y0 + 4, cz + 25.2, 14, 8, 0.6, '#3a2a22');
        K.solid(cx, cz, 84, 50, 80);
        sign('中台禪寺', cx, L.z1 - 5, 10, '#8e2a1f', '#ffd76a', 'CHUNG TAI CHAN MONASTERY');
      }
      { // 日月潭: the lake, 拉魯島, a pier with boats and 文武廟 on the shore
        const L = W.lm.lake;
        const r = [L.x0 + 26, L.z0 + 22, L.x1 - 26, L.z1 - 70];
        water(L, r[0], r[1], r[2], r[3], '#2f7f8a'); L.pond = r;
        ball(L.cx + 30, y0 + 1, L.cz - 50, 9, 3, 7, '#4d7f3a'); taper(L.cx + 30, y0 + 3, L.cz - 50, 0.4, 0.3, 4, '#5a4636', 6); ball(L.cx + 30, y0 + 8.4, L.cz - 50, 3.4, 2.8, 3.4, '#3f6f33');
        box(L.cx - 60, y0 + 0.7, r[3] - 13, 4, 0.4, 30, '#a9865e');
        ferry(L.cx - 30, r[3] - 18, 30, '#c0392b'); ferry(L.cx + 70, L.cz - 20, 26, '#1f8a4c'); ferry(L.cx - 90, L.cz - 70, 26, '#f2c230');
        K.temple(L.cx + 60, L.z1 - 34, 44, 14, 9, 7, '#c8562e', '#b3261e', '#e3a13a'); K.temple(L.cx + 60, L.z1 - 58, 30, 9, 6, 4, '#c8562e', '#b3261e', '#e3a13a');
        for (let k = -2; k <= 2; k++) W.lanterns.push([L.cx + 60 + k * 7, y0 + 9, L.z1 - 25.6]);
        sign('日月潭', L.cx - 80, L.z1 - 8, 9, '#1b5e57', '#ffffff', 'SUN MOON LAKE');
        W.lmPOI.lake = { x: L.cx - 60, z: L.z1 - 40 };
      }
      { // 清境農場: sheep on the grass, a white fence and a windmill
        const L = W.lm.farm;
        for (let k = 0; k < 22; k++) { const sx = U.rr(L.x0 + 14, L.x1 - 14), sz = U.rr(L.z0 + 14, L.z1 - 26); ball(sx, y0 + 0.75, sz, 0.75, 0.55, 0.5, '#fbfbf7'); ball(sx + 0.7, y0 + 0.95, sz, 0.26, 0.26, 0.24, '#3a3632'); }
        for (let x = L.x0 + 10; x < L.x1 - 8; x += 3) box(x, y0 + 0.6, L.z1 - 16, 0.16, 1.2, 0.16, '#fbfbf7');
        box(L.cx, y0 + 0.9, L.z1 - 16, L.x1 - L.x0 - 18, 0.14, 0.1, '#fbfbf7');
        const wx = L.x0 + 24, wz = L.z0 + 22;
        taper(wx, y0, wz, 3.4, 2.2, 10, '#fbfbf7', 8); K.coneRoof(wx, y0 + 10, wz, 5.4, 5.4, 3, '#b13a2a', 8, 0);
        for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.5; box(wx - Math.sin(a) * 4, y0 + 9 + Math.cos(a) * 4, wz + 2.6, 1.3, 8, 0.2, '#8a5a3a', { rz: a }); }
        K.solid(wx, wz, 6, 6, 12);
        sign('清境農場', L.cx, L.z1 - 6, 10, '#3f6f33', '#ffffff', 'CINGJING FARM');
      }
      specialsA();
    },
  };

  // =====================================================================
  // 雲林縣
  // =====================================================================
  const YU = mkD([
    { id: 'douliu', zh: '斗六', en: 'DOULIU', desc: '柚子、太平老街', h: [8, 24], neon: 0.55, old: 0.9 },
    { id: 'huwei', zh: '虎尾・西螺', en: 'HUWEI', desc: '糖廠、布袋戲與醬油', h: [6, 18], neon: 0.45, old: 1 },
    { id: 'beigang', zh: '北港', en: 'BEIGANG', desc: '朝天宮的香火整年不斷', h: [5, 14], neon: 0.5, old: 1, slab: '#b89e8c' },
    { id: 'gukeng', zh: '古坑', en: 'GUKENG', desc: '咖啡山與遊樂園', h: [4, 10], neon: 0.2, old: 0.7, sparse: 0.4 },
  ]);
  R.yunlin = {
    id: 'yunlin', zh: '雲林縣', en: 'YUNLIN COUNTY', desc: '農業首都。北港朝天宮、西螺大橋和古坑咖啡', salt: 111,
    districts: YU, districtAt: (x, z) => (x < -240 ? YU.beigang : z < -120 ? YU.huwei : x >= 240 ? YU.gukeng : YU.douliu),
    mainX: lines(AX, ['媽祖大道', '文仁路', '中山路', '大學路', '雲林路', '斗工路', '古坑路', '劍湖路'], [2]),
    mainZ: lines(AZ, ['西螺大道', '延平路', '林森路', '民生路', '中華路', '文化路', '雲科路'], [2]),
    landmarks: [
      { id: 'train', zh: '斗六車站', rect: [-80, 20, 80, 160], slab: '#bdb6a8', col: '#b89a6a' },
      { id: 'chaotian', zh: '北港朝天宮', rect: [-400, -260, -240, -120], slab: '#b4a894', col: '#b3261e' },
      { id: 'xiluo', zh: '西螺大橋', rect: [240, -400, 400, -260], slab: '#9a9c9d', col: '#c0392b' },
      { id: 'fields', zh: '虎尾農田', rect: [-560, 160, -240, 400], slab: '#86b04e', park: true, trees: 10 },
      { id: 'fun', zh: '劍湖山樂園', rect: [240, -120, 400, 20], slab: '#c9c0ae', col: '#e84b3c' },
    ],
    pedZones: A_STD.pedZone('斗六人文夜市'), nightMarket: A_STD.nm('斗六人文夜市'), gas: A_STD.gas('雲林站', '古坑站'),
    names: { hospital: ['雲林醫院', 'YUNLIN HOSPITAL'], police: ['雲林縣警察局', 'YUNLIN COUNTY POLICE'] },
    outer: { w: 'sea', s: 'fields', e: 'hills' },
    gates: [{ side: 'n', at: -240, to: 'changhua', road: '國道1號' }, { side: 's', at: 80, to: 'chiayi', road: '國道1號' }],
    shops: A_STD.shops('斗六'),
    build(kit) {
      use(kit);
      station(W.lm.train, '斗六車站', 'DOULIU STATION', { wall: '#d9d2c2', roof: '#3d6b45' });
      { // 北港朝天宮
        const L = W.lm.chaotian, cx = L.cx, cz = L.cz;
        K.temple(cx, cz + 28, 46, 11, 7, 5); K.temple(cx, cz - 2, 30, 20, 10, 8); K.temple(cx, cz - 34, 46, 12, 8, 5);
        K.temple(cx - 34, cz - 2, 9, 44, 6, 4); K.temple(cx + 34, cz - 2, 9, 44, 6, 4);
        taper(cx, y0, cz + 14, 1.2, 1.5, 2.6, '#6a5a3a'); K.solid(cx, cz + 14, 2.6, 2.6, 3);
        for (let k = -3; k <= 3; k++) W.lanterns.push([cx + k * 6, y0 + 7.2, cz + 35]);
        K.label('北港朝天宮', cx, y0 + 9.6, cz + 35.2, 13, 2.2, 0, '#8e2a1f', '#ffd76a');
      }
      { // 西螺大橋: a long red truss over the 濁水溪
        const L = W.lm.xiluo, bz = L.cz - 6;
        water(L, L.x0 + 4, L.z0 + 6, L.x1 - 4, L.z1 - 40, '#7a8a80');
        box(L.cx, y0 + 4, bz, L.x1 - L.x0 - 4, 0.6, 7, '#8f9396');
        for (let x = L.x0 + 10; x < L.x1 - 6; x += 20) {
          box(x, y0 + 2, bz, 2.4, 4, 7.6, '#b8b4aa');
          for (const s of [-1, 1]) { box(x + 10, y0 + 10, bz + s * 3.4, 20, 0.5, 0.5, '#c0392b'); box(x + 5, y0 + 7.2, bz + s * 3.4, 0.5, 11.6, 0.5, '#c0392b', { rz: -0.72 }); box(x + 15, y0 + 7.2, bz + s * 3.4, 0.5, 11.6, 0.5, '#c0392b', { rz: 0.72 }); box(x, y0 + 7.2, bz + s * 3.4, 0.5, 6, 0.5, '#c0392b'); }
          box(x + 10, y0 + 10, bz, 0.4, 0.4, 7, '#c0392b');
        }
        sign('西螺大橋', L.cx, L.z1 - 8, 10, '#c0392b', '#ffffff', 'XILUO BRIDGE');
      }
      paddy(W.lm.fields, 4);
      { // the amusement park: ferris wheel, drop tower and a coaster loop
        const L = W.lm.fun;
        ferris(L.cx - 24, L.cz - 8, 22);
        const tx = L.cx + 34, tz = L.cz - 14;
        box(tx, y0 + 26, tz, 3, 52, 3, '#f2c230'); box(tx, y0 + 30, tz, 8, 2.4, 8, '#1f4f9c'); ball(tx, y0 + 53, tz, 2.4, 2.4, 2.4, '#e84b3c'); K.solid(tx, tz, 8, 8, 54);
        for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; box(L.cx + 30 + Math.sin(a) * 9, y0 + 12 + Math.cos(a) * 9, L.cz + 28, 3.8, 0.5, 2, '#8e24aa', { rz: -a }); }
        for (const s of [-1, 1]) box(L.cx + 30 + s * 7, y0 + 6, L.cz + 28, 0.6, 12, 0.6, '#f4f6f7');
        K.solid(L.cx + 30, L.cz + 28, 16, 3, 20);
        sign('劍湖山樂園', L.cx, L.z1 - 5, 12, '#e84b3c', '#ffffff', 'JANFUSUN PARODY PARK');
      }
      specialsA();
    },
  };

  // =====================================================================
  // 嘉義市
  // =====================================================================
  const CY = mkD([
    { id: 'west', zh: '西區', en: 'WEST DISTRICT', desc: '火雞肉飯一條街', h: [8, 24], neon: 0.7, old: 1 },
    { id: 'east', zh: '東區', en: 'EAST DISTRICT', desc: '木材之都的老房子', h: [6, 20], neon: 0.45, old: 0.9 },
    { id: 'north', zh: '北社尾', en: 'NORTH', desc: '鐵道旁的倉庫', h: [6, 18], neon: 0.3, old: 0.7 },
  ]);
  R.chiayi = {
    id: 'chiayi', zh: '嘉義市', en: 'CHIAYI CITY', desc: '火雞肉飯、噴水圓環和阿里山鐵路起點', salt: 112,
    districts: CY, districtAt: (x, z) => (z < -260 ? CY.north : x < 80 ? CY.west : CY.east),
    mainX: lines(AX, ['世賢路', '友愛路', '新民路', '仁愛路', '中山路', '吳鳳路', '啟明路', '彌陀路'], [4]),
    mainZ: lines(AZ, ['北港路', '博愛路', '林森路', '民族路', '垂楊路', '興業路', '世賢南路'], [3]),
    landmarks: [
      { id: 'train', zh: '嘉義車站', rect: [-80, 20, 80, 160], slab: '#bdb6a8', col: '#b89a6a' },
      { id: 'fountain', zh: '中央噴水池', rect: [-240, 20, -80, 160], slab: '#c9c6bd', col: '#6fa8c9' },
      { id: 'sunpark', zh: '嘉義公園・射日塔', rect: [240, -120, 400, 20], slab: '#5a8a45', park: true, trees: 70 },
      { id: 'hinoki', zh: '檜意森活村', rect: [-400, -260, -240, -120], slab: '#b9ad98', col: '#6a4a36' },
    ],
    pedZones: A_STD.pedZone('文化路夜市'), nightMarket: A_STD.nm('文化路夜市'), gas: A_STD.gas('吳鳳站', '啟明站'),
    names: { hospital: ['嘉義醫院', 'CHIAYI HOSPITAL'], police: ['嘉義市警察局', 'CHIAYI CITY POLICE'] },
    outer: { n: 'fields', s: 'fields' },
    gates: [{ side: 'n', at: -240, to: 'yunlin', road: '國道1號' }, { side: 's', at: 80, to: 'tainan', road: '國道1號' }, { side: 'e', at: 20, to: 'chiayicounty', road: '阿里山公路' }],
    shops: A_STD.shops('諸羅'),
    build(kit) {
      use(kit);
      station(W.lm.train, '嘉義車站', 'CHIAYI STATION', { wall: '#cfc7b8', roof: '#5a4632', train: ['#c0392b', '#f5f5f2'] });
      { // the fountain roundabout with the pitcher statue
        const L = W.lm.fountain, cx = L.cx, cz = L.cz;
        cyl(cx, y0, cz, 22, 1, '#c9c0ae', 28); cyl(cx, y0 + 1, cz, 20.6, 0.1, '#4f9ac4', 28); cyl(cx, y0, cz, 5, 5, '#d8d4c8', 14);
        for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; taper(cx + Math.cos(a) * 13, y0 + 1, cz + Math.sin(a) * 13, 0.5, 0.1, 5, '#e3f4fb', 6); }
        box(cx, y0 + 7.4, cz, 0.9, 2.4, 0.6, '#d9a62e'); ball(cx, y0 + 9, cz, 0.42, 0.46, 0.42, '#d9a62e'); box(cx + 0.9, y0 + 8.6, cz, 1.6, 0.26, 0.26, '#d9a62e', { rz: 0.5 });
        for (const s of [-1, 1]) box(cx + s * 0.3, y0 + 5.6, cz, 0.36, 1.4, 0.4, '#d9a62e');
        K.solid(cx, cz, 40, 40, 2);
        sign('中央噴水池', cx, L.z1 - 5, 12, '#22303a', '#ffffff', 'CENTRAL FOUNTAIN');
      }
      { // 嘉義公園 and the Sun-Shooting Tower
        const L = W.lm.sunpark, tx = L.cx, tz = L.cz - 14;
        L.pond = [tx - 12, tz - 12, tx + 12, tz + 12];
        box(tx, y0 + 4, tz, 22, 8, 22, '#8a6a4a'); box(tx, y0 + 34, tz, 10, 56, 10, '#7a5a3a'); box(tx, y0 + 34, tz + 5.1, 1.6, 50, 0.3, '#d9a62e');
        box(tx, y0 + 64, tz, 14, 6, 14, '#5a4632'); box(tx, y0 + 68, tz, 15, 0.6, 15, '#d9a62e');
        K.solid(tx, tz, 22, 22, 68);
        pavilion(L.cx - 40, L.cz + 28); pavilion(L.cx + 40, L.cz + 26, '#7a4a3a', '#48604f');
        sign('射日塔', tx, L.z1 - 5, 8, '#5a4632', '#ffd76a', 'SUN-SHOOTING TOWER');
      }
      { // 檜意森活村: rows of cypress-wood Japanese houses
        const L = W.lm.hinoki;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
          if (a === 0 && b === 1) continue;
          K.temple(L.cx + a * 40, L.cz + b * 34 - 4, 24, 12, 3.6, 3, '#6a4a36', '#4a3426', '#3a3a3a');
          tree(L.cx + a * 40 + 17, L.cz + b * 34 + 8, 1);
        }
        sign('檜意森活村', L.cx, L.z1 - 5, 12, '#4a3426', '#ffe9b0', 'HINOKI VILLAGE');
      }
      specialsA([-80, -260]);
    },
  };

  // =====================================================================
  // 嘉義縣
  // =====================================================================
  const CC = mkD([
    { id: 'taibao', zh: '太保・朴子', en: 'TAIBAO', desc: '高鐵站旁的新市鎮', h: [8, 22], neon: 0.35, old: 0.7 },
    { id: 'minxiong', zh: '民雄', en: 'MINXIONG', desc: '鵝肉一條街', h: [6, 16], neon: 0.45, old: 0.9 },
    { id: 'budai', zh: '布袋・東石', en: 'BUDAI', desc: '鹽田、蚵棚與漁港', h: [4, 9], neon: 0.2, old: 0.7, sparse: 0.4 },
    { id: 'alishan', zh: '阿里山', en: 'ALISHAN', desc: '雲海、神木和高山茶', h: [4, 9], neon: 0.25, old: 0.8, sparse: 0.4 },
  ]);
  R.chiayicounty = {
    id: 'chiayicounty', zh: '嘉義縣', en: 'CHIAYI COUNTY', desc: '從鹽田一路爬到阿里山的日出', salt: 113,
    districts: CC, districtAt: (x, z) => (x >= 240 ? CC.alishan : x < -240 ? CC.budai : z < -120 ? CC.minxiong : CC.taibao),
    mainX: lines(AX, ['東石路', '朴子路', '故宮大道', '太保路', '高鐵大道', '中埔路', '阿里山公路', '祝山林道'], [2]),
    mainZ: lines(AZ, ['民雄路', '建國路', '嘉朴路', '祥和路', '水上路', '中正路', '鹿草路'], [2]),
    landmarks: [
      { id: 'train', zh: '高鐵嘉義站', rect: [-80, 20, 80, 160], slab: '#c9c6bd', col: '#e8641b' },
      { id: 'museum', zh: '故宮南院', rect: [-400, -260, -240, -120], slab: '#5a8a45', park: true, trees: 30 },
      { id: 'forest', zh: '阿里山森林遊樂區', rect: [240, -400, 560, -120], slab: '#3f6f33', park: true, trees: 230 },
      { id: 'salt', zh: '布袋鹽田', rect: [-560, 160, -240, 400], slab: '#d3d8d6', col: '#e9eeec' },
    ],
    pedZones: A_STD.pedZone('朴子夜市'), nightMarket: A_STD.nm('朴子夜市'), gas: A_STD.gas('高鐵站', '中埔站'),
    names: { hospital: ['嘉義縣立醫院', 'CHIAYI COUNTY HOSPITAL'], police: ['嘉義縣警察局', 'CHIAYI COUNTY POLICE'] },
    outer: { e: 'hills', n: 'fields', s: 'fields', w: 'sea' },
    gates: [{ side: 'n', at: -240, to: 'chiayi', road: '阿里山公路' }],
    shops: A_STD.shops('太保'),
    build(kit) {
      use(kit);
      hsrStation(W.lm.train, '高鐵嘉義站', 'THSR CHIAYI', true);
      { // 故宮南院: two sweeping halls over a lake, and the arched footbridge
        const L = W.lm.museum, cx = L.cx, cz = L.cz - 16;
        L.pond = [L.x0 + 8, L.cz + 2, L.x1 - 8, L.cz + 30];
        box(L.cx, y0 + 0.24, L.cz + 16, L.x1 - L.x0 - 16, 0.04, 28, '#3d6f8a');
        box(cx - 12, y0 + 9, cz, 70, 18, 20, '#2a2d30', { ry: 0.22 }); box(cx + 12, y0 + 8, cz + 6, 70, 16, 18, '#e9eeec', { ry: -0.2 });
        K.solid(cx, cz + 2, 84, 34, 18);
        for (let k = -6; k <= 6; k++) box(L.cx + k * 4, y0 + 2.4 - Math.abs(k) * 0.3, L.cz + 16, 4.2, 0.4, 3, '#f4f6f7', { rz: -k * 0.07 });
        sign('故宮南院', L.cx, L.z1 - 5, 10, '#2a2d30', '#ffffff', 'SOUTHERN BRANCH OF THE PALACE MUSEUM');
      }
      { // 阿里山: giant cypresses, the red forest train and the sunrise deck
        const L = W.lm.forest;
        for (const [dx, dz, s] of [[-90, -60, 1.3], [40, -90, 1.1], [100, 30, 1.5], [-30, 50, 1.2]]) {
          const x = L.cx + dx, z = L.cz + dz;
          taper(x, y0, z, 3.4 * s, 1.6 * s, 26 * s, '#6a4a36', 9); ball(x, y0 + 30 * s, z, 8 * s, 9 * s, 8 * s, '#2f5a2a'); ball(x + 3 * s, y0 + 24 * s, z - 2 * s, 6 * s, 5 * s, 6 * s, '#355f2c');
          K.solid(x, z, 6 * s, 6 * s, 30);
        }
        const tz = L.z1 - 34;
        box(L.cx, y0 + 0.12, tz, L.x1 - L.x0 - 30, 0.14, 2.6, '#6a5a4a');
        trainSet(L.cx - 40, tz, 44, '#c0392b', '#f5f5f2');
        box(L.cx + 50, y0 + 3, tz + 9, 26, 6, 9, '#8a5a3a'); K.coneRoof(L.cx + 50, y0 + 6, tz + 9, 30, 13, 3.6, '#3a3a3a'); K.solid(L.cx + 50, tz + 9, 26, 9, 9);
        K.label('沼平車站', L.cx + 50, y0 + 4.4, tz + 13.6, 9, 1.8, 0, '#3a2a22', '#ffe9b0');
        box(L.x1 - 36, y0 + 1.2, L.z0 + 26, 34, 2.4, 16, '#a9865e'); for (let x = -16; x <= 16; x += 4) box(L.x1 - 36 + x, y0 + 3, L.z0 + 18.2, 0.2, 1.2, 0.2, '#8a5a3a');
        K.solid(L.x1 - 36, L.z0 + 26, 34, 16, 2.4);
        sign('阿里山國家森林遊樂區', L.cx - 80, L.z1 - 8, 20, '#2f5a2a', '#ffffff', 'ALISHAN FOREST');
      }
      { // 布袋鹽田: evaporation ponds and heaps of salt
        const L = W.lm.salt;
        for (let z = L.z0 + 14; z < L.z1 - 8; z += 22) box(L.cx, y0 + 0.16, z, L.x1 - L.x0 - 12, 0.1, 1, '#8a8a84');
        for (let x = L.x0 + 14; x < L.x1 - 8; x += 30) box(x, y0 + 0.16, L.cz, 1, 0.1, L.z1 - L.z0 - 12, '#8a8a84');
        for (let k = 0; k < 14; k++) { const sx = U.rr(L.x0 + 20, L.x1 - 20), sz = U.rr(L.z0 + 20, L.z1 - 20), s = U.rr(1.6, 4); K.lmB(sx, sz).geo(new THREE.ConeGeometry(s, s * 0.9, 10), sx, y0 + s * 0.45, sz, 1, 1, 1, C('#ffffff')); }
        sign('布袋鹽田', L.x1 - 20, L.z0 + 10, 10, '#607d8b', '#ffffff', 'BUDAI SALT FIELDS');
      }
      specialsA();
    },
  };

  // =====================================================================
  // 台南市
  // =====================================================================
  const TN = mkD([
    { id: 'old', zh: '中西區', en: 'WEST CENTRAL', desc: '全台首學，巷子裡都是古蹟和小吃', h: [6, 20], neon: 0.6, old: 1, slab: '#b89e8c' },
    { id: 'anping', zh: '安平', en: 'ANPING', desc: '古堡、樹屋和蝦餅', h: [5, 14], neon: 0.4, old: 1, slab: '#b89e8c' },
    { id: 'east', zh: '東區', en: 'EAST DISTRICT', desc: '成大與文教區', h: [12, 40], neon: 0.45, old: 0.7 },
    { id: 'north', zh: '北區・永康', en: 'YONGKANG', desc: '工廠、眷村與夜市', h: [8, 26], neon: 0.5, old: 0.9 },
    { id: 'rende', zh: '仁德', en: 'RENDE', desc: '機場與博物館', h: [6, 18], neon: 0.25, old: 0.6, sparse: 0.15 },
  ]);
  R.tainan = {
    id: 'tainan', zh: '台南市', en: 'TAINAN CITY', desc: '府城。赤崁樓、安平古堡與吃不完的小吃', salt: 114,
    districts: TN, districtAt: (x, z) => (x < -380 ? TN.anping : z >= 240 ? TN.rende : x >= 260 ? TN.east : z < -180 ? TN.north : TN.old),
    mainX: lines(BX, ['安平路', '健康路', '海安路', '西門路', '中山路', '北門路', '長榮路', '中華東路', '崇明路', '仁和路'], [2]),
    mainZ: lines(BZ, ['和緯路', '公園路', '民族路', '民權路', '府前路', '健康路二段', '文華路', '機場路'], [2]),
    landmarks: [
      { id: 'train', zh: '台南車站', rect: [-60, 100, 100, 240], slab: '#bdb6a8', col: '#efece6' },
      { id: 'chihkan', zh: '赤崁樓', rect: [-380, -320, -220, -180], slab: '#b4a894', col: '#b3261e' },
      { id: 'confucius', zh: '孔廟', rect: [-220, -320, -60, -180], slab: '#5f8a4a', park: true, trees: 40 },
      { id: 'fort', zh: '安平古堡', rect: [-540, -40, -380, 100], slab: '#b4a894', col: '#b5664a' },
      { id: 'chimei', zh: '奇美博物館', rect: [420, 240, 580, 380], slab: '#5a8a45', park: true, trees: 40 },
    ],
    pedZones: B_STD.pedZone('花園夜市'), nightMarket: B_STD.nm('花園夜市'), gas: B_STD.gas('健康站', '文華站'),
    names: { hospital: ['台南醫院', 'TAINAN HOSPITAL'], police: ['台南市警察局', 'TAINAN CITY POLICE'] },
    outer: { w: 'sea' },
    gates: [{ side: 'n', at: 100, to: 'chiayi', road: '國道1號' }, { side: 's', at: -220, to: 'kaohsiung', road: '國道1號' }],
    shops: B_STD.shops('府城'),
    build(kit) {
      use(kit);
      station(W.lm.train, '台南車站', 'TAINAN STATION', { wall: '#efece6', roof: '#8a8a84', trim: '#cfc7b8', h: 12 });
      { // 赤崁樓: two towers on a brick terrace, a row of stone steles in front
        const L = W.lm.chihkan, cx = L.cx, cz = L.cz - 6;
        K.B('brick', cx, cz).box(cx, y0 + 2.2, cz, 84, 4.4, 40, C('#b5664a'), { facade: [6, 4] });
        for (const s of [-1, 1]) {
          box(cx + s * 20, y0 + 7.4, cz, 24, 6, 14, '#8e2a1f'); K.coneRoof(cx + s * 20, y0 + 10.4, cz, 32, 20, 3.4, '#b5452e');
          box(cx + s * 20, y0 + 15.4, cz, 14, 3.6, 8, '#8e2a1f'); K.coneRoof(cx + s * 20, y0 + 17.2, cz, 21, 13, 4, '#b5452e');
        }
        K.solid(cx, cz, 84, 40, 22);
        for (let k = -4; k <= 4; k++) { box(cx + k * 6, y0 + 2.4, cz + 26, 1.6, 3.6, 0.5, '#8a8a84'); ball(cx + k * 6, y0 + 0.5, cz + 26, 1.2, 0.5, 1, '#6a6a66'); }
        K.solid(cx, cz + 26, 52, 1.4, 4);
        sign('赤崁樓', cx, L.z1 - 5, 8, '#8e2a1f', '#ffd76a', 'CHIHKAN TOWER');
      }
      { // 孔廟: red walls, the main hall and the 全臺首學 gate
        const L = W.lm.confucius, cx = L.cx, cz = L.cz - 4;
        for (const s of [-1, 1]) { box(cx + s * 44, y0 + 2, cz, 0.8, 4, 80, '#b3261e'); K.solid(cx + s * 44, cz, 0.8, 80, 4); }
        box(cx, y0 + 2, cz - 40, 88, 4, 0.8, '#b3261e'); K.solid(cx, cz - 40, 88, 0.8, 4);
        K.temple(cx, cz - 14, 30, 18, 8, 6, '#b3261e', '#8e2a1f', '#b5452e');
        K.temple(cx - 30, cz - 10, 8, 30, 5, 3, '#b3261e', '#8e2a1f', '#b5452e'); K.temple(cx + 30, cz - 10, 8, 30, 5, 3, '#b3261e', '#8e2a1f', '#b5452e');
        for (const s of [-1, 1]) { box(cx + s * 5, y0 + 3, cz + 40, 2, 6, 2, '#b3261e'); K.solid(cx + s * 5, cz + 40, 2, 2, 6); }
        K.coneRoof(cx, y0 + 6, cz + 40, 16, 5, 2.6, '#b5452e');
        K.label('全臺首學', cx, y0 + 5, cz + 41.2, 8, 1.7, 0, '#22303a', '#ffd76a');
        L.pond = [cx - 20, cz + 6, cx + 20, cz + 30];
      }
      { // 安平古堡: the brick fort and its white lookout tower
        const L = W.lm.fort, cx = L.cx, cz = L.cz - 4;
        K.B('brick', cx, cz).box(cx, y0 + 3.5, cz, 76, 7, 56, C('#b5664a'), { facade: [6, 6] });
        K.B('brick', cx, cz).box(cx, y0 + 9, cz - 6, 46, 4, 32, C('#b5664a'), { facade: [5, 4] });
        box(cx + 6, y0 + 15.6, cz - 8, 20, 9, 12, '#f4f2ee'); K.coneRoof(cx + 6, y0 + 20, cz - 8, 24, 16, 3, '#b5452e');
        taper(cx - 14, y0 + 11, cz - 8, 3.4, 2.8, 16, '#fbfbf7', 8); taper(cx - 14, y0 + 27, cz - 8, 3.6, 0.1, 5, '#c0392b', 8);
        for (let k = -2; k <= 2; k++) { K.lmB(cx, cz).geo(new THREE.CylinderGeometry(0.4, 0.5, 4, 8), cx + k * 12, y0 + 8, cz + 26, 1, 1, 1, C('#2a2d30'), { rx: Math.PI / 2.3 }); box(cx + k * 12, y0 + 7.4, cz + 25, 1.6, 0.8, 2.4, '#5a4632'); }
        K.solid(cx, cz, 76, 56, 14); K.solid(cx - 14, cz - 8, 7, 7, 32);
        sign('安平古堡', cx, L.z1 - 5, 10, '#8a3a2a', '#ffe9b0', 'ANPING OLD FORT');
      }
      { // 奇美博物館: a domed white palace behind a fountain and a statue-lined bridge
        const L = W.lm.chimei, cx = L.cx, cz = L.cz - 22;
        L.pond = [cx - 34, L.cz + 6, cx + 34, L.cz + 34];
        box(cx, y0 + 0.24, L.cz + 20, 68, 0.04, 28, '#3d6f8a');
        box(cx, y0 + 0.9, L.cz + 20, 7, 0.6, 30, '#efece6'); for (let k = -2; k <= 2; k++) for (const s of [-1, 1]) box(cx + s * 4, y0 + 2, L.cz + 20 + k * 6, 0.6, 2.6, 0.6, '#f7f5f1');
        box(cx, y0 + 8, cz, 96, 16, 30, '#f4f2ee'); box(cx, y0 + 17, cz, 100, 2, 34, '#e3ded2');
        for (let k = -7; k <= 7; k++) box(cx + k * 6, y0 + 8, cz + 16, 1.4, 16, 1.4, '#fbfbf7');
        box(cx, y0 + 12, cz + 3, 26, 24, 30, '#f4f2ee'); K.coneRoof(cx, y0 + 24, cz + 18, 26, 4, 4, '#e3ded2', 3, Math.PI / 2);
        cyl(cx, y0 + 24, cz, 9, 6, '#f4f2ee', 16); K.lmB(cx, cz).geo(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), cx, y0 + 30, cz, 9.4, 9, 9.4, C('#8f9aa0')); taper(cx, y0 + 39, cz, 1, 0.2, 4, '#d9a62e', 8);
        K.solid(cx, cz, 96, 30, 40);
        sign('奇美博物館', cx - 40, L.z1 - 5, 12, '#f4f2ee', '#1a1a1a', 'CHIMEI MUSEUM');
      }
      specialsB();
    },
  };

  // =====================================================================
  // 高雄市
  // =====================================================================
  const KH = mkD([
    { id: 'central', zh: '鹽埕・前金', en: 'YANCHENG', desc: '愛河邊的老城區', h: [10, 36], neon: 0.7, old: 0.95 },
    { id: 'bay', zh: '亞洲新灣區', en: 'ASIA NEW BAY', desc: '港邊的高樓與展覽館', h: [40, 130], neon: 0.12, old: 0.4, tower: true, slab: '#c4c2bc' },
    { id: 'zuoying', zh: '左營', en: 'ZUOYING', desc: '蓮池潭與眷村', h: [10, 40], neon: 0.45, old: 0.8 },
    { id: 'qianzhen', zh: '前鎮・小港', en: 'QIANZHEN', desc: '加工區、夢時代與機場', h: [10, 36], neon: 0.4, old: 0.8 },
    { id: 'fengshan', zh: '鳳山', en: 'FENGSHAN', desc: '老縣城與衛武營', h: [8, 28], neon: 0.5, old: 0.95 },
  ]);
  R.kaohsiung = {
    id: 'kaohsiung', zh: '高雄市', en: 'KAOHSIUNG CITY', desc: '港都。85 大樓、龍虎塔、駁二和六合夜市', salt: 115, mrtName: '高雄捷運',
    districts: KH, districtAt: (x, z) => (x >= 420 ? KH.fengshan : z >= 240 ? KH.qianzhen : x < -60 && z < -40 ? KH.bay : x >= 100 && z < -40 ? KH.zuoying : KH.central),
    mainX: lines(BX, ['濱海路', '七賢路', '成功路', '中華路', '中山路', '民族路', '博愛路', '澄清路', '鳳山大道', '鳳頂路'], [4]),
    mainZ: lines(BZ, ['翠華路', '大順路', '九如路', '中正路', '五福路', '三多路', '一心路', '中安路'], [3]),
    landmarks: [
      { id: 'train', zh: '高雄車站', rect: [-60, 100, 100, 240], slab: '#c9c6bd', col: '#7fb05a' },
      { id: 'pier2', zh: '駁二藝術特區', rect: [-380, -320, -220, -180], slab: '#9a9c9d', col: '#b5664a' },
      { id: 'tower85', zh: '85大樓', rect: [-220, -320, -60, -180], slab: '#c9c6bd', col: '#5f7f9a' },
      { id: 'lotus', zh: '蓮池潭 龍虎塔', rect: [260, -320, 420, -180], slab: '#5a8a45', park: true, trees: 30 },
      { id: 'weiwuying', zh: '衛武營', rect: [420, 240, 580, 380], slab: '#5f8a4a', park: true, trees: 50 },
    ],
    pedZones: B_STD.pedZone('六合夜市'), nightMarket: B_STD.nm('六合夜市'), gas: B_STD.gas('七賢站', '一心站'),
    mrt: B_STD.mrt(['西子灣', 'Sizihwan', '美麗島', 'Formosa Boulevard', '左營', 'Zuoying', '三多商圈', 'Sanduo Shopping District', '鳳山', 'Fongshan']),
    names: { hospital: ['高雄醫院', 'KAOHSIUNG HOSPITAL'], police: ['高雄市警察局', 'KAOHSIUNG CITY POLICE'] },
    outer: { w: 'sea' },
    gates: [{ side: 'n', at: 100, to: 'tainan', road: '國道1號' }, { side: 'e', at: -180, to: 'pingtung', road: '國道3號' }],
    shops: B_STD.shops('港都'),
    build(kit) {
      use(kit);
      { // the new station under its green canopy
        const s = station(W.lm.train, '高雄車站', 'KAOHSIUNG STATION', { wall: '#f4f6f7', roof: '#e3e8ea', trim: '#a9bcc8', h: 12 });
        box(s.cx, y0 + 16.4, s.cz + 8, s.w + 30, 1.4, s.d + 40, '#7fb05a');
        for (const a of [-1, 1]) for (const b of [-1, 1]) { taper(s.cx + a * (s.w / 2 + 9), y0, s.cz + 8 + b * (s.d / 2 + 14), 0.9, 2.4, 15.8, '#f4f6f7', 10); K.solid(s.cx + a * (s.w / 2 + 9), s.cz + 8 + b * (s.d / 2 + 14), 2, 2, 16); }
      }
      { // 駁二: brick warehouses on the quay, a ferry and two giant robots
        const L = W.lm.pier2;
        water(L, L.x0 + 4, L.z0 + 4, L.x1 - 4, L.z0 + 44, '#2f6480');
        ferry(L.cx - 10, L.z0 + 26, 52, '#e8641b');
        for (let k = -1; k <= 1; k++) { const wx = L.cx + k * 42; K.B('brick', wx, L.cz).box(wx, y0 + 4, L.cz + 6, 34, 8, 20, C('#b5664a'), { facade: [6, 8] }); K.lmB(wx, L.cz).geo(K.PRISM, wx, y0 + 8 + 5 / 3, L.cz + 6, 22, 35, 5 / 0.866, C('#5d6b75'), { rz: Math.PI / 2, rx: -Math.PI / 2 }); K.solid(wx, L.cz + 6, 34, 20, 12); }
        for (const [dx, c] of [[-26, '#f2c230'], [26, '#e84b3c']]) {
          const rx = L.cx + dx, rz = L.z1 - 22;
          for (const s of [-1, 1]) { box(rx + s * 1.2, y0 + 2, rz, 1.4, 4, 1.6, c); box(rx + s * 3, y0 + 6.4, rz, 1.2, 4, 1.4, c); }
          box(rx, y0 + 6.4, rz, 4.4, 4.8, 2.6, c); box(rx, y0 + 10, rz, 2.6, 2.4, 2.4, '#dfe5ea'); box(rx, y0 + 10.2, rz + 1.25, 1.8, 0.6, 0.1, '#22303a');
          K.solid(rx, rz, 7, 3, 11);
        }
        sign('駁二藝術特區', L.cx, L.z1 - 5, 14, '#22303a', '#ffffff', 'PIER-2 ART CENTER');
      }
      { // 85 大樓: two legs joined high up, with the tower rising from the bridge
        const L = W.lm.tower85, cx = L.cx, cz = L.cz - 8;
        box(cx, y0 + 7, cz, 88, 14, 54, '#cfd3d4');
        for (const s of [-1, 1]) { box(cx + s * 22, y0 + 64, cz, 26, 100, 30, '#5f7f9a'); for (let yy = 22; yy < 112; yy += 9) box(cx + s * 22, y0 + yy, cz, 26.4, 0.6, 30.4, '#42607a'); }
        box(cx, y0 + 128, cz, 70, 30, 30, '#5f7f9a'); box(cx, y0 + 196, cz, 30, 106, 26, '#6f8fa8');
        for (let yy = 150; yy < 248; yy += 10) box(cx, y0 + yy, cz, 30.4, 0.6, 26.4, '#42607a');
        taper(cx, y0 + 249, cz, 12, 2, 26, '#8fa5b5', 4); taper(cx, y0 + 275, cz, 1, 0.2, 40, '#c9d2d8', 6);
        K.solid(cx, cz, 88, 54, 300);
        K.label('高雄85大樓', cx, y0 + 10, cz + 27.3, 26, 4, 0, '#1b2a36', '#ffffff', '85 SKY TOWER');
      }
      { // 蓮池潭: the lake and the Dragon and Tiger Pagodas at the end of a zigzag bridge
        const L = W.lm.lotus;
        const r = [L.x0 + 10, L.z0 + 8, L.x1 - 10, L.z1 - 38];
        water(L, r[0], r[1], r[2], r[3], '#3a7f6a'); L.pond = r;
        for (const s of [-1, 1]) {
          const px = L.cx + s * 13, pz = r[3] - 14;
          cyl(px, y0, pz, 7, 0.8, '#c9bfae', 12);
          pagoda(px, pz, 7, '#f2c230', '#c0392b');
          for (let k = 0; k < 4; k++) box(px + (k % 2 ? 2 : -2), y0 + 0.6, r[3] + 3 + k * 4.4, 3.2, 0.5, 5, '#c9bfae');
          const c = s < 0 ? '#3f8f5a' : '#f2a23a';
          ball(px, y0 + 2.4, r[3] + 22, 2.6, 2.4, 3.6, c); ball(px, y0 + 2, r[3] + 25.2, 1.9, 1.2, 1.4, '#c0392b');
          for (const e of [-1, 1]) ball(px + e * 1.2, y0 + 3.8, r[3] + 23.8, 0.5, 0.5, 0.5, '#ffffff');
          K.solid(px, r[3] + 22, 5, 7, 5);
        }
        sign('龍虎塔', L.cx, L.z1 - 4, 8, '#c0392b', '#ffd76a', 'DRAGON AND TIGER PAGODAS');
      }
      { // 衛武營: one vast white roof floating over the halls
        const L = W.lm.weiwuying, cx = L.cx, cz = L.cz - 10;
        L.pond = [cx - 56, cz - 40, cx + 56, cz + 40];
        for (const [dx, dz, w, d] of [[-30, -14, 34, 28], [26, -16, 30, 26], [-22, 18, 26, 20], [30, 18, 24, 18]]) { box(cx + dx, y0 + 7, cz + dz, w, 14, d, '#dfe5ea'); K.solid(cx + dx, cz + dz, w, d, 14); }
        box(cx, y0 + 15.4, cz, 112, 2.6, 78, '#f7f7f5'); box(cx, y0 + 17.2, cz, 96, 1.4, 62, '#eef1f3');
        sign('衛武營國家藝術文化中心', cx, L.z1 - 5, 22, '#f4f6f7', '#1a1a1a', 'WEIWUYING');
      }
      specialsB();
    },
  };

  // =====================================================================
  // 屏東縣
  // =====================================================================
  const PT = mkD([
    { id: 'city', zh: '屏東市', en: 'PINGTUNG', desc: '夜市、眷村和萬巒豬腳', h: [8, 24], neon: 0.55, old: 0.9 },
    { id: 'chaozhou', zh: '潮州・恆春', en: 'HENGCHUN', desc: '古城門、洋蔥田與落山風', h: [5, 14], neon: 0.4, old: 1 },
    { id: 'donggang', zh: '東港', en: 'DONGGANG', desc: '黑鮪魚和櫻花蝦', h: [4, 12], neon: 0.35, old: 0.8, sparse: 0.3 },
    { id: 'kenting', zh: '墾丁', en: 'KENTING', desc: '國境之南，陽光沙灘比基尼', h: [5, 14], neon: 0.75, old: 1, slab: '#d9cba4' },
  ]);
  R.pingtung = {
    id: 'pingtung', zh: '屏東縣', en: 'PINGTUNG COUNTY', desc: '國境之南。墾丁沙灘、鵝鑾鼻燈塔與海生館', salt: 116,
    districts: PT, districtAt: (x, z) => (z >= 300 ? PT.kenting : x < -240 ? PT.donggang : z < -120 ? PT.city : PT.chaozhou),
    mainX: lines(AX, ['沿山公路', '東港路', '屏鵝公路', '中正路', '自由路', '恆春路', '船帆路', '鵝鑾路'], [2]),
    mainZ: lines(AZ, ['建國路', '民生路', '復興路', '潮州路', '恆南路', '墾丁路', '南灣路'], [2]),
    landmarks: [
      { id: 'train', zh: '屏東車站', rect: [-80, 20, 80, 160], slab: '#bdb6a8', col: '#b89a6a' },
      { id: 'aquarium', zh: '海生館', rect: [-400, -260, -240, -120], slab: '#c9c6bd', col: '#3f8fb3' },
      { id: 'beach', zh: '墾丁白沙灣', rect: [-560, 160, -240, 400], slab: '#e2d3a4', col: '#e2d3a4' },
      { id: 'eluanbi', zh: '鵝鑾鼻燈塔', rect: [400, 160, 560, 300], slab: '#6fa04a', park: true, trees: 24 },
    ],
    pedZones: A_STD.pedZone('墾丁大街'), nightMarket: A_STD.nm('墾丁大街'), gas: A_STD.gas('自由站', '船帆站'),
    names: { hospital: ['屏東醫院', 'PINGTUNG HOSPITAL'], police: ['屏東縣警察局', 'PINGTUNG COUNTY POLICE'] },
    outer: { s: 'sea', w: 'sea', e: 'hills' },
    gates: [{ side: 'n', at: -240, to: 'kaohsiung', road: '國道3號' }, { side: 'e', at: 20, to: 'taitung', road: '南迴公路' }],
    shops: A_STD.shops('阿猴'),
    build(kit) {
      use(kit);
      station(W.lm.train, '屏東車站', 'PINGTUNG STATION', { wall: '#e9e4d6', roof: '#3b6ea5' });
      { // 海生館: a wave-roofed hall and the whale fountain
        const L = W.lm.aquarium, cx = L.cx, cz = L.cz - 14;
        box(cx, y0 + 7, cz, 90, 14, 40, '#3f8fb3');
        for (let k = -4; k <= 4; k++) K.lmB(cx, cz).geo(new THREE.CylinderGeometry(5.6, 5.6, 42, 14, 1, false, 0, Math.PI), cx + k * 10, y0 + 14, cz, 1, 1, 1, C(k % 2 ? '#dff1f7' : '#bfe3ef'), { rx: Math.PI / 2, rz: Math.PI / 2 });
        box(cx, y0 + 4, cz + 20.2, 30, 8, 0.5, '#22303a');
        K.solid(cx, cz, 90, 40, 20);
        const wx = cx, wz = L.cz + 30;
        cyl(wx, y0, wz, 13, 0.8, '#c9c0ae', 20); cyl(wx, y0 + 0.8, wz, 12, 0.1, '#4f9ac4', 20);
        ball(wx, y0 + 4.6, wz, 9, 3, 3.4, '#5f7f9a'); ball(wx + 2, y0 + 3.8, wz, 6.4, 2, 3, '#e9eeec');
        box(wx - 10.4, y0 + 6.4, wz, 4, 0.6, 6, '#5f7f9a', { rz: -0.5 }); taper(wx + 5, y0 + 7.4, wz, 0.3, 1.2, 3.4, '#e3f4fb', 6);
        K.solid(wx, wz, 24, 24, 3);
        sign('國立海洋生物博物館', cx - 36, L.z1 - 5, 20, '#1f4f7a', '#ffffff', 'NATIONAL MUSEUM OF MARINE BIOLOGY');
      }
      { // the beach
        const L = W.lm.beach;
        beach(L, 's', 110);
        const cols = ['#e84b3c', '#ffd54f', '#4fc3f7', '#81c784', '#f06292', '#ffffff'];
        for (let k = 0; k < 26; k++) parasol(U.rr(L.x0 + 14, L.x1 - 14), U.rr(L.z0 + 60, L.z1 - 118), U.pick(cols));
        for (let x = L.x0 + 14; x < L.x1 - 8; x += 22) palm(x, L.z0 + 14);
        box(L.cx, y0 + 2.2, L.z1 - 124, 5, 4.4, 5, '#f4f2ee'); box(L.cx, y0 + 4.8, L.z1 - 124, 6, 0.4, 6, '#e84b3c'); K.solid(L.cx, L.z1 - 124, 5, 5, 5);
        for (const [dx, c] of [[-70, '#ffd54f'], [50, '#e84b3c'], [110, '#4fc3f7']]) { box(L.cx + dx, y0 + 0.6, L.z1 - 60, 1.4, 0.4, 6, c); box(L.cx + dx, y0 + 2.6, L.z1 - 60, 0.1, 4, 0.1, '#eeeeee'); K.lmB(L.cx + dx, L.z1 - 60).geo(new THREE.ConeGeometry(2, 3.6, 3), L.cx + dx + 0.9, y0 + 2.8, L.z1 - 60, 0.1, 1, 1, C('#ffffff')); }
        sign('墾丁 白沙灣', L.x1 - 20, L.z0 + 8, 12, '#1f6f8a', '#ffffff', 'KENTING BEACH');
      }
      { // 鵝鑾鼻
        const L = W.lm.eluanbi;
        lighthouse(L.cx, L.cz - 10, 20);
        for (const s of [-1, 1]) { box(L.cx + s * 13, y0 + 1.4, L.cz - 10, 0.8, 2.8, 30, '#fbfbf7'); K.solid(L.cx + s * 13, L.cz - 10, 0.8, 30, 2.8); }
        box(L.cx, y0 + 1.4, L.cz - 25, 27, 2.8, 0.8, '#fbfbf7'); K.solid(L.cx, L.cz - 25, 27, 0.8, 2.8);
        box(L.cx + 30, y0 + 2, L.cz + 20, 3, 4, 1.2, '#8a8a84'); K.label('臺灣最南點', L.cx + 30, y0 + 2.4, L.cz + 20.7, 2.6, 2.6, 0, '#8a8a84', '#c62828'); K.solid(L.cx + 30, L.cz + 20, 3, 1.2, 4);
        sign('鵝鑾鼻燈塔', L.cx, L.z1 - 5, 12, '#1f4f7a', '#ffffff', 'ELUANBI LIGHTHOUSE');
      }
      specialsA();
    },
  };

  // =====================================================================
  // 台東縣
  // =====================================================================
  const TT = mkD([
    { id: 'city', zh: '台東市', en: 'TAITUNG', desc: '慢慢來，比較快', h: [6, 18], neon: 0.45, old: 0.9 },
    { id: 'luye', zh: '鹿野・關山', en: 'LUYE', desc: '縱谷裡的茶園與熱氣球', h: [4, 10], neon: 0.2, old: 0.7, sparse: 0.4 },
    { id: 'coast', zh: '成功・東河', en: 'EAST COAST', desc: '太平洋的風，東河包子', h: [4, 10], neon: 0.25, old: 0.8, sparse: 0.4 },
    { id: 'chishang', zh: '池上', en: 'CHISHANG', desc: '便當和看不到盡頭的稻田', h: [4, 10], neon: 0.3, old: 0.9, sparse: 0.3 },
  ]);
  R.taitung = {
    id: 'taitung', zh: '台東縣', en: 'TAITUNG COUNTY', desc: '後山。熱氣球、伯朗大道與三仙台', salt: 117,
    districts: TT, districtAt: (x, z) => (z < -120 ? TT.luye : x >= 240 ? TT.coast : x < -240 ? TT.chishang : TT.city),
    mainX: lines(AX, ['縱谷公路', '池上路', '中興路', '中華路', '更生路', '馬亨亨大道', '海岸公路', '富岡路'], [2]),
    mainZ: lines(AZ, ['高台路', '鹿野路', '關山路', '新生路', '正氣路', '知本路', '南迴路'], [2]),
    landmarks: [
      { id: 'train', zh: '台東車站', rect: [-80, 20, 80, 160], slab: '#bdb6a8', col: '#b89a6a' },
      { id: 'balloon', zh: '鹿野高台', rect: [-400, -260, -240, -120], slab: '#7fb05a', park: true, trees: 12 },
      { id: 'sanxiantai', zh: '三仙台', rect: [240, -400, 400, -260], slab: '#a9aaa6', col: '#c0392b' },
      { id: 'brown', zh: '池上伯朗大道', rect: [-560, 160, -240, 400], slab: '#8db552', park: true, trees: 6 },
      { id: 'tiehua', zh: '鐵花村', rect: [240, -120, 400, 20], slab: '#5f8a4a', park: true, trees: 44 },
    ],
    pedZones: A_STD.pedZone('台東觀光夜市'), nightMarket: A_STD.nm('台東觀光夜市'), gas: A_STD.gas('更生站', '海岸站'),
    names: { hospital: ['台東醫院', 'TAITUNG HOSPITAL'], police: ['台東縣警察局', 'TAITUNG COUNTY POLICE'] },
    outer: { e: 'sea', w: 'hills', n: 'hills' },
    gates: [{ side: 'w', at: -120, to: 'pingtung', road: '南迴公路' }, { side: 'n', at: -240, to: 'hualien', road: '花東縱谷公路' }],
    shops: A_STD.shops('後山'),
    build(kit) {
      use(kit);
      station(W.lm.train, '台東車站', 'TAITUNG STATION', { wall: '#e3d6b6', roof: '#7a5a3a', train: ['#f5f5f2', '#c0392b'] });
      { // 鹿野高台: hot-air balloons over the grass
        const L = W.lm.balloon;
        const cs = [['#e84b3c', '#ffd54f'], ['#4fc3f7', '#ffffff'], ['#81c784', '#f06292'], ['#ffb74d', '#7e57c2'], ['#f06292', '#ffffff'], ['#ffd54f', '#1f4f9c'], ['#7e57c2', '#81c784']];
        cs.forEach((c, i) => balloon(L.cx - 50 + (i % 4) * 34 + (i > 3 ? 16 : 0), y0 + (i < 2 ? 15 : 34 + i * 9), L.cz - 34 + Math.floor(i / 4) * 44 + (i % 2) * 10, c[0], c[1]));
        K.solid(L.cx - 50, L.cz - 34, 3, 3, 3); K.solid(L.cx - 16, L.cz - 24, 3, 3, 3);
        sign('鹿野高台 熱氣球嘉年華', L.cx, L.z1 - 5, 20, '#e8641b', '#ffffff', 'LUYE BALLOON FESTIVAL');
      }
      { // 三仙台: the eight-arch footbridge out to the islet
        const L = W.lm.sanxiantai;
        water(L, L.x0 + 4, L.z0 + 4, L.x1 - 4, L.z1 - 34, '#2f7f9a');
        const bz = L.cz - 10, x0 = L.x0 + 12, span = 11;
        for (let k = 0; k < 8; k++) for (let i = 0; i < 6; i++) {
          const t = (i + 0.5) / 6, a = (t - 0.5) * 1.5;
          box(x0 + k * span + t * span, y0 + 1 + Math.cos(a) * 3.2, bz, span / 6 + 0.3, 0.4, 3, k % 2 ? '#e8e3d6' : '#d9534a', { rz: Math.sin(a) * 0.62 });
        }
        for (let k = 0; k <= 8; k++) box(x0 + k * span, y0 + 1.4, bz, 0.8, 2.8, 3.4, '#b8b4aa');
        const ix = L.x1 - 26;
        ball(ix, y0 + 2, bz - 4, 16, 6, 13, '#6a6a66'); ball(ix + 4, y0 + 6, bz - 8, 7, 9, 6, '#5a5a56'); ball(ix - 8, y0 + 5, bz, 5, 7, 5, '#74746e'); ball(ix + 8, y0 + 4.6, bz + 4, 4.4, 6.4, 4.4, '#63635e');
        sign('三仙台', L.cx, L.z1 - 8, 8, '#1f6f8a', '#ffffff', 'SANXIANTAI');
      }
      { // 伯朗大道: one straight road through the paddies and the famous lone tree
        const L = W.lm.brown;
        paddy(L, 2);
        box(L.cx, y0 + 0.24, L.cz, L.x1 - L.x0 - 10, 0.1, 5, '#55575a');
        tree(L.cx + 30, L.cz - 7, 2.2);
        sign('伯朗大道', L.cx + 30, L.cz + 8, 9, '#3f6f33', '#ffffff', 'MR. BROWN AVENUE');
      }
      { // 鐵花村: paper-balloon lanterns strung between the trees, and a small stage
        const L = W.lm.tiehua;
        for (let k = 0; k < 40; k++) W.lanterns.push([U.rr(L.x0 + 14, L.x1 - 14), y0 + U.rr(4.4, 7), U.rr(L.z0 + 14, L.z1 - 14)]);
        box(L.cx, y0 + 0.6, L.cz - 20, 20, 1.2, 10, '#8a5a3a'); box(L.cx, y0 + 4.2, L.cz - 24.6, 20, 6, 0.6, '#3a2a22'); K.coneRoof(L.cx, y0 + 7.2, L.cz - 20, 24, 13, 2.4, '#5a4632');
        K.solid(L.cx, L.cz - 20, 20, 10, 1.2);
        sign('鐵花村音樂聚落', L.cx, L.z1 - 5, 15, '#5a4632', '#ffe9b0', 'TIEHUA MUSIC VILLAGE');
      }
      specialsA();
    },
  };

  // =====================================================================
  // 花蓮縣
  // =====================================================================
  const HL = mkD([
    { id: 'city', zh: '花蓮市', en: 'HUALIEN', desc: '扁食、麻糬與太平洋', h: [6, 20], neon: 0.5, old: 0.9 },
    { id: 'xincheng', zh: '新城', en: 'XINCHENG', desc: '太魯閣的門口', h: [4, 12], neon: 0.3, old: 0.8, sparse: 0.3 },
    { id: 'jian', zh: '吉安', en: "JI'AN", desc: '山腳下的田與慶修院', h: [4, 10], neon: 0.25, old: 0.8, sparse: 0.35 },
    { id: 'coast', zh: '美崙', en: 'MEILUN', desc: '海岸、港口和松園', h: [5, 14], neon: 0.3, old: 0.7, sparse: 0.2 },
  ]);
  R.hualien = {
    id: 'hualien', zh: '花蓮縣', en: 'HUALIEN COUNTY', desc: '洄瀾。太魯閣峽谷、七星潭與東大門夜市', salt: 118,
    districts: HL, districtAt: (x, z) => (z < -120 ? HL.xincheng : x < -240 ? HL.jian : x >= 240 ? HL.coast : HL.city),
    mainX: lines(AX, ['中央路', '吉安路', '中山路', '中正路', '中華路', '府前路', '海岸路', '七星街'], [2]),
    mainZ: lines(AZ, ['太魯閣路', '新城路', '林森路', '國聯路', '和平路', '重慶路', '南濱路'], [2]),
    landmarks: [
      { id: 'train', zh: '花蓮車站', rect: [-80, 20, 80, 160], slab: '#bdb6a8', col: '#b89a6a' },
      { id: 'taroko', zh: '太魯閣', rect: [-400, -260, -240, -120], slab: '#9a9c9d', col: '#d8d8d2' },
      { id: 'qixingtan', zh: '七星潭', rect: [240, -400, 560, -120], slab: '#a9aaa6', col: '#a9aaa6' },
    ],
    pedZones: A_STD.pedZone('東大門夜市'), nightMarket: A_STD.nm('東大門夜市'), gas: A_STD.gas('中華站', '海岸站'),
    names: { hospital: ['花蓮醫院', 'HUALIEN HOSPITAL'], police: ['花蓮縣警察局', 'HUALIEN COUNTY POLICE'] },
    outer: { e: 'sea', w: 'hills', n: 'hills' },
    gates: [{ side: 'n', at: -240, to: 'yilan', road: '蘇花公路' }, { side: 's', at: 80, to: 'taitung', road: '花東縱谷公路' }],
    shops: A_STD.shops('洄瀾'),
    build(kit) {
      use(kit);
      station(W.lm.train, '花蓮車站', 'HUALIEN STATION', { wall: '#e9e4d6', roof: '#3f6f7a', train: ['#f5f5f2', '#c0392b'] });
      { // 太魯閣: marble walls either side of the river, 長春祠 and its waterfall, the gate
        const L = W.lm.taroko;
        box(L.cx, y0 + 0.24, L.cz, 16, 0.04, L.z1 - L.z0 - 6, '#4f9ac4');
        const cs = ['#d8d8d2', '#c4c4bd', '#b0b0a8', '#e3e3de'];
        for (const s of [-1, 1]) for (let k = 0; k < 6; k++) {
          const w = U.rr(22, 34), h = U.rr(30, 64), cx = L.cx + s * (22 + w / 2), cz = L.z0 + 14 + k * 17;
          if (s > 0 && k > 3) continue;
          box(cx, y0 + h / 2, cz, w, h, 18, U.pick(cs), { ry: U.rr(-0.12, 0.12) }); ball(cx, y0 + h, cz, w * 0.44, 5, 8, '#4a6446');
          K.solid(cx, cz, w, 17, h);
        }
        const sx = L.cx - 24, sz = L.z0 + 50;
        box(sx + 3.4, y0 + 13, sz, 0.6, 26, 3, '#f4fbff'); K.temple(sx + 9, sz - 9, 10, 6, 3.4, 2.4, '#c8562e', '#b3261e', '#e3a13a');
        box(L.cx, y0 + 4, L.cz + 16, 30, 0.6, 3.4, '#c0392b'); for (const s of [-1, 1]) box(L.cx, y0 + 5, L.cz + 16 + s * 1.6, 30, 1.2, 0.2, '#c0392b');
        const gz = L.z1 - 14, gx = L.cx + 36;
        for (const s of [-1, 1]) { box(gx + s * 7, y0 + 4, gz, 1.6, 8, 1.6, '#b3261e'); K.solid(gx + s * 7, gz, 1.6, 1.6, 8); }
        K.coneRoof(gx, y0 + 8, gz, 22, 6, 3, '#e3a13a'); K.label('東西橫貫公路', gx, y0 + 6.8, gz + 0.9, 11, 1.8, 0, '#b3261e', '#ffd76a');
        sign('太魯閣國家公園', L.cx + 36, L.z1 - 4, 14, '#3f5a4a', '#ffffff', 'TAROKO GORGE');
      }
      { // 七星潭: a crescent of grey pebbles and the open Pacific
        const L = W.lm.qixingtan;
        beach(L, 'e', 150, '#256f9a');
        for (let k = 0; k < 60; k++) ball(U.rr(L.x0 + 10, L.x1 - 156), y0 + 0.2, U.rr(L.z0 + 10, L.z1 - 10), U.rr(0.3, 0.9), 0.25, U.rr(0.3, 0.8), U.pick(['#8a8a84', '#c4c4bd', '#6a6a66', '#e3e3de']));
        for (let k = 0; k < 5; k++) { const px = L.x0 + 30 + k * 26, pz = L.cz + 40; for (let i = 0; i < 5; i++) ball(px, y0 + 0.3 + i * 0.5, pz, 0.7 - i * 0.11, 0.26, 0.7 - i * 0.11, i % 2 ? '#c4c4bd' : '#8a8a84'); }
        box(L.x0 + 40, y0 + 1.6, L.z0 + 30, 22, 3.2, 12, '#a9865e'); for (let x = -10; x <= 10; x += 4) box(L.x0 + 40 + x, y0 + 3.8, L.z0 + 35.8, 0.2, 1.2, 0.2, '#8a5a3a'); K.solid(L.x0 + 40, L.z0 + 30, 22, 12, 3.2);
        for (let z = L.z0 + 16; z < L.z1 - 10; z += 24) palm(L.x0 + 10, z);
        sign('七星潭', L.x0 + 40, L.z1 - 8, 8, '#1f6f8a', '#ffffff', 'QIXINGTAN BEACH');
      }
      specialsA();
    },
  };

  // =====================================================================
  // 澎湖縣
  // =====================================================================
  const PH = mkD([
    { id: 'magong', zh: '馬公', en: 'MAGONG', desc: '菊島。咾咕石牆和仙人掌冰', h: [5, 14], neon: 0.5, old: 1, slab: '#b0a595' },
    { id: 'baisha', zh: '白沙・西嶼', en: 'BAISHA', desc: '風、石滬與玄武岩', h: [3, 7], neon: 0.15, old: 0.7, sparse: 0.45 },
  ]);
  R.penghu = {
    id: 'penghu', zh: '澎湖縣', en: 'PENGHU COUNTY', desc: '菊島。雙心石滬、跨海大橋與玄武岩', salt: 119, island: true,
    districts: PH, districtAt: (x, z) => (x < -240 || z < -140 ? PH.baisha : PH.magong),
    mainX: lines(CX, ['西嶼路', '白沙路', '中正路', '民生路', '光復路', '湖西路']),
    mainZ: lines(CZ, ['跨海路', '中華路', '治平路', '新生路', '風櫃路']),
    landmarks: [
      { id: 'train', zh: '馬公港', rect: [-80, 0, 80, 140], slab: '#9a9c9d', col: '#3b6ea5' },
      { id: 'temple', zh: '澎湖天后宮', rect: [-240, -140, -80, 0], slab: '#b4a894', col: '#b3261e' },
      { id: 'hearts', zh: '雙心石滬', rect: [240, -280, 400, -140], slab: '#a9aaa6', col: '#2f8a9a' },
      { id: 'basalt', zh: '大菓葉玄武岩', rect: [-400, 140, -240, 280], slab: '#6fa04a', park: true, trees: 6 },
      { id: 'bridge', zh: '跨海大橋', rect: [80, -280, 240, -140], slab: '#a9aaa6', col: '#f4f6f7' },
    ],
    pedZones: C_STD.pedZone('馬公老街'), nightMarket: C_STD.nm('馬公老街'), gas: C_STD.gas('馬公站'),
    names: { hospital: ['澎湖醫院', 'PENGHU HOSPITAL'], police: ['澎湖縣警察局', 'PENGHU COUNTY POLICE'] },
    outer: { n: 'sea', s: 'sea', e: 'sea', w: 'sea' }, gates: [], shops: C_STD.shops('菊島'),
    build(kit) {
      use(kit);
      terminal(W.lm.train, '馬公港', 'MAGONG HARBOR', false);
      { const L = W.lm.temple; K.temple(L.cx, L.cz + 22, 40, 10, 6, 5); K.temple(L.cx, L.cz - 8, 26, 18, 8, 6); for (let k = -2; k <= 2; k++) W.lanterns.push([L.cx + k * 7, y0 + 6.4, L.cz + 28.6]); K.label('澎湖天后宮', L.cx, y0 + 8.6, L.cz + 28.8, 12, 2, 0, '#8e2a1f', '#ffd76a'); }
      { // the twin-heart stone weir, seen from the cliff-top deck
        const L = W.lm.hearts;
        water(L, L.x0 + 4, L.z0 + 4, L.x1 - 4, L.z1 - 34, '#2f9aa8');
        const heart = (hx, hz, s) => { for (let k = 0; k < 44; k++) { const t = (k / 44) * Math.PI * 2; const px = 16 * Math.sin(t) ** 3, pz = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); ball(hx + px * s, y0 + 0.5, hz + pz * s, 1.5, 0.7, 1.5, k % 2 ? '#3a3a38' : '#4a4a46'); } };
        heart(L.cx - 16, L.cz - 26, 1.25); heart(L.cx + 20, L.cz - 20, 1);
        box(L.cx, y0 + 1, L.z1 - 24, 40, 2, 10, '#a9865e'); K.solid(L.cx, L.z1 - 24, 40, 10, 2);
        sign('雙心石滬', L.cx, L.z1 - 8, 10, '#1f6f8a', '#ffffff', 'TWIN-HEART STONE WEIR');
      }
      { // basalt columns
        const L = W.lm.basalt;
        for (let k = 0; k < 46; k++) { const px = L.cx - 44 + (k % 23) * 4 + (k > 22 ? 2 : 0), pz = L.cz - 20 + (k > 22 ? 3.6 : 0), h = U.rr(9, 20); cyl(px, y0, pz, 2.2, h, U.pick(['#3a3a38', '#4a4a46', '#2f2f2d']), 6); }
        K.solid(L.cx + 1, L.cz - 18, 96, 9, 20);
        box(L.cx, y0 + 0.24, L.cz + 6, 60, 0.04, 26, '#3d6f8a');
        sign('大菓葉玄武岩', L.cx, L.z1 - 5, 13, '#3a3a38', '#ffffff', 'BASALT COLUMNS');
      }
      { // 跨海大橋: the arch at the bridgehead and the deck running out to sea
        const L = W.lm.bridge;
        const ax = L.cx, az = L.cz + 20;
        for (const s of [-1, 1]) { box(ax + s * 9, y0 + 5, az, 2.4, 10, 2.4, '#f4f6f7'); K.solid(ax + s * 9, az, 2.4, 2.4, 10); }
        for (let k = 0; k < 9; k++) { const a = -1.2 + (k / 8) * 2.4; box(ax + Math.sin(a) * 9.6, y0 + 10 + Math.cos(a) * 4.4, az, 3.4, 1.6, 2.4, '#f4f6f7', { rz: -a }); }
        K.label('澎湖跨海大橋', ax, y0 + 11.6, az + 1.4, 14, 2.2, 0, '#f4f6f7', '#c62828');
        box(ax, y0 + 0.12, (az + L.z0) / 2, 9, 0.2, az - L.z0, '#77797c');
        const bz0 = W.bounds.z0 - 3;
        box(ax, 1.5, bz0 - 160, 9, 1.2, 320, '#c9c9c4');
        for (const s of [-1, 1]) box(ax + s * 4.2, 2.6, bz0 - 160, 0.4, 1, 320, '#f4f6f7');
        for (let z = bz0 - 310; z < bz0; z += 22) box(ax, 0.6, z, 4, 1.4, 3, '#b0b0aa');
        for (const s of [-1, 1]) { box(ax + s * 4.2, y0 + 1, L.cz - 12, 0.5, 2, 60, '#c9c9c4'); K.solid(ax + s * 4.6, L.cz - 12, 1, 60, 3); }
        K.solid(ax, L.z0 + 6, 10, 2, 3);
      }
      specialsC();
    },
  };

  // =====================================================================
  // 金門縣
  // =====================================================================
  const KM2 = mkD([
    { id: 'jincheng', zh: '金城', en: 'JINCHENG', desc: '閩南古厝、貢糖和高粱酒香', h: [4, 11], neon: 0.4, old: 1, slab: '#b89e8c' },
    { id: 'jinsha', zh: '金沙・金寧', en: 'JINSHA', desc: '坑道、碉堡與風獅爺', h: [3, 7], neon: 0.15, old: 0.7, sparse: 0.45 },
  ]);
  R.kinmen = {
    id: 'kinmen', zh: '金門縣', en: 'KINMEN COUNTY', desc: '戰地前線。莒光樓、風獅爺與閩南古厝', salt: 120, island: true,
    districts: KM2, districtAt: (x, z) => (x >= 240 || z < -140 ? KM2.jinsha : KM2.jincheng),
    mainX: lines(CX, ['慈湖路', '金門大道', '民族路', '伯玉路', '環島東路', '太武路']),
    mainZ: lines(CZ, ['古寧頭路', '環島北路', '民權路', '莒光路', '環島南路']),
    landmarks: [
      { id: 'train', zh: '尚義機場', rect: [-80, 0, 80, 140], slab: '#9a9c9d', col: '#aab4ba' },
      { id: 'juguang', zh: '莒光樓', rect: [-240, -140, -80, 0], slab: '#5f8a4a', park: true, trees: 30 },
      { id: 'lion', zh: '風獅爺', rect: [240, 0, 400, 140], slab: '#6fa04a', park: true, trees: 16 },
      { id: 'village', zh: '山后民俗文化村', rect: [-400, 140, -240, 280], slab: '#b9ad98', col: '#b5452e' },
      { id: 'guningtou', zh: '古寧頭', rect: [240, -280, 400, -140], slab: '#e2d3a4', col: '#e2d3a4' },
    ],
    pedZones: C_STD.pedZone('模範街'), nightMarket: C_STD.nm('模範街'), gas: C_STD.gas('金城站'),
    names: { hospital: ['金門醫院', 'KINMEN HOSPITAL'], police: ['金門縣警察局', 'KINMEN COUNTY POLICE'] },
    outer: { n: 'sea', s: 'sea', e: 'sea', w: 'sea' }, gates: [], shops: C_STD.shops('浯島'),
    build(kit) {
      use(kit);
      terminal(W.lm.train, '尚義機場', 'KINMEN AIRPORT', true);
      { // 莒光樓: a three-tier palace tower on a stone base
        const L = W.lm.juguang, cx = L.cx, cz = L.cz - 8;
        L.pond = [cx - 20, cz - 16, cx + 20, cz + 16];
        box(cx, y0 + 3, cz, 34, 6, 26, '#b8b4aa'); for (let k = 0; k < 7; k++) box(cx, y0 + 0.4 + k * 0.42, cz + 14 + (7 - k) * 0.8, 12, 0.84 + k * 0.84, 1.6, '#c9c0ae');
        for (let i = 0; i < 3; i++) { const w = 24 - i * 5, d = 16 - i * 3.4; box(cx, y0 + 8.4 + i * 6, cz, w, 4.8, d, '#f4f2ee'); for (let k = -2; k <= 2; k++) box(cx + (k * (w - 2)) / 4, y0 + 8.4 + i * 6, cz + d / 2 + 0.3, 0.6, 4.8, 0.6, '#b3261e'); K.coneRoof(cx, y0 + 10.8 + i * 6, cz, w + 7, d + 7, 2.2, '#3f8f5a'); }
        K.solid(cx, cz, 34, 26, 28);
        K.label('莒光樓', cx, y0 + 4.2, cz + 13.3, 7, 1.8, 0, '#b8b4aa', '#b3261e');
      }
      { // 風獅爺 and the giant kaoliang bottle
        const L = W.lm.lion, lx = L.cx - 26, lz = L.cz - 6;
        box(lx, y0 + 1, lz, 6, 2, 6, '#b8b4aa'); box(lx, y0 + 5.4, lz, 4, 7, 3.4, '#9a9a92'); ball(lx, y0 + 10.4, lz, 2.6, 2.4, 2.4, '#9a9a92');
        ball(lx, y0 + 9.6, lz + 2.1, 1.4, 0.8, 0.6, '#c0392b'); for (const s of [-1, 1]) { ball(lx + s * 1, y0 + 11.2, lz + 2, 0.5, 0.5, 0.4, '#ffffff'); ball(lx + s * 2.2, y0 + 12.2, lz, 0.7, 0.9, 0.5, '#9a9a92'); }
        box(lx, y0 + 6, lz - 1.9, 5, 6.4, 0.3, '#c0392b');
        K.solid(lx, lz, 6, 6, 13);
        const bx = L.cx + 28, bz = L.cz - 6;
        cyl(bx, y0, bz, 4.4, 15, '#f7f7f5', 16); taper(bx, y0 + 15, bz, 4.4, 1.5, 4, '#f7f7f5', 16); cyl(bx, y0 + 19, bz, 1.5, 4.4, '#f7f7f5', 12); cyl(bx, y0 + 23.4, bz, 1.8, 1.6, '#c0392b', 12);
        cyl(bx, y0 + 4, bz, 4.5, 7, '#c0392b', 16); K.label('金城高粱', bx, y0 + 7.4, bz + 4.6, 6, 4, 0, '#c0392b', '#ffd76a', '58°');
        K.solid(bx, bz, 9, 9, 25);
        sign('風獅爺', lx, L.z1 - 5, 7, '#5a4632', '#ffe9b0', 'WIND LION GOD');
      }
      { // 閩南古厝: rows of swallowtail-roofed courtyard houses
        const L = W.lm.village;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { if (b === 1 && a === 0) continue; K.temple(L.cx + a * 40, L.cz + b * 32 - 6, 26, 12, 4, 3, '#b5664a', '#8a3a2a', '#b5452e'); }
        sign('山后民俗文化村', L.cx, L.z1 - 5, 15, '#8a3a2a', '#ffe9b0', 'SHANHOU FOLK VILLAGE');
      }
      { // 古寧頭: the beach with its anti-landing spikes and an old tank
        const L = W.lm.guningtou;
        const r = beach(L, 'n', 56, '#4f8f9a');
        for (let x = L.x0 + 10; x < L.x1 - 6; x += 5) { box(x, y0 + 1.2, r[3] + 4 + (x % 2 ? 2 : 0), 0.3, 3.4, 0.3, '#3a2a22', { rx: -0.7 }); }
        const tx = L.cx, tz = L.cz + 26;
        box(tx, y0 + 1, tz, 7, 1.6, 3.6, '#4a5a3a'); box(tx - 0.4, y0 + 2.4, tz, 3.2, 1.2, 2.6, '#566a44'); K.lmB(tx, tz).geo(new THREE.CylinderGeometry(0.18, 0.18, 5, 8), tx + 3.4, y0 + 2.6, tz, 1, 1, 1, C('#3a4a2e'), { rz: Math.PI / 2 });
        for (const s of [-1, 1]) box(tx, y0 + 0.5, tz + s * 1.9, 7.4, 1, 0.6, '#2a2d30');
        K.solid(tx, tz, 7, 4, 3);
        sign('古寧頭戰場', L.cx, L.z1 - 5, 11, '#4a5a3a', '#ffffff', 'GUNINGTOU BATTLEFIELD');
      }
      specialsC();
    },
  };

  // =====================================================================
  // 連江縣（馬祖）
  // =====================================================================
  const LJ = mkD([
    { id: 'nangan', zh: '南竿', en: 'NANGAN', desc: '老酒、繼光餅和坑道', h: [4, 10], neon: 0.35, old: 1, sparse: 0.15, slab: '#a9a59b' },
    { id: 'beigan', zh: '北竿', en: 'BEIGAN', desc: '石頭屋疊在山坡上', h: [3, 7], neon: 0.15, old: 0.8, sparse: 0.45, slab: '#a9a59b' },
  ]);
  R.lienchiang = {
    id: 'lienchiang', zh: '連江縣', en: 'LIENCHIANG (MATSU)', desc: '馬祖。媽祖巨神像、芹壁石頭屋與藍眼淚', salt: 121, island: true,
    districts: LJ, districtAt: (x, z) => (z < -140 || x >= 240 ? LJ.beigan : LJ.nangan),
    mainX: lines(CX, ['津沙路', '仁愛路', '介壽路', '復興路', '清水路', '芹壁路']),
    mainZ: lines(CZ, ['北竿大道', '塘岐街', '中央大道', '馬祖路', '鐵板路']),
    landmarks: [
      { id: 'train', zh: '福澳港', rect: [-80, 0, 80, 140], slab: '#9a9c9d', col: '#3b6ea5' },
      { id: 'mazu', zh: '媽祖巨神像', rect: [-240, -140, -80, 0], slab: '#c9c6bd', col: '#fbfbf7' },
      { id: 'qinbi', zh: '芹壁聚落', rect: [240, -280, 400, -140], slab: '#a9a59b', col: '#b8a88a' },
      { id: 'tunnel', zh: '八八坑道', rect: [-400, 140, -240, 280], slab: '#5a8a45', park: true, trees: 20 },
      { id: 'tears', zh: '藍眼淚海灣', rect: [80, -280, 240, -140], slab: '#a9aaa6', col: '#3be3ff' },
    ],
    pedZones: C_STD.pedZone('介壽獅子市場'), nightMarket: C_STD.nm('介壽獅子市場'), gas: C_STD.gas('介壽站'),
    names: { hospital: ['連江縣立醫院', 'LIENCHIANG HOSPITAL'], police: ['連江縣警察局', 'LIENCHIANG POLICE'] },
    outer: { n: 'sea', s: 'sea', e: 'sea', w: 'sea' }, gates: [], shops: C_STD.shops('馬祖'),
    build(kit) {
      use(kit);
      terminal(W.lm.train, '福澳港', 'FUAO HARBOR', false);
      { // the giant Mazu statue above the harbour
        const L = W.lm.mazu, cx = L.cx, cz = L.cz - 12;
        box(cx, y0 + 2, cz, 34, 4, 34, '#d8d4c8'); for (let k = 0; k < 8; k++) box(cx, y0 + 0.25 + k * 0.25, cz + 18 + (8 - k) * 0.8, 14, 0.5 + k * 0.5, 1.6, '#c9c0ae');
        taper(cx, y0 + 4, cz, 6, 3, 20, '#fbfbf7', 14); ball(cx, y0 + 26, cz, 2.6, 3, 2.6, '#fbfbf7'); box(cx, y0 + 29.4, cz, 5, 0.6, 3.4, '#fbfbf7');
        for (let k = -2; k <= 2; k++) box(cx + k, y0 + 28.4, cz + 1.8, 0.14, 1.6, 0.14, '#fbfbf7');
        box(cx, y0 + 17, cz + 3.2, 4.6, 1.4, 1.6, '#fbfbf7');
        K.solid(cx, cz, 34, 34, 30);
        sign('媽祖巨神像', cx, L.z1 - 5, 12, '#8e2a1f', '#ffd76a', 'GIANT MAZU STATUE');
      }
      { // 芹壁: granite houses stepping down to the sea
        const L = W.lm.qinbi;
        water(L, L.x0 + 4, L.z0 + 4, L.x1 - 4, L.z0 + 36, '#2f7f9a');
        ball(L.cx + 20, y0 + 1, L.z0 + 20, 9, 3, 6, '#5a5a56');
        for (let row = 0; row < 3; row++) {
          const ph = (row + 1) * 2.4, pz = L.z0 + 52 + row * 22;
          box(L.cx, y0 + ph / 2, pz + 4, L.x1 - L.x0 - 16, ph, 20, '#8f8a80'); K.solid(L.cx, pz + 4, L.x1 - L.x0 - 16, 20, ph + 6);
          for (let k = -2; k <= 2; k++) { const hx = L.cx + k * 24 + (row % 2 ? 8 : 0), h = U.rr(4.4, 6.4); box(hx, y0 + ph + h / 2, pz + 4, 15, h, 11, U.pick(['#b8a88a', '#a89878', '#c4b494'])); box(hx, y0 + ph + h + 0.4, pz + 4, 16.4, 0.8, 12.4, '#4a4a46'); for (const s of [-1, 1]) box(hx + s * 4, y0 + ph + h * 0.55, pz + 9.6, 1.4, 1.4, 0.2, '#22303a'); }
        }
        sign('芹壁聚落', L.cx, L.z1 - 5, 10, '#5a5a56', '#ffffff', 'QINBI VILLAGE');
      }
      { // 八八坑道: a tunnel into the hill, lined with jars of old rice wine
        const L = W.lm.tunnel, cx = L.cx, cz = L.cz - 14;
        ball(cx, y0, cz, 46, 22, 30, '#4a6446'); K.solid(cx, cz - 4, 76, 44, 22);
        box(cx, y0 + 3.4, cz + 27, 9, 6.8, 6, '#8f8a80'); box(cx, y0 + 3, cz + 30.1, 6, 6, 0.4, '#0c0d0f');
        K.label('八八坑道', cx, y0 + 7.6, cz + 30.2, 8, 1.6, 0, '#8f8a80', '#c62828');
        for (let k = -3; k <= 3; k++) if (k) { ball(cx + k * 5, y0 + 1.3, cz + 34, 1.3, 1.5, 1.3, '#6a4a36'); cyl(cx + k * 5, y0 + 2.6, cz + 34, 0.6, 0.4, '#c0392b', 10); K.solid(cx + k * 5, cz + 34, 2.4, 2.4, 3); }
        sign('馬祖酒廠', cx, L.z1 - 5, 9, '#6a4a36', '#ffe9b0', 'TUNNEL 88');
      }
      { // 藍眼淚: the bay glows at night
        const L = W.lm.tears;
        water(L, L.x0 + 4, L.z0 + 4, L.x1 - 4, L.z1 - 40, '#1c4f6a');
        const g = new U.GeoBuilder(1);
        for (let k = 0; k < 70; k++) { const px = U.rr(L.x0 + 8, L.x1 - 8), pz = U.rr(L.z0 + 8, L.z1 - 44) ; g.geo(new THREE.SphereGeometry(1, 6, 4), px, y0 + 0.14, pz, U.rr(0.6, 2.4), 0.05, U.rr(0.4, 1.4), C('#ffffff')); }
        for (let x = L.x0 + 6; x < L.x1 - 6; x += 5) g.geo(new THREE.SphereGeometry(1, 6, 4), x, y0 + 0.14, L.z1 - 41 + Math.sin(x) * 1.4, 2.8, 0.05, 0.8, C('#ffffff'));
        W.glowMat = new THREE.MeshBasicMaterial({ color: 0x3be3ff, transparent: true, opacity: 0.2, depthWrite: false });
        W.scene.add(new THREE.Mesh(g.build(), W.glowMat));
        for (let k = 0; k < 8; k++) rock(L.x0 + 14 + k * 17, L.z1 - 34, U.rr(1.4, 2.6));
        sign('藍眼淚', L.cx, L.z1 - 8, 8, '#12384a', '#3be3ff', 'BLUE TEARS BAY');
      }
      specialsC();
    },
  };

  // ---------- register with the travel network ----------
  Regions.extend(
    ['miaoli', 'taichung', 'changhua', 'nantou', 'yunlin', 'chiayi', 'chiayicounty', 'tainan', 'kaohsiung', 'pingtung', 'taitung', 'hualien', 'penghu', 'kinmen', 'lienchiang'],
    [['hsinchu', 'miaoli', 30], ['miaoli', 'taichung', 45], ['taichung', 'changhua', 20], ['taichung', 'nantou', 38], ['changhua', 'nantou', 32], ['changhua', 'yunlin', 40], ['yunlin', 'chiayi', 30], ['chiayi', 'chiayicounty', 16],
      ['chiayi', 'tainan', 62], ['tainan', 'kaohsiung', 46], ['kaohsiung', 'pingtung', 24], ['pingtung', 'taitung', 110], ['taitung', 'hualien', 160], ['hualien', 'yilan', 100],
      ['penghu', 'kaohsiung', 130], ['penghu', 'chiayicounty', 80], ['penghu', 'taipei', 260], ['kinmen', 'taichung', 240], ['kinmen', 'taipei', 330], ['kinmen', 'kaohsiung', 300], ['lienchiang', 'keelung', 200], ['lienchiang', 'taipei', 210]],
    [['中部', ['miaoli', 'taichung', 'changhua', 'nantou', 'yunlin']], ['南部', ['chiayi', 'chiayicounty', 'tainan', 'kaohsiung', 'pingtung']], ['東部', ['hualien', 'taitung']], ['離島', ['penghu', 'kinmen', 'lienchiang']]]
  );
})();
