// 寶島狂飆 — HUD, menus, map, phone, boot
(function () {
  const W = World, S = Sound;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const UI = (window.UI = {});
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const show = (el, on) => { el.hidden = !on; };

  // ---------------- small HUD pieces ----------------
  let toastT = null;
  UI.toast = function (text, ms = 3200) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    box.prepend(el);
    while (box.children.length > 4) box.lastChild.remove();
    setTimeout(() => el.classList.add('out'), ms);
    setTimeout(() => el.remove(), ms + 500);
  };
  UI.hint = function (text, ms = 5000) {
    const el = $('#hint');
    el.textContent = text; el.hidden = false;
    clearTimeout(el._t); el._t = setTimeout(() => (el.hidden = true), ms);
  };
  UI.subtitle = function (name, text, ms = 3000) {
    const el = $('#subtitle');
    el.innerHTML = (name ? `<b>${esc(name)}</b>` : '') + esc(text);
    el.hidden = false;
    clearTimeout(el._t); el._t = setTimeout(() => (el.hidden = true), ms);
  };
  UI.bigText = function (t, sub, ms = 2600) {
    const el = $('#bigtext');
    el.innerHTML = `<div class="bt-main">${esc(t)}</div>${sub ? `<div class="bt-sub">${esc(sub)}</div>` : ''}`;
    el.hidden = false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(el._t); el._t = setTimeout(() => (el.hidden = true), ms);
  };
  UI.bigToast = (t, sub) => UI.bigText(t, sub, 1800);
  UI.prompt = function (html) {
    const el = $('#prompt');
    if (!html) { el.hidden = true; return; }
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
    el.hidden = false;
  };
  UI.objective = function (t) {
    const el = $('#objective');
    if (!t) { el.hidden = true; return; }
    if (el._t !== t) { el.querySelector('.obj-text').textContent = t; el._t = t; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
    el.hidden = false;
  };
  let timerFn = null, meterFn = null;
  UI.timer = (fn) => { timerFn = fn; $('#timer').hidden = !fn; };
  UI.meter = (label, fn) => { meterFn = fn; $('#meter').hidden = !fn; if (label) $('#meter .m-label').textContent = label; };
  UI.progress = function (label, f) {
    const el = $('#progress');
    if (!label) { el.hidden = true; return; }
    el.hidden = false;
    el.querySelector('span').textContent = label;
    el.querySelector('i').style.width = `${Math.round(U.clamp(f, 0, 1) * 100)}%`;
  };
  UI.arrest = function (f) {
    const el = $('#arrest');
    el.hidden = f <= 0.01;
    if (f > 0.01) el.querySelector('i').style.width = `${Math.round(f * 100)}%`;
  };
  UI.hurt = function () { const el = $('#hurt'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };
  UI.moneyFx = function (n, why) {
    const el = document.createElement('div');
    el.className = 'moneyfx ' + (n >= 0 ? 'plus' : 'minus');
    el.innerHTML = `${n >= 0 ? '+' : '−'}${U.fmtMoney(Math.abs(n))}${why ? `<small>${esc(why)}</small>` : ''}`;
    $('#moneyfx').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  };
  UI.flashStars = function () { const el = $('#stars'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };
  UI.weapon = function () {
    const names = { fist: '拳頭', bat: '球棒', pistol: '手槍' };
    $('#weapon .w-name').textContent = names[G.weapon];
    $('#weapon .w-ammo').textContent = G.weapon === 'pistol' ? `${G.ammo}` : '';
    $('#weapon').dataset.w = G.weapon;
  };
  UI.vehicle = function (v) {
    show($('#speedo'), !!v);
    if (v) { $('#speedo .sp-name').textContent = v.spec.name; }
    $('#crosshair').hidden = true;
  };
  UI.wasted = function (kind) {
    const el = $('#wasted');
    el.dataset.kind = kind;
    el.querySelector('.ws-main').textContent = kind === 'wasted' ? 'WASTED' : 'BUSTED';
    el.querySelector('.ws-sub').textContent = kind === 'wasted' ? '你送醫了' : '你被警察逮捕了';
    el.hidden = false;
    document.exitPointerLock && document.exitPointerLock();
  };
  UI.unwasted = () => { $('#wasted').hidden = true; };
  UI.missionStart = function (def) { UI.bigText(def.title, `${def.giver}`, 2400); };
  UI.missionPassed = function (def, r) {
    const el = $('#passed');
    el.querySelector('.ps-title').textContent = '任務完成';
    el.querySelector('.ps-name').textContent = def.title;
    el.querySelector('.ps-reward').textContent = r ? `+${U.fmtMoney(r)}` : '';
    el.hidden = false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(el._t); el._t = setTimeout(() => (el.hidden = true), 3600);
  };
  UI.missionFailed = function (def, why) {
    const el = $('#passed');
    el.querySelector('.ps-title').textContent = '任務失敗';
    el.querySelector('.ps-name').textContent = why || def.title;
    el.querySelector('.ps-reward').textContent = '';
    el.classList.add('fail');
    el.hidden = false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; el.classList.remove('fail'); }, 3200);
  };
  // screen fade used for doors, MRT and sleeping; locks interaction and is dropped if the player died meanwhile
  UI.fade = function (mid) {
    if (G.fading) return;
    const el = $('#fade');
    G.fading = true;
    el.classList.add('on');
    setTimeout(() => {
      if (mid && G.state !== 'dead') mid();
      setTimeout(() => { el.classList.remove('on'); G.fading = false; }, 350);
    }, 650);
  };

  // ---------------- per-frame HUD ----------------
  let lastDistrict = null, districtT = 0, gpsT = 0;
  UI.update = function (dt) {
    if (G.state !== 'play' && G.state !== 'dead') return;
    const P = G.player;
    // clock / weather
    const mins = Math.floor(G.time) % (24 * 60);
    const hh = String(Math.floor(mins / 60)).padStart(2, '0'), mm = String(mins % 60).padStart(2, '0');
    $('#clock').textContent = `${hh}:${mm}`;
    $('#temp').textContent = `${G.temp}°`;
    $('#wx').dataset.w = G.weather.rain > 0.3 ? 'rain' : G.night > 0.6 ? 'moon' : 'sun';
    $('#money').textContent = U.fmtMoney(G.money);
    $('#hp i').style.width = `${Math.max(0, G.health)}%`;
    $('#hp').classList.toggle('low', G.health < 30);
    $('#ar').hidden = G.armor <= 0;
    $('#ar i').style.width = `${G.armor}%`;
    // stars
    const st = Math.floor(G.wanted);
    const starsEl = $('#stars');
    if (starsEl._n !== st) { starsEl.innerHTML = [1, 2, 3, 4, 5].map((k) => `<span class="${k <= st ? 'on' : ''}">★</span>`).join(''); starsEl._n = st; }
    starsEl.classList.toggle('search', st > 0 && !G.copsSeeing);
    // district
    const inside = Interiors.current;
    const d = inside ? { id: 'in', zh: inside.room.name, en: 'INDOOR', desc: '' } : W.districtAt(P.pos.x, P.pos.z);
    if (inside) $('#district').hidden = true;
    if (d !== lastDistrict && !inside) {
      lastDistrict = d;
      const el = $('#district');
      el.innerHTML = `<div class="d-zh">${d.zh}</div><div class="d-en">${d.en}</div><div class="d-desc">${d.desc}</div>`;
      el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
      districtT = 4;
    }
    if (districtT > 0) { districtT -= dt; if (districtT <= 0) $('#district').hidden = true; }
    // speedo & street
    const v = P.vehicle;
    if (v) {
      $('#speedo .sp-val').textContent = Math.round(Math.abs(v.fwd) * 3.6);
      $('#fuel i').style.width = `${Math.round((v.fuel || 0) * 100)}%`;
      $('#fuel').classList.toggle('low', (v.fuel || 0) < 0.15);
    }
    const road = W.roadAt(P.pos.x, P.pos.z);
    $('#street').textContent = inside ? inside.room.name : road ? road.name : d.zh;
    // crosshair
    $('#crosshair').hidden = !(P.aiming && !v);
    // timer / meter
    if (timerFn) { const t = Math.max(0, timerFn()); $('#timer').textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; $('#timer').classList.toggle('low', t < 10); }
    if (meterFn) { const m = U.clamp(meterFn(), 0, 100); $('#meter i').style.width = `${m}%`; $('#meter').classList.toggle('low', m < 40); }
    // GPS path
    gpsT -= dt;
    const tgt = Missions.target || G.waypoint;
    if (tgt && gpsT <= 0) {
      gpsT = 0.8;
      const path = W.path(P.pos.x, P.pos.z, tgt.x, tgt.z, true);
      // don't route back to an intersection we're already past
      const d2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
      while (path.length >= 2 && d2(P.pos, path[1]) < d2(path[0], path[1])) path.shift();
      G.gps = path;
    }
    if (!tgt) G.gps = null;
    if (G.waypoint && U.dist2(G.waypoint.x, G.waypoint.z, P.pos.x, P.pos.z) < 15 * 15) { G.waypoint = null; UI.toast('抵達導航點'); }
    drawMinimap();
  };

  // ---------------- minimap ----------------
  const mm = { c: null, g: null };
  function worldToMini(x, z, px, pz, yaw, zoom) {
    const dx = (x - px) * zoom, dz = (z - pz) * zoom;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return [-c * dx + s * dz, -s * dx - c * dz];
  }
  function drawMinimap() {
    if (!mm.c) { mm.c = $('#minimap'); mm.g = mm.c.getContext('2d'); }
    const c = mm.c, g = mm.g, P = G.player;
    if (Interiors.current) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = '#1c1f25'; g.beginPath(); g.arc(c.width / 2, c.height / 2, c.width / 2 - 2, 0, 7); g.fill();
      g.fillStyle = '#f4efe6'; g.font = `900 ${c.width * 0.12}px ${W.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('室內', c.width / 2, c.height / 2 - c.width * 0.07);
      g.font = `700 ${c.width * 0.065}px ${W.FONT}`; g.fillStyle = '#b9b1c7'; g.fillText('走到門口按 E 離開', c.width / 2, c.height / 2 + c.width * 0.1);
      return;
    }
    const R = c.width / 2;
    const zoom = P.vehicle ? 0.75 + 0.5 / (1 + Math.abs(P.vehicle.fwd) / 8) : 1.35;
    const yaw = G.cam.yaw;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    g.beginPath(); g.arc(R, R, R - 2, 0, 7); g.clip();
    g.fillStyle = '#1c1f25'; g.fillRect(0, 0, c.width, c.height);
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    g.setTransform(-cs * zoom, -sn * zoom, sn * zoom, -cs * zoom, R, R);
    g.drawImage(W.mapCanvas, W.bounds.x0 - P.pos.x, W.bounds.z0 - P.pos.z);
    // GPS route
    if (G.gps && G.gps.length) {
      const tgt = Missions.target || G.waypoint;
      g.strokeStyle = Missions.target ? '#ffd23f' : '#d86bff';
      g.lineWidth = 5 / zoom; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 0);
      for (const n of G.gps) g.lineTo(n.x - P.pos.x, n.z - P.pos.z);
      if (tgt) g.lineTo(tgt.x - P.pos.x, tgt.z - P.pos.z);
      g.stroke();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    // icons
    const icon = (x, z, draw, clamp) => {
      let [sx, sy] = worldToMini(x, z, P.pos.x, P.pos.z, yaw, zoom);
      const d = Math.hypot(sx, sy);
      if (d > R - 12) { if (!clamp) return; sx *= (R - 12) / d; sy *= (R - 12) / d; }
      draw(R + sx, R + sy);
    };
    const dot = (col, r = 4) => (x, y) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.5; g.stroke(); };
    const badge = (txt, bg, fg = '#111', r = 8) => (x, y) => { g.fillStyle = bg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 2; g.stroke(); g.fillStyle = fg; g.font = `900 ${r * 1.15}px ${W.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y + 0.5); };
    for (const s of W.stores) icon(s.x, s.z, badge('鄰', '#1d5fbf', '#fff', 6));
    if (W.lmPOI.garage) icon(W.lmPOI.garage.x, W.lmPOI.garage.z, badge('福', '#c62828', '#fff', 8), true);
    for (const gs of W.gasSites) icon(gs.x, gs.z, badge('油', '#d32f2f', '#fff', 7), true);
    if (W.lmPOI.nightmarket) icon(W.lmPOI.nightmarket.x, W.lmPOI.nightmarket.z, badge('夜', '#b71c1c', '#ffe082', 8), true);
    if (W.lmPOI.train) icon(W.lmPOI.train.x, W.lmPOI.train.z, badge('鐵', '#0b6b3a', '#fff', 8), true);
    for (const gt of Regions.gates) icon(gt.x, gt.z, badge('道', '#0b6b3a', '#fff', 7), true);
    for (const dr of Interiors.doors) if (dr.icon && dr.icon !== '鄰') icon(dr.x, dr.z, badge(dr.icon, dr.color, '#fff', 7), true);
    for (const k of W.mrt) icon(k.x, k.z, badge('M', '#1f64c8', '#fff', 6));
    if (!Missions.active) for (const mk of Missions.markers) if (mk.g.visible) { const p = mk.def.startPos(); icon(p.x, p.z, badge(mk.def.icon, mk.def.story ? '#ffb830' : '#57d9ff', '#111', 8), true); }
    for (const p of Missions.points) icon(p.x, p.z, badge(p.label, p.color || '#6fe3ff', '#111', p.label.length > 1 ? 9 : 7), true);
    for (const pk of G.pickups) if (pk.kind === 'boba' && !pk.hidden && U.dist2(pk.x, pk.z, P.pos.x, P.pos.z) < 90 * 90) icon(pk.x, pk.z, dot('#ffc0e0', 3));
    const flash = Math.floor(performance.now() / 250) % 2;
    for (const v of G.vehicles) if (v.type === 'police' && (v.driver === 'police' || v.sirenOn)) icon(v.pos.x, v.pos.z, dot(flash ? '#ff3030' : '#3060ff', 4));
    for (const p of G.peds) if (p.cop) icon(p.pos.x, p.pos.z, dot(flash ? '#ff3030' : '#3060ff', 3));
    for (const p of G.peds) if (p.hostile && p.state !== 'fallen') icon(p.pos.x, p.pos.z, dot('#ff4040', 3.5));
    if (Missions.target) icon(Missions.target.x, Missions.target.z, (x, y) => { g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 7, y); g.lineTo(x, y + 8); g.lineTo(x - 7, y); g.closePath(); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 2; g.stroke(); }, true);
    if (G.waypoint) icon(G.waypoint.x, G.waypoint.z, badge('★', '#d86bff', '#fff', 7), true);
    // north marker on the rim
    {
      const [nx, ny] = worldToMini(P.pos.x, P.pos.z - 1000, P.pos.x, P.pos.z, yaw, 1);
      const d = Math.hypot(nx, ny);
      badge('N', '#f4efe6', '#111', 8)(R + (nx / d) * (R - 10), R + (ny / d) * (R - 10));
    }
    // player arrow
    g.save();
    g.translate(R, R);
    g.rotate(-(P.yaw - yaw));
    g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -9); g.lineTo(6.5, 7); g.lineTo(0, 3.5); g.lineTo(-6.5, 7); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.restore();
  }

  // ---------------- full map ----------------
  function hush() { S.setEngine(false, false, 0, 0); S.setSiren(0); }
  UI.hush = hush;
  UI.openMap = function () {
    if (G.state !== 'play') return;
    G.state = 'map';
    hush();
    document.exitPointerLock && document.exitPointerLock();
    $('#mapview').hidden = false;
    drawFullMap();
  };
  addEventListener('resize', () => { if (G.state === 'map') drawFullMap(); });
  UI.closeMap = function () { $('#mapview').hidden = true; G.state = 'play'; };
  function mapFit() {
    const c = $('#fullmap');
    let box = c.parentElement.getBoundingClientRect();
    if (box.width < 50 || box.height < 50) box = { width: innerWidth - 32, height: innerHeight - 90 };
    const mw = W.mapCanvas.width, mh = W.mapCanvas.height;
    const sc = Math.min(box.width / mw, box.height / mh);
    c.width = Math.round(mw * sc * devicePixelRatio); c.height = Math.round(mh * sc * devicePixelRatio);
    c.style.width = `${mw * sc}px`; c.style.height = `${mh * sc}px`;
    return sc * devicePixelRatio;
  }
  // one label per district, placed at the middle of its blocks
  function regionLabels() {
    const acc = {};
    for (const c of W.cells) { if (c.lm) continue; const d = c.district, a = acc[d.id] || (acc[d.id] = { zh: d.zh, x: 0, z: 0, n: 0 }); a.x += c.cx; a.z += c.cz; a.n++; }
    return Object.values(acc).map((a) => [a.zh, a.x / a.n, a.z / a.n]);
  }
  function drawFullMap() {
    const c = $('#fullmap'), g = c.getContext('2d');
    const k = mapFit();
    const X = (x) => (x - W.bounds.x0) * k, Z = (z) => (z - W.bounds.z0) * k;
    g.drawImage(W.mapCanvas, 0, 0, c.width, c.height);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // district labels
    const labels = W.region.labels || regionLabels();
    $('#mapview h2').textContent = `${W.region.zh}地圖`;
    g.font = `900 ${Math.round(15 * devicePixelRatio)}px ${W.FONT}`;
    for (const [t, x, z] of labels) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillText(t, X(x) + 1.5, Z(z) + 1.5); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillText(t, X(x), Z(z)); }
    const badge = (txt, x, y, bg, fg, r) => { r *= devicePixelRatio; g.fillStyle = bg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 2; g.stroke(); g.fillStyle = fg; g.font = `900 ${r * 1.1}px ${W.FONT}`; g.fillText(txt, x, y + 0.5); };
    for (const s of W.stores) badge('鄰', X(s.x), Z(s.z), '#1d5fbf', '#fff', 5);
    if (W.lmPOI.garage) badge('福', X(W.lmPOI.garage.x), Z(W.lmPOI.garage.z), '#c62828', '#fff', 9);
    for (const gs of W.gasSites) badge('油', X(gs.x), Z(gs.z), '#d32f2f', '#fff', 8);
    if (W.lmPOI.nightmarket) badge('夜', X(W.lmPOI.nightmarket.x), Z(W.lmPOI.nightmarket.z), '#b71c1c', '#ffe082', 9);
    if (W.lmPOI.train) badge('鐵', X(W.lmPOI.train.x), Z(W.lmPOI.train.z), '#0b6b3a', '#fff', 9);
    for (const dr of Interiors.doors) if (dr.icon && dr.icon !== '鄰') badge(dr.icon, X(dr.x), Z(dr.z), dr.color, '#fff', 8);
    for (const m of W.mrt) badge('M', X(m.x), Z(m.z), '#1f64c8', '#fff', 6);
    const lmNames = W.regionId === 'taipei' ? [['阿福機車行', 'garage'], ['萬福市場', 'market'], ['台北101', 't101'], ['龍山寺', 'longshan'], ['總統府', 'office'], ['國父紀念館', 'sysmh'], ['西門紅樓', 'redhouse'], ['台大醫院', 'hospital'], ['警察局', 'police']] : [['醫院', 'hospital'], ['警察局', 'police']];
    g.font = `700 ${Math.round(11 * devicePixelRatio)}px ${W.FONT}`;
    for (const [n, key] of lmNames) { const p = W.lmPOI[key]; if (!p) continue; g.fillStyle = '#ffe9b0'; g.fillText(n, X(p.x), Z(p.z) - 10 * devicePixelRatio); }
    if (W.regionId !== 'taipei') for (const L of W.landmarks) if (!/^paddy/.test(L.id)) { g.fillStyle = '#ffe9b0'; g.fillText(L.zh, X(L.cx), Z(L.cz) - (L.id === 'train' ? 12 * devicePixelRatio : 0)); }
    if (W.lmPOI.nightmarket && W.lmPOI.nightmarket.name) { g.fillStyle = '#ffe9b0'; g.fillText(W.lmPOI.nightmarket.name, X(W.lmPOI.nightmarket.x), Z(W.lmPOI.nightmarket.z) + 14 * devicePixelRatio); }
    // highway portals to the neighbouring regions
    for (const gt of Regions.gates) {
      const gx = U.clamp(X(gt.x), 46 * devicePixelRatio, c.width - 46 * devicePixelRatio), gz = U.clamp(Z(gt.z), 12 * devicePixelRatio, c.height - 22 * devicePixelRatio);
      badge('道', gx, gz, '#0b6b3a', '#fff', 8);
      g.font = `700 ${Math.round(11 * devicePixelRatio)}px ${W.FONT}`; g.fillStyle = '#9ff0b8'; g.fillText(`往 ${gt.dest.zh}`, gx, gz + 15 * devicePixelRatio);
    }
    if (!Missions.active) for (const mk of Missions.markers) if (mk.g.visible) { const p = mk.def.startPos(); badge(mk.def.icon, X(p.x), Z(p.z), mk.def.story ? '#ffb830' : '#57d9ff', '#111', 9); }
    for (const p of Missions.points) badge(p.label, X(p.x), Z(p.z), p.color || '#6fe3ff', '#111', 8);
    if (Missions.target) badge('◆', X(Missions.target.x), Z(Missions.target.z), '#ffd23f', '#111', 8);
    if (G.waypoint) badge('★', X(G.waypoint.x), Z(G.waypoint.z), '#d86bff', '#fff', 8);
    for (const pk of G.pickups) if (pk.kind === 'boba' && !pk.hidden) badge('', X(pk.x), Z(pk.z), '#ffc0e0', '#111', 3);
    const P = G.player;
    g.save(); g.translate(X(P.pos.x), Z(P.pos.z)); g.rotate(Math.PI - P.yaw);
    g.fillStyle = '#fff'; g.strokeStyle = '#e6224b'; g.lineWidth = 3;
    const s = devicePixelRatio;
    g.beginPath(); g.moveTo(0, -11 * s); g.lineTo(8 * s, 9 * s); g.lineTo(0, 4 * s); g.lineTo(-8 * s, 9 * s); g.closePath(); g.stroke(); g.fill();
    g.restore();
    c._k = k;
  }
  function mapClick(e, clear) {
    const c = $('#fullmap');
    const r = c.getBoundingClientRect();
    const k = c._k / devicePixelRatio;
    const x = (e.clientX - r.left) / k + W.bounds.x0, z = (e.clientY - r.top) / k + W.bounds.z0;
    if (clear) G.waypoint = null;
    else { G.waypoint = { x, z }; S.sfx('ui'); }
    drawFullMap();
  }

  // ---------------- phone ----------------
  UI.openPhone = function () {
    if (G.state !== 'play') return;
    G.state = 'phone';
    hush();
    document.exitPointerLock && document.exitPointerLock();
    $('#phone').hidden = false;
    S.sfx('ui');
    phoneHome();
  };
  UI.closePhone = function () { $('#phone').hidden = true; G.state = 'play'; };
  function phoneHome() {
    const mins = Math.floor(G.time) % (24 * 60);
    $('#ph-time').textContent = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    $('#ph-cred').textContent = `人情 ${Math.round(G.save.cred || 0)}`;
    const lend = G.hasPerk('lend');
    $('#ph-body').innerHTML = `
      <div class="ph-bal"><span>悠悠卡／錢包</span><b>${U.fmtMoney(G.money)}</b></div>
      <div class="ph-apps">
        <button data-app="jobs" class="app a-jobs"><i>工</i><span>工作</span></button>
        <button data-app="hood" class="app a-hood"><i>鄰</i><span>街坊</span></button>
        <button data-app="map" class="app a-map"><i>圖</i><span>地圖</span></button>
        <button data-app="moo" class="app a-moo"><i>騎</i><span>GoMoo 共享機車</span></button>
        <button data-app="${lend ? 'lend' : 'taxi'}" class="app a-taxi"><i>${lend ? '福' : '叫'}</i><span>${lend ? '跟福伯借車' : '叫小黃'}</span></button>
        <button data-app="cars" class="app a-cars"><i>車</i><span>我的車</span></button>
        <button data-app="stats" class="app a-stats"><i>績</i><span>紀錄</span></button>
        <button data-app="set" class="app a-set"><i>設</i><span>設定</span></button>
      </div>
      <p class="ph-tip">${esc(U.mpick(TIPS))}</p>`;
  }
  const TIPS = ['想去別的縣市？到火車站買票，或把車開進地圖邊緣綠色路牌的國道入口。', '捷運站入口按 E 可以快速移動到城市另一頭。', '被通緝時躲進巷子、離開警察視線，星星就會慢慢消失。', '好鄰居商店的飯糰可以回血。', '全台北藏了 20 杯珍奶，每杯 NT$200，全收集有大獎。', '大雨時萬華、大安的低窪路段會淹水：汽車變慢，機車會泡水熄火，走騎樓最安全。', '幫街坊做事會累積人情，人情越高解鎖越多好處。', '晚上八點後可以在阿福機車行睡到天亮。', '車子撞壞了開回阿福機車行，福伯幫你修。', '在地圖上點一下可以設定導航點。'];
  function jobRow(d) {
    const done = G.save.done[d.id] || 0;
    const avail = Missions.isAvailable(d);
    const active = Missions.active && Missions.active.def === d;
    const away = d.region && d.region !== W.regionId;
    const locked = !avail && d.need && !G.save.done[d.need];
    const status = active ? '<em class="st act">進行中</em>' : away ? `<em class="st lock">在${World.REGIONS[d.region].zh}</em>` : locked ? '<em class="st lock">尚未解鎖</em>' : d.once && done ? '<em class="st done">已完成</em>' : done ? `<em class="st done">完成 ${done} 次</em>` : '<em class="st new">可接</em>';
    const needDef = locked && Missions.defs.find((x) => x.id === d.need);
    return `<div class="job"><div class="job-h"><i class="${d.story ? 'story' : ''}">${d.icon}</i><div><b>${esc(d.title)}</b><small>${esc(d.giver)}</small></div>${status}</div><p>${esc(locked ? `先完成「${needDef.title}」。` : d.desc)}</p>
      <div class="job-b">${active ? '<button data-act="abort">放棄</button>' : avail ? `<button data-act="gps" data-id="${d.id}">導航過去</button>` : ''}</div></div>`;
  }
  function phoneJobs() {
    const story = Missions.defs.filter((d) => d.story), jobs = Missions.defs.filter((d) => !d.story);
    $('#ph-body').innerHTML = `<div class="ph-head"><button data-app="home">‹</button>工作</div>
      <h4 class="ph-sec">故事</h4><div class="jobs">${story.map(jobRow).join('')}</div>
      <h4 class="ph-sec">街坊託付</h4><div class="jobs">${jobs.map(jobRow).join('')}</div>`;
  }
  function phoneHood() {
    const cred = Math.round(G.save.cred || 0);
    $('#ph-body').innerHTML = `<div class="ph-head"><button data-app="home">‹</button>街坊</div>
      <div class="cred"><b class="num">${cred}</b><span>/ 100 人情</span><div class="bar"><i style="width:${cred}%"></i></div></div>
      <p class="ph-note">幫鄰居送貨、倒垃圾、顧攤、救人都會累積人情。分類丟錯、把車開爛就會少一點。</p>
      <ul class="perks">${G.PERKS.map((p) => `<li class="${cred >= p.need ? 'on' : ''}"><em class="num">${p.need}</em><div><b>${p.name}</b><small>${p.desc}</small></div></li>`).join('')}</ul>`;
  }
  function phoneCars() {
    const cars = G.save.garage || [];
    const NAMES = { scooter: '125 機車', sedan: '國民轎車', truck: '發財車', taxi: '退役小黃', sports: '改裝跑車' };
    $('#ph-body').innerHTML = `<div class="ph-head"><button data-app="home">‹</button>我的車</div>
      ${cars.length ? `<div class="jobs">${cars.map((c, i) => `<div class="job"><div class="job-h"><i style="background:${c.color}"></i><div><b>${NAMES[c.type] || c.type}</b><small>${c.color}</small></div></div><div class="job-b"><button data-car="${i}">叫到路邊</button></div></div>`).join('')}</div>` : '<p class="ph-note">你還沒有自己的車。到忠孝東區的「寶島汽車展示中心」（地圖上的「車」）買一台吧！</p>'}`;
  }
  function phoneStats() {
    const done = Object.keys(G.save.done).length;
    $('#ph-body').innerHTML = `<div class="ph-head"><button data-app="home">‹</button>紀錄</div>
      <dl class="stats"><dt>存款</dt><dd>${U.fmtMoney(G.money)}</dd><dt>完成工作種類</dt><dd>${done} / ${Missions.defs.length}</dd>
      <dt>街坊人情</dt><dd>${Math.round(G.save.cred || 0)}</dd><dt>珍奶收集</dt><dd>${G.save.boba.length} / ${G.BOBA_TOTAL}</dd><dt>飯糰吃了</dt><dd>${G.save.egg || 0} 個</dd>
      <dt>本次行駛</dt><dd>${(G.stats.driven / 1000).toFixed(1)} km</dd><dt>計時賽最佳</dt><dd>${G.save.bestRace ? G.save.bestRace.toFixed(1) + ' 秒' : '—'}</dd></dl>`;
  }
  function phoneClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    S.sfx('click');
    const app = b.dataset.app, act = b.dataset.act;
    if (app === 'home') phoneHome();
    if (app === 'jobs') phoneJobs();
    if (app === 'hood') phoneHood();
    if (app === 'stats') phoneStats();
    if (app === 'cars') phoneCars();
    if (b.dataset.car !== undefined) { UI.closePhone(); Interiors.callCar(+b.dataset.car); }
    if (app === 'map') { UI.closePhone(); UI.openMap(); }
    if (app === 'set') { UI.closePhone(); openPanel('settings', 'phone'); }
    if (app === 'moo' || app === 'taxi' || app === 'lend') {
      const cost = app === 'moo' ? 30 : app === 'taxi' ? 60 : 0;
      if (G.player.vehicle) { UI.toast('你已經在車上了'); return; }
      if (G.money < cost) { UI.toast('錢不夠'); return; }
      const pt = Missions.nearestRoadPoint(G.player.pos.x, G.player.pos.z);
      G.money -= cost;
      const type = app === 'moo' ? 'scooter' : app === 'taxi' ? 'taxi' : 'truck';
      const v = G.spawnVehicle(type, pt.x, pt.z, pt.h, { color: app === 'moo' ? '#2fbf71' : app === 'lend' ? '#2d5aa0' : undefined });
      v.persist = true;
      if (G.borrowed && !G.borrowed.removed && G.borrowed !== G.player.vehicle && G.borrowed !== G.lastVehicle) G.borrowed.persist = false;
      G.borrowed = v;
      G.waypoint = { x: pt.x, z: pt.z };
      UI.closePhone();
      UI.toast(app === 'moo' ? `GoMoo 共享機車已解鎖（NT$${cost}），看地圖上的紫色星星` : app === 'taxi' ? `小黃在路邊等你（NT$${cost}），自己開走吧` : '福伯：發財車停在路邊了，鑰匙在上面，開慢點！');
    }
    if (act === 'gps') { const d = Missions.defs.find((x) => x.id === b.dataset.id); const p = d.startPos(); G.waypoint = { x: p.x, z: p.z }; UI.closePhone(); UI.toast(`已設定導航：${d.title}`); }
    if (act === 'abort') { Missions.abort(); UI.closePhone(); }
  }

  // ---------------- MRT ----------------
  UI.openMRT = function (from) {
    if (G.state !== 'play') return;
    G.state = 'menu';
    hush();
    document.exitPointerLock && document.exitPointerLock();
    const el = $('#mrt');
    el.querySelector('h2').textContent = W.region.mrtName || (W.regionId === 'taoyuan' ? '桃園機場捷運' : W.regionId === 'newtaipei' ? '新北捷運' : '台北捷運');
    el.querySelector('.mrt-from').textContent = `${from.zh}站 ${from.en}`;
    el.querySelector('.mrt-list').innerHTML = W.mrt.filter((k) => k !== from).map((k, i) => `<button data-i="${W.mrt.indexOf(k)}"><i></i><b>${k.zh}</b><small>${k.en}</small><em>NT$${G.hasPerk('discount') ? 13 : 25}</em></button>`).join('');
    el.hidden = false;
    S.sfx('ui');
  };
  function closeMRT() { $('#mrt').hidden = true; G.state = 'play'; }

  // ---------------- job board (choose vehicle / orders / riders) ----------------
  let chooseState = null;
  UI.choose = function (title, desc, items, max) {
    return new Promise((res) => {
      UI.closeChoose();
      G.state = 'menu';
      hush();
      document.exitPointerLock && document.exitPointerLock();
      const el = $('#choose');
      const sel = new Set();
      const render = () => {
        el.querySelector('.ch-title').textContent = title;
        el.querySelector('.ch-desc').textContent = desc;
        el.querySelector('.ch-list').innerHTML = items.map((it, i) => `<button class="ch-item${sel.has(i) ? ' on' : ''}" data-i="${i}"><kbd>${i + 1}</kbd><div><b>${esc(it.title)}</b><small>${esc(it.meta || '')}</small></div>${it.tag ? `<em>${esc(it.tag)}</em>` : ''}</button>`).join('');
        el.querySelector('.ch-count').textContent = max > 1 ? `已選 ${sel.size} / ${max}` : '選一個';
        el.querySelector('#ch-ok').disabled = sel.size === 0;
      };
      const toggle = (i) => {
        if (i < 0 || i >= items.length) return;
        if (sel.has(i)) sel.delete(i);
        else { if (max === 1) sel.clear(); if (sel.size < max) sel.add(i); else { UI.toast(`最多只能選 ${max} 個`); return; } }
        S.sfx('click');
        render();
      };
      const finish = (val) => { cleanup(); el.hidden = true; G.state = 'play'; G.input.pressed.clear(); G.clock.getDelta(); res(val); };
      const onClick = (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.i !== undefined) toggle(+b.dataset.i);
        else if (b.id === 'ch-ok' && sel.size) finish([...sel].sort((a, c) => a - c));
        else if (b.id === 'ch-cancel') finish(null);
      };
      const onKey = (e) => {
        if (/^Digit[1-9]$/.test(e.code)) toggle(+e.code.slice(5) - 1);
        else if (e.code === 'Enter' && sel.size) finish([...sel].sort((a, c) => a - c));
        else if (e.code === 'Escape') finish(null);
      };
      const cleanup = () => { el.removeEventListener('click', onClick); removeEventListener('keydown', onKey); chooseState = null; };
      el.addEventListener('click', onClick);
      addEventListener('keydown', onKey);
      chooseState = { finish };
      render();
      el.hidden = false;
      S.sfx('ui');
    });
  };
  UI.closeChoose = function () { if (chooseState) chooseState.finish(null); };

  // ---------------- night-market stall: follow each customer's recipe in order ----------------
  const DISHES = [
    { name: '蚵仔煎', price: 70, steps: ['熱油', '下蚵仔', '淋粉漿', '打顆蛋'] },
    { name: '大腸包小腸', price: 60, steps: ['烤大腸', '剖開', '夾香腸', '加蒜片'] },
    { name: '蔥抓餅', price: 45, steps: ['下餅皮', '加蛋', '翻面', '刷醬'] },
    { name: '珍珠奶茶', price: 55, steps: ['加珍珠', '倒紅茶', '加鮮奶', '封膜'] },
  ];
  const CUSTOMERS = ['高中生', '上班族', '觀光客', '阿嬤', '情侶', '外送員', '夜貓子', '小朋友'];
  UI.stallGame = function () {
    return new Promise((res) => {
      G.state = 'menu';
      hush();
      document.exitPointerLock && document.exitPointerLock();
      const el = $('#stall');
      el.hidden = false;
      let t = 60, earned = 0, served = 0, lost = 0, started = false, spawnT = 0;
      const queue = [];
      let order = null; // { dish, step, buttons }
      const newCustomer = () => { const d = U.mpick(DISHES); queue.push({ who: U.mpick(CUSTOMERS), dish: d, pat: U.mr(14, 20), max: 0 }); queue[queue.length - 1].max = queue[queue.length - 1].pat; };
      const takeOrder = () => {
        const c = queue[0];
        if (!c) { order = null; return; }
        const btns = c.dish.steps.slice().sort(() => Math.random() - 0.5);
        order = { c, step: 0, btns };
      };
      const render = () => {
        el.querySelector('.st-time').textContent = started ? `${Math.ceil(t)} 秒` : '按任一食材鍵開始';
        el.querySelector('.st-money').textContent = `${U.fmtMoney(earned)}・${served} 份`;
        el.querySelector('.st-queue').innerHTML = queue.map((c, i) => `<div class="cust${i === 0 ? ' now' : ''}"><b>${esc(c.who)}</b><span>${esc(c.dish.name)}</span><div class="bar"><i style="width:${Math.round((c.pat / c.max) * 100)}%"></i></div></div>`).join('') || '<p class="st-empty">等客人上門…</p>';
        if (order) {
          el.querySelector('.st-recipe').innerHTML = `<h3>${esc(order.c.dish.name)}</h3><ol>${order.c.dish.steps.map((s, i) => `<li class="${i < order.step ? 'done' : i === order.step ? 'next' : ''}">${esc(s)}</li>`).join('')}</ol>`;
          el.querySelector('.st-btns').innerHTML = order.btns.map((s, i) => `<button data-s="${esc(s)}"><kbd>${i + 1}</kbd>${esc(s)}</button>`).join('');
        } else { el.querySelector('.st-recipe').innerHTML = '<h3>—</h3>'; el.querySelector('.st-btns').innerHTML = ''; }
      };
      const press = (label) => {
        if (!order || t <= 0) return;
        started = true;
        if (label === order.c.dish.steps[order.step]) {
          order.step++; S.sfx('click');
          if (order.step >= order.c.dish.steps.length) {
            const c = queue.shift();
            const tip = Math.round((c.pat / c.max) * 25);
            earned += c.dish.price + tip; served++;
            S.sfx('cash');
            takeOrder();
          }
        } else {
          S.sfx('hurt', 0.5);
          order.c.pat = Math.max(0, order.c.pat - 2.5);
          const box = el.querySelector('.st-btns'); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
        }
        render();
      };
      const onClick = (e) => { const b = e.target.closest('button[data-s]'); if (b) press(b.dataset.s); };
      const onKey = (e) => { if (/^Digit[1-4]$/.test(e.code) && order) { e.preventDefault(); press(order.btns[+e.code.slice(5) - 1]); } };
      el.addEventListener('pointerdown', onClick);
      addEventListener('keydown', onKey);
      newCustomer(); newCustomer(); takeOrder();
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (started) {
          t -= dt;
          spawnT -= dt;
          if (spawnT <= 0 && queue.length < 4) { newCustomer(); spawnT = U.mr(3.5, 6); if (!order) takeOrder(); }
          for (const c of queue) c.pat -= dt * (c === queue[0] ? 1 : 0.6);
          while (queue.length && queue[0].pat <= 0) { queue.shift(); lost++; S.sfx('fail', 0.4); takeOrder(); }
          for (let i = queue.length - 1; i > 0; i--) if (queue[i].pat <= 0) { queue.splice(i, 1); lost++; }
        }
        render();
        if (t > 0) requestAnimationFrame(loop);
        else {
          el.removeEventListener('pointerdown', onClick);
          removeEventListener('keydown', onKey);
          el.querySelector('.st-time').textContent = `收攤！出餐 ${served} 份・跑掉 ${lost} 位客人`;
          setTimeout(() => { el.hidden = true; G.state = 'play'; G.clock.getDelta(); res({ served, earned }); }, 1800);
        }
      };
      render();
      requestAnimationFrame(loop);
    });
  };

  // ---------------- minigames: aim / reaction (net café, balloons) ----------------
  function openOverlay(id) {
    G.state = 'menu';
    hush();
    document.exitPointerLock && document.exitPointerLock();
    $(id).hidden = false;
  }
  function closeOverlay(id) { $(id).hidden = true; G.state = 'play'; G.clock.getDelta(); }
  UI.aimGame = function ({ title, desc, duration = 30, theme = 'esports' }) {
    return new Promise((res) => {
      openOverlay('#aim');
      const el = $('#aim'), field = el.querySelector('.aim-field');
      el.dataset.theme = theme;
      el.querySelector('h2').textContent = title;
      el.querySelector('.aim-desc').textContent = desc;
      field.innerHTML = '';
      let t = duration, hits = 0, misses = 0, started = false, spawnT = 0;
      const COLORS = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb', '#ff6e40'];
      const spawn = () => {
        const b = document.createElement('button');
        b.className = 'aim-target';
        const size = theme === 'balloon' ? 46 : 38;
        b.style.width = b.style.height = size + 'px';
        b.style.left = `calc(${Math.random() * 88 + 2}% - ${size / 2}px)`;
        b.style.top = `calc(${Math.random() * 78 + 8}% - ${size / 2}px)`;
        b.style.setProperty('--c', U.mpick(COLORS));
        b.dataset.life = theme === 'balloon' ? 2.4 : 1.4;
        b.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (t <= 0) return; hits++; S.sfx(theme === 'balloon' ? 'punch' : 'click'); b.remove(); upd(); });
        field.appendChild(b);
      };
      const upd = () => {
        el.querySelector('.aim-time').textContent = started ? `${Math.ceil(Math.max(0, t))} 秒` : '點任何目標開始';
        el.querySelector('.aim-score').textContent = `命中 ${hits}・失誤 ${misses}`;
      };
      field.onpointerdown = () => { if (t > 0 && started) { misses++; upd(); } };
      let finished = false;
      const finish = () => {
        if (finished) return; finished = true; t = 0;
        field.innerHTML = '';
        el.querySelector('.aim-time').textContent = `時間到！命中 ${hits} 個`;
        setTimeout(() => { closeOverlay('#aim'); res({ hits, misses }); }, 900);
      };
      el.querySelector('.mg-quit').onclick = finish;
      spawn();
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (!started && hits > 0) started = true;
        if (started) {
          t -= dt; spawnT -= dt;
          if (spawnT <= 0) { spawn(); spawnT = theme === 'balloon' ? 0.55 : 0.7; }
          for (const b of [...field.children]) { b.dataset.life -= dt; if (b.dataset.life <= 0) b.remove(); }
        }
        upd();
        if (finished) return;
        if (t > 0) requestAnimationFrame(loop);
        else finish();
      };
      upd();
      requestAnimationFrame(loop);
    });
  };

  // ---------------- KTV rhythm game: notes fall in four lanes (D F J K) ----------------
  const SONGS = [
    { name: '小星星（兒歌）', notes: [523, 523, 784, 784, 880, 880, 784, 0, 698, 698, 659, 659, 587, 587, 523, 0, 784, 784, 698, 698, 659, 659, 587, 0, 784, 784, 698, 698, 659, 659, 587, 0, 523, 523, 784, 784, 880, 880, 784, 0, 698, 698, 659, 659, 587, 587, 523] },
    { name: '給愛麗絲（貝多芬）', notes: [659, 622, 659, 622, 659, 494, 587, 523, 440, 0, 262, 330, 440, 494, 0, 330, 415, 494, 523, 0, 330, 659, 622, 659, 622, 659, 494, 587, 523, 440, 0, 262, 330, 440, 494, 0, 330, 523, 494, 440] },
  ];
  UI.rhythmGame = function () {
    return new Promise((res) => {
      openOverlay('#rhythm');
      const el = $('#rhythm'), lanes = [...el.querySelectorAll('.lane')];
      const song = U.mpick(SONGS);
      el.querySelector('.rh-song').textContent = `♪ ${song.name}`;
      const beat = 0.42, speed = 260; // px per second
      const notes = [];
      song.notes.forEach((f, i) => { if (f) notes.push({ t: 1.5 + i * beat, lane: [262, 330, 415, 440, 494, 523, 587, 622, 659, 698, 784, 880].indexOf(f) % 4, f, hit: false, el: null }); });
      notes.forEach((n) => { if (n.lane < 0) n.lane = Math.floor(n.f / 100) % 4; });
      let time = 0, hits = 0, done = false;
      const H = () => el.querySelector('.rh-field').clientHeight - 40;
      const press = (lane) => {
        const target = notes.find((n) => !n.hit && n.lane === lane && Math.abs(n.t - time) < 0.2);
        lanes[lane].classList.remove('flash'); void lanes[lane].offsetWidth; lanes[lane].classList.add('flash');
        if (target) {
          target.hit = true; hits++;
          if (target.el) target.el.remove();
          Sound.note && Sound.note(target.f);
        } else Sound.sfx('click');
        el.querySelector('.rh-score').textContent = `${hits} / ${notes.length}`;
      };
      const KEYS = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
      const onKey = (e) => { const i = KEYS.indexOf(e.code); if (i >= 0 && !e.repeat) { e.preventDefault(); press(i); } };
      addEventListener('keydown', onKey);
      lanes.forEach((l, i) => (l.onpointerdown = () => press(i)));
      const finish = () => {
        if (done) return; done = true;
        removeEventListener('keydown', onKey);
        setTimeout(() => { lanes.forEach((l) => (l.innerHTML = '')); closeOverlay('#rhythm'); res({ hits, total: notes.length }); }, 600);
      };
      el.querySelector('.mg-quit').onclick = finish;
      el.querySelector('.rh-score').textContent = `0 / ${notes.length}`;
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        time += dt;
        const h = H();
        for (const n of notes) {
          if (n.hit) continue;
          const y = h - (n.t - time) * speed;
          if (y > -30 && !n.el) { n.el = document.createElement('i'); n.el.className = 'note'; lanes[n.lane].appendChild(n.el); }
          if (n.el) n.el.style.transform = `translateY(${y}px)`;
          if (n.t - time < -0.25 && n.el) { n.el.remove(); n.el = null; n.hit = 'miss'; }
        }
        const end = notes.length ? notes[notes.length - 1].t + 1.2 : 1;
        if (done) return;
        if (time < end) requestAnimationFrame(loop);
        else finish();
      };
      requestAnimationFrame(loop);
    });
  };

  // ---------------- pause / panels ----------------
  UI.pause = function (on) {
    if (on) {
      if (G.state !== 'play' || G.fading) return;
      G.state = 'pause';
      document.exitPointerLock && document.exitPointerLock();
      $('#pause').hidden = false;
      S.setEngine(false, false, 0, 0); S.setSiren(0);
    } else {
      $('#pause').hidden = true;
      G.state = 'play';
      G.clock.getDelta();
    }
  };
  let panelReturn = null;
  function openPanel(id, ret) {
    panelReturn = ret;
    $$('.panel').forEach((p) => (p.hidden = p.id !== id));
    $('#panels').hidden = false;
    if (id === 'settings') syncSettings();
    if (id === 'chars') openChars();
    if (ret === 'phone' || ret === 'pause') { $('#pause').hidden = true; G.state = 'menu'; }
  }
  function closePanel() {
    $('#panels').hidden = true;
    charPreview.on = false;
    if (panelReturn === 'pause') { $('#pause').hidden = false; G.state = 'pause'; }
    else if (panelReturn === 'phone' || panelReturn === 'shop') { G.state = 'play'; G.clock.getDelta(); }
    panelReturn = null;
  }
  function syncSettings() {
    const s = G.settings;
    $('#set-quality').value = s.quality;
    $('#set-sens').value = s.sens;
    $('#set-invert').checked = s.invert;
    $('#set-volume').value = s.volume;
    $('#set-time').value = G.timeScale || 1;
  }
  function bindSettings() {
    $('#set-quality').addEventListener('change', (e) => { G.settings.quality = e.target.value; G.saveSettings(); if (G.renderer) G.applyQuality(); });
    $('#set-sens').addEventListener('input', (e) => { G.settings.sens = +e.target.value; G.saveSettings(); });
    $('#set-invert').addEventListener('change', (e) => { G.settings.invert = e.target.checked; G.saveSettings(); });
    $('#set-volume').addEventListener('input', (e) => { G.settings.volume = +e.target.value; S.setVolume(G.settings.volume); G.saveSettings(); });
    $('#set-time').addEventListener('change', (e) => { G.timeScale = +e.target.value; });
    $('#set-reset').addEventListener('click', () => {
      const btn = $('#set-reset');
      if (!btn.dataset.armed) { btn.dataset.armed = '1'; btn.textContent = '再按一次確認清除'; setTimeout(() => { delete btn.dataset.armed; btn.textContent = '清除存檔'; }, 3000); return; }
      U.store.set('save', {}); location.reload();
    });
  }

  // ---------------- character creator (mini renderer) ----------------
  const OPT = {
    skin: ['#f5d3b8', '#f1c8a5', '#e0b08a', '#c98f67', '#a8714f', '#7a4e33'],
    hair: ['#1a1410', '#3a2a1e', '#5b3b24', '#8a5a2b', '#c9a15a', '#8a8a8a', '#e8e4dc', '#b0303a', '#2f5fa8', '#e27ba0'],
    cloth: ['#e84b3c', '#f2c230', '#3f8f5a', '#2f6fb3', '#1e8c8c', '#8a55b5', '#e27ba0', '#f2f2ee', '#b3b3a8', '#6b7b8c', '#232323', '#d98a3a'],
    pants: ['#2b3547', '#1c1c1c', '#4d5a6a', '#6b5a45', '#9aa3ad', '#384e2e', '#c9b99a', '#7a2a2a', '#e8e4dc', '#e27ba0'],
    shoes: ['#f2f2f2', '#222222', '#c7302b', '#2f5fa8', '#6b4a2e', '#f2c230'],
    hat: ['#222222', '#c7302b', '#2f5fa8', '#f2c230', '#f2f2ee', '#3f8f5a'],
  };
  const CHOICES = {
    body: [['m', '男生'], ['f', '女生']],
    height: [[0.93, '嬌小'], [1, '標準'], [1.06, '高大']],
    style: [['short', '短髮'], ['buzz', '平頭'], ['spiky', '刺蝟頭'], ['long', '長髮'], ['bob', '鮑伯頭'], ['ponytail', '馬尾'], ['twin', '雙馬尾'], ['bun', '包頭'], ['bald', '光頭']],
    hat: [['none', '不戴'], ['cap', '棒球帽'], ['beanie', '毛帽']],
    top: [['tee', '短袖T恤'], ['long', '長袖'], ['tank', '背心'], ['hoodie', '帽T'], ['jacket', '外套']],
    bottom: [['pants', '長褲'], ['shorts', '短褲'], ['skirt', '裙子']],
  };
  const ed = { spec: null, name: '', preset: 0, mode: 'full', price: 0 };
  const SECTION = { body: 'body', height: 'body', skin: 'body', style: 'hair', hair: 'hair', beard: 'hair' };
  UI.openCreator = function (mode, price) {
    if (G.state !== 'play') return;
    ed.mode = mode; ed.price = price;
    G.state = 'menu';
    UI.hush();
    document.exitPointerLock && document.exitPointerLock();
    openPanel('chars', 'shop');
  };
  const charPreview = { on: false, spin: 0.4, drag: null, held: 0 };
  function openChars() {
    if (panelReturn !== 'shop') { ed.mode = panelReturn === 'pause' ? 'body' : 'full'; ed.price = 0; }
    ed.preset = G.save.charSpec ? -1 : G.save.character || 0;
    ed.spec = Object.assign({}, G.save.charSpec || G.CHARACTERS[G.save.character || 0].spec);
    ed.before = JSON.stringify(ed.spec);
    const shop = ed.mode !== 'full';
    $('#chars h2').textContent = ed.mode === 'clothes' ? (ed.price ? '試衣間' : '衣櫃') : ed.mode === 'hair' ? '理髮' : ed.mode === 'body' ? '個人資料' : '建立角色';
    $('#char-presets').closest('.ed-row').hidden = shop;
    $('#char-name-input').closest('.ed-row').hidden = shop && ed.mode !== 'body';
    $('#char-desc').textContent = ed.mode === 'body' ? '換衣服請到服飾店或家裡的衣櫃，換髮型請到理髮廳。' : $('#char-desc').textContent;
    $('#char-pick').innerHTML = shop ? (ed.mode === 'body' ? '儲存 <small>SAVE</small>' : ed.price ? `付款 NT$${ed.price} <small>PAY</small>` : '換上 <small>WEAR</small>') : '就決定是你了 <small>SELECT</small>';
    ed.name = G.playerName();
    charPreview.on = true;
    const cv = $('#charCanvas');
    if (!charPreview.r) {
      charPreview.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      charPreview.r.setPixelRatio(Math.min(2, devicePixelRatio));
      const sc = (charPreview.scene = new THREE.Scene());
      sc.add(new THREE.HemisphereLight(0xffe0f0, 0x302040, 2));
      const dl = new THREE.DirectionalLight(0xffffff, 2); dl.position.set(2, 4, 3); sc.add(dl);
      const rim = new THREE.DirectionalLight(0x3be3ff, 3); rim.position.set(-3, 2, -3); sc.add(rim);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 40), new THREE.MeshLambertMaterial({ color: 0x2a2140 }));
      disc.position.y = -0.04; sc.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.02, 6, 60), new THREE.MeshBasicMaterial({ color: 0xff3d7f }));
      ring.rotation.x = Math.PI / 2; sc.add(ring);
      charPreview.cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      charPreview.cam.position.set(0, 1.25, 4.8); charPreview.cam.lookAt(0, 0.95, 0);
      // drag to turn the model
      cv.addEventListener('pointerdown', (e) => { charPreview.drag = e.clientX; try { cv.setPointerCapture(e.pointerId); } catch (err) {} });
      cv.addEventListener('pointermove', (e) => { if (charPreview.drag == null) return; charPreview.spin += (e.clientX - charPreview.drag) * 0.012; charPreview.drag = e.clientX; charPreview.held = 1.5; });
      cv.addEventListener('pointerup', () => (charPreview.drag = null));
    }
    renderEditor();
    rebuildPreview();
    const loop = () => {
      if (!charPreview.on) return;
      requestAnimationFrame(loop);
      const r = charPreview.r, box = cv.getBoundingClientRect();
      if (box.width && cv.width !== Math.round(box.width * r.getPixelRatio())) { r.setSize(box.width, box.height, false); charPreview.cam.aspect = box.width / box.height; charPreview.cam.updateProjectionMatrix(); }
      charPreview.held -= 0.016;
      if (charPreview.drag == null && charPreview.held <= 0) charPreview.spin += 0.01;
      if (charPreview.ch) { charPreview.ch.root.rotation.y = charPreview.spin; Models.animate(charPreview.ch, { speed: 0, mode: 'walk' }, 0.016); }
      r.render(charPreview.scene, charPreview.cam);
    };
    loop();
  }
  function rebuildPreview() {
    if (charPreview.ch) charPreview.scene.remove(charPreview.ch.root);
    const s = Object.assign({}, ed.spec, { scale: (ed.spec.height || 1) * (ed.spec.body === 'f' ? 0.96 : 1) });
    charPreview.ch = Models.makeCharacter(s);
    charPreview.scene.add(charPreview.ch.root);
    G.previewRoot = charPreview.ch.root;
  }
  const swatches = (key, list) => `<div class="swatches">${list.map((c) => `<button class="sw${ed.spec[key] === c ? ' on' : ''}" data-set="${key}" data-val="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}<label class="sw sw-custom" title="自訂顏色"><input type="color" data-set="${key}" value="${/^#[0-9a-f]{6}$/i.test(ed.spec[key] || '') ? ed.spec[key] : '#888888'}"></label></div>`;
  const chips = (key, list) => `<div class="chips">${list.map(([v, t]) => `<button class="chip${String(ed.spec[key]) === String(v) ? ' on' : ''}" data-set="${key}" data-val="${v}">${t}</button>`).join('')}</div>`;
  const toggle = (key, label, on) => `<button class="chip${on ? ' on' : ''}" data-toggle="${key}">${label}</button>`;
  function renderEditor() {
    const s = ed.spec;
    const preset = ed.preset >= 0 ? G.CHARACTERS[ed.preset] : null;
    $('#char-presets').innerHTML = G.CHARACTERS.map((c, i) => `<button class="chip${ed.preset === i ? ' on' : ''}" data-preset="${i}">${c.name}</button>`).join('') + `<button class="chip${ed.preset === -1 ? ' on' : ''}" data-preset="-1">自訂</button><button class="chip dice" data-random>隨機</button>`;
    $('#char-desc').textContent = preset ? preset.desc : '你自己的台北人。';
    const nameEl = $('#char-name-input');
    if (document.activeElement !== nameEl) nameEl.value = ed.name;
    const rows = `
      <div class="ed-row"><span>性別</span>${chips('body', CHOICES.body)}</div>
      <div class="ed-row"><span>身高</span>${chips('height', CHOICES.height)}</div>
      <div class="ed-row"><span>膚色</span>${swatches('skin', OPT.skin)}</div>
      <div class="ed-row"><span>髮型</span>${chips('style', CHOICES.style)}</div>
      <div class="ed-row"><span>髮色</span>${swatches('hair', OPT.hair)}</div>
      <div class="ed-row"><span>帽子</span>${chips('hat', CHOICES.hat)}</div>
      ${s.hat && s.hat !== 'none' ? `<div class="ed-row"><span>帽子顏色</span>${swatches('hatColor', OPT.hat)}</div>` : ''}
      <div class="ed-row"><span>上衣</span>${chips('top', CHOICES.top)}</div>
      <div class="ed-row"><span>上衣顏色</span>${swatches('shirt', OPT.cloth)}</div>
      ${s.top === 'jacket' ? `<div class="ed-row"><span>內搭顏色</span>${swatches('inner', OPT.cloth)}</div>` : ''}
      <div class="ed-row"><span>下身</span>${chips('bottom', CHOICES.bottom)}</div>
      <div class="ed-row"><span>${s.bottom === 'skirt' ? '裙子' : '褲子'}顏色</span>${swatches('pants', OPT.pants)}</div>
      <div class="ed-row"><span>鞋子</span>${swatches('shoes', OPT.shoes)}</div>
      <div class="ed-row"><span>配件</span><div class="chips">${toggle('glasses', '眼鏡', s.glasses)}${toggle('bag', '背包', !!s.bag)}</div></div>
      <div class="ed-row"><span>鬍子</span><div class="chips">${toggle('beard', '留鬍子', s.beard)}</div></div>`;
    // shops only offer their own section: the clothes store sells clothes, the barber does hair
    const holder = document.createElement('div');
    holder.innerHTML = rows;
    for (const row of [...holder.children]) {
      const key = (row.querySelector('[data-set],[data-toggle]') || {}).dataset || {};
      const sec = SECTION[key.set || key.toggle] || 'clothes';
      if (ed.mode !== 'full' && sec !== ed.mode) row.remove();
    }
    $('#char-editor').innerHTML = holder.innerHTML;
  }
  function editorClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const s = ed.spec;
    if (b.dataset.preset !== undefined) {
      const i = +b.dataset.preset;
      if (i >= 0) { ed.spec = Object.assign({}, G.CHARACTERS[i].spec); ed.name = G.CHARACTERS[i].name; }
      ed.preset = i;
    } else if (b.dataset.random !== undefined) {
      const pick = (a) => a[Math.floor(Math.random() * a.length)];
      const body = pick(['m', 'f']);
      ed.spec = {
        body, height: pick([0.93, 1, 1, 1.06]), skin: pick(OPT.skin), hair: pick(OPT.hair.slice(0, 7)),
        style: pick(body === 'f' ? ['long', 'bob', 'ponytail', 'twin', 'bun', 'short'] : ['short', 'buzz', 'spiky', 'short', 'bald', 'ponytail']),
        hat: pick(['none', 'none', 'cap', 'beanie']), hatColor: pick(OPT.hat), top: pick(['tee', 'long', 'tank', 'hoodie', 'jacket']),
        shirt: pick(OPT.cloth), inner: pick(OPT.cloth), bottom: pick(body === 'f' ? ['pants', 'shorts', 'skirt'] : ['pants', 'pants', 'shorts']),
        pants: pick(OPT.pants), shoes: pick(OPT.shoes), glasses: Math.random() < 0.25, bag: Math.random() < 0.3 ? pick(['#6b4a2e', '#222222', '#c7302b']) : null, beard: body === 'm' && Math.random() < 0.2,
      };
      ed.preset = -1;
    } else if (b.dataset.toggle) {
      const k = b.dataset.toggle;
      s[k] = k === 'bag' ? (s.bag ? null : '#6b4a2e') : !s[k];
      ed.preset = -1;
    } else if (b.dataset.set) {
      const k = b.dataset.set;
      let v = b.dataset.val;
      if (k === 'height') v = +v;
      s[k] = v;
      // switching gender only drops what no longer fits; everything else the player picked stays
      if (k === 'body' && v === 'f') s.beard = false;
      ed.preset = -1;
    } else return;
    S.sfx('click');
    renderEditor();
    rebuildPreview();
  }
  function editorInput(e) {
    const t = e.target;
    if (t.id === 'char-name-input') { ed.name = t.value.slice(0, 8); return; }
    if (t.type === 'color' && t.dataset.set) { ed.spec[t.dataset.set] = t.value; ed.preset = -1; rebuildPreview(); }
  }
  function editorChange(e) { if (e.target.type === 'color') renderEditor(); }
  function saveCharacter() {
    if (ed.mode !== 'full') {
      const changed = JSON.stringify(ed.spec) !== ed.before;
      if (ed.mode === 'body') {
        G.save.charName = (ed.name || '').trim() || G.playerName();
        $('#btn-chars small').textContent = G.save.charName;
      } else if (!changed) { UI.toast('沒有改變，不用付錢'); return true; }
      if (G.money < ed.price) { UI.toast('錢不夠……'); return false; }
      G.money -= ed.price;
      G.save.charSpec = Object.assign({}, ed.spec);
      const st = U.store.get('save', {});
      U.store.set('save', Object.assign(st, { charSpec: G.save.charSpec }));
      if (G.player) G.setCharacter();
      G.saveGame();
      if (ed.mode !== 'body') { UI.toast(ed.mode === 'clothes' ? '換上新衣服了！' : '剪好了，帥！'); Sound.sfx('cash'); }
      return true;
    }
    const name = (ed.name || '').trim() || (ed.preset >= 0 ? G.CHARACTERS[ed.preset].name : '無名氏');
    if (ed.preset >= 0) { G.save.character = ed.preset; G.save.charSpec = null; }
    else G.save.charSpec = Object.assign({}, ed.spec);
    G.save.charName = name;
    const st = U.store.get('save', {});
    U.store.set('save', Object.assign(st, { character: G.save.character || 0, charSpec: G.save.charSpec, charName: name }));
    if (G.player) G.setCharacter();
    $('#btn-chars small').textContent = name;
  }

  // ---------------- title screen art: a garage shutter rolling up on a Wanhua street at dawn ----------------
  const title = { on: true };
  function titleArt() {
    const c = $('#titleCanvas'), g = c.getContext('2d');
    let W2, H, dpr, houses, riders, t0 = performance.now();
    const rnd = (a, b) => a + Math.random() * (b - a);
    const setup = () => {
      dpr = Math.min(2, devicePixelRatio);
      W2 = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr;
      houses = [];
      let x = -10;
      while (x < W2 + 40) {
        const w = rnd(90, 170) * dpr, h = rnd(0.28, 0.46) * H;
        houses.push({ x, w, h, col: ['#3b3552', '#443d5c', '#352f4a', '#4a4262'][houses.length % 4], tank: Math.random() < 0.6, shed: Math.random() < 0.5, sign: Math.random() < 0.45 ? rnd(0, 1) : -1, lit: Array.from({ length: 12 }, () => Math.random() < 0.35) });
        x += w + rnd(0, 4) * dpr;
      }
      riders = Array.from({ length: 9 }, (_, i) => ({ x: rnd(0, W2), sp: rnd(90, 190) * dpr, lane: i % 2, col: ['#e84b3c', '#2f6fb3', '#f2c230', '#eee', '#3f8f5a'][i % 5] }));
    };
    setup();
    addEventListener('resize', () => title.on && setup());
    const draw = (now) => {
      if (!title.on) return;
      requestAnimationFrame(draw);
      const t = (now - t0) / 1000;
      // dawn sky
      const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
      sky.addColorStop(0, '#1b2350'); sky.addColorStop(0.5, '#6b4f86'); sky.addColorStop(0.85, '#f29a76'); sky.addColorStop(1, '#ffd29a');
      g.fillStyle = sky; g.fillRect(0, 0, W2, H);
      g.fillStyle = 'rgba(255,236,190,0.9)'; g.beginPath(); g.arc(W2 * 0.72, H * 0.62, H * 0.07, 0, 7); g.fill();
      // far hills + 101 silhouette in the haze
      g.fillStyle = '#6b5a86'; g.beginPath(); g.moveTo(0, H * 0.62);
      for (let x = 0; x <= W2; x += 30) g.lineTo(x, H * 0.58 - Math.sin(x / 220) * H * 0.03);
      g.lineTo(W2, H); g.lineTo(0, H); g.fill();
      g.fillStyle = '#5a4b77';
      const tx = W2 * 0.84, tw = W2 * 0.012;
      g.fillRect(tx - tw, H * 0.3, tw * 2, H * 0.32); g.fillRect(tx - 1, H * 0.24, 2, H * 0.07);
      // old walk-ups with iron window cages, rooftop sheds and water tanks
      const base = H * 0.8;
      for (const b of houses) {
        const y = base - b.h;
        g.fillStyle = b.col; g.fillRect(b.x, y, b.w, b.h);
        if (b.shed) { g.fillStyle = '#5f7f9a'; g.fillRect(b.x + b.w * 0.15, y - 16 * dpr, b.w * 0.55, 16 * dpr); }
        if (b.tank) { g.fillStyle = '#b8c0c8'; g.fillRect(b.x + b.w * 0.7, y - 22 * dpr, 16 * dpr, 14 * dpr); g.fillRect(b.x + b.w * 0.7 + 3 * dpr, y - 8 * dpr, 2 * dpr, 8 * dpr); }
        let k = 0;
        for (let wy = y + 14 * dpr; wy < base - 50 * dpr; wy += 30 * dpr) for (let wx = b.x + 12 * dpr; wx < b.x + b.w - 30 * dpr; wx += 38 * dpr) {
          g.fillStyle = b.lit[k++ % 12] ? '#ffd68a' : '#24203a'; g.fillRect(wx, wy, 22 * dpr, 16 * dpr);
          g.strokeStyle = 'rgba(200,200,190,0.55)'; g.lineWidth = 1;
          for (let s = 1; s < 4; s++) { g.beginPath(); g.moveTo(wx + s * 5.5 * dpr, wy - 2 * dpr); g.lineTo(wx + s * 5.5 * dpr, wy + 18 * dpr); g.stroke(); }
        }
        // arcade (騎樓)
        g.fillStyle = '#1c1830'; g.fillRect(b.x, base - 46 * dpr, b.w, 46 * dpr);
        g.fillStyle = '#2a2440'; for (let px = b.x; px < b.x + b.w; px += 44 * dpr) g.fillRect(px, base - 46 * dpr, 7 * dpr, 46 * dpr);
        if (b.sign >= 0) {
          const sx = b.x + b.w * (0.2 + b.sign * 0.5), sy = y + 20 * dpr;
          g.fillStyle = '#f7f1dd'; g.fillRect(sx, sy, 16 * dpr, 70 * dpr);
          g.fillStyle = '#c62828'; g.fillRect(sx + 3 * dpr, sy + 6 * dpr, 10 * dpr, 58 * dpr);
        }
      }
      // tangled power lines
      g.strokeStyle = 'rgba(20,16,30,0.8)'; g.lineWidth = 1.5 * dpr;
      for (let l = 0; l < 4; l++) { g.beginPath(); g.moveTo(0, H * (0.3 + l * 0.04)); g.quadraticCurveTo(W2 * 0.5, H * (0.38 + l * 0.05), W2, H * (0.28 + l * 0.045)); g.stroke(); }
      // street with scooters and the occasional garbage truck
      g.fillStyle = '#231d33'; g.fillRect(0, base, W2, H - base);
      g.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = (t * 40) % 80 - 80; x < W2; x += 80 * dpr) g.fillRect(x, base + (H - base) * 0.45, 36 * dpr, 3 * dpr);
      for (const r of riders) {
        r.x += r.sp * (r.lane ? 1 : -1) / 60;
        if (r.x > W2 + 60) r.x = -60; if (r.x < -60) r.x = W2 + 60;
        const y = base + (H - base) * (r.lane ? 0.62 : 0.3);
        g.fillStyle = r.col; g.fillRect(r.x - 14 * dpr, y - 12 * dpr, 28 * dpr, 10 * dpr);
        g.fillStyle = '#111'; g.beginPath(); g.arc(r.x - 10 * dpr, y, 5 * dpr, 0, 7); g.arc(r.x + 10 * dpr, y, 5 * dpr, 0, 7); g.fill();
        g.fillStyle = '#f2f2f2'; g.fillRect(r.x - 4 * dpr, y - 26 * dpr, 9 * dpr, 14 * dpr);
        g.fillStyle = r.lane ? '#fff4c8' : '#ff4040'; g.fillRect(r.x + (r.lane ? 14 : -18) * dpr, y - 11 * dpr, 4 * dpr, 4 * dpr);
      }
      const tt = (t % 26) / 26, gx = -220 * dpr + tt * (W2 + 440 * dpr), gy = base + (H - base) * 0.62;
      g.fillStyle = '#f2c318'; g.fillRect(gx - 90 * dpr, gy - 58 * dpr, 130 * dpr, 50 * dpr); g.fillRect(gx + 40 * dpr, gy - 44 * dpr, 40 * dpr, 36 * dpr);
      g.fillStyle = '#2e7d32'; g.fillRect(gx - 90 * dpr, gy - 22 * dpr, 130 * dpr, 7 * dpr);
      g.fillStyle = '#111'; for (const wx of [-60, 10, 60]) { g.beginPath(); g.arc(gx + wx * dpr, gy - 4 * dpr, 9 * dpr, 0, 7); g.fill(); }
      g.fillStyle = '#ffe9b0'; g.font = `900 ${22 * dpr}px ${W.FONT}`; for (let k = 0; k < 3; k++) g.fillText('♪', gx - 60 * dpr + k * 34 * dpr, gy - 70 * dpr - Math.abs(Math.sin(t * 3 + k)) * 18 * dpr);
      // the shutter rolls up on load, then rests as a band across the top
      const open = Math.min(1, t / 2.2);
      const ease = 1 - Math.pow(1 - open, 3);
      const sh = H * (1 - ease * 0.88);
      const grd = g.createLinearGradient(0, 0, 0, sh);
      grd.addColorStop(0, '#8b9096'); grd.addColorStop(1, '#6d7278');
      g.fillStyle = grd; g.fillRect(0, 0, W2, sh);
      g.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = sh - 6 * dpr; y > 0; y -= 12 * dpr) g.fillRect(0, y, W2, 2 * dpr);
      g.fillStyle = '#4b4f55'; g.fillRect(0, sh - 10 * dpr, W2, 10 * dpr);
      g.fillStyle = '#c62828'; g.fillRect(W2 * 0.5 - 18 * dpr, sh - 26 * dpr, 36 * dpr, 12 * dpr);
    };
    requestAnimationFrame(draw);
  }

  // ---------------- touch controls ----------------
  function setupTouch() {
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (!isTouch) return;
    document.body.classList.add('touch');
    if (!U.store.get('settings', null)) G.settings.quality = 'mid';
    const I = G.input;
    const stick = $('#t-stick'), knob = stick.querySelector('i');
    let sid = null, sx = 0, sy = 0;
    stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; stick.setPointerCapture(e.pointerId); move(e); });
    const move = (e) => {
      if (e.pointerId !== sid) return;
      let dx = e.clientX - sx, dy = e.clientY - sy;
      const d = Math.hypot(dx, dy), max = 50;
      if (d > max) { dx *= max / d; dy *= max / d; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      I.stick.x = dx / max; I.stick.y = -dy / max;
      I.stick.run = d > max * 0.95;
    };
    stick.addEventListener('pointermove', move);
    const end = (e) => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; I.stick.x = I.stick.y = 0; };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    // look area
    const look = $('#t-look');
    let lid = null, lx = 0, ly = 0;
    look.addEventListener('pointerdown', (e) => { lid = e.pointerId; lx = e.clientX; ly = e.clientY; look.setPointerCapture(e.pointerId); });
    look.addEventListener('pointermove', (e) => { if (e.pointerId !== lid) return; I.look.x += (e.clientX - lx) * 1.4; I.look.y += (e.clientY - ly) * 1.4; lx = e.clientX; ly = e.clientY; });
    look.addEventListener('pointerup', () => (lid = null));
    // buttons
    $$('#touch [data-k]').forEach((b) => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (k === 'Mouse0') { I.lmbHit = true; I.lmb = true; }
        else if (k === 'Mouse2') I.rmb = !I.rmb;
        else { I.pressed.add(k); I.touchBtn.add(k); }
        b.classList.add('down');
      });
      const up = () => { if (k === 'Mouse0') I.lmb = false; else if (k !== 'Mouse2') I.touchBtn.delete(k); b.classList.remove('down'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
  }

  // ---------------- boot ----------------
  let booted = false;
  async function startGame() {
    if (G.state !== 'title') return;
    if (document.activeElement) document.activeElement.blur();
    S.init();
    S.setVolume(G.settings.volume);
    S.music(false);
    S.sfx('start');
    if (booted) return;
    booted = true;
    $('#menu').hidden = true;
    $('#loading').hidden = false;
    G.state = 'loading';
    const bar = $('#loading i'), msg = $('#loading span');
    try {
      await Promise.race([document.fonts.load(`900 40px "Noto Sans TC"`, '牛肉麵KTV旅社當舖眼鏡珍珠奶茶牙醫小吃通訊行按摩鹽酥雞診所補習班滷肉飯刺青電影院網咖火鍋檳榔彩券藥局麻辣鍋刈包豆花便當卡拉茶行銀樓蚵仔煎理髮麵線熱炒老王阿嬤大腸包小腸林記好運正宗胡椒餅春水飲明亮全民大台北金好吃一鍋入魂巷口籠專賣姨早餐店通訊快樂幸福夜貓子超級星光黑糖花園同電器財燒臘溫州餛飩水果手搖料自助洗衣中藥地方咖啡台北車站西門紅樓町自由廣場國家戲劇院音樂廳捷運醫院警察局市百貨'), new Promise((r) => setTimeout(r, 2500))]);
    } catch (e) {}
    G.initRenderer($('#game'));
    await Regions.load(Regions.order.includes(G.save.region) ? G.save.region : 'taipei', (p, m) => { bar.style.width = `${Math.round(p * 90)}%`; msg.textContent = m; });
    UI.weapon();
    bar.style.width = '94%';
    msg.textContent = '暖機中';
    await new Promise((r) => setTimeout(r, 30));
    G.prewarm();
    bar.style.width = '100%';
    msg.textContent = '完成';
    await new Promise((r) => setTimeout(r, 250));
    title.on = false;
    $('#title').hidden = true;
    $('#hud').hidden = false;
    G.state = 'play';
    G.clock.getDelta();
    G.godT = 2;
    requestAnimationFrame(G.frame);
    lockPointer();
    setTimeout(() => {
      if (W.regionId !== 'taipei') UI.bigText(W.region.zh, `${W.region.en}・${W.region.desc}`, 4200);
      else if (!G.save.done.dawn) Missions.start('dawn');
      else UI.hint(document.body.classList.contains('touch') ? '點「手機」看任務，「地圖」設導航' : '按 Tab 打開手機看任務，M 打開地圖', 6000);
    }, 1800);
  }
  function lockPointer() {
    const cv = $('#game');
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    if (document.body.classList.contains('touch')) return;
    try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  }

  function bind() {
    $('#btn-start').addEventListener('click', startGame);
    $('#btn-chars').addEventListener('click', () => { S.init(); openPanel('chars', 'title'); });
    $('#btn-controls').addEventListener('click', () => openPanel('controls', 'title'));
    $('#btn-settings').addEventListener('click', () => openPanel('settings', 'title'));
    $$('[data-close]').forEach((b) => b.addEventListener('click', closePanel));
    $('#chars').addEventListener('click', editorClick);
    $('#chars').addEventListener('input', editorInput);
    $('#chars').addEventListener('change', editorChange);
    $('#char-pick').addEventListener('click', () => { if (saveCharacter() === false) return; S.sfx('pickup'); closePanel(); });
    $('#btn-chars small').textContent = G.playerName();
    // pause
    $('#p-resume').addEventListener('click', () => { UI.pause(false); lockPointer(); });
    $('#p-chars').addEventListener('click', () => openPanel('chars', 'pause'));
    $('#p-controls').addEventListener('click', () => openPanel('controls', 'pause'));
    $('#p-settings').addEventListener('click', () => openPanel('settings', 'pause'));
    $('#p-abort').addEventListener('click', () => { Missions.abort(); UI.pause(false); lockPointer(); });
    $('#p-title').addEventListener('click', () => { G.saveGame(); location.reload(); });
    // map / phone / mrt
    $('#fullmap').addEventListener('click', (e) => mapClick(e, false));
    $('#fullmap').addEventListener('contextmenu', (e) => { e.preventDefault(); mapClick(e, true); });
    $('#map-close').addEventListener('click', () => { UI.closeMap(); lockPointer(); });
    $('#map-clear').addEventListener('click', () => { G.waypoint = null; drawFullMap(); });
    $('#phone').addEventListener('click', phoneClick);
    $('#ph-close').addEventListener('click', () => { UI.closePhone(); lockPointer(); });
    $('#mrt').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-i]');
      if (b) { closeMRT(); Missions.rideMRT(W.mrt[+b.dataset.i]); lockPointer(); }
      if (e.target.closest('#mrt-close')) { closeMRT(); lockPointer(); }
    });
    // keys for overlays
    addEventListener('keydown', (e) => {
      const consume = () => { G.input.pressed.delete(e.code); G.input.keys.delete(e.code); };
      if (G.state === 'map' && ['KeyM', 'Escape'].includes(e.code)) { consume(); UI.closeMap(); lockPointer(); }
      else if (G.state === 'phone' && ['Tab', 'KeyT', 'Escape'].includes(e.code)) { e.preventDefault(); consume(); UI.closePhone(); lockPointer(); }
      else if (G.state === 'pause' && e.code === 'Escape' && !e.repeat) { consume(); UI.pause(false); lockPointer(); }
      else if (G.state === 'menu' && e.code === 'Escape' && !$('#mrt').hidden) { consume(); closeMRT(); }
      else if (G.state === 'title' && e.code === 'Enter' && $('#panels').hidden) startGame();
    });
    // re-lock pointer on click while playing
    $('#game').addEventListener('click', () => { if (G.state === 'play' && !document.pointerLockElement) lockPointer(); });
    document.addEventListener('pointerlockchange', () => {
      // Esc releases the mouse: pause like a console game
      if (!document.pointerLockElement && G.state === 'play' && !document.body.classList.contains('touch')) UI.pause(true);
    });
    // without pointer lock (not clicked yet, or an embed that blocks it) you can still drag to look around
    addEventListener('mousemove', (e) => { if (!document.pointerLockElement && G.state === 'play' && e.buttons) { G.input.mdx += e.movementX; G.input.mdy += e.movementY; } });
    setInterval(() => { $('#clickhint').hidden = !(G.state === 'play' && !document.pointerLockElement && !document.body.classList.contains('touch')); }, 400);
    $('#t-pause') && $('#t-pause').addEventListener('click', () => UI.pause(true));
    // first interaction starts title music
    const kick = () => { S.init(); S.setVolume(G.settings.volume); if (G.state === 'title') S.music(true); removeEventListener('pointerdown', kick); };
    addEventListener('pointerdown', kick);
    bindSettings();
    setupTouch();
    titleArt();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();
