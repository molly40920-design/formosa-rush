// 寶島狂飆 — walk-in interiors (shops, noodle bar, barber, car dealer) and owned cars
(function () {
  const W = World, S = Sound, M = Models;
  const IN = { rooms: {}, doors: [], current: null };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const C = (h) => U.col(h);
  // rooms live far outside the city, beyond the boundary walls
  const BASE_X = 3400, BASE_Z = 3400;

  const matCache = {};
  const tileTex = (kind) => matCache[kind] || (matCache[kind] = U.canvasTex(256, 256, (g) => {
    if (kind === 'wood') {
      for (let i = 0; i < 8; i++) { g.fillStyle = ['#9a6a45', '#a57450', '#8e603e', '#b07f59'][i % 4]; g.fillRect(0, i * 32, 256, 32); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, i * 32, 256, 2); g.fillRect((i * 97) % 256, i * 32, 2, 32); }
    } else if (kind === 'terrazzo') {
      g.fillStyle = '#cfcac0'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { g.fillStyle = ['#8f8a80', '#e8e4dc', '#b3aa9c', '#6e6a64'][i % 4]; g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 3); }
    } else if (kind === 'polished') {
      const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#e9ebee'); gr.addColorStop(1, '#d4d8dd'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      g.fillStyle = 'rgba(0,0,0,0.08)'; for (let k = 0; k <= 256; k += 128) { g.fillRect(k, 0, 2, 256); g.fillRect(0, k, 256, 2); }
    } else {
      g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(0,0,0,0.1)';
      for (let k = 0; k <= 256; k += 64) { g.fillRect(k, 0, 2, 256); g.fillRect(0, k, 256, 2); }
    }
  }, { repeat: true }));

  // ---------- room construction ----------
  function makeRoom(id, idx, w, d, opts) {
    const ox = BASE_X + idx * 90, oz = BASE_Z;
    const g = new U.GeoBuilder(2);
    const h = opts.h || 3.4;
    const wall = C(opts.wall || '#ece7dc'), trim = C(opts.trim || '#8f8a80');
    // walls (entrance gap in the south wall, x in [-1.2, 1.2])
    const box = (x, y, z, bw, bh, bd, c, o) => g.box(ox + x, y, oz + z, bw, bh, bd, c, o);
    box(0, h / 2, -d / 2, w, h, 0.25, wall);
    box(-w / 2, h / 2, 0, 0.25, h, d, wall);
    box(w / 2, h / 2, 0, 0.25, h, d, wall);
    box(-(w / 4 + 0.6), h / 2, d / 2, w / 2 - 1.2, h, 0.25, wall);
    box(w / 4 + 0.6, h / 2, d / 2, w / 2 - 1.2, h, 0.25, wall);
    box(0, h - 0.4, d / 2, 2.4, 0.8, 0.25, wall);
    box(0, 0.08, -d / 2 + 0.14, w, 0.16, 0.04, trim);
    box(-w / 2 + 0.14, 0.08, 0, 0.04, 0.16, d, trim);
    box(w / 2 - 0.14, 0.08, 0, 0.04, 0.16, d, trim);
    box(0, h + 0.05, 0, w + 0.3, 0.1, d + 0.3, C(opts.ceiling || '#f3f1ea'));
    // ceiling light panels (glow)
    for (let x = -w / 2 + 2; x < w / 2 - 1; x += 3.2) for (let z = -d / 2 + 2; z < d / 2 - 1; z += 3.2) g.box(ox + x, h - 0.02, oz + z, 1.2, 0.04, 0.5, C('#fffaf0'), { group: 1 });
    // the door: dark glass with a push bar, seen from inside
    g.box(ox, 1.1, oz + d / 2 + 0.05, 2.4, 2.2, 0.06, C('#1d2a33'));
    g.box(ox, 1.05, oz + d / 2 - 0.05, 1.6, 0.06, 0.06, C('#b8c0c8'));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tileTex(opts.floor || 'tile'), roughness: opts.floor === 'polished' ? 0.25 : 0.7 }));
    floor.material.map.repeat.set(w / 3, d / 3);
    floor.rotation.x = -Math.PI / 2; floor.position.set(ox, 0.015, oz);
    W.scene.add(floor);
    for (const [x0, z0, x1, z1] of [[-w / 2, -d / 2 - 0.2, w / 2, -d / 2 + 0.1], [-w / 2 - 0.2, -d / 2, -w / 2 + 0.1, d / 2], [w / 2 - 0.1, -d / 2, w / 2 + 0.2, d / 2], [-w / 2, d / 2 - 0.1, -1.2, d / 2 + 0.2], [1.2, d / 2 - 0.1, w / 2, d / 2 + 0.2], [-1.2, d / 2 + 0.3, 1.2, d / 2 + 0.6]]) W.addAABB(ox + x0, oz + z0, ox + x1, oz + z1, 6, 'room');
    const lights = [];
    for (const lx of w > 14 ? [-w / 4, w / 4] : [0]) {
      const L = new THREE.PointLight(opts.light || 0xfff2dc, 0, Math.max(w, d) * 1.4, 1.2);
      L.position.set(ox + lx, h - 0.4, oz);
      W.scene.add(L); lights.push(L);
    }
    const room = { id, ox, oz, w, d, h, g, lights, spots: [], name: opts.name, meshes: [floor] };
    IN.rooms[id] = room;
    return room;
  }
  function finishRoom(room) {
    const mesh = new THREE.Mesh(room.g.build(), [U.surface({ vertexColors: true, roughness: 0.7, envMapIntensity: 0.2 }), new THREE.MeshBasicMaterial({ vertexColors: true })]);
    W.scene.add(mesh);
    room.meshes.push(mesh);
    room.g = null;
  }
  const at = (room, x, z) => ({ x: room.ox + x, z: room.oz + z });

  // props
  function shelf(room, x, z, len, alongX, colors) {
    // open gondola: thin back board, three shelves, goods facing both aisles
    const g = room.g;
    const put = (along, across, y, w, h, d, c, grp) => g.box(room.ox + x + (alongX ? along : across), y, room.oz + z + (alongX ? across : along), alongX ? w : d, h, alongX ? d : w, C(c), grp ? { group: grp } : {});
    put(0, 0, 0.8, len, 1.6, 0.06, '#c9ced3');
    put(0, 0, 1.62, len, 0.05, 0.7, '#1d5fbf');
    for (const endA of [-len / 2, len / 2]) put(endA, 0, 0.8, 0.05, 1.6, 0.66, '#c9ced3');
    for (const y of [0.12, 0.62, 1.12]) {
      put(0, 0, y, len, 0.04, 0.66, '#b9bfc4');
      for (const side of [-1, 1]) for (let k = -len / 2 + 0.18; k < len / 2 - 0.1; k += 0.2) {
        const hgt = 0.18 + Math.random() * 0.2;
        put(k, side * 0.19, y + 0.02 + hgt / 2, 0.15, hgt, 0.22, U.mpick(colors));
      }
    }
    W.addAABB(room.ox + x - (alongX ? len / 2 : 0.35), room.oz + z - (alongX ? 0.35 : len / 2), room.ox + x + (alongX ? len / 2 : 0.35), room.oz + z + (alongX ? 0.35 : len / 2), 1.8, 'shelf');
  }
  function counter(room, x, z, w, d, col) {
    room.g.box(room.ox + x, 0.5, room.oz + z, w, 1, d, C(col || '#6b4a2e'));
    room.g.box(room.ox + x, 1.02, room.oz + z, w + 0.1, 0.05, d + 0.1, C('#e8e4dc'));
    W.addAABB(room.ox + x - w / 2, room.oz + z - d / 2, room.ox + x + w / 2, room.oz + z + d / 2, 1.1, 'counter');
  }
  function sign(room, text, bg, fg) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.8), new THREE.MeshBasicMaterial({ map: W.labelTex(text, bg, fg, 512, 128) }));
    m.position.set(room.ox, room.h - 0.7, room.oz - room.d / 2 + 0.14);
    W.scene.add(m); room.meshes.push(m);
  }
  function clerk(room, x, z, yaw, spec) {
    const p = G.spawnPed(room.ox + x, room.oz + z, { spec: spec || M.randomPedSpec(), state: 'idle', persist: true });
    p.t = 1e12; p.yaw = yaw; p.clerk = true;
    return p;
  }

  // ---------- the five interiors ----------
  function buildStore() {
    const r = makeRoom('store', 0, 12, 10, { name: '好鄰居便利商店', floor: 'tile', wall: '#f7f8fb', trim: '#1d5fbf' });
    const goods = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa', '#f5f5f5', '#6d4c41'];
    for (const x of [-3.2, -0.6]) shelf(r, x, -0.5, 5, false, goods);
    // fridge wall with glowing doors
    r.g.box(r.ox - 2, 1.1, r.oz - r.d / 2 + 0.45, 7.5, 2.2, 0.7, C('#cfd6dc'));
    for (let k = 0; k < 6; k++) r.g.box(r.ox - 5.2 + k * 1.25, 1.15, r.oz - r.d / 2 + 0.82, 1.1, 1.9, 0.04, C('#dff4ff'), { group: 1 });
    for (let k = 0; k < 36; k++) r.g.box(r.ox - 5.4 + (k % 12) * 0.55, 0.6 + Math.floor(k / 12) * 0.6, r.oz - r.d / 2 + 0.78, 0.18, 0.28, 0.12, C(U.mpick(goods)));
    W.addAABB(r.ox - 5.75, r.oz - r.d / 2, r.ox + 1.75, r.oz - r.d / 2 + 0.85, 2.3, 'fridge');
    counter(r, 3.6, 1.2, 1, 3.4, '#1d5fbf');
    r.g.box(r.ox + 3.6, 1.2, r.oz + 0.3, 0.4, 0.3, 0.3, C('#333333'));
    r.g.box(r.ox + 5.3, 1.4, r.oz - 1, 0.6, 2.2, 1.4, C('#e8e4dc'));
    sign(r, '好鄰居 GOOD NEIGHBOR', '#1d5fbf', '#ffffff');
    finishRoom(r);
    clerk(r, 4.6, 1.2, -Math.PI / 2, { skin: '#f1c8a5', shirt: '#1d5fbf', sleeve: '#1d5fbf', pants: '#2b3547', shoes: '#222', hair: '#1a1410', style: 'ponytail', body: 'f', top: 'tee', scale: 0.95 });
    r.spots.push({ x: r.ox + 2.6, z: r.oz + 1.2, label: '結帳（買東西）', fn: () => shopMenu('store') });
    return r;
  }
  function buildClothes() {
    const r = makeRoom('clothes', 1, 14, 10, { name: '西門潮流服飾', floor: 'wood', wall: '#f4efe6', trim: '#222222' });
    const cloth = ['#e84b3c', '#2f6fb3', '#f2f2ee', '#232323', '#3f8f5a', '#f2c230', '#8a55b5', '#e27ba0'];
    for (const [x, z] of [[-4, -1.5], [-4, 1.5], [0, -2], [0, 1]]) {
      r.g.box(r.ox + x, 1.55, r.oz + z, 2.6, 0.05, 0.05, C('#b8c0c8'));
      for (const px of [-1.25, 1.25]) r.g.box(r.ox + x + px, 0.78, r.oz + z, 0.05, 1.56, 0.05, C('#b8c0c8'));
      for (let k = -1.1; k <= 1.1; k += 0.2) r.g.box(r.ox + x + k, 1.05, r.oz + z, 0.06, 0.9, 0.5, C(U.mpick(cloth)));
      W.addAABB(r.ox + x - 1.3, r.oz + z - 0.3, r.ox + x + 1.3, r.oz + z + 0.3, 1.7, 'rack');
    }
    // mirrors & fitting room
    r.g.box(r.ox + 5.5, 1.3, r.oz - r.d / 2 + 0.2, 2.4, 2.2, 0.1, C('#e8e4dc'));
    r.g.box(r.ox + 5.5, 1.3, r.oz - r.d / 2 + 0.27, 2.1, 1.9, 0.02, C('#9fb4c2'));
    r.g.box(r.ox + 5.6, 1.2, r.oz + 1.6, 2.2, 2.4, 0.08, C('#8a2a1f'));
    counter(r, -5.2, 3.2, 2.6, 0.8, '#232323');
    sign(r, 'XIMEN STREET WEAR', '#232323', '#f2c230');
    finishRoom(r);
    clerk(r, -5.2, 2.4, 0, { skin: '#f5d3b8', shirt: '#232323', pants: '#1c1c1c', shoes: '#f2f2f2', hair: '#e27ba0', style: 'bob', body: 'f', top: 'jacket', inner: '#f2c230', scale: 0.96 });
    r.spots.push({ x: r.ox + 5.5, z: r.oz + 2.8, label: '試衣間（換衣服 NT$200）', fn: () => UI.openCreator('clothes', 200) });
    return r;
  }
  function buildBarber() {
    const r = makeRoom('barber', 2, 9, 8, { name: '老街理髮廳', floor: 'terrazzo', wall: '#e6efe9', trim: '#8a2a1f' });
    for (const x of [-2.2, 1.2]) {
      r.g.box(r.ox + x, 0.45, r.oz - 2.6, 0.7, 0.2, 0.7, C('#222222'));
      r.g.box(r.ox + x, 0.75, r.oz - 2.6, 0.7, 0.5, 0.7, C('#8a2a1f'));
      r.g.box(r.ox + x, 1.15, r.oz - 2.95, 0.7, 0.8, 0.12, C('#8a2a1f'));
      r.g.box(r.ox + x, 1.6, r.oz - r.d / 2 + 0.16, 1.4, 1.2, 0.04, C('#9fb4c2'));
      W.addAABB(r.ox + x - 0.4, r.oz - 3.05, r.ox + x + 0.4, r.oz - 2.2, 1.2, 'chair');
    }
    r.g.box(r.ox + 3.6, 0.9, r.oz - 2.8, 0.9, 1.8, 1.2, C('#f2f2ee'));
    sign(r, '老街理髮廳', '#8a2a1f', '#ffffff');
    finishRoom(r);
    clerk(r, -0.5, -1.6, Math.PI, { skin: '#c98f67', shirt: '#f2f2ee', pants: '#2b3547', shoes: '#222', hair: '#8a8a8a', style: 'short', beard: true, body: 'm', top: 'long', scale: 1 });
    r.spots.push({ x: r.ox - 2.2, z: r.oz - 1.7, label: '坐下來剪頭髮（NT$150）', fn: () => UI.openCreator('hair', 150) });
    return r;
  }
  function buildNoodle() {
    const r = makeRoom('noodle', 3, 12, 9, { name: '老王牛肉麵', floor: 'terrazzo', wall: '#f3ead8', trim: '#6b4a2e', light: 0xffe0b0 });
    for (const [x, z] of [[-3.5, -0.5], [-3.5, 2.2], [0, -0.5], [0, 2.2]]) {
      r.g.box(r.ox + x, 0.72, r.oz + z, 1.4, 0.06, 0.9, C('#b98b5e'));
      r.g.box(r.ox + x, 0.36, r.oz + z, 0.1, 0.72, 0.1, C('#555555'));
      for (const [sx, sz] of [[-0.9, 0], [0.9, 0]]) r.g.geo(new THREE.CylinderGeometry(0.2, 0.2, 0.45, 12), r.ox + x + sx, 0.23, r.oz + z + sz, 1, 1, 1, C('#c62828'));
      for (const bx of [-0.35, 0.35]) r.g.geo(new THREE.CylinderGeometry(0.1, 0.07, 0.08, 12), r.ox + x + bx, 0.79, r.oz + z, 1, 1, 1, C('#f2f2ee'));
      W.addAABB(r.ox + x - 0.75, r.oz + z - 0.5, r.ox + x + 0.75, r.oz + z + 0.5, 0.8, 'table');
    }
    counter(r, 3.8, -1.5, 2.6, 1, '#6b4a2e');
    for (const px of [3.2, 4.4]) r.g.geo(new THREE.CylinderGeometry(0.32, 0.3, 0.45, 14), r.ox + px, 1.28, r.oz - 1.5, 1, 1, 1, C('#8e9aa3'));
    const menu = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.2), new THREE.MeshBasicMaterial({ map: U.canvasTex(512, 200, (c) => {
      c.fillStyle = '#2b1d15'; c.fillRect(0, 0, 512, 200); c.fillStyle = '#ffe9b0'; c.font = `900 34px ${W.FONT}`; c.textAlign = 'left';
      ['紅燒牛肉麵 130', '滷肉飯 45', '燙青菜 40', '滷蛋 15'].forEach((t, i) => c.fillText(t, 30 + (i % 2) * 250, 70 + Math.floor(i / 2) * 70));
    }) }));
    menu.position.set(r.ox + 3.8, 2.3, r.oz - r.d / 2 + 0.14); W.scene.add(menu); r.meshes.push(menu);
    sign(r, '老王牛肉麵', '#8a2a1f', '#ffe9b0');
    finishRoom(r);
    clerk(r, 3.8, -2.4, 0, { skin: '#c98f67', shirt: '#f2f2ee', pants: '#3a3a44', shoes: '#222', hair: '#1a1410', style: 'buzz', body: 'm', top: 'tank', scale: 1.02 });
    for (const [x, z] of [[-3.5, 0.3], [0, 3.0]]) { const p = clerk(r, x + 0.9, z, -Math.PI / 2); p.clerk = false; }
    r.spots.push({ x: r.ox + 3.8, z: r.oz - 0.5, label: '點餐', fn: () => shopMenu('noodle') });
    return r;
  }
  function buildDealer() {
    const r = makeRoom('dealer', 4, 24, 16, { name: '寶島汽車展示中心', floor: 'polished', wall: '#f2f4f6', trim: '#1b1f24', h: 5 });
    for (const [x, z] of [[-6.5, -3], [0, -3.5], [6.5, -3], [-6.5, 3], [6.5, 3]]) {
      r.g.geo(new THREE.CylinderGeometry(2.4, 2.5, 0.2, 32), r.ox + x, 0.1, r.oz + z, 1, 1, 1, C('#d7dbe0'));
      W.addAABB(r.ox + x - 1.2, r.oz + z - 2.4, r.ox + x + 1.2, r.oz + z + 2.4, 1.5, 'display');
    }
    counter(r, 0, 3.8, 3.6, 1, '#1b1f24');
    sign(r, 'FORMOSA MOTORS', '#1b1f24', '#ffd23f');
    finishRoom(r);
    // real vehicle models on the turntables
    const show = [['sedan', '#b22222', -6.5, -3], ['sports', '#f2c318', 0, -3.5], ['truck', '#2d5aa0', 6.5, -3], ['scooter', '#e8e8e8', -6.5, 3], ['sedan', '#1f3f7a', 6.5, 3]];
    r.display = show.map(([t, c, x, z]) => { const o = M.makeVehicle(t, c); o.group.position.set(r.ox + x, 0.2, r.oz + z); o.group.rotation.y = 0.6; W.scene.add(o.group); return o.group; });
    clerk(r, 0, 4.7, Math.PI, { skin: '#f1c8a5', shirt: '#1b1f24', sleeve: '#1b1f24', pants: '#1b1f24', shoes: '#222', hair: '#1a1410', style: 'short', glasses: true, body: 'm', top: 'jacket', inner: '#f2f2ee', scale: 1.02 });
    r.spots.push({ x: r.ox, z: r.oz + 2.9, label: '找業務買車', fn: () => dealerMenu() });
    return r;
  }

  function buildNetcafe() {
    const r = makeRoom('netcafe', 5, 14, 11, { name: '極速網咖', floor: 'tile', wall: '#20242c', trim: '#00e5ff', ceiling: '#15181e', light: 0x9fd8ff });
    for (const z of [-3, 0, 3]) for (let x = -5; x <= 3; x += 2) {
      r.g.box(r.ox + x, 0.74, r.oz + z, 1.6, 0.05, 0.8, C('#2b2f38'));
      r.g.box(r.ox + x, 0.37, r.oz + z - 0.3, 0.08, 0.74, 0.08, C('#444'));
      r.g.box(r.ox + x, 1.1, r.oz + z - 0.25, 0.9, 0.55, 0.05, C('#111'));
      r.g.box(r.ox + x, 1.1, r.oz + z - 0.22, 0.84, 0.48, 0.01, C(U.mpick(['#3fa9f5', '#7c4dff', '#00e676', '#ff4081'])), { group: 1 });
      r.g.box(r.ox + x, 0.78, r.oz + z + 0.1, 0.6, 0.03, 0.2, C('#1a1a1a'));
      r.g.box(r.ox + x, 0.5, r.oz + z + 0.75, 0.55, 0.12, 0.5, C('#c62828'));
      r.g.box(r.ox + x, 0.85, r.oz + z + 1.0, 0.55, 0.65, 0.1, C('#c62828'));
      W.addAABB(r.ox + x - 0.8, r.oz + z - 0.45, r.ox + x + 0.8, r.oz + z + 0.35, 1.3, 'desk');
    }
    counter(r, 5.4, 2.6, 1, 3, '#00bcd4');
    for (let x = -6; x <= 6; x += 0.5) r.g.box(r.ox + x, r.h - 0.3, r.oz - r.d / 2 + 0.14, 0.4, 0.06, 0.02, C(x % 1 === 0 ? '#00e5ff' : '#ff4081'), { group: 1 });
    sign(r, '極速網咖 24H', '#111111', '#00e5ff');
    finishRoom(r);
    clerk(r, 6.2, 2.6, -Math.PI / 2, { skin: '#e0b08a', shirt: '#212121', pants: '#1c1c1c', shoes: '#eee', hair: '#1a1410', style: 'spiky', body: 'm', top: 'hoodie', scale: 1 });
    for (const [x, z] of [[-5, -3], [1, 0], [-3, 3]]) { const p = clerk(r, x, z + 0.75, Math.PI); p.clerk = false; }
    r.spots.push({ x: r.ox + 3, z: r.oz + 0.9, label: '開電腦打電競（NT$50）', fn: () => esports() });
    r.spots.push({ x: r.ox + 4.4, z: r.oz + 2.6, label: '跟櫃台買泡麵（NT$45）', fn: () => buyItem('泡麵', 45, 30) });
    return r;
  }
  function buildKtv() {
    const r = makeRoom('ktv', 6, 10, 9, { name: '好聲音 KTV', floor: 'polished', wall: '#2a1b3d', trim: '#ff4081', ceiling: '#1a1026', light: 0xff9ad5 });
    // U-shaped sofa, coffee table, big screen
    r.g.box(r.ox, 0.4, r.oz + 2.8, 7, 0.8, 1, C('#5e1f3d'));
    for (const sx of [-3.3, 3.3]) r.g.box(r.ox + sx, 0.4, r.oz + 0.8, 1, 0.8, 4, C('#5e1f3d'));
    W.addAABB(r.ox - 3.5, r.oz + 2.3, r.ox + 3.5, r.oz + 3.3, 0.9, 'sofa');
    r.g.box(r.ox, 0.35, r.oz + 0.8, 2.6, 0.7, 1.2, C('#1a1a1a'));
    W.addAABB(r.ox - 1.3, r.oz + 0.2, r.ox + 1.3, r.oz + 1.4, 0.8, 'table');
    r.g.box(r.ox, 1.9, r.oz - r.d / 2 + 0.2, 5, 2.8, 0.1, C('#0d0d12'));
    r.g.box(r.ox, 1.9, r.oz - r.d / 2 + 0.26, 4.7, 2.5, 0.01, C('#6a5acd'), { group: 1 });
    for (let i = 0; i < 12; i++) r.g.geo(new THREE.SphereGeometry(0.07, 6, 4), r.ox - 4 + i * 0.75, r.h - 0.25, r.oz + (i % 2 ? -2 : 2), 1, 1, 1, C(U.mpick(['#ff4081', '#00e5ff', '#ffd23f'])), { group: 1 });
    sign(r, '好聲音 KTV', '#ff4081', '#ffffff');
    finishRoom(r);
    r.spots.push({ x: r.ox, z: r.oz - 0.8, label: '點歌開唱（NT$300）', fn: () => sing() });
    return r;
  }
  function buildHome() {
    const r = makeRoom('home', 7, 9, 8, { name: '我的套房', floor: 'wood', wall: '#efe7da', trim: '#8d6e63', light: 0xffe4c0 });
    r.g.box(r.ox - 2.6, 0.3, r.oz - 2.2, 2, 0.6, 2.6, C('#6d4c41'));
    r.g.box(r.ox - 2.6, 0.65, r.oz - 2.2, 1.9, 0.18, 2.5, C('#eceff1'));
    r.g.box(r.ox - 2.6, 0.8, r.oz - 3.2, 1.2, 0.18, 0.45, C('#90caf9'));
    W.addAABB(r.ox - 3.6, r.oz - 3.5, r.ox - 1.6, r.oz - 0.9, 0.8, 'bed');
    r.g.box(r.ox + 3.6, 1.1, r.oz - 2.4, 1, 2.2, 1.8, C('#a1887f'));
    W.addAABB(r.ox + 3.1, r.oz - 3.3, r.ox + 4.1, r.oz - 1.5, 2.2, 'wardrobe');
    r.g.box(r.ox + 0.8, 0.35, r.oz + 1.6, 2.2, 0.7, 0.9, C('#546e7a'));
    r.g.box(r.ox + 0.8, 0.7, r.oz + 2.05, 2.2, 0.6, 0.2, C('#546e7a'));
    W.addAABB(r.ox - 0.3, r.oz + 1.15, r.ox + 1.9, r.oz + 2.15, 0.8, 'sofa');
    r.g.box(r.ox + 0.8, 1.3, r.oz - r.d / 2 + 0.15, 1.8, 1, 0.08, C('#111'));
    r.g.box(r.ox + 0.8, 1.3, r.oz - r.d / 2 + 0.2, 1.7, 0.92, 0.01, C('#4fc3f7'), { group: 1 });
    r.g.box(r.ox - 4.35, 1.6, r.oz + 0.5, 0.05, 1.4, 2, C('#bfe3ff'), { group: 1 });
    finishRoom(r);
    r.spots.push({ x: r.ox - 2.6, z: r.oz - 0.5, label: '睡覺（存檔、回滿體力）', fn: () => sleep() });
    r.spots.push({ x: r.ox + 2.6, z: r.oz - 2.4, label: '打開衣櫃換裝', fn: () => UI.openCreator('clothes', 0) });
    r.spots.push({ x: r.ox + 0.8, z: r.oz - 1.6, label: '看電視新聞', fn: () => news() });
    return r;
  }
  function buyItem(name, price, hp) {
    if (G.money < price) { UI.toast('錢不夠……'); return; }
    G.money -= price; G.health = Math.min(100, G.health + hp); S.sfx('eat'); UI.toast(`${name} NT$${price}（體力 +${hp}）`);
  }
  async function esports() {
    if (G.money < 50) { UI.toast('錢不夠開台……'); return; }
    G.money -= 50;
    const res = await UI.aimGame({ title: '電競反應力盃', desc: '目標出現就點掉！30 秒內命中 20 個以上贏得網咖月賽獎金 NT$500', duration: 30, theme: 'esports' });
    if (res.hits >= 20) { G.addMoney(500, `電競月賽冠軍（命中 ${res.hits}）`); G.addCred(1, '網咖月賽奪冠'); }
    else UI.toast(`命中 ${res.hits} 個，隔壁國中生笑你了`);
  }
  async function sing() {
    if (G.money < 300) { UI.toast('包廂一小時 NT$300，錢不夠……'); return; }
    G.money -= 300;
    const res = await UI.rhythmGame();
    const pct = res.total ? res.hits / res.total : 0;
    G.health = Math.min(100, G.health + Math.round(pct * 40));
    if (pct > 0.7) G.addCred(2, '唱歌唱到隔壁包廂鼓掌');
    UI.bigText(pct > 0.85 ? '歌神降臨！' : pct > 0.6 ? '唱得不錯！' : '五音不全……', `命中 ${res.hits} / ${res.total}・紓壓體力 +${Math.round(pct * 40)}`);
  }
  function sleep() {
    const h = (G.time / 60) % 24;
    UI.fade(() => {
      const day = Math.floor(G.time / 1440);
      G.time = (h >= 6.5 ? day + 1 : day) * 1440 + 6.5 * 60;
      G.health = 100; G.saveGame();
      UI.toast('睡飽了！已存檔，早上 6:30。');
    });
  }
  const NEWS = ['北市推動人行道改善，騎樓整平工程持續進行。', '颱風季將至，氣象署提醒低窪地區民眾注意積水。', '萬福市場恢復供電，攤商感謝熱心青年協助抓賊。', '垃圾車新路線上路，請民眾配合分類。', '夜市人潮回流，雞排攤排隊一小時。', '科技執法路口增加，闖紅燈罰款六百元起。'];
  function news() { UI.subtitle('📺 晚間新聞', U.mpick(NEWS), 4200); }
  // clerks greet you when you walk in
  const GREET = {
    store: ['歡迎光臨～好鄰居！', '需要幫您微波嗎？', '集點卡要嗎？'],
    clothes: ['歡迎～新款剛到喔！', '試衣間在後面，慢慢看。'],
    barber: ['少年仔坐，今天要剪怎樣？', '要不要順便洗個頭？'],
    noodle: ['內用還外帶？', '今天牛肉燉很久喔！'],
    dealer: ['您好，今天想看哪一台？', '這台跑車剛到，要不要試坐？'],
    netcafe: ['開台嗎？包夜比較划算喔。', '泡麵加蛋十元。'],
    ktv: ['包廂準備好了，麥克風有消毒。', '最低消費一小時喔！'],
    home: ['（到家了，好累……）'],
  };
  IN.greet = (room) => { const g = GREET[room.id]; if (g) UI.subtitle(room.id === 'home' ? '' : '店員', U.mpick(g), 2600); };

  // ---------- menus ----------
  const FOOD = {
    store: [['御飯糰', 35, 35], ['大亨堡', 45, 50], ['熱美式咖啡', 45, 15, 'coffee'], ['運動飲料', 25, 10, 'coffee']],
    noodle: [['紅燒牛肉麵', 130, 100], ['滷肉飯', 45, 40], ['燙青菜', 40, 20], ['滷蛋', 15, 8]],
  };
  async function shopMenu(kind) {
    const list = FOOD[kind];
    const disc = G.hasPerk('discount') && kind === 'store' ? 0.5 : 1;
    const pick = await UI.choose(kind === 'store' ? '好鄰居便利商店' : '老王牛肉麵', kind === 'store' ? '要幫你微波嗎？' : '內用還是外帶？', list.map(([n, p, hp, fx]) => ({ title: n, meta: `NT$${Math.round(p * disc)}・體力 +${hp}${fx ? '・跑更快 60 秒' : ''}`, tag: '' })), 1);
    if (!pick) return;
    const [n, p, hp, fx] = list[pick[0]];
    const price = Math.round(p * disc);
    if (G.money < price) { UI.toast('錢不夠……'); return; }
    G.money -= price;
    G.health = Math.min(100, G.health + hp);
    G.save.egg = (G.save.egg || 0) + 1;
    if (fx === 'coffee') { G.buffT = 60; }
    S.sfx('eat');
    UI.toast(`${n} NT$${price}（體力 +${hp}）`);
    G.saveGame();
  }
  const CARS = [
    ['scooter', '二手 125 機車', 8000, '省油好停，巷子鑽得快'],
    ['sedan', '國民轎車', 45000, '四門房車，舒適耐撞'],
    ['truck', '發財車', 32000, '載貨神器，配送工作好幫手'],
    ['taxi', '退役小黃', 38000, '黃色烤漆保留，路人會想招手'],
    ['sports', '改裝跑車', 180000, '仁愛路極速的最佳拍檔'],
  ];
  const PAINT = [['#f4f4f0', '珍珠白'], ['#1c1c1c', '曜石黑'], ['#b22222', '法拉利紅'], ['#1f3f7a', '海軍藍'], ['#9aa0a6', '銀灰'], ['#2fbf71', '薄荷綠']];
  async function dealerMenu() {
    const pick = await UI.choose('寶島汽車展示中心', `你的錢包：${U.fmtMoney(G.money)}。買了的車會存在「我的車」，用手機隨時叫出來。`, CARS.map(([t, n, p, d]) => ({ title: n, meta: `${U.fmtMoney(p)}・${d}`, tag: (G.save.garage || []).some((c) => c.type === t) ? '已擁有' : '' })), 1);
    if (!pick) return;
    const [type, name, price] = CARS[pick[0]];
    if ((G.save.garage || []).length >= 20) { UI.toast('你的車庫滿了（最多 20 台）'); return; }
    if (G.money < price) { UI.toast(`還差 ${U.fmtMoney(price - G.money)}，多接點工作吧！`); return; }
    const paint = type === 'taxi' ? [0] : await UI.choose('選車色', name, PAINT.map(([c, n]) => ({ title: n, meta: c })), 1);
    if (!paint) return;
    const color = type === 'taxi' ? '#f2c318' : PAINT[paint[0]][0];
    G.money -= price;
    G.save.garage = G.save.garage || [];
    G.save.garage.push({ type, color });
    G.saveGame();
    S.sfx('mission');
    UI.bigText('恭喜交車！', `${name}・停在展示中心門口`);
    IN.pendingDelivery = { type, color };
  }
  // call one of your cars to the nearest road; only one of yours is on the street at a time
  IN.callCar = function (i) {
    const c = (G.save.garage || [])[i];
    if (!c) return;
    if (IN.current) { UI.toast('先走出室內再叫車'); return; }
    const old = G.ownedCar;
    if (old && !old.removed) {
      if (old === G.player.vehicle) { UI.toast('你正開著自己的車，先下車再叫另一台'); return; }
      if (old.garageEntry) { old.garageEntry.hp = old.dead ? 0.3 : old.hp / old.spec.hp; old.garageEntry.fuel = old.fuel; }
      G.removeVehicle(old);
    }
    const pt = Missions.nearestRoadPoint(G.player.pos.x, G.player.pos.z);
    const v = G.spawnVehicle(c.type, pt.x, pt.z, pt.h, { color: c.color, persist: true, fuel: c.fuel != null ? c.fuel : 1 });
    if (c.hp != null) v.hp = Math.max(0.2, c.hp) * v.spec.hp;
    v.owned = true;
    v.garageEntry = c;
    G.ownedCar = v;
    G.waypoint = { x: pt.x, z: pt.z };
    UI.toast('你的車已經停在路邊了（看紫色星星）');
  };

  // ---------- doors in the city ----------
  function nearestFrontage(x, z, district) {
    return W.frontages.filter((f) => !district || f.district === district).sort((a, b) => dist(a, { x, z }) - dist(b, { x, z }))[0];
  }
  function addDoor(room, f, icon, color, labelText) {
    const door = { room, x: f.x, z: f.z, nx: f.nx, nz: f.nz, icon, color };
    IN.doors.push(door);
    // glowing door frame + sign on the actual shopfront (may be recessed behind the arcade)
    let k = 0.5;
    while (k < 8 && !W.solidAt(f.x - f.nx * k, 1, f.z - f.nz * k)) k += 0.25;
    const fx = f.x - f.nx * (k - 0.12), fz = f.z - f.nz * (k - 0.12), ry = Math.atan2(f.nx, f.nz);
    const grp = new THREE.Group(); grp.position.set(fx, W.SLAB, fz); grp.rotation.y = ry;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.15), new THREE.MeshBasicMaterial({ color: 0xfff1c8 }));
    frame.position.set(0, 1.3, 0.05);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.3, 0.16), new THREE.MeshBasicMaterial({ color: 0x33424d }));
    glass.position.set(0, 1.2, 0.06);
    grp.add(frame, glass);
    if (labelText) {
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.7), new THREE.MeshBasicMaterial({ map: W.labelTex(labelText, color, '#ffffff', 512, 112) }));
      sg.position.set(0, 3.0, 0.2); grp.add(sg);
    }
    W.scene.add(grp);
    G.addInteract({ x: f.x, z: f.z, r: 2.4, label: `進入${room.name}`, cond: () => !IN.current, fn: () => IN.enter(room, door) });
  }

  IN.enter = function (room, door) {
    if (G.wanted >= 1) { UI.toast('警察在追你，店家把門拉下來了！'); return; }
    if (G.player.vehicle) return;
    UI.fade(() => {
      IN.current = { room, door };
      room.lights.forEach((l) => (l.intensity = 18));
      G.teleport(room.ox, room.oz + room.d / 2 - 1.3, Math.PI);
      G.cam.yaw = Math.PI; G.cam.pitch = 0.15;
      G.rainPts.visible = false;
      S.setRain(0);
      IN.greet(room);
      S.sfx('chime');
    });
  };
  IN.reset = function () {
    if (!IN.current) return;
    IN.current.room.lights.forEach((l) => (l.intensity = 0));
    IN.current = null;
    G.rainPts.visible = true;
  };
  IN.exit = function () {
    const cur = IN.current;
    if (!cur) return;
    UI.fade(() => {
      cur.room.lights.forEach((l) => (l.intensity = 0));
      IN.current = null;
      G.rainPts.visible = true;
      const d = cur.door;
      G.teleport(d.x + d.nx * 0.8, d.z + d.nz * 0.8, Math.atan2(d.nx, d.nz));
      if (IN.pendingDelivery) {
        const c = IN.pendingDelivery; IN.pendingDelivery = null;
        IN.callCar((G.save.garage || []).length - 1);
        void c;
      }
    });
  };

  const SHOP_ICON = { clothes: ['衣', '#232323'], barber: ['剪', '#8a2a1f'], noodle: ['麵', '#8a2a1f'], dealer: ['車', '#1b1f24'], netcafe: ['網', '#111111'], ktv: ['K', '#ff4081'] };
  IN.init = function () {
    IN.current = null;
    IN.doors.length = 0;
    const rooms = { store: buildStore(), clothes: buildClothes(), barber: buildBarber(), noodle: buildNoodle(), dealer: buildDealer(), netcafe: buildNetcafe(), ktv: buildKtv(), home: buildHome() };
    for (const r of Object.values(rooms)) {
      // exit + service spots inside every room
      G.addInteract({ x: r.ox, z: r.oz + r.d / 2 - 0.8, r: 1.6, label: '離開', cond: () => IN.current && IN.current.room === r, fn: () => IN.exit() });
      for (const s of r.spots) G.addInteract({ x: s.x, z: s.z, r: 1.8, label: s.label, cond: () => IN.current && IN.current.room === r, fn: s.fn });
    }
    for (const st of W.stores) {
      const f = W.frontages.slice().sort((a, b) => dist(a, st) - dist(b, st))[0];
      const door = { x: st.x, z: st.z, nx: st.nx, nz: st.nz };
      IN.doors.push(Object.assign(door, { room: rooms.store, icon: '鄰', color: '#1d5fbf' }));
      G.addInteract({ x: st.x, z: st.z, r: 2.6, label: '進入好鄰居便利商店', cond: () => !IN.current, fn: () => IN.enter(rooms.store, door) });
      void f;
    }
    // each region puts the same kinds of shops on its own streets
    const used = [];
    for (const key in SHOP_ICON) {
      const s = (W.region.shops || {})[key];
      if (!s) continue;
      const f = W.frontages.filter((q) => (!s[2] || q.district === s[2]) && !used.includes(q)).sort((a, b) => dist(a, { x: s[0], z: s[1] }) - dist(b, { x: s[0], z: s[1] }))[0];
      if (!f) continue;
      used.push(f);
      addDoor(rooms[key], f, SHOP_ICON[key][0], SHOP_ICON[key][1], s[3]);
    }
    // home: the flat above the scooter shop, next to its roller shutter (Taipei)
    const g = W.lmPOI.garage;
    if (g) addDoor(rooms.home, { x: g.x - 12.5, z: g.z - 6, nx: 0, nz: -1 }, '家', '#8d6e63', '我的套房');
  };

  IN.update = function (dt) {
    if (G.buffT > 0) G.buffT -= dt;
    const d = IN.current && IN.current.room.display;
    if (d) for (const g of d) g.rotation.y += dt * 0.25;
  };

  window.Interiors = IN;
})();
