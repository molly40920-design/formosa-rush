// 寶島狂飆 — outdoor city life: the night market and gas stations
(function () {
  const W = World, S = Sound;
  const CITY = {};
  const C = (h) => U.col(h);
  const near = (x, z, r) => Math.hypot(G.player.pos.x - x, G.player.pos.z - z) < r;

  // ---------- 寧夏夜市 ----------
  const STALLS = [['豪大雞排', '#e53935', 70, 40], ['黑糖珍奶', '#6d4c41', 60, 15], ['蚵仔煎', '#fb8c00', 70, 35], ['臭豆腐', '#8e24aa', 60, 30], ['大腸包小腸', '#c62828', 65, 35], ['烤玉米', '#fdd835', 50, 20], ['芒果冰', '#ff7043', 80, 15], ['射氣球', '#1e88e5', 0, 0]];
  function buildNightMarket() {
    const nm = W.region.nightMarket;
    CITY.lanternMat = null; CITY.stalls = [];
    if (!nm) return;
    const z = nm.z, x0 = nm.xa + 20, x1 = nm.xb - 16, mid = (nm.xa + nm.xb) / 2;
    W.nightMarket = { x0: x0 + 2, x1: x1 - 2, z };
    const g = new U.GeoBuilder(2);
    const lamps = new U.GeoBuilder(1);
    let k = 0;
    CITY.stalls = [];
    for (let x = x0; x <= x1; x += 8) {
      if (Math.abs(x - mid) < 7) continue; // the crossing street
      for (const side of [-1, 1]) {
        const sx = x, sz = z + side * 3.3;
        const [name, col] = STALLS[k % STALLS.length];
        // cart with a lit counter, awning and a hanging sign
        g.box(sx, 0.5, sz, 2.6, 1, 1.4, C('#b0b7bd'));
        g.box(sx, 1.02, sz, 2.7, 0.05, 1.5, C('#e8e4dc'));
        g.box(sx, 2.35, sz + side * 0.3, 3, 0.08, 2.2, C(col), { rx: side * 0.12 });
        for (const px of [-1.35, 1.35]) g.box(sx + px, 1.2, sz + side * 0.55, 0.06, 2.3, 0.06, C('#555555'));
        g.box(sx, 1.9, sz - side * 0.72, 2.2, 0.5, 0.06, C('#fffbe8'), { group: 1 });
        for (let i = 0; i < 5; i++) g.box(sx - 1 + i * 0.5, 1.12, sz, 0.3, 0.14, 0.3, C(U.mpick(['#f4c38a', '#d9864a', '#fff3c4', '#b35b3a'])));
        W.addAABB(sx - 1.35, sz - 0.75, sx + 1.35, sz + 0.75, 1.2, 'stall');
        const label = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.46), new THREE.MeshBasicMaterial({ map: W.labelTex(name, col, '#ffffff', 512, 112) }));
        label.position.set(sx, 1.9, sz - side * 0.76); label.rotation.y = side > 0 ? Math.PI : 0;
        W.scene.add(label);
        CITY.stalls.push({ name, x: sx, z: sz - side * 1.6, side, def: STALLS[k % STALLS.length] });
        k++;
      }
    }
    // strings of red lanterns criss-crossing the street
    for (let x = x0; x <= x1; x += 4) for (const dz of [-1.6, 1.6]) lamps.geo(new THREE.SphereGeometry(0.22, 8, 6), x, 3.3 + Math.sin(x) * 0.08, z + dz, 1, 1.25, 1, C('#ff3b2f'));
    g.box((x0 + x1) / 2, 3.35, z - 1.6, x1 - x0, 0.02, 0.02, C('#333333'));
    g.box((x0 + x1) / 2, 3.35, z + 1.6, x1 - x0, 0.02, 0.02, C('#333333'));
    const mesh = new THREE.Mesh(g.build(), [new THREE.MeshLambertMaterial({ vertexColors: true }), new THREE.MeshBasicMaterial({ vertexColors: true })]);
    mesh.castShadow = true;
    W.scene.add(mesh);
    CITY.lanternMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xff2a1a });
    W.scene.add(new THREE.Mesh(lamps.build(), CITY.lanternMat));
    // entrance arches at both ends
    for (const ax of [x0 - 4, x1 + 4]) {
      const arch = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.6), new THREE.MeshBasicMaterial({ map: W.labelTex(nm.name, '#b71c1c', '#ffe082'), side: THREE.DoubleSide }));
      arch.position.set(ax, 5.2, z); arch.rotation.y = Math.PI / 2; W.scene.add(arch);
      for (const dz of [-4.8, 4.8]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.2, 0.35), new THREE.MeshLambertMaterial({ color: 0x8a2a1f })); post.position.set(ax, 2.6, z + dz); W.scene.add(post); }
    }
    W.lmPOI.nightmarket = { x: (x0 + x1) / 2, z, name: nm.name };
    // food and the balloon game (evening only)
    const open = () => { const h = (G.time / 60) % 24; return h >= 17 || h < 2; };
    for (const st of CITY.stalls) {
      const [name, , price, hp] = st.def;
      if (name === '射氣球') {
        G.addInteract({ x: st.x, z: st.z, r: 2, cond: open, label: '玩射氣球（NT$100）', fn: () => balloonGame() });
      } else {
        G.addInteract({ x: st.x, z: st.z, r: 2, cond: open, label: `買${name} NT$${price}（體力 +${hp}）`, fn: () => {
          if (G.money < price) { UI.toast('錢不夠……'); return; }
          G.money -= price; G.health = Math.min(100, G.health + hp);
          S.sfx('eat'); UI.subtitle('老闆', U.mpick(['好吃再來喔！', '剛炸好的，小心燙！', '幫你多加一點～', '要不要辣？我幫你加小辣。']), 2200);
        } });
      }
    }
  }
  async function balloonGame() {
    if (G.money < 100) { UI.toast('錢不夠……'); return; }
    G.money -= 100;
    const res = await UI.aimGame({ title: '射氣球', desc: '30 秒內點掉越多氣球越好！打中 15 顆送娃娃（NT$300）', duration: 30, theme: 'balloon' });
    if (res.hits >= 15) { G.addMoney(300, `射中 ${res.hits} 顆氣球`); UI.bigText('大獎！', '老闆送你一隻熊熊娃娃（折現 NT$300）'); }
    else UI.toast(`射中 ${res.hits} 顆，差一點點！`);
  }

  // ---------- gas stations ----------
  function buildGas() {
    const g = new U.GeoBuilder(2);
    for (const site of W.gasSites) {
      const [x0, z0, x1, z1] = site.rect;
      const cx = site.x, cz = site.z;
      g.box(cx, W.SLAB + 0.02, cz, x1 - x0 - 0.4, 0.04, z1 - z0 - 0.4, C('#6c7074'));
      // canopy on four columns
      const cw = 16, cd = 10, ch = 5.2;
      g.box(cx, ch, cz, cw, 0.5, cd, C('#f4f4f4'));
      g.box(cx, ch - 0.1, cz, cw + 0.3, 0.3, cd + 0.3, C('#d32f2f'));
      g.box(cx, ch - 0.35, cz, cw - 1, 0.04, cd - 1, C('#fffbf0'), { group: 1 });
      for (const [px, pz] of [[-6, -3.5], [6, -3.5], [-6, 3.5], [6, 3.5]]) {
        g.box(cx + px, ch / 2, cz + pz, 0.45, ch, 0.45, C('#e0e0e0'));
        W.addAABB(cx + px - 0.25, cz + pz - 0.25, cx + px + 0.25, cz + pz + 0.25, ch, 'gas');
      }
      // two pump islands
      for (const pz of [-1.8, 1.8]) {
        g.box(cx, W.SLAB + 0.12, cz + pz, 6, 0.25, 1.1, C('#bdbdbd'));
        for (const px of [-1.6, 1.6]) {
          g.box(cx + px, W.SLAB + 1, cz + pz, 0.8, 1.7, 0.6, C('#f5f5f5'));
          g.box(cx + px, W.SLAB + 1.35, cz + pz, 0.82, 0.35, 0.62, C('#d32f2f'));
          g.box(cx + px, W.SLAB + 1.1, cz + pz + 0.32, 0.5, 0.3, 0.02, C('#9be7ff'), { group: 1 });
        }
        W.addAABB(cx - 3, cz + pz - 0.55, cx + 3, cz + pz + 0.55, 1.8, 'pump');
      }
      // brand pylon at the road corner
      const px = site.sx > 0 ? x0 + 1.5 : x1 - 1.5, pz = site.sz > 0 ? z0 + 1.5 : z1 - 1.5;
      g.box(px, 3.5, pz, 0.5, 7, 0.5, C('#9e9e9e'));
      const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 0.3), new THREE.MeshBasicMaterial({ map: U.canvasTex(256, 220, (c) => {
        c.fillStyle = '#d32f2f'; c.fillRect(0, 0, 256, 220); c.fillStyle = '#fff'; c.fillRect(12, 12, 232, 70);
        c.fillStyle = '#d32f2f'; c.font = `900 44px ${W.FONT}`; c.textAlign = 'center'; c.fillText('寶島石油', 128, 64);
        c.fillStyle = '#fff'; c.font = `700 30px ${W.FONT}`; c.fillText('95 無鉛 29.8', 128, 130); c.fillText('98 無鉛 31.3', 128, 180);
      }) }));
      sign.position.set(px, 6.2, pz); sign.rotation.y = Math.atan2(-site.sx, -site.sz); W.scene.add(sign);
      W.addAABB(px - 0.3, pz - 0.3, px + 0.3, pz + 0.3, 7, 'pylon');
      site.pump = { x: cx, z: cz };
      G.addInteract({
        x: cx, z: cz, r: 7, vehicleOk: true,
        cond: () => { const v = G.player.vehicle; return !!v && v.fuel < 0.98 && Math.abs(v.fwd) < 1.5; },
        label: () => { const v = G.player.vehicle; return `加滿油 NT$${fuelCost(v)}（目前 ${Math.round(v.fuel * 100)}%）`; },
        fn: () => {
          const v = G.player.vehicle; if (!v) return;
          const cost = fuelCost(v);
          if (G.money < cost) { UI.toast('錢不夠加油……'); return; }
          G.money -= cost; v.fuel = 1; v.lowWarned = v.emptyWarned = false;
          S.sfx('cash'); UI.subtitle('加油站員', U.mpick(['95 加滿好了～發票要載具嗎？', '好了！送你一包面紙。', '加滿了，開車小心喔！']), 2400);
        },
      });
    }
    const mesh = new THREE.Mesh(g.build(), [new THREE.MeshLambertMaterial({ vertexColors: true }), new THREE.MeshBasicMaterial({ vertexColors: true })]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    W.scene.add(mesh);
  }
  const fuelCost = (v) => Math.max(10, Math.round((1 - v.fuel) * (v.spec.two ? 5 : v.spec.len > 6 ? 90 : 40) * 29.8));

  CITY.build = function () { buildNightMarket(); buildGas(); };
  CITY.update = function () {
    if (W.glowMat) W.glowMat.opacity = 0.1 + G.night * 0.85;
    if (CITY.lanternMat) CITY.lanternMat.emissive.setRGB(0.3 + G.night * 1.2, 0.05 + G.night * 0.12, 0.02);
  };
  window.City = CITY;
})();
