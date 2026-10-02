// 寶島狂飆 — core game: world sim, player, vehicles, AI, police, combat
(function () {
  const W = World, M = Models, S = Sound;
  const SAVE_VERSION = 2;
  // saves come from localStorage and may be old, partial or hand-edited: keep only well-formed fields
  function sanitizeSave(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const num = (v, d, lo, hi) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
    const out = { ver: SAVE_VERSION, money: num(r.money, 500, 0, 1e9), done: {}, boba: [], character: 0, egg: num(r.egg, 0, 0, 1e6), cred: num(r.cred, 0, 0, 100), bestRace: null, charSpec: null, charName: '' };
    // v1 saves (no version) used the old mission ids: carry their progress over to the matching new jobs
    const V1_IDS = { egg: 'dawn', deliver: 'market', taxi: 'pool', eat: 'stall', race: 'race' };
    if (r.done && typeof r.done === 'object') for (const k in r.done) {
      const n = r.done[k];
      if (typeof n !== 'number' || !isFinite(n) || n < 0) continue;
      const id = r.ver === SAVE_VERSION ? k : V1_IDS[k] || k;
      out.done[id] = Math.max(out.done[id] || 0, Math.floor(n));
    }
    if (Array.isArray(r.boba)) out.boba = [...new Set(r.boba.filter((x) => Number.isInteger(x) && x >= 0 && x < 20))];
    out.character = Number.isInteger(r.character) && r.character >= 0 && r.character < 3 ? r.character : 0;
    if (r.charSpec && typeof r.charSpec === 'object') {
      // only known appearance fields with sane values
      const c = r.charSpec, col = (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null);
      const one = (v, list, d) => (list.includes(v) ? v : d);
      if (col(c.skin)) out.charSpec = {
        body: one(c.body, ['m', 'f'], 'm'), height: one(c.height, [0.93, 1, 1.06, 1.02, 0.97, 0.98], 1),
        skin: col(c.skin), hair: col(c.hair) || '#1a1410', style: one(c.style, ['short', 'buzz', 'spiky', 'long', 'bob', 'ponytail', 'twin', 'bun', 'bald'], 'short'),
        hat: one(c.hat, ['none', 'cap', 'beanie'], 'none'), hatColor: col(c.hatColor) || '#222222', top: one(c.top, ['tee', 'long', 'tank', 'hoodie', 'jacket'], 'tee'),
        shirt: col(c.shirt) || '#e84b3c', inner: col(c.inner) || '#f2f2ee', bottom: one(c.bottom, ['pants', 'shorts', 'skirt'], 'pants'),
        pants: col(c.pants) || '#2b3547', shoes: col(c.shoes) || '#f2f2f2', glasses: !!c.glasses, bag: col(c.bag), beard: !!c.beard,
      };
    }
    if (typeof r.charName === 'string') out.charName = r.charName.slice(0, 8);
    if (typeof r.bestRace === 'number' && isFinite(r.bestRace) && r.bestRace > 0) out.bestRace = r.bestRace;
    out.garage = Array.isArray(r.garage) ? r.garage.filter((c) => c && ['scooter', 'sedan', 'truck', 'taxi', 'sports'].includes(c.type) && /^#[0-9a-f]{6}$/i.test(c.color)).slice(0, 20).map((c) => {
      const e = { type: c.type, color: c.color };
      if (typeof c.hp === 'number' && isFinite(c.hp)) e.hp = Math.min(1, Math.max(0.15, c.hp));
      if (typeof c.fuel === 'number' && isFinite(c.fuel)) e.fuel = Math.min(1, Math.max(0, c.fuel));
      return e;
    }) : [];
    out.region = ['taipei', 'newtaipei', 'keelung', 'taoyuan', 'hsinchu', 'zhubei', 'yilan', 'miaoli', 'taichung', 'changhua', 'nantou', 'yunlin', 'chiayi', 'chiayicounty', 'tainan', 'kaohsiung', 'pingtung', 'taitung', 'hualien', 'penghu', 'kinmen', 'lienchiang'].includes(r.region) ? r.region : 'taipei';
    return out;
  }
  // before converting an older save, keep an untouched copy so nothing is ever lost
  function loadSave() {
    const raw = U.store.get('save', {});
    if (raw && typeof raw === 'object' && Object.keys(raw).length && raw.ver !== SAVE_VERSION && !U.store.get('save.backup.v' + (raw.ver || 1), null)) U.store.set('save.backup.v' + (raw.ver || 1), raw);
    const save = sanitizeSave(raw);
    if (raw && raw.ver !== SAVE_VERSION && Object.keys(raw).length) U.store.set('save', save);
    return save;
  }
  const V3 = THREE.Vector3;
  const G = (window.G = {
    state: 'title',
    time: 6.5 * 60, day: 1,
    money: 500, health: 100, armor: 0, wanted: 0, lostT: 0, seenT: 0,
    weapons: { fist: true, bat: false, pistol: false }, ammo: 0, weapon: 'fist',
    vehicles: [], peds: [], pickups: [], fx: [], interact: [],
    weather: { rain: 0, target: 0, t: 120 },
    settings: Object.assign({ quality: 'high', sens: 1, invert: false, volume: 0.8, lang: 'zh' }, U.store.get('settings', {})),
    save: loadSave(),
    stats: { knocked: 0, driven: 0 },
  });
  G.money = G.save.money;

  const QUALITY = {
    high: { shadow: 2048, pr: Math.min(window.devicePixelRatio || 1, 1.5), traffic: 38, peds: 55, parked: 12, clearcoat: true, streetLights: 4 },
    mid: { shadow: 1024, pr: 1, traffic: 28, peds: 38, parked: 9, clearcoat: false, streetLights: 0 },
    low: { shadow: 0, pr: 0.75, traffic: 18, peds: 24, parked: 6, clearcoat: false, streetLights: 0 },
  };
  G.Q = () => QUALITY[G.settings.quality] || QUALITY.high;
  G.saveGame = () => {
    G.save.money = Math.round(G.money);
    if (!U.store.set('save', G.save) && !G._saveWarned) { G._saveWarned = true; UI.toast('無法存檔（瀏覽器封鎖了儲存空間），進度只會保留到關閉頁面'); }
  };
  G.saveSettings = () => U.store.set('settings', G.settings);

  // ---------------- Input ----------------
  const I = (G.input = { keys: new Set(), pressed: new Set(), mdx: 0, mdy: 0, lmb: false, rmb: false, lmbHit: false, wheel: 0, stick: { x: 0, y: 0 }, look: { x: 0, y: 0 }, touchBtn: new Set() });
  I.down = (c) => I.keys.has(c) || I.touchBtn.has(c) || I.touchBtn.has('pad:' + c);
  I.hit = (c) => I.pressed.has(c);
  addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (!I.keys.has(e.code)) I.pressed.add(e.code);
    I.keys.add(e.code);
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code) && G.state !== 'title') e.preventDefault();
  });
  addEventListener('keyup', (e) => I.keys.delete(e.code));
  addEventListener('blur', () => { I.keys.clear(); I.lmb = I.rmb = false; });
  addEventListener('mousemove', (e) => { if (document.pointerLockElement) { I.mdx += e.movementX; I.mdy += e.movementY; } });
  addEventListener('mousedown', (e) => {
    if (G.state !== 'play' || e.target.closest('.ui-block')) return;
    // the click that grabs the mouse shouldn't also throw a punch
    const locking = !document.pointerLockElement && !G.lockBlocked && !document.body.classList.contains('touch');
    if (e.button === 0 && !locking) { I.lmb = true; I.lmbHit = true; }
    if (e.button === 2) I.rmb = true;
  });
  addEventListener('mouseup', (e) => { if (e.button === 0) I.lmb = false; if (e.button === 2) I.rmb = false; });
  addEventListener('contextmenu', (e) => { if (G.state === 'play') e.preventDefault(); });
  addEventListener('wheel', (e) => { if (G.state === 'play') I.wheel += Math.sign(e.deltaY); }, { passive: true });
  G.pressVirtual = (code) => I.pressed.add(code);
  document.addEventListener('pointerlockerror', () => { if (navigator.userActivation && navigator.userActivation.isActive) G.lockBlocked = true; });

  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && [...pads].find((x) => x && x.connected);
    if (!p) { I.pad = null; return; }
    const prev = I.pad ? I.pad.btn : [];
    const btn = p.buttons.map((b) => b.pressed);
    const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
    I.pad = { lx: dz(p.axes[0]), ly: dz(p.axes[1]), rx: dz(p.axes[2]), ry: dz(p.axes[3]), rt: p.buttons[7] ? p.buttons[7].value : 0, lt: p.buttons[6] ? p.buttons[6].value : 0, btn };
    const map = { 0: 'Space', 1: 'KeyE', 2: 'Mouse0', 3: 'KeyF', 5: 'ShiftLeft', 9: 'Escape', 8: 'KeyM', 12: 'KeyP', 4: 'KeyQ', 10: 'KeyH' };
    for (const k in map) {
      const code = map[k];
      if (btn[k] && !prev[k]) { if (code === 'Mouse0') I.lmbHit = true; else I.pressed.add(code); }
      if (code === 'Mouse0') I.padAttack = !!btn[k];
      else if (btn[k]) I.touchBtn.add('pad:' + code); else I.touchBtn.delete('pad:' + code);
    }
  }
  const padDown = (code) => I.touchBtn.has('pad:' + code);

  // ---------------- Renderer / scene ----------------
  G.initRenderer = function (canvas) {
    const r = (G.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(G.Q().pr);
    r.setSize(innerWidth, innerHeight);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = G.Q().shadow > 0;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = (G.scene = new THREE.Scene());
    G.camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.2, 4200);
    scene.fog = new THREE.FogExp2(0xbcd0de, 0.0011);
    // sky dome
    const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new V3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, night: { value: 0 }, rain: { value: 0 }, clock: { value: 0 }, detail: { value: G.settings.quality === 'low' ? 0 : 1 } };
    G.skyU = skyU;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(3500, 32, 16), new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top, hor, sunDir, sunCol;
        uniform float night, rain, clock, detail; varying vec3 vP;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
        void main(){ vec3 d = normalize(vP); float h = max(d.y, 0.0), mu = dot(d, normalize(sunDir));
          vec3 c = mix(hor, top, pow(h, 0.48));
          if (detail > 0.5) {
            float haze = exp(-h * 7.0), mie = 0.018 / pow(max(0.025, 1.5776 - 1.52 * mu), 1.5);
            c += sunCol * (mie * (0.35 + haze * 0.65) + smoothstep(0.99985, 0.99996, mu) * 5.0);
            vec2 p = d.xz / (h + 0.22) * 2.2 + vec2(clock * 0.002, 0.0);
            float n = noise(p)*0.57 + noise(p*2.03)*0.28 + noise(p*4.07)*0.15;
            float cloud = smoothstep(0.54-rain*0.16, 0.75-rain*0.12, n) * smoothstep(0.015,0.2,h);
            vec3 cc = mix(vec3(0.78,0.81,0.8), hor * 1.3, 0.32) * (1.0-night*0.94) * (1.0-rain*0.4);
            c = mix(c, cc + sunCol * pow(max(mu,0.0),12.0)*0.14, cloud * 0.8);
          } else c += sunCol * (pow(max(mu,0.0),600.0)*3.0 + pow(max(mu,0.0),12.0)*0.35);
          if (d.y < 0.0) c = hor * mix(0.7, 0.22, min(1.0,-d.y*3.0));
          gl_FragColor = vec4(c,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    sky.renderOrder = -1;
    scene.add(sky);
    G.sky = sky;
    // stars
    const sp = [];
    for (let i = 0; i < 900; i++) { const a = Math.random() * 6.28, b = Math.random() * 1.3 + 0.12; sp.push(Math.cos(a) * Math.cos(b) * 3000, Math.sin(b) * 3000, Math.sin(a) * Math.cos(b) * 3000); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    G.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(G.stars);
    // lights
    G.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x5a5048, 1.2);
    scene.add(G.hemi);
    G.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    G.sun.castShadow = G.Q().shadow > 0;
    const sh = G.sun.shadow;
    sh.mapSize.set(G.Q().shadow || 512, G.Q().shadow || 512);
    sh.camera.left = sh.camera.bottom = -90; sh.camera.right = sh.camera.top = 90;
    sh.camera.near = 10; sh.camera.far = 600; sh.bias = -0.00035; sh.normalBias = 0.18;
    scene.add(G.sun, G.sun.target);
    G.headlight = new THREE.SpotLight(0xfff1d0, 0, 60, 0.55, 0.5, 1.2);
    scene.add(G.headlight, G.headlight.target);
    // rain
    const rp = new Float32Array(2400 * 3);
    for (let i = 0; i < rp.length; i += 3) { rp[i] = U.mr(-40, 40); rp[i + 1] = U.mr(0, 40); rp[i + 2] = U.mr(-40, 40); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    G.rainPts = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xaac4dd, size: 0.12, transparent: true, opacity: 0.0, depthWrite: false }));
    G.rainPts.frustumCulled = false;
    scene.add(G.rainPts);
    addEventListener('resize', () => { G.camera.aspect = innerWidth / innerHeight; G.camera.updateProjectionMatrix(); r.setSize(innerWidth, innerHeight); resizePost(); });
    setupPost();
  };

  G.applyQuality = function () {
    const q = G.Q();
    G.renderer.setPixelRatio(q.pr);
    G.renderer.shadowMap.enabled = q.shadow > 0;
    G.sun.castShadow = q.shadow > 0;
    if (q.shadow) { G.sun.shadow.mapSize.set(q.shadow, q.shadow); if (G.sun.shadow.map) { G.sun.shadow.map.dispose(); G.sun.shadow.map = null; } }
    const detail = G.settings.quality !== 'low';
    G.skyU.detail.value = detail ? 1 : 0;
    G.scene.environment = detail && G.envTarget ? G.envTarget.texture : null;
    G.scene.traverse((o) => {
      if (o.userData.detailGeometry) { o.geometry = detail ? o.userData.detailGeometry : o.userData.lowGeometry; o.computeBoundingSphere(); }
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) {
          if (m.userData.detailMaps) for (const k in m.userData.detailMaps) m[k] = detail ? m.userData.detailMaps[k] : k.endsWith('Map') ? null : m.userData.detailMaps[k];
          m.needsUpdate = true;
        }
      }
    });
    M.applyQuality(G.scene);
    if (G.streetLights) for (const l of G.streetLights) l.visible = q.streetLights > 0;
    setupPost();
  };

  function updateReflections(day, rain) {
    if (G.settings.quality === 'low') { G.scene.environment = null; return; }
    const elapsed = G.elapsed || 0;
    if (G.envTarget && (elapsed - G.envAt < 15 || (Math.abs(day - G.envDay) < 0.22 && Math.abs(rain - G.envRain) < 0.3))) return;
    if (!G.pmrem) {
      G.pmrem = new THREE.PMREMGenerator(G.renderer);
      G.envScene = new THREE.Scene();
      G.envSky = new THREE.Mesh(new THREE.SphereGeometry(20, 24, 12), G.sky.material);
      G.envScene.add(G.envSky);
    }
    const old = G.envTarget;
    G.envTarget = G.pmrem.fromScene(G.envScene, 0.06, 0.1, 50);
    G.scene.environment = G.envTarget.texture;
    if (old) old.dispose();
    G.envAt = elapsed; G.envDay = day; G.envRain = rain;
  }

  function setupPost() {
    if (G.post) {
      for (const t of G.post.targets) t.dispose();
      for (const m of G.post.materials) m.dispose();
      G.post.quad.geometry.dispose(); G.post = null;
    }
    const r = G.renderer;
    if (G.settings.quality !== 'high' || !r.capabilities.isWebGL2 || !r.extensions.has('EXT_color_buffer_float')) return;
    const target = (depth) => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: depth, stencilBuffer: false });
    const sceneRT = target(true), glow = target(false), blur = target(false);
    const vertex = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';
    const filter = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: { source: { value: null }, stepUV: { value: new THREE.Vector2() }, extract: { value: 0 } }, vertexShader: vertex,
      fragmentShader: `varying vec2 vUv; uniform sampler2D source; uniform vec2 stepUV; uniform float extract;
        vec3 tap(vec2 p){ vec3 c=texture2D(source,p).rgb; if (any(isnan(c)) || any(isinf(c))) c=vec3(0.0); c=min(c,vec3(64.0)); float l=max(c.r,max(c.g,c.b)); return c * mix(1.0,smoothstep(0.85,1.7,l),extract); }
        void main(){ vec3 c=tap(vUv)*0.227027; c+=(tap(vUv+stepUV*1.384615)+tap(vUv-stepUV*1.384615))*0.316216;
          c+=(tap(vUv+stepUV*3.230769)+tap(vUv-stepUV*3.230769))*0.070270; gl_FragColor=vec4(c,1.0); }` });
    const output = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
      uniforms: { source: { value: sceneRT.texture }, bloom: { value: blur.texture }, stepUV: { value: new THREE.Vector2() }, strength: { value: 0.08 } }, vertexShader: vertex,
      fragmentShader: `varying vec2 vUv; uniform sampler2D source,bloom; uniform vec2 stepUV; uniform float strength;
        void main(){ vec3 b=texture2D(bloom,vUv).rgb*0.227027;
          b+=(texture2D(bloom,vUv+stepUV*1.384615).rgb+texture2D(bloom,vUv-stepUV*1.384615).rgb)*0.316216;
          b+=(texture2D(bloom,vUv+stepUV*3.230769).rgb+texture2D(bloom,vUv-stepUV*3.230769).rgb)*0.070270;
          if (any(isnan(b)) || any(isinf(b))) b=vec3(0.0);
          vec3 s=texture2D(source,vUv).rgb; if (any(isnan(s)) || any(isinf(s))) s=vec3(0.0);
          vec3 c=s+b*strength;
          c=mix(vec3(dot(c,vec3(0.2126,0.7152,0.0722))),c,0.98);
          vec2 p=vUv*2.0-1.0; c*=1.0-0.065*dot(p,p);
          gl_FragColor=vec4(c,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` });
    const scene = new THREE.Scene(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), filter);
    quad.frustumCulled = false; scene.add(quad);
    G.post = { targets: [sceneRT, glow, blur], materials: [filter, output], scene, quad, camera: new THREE.Camera() };
    resizePost();
  }
  function resizePost() {
    if (!G.post) return;
    const size = G.renderer.getDrawingBufferSize(new THREE.Vector2()), targets = G.post.targets;
    targets[0].setSize(size.x, size.y);
    for (let i = 1; i < 3; i++) targets[i].setSize(Math.max(1, Math.ceil(size.x / 4)), Math.max(1, Math.ceil(size.y / 4)));
  }
  G.renderFrame = function () {
    const r = G.renderer, p = G.post;
    if (!p) { r.render(G.scene, G.camera); return; }
    const [sceneRT, glow, blur] = p.targets, [filter, output] = p.materials;
    r.setRenderTarget(sceneRT); r.render(G.scene, G.camera);
    p.quad.material = filter; filter.uniforms.source.value = sceneRT.texture; filter.uniforms.extract.value = 1;
    filter.uniforms.stepUV.value.set(1 / sceneRT.width, 1 / sceneRT.height);
    r.setRenderTarget(glow); r.render(p.scene, p.camera);
    filter.uniforms.source.value = glow.texture; filter.uniforms.extract.value = 0; filter.uniforms.stepUV.value.set(1 / glow.width, 0);
    r.setRenderTarget(blur); r.render(p.scene, p.camera);
    p.quad.material = output; output.uniforms.stepUV.value.set(0, 1 / blur.height); output.uniforms.strength.value = 0.025 + (G.night || 0) * 0.12;
    r.setRenderTarget(null); r.render(p.scene, p.camera);
  };

  // ---------------- Day / night & weather ----------------
  const SKY_KEYS = [
    [0, '#05070f', '#141026', 0], [4.5, '#070a18', '#1c1630', 0], [5.8, '#2b3a6a', '#e98a5e', 0.25], [7, '#4a7fc4', '#f0c9a0', 0.8],
    [9, '#3f7fd0', '#bcd8ee', 1], [16, '#4580cc', '#c8dbe8', 1], [17.6, '#46609a', '#f5b37a', 0.75], [18.6, '#2b2d5a', '#f06a4e', 0.35],
    [19.4, '#141733', '#5b3a6e', 0.08], [20.5, '#070a18', '#1a1430', 0], [24, '#05070f', '#141026', 0],
  ];
  const cA = new THREE.Color(), cB = new THREE.Color(), cC = new THREE.Color();
  function updateStreetLights(dt, night) {
    const count = G.Q().streetLights;
    if (!count) { if (G.streetLights) for (const l of G.streetLights) l.visible = false; return; }
    if (!G.streetLights) {
      G.streetLights = Array.from({ length: count }, () => {
        const l = new THREE.PointLight(0xffd29a, 0, 23, 2);
        l.castShadow = false; G.scene.add(l); return l;
      });
    }
    G.lampRefresh = (G.lampRefresh || 0) - dt;
    if (G.lampRefresh <= 0) {
      G.lampRefresh = 0.5;
      const p = G.player.pos;
      const nearest = W.lamps.map(l => ({ lamp: l, d: U.dist2(l.x,l.z,p.x,p.z) })).filter(l => l.d < 60*60).sort((a,b) => a.d-b.d).slice(0,count).map(l => l.lamp);
      // Keep lights attached to their old lamp when it is still among the nearest.
      const available = nearest.filter(l => !G.streetLights.some(s => s.userData.lamp === l));
      for (const l of G.streetLights) {
        if (!nearest.includes(l.userData.lamp)) l.userData.lamp = available.shift() || null;
        const source = l.userData.lamp;
        if (source) l.position.set(source.x,source.y,source.z);
      }
    }
    for (const l of G.streetLights) {
      l.visible = true;
      const d = Math.sqrt(U.dist2(l.position.x,l.position.z,G.player.pos.x,G.player.pos.z));
      l.intensity = l.userData.lamp && night > 0.01 ? 155 * night * U.clamp((60-d)/18,0,1) : 0;
    }
  }

  function updateEnvironment(dt) {
    const hr = (G.time / 60) % 24;
    let k = 0;
    while (k < SKY_KEYS.length - 2 && hr >= SKY_KEYS[k + 1][0]) k++;
    const a = SKY_KEYS[k], b = SKY_KEYS[k + 1];
    const t = U.clamp((hr - a[0]) / (b[0] - a[0]), 0, 1);
    const day = U.lerp(a[3], b[3], t);
    const rain = G.weather.rain;
    cA.set(a[1]).lerp(cB.set(b[1]), t);
    cC.set(a[2]).lerp(cB.set(b[2]), t);
    const grey = new THREE.Color(day > 0.5 ? '#7d8791' : '#1b1e24');
    cA.lerp(grey, rain * 0.75); cC.lerp(grey, rain * 0.7);
    G.skyU.top.value.copy(cA); G.skyU.hor.value.copy(cC);
    G.skyU.rain.value = rain; G.skyU.night.value = 1 - day; G.skyU.clock.value = G.elapsed || 0;
    G.scene.fog.color.copy(cC);
    G.scene.fog.density = 0.00095 + rain * 0.0022 + (1 - day) * 0.0002;
    // sun path: rises east (+x) at 6, sets west at 18
    const ang = ((hr - 6) / 12) * Math.PI;
    const sunDir = new V3(Math.cos(ang), Math.sin(ang), 0.35).normalize();
    const isDay = sunDir.y > -0.05;
    const lightDir = isDay ? sunDir : new V3(-Math.cos(ang), -Math.sin(ang), -0.3).normalize(); // moon opposite
    G.skyU.sunDir.value.copy(sunDir);
    G.skyU.sunCol.value.set(hr > 16 || hr < 8 ? '#ff9a55' : '#fff2d8').multiplyScalar(isDay ? (1 - rain) : 0);
    G.night = 1 - day;
    const night = G.night;
    G.sun.intensity = isDay ? U.lerp(0.5, 2.7, day) * (1 - rain * 0.72) : 0.45;
    G.sun.color.set(isDay ? (day < 0.6 ? '#ffb27a' : '#fff4e2') : '#8fa8ff');
    G.hemi.intensity = U.lerp(1.05, 1.35, day) * (1 - rain * 0.15);
    G.hemi.color.set(day > 0.5 ? '#cfe6ff' : '#6f7fc0');
    G.hemi.groundColor.set(day > 0.5 ? '#6a5e52' : '#5a4038');
    G.stars.material.opacity = Math.max(0, night - 0.4) * (1 - rain) * 1.4;
    G.renderer.toneMappingExposure = U.lerp(1.16, 0.96, day);
    updateReflections(day, rain);
    if (Interiors.current) { G.hemi.intensity = 1.05; G.hemi.color.set('#fff6ea'); G.hemi.groundColor.set('#8a8070'); G.sun.intensity = 0.2; }
    // city lights
    const m = W.mat;
    const wet = G.settings.quality === 'low' ? 0 : rain;
    m.road.color.setScalar(1 - wet * 0.32); m.road.roughness = U.lerp(0.96, 0.24, wet);
    m.slab.roughness = U.lerp(0.85, 0.5, wet);
    m.res.emissive.setScalar(night * 0.8);
    m.office.emissive.setScalar(night * 0.85);
    m.shop.emissive.setRGB(0.18 + night * 1.15, 0.18 + night * 0.85, 0.18 + night * 0.52);
    m.store.emissive.setScalar(0.35 + night * 0.7);
    m.sign.color.setScalar(U.lerp(0.78, 1.25, night));
    const lampNight = U.clamp((night - 0.12) / 0.7, 0, 1);
    m.lamp.color.set('#fff0cc').multiplyScalar(0.32 + lampNight * 3.4);
    m.pool.opacity = lampNight * 0.78;
    m.arcade.emissiveIntensity = lampNight * 0.70;
    m.arcadeLight.color.set('#ffe0aa').multiplyScalar(0.45 + lampNight * 2.2);
    updateStreetLights(dt, lampNight);
    W.mat.t101.emissive.setRGB(0.02 * night, 0.12 * night, 0.1 * night);
    W.mat.t101band.color.setRGB(0.6 * night, 1.0 * night, 0.9 * night);
    if (G.lanternMat) G.lanternMat.emissive.setScalar(0.3 + night);
    // shadow camera follows player
    const p = G.player.pos;
    G.sun.position.set(p.x + lightDir.x * 250, lightDir.y * 250, p.z + lightDir.z * 250);
    G.sun.target.position.set(p.x, 0, p.z);
    // weather
    const w = G.weather;
    w.t -= dt;
    if (w.t <= 0) { w.target = Math.random() < 0.3 ? U.mr(0.5, 1) : 0; w.t = U.mr(90, 240); }
    w.rain = U.damp(w.rain, w.target, 0.08, dt);
    G.rainPts.material.opacity = w.rain * 0.7;
    if (w.rain > 0.02) {
      const pos = G.rainPts.geometry.attributes.position;
      const cam = G.camera.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 32;
        if (y < 0) y += 40;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      G.rainPts.position.set(Math.floor(cam.x), cam.y - 20, Math.floor(cam.z));
    }
    S.setRain(Interiors.current ? 0 : w.rain);
    const floodTarget = G.forceFlood != null ? G.forceFlood : w.rain > 0.62 ? (w.rain - 0.62) * 0.9 : 0;
    G.flood = U.damp(G.flood || 0, floodTarget, floodTarget > (G.flood || 0) ? 0.05 : 0.08, dt);
    W.setFlood(G.flood < 0.02 ? 0 : G.flood, G.elapsed);
    G.temp = Math.round(28 + 5 * Math.sin(((hr - 9) / 24) * Math.PI * 2) - w.rain * 4);
  }

  // ---------------- Entities ----------------
  let uid = 1;
  G.spawnVehicle = function (type, x, z, h, opts = {}) {
    const o = M.makeVehicle(type, opts.color);
    const v = { id: uid++, type, spec: o.spec, obj: o, pos: new V3(x, 0, z), h: h || 0, vel: { x: 0, z: 0 }, fwd: 0, steer: 0, hp: o.spec.hp, driver: opts.driver || null, ai: null, rider: null, dead: false, fuel: opts.fuel != null ? opts.fuel : 0.35 + Math.random() * 0.65, persist: !!opts.persist, lean: 0, stuckT: 0, honkT: 0, parked: !!opts.parked, smokeT: 0 };
    o.group.rotation.order = 'YXZ';
    v.color = o.color;
    G.scene.add(o.group);
    if (o.spec.two && v.driver && v.driver !== 'player') addRider(v);
    G.vehicles.push(v);
    syncVehicle(v, 0);
    return v;
  };
  const RIDERS = [];
  function riderSpec() {
    if (RIDERS.length < 24) RIDERS.push(Object.assign({}, M.randomPedSpec(), { style: 'helmet', cap: U.mpick(['#f2c230', '#eee', '#c7302b', '#2f5fa8', '#222', '#e27ba0']) }));
    return RIDERS[Math.floor(Math.random() * RIDERS.length)];
  }
  function addRider(v, spec) {
    const ch = M.makeCharacter(spec || riderSpec());
    ch.root.position.set(0, 0, -0.22);
    v.obj.group.add(ch.root);
    v.rider = ch;
    M.animate(ch, { mode: 'sit', seatY: v.spec.seatY }, 0.016);
  }
  G.removeVehicle = function (v) {
    G.scene.remove(v.obj.group);
    v.removed = true;
    const i = G.vehicles.indexOf(v);
    if (i >= 0) G.vehicles.splice(i, 1);
  };
  function syncVehicle(v, dt) {
    const g = v.obj.group;
    g.position.set(v.pos.x, v.pos.y, v.pos.z);
    g.rotation.y = v.h;
    if (v.spec.two) {
      const target = v.dead ? 1.3 : -v.steer * U.clamp(Math.abs(v.fwd) / 8, 0, 1) * 1.1;
      v.lean = U.damp(v.lean, target, 8, dt || 1);
      g.rotation.z = v.lean;
    } else {
      g.rotation.z = U.damp(g.rotation.z, -v.steer * U.clamp(Math.abs(v.fwd) / 20, 0, 1) * 0.08, 6, dt || 1);
    }
    if (g.userData.siren) {
      const on = v.driver === 'police' || v.sirenOn;
      const f = Math.floor(performance.now() / 180) % 2;
      g.userData.siren[0].material = on ? (f ? M.sirenMats[0] : darkSiren) : darkSiren;
      g.userData.siren[1].material = on ? (f ? darkSiren : M.sirenMats[1]) : darkSiren;
    }
  }
  const darkSiren = new THREE.MeshBasicMaterial({ color: 0x331111 });
  const deadMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

  G.spawnPed = function (x, z, opts = {}) {
    const spec = opts.spec || M.randomPedSpec();
    const ch = M.makeCharacter(spec);
    const p = { id: uid++, ch, pos: new V3(x, W.groundAt(x, z), z), yaw: opts.yaw || 0, speed: 0, vy: 0, state: opts.state || 'walk', hp: opts.hp || 60, loop: null, s: 0, dir: Math.random() < 0.5 ? 1 : -1, t: 0, target: null, hostile: !!opts.hostile, cop: !!opts.cop, persist: !!opts.persist, fleeT: 0, attackT: 0, stagger: 0, weapon: opts.weapon || null, name: opts.name };
    G.scene.add(ch.root);
    if (p.weapon) ch.setWeapon(p.weapon);
    G.peds.push(p);
    if (p.state === 'walk') assignLoop(p);
    return p;
  };
  G.removePed = function (p) {
    G.scene.remove(p.ch.root);
    p.removed = true;
    const i = G.peds.indexOf(p);
    if (i >= 0) G.peds.splice(i, 1);
  };
  function assignLoop(p) {
    const c = W.cellAt(p.pos.x, p.pos.z);
    if (!c) { p.state = 'idle'; return; }
    const inset = 2.4;
    p.loop = { x0: c.x0 + inset, z0: c.z0 + inset, x1: c.x1 - inset, z1: c.z1 - inset };
    const L = p.loop, w = L.x1 - L.x0, h = L.z1 - L.z0;
    // nearest perimeter param
    const cand = [
      [U.clamp(p.pos.x, L.x0, L.x1) - L.x0, Math.abs(p.pos.z - L.z0)],
      [w + U.clamp(p.pos.z, L.z0, L.z1) - L.z0, Math.abs(p.pos.x - L.x1)],
      [w + h + (L.x1 - U.clamp(p.pos.x, L.x0, L.x1)), Math.abs(p.pos.z - L.z1)],
      [2 * w + h + (L.z1 - U.clamp(p.pos.z, L.z0, L.z1)), Math.abs(p.pos.x - L.x0)],
    ].sort((a, b) => a[1] - b[1]);
    p.s = cand[0][0];
  }
  function loopPoint(L, s) {
    const w = L.x1 - L.x0, h = L.z1 - L.z0, P = 2 * (w + h);
    s = ((s % P) + P) % P;
    if (s < w) return [L.x0 + s, L.z0];
    if (s < w + h) return [L.x1, L.z0 + (s - w)];
    if (s < 2 * w + h) return [L.x1 - (s - w - h), L.z1];
    return [L.x0, L.z1 - (s - 2 * w - h)];
  }

  // ---------------- Player ----------------
  G.CHARACTERS = [
    { name: '阿傑', en: 'A-Jie', desc: '剛從台中北上的外送員，騎車技術一流。', spec: { body: 'm', height: 1.02, skin: '#e0b08a', hair: '#1a1410', style: 'short', hat: 'none', hatColor: '#222', top: 'tee', shirt: '#e84b3c', inner: '#f2f2ee', bottom: 'pants', pants: '#2b3547', shoes: '#f2f2f2', glasses: false, bag: null, beard: false } },
    { name: '小咪', en: 'Mimi', desc: '萬華長大的刺青師，路很熟、脾氣很衝。', spec: { body: 'f', height: 0.97, skin: '#f5d3b8', hair: '#3a2a1e', style: 'long', hat: 'none', hatColor: '#222', top: 'jacket', shirt: '#232323', inner: '#f2c230', bottom: 'skirt', pants: '#1c1c1c', shoes: '#c7302b', glasses: false, bag: null, beard: false } },
    { name: '阿伯', en: 'Uncle Bo', desc: '退休的計程車司機，藍白拖是他的戰靴。', spec: { body: 'm', height: 0.98, skin: '#c98f67', hair: '#8a8a8a', style: 'buzz', hat: 'none', hatColor: '#222', top: 'tank', shirt: '#f2f2ee', inner: '#f2f2ee', bottom: 'shorts', pants: '#4d5a6a', shoes: '#2f5fa8', glasses: true, bag: null, beard: false } },
  ];
  // full spec for the look the player created (or a preset)
  G.playerSpec = function () {
    const base = G.save.charSpec || G.CHARACTERS[G.save.character || 0].spec;
    return Object.assign({}, base, { scale: (base.height || 1) * (base.body === 'f' ? 0.96 : 1) });
  };
  G.playerName = () => G.save.charName || G.CHARACTERS[G.save.character || 0].name;
  G.initPlayer = function () {
    const home = Regions.spawnPoint();
    const P = (G.player = { pos: new V3(home.x, W.SLAB, home.z), yaw: home.yaw, vel: new V3(), vy: 0, onGround: true, ch: null, vehicle: null, fallT: 0, hurtT: 0, speed: 0, arrestT: 0 });
    G.setCharacter();
    G.cam = { yaw: home.yaw, pitch: 0.18, dist: 4.5, manualT: 0, shake: 0, fov: 68 };
    return P;
  };
  G.setCharacter = function () {
    const P = G.player;
    if (P.ch) { if (P.ch.root.parent) P.ch.root.parent.remove(P.ch.root); }
    P.ch = M.makeCharacter(G.playerSpec());
    P.ch.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    P.ch.setWeapon(G.weapon);
    if (P.vehicle && P.vehicle.spec.two) { P.vehicle.obj.group.add(P.ch.root); P.ch.root.position.set(0, 0, -0.22); }
    else { G.scene.add(P.ch.root); if (P.vehicle) P.ch.root.visible = false; }
  };

  // ---------------- Money / health / wanted ----------------
  G.addMoney = function (n, why) {
    G.money = Math.max(0, G.money + n);
    UI.moneyFx(n, why);
    if (n > 0) S.sfx('cash');
    G.saveGame();
  };
  G.addCred = function (n, why) {
    const before = G.save.cred || 0;
    G.save.cred = U.clamp(before + n, 0, 100);
    if (n > 0) UI.toast(`街坊人情 +${n}${why ? '（' + why + '）' : ''}`);
    else if (n < 0) UI.toast(`街坊人情 ${n}${why ? '（' + why + '）' : ''}`);
    for (const p of G.PERKS) if (before < p.need && G.save.cred >= p.need) UI.bigText('解鎖：' + p.name, p.desc, 3200);
    G.saveGame();
  };
  G.PERKS = [
    { need: 15, id: 'lend', name: '福伯借車', desc: '手機可以免費叫福伯的發財車' },
    { need: 30, id: 'repair', name: '機車行免費修車', desc: '在阿福機車行修車不用錢' },
    { need: 50, id: 'hide', name: '街坊掩護', desc: '在萬華、西門被追緝時，鄰居會幫你打掩護' },
    { need: 75, id: 'discount', name: '熟客價', desc: '好鄰居商店與捷運半價' },
  ];
  G.hasPerk = (id) => (G.save.cred || 0) >= G.PERKS.find((p) => p.id === id).need;
  G.damagePlayer = function (d, src) {
    if (G.state !== 'play' || G.godT > 0) return;
    if (G.armor > 0) { const a = Math.min(G.armor, d * 0.7); G.armor -= a; d -= a; }
    G.health -= d;
    G.player.hurtT = 0.4;
    UI.hurt();
    S.sfx('hurt', 0.8);
    if (G.health <= 0) G.gameOver('wasted');
  };
  G.crime = function (amount, pos) {
    if (G.noCrime) return;
    const before = Math.floor(G.wanted);
    G.wanted = Math.min(5.99, G.wanted + amount);
    G.lostT = 0;
    G.lastSeen = { x: G.player.pos.x, z: G.player.pos.z };
    G.crimeT = G.elapsed;
    const after = Math.floor(G.wanted);
    if (after > before) { S.sfx('star'); UI.flashStars(); }
  };
  G.clearWanted = function () {
    G.wanted = 0;
    for (const v of [...G.vehicles]) {
      if (v.type !== 'police') continue;
      if (v.driver === 'police') { v.driver = 'ai'; v.leaveT = 3; }
      v.sirenOn = false; v.persist = false; v.deployed = false;
    }
    for (const p of G.peds) if (p.cop) { p.state = 'flee'; p.fleeT = 20; p.cop = false; }
  };

  G.gameOver = function (kind) {
    if (G.state !== 'play') return;
    G.state = 'dead';
    const P = G.player;
    if (P.vehicle) exitVehicle(true);
    P.ch.root.visible = true;
    UI.wasted(kind);
    if (G.mission) Missions.fail(kind === 'wasted' ? '你送醫了' : '你被警察逮捕了');
    S.sfx('fail');
    G.later(3.8, () => {
      const poi = kind === 'wasted' ? W.lmPOI.hospital : W.lmPOI.police;
      const fee = kind === 'wasted' ? Math.min(G.money, 300) : Math.min(G.money, Math.round(200 + G.money * 0.1));
      G.money -= fee;
      if (kind === 'busted') { G.weapons.pistol = false; G.ammo = 0; G.weapons.bat = false; G.setWeapon('fist'); }
      G.clearWanted();
      G.health = 100; G.armor = 0;
      if (window.Interiors) Interiors.reset();
      P.pos.set(poi.x, 0, poi.z - 2);
      P.fallT = 0; P.vel.set(0, 0, 0);
      G.cam.yaw = Math.PI;
      G.state = 'play';
      UI.unwasted();
      UI.toast(kind === 'wasted' ? `台大醫院醫藥費 ${U.fmtMoney(fee)}` : `交保金 ${U.fmtMoney(fee)}，武器被沒收`);
      G.saveGame();
      despawnFar(true);
    });
  };

  G.setWeapon = function (w) {
    if (!G.weapons[w]) return;
    G.weapon = w;
    G.player.ch.setWeapon(w);
    UI.weapon();
  };
  function cycleWeapon(dir) {
    const order = ['fist', 'bat', 'pistol'].filter((w) => G.weapons[w]);
    const i = order.indexOf(G.weapon);
    G.setWeapon(order[(i + dir + order.length) % order.length]);
    S.sfx('click');
  }

  // ---------------- Vehicles: physics ----------------
  function circles(v) {
    const s = v.spec;
    const n = Math.max(1, Math.round(s.len / s.wid));
    const r = s.two ? 0.42 : s.wid / 2 + 0.05;
    const out = [];
    const span = s.len / 2 - r;
    for (let k = 0; k < n; k++) out.push(n === 1 ? 0 : -span + (2 * span * k) / (n - 1));
    return { offs: out, r };
  }
  function vehicleStep(v, inp, dt) {
    const s = v.spec;
    let fx = Math.sin(v.h), fz = Math.cos(v.h);
    let fwd = v.vel.x * fx + v.vel.z * fz;
    let lat = v.vel.x * -fz + v.vel.z * fx;
    const th = inp.throttle || 0;
    const wet = 1 - G.weather.rain * 0.25;
    if (th > 0) {
      if (fwd < -0.5) fwd += s.brake * dt * th;
      else if (fwd < s.max) fwd += (s.accel / (1 + (v.load || 0))) * th * dt * (1 - (Math.max(0, fwd) / s.max) * 0.65);
    } else if (th < 0) {
      if (fwd > 0.5) fwd -= s.brake * dt * -th;
      else if (fwd > -s.max * 0.3) fwd += th * s.accel * 0.6 * dt;
    } else fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd), 2.2 * dt);
    if (inp.hand) fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd), (s.two ? 12 : 6) * dt);
    if (v.dead) fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd), 8 * dt);
    // flooded road: water drag, and deep water stalls scooter engines
    const depth = W.floodAt(v.pos.x, v.pos.z);
    if (depth > 0.04) {
      const big = v.spec.len > 6;
      fwd -= fwd * Math.min(1, depth * (big ? 1.2 : v.spec.two ? 5 : 3.2) * dt);
      const cap = s.max * (big ? 0.8 : v.spec.two ? 0.35 : 0.55);
      if (Math.abs(fwd) > cap) fwd -= Math.sign(fwd) * (Math.abs(fwd) - cap) * Math.min(1, 3 * dt);
      if (v.spec.two && depth > 0.24 && th > 0) { fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd), s.accel * th * dt); if (v === G.player.vehicle && !v.stallWarned) { v.stallWarned = true; UI.toast('機車泡水熄火了！推出積水區再騎'); } }
      if (Math.abs(fwd) > 3 && Math.random() < dt * 12) spawnFx('splash', v.pos.x + U.mr(-1, 1), 0.3 + depth, v.pos.z + U.mr(-1, 1), U.mr(-1, 1), 2.5, U.mr(-1, 1), 0.7, 0.5);
    } else v.stallWarned = false;
    const grip = (inp.hand && !s.two ? s.grip * 0.16 : s.grip) * wet;
    lat *= Math.exp(-grip * dt);
    const spdF = 1 - Math.min(1, Math.abs(fwd) / s.max) * 0.55;
    v.steer = U.damp(v.steer, (inp.steer || 0) * s.steer * spdF, s.two ? 12 : 9, dt);
    let yaw = (fwd * Math.tan(v.steer)) / s.wb;
    if (inp.hand && !s.two) yaw *= 1.35;
    v.h = U.wrapAngle(v.h + yaw * dt);
    fx = Math.sin(v.h); fz = Math.cos(v.h);
    v.vel.x = fx * fwd - fz * lat;
    v.vel.z = fz * fwd + fx * lat;
    v.pos.x += v.vel.x * dt;
    v.pos.z += v.vel.z * dt;
    v.fwd = fwd;
    // world collision
    const C = circles(v);
    for (const off of C.offs) {
      const c = { x: v.pos.x + fx * off, z: v.pos.z + fz * off };
      const ox = c.x, oz = c.z;
      const hit = W.collideCircle(c, C.r, 0.5, true);
      if (hit) {
        v.pos.x += c.x - ox; v.pos.z += c.z - oz;
        const vn = v.vel.x * hit.nx + v.vel.z * hit.nz;
        if (vn < 0) {
          v.vel.x -= hit.nx * vn * 1.3; v.vel.z -= hit.nz * vn * 1.3;
          const imp = -vn;
          if (imp > 4) vehicleImpact(v, imp, hit.box && hit.box.tag);
        }
      }
    }
    // curb bump
    const gy = W.groundAt(v.pos.x, v.pos.z);
    v.pos.y = U.damp(v.pos.y, gy, 20, dt);
  }
  // hp <= 0 sets the vehicle on fire; it explodes a few seconds later (time to bail out)
  function ignite(v) {
    if (v.dead || v.burnT > 0) return;
    if (v.noExplode) { v.hp = 1; return; }
    if (v.spec.two) { explode(v); return; }
    v.burnT = 4.5;
    if (v === G.player.vehicle) UI.toast('車子著火了！快下車（F）');
  }
  G.ignite = ignite;
  G.vehicleStep = (v, inp, dt) => vehicleStep(v, inp, dt);
  function vehicleImpact(v, imp, tag) {
    const dmg = (imp - 4) * (v.spec.two ? 2 : 1.1);
    v.hp -= dmg;
    if (v === G.player.vehicle) {
      G.cam.shake = Math.min(1, imp / 15);
      S.sfx(imp > 10 ? 'crash' : 'bump', Math.min(1, imp / 12));
      if (G.mission && G.mission.onCrash) G.mission.onCrash(imp);
      if (v.spec.two && imp > 13) { exitVehicle(true, true); G.damagePlayer(imp * 1.5); }
    }
    if (v.hp <= 0 && !v.dead) ignite(v);
  }
  function explode(v) {
    v.dead = true;
    v.hp = 0;
    v.obj.mesh.userData.wrecked = true;
    v.obj.mesh.material = [deadMat, deadMat, deadMat];
    if (v.rider) { v.obj.group.remove(v.rider.root); const p = G.spawnPed(v.pos.x + 1, v.pos.z, { state: 'fallen', hp: 0 }); p.ch.root.rotation.x = -1.5; v.rider = null; }
    S.sfx('explode', 1 / (1 + dist(v.pos, G.player.pos) / 40));
    for (let i = 0; i < 26; i++) spawnFx('fire', v.pos.x + U.mr(-1, 1), 1 + U.mr(0, 1), v.pos.z + U.mr(-1, 1), U.mr(-4, 4), U.mr(3, 9), U.mr(-4, 4), U.mr(0.6, 1.2), 2.6);
    for (let i = 0; i < 14; i++) spawnFx('smoke', v.pos.x, 1.5, v.pos.z, U.mr(-2, 2), U.mr(2, 5), U.mr(-2, 2), U.mr(2, 3.5), 1.5);
    const P = G.player;
    if (dist(v.pos, P.pos) < 7) { G.damagePlayer(v === P.vehicle ? 50 : 35); G.cam.shake = 1; }
    if (v === P.vehicle) exitVehicle(true, true);
    for (const p of G.peds) if (dist(p.pos, v.pos) < 6) hurtPed(p, 100, v.pos, false);
    for (const o of G.vehicles) if (o !== v && !o.dead && dist(o.pos, v.pos) < 6) { o.hp -= 40; if (o.hp <= 0) G.later(0.3, () => !o.dead && !o.removed && ignite(o)); }
    if (v.lastHitByPlayer) G.crime(1.2);
    v.deadT = 40;
    v.driver = null;
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  const VCELL = 16;
  const vgrid = new Map();
  function buildVGrid() {
    vgrid.clear();
    for (const v of G.vehicles) {
      const k = Math.floor(v.pos.x / VCELL) * 10007 + Math.floor(v.pos.z / VCELL);
      let a = vgrid.get(k);
      if (!a) vgrid.set(k, (a = []));
      a.push(v);
    }
  }
  const nearBuf = [];
  function vehiclesNear(x, z, r) {
    nearBuf.length = 0;
    const c = Math.ceil(r / VCELL), cx = Math.floor(x / VCELL), cz = Math.floor(z / VCELL);
    for (let i = cx - c; i <= cx + c; i++) for (let j = cz - c; j <= cz + c; j++) { const a = vgrid.get(i * 10007 + j); if (a) for (const v of a) nearBuf.push(v); }
    return nearBuf;
  }
  G.vehiclesNear = vehiclesNear;
  function vehiclePairs(dt) {
    const vs = G.vehicles;
    for (let i = 0; i < vs.length; i++) {
      const a = vs[i];
      const near = vehiclesNear(a.pos.x, a.pos.z, 14).slice();
      for (const b of near) {
        if (b.id <= a.id) continue;
        const R = (a.spec.len + b.spec.len) / 2;
        const dx0 = b.pos.x - a.pos.x, dz0 = b.pos.z - a.pos.z;
        if (dx0 * dx0 + dz0 * dz0 > R * R) continue;
        const ca = circles(a), cb = circles(b);
        const afx = Math.sin(a.h), afz = Math.cos(a.h), bfx = Math.sin(b.h), bfz = Math.cos(b.h);
        for (const oa of ca.offs) for (const ob of cb.offs) {
          const ax = a.pos.x + afx * oa, az = a.pos.z + afz * oa, bx = b.pos.x + bfx * ob, bz = b.pos.z + bfz * ob;
          const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), rr = ca.r + cb.r;
          if (d >= rr || d < 1e-4) continue;
          const nx = dx / d, nz = dz / d, pen = rr - d;
          const ma = a.spec.len * a.spec.wid, mb = b.spec.len * b.spec.wid;
          const wa = mb / (ma + mb), wb = ma / (ma + mb);
          a.pos.x -= nx * pen * wa; a.pos.z -= nz * pen * wa;
          b.pos.x += nx * pen * wb; b.pos.z += nz * pen * wb;
          const rel = (b.vel.x - a.vel.x) * nx + (b.vel.z - a.vel.z) * nz;
          if (rel < 0) {
            const j2 = -rel * 1.2;
            a.vel.x -= nx * j2 * wa; a.vel.z -= nz * j2 * wa;
            b.vel.x += nx * j2 * wb; b.vel.z += nz * j2 * wb;
            const imp = -rel;
            if (imp > 5) {
              vehicleImpact(a, imp * wa * 1.4); vehicleImpact(b, imp * wb * 1.4);
              const pv = G.player.vehicle;
              if (a === pv || b === pv) {
                const other = a === pv ? b : a;
                other.lastHitByPlayer = true;
                if (other.driver === 'ai' && other.ai) { other.ai.panicT = 3; other.honkT = 0.1; }
                if (other.driver === 'police' || other.type === 'police') G.crime(0.8);
                if (other.spec.two && other.rider && imp > 7) knockRider(other, imp);
              }
              if (imp > 6) spawnFx('spark', (ax + bx) / 2, 0.8, (az + bz) / 2, 0, 2, 0, 0.3, 0.3, 6);
            }
          }
        }
      }
    }
  }
  function knockRider(v, imp) {
    if (!v.rider) return;
    v.obj.group.remove(v.rider.root);
    const p = G.spawnPed(v.pos.x, v.pos.z, { spec: v.rider.spec });
    p.state = 'fallen'; p.t = 4; p.hp = 20;
    p.fly = { vx: v.vel.x * 0.5, vz: v.vel.z * 0.5, vy: 4 };
    v.rider = null;
    v.driver = null;
    v.dead = false;
    G.crime(0.6);
  }

  // ---------------- Enter / exit ----------------
  function nearestVehicle(maxD) {
    let best = null, bd = maxD;
    for (const v of G.vehicles) {
      if (v.dead || v.driver === 'script') continue;
      const d = dist(v.pos, G.player.pos) - v.spec.len / 2 + (v.spec.two ? 0.4 : 1);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
  function enterVehicle(v) {
    const P = G.player;
    if (v.driver === 'ai' || v.driver === 'police' || v.rider) {
      // carjack
      const fx = Math.sin(v.h), fz = Math.cos(v.h);
      const lx = fz, lz = -fx;
      const spec = v.rider ? v.rider.spec : v.type === 'police' ? copSpec() : M.randomPedSpec();
      if (v.rider) { v.obj.group.remove(v.rider.root); v.rider = null; }
      const p = G.spawnPed(v.pos.x + lx * (v.spec.wid / 2 + 0.8), v.pos.z + lz * (v.spec.wid / 2 + 0.8), { spec, state: 'flee' });
      p.fleeT = 12;
      if (v.type === 'police') { p.cop = true; p.state = 'cop'; G.crime(2); } else G.crime(0.7);
      UI.toast(v.type === 'bus' ? '司機：欸欸欸！公車不能開走啦！' : U.mpick(['欸！你幹嘛啦！', '搶車喔！報警了喔！', '我的車啦！！', '救命喔～']));
    }
    v.driver = 'player';
    v.ai = null;
    v.script = null;
    v.parked = false;
    v.persist = true;
    P.vehicle = v;
    if (v.spec.two) {
      v.obj.group.add(P.ch.root);
      P.ch.root.position.set(0, 0, -0.22);
      P.ch.root.rotation.set(0, 0, 0);
    } else {
      P.ch.root.visible = false;
    }
    G.cam.dist = v.spec.two ? 5 : v.type === 'bus' ? 15 : 8;
    S.sfx('door');
    UI.vehicle(v);
    if (G.mission && G.mission.onEnter) G.mission.onEnter(v);
    if (G.lastVehicle && G.lastVehicle !== v && !G.lastVehicle.mission) G.lastVehicle.persist = false;
    G.lastVehicle = v;
  }
  function exitVehicle(force, bail) {
    const P = G.player, v = P.vehicle;
    if (!v) return;
    if (!force && Math.abs(v.fwd) > 7) bail = true;
    const fx = Math.sin(v.h), fz = Math.cos(v.h);
    const lx = fz, lz = -fx;
    if (v.spec.two) v.obj.group.remove(P.ch.root);
    G.scene.add(P.ch.root);
    P.ch.root.visible = true;
    const out = v.spec.wid / 2 + 0.7;
    P.pos.set(v.pos.x + lx * out, W.groundAt(v.pos.x, v.pos.z), v.pos.z + lz * out);
    const c = { x: P.pos.x, z: P.pos.z };
    W.collideCircle(c, 0.4); P.pos.x = c.x; P.pos.z = c.z;
    P.yaw = v.h;
    P.vel.set(bail ? v.vel.x * 0.4 : 0, 0, bail ? v.vel.z * 0.4 : 0);
    if (bail) { P.fallT = 1.4; G.damagePlayer(Math.min(25, Math.abs(v.fwd) * 0.8)); }
    v.driver = null;
    v.steer = 0;
    P.vehicle = null;
    S.setEngine(false, false, 0, 0);
    G.headlight.intensity = 0;
    if (G.radio) { G.radio = 0; S.radio(0); }
    UI.vehicle(null);
    S.sfx('door');
    if (G.mission && G.mission.onExit) G.mission.onExit(v);
  }
  G.exitVehicle = exitVehicle;
  G.enterVehicle = enterVehicle;

  // ---------------- Player update ----------------
  function updatePlayer(dt) {
    const P = G.player, cam = G.cam;
    if (P.vehicle) return updateDriving(dt);
    const pad = I.pad;
    let mx = (I.down('KeyD') || I.down('ArrowRight') ? 1 : 0) - (I.down('KeyA') || I.down('ArrowLeft') ? 1 : 0) + I.stick.x + (pad ? pad.lx : 0);
    let my = (I.down('KeyW') || I.down('ArrowUp') ? 1 : 0) - (I.down('KeyS') || I.down('ArrowDown') ? 1 : 0) + I.stick.y - (pad ? pad.ly : 0);
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    const aiming = (I.rmb || (pad && pad.lt > 0.4)) && G.weapon === 'pistol';
    P.aiming = aiming;
    const run = I.down('ShiftLeft') || I.down('ShiftRight') || padDown('ShiftLeft') || ml > 0.95 && I.stick.run;
    const fwdX = Math.sin(cam.yaw), fwdZ = Math.cos(cam.yaw);
    const rX = -fwdZ, rZ = fwdX;
    let tx = fwdX * my + rX * mx, tz = fwdZ * my + rZ * mx;
    const speed = (P.fallT > 0 ? 0 : G.carry ? 1.9 : aiming ? 2.2 : run ? 6.2 : 2.6) * (G.buffT > 0 && !G.carry ? 1.22 : 1);
    if (P.fallT > 0) { P.fallT -= dt; tx = tz = 0; }
    const wade = W.floodAt(P.pos.x, P.pos.z);
    if (wade > 0.04) { tx *= 0.55; tz *= 0.55; if (P.speed > 1 && Math.random() < 0.15) spawnFx('splash', P.pos.x, 0.2 + wade, P.pos.z, 0, 1.5, 0, 0.4, 0.4); }
    P.vel.x = U.damp(P.vel.x, tx * speed, P.onGround ? 12 : 2, dt);
    P.vel.z = U.damp(P.vel.z, tz * speed, P.onGround ? 12 : 2, dt);
    if (aiming) P.yaw = U.dampAngle(P.yaw, cam.yaw, 20, dt);
    else if (Math.hypot(tx, tz) > 0.1) P.yaw = U.dampAngle(P.yaw, Math.atan2(tx, tz), 12, dt);
    // jump
    if (I.hit('Space') && P.onGround && P.fallT <= 0) { P.vy = 5.2; P.onGround = false; }
    P.vy -= 18 * dt;
    P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt; P.pos.y += P.vy * dt;
    const gy = W.groundAt(P.pos.x, P.pos.z);
    if (P.pos.y <= gy) { P.pos.y = gy; P.vy = 0; P.onGround = true; }
    const c = { x: P.pos.x, z: P.pos.z };
    W.collideCircle(c, 0.35, P.pos.y + 0.3);
    // vehicles block player
    for (const v of G.vehicles) {
      if (Math.abs(v.pos.x - c.x) > 8 || Math.abs(v.pos.z - c.z) > 8) continue;
      const C = circles(v), fx = Math.sin(v.h), fz = Math.cos(v.h);
      for (const off of C.offs) {
        const vx = v.pos.x + fx * off, vz = v.pos.z + fz * off;
        const dx = c.x - vx, dz = c.z - vz, d = Math.hypot(dx, dz), rr = C.r + 0.35;
        if (d < rr && d > 1e-4) {
          c.x = vx + (dx / d) * rr; c.z = vz + (dz / d) * rr;
          const sp = Math.hypot(v.vel.x, v.vel.z);
          if (sp > 5 && P.fallT <= 0 && !v.dead) { G.damagePlayer(sp * 1.6); P.fallT = 1.5; P.vel.set(v.vel.x * 0.6, 0, v.vel.z * 0.6); P.vy = 3; S.sfx('bump'); }
        }
      }
    }
    P.pos.x = c.x; P.pos.z = c.z;
    P.speed = Math.hypot(P.vel.x, P.vel.z);
    // anim
    const ch = P.ch;
    ch.root.position.copy(P.pos);
    ch.root.rotation.y = P.yaw;
    M.animate(ch, { speed: P.speed, mode: P.fallT > 0 ? 'fallen' : aiming ? 'aim' : 'walk', jump: !P.onGround, weapon: G.weapon }, dt);
    // attack
    G.attackT = Math.max(0, (G.attackT || 0) - dt);
    const attackPressed = I.lmbHit || (I.padAttack && G.attackT <= 0 && G.weapon === 'pistol' && aiming);
    if (attackPressed && P.fallT <= 0 && G.attackT <= 0 && G.state === 'play') attack(aiming);
    // enter vehicle
    if (I.hit('KeyF') && P.fallT <= 0) {
      const v = nearestVehicle(2.2);
      if (v && G.carry) UI.toast('先把沙包放下才能上車');
      else if (v) enterVehicle(v);
    }
    // arrest progress
    updateArrest(dt);
  }

  function updateDriving(dt) {
    const P = G.player, v = P.vehicle, pad = I.pad;
    let th = (I.down('KeyW') || I.down('ArrowUp') ? 1 : 0) - (I.down('KeyS') || I.down('ArrowDown') ? 1 : 0) + I.stick.y;
    let st = (I.down('KeyA') || I.down('ArrowLeft') ? 1 : 0) - (I.down('KeyD') || I.down('ArrowRight') ? 1 : 0) - I.stick.x;
    if (pad) { th += pad.rt - pad.lt; st -= pad.lx; }
    th = U.clamp(th, -1, 1); st = U.clamp(st, -1, 1);
    let hand = I.down('Space') || padDown('Space');
    if (v.dead) th = 0;
    if (G.freeze) { th = 0; st = 0; hand = true; }
    if (v.fuel <= 0 && (th > 0 || (th < 0 && v.fwd < 0.5))) { th = 0; if (!v.emptyWarned) { v.emptyWarned = true; UI.toast('沒油了！推去加油站，或換一台車'); } }
    vehicleStep(v, { throttle: th, steer: st, hand }, dt);
    // fuel: a car tank lasts ~9 km, a scooter ~14 km
    const range = v.spec.two ? 14000 : v.spec.len > 6 ? 7000 : 9000;
    v.fuel = Math.max(0, v.fuel - (Math.abs(v.fwd) * dt) / range);
    if (v.fuel < 0.15 && !v.lowWarned) { v.lowWarned = true; UI.toast('油快沒了，找加油站（地圖上的「油」）'); }
    if (P.vehicle !== v) return; // thrown off during the physics step
    P.pos.set(v.pos.x, v.pos.y, v.pos.z);
    P.yaw = v.h;
    const ratio = U.clamp(Math.abs(v.fwd) / v.spec.max, 0, 1);
    S.setEngine(!v.dead, !!v.spec.two, ratio, Math.max(0, th));
    if (v.rider === null && v.spec.two) M.animate(P.ch, { mode: 'sit', seatY: v.spec.seatY }, dt);
    if (I.hit('KeyH') || padDown('KeyH') && !G._hornHeld) { S.sfx('horn'); honkScare(); }
    G._hornHeld = padDown('KeyH');
    if (I.hit('KeyF')) exitVehicle(false);
    if (I.hit('KeyR')) { G.radio = ((G.radio || 0) + 1) % 3; S.radio(G.radio); UI.toast(['收音機關閉', '📻 城市 Lo-Fi 電台', '📻 夜市電音台'][G.radio]); }
    if (!G.freeze) Traffic.checkPlayer(v);
    // run over pedestrians
    const sp = Math.hypot(v.vel.x, v.vel.z);
    if (sp > 3) for (const p of G.peds) {
      if (p.state === 'fallen' && p.fly) continue;
      const dx = p.pos.x - v.pos.x, dz = p.pos.z - v.pos.z;
      if (dx * dx + dz * dz > (v.spec.len / 2 + 1) ** 2) continue;
      const fx = Math.sin(v.h), fz = Math.cos(v.h);
      const along = dx * fx + dz * fz, lat = Math.abs(-dx * fz + dz * fx);
      if (Math.abs(along) < v.spec.len / 2 + 0.3 && lat < v.spec.wid / 2 + 0.35) {
        hurtPed(p, sp * 7, v.pos, true, { vx: v.vel.x * 0.8, vz: v.vel.z * 0.8, vy: 2 + sp * 0.25 });
        G.crime(p.cop ? 1.5 : 0.9);
        v.vel.x *= 0.85; v.vel.z *= 0.85;
        S.sfx('bump');
        G.cam.shake = 0.3;
      }
    }
    // headlight
    const hl = G.headlight;
    hl.intensity = G.night > 0.35 && !v.dead ? 60 : 0;
    const fx = Math.sin(v.h), fz = Math.cos(v.h);
    hl.position.set(v.pos.x + fx * v.spec.len * 0.5, 1.1, v.pos.z + fz * v.spec.len * 0.5);
    hl.target.position.set(v.pos.x + fx * 25, 0, v.pos.z + fz * 25);
    G.stats.driven += sp * dt;
  }

  function honkScare() {
    for (const p of G.peds) if (!p.cop && !p.hostile && p.state === 'walk' && dist(p.pos, G.player.pos) < 12) { p.state = 'flee'; p.fleeT = 2.5; }
  }

  // ---------------- Combat ----------------
  const _ray = new THREE.Raycaster();
  function attack(aiming) {
    const P = G.player;
    const w = G.weapon;
    if (w === 'pistol') {
      if (G.ammo <= 0) { S.sfx('click'); UI.toast('沒子彈了（可以去撿或買）'); G.attackT = 0.4; return; }
      G.ammo--;
      G.attackT = 0.28;
      UI.weapon();
      let ox, oy, oz, dx, dy, dz;
      if (aiming) {
        _ray.setFromCamera(new THREE.Vector2(0, 0), G.camera);
        const o = _ray.ray.origin, d = _ray.ray.direction;
        // start ray at the player to avoid hitting things behind
        const back = new V3().subVectors(P.pos, o).dot(d);
        ox = o.x + d.x * back; oy = o.y + d.y * back; oz = o.z + d.z * back;
        dx = d.x; dy = d.y; dz = d.z;
      } else {
        // soft auto-aim toward nearest target in front
        let tgt = null, bd = 30;
        for (const p of G.peds) {
          if (p.state === 'fallen') continue;
          const ddx = p.pos.x - P.pos.x, ddz = p.pos.z - P.pos.z, d = Math.hypot(ddx, ddz);
          if (d > bd) continue;
          const dot = (ddx * Math.sin(P.yaw) + ddz * Math.cos(P.yaw)) / d;
          if (dot > 0.9) { bd = d; tgt = p; }
        }
        ox = P.pos.x; oy = P.pos.y + 1.4; oz = P.pos.z;
        if (tgt) { const v = new V3(tgt.pos.x - ox, tgt.pos.y + 1.1 - oy, tgt.pos.z - oz).normalize(); dx = v.x; dy = v.y; dz = v.z; }
        else { dx = Math.sin(P.yaw); dy = 0; dz = Math.cos(P.yaw); }
      }
      const maxD = 90;
      let hitD = W.raycast(ox, oy, oz, dx, dy, dz, maxD);
      let hitPed = null, hitVeh = null;
      for (const p of G.peds) {
        if (p.state === 'fallen') continue;
        const t = rayPoint(ox, oy, oz, dx, dy, dz, p.pos.x, p.pos.y + 1.0, p.pos.z, 0.55);
        if (t < hitD) { hitD = t; hitPed = p; hitVeh = null; }
      }
      for (const v of G.vehicles) {
        if (v === P.vehicle) continue;
        const t = rayPoint(ox, oy, oz, dx, dy, dz, v.pos.x, 0.8, v.pos.z, v.spec.two ? 0.8 : v.spec.wid * 0.8);
        if (t < hitD) { hitD = t; hitVeh = v; hitPed = null; }
      }
      const ex = ox + dx * hitD, ey = oy + dy * hitD, ez = oz + dz * hitD;
      tracer(P.pos.x + Math.sin(P.yaw) * 0.6, P.pos.y + 1.35, P.pos.z + Math.cos(P.yaw) * 0.6, ex, ey, ez);
      spawnFx('spark', ex, ey, ez, 0, 1, 0, 0.25, 0.25, 4);
      S.sfx('gun');
      P.ch.punchT = 0;
      if (hitPed) { hurtPed(hitPed, 40, P.pos, false); G.crime(hitPed.cop ? 1.6 : 1.0); }
      else if (hitVeh) { hitVeh.hp -= 12; hitVeh.lastHitByPlayer = true; if (hitVeh.hp <= 0 && !hitVeh.dead) ignite(hitVeh); if (hitVeh.type === 'police') G.crime(0.6); }
      // gunfire panics people nearby
      let witnesses = false;
      for (const p of G.peds) if (!p.cop && !p.hostile && dist(p.pos, P.pos) < 40) { p.state = 'flee'; p.fleeT = 8; witnesses = true; }
      if (witnesses) G.crime(0.35);
      return;
    }
    // melee
    G.attackT = w === 'bat' ? 0.55 : 0.4;
    P.ch.punchT = 0.35;
    S.sfx('whoosh');
    const range = w === 'bat' ? 2.3 : 1.6;
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    let any = false;
    for (const p of G.peds) {
      if (p.state === 'fallen') continue;
      const dx = p.pos.x - P.pos.x, dz = p.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d > range || d < 0.01) continue;
      if ((dx * fx + dz * fz) / d < 0.35) continue;
      G.later(0.12, () => { if (!p.removed) { hurtPed(p, w === 'bat' ? 38 : 18, P.pos, false, null, true); S.sfx('punch'); } });
      if (!p.hostile) G.crime(p.cop ? 1.3 : 0.35);
      any = true;
    }
    if (!any) for (const v of G.vehicles) {
      if (dist(v.pos, P.pos) < v.spec.len / 2 + 1 && w === 'bat') { v.hp -= 6; S.sfx('bump'); break; }
    }
  }
  function rayPoint(ox, oy, oz, dx, dy, dz, px, py, pz, r) {
    const wx = px - ox, wy = py - oy, wz = pz - oz;
    const t = wx * dx + wy * dy + wz * dz;
    if (t < 0) return Infinity;
    const cx = ox + dx * t - px, cy = oy + dy * t - py, cz = oz + dz * t - pz;
    return cx * cx + cy * cy * 0.35 + cz * cz < r * r ? t : Infinity;
  }
  function hurtPed(p, dmg, from, byCar, fly, melee) {
    p.hp -= dmg;
    const dx = p.pos.x - from.x, dz = p.pos.z - from.z, d = Math.hypot(dx, dz) || 1;
    spawnFx('hit', p.pos.x, p.pos.y + 1.2, p.pos.z, 0, 1, 0, 0.35, 0.3, 3);
    if (p.hp <= 0 || byCar) {
      if (p.state !== 'fallen') { G.stats.knocked++; if (G.mission && G.mission.onPedDown) G.mission.onPedDown(p); if (p.cop) G.crime(0.8); }
      p.state = 'fallen';
      p.t = byCar && p.hp > 0 ? 3 : 25;
      p.fly = fly || { vx: (dx / d) * 3, vz: (dz / d) * 3, vy: 2 };
      if (p.hp <= 0 && Math.random() < 0.5 && !p.cop) G.later(0.6, () => G.spawnPickup('cash', p.pos.x, p.pos.z, U.ri(20, 120)));
    } else {
      p.pos.x += (dx / d) * 0.5; p.pos.z += (dz / d) * 0.5;
      p.stagger = 0.35;
      if (p.cop || p.hostile) { p.state = p.cop ? 'cop' : 'fight'; }
      else if (melee && Math.random() < 0.25) { p.state = 'fight'; p.hostile = true; p.fightT = 12; }
      else { p.state = 'flee'; p.fleeT = 10; }
    }
  }
  G.hurtPed = hurtPed;

  function tracer(x0, y0, z0, x1, y1, z1) {
    const g = new THREE.BufferGeometry().setFromPoints([new V3(x0, y0, z0), new V3(x1, y1, z1)]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9 }));
    G.scene.add(l);
    G.fx.push({ kind: 'line', obj: l, life: 0.07, max: 0.07 });
    spawnFx('flash', x0, y0, z0, 0, 0, 0, 0.5, 0.06, 1);
  }
  G.tracer = tracer;

  // ---------------- FX (sprites) ----------------
  const fxTex = U.canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const FXM = {
    smoke: { color: 0x555555, blend: THREE.NormalBlending, op: 0.55 },
    fire: { color: 0xff7a20, blend: THREE.AdditiveBlending, op: 1 },
    spark: { color: 0xffd060, blend: THREE.AdditiveBlending, op: 1 },
    hit: { color: 0xffffff, blend: THREE.AdditiveBlending, op: 0.9 },
    flash: { color: 0xffe0a0, blend: THREE.AdditiveBlending, op: 1 },
    dust: { color: 0xb0a898, blend: THREE.NormalBlending, op: 0.4 },
    splash: { color: 0xd8e8f0, blend: THREE.NormalBlending, op: 0.7 },
    cash: { color: 0x6dff8a, blend: THREE.AdditiveBlending, op: 1 },
  };
  for (const k in FXM) FXM[k].mat = new THREE.SpriteMaterial({ map: fxTex, color: FXM[k].color, blending: FXM[k].blend, transparent: true, opacity: FXM[k].op, depthWrite: false });
  const fxPool = {};
  function spawnFx(kind, x, y, z, vx, vy, vz, size, life, n = 1) {
    const pool = fxPool[kind] || (fxPool[kind] = []);
    for (let i = 0; i < n; i++) {
      if (G.fx.length > 260) return;
      let s = pool.pop();
      if (!s) { s = new THREE.Sprite(FXM[kind].mat.clone()); G.scene.add(s); }
      s.visible = true;
      s.position.set(x, y, z);
      s.scale.setScalar(size);
      G.fx.push({ kind, obj: s, vx: vx + (n > 1 ? U.mr(-3, 3) : 0), vy: vy + (n > 1 ? U.mr(0, 3) : 0), vz: vz + (n > 1 ? U.mr(-3, 3) : 0), life, max: life, size, op: FXM[kind].op });
    }
  }
  G.spawnFx = spawnFx;
  function updateFx(dt) {
    for (let i = G.fx.length - 1; i >= 0; i--) {
      const f = G.fx[i];
      f.life -= dt;
      if (f.life <= 0) {
        if (f.kind === 'line') { G.scene.remove(f.obj); f.obj.material.dispose(); f.obj.geometry.dispose(); }
        else { f.obj.visible = false; (fxPool[f.kind] || (fxPool[f.kind] = [])).push(f.obj); }
        G.fx.splice(i, 1);
        continue;
      }
      if (f.kind === 'line') { f.obj.material.opacity = f.life / f.max; continue; }
      const t = f.life / f.max;
      f.obj.position.x += f.vx * dt; f.obj.position.y += f.vy * dt; f.obj.position.z += f.vz * dt;
      if (f.kind === 'spark' || f.kind === 'cash') f.vy -= 12 * dt;
      if (f.kind === 'smoke' || f.kind === 'fire') { f.obj.scale.setScalar(f.size * (1 + (1 - t) * 1.5)); f.vx *= 0.97; f.vz *= 0.97; }
      f.obj.material.opacity = f.op * t;
    }
  }

  // ---------------- Pickups ----------------
  G.spawnPickup = function (kind, x, z, amount, opts = {}) {
    const mesh = M.pickupMesh(kind);
    mesh.position.set(x, W.groundAt(x, z) + 0.7, z);
    G.scene.add(mesh);
    const pk = { kind, x, z, mesh, amount: amount || 0, respawn: opts.respawn || 0, hidden: false, id: opts.id, ring: null };
    if (kind !== 'cash') {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 24), new THREE.MeshBasicMaterial({ color: kind === 'boba' ? 0xffc0e0 : 0x9ff0ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, W.groundAt(x, z) + 0.06, z);
      G.scene.add(ring);
      pk.ring = ring;
    }
    G.pickups.push(pk);
    return pk;
  };
  function updatePickups(dt, t) {
    const P = G.player;
    for (let i = G.pickups.length - 1; i >= 0; i--) {
      const pk = G.pickups[i];
      if (pk.hidden) { pk.cool -= dt; if (pk.cool <= 0) { pk.hidden = false; pk.mesh.visible = true; if (pk.ring) pk.ring.visible = true; } continue; }
      pk.mesh.rotation.y = t * 2;
      pk.mesh.position.y = W.groundAt(pk.x, pk.z) + 0.8 + Math.sin(t * 3 + pk.x) * 0.12;
      if (U.dist2(pk.x, pk.z, P.pos.x, P.pos.z) > (P.vehicle ? 3.2 : 1.6) ** 2) continue;
      if (!collect(pk)) continue;
      if (pk.respawn) { pk.hidden = true; pk.cool = pk.respawn; pk.mesh.visible = false; if (pk.ring) pk.ring.visible = false; }
      else { G.removePickup(pk); }
    }
  }
  G.removePickup = function (pk) {
    G.scene.remove(pk.mesh);
    if (pk.ring) { G.scene.remove(pk.ring); pk.ring.geometry.dispose(); pk.ring.material.dispose(); }
    const i = G.pickups.indexOf(pk);
    if (i >= 0) G.pickups.splice(i, 1);
  };
  function collect(pk) {
    switch (pk.kind) {
      case 'cash': G.addMoney(pk.amount, '撿到錢'); break;
      case 'pistol': G.weapons.pistol = true; G.ammo += 36; G.setWeapon('pistol'); UI.toast('撿到 手槍 +36 發（右鍵瞄準、左鍵射擊）'); S.sfx('pickup'); break;
      case 'bat': G.weapons.bat = true; G.setWeapon('bat'); UI.toast('撿到 球棒'); S.sfx('pickup'); break;
      case 'armor': if (G.armor >= 100) return false; G.armor = 100; UI.toast('穿上防彈背心'); S.sfx('pickup'); break;
      case 'health': if (G.health >= 100) return false; G.health = 100; UI.toast('體力全滿'); S.sfx('eat'); break;
      case 'boba':
        if (!G.save.boba.includes(pk.id)) G.save.boba.push(pk.id);
        G.addMoney(200, `收集珍奶 ${G.save.boba.length}/${G.BOBA_TOTAL}`);
        UI.bigToast('珍奶收集', `${G.save.boba.length} / ${G.BOBA_TOTAL}`);
        if (G.save.boba.length === G.BOBA_TOTAL) { G.addMoney(5000, '珍奶全收集！'); UI.bigText('珍奶大師', '全台北的珍奶都被你喝光了'); }
        break;
    }
    return true;
  }

  // ---------------- Traffic AI ----------------
  function laneOff(seg, v) {
    if (v.spec.two) return seg.w / 2 - (seg.w >= 20 ? 1.4 : 1.2);
    if (seg.w >= 20) return v.ai && v.ai.lane === 1 ? seg.w * 0.34 : seg.w * 0.15;
    return seg.w / 4;
  }
  function crossW(node, seg) { return seg.axis === 'z' ? W.Z[node.j].w : W.X[node.i].w; }
  function chooseNext(to, from, v) {
    let opts = to.adj.filter((e) => !e.seg.ped && e.to !== from.id);
    if (!opts.length) opts = to.adj.filter((e) => !e.seg.ped);
    if (v.type === 'bus') { const mains = opts.filter((e) => e.seg.main); if (mains.length) opts = mains; }
    // prefer going straight
    const dx = to.x - from.x, dz = to.z - from.z;
    const straight = opts.find((e) => { const n = W.nodes[e.to]; return Math.sign(n.x - to.x) === Math.sign(dx) && Math.sign(n.z - to.z) === Math.sign(dz); });
    if (straight && Math.random() < 0.55) return { from: to, to: W.nodes[straight.to], seg: straight.seg };
    const e = U.mpick(opts);
    return e ? { from: to, to: W.nodes[e.to], seg: e.seg } : null;
  }
  function placeOnEdge(v, from, to, seg, t) {
    const dx = (to.x - from.x) / seg.len, dz = (to.z - from.z) / seg.len;
    v.ai = { from, to, seg, next: null, lane: Math.random() < 0.5 ? 1 : 0, fac: U.mr(0.85, 1.12), panicT: 0, blockT: 0, revT: 0 };
    const off = laneOff(seg, v);
    v.pos.set(from.x + dx * t - dz * off, 0, from.z + dz * t + dx * off);
    v.h = Math.atan2(dx, dz);
  }
  function aiDrive(v, dt) {
    const ai = v.ai;
    if (!ai) return vehicleStep(v, { throttle: 0, steer: 0, hand: true }, dt);
    let A = ai.from, B = ai.to, seg = ai.seg;
    let dx = (B.x - A.x) / seg.len, dz = (B.z - A.z) / seg.len;
    let t = (v.pos.x - A.x) * dx + (v.pos.z - A.z) * dz;
    if (!ai.next) ai.next = chooseNext(B, A, v);
    if (ai.next && t > seg.len - crossW(B, seg) / 2 - 1) {
      ai.from = ai.next.from; ai.to = ai.next.to; ai.seg = ai.next.seg; ai.next = null;
      A = ai.from; B = ai.to; seg = ai.seg;
      dx = (B.x - A.x) / seg.len; dz = (B.z - A.z) / seg.len;
      t = (v.pos.x - A.x) * dx + (v.pos.z - A.z) * dz;
      ai.next = chooseNext(B, A, v);
    }
    const sp = Math.abs(v.fwd);
    const look = 4 + sp * 0.55 + (v.spec.len > 5 ? 4 : 0);
    let tx, tz;
    const off = laneOff(seg, v);
    if (t + look <= seg.len || !ai.next) {
      const tt = Math.min(t + look, seg.len);
      tx = A.x + dx * tt - dz * off; tz = A.z + dz * tt + dx * off;
    } else {
      const n = ai.next, nl = n.seg.len;
      const ndx = (n.to.x - n.from.x) / nl, ndz = (n.to.z - n.from.z) / nl;
      const rem = t + look - seg.len;
      const noff = laneOff(n.seg, v);
      tx = n.from.x + ndx * rem - ndz * noff; tz = n.from.z + ndz * rem + ndx * noff;
    }
    // lost? re-seat onto road graph
    const latErr = Math.abs((v.pos.x - A.x) * -dz + (v.pos.z - A.z) * dx - off);
    if (latErr > 14 || t < -20 || t > seg.len + 20) { reseatAI(v); return; }
    const desired = Math.atan2(tx - v.pos.x, tz - v.pos.z);
    const diff = U.wrapAngle(desired - v.h);
    let steer = U.clamp(diff * 2.4, -1, 1);
    // target speed
    let target = (seg.main ? 13 : 8.5) * ai.fac * (v.spec.two ? 1.1 : 1) * (v.type === 'bus' ? 0.8 : 1);
    if (ai.next && seg.len - t < 22) {
      const turning = ai.next.seg.axis !== seg.axis;
      if (turning) target = Math.min(target, 6.5);
    }
    // traffic lights
    const redStop = Traffic.mustStop(A, B, seg, t, crossW(B, seg));
    if (redStop >= 0) target = Math.min(target, Math.max(0, redStop * 0.6 - 0.4));
    // obstacle detection
    const fx = Math.sin(v.h), fz = Math.cos(v.h);
    const stopD = 3 + sp * 0.9 + v.spec.len / 2;
    let blocked = false, playerBlock = false;
    const check = (x, z, r, isPlayer) => {
      const ox = x - v.pos.x, oz = z - v.pos.z;
      const along = ox * fx + oz * fz;
      if (along <= 0 || along > stopD) return;
      const lat = Math.abs(ox * -fz + oz * fx);
      if (lat < v.spec.wid / 2 + r + 0.3) { blocked = true; if (isPlayer) playerBlock = true; }
    };
    if (!(ai.ignoreT > 0)) {
      for (const o of vehiclesNear(v.pos.x, v.pos.z, 24)) if (o !== v) check(o.pos.x, o.pos.z, o.spec.wid / 2, o === G.player.vehicle);
      for (const p of G.peds) if (p.state !== 'fallen' && Math.abs(p.pos.x - v.pos.x) < 15 && Math.abs(p.pos.z - v.pos.z) < 15) check(p.pos.x, p.pos.z, 0.4);
      if (!G.player.vehicle) check(G.player.pos.x, G.player.pos.z, 0.4, true);
    }
    if (ai.ignoreT > 0) { ai.ignoreT -= dt; blocked = false; }
    if (blocked) {
      target = 0;
      ai.blockT += dt;
      if (playerBlock && ai.blockT > 1.2 && v.honkT <= 0) { v.honkT = U.mr(2, 4); if (dist(v.pos, G.player.pos) < 30) S.sfx('horn', 0.4); }
      if (ai.blockT > 6) { ai.ignoreT = 2.5; ai.blockT = 0; }
    } else ai.blockT = Math.max(0, ai.blockT - dt);
    v.honkT -= dt;
    if (ai.panicT > 0) { ai.panicT -= dt; target = Math.min(target, 2); }
    // stuck (pushed into something)
    if (target > 3 && sp < 0.6 && !blocked) ai.stuckT = (ai.stuckT || 0) + dt; else ai.stuckT = 0;
    if (ai.stuckT > 2.5) { ai.revT = 1.6; ai.stuckT = 0; }
    let throttle;
    if (ai.revT > 0) { ai.revT -= dt; throttle = -0.7; steer = -steer; }
    else throttle = v.fwd < target - 0.5 ? 0.85 : v.fwd > target + 1.2 ? -0.8 : 0.1;
    if (target === 0 && v.fwd < 0.3 && ai.revT <= 0) throttle = 0;
    vehicleStep(v, { throttle, steer, hand: target === 0 && Math.abs(v.fwd) < 1 }, dt);
  }
  function reseatAI(v) {
    const n = W.nearestNode(v.pos.x, v.pos.z, true);
    if (!n) return;
    const e = U.mpick(n.adj.filter((e) => !e.seg.ped));
    if (!e) return;
    const to = W.nodes[e.to];
    const dx = to.x - n.x, dz = to.z - n.z;
    // keep the car where it is but give it the new edge to follow
    v.ai = Object.assign(v.ai || {}, { from: n, to, seg: e.seg, next: null, fac: (v.ai && v.ai.fac) || 1, panicT: 0, blockT: 0, revT: 0 });
    void dx; void dz;
  }

  // ---------------- Police AI ----------------
  function policeDrive(v, dt) {
    const P = G.player;
    const goal = G.copsSeeing || !G.lastSeen ? P.pos : G.lastSeen;
    // lost the suspect and reached the last known spot: patrol the area
    if (!G.copsSeeing && G.lastSeen && dist(v.pos, G.lastSeen) < 30) {
      if (!v.ai) reseatAI(v);
      if (v.ai) { v.ai.fac = 1.25; aiDrive(v, dt); return; }
    }
    v.ai = null;
    const d = dist(v.pos, goal);
    v.repathT = (v.repathT || 0) - dt;
    let tx = goal.x, tz = goal.z;
    const los = d < 60 && W.raycast(v.pos.x, 1.2, v.pos.z, (goal.x - v.pos.x) / d, 0, (goal.z - v.pos.z) / d, d) >= d - 1;
    if (!los) {
      if (v.repathT <= 0 || !v.path || !v.path.length) { v.path = W.path(v.pos.x, v.pos.z, goal.x, goal.z, true); v.repathT = 2; }
      while (v.path && v.path.length && U.dist2(v.path[0].x, v.path[0].z, v.pos.x, v.pos.z) < 12 * 12) v.path.shift();
      if (v.path && v.path.length) { tx = v.path[0].x; tz = v.path[0].z; }
    }
    const desired = Math.atan2(tx - v.pos.x, tz - v.pos.z);
    const diff = U.wrapAngle(desired - v.h);
    let steer = U.clamp(diff * 2.2, -1, 1);
    let throttle = 1;
    if (Math.abs(diff) > 1.6 && Math.abs(v.fwd) < 6) { throttle = -0.8; steer = -steer; }
    const dp = dist(v.pos, P.pos);
    if (!P.vehicle && dp < 14) throttle = v.fwd > 2 ? -1 : 0;
    if (P.vehicle && dp < 10) throttle = 1;
    // stuck
    if (throttle > 0.5 && Math.abs(v.fwd) < 0.8) v.stuckT += dt; else v.stuckT = 0;
    if (v.stuckT > 1.5) { v.revT = 1.2; v.stuckT = 0; }
    if (v.revT > 0) { v.revT -= dt; throttle = -1; steer = -steer; }
    vehicleStep(v, { throttle, steer, hand: Math.abs(diff) > 1.2 && Math.abs(v.fwd) > 12 }, dt);
    // deploy officers when player is on foot and close
    if (!P.vehicle && dp < 16 && G.copsSeeing && Math.abs(v.fwd) < 1.5 && !v.deployed) {
      v.deployed = true;
      const fx = Math.sin(v.h), fz = Math.cos(v.h);
      for (const side of [1, -1]) {
        const p = G.spawnPed(v.pos.x + fz * side * 1.6, v.pos.z - fx * side * 1.6, { spec: copSpec(), cop: true, state: 'cop', hp: 80, weapon: G.wanted >= 2 ? 'pistol' : null });
        p.car = v;
      }
      v.driver = null;
      v.sirenOn = true;
    }
  }
  function copSpec() { return { skin: U.mpick(M.SKINS), shirt: '#2a3f6e', sleeve: '#2a3f6e', pants: '#1b2a4a', shoes: '#111', hair: '#111', style: 'police', stripe: '#e2b33c', scale: 1.02 }; }
  G.copSpec = copSpec;

  function updateArrest(dt) {
    const P = G.player;
    let near = false;
    if (G.wanted >= 1 && G.wanted < 3 && !P.vehicle) for (const p of G.peds) if (p.cop && p.state === 'cop' && dist(p.pos, P.pos) < 1.7) near = true;
    if (near && P.speed < 2.8) P.arrestT += dt; else P.arrestT = Math.max(0, P.arrestT - dt * 2);
    UI.arrest(P.arrestT / 2.2);
    if (P.arrestT > 2.2) { P.arrestT = 0; G.gameOver('busted'); }
  }

  function updateWanted(dt) {
    const P = G.player;
    const stars = Math.floor(G.wanted);
    if (stars <= 0) { G.wanted = Math.max(0, G.wanted - dt * 0.05); S.setSiren(0); return; }
    // any cop sees the player?
    let seen = false, nearest = 999;
    const cops = [...G.vehicles.filter((v) => v.type === 'police' && v.driver === 'police' && !v.dead), ...G.peds.filter((p) => p.cop && p.state !== 'fallen')];
    for (const c of cops) {
      const d = dist(c.pos, P.pos);
      nearest = Math.min(nearest, d);
      if (d < 75) {
        const los = W.raycast(c.pos.x, 1.4, c.pos.z, (P.pos.x - c.pos.x) / d, 0, (P.pos.z - c.pos.z) / d, d) >= d - 1;
        if (los || d < 18) seen = true;
      }
    }
    // right after a crime the radio call gives police your position for a while
    if (G.elapsed - (G.crimeT || -99) < 10 + stars * 3) seen = true;
    G.copsSeeing = seen;
    if (seen) { G.lostT = 0; G.lastSeen = { x: P.pos.x, z: P.pos.z }; } else G.lostT += dt;
    const dz = W.districtAt(P.pos.x, P.pos.z).id;
    const need = (7 + stars * 3.5) * (G.hasPerk('hide') && (dz === 'wanhua' || dz === 'ximen') ? 0.55 : 1);
    G.lostProgress = U.clamp(G.lostT / need, 0, 1);
    if (G.lostT > need) { G.lastSeen = null; G.clearWanted(); UI.toast('甩掉警察了！'); S.sfx('mission'); if (G.mission && G.mission.onLostCops) G.mission.onLostCops(); }
    S.setSiren(U.clamp(1 - nearest / 120, 0, 1));
    // spawn police cars
    const wantCars = [0, 1, 2, 3, 4, 6][stars];
    // count cruisers still in the chase, including ones parked while officers are out on foot
    const have = G.vehicles.filter((v) => v.type === 'police' && !v.dead && (v.driver === 'police' || (v.deployed && dist(v.pos, P.pos) < 200))).length;
    G.copSpawnT = (G.copSpawnT || 0) - dt;
    if (have < wantCars && G.copSpawnT <= 0) {
      G.copSpawnT = seen ? 4 : 9;
      const pt = roadSpawnPoint(90, 180, true);
      if (pt) { const v = G.spawnVehicle('police', pt.x, pt.z, pt.h, { driver: 'police' }); v.sirenOn = true; v.persist = true; }
    }
    // foot patrol near stations of pressure at 1 star
    const footCops = G.peds.filter((p) => p.cop).length;
    if (seen && stars >= 1 && footCops < Math.min(6, stars * 2) && Math.random() < dt * 0.2) {
      const pt = sidewalkSpawnPoint(35, 70);
      if (pt) G.spawnPed(pt.x, pt.z, { spec: copSpec(), cop: true, state: 'cop', hp: 80, weapon: stars >= 2 ? 'pistol' : null });
    }
  }

  // ---------------- Pedestrian AI ----------------
  function updatePeds(dt) {
    const P = G.player;
    for (let i = G.peds.length - 1; i >= 0; i--) {
      const p = G.peds[i];
      const ch = p.ch;
      let speed = 0;
      p.t -= dt;
      if (p.stagger > 0) p.stagger -= dt;
      switch (p.state) {
        case 'walk': {
          if (!p.loop) { assignLoop(p); break; }
          const L = p.loop;
          const step = 1.35 * dt * p.dir;
          p.s += step;
          const [x, z] = loopPoint(L, p.s);
          const dx = x - p.pos.x, dz = z - p.pos.z;
          p.pos.x = x; p.pos.z = z;
          if (Math.abs(dx) + Math.abs(dz) > 0.001) p.yaw = U.dampAngle(p.yaw, Math.atan2(dx, dz), 8, dt);
          speed = 1.35;
          // cross the street at corners sometimes
          if (p.t <= 0) {
            p.t = U.mr(8, 25);
            if (Math.random() < 0.35) startCrossing(p);
            else if (Math.random() < 0.2) { p.state = 'idle'; p.t = U.mr(2, 6); }
          }
          break;
        }
        case 'stroll': {
          const L = p.line;
          p.pos.x += p.dir * 1.1 * dt;
          if (p.pos.x > L.x1 || p.pos.x < L.x0) { p.dir *= -1; p.pos.x = U.clamp(p.pos.x, L.x0, L.x1); }
          p.pos.z = U.damp(p.pos.z, L.z + p.lane, 2, dt);
          p.yaw = U.dampAngle(p.yaw, p.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 6, dt);
          speed = 1.1;
          if (Math.random() < dt * 0.05) { p.state = 'idle'; p.t = U.mr(2, 5); p.back = 'stroll'; }
          break;
        }
        case 'idle':
          if (p.t <= 0) { if (p.back === 'stroll') { p.state = 'stroll'; p.back = null; } else { p.state = 'walk'; p.t = U.mr(8, 20); } }
          break;
        case 'cross': {
          const dx = p.target.x - p.pos.x, dz = p.target.z - p.pos.z, d = Math.hypot(dx, dz);
          if (d < 0.4) { p.state = 'walk'; p.pos.x = p.target.x; p.pos.z = p.target.z; assignLoop(p); p.t = U.mr(10, 25); break; }
          p.pos.x += (dx / d) * 1.5 * dt; p.pos.z += (dz / d) * 1.5 * dt;
          p.yaw = U.dampAngle(p.yaw, Math.atan2(dx, dz), 8, dt);
          speed = 1.5;
          break;
        }
        case 'flee': {
          p.fleeT -= dt;
          const dx = p.pos.x - P.pos.x, dz = p.pos.z - P.pos.z, d = Math.hypot(dx, dz) || 1;
          p.yaw = U.dampAngle(p.yaw, Math.atan2(dx, dz) + Math.sin(p.id + performance.now() / 900) * 0.5, 5, dt);
          moveColl(p, 5.2, dt);
          speed = 5.2;
          if (p.fleeT <= 0 && d > 25) { p.state = 'walk'; assignLoop(p); }
          break;
        }
        case 'fight': {
          // hostile civilians / thugs chase and hit the player
          p.fightT = (p.fightT || 30) - dt;
          const dx = P.pos.x - p.pos.x, dz = P.pos.z - p.pos.z, d = Math.hypot(dx, dz);
          p.yaw = U.dampAngle(p.yaw, Math.atan2(dx, dz), 8, dt);
          if (d > 1.3 && p.stagger <= 0) { moveColl(p, P.vehicle ? 3 : 4.6, dt); speed = 4.6; }
          p.attackT -= dt;
          if (d < 1.5 && p.attackT <= 0 && !P.vehicle && G.state === 'play') {
            p.attackT = U.mr(1.1, 1.7);
            ch.punchT = 0.35;
            G.later(0.15, () => { if (!p.removed && p.state === 'fight' && dist(p.pos, P.pos) < 1.9) { G.damagePlayer(p.weapon === 'bat' ? 9 : 5); S.sfx('punch', 0.7); } });
          }
          if (p.weapon === 'pistol' && d < 30 && d > 4 && p.attackT <= 0) { p.attackT = U.mr(1.2, 2); pedShoot(p, 0.3, 7); }
          if (p.fightT <= 0 && !p.persist) { p.state = 'walk'; p.hostile = false; assignLoop(p); }
          break;
        }
        case 'cop': {
          const dx = P.pos.x - p.pos.x, dz = P.pos.z - p.pos.z, d = Math.hypot(dx, dz);
          if (G.wanted < 1) { p.state = 'flee'; p.fleeT = 20; p.cop = false; break; }
          if (!G.copsSeeing && G.lastSeen && d > 20) {
            // search: walk to the last known position, then look around
            const lx = G.lastSeen.x - p.pos.x, lz = G.lastSeen.z - p.pos.z;
            if (Math.hypot(lx, lz) > 3) { p.yaw = U.dampAngle(p.yaw, Math.atan2(lx, lz), 6, dt); moveColl(p, 3.2, dt); speed = 3.2; }
            else p.yaw += dt * 0.8;
            break;
          }
          p.yaw = U.dampAngle(p.yaw, Math.atan2(dx, dz), 8, dt);
          const shooter = p.weapon === 'pistol' && G.wanted >= 2;
          if ((shooter ? d > 10 : d > 1.2) && p.stagger <= 0) { moveColl(p, 5.4, dt); speed = 5.4; }
          p.attackT -= dt;
          if (shooter && d < 35 && p.attackT <= 0) { p.attackT = U.mr(1.1, 1.8); pedShoot(p, P.vehicle ? 0.25 : 0.35, 8); }
          else if (!shooter && d < 1.5 && G.wanted >= 3 && p.attackT <= 0) { p.attackT = 1; ch.punchT = 0.35; G.damagePlayer(8); S.sfx('punch'); }
          // get back in the car if player drives away
          if (P.vehicle && p.car && !p.car.dead && dist(p.pos, p.car.pos) < 4 && d > 20) { p.car.driver = 'police'; p.car.deployed = false; G.removePed(p); continue; }
          break;
        }
        case 'fallen': {
          if (p.fly) {
            p.fly.vy -= 18 * dt;
            p.pos.x += p.fly.vx * dt; p.pos.z += p.fly.vz * dt; p.pos.y += p.fly.vy * dt;
            p.fly.vx *= 0.96; p.fly.vz *= 0.96;
            const gy = W.groundAt(p.pos.x, p.pos.z);
            if (p.pos.y <= gy) { p.pos.y = gy; p.fly = null; }
            const c = { x: p.pos.x, z: p.pos.z }; W.collideCircle(c, 0.3); p.pos.x = c.x; p.pos.z = c.z;
          }
          if (p.t <= 0) {
            if (p.hp > 0) { p.state = 'flee'; p.fleeT = 8; }
            else if (!p.persist) { G.removePed(p); continue; }
          }
          break;
        }
      }
      if (p.state !== 'fallen' || !p.fly) p.pos.y = U.damp(p.pos.y, W.groundAt(p.pos.x, p.pos.z), 20, dt);
      ch.root.position.copy(p.pos);
      ch.root.rotation.y = p.yaw;
      if (U.dist2(p.pos.x, p.pos.z, G.camera.position.x, G.camera.position.z) < 160 * 160) {
        ch.root.visible = true;
        M.animate(ch, { speed, mode: p.state === 'fallen' ? 'fallen' : p.dance ? 'dance' : p.weapon === 'pistol' && (p.state === 'cop' || p.state === 'fight') ? 'aim' : 'walk', weapon: p.weapon }, dt);
      } else ch.root.visible = false;
    }
  }
  function moveColl(p, sp, dt) {
    p.pos.x += Math.sin(p.yaw) * sp * dt; p.pos.z += Math.cos(p.yaw) * sp * dt;
    const c = { x: p.pos.x, z: p.pos.z };
    W.collideCircle(c, 0.32, 0.5);
    p.pos.x = c.x; p.pos.z = c.z;
  }
  function pedShoot(p, acc, dmg) {
    const P = G.player;
    const d = dist(p.pos, P.pos);
    const los = W.raycast(p.pos.x, 1.4, p.pos.z, (P.pos.x - p.pos.x) / d, 0, (P.pos.z - p.pos.z) / d, d) >= d - 1;
    if (!los) return;
    const hit = Math.random() < acc * (1 - d / 60);
    const miss = hit ? 0 : 1.5;
    tracer(p.pos.x, 1.35, p.pos.z, P.pos.x + U.mr(-miss, miss), 1.1 + U.mr(0, miss), P.pos.z + U.mr(-miss, miss));
    S.sfx('gun', U.clamp(1 - d / 60, 0.2, 0.8));
    if (hit) G.damagePlayer(dmg);
  }
  function startCrossing(p) {
    const L = p.loop;
    const [x, z] = [p.pos.x, p.pos.z];
    const nearX = Math.abs(x - L.x0) < 0.5 ? -1 : Math.abs(x - L.x1) < 0.5 ? 1 : 0;
    const nearZ = Math.abs(z - L.z0) < 0.5 ? -1 : Math.abs(z - L.z1) < 0.5 ? 1 : 0;
    let tx = x, tz = z;
    if (nearX && (!nearZ || Math.random() < 0.5)) tx = x + nearX * (roadWidthAcross(x, z, 'x', nearX) + 4.8);
    else if (nearZ) tz = z + nearZ * (roadWidthAcross(x, z, 'z', nearZ) + 4.8);
    else return;
    const c = W.cellAt(tx, tz);
    if (!c) return;
    p.state = 'cross';
    p.target = { x: tx, z: tz };
  }
  function roadWidthAcross(x, z, axis, dir) {
    // find the road line just beyond the loop edge
    const lines = axis === 'x' ? W.X : W.Z;
    const c = axis === 'x' ? x : z;
    let best = null, bd = 99;
    for (const l of lines) { const d = (l.c - c) * dir; if (d > 0 && d < bd) { bd = d; best = l; } }
    return best ? best.w : 10;
  }

  // ---------------- Population management ----------------
  function roadSpawnPoint(minD, maxD, behind) {
    const P = G.player;
    for (let tries = 0; tries < 20; tries++) {
      const s = W.segs[Math.floor(Math.random() * W.segs.length)];
      if (s.ped) continue;
      const A = W.nodes[s.a], B = W.nodes[s.b];
      const t = U.mr(0.25, 0.75);
      const x = A.x + (B.x - A.x) * t, z = A.z + (B.z - A.z) * t;
      const d = Math.hypot(x - P.pos.x, z - P.pos.z);
      if (d < minD || d > maxD) continue;
      if (behind) {
        const cdx = x - G.camera.position.x, cdz = z - G.camera.position.z;
        const fwd = new V3(); G.camera.getWorldDirection(fwd);
        if ((cdx * fwd.x + cdz * fwd.z) / Math.hypot(cdx, cdz) > 0.5 && d < 140) continue;
      }
      const flip = Math.random() < 0.5;
      const from = flip ? B : A, to = flip ? A : B;
      return { x, z, h: Math.atan2(to.x - from.x, to.z - from.z), seg: s, from, to, t: flip ? (1 - t) * s.len : t * s.len };
    }
    return null;
  }
  function sidewalkSpawnPoint(minD, maxD) {
    const P = G.player;
    for (let tries = 0; tries < 20; tries++) {
      const a = Math.random() * Math.PI * 2, r = U.mr(minD, maxD);
      const x = P.pos.x + Math.cos(a) * r, z = P.pos.z + Math.sin(a) * r;
      const c = W.cellAt(x, z);
      if (!c) continue;
      // snap to the loop edge
      const inset = 2.4;
      const L = { x0: c.x0 + inset, z0: c.z0 + inset, x1: c.x1 - inset, z1: c.z1 - inset };
      const px = U.clamp(x, L.x0, L.x1), pz = U.clamp(z, L.z0, L.z1);
      const opts = [[L.x0, pz], [L.x1, pz], [px, L.z0], [px, L.z1]];
      const [sx, sz] = opts.sort((u, v) => U.dist2(u[0], u[1], x, z) - U.dist2(v[0], v[1], x, z))[0];
      if (W.solidAt(sx, 0.5, sz)) continue;
      return { x: sx, z: sz };
    }
    return null;
  }
  function populate(dt) {
    const q = G.Q(), P = G.player;
    G.popT = (G.popT || 0) - dt;
    if (G.popT > 0) return;
    G.popT = 0.25;
    const traffic = G.vehicles.filter((v) => v.driver === 'ai').length;
    if (traffic < q.traffic) {
      const pt = roadSpawnPoint(70, 230, true);
      if (pt) {
        const r = Math.random();
        const type = r < 0.42 ? 'scooter' : r < 0.52 ? 'taxi' : r < 0.57 ? 'bus' : r < 0.64 ? 'truck' : r < 0.67 ? 'delivery' : r < 0.69 ? 'sports' : 'sedan';
        if (!(type === 'bus' && !pt.seg.main)) {
          const v = G.spawnVehicle(type, pt.x, pt.z, pt.h, { driver: 'ai' });
          placeOnEdge(v, pt.from, pt.to, pt.seg, pt.t);
          const sp = pt.seg.main ? 10 : 6;
          v.vel.x = Math.sin(v.h) * sp; v.vel.z = Math.cos(v.h) * sp; v.fwd = sp;
          syncVehicle(v, 1);
        }
      }
    }
    const parked = G.vehicles.filter((v) => v.parked).length;
    if (parked < q.parked) {
      const pt = roadSpawnPoint(40, 160, true);
      if (pt && !pt.seg.main) {
        const dx = (pt.to.x - pt.from.x) / pt.seg.len, dz = (pt.to.z - pt.from.z) / pt.seg.len;
        const r = Math.random();
        const type = r < 0.55 ? 'scooter' : r < 0.9 ? 'sedan' : r < 0.95 ? 'truck' : 'sports';
        const off = pt.seg.w / 2 - (type === 'scooter' ? 0.8 : 1.2);
        const x = pt.from.x + dx * pt.t - dz * off, z = pt.from.z + dz * pt.t + dx * off;
        if (!G.vehicles.some((o) => U.dist2(o.pos.x, o.pos.z, x, z) < 36)) G.spawnVehicle(type, x, z, pt.h + (type === 'scooter' ? Math.PI / 2 : 0), { parked: true });
      }
    }
    // evening crowds at the night market
    const nm = W.nightMarket;
    const hr = (G.time / 60) % 24;
    if (nm && (hr >= 17.5 || hr < 1.5) && Math.abs(P.pos.x - (nm.x0 + nm.x1) / 2) < 140 && Math.abs(P.pos.z - nm.z) < 90) {
      const crowd = G.peds.filter((p) => p.line === nm).length;
      if (crowd < 26) {
        const p = G.spawnPed(U.mr(nm.x0, nm.x1), nm.z + U.mr(-1.2, 1.2), { state: 'stroll' });
        p.line = nm; p.lane = U.mr(-1.3, 1.3); p.dir = Math.random() < 0.5 ? 1 : -1;
      }
    }
    const peds = G.peds.filter((p) => !p.persist && !p.cop).length;
    if (peds < q.peds) {
      const pt = sidewalkSpawnPoint(35, 110);
      if (pt) G.spawnPed(pt.x, pt.z, { yaw: Math.random() * 6 });
    }
    despawnFar(false);
  }
  function despawnFar(all) {
    const P = G.player;
    for (const v of [...G.vehicles]) {
      if (v === P.vehicle || v.persist && !v.dead) continue;
      const d = dist(v.pos, P.pos);
      if (all ? d > 60 : d > 280 || (v.dead && v.deadT <= 0 && d > 40)) G.removeVehicle(v);
    }
    for (const p of [...G.peds]) {
      if (p.persist) continue;
      const d = dist(p.pos, P.pos);
      if (all ? d > 40 || p.cop : d > (p.cop ? 220 : 170)) G.removePed(p);
    }
  }
  G.despawnFar = despawnFar;

  function updateVehicles(dt) {
    buildVGrid();
    for (const v of G.vehicles) {
      if (v.burnT > 0 && !v.dead) {
        v.burnT -= dt;
        if (Math.random() < dt * 20) spawnFx('fire', v.pos.x + U.mr(-0.6, 0.6), 1.2, v.pos.z + U.mr(-0.6, 0.6), 0, 3, 0, 1.1, 0.6);
        if (v.driver === 'ai' && Math.abs(v.fwd) < 1 && !v.fled) { v.fled = true; v.driver = null; const p = G.spawnPed(v.pos.x + Math.cos(v.h) * 2, v.pos.z - Math.sin(v.h) * 2, { state: 'flee' }); p.fleeT = 10; }
        if (v.burnT <= 0) explode(v);
      }
      if (v === G.player.vehicle) { syncVehicle(v, dt); continue; }
      if (v.dead) { v.deadT -= dt; vehicleStep(v, { throttle: 0, steer: 0, hand: true }, dt); if (Math.random() < dt * 8) spawnFx('smoke', v.pos.x, 1.4, v.pos.z, U.mr(-0.3, 0.3), 2.5, U.mr(-0.3, 0.3), 1.6, 2); syncVehicle(v, dt); continue; }
      if (v.leaveT > 0) { v.leaveT -= dt; if (v.leaveT <= 0) { v.persist = false; reseatAI(v); } }
      if (v.driver === 'ai') aiDrive(v, dt);
      else if (v.driver === 'police') policeDrive(v, dt);
      else if (v.driver === 'script' && v.script) v.script(v, dt);
      else vehicleStep(v, { throttle: 0, steer: 0, hand: true }, dt);
      if (v.hp < v.spec.hp * 0.3 && Math.random() < dt * 4) spawnFx('smoke', v.pos.x + Math.sin(v.h) * v.spec.len * 0.35, 1.2, v.pos.z + Math.cos(v.h) * v.spec.len * 0.35, 0, 2, 0, 1, 1.5);
      syncVehicle(v, dt);
    }
    vehiclePairs(dt);
    const pv = G.player.vehicle;
    if (pv && pv.hp < pv.spec.hp * 0.3 && Math.random() < dt * 6) spawnFx('smoke', pv.pos.x + Math.sin(pv.h) * pv.spec.len * 0.35, 1.2, pv.pos.z + Math.cos(pv.h) * pv.spec.len * 0.35, 0, 2, 0, 1, 1.5);
  }

  // ---------------- Camera ----------------
  const camPos = new V3(), camLook = new V3(), pivot = new V3();
  function updateCamera(dt) {
    const P = G.player, cam = G.cam, c = G.camera;
    const sens = 0.0024 * G.settings.sens;
    let dx = I.mdx * sens + I.look.x * 0.004, dy = I.mdy * sens * (G.settings.invert ? -1 : 1) + I.look.y * 0.004;
    if (I.pad) { dx += I.pad.rx * 2.6 * dt; dy += I.pad.ry * 2.0 * dt; }
    I.mdx = I.mdy = 0; I.look.x = I.look.y = 0;
    cam.yaw -= dx; cam.pitch = U.clamp(cam.pitch + dy, -0.5, 1.2);
    if (Math.abs(dx) + Math.abs(dy) > 0.0005) cam.manualT = 1.2;
    cam.manualT -= dt;
    const v = P.vehicle;
    let dist0, h0;
    if (v) {
      pivot.set(v.pos.x, v.pos.y + (v.spec.two ? 1.4 : v.type === 'bus' ? 3.2 : 1.5), v.pos.z);
      dist0 = cam.dist;
      h0 = 0;
      if (cam.manualT <= 0 && Math.abs(v.fwd) > 1.5) {
        const back = v.fwd < -1 ? v.h + Math.PI : v.h;
        cam.yaw = U.dampAngle(cam.yaw, back, 3, dt);
        cam.pitch = U.damp(cam.pitch, 0.2, 2, dt);
      }
      const spd = Math.abs(v.fwd);
      cam.fov = U.damp(cam.fov, 68 + Math.min(14, spd * 0.35), 3, dt);
      dist0 += Math.min(3, spd * 0.05);
    } else {
      const aiming = P.aiming;
      pivot.set(P.pos.x, P.pos.y + 1.55, P.pos.z);
      dist0 = aiming ? 2.2 : 4.3;
      if (aiming) { pivot.x += -Math.cos(cam.yaw) * 0.6; pivot.z += Math.sin(cam.yaw) * 0.6; }
      cam.fov = U.damp(cam.fov, aiming ? 52 : 68, 8, dt);
    }
    // portrait screens: pull back and widen so the character does not fill the view
    if (c.aspect < 1) { dist0 *= 1.45; cam.fov = Math.max(cam.fov, 80); }
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const dirx = -Math.sin(cam.yaw) * cp, diry = sp, dirz = -Math.cos(cam.yaw) * cp;
    // collision: pull in when blocked
    let dd = dist0;
    for (let s = 0.5; s <= dist0; s += 0.35) {
      if (W.solidAt(pivot.x + dirx * s, pivot.y + diry * s, pivot.z + dirz * s)) { dd = Math.max(0.6, s - 0.4); break; }
    }
    cam.curD = U.damp(cam.curD || dd, dd, dd < (cam.curD || dd) ? 25 : 4, dt);
    camPos.set(pivot.x + dirx * cam.curD, Math.max(0.5, pivot.y + diry * cam.curD), pivot.z + dirz * cam.curD);
    if (window.Interiors && Interiors.current) camPos.y = Math.min(camPos.y, Interiors.current.room.h - 0.35);
    if (cam.shake > 0) { camPos.x += U.mr(-1, 1) * cam.shake * 0.3; camPos.y += U.mr(-1, 1) * cam.shake * 0.3; cam.shake = Math.max(0, cam.shake - dt * 2.5); }
    c.position.copy(camPos);
    camLook.set(pivot.x - dirx * 5, pivot.y - diry * 1.5 + 0.2, pivot.z - dirz * 5);
    c.lookAt(camLook);
    if (Math.abs(c.fov - cam.fov) > 0.05) { c.fov = cam.fov; c.updateProjectionMatrix(); }
    G.sky.position.copy(c.position);
    G.stars.position.copy(c.position);
  }

  // ---------------- Interactables ----------------
  G.addInteract = function (o) { G.interact.push(o); return o; };
  function updateInteract() {
    const P = G.player;
    let best = null, bd = Infinity;
    for (const it of G.interact) {
      if (it.cond && !it.cond()) continue;
      if (it.onFoot !== false && P.vehicle && !it.vehicleOk) continue;
      const d = U.dist2(it.x, it.z, P.pos.x, P.pos.z);
      if (d < (it.r || 2) ** 2 && d < bd) { bd = d; best = it; }
    }
    G.curInteract = best;
    const v = !P.vehicle && !best ? nearestVehicle(2.2) : null;
    UI.prompt(best ? `按 <b>E</b> ${typeof best.label === 'function' ? best.label() : best.label}` : v ? `按 <b>F</b> ${v.driver === 'ai' || v.rider ? '搶' : '騎上'}${v.spec.name}` : null);
    if (best && I.hit('KeyE') && !G.fading) best.fn();
  }

  // ---------------- Main loop ----------------
  // delayed actions on game time (pauses with the game)
  G.later = (sec, fn) => laterQ.push({ t: G.elapsed + sec, fn });
  function runLater() {
    for (let i = laterQ.length - 1; i >= 0; i--) if (G.elapsed >= laterQ[i].t) { const f = laterQ[i].fn; laterQ.splice(i, 1); try { f(); } catch (e) { console.error(e); } }
  }
  G.clock = new THREE.Clock();
  G.elapsed = 0;
  G.frame = function () {
    requestAnimationFrame(G.frame);
    G.tick(Math.min(0.05, G.clock.getDelta()));
  };
  G.tick = function (dt) {
    pollGamepad();
    if (G.state === 'play' || G.state === 'dead') {
      G.elapsed += dt;
      runLater();
      G.godT = (G.godT || 0) - dt;
      if (G.state === 'play') {
        G.time += dt * (G.timeScale || 1);
        if (I.hit('Escape') || I.hit('KeyP') && !G.player.vehicle) { UI.pause(true); }
        if (I.hit('KeyM')) UI.openMap();
        if (I.hit('Tab') || I.hit('KeyT')) UI.openPhone();
        if (I.hit('KeyQ') || I.wheel) { if (!(G.mission && G.mission.onCycle && G.mission.onCycle())) cycleWeapon(I.wheel >= 0 ? 1 : -1); I.wheel = 0; }
        if (I.hit('Digit1')) G.setWeapon('fist');
        if (I.hit('Digit2')) G.setWeapon('bat');
        if (I.hit('Digit3')) G.setWeapon('pistol');
        if (I.hit('KeyC') && G.player.vehicle) { G.cam.dist = G.cam.dist > 6 && !G.player.vehicle.spec.two ? 5.5 : G.player.vehicle.spec.two ? (G.cam.dist > 4.5 ? 3.6 : 5.5) : 9; }
        updatePlayer(dt);
        updateInteract();
      } else if (G.player.vehicle) { /* dead while driving handled in gameOver */ }
      updateVehicles(dt);
      updatePeds(dt);
      updateWanted(dt);
      updatePickups(dt, G.elapsed);
      populate(dt);
      Missions.update(dt);
      Traffic.update();
      City.update();
      Regions.update(dt);
      Interiors.update(dt);
      updateFx(dt);
      updateEnvironment(dt);
      updateCamera(dt);
      UI.update(dt);
      G.health = Math.min(100, G.health);
    } else if (G.state === 'pause' || G.state === 'map' || G.state === 'phone' || G.state === 'menu') {
      // gamepad Start / Back close overlays (keyboard is handled in ui.js)
      if (I.pad && G.state === 'pause' && I.hit('Escape')) UI.pause(false);
      if (I.pad && G.state === 'map' && (I.hit('KeyM') || I.hit('Escape'))) UI.closeMap();
    }
    G.autosaveT = (G.autosaveT || 0) - dt;
    if (G.autosaveT <= 0 && G.state === 'play') { G.autosaveT = 15; G.saveGame(); }
    I.pressed.clear();
    I.lmbHit = false;
    if (G.renderer && G.state !== 'title' && G.state !== 'loading') G.renderFrame();
  };

  const laterQ = [];
  // forget everything that belongs to the region being left (the player, money and progress stay)
  G.clearWorld = function () {
    const P = G.player;
    if (window.Interiors) Interiors.reset();
    if (P.vehicle) exitVehicle(true);
    const own = G.ownedCar;
    if (own && !own.removed && own.garageEntry) { own.garageEntry.hp = own.dead ? 0.3 : own.hp / own.spec.hp; own.garageEntry.fuel = own.fuel; }
    for (const v of G.vehicles.slice()) G.removeVehicle(v);
    for (const p of G.peds.slice()) G.removePed(p);
    for (const pk of G.pickups) { G.scene.remove(pk.mesh); if (pk.ring) G.scene.remove(pk.ring); }
    G.pickups.length = 0;
    G.interact.length = 0;
    G.wanted = 0;
    G.ownedCar = null; G.borrowed = null; G.lastVehicle = null; G.carry = null;
    G.gps = null; G.waypoint = null;
    laterQ.length = 0;
  };

  // Compile every shader and upload every mesh while the loading screen is still up,
  // so the first seconds of play don't stutter.
  G.prewarm = function () {
    const P = G.player.pos, tmp = [];
    for (const [i, t] of ['sedan', 'scooter', 'police', 'bus'].entries()) { const o = M.makeVehicle(t); o.group.position.set(P.x + i * 3, 0, P.z + 8); tmp.push(o.group); }
    for (let i = 0; i < 3; i++) { const ch = M.makeCharacter(M.randomPedSpec()); ch.root.position.set(P.x - 2 - i, 0, P.z + 6); tmp.push(ch.root); }
    for (const k of ['health', 'armor', 'cash', 'bat', 'pistol', 'boba']) { const m = M.pickupMesh(k); m.position.set(P.x, 1, P.z + 5); tmp.push(m); }
    for (const o of tmp) G.scene.add(o);
    const culled = [];
    G.scene.traverse((o) => { if (o.frustumCulled) { o.frustumCulled = false; culled.push(o); } });
    const prev = G.state;
    G.state = 'play';
    // no player input, wheel or autosave may act during the warm-up frame
    I.pressed.clear(); I.lmbHit = false; I.wheel = 0; I.touchBtn.clear();
    G.autosaveT = Math.max(G.autosaveT || 0, 5);
    try { G.tick(1 / 60); } catch (e) { console.error(e); }
    I.pressed.clear(); I.lmbHit = false;
    G.state = prev;
    for (const o of culled) o.frustumCulled = true;
    for (const o of tmp) G.scene.remove(o);
  };

  G.teleport = function (x, z, yaw) {
    const cur = window.Interiors && Interiors.current;
    if (cur && Math.hypot(x - cur.room.ox, z - cur.room.oz) > 60) Interiors.reset();
    const P = G.player;
    if (P.vehicle) exitVehicle(true);
    const c = { x, z };
    for (let k = 0; k < 3; k++) W.collideCircle(c, 0.5);
    P.pos.set(c.x, W.groundAt(c.x, c.z), c.z);
    P.vel.set(0, 0, 0);
    if (yaw !== undefined) { P.yaw = yaw; G.cam.yaw = yaw; }
    despawnFar(true);
  };

  // lanterns at the temple glow at night
  G.initProps = function () {
    G.lanternMat = G.lanternMat || new THREE.MeshLambertMaterial({ color: 0xd8261c, emissive: 0xff3a1a });
    const lg = new THREE.SphereGeometry(0.45, 10, 8);
    for (const [x, y, z] of W.lanterns || []) { const m = new THREE.Mesh(lg, G.lanternMat); m.position.set(x, y, z); m.scale.y = 1.3; G.scene.add(m); }
    G.BOBA_TOTAL = 20;
    G.bobaSpots = [];
    if (W.regionId !== 'taipei') {
      // every region has first aid at the hospital and something to swing near the station
      G.spawnPickup('health', W.lmPOI.hospital.x + 6, W.lmPOI.hospital.z, 0, { respawn: 60 });
      if (W.lmPOI.train) G.spawnPickup('bat', W.lmPOI.train.x + 14, W.lmPOI.train.z + 2, 0, { respawn: 60 });
      if (W.lmPOI.police) G.spawnPickup('armor', W.lmPOI.police.x - 6, W.lmPOI.police.z, 0, { respawn: 120 });
      return;
    }
    // fixed weapon / armour pickups
    const ls = W.lm.longshan, dp = W.lm.daanpark, cks = W.lm.cks;
    G.spawnPickup('bat', -680, -165, 0, { respawn: 60 });
    G.spawnPickup('pistol', ls.x0 + 8, ls.z1 - 6, 0, { respawn: 90 });
    G.spawnPickup('pistol', cks.x0 + 30, cks.z0 + 8, 0, { respawn: 90 });
    G.spawnPickup('cash', dp.x1 - 10, dp.z0 + 10, 300, { respawn: 300 });
    G.spawnPickup('armor', W.lmPOI.t101.x - 20, W.lmPOI.t101.z + 2, 0, { respawn: 120 });
    G.spawnPickup('health', W.lmPOI.hospital.x + 6, W.lmPOI.hospital.z, 0, { respawn: 60 });
    G.spawnPickup('bat', 60, 150, 0, { respawn: 60 });
    // 珍奶 collectibles
    U.seed(777);
    const spots = [];
    const fr = W.frontages;
    for (let k = 0; spots.length < 20 && k < 500; k++) {
      const f = fr[Math.floor(U.rand() * fr.length)];
      if (spots.some((s) => U.dist2(s.x, s.z, f.x, f.z) < 150 * 150)) continue;
      spots.push(f);
    }
    G.BOBA_TOTAL = spots.length;
    spots.forEach((s, i) => { if (!G.save.boba.includes(i)) G.spawnPickup('boba', s.x, s.z, 0, { id: i }); });
    G.bobaSpots = spots;
  };
})();
