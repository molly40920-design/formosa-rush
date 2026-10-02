// 寶島狂飆 — shared helpers
(function () {
  const U = {};

  // Seeded RNG so the city is identical every visit
  U.seed = function (s) {
    let a = s >>> 0;
    U.rngState = () => a >>> 0;
    U.rand = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.seed(20260929);
  U.rr = (a, b) => a + (b - a) * U.rand();
  U.ri = (a, b) => Math.floor(U.rr(a, b + 1));
  U.pick = (arr) => arr[Math.floor(U.rand() * arr.length)];
  U.mr = (a, b) => a + (b - a) * Math.random();
  U.mpick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.damp = (a, b, lambda, dt) => U.lerp(a, b, 1 - Math.exp(-lambda * dt));
  U.wrapAngle = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  U.dampAngle = (a, b, lambda, dt) => a + U.wrapAngle(b - a) * (1 - Math.exp(-lambda * dt));
  U.dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
  U.fmtMoney = (n) => 'NT$ ' + Math.round(n).toLocaleString('en-US');
  U.store = {
    get(k, d) { try { const v = localStorage.getItem('taipeirush.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('taipeirush.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };

  const _c = new THREE.Color();
  U.col = (hex) => _c.set(hex).clone();
  U.shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return c; };

  // ---------- Geometry builder: merges many primitives into one mesh (with material groups) ----------
  class GeoBuilder {
    constructor(nGroups = 1) {
      this.parts = [];
      for (let i = 0; i < nGroups; i++) this.parts.push({ pos: [], nor: [], uv: [], col: [], idx: [] });
    }
    _push(g, geom, m, color, uvFn, colorFn) {
      const P = this.parts[g];
      const base = P.pos.length / 3;
      const pa = geom.attributes.position, na = geom.attributes.normal, ua = geom.attributes.uv;
      const v = new THREE.Vector3(), n = new THREE.Vector3();
      const nm = new THREE.Matrix3().getNormalMatrix(m);
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i);
        const lx = v.x, ly = v.y, lz = v.z;
        v.applyMatrix4(m);
        n.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
        // degenerate triangles give zero normals, which turn into NaN pixels in the shader
        if (n.lengthSq() < 1e-10 || n.x !== n.x) n.set(0, 1, 0);
        P.pos.push(v.x, v.y, v.z);
        P.nor.push(n.x, n.y, n.z);
        let u = ua ? ua.getX(i) : 0, w = ua ? ua.getY(i) : 0;
        if (uvFn) { const r = uvFn(u, w, n, lx, ly, lz, i); u = r[0]; w = r[1]; }
        P.uv.push(u, w);
        const c = colorFn ? colorFn(n, ly, i) : color;
        P.col.push(c.r, c.g, c.b);
      }
      if (geom.index) { const ia = geom.index.array; for (let i = 0; i < ia.length; i++) P.idx.push(base + ia[i]); }
      else for (let i = 0; i < pa.count; i++) P.idx.push(base + i);
    }
    add(geom, m, color, opts = {}) { this._push(opts.group || 0, geom, m, color, opts.uvFn, opts.colorFn); return this; }
    // box centered at (x,y,z) with size, optional yaw
    box(x, y, z, w, h, d, color, opts = {}) {
      const g = U.boxGeo;
      const m = new THREE.Matrix4();
      m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(opts.rx || 0, opts.ry || 0, opts.rz || 0)), new THREE.Vector3(w, h, d));
      let uvFn = opts.uvFn;
      if (opts.facade) {
        const cw = opts.facade[0], ch = opts.facade[1], v0 = opts.facade[2] || 0, u0 = opts.facade[3] || 0;
        uvFn = (u, v, n) => {
          if (Math.abs(n.y) > 0.5) return [0.01, 0.01];
          const faceW = Math.abs(n.x) > 0.5 ? d : w;
          return [u0 + (u * faceW) / cw, v0 + (v * h) / ch];
        };
      }
      this._push(opts.group || 0, g, m, color, uvFn, opts.colorFn);
      return this;
    }
    geo(geom, x, y, z, sx, sy, sz, color, opts = {}) {
      const m = new THREE.Matrix4();
      m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(opts.rx || 0, opts.ry || 0, opts.rz || 0)), new THREE.Vector3(sx, sy, sz));
      this._push(opts.group || 0, geom, m, color, opts.uvFn, opts.colorFn);
      return this;
    }
    // flat quad on XZ-plane or vertical quad
    quad(corners, color, uvs, group = 0) {
      const P = this.parts[group];
      const base = P.pos.length / 3;
      const a = corners[0], b = corners[1], c = corners[2];
      const e1 = new THREE.Vector3().subVectors(b, a), e2 = new THREE.Vector3().subVectors(c, a);
      const n = new THREE.Vector3().crossVectors(e1, e2).normalize();
      for (let i = 0; i < 4; i++) {
        P.pos.push(corners[i].x, corners[i].y, corners[i].z);
        P.nor.push(n.x, n.y, n.z);
        P.uv.push(uvs ? uvs[i * 2] : 0, uvs ? uvs[i * 2 + 1] : 0);
        P.col.push(color.r, color.g, color.b);
      }
      P.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    count() { return this.parts.reduce((s, p) => s + p.idx.length, 0); }
    build() {
      const geom = new THREE.BufferGeometry();
      const pos = [], nor = [], uv = [], col = [], idx = [];
      let off = 0, start = 0;
      this.parts.forEach((P, gi) => {
        for (const v of P.pos) pos.push(v);
        for (const v of P.nor) nor.push(v);
        for (const v of P.uv) uv.push(v);
        for (const v of P.col) col.push(v);
        for (const i of P.idx) idx.push(i + off);
        geom.addGroup(start, P.idx.length, gi);
        start += P.idx.length;
        off += P.pos.length / 3;
      });
      geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geom.setIndex(off > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
      geom.computeBoundingSphere();
      geom.computeBoundingBox();
      return geom;
    }
  }
  U.GeoBuilder = GeoBuilder;
  U.boxGeo = new THREE.BoxGeometry(1, 1, 1);
  U.cylGeo = (rt, rb, seg) => new THREE.CylinderGeometry(rt, rb, 1, seg || 10);

  U.canvasTex = function (w, h, draw, opts = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = opts.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 4;
    if (opts.nearest) { t.magFilter = THREE.NearestFilter; }
    return t;
  };

  // Art randomness must not move the city's seeded gameplay stream.
  U.artRandom = function (seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  };
  U.surface = function (params, detail = {}) {
    const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0, envMapIntensity: 0.35 }, params));
    m.userData.detailMaps = detail;
    if (!window.G || G.settings.quality !== 'low') Object.assign(m, detail);
    return m;
  };

  window.U = U;
})();
