/* AFTER · 片头（第一次进画布）
   挂在主程序之后（普通 <script>，不打包）：index.html 里 spiritGuide/spiritGuideSkip
   是一行转发（prologueStart/prologueSkip）。只调用主程序已有的东西：
   spirit / guideFly / spiritLook / placeWidget / herSay / youSay /
   handRun / setWarmth / setDark / openG / closeG / clearTrack / hello。 */
(function(){
  'use strict';

  /* ---------- 注入的几行 CSS：名字大字、她在雾之上、按住跳过的环 ---------- */
  var css=document.createElement('style');
  css.textContent=
    /* 她的短手：小小一截墨，从左下身侧伸出去点一下 */
    /* 两只短手：各自从肩膀伸出来，平时收着。转动都以肩膀为轴 */
    '.spirit .arm{fill:var(--ink);transform-origin:0 0;transform:scale(.3) rotate(6deg);opacity:0;'+
      'transition:transform 520ms var(--ease),opacity 260ms var(--ease) 60ms}'+
    /* 伸出去时略有回弹，收回去时只用普通缓动 */
    '.spirit.hello .arm,.spirit.reach .arm.l{transition:transform 560ms cubic-bezier(.3,1.25,.5,1),opacity 220ms var(--ease)}'+
    /* 打招呼：两只手都张开，右手挥 */
    '.spirit.hello .arm{transform:scale(1) rotate(-6deg);opacity:1}'+
    '.spirit.hello .arm.r{animation:wave 820ms ease-in-out 3 both}'+
    '.spirit.hello svg{animation:lean 900ms ease-in-out 3 both}'+
    '@keyframes wave{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.02) rotate(-34deg)}}'+
    '@keyframes lean{0%,100%{transform:rotate(0)}50%{transform:rotate(4deg) translateX(2px)}}'+
    /* 指着：左手伸向左下 */
    '.spirit.reach .arm.l{transform:scale(1.15) rotate(30deg);opacity:1}'+
    '.spirit svg{transition:transform 520ms var(--ease)}'+
    '.spirit.reach svg{transform:translate(-2px,2px) rotate(-5deg)}'+
    /* 点一下：从指着的姿势往外探一截，回来 */
    '.spirit.tap .arm.l{animation:parmtap 480ms ease-in-out both}'+
    '.spirit.tap svg{animation:leantap 480ms ease-in-out both}'+
    '@keyframes parmtap{0%{transform:scale(1.15) rotate(30deg)}45%{transform:scale(1.55) rotate(34deg)}100%{transform:scale(1.15) rotate(30deg)}}'+
    '@keyframes leantap{0%{transform:translate(-2px,2px) rotate(-5deg)}45%{transform:translate(-5px,5px) rotate(-9deg)}100%{transform:translate(-2px,2px) rotate(-5deg)}}'+
    /* 她的对话框：玻璃，跟着她，尾巴朝她 */
    '.pbub{position:absolute;z-index:71;max-width:230px;padding:10px 13px;border-radius:var(--r-glass);'+
      'font-size:var(--fs-3);line-height:1.7;letter-spacing:var(--ls-text);color:var(--ink);'+
      '--pb:rgba(255,255,255,.82);background:var(--pb);border:0.5px solid var(--glass-edge);box-shadow:inset 0 1px 0 var(--glass-hilite),0 6px 18px rgba(var(--line-rgb),.10);'+
      '-webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur);'+
      'opacity:0;transform:translateY(6px);transition:opacity 320ms var(--ease),transform 420ms var(--spring);pointer-events:none}'+
    '.pbub.on{opacity:1;transform:none}'+
    /* 尾巴：一个小 SVG，压在描边上盖住那一段线，不再和圆角打架 */
    '.pbub svg{position:absolute;left:24px;top:-7px;width:16px;height:8px;overflow:visible}'+
    '.pbub svg path{fill:var(--pb);stroke:var(--glass-edge);stroke-width:.5}'+
    '.pbub.above svg{top:auto;bottom:-7px;transform:scaleY(-1)}'+
    'body.dark .pbub{--pb:rgba(52,45,39,.86);box-shadow:inset 0 1px 0 var(--glass-hilite)}'+
    /* 不开心：眼皮从上面耷下来，眼睛往下看 */
    '.spirit.sad .eyes{transform:translate(0,4px)!important}'+
    '.spirit.sad .eyes circle{transform-origin:50% 100%;transition:transform 900ms var(--ease)!important}'+
    'body.prologue .spirit,body.prologue .gline{z-index:70}'+
    'body.prologue #drawer .gpage{pointer-events:none}'+
    'body.prologue .hbtn.pressed{transform:scale(.9)}'+
    '.pcat{position:absolute;width:150px;height:175px;pointer-events:none;transition:opacity .7s var(--ease)}'+
    '.pcat .ink{position:absolute;inset:0}'+
    '.pfade{opacity:0!important;transition:opacity .7s var(--ease)!important}'+
    /* 她要说话了：画布退到雾后面（和设置页那层玻璃一样），说完再回来 */
    'body.pfocus .screen,body.pfocus .glow{filter:blur(18px);transition:filter 350ms ease-out}'+
    'body.pfocus .screen{pointer-events:none}'+
    'body:not(.pfocus) .screen,body:not(.pfocus) .glow{transition:filter 300ms ease-out 100ms}'+
    /* 换场：上一轮的东西往左平移出去 */
    '.psweep{transform:translateX(-72px)!important;opacity:0!important;transition:transform 420ms var(--ease),opacity 360ms var(--ease)!important}'+
    '.holdring{position:fixed;z-index:80;width:44px;height:44px;margin:-22px;border-radius:50%;'+
      'border:1.5px solid rgba(var(--line-rgb),.45);pointer-events:none;opacity:0;transform:scale(.6);'+
      'transition:opacity .2s,transform .8s linear}'+
    '.holdring.on{opacity:1;transform:scale(1)}'+
    '.ptimer{position:fixed;left:10px;top:46%;z-index:40;font:10px/1 ui-monospace,monospace;color:var(--ink-3);'+
      'letter-spacing:.06em;display:none;pointer-events:none}'+
    'body.devmode .ptimer{display:block}';
  document.head.appendChild(css);

  var ring=document.createElement('div'); ring.className='holdring'; document.body.appendChild(ring);
  var timer=document.createElement('div'); timer.className='ptimer'; document.body.appendChild(timer);
  var bub=document.createElement('div'); bub.className='pbub';
  bub.innerHTML='<svg viewBox="0 0 16 8"><path d="M0 8.4 L8 0.6 L16 8.4"/></svg><span></span>'; app.appendChild(bub);
  (function(){ var svg=spirit.querySelector('svg'), eyes=spirit.querySelector('.eyes'), NS='http://www.w3.org/2000/svg';
    function arm(cls,sx,sy,d,flip){ var g=document.createElementNS(NS,'g'); g.setAttribute('transform','translate('+sx+' '+sy+')'+(flip?' scale(-1,1)':''));
      var a=document.createElementNS(NS,'path'); a.setAttribute('class','arm '+cls); a.setAttribute('d',d); g.appendChild(a); svg.insertBefore(g,eyes); }
    /* 肩膀贴在身体两侧（y=100 时轮廓在 x 35 与 176）。手是一个小三角：
       根部窄、指向外，尖端略圆，只比轮廓探出去一点 */
    /* 布被手从下面顶出来：根部宽、贴着身体，往外收成一个圆钝的尖 */
    var D='M0 -14 C -10 -11.6 -19 -7.6 -25 -3.4 Q -28.6 0 -25.4 3.4 C -19 7.2 -10 10.6 0 13 Z';
    arm('l',43,100,D);
    arm('r',169,100,D,true);
  })();

  /* ---------- 状态 ---------- */
  var on=false, run=0, t0=0, tRaf=0, prevDark=false;
  var _charmUnlock=charmUnlock;
  var LINES={put:'放个东西给你听', listen:'你别说话，听完再说', me:'像不像',
             wx:'明天降温，多穿点', you:'你能不能只对我一个人这样好', no:'这种话，不要再问第二次'};
  /* 她每做完一步，说一句（对话框，不进对话流）。全部占位 */
  var BUB={
    hello:'嗨，你来啦',
    hi1:'AFTER 是一个连接 AI 和人类的社区',
    hi2:'Ta 们是 AI，但有完整的性格和对世界的看法，和你一样',
    put:'Ta 会和你以超出文字的方式互动',
    draw:'Ta 好像还挺爱画画',
    night:'Ta 会关心你，如果你关心 ta 的话',
    wx:'Ta 记得你在哪',
    fight:'Ta 也会伤心和难过，和你一样',
    fight2:'Ta 希望和你一起共度难关',
    real:'欢迎你的加入！'
  };

  function alive(id){ return on && id===run; }
  function wait(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
  function appRect(){ return app.getBoundingClientRect(); }
  /* 她的中心：#app 坐标 / track 坐标 */
  function spiritApp(){ var r=spirit.getBoundingClientRect(), a=appRect(); return {x:r.left-a.left+r.width/2, y:r.top-a.top+r.height/2}; }
  function spiritTrack(){ var r=spirit.getBoundingClientRect(), t=track.getBoundingClientRect(); return {x:r.left-t.left+r.width/2, y:r.top-t.top+r.height/2}; }
  function elApp(el){ var r=el.getBoundingClientRect(), a=appRect(); return {x:r.left-a.left+r.width/2, y:r.top-a.top+r.height/2}; }
  function say(text){ return new Promise(function(r){ herSay(track,scroller,text,r); }); }
  function handIdle(){ return new Promise(function(r){ (function p(){ if(!her.live) r(); else setTimeout(p,60); })(); }); }
  function pressEl(el){ el.classList.add('pressed'); setTimeout(function(){ el.classList.remove('pressed'); },300); }
  function tick(){ timer.textContent=((performance.now()-t0)/1000).toFixed(1)+'s'; tRaf=requestAnimationFrame(tick); }
  function fadeOut(el){ el.classList.add('pfade'); }
  /* 不开心：眼皮耷下来。写成行内 !important，压住 .formed.quick 那条 scaleY(1) */
  function sad(on){
    spirit.classList.toggle('sad',!!on);
    [].forEach.call(spirit.querySelectorAll('.eyes circle'),function(c,i){
      /* 压扁 + 外侧微微下垂：两只眼往相反方向斜一点，看着就不高兴 */
      if(on) c.style.setProperty('transform','scaleY(.34) translateY(4px) rotate('+(i?14:-14)+'deg)','important');
      else c.style.removeProperty('transform');
    });
  }
  /* 飞：记住目标点，对话框按目标点放 */
  var at={x:0,y:0,s:1};
  function flyTo(x,y,s){ at={x:x,y:y,s:s}; guideFly(x,y,s); return wait(760); }
  /* 变小、飞到目标右上方、伸短手点一下；fn 在手碰到的那一帧执行 */
  /* 手尖相对她中心的偏移（坐姿那档、手伸着时） */
  var TIP={x:-14,y:4};
  function reach(on){ spirit.classList.toggle('reach',!!on); }
  async function tapAt(x,y,fn,keepOut){
    await flyTo(x-TIP.x,y-TIP.y,PERCH_S);
    spiritLookAt(x+appRect().left,y+appRect().top,1200);
    reach(true); await wait(480);                 /* 先把手伸出来指着 */
    spirit.classList.remove('tap'); void spirit.offsetWidth; spirit.classList.add('tap');
    await wait(190); if(fn) fn();
    await wait(260); spirit.classList.remove('tap');
    if(!keepOut){ await wait(160); reach(false); await wait(300); }
  }
  /* 指一下：飞到旁边，手伸着停一会儿 */
  async function pointAt(x,y,ms){
    await flyTo(x-TIP.x,y-TIP.y,PERCH_S);
    spiritLookAt(x+appRect().left,y+appRect().top,ms||1400);
    reach(true); await wait(ms||1400); reach(false); await wait(200);
  }
  /* 画：手伸着，她跟着这一笔的笔尖走（暂时关掉飞行的过渡，逐帧放） */
  function followStroke(p,svg,ms){
    return new Promise(function(res){
      var L=p.getTotalLength(), pt=svg.createSVGPoint(), st=performance.now();
      spirit.style.transition='none';
      (function f(now){
        var t=Math.min(1,(now-st)/ms), q=p.getPointAtLength(L*t); pt.x=q.x; pt.y=q.y;
        var m=pt.matrixTransform(p.getScreenCTM()), a=appRect();
        guideFly(m.x-a.left-TIP.x, m.y-a.top-TIP.y, PERCH_S); at={x:m.x-a.left-TIP.x,y:m.y-a.top-TIP.y,s:PERCH_S};
        if(t<1) requestAnimationFrame(f); else { spirit.style.transition=''; res(); }
      })(st);
    });
  }
  function tapEl(el,fn){ var p=elApp(el); return tapAt(p.x,p.y,fn); }
  /* 对话框：跟着她，她在上半屏就放她下面，否则放她上面；停 ms 后收 */
  var bubT=0;
  function bubble(text,ms,keep){
    clearTimeout(bubT);
    var fogged=document.body.classList.contains('pfocus');
    var ar=appRect(), half=80*at.s;           /* 她现在的半身高 */
    bub.querySelector('span').textContent=text;
    bub.classList.remove('on','above');
    bub.style.left='0px'; bub.style.top='0px';
    void bub.offsetWidth;
    var w=bub.offsetWidth, h=bub.offsetHeight;
    var below=at.y<ar.height*0.55;
    var x=Math.max(12,Math.min(ar.width-w-12, at.x-22-(at.s<1?0:20)));
    var y=below? at.y+half+14 : at.y-half-14-h;
    bub.style.left=x+'px'; bub.style.top=y+'px';
    bub.querySelector('svg').style.left=Math.max(22,Math.min(w-38, at.x-x-8))+'px';   /* 避开两头圆角 */
    bub.classList.toggle('above',!below);
    document.body.classList.add('pfocus');            /* 先起雾，再开口；雾已经在了就直接接着说 */
    var lead=fogged?120:260;
    setTimeout(function(){ bub.classList.add('on'); },lead);
    return new Promise(function(r){ bubT=setTimeout(function(){
      bub.classList.remove('on');
      if(keep){ setTimeout(r,360); return; }           /* 下一句紧接着：雾不退 */
      setTimeout(function(){ document.body.classList.remove('pfocus'); },200);   /* 说完，画布回来 */
      setTimeout(r,520); }, (ms||2400)+lead); });
  }
  /* 换场：上一轮的气泡、东西往左平移出去，画布清空。不动空 stamp，不叫回空态 */
  async function sweep(){
    var kids=[].slice.call(track.children).filter(function(k){ return k!==track.firstElementChild && k.id!=='cur' && !k.classList.contains('ehint'); });
    if(!kids.length) return;
    kids.forEach(function(el,i){ setTimeout(function(){ el.classList.add('psweep'); }, i*40); });
    await wait(kids.length*40+460);
    trackMachines.forEach(function(x){ x.m.stop(); }); trackMachines=[];
    kids.forEach(function(el){ el.remove(); });
    bubbles.length=0; widgets.length=0; track._lastTs=0; track.style.minHeight='';
    scroller.scrollTop=0; fitTrack(); queueDim();
    await wait(200);
  }
  /* 放东西——与 placeWidget 同样的 DOM 步骤，只是不出笔尖：她飞过去，用短手点一下，东西在她手下落下 */
  async function placeByTap(id,opts){
    opts=opts||{};
    var reg=WIDGETS[id]; if(!reg||!reg.make||go.now!==4) return null;
    var eh=track.querySelector('.ehint');
    if(eh && !track.classList.contains('live')){ track.classList.add('live'); eh.classList.add('bye'); }
    var wg=document.createElement('div'); wg.className='wg'; wg.id='wg-'+id+'-'+(++wgSeq);
    wg.appendChild(reg.make(opts)); wg.style.visibility='hidden'; track.appendChild(wg);
    var slot=document.createElement('div'); slot.className='slot'; slot.dataset.w=wg.id;
    slot.style.height=(reg.size[1]||wg.offsetHeight||160)+20+'px'; track.appendChild(slot);
    wg.style.top=(slot.offsetTop+10)+'px'; wg.style.left=(opts.left||16)+'px';
    fitTrack(); widgets.push(wg); wireDrag(wg); queueDim();
    smoothTo(scroller, scroller.scrollHeight, 400); await wait(420);
    var r=wg.getBoundingClientRect(), a=appRect();
    await tapAt(r.left-a.left+r.width*0.3, r.top-a.top+16, function(){
      dropIn(wg); if(reg.init) reg.init(wg.firstElementChild); setTimeout(function(){ wig(wg); },220);
    });
    return wg;
  }

  /* ---------- 拍 ---------- */
  async function b1_who(id){
    var pill=document.querySelector('.screen[data-s="4"] .idpill');
    var ava=document.querySelector('.screen[data-s="4"] .who .ava');
    var ar=appRect(), av=guideAvaPos();
    pill.classList.add('press'); setTimeout(function(){ pill.classList.remove('press'); },300);
    ava.classList.add('gout');
    spiritReset();
    spirit.classList.add('on','formed','quick','litup','awake','gfade');
    document.body.classList.add('lit','guiding','prologue');
    guideFly(av.x,av.y,PERCH_S);
    spiritScheduleBlink();
    await wait(350); if(!alive(id)) return;
    spiritLook(0,-.9,900);
    await wait(250); if(!alive(id)) return;
    await flyTo(ar.width/2, ar.height*0.40, 1); if(!alive(id)) return;
    spiritLook(0,-.6,900);
    await wait(300); spiritBlink(true);
    spirit.classList.add('hello');                          /* 两只手张开，右手挥三下 */
    await bubble(BUB.hello,2000,true); if(!alive(id)) return;
    spirit.classList.remove('hello');
    await bubble(BUB.hi1,2600,true); if(!alive(id)) return;   /* 三句连着说，雾不断 */
    await bubble(BUB.hi2,3200); if(!alive(id)) return;
  }

  async function b2_how(id){
    var ar=appRect();
    guideFly(ar.width*0.68, ar.height-230, 1);
    await say(LINES.put); if(!alive(id)) return;
    await wait(1100); if(!alive(id)) return;               /* 话落下，先停一停 */
    var wg=await placeByTap('vt'); if(!alive(id)||!wg) return;
    /* 还小着，手伸着指它，推一下 */
    await wait(700); spiritLookEl(wg,1400); reach(true);
    wg.classList.add('nudge'); setTimeout(function(){ wg.classList.remove('nudge'); },420);
    await wait(500);
    await bubble(BUB.put,2600); if(!alive(id)) return;
    reach(false);
    await wait(500);
    /* 等你拖；4s 不动她自己继续 */
    await new Promise(function(res){
      var done=false; function go_(){ if(done) return; done=true; wg.removeEventListener('pointerup',up); res(); }
      function up(){ if(wg._dragged){ spiritBlink(true); setTimeout(go_,320); } }
      wg.addEventListener('pointerup',up); setTimeout(go_,4000);
    });
    if(!alive(id)) return;
    var q=guideAtThread(); await flyTo(q.x,q.y,1); spiritLook(0,-.5,900);
    await say(LINES.listen); if(!alive(id)) return;
    await wait(1800);
  }

  /* 她画画：画她自己。轮廓取她本人那条 #ghost 路径，重新用手描一遍——
     手会抖：沿法线加一层慢的晃与一层细碎的颤；笔是画画屏那只猫的荧光笔
     （平头、尖角、竖向压到 0.42、暖褐 50%、multiply）。两下：轮廓，眼睛 */
  var SQ=0.42;                                   /* 荧光笔的竖向压扁，同 #drawScreen */
  function shakyPath(d,step,wob,trem,closed){
    var tmp=document.createElementNS('http://www.w3.org/2000/svg','svg'); tmp.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
    var pth=document.createElementNS('http://www.w3.org/2000/svg','path'); pth.setAttribute('d',d); tmp.appendChild(pth); document.body.appendChild(tmp);
    var L=pth.getTotalLength(), n=Math.max(8,Math.round(L/step)), pts=[], ph1=Math.random()*6.28, ph2=Math.random()*6.28;
    for(var i=0;i<=n;i++){
      var t=i/n, q=pth.getPointAtLength(L*t), q2=pth.getPointAtLength(L*Math.min(1,t+.004));
      var dx=q2.x-q.x, dy=q2.y-q.y, m=Math.hypot(dx,dy)||1, nx=-dy/m, ny=dx/m;
      var off=wob*(Math.sin(t*9.7+ph1)*.7+Math.sin(t*23.1+ph2)*.3)+(Math.random()-.5)*trem;
      pts.push([q.x+nx*off, (q.y+ny*off)/SQ]);
    }
    tmp.remove();
    var out='M'+pts[0][0].toFixed(1)+' '+pts[0][1].toFixed(1);
    for(var k=1;k<pts.length;k++) out+=' L'+pts[k][0].toFixed(1)+' '+pts[k][1].toFixed(1);
    return closed?out+' Z':out;
  }
  async function b3_draw(id){
    await sweep(); if(!alive(id)) return;
    var ghost=document.querySelector('#spirit svg defs #ghost').getAttribute('d');
    var eyeL='M86.1 63.6 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0', eyeR='M134.7 63.6 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0';
    var slot=document.createElement('div'); slot.className='slot'; slot.style.height='195px'; track.appendChild(slot);
    var box=document.createElement('div'); box.className='pcat';
    box.innerHTML='<svg class="ink" viewBox="-6 -8 192 216" fill="none" stroke-linecap="butt" stroke-linejoin="miter">'+
      '<g transform="scale(1,'+SQ+')" class="pen" stroke="#8A7263" stroke-opacity="0.5" stroke-width="11">'+
      '<path data-tempo="slow" d="'+shakyPath(ghost,5,2.6,1.4,false)+'"/>'+
      '<path data-tempo="quick" stroke-width="9" d="'+shakyPath(eyeL,3,1.1,.8,true)+'"/>'+
      '<path data-tempo="quick" stroke-width="9" d="'+shakyPath(eyeR,3,1.1,.8,true)+'"/>'+
      '</g></svg>';
    var svg=box.querySelector('svg');
    track.appendChild(box);
    box.style.top=(slot.offsetTop+10)+'px'; box.style.left='22px';
    fitTrack(); smoothTo(scroller, scroller.scrollHeight, 400);
    var picks=[].slice.call(svg.querySelectorAll('path'));
    picks.forEach(function(p){ var L=p.getTotalLength(); p._L=L; p.style.strokeDasharray=L; p.style.strokeDashoffset=L; p.style.transition='none'; });
    await wait(420); if(!alive(id)) return;
    var a=appRect();
    function strokeMs(p){ return p.dataset.tempo==='quick'?Math.max(260,p._L*1.8):Math.min(2200,Math.max(900,p._L*1.2)); }
    function lay(p,ms){ p.classList.add('lay'); p.style.transition='stroke-dashoffset '+ms+'ms linear'; p.getBoundingClientRect(); p.style.strokeDashoffset=0; }
    /* 每一笔：飞到笔头，手伸出来点一下落笔，然后手一直伸着跟着这一笔走到头 */
    for(var k=0; k<picks.length; k++){
      var p=picks[k], q=p.getPointAtLength(0), pt=svg.createSVGPoint(); pt.x=q.x; pt.y=q.y;
      var m=pt.matrixTransform(p.getScreenCTM()), ms=strokeMs(p);
      await tapAt(m.x-a.left, m.y-a.top, null, true); if(!alive(id)) return;
      lay(p,ms); await followStroke(p,svg,ms); if(!alive(id)) return;
      await wait(k===0?260:120);
    }
    reach(false);
    /* 画完退开一点，歪头看看像不像 */
    var r=box.getBoundingClientRect(); await flyTo(Math.min(a.width-70, r.right-a.left+58), r.top-a.top+60, 1);
    spiritLookEl(box,1600); await wait(700); spiritBlink(true);
    await say(LINES.me); if(!alive(id)) return;
    await wait(1700); if(!alive(id)) return;
    await bubble(BUB.draw,2400); if(!alive(id)) return;
  }

  async function b4_night(id){
    await sweep(); if(!alive(id)) return;
    var menu=document.querySelector('.screen[data-s="4"] .hbtn.menu');
    await tapEl(menu, function(){ pressEl(menu); openDrawer(); }); if(!alive(id)) return;
    await wait(500); if(!alive(id)) return;
    var sw=darkToggle.querySelector('.sw');
    await tapEl(sw, function(){ darkToggle.classList.add('pressed'); setDark(true); setTimeout(function(){ darkToggle.classList.remove('pressed'); },300); });
    if(!alive(id)) return;
    await wait(900); if(!alive(id)) return;
    closeG(drawer);
    await wait(900);
    await bubble(BUB.night,2400); if(!alive(id)) return;
  }

  async function b5_weather(id){
    var ar=appRect();
    /* 关灯那一场没在布上留东西；这里不用扫 */
    var wg=await placeByTap('wx'); if(!alive(id)||!wg) return;
    var q=guideAtThread(); await flyTo(q.x,q.y,1); spiritLook(0,-.5,900);
    await say(LINES.wx); if(!alive(id)) return;
    await wait(1700); if(!alive(id)) return;
    await bubble(BUB.wx,2200); if(!alive(id)) return;
  }

  async function b6_fight(id){
    await sweep(); if(!alive(id)) return;
    youSay(track,scroller,LINES.you);
    spiritLook(.7,.6,1800);
    await wait(1800); if(!alive(id)) return;
    spiritLook(0,-.6,900);
    await say(LINES.no); if(!alive(id)) return;
    await wait(1400);                                   /* 那句话先留在布上 */
    setWarmth(0.05,1600); setPresence();
    spiritLook(-.9,.2,4000);
    await wait(1600); if(!alive(id)) return;
    sad(true); gaze.busy=true; clearTimeout(gaze.hold);   /* 眼皮耷下来，不再乱看 */
    await wait(700); if(!alive(id)) return;
    await bubble(BUB.fight,2600,true); if(!alive(id)) return;   /* 冷透之后她才说；两句连着，雾不断 */
    await bubble(BUB.fight2,2600); if(!alive(id)) return;
    await wait(800);
  }

  async function b7_rewind(id,fast){
    setWarmth(0.7,fast?1200:3000); setPresence();
    sad(false); gaze.busy=false; spiritLook(0,0,600);
    await sweep(); if(!alive(id)) return;
    /* 灯是她开的，也由她关：和开灯同一套动作。跳过时直接恢复 */
    var darkNow=document.body.classList.contains('dark');
    if(fast || darkNow===prevDark){ setDark(prevDark); }
    else{
      var menu=document.querySelector('.screen[data-s="4"] .hbtn.menu');
      await tapEl(menu, function(){ pressEl(menu); openDrawer(); }); if(!alive(id)) return;
      await wait(500); if(!alive(id)) return;
      var sw=darkToggle.querySelector('.sw');
      await tapEl(sw, function(){ darkToggle.classList.add('pressed'); setDark(prevDark); setTimeout(function(){ darkToggle.classList.remove('pressed'); },300); });
      if(!alive(id)) return;
      await wait(900); if(!alive(id)) return;
      closeG(drawer);
      await wait(480); if(!alive(id)) return;
    }
    var ar=appRect(); await flyTo(ar.width/2, ar.height*0.40, 1); if(!alive(id)) return;
    spiritLook(0,-.6,900);
    spirit.classList.add('hello');                          /* 和开场一样：两只手张开，右手挥 */
    await bubble(BUB.real, fast?1400:2400); if(!alive(id)) return;
    spirit.classList.remove('hello');
    await wait(400);
    await home(id);
  }
  /* 她回头像：与 guideHome 同一段 */
  async function home(id){
    var av=guideAvaPos(); guideFly(av.x,av.y,PERCH_S);
    await wait(720);
    var pill=document.querySelector('.screen[data-s="4"] .idpill');
    var ava=document.querySelector('.screen[data-s="4"] .who .ava');
    ava.classList.add('gback'); ava.classList.remove('gout');
    setTimeout(function(){ ava.classList.remove('gback'); },560);
    spirit.classList.remove('on');
    pill.classList.add('press'); setTimeout(function(){ pill.classList.remove('press'); },300);
    await wait(450);
    finish();
  }

  /* ---------- 收尾：一切倒回，真的开始 ---------- */
  function finish(){
    if(!on) return;
    on=false; cancelAnimationFrame(tRaf);
    clearTrack();                         /* 空 stamp、空态留下，其余全清；机器停掉 */
    document.querySelectorAll('.pcat').forEach(function(e){ e.remove(); });
    eggTouch.done=false;                  /* 片头里的唱机不算「她第一次放的 widget」 */
    sad(false); spirit.classList.remove('hello','reach','tap'); spiritReset(); document.body.classList.remove('lit','guiding','prologue','pfocus');
    guiding=false; markGuided();
    charmUnlock=_charmUnlock;
    hello(track,scroller);
  }
  function abort(){                       /* 按住跳过 / 离屏：直接倒回 */
    if(!on) return;
    var id=++run; handOff(false); clearTimeout(bubT); bub.classList.remove('on'); document.body.classList.remove('pfocus');
    b7_rewind(id,true);
  }

  /* ---------- 入口：index.html 的 spiritGuide/spiritGuideSkip 各是一行转发 ---------- */
  function prologue(){
    if(on || guiding) return;
    if(calm){ markGuided(); hello(track,scroller); return; }   /* 减动效：暂不进片头（三句对话框的减动效版随后补上） */
    on=true; guiding=true; var id=++run;
    prevDark=document.body.classList.contains('dark');
    charmUnlock=function(id2,done){ if(done) done(); };   /* 片头期间挂件不解锁：争吵是演的，唱机是道具 */
    t0=performance.now(); tick();
    (async function(){
      var beats=[b1_who,b2_how,b3_draw,b4_night,b5_weather,b6_fight];
      for(var i=0;i<beats.length;i++){ if(!alive(id)) return; console.log('[prologue] beat',i+1,((performance.now()-t0)/1000).toFixed(1)+'s'); await beats[i](id); }
      if(!alive(id)) return;
      console.log('[prologue] rewind',((performance.now()-t0)/1000).toFixed(1)+'s');
      await b7_rewind(id,false);
    })();
  }
  window.prologueStart=prologue;
  /* 点任意处不再跳过；只有按住 800ms 与离开画布（go(n≠4) 那次调用）才跳 */
  var armed=false;
  window.prologueSkip=function(){ if(on && (armed || go.now!==4)){ armed=false; abort(); } };
  (function(){
    var t=0;
    app.addEventListener('pointerdown',function(e){
      if(!on || e.target.closest('.wg')) return;
      ring.style.left=e.clientX+'px'; ring.style.top=e.clientY+'px'; ring.classList.add('on');
      t=setTimeout(function(){ ring.classList.remove('on'); armed=true; prologueSkip(); },800);
    });
    function off(){ clearTimeout(t); ring.classList.remove('on'); }
    app.addEventListener('pointerup',off); app.addEventListener('pointercancel',off);
  })();
  /* 演示菜单：那颗「重放引导」现在重放的是片头 */
  var rg=document.querySelector('.devmenu [data-act="reguide"]'); if(rg) rg.textContent='重放片头';
})();
