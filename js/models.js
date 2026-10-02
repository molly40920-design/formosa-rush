// 寶島狂飆 — low-poly characters & vehicles
(function () {
  const M = {};
  const bodyMat = U.surface({ vertexColors: true, roughness: 0.74, envMapIntensity: 0.3 });
  const lightMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const paintMat = U.surface({ vertexColors: true, roughness: 0.38, metalness: 0.22, envMapIntensity: 0.8 });
  const glassMat = U.surface({ vertexColors: true, roughness: 0.18, metalness: 0.35, envMapIntensity: 1.0 });
  const clearPaint = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.22, clearcoat: 1, clearcoatRoughness: 0.16, envMapIntensity: 0.8 });
  paintMat.onBeforeCompile = (s) => {
    s.vertexShader = 'attribute float paintMask;\nvarying float vPaintMask;\n' + s.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\nvPaintMask = paintMask;');
    s.fragmentShader = 'varying float vPaintMask;\n' + s.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.85, roughnessFactor, vPaintMask);');
  };
  clearPaint.onBeforeCompile = (s) => {
    paintMat.onBeforeCompile(s);
    s.fragmentShader = s.fragmentShader.replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.clearcoat *= vPaintMask;');
  };
  const vehicleMaterials = () => [window.G && G.Q().clearcoat ? clearPaint : paintMat, lightMat, glassMat];
  M.applyQuality = function (scene) {
    scene.traverse((o) => { if (o.userData.vehicleBody && !o.userData.wrecked) o.material = vehicleMaterials(); });
  };
  M.bodyMat = bodyMat;
  M.lightMat = lightMat;
  const C = (h) => U.col(h);

  // Side silhouette extruded across X; bevels are fitted back into the specified envelope.
  function profile(g, points, width, color, bevel = 0.04, x = 0, opts = {}) {
    const shape = new THREE.Shape();
    points.forEach((p, i) => i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1]));
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: width, steps: 1, bevelEnabled: bevel > 0, bevelSegments: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 1 });
    geo.rotateY(-Math.PI / 2);
    geo.computeBoundingBox();
    const b = geo.boundingBox, size = new THREE.Vector3(); b.getSize(size);
    const minY = Math.min(...points.map(p => p[1])), maxY = Math.max(...points.map(p => p[1]));
    const minZ = Math.min(...points.map(p => p[0])), maxZ = Math.max(...points.map(p => p[0]));
    geo.translate(-b.min.x, -b.min.y, -b.min.z);
    geo.scale(width / size.x, (maxY - minY) / size.y, (maxZ - minZ) / size.z);
    g.geo(geo, x - width / 2, minY, minZ, 1, 1, 1, color, opts);
    geo.dispose();
  }
  const roundGeo = new THREE.SphereGeometry(1, 10, 6);
  function oval(g, x, y, z, w, h, d, c, opts = {}) { g.geo(roundGeo, x, y, z, w / 2, h / 2, d / 2, c, opts); }
  // Octagonal sections give shoulders, waists and fabric a soft, non-box silhouette.
  function garment(g, rings, color) {
    const sections = rings.map(([y, w, d, z = 0]) => [[-0.34*w,y,z+d/2],[0.34*w,y,z+d/2],[w/2,y,z+d*0.28],[w/2,y,z-d*0.28],[0.34*w,y,z-d/2],[-0.34*w,y,z-d/2],[-w/2,y,z-d*0.28],[-w/2,y,z+d*0.28]].map(p => new THREE.Vector3(...p)));
    for (let j = 0; j < sections.length - 1; j++) for (let i = 0; i < 8; i++) g.quad([sections[j][i], sections[j][(i+1)%8], sections[j+1][(i+1)%8], sections[j+1][i]], color);
    for (const [j, reverse] of [[0, true], [sections.length - 1, false]]) {
      const a = sections[j];
      for (let i = 1; i < 7; i++) {
        const pts = [a[0], a[i], a[i+1], a[i+1]];
        g.quad(reverse ? pts.reverse() : pts, color);
      }
    }
  }
  function panel(g, pts, color, normal, group = 2) {
    const a = pts.map(p => new THREE.Vector3(...p));
    const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(a[1], a[0]), new THREE.Vector3().subVectors(a[2], a[0]));
    if (n.dot(new THREE.Vector3(...normal)) < 0) a.reverse();
    g.quad(a, color, null, group);
  }

  // ---------------- Characters ----------------
  M.SKINS = ['#f1c8a5', '#e0b08a', '#c98f67', '#f5d3b8', '#a8714f'];
  M.SHIRTS = ['#e84b3c', '#2f6fb3', '#f2f2ee', '#232323', '#3f8f5a', '#f2c230', '#8a55b5', '#e27ba0', '#6b7b8c', '#d98a3a', '#1e8c8c', '#b3b3a8'];
  M.PANTS = ['#2b3547', '#1c1c1c', '#4d5a6a', '#6b5a45', '#9aa3ad', '#2d2d3a', '#384e2e'];
  M.HAIRS = ['#1a1410', '#2b1d15', '#3a2a1e', '#5b3b24', '#8a8a8a', '#c9a15a'];

  // a fixed pool of looks keeps the geometry cache bounded
  const PED_POOL = [];
  M.randomPedSpec = function () {
    if (PED_POOL.length < 48) { const s = makePedSpec(); PED_POOL.push(s); return s; }
    return PED_POOL[Math.floor(Math.random() * PED_POOL.length)];
  };
  function makePedSpec() {
    const female = Math.random() < 0.5;
    return {
      skin: U.mpick(M.SKINS), shirt: U.mpick(M.SHIRTS), pants: U.mpick(M.PANTS), shoes: U.mpick(['#222', '#eee', '#6b4a2e', '#333']),
      hair: U.mpick(M.HAIRS), style: female ? U.mpick(['long', 'long', 'bob', 'bun']) : U.mpick(['short', 'short', 'cap', 'bald']),
      body: female ? 'f' : 'm', top: U.mpick(['tee', 'long', 'jacket']),
      cap: U.mpick(['#1f3f7a', '#c7302b', '#222', '#eee']), skirt: female && Math.random() < 0.35, scale: U.mr(0.92, 1.05) * (female ? 0.95 : 1),
      bag: Math.random() < 0.3 ? U.mpick(['#6b4a2e', '#222', '#c7302b']) : null,
    };
  }

  const geoCache = new Map();
  // smooth shared primitives: every character part is built from these so shading stays soft
  const SPH = new THREE.SphereGeometry(1, 16, 12), SPH_S = new THREE.SphereGeometry(1, 9, 7);
  const domes = {};
  const dome = (frac) => domes[frac] || (domes[frac] = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * frac));
  const blob = (g, x, y, z, w, h, d, c, o) => g.geo(w < 0.09 && h < 0.09 ? SPH_S : SPH, x, y, z, w / 2, h / 2, d / 2, c, o || {});
  // lathe from [radius, y] pairs, squashed front-to-back for a natural torso/limb cross-section
  function lathe(g, pts, sx, sz, x, y, z, c, seg = 14) {
    const geo = new THREE.LatheGeometry(pts.map(([r, py]) => new THREE.Vector2(r, py)), seg);
    g.geo(geo, x, y, z, sx, 1, sz, c);
    geo.dispose();
  }
  // egg-shaped head: slightly narrower jaw and chin, one continuous surface
  const HEAD = (() => {
    const g = new THREE.SphereGeometry(1, 20, 16), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const jaw = y < 0 ? 1 - 0.18 * (-y) : 1;
      p.setXYZ(i, x * 0.152 * jaw, y * 0.178, z * 0.148 * (y < 0 ? 1 - 0.05 * -y : 1) + (y < 0 ? 0.012 * -y : 0));
    }
    g.computeVertexNormals();
    return g;
  })();
  const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
  function charGeos(s) {
    const key = JSON.stringify(s);
    if (geoCache.has(key)) return geoCache.get(key);
    const female = s.body === 'f';
    const skirt = s.skirt || s.bottom === 'skirt';
    const skin = C(s.skin), shirt = C(s.shirt), pants = C(s.pants || '#2b3547'), h = C(s.hair || '#1a1410');
    const hairDark = mix(s.hair || '#1a1410', '#000000', 0.25);
    const top = s.top || 'long';

    // ---- torso (hips-local, 0 → 0.64) ----
    const torso = new U.GeoBuilder(1);
    const chest = female
      ? [[0.001, -0.02], [0.185, -0.02], [0.19, 0.08], [0.165, 0.21], [0.175, 0.33], [0.195, 0.43], [0.2, 0.51], [0.17, 0.585], [0.075, 0.635], [0.001, 0.64]]
      : [[0.001, -0.02], [0.2, -0.02], [0.205, 0.09], [0.198, 0.21], [0.212, 0.33], [0.232, 0.45], [0.238, 0.52], [0.2, 0.595], [0.08, 0.64], [0.001, 0.645]];
    lathe(torso, chest, 1.08, 0.64, 0, 0, 0, shirt);
    lathe(torso, [[0.052, 0.58], [0.05, 0.7]], 1, 1, 0, 0, 0, skin, 10);
    if (top === 'tank') {
      for (const side of [-1, 1]) blob(torso, side * 0.19, 0.55, 0, 0.12, 0.1, 0.13, skin);
      blob(torso, 0, 0.6, 0.075, 0.13, 0.06, 0.05, skin);
    }
    if (top === 'tee' || top === 'long') torso.geo(new THREE.TorusGeometry(0.066, 0.012, 6, 16), 0, 0.615, 0.008, 1, 0.8, 1, U.shade(s.shirt, 0.85), { rx: Math.PI / 2 - 0.25 });
    if (top === 'hoodie') {
      blob(torso, 0, 0.6, -0.1, 0.3, 0.17, 0.15, U.shade(s.shirt, 0.92));
      blob(torso, 0, 0.2, 0.122, 0.25, 0.12, 0.035, U.shade(s.shirt, 0.88));
      for (const x of [-0.045, 0.045]) torso.box(x, 0.5, 0.14, 0.01, 0.14, 0.01, C('#efe9dd'));
    }
    if (top === 'jacket') {
      torso.box(0, 0.32, 0.137, 0.12, 0.54, 0.012, C(s.inner || '#f2f2ee'));
      for (const side of [-1, 1]) torso.box(side * 0.085, 0.53, 0.145, 0.06, 0.16, 0.014, U.shade(s.shirt, 0.82), { rz: side * 0.3 });
      torso.box(-0.07, 0.25, 0.146, 0.006, 0.42, 0.008, C('#c9c6bd'));
    }
    if (s.vest) lathe(torso, [[0.001, 0.1], [0.215, 0.1], [0.225, 0.3], [0.24, 0.45], [0.2, 0.56], [0.001, 0.57]], 1.1, 0.7, 0, 0, 0, C(s.vest));
    if (s.stripe) torso.box(0, 0.42, 0.155, 0.36, 0.05, 0.01, C(s.stripe));
    if (s.bag) {
      blob(torso, 0, 0.36, -0.17, 0.3, 0.38, 0.15, C(s.bag));
      blob(torso, 0, 0.26, -0.235, 0.22, 0.14, 0.05, U.shade(s.bag, 0.8));
      for (const x of [-0.12, 0.12]) torso.box(x, 0.38, 0.14, 0.035, 0.42, 0.012, U.shade(s.bag, 0.85));
    }
    // waistband + hips
    if (skirt) lathe(torso, [[0.001, -0.36], [0.29, -0.36], [0.255, -0.2], [0.205, -0.02], [0.195, 0.05], [0.001, 0.05]], 1.08, 0.72, 0, 0, 0, pants);
    else lathe(torso, [[0.001, -0.12], [0.2, -0.12], [0.212, -0.02], [0.205, 0.05], [0.001, 0.05]], 1.08, 0.64, 0, 0, 0, pants);

    // ---- head (0 → ~0.4) ----
    const head = new U.GeoBuilder(1);
    head.geo(HEAD, 0, 0.175, 0, 1, 1, 1, skin);
    for (const side of [-1, 1]) {
      blob(head, side * 0.152, 0.165, -0.012, 0.035, 0.07, 0.05, U.shade(s.skin, 0.97));
      // eyes: white, iris, catch-light
      blob(head, side * 0.063, 0.178, 0.127, 0.072, female ? 0.08 : 0.072, 0.03, C('#fbf9f5'));
      blob(head, side * 0.062, 0.175, 0.14, 0.045, 0.052, 0.016, C('#3a2a22'));
      blob(head, side * 0.062, 0.175, 0.146, 0.022, 0.026, 0.008, C('#140d0a'));
      blob(head, side * 0.054, 0.187, 0.151, 0.014, 0.014, 0.006, C('#ffffff'));
      if (female) head.box(side * 0.064, 0.214, 0.136, 0.066, 0.01, 0.01, C('#2a211d'), { rz: side * -0.12 });
      // soft, slightly raised brows (friendly, not angry)
      head.box(side * 0.064, 0.236, 0.128, 0.058, female ? 0.009 : 0.013, 0.012, hairDark, { rz: side * 0.1 });
      blob(head, side * 0.084, 0.13, 0.118, 0.05, 0.026, 0.018, mix(s.skin, '#f08a8a', female ? 0.4 : 0.22));
    }
    blob(head, 0, 0.145, 0.143, 0.032, 0.048, 0.03, U.shade(s.skin, 0.95));
    head.geo(new THREE.TorusGeometry(0.03, 0.0065, 6, 12, Math.PI), 0, 0.103, 0.14, 1, 0.8, 1, C('#b35b4f'), { rz: Math.PI });
    if (s.glasses) {
      for (const x of [-0.064, 0.064]) head.geo(new THREE.TorusGeometry(0.036, 0.006, 6, 16), x, 0.183, 0.152, 1, 0.85, 1, C('#23262a'));
      head.box(0, 0.19, 0.155, 0.03, 0.008, 0.008, C('#23262a'));
      for (const x of [-0.14, 0.14]) head.box(x, 0.19, 0.06, 0.008, 0.01, 0.18, C('#23262a'));
    }
    const style = s.style || 'short';
    const hatOn = s.hat === 'cap' || s.hat === 'beanie' || ['cap', 'police', 'helmet'].includes(style);
    // tilted dome sits back on the head so the forehead and face stay clear
    const cap = (c, frac = 0.52, tilt = -0.42, grow = 1) => head.geo(dome(frac), 0, 0.195, -0.012, 0.162 * grow, 0.182 * grow, 0.162 * grow, c, { rx: tilt });
    if (style !== 'bald' && style !== 'helmet' && style !== 'police' && style !== 'cap') {
      if (style === 'buzz') cap(mix(s.hair || '#1a1410', s.skin, 0.3), 0.5, -0.5, 1.02);
      else {
        cap(h, 0.6, -0.55, 1.09);
        blob(head, 0, 0.17, -0.07, 0.31, 0.24, 0.2, h);
        for (const side of [-1, 1]) blob(head, side * 0.142, 0.215, 0.0, 0.045, 0.13, 0.17, h);
        if (!hatOn) { blob(head, 0.03, 0.29, 0.1, 0.24, 0.075, 0.1, h, { rz: -0.18 }); blob(head, -0.07, 0.275, 0.11, 0.1, 0.06, 0.07, h, { rz: 0.3 }); }
      }
    }
    if (style === 'spiky' && !hatOn) {
      const spike = new THREE.ConeGeometry(0.045, 0.13, 8);
      for (const [x, z, r] of [[-0.08, 0.05, 0.4], [0, 0.07, 0], [0.08, 0.05, -0.4], [-0.05, -0.05, 0.3], [0.05, -0.05, -0.3], [0, -0.08, 0]]) head.geo(spike, x, 0.37, z, 1, 1, 1, h, { rz: r, rx: z > 0 ? 0.35 : -0.45 });
      spike.dispose();
    }
    if (style === 'long' || style === 'bob') {
      const long = style === 'long';
      blob(head, 0, long ? 0.05 : 0.15, -0.1, 0.33, long ? 0.46 : 0.27, 0.17, h);
      for (const side of [-1, 1]) blob(head, side * 0.142, long ? 0.08 : 0.15, 0.02, 0.07, long ? 0.36 : 0.22, 0.14, h);
      if (!hatOn) for (const x of [-0.07, 0.035]) blob(head, x, 0.29, 0.11, 0.14, 0.07, 0.07, h, { rz: x * 2 });
    }
    if (style === 'ponytail') {
      blob(head, 0, 0.25, -0.155, 0.075, 0.06, 0.06, C('#d6455a'));
      blob(head, 0, 0.16, -0.2, 0.11, 0.2, 0.1, h, { rx: 0.35 });
      blob(head, 0, 0.02, -0.225, 0.09, 0.2, 0.085, h, { rx: 0.15 });
    }
    if (style === 'twin') for (const side of [-1, 1]) {
      blob(head, side * 0.165, 0.23, -0.06, 0.06, 0.06, 0.06, C('#e27ba0'));
      blob(head, side * 0.19, 0.1, -0.07, 0.1, 0.24, 0.1, h, { rz: side * 0.15 });
      blob(head, side * 0.2, -0.03, -0.06, 0.075, 0.14, 0.075, h);
    }
    if (style === 'bun') { blob(head, 0, 0.36, -0.11, 0.16, 0.15, 0.15, h); blob(head, 0, 0.33, -0.08, 0.1, 0.03, 0.1, hairDark); }
    const peakCap = (c, police) => {
      head.geo(dome(0.5), 0, 0.235, 0, 0.17, 0.155, 0.168, c, { rx: -0.12 });
      blob(head, 0, 0.255, 0.165, 0.27, 0.028, 0.17, police ? C('#15191f') : U.shade(c.getHex(), 0.9));
      if (police) blob(head, 0, 0.33, 0.14, 0.05, 0.05, 0.015, C('#dab64e'));
    };
    if (style === 'cap') peakCap(C(s.cap || '#222222'));
    if (style === 'police') peakCap(C('#1b2a4a'), true);
    if (style === 'helmet') {
      blob(head, 0, 0.26, -0.005, 0.37, 0.33, 0.37, C(s.cap || '#eeeeee'));
      blob(head, 0, 0.23, 0.14, 0.28, 0.12, 0.09, C('#2f3b45'));
      head.box(0, 0.03, 0.04, 0.2, 0.02, 0.12, C('#242424'));
    }
    if (s.hat === 'cap') peakCap(C(s.hatColor || '#222222'));
    if (s.hat === 'beanie') {
      head.geo(dome(0.56), 0, 0.22, -0.01, 0.172, 0.2, 0.172, C(s.hatColor || '#222222'), { rx: -0.2 });
      head.geo(new THREE.TorusGeometry(0.162, 0.026, 8, 24), 0, 0.235, 0.012, 1, 1, 1, U.shade(s.hatColor || '#222222', 0.78), { rx: Math.PI / 2 - 0.2 });
      blob(head, 0, 0.43, -0.04, 0.07, 0.07, 0.07, C('#efe9dd'));
    }
    if (s.beard) { blob(head, 0, 0.065, 0.095, 0.22, 0.12, 0.13, h); head.box(0, 0.125, 0.147, 0.09, 0.016, 0.012, h); }

    // ---- arm (shoulder pivot, hangs to ~-0.56) ----
    const arm = new U.GeoBuilder(1), sleeve = C(s.sleeve || s.shirt);
    if (top === 'tank') lathe(arm, [[0.001, -0.47], [0.05, -0.47], [0.056, -0.3], [0.066, -0.1], [0.07, -0.01], [0.058, 0.03], [0.034, 0.05], [0.001, 0.056]], 1, 1, 0, 0, 0, skin, 12);
    else if (top === 'tee') {
      lathe(arm, [[0.001, -0.2], [0.078, -0.2], [0.082, -0.08], [0.08, -0.01], [0.068, 0.03], [0.04, 0.052], [0.001, 0.058]], 1, 1, 0, 0, 0, sleeve, 12);
      lathe(arm, [[0.001, -0.47], [0.05, -0.47], [0.055, -0.36], [0.062, -0.19], [0.001, -0.18]], 1, 1, 0, 0, 0, skin, 12);
    } else lathe(arm, [[0.001, -0.45], [0.062, -0.45], [0.067, -0.32], [0.074, -0.16], [0.08, -0.02], [0.068, 0.028], [0.04, 0.05], [0.001, 0.056]], 1, 1, 0, 0, 0, sleeve, 12);
    blob(arm, 0, -0.51, 0.008, 0.085, 0.12, 0.06, skin);
    blob(arm, 0.035, -0.49, 0.03, 0.03, 0.06, 0.03, skin, { rz: -0.4 });

    // ---- leg (hip pivot, down to the sole at -0.82) ----
    const leg = new U.GeoBuilder(1);
    const legShape = [[0.001, -0.74], [0.068, -0.74], [0.072, -0.56], [0.084, -0.38], [0.1, -0.18], [0.106, -0.02], [0.08, 0.02], [0.001, 0.035]];
    if (skirt) lathe(leg, [[0.001, -0.74], [0.056, -0.74], [0.058, -0.56], [0.07, -0.4], [0.08, -0.2], [0.001, -0.1]], 1, 1, 0, 0, 0, skin, 12);
    else if (s.bottom === 'shorts') {
      lathe(leg, [[0.001, -0.37], [0.1, -0.37], [0.103, -0.18], [0.106, -0.02], [0.001, 0.03]], 1, 1, 0, 0, 0, pants, 12);
      lathe(leg, [[0.001, -0.74], [0.058, -0.74], [0.062, -0.56], [0.075, -0.4], [0.001, -0.36]], 1, 1, 0, 0, 0, skin, 12);
    } else lathe(leg, legShape, 1, 1, 0, 0, 0, pants, 12);
    // sneaker: rounded upper, pale sole
    blob(leg, 0, -0.765, 0.04, 0.115, 0.1, 0.255, C(s.shoes || '#f2f2f2'));
    const lightShoe = new THREE.Color(s.shoes || '#f2f2f2').getHSL({}).l > 0.7;
    blob(leg, 0, -0.803, 0.045, 0.125, 0.035, 0.27, C(lightShoe ? '#c9c6bd' : '#efeee8'));
    for (const z of [0.04, 0.075, 0.11]) leg.box(0, -0.728 - z * 0.12, z, 0.07, 0.008, 0.01, C('#d5d2c8'));

    const out = { torso: torso.build(), head: head.build(), arm: arm.build(), leg: leg.build() };
    geoCache.set(key, out);
    if (geoCache.size > 160) {
      // drop the oldest entry that no live character is using
      const live = new Set();
      const G = window.G, roots = [];
      if (G) { for (const p of G.peds) roots.push(p.ch.root); if (G.player && G.player.ch) roots.push(G.player.ch.root); for (const v of G.vehicles) if (v.rider) roots.push(v.rider.root); if (G.previewRoot) roots.push(G.previewRoot); }
      for (const r of roots) r.traverse((o) => { if (o.isMesh) live.add(o.geometry); });
      for (const [k, v] of geoCache) {
        if (k === key || live.has(v.torso)) continue;
        for (const g of Object.values(v)) g.dispose();
        geoCache.delete(k);
        break;
      }
    }
    return out;
  }

  M.makeCharacter = function (spec) {
    const g = charGeos(spec);
    const root = new THREE.Group();
    const hips = new THREE.Group();
    hips.position.y = 0.82;
    root.add(hips);
    const torso = new THREE.Mesh(g.torso, bodyMat);
    hips.add(torso);
    const head = new THREE.Mesh(g.head, bodyMat);
    head.position.y = 0.66;
    hips.add(head);
    const mk = (geo, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = new THREE.Mesh(geo, bodyMat); p.add(m); m.castShadow = true; return p; };
    const ax = spec.body === 'f' ? 0.29 : 0.32;
    const armL = mk(g.arm, ax, 0.58), armR = mk(g.arm, -ax, 0.58);
    const legL = mk(g.leg, 0.12, 0), legR = mk(g.leg, -0.12, 0);
    hips.add(armL, armR, legL, legR);
    torso.castShadow = head.castShadow = true;
    root.scale.setScalar(spec.scale || 1);
    const ch = { root, hips, head, armL, armR, legL, legR, phase: Math.random() * 6, punchT: 0, spec };
    // held items (shared geometry)
    if (!M._held) {
      const pistol = new U.GeoBuilder(1);
      pistol.box(0, -0.58, 0.08, 0.06, 0.1, 0.22, C('#222')); pistol.box(0, -0.66, 0.0, 0.05, 0.14, 0.06, C('#333'));
      const bat = new U.GeoBuilder(1);
      bat.geo(new THREE.CylinderGeometry(0.05, 0.025, 1, 8), 0, -0.55, 0.38, 1, 0.9, 1, C('#b8864b'), { rx: Math.PI / 2 - 0.3 });
      M._held = { pistol: pistol.build(), bat: bat.build() };
    }
    ch.pistol = new THREE.Mesh(M._held.pistol, bodyMat);
    ch.pistol.visible = false;
    armR.add(ch.pistol);
    ch.bat = new THREE.Mesh(M._held.bat, bodyMat);
    ch.bat.visible = false;
    armR.add(ch.bat);
    ch.setWeapon = (w) => { ch.pistol.visible = w === 'pistol'; ch.bat.visible = w === 'bat'; };
    return ch;
  };

  // state: {speed, run, mode:'walk'|'sit'|'fallen'|'aim'|'dance', dt}
  M.animate = function (ch, st, dt) {
    const r = ch.root;
    if (st.mode === 'fallen') {
      r.rotation.x = U.damp(r.rotation.x, -Math.PI / 2, 10, dt);
      ch.hips.position.y = U.damp(ch.hips.position.y, 0.2, 10, dt);
      ch.legL.rotation.x = ch.legR.rotation.x = 0;
      ch.armL.rotation.z = 0.8; ch.armR.rotation.z = -0.8;
      return;
    }
    r.rotation.x = U.damp(r.rotation.x, 0, 10, dt);
    ch.armL.rotation.z = U.damp(ch.armL.rotation.z, 0.06, 10, dt);
    ch.armR.rotation.z = U.damp(ch.armR.rotation.z, -0.06, 10, dt);
    if (st.mode === 'sit') {
      ch.hips.position.y = st.seatY || 0.88;
      ch.legL.rotation.x = ch.legR.rotation.x = -1.05;
      ch.legL.rotation.z = 0.12; ch.legR.rotation.z = -0.12;
      ch.armL.rotation.x = ch.armR.rotation.x = -1.2;
      ch.hips.rotation.x = 0.08;
      return;
    }
    ch.hips.rotation.x = 0;
    ch.legL.rotation.z = ch.legR.rotation.z = 0;
    const sp = st.speed || 0;
    if (st.mode === 'dance') {
      ch.phase += dt * 8;
      ch.hips.position.y = 0.82 + Math.abs(Math.sin(ch.phase)) * 0.1;
      ch.armL.rotation.x = -2.5 + Math.sin(ch.phase) * 0.5; ch.armR.rotation.x = -2.5 - Math.sin(ch.phase) * 0.5;
      ch.legL.rotation.x = Math.sin(ch.phase) * 0.3; ch.legR.rotation.x = -Math.sin(ch.phase) * 0.3;
      return;
    }
    if (sp > 0.2) {
      ch.phase += dt * (sp * 2.4 + 2);
      const amp = Math.min(1, 0.35 + sp * 0.09);
      const s = Math.sin(ch.phase);
      ch.legL.rotation.x = s * amp;
      ch.legR.rotation.x = -s * amp;
      ch.armL.rotation.x = -s * amp * 0.8;
      ch.armR.rotation.x = s * amp * 0.8;
      ch.hips.position.y = 0.82 + Math.abs(Math.cos(ch.phase)) * 0.05 * amp;
      ch.hips.rotation.x = sp > 5 ? 0.15 : 0;
    } else {
      ch.phase += dt * 1.5;
      ch.legL.rotation.x = U.damp(ch.legL.rotation.x, 0, 12, dt);
      ch.legR.rotation.x = U.damp(ch.legR.rotation.x, 0, 12, dt);
      ch.armL.rotation.x = U.damp(ch.armL.rotation.x, 0, 12, dt);
      ch.armR.rotation.x = U.damp(ch.armR.rotation.x, 0, 12, dt);
      ch.hips.position.y = 0.82 + Math.sin(ch.phase) * 0.006;
    }
    if (st.jump) { ch.legL.rotation.x = -0.6; ch.legR.rotation.x = 0.3; ch.armL.rotation.x = ch.armR.rotation.x = -2.4; }
    if (st.mode === 'aim') { ch.armR.rotation.x = -1.55; ch.armR.rotation.z = -0.1; }
    if (ch.punchT > 0) {
      ch.punchT -= dt;
      const t = 1 - ch.punchT / 0.35;
      const k = Math.sin(Math.min(1, t) * Math.PI);
      if (st.weapon === 'bat') { ch.armR.rotation.x = -2.6 + k * 2.4; ch.armR.rotation.z = -0.4 * k; }
      else { ch.armR.rotation.x = -1.6 * k; ch.hips.rotation.y = -0.4 * k; }
    } else ch.hips.rotation.y = 0;
  };

  // ---------------- Vehicles ----------------
  M.VTYPES = {
    scooter: { len: 1.8, wid: 0.7, max: 19, accel: 8, brake: 16, grip: 14, wb: 1.25, steer: 0.62, hp: 60, two: true, seatY: 0.88, name: '機車' },
    delivery: { len: 1.9, wid: 0.7, max: 18, accel: 7.5, brake: 16, grip: 14, wb: 1.25, steer: 0.6, hp: 60, two: true, seatY: 0.88, name: '外送機車' },
    sedan: { len: 4.4, wid: 1.85, max: 34, accel: 9, brake: 20, grip: 7, wb: 2.6, steer: 0.55, hp: 170, name: '轎車' },
    taxi: { len: 4.5, wid: 1.85, max: 34, accel: 9.5, brake: 20, grip: 7.5, wb: 2.6, steer: 0.55, hp: 170, name: '計程車' },
    police: { len: 4.6, wid: 1.9, max: 40, accel: 12, brake: 22, grip: 8, wb: 2.7, steer: 0.55, hp: 220, name: '警車' },
    sports: { len: 4.3, wid: 1.95, max: 50, accel: 16, brake: 26, grip: 8.5, wb: 2.5, steer: 0.52, hp: 160, name: '跑車' },
    truck: { len: 4.6, wid: 1.75, max: 27, accel: 7, brake: 16, grip: 6.5, wb: 2.7, steer: 0.55, hp: 200, name: '發財車' },
    garbage: { len: 7, wid: 2.3, max: 16, accel: 4.5, brake: 12, grip: 6, wb: 4, steer: 0.5, hp: 400, name: '垃圾車' },
    recycle: { len: 6.4, wid: 2.2, max: 16, accel: 4.5, brake: 12, grip: 6, wb: 3.8, steer: 0.5, hp: 380, name: '資源回收車' },
    bus: { len: 11, wid: 2.5, max: 20, accel: 4, brake: 12, grip: 6, wb: 6, steer: 0.5, hp: 450, name: '公車' },
  };
  M.CAR_COLORS = ['#ececec', '#1c1c1c', '#9aa0a6', '#b22222', '#1f3f7a', '#dcdcdc', '#3a5f3a', '#c0c0c0', '#6b4c2a', '#e0d6c2'];

  const vCache = new Map();

  // Wheels share a rounded tyre, inset barrel, five spokes and a centre hub.
  function wheel(g, x, y, z, r, w) {
    const tyre = new THREE.TorusGeometry(r * 0.78, r * 0.22, 6, 16);
    g.geo(tyre,x,y,z,1,1,w/(r*0.44),C('#171a1d'),{ry:Math.PI/2});
    tyre.dispose();
    const barrel = new THREE.CylinderGeometry(r*0.60,r*0.60,w*0.82,12);
    g.geo(barrel,x,y,z,1,1,1,C('#333b43'),{rz:Math.PI/2}); barrel.dispose();
    for (const side of (x === 0 ? [-1,1] : [Math.sign(x)])) {
      const xx = x + side*w*0.45;
      for (let k=0;k<5;k++) {
        const a=k*Math.PI*2/5;
        g.box(xx,y+Math.cos(a)*r*0.29,z+Math.sin(a)*r*0.29,0.025,r*0.52,r*0.10,C('#bdc4ca'),{rx:a});
      }
      const hub = new THREE.CylinderGeometry(r*0.17,r*0.17,0.032,8);
      g.geo(hub,xx,y,z,1,1,1,C('#d7dadd'),{rz:Math.PI/2}); hub.dispose();
    }
  }
  function beam(g, a, b, thickness, color, group = 0) {
    const start=new THREE.Vector3(...a), end=new THREE.Vector3(...b), delta=end.clone().sub(start);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
    g.add(U.boxGeo,new THREE.Matrix4().compose(start.add(end).multiplyScalar(0.5),q,new THREE.Vector3(thickness,delta.length(),thickness)),color,{group});
  }
  function scooterInto(g, col, delivery) {
    const body=C(col), dark=C('#202429'), metal=C('#aeb8bf');
    wheel(g,0,0.245,0.62,0.245,0.125); wheel(g,0,0.245,-0.60,0.245,0.14);
    profile(g,[[-0.69,0.32],[-0.1,0.31],[0.06,0.45],[-0.09,0.70],[-0.46,0.77],[-0.76,0.60]],0.43,body,0.055);
    profile(g,[[-0.68,0.76],[-0.03,0.76],[0.04,0.81],[-0.04,0.87],[-0.58,0.89],[-0.7,0.85]],0.37,dark,0.025);
    profile(g,[[-0.1,0.30],[0.39,0.30],[0.42,0.37],[-0.08,0.39]],0.42,dark,0.018);
    // Open step-through area between the seat and the swept front apron.
    profile(g,[[0.28,0.35],[0.44,0.35],[0.60,0.81],[0.53,0.98],[0.42,0.88]],0.41,body,0.045);
    profile(g,[[0.38,0.47],[0.76,0.46],[0.78,0.52],[0.66,0.60],[0.49,0.58]],0.19,body,0.028);
    for (const x of [-0.085,0.085]) beam(g,[x,0.26,0.62],[x,0.80,0.49],0.034,metal);
    profile(g,[[0.42,0.97],[0.59,0.98],[0.61,1.08],[0.51,1.15],[0.40,1.08]],0.34,body,0.025);
    g.box(0,1.055,0.47,0.66,0.05,0.07,dark);
    for (const side of [-1,1]) {
      beam(g,[side*0.24,1.08,0.47],[side*0.29,1.29,0.48],0.016,metal);
      oval(g,side*0.29,1.29,0.48,0.12,0.085,0.047,dark);
      oval(g,side*0.29,1.29,0.454,0.095,0.059,0.012,metal);
      g.box(side*0.15,0.68,-0.57,0.065,0.035,0.13,metal);
    }
    g.box(0,0.90,-0.72,0.37,0.025,0.20,metal);
    profile(g,[[-0.78,0.25],[-0.37,0.24],[-0.31,0.30],[-0.42,0.36],[-0.76,0.33]],0.11,dark,0.02,0.235);
    g.box(0,0.42,-0.78,0.18,0.14,0.02,C('#eeeeea'));
    if (delivery) {
      profile(g,[[-0.90,0.94],[-0.40,0.94],[-0.40,1.44],[-0.90,1.44]],0.50,C('#159b8b'),0.035);
      g.box(0,1.21,-0.396,0.42,0.17,0.008,C('#eceee8'));
      g.box(0,1.41,-0.65,0.50,0.035,0.50,C('#13796d'));
    }
  }
  M.scooterGeo = function () {
    const g=new U.GeoBuilder(1); scooterInto(g,'#ffffff',false);
    g.box(0,1.045,0.612,0.21,0.09,0.012,C('#fff3d2')); return g.build();
  };
  M.scooterGeoLow = function () {
    // 184 triangles: the thousands of parked scooters never use the traffic model.
    const g=new U.GeoBuilder(1), w=C('#ffffff'), d=C('#222629');
    const tyre=new THREE.CylinderGeometry(0.245,0.245,0.12,8);
    for (const z of [-0.60,0.62]) g.geo(tyre,0,0.245,z,1,1,1,d,{rz:Math.PI/2});
    tyre.dispose();
    profile(g,[[-0.76,0.36],[-0.10,0.34],[0.02,0.50],[-0.08,0.74],[-0.54,0.78],[-0.76,0.62]],0.42,w,0);
    g.box(0,0.815,-0.32,0.36,0.105,0.68,d);
    g.box(0,0.34,0.17,0.40,0.075,0.50,d);
    profile(g,[[0.28,0.36],[0.44,0.36],[0.60,0.82],[0.53,1.03],[0.40,0.86]],0.40,w,0);
    g.box(0,1.05,0.47,0.66,0.045,0.07,d);
    g.box(0,0.90,-0.72,0.36,0.025,0.20,d);
    g.box(0,1.06,0.54,0.24,0.11,0.09,w);
    for (const x of [-0.29,0.29]) g.box(x,1.22,0.46,0.10,0.12,0.035,d);
    return g.build();
  };
  function vehicleGeo(type,col) {
    const key=type+col;
    if (vCache.has(key)) return vCache.get(key);
    const g=new U.GeoBuilder(3), spec=M.VTYPES[type], len=spec.len, w=spec.wid;
    const body=C(col), glass=C('#526673'), dark=C('#20252b'), trim=C('#b4bec5');
    const L=(x,y,z,ww,h,d,c) => g.box(x,y,z,ww,h,d,C(c),{group:1});
    const windows=(bottom,top,zb,zf,rt,ft,wb,wt) => {
      // A tapered glasshouse with sloped front/rear glass, paint roof and structural pillars.
      panel(g,[[-wb,bottom,zf],[wb,bottom,zf],[wt,top,ft],[-wt,top,ft]],glass,[0,1,1]);
      panel(g,[[wb,bottom,zb],[-wb,bottom,zb],[-wt,top,rt],[wt,top,rt]],glass,[0,1,-1]);
      for (const side of [-1,1]) {
        panel(g,[[side*wb,bottom,zb],[side*wb,bottom,zf],[side*wt,top,ft],[side*wt,top,rt]],glass,[side,0,0]);
        for (const [z,tz] of [[zb,rt],[zf,ft],[(zb+zf)*0.5,(rt+ft)*0.5]]) beam(g,[side*wb,bottom,z],[side*wt,top,tz],0.055,body);
        beam(g,[side*wb,bottom,zb],[side*wb,bottom,zf],0.035,trim);
      }
      profile(g,[[rt-0.045,top-0.015],[ft+0.045,top-0.015],[ft,top+0.065],[rt,top+0.065]],wt*2+0.07,body,0.025);
    };
    const ends=(front,rear,y) => {
      for (const side of [-1,1]) {
        L(side*w*0.33,y,front, w*0.20,0.12,0.035,'#fff4d8');
        L(side*w*0.36,y,rear,w*0.16,0.13,0.035,'#e52216');
        L(side*w*0.43,y,front-0.015,0.06,0.08,0.045,'#ffac31');
      }
      for (const z of [front,rear]) g.box(0,y-0.11,z,0.43,0.12,0.037,C('#e4e5df'));
    };
    if (spec.two) {
      scooterInto(g,col,type==='delivery');
      L(0,1.045,0.613,0.21,0.09,0.015,'#fff4d8');
      L(0,0.64,-0.763,0.24,0.08,0.02,'#ee281b');
      for (const x of [-0.17,0.17]) L(x,0.88,0.547,0.055,0.07,0.025,'#ffac31');
    } else if (['sedan','taxi','police','sports'].includes(type)) {
      const sports=type==='sports', wr=sports?0.34:0.33, roof=sports?1.16:1.46;
      const front=spec.wb/2, rear=-spec.wb/2, belt=sports?0.79:0.90;
      const points=[[-len/2,0.35]];
      for (const z of [rear,front]) {
        points.push([z-wr-0.065,0.35]);
        for (let k=0;k<=8;k++) { const a=Math.PI-k*Math.PI/8; points.push([z+Math.cos(a)*(wr+0.055),wr+Math.sin(a)*(wr+0.055)]); }
      }
      points.push([len/2,0.35],[len/2,0.60],[len/2-0.18,belt-0.07],[0.85,belt],[-0.95,belt+0.015],[-len/2+0.16,belt-0.04],[-len/2,0.64]);
      profile(g,points,w-0.055,body,0.035);
      g.box(0,0.34,0,w*0.68,0.12,spec.wb,dark);
      windows(belt+0.01,roof,-len*0.30,len*0.23,-len*0.17,len*0.09,w*0.455,w*(sports?0.355:0.365));
      for (const side of [-1,1]) {
        for (const z of [front,rear]) wheel(g,side*(w/2-0.115),wr,z,wr,0.23);
        for (const z of [-0.68,0.54]) g.box(side*(w/2-0.019),belt-0.105,z,0.016,0.027,0.18,trim);
        // Door seams and mirror shells stay inside the collision width.
        beam(g,[side*(w/2-0.024),0.43,-0.08],[side*(w/2-0.024),belt,-0.08],0.009,dark);
        oval(g,side*(w/2-0.065),belt+0.16,len*0.18,0.16,0.10,0.22,body);
        g.box(side*(w/2-0.065),belt+0.16,len*0.18-0.106,0.105,0.06,0.012,glass,{group:2});
      }
      g.box(0,0.48,len/2-0.01,w*0.47,0.15,0.04,dark);
      for (const y of [0.43,0.49,0.55]) g.box(0,y,len/2+0.012,w*0.43,0.013,0.01,trim);
      ends(len/2-0.018,-len/2+0.01,sports?0.64:0.72);
      if (sports) {
        g.box(0,0.91,-len/2+0.22,w*0.85,0.05,0.30,dark);
        for (const x of [-0.58,0.58]) g.box(x,0.82,-len/2+0.22,0.055,0.20,0.06,dark);
      }
      if (type==='taxi') {
        profile(g,[[-0.36,roof+0.07],[-0.05,roof+0.07],[-0.10,roof+0.27],[-0.31,roof+0.27]],0.59,C('#f4eed1'),0.02);
        L(0,roof+0.18,-0.047,0.47,0.10,0.015,'#ffd662');
        for (const x of [-0.14,-0.05,0.04,0.13]) g.box(x,roof+0.18,-0.035,0.035,0.07,0.012,dark);
        for (const side of [-1,1]) g.box(side*(w/2-0.022),0.57,0,0.015,0.05,len*0.69,dark);
      }
      if (type==='police') {
        for (const side of [-1,1]) {
          g.box(side*(w/2-0.018),0.78,0,0.016,0.15,len*0.73,C('#20579e'));
          oval(g,side*(w/2-0.005),0.73,0.36,0.012,0.17,0.14,C('#d5b951'));
        }
        g.box(0,roof+0.095,-0.20,1.24,0.055,0.32,dark);
      }
    } else if (type==='bus') {
      const busSide=[[-5.5,0.55]];
      for (const z of [-3,3]) {
        busSide.push([z-0.57,0.55]);
        for (let k=0;k<=8;k++) { const a=Math.PI-k*Math.PI/8; busSide.push([z+Math.cos(a)*0.555,0.50+Math.sin(a)*0.555]); }
      }
      busSide.push([5.5,0.55],[5.5,2.88],[5.28,3.17],[-5.25,3.17],[-5.5,2.96]);
      profile(g,busSide,w-0.06,body,0.06);
      for (const side of [-1,1]) {
        for (let z=-4.55;z<4.5;z+=1.3) panel(g,[[side*1.228,1.62,z],[side*1.228,1.62,z+1.15],[side*1.228,2.75,z+1.15],[side*1.228,2.75,z]],glass,[side,0,0]);
        g.box(side*1.228,1.16,-0.1,0.022,0.25,10.6,C('#307c5b'));
        for (const z of [-3.0,3.0]) wheel(g,side*1.08,0.50,z,0.50,0.34);
      }
      panel(g,[[-1.1,1.39,5.502],[1.1,1.39,5.502],[1.08,2.71,5.48],[-1.08,2.71,5.48]],glass,[0,0,1]);
      panel(g,[[-1.09,1.8,-5.502],[1.09,1.8,-5.502],[1.09,2.73,-5.49],[-1.09,2.73,-5.49]],glass,[0,0,-1]);
      // Taiwanese city bus: right-side folding doors and rooftop HVAC.
      for (const z of [3.65,-0.4]) {
        g.box(1.24,1.54,z,0.012,2.04,1.04,dark);
        for (const dz of [-0.25,0.25]) g.box(1.248,1.74,z+dz,0.012,1.49,0.43,glass,{group:2});
        g.box(1.25,0.57,z,0.014,0.055,1.03,trim);
      }
      profile(g,[[-1.8,3.17],[1.3,3.17],[1.12,3.39],[-1.64,3.39]],1.60,C('#d3d6d2'),0.055);
      g.box(0,2.94,5.445,1.90,0.27,0.03,dark);
      // Segmented route-display pixels, not a solid luminous rectangle.
      for (let i=0;i<12;i++) L(-0.77+i*0.14,2.94,5.468,0.074,0.10,0.012,'#ffb646');
      for (const side of [-1,1]) beam(g,[side*0.10,1.43,5.526],[side*0.78,1.88,5.526],0.022,dark);
      ends(5.484,-5.484,0.95);
    } else {
      const small=type==='truck', gar=type==='garbage', front=len/2, cabBack=front-(small?1.58:1.95);
      const cabTop=small?1.91:2.46, cabBelt=small?1.12:1.48, cabW=w-0.11;
      const cabSide=[[cabBack,0.53]], wheelR=small?0.34:0.46;
      for (let k=0;k<=8;k++) {
        const a=Math.PI-k*Math.PI/8, z=spec.wb/2+Math.cos(a)*(wheelR+0.06);
        if (z>cabBack && z<front) cabSide.push([z,wheelR+Math.sin(a)*(wheelR+0.06)]);
      }
      cabSide.push([front,0.53],[front,cabBelt],[front-0.19,cabTop-0.12],[front-0.38,cabTop],[cabBack+0.12,cabTop],[cabBack,cabTop-0.16]);
      profile(g,cabSide,cabW,body,0.045);
      const windZ=front-0.11;
      panel(g,[[-cabW*0.43,cabBelt,front+0.004],[cabW*0.43,cabBelt,front+0.004],[cabW*0.41,cabTop-0.20,windZ-0.075],[-cabW*0.41,cabTop-0.20,windZ-0.075]],glass,[0,0,1]);
      for (const side of [-1,1]) {
        const x=side*(cabW/2+0.006);
        panel(g,[[x,cabBelt,cabBack+0.14],[x,cabBelt,front-0.13],[x,cabTop-0.23,front-0.30],[x,cabTop-0.23,cabBack+0.14]],glass,[side,0,0]);
        g.box(x,cabBelt-0.17,cabBack+0.35,0.022,0.03,0.18,trim);
        g.box(side*(w/2-0.045),cabBelt+0.14,front-0.32,0.07,0.22,0.14,dark);
      }
      g.box(0,0.51,-0.10,w*0.72,0.20,len-0.3,dark);
      const rear=-len/2+0.10, end=cabBack-0.10, cargoLen=end-rear, center=(rear+end)/2;
      if (small) {
        g.box(0,0.78,center,w-0.04,0.13,cargoLen,C('#a8adb0'));
        for (const side of [-1,1]) {
          g.box(side*(w/2-0.04),1.025,center,0.055,0.40,cargoLen,body);
          for (let z=rear+0.25;z<end;z+=0.65) g.box(side*(w/2-0.008),1.025,z,0.018,0.34,0.032,trim);
        }
        g.box(0,1.025,rear,w-0.05,0.40,0.06,body);
        g.box(0,1.025,end,w-0.05,0.40,0.06,body);
        for (const z of [center-0.43,center+0.35]) profile(g,[[z-0.3,0.85],[z+0.3,0.85],[z+0.3,1.30],[z-0.3,1.30]],0.65,C('#8c653f'),0.025);
      } else if (gar) {
        profile(g,[[rear,0.85],[end,0.85],[end,2.90],[end-0.24,3.06],[rear+0.65,3.06],[rear+0.13,2.45]],w-0.05,body,0.09);
        for (const side of [-1,1]) {
          g.box(side*(w/2-0.012),1.31,center,0.018,0.24,cargoLen-0.20,C('#36723a'));
          beam(g,[side*0.90,1.08,rear+0.20],[side*0.90,2.66,rear+0.68],0.11,trim);
        }
        profile(g,[[rear-0.075,0.62],[rear+0.50,0.70],[rear+0.52,1.28],[rear-0.075,1.03]],w-0.20,dark,0.04);
        panel(g,[[-0.83,1.17,rear-0.005],[0.83,1.17,rear-0.005],[0.78,2.14,rear+0.025],[-0.78,2.14,rear+0.025]],dark,[0,0,-1],0);
      } else {
        g.box(0,0.92,center,w-0.05,0.20,cargoLen,C('#bcc3c5'));
        for (const side of [-1,1]) {
          g.box(side*(w/2-0.045),1.30,center,0.06,0.62,cargoLen,C('#286599'));
          for (const y of [1.7,2.1,2.55]) g.box(side*(w/2-0.045),y,center,0.045,0.045,cargoLen,trim);
          for (let z=rear;z<=end;z+=0.8) g.box(side*(w/2-0.045),1.96,z,0.055,1.20,0.055,trim);
        }
        g.box(0,1.29,rear,w-0.05,0.6,0.065,C('#286599'));
        for (let i=0;i<6;i++) oval(g,(i%2?1:-1)*0.48,1.53+Math.floor(i/2)*0.10,rear+0.5+Math.floor(i/2)*0.9,0.72,0.93,0.72,C(['#87a0ad','#a19a75','#54826c'][i%3]));
      }
      const wr=small?0.34:0.46;
      for (const z of [spec.wb/2,-spec.wb/2]) for (const side of [-1,1]) wheel(g,side*(w/2-0.14),wr,z,wr,0.28);
      g.box(0,0.80,front-0.005,w*0.47,0.20,0.04,dark);
      ends(front-0.018,-len/2+0.06,small?0.87:1.05);
      if (!small) L(0,cabTop+0.075,front-0.70,0.64,0.12,0.23,'#ffae30');
    }
    const geo=g.build(), colors=geo.attributes.color;
    // Explicit paint mask keeps black paint glossy while tyres and upholstery stay matte.
    const mask=new Float32Array(colors.count);
    for (let i=0;i<colors.count;i++) mask[i] = Math.abs(colors.getX(i)-body.r)<1e-5 && Math.abs(colors.getY(i)-body.g)<1e-5 && Math.abs(colors.getZ(i)-body.b)<1e-5 ? 1 : 0;
    geo.setAttribute('paintMask',new THREE.Float32BufferAttribute(mask,1));
    vCache.set(key,geo); return geo;
  }
  const sirenR = new THREE.MeshBasicMaterial({ color: 0xff2020 });
  const sirenB = new THREE.MeshBasicMaterial({ color: 0x2050ff });
  M.sirenMats = [sirenR, sirenB];
  const sirenGeo = new THREE.BoxGeometry(0.55, 0.14, 0.28);

  M.makeVehicle = function (type, color) {
    const spec = M.VTYPES[type];
    const col = color || (type === 'garbage' ? '#f2c318' : type === 'recycle' ? '#f4f4f0' : type === 'taxi' ? '#f2c318' : type === 'police' ? '#f4f4f4' : type === 'bus' ? '#eceee8' : type === 'truck' ? '#2d5aa0' : type === 'delivery' ? '#f4f4f4' : U.mpick(M.CAR_COLORS));
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(vehicleGeo(type, col), vehicleMaterials());
    mesh.userData.vehicleBody = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (type === 'police') {
      const cabTop = 1.64;
      const a = new THREE.Mesh(sirenGeo, sirenR), b = new THREE.Mesh(sirenGeo, sirenB);
      a.position.set(0.3, cabTop, -0.2); b.position.set(-0.3, cabTop, -0.2);
      group.add(a, b);
      group.userData.siren = [a, b];
    }
    return { group, mesh, spec, color: col };
  };

  // ---------------- Props ----------------
  const pickupGeo = {};
  M.pickupMesh = function (kind) {
    if (pickupGeo[kind]) { const m = new THREE.Mesh(pickupGeo[kind], [bodyMat, lightMat]); m.castShadow = true; return m; }
    const g = new U.GeoBuilder(2);
    if (kind === 'pistol') { g.box(0, 0, 0.05, 0.12, 0.2, 0.5, C('#222')); g.box(0, -0.2, -0.1, 0.1, 0.3, 0.14, C('#3a2a1a')); }
    else if (kind === 'bat') g.geo(new THREE.CylinderGeometry(0.08, 0.04, 1, 8), 0, 0, 0, 1, 1.1, 1, C('#b8864b'), { rz: 0.6 });
    else if (kind === 'armor') { g.box(0, 0, 0, 0.6, 0.7, 0.25, C('#23466e')); g.box(0, 0.1, 0.13, 0.4, 0.2, 0.02, C('#e0e0e0')); }
    else if (kind === 'cash') { g.box(0, 0, 0, 0.5, 0.2, 0.3, C('#3aa35b')); g.box(0, 0.11, 0, 0.2, 0.01, 0.3, C('#e8e2c8')); }
    else if (kind === 'boba') {
      g.geo(new THREE.CylinderGeometry(0.17, 0.13, 1, 12), 0, 0, 0, 1, 0.5, 1, C('#d9b38c'));
      g.geo(new THREE.CylinderGeometry(0.175, 0.175, 1, 12), 0, 0.26, 0, 1, 0.04, 1, C('#f4f4f4'));
      g.box(0.04, 0.42, 0, 0.04, 0.4, 0.04, C('#e84b3c'), { rz: 0.2 });
      for (let k = 0; k < 8; k++) g.box(U.mr(-0.09, 0.09), -0.19, U.mr(-0.09, 0.09), 0.06, 0.06, 0.06, C('#2a1a12'), { group: 1 });
    } else if (kind === 'health') { g.box(0, 0, 0, 0.5, 0.18, 0.18, C('#e23b3b')); g.box(0, 0, 0, 0.18, 0.5, 0.18, C('#e23b3b')); }
    pickupGeo[kind] = g.build();
    const m = new THREE.Mesh(pickupGeo[kind], [bodyMat, lightMat]);
    m.castShadow = true;
    return m;
  };

  window.Models = M;
})();
