// 寶島狂飆 — story, jobs, neighbourhood services
(function () {
  const W = World, S = Sound;
  const Ms = { active: null, target: null, markers: [], points: [] };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const P = () => G.player;
  const isTouch = () => document.body.classList.contains('touch');
  const KEY_E = () => (isTouch() ? '「互動」' : ' E ');

  // ---------- 3D markers ----------
  const beamMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const labelCache = {};
  function labelSprite(label, color) {
    const key = label + color;
    if (!labelCache[key]) labelCache[key] = U.canvasTex(128, 128, (c) => {
      c.fillStyle = '#' + new THREE.Color(color).getHexString(); c.beginPath(); c.arc(64, 64, 56, 0, 7); c.fill();
      c.strokeStyle = '#111'; c.lineWidth = 8; c.stroke();
      c.fillStyle = '#111'; c.font = `900 ${label.length > 1 ? 52 : 70}px ${W.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, 64, 68);
    });
    return labelCache[key];
  }
  function makeMarker(color, label, size = 1) {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1 * size, 1.1 * size, 60, 20, 1, true), beamMat(color));
    beam.position.y = 30;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6 * size, 0.08, 6, 36), new THREE.MeshBasicMaterial({ color }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.25;
    g.add(beam, ring);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelSprite(label || '', color), depthTest: false }));
    sp.scale.setScalar(1.6); sp.position.y = 3.2; sp.renderOrder = 5;
    sp.visible = !!label;
    g.add(sp);
    g.userData = { ring, sprite: sp, beam, color };
    G.scene.add(g);
    return g;
  }
  let objMarker = null;
  Ms.setTarget = function (x, z, opts = {}) {
    if (!objMarker) objMarker = makeMarker(0xffd23f);
    objMarker.visible = true;
    objMarker.position.set(x, W.groundAt(x, z), z);
    const s = opts.big ? 4 : 1;
    objMarker.scale.set(s, 1, s);
    Ms.target = { x, z, r: opts.r || 4, label: opts.label || '', color: '#ffd23f' };
  };
  Ms.clearTarget = function () { if (objMarker) objMarker.visible = false; Ms.target = null; };
  // several simultaneous stops (deliveries, riders, garbage doors)
  const pointPool = [];
  Ms.setPoints = function (list) {
    Ms.points = list;
    while (pointPool.length < list.length) pointPool.push(makeMarker(0x6fe3ff, '1'));
    pointPool.forEach((mk, i) => {
      const p = list[i];
      mk.visible = !!p;
      if (!p) return;
      mk.position.set(p.x, W.groundAt(p.x, p.z), p.z);
      mk.userData.sprite.material.map = labelSprite(p.label, p.color || '#6fe3ff');
      mk.userData.sprite.visible = true;
      mk.userData.ring.material.color.set(p.color || '#6fe3ff');
      mk.userData.beam.material.color.set(p.color || '#6fe3ff');
    });
  };

  // ---------- helpers ----------
  const say = (name, text, ms) => UI.subtitle(name, text, ms);
  function near(x, z, r) { const p = P().pos; return (p.x - x) ** 2 + (p.z - z) ** 2 < r * r; }
  const stopped = () => !P().vehicle || Math.abs(P().vehicle.fwd) < 2.5;
  function nearestRoadPoint(x, z) {
    const n = W.nearestNode(x, z, true);
    const e = n.adj.find((e) => !e.seg.ped);
    const to = W.nodes[e.to];
    const len = e.seg.len, dx = (to.x - n.x) / len, dz = (to.z - n.z) / len;
    const t = Math.min(25, len / 2);
    const off = e.seg.w / 2 - 1.5;
    return { x: n.x + dx * t - dz * off, z: n.z + dz * t + dx * off, h: Math.atan2(dx, dz) };
  }
  Ms.nearestRoadPoint = nearestRoadPoint;
  function pickFar(list, from, minD, maxD, avoid = []) {
    const c = list.filter((p) => { const d = dist(p, from); return d > minD && d < maxD && !avoid.some((a) => dist(a, p) < 40); });
    return c.length ? U.mpick(c) : U.mpick(list);
  }
  function pathLength(a, b) {
    const pts = [a, ...W.path(a.x, a.z, b.x, b.z, true), b];
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += dist(pts[i - 1], pts[i]);
    return d;
  }
  const FUBO = { skin: '#c98f67', shirt: '#4d6a7a', sleeve: '#4d6a7a', pants: '#3a3a44', shoes: '#222', hair: '#9a9a9a', style: 'buzz', top: 'long', glasses: true, beard: true, body: 'm', scale: 0.97 };
  const AZHU = { skin: '#e0b08a', shirt: '#e27ba0', pants: '#384e2e', shoes: '#2f5fa8', hair: '#3a2a1e', style: 'bun', top: 'tee', body: 'f', scale: 0.92, bag: '#c7302b' };

  // script-driven vehicles (garbage trucks, the cable thief) follow a list of points
  function followPath(v, pts, speed, dt) {
    while (v.pi < pts.length && dist(v.pos, pts[v.pi]) < 7) v.pi++;
    if (v.pi >= pts.length) { G.vehicleStep(v, { throttle: 0, steer: 0, hand: true }, dt); return true; }
    const p = pts[v.pi];
    const d = U.wrapAngle(Math.atan2(p.x - v.pos.x, p.z - v.pos.z) - v.h);
    let steer = U.clamp(d * 2.2, -1, 1);
    const target = Math.abs(d) > 0.5 ? Math.min(speed, 5) : speed;
    let th = v.fwd < target - 0.5 ? 0.8 : v.fwd > target + 1 ? -0.6 : 0.1;
    if (th > 0.5 && Math.abs(v.fwd) < 0.5) v.stuckT = (v.stuckT || 0) + dt; else v.stuckT = 0;
    if (v.stuckT > 2.5) { v.revT = 1.2; v.stuckT = 0; }
    if (v.revT > 0) { v.revT -= dt; th = -0.8; steer = -steer; }
    G.vehicleStep(v, { throttle: th, steer, hand: false }, dt);
    return false;
  }
  function routeThrough(points) {
    const out = [];
    for (let i = 1; i < points.length; i++) {
      const seg = W.path(points[i - 1].x, points[i - 1].z, points[i].x, points[i].z, true);
      for (const n of seg) if (!out.length || dist(out[out.length - 1], n) > 1) out.push({ x: n.x, z: n.z });
    }
    return out;
  }

  // ---------- mission definitions ----------
  // story chapters (once) and neighbourhood jobs (repeatable)
  Ms.defs = [
    {
      id: 'dawn', region: 'taipei', title: '第一章　清晨開市', giver: '阿福機車行 福伯', icon: '福', once: true, reward: 400, story: true,
      desc: '你剛到萬華的阿福機車行當學徒。天還沒全亮，市場的阿珠姨發財車就拋錨了——先把工具帶去，再幫她把菜載進市場。',
      start: () => W.lmPOI.garage,
      run: async (m) => {
        const g = W.lmPOI.garage;
        const fubo = m.ped(g.x - 3, g.z + 6, { spec: FUBO, state: 'idle' });
        fubo.yaw = Math.PI;
        await m.say([['福伯', '少年仔，這麼早就來上工喔！'], ['福伯', '市場的阿珠姨發財車又發不動了，一車菜還卡在路邊。'], ['福伯', '後面牆上那個紅色工具箱帶著，去幫她看看。']]);
        m.obj(`拿牆上的工具箱（靠近按${KEY_E()}）`);
        m.target(g.x, g.z + 13, { r: 2 });
        m.interact(g.x, g.z + 13, 2.4, '拿工具箱', () => (m.flag.tool = true));
        await m.until(() => m.flag.tool);
        S.sfx('pickup');
        const truck = m.vehicle('truck', -832, 224, -Math.PI / 2, '#2d5aa0');
        truck.hp = truck.spec.hp * 0.4;
        m.failIf = () => (truck.dead || truck.removed ? '阿珠姨的發財車毀了' : null);
        m.obj('走到市場口的故障發財車');
        m.target(truck.pos.x, truck.pos.z, { r: 5 });
        const azhu = m.ped(truck.pos.x + 1, truck.pos.z + 3.2, { spec: AZHU, state: 'idle' });
        await m.until(() => near(truck.pos.x, truck.pos.z, 5) && !P().vehicle);
        say('阿珠姨', '少年仔你來了！引擎一直咳咳咳，就是發不動……', 3000);
        m.obj(`按住${KEY_E()}修理引擎`);
        await m.hold('修理中…', 2.6, () => near(truck.pos.x, truck.pos.z, 5) && G.input.down('KeyE'));
        truck.hp = truck.spec.hp;
        S.sfx('start');
        await m.say([['阿珠姨', '發動了！你比我兒子還厲害！'], ['阿珠姨', '菜都在車上，幫我開到市場後面的卸貨口好不好？我年紀大了開不動。'], ['阿珠姨', '慢慢開喔，蛋跟豆腐都在上面。', 2600]]);
        azhu.state = 'walk';
        m.obj('坐進發財車（F）');
        m.target(truck.pos.x, truck.pos.z, { r: 3 });
        await m.until(() => P().vehicle === truck);
        UI.hint(isTouch() ? '左搖桿往上加速、往下煞車，左右轉彎；「跳」是手煞車' : 'W 加速　S 煞車／倒車　A D 轉彎　空白鍵 手煞車　C 切換視角', 7000);
        m.cargo = 100;
        m.meter('貨物完整度', () => m.cargo);
        const dock = { x: -832, z: 404 };
        m.obj('把菜載到萬福市場後面的卸貨口（辛亥路側）');
        m.target(dock.x, dock.z, { r: 7 });
        await m.until(() => P().vehicle === truck && near(dock.x, dock.z, 8) && stopped());
        m.meter(null);
        m.clearTarget();
        const pct = Math.round(m.cargo);
        await m.say([['阿珠姨（電話）', pct > 70 ? '哇，一顆蛋都沒破！福伯沒看錯人。' : '豆腐碎了幾盒……沒關係啦，下次慢一點。'], ['福伯（電話）', '做得好。以後這條街的人都會記得你。'], ['福伯（電話）', '手機裡的「街坊」App 會有大家託你的工作，幫越多人，人情越多，好處也越多。', 3800]]);
        G.addCred(pct > 70 ? 10 : 6, '幫阿珠姨開市');
        m.complete();
      },
      onCrash: (m, imp) => { if (m.cargo !== undefined) m.cargo = Math.max(0, m.cargo - imp * 3); },
    },
    {
      id: 'market', region: 'taipei', title: '市場共同配送', giver: '萬福市場攤商', icon: '配', reward: 0, need: 'dawn',
      desc: '攤商們把貨交給你一起送。自己挑車、挑單、決定送貨順序：機車快但只能載兩件，發財車慢但能載四件。雞蛋豆腐怕撞，鮮魚要趁冰送到。',
      start: () => ({ x: -850, z: 322 }),
      run: async (m) => {
        const veh = await m.choose('選擇載具', '機車鑽得快；發財車載得多，但加速慢、過彎要小心。', [
          { title: '機車', meta: '最多 2 件・靈活', tag: '快' },
          { title: '發財車', meta: '最多 4 件・重貨也不怕', tag: '穩' },
        ], 1);
        const truck = veh[0] === 1;
        const cap = truck ? 4 : 2;
        const ITEMS = [['雞蛋兩箱', '易碎'], ['板豆腐', '易碎'], ['鮮魚一箱', '冷藏'], ['豬肉', '冷藏'], ['白米兩袋', '重'], ['高麗菜', ''], ['水果禮盒', '易碎'], ['鮮花', '易碎'], ['乾貨', '']];
        const DEST = ['巷口麵店', '早餐店', '自助餐', '素食店', '熱炒店', '便當店', '里長家', '佛具店', '中藥行', '咖啡店'];
        const orders = [];
        const used = [];
        const itemBag = ITEMS.slice().sort(() => Math.random() - 0.5), destBag = DEST.slice().sort(() => Math.random() - 0.5);
        for (let i = 0; i < 5; i++) {
          const [item, tag] = itemBag[i];
          const d = pickFar(W.frontages, P().pos, 150, 520, used);
          used.push(d);
          const len = pathLength(P().pos, d);
          orders.push({ item, tag, dest: destBag[i], x: d.x, z: d.z, len, pay: Math.round(70 + len * 0.22 + (tag ? 30 : 0)), cond: 100, done: false, cold: tag === '冷藏' ? Math.round(len / 7 + 50) : 0 });
        }
        const picks = await m.choose(`接單（最多 ${cap} 件）`, '距離越遠越好賺；易碎品撞到會折價，冷藏品有時限，重貨讓車子加速變慢。', orders.map((o) => ({ title: `${o.item} → ${o.dest}`, meta: `${Math.round(o.len)} m・NT$${o.pay}${o.cold ? `・${o.cold} 秒內` : ''}`, tag: o.tag })), cap);
        const jobs = picks.map((i) => orders[i]);
        const spot = { x: -826, z: 311, h: Math.PI / 2 };
        const v = m.vehicle(truck ? 'truck' : 'delivery', spot.x, spot.z, spot.h, truck ? '#2d5aa0' : undefined);
        m.failIf = () => (v.dead || v.removed ? '車子毀了，貨全沒了' : null);
        m.obj(truck ? '坐進發財車（F）' : '騎上外送機車（F）');
        m.target(v.pos.x, v.pos.z, { r: 3 });
        await m.until(() => P().vehicle === v);
        m.clearTarget();
        v.load = jobs.filter((j) => j.tag === '重').length * (truck ? 0.25 : 0.6);
        const t0 = G.elapsed;
        m.watchCargo = jobs;
        let earned = 0;

        const refresh = () => {
          const left = jobs.filter((j) => !j.done);
          Ms.setPoints(left.map((j) => ({ x: j.x, z: j.z, label: String(jobs.indexOf(j) + 1), color: j.cold ? '#6fe3ff' : j.tag === '易碎' ? '#ffb3d1' : '#b9f27c' })));
          const nearest = left.slice().sort((a, b) => dist(a, P().pos) - dist(b, P().pos))[0];
          if (nearest) Ms.target = { x: nearest.x, z: nearest.z, r: 6 };
          m.obj(left.map((j) => {
            const n = jobs.indexOf(j) + 1;
            const t = j.cold ? Math.max(0, Math.round(j.cold - (G.elapsed - t0))) : null;
            return `${n}. ${j.item}→${j.dest}  ${Math.round(j.cond)}%${t != null ? `  ⏱${t}s` : ''}`;
          }).join('\n') || '全部送達！');
        };
        while (jobs.some((j) => !j.done)) {
          refresh();
          // lose cold goods slowly once late
          for (const j of jobs) if (!j.done && j.cold && G.elapsed - t0 > j.cold) j.cond = Math.max(0, j.cond - 4 * 0.25);
          const hit = jobs.find((j) => !j.done && near(j.x, j.z, 8) && stopped());
          if (hit) {
            hit.done = true;
            const late = hit.cold && G.elapsed - t0 > hit.cold;
            const pay = Math.round(hit.pay * (0.3 + 0.7 * hit.cond / 100));
            earned += pay;
            G.addMoney(pay, `${hit.dest}：${hit.item}`);
            say(hit.dest, hit.cond > 80 && !late ? U.mpick(['東西好好的，謝謝你啦！', '這麼快！幫我跟攤商說讚。', '辛苦了，喝杯水再走。']) : hit.cond > 40 ? '有點撞到……還能用啦。' : '這樣客人會罵的欸……', 2600);
            if (hit.cond > 70) G.addCred(1);
            S.sfx('pickup');
          }
          await m.wait(0.25);
        }
        Ms.setPoints([]);
        v.load = 0;
        UI.bigText('配送完成', `共 ${U.fmtMoney(earned)}`);
        m.complete(0);
      },
      onCrash: (m, imp) => { if (m.watchCargo) for (const j of m.watchCargo) if (!j.done && j.tag === '易碎') j.cond = Math.max(0, j.cond - imp * 5); else if (!j.done && imp > 8) j.cond = Math.max(0, j.cond - imp); },
    },
    {
      id: 'courier', title: '在地外送', giver: '寶島外送平台', icon: '送', reward: 0,
      desc: '到店家取餐，趁熱送到三位客人手上。越快越穩小費越多，摔到餐點會被扣。每個縣市的車站前都能接。',
      start: () => ({ x: W.lmPOI.train.x - 9, z: W.lmPOI.train.z + 2 }),
      run: async (m) => {
        const shop = pickFar(W.restaurants.length ? W.restaurants : W.frontages, P().pos, 80, 380);
        const sp = nearestRoadPoint(P().pos.x, P().pos.z);
        const bike = m.vehicle('delivery', sp.x, sp.z, sp.h);
        m.failIf = () => (bike.dead ? '外送機車毀了' : null);
        m.flag.shake = 0;
        m.obj('騎上外送機車（F）');
        m.target(bike.pos.x, bike.pos.z, { r: 3 });
        await m.until(() => P().vehicle === bike);
        m.obj(`到「${shop.name || '店家'}」取餐`);
        m.target(shop.x, shop.z, { r: 7 });
        await m.until(() => near(shop.x, shop.z, 9) && stopped());
        S.sfx('door');
        say('店員', '三份餐點好了，趁熱送喔！', 2400);
        const stops = [], avoid = [shop];
        for (let i = 0; i < 3; i++) { const f = pickFar(W.frontages, i ? stops[i - 1] : shop, 150, 420, avoid); stops.push(f); avoid.push(f); }
        const len = pathLength(shop, stops[0]) + pathLength(stops[0], stops[1]) + pathLength(stops[1], stops[2]);
        m.timer(Math.round(len / 7 + 50));
        let total = 0;
        for (let i = 0; i < 3; i++) {
          const s = stops[i];
          m.obj(`送餐 ${i + 1} / 3（停好車才算送達）`);
          m.target(s.x, s.z, { r: 7 });
          const ok = await m.until(() => near(s.x, s.z, 9) && stopped(), { timeout: true });
          if (!ok) { m.fail('餐點涼掉了，客人取消訂單'); return; }
          const tip = Math.max(0, Math.round(60 - m.flag.shake * 8));
          total += 90 + tip;
          G.addMoney(90 + tip, tip > 30 ? '客人：好快！小費給你' : '外送費');
          S.sfx('cash');
        }
        m.timer(null);
        G.addCred(1, '餐點準時送達');
        UI.bigText('外送完成！', `這趟共賺 ${U.fmtMoney(total)}`);
        m.complete(0);
      },
      onCrash: (m, imp) => { m.flag.shake = (m.flag.shake || 0) + imp * 0.4; },
    },
    {
      id: 'pool', title: '夜班共乘', giver: '街坊共乘群組', icon: '乘', reward: 0, need: 'dawn',
      desc: '群組裡一次跳出好幾個叫車需求。挑最多三位順路的客人一起載：有人趕末班車、有人不准繞路、有人會暈車。配得好，大家都開心。',
      start: () => (W.regionId === 'taipei' ? { x: W.mrt[0].x + 4, z: W.mrt[0].z + 3 } : { x: W.lmPOI.train.x + 9, z: W.lmPOI.train.z + 2 }),
      run: async (m) => {
        const TAGS = [['趕末班車', '時間內送到'], ['不准繞路', '實際路程不能超過最短路線 1.4 倍'], ['會暈車', '急煞、碰撞都會扣心情'], ['愛聊天', '跟別的乘客同車時會多給小費'], ['', '']];
        const NAMES = ['加班的工程師', '夜班護理師', '剛下課的學生', '夜市攤販', '喝醉的上班族', '背吉他的樂手', '外國背包客', '剛下飛機的阿姨'];
        const reqs = [];
        const avoid = [];
        for (let i = 0; i < 5; i++) {
          const from = pickFar(W.frontages, P().pos, 60, 320, avoid); avoid.push(from);
          const to = pickFar(W.frontages, from, 280, 650, avoid); avoid.push(to);
          const [tag, rule] = U.mpick(TAGS);
          const len = pathLength(from, to);
          reqs.push({ name: U.mpick(NAMES), tag, rule, from, to, len, deadline: tag === '趕末班車' ? Math.round(len / 7.5 + 70) : 0, state: 'wait', ride: 0, mood: 100, ped: null });
        }
        const picks = await m.choose('挑乘客（最多 3 位）', '方向相近的一起載最划算。上車點與下車點都會標在地圖上。', reqs.map((r) => ({ title: `${r.name}`, meta: `${Math.round(r.len)} m${r.deadline ? `・${r.deadline} 秒內` : ''}${r.rule ? '・' + r.rule : ''}`, tag: r.tag })), 3);
        const riders = picks.map((i) => reqs[i]);
        const sp = nearestRoadPoint(P().pos.x, P().pos.z);
        const car = m.vehicle('sedan', sp.x, sp.z, sp.h, '#f0f0ea');
        m.failIf = () => (car.dead ? '車子毀了' : null);
        for (const r of riders) { r.ped = m.ped(r.from.x, r.from.z, { state: 'idle' }); r.ped.dance = true; }
        m.obj('坐上共乘車（F）');
        m.target(car.pos.x, car.pos.z, { r: 3 });
        await m.until(() => P().vehicle === car);
        m.clearTarget();
        const t0 = G.elapsed;
        let last = { x: car.pos.x, z: car.pos.z };
        m.riders = riders;
        let total = 0;
        while (riders.some((r) => r.state !== 'done' && r.state !== 'gone')) {
          const onboard = riders.filter((r) => r.state === 'ride');
          const moved = dist(car.pos, last); last = { x: car.pos.x, z: car.pos.z };
          for (const r of onboard) r.ride += moved;
          for (const r of riders) if (r.deadline && r.state !== 'done' && r.state !== 'gone' && G.elapsed - t0 > r.deadline) {
            if (r.state === 'ride') { r.mood = Math.max(0, r.mood - 40); r.deadline = 0; say(r.name, '末班車開走了啦……算了，你還是送我回去。', 2600); }
            else { r.state = 'gone'; if (r.ped && !r.ped.removed) { r.ped.dance = false; r.ped.state = 'walk'; } say(r.name, '等太久了，我改搭別的。', 2400); }
          }
          const points = [];
          riders.forEach((r, i) => {
            if (r.state === 'wait') points.push({ x: r.from.x, z: r.from.z, label: `上${i + 1}`, color: '#ffd23f' });
            if (r.state === 'ride') points.push({ x: r.to.x, z: r.to.z, label: `下${i + 1}`, color: '#6fe3ff' });
          });
          Ms.setPoints(points);
          const np = points.slice().sort((a, b) => dist(a, P().pos) - dist(b, P().pos))[0];
          Ms.target = np ? { x: np.x, z: np.z, r: 8 } : null;
          m.obj(riders.map((r, i) => `${i + 1}. ${r.name}${r.tag ? '【' + r.tag + '】' : ''} ${r.state === 'wait' ? '等車中' : r.state === 'ride' ? `車上 😊${Math.round(r.mood)}` : r.state === 'done' ? '已送達' : '取消'}${r.deadline && (r.state === 'wait' || r.state === 'ride') ? `  ⏱${Math.max(0, Math.round(r.deadline - (G.elapsed - t0)))}s` : ''}`).join('\n'));
          if (P().vehicle === car && Math.abs(car.fwd) < 2.5) {
            for (const r of riders) {
              if (r.state === 'wait' && near(r.from.x, r.from.z, 9)) {
                if (onboard.length >= 3) { UI.toast('車上坐滿了'); break; }
                r.state = 'ride'; G.removePed(r.ped); S.sfx('door');
                say(r.name, U.mpick(['麻煩你了，我趕時間。', '哈囉～順路就好。', '謝謝，冷氣可以開強一點嗎？']), 2200);
              } else if (r.state === 'ride' && near(r.to.x, r.to.z, 9)) {
                r.state = 'done'; S.sfx('door');
                let ratio = r.ride / Math.max(1, r.len);
                if (r.tag === '不准繞路' && ratio > 1.4) r.mood -= 35;
                const shared = riders.filter((o) => o !== r && o.state === 'ride').length;
                const tip = r.tag === '愛聊天' && r.sharedAny ? 60 : 0;
                const fare = Math.round((90 + r.len * 0.28) * (0.4 + 0.6 * U.clamp(r.mood, 0, 100) / 100)) + tip;
                total += fare;
                G.addMoney(fare, `${r.name}${tip ? '（聊得很開心）' : ''}`);
                say(r.name, r.mood > 70 ? '司機你人真好，下次還找你！' : r.mood > 35 ? '到了，謝謝。' : '下次我自己搭車……', 2400);
                if (r.mood > 70) G.addCred(1);
                void shared; void ratio;
              }
            }
          }
          for (const r of riders) if (r.state === 'ride' && riders.some((o) => o !== r && o.state === 'ride')) r.sharedAny = true;
          await m.wait(0.25);
        }
        Ms.setPoints([]);
        UI.bigText('收班！', `這趟共賺 ${U.fmtMoney(total)}`);
        m.complete(0);
      },
      onCrash: (m, imp) => { if (m.riders) for (const r of m.riders) if (r.state === 'ride') r.mood -= imp * (r.tag === '會暈車' ? 4 : 2); },
    },
    {
      id: 'garbage', region: 'taipei', title: '追垃圾車', giver: '街坊鄰居', icon: '垃', reward: 0, need: 'dawn',
      desc: '〈給愛麗絲〉響起，垃圾車來了！先去幫鄰居收垃圾，再追上垃圾車分類丟：一般垃圾、廚餘丟黃色垃圾車，資源回收丟白色回收車。',
      start: () => ({ x: W.lmPOI.garageFront.x, z: W.lmPOI.garageFront.z }),
      run: async (m) => {
        const TYPES = ['一般垃圾', '資源回收', '廚餘'];
        const doors = W.frontages.filter((f) => f.district === 'wanhua' || f.district === 'ximen').sort((a, b) => dist(a, P().pos) - dist(b, P().pos)).filter((f, i, arr) => arr.slice(0, i).every((o) => dist(o, f) > 25)).slice(0, 4);
        const bags = [];
        let sel = 0;
        m.bags = bags;
        await m.say([['隔壁阿桑', '少年仔！垃圾車快來了，我腰不好，幫忙倒一下好不好？'], ['隔壁阿桑', '整條巷子的人都在等你喔，記得分類！', 2600]]);
        // trucks start their loop now: the player has to hurry
        const ROUTE = [{ x: -760, z: 220 }, { x: -760, z: 400 }, { x: -940, z: 400 }, { x: -940, z: 220 }, { x: -940, z: 80 }, { x: -760, z: 80 }, { x: -760, z: 220 }, { x: -600, z: 220 }, { x: -600, z: 400 }, { x: -760, z: 400 }];
        const STOPS = ROUTE.slice(1);
        const pts = routeThrough(ROUTE);
        const gt = m.vehicle('garbage', pts[0].x, pts[0].z, 0);
        const rt = m.vehicle('recycle', pts[0].x, pts[0].z - 14, 0);
        for (const t of [gt, rt]) { t.driver = 'script'; t.pi = 0; t.persist = true; }
        m.failIf = () => (gt.dead || rt.dead || gt.removed || rt.removed ? '垃圾車被撞壞了……' : null);
        const routeEnd = G.elapsed + 420;
        let stopT = 0, stopIdx = 0;
        gt.script = (v, dt) => {
          if (stopT > 0) { stopT -= dt; G.vehicleStep(v, { throttle: 0, steer: 0, hand: true }, dt); return; }
          const s = STOPS[stopIdx];
          if (s && dist(v.pos, s) < 10) { stopT = 20; stopIdx++; return; }
          if (followPath(v, pts, 6, dt) || G.elapsed > routeEnd) m.routeDone = true;
        };
        rt.script = (v, dt) => {
          const gap = dist(v.pos, gt.pos);
          if (gap < 13 || (stopT > 0 && gap < 22)) { G.vehicleStep(v, { throttle: 0, steer: 0, hand: true }, dt); return; }
          followPath(v, pts, 6.5, dt);
        };
        S.jingle(true);
        m.cleanup(() => S.jingle(false));
        m.onCycle = () => { if (bags.length) { sel = (sel + 1) % bags.length; S.sfx('click'); } return true; };
        let collected = 0, tossed = 0, wrong = 0;
        const doorsLeft = doors.slice();
        const refresh = () => {
          const pts2 = doorsLeft.map((d, i) => ({ x: d.x, z: d.z, label: '袋', color: '#b9f27c' }));
          Ms.setPoints(pts2);
          const tgt = doorsLeft.length ? doorsLeft.slice().sort((a, b) => dist(a, P().pos) - dist(b, P().pos))[0] : gt.pos;
          Ms.target = { x: tgt.x, z: tgt.z, r: 5 };
          const counts = TYPES.map((t) => `${t}×${bags.filter((b) => b === t).length}`).join('　');
          m.obj(`${doorsLeft.length ? `收垃圾：還有 ${doorsLeft.length} 戶` : '追上垃圾車分類丟！'}\n手上：${bags.length ? counts : '（空）'}\n現在拿：${bags[sel] || '—'}　${isTouch() ? '「武器」切換' : 'Q 切換'}，靠近車按${KEY_E()}丟`);
        };
        for (const d of doors) m.interact(d.x, d.z, 2.6, '收垃圾', () => {
          const i = doorsLeft.indexOf(d); if (i < 0) return;
          doorsLeft.splice(i, 1);
          for (let k = 0; k < 2; k++) bags.push(U.mpick(TYPES));
          collected += 2; S.sfx('pickup');
          say('鄰居', U.mpick(['謝謝喔！回收我有洗乾淨了。', '廚餘在這包，味道有點重歹勢～', '辛苦了少年仔！']), 2000);
        }, () => doorsLeft.includes(d));
        const nearTruck = () => [gt, rt].find((t) => dist(t.pos, P().pos) < 5.5 && Math.abs(t.fwd) < 3.5);
        const toss = m.interact(0, 0, 6, () => `把「${bags[sel]}」丟進${nearTruck() === gt ? '垃圾車' : '回收車'}`, () => {
          const truck = nearTruck(); if (!truck || !bags.length) return;
          const b = bags[sel];
          const ok = truck === gt ? b !== '資源回收' : b === '資源回收';
          if (ok) { bags.splice(sel, 1); sel = 0; tossed++; G.addMoney(20, '分類正確'); S.sfx('pickup'); }
          else { wrong++; G.money = Math.max(0, G.money - 10); S.sfx('fail'); say('清潔隊員', truck === gt ? '這是回收啦！丟後面那台白色的！' : '回收車不收這個啦！', 2200); }
        }, () => bags.length > 0 && !!nearTruck());
        while (!m.routeDone) {
          refresh();
          const nt = nearTruck() || gt;
          toss.x = nt.pos.x; toss.z = nt.pos.z;
          S.setJingle(U.clamp(1 - dist(gt.pos, P().pos) / 180, 0.08, 1) * (stopT > 0 ? 1 : 0.6));
          if (!doorsLeft.length && !bags.length) break;
          await m.wait(0.1);
        }
        Ms.setPoints([]);
        const left = bags.length;
        if (collected && left <= collected / 2) {
          const credGain = Math.max(1, Math.round(tossed / 2) - wrong);
          G.addCred(credGain, '幫鄰居倒垃圾');
          UI.bigText(left ? '倒了大部分！' : '全部分類完成！', `丟對 ${tossed} 包・丟錯 ${wrong} 次`);
          m.complete(left ? 0 : 150);
        } else m.fail('垃圾車開走了，垃圾還在手上……');
      },
    },
    {
      id: 'stall', region: 'taipei', title: '夜市攤位備料', giver: '西門夜市 阿明伯', icon: '攤', reward: 0, need: 'dawn',
      desc: '夜市攤位缺人手！客人點什麼就照順序備料：蚵仔煎、大腸包小腸、蔥抓餅、珍奶。做得又快又對，小費就多。',
      start: () => ({ x: -682, z: 44 }),
      run: async (m) => {
        await m.say([['阿明伯', '少年仔會不會做吃的？今天我孫子請假，幫我顧攤一下！'], ['阿明伯', '看清楚客人點什麼，照順序下料，不要把珍珠丟進蚵仔煎喔。', 2800]]);
        const res = await UI.stallGame();
        if (res.served >= 4) {
          G.addMoney(res.earned, `出餐 ${res.served} 份`);
          G.addCred(res.served >= 8 ? 4 : 2, '幫夜市顧攤');
          UI.bigText('收攤！', `出了 ${res.served} 份餐，收入 ${U.fmtMoney(res.earned)}`);
          m.complete(0);
        } else m.fail('客人都跑去隔壁攤了……');
      },
    },
    {
      id: 'outage', region: 'taipei', title: '第二章　斷電的市場', giver: '萬福市場 阿珠姨', icon: '電', once: true, reward: 1500, need: 'dawn', story: true,
      desc: '萬福市場連續幾晚停電，冰櫃裡的魚都快壞了。有人說看到半夜有人在電線桿旁邊鬼鬼祟祟……',
      start: () => ({ x: -843, z: 330 }),
      run: async (m) => {
        await m.say([['阿珠姨', '少年仔，市場昨晚又停電了！冰櫃的魚全部要丟掉。'], ['阿珠姨', '台電說是電纜被剪斷。你幫我們看看好不好？', 2800]]);
        const clues = [
          { x: -852, z: 398, text: '市場後面的電箱被撬開過，螺絲散了一地。', label: '電箱' },
          { x: -884, z: 314, text: '電線桿下有新鮮的輪胎痕，是小貨車的。', label: '胎痕' },
          { x: -935, z: 352, text: '河堤邊的草叢裡丟著一捆剪斷的銅線，還有一張藍色發財車的停車單。', label: '銅線' },
        ];
        for (let i = 0; i < clues.length; i++) {
          const c = clues[i];
          m.obj(`調查線索 ${i + 1} / 3：${c.label}`);
          m.target(c.x, c.z, { r: 3 });
          await m.until(() => near(c.x, c.z, 3.5) && !P().vehicle);
          m.obj(`按住${KEY_E()}調查`);
          await m.hold('調查中…', 1.8, () => near(c.x, c.z, 4) && G.input.down('KeyE'));
          say('你', c.text, 3200);
          await m.wait(2.5);
        }
        m.clearTarget();
        say('阿珠姨（電話）', '那台藍色發財車現在又出現在河堤那邊了！', 2600);
        await m.wait(1.5);
        const sp = pickFar(W.segs.filter((s) => !s.ped).map((s) => { const a = W.nodes[s.a], b = W.nodes[s.b]; return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }; }), P().pos, 70, 140);
        const thief = m.vehicle('truck', sp.x, sp.z, 0, '#1f4f9c');
        thief.driver = 'script'; thief.pi = 0; thief.noExplode = true;
        let route = [];
        let caughtT = 0, lostT = 0;
        thief.script = (v, dt) => {
          if (v.stoppedForGood) { G.vehicleStep(v, { throttle: 0, steer: 0, hand: true }, dt); return; }
          if (!route.length || v.pi >= route.length) {
            const far = pickFar(W.nodes.filter((n) => n.adj.length), P().pos, 250, 700);
            route = routeThrough([{ x: v.pos.x, z: v.pos.z }, far]); v.pi = 0;
          }
          const close = dist(v.pos, P().pos) < 40;
          followPath(v, route, close ? 17 : 11, dt);
        };
        m.obj('逼停偷電纜的藍色發財車！（撞它）');
        m.meter('小偷車耐久', () => (thief.hp / thief.spec.hp) * 100);
        while (!thief.stoppedForGood) {
          Ms.target = { x: thief.pos.x, z: thief.pos.z, r: 10 };
          if (thief.hp < thief.spec.hp * 0.35) { thief.stoppedForGood = true; thief.hp = Math.max(1, thief.hp); }
          if (dist(thief.pos, P().pos) > 260) lostT += 0.25; else lostT = 0;
          if (lostT > 12) return m.fail('小偷跑掉了');
          await m.wait(0.25);
        }
        m.meter(null);
        S.sfx('crash');
        const fx = Math.cos(thief.h), fz = -Math.sin(thief.h);
        const crook = m.ped(thief.pos.x + fx * 2, thief.pos.z + fz * 2, { spec: { skin: '#c98f67', shirt: '#222', pants: '#1c1c1c', shoes: '#eee', hair: '#111', style: 'buzz', top: 'hoodie', hat: 'beanie', hatColor: '#333', body: 'm' }, state: 'flee', hostile: true, hp: 45 });
        crook.fleeT = 999;
        say('小偷', '哇靠！被抓包了！', 1800);
        m.obj('小偷跳車逃跑了！追上去撂倒他');
        while (crook.state !== 'fallen') {
          Ms.target = { x: crook.pos.x, z: crook.pos.z, r: 3 };
          if (dist(crook.pos, P().pos) > 150) lostT += 0.25; else lostT = 0;
          if (lostT > 10) return m.fail('小偷跑掉了');
          await m.wait(0.25);
        }
        m.clearTarget();
        await m.say([['警察', '辛苦了！這傢伙我們找很久了，專偷市場跟工地的電纜。'], ['阿珠姨（電話）', '電來了！冰櫃又在嗡嗡叫了，全市場都在拍手！'], ['福伯（電話）', '不錯喔，萬華的阿伯阿桑都在傳你的名字了。', 3000]]);
        G.addCred(15, '抓到電纜小偷');
        m.complete();
      },
    },
    {
      id: 'typhoon', region: 'taipei', title: '第三章　颱風夜', giver: '阿福機車行 福伯', icon: '颱', once: true, reward: 3000, need: 'outage', story: true,
      desc: '強颱今晚登陸，萬華低窪的巷子開始淹水。幫店家堆沙包，再開車去把困在水裡的阿婆接回機車行避難。',
      start: () => W.lmPOI.garage,
      run: async (m) => {
        m.cleanup(() => { G.forceFlood = null; G.weather.target = 0.2; G.weather.t = 60; });
        await m.fadeTo(() => { G.time = 21 * 60; G.weather.target = 1; G.weather.rain = 0.95; G.weather.t = 9999; G.forceFlood = 0.36; });
        await m.say([['福伯', '颱風來了！市場那邊地勢低，水一下就淹上來。'], ['福伯', '沙包在我這裡，一次搬一包，幫三間店把門口堵起來。'], ['福伯', '搬沙包走路會很慢，走騎樓比較不會踩到積水。', 2800]]);
        const g = W.lmPOI.garage;
        const shops = W.frontages.filter((f) => f.district === 'wanhua').sort((a, b) => dist(a, g) - dist(b, g)).filter((f, i, arr) => arr.slice(0, i).every((o) => dist(o, f) > 30)).slice(1, 4);
        for (let i = 0; i < shops.length; i++) {
          m.obj(`到機車行拿沙包（${i + 1} / 3）`);
          Ms.setPoints([]);
          m.target(g.x, g.z + 2, { r: 2.5 });
          await m.until(() => near(g.x, g.z + 2, 3) && !P().vehicle);
          G.carry = 'sandbag'; S.sfx('pickup');
          m.cleanup(() => (G.carry = null));
          const sh = shops[i];
          m.obj(`把沙包放到店門口（${i + 1} / 3）`);
          m.target(sh.x, sh.z, { r: 2.5 });
          await m.until(() => near(sh.x, sh.z, 3) && G.carry === 'sandbag');
          m.obj(`按${KEY_E()}放下沙包`);
          let placed = false;
          const it = m.interact(sh.x, sh.z, 3.5, '放下沙包', () => { placed = true; }, () => G.carry === 'sandbag' && !placed);
          await m.until(() => placed);
          const ii = G.interact.indexOf(it); if (ii >= 0) G.interact.splice(ii, 1);
          G.carry = null; S.sfx('bump');
          say('店家', U.mpick(['感謝你！水差點就衝進來了。', '好險好險，冰箱都在一樓。', '少年仔你全身都濕了，進來喝薑茶！']), 2200);
          await m.wait(1);
        }
        await m.say([['福伯（電話）', '不好了！阿珠姨的媽媽一個人在家，巷口水已經淹到膝蓋了！'], ['福伯（電話）', '我的發財車停在門口，底盤高，開去接她！機車會泡水熄火，千萬別騎！', 3200]]);
        const gf = W.lmPOI.garageFront;
        const truck = m.vehicle('truck', gf.x, gf.z, -Math.PI / 2, '#2d5aa0');
        const floodSpots = W.frontages.filter((f) => f.district === 'wanhua' && W.floodRects.some((r) => f.x > r[0] - 6 && f.x < r[2] + 6 && f.z > r[1] - 6 && f.z < r[3] + 6));
        const home = pickFar(floodSpots.length ? floodSpots : W.frontages, g, 150, 400);
        const ama = m.ped(home.x, home.z, { spec: { skin: '#e0b08a', shirt: '#7a4f8a', pants: '#3a3a44', shoes: '#222', hair: '#dcdcdc', style: 'bun', body: 'f', scale: 0.88, top: 'long' }, state: 'idle' });
        ama.dance = true;
        m.failIf = () => (truck.dead ? '發財車毀了' : null);
        m.obj('開福伯的發財車去接阿婆');
        m.target(home.x, home.z, { r: 8 });
        m.timer(150);
        const ok1 = await m.until(() => near(home.x, home.z, 9) && P().vehicle && Math.abs(P().vehicle.fwd) < 2.5 && P().vehicle.spec.len > 3, { timeout: true });
        if (!ok1) return m.fail('來不及了……阿婆被消防隊救走了');
        const rescueCar = P().vehicle;
        G.removePed(ama); S.sfx('door');
        say('阿婆', '哎唷，少年仔……謝謝你、謝謝你……', 2600);
        m.obj('把阿婆載回阿福機車行避難');
        m.target(gf.x, gf.z, { r: 8 });
        const ok2 = await m.until(() => P().vehicle === rescueCar && near(gf.x, gf.z, 9) && stopped(), { timeout: true });
        m.timer(null);
        if (!ok2) return m.fail('來不及了……');
        await m.say([['阿珠姨', '媽！妳沒事就好……少年仔，這份恩情我記一輩子。'], ['福伯', '今晚多虧了你。以後這條街，就是你的家了。'], ['福伯', '聽說台中、高雄那邊也有老朋友需要幫忙……等天晴了再說吧。', 3600]]);
        G.addCred(20, '颱風夜救人');
        m.complete();
      },
    },
    {
      id: 'race', region: 'taipei', title: '林蔭大道計時賽', giver: '改裝車行 阿豪', icon: '賽', reward: 0,
      desc: '沿著仁愛路、敦化南路、忠孝東路、新生南路、信義路一路衝到 101！時間越短獎金越高。',
      start: () => ({ x: -148, z: -40 }),
      run: async (m) => {
        const car = m.vehicle('sports', -138, -50, Math.PI / 2, '#d7263d');
        m.failIf = () => (car.dead ? '跑車爆炸了' : null);
        await m.say([['阿豪', '聽說你修車很行？那開車呢？'], ['阿豪', '這台紅色的給你試。穿過所有檢查點到 101，100 秒內到就有錢拿。']]);
        m.obj('坐進紅色跑車');
        m.target(car.pos.x, car.pos.z, { r: 3 });
        await m.until(() => P().vehicle === car);
        const cps = [[160, -52], [470, -52], [488, -130], [488, -192], [330, -208], [0, -208], [-8, -130], [-8, -52], [-8, 72], [330, 72], [620, 72], [760, 72], [830, 70]];
        car.vel.x = car.vel.z = 0; car.pos.set(-138, 0, -50); car.h = Math.PI / 2;
        G.freeze = true;
        m.cleanup(() => (G.freeze = false));
        for (const n of ['3', '2', '1']) { UI.bigText(n, '', 800); S.sfx('beep'); await m.wait(1); }
        UI.bigText('GO!', '', 700); S.sfx('start');
        G.freeze = false;
        const t0 = G.elapsed;
        m.timer(100);
        for (let i = 0; i < cps.length; i++) {
          const [x, z] = cps[i];
          m.obj(`檢查點 ${i + 1} / ${cps.length}`);
          m.target(x, z, { r: 13, big: true });
          const ok = await m.until(() => near(x, z, 14), { timeout: true });
          if (!ok) return m.fail('時間到！');
          if (P().vehicle !== car) return m.fail('你離開了跑車');
          S.sfx('pickup');
        }
        const t = G.elapsed - t0;
        m.timer(null);
        const medal = t < 62 ? ['金牌', 3000] : t < 78 ? ['銀牌', 1800] : ['銅牌', 1000];
        UI.bigText(`${medal[0]}  ${t.toFixed(1)} 秒`, `獎金 ${U.fmtMoney(medal[1])}`);
        if (!G.save.bestRace || t < G.save.bestRace) G.save.bestRace = t;
        G.addMoney(medal[1], `計時賽 ${medal[0]}`);
        m.complete(0);
      },
    },
  ];
  for (const d of Ms.defs) d.startPos = () => (typeof d.start === 'function' ? d.start() : d.start);

  // ---------- mission runtime ----------
  // Every helper is bound to one mission object; once it ends (complete/fail/abort/error) its
  // waits are dropped and its callbacks become no-ops, so an old script can never touch a newer mission.
  Ms.isAvailable = (d) => (!d.region || d.region === W.regionId) && !(d.once && G.save.done[d.id]) && (!d.need || !!G.save.done[d.need]);
  Ms.start = function (id) {
    if (Ms.active) return;
    const def = Ms.defs.find((d) => d.id === id);
    if (!def || !Ms.isAvailable(def)) return;
    if (G.wanted >= 1) { UI.toast('被通緝中不能接工作，先甩掉警察'); return; }
    const m = { def, alive: true, flag: {}, cleanups: [], waits: [], interacts: [] };
    const guard = (fn) => (...a) => (m.alive ? fn(...a) : undefined);
    Object.assign(m, {
      obj: guard((t) => UI.objective(t)),
      target: guard((x, z, o) => Ms.setTarget(x, z, o)),
      clearTarget: guard(() => Ms.clearTarget()),
      timer: guard((sec) => { m.tEnd = sec == null ? null : G.elapsed + sec; UI.timer(sec == null ? null : () => m.tEnd - G.elapsed); }),
      meter: guard((label, fn) => UI.meter(label, fn)),
      until: (fn, o = {}) => new Promise((res) => { if (m.alive) m.waits.push({ fn, res, timeout: o.timeout }); }),
      wait: (sec) => { const t0 = G.elapsed; return m.until(() => G.elapsed - t0 >= sec); },
      say: async (lines) => { for (const [name, text, ms] of lines) { if (!m.alive) return; say(name, text, ms || 3200); await m.wait((ms || 3200) / 1000); } },
      hold: (label, sec, cond) => new Promise((res) => { if (m.alive) m.holdState = { label, sec, t: 0, cond, res }; }),
      choose: (title, desc, items, max) => new Promise((res) => { if (!m.alive) return; UI.choose(title, desc, items, max).then((r) => { if (!m.alive) return; if (r == null) Ms.fail('取消了工作', m); else res(r); }); }),
      fadeTo: (fn) => new Promise((res) => UI.fade(() => { if (!m.alive) return; fn(); res(); })),
      cleanup: (fn) => m.cleanups.push(fn),
      // interactions run inside the frame (key presses are gone by the time a script resumes)
      interact: (x, z, r, label, fn, cond) => { const it = G.addInteract({ x, z, r, label, fn: () => m.alive && fn(), cond: () => m.alive && (!cond || cond()) }); m.interacts.push(it); return it; },
      vehicle: (type, x, z, h, color) => {
        const v = G.spawnVehicle(type, x, z, h, { color, persist: true });
        v.mission = true;
        // release ownership when the mission ends, whether or not the player is sitting in it
        m.cleanups.push(() => { v.mission = false; v.script = null; v.load = 0; v.noExplode = false; if (v.driver === 'script') v.driver = null; if (!v.removed && v !== P().vehicle && v !== G.lastVehicle) v.persist = false; });
        return v;
      },
      ped: (x, z, opts) => {
        const p = G.spawnPed(x, z, Object.assign({ persist: true }, opts));
        if (opts.state === 'idle') p.t = 1e9;
        m.cleanups.push(() => { if (p.removed) return; p.persist = false; p.hostile = false; p.dance = false; if (p.state === 'idle') { p.state = 'walk'; p.t = 5; } });
        return p;
      },
      complete: (reward) => Ms.complete(reward, m),
      fail: (why) => Ms.fail(why, m),
    });
    Ms.active = m;
    G.mission = {
      onCrash: (imp) => m.alive && def.onCrash && def.onCrash(m, imp),
      onPedDown: (p) => m.alive && def.onPedDown && def.onPedDown(m, p),
      onCycle: () => m.alive && m.onCycle && m.onCycle(),
    };
    UI.missionStart(def);
    S.sfx('start');
    Ms.refreshMarkers();
    Promise.resolve().then(() => def.run(m)).catch((e) => {
      console.error(e);
      if (Ms.active === m) Ms.fail('任務發生錯誤，已結束', m);
    });
  };
  Ms.update = function (dt) {
    const t = G.elapsed;
    for (const mk of Ms.markers) {
      mk.g.userData.ring.rotation.z = t;
      mk.g.userData.sprite.position.y = 3.2 + Math.sin(t * 2) * 0.15;
    }
    if (objMarker && objMarker.visible) { objMarker.userData.ring.rotation.z = t * 2; objMarker.userData.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.08); }
    for (const mk of pointPool) if (mk.visible) mk.userData.sprite.position.y = 3.2 + Math.sin(t * 2 + mk.position.x) * 0.15;
    const m = Ms.active;
    if (!m) return;
    if (m.failIf) { const why = m.failIf(); if (why) { Ms.fail(why, m); return; } }
    const waits = m.waits;
    for (let i = waits.length - 1; i >= 0 && m.alive; i--) {
      const w = waits[i];
      let r = null;
      try { r = w.fn() ? true : w.timeout && m.tEnd && G.elapsed > m.tEnd ? false : null; } catch (e) { console.error(e); Ms.fail('任務發生錯誤，已結束', m); return; }
      if (r !== null) { waits.splice(i, 1); w.res(r); }
    }
    const h = m.holdState;
    if (h && m.alive) {
      if (h.cond()) h.t += dt; else h.t = Math.max(0, h.t - dt);
      UI.progress(h.label, h.t / h.sec);
      if (h.t >= h.sec) { m.holdState = null; UI.progress(null); h.res(true); }
    }
  };
  function endMission(m) {
    if (!m || !m.alive) return false;
    m.alive = false;
    m.waits.length = 0;
    m.holdState = null;
    for (const f of m.cleanups) { try { f(); } catch (e) { console.error(e); } }
    for (const it of m.interacts) { const i = G.interact.indexOf(it); if (i >= 0) G.interact.splice(i, 1); }
    if (Ms.active === m) { Ms.active = null; G.mission = null; }
    G.noCrime = false; G.freeze = false;
    Ms.clearTarget();
    Ms.setPoints([]);
    UI.objective(null); UI.timer(null); UI.meter(null); UI.progress(null); UI.closeChoose();
    Ms.refreshMarkers();
    return true;
  }
  Ms.complete = function (reward, m = Ms.active) {
    if (!endMission(m)) return;
    const r = reward === undefined ? m.def.reward : reward;
    G.save.done[m.def.id] = (G.save.done[m.def.id] || 0) + 1;
    Ms.refreshMarkers();
    UI.missionPassed(m.def, r);
    if (r) G.addMoney(r, m.def.title);
    S.sfx('mission');
    G.saveGame();
    const next = Ms.defs.find((d) => d.story && d.need === m.def.id);
    if (next) G.later(5, () => UI.toast(`新的故事：${next.title}（打開手機的「街坊」看看）`, 5000));
  };
  Ms.fail = function (why, m = Ms.active) {
    if (!endMission(m)) return;
    UI.missionFailed(m.def, why);
    S.sfx('fail');
  };
  Ms.abort = function () { if (Ms.active) Ms.fail('已放棄工作'); };

  Ms.refreshMarkers = function () {
    for (const mk of Ms.markers) mk.g.visible = !Ms.active && !!Ms.isAvailable(mk.def);
  };

  // ---------- init: job markers, shops, garage, MRT ----------
  Ms.init = function () {
    Ms.markers = [];
    for (const d of Ms.defs) {
      if (d.region && d.region !== W.regionId) continue;
      const p = d.startPos();
      const g = makeMarker(d.story ? 0xffb830 : 0x57d9ff, d.icon);
      g.position.set(p.x, W.groundAt(p.x, p.z), p.z);
      Ms.markers.push({ def: d, g });
      G.addInteract({ x: p.x, z: p.z, r: 2.4, label: () => `開始「${d.title}」`, cond: () => !Ms.active && Ms.isAvailable(d) && G.wanted < 1, fn: () => Ms.start(d.id) });
    }
    Ms.refreshMarkers();
    for (const k of W.mrt) {
      G.addInteract({ x: k.x + k.face.x * 2.4, z: k.z + k.face.z * 2.4, r: 3, label: `搭捷運（${k.zh}站）`, fn: () => UI.openMRT(k) });
    }
    // 阿福機車行: repairs and rest (Taipei only)
    const gf = W.lmPOI.garageFront, g = W.lmPOI.garage;
    if (!gf) return;
    const repairable = () => { const v = P().vehicle || G.lastVehicle; return v && !v.dead && !v.removed && dist(v.pos, gf) < 16 && v.hp < v.spec.hp - 1 ? v : null; };
    G.addInteract({
      x: gf.x - 6, z: gf.z + 2, r: 6, vehicleOk: true,
      cond: () => !!repairable(),
      label: () => { const v = repairable(); const cost = G.hasPerk('repair') ? 0 : Math.ceil((1 - v.hp / v.spec.hp) * 400); return `請福伯修車 ${cost ? 'NT$' + cost : '（免費）'}`; },
      fn: () => {
        const v = repairable(); if (!v) return;
        const cost = G.hasPerk('repair') ? 0 : Math.ceil((1 - v.hp / v.spec.hp) * 400);
        if (G.money < cost) { UI.toast('錢不夠修車'); return; }
        G.money -= cost; v.hp = v.spec.hp; v.burnT = 0; S.sfx('start'); UI.toast('福伯：修好了！這台還可以再騎十年。');
      },
    });
    G.addInteract({
      x: g.x + 4, z: g.z + 8, r: 2.5,
      cond: () => { const h = (G.time / 60) % 24; return !Ms.active && (h >= 20 || h < 5); },
      label: '在機車行後面睡到天亮',
      fn: () => UI.fade(() => { const day = Math.floor(G.time / 1440); G.time = (day + 1) * 1440 + 6.5 * 60; G.health = 100; G.saveGame(); UI.toast('早安！福伯已經在泡茶了。'); }),
    });
  };

  Ms.rideMRT = function (to) {
    const fare = G.hasPerk('discount') ? 13 : 25;
    if (G.wanted >= 1) { UI.toast('警察在追你，捷運站被封鎖了！'); return false; }
    if (Ms.active && Ms.active.def.id === 'race') { UI.toast('比賽中不能搭捷運'); return false; }
    if (G.carry) { UI.toast('扛著沙包進不了捷運站'); return false; }
    if (G.money < fare) { UI.toast('悠悠卡餘額不足'); return false; }
    G.money -= fare;
    S.sfx('chime');
    UI.fade(() => { G.teleport(to.x + to.face.x * 3.5, to.z + to.face.z * 3.5, Math.atan2(to.face.x, to.face.z)); UI.toast(`${to.zh}站 到了　悠悠卡扣款 NT$${fare}`); });
    return true;
  };

  window.Missions = Ms;
})();
