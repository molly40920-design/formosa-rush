// 寶島狂飆 — traffic signals at main-road intersections, and the red-light camera
(function () {
  const W = World;
  const T = { nodes: [], cycle: 22 };
  // phase per axis: 'z' roads (running north-south) go first, then 'x' roads; two groups offset by half a cycle
  T.state = function (node, axis) {
    const t = ((G.elapsed || 0) + (node.group ? T.cycle / 2 : 0)) % T.cycle;
    if (axis === 'z') return t < 8.5 ? 'g' : t < 11 ? 'y' : 'r';
    return t < 11 ? 'r' : t < 19.5 ? 'g' : t < 22 ? 'y' : 'r';
  };
  T.at = (node) => node && node.signal;

  T.build = function () {
    T.nodes = [];
    const poles = new U.GeoBuilder(1);
    // lamp discs are merged per (group, axis, colour) so a whole set lights up with one material change
    const lamps = {}, mats = {};
    const COL = { r: '#ff2a1f', y: '#ffb300', g: '#1fe36b' };
    const disc = new THREE.CylinderGeometry(0.13, 0.13, 0.05, 12);
    for (const n of W.nodes) {
      const lx = W.X[n.i], lz = W.Z[n.j];
      if (!lx.main || !lz.main) continue;
      const roads = n.adj.filter((e) => !e.seg.ped);
      if (roads.length < 3) continue;
      n.signal = true;
      n.group = (n.i + n.j) % 2;
      T.nodes.push(n);
      // two poles on opposite corners; each carries one head per axis
      for (const [sx, sz] of [[1, 1], [-1, -1]]) {
        const px = n.x + sx * (lx.w / 2 + 1.2), pz = n.z + sz * (lz.w / 2 + 1.2);
        poles.geo(new THREE.CylinderGeometry(0.09, 0.12, 1, 8), px, W.SLAB + 2.6, pz, 1, 5.2, 1, U.col('#5b6166'));
        for (const axis of ['z', 'x']) {
          // the head on the far corner faces the traffic coming toward it
          const face = axis === 'z' ? { x: 0, z: -sz } : { x: -sx, z: 0 };
          const hx = px + (axis === 'z' ? -sx * 0.9 : 0), hz = pz + (axis === 'x' ? -sz * 0.9 : 0);
          const ry = Math.atan2(face.x, face.z);
          poles.box((px + hx) / 2, W.SLAB + 5.0, (pz + hz) / 2, axis === 'z' ? 0.9 : 0.08, 0.08, axis === 'x' ? 0.9 : 0.08, U.col('#5b6166'));
          poles.box(hx, W.SLAB + 4.4, hz, 0.42, 1.25, 0.42, U.col('#1d2124'), { ry });
          ['r', 'y', 'g'].forEach((c, k) => {
            const key = n.group + axis + c;
            if (!lamps[key]) lamps[key] = new U.GeoBuilder(1);
            lamps[key].geo(disc, hx + face.x * 0.22, W.SLAB + 4.78 - k * 0.38, hz + face.z * 0.22, 1, 1, 1, U.col('#ffffff'), { rx: Math.PI / 2, ry });
          });
        }
        W.addAABB(px - 0.15, pz - 0.15, px + 0.15, pz + 0.15, 5, 'signal');
      }
    }
    disc.dispose();
    const pm = new THREE.Mesh(poles.build(), new THREE.MeshLambertMaterial({ vertexColors: true }));
    pm.castShadow = true;
    W.scene.add(pm);
    for (const key in lamps) {
      const c = key[2];
      mats[key] = new THREE.MeshBasicMaterial({ color: COL[c] });
      mats[key].userData = { on: new THREE.Color(COL[c]).multiplyScalar(1.6), off: new THREE.Color(COL[c]).multiplyScalar(0.12) };
      W.scene.add(new THREE.Mesh(lamps[key].build(), mats[key]));
    }
    T.mats = mats;
  };

  T.update = function () {
    if (!T.mats) return;
    const probe = [{ group: 0 }, { group: 1 }];
    for (const key in T.mats) {
      const on = T.state(probe[+key[0]], key[1]) === key[2];
      T.mats[key].color.copy(on ? T.mats[key].userData.on : T.mats[key].userData.off);
    }
  };

  // distance (m, along the road) from the stop line if a vehicle heading A→B must stop for B's light, else -1
  T.mustStop = function (A, B, seg, t, crossWidth) {
    if (!B.signal) return -1;
    const st = T.state(B, seg.axis);
    if (st === 'g') return -1;
    const stopAt = seg.len - crossWidth / 2 - 4.5;
    const d = stopAt - t;
    if (d < (st === 'y' ? 3 : -0.5)) return -1; // already committed / in the box
    return d;
  };

  // red-light camera: called with the player's vehicle each frame
  let lastNode = null;
  T.checkPlayer = function (v) {
    const n = W.nearestNode(v.pos.x, v.pos.z, true);
    if (!n || !n.signal) { lastNode = null; return; }
    const lx = W.X[n.i], lz = W.Z[n.j];
    const inBox = Math.abs(v.pos.x - n.x) < lx.w / 2 && Math.abs(v.pos.z - n.z) < lz.w / 2;
    if (!inBox) { if (lastNode === n) lastNode = null; return; }
    const fx = Math.sin(v.h), fz = Math.cos(v.h);
    const axis = Math.abs(fz) > Math.abs(fx) ? 'z' : 'x';
    if (lastNode !== n) { lastNode = n; n.enteredRed = T.state(n, axis) === 'r'; n.fined = false; }
    if (!n.enteredRed || n.fined || Math.abs(v.fwd) < 3) return;
    n.fined = true;
    const fine = 600;
    G.money = Math.max(0, G.money - fine);
    UI.toast(`闖紅燈！科技執法拍到了，罰款 NT$${fine}`);
    Sound.sfx('beep');
    const cop = G.vehicles.some((o) => o.type === 'police' && Math.hypot(o.pos.x - v.pos.x, o.pos.z - v.pos.z) < 70);
    if (cop) G.crime(1.1);
  };

  window.Traffic = T;
})();
