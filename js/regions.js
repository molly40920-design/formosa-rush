// 寶島狂飆 — northern Taiwan: the other regions, their landmarks, and travel between them
(function () {
  const W = World, R = W.REGIONS;
  const C = (h) => U.col(h);
  let K = null; // landmark kit, set while a region is being built
  const mkD = (list) => { const o = {}; for (const d of list) o[d.id] = d; return o; };

  // ---------- small building blocks ----------
  const cyl = (x, y, z, r, h, c, seg = 12, o) => K.lmB(x, z).geo(new THREE.CylinderGeometry(1, 1, 1, seg), x, y + h / 2, z, r, h, r, C(c), o || {});
  const taper = (x, y, z, r0, r1, h, c, seg = 12) => K.lmB(x, z).geo(new THREE.CylinderGeometry(r1, r0, 1, seg), x, y + h / 2, z, 1, h, 1, C(c));
  const ball = (x, y, z, sx, sy, sz, c) => K.lmB(x, z).geo(new THREE.SphereGeometry(1, 12, 8), x, y, z, sx, sy, sz, C(c));
  const tree = (x, z, s = 1) => W.extraTrees.push([x, W.SLAB, z, s]);
  // open water inside a landmark: a flat sheet nobody can walk or drive into
  function water(L, x0, z0, x1, z1, c = '#2f6480') {
    K.box((x0 + x1) / 2, K.y0 + 0.08, (z0 + z1) / 2, x1 - x0, 0.06, z1 - z0, c);
    W.addAABB(x0, z0, x1, z1, 2, 'water');
    L.water = [x0, z0, x1, z1];
  }
  // a train set parked along x
  function trainSet(x, z, len, body, stripe) {
    const y0 = K.y0;
    K.box(x, y0 + 0.55, z, len, 0.5, 2.2, '#3a3d40');
    K.box(x, y0 + 2.4, z, len, 3.2, 2.9, body);
    K.box(x, y0 + 2.9, z, len + 0.04, 0.9, 2.94, '#22303a');
    K.box(x, y0 + 1.6, z, len + 0.04, 0.45, 2.94, stripe);
    for (let k = 1; k < Math.round(len / 20); k++) K.box(x - len / 2 + k * (len / Math.round(len / 20)), y0 + 2.4, z, 0.25, 3.3, 3, '#2a2d30');
    K.solid(x, z, len, 3, 4.2);
  }
  // a conventional railway station: hall facing south, platform and a local train behind
  function station(L, zh, en, o = {}) {
    const y0 = K.y0, cx = L.cx, cz = L.cz - 12;
    const w = Math.min(96, L.x1 - L.x0 - 34), d = 32, h = o.h || 13;
    K.box(cx, y0 + h / 2, cz, w, h, d, o.wall || '#d9d2c2');
    K.box(cx, y0 + 3.1, cz + d / 2 + 0.2, w * 0.62, 6.2, 0.5, '#2f3a44');
    for (let k = -3; k <= 3; k++) K.box(cx + (k * w * 0.62) / 6, y0 + 3.1, cz + d / 2 + 0.5, 0.5, 6.2, 0.5, o.trim || '#efe9dc');
    K.box(cx, y0 + h + 0.5, cz, w + 4, 1, d + 4, o.roof || '#6b5a48');
    K.box(cx, y0 + 6.8, cz + d / 2 + 3.2, w * 0.66, 0.4, 6.4, o.roof || '#6b5a48');
    for (const sx of [-1, 1]) K.box(cx + sx * w * 0.31, y0 + 3.4, cz + d / 2 + 6, 0.4, 6.8, 0.4, '#777b80');
    K.solid(cx, cz, w, d, h + 2);
    K.label(zh, cx, y0 + h - 2.8, cz + d / 2 + 0.6, Math.min(34, zh.length * 6.5), 4.6, 0, '#1a1a1a', '#f3e2b8', en);
    const pz = L.z0 + 11;
    K.box(cx, y0 + 0.5, pz + 6, w + 18, 1, 4, '#b8b4aa');
    K.box(cx, y0 + 5, pz + 6, w + 18, 0.3, 6, '#4f5b63');
    for (let k = -3; k <= 3; k++) K.box(cx + (k * (w + 14)) / 6, y0 + 2.9, pz + 6, 0.3, 4, 0.3, '#777b80');
    trainSet(cx, pz, w + 6, (o.train || ['#e9e9e4', '#1f4f9c'])[0], (o.train || ['#e9e9e4', '#1f4f9c'])[1]);
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) tree(cx + sx * (w / 2 + 8), cz + d / 2 + 10 + k * 9, 1);
    W.lmPOI.train = { x: cx, z: cz + d / 2 + 8, name: zh };
    return { cx, cz, w, d, h };
  }
  // high-speed rail station: glass hall under a white wing roof, viaduct and a bullet train along the west side
  function hsrStation(L, zh, en, isHub) {
    const y0 = K.y0, cx = L.cx + 10, cz = L.cz - 6;
    K.box(cx, y0 + 6, cz, 78, 12, 40, '#a9bcc8');
    for (let k = -4; k <= 4; k++) K.box(cx + k * 9, y0 + 6, cz + 20.2, 0.5, 12, 0.5, '#f2f4f5');
    K.box(cx, y0 + 13, cz, 92, 1.2, 52, '#f4f6f7');
    K.box(cx, y0 + 14.4, cz, 70, 1.6, 34, '#e3e8ea');
    K.solid(cx, cz, 78, 40, 15);
    K.label(zh, cx, y0 + 9.4, cz + 20.5, Math.min(36, zh.length * 6.5), 4.6, 0, '#f4f6f7', '#e8641b', en);
    const vx = L.x0 + 14, len = L.z1 - L.z0 - 6;
    K.box(vx, y0 + 8.4, L.cz, 9, 1.2, len, '#c9c9c4');
    for (let z = L.z0 + 10; z < L.z1 - 6; z += 22) { K.box(vx, y0 + 4, z, 2.4, 8, 2.4, '#b9b9b4'); K.solid(vx, z, 2.4, 2.4, 8); }
    K.box(vx, y0 + 11, L.cz, 3.3, 3.4, len * 0.78, '#f7f7f5');
    K.box(vx, y0 + 10.3, L.cz, 3.34, 0.5, len * 0.78, '#e8641b');
    K.box(vx, y0 + 11.6, L.cz, 3.34, 0.8, len * 0.74, '#22303a');
    for (let k = 0; k < 4; k++) { tree(cx - 30 + k * 20, L.z1 - 9, 1); }
    if (isHub) W.lmPOI.train = { x: cx, z: cz + 28, name: zh };
  }
  function paddy(L, houses = 2) {
    const y0 = K.y0;
    for (let z = L.z0 + 16; z < L.z1 - 10; z += 13) K.box(L.cx, y0 + 0.2, z, L.x1 - L.x0 - 14, 0.1, 0.7, '#7a6744');
    for (let x = L.x0 + 30; x < L.x1 - 20; x += 44) K.box(x, y0 + 0.2, L.cz, 0.7, 0.1, L.z1 - L.z0 - 14, '#7a6744');
    for (let k = 0; k < houses; k++) {
      const hx = U.rr(L.x0 + 40, L.x1 - 40), hz = U.rr(L.z0 + 40, L.z1 - 40);
      K.box(hx, y0 + 0.14, hz, 30, 0.1, 22, '#b9ad98');
      K.temple(hx, hz - 3, 16, 7, 3.4, 2.4, '#b5664a', '#8a4a36', '#8a3a2a');
      for (const sx of [-1, 1]) K.temple(hx + sx * 11, hz + 4, 5, 12, 3, 2, '#b5664a', '#8a4a36', '#8a3a2a');
      tree(hx - 17, hz - 8, 1.3); tree(hx + 17, hz - 8, 1.2);
    }
    for (let k = 0; k < 10; k++) { const ex = U.rr(L.x0 + 14, L.x1 - 14), ez = U.rr(L.z0 + 14, L.z1 - 14); ball(ex, y0 + 0.75, ez, 0.16, 0.3, 0.3, '#ffffff'); K.box(ex, y0 + 0.35, ez, 0.04, 0.5, 0.04, '#333333'); }
  }
  function pavilion(x, z, col = '#b13a2a', roof = '#3f5a4a') {
    const y0 = K.y0;
    for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) K.box(x + a, y0 + 1.6, z + b, 0.4, 3.2, 0.4, col);
    K.coneRoof(x, y0 + 3.2, z, 9, 9, 3, roof);
  }
  // an airliner parked nose-north (fuselage along z)
  function airliner(x, z, tail) {
    const y = K.y0 + 3.6;
    K.lmB(x, z).geo(new THREE.CylinderGeometry(2.1, 2.1, 1, 14), x, y, z, 1, 36, 1, C('#f4f5f6'), { rx: Math.PI / 2 });
    K.lmB(x, z).geo(new THREE.ConeGeometry(2.1, 6, 14), x, y, z - 21, 1, 1, 1, C('#f4f5f6'), { rx: -Math.PI / 2 });
    K.lmB(x, z).geo(new THREE.ConeGeometry(2.1, 9, 14), x, y + 0.5, z + 22.5, 1, 1, 1, C('#f4f5f6'), { rx: Math.PI / 2 });
    K.box(x, y - 0.6, z + 1, 36, 0.5, 6, '#e3e6e8');
    K.box(x, y + 0.3, z + 23, 13, 0.4, 3.4, '#e3e6e8');
    K.box(x, y + 4.4, z + 22, 0.5, 7, 5, tail);
    K.box(x, y - 0.2, z, 4.3, 0.5, 36.2, tail);
    for (const sx of [-1, 1]) { K.lmB(x, z).geo(new THREE.CylinderGeometry(1, 1, 1, 10), x + sx * 9, y - 1.7, z - 1, 1, 4, 1, C('#8e979d'), { rx: Math.PI / 2 }); K.box(x + sx * 9, K.y0 + 1, z + 1, 0.4, 2, 0.4, '#555555'); }
    K.box(x, K.y0 + 1, z - 12, 0.4, 2, 0.4, '#555555');
    K.solid(x, z, 5, 46, 7);
  }

  // =====================================================================
  // 新北市
  // =====================================================================
  const NT = mkD([
    { id: 'xinban', zh: '新板特區', en: 'XINBAN', desc: '板橋車站前的高樓與耶誕城', h: [36, 110], neon: 0.15, old: 0.4, tower: true, slab: '#c4c2bc' },
    { id: 'banqiao', zh: '板橋', en: 'BANQIAO', desc: '府中老街與林家花園', h: [10, 40], neon: 0.55, old: 0.8 },
    { id: 'yonghe', zh: '永和', en: 'YONGHE', desc: '巷子比迷宮還複雜，豆漿很有名', h: [10, 30], neon: 0.6, old: 0.95 },
    { id: 'zhonghe', zh: '中和', en: 'ZHONGHE', desc: '工業區與老公寓', h: [8, 26], neon: 0.45, old: 1 },
    { id: 'xindian', zh: '新店', en: 'XINDIAN', desc: '碧潭吊橋與河岸', h: [10, 36], neon: 0.3, old: 0.7 },
  ]);
  R.newtaipei = {
    id: 'newtaipei', zh: '新北市', en: 'NEW TAIPEI CITY', desc: '人口最多的城市，從板橋到碧潭', salt: 101,
    districts: NT,
    districtAt: (x, z) => (x >= 420 ? NT.xindian : z >= 240 ? NT.zhonghe : x >= 100 ? NT.yonghe : x >= -380 && z < -40 ? NT.xinban : NT.banqiao),
    mainX: [[-700, 14, '環河西路'], [-540, 20, '四川路'], [-380, 26, '文化路', true], [-220, 22, '新站路'], [-60, 18, '館前東路'], [100, 24, '民生路'], [260, 20, '中正路'], [420, 26, '環河快速道路'], [580, 18, '中興路'], [700, 14, '北新路']],
    mainZ: [[-460, 14, '大漢溪堤外道'], [-320, 20, '民族路'], [-180, 28, '縣民大道', true], [-40, 22, '中山路'], [100, 24, '南雅南路'], [240, 20, '中和路'], [380, 18, '景平路'], [460, 14, '安康路']],
    landmarks: [
      { id: 'train', zh: '板橋車站', rect: [-380, -320, -220, -180], slab: '#bdb6a8', col: '#b89a6a' },
      { id: 'cityhall', zh: '新北市政府', rect: [-220, -320, -60, -180], slab: '#c9c6bd', col: '#8fa5b5' },
      { id: 'linyuan', zh: '林家花園', rect: [-540, -40, -380, 100], slab: '#5f8a4a', park: true, trees: 70 },
      { id: 'bitan', zh: '碧潭', rect: [420, 240, 580, 380], slab: '#5a8a45', park: true, trees: 40 },
    ],
    pedZones: [[100, 140, 260, 200, '樂華夜市']],
    nightMarket: { name: '樂華夜市', xa: 100, xb: 260, z: 170 },
    mrt: [['板橋', 'Banqiao', -380, -180, -1, 1], ['府中', 'Fuzhong', -380, -40, 1, -1], ['新埔', 'Xinpu', 100, -320, 1, 1], ['頂溪', 'Dingxi', 260, 100, 1, 1], ['新店', 'Xindian', 580, 240, -1, -1]],
    gas: [['文化民族站', -540, -320, 1, 1], ['中正景平站', 260, 380, 1, -1]],
    names: { hospital: ['新北市立醫院', 'NEW TAIPEI HOSPITAL'], police: ['新北市警察局', 'NEW TAIPEI POLICE'] },
    outer: { s: 'hills' },
    gates: [{ side: 'e', at: -180, to: 'taipei', road: '華江橋' }, { side: 'w', at: -40, to: 'taoyuan', road: '國道1號' }],
    shops: { clothes: [-300, -100, null, 'BANQIAO STREET WEAR'], barber: [150, 300, null, '阿鳳理髮廳'], noodle: [-450, -250, null, '老張牛肉麵'], dealer: [320, -100, null, '寶島汽車 板橋展示中心'], netcafe: [-140, -110, null, '極速網咖 24H'], ktv: [180, 60, null, '好聲音 KTV'] },
    build(kit) {
      K = kit; const y0 = K.y0;
      station(W.lm.train, '板橋車站', 'BANQIAO STATION', { h: 24, wall: '#b9c4cc', roof: '#5d6b75', trim: '#dfe5e8' });
      { // 新北市政府: a 33-floor tower on a podium
        const L = W.lm.cityhall, cx = L.cx, cz = L.cz - 14;
        K.box(cx, y0 + 6, cz, 84, 12, 56, '#cfd3d4');
        K.box(cx, y0 + 76, cz, 40, 128, 40, '#8fa5b5');
        for (let yy = 16; yy < 138; yy += 8) K.box(cx, y0 + yy, cz, 40.4, 0.6, 40.4, '#6f8798');
        K.box(cx, y0 + 143, cz, 30, 6, 30, '#a9bcc8'); K.box(cx, y0 + 152, cz, 1, 12, 1, '#dddddd');
        K.solid(cx, cz, 84, 56, 150);
        K.label('新北市政府', cx, y0 + 8.6, cz + 28.3, 30, 4.4, 0, '#1b2a36', '#ffffff', 'NEW TAIPEI CITY HALL');
        for (let k = -3; k <= 3; k++) tree(cx + k * 13, L.z1 - 10, 1.1);
      }
      { // 林家花園: pond, pavilions, a garden hall and a zigzag bridge
        const L = W.lm.linyuan;
        L.pond = [L.cx - 34, L.cz - 20, L.cx + 6, L.cz + 14];
        K.box(L.cx - 14, y0 + 0.24, L.cz - 3, 40, 0.04, 34, '#3d6f8a');
        for (let k = 0; k < 4; k++) K.box(L.cx - 28 + k * 9, y0 + 0.4, L.cz - 3 + (k % 2 ? 3 : -3), 9.4, 0.3, 2, '#c9b28a');
        pavilion(L.cx - 14, L.cz - 26); pavilion(L.cx + 34, L.cz + 30, '#7a4a3a', '#48604f');
        K.temple(L.cx + 34, L.cz - 22, 26, 10, 5, 4, '#e8dcc8', '#7a4a3a', '#5b5c5e');
        for (const sx of [-1, 1]) K.box(L.cx + sx * 5, y0 + 2.4, L.z1 - 6, 0.6, 4.8, 0.6, '#8a2a1f');
        K.label('林本源園邸', L.cx, y0 + 5.2, L.z1 - 6, 10.6, 1.6, 0, '#8a2a1f', '#ffe9b0');
      }
      { // 碧潭: the lake, the suspension bridge and swan boats
        const L = W.lm.bitan, wz0 = L.cz - 26, wz1 = L.cz + 26;
        water(L, L.x0 + 14, wz0, L.x1 - 14, wz1, '#2f7a78');
        L.pond = [L.x0 + 14, wz0, L.x1 - 14, wz1];
        const bx = L.cx - 10;
        K.box(bx, y0 + 5.2, L.cz, 3.4, 0.35, wz1 - wz0 + 16, '#d8d4c8');
        for (const z of [wz0 - 5, wz1 + 5]) { for (const sx of [-1, 1]) K.box(bx + sx * 2.1, y0 + 6, z, 0.7, 12, 0.7, '#e9e6e0'); K.box(bx, y0 + 12, z, 5, 0.7, 0.7, '#e9e6e0'); K.solid(bx, z, 5, 1, 12); }
        for (const sx of [-1, 1]) for (let k = -5; k <= 5; k++) K.box(bx + sx * 1.7, y0 + 5.9 + Math.abs(k) * 0.5, L.cz + k * 5.2, 0.08, 1.2 + Math.abs(k), 0.08, '#9a9a9a');
        for (const [sx, sz, c] of [[30, -8, '#ffffff'], [44, 6, '#ffd54f'], [-44, 10, '#ffffff'], [-58, -6, '#f48fb1'], [58, -12, '#81d4fa']]) {
          ball(L.cx + sx, y0 + 0.7, L.cz + sz, 1.5, 0.7, 1, c); ball(L.cx + sx + 1.2, y0 + 1.8, L.cz + sz, 0.4, 0.45, 0.4, c); cyl(L.cx + sx + 1.1, y0 + 0.9, L.cz + sz, 0.16, 0.9, c);
        }
        K.label('碧潭', L.cx + 40, y0 + 3.4, wz1 + 9, 9, 2.6, 0, '#1b5e57', '#ffffff', 'BITAN SCENIC AREA');
        for (const sx of [-1, 1]) K.box(L.cx + 40 + sx * 4, y0 + 1.3, wz1 + 9, 0.3, 2.6, 0.3, '#555555');
      }
      K.special(-60, -40, 'hospital'); K.special(100, -180, 'police');
    },
  };

  // =====================================================================
  // 基隆市
  // =====================================================================
  const KL = mkD([
    { id: 'renai', zh: '仁愛區', en: "REN'AI", desc: '廟口夜市，騎樓下永遠濕濕的', h: [10, 34], neon: 0.75, old: 1, slab: '#a39f97' },
    { id: 'zhongzheng', zh: '中正區', en: 'ZHONGZHENG', desc: '中正公園的觀音看著整座港', h: [8, 26], neon: 0.4, old: 0.9 },
    { id: 'anle', zh: '安樂區', en: 'ANLE', desc: '山坡上的老社區', h: [8, 28], neon: 0.4, old: 0.9 },
    { id: 'nuannuan', zh: '暖暖', en: 'NUANNUAN', desc: '山邊的小鎮', h: [6, 16], neon: 0.25, old: 0.8, sparse: 0.25 },
  ]);
  R.keelung = {
    id: 'keelung', zh: '基隆市', en: 'KEELUNG CITY', desc: '雨港。郵輪、貨櫃和廟口夜市', salt: 102, rainy: true,
    districts: KL,
    districtAt: (x, z) => (z >= 280 ? KL.nuannuan : x >= 280 ? KL.zhongzheng : x < -200 ? KL.anle : KL.renai),
    mainX: [[-520, 14, '復興路'], [-360, 20, '中山一路'], [-200, 24, '忠一路'], [-40, 22, '愛三路'], [120, 24, '仁一路'], [280, 20, '信一路'], [440, 22, '義一路'], [560, 14, '壽山路']],
    mainZ: [[-420, 14, '濱海堤道'], [-280, 20, '港西街'], [-140, 26, '忠二路'], [0, 22, '孝二路'], [140, 24, '仁二路'], [280, 20, '南榮路'], [400, 14, '八堵路']],
    landmarks: [
      { id: 'harbor', zh: '基隆港', rect: [-200, -420, 280, -140], slab: '#9a9c9d', col: '#6f7a80' },
      { id: 'train', zh: '基隆車站', rect: [-360, -140, -200, 0], slab: '#bdb6a8', col: '#b89a6a' },
      { id: 'zpark', zh: '中正公園', rect: [440, -140, 560, 140], slab: '#5a8a45', park: true, trees: 80 },
    ],
    pedZones: [[-40, 40, 120, 100, '基隆廟口夜市']],
    nightMarket: { name: '基隆廟口夜市', xa: -40, xb: 120, z: 70 },
    gas: [['孝二站', 280, 0, 1, 1], ['安樂站', -360, 140, -1, 1]],
    names: { hospital: ['基隆市立醫院', 'KEELUNG HOSPITAL'], police: ['基隆市警察局', 'KEELUNG CITY POLICE'] },
    outer: { n: 'sea', e: 'hills', w: 'hills', s: 'hills' },
    gates: [{ side: 's', at: -40, to: 'taipei', road: '國道1號' }, { side: 'e', at: 140, to: 'yilan', road: '台2線濱海公路' }],
    shops: { clothes: [40, -60, null, '港都服飾'], barber: [-300, 60, null, '海風理髮廳'], noodle: [60, 190, null, '阿海牛肉麵'], dealer: [340, 60, null, '寶島汽車 基隆展示中心'], netcafe: [-110, 60, null, '極速網咖 24H'], ktv: [200, -60, null, '好聲音 KTV'] },
    build(kit) {
      K = kit; const y0 = K.y0;
      { // the harbour: quays on three sides, a cruise ship, gantry cranes and container stacks
        const L = W.lm.harbor;
        const wx0 = L.x0 + 34, wx1 = L.x1 - 34, wz0 = L.z0 + 4, wz1 = L.z1 - 38;
        water(L, wx0, wz0, wx1, wz1);
        const sx = L.cx + 10, sz = wz1 - 16;
        K.box(sx, y0 + 4.5, sz, 150, 9, 20, '#f5f5f2');
        K.box(sx, y0 + 2.2, sz, 150.2, 1.2, 20.2, '#1f4f9c');
        K.lmB(sx, sz).geo(new THREE.CylinderGeometry(10, 10, 9, 3), sx + 80, y0 + 4.5, sz, 1, 1, 1, C('#f5f5f2'), { ry: -Math.PI / 2 });
        K.box(sx - 6, y0 + 11, sz, 120, 4, 16.5, '#fbfbf9'); K.box(sx - 10, y0 + 14.8, sz, 96, 3.6, 14, '#fbfbf9');
        for (const yy of [10.4, 14.2]) K.box(sx - 8, y0 + yy, sz, 108, 1.1, 16.7, '#22303a');
        cyl(sx - 30, y0 + 16.6, sz, 4, 7, '#1f4f9c'); cyl(sx - 30, y0 + 23.6, sz, 4.1, 1, '#f2c230');
        K.label('寶島公主號', sx + 40, y0 + 6.2, sz + 10.2, 22, 2.6, 0, '#f5f5f2', '#1f4f9c');
        for (let k = 0; k < 3; k++) { // gantry cranes on the west quay
          const gx = L.x0 + 18, gz = L.z0 + 60 + k * 62;
          for (const [a, b] of [[-5, -6], [5, -6], [-5, 6], [5, 6]]) { K.box(gx + a, y0 + 14, gz + b, 1, 28, 1, '#d9432f'); K.solid(gx + a, gz + b, 1.2, 1.2, 28); }
          K.box(gx, y0 + 28.5, gz, 12, 1.4, 14, '#d9432f');
          K.box(gx + 22, y0 + 30, gz, 60, 1.6, 2.2, '#d9432f');
          K.box(gx + 6, y0 + 36, gz, 1, 12, 1, '#d9432f'); K.box(gx + 24, y0 + 33.5, gz, 36, 0.3, 0.3, '#888888', { rz: -0.3 });
          K.box(gx + 30, y0 + 26, gz, 3, 2.6, 6, '#3a3d40');
        }
        const cols = ['#c0392b', '#2f6fb3', '#2e8b57', '#e67e22', '#8e44ad', '#f1c40f', '#607d8b'];
        for (let k = 0; k < 10; k++) { // container stacks on the east quay
          const gx = L.x1 - 17, gz = L.z0 + 40 + k * 20, n = U.ri(1, 4);
          for (let i = 0; i < n; i++) for (const a of [-3.2, 3.2]) K.box(gx + a, y0 + 1.3 + i * 2.6, gz, 6, 2.6, 12.2, U.pick(cols));
          K.solid(gx, gz, 12.6, 12.2, n * 2.6);
        }
        K.label('基隆港', L.cx - 90, y0 + 4, L.z1 - 8, 16, 3.6, 0, '#1f4f9c', '#ffffff', 'PORT OF KEELUNG');
        for (const a of [-7, 7]) K.box(L.cx - 90 + a, y0 + 1.6, L.z1 - 8, 0.4, 3.2, 0.4, '#555555');
        for (let x = wx0 + 10; x < wx1; x += 14) { cyl(x, y0, wz1 + 2.5, 0.35, 0.9, '#2a2d30'); }
        W.lmPOI.harbor = { x: L.cx - 90, z: L.z1 - 4 };
      }
      station(W.lm.train, '基隆車站', 'KEELUNG STATION', { wall: '#cfd6da', roof: '#3b6ea5', train: ['#f2f2ee', '#e8641b'] });
      { // 中正公園: the white Guanyin statue and the festival hall
        const L = W.lm.zpark, gx = L.cx, gz = L.cz - 46;
        cyl(gx, y0, gz, 8, 4, '#d8d4c8', 16);
        taper(gx, y0 + 4, gz, 4.6, 2.3, 17, '#fbfbf7', 14);
        ball(gx, y0 + 22.6, gz, 2.2, 2.6, 2.2, '#fbfbf7'); taper(gx, y0 + 24.6, gz, 1.5, 0.3, 2.4, '#fbfbf7', 10);
        K.box(gx, y0 + 15, gz + 2.6, 3.4, 1, 1.6, '#fbfbf7');
        K.solid(gx, gz, 14, 14, 26);
        for (const sx of [-1, 1]) { ball(gx + sx * 9, y0 + 1.4, gz + 9, 1.3, 1.4, 2, '#d9a62e'); K.solid(gx + sx * 9, gz + 9, 2.4, 3.6, 3); }
        K.temple(L.cx, L.cz + 50, 34, 14, 7, 5);
        W.lanterns.push([L.cx - 10, y0 + 6.8, L.cz + 59], [L.cx, y0 + 6.8, L.cz + 59], [L.cx + 10, y0 + 6.8, L.cz + 59]);
        K.label('中正公園', L.x0 + 6, y0 + 3, L.cz, 12, 2.4, -Math.PI / 2, '#3f5a4a', '#ffffff');
      }
      // the big sign on the hillside east of town
      K.label('KEELUNG', W.bounds.x1 + 52, 34, 20, 84, 12, -Math.PI / 2, '#3a5238', '#ffffff');
      for (const dz of [-36, 36]) K.box(W.bounds.x1 + 53, 14, 20 + dz, 1.2, 28, 1.2, '#6d7275');
      K.special(120, 140, 'hospital'); K.special(-40, -140, 'police');
    },
  };

  // =====================================================================
  // 桃園市
  // =====================================================================
  const TY = mkD([
    { id: 'dayuan', zh: '大園', en: 'DAYUAN', desc: '飛機從頭頂飛過，倉庫一間接一間', h: [6, 16], neon: 0.1, old: 0.45, sparse: 0.3, lotW: 34 },
    { id: 'luzhu', zh: '蘆竹', en: 'LUZHU', desc: '南崁，機場旁的新社區', h: [10, 30], neon: 0.3, old: 0.6 },
    { id: 'qingpu', zh: '青埔', en: 'QINGPU', desc: '高鐵特區，大樓比人多', h: [22, 70], neon: 0.12, old: 0.4, lotW: 34, slab: '#c4c2bc' },
    { id: 'taoyuan', zh: '桃園區', en: 'TAOYUAN', desc: '車站前的商圈', h: [10, 44], neon: 0.6, old: 0.8 },
    { id: 'zhongli', zh: '中壢', en: 'ZHONGLI', desc: '夜市、學生和客家小吃', h: [8, 28], neon: 0.7, old: 1 },
  ]);
  R.taoyuan = {
    id: 'taoyuan', zh: '桃園市', en: 'TAOYUAN CITY', desc: '國門。機場、高鐵和中壢夜市', salt: 103,
    districts: TY,
    districtAt: (x, z) => (z >= 240 ? TY.zhongli : x < -240 ? TY.dayuan : x < 80 ? (z < -40 ? TY.luzhu : TY.qingpu) : TY.taoyuan),
    mainX: [[-720, 14, '航站西路'], [-560, 20, '航翔路'], [-400, 22, '領航北路'], [-240, 26, '高鐵北路', true], [-80, 22, '青埔路'], [80, 26, '春日路'], [240, 22, '復興路'], [400, 24, '三民路'], [560, 20, '成功路'], [700, 14, '桃鶯路']],
    mainZ: [[-460, 14, '航勤北路'], [-320, 20, '大竹路'], [-180, 26, '南崁路'], [-40, 24, '經國路', true], [100, 24, '中山路'], [240, 20, '延平路'], [380, 18, '環中東路'], [460, 14, '龍岡路']],
    landmarks: [
      { id: 'airport', zh: '桃園國際機場', rect: [-720, -460, -240, -180], slab: '#8f9396', col: '#aab4ba' },
      { id: 'hsr', zh: '高鐵桃園站', rect: [-240, 100, -80, 240], slab: '#c9c6bd', col: '#e8641b' },
      { id: 'train', zh: '桃園車站', rect: [240, -40, 400, 100], slab: '#bdb6a8', col: '#b89a6a' },
    ],
    pedZones: [[80, 280, 240, 340, '中壢觀光夜市']],
    nightMarket: { name: '中壢觀光夜市', xa: 80, xb: 240, z: 310 },
    mrt: [['機場第一航廈', 'Airport Terminal 1', -240, -180, 1, 1], ['高鐵桃園站', 'THSR Taoyuan', -240, 100, -1, -1], ['桃園', 'Taoyuan', 240, -40, -1, -1], ['中壢', 'Zhongli', 80, 240, -1, -1]],
    gas: [['春日站', 80, -180, 1, -1], ['成功站', 560, 100, -1, 1]],
    names: { hospital: ['桃園市立醫院', 'TAOYUAN HOSPITAL'], police: ['桃園市警察局', 'TAOYUAN CITY POLICE'] },
    outer: { w: 'sea', n: 'fields', s: 'fields' },
    gates: [{ side: 'e', at: -40, to: 'newtaipei', road: '國道1號' }, { side: 's', at: -240, to: 'zhubei', road: '國道1號' }],
    shops: { clothes: [150, 50, null, '站前服飾'], barber: [300, 300, null, '中壢理髮廳'], noodle: [480, -100, null, '老李牛肉麵'], dealer: [-160, 0, null, '寶島汽車 青埔展示中心'], netcafe: [160, -100, null, '極速網咖 24H'], ktv: [300, 170, null, '好聲音 KTV'] },
    build(kit) {
      K = kit; const y0 = K.y0;
      { // the airport: terminal on the south side, apron with airliners, runway and control tower
        const L = W.lm.airport;
        const tx = L.cx + 30, tz = L.z1 - 40;
        K.box(tx, y0 + 8, tz, 230, 16, 44, '#dfe5ea');
        K.box(tx, y0 + 6, tz + 22.2, 220, 9, 0.5, '#2f3a44');
        for (let k = -11; k <= 11; k++) K.box(tx + k * 10, y0 + 8, tz + 22.6, 0.8, 16, 0.8, '#f4f6f7');
        K.box(tx, y0 + 17, tz, 240, 1.4, 54, '#8fa3b0'); K.box(tx, y0 + 19, tz - 4, 200, 2.6, 30, '#a9bcc8');
        K.solid(tx, tz, 230, 44, 20);
        K.label('桃園國際機場', tx, y0 + 12.6, tz + 23.2, 46, 5.4, 0, '#1b2a36', '#ffffff', 'TAOYUAN INTERNATIONAL AIRPORT');
        for (const [dx, tail] of [[-70, '#1f8a4c'], [0, '#c0392b'], [70, '#1f4f9c']]) {
          K.box(tx + dx, y0 + 5, tz - 30, 4, 4, 18, '#c9d2d8'); // jet bridge
          airliner(tx + dx, tz - 66, tail);
        }
        const rz = L.z0 + 46, rl = L.x1 - L.x0 - 50;
        K.box(L.cx, y0 + 0.03, rz, rl, 0.06, 40, '#2e3033');
        for (let x = L.x0 + 60; x < L.x1 - 60; x += 26) K.box(x, y0 + 0.08, rz, 12, 0.02, 0.8, '#f2f2f2');
        for (const ex of [L.x0 + 36, L.x1 - 36]) for (let k = -4; k <= 4; k++) K.box(ex, y0 + 0.08, rz + k * 3.6, 12, 0.02, 1.6, '#f2f2f2');
        for (const sz of [-18.5, 18.5]) K.box(L.cx, y0 + 0.08, rz + sz, rl - 10, 0.02, 0.5, '#f2f2f2');
        K.box(L.cx, y0 + 0.07, rz + 44, rl - 60, 0.02, 0.4, '#f2c230');
        const cx2 = L.x0 + 46, cz2 = L.z1 - 46;
        cyl(cx2, y0, cz2, 3.2, 40, '#e3e6e8', 14); cyl(cx2, y0 + 40, cz2, 6, 5, '#22303a', 14); cyl(cx2, y0 + 45, cz2, 6.6, 1, '#e3e6e8', 14); K.box(cx2, y0 + 49, cz2, 0.3, 6, 0.3, '#c0392b');
        K.solid(cx2, cz2, 7, 7, 50);
        K.box(L.x0 + 93, y0 + 9, L.z1 - 60, 60, 18, 50, '#c9d2d8'); K.box(L.x0 + 93, y0 + 8, L.z1 - 34.8, 46, 14, 0.4, '#5d6b75'); K.solid(L.x0 + 93, L.z1 - 60, 60, 50, 18); // hangar
        W.lmPOI.airport = { x: tx, z: L.z1 - 4 };
      }
      hsrStation(W.lm.hsr, '高鐵桃園站', 'THSR TAOYUAN', false);
      station(W.lm.train, '桃園車站', 'TAOYUAN STATION', { wall: '#d6d0c4', roof: '#7a5a3a' });
      K.special(400, 100, 'hospital'); K.special(80, -40, 'police');
    },
  };

  // =====================================================================
  // 新竹市
  // =====================================================================
  const HC = mkD([
    { id: 'oldtown', zh: '新竹舊城', en: 'OLD TOWN', desc: '城隍廟口的米粉和貢丸', h: [8, 26], neon: 0.65, old: 1, slab: '#b0a595' },
    { id: 'east', zh: '東區', en: 'EAST DISTRICT', desc: '清大、交大與光復路', h: [12, 40], neon: 0.45, old: 0.7 },
    { id: 'science', zh: '科學園區', en: 'SCIENCE PARK', desc: '燈永遠亮著的晶圓廠', h: [16, 46], neon: 0.04, old: 0.4, lotW: 40, slab: '#c4c2bc' },
  ]);
  R.hsinchu = {
    id: 'hsinchu', zh: '新竹市', en: 'HSINCHU CITY', desc: '風城。城隍廟、東門城與科學園區', salt: 104,
    districts: HC,
    districtAt: (x) => (x >= 280 ? HC.science : x >= 0 ? HC.east : HC.oldtown),
    mainX: [[-560, 14, '延平路'], [-420, 20, '經國路'], [-280, 24, '中華路'], [-140, 22, '中正路'], [0, 22, '東門街'], [140, 26, '光復路', true], [280, 22, '食品路'], [420, 24, '園區一路'], [560, 14, '園區三路']],
    mainZ: [[-400, 14, '東大路'], [-260, 20, '北大路'], [-120, 24, '中山路'], [20, 24, '林森路'], [160, 22, '西大路'], [300, 20, '新安路'], [400, 14, '力行路']],
    landmarks: [
      { id: 'eastgate', zh: '東門城', rect: [-140, -120, 0, 20], slab: '#b9b3a6', col: '#8d8a80' },
      { id: 'chenghuang', zh: '新竹都城隍廟', rect: [-420, -120, -280, 20], slab: '#b4a894', col: '#b3261e' },
      { id: 'train', zh: '新竹車站', rect: [-140, 20, 0, 160], slab: '#bdb6a8', col: '#b89a6a' },
      { id: 'fab', zh: '晶圓廠', rect: [420, 20, 560, 160], slab: '#c9c6bd', col: '#eef1f3' },
    ],
    pedZones: [[-420, -220, -280, -160, '城隍廟夜市']],
    nightMarket: { name: '城隍廟夜市', xa: -420, xb: -280, z: -190 },
    gas: [['經國站', -420, 160, 1, 1], ['光復站', 140, -260, 1, 1]],
    names: { hospital: ['新竹市立醫院', 'HSINCHU HOSPITAL'], police: ['新竹市警察局', 'HSINCHU CITY POLICE'] },
    outer: { w: 'sea', s: 'hills' },
    gates: [{ side: 'e', at: -120, to: 'zhubei', road: '國道1號' }, { side: 's', at: -280, to: 'miaoli', road: '國道1號' }],
    shops: { clothes: [-210, -190, null, '風城服飾'], barber: [-350, 100, null, '城隍理髮廳'], noodle: [-210, 90, null, '阿城貢丸米粉'], dealer: [210, 90, null, '寶島汽車 新竹展示中心'], netcafe: [70, -190, null, '極速網咖 24H'], ktv: [-350, -300, null, '好聲音 KTV'] },
    build(kit) {
      K = kit; const y0 = K.y0;
      { // 東門城 迎曦門: a stone gate with a two-tier tower
        const L = W.lm.eastgate, cx = L.cx, cz = L.cz;
        cyl(cx, y0, cz, 30, 0.5, '#8f9aa0', 28);
        K.box(cx, y0 + 4.2, cz, 30, 8.4, 17, '#8d8a80');
        for (const sz of [-1, 1]) K.box(cx, y0 + 3, cz + sz * 8.4, 6, 6, 0.6, '#2a2622');
        for (let k = -6; k <= 6; k++) for (const sz of [-1, 1]) K.box(cx + k * 2.4, y0 + 8.9, cz + sz * 8.2, 1.3, 1, 0.6, '#8d8a80');
        K.box(cx, y0 + 10.6, cz, 21, 4.4, 10, '#8e2a1f');
        for (let k = -4; k <= 4; k++) for (const sz of [-1, 1]) K.box(cx + k * 2.6, y0 + 10.6, cz + sz * 5.6, 0.5, 4.4, 0.5, '#b3261e');
        K.coneRoof(cx, y0 + 12.8, cz, 30, 18, 3.4, '#48604f');
        K.box(cx, y0 + 16.6, cz, 13, 2.6, 6, '#8e2a1f');
        K.coneRoof(cx, y0 + 17.9, cz, 20, 11, 3.8, '#48604f');
        K.solid(cx, cz, 30, 17, 22);
        K.label('迎曦門', cx, y0 + 7.2, cz + 8.8, 7, 1.6, 0, '#2a2622', '#e8d9a8');
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.4; tree(cx + Math.cos(a) * 40, cz + Math.sin(a) * 40, 1.1); }
        W.lmPOI.eastgate = { x: cx, z: L.z1 - 4 };
      }
      { // 都城隍廟
        const L = W.lm.chenghuang, cx = L.cx, cz = L.cz;
        K.temple(cx, cz + 26, 44, 11, 7, 5);
        K.temple(cx, cz - 4, 28, 20, 9, 7);
        K.temple(cx, cz - 34, 46, 12, 8, 5);
        K.temple(cx - 32, cz - 4, 9, 44, 6, 4); K.temple(cx + 32, cz - 4, 9, 44, 6, 4);
        taper(cx, y0, cz + 12, 1.1, 1.4, 2.4, '#6a5a3a'); K.solid(cx, cz + 12, 2.4, 2.4, 3);
        for (let k = -3; k <= 3; k++) W.lanterns.push([cx + k * 6, y0 + 7.2, cz + 33]);
        K.label('新竹都城隍廟', cx, y0 + 9.6, cz + 33.2, 15, 2.2, 0, '#8e2a1f', '#ffd76a');
        W.lmPOI.chenghuang = { x: cx, z: L.z1 - 4 };
      }
      { // the baroque station with its clock tower
        const L = W.lm.train;
        const s = station(L, '新竹車站', 'HSINCHU STATION', { wall: '#b9b3a6', roof: '#4a4f55', trim: '#e3ded2', h: 12 });
        K.box(s.cx, y0 + 13, s.cz + 6, 9, 26, 9, '#b9b3a6');
        K.coneRoof(s.cx, y0 + 26, s.cz + 6, 11, 11, 7, '#4a4f55');
        for (const [dx, dz, ry] of [[0, 4.6, 0]]) { K.lmB(s.cx, s.cz).geo(new THREE.CylinderGeometry(2.4, 2.4, 0.3, 20), s.cx + dx, y0 + 21, s.cz + 6 + dz, 1, 1, 1, C('#f7f3e6'), { rx: Math.PI / 2, ry }); K.box(s.cx, y0 + 21.6, s.cz + 10.8, 0.16, 1.6, 0.1, '#222222'); K.box(s.cx + 0.5, y0 + 21, s.cz + 10.8, 1.1, 0.16, 0.1, '#222222'); }
      }
      { // wafer fab
        const L = W.lm.fab, cx = L.cx, cz = L.cz - 6;
        K.box(cx, y0 + 11, cz, 100, 22, 78, '#eef1f3');
        K.box(cx, y0 + 18, cz, 100.4, 2.4, 78.4, '#1f6fb3');
        for (let k = -3; k <= 3; k++) { cyl(cx + k * 12, y0 + 22, cz - 20, 1.6, 6, '#c9d2d8'); K.box(cx + k * 12, y0 + 23.5, cz + 14, 8, 3, 6, '#aab4ba'); }
        K.solid(cx, cz, 100, 78, 24);
        K.label('寶積電 晶圓十二廠', cx, y0 + 12, cz + 39.3, 40, 5, 0, '#eef1f3', '#c0392b', 'BAOJI SEMICONDUCTOR · FAB 12');
        K.box(cx - 30, y0 + 1.6, L.z1 - 8, 6, 3.2, 4, '#dfe5ea'); K.solid(cx - 30, L.z1 - 8, 6, 4, 3.2);
        for (let k = -4; k <= 4; k++) tree(cx + k * 12, L.z1 - 6, 0.9);
      }
      K.special(140, 160, 'hospital'); K.special(-280, -260, 'police');
    },
  };

  // =====================================================================
  // 新竹縣
  // =====================================================================
  const ZB = mkD([
    { id: 'newtown', zh: '竹北', en: 'ZHUBEI', desc: '一棟比一棟高的新大樓', h: [34, 96], neon: 0.12, old: 0.4, tower: true, slab: '#c4c2bc' },
    { id: 'rural', zh: '新竹縣郊', en: 'COUNTRYSIDE', desc: '稻田、三合院和柿餅', h: [4, 10], neon: 0.15, old: 0.7, sparse: 0.4 },
    { id: 'neiwan', zh: '內灣', en: 'NEIWAN', desc: '山城老街與野薑花粽', h: [5, 12], neon: 0.5, old: 1, sparse: 0.2, slab: '#b0a595' },
  ]);
  R.zhubei = {
    id: 'zhubei', zh: '新竹縣', en: 'HSINCHU COUNTY', desc: '竹北新市鎮、客家聚落與內灣老街', salt: 105,
    districts: ZB,
    districtAt: (x, z) => (x >= -240 && x < 240 && z >= -260 && z < 160 ? ZB.newtown : z >= 300 || (x >= 240 && z >= 160) ? ZB.neiwan : ZB.rural),
    mainX: [[-560, 14, '中華路'], [-400, 22, '自強南路'], [-240, 26, '莊敬北路', true], [-80, 22, '嘉豐南路'], [80, 24, '高鐵七路'], [240, 20, '文興路'], [400, 20, '東興路'], [560, 14, '中豐路']],
    mainZ: [[-400, 14, '鳳岡路'], [-260, 20, '福興路'], [-120, 26, '光明六路', true], [20, 22, '嘉興路'], [160, 22, '興隆路'], [300, 18, '竹東大道'], [400, 14, '內灣路']],
    landmarks: [
      { id: 'train', zh: '高鐵新竹站', rect: [80, -120, 240, 20], slab: '#c9c6bd', col: '#e8641b' },
      { id: 'hakka', zh: '新瓦屋客家聚落', rect: [-240, 20, -80, 160], slab: '#b9ad98', col: '#8a3a2a' },
      { id: 'paddy1', zh: '稻田', rect: [-560, 160, -240, 400], slab: '#86b04e', park: true, trees: 10 },
      { id: 'paddy2', zh: '稻田', rect: [240, -400, 560, -120], slab: '#8db552', park: true, trees: 10 },
    ],
    pedZones: [[240, 320, 400, 380, '內灣老街']],
    nightMarket: { name: '內灣老街', xa: 240, xb: 400, z: 350 },
    gas: [['東興站', 400, 160, -1, -1]],
    names: { hospital: ['竹北醫院', 'ZHUBEI HOSPITAL'], police: ['新竹縣警察局', 'HSINCHU COUNTY POLICE'] },
    outer: { e: 'hills', s: 'hills', n: 'fields' },
    gates: [{ side: 'n', at: -240, to: 'taoyuan', road: '國道1號' }, { side: 'w', at: -120, to: 'hsinchu', road: '國道1號' }],
    shops: { clothes: [-160, -60, null, '竹北服飾'], barber: [320, 220, null, '老街理髮廳'], noodle: [0, -190, null, '客家粄條'], dealer: [-160, -190, null, '寶島汽車 竹北展示中心'], netcafe: [0, 90, null, '極速網咖 24H'], ktv: [160, 90, null, '好聲音 KTV'] },
    build(kit) {
      K = kit; const y0 = K.y0;
      hsrStation(W.lm.train, '高鐵新竹站', 'THSR HSINCHU', true);
      { // 新瓦屋: a courtyard house compound under old trees
        const L = W.lm.hakka, cx = L.cx, cz = L.cz;
        K.temple(cx, cz - 22, 36, 10, 4.6, 3.6, '#efe6d6', '#7a4a3a', '#8a3a2a');
        for (const sx of [-1, 1]) K.temple(cx + sx * 25, cz + 2, 9, 34, 4, 3, '#efe6d6', '#7a4a3a', '#8a3a2a');
        K.box(cx, y0 + 0.12, cz + 4, 38, 0.06, 30, '#c9b28a');
        K.temple(cx - 46, cz - 30, 14, 8, 3.6, 2.6, '#b5664a', '#8a4a36', '#8a3a2a');
        for (const [a, b] of [[-44, 20], [44, 28], [46, -34], [-10, 44], [16, 46]]) tree(cx + a, cz + b, 1.7);
        K.label('新瓦屋', cx, y0 + 3.2, L.z1 - 6, 8, 2, 0, '#7a4a3a', '#ffe9b0', 'HAKKA CULTURAL PARK');
        for (const sx of [-1, 1]) K.box(cx + sx * 4.4, y0 + 1.6, L.z1 - 6, 0.4, 3.2, 0.4, '#7a4a3a');
      }
      paddy(W.lm.paddy1, 3); paddy(W.lm.paddy2, 3);
      K.special(-400, -120, 'hospital'); K.special(-80, -260, 'police');
    },
  };

  // =====================================================================
  // 宜蘭縣
  // =====================================================================
  const YL = mkD([
    { id: 'city', zh: '宜蘭市', en: 'YILAN CITY', desc: '舊城慢慢的，雨也慢慢的', h: [8, 24], neon: 0.5, old: 1 },
    { id: 'jiaoxi', zh: '礁溪', en: 'JIAOXI', desc: '溫泉旅館一間接一間', h: [12, 40], neon: 0.6, old: 0.6 },
    { id: 'coast', zh: '頭城・壯圍', en: 'COAST', desc: '看得到龜山島的海邊', h: [4, 12], neon: 0.2, old: 0.6, sparse: 0.35 },
    { id: 'yuanshan', zh: '員山', en: 'YUANSHAN', desc: '蘭陽平原的稻田', h: [4, 9], neon: 0.15, old: 0.7, sparse: 0.4 },
    { id: 'luodong', zh: '羅東', en: 'LUODONG', desc: '夜市人擠人，卜肉和包心粉圓', h: [8, 22], neon: 0.75, old: 1 },
  ]);
  R.yilan = {
    id: 'yilan', zh: '宜蘭縣', en: 'YILAN COUNTY', desc: '過了雪隧就是蘭陽平原：稻田、溫泉、龜山島', salt: 106, rainy: true,
    districts: YL,
    districtAt: (x, z) => (z < -120 ? YL.jiaoxi : z >= 300 ? YL.luodong : x >= 240 ? YL.coast : x < -240 ? YL.yuanshan : YL.city),
    mainX: [[-560, 14, '員山路'], [-400, 20, '泰山路'], [-240, 24, '中山路', true], [-80, 22, '舊城東路'], [80, 24, '東港路'], [240, 20, '壯圍路'], [400, 22, '濱海公路'], [540, 14, '海堤道']],
    mainZ: [[-400, 14, '頭城路'], [-260, 20, '溫泉路'], [-120, 22, '德陽路'], [20, 24, '光復路'], [160, 22, '校舍路'], [300, 20, '公正路'], [400, 14, '純精路']],
    landmarks: [
      { id: 'train', zh: '宜蘭車站', rect: [-80, 20, 80, 160], slab: '#bdb6a8', col: '#5f8f5a' },
      { id: 'lanyang', zh: '蘭陽博物館', rect: [240, -400, 400, -260], slab: '#8f9396', col: '#4a4a48' },
      { id: 'jiaoxi', zh: '礁溪溫泉公園', rect: [-400, -260, -240, -120], slab: '#5a8a45', park: true, trees: 50 },
      { id: 'paddy', zh: '蘭陽平原', rect: [-560, 160, -240, 400], slab: '#86b04e', park: true, trees: 10 },
    ],
    pedZones: [[-80, 320, 80, 380, '羅東夜市']],
    nightMarket: { name: '羅東夜市', xa: -80, xb: 80, z: 350 },
    gas: [['東港站', 80, -120, 1, 1]],
    names: { hospital: ['宜蘭醫院', 'YILAN HOSPITAL'], police: ['宜蘭縣警察局', 'YILAN COUNTY POLICE'] },
    outer: { e: 'sea', w: 'hills', n: 'hills', s: 'fields' },
    outerExtra: (mg, dome) => { // 龜山島
      const x = W.bounds.x1 + 760, z = -140;
      mg.geo(dome, x, 0, z, 150, 120, 95, C('#3f5d3c')); mg.geo(dome, x - 20, 0, z + 150, 62, 52, 56, C('#456446'));
    },
    gates: [{ side: 'w', at: -120, to: 'taipei', road: '國道5號 雪山隧道' }, { side: 'n', at: 400, to: 'keelung', road: '台2線濱海公路' }, { side: 's', at: 80, to: 'hualien', road: '蘇花公路' }],
    shops: { clothes: [0, -60, null, '蘭陽服飾'], barber: [-160, 230, null, '阿蘭理髮廳'], noodle: [160, 90, null, '宜蘭卜肉麵'], dealer: [160, -60, null, '寶島汽車 宜蘭展示中心'], netcafe: [-160, 90, null, '極速網咖 24H'], ktv: [0, 240, null, '好聲音 KTV'] },
    build(kit) {
      K = kit; const y0 = K.y0;
      { // the forest-painted station and the giraffe looking over its roof
        const L = W.lm.train;
        const s = station(L, '宜蘭車站', 'YILAN STATION', { wall: '#5f8f5a', roof: '#3d6b45', trim: '#f2e8c8', h: 11 });
        for (let k = -4; k <= 4; k++) { taper(s.cx + k * 9, y0 + 11, s.cz + 12, 2.6, 0.2, 5, k % 2 ? '#3d6b45' : '#4d8a52', 7); }
        const gx = s.cx + s.w / 2 + 10, gz = s.cz + 8, ye = '#e8b93c', br = '#8a5a2a';
        for (const [a, b] of [[-1.6, -0.8], [1.6, -0.8], [-1.6, 0.8], [1.6, 0.8]]) K.box(gx + a, y0 + 3, gz + b, 0.7, 6, 0.7, ye);
        K.box(gx, y0 + 7.2, gz, 5, 2.6, 2.4, ye);
        K.box(gx - 3.2, y0 + 12, gz, 1.2, 9, 1.2, ye, { rz: 0.28 });
        K.box(gx - 5, y0 + 16.6, gz, 2.6, 1.2, 1.1, ye);
        for (const [a, b] of [[0.8, 7.4], [-1, 8], [1.8, 6.8], [-2.6, 11], [-3.4, 13.4]]) K.box(gx + a, y0 + b, gz + 1.22, 0.8, 0.8, 0.06, br);
        for (const sz of [-0.3, 0.3]) K.box(gx - 4.6, y0 + 17.6, gz + sz, 0.2, 0.9, 0.2, br);
        K.solid(gx, gz, 5, 2.6, 8);
      }
      { // 蘭陽博物館: a tilted stone wedge rising out of the wetland
        const L = W.lm.lanyang, cx = L.cx, cz = L.cz - 4;
        water(L, L.x0 + 10, L.z0 + 8, L.x1 - 10, L.z1 - 26, '#3a6f6a');
        K.box(cx, y0 + 6, cz, 78, 30, 40, '#4a4a48', { rz: 0.32 });
        K.box(cx, y0 + 6.2, cz, 78.4, 4, 40.4, '#6a6a66', { rz: 0.32 });
        K.box(cx, y0 + 13, cz, 78.4, 3, 40.4, '#8a8a84', { rz: 0.32 });
        K.box(cx + 18, y0 + 3, cz + 21, 30, 6, 2, '#22303a');
        K.label('蘭陽博物館', cx, y0 + 3, L.z1 - 10, 16, 3, 0, '#4a4a48', '#ffffff', 'LANYANG MUSEUM');
        for (const sx of [-1, 1]) K.box(cx + sx * 7, y0 + 1.5, L.z1 - 10, 0.4, 3, 0.4, '#555555');
        W.lmPOI.lanyang = { x: cx, z: L.z1 - 5 };
      }
      { // 礁溪溫泉公園: foot baths under wooden pavilions
        const L = W.lm.jiaoxi;
        L.pond = [L.cx - 26, L.cz - 14, L.cx + 26, L.cz + 14];
        for (const dx of [-16, 0, 16]) {
          K.box(L.cx + dx, y0 + 0.2, L.cz, 13, 0.4, 9, '#a9865e');
          K.box(L.cx + dx, y0 + 0.42, L.cz, 10.4, 0.06, 6.4, '#8fd3d6');
          for (let k = 0; k < 3; k++) ball(L.cx + dx + U.rr(-3, 3), y0 + 1.6 + k * 0.9, L.cz + U.rr(-2, 2), 0.9, 0.5, 0.9, '#f4f8f8');
        }
        pavilion(L.cx - 16, L.cz - 12, '#7a5a3a', '#5a4632'); pavilion(L.cx + 16, L.cz + 12, '#7a5a3a', '#5a4632');
        K.label('礁溪溫泉公園', L.cx, y0 + 3.4, L.z1 - 6, 15, 2.4, 0, '#5a4632', '#ffe9b0', 'JIAOXI HOT SPRING PARK');
        for (const sx of [-1, 1]) K.box(L.cx + sx * 7, y0 + 1.7, L.z1 - 6, 0.4, 3.4, 0.4, '#5a4632');
        let lastSoak = -999;
        G.addInteract({ x: L.cx, z: L.cz + 6.5, r: 5, label: '泡腳（免費，體力 +30）', cond: () => G.elapsed - lastSoak > 60, fn: () => { lastSoak = G.elapsed; G.health = Math.min(100, G.health + 30); Sound.sfx('eat'); UI.subtitle('', '（溫泉水燙燙的，整個人都鬆了……）', 3200); } });
        W.lmPOI.jiaoxi = { x: L.cx, z: L.cz + 8 };
      }
      paddy(W.lm.paddy, 4);
      K.special(80, 160, 'hospital'); K.special(-240, 20, 'police');
    },
  };

  // =====================================================================
  // Travel between regions
  // =====================================================================
  const RG = { order: ['taipei', 'newtaipei', 'keelung', 'taoyuan', 'hsinchu', 'zhubei', 'yilan'], busy: false, objs: null, gates: [] };
  const LINKS = [['hsinchu', 'zhubei', 10], ['zhubei', 'taoyuan', 42], ['taoyuan', 'newtaipei', 26], ['newtaipei', 'taipei', 8], ['taipei', 'keelung', 28], ['taipei', 'yilan', 62], ['keelung', 'yilan', 70]];
  const KM = {};
  RG.areas = [['北部', ['taipei', 'newtaipei', 'keelung', 'taoyuan', 'hsinchu', 'zhubei', 'yilan']]];
  RG.relink = function () {
    for (const a of RG.order) { KM[a] = {}; for (const b of RG.order) KM[a][b] = a === b ? 0 : Infinity; }
    for (const [a, b, d] of LINKS) KM[a][b] = KM[b][a] = d;
    for (const k of RG.order) for (const a of RG.order) for (const b of RG.order) if (KM[a][k] + KM[k][b] < KM[a][b]) KM[a][b] = KM[a][k] + KM[k][b];
  };
  RG.relink();
  RG.extend = function (ids, links, areas) { RG.order.push(...ids); LINKS.push(...links); RG.areas.push(...areas); RG.relink(); };
  // building blocks shared with the other region files
  RG.fn = { mkD, cyl: (...a) => cyl(...a), taper: (...a) => taper(...a), ball: (...a) => ball(...a), tree, water, trainSet, station, hsrStation, paddy, pavilion, airliner, kit: (k) => (K = k) };
  RG.km = (a, b) => KM[a][b];
  RG.fare = (a, b) => Math.round((20 + KM[a][b] * 2.2) / 5) * 5;

  const SIDE = { w: { nx: -1, nz: 0 }, e: { nx: 1, nz: 0 }, n: { nx: 0, nz: -1 }, s: { nx: 0, nz: 1 } };
  // where a gate sits: the point where its road meets the edge of the map, and the outward normal
  function gateGeom(g) {
    const b = W.bounds, o = SIDE[g.side];
    const x = g.side === 'w' ? b.x0 : g.side === 'e' ? b.x1 : g.at;
    const z = g.side === 'n' ? b.z0 : g.side === 's' ? b.z1 : g.at;
    const line = (g.side === 'w' || g.side === 'e' ? W.Z : W.X).find((l) => l.c === g.at);
    return { x, z, nx: o.nx, nz: o.nz, w: line ? line.w : 20 };
  }
  function disposeObj(o, keepMat, keepTex) {
    o.traverse((m) => {
      if (m.geometry) m.geometry.dispose();
      for (const k of ['lowGeometry', 'detailGeometry']) if (m.userData && m.userData[k] && m.userData[k] !== m.geometry) m.userData[k].dispose();
      if (m.isInstancedMesh) m.dispose();
      for (const mat of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) {
        if (keepMat.has(mat)) continue;
        if (mat.map && !keepTex.has(mat.map)) mat.map.dispose();
        mat.dispose();
      }
    });
  }

  // build one region from scratch (tearing the previous one down first)
  RG.load = async function (id, progress) {
    const scene = G.scene;
    if (RG.objs) {
      G.clearWorld();
      const keepMat = new Set(Object.values(W.mat)), keepTex = new Set(Object.values(W.tex));
      for (const o of RG.objs) { scene.remove(o); disposeObj(o, keepMat, keepTex); }
    }
    W.setRegion(id);
    const before = new Set(scene.children);
    try {
      await W.build(scene, progress);
      W.buildMapCanvas();
      if (!G.player) G.initPlayer();
      G.initProps();
      Missions.init();
      Traffic.build();
      City.build();
      Interiors.init();
      buildTravel();
    } finally {
      RG.objs = scene.children.filter((o) => !before.has(o) && !o.userData.keep && !(G.player && o === G.player.ch.root));
    }
  };

  // station ticket machine + highway portals
  function buildTravel() {
    const here = W.regionId, t = W.lmPOI.train;
    if (t) {
      const g = new U.GeoBuilder(1);
      g.box(t.x, W.SLAB + 1, t.z - 2.2, 1.1, 2, 0.7, C('#1f4f9c'));
      g.box(t.x, W.SLAB + 1.35, t.z - 1.84, 0.7, 0.5, 0.02, C('#bfe3ff'));
      g.box(t.x, W.SLAB + 2.15, t.z - 2.2, 1.3, 0.3, 0.8, C('#f4f6f7'));
      const m = new THREE.Mesh(g.build(), new THREE.MeshLambertMaterial({ vertexColors: true }));
      scene_add(m);
      W.addAABB(t.x - 0.6, t.z - 2.6, t.x + 0.6, t.z - 1.8, 2.2, 'kiosk');
      G.addInteract({ x: t.x, z: t.z, r: 4, label: W.region.island ? '買船票・機票（去其他縣市）' : '買火車票（去其他縣市）', cond: () => !(window.Interiors && Interiors.current), fn: () => RG.ticket() });
    }
    RG.gates = [];
    const sg = new U.GeoBuilder(1);
    for (const def of W.region.gates || []) {
      const dest = R[def.to];
      if (!dest) continue;
      const q = gateGeom(def), horiz = def.side === 'n' || def.side === 's';
      const w = q.w + 4;
      // dark portal on the boundary wall, concrete frame, green sign above
      sg.box(q.x + q.nx * 0.6, 3.6, q.z + q.nz * 0.6, horiz ? w : 1.6, 7.2, horiz ? 1.6 : w, C('#0c0d0f'));
      for (const s of [-1, 1]) sg.box(q.x + (horiz ? s * (w / 2 + 1) : 0), 4.2, q.z + (horiz ? 0 : s * (w / 2 + 1)), horiz ? 2 : 2.4, 8.4, horiz ? 2.4 : 2, C('#8e8d86'));
      sg.box(q.x, 8.6, q.z, horiz ? w + 6 : 2.4, 1.6, horiz ? 2.4 : w + 6, C('#8e8d86'));
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w + 2, 22), 3.6), new THREE.MeshBasicMaterial({ map: W.labelTex(`${def.road} ➜ ${dest.zh}`, '#0b6b3a', '#ffffff', 512, 160, dest.en), side: THREE.DoubleSide }));
      sign.position.set(q.x - q.nx * 1.4, 11.4, q.z - q.nz * 1.4);
      sign.rotation.y = Math.atan2(-q.nx, -q.nz);
      scene_add(sign);
      RG.gates.push(Object.assign({ def, dest }, q));
    }
    if (RG.gates.length) { const m = new THREE.Mesh(sg.build(), new THREE.MeshLambertMaterial({ vertexColors: true })); scene_add(m); }
    void here;
  }
  const scene_add = (o) => G.scene.add(o);

  // driving into a portal takes you (and the car) to the next region
  let gateHintT = 0;
  RG.update = function (dt) {
    if (RG.busy || G.state !== 'play') return;
    const P = G.player, v = P.vehicle, p = v ? v.pos : P.pos;
    gateHintT -= dt;
    for (const g of RG.gates) {
      const dx = p.x - g.x, dz = p.z - g.z;
      const depth = -(dx * g.nx + dz * g.nz), lat = Math.abs(dx * g.nz - dz * g.nx);
      if (lat > g.w / 2 + 1 || depth > 9) continue;
      if (!v) { if (depth < 5 && gateHintT <= 0) { gateHintT = 6; UI.toast(`這裡是往${g.dest.zh}的${g.def.road}：要開車或騎車才能上去`); } continue; }
      const out = Math.sin(v.h) * g.nx + Math.cos(v.h) * g.nz;
      if (depth < v.spec.len / 2 + 3.5 && out > 0.5 && v.fwd > 2) { RG.travel(g.def.to, 'road'); return; }
    }
  };

  function blocked() {
    if (Missions.active) return '工作進行中，先完成或放棄再出發';
    if (G.wanted >= 1) return '警察在追你，先甩掉再說！';
    if (G.carry) return '手上的東西先放下';
    return null;
  }
  RG.ticket = async function () {
    const why = blocked();
    if (why) { UI.toast(why); return; }
    const here = W.regionId;
    const areas = RG.areas.map(([name, ids]) => [name, ids.filter((id) => id !== here)]).filter((a) => a[1].length);
    const ap = await UI.choose('售票機：要去哪一區？', `目前在 ${W.region.zh}。本島搭火車或高鐵，離島搭船或飛機。`, areas.map(([name, ids]) => ({ title: name, meta: ids.map((id) => R[id].zh).join('、') })), 1);
    if (!ap || !ap.length) return;
    const list = areas[ap[0]][1].slice().sort((a, b) => KM[here][a] - KM[here][b]);
    const pick = await UI.choose(`售票機：${areas[ap[0]][0]}`, '選一個目的地，票價會從錢包扣款。', list.map((id) => ({ title: `${R[id].zh}　${R[id].en}`, meta: `約 ${KM[here][id]} 公里・NT$${RG.fare(here, id)}`, desc: R[id].desc })), 1);
    if (!pick || !pick.length) return;
    const to = list[pick[0]], fare = RG.fare(here, to);
    if (G.money < fare) { UI.toast('錢不夠買票……'); return; }
    G.money -= fare;
    Sound.sfx('chime');
    RG.travel(to, 'train', fare);
  };

  RG.travel = async function (to, via, paid) {
    if (RG.busy || !R[to] || to === W.regionId) return;
    const why = blocked();
    if (why) { if (gateHintT <= 0) { gateHintT = 4; UI.toast(why); } return; }
    RG.busy = true;
    const from = W.regionId, P = G.player, v = P.vehicle;
    const carry = via === 'road' && v ? { type: v.type, color: v.color, hp: v.hp / v.spec.hp, fuel: v.fuel, owned: !!v.owned, entry: v.garageEntry || null } : null;
    const el = document.querySelector('#travel');
    el.querySelector('.tv-via').textContent = via === 'train' ? (W.region.island || R[to].island ? '航班・船班行駛中' : '列車行駛中') : `${(W.region.gates.find((g) => g.to === to) || {}).road || '公路'} 行駛中`;
    el.querySelector('.tv-zh').textContent = R[to].zh;
    el.querySelector('.tv-en').textContent = R[to].en;
    el.querySelector('.tv-desc').textContent = R[to].desc;
    const bar = el.querySelector('.bar i');
    bar.style.width = '0%';
    el.hidden = false;
    G.state = 'loading';
    document.exitPointerLock && document.exitPointerLock();
    Sound.setEngine && Sound.setEngine(false, false, 0, 0);
    await new Promise((r) => setTimeout(r, 350));
    let ok = false, stuck = false;
    try {
      await RG.load(to, (p) => { bar.style.width = `${Math.round(p * 90)}%`; });
      RG.arrive(from, via, carry);
      G.prewarm();
      bar.style.width = "100%";
      G.save.region = to;
      G.time += KM[from][to] * (via === 'train' ? 0.9 : 1.2); // the trip takes a while
      G.saveGame();
      ok = true;
    } catch (e) {
      // the trip failed: go back to where we came from, give the ticket money back
      console.error(e);
      if (paid) G.money += paid;
      try {
        await RG.load(from, (p) => { bar.style.width = `${Math.round(p * 100)}%`; });
        const sp = RG.spawnPoint();
        G.teleport(sp.x, sp.z, sp.yaw);
        G.save.region = from;
      } catch (e2) { console.error(e2); stuck = true; }
    }
    if (stuck) {
      el.querySelector('.tv-via').textContent = '載入失敗';
      el.querySelector('.tv-desc').textContent = '地圖載入失敗，請重新整理頁面（進度已存檔）。';
      return;
    }
    el.hidden = true;
    G.state = 'play';
    G.clock.getDelta();
    G.godT = 2;
    RG.busy = false;
    if (ok) UI.bigText(R[to].zh, `${R[to].en}・${R[to].desc}`, 4200);
    else UI.toast(`往${R[to].zh}的路線暫時中斷，已回到${R[from].zh}${paid ? '，車票已退款' : ''}`, 6000);
    if (UI.relock) UI.relock();
  };

  // put the player down in the region that was just built
  RG.arrive = function (from, via, carry) {
    const P = G.player;
    const def = via === 'road' && (W.region.gates || []).find((g) => g.to === from);
    if (def) {
      const q = gateGeom(def), h = Math.atan2(-q.nx, -q.nz);
      // 34 m inside the portal, in the right-hand lane heading into town
      const fx = -q.nx, fz = -q.nz, off = q.w / 4;
      const x = q.x + fx * 34 - fz * off, z = q.z + fz * 34 + fx * off;
      if (carry) {
        const v = G.spawnVehicle(carry.type, x, z, h, { color: carry.color, persist: true, fuel: carry.fuel });
        v.hp = Math.max(0.15, carry.hp) * v.spec.hp;
        if (carry.owned) { v.owned = true; v.garageEntry = carry.entry; G.ownedCar = v; }
        P.pos.set(x, 0, z);
        G.enterVehicle(v);
        G.cam.yaw = h;
        return;
      }
      G.teleport(x, z, h);
      return;
    }
    const t = W.lmPOI.train || W.lmPOI.hospital;
    G.teleport(t.x, t.z + 3, 0);
  };
  // where a loaded save starts
  RG.spawnPoint = function () {
    if (W.regionId === 'taipei' && W.lmPOI.garage) return { x: W.lmPOI.garage.x, z: W.lmPOI.garage.z + 2, yaw: Math.PI };
    const t = W.lmPOI.train || W.lmPOI.hospital;
    return { x: t.x, z: t.z + 3, yaw: 0 };
  };

  window.Regions = RG;
})();
