/* AFTER · 她给的挂件 —— 成就页的 3D 挂件串（three.js 实时渲染）。
   由 index.html 在首次打开成就页 / 首次解锁时动态 import()，主画布零开销。
   五枚挂件全部程序化几何（1 单位 = 1cm），尺寸以后与 Blender / 打样共用。
   three.js 走 ./vendor/three-bundle.js（esbuild 一次性打包产物，入库，不走 CDN）。
   挂件上没有任何文字：日期、第几天、她那句话都写在页面上，不写在物件上。

   降级（平涂 PNG 版，同一串位置）：无 WebGL2 / 减动效 calm / ?flat=1 /
   渲染 8 帧平均 >24ms（先撤后期再测，仍慢才降）。 */

import * as T from './vendor/three-bundle.js';

/* ---------- 挂件登记表 ----------
   以后每加一枚只加一条：id、建法、解锁语义（解锁动作本身在 index.html 的钩子里）。
   她给的那句话在 index.html 的 STRINGS.achv.items（字串统一在那里）。 */
export const CHARMS = [
  { id: 'rose',   build: buildRose,   noChain: false },  /* 她第一次拒绝（say refuse:true / warmth ≥.6→≤.45） */
  { id: 'letter', build: buildLetter, noChain: false },  /* 她第一次主动发来消息（arriveAct 首次，不含 hello） */
  { id: 'egg',    build: buildEgg,    noChain: false },  /* 她第一次放 widget、且你碰了它 */
  { id: 'match',  build: buildMatch,  noChain: false },  /* 第三天（剧本 day≥3 / 真实自然日≥3） */
  { id: 'ring',   build: buildRing,   noChain: true  }   /* 第七天：直接套在开口环上，不加链 */
];

/* 一页一枚：五个挂位按 CHARMS 顺序排成一行，间距 PAGE_W（世界单位，fitRenderer 里算，
   保证相邻页不入镜）；每页页顶中央一个开口环，下面按原逻辑挂珠链 + 挂件 */
const SLOTS = CHARMS.map(function (c) { return { id: c.id }; });
const CHAIN_LEN = 2.4, CHAIN_BEADS = 14;
let PAGE_W = 12;

/* ================= 材质 ================= */

/* 磨砂塑料：挂件都是塑料翻模的小东西，纸感的部分也用 paper */
function frosted(color, o) {
  o = o || {};
  return new T.MeshPhysicalMaterial({
    color: color,
    roughness: o.roughness !== undefined ? o.roughness : .55,
    metalness: 0,
    transmission: o.transmission !== undefined ? o.transmission : .5,
    thickness: o.thickness !== undefined ? o.thickness : 1.2,
    ior: 1.45,
    sheen: o.sheen || 0,
    sheenRoughness: .55,
    sheenColor: new T.Color(color).lerp(new T.Color('#ffffff'), .5),
    clearcoat: o.clearcoat || 0,
    clearcoatRoughness: .3,
    envMapIntensity: o.env !== undefined ? o.env : 1
  });
}
function paper(color) {
  return new T.MeshStandardMaterial({ color: color || '#F3EBDD', roughness: .95, metalness: 0 });
}
function nickel() {
  return new T.MeshStandardMaterial({ color: '#D8DCDF', metalness: 1, roughness: .22, envMapIntensity: 1.3 });
}

/* ================= 五金与挂法 ================= */

/* 开口环：两圈螺旋，镀镍 */
function splitRing(R, wire) {
  R = R || .42; wire = wire || .075;
  const curve = new (class extends T.Curve {
    getPoint(t) {
      const a = t * Math.PI * 4;
      return new T.Vector3(Math.cos(a) * R, (t - .5) * wire * 2.6, Math.sin(a) * R);
    }
  })();
  return new T.Mesh(new T.TubeGeometry(curve, 140, wire, 10, false), nickel());
}
/* 珠链：一排小珠，末端一个扁卡扣 */
function beadChain() {
  const g = new T.Group();
  const geo = new T.SphereGeometry(.11, 12, 10), m = nickel();
  for (let i = 0; i < CHAIN_BEADS; i++) {
    const b = new T.Mesh(geo, m);
    b.position.y = -CHAIN_LEN * (i + .5) / CHAIN_BEADS;
    g.add(b);
  }
  const clasp = new T.Mesh(new T.RoundedBoxGeometry(.5, .3, .2, 3, .06), m);
  clasp.position.y = -CHAIN_LEN - .16;
  g.add(clasp);
  return g;
}
/* 挂件自己的连接小环（PNG 快照含它，不含链） */
function connRing() {
  const r = splitRing(.28, .06);
  r.position.y = -.3;
  return r;
}

/* ================= 五枚挂件 =================
   约定：返回的 Group 原点 = 挂点（链 / 开口环咬住的位置），物件向下长。 */

/* 1 · 凋谢的玫瑰：茎的上端穿环，花头垂着，外圈瓣尖发褐 */
function buildRose() {
  const g = new T.Group();
  g.add(connRing());
  const petalMat = frosted('#B8455A', { transmission: .25, sheen: .6, roughness: .62 });
  const outerMat = petalMat.clone(); outerMat.vertexColors = true;
  const stemMat = frosted('#4F6B4A', { transmission: .3, roughness: .6 });

  function petalGeo(brownTips) {
    const geo = new T.SphereGeometry(.72, 20, 14);
    geo.scale(1.15, .42, .75);             /* 扁而宽的花瓣 */
    if (brownTips) {                       /* 瓣尖（+X）往褐色过渡，这是「凋」 */
      const pos = geo.attributes.position, col = [];
      const base = new T.Color('#B8455A'), tip = new T.Color('#6B3A34'), c = new T.Color();
      for (let i = 0; i < pos.count; i++) {
        const t = T.MathUtils.smoothstep(pos.getX(i) / .83, -.1, .85);
        c.copy(base).lerp(tip, t); col.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    }
    return geo;
  }
  const head = new T.Group();
  for (let i = 0; i < 4; i++) {            /* 外圈 4 片，下垂 35–50° */
    const p = new T.Mesh(petalGeo(true), outerMat);
    const a = i / 4 * Math.PI * 2 + .4;
    p.position.set(Math.cos(a) * .58, 0, Math.sin(a) * .58);
    p.rotation.y = -a;
    p.rotation.z = -(i % 2 ? .87 : .61);
    p.scale.set(1.25, .8, 1.1);
    head.add(p);
  }
  for (let j = 0; j < 3; j++) {            /* 内圈 3 片，半合 */
    const q = new T.Mesh(petalGeo(false), petalMat);
    const b = j / 3 * Math.PI * 2;
    q.position.set(Math.cos(b) * .28, .16, Math.sin(b) * .28);
    q.rotation.y = -b; q.rotation.z = -.12;
    q.scale.setScalar(.85);
    head.add(q);
  }
  head.add(new T.Mesh(new T.SphereGeometry(.38, 16, 12), petalMat));   /* 花心 */

  /* 花茎：向下弯的曲线，末端折 60°，花头垂着 */
  const stemCurve = new T.CatmullRomCurve3([
    new T.Vector3(0, -.62, 0), new T.Vector3(-.07, -1.35, 0),
    new T.Vector3(.12, -2.05, 0), new T.Vector3(.48, -2.62, 0)
  ]);
  g.add(new T.Mesh(new T.TubeGeometry(stemCurve, 32, .07, 8, false), stemMat));
  for (let k = 0; k < 2; k++) {            /* 两枚刺 */
    const th = new T.Mesh(new T.ConeGeometry(.05, .22, 6), stemMat);
    th.position.set(k ? .16 : -.12, k ? -1.1 : -1.75, 0);
    th.rotation.z = (k ? -1 : 1) * 1.2;
    g.add(th);
  }
  /* 一片叶：叶形挤出，边缘卷起 */
  const leafShape = new T.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(.5, .18, .85, 0);
  leafShape.quadraticCurveTo(.5, -.18, 0, 0);
  const leafGeo = new T.ExtrudeGeometry(leafShape, { depth: .03, bevelEnabled: false });
  const lp = leafGeo.attributes.position;
  for (let i = 0; i < lp.count; i++) lp.setZ(i, lp.getZ(i) + Math.sin(lp.getX(i) * 3.4) * .07);
  const leaf = new T.Mesh(leafGeo, stemMat);
  leaf.position.set(-.02, -1.5, 0); leaf.rotation.set(.3, .5, 2.6);
  g.add(leaf);

  head.position.set(.72, -3.05, 0);
  head.rotation.set(.9, 0, 2.35);          /* 垂着头，花盘朝前下 */
  g.add(head);
  /* 一片落瓣：挂在茎下 .6 处，一根极细的透明线连着，像正在掉 */
  const fall = new T.Mesh(petalGeo(true), outerMat);
  fall.position.set(.62, -3.85, .14); fall.rotation.set(.9, .4, -.7); fall.scale.setScalar(.72);
  g.add(fall);
  const thread = new T.Mesh(
    new T.CylinderGeometry(.008, .008, .5, 4),
    new T.MeshBasicMaterial({ color: '#C9B7AE', transparent: true, opacity: .35 })
  );
  thread.position.set(.55, -3.48, .07); thread.rotation.z = .3;
  g.add(thread);
  return g;
}

/* 2 · 信封：左上角穿环，从角上斜垂下来（重力把对角线拉直）；封口盖打开 35°，
   信纸露出 .5，盖尖一枚火漆 */
function buildLetter() {
  const g = new T.Group();
  const inner = new T.Group();
  const bodyM = frosted('#F2C9B3', { transmission: .38 });
  const tilt = -.7;
  /* 角（-2,+1.35）落在环下 (0,-.62)：center = R(-θ)·H − P，对角线对正，质量基本居中 */
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  const hx = 0, hy = -.62;
  const cx = (hx * cos + hy * sin) - (-2), cy = (-hx * sin + hy * cos) - 1.35;
  const body = new T.Mesh(new T.RoundedBoxGeometry(4, 2.7, .35, 4, .12), bodyM);
  body.position.set(cx, cy, 0);
  inner.add(body);
  const sheet = new T.Mesh(new T.RoundedBoxGeometry(3.6, 2.4, .05, 2, .02), paper());
  sheet.position.set(cx, cy + .65, .02);   /* 从口里露出 .5cm */
  inner.add(sheet);
  const flapShape = new T.Shape();
  flapShape.moveTo(-2, 0); flapShape.lineTo(2, 0); flapShape.lineTo(0, -1.45); flapShape.closePath();
  const flap = new T.Mesh(new T.ExtrudeGeometry(flapShape, { depth: .08, bevelEnabled: false }),
    frosted('#E9B498', { transmission: .3 }));   /* 盖比身深半档，薄薄一片才看得出来 */
  flap.position.set(cx, cy + 1.35, .2);    /* 铰在上边 */
  flap.rotation.x = Math.PI - .61;         /* 拆过了：盖翻到后边，离竖直 35° */
  inner.add(flap);
  const seal = new T.Mesh(new T.CylinderGeometry(.35, .37, .12, 20), frosted('#9E3B3B', { roughness: .35, transmission: .2 }));
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0, -1.4, -.04);        /* 粘在盖尖外侧（翻上来后正好朝前） */
  flap.add(seal);
  const dent = new T.Mesh(new T.CircleGeometry(.16, 20),
    new T.MeshStandardMaterial({ color: '#7E2F2F', roughness: .5 }));
  dent.position.z = .065;
  seal.add(dent);
  inner.rotation.z = tilt;                 /* 从左上角斜垂，对角线对正 */
  g.add(inner);
  g.add(connRing());
  return g;
}

/* 3 · 蛋形小游戏机：自己的设计。屏幕上一张 24×24 像素版的她，静止 */
function buildEgg() {
  const g = new T.Group();
  /* 蛋：车削轮廓（下圆、顶部略尖），z 向压扁 */
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const r = 1.9 * Math.sin(Math.PI * Math.pow(t, .78)) * (1 - .14 * t);
    pts.push(new T.Vector2(Math.max(r, .001), t * 4.6));
  }
  const egg = new T.Mesh(new T.LatheGeometry(pts, 40), frosted('#F27A6A', { transmission: .4 }));
  egg.scale.set(1, 1, .42);
  egg.position.y = -5.2;
  g.add(egg);

  /* 屏幕：圆角方凹槽里一块 LCD，像素版的她 */
  const recess = new T.Mesh(new T.RoundedBoxGeometry(1.9, 1.6, .18, 3, .06),
    frosted('#D95F50', { transmission: .3, roughness: .6 }));
  recess.position.set(0, -3.05, .68);
  g.add(recess);
  const lcd = new T.Mesh(new T.PlaneGeometry(1.68, 1.38),
    new T.MeshStandardMaterial({ map: ghostTexture(), roughness: .9 }));
  lcd.position.set(0, -3.05, .78);
  g.add(lcd);
  /* 三颗按键，屏幕下方一排，微凸；右侧一颗更小的 */
  const btnM = frosted('#FAD1C8', { transmission: .45 });
  for (let i = -1; i <= 1; i++) {
    const b = new T.Mesh(new T.CylinderGeometry(.225, .25, .12, 16), btnM);
    b.rotation.x = Math.PI / 2;
    b.position.set(i * .62, -4.15, .66);
    g.add(b);
  }
  const side = new T.Mesh(new T.CylinderGeometry(.14, .14, .16, 12), btnM);
  side.rotation.z = Math.PI / 2;
  side.position.set(1.62, -3.3, .2);
  g.add(side);
  /* 顶部同色的耳朵，穿环 */
  const ear = new T.Mesh(new T.TorusGeometry(.2, .08, 10, 20), frosted('#F27A6A', { transmission: .4 }));
  ear.position.y = -.72;
  g.add(ear);
  const ring = connRing(); ring.position.y = -.3;
  g.add(ring);
  return g;
}
function ghostTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 24;
  const x = c.getContext('2d');
  x.fillStyle = '#C9CEB8'; x.fillRect(0, 0, 24, 24);      /* LCD 底 */
  const rows = [                                          /* 幽灵剪影 12×14 */
    '....XXXX....',
    '..XXXXXXXX..',
    '.XXXXXXXXXX.',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    'XXX.XXXX.XXX',
    'XX...XX...XX'
  ];
  x.fillStyle = '#3A3F36';
  rows.forEach(function (r, y) {
    for (let i = 0; i < r.length; i++) if (r[i] === 'X') x.fillRect(6 + i, 4 + y, 1, 1);
  });
  x.fillStyle = '#F4F6EA';                                /* 两个白像素眼睛 */
  x.fillRect(9, 9, 2, 2); x.fillRect(13, 9, 2, 2);
  const tex = new T.CanvasTexture(c);
  tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter;
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

/* 4 · 火柴盒：抽屉抽出 1.1，三根火柴头露在外面，数量本身就是「三」。
   短边上角穿环：盒垂在环的右下，火柴头翘在环旁 */
function buildMatch() {
  const g = new T.Group();
  const inner = new T.Group();
  const sleeve = new T.Mesh(new T.RoundedBoxGeometry(3.2, 2.2, .9, 3, .08), frosted('#D9A25A', { transmission: .32 }));
  sleeve.position.set(.7, -1.7, 0);
  inner.add(sleeve);
  const drawer = new T.Mesh(new T.RoundedBoxGeometry(3.0, 2.0, .75, 2, .06), paper('#F0E4C8'));
  drawer.position.set(.7, -.65, 0);        /* 向上抽出 1.1 */
  inner.add(drawer);
  const stickM = paper('#E7D9A8'), headM = frosted('#B23A2E', { roughness: .3, transmission: .2 });
  [-.34, 0, .34].forEach(function (dx, i) {
    const m = new T.Group();
    const s = new T.Mesh(new T.CylinderGeometry(.06, .06, 2.6, 8), stickM);
    s.position.y = 1.3;
    const h = new T.Mesh(new T.SphereGeometry(.12, 12, 10), headM);
    h.scale.set(1, .82, 1); h.position.y = 2.62;
    m.add(s, h);
    m.position.set(.7 + dx, -1.15, 0);
    m.rotation.z = T.MathUtils.degToRad([-2.2, .8, 2.6][i]);   /* 不整齐 */
    inner.add(m);
  });
  const ph = new T.Mesh(new T.BoxGeometry(2.9, .5, .05),
    new T.MeshStandardMaterial({ color: '#5A4A3A', roughness: 1 }));
  ph.position.set(.7, -1.7, .475);
  inner.add(ph);
  inner.rotation.z = .1;
  g.add(inner);
  g.add(connRing());
  return g;
}

/* 5 · 戒指：直接套在开口环上（不加链），磨砂圆石是她的光的颜色 */
function buildRing() {
  const g = new T.Group();
  const gold = new T.MeshPhysicalMaterial({
    color: '#F0CD8A', metalness: 1, roughness: .15,
    clearcoat: .5, clearcoatRoughness: .25, envMapIntensity: 2.4
  });
  const band = new T.Mesh(new T.TorusGeometry(.95, .11, 18, 56), gold);
  band.position.y = -1.42;                 /* 环顶穿在开口环上，石坠到最低 */
  g.add(band);
  const stoneM = frosted('#F2C4AC', { transmission: .55, roughness: .5, env: .35, sheen: .3, thickness: .6 });
  const stone = new T.Mesh(new T.SphereGeometry(.32, 24, 18), stoneM);
  stone.position.y = -2.72;
  g.add(stone);
  for (let i = 0; i < 4; i++) {            /* 四个小爪 */
    const p = new T.Mesh(new T.CylinderGeometry(.05, .04, .3, 8), gold);
    const a = i / 4 * Math.PI * 2 + Math.PI / 4;
    p.position.set(Math.cos(a) * .26, -2.56, Math.sin(a) * .26);
    p.rotation.set(Math.sin(a) * .35, 0, -Math.cos(a) * .35);
    g.add(p);
  }
  const seat = new T.Mesh(new T.CylinderGeometry(.3, .2, .18, 12), gold);
  seat.position.y = -2.5;
  g.add(seat);
  return g;
}

/* ================= 平涂降级（2D canvas） =================
   无 WebGL2 时的同一套五枚：形与主色一致，软渐变，无字。 */

function flatCanvas(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  return [c, c.getContext('2d')];
}
function rr(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}
function softDot(x, cx, cy, r, color, dark) {
  const g = x.createRadialGradient(cx - r * .3, cy - r * .35, r * .15, cx, cy, r);
  g.addColorStop(0, color); g.addColorStop(1, dark);
  x.fillStyle = g;
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
}
export function flatPNG(id, size) {
  size = size || 256;
  const u = size / 100;                    /* 以 100 为设计网格 */
  const [c, x] = flatCanvas(size);
  x.lineCap = 'round';
  if (id === 'rose') {
    x.strokeStyle = '#4F6B4A'; x.lineWidth = 3.4 * u;
    x.beginPath(); x.moveTo(50 * u, 8 * u); x.quadraticCurveTo(46 * u, 42 * u, 52 * u, 62 * u); x.stroke();
    /* 垂着的花头 */
    softDot(x, 55 * u, 72 * u, 15 * u, '#B8455A', '#6B3A34');
    x.fillStyle = '#6B3A34';
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + .6;
      x.beginPath();
      x.ellipse(55 * u + Math.cos(a) * 10 * u, 72 * u + Math.sin(a) * 8 * u, 7.5 * u, 4.5 * u, a, 0, Math.PI * 2);
      x.globalAlpha = .55; x.fill(); x.globalAlpha = 1;
    }
    softDot(x, 58 * u, 90 * u, 6 * u, '#B8455A', '#6B3A34');   /* 落瓣 */
  } else if (id === 'letter') {
    x.save(); x.translate(50 * u, 52 * u); x.rotate(-.16);
    x.fillStyle = '#F2C9B3'; rr(x, -32 * u, -16 * u, 64 * u, 42 * u, 5 * u); x.fill();
    x.fillStyle = '#F6E7D9'; rr(x, -26 * u, -30 * u, 52 * u, 22 * u, 2 * u); x.fill();   /* 信纸 */
    x.fillStyle = '#EDB79E';
    x.beginPath(); x.moveTo(-30 * u, -14 * u); x.lineTo(30 * u, -14 * u); x.lineTo(0, -34 * u); x.closePath(); x.fill(); /* 打开的盖 */
    softDot(x, 0, 12 * u, 6.5 * u, '#9E3B3B', '#7E2F2F');      /* 火漆 */
    x.restore();
  } else if (id === 'egg') {
    softDot(x, 50 * u, 54 * u, 30 * u, '#F27A6A', '#D95F50');
    x.fillStyle = '#C9CEB8'; rr(x, 34 * u, 40 * u, 32 * u, 24 * u, 4 * u); x.fill();
    x.fillStyle = '#3A3F36';                                    /* 像素她 */
    x.fillRect(45 * u, 46 * u, 10 * u, 11 * u);
    x.fillRect(47 * u, 44 * u, 6 * u, 2 * u);
    x.fillStyle = '#F4F6EA';
    x.fillRect(47 * u, 49 * u, 2 * u, 2 * u); x.fillRect(51 * u, 49 * u, 2 * u, 2 * u);
    x.fillStyle = '#FAD1C8';
    for (let i = -1; i <= 1; i++) { x.beginPath(); x.arc(50 * u + i * 9 * u, 72 * u, 3.4 * u, 0, Math.PI * 2); x.fill(); }
  } else if (id === 'match') {
    x.fillStyle = '#F0E4C8'; rr(x, 26 * u, 26 * u, 48 * u, 30 * u, 3 * u); x.fill();   /* 抽屉 */
    x.strokeStyle = '#E7D9A8'; x.lineWidth = 3 * u;
    [-.9, 0, .9].forEach(function (dx, i) {
      x.save(); x.translate(50 * u + dx * 8 * u, 30 * u); x.rotate((i - 1) * .06);
      x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -20 * u); x.stroke();
      softDot(x, 0, -22 * u, 3.6 * u, '#B23A2E', '#8E2B21');
      x.restore();
    });
    x.fillStyle = '#D9A25A'; rr(x, 24 * u, 48 * u, 52 * u, 34 * u, 4 * u); x.fill();   /* 外盒 */
    x.fillStyle = '#5A4A3A'; x.fillRect(28 * u, 62 * u, 44 * u, 6 * u);                /* 磷面 */
  } else if (id === 'ring') {
    x.strokeStyle = '#E7C17A'; x.lineWidth = 6 * u;
    x.beginPath(); x.arc(50 * u, 48 * u, 24 * u, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = '#C9A35C'; x.lineWidth = 2 * u;
    x.beginPath(); x.arc(50 * u, 48 * u, 24 * u, .8, 2.2); x.stroke();
    softDot(x, 50 * u, 80 * u, 9 * u, '#F7DBCB', '#E4B89F');   /* 磨砂圆石 */
  }
  return c.toDataURL('image/png');
}

/* ================= 离屏快照（解锁时渲 PNG，每枚只渲一次） ================= */

let _env = null, _pmrem = null;
function sharedEnv(renderer) {
  if (!_pmrem) {
    _pmrem = new T.PMREMGenerator(renderer);
    _env = _pmrem.fromScene(new T.RoomEnvironment(), .04).texture;
  }
  return _env;
}
export function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2'));
  } catch (e) { return false; }
}
export function cachedPNG(id) {
  try { return localStorage.getItem('after-charm-img-' + id); } catch (e) { return null; }
}
function cachePNG(id, url) {
  try { localStorage.setItem('after-charm-img-' + id, url); } catch (e) { /* 超量就不缓存 */ }
}
/* 把该挂件（含小环，不含链）渲成 512×512 透明 PNG */
export async function charmPNG(id) {
  const hit = cachedPNG(id);
  if (hit) return hit;
  if (!webglOK()) { const u = flatPNG(id, 512); cachePNG(id, u); return u; }
  const def = CHARMS.filter(function (c) { return c.id === id; })[0];
  if (!def) return flatPNG(id, 512);
  const r = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.setSize(512, 512); r.setPixelRatio(1);
  r.toneMapping = T.ACESFilmicToneMapping;
  const sc = new T.Scene();
  sc.environment = sharedEnv(r);
  sc.environmentIntensity = 1.6;
  const key = new T.DirectionalLight('#FFF2E8', 2.4); key.position.set(5, 9, 7);
  const fill = new T.DirectionalLight('#D9E2F0', .55); fill.position.set(-7, 3, -5);
  sc.add(key, fill);
  const charm = def.build();
  sc.add(charm);
  /* 用包围盒把物件装进正交镜头，四边留 14% */
  const box = new T.Box3().setFromObject(charm);
  const w = box.max.x - box.min.x, h = box.max.y - box.min.y;
  const cx = (box.max.x + box.min.x) / 2, cy = (box.max.y + box.min.y) / 2;
  const half = Math.max(w, h) * .57;
  const cam = new T.OrthographicCamera(-half, half, half, -half, .1, 100);
  cam.position.set(cx, cy, 30); cam.lookAt(cx, cy, 0);
  r.render(sc, cam);
  const url = r.domElement.toDataURL('image/png');
  /* 快照 renderer 用完即弃 */
  sc.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
  r.dispose();
  cachePNG(id, url);
  return url;
}

/* ================= 成就页（GL 场景） ================= */

let renderer = null, scene = null, camera = null, composer = null;
let mobile = null, slots = [], rafOn = false;
let pageEnv = null, unlocked = {};
let tiltX = 0, tiltY = 0, tiltOn = false;
let frames = [], gated = false, lastT = 0;
let firstOpenIds = [];

function buildScene() {
  scene = new T.Scene();
  scene.environment = sharedEnv(renderer);
  applyLighting(pageEnv && pageEnv.dark);
  camera = new T.PerspectiveCamera(26, 1, .1, 200);
  mobile = new T.Group();
  scene.add(mobile);
  /* 五个挂位按 CHARMS 顺序排一行（x 在 fitRenderer 里按 PAGE_W 落位）：
     页顶中央开口环 +（解锁的）链与挂件；空页只有一个开口环 */
  slots = SLOTS.map(function (s, i) {
    const g = new T.Group();
    mobile.add(g);
    const ring = splitRing(.42, .075);
    ring.position.y = -.45;
    g.add(ring);
    const slot = {
      id: s.id, group: g, charm: null, pivot: null,
      a: 0, v: 0,
      phase: i * 1.7, per: 3.2 + (i % 3) * .45
    };
    if (unlocked[s.id]) hangCharm(slot);
    return slot;
  });
}
/* 亮暗只调环境与灯，不重建场景 */
let keyLight = null, fillLight = null, darkNow = null;
function applyLighting(dark) {
  darkNow = dark;
  scene.environmentIntensity = dark ? .75 : 1.15;
  if (!keyLight) {
    keyLight = new T.DirectionalLight('#FFF2E8', 2.4); keyLight.position.set(5, 9, 7);
    fillLight = new T.DirectionalLight('#D9E2F0', .55); fillLight.position.set(-7, 3, -5);
    scene.add(keyLight, fillLight);
  }
  keyLight.intensity = dark ? 2.6 : 2.4;
  fillLight.intensity = dark ? .4 : .55;
}
function hangCharm(slot) {
  const def = CHARMS.filter(function (c) { return c.id === slot.id; })[0];
  const pivot = new T.Group();
  if (!def.noChain) {
    const chain = beadChain();
    chain.position.y = -.85;
    slot.group.add(chain);
    pivot.position.y = -.85 - CHAIN_LEN - .3;
  } else {
    pivot.position.y = -.9;                /* 戒指：直接套在开口环上 */
  }
  slot.group.add(pivot);
  const charm = def.build();
  charm.traverse(function (o) { o.userData.slotId = slot.id; });
  pivot.add(charm);
  slot.pivot = pivot; slot.charm = charm;
  slot.v += .5;                            /* 挂上去那一下轻轻荡 */
}
function fitRenderer() {
  const cvs = pageEnv.canvas;
  const w = cvs.clientWidth || 1, h = cvs.clientHeight || 1;
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  camera.aspect = w / h;
  /* 一枚挂件含环与链总高约 9.2（蛋机最长）：fitH 11.5，看向页中偏下 */
  const fitH = 11.5;
  const dist = (fitH / 2) / Math.tan(camera.fov * Math.PI / 360);
  camera.position.set(0, -4.6, dist);
  camera.lookAt(0, -4.6, 0);
  camera.updateProjectionMatrix();
  /* 相邻页不入镜（桌面宽屏也是），五页自然排开 */
  const visibleW = fitH * camera.aspect;
  PAGE_W = Math.max(12, visibleW * 1.05);
  slots.forEach(function (s, i) { s.group.position.x = i * PAGE_W; });
  mobile.position.x = -page * PAGE_W;
  mx = mobile.position.x; mxv = 0;
  if (composer) composer.setSize(w, h);
}
/* 点一下（位移 < 7px 且 < 450ms）：当前页的挂件荡起来，空页无反应 */
function tapSlot(slot) {
  if (!slot || !slot.charm) return;
  slot.v += (slot.a > 0 ? -1 : 1) * .62;
  if (pageEnv.onBuzz) pageEnv.onBuzz(5);
  if (pageEnv.onNote) pageEnv.onNote(unlocked[slot.id]);
}
const ray = new T.Raycaster(), ndc = new T.Vector2();
function pick(ev) {
  const r = pageEnv.canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const meshes = [];
  slots.forEach(function (s) { if (s.charm) meshes.push(s.charm); });
  const hit = ray.intersectObjects(meshes, true)[0];
  if (!hit) return null;
  let o = hit.object;
  while (o && !o.userData.slotId) o = o.parent;
  const id = o && o.userData.slotId;
  return slots.filter(function (s) { return s.id === id; })[0] || null;
}
/* 翻页手势：横向位移 > 10px 且压过竖向才进拖动，mobile.position.x 跟手；
   松手按速度（> .35 px/ms）或位移（> 屏宽 30%）进上/下一页，否则弹回 */
let page = 0, mx = 0, mxv = 0, dragX = null;
function onDown(ev) {
  dragX = { x: ev.clientX, y: ev.clientY, t: performance.now(),
            dx: 0, dy: 0, dragging: false, lx: ev.clientX, lt: performance.now(), vx: 0 };
  pageEnv.canvas.setPointerCapture && pageEnv.canvas.setPointerCapture(ev.pointerId);
}
function onMove(ev) {
  if (!dragX) return;
  const now = performance.now();
  dragX.dx = ev.clientX - dragX.x;
  dragX.dy = ev.clientY - dragX.y;
  /* 瞬时速度（指数平滑），松手那刻用 */
  const dtm = Math.max(1, now - dragX.lt);
  dragX.vx = dragX.vx * .7 + ((ev.clientX - dragX.lx) / dtm) * .3;
  dragX.lx = ev.clientX; dragX.lt = now;
  if (!dragX.dragging && Math.abs(dragX.dx) > 10 && Math.abs(dragX.dx) > Math.abs(dragX.dy)) {
    dragX.dragging = true;
  }
  if (dragX.dragging) {
    const wpp = (11.5 * camera.aspect) / (pageEnv.canvas.clientWidth || 1);   /* 世界/像素 */
    mobile.position.x = -page * PAGE_W + dragX.dx * wpp;
    mxv = 0;
  }
}
function onUp(ev) {
  if (!dragX) return;
  const d = dragX; dragX = null;
  const dt = performance.now() - d.t;
  if (d.dragging) {
    const w = pageEnv.canvas.clientWidth || 1;
    let to = page;
    if (Math.abs(d.vx) > .35) to = page + (d.vx < 0 ? 1 : -1);
    else if (Math.abs(d.dx) > w * .3) to = page + (d.dx < 0 ? 1 : -1);
    gotoPage(to);
    return;
  }
  if (Math.abs(d.dx) < 7 && Math.abs(d.dy) < 10 && dt < 450) {
    const s = pick(ev);
    if (s && slots.indexOf(s) === page) tapSlot(s);
  }
}
/* 弹簧追 -page * PAGE_W；onPage(i, rec|null) 交给 index 更新纸条与圆点 */
export function gotoPage(i, instant) {
  page = T.MathUtils.clamp(i, 0, slots.length - 1);
  if (instant) { mx = -page * PAGE_W; mxv = 0; if (mobile) mobile.position.x = mx; }
  if (pageEnv && pageEnv.onPage) pageEnv.onPage(page, unlocked[slots[page].id] || null);
}
export function pageIndex() { return page; }
function onTilt(e) {
  if (e.gamma === null || e.beta === null) return;
  tiltY = T.MathUtils.clamp(-e.gamma * Math.PI / 180 * .55, -.21, .21);   /* 最大 12° */
  tiltX = T.MathUtils.clamp((e.beta - 45) * Math.PI / 180 * .18, -.1, .1);
}
function loop(t) {
  const dt = Math.min(.05, (t - lastT) / 1000 || .016);
  lastT = t;
  const time = t / 1000;
  /* 翻页弹簧 */
  if (!dragX || !dragX.dragging) {
    const target = -page * PAGE_W;
    const acc = (target - mx) * 14 - mxv * 7;
    mxv += acc * dt; mx += mxv * dt;
    mobile.position.x = mx;
  }
  slots.forEach(function (s, i) {
    if (Math.abs(i - page) > 1) return;    /* 待机微摆只跑当前页与邻页 */
    /* 待机：各自相位 ±2° 微摆；点一下的冲量叠进来，弹簧衰减 */
    const idle = Math.sin(time * 2 * Math.PI / s.per + s.phase) * .035;
    const acc = (idle - s.a) * 6 - s.v * 2.4;
    s.v += acc * dt; s.a += s.v * dt;
    s.group.rotation.z = s.a;
  });
  /* 手机倾斜：整页挂件顺重力偏 */
  mobile.rotation.z += (tiltY - mobile.rotation.z) * .05;
  mobile.rotation.x += (tiltX - mobile.rotation.x) * .05;
  if (composer) composer.render(); else renderer.render(scene, camera);
  /* 性能闸：前 8 帧平均 >24ms，先撤后期再测，仍慢 → 平铺降级 */
  if (!gated) {
    frames.push(dt * 1000);
    if (frames.length >= 8) {
      const avg = frames.slice(2).reduce(function (a, b) { return a + b; }, 0) / 6;
      frames = [];
      if (avg > 24 && composer) { composer = null; }
      else {
        gated = true;
        if (avg > 24 && pageEnv && pageEnv.toFlat) { closePage(); pageEnv.toFlat(); return; }
      }
    }
  }
}

/* ---------- 平铺降级页 ---------- */
const RING_SVG =
  '<svg viewBox="0 0 40 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">' +
  '<path d="M20 3.4a7 7 0 1 1-4.95 2.05"/></svg>';
const CHAIN_SVG =
  '<svg viewBox="0 0 40 44" fill="currentColor">' +
  [0, 1, 2, 3, 4, 5].map(function (i) {
    return '<circle cx="20" cy="' + (4 + i * 7) + '" r="1.7"/>';
  }).join('') + '</svg>';
function buildFlat() {
  const f = pageEnv.fallEl;
  pageEnv.canvas.style.display = 'none';
  f.hidden = false;
  f.innerHTML = '';
  const rows = [[0, 3], [3, 5]];
  rows.forEach(function (range) {
    const row = document.createElement('div');
    row.className = 'crow';
    CHARMS.slice(range[0], range[1]).forEach(function (c) {
      const rec = unlocked[c.id];
      const s = document.createElement('div');
      s.className = 'cslot' + (rec ? ' on' : '');
      s.innerHTML = '<span class="cring">' + RING_SVG + '</span>';
      if (rec) {
        if (!c.noChain) {
          const ch = document.createElement('span'); ch.className = 'cchain'; ch.innerHTML = CHAIN_SVG;
          s.appendChild(ch);
        }
        const img = document.createElement('img');
        img.className = 'cimg'; img.alt = ''; img.draggable = false;
        img.src = cachedPNG(c.id) || flatPNG(c.id, 256);
        s.appendChild(img);
        if (firstOpenIds.indexOf(c.id) >= 0) s.classList.add('fresh');
        s.addEventListener('click', function () {
          img.classList.remove('sw'); void img.offsetWidth; img.classList.add('sw');
          if (pageEnv.onBuzz) pageEnv.onBuzz(5);
          if (pageEnv.onNote) pageEnv.onNote(rec);
        });
      }
      row.appendChild(s);
    });
    f.appendChild(row);
  });
}

/* ---------- 对外：开 / 关成就页 ---------- */
export function openPage(env) {
  pageEnv = env;
  unlocked = {};
  (env.unlocked || []).forEach(function (r) { unlocked[r.id] = r; });
  firstOpenIds = env.fresh || [];
  const forceFlat = env.calm || env.forceFlat || !webglOK();
  let gl = false;
  if (!forceFlat) {
    try {
      if (!renderer) {
        renderer = new T.WebGLRenderer({ canvas: env.canvas, alpha: true, antialias: true });
        renderer.toneMapping = T.ACESFilmicToneMapping;
      }
      buildScene();
      fitRenderer();
      /* ?fx=1：桌面拍素材用的后期（GTAO + 景深），默认关——手机走性能闸。
         每次打开重建：场景是新的，composer 不能指旧场景 */
      composer = null;
      if (env.fx) {
        try {
          composer = new T.EffectComposer(renderer);
          composer.addPass(new T.GTAOPass(scene, camera, env.canvas.clientWidth, env.canvas.clientHeight));
          composer.addPass(new T.BokehPass(scene, camera, { focus: 40, aperture: .0006, maxblur: .008 }));
          composer.addPass(new T.OutputPass());
        } catch (e) { composer = null; }
      }
      gl = true;
    } catch (e) { gl = false; }
  }
  window.__charmsMode = gl ? 'gl' : 'flat';          /* 测试探针 */
  if (!gl) { buildFlat(); return 'flat'; }
  env.canvas.style.display = '';
  env.fallEl.hidden = true;
  /* 首次打开时，新到的挂件多晃一次 */
  firstOpenIds.forEach(function (id) {
    const s = slots.filter(function (x) { return x.id === id; })[0];
    if (s) s.v += .8;
  });
  gotoPage(env.startAt || 0, true);        /* 默认停在最新解锁的那一枚（index 传 startAt） */
  frames = []; gated = !!env.nogate;   /* nogate 只给调试页跳过性能闸（真机必走） */
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', onTilt); tiltOn = true;
  }
  env.canvas.addEventListener('pointerdown', onDown);
  env.canvas.addEventListener('pointermove', onMove);
  env.canvas.addEventListener('pointerup', onUp);
  env.canvas.addEventListener('pointercancel', onUp);
  if (!rafOn) { rafOn = true; renderer.setAnimationLoop(loop); }
  window.__charmsSlots = function () {                /* 测试探针 */
    return slots.map(function (s) { return { id: s.id, hasCharm: !!s.charm }; });
  };
  window.__charmsPage = function () { return page; };  /* 测试探针：当前页号 */
  window.__charmsGoto = function (i) { gotoPage(i, true); };  /* 调试翻页 */
  return 'gl';
}
export function closePage() {
  if (renderer) renderer.setAnimationLoop(null);
  rafOn = false;
  if (pageEnv && pageEnv.canvas) {
    pageEnv.canvas.removeEventListener('pointerdown', onDown);
    pageEnv.canvas.removeEventListener('pointermove', onMove);
    pageEnv.canvas.removeEventListener('pointerup', onUp);
    pageEnv.canvas.removeEventListener('pointercancel', onUp);
  }
  if (tiltOn) { window.removeEventListener('deviceorientation', onTilt); tiltOn = false; }
  dragX = null;
}
/* 解锁时页面正开着（少见）：当场挂上去；若正在这一页，顺手刷新纸条 */
export function hangNow(rec) {
  if (!slots.length) return;
  unlocked[rec.id] = rec;
  const s = slots.filter(function (x) { return x.id === rec.id; })[0];
  if (s && !s.charm) {
    hangCharm(s);
    if (slots.indexOf(s) === page && pageEnv && pageEnv.onPage) pageEnv.onPage(page, rec);
  }
}
