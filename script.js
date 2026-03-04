// =============================================
// AMBER MILLER — MAXIMUM CHAOS EDITION (OPTIMIZED)
// =============================================

// ── UI CHAOS ──────────────────────────────────────────────────────────────
function addCardMarquees() {
    const msgs = [' SICK PROJECT ALERT ',' ENGINEERING EXCELLENCE ',' CHECK THIS OUT ',' CONTROLS & CHAOS ',' AEROSPACE INTENSIFIES '];
    document.querySelectorAll('.project > summary').forEach((s,i)=>{
        const mq = document.createElement('marquee');
        mq.setAttribute('scrollamount','5');
        mq.style.cssText=`background:linear-gradient(90deg,#1a0030,#2d0050,#1a0030);color:#ff00ff;font-family:'Share Tech Mono',monospace;font-size:11px;padding:2px 0;border-top:1px solid #cc00ff;margin-top:6px;display:block;letter-spacing:2px;`;
        mq.innerText = msgs[i%msgs.length];
        s.parentElement.insertBefore(mq, s.nextSibling);
    });
}

// OPTIMIZED: increased throttle, pooled spark elements
let lastSparkTime=0, sparkActive=true;
const SPARK_SYMS=['✶','★','⚡','💥','✨','🌟','☆','◆','♦','❋','+','˚'];
const NEON=['#ff00ff','#cc00ff','#ff6ec7','#00fff5','#ff2d78','#ff6b35','#dd88ff','#ff44aa'];

// Spark pool to avoid constant DOM allocation
const _sparkPool=[], _POOL_MAX=30;
function _getSparkEl(){
    return _sparkPool.pop() || (() => { const d=document.createElement('div'); d.className='spark'; return d; })();
}
function _retireSparkEl(el){ el.remove(); if(_sparkPool.length<_POOL_MAX) _sparkPool.push(el); }

function createSparkle(e) {
    if(!sparkActive) return;
    const now=Date.now(); if(now-lastSparkTime<80) return; lastSparkTime=now; // was 40ms → 80ms
    const x=e.touches?e.touches[0].pageX:e.pageX, y=e.touches?e.touches[0].pageY:e.pageY;
    const n=Math.random()<0.3?2:1; // was 3:1
    for(let i=0;i<n;i++){
        const s=_getSparkEl();
        s.innerText=SPARK_SYMS[Math.floor(Math.random()*SPARK_SYMS.length)];
        s.style.left=(x+(Math.random()-0.5)*30)+'px'; s.style.top=(y+(Math.random()-0.5)*30)+'px';
        s.style.setProperty('--spark-color',NEON[Math.floor(Math.random()*NEON.length)]);
        s.style.fontSize=(0.9+Math.random()*1.2)+'em';
        document.body.appendChild(s); setTimeout(()=>_retireSparkEl(s),900);
    }
}
document.addEventListener('mousemove',createSparkle,{passive:true});
document.addEventListener('touchmove',createSparkle,{passive:true});

function animateH2s() {
    const cols=['#ff00ff','#cc00ff','#ff6ec7','#00fff5','#ff2d78','#ff6b35']; let i=0;
    setInterval(()=>{ document.querySelectorAll('h2').forEach(el=>el.style.color=cols[i%cols.length]); i++; },600);
}
function cycleBorders() {
    const bords=['#ff00ff','#cc00ff','#00fff5','#ff2d78','#ff6ec7','#ff6b35']; let i=0;
    setInterval(()=>{ document.querySelectorAll('.project').forEach((c,ci)=>{ if(!c._zergDead) c.style.borderColor=bords[(i+ci)%bords.length]; }); i++; },400);
}

// ── ZERG RUSH ─────────────────────────────────────────────────────────────
const ZF=['ᗤ','ᗣ','ᗡ','ᗢ'], ZC=['#aa0000','#cc2200','#ff3300','#dd1100'];
const BSTYLES=['double','solid','dashed','dotted','none'];
let zergActive=false, zerglings=[], zergInt=null, zergSpawnInt=null, zergScore=0, zergScoreEl=null, zergBtn=null;

function getBH(card){ if(!card._bh) card._bh={top:100,right:100,bottom:100,left:100}; return card._bh; }
function applyDmg(card,side,dmg){
    const h=getBH(card); h[side]=Math.max(0,h[side]-dmg);
    const hp=h[side], w=Math.round(hp/100*6), si=Math.min(4,Math.floor((1-hp/100)*5));
    card.style[`border-${side}-width`]=w+'px'; card.style[`border-${side}-style`]=hp<=0?'none':BSTYLES[si]; card.style[`border-${side}-color`]='#ff0000';
    setTimeout(()=>{ if(!card._zergDead) card.style[`border-${side}-color`]=''; },120);
    if(h.top<=0&&h.right<=0&&h.bottom<=0&&h.left<=0) destroyCard(card);
}
function destroyCard(card){
    card._zergDead=true; card.style.border='none'; card.style.opacity='0.35'; card.style.filter='grayscale(1)';
    const r=card.getBoundingClientRect(), cx=r.left+r.width/2+scrollX, cy=r.top+r.height/2+scrollY;
    for(let i=0;i<12;i++){
        const ex=document.createElement('div'); ex.className='spark'; ex.innerText=['💥','🔥','✶','★'][Math.floor(Math.random()*4)];
        ex.style.left=(cx+(Math.random()-0.5)*80)+'px'; ex.style.top=(cy+(Math.random()-0.5)*80)+'px';
        ex.style.fontSize=(1.5+Math.random()*2)+'em'; ex.style.setProperty('--spark-color','#ff4400');
        document.body.appendChild(ex); setTimeout(()=>ex.remove(),900);
    }
}
function createZergling(card,side){
    const r=card.getBoundingClientRect(); let sx,sy,tx,ty;
    if(side==='top'){    tx=r.left+scrollX+Math.random()*r.width; ty=r.top+scrollY;    sx=tx+(Math.random()-0.5)*240; sy=0;}
    if(side==='bottom'){ tx=r.left+scrollX+Math.random()*r.width; ty=r.bottom+scrollY; sx=tx+(Math.random()-0.5)*240; sy=screen.height;}
    if(side==='left'){   tx=r.left+scrollX; ty=r.top+scrollY+Math.random()*r.height;   sx=0; sy=ty+(Math.random()-0.5)*240;}
    if(side==='right'){  tx=r.right+scrollX; ty=r.top+scrollY+Math.random()*r.height;  sx=screen.width; sy=ty+(Math.random()-0.5)*240;}
    const el=document.createElement('div'); el.className='zergling';
    el.style.cssText=`position:absolute;left:${sx}px;top:${sy}px;font-size:18px;color:${ZC[Math.floor(Math.random()*4)]};z-index:10000;pointer-events:auto;cursor:crosshair;user-select:none;text-shadow:0 0 4px #ff0000;transition:none;`;
    el.innerText=ZF[0]; document.body.appendChild(el);
    const zl={el,x:sx,y:sy,tx,ty,card,side,speed:0.8+Math.random(),frame:0,frameTimer:0,state:'moving',attackTimer:0};
    el.addEventListener('click',()=>killZergling(zl)); el.addEventListener('touchstart',e=>{e.preventDefault();killZergling(zl);});
    zerglings.push(zl); return zl;
}
function killZergling(zl){
    if(zl.state==='dead') return; zl.state='dead'; zl.el.innerText='☠'; zl.el.style.color='#888'; zl.el.style.textShadow='none';
    zergScore++; if(zergScoreEl) zergScoreEl.innerText=`☠ KILLS: ${zergScore}`;
    setTimeout(()=>{ zl.el.remove(); zerglings=zerglings.filter(z=>z!==zl); },500);
}
function tickZerg(){
    zerglings.forEach(zl=>{
        if(zl.state==='dead') return;
        if(++zl.frameTimer%8===0){ zl.frame=(zl.frame+1)%4; if(zl.state==='moving') zl.el.innerText=ZF[zl.frame]; }
        if(zl.state==='moving'){
            const dx=zl.tx-zl.x, dy=zl.ty-zl.y, d=Math.sqrt(dx*dx+dy*dy);
            if(d<6){ zl.state='attacking'; zl.el.innerText='⚔'; }
            else{ zl.x+=dx/d*zl.speed; zl.y+=dy/d*zl.speed; zl.el.style.left=zl.x+'px'; zl.el.style.top=zl.y+'px'; }
        } else {
            zl.attackTimer++;
            const sh=(Math.random()-0.5)*3; zl.el.style.left=(zl.tx+sh)+'px'; zl.el.style.top=(zl.ty+sh)+'px';
            if(zl.attackTimer%20===0){ zl.card._zergDead ? reassignZergling(zl) : applyDmg(zl.card,zl.side,8+Math.random()*4); }
            if(zl.attackTimer%10===0) zl.el.innerText=zl.attackTimer%20<10?'⚔':'🗡';
        }
    });
}
function reassignZergling(zl){
    const alive=Array.from(document.querySelectorAll('.project')).filter(c=>!c._zergDead);
    if(!alive.length){ endZergRush(); return; }
    const card=alive[Math.floor(Math.random()*alive.length)], sides=['top','right','bottom','left'], side=sides[Math.floor(Math.random()*4)];
    const r=card.getBoundingClientRect(); zl.card=card; zl.side=side;
    if(side==='top')    { zl.tx=r.left+scrollX+Math.random()*r.width;  zl.ty=r.top+scrollY; }
    if(side==='bottom') { zl.tx=r.left+scrollX+Math.random()*r.width;  zl.ty=r.bottom+scrollY; }
    if(side==='left')   { zl.tx=r.left+scrollX;  zl.ty=r.top+scrollY+Math.random()*r.height; }
    if(side==='right')  { zl.tx=r.right+scrollX; zl.ty=r.top+scrollY+Math.random()*r.height; }
    zl.state='moving'; zl.attackTimer=0;
}
function spawnWave(){
    const cards=Array.from(document.querySelectorAll('.project')).filter(c=>!c._zergDead);
    if(!cards.length){ endZergRush(); return; }
    const sides=['top','right','bottom','left'], n=2+Math.floor(Math.random()*3);
    for(let i=0;i<n;i++) createZergling(cards[Math.floor(Math.random()*cards.length)],sides[Math.floor(Math.random()*4)]);
}
function startZergRush(){
    if(zergActive){ endZergRush(); return; }
    zergActive=true; sparkActive=false; window._zergActive=true; zergScore=0; zerglings=[];
    const ov=document.createElement('div'); ov.id='zerg-overlay';
    ov.style.cssText='position:fixed;inset:0;z-index:9999;background:transparent;cursor:crosshair;';
    ov.addEventListener('click',e=>{ ov.style.display='none'; const el=document.elementFromPoint(e.clientX,e.clientY); ov.style.display=''; if(el?.tagName==='SUMMARY') el.closest('details').toggleAttribute('open'); });
    document.body.appendChild(ov);
    document.querySelectorAll('.project').forEach(c=>{ c._bh={top:100,right:100,bottom:100,left:100}; c._zergDead=false; c.style.cssText=''; });
    zergScoreEl=document.createElement('div'); zergScoreEl.id='zerg-score';
    zergScoreEl.style.cssText='position:fixed;top:10px;right:14px;background:#000;color:#ff0000;font-family:"Comic Sans MS",monospace;font-size:16px;font-weight:bold;padding:6px 12px;border:3px solid #ff0000;z-index:99999;text-shadow:0 0 6px #ff0000;pointer-events:none;';
    zergScoreEl.innerText='☠ KILLS: 0'; document.body.appendChild(zergScoreEl);
    const msg=document.createElement('div');
    msg.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#000;color:#ff0000;font-family:"Comic Sans MS",monospace;font-size:28px;font-weight:bold;padding:20px 32px;border:4px solid #ff0000;z-index:99999;text-align:center;text-shadow:0 0 10px #ff0000;pointer-events:none;';
    msg.innerHTML='🐞 ZERG RUSH! 🐞<br><span style="font-size:16px">CLICK THE ZERGLINGS TO KILL THEM!</span>';
    document.body.appendChild(msg); setTimeout(()=>msg.remove(),2200);
    zergBtn.innerText='🛑 END RUSH'; zergBtn.style.background='#ff0000'; zergBtn.style.color='#fff';
    let wn=0; spawnWave();
    zergSpawnInt=setInterval(()=>{ spawnWave(); wn++; },5000-250*wn);
    zergInt=setInterval(tickZerg,16);
}
function endZergRush(){
    zergActive=false; sparkActive=true; window._zergActive=false;
    clearInterval(zergInt); clearInterval(zergSpawnInt);
    document.getElementById('zerg-overlay')?.remove();
    zerglings.forEach(zl=>zl.el.remove()); zerglings=[];
    if(zergScoreEl){
        const fin=document.createElement('div');
        fin.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#000;color:#ff0000;font-family:"Comic Sans MS",monospace;font-size:24px;font-weight:bold;padding:20px 32px;border:4px solid #ff0000;z-index:99999;text-align:center;text-shadow:0 0 10px #ff0000;';
        fin.innerHTML=`🐞 RUSH OVER 🐞<br>KILLS: ${zergScore}<br><span style="font-size:14px;cursor:pointer;color:#ffff00" id="zerg-close">[ CLOSE ]</span>`;
        document.body.appendChild(fin);
        document.getElementById('zerg-close').addEventListener('click',()=>fin.remove());
        setTimeout(()=>{ fin.parentNode&&fin.remove(); zergScoreEl.parentNode&&zergScoreEl.remove(); },4000);
    }
    document.querySelectorAll('.project').forEach(c=>{
        c._bh=undefined; c._zergDead=false; c.style.opacity=''; c.style.filter=''; c.style.border='';
        ['Top','Right','Bottom','Left'].forEach(s=>{ c.style[`border${s}Width`]=''; c.style[`border${s}Style`]=''; });
    });
    zergBtn.innerText='🐞 ZERG RUSH'; zergBtn.style.background='#0d0010'; zergBtn.style.color='#ff00ff';
}
function addZergButton(){
    zergBtn=document.createElement('button');
    zergBtn.innerText='🐞 ZERG RUSH';
    zergBtn.style.cssText='position:fixed;bottom:18px;left:18px;z-index:99998;background:#0d0010;color:#ff00ff;font-family:"Comic Sans MS",monospace;font-size:15px;font-weight:bold;padding:10px 18px;border:2px solid #ff00ff;cursor:pointer;text-shadow:0 0 8px #ff00ff;box-shadow:0 0 15px rgba(255,0,255,0.4);letter-spacing:1px;';
    zergBtn.addEventListener('click',startZergRush); document.body.appendChild(zergBtn);
}
function addHideButton(){
    const btn=document.createElement('button');
    btn.innerText='🙈 HIDE PROJECTS';
    btn.style.cssText='position:fixed;bottom:70px;left:18px;z-index:99998;background:#0d0010;color:#cc00ff;font-family:"Comic Sans MS",monospace;font-size:15px;font-weight:bold;padding:10px 18px;border:2px solid #cc00ff;cursor:pointer;text-shadow:0 0 8px #cc00ff;box-shadow:0 0 15px rgba(204,0,255,0.4);letter-spacing:1px;';
    let hidden=false;
    const ECO=new Set(['ecosystem-canvas','eco-inspect','eco-god']);
    btn.addEventListener('click',()=>{
        hidden=!hidden;
        Array.from(document.body.children).forEach(el=>{ if(ECO.has(el.id)||el.tagName==='BUTTON'||el.tagName==='CANVAS') return; el.style.visibility=hidden?'hidden':''; el.style.pointerEvents=hidden?'none':''; });
        btn.innerText=hidden?'👁 SHOW PROJECTS':'🙈 HIDE PROJECTS';
        const c=hidden?'#00fff5':'#cc00ff'; btn.style.color=c; btn.style.borderColor=c; btn.style.textShadow=`0 0 8px ${c}`; btn.style.boxShadow=`0 0 15px ${c}44`;
    });
    document.body.appendChild(btn);
}
document.addEventListener('DOMContentLoaded',()=>{ addCardMarquees(); animateH2s(); cycleBorders(); addZergButton(); addHideButton(); });

// =============================================
// COSMIC ECOSYSTEM (OPTIMIZED)
// =============================================
(function(){

const canvas=document.createElement('canvas');
canvas.id='ecosystem-canvas';
// OPTIMIZED: will-change promotes to GPU layer; image-rendering improves pixel perf
canvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;will-change:transform;';
document.addEventListener('DOMContentLoaded',()=>document.body.prepend(canvas));
const ctx=canvas.getContext('2d', {alpha:false}); // OPTIMIZED: alpha:false skips compositing
let W,H;
function resize(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; _bgDirty=true; }
window.addEventListener('load',resize); window.addEventListener('resize',resize);

const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PALETTE=['#ff00ff','#cc00ff','#ff6ec7','#00fff5','#ff2d78','#ff6b35','#dd88ff','#ffffaa','#aaffff','#ff4400','#cc2200','#ff8800','#4400cc','#0044ff','#00ccff','#ff0044'];

// ── OFFSCREEN BACKGROUND CACHE ────────────────────────────────────────────
// OPTIMIZED: nebulas + base gradient rendered to offscreen canvas, only redrawn when dirty
let _bgCanvas=null, _bgCtx=null, _bgDirty=true, _bgPhase=0;
function ensureBgCanvas(){
    if(!_bgCanvas||_bgCanvas.width!==W||_bgCanvas.height!==H){
        _bgCanvas=document.createElement('canvas'); _bgCanvas.width=W; _bgCanvas.height=H;
        _bgCtx=_bgCanvas.getContext('2d'); _bgDirty=true;
    }
}

// ── DAY/NIGHT ─────────────────────────────────────────────────────────────
let dayPhase=0, dayT=0;
const DAY_LEN=7200;
function updateDayNight(){ dayT=(Math.sin(dayPhase*Math.PI*2/DAY_LEN)+1)/2; dayPhase=(dayPhase+1)%DAY_LEN; }

// OPTIMIZED: draw background to offscreen canvas, blit to main in one drawImage call
function renderBgToCache(nebulas){
    if(!_bgCtx) return;
    const gc=_bgCtx;
    const night=1-dayT;

    // Base fill - no alpha compositing needed
    gc.fillStyle=night>0.5?'#04000a':'#1a0028';
    gc.fillRect(0,0,W,H);

    // Night gradient overlay
    if(night>0.05){
        gc.globalAlpha=night*0.75;
        const ng=gc.createRadialGradient(W*.3,H*.4,0,W*.5,H*.5,Math.max(W,H)*.9);
        ng.addColorStop(0,'#1a000a'); ng.addColorStop(.2,'#0a0025'); ng.addColorStop(.5,'#15000f'); ng.addColorStop(.8,'#060020'); ng.addColorStop(1,'#000000');
        gc.fillStyle=ng; gc.fillRect(0,0,W,H); gc.globalAlpha=1;
    }
    // Aurora
    if(night>0.3){
        gc.globalAlpha=(night-0.3)*0.5;
        [0,1,2,3].forEach(i=>{
            const ax=W*(0.15+i*0.22)+Math.sin(dayPhase*0.002+i)*40;
            const ag=gc.createLinearGradient(ax,0,ax+80,H*0.45);
            const cols=[['#ff00ff','#cc00ff'],['#00fff5','#0044ff'],['#ff2d78','#880022'],['#dd88ff','#440066']];
            ag.addColorStop(0,cols[i][0]+'66'); ag.addColorStop(.5,cols[i][1]+'33'); ag.addColorStop(1,'transparent');
            gc.fillStyle=ag; gc.beginPath(); gc.moveTo(ax-20,0); gc.lineTo(ax+60,0); gc.lineTo(ax+80,H*.45); gc.lineTo(ax,H*.45); gc.fill();
        });
        gc.globalAlpha=1;
    }
    // Sunrise/sunset
    const tt=1-Math.abs(dayT-0.5)*2;
    if(tt>0.05){
        gc.globalAlpha=tt*0.65;
        const dg=gc.createLinearGradient(0,0,0,H);
        if(dayT>0.5){ dg.addColorStop(0,'transparent'); dg.addColorStop(.55,'#ff440044'); dg.addColorStop(.75,'#ff880088'); dg.addColorStop(.9,'#ffaa00aa'); dg.addColorStop(1,'#ff660088'); }
        else        { dg.addColorStop(0,'transparent'); dg.addColorStop(.5,'#cc220044'); dg.addColorStop(.75,'#880000aa'); dg.addColorStop(1,'#ff0044aa'); }
        gc.fillStyle=dg; gc.fillRect(0,0,W,H); gc.globalAlpha=1;
    }
    if(dayT>0.3){
        gc.globalAlpha=(dayT-0.3)*0.25;
        const dg2=gc.createRadialGradient(W*.5,H*.4,0,W*.5,H*.5,Math.max(W,H)*.7);
        dg2.addColorStop(0,'#2d0050'); dg2.addColorStop(.5,'#1a0030'); dg2.addColorStop(1,'transparent');
        gc.fillStyle=dg2; gc.fillRect(0,0,W,H); gc.globalAlpha=1;
    }

    // Nebulas baked in here (static-ish layer)
    nebulas.forEach(n=>n.drawTo(gc));
    _bgDirty=false;
}

// ── FOOD BLOOMS ───────────────────────────────────────────────────────────
let foodBlooms=[], isDragging=false, dragBloomTimer=0;
function addFoodBloom(x,y){ foodBlooms.push({x,y,r:60,life:300,maxLife:300}); }
function updateDrawBlooms(){
    foodBlooms=foodBlooms.filter(b=>b.life>0);
    foodBlooms.forEach(b=>{
        b.life--;
        ctx.globalAlpha=(b.life/b.maxLife)*0.4;
        const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r); g.addColorStop(0,'#00ffaa'); g.addColorStop(1,'transparent');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    });
}

// ── CELESTIAL OBJECTS ─────────────────────────────────────────────────────
class Star {
    constructor(){ this.reset(true); }
    reset(init){ this.x=rnd(0,W||1200); this.y=rnd(0,H||800); this.r=rnd(.3,1.8); this.spd=rnd(.02,.15); this.dir=rnd(0,Math.PI*2); this.tw=rnd(0,Math.PI*2); this.twSpd=rnd(.02,.05); this.col=pick(['#ffffff','#ffe8ff','#e8e8ff','#ffd0ff','#d0ffff']); }
    update(){ this.x+=Math.cos(this.dir)*this.spd; this.y+=Math.sin(this.dir)*this.spd; this.tw+=this.twSpd; if(this.x<-5||this.x>W+5||this.y<-5||this.y>H+5) this.reset(false); }
    draw(){ ctx.globalAlpha=(0.4+0.5*Math.sin(this.tw))*(0.4+0.6*dayT); ctx.fillStyle=this.col; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
}

// OPTIMIZED: batch all stars in one draw pass using a single beginPath per color group
function drawStarsBatched(stars){
    // Group by color
    const groups={};
    stars.forEach(s=>{
        const a=(0.4+0.5*Math.sin(s.tw))*(0.4+0.6*dayT);
        const key=s.col;
        if(!groups[key]) groups[key]={col:s.col,items:[]};
        groups[key].items.push({x:s.x,y:s.y,r:s.r,a});
    });
    Object.values(groups).forEach(g=>{
        ctx.fillStyle=g.col;
        g.items.forEach(({x,y,r,a})=>{
            ctx.globalAlpha=a;
            ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
        });
    });
    ctx.globalAlpha=1;
}

class Planet {
    constructor(){ this.reset(true); }
    reset(init){ this.r=rnd(18,52); this.x=init?rnd(0,W||1200):(Math.random()<.5?-this.r-10:(W||1200)+this.r+10); this.y=rnd(this.r,(H||800)-this.r); this.spd=rnd(.04,.2); this.dx=(this.x<0?1:-1)*this.spd; this.dy=rnd(-.04,.04); this.col=pick(PALETTE); this.col2=pick(PALETTE); this.rings=Math.random()<.4; this.ringTilt=rnd(.2,.6); this.rot=rnd(0,Math.PI*2); this.rotSpd=rnd(-.004,.004); this.grav=this.r*7; }
    update(){ this.x+=this.dx; this.y+=this.dy; this.rot+=this.rotSpd; if(this.x<-this.r-60||this.x>W+this.r+60) this.reset(false); }
    draw(){
        ctx.save(); ctx.translate(this.x,this.y);
        const g1=ctx.createRadialGradient(0,0,this.r*.5,0,0,this.r*2); g1.addColorStop(0,this.col+'22'); g1.addColorStop(1,'transparent'); ctx.fillStyle=g1; ctx.beginPath(); ctx.arc(0,0,this.r*2,0,Math.PI*2); ctx.fill();
        const g2=ctx.createRadialGradient(-this.r*.3,-this.r*.3,this.r*.1,0,0,this.r); g2.addColorStop(0,'#ffffff33'); g2.addColorStop(.4,this.col); g2.addColorStop(1,this.col2); ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
        if(this.rings){ ctx.save(); ctx.scale(1,this.ringTilt); ctx.strokeStyle=this.col+'88'; ctx.lineWidth=this.r*.16; ctx.beginPath(); ctx.arc(0,0,this.r*1.55,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
        ctx.restore();
    }
}
class Galaxy {
    constructor(){ this.reset(true); }
    reset(init){ this.r=rnd(40,100); this.x=init?rnd(0,W||1200):(Math.random()<.5?-this.r-20:(W||1200)+this.r+20); this.y=rnd(this.r,(H||800)-this.r); this.dx=(this.x<0?1:-1)*rnd(.01,.07); this.rot=rnd(0,Math.PI*2); this.rotSpd=rnd(-.002,.002); this.arms=Math.floor(rnd(2,5)); this.col=pick(PALETTE); this.col2=pick(PALETTE); this.grav=this.r*6; }
    update(){ this.x+=this.dx; this.rot+=this.rotSpd; if(this.x<-this.r-80||this.x>W+this.r+80) this.reset(false); }
    draw(){
        ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.rot);
        const cg=ctx.createRadialGradient(0,0,0,0,0,this.r*.4); cg.addColorStop(0,'#ffffff66'); cg.addColorStop(.3,this.col+'99'); cg.addColorStop(1,'transparent'); ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(0,0,this.r*.4,0,Math.PI*2); ctx.fill();
        for(let a=0;a<this.arms;a++){ ctx.save(); ctx.rotate(Math.PI*2/this.arms*a); const ag=ctx.createLinearGradient(0,0,this.r,0); ag.addColorStop(0,this.col+'88'); ag.addColorStop(1,'transparent'); ctx.strokeStyle=ag; ctx.lineWidth=this.r*.15; ctx.beginPath(); ctx.moveTo(0,0); for(let t=0;t<1;t+=.03){ const ang=t*Math.PI*1.5,rad=t*this.r; ctx.lineTo(Math.cos(ang)*rad,Math.sin(ang)*rad); } ctx.stroke(); ctx.restore(); }
        ctx.restore();
    }
}
class Sun {
    constructor(){ this.reset(true); }
    reset(init){ this.r=rnd(12,30); this.x=init?rnd(0,W||1200):(Math.random()<.5?-this.r-10:(W||1200)+this.r+10); this.y=rnd(this.r,(H||800)-this.r); this.dx=(this.x<0?1:-1)*rnd(.03,.12); this.dy=rnd(-.03,.03); this.col=pick(['#ffffff','#ffe8aa','#ffcc44','#ffaa22','#ff8800']); this.pulse=rnd(0,Math.PI*2); this.pulseSpd=rnd(.02,.05); this.grav=this.r*5; }
    update(){ this.x+=this.dx; this.y+=this.dy; this.pulse+=this.pulseSpd; if(this.x<-this.r-60||this.x>W+this.r+60) this.reset(false); }
    draw(){
        ctx.save(); ctx.translate(this.x,this.y);
        const pr=this.r*(1.1+.15*Math.sin(this.pulse));
        const cg=ctx.createRadialGradient(0,0,this.r*.5,0,0,pr*4); cg.addColorStop(0,this.col+'44'); cg.addColorStop(1,'transparent'); ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(0,0,pr*4,0,Math.PI*2); ctx.fill();
        const bg=ctx.createRadialGradient(-this.r*.2,-this.r*.2,0,0,0,pr); bg.addColorStop(0,'#ffffff'); bg.addColorStop(.3,this.col); bg.addColorStop(1,this.col+'88'); ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(0,0,pr,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }
}
class Comet {
    constructor(){ this.reset(true); }
    reset(init){ const fl=Math.random()<.5; this.y=rnd(0,H||800); this.x=init?rnd(0,W||1200):(fl?-20:(W||1200)+20); this.spd=rnd(2.5,6); this.dx=fl?this.spd:-this.spd; this.dy=rnd(-.8,.8); this.tailLen=rnd(60,160); this.r=rnd(1.5,3.5); this.col=pick(['#ffffff','#aaffff','#ffeedd','#ffcc88','#88ccff']); this.life=rnd(180,400); this.maxLife=this.life; }
    update(){ this.x+=this.dx; this.y+=this.dy; this.life--; if(this.life<=0||this.x<-200||this.x>W+200) this.reset(false); }
    draw(){
        const alpha=Math.min(1,this.life/30)*.85, angle=Math.atan2(this.dy,this.dx);
        ctx.save(); ctx.globalAlpha=alpha;
        const tg=ctx.createLinearGradient(this.x,this.y,this.x-Math.cos(angle)*this.tailLen,this.y-Math.sin(angle)*this.tailLen);
        tg.addColorStop(0,this.col+'cc'); tg.addColorStop(1,'transparent');
        ctx.strokeStyle=tg; ctx.lineWidth=this.r*1.2; ctx.beginPath(); ctx.moveTo(this.x,this.y); ctx.lineTo(this.x-Math.cos(angle)*this.tailLen,this.y-Math.sin(angle)*this.tailLen); ctx.stroke();
        ctx.fillStyle=this.col; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1; ctx.restore();
    }
}

// OPTIMIZED: Nebula draws to a provided context (so it can go into the BG cache)
class Nebula {
    constructor(){ this.reset(true); }
    reset(init){ this.x=rnd(0,W||1200); this.y=rnd(0,H||800); this.r=rnd(120,320); this.col=pick(['#cc2200','#ff4400','#4400cc','#880044','#cc0044','#ff6600','#220066','#660022']); this.col2=pick(['#ff0000','#cc4400','#000044','#aa0022','#ff2200','#4400aa']); this.rot=rnd(0,Math.PI*2); this.rotSpd=rnd(-.0002,.0002); this.dx=rnd(-.04,.04); this.dy=rnd(-.02,.02); }
    update(){ this.x+=this.dx; this.y+=this.dy; this.rot+=this.rotSpd; if(this.x<-this.r*2||this.x>W+this.r*2||this.y<-this.r*2||this.y>H+this.r*2) this.reset(false); _bgDirty=true; }
    drawTo(gc){
        gc.save(); gc.translate(this.x,this.y); gc.rotate(this.rot); gc.globalAlpha=0.12;
        const g=gc.createRadialGradient(0,0,this.r*.1,0,0,this.r); g.addColorStop(0,this.col+'ff'); g.addColorStop(.4,this.col2+'cc'); g.addColorStop(1,'transparent');
        gc.fillStyle=g; gc.scale(1.8,.9); gc.beginPath(); gc.arc(0,0,this.r,0,Math.PI*2); gc.fill();
        gc.globalAlpha=.07; gc.scale(.7,1.3); gc.beginPath(); gc.arc(this.r*.2,0,this.r*.8,0,Math.PI*2); gc.fill();
        gc.globalAlpha=1; gc.restore();
    }
    draw(){ this.drawTo(ctx); } // fallback
}

// ── SPATIAL HASH for O(1) neighbour lookup ────────────────────────────────
// OPTIMIZED: replaces O(n²) creature.forEach inside updateCreature
class SpatialHash {
    constructor(cellSize){ this.cs=cellSize; this.cells=new Map(); }
    _key(x,y){ return ((x/this.cs|0)<<16)^(y/this.cs|0); }
    clear(){ this.cells.clear(); }
    insert(c){ const k=this._key(c.x,c.y); if(!this.cells.has(k)) this.cells.set(k,[]); this.cells.get(k).push(c); }
    query(x,y,r){
        const results=[], cs=this.cs;
        const x0=(x-r)/cs|0, x1=(x+r)/cs|0, y0=(y-r)/cs|0, y1=(y+r)/cs|0;
        for(let cx=x0;cx<=x1;cx++) for(let cy=y0;cy<=y1;cy++){
            const k=(cx<<16)^cy, cell=this.cells.get(k);
            if(cell) cell.forEach(c=>results.push(c));
        }
        return results;
    }
}
const spatialHash=new SpatialHash(100);

// ── NEURAL NET ────────────────────────────────────────────────────────────
const NN_IN=8, NN_H=6, NN_OUT=2;
const NN_W = NN_IN*NN_H + NN_H*NN_OUT + NN_H + NN_OUT;

function randomWeights(){ return Float32Array.from({length:NN_W},()=>rnd(-1,1)); }
function mutateWeights(w, rate=0.08){
    const out = new Float32Array(w);
    for(let i=0;i<out.length;i++) if(Math.random()<rate) out[i]=clamp(out[i]+rnd(-.3,.3),-2,2);
    return out;
}
function nnForward(w, inputs){
    let idx=0;
    const w1=w.slice(idx, idx+=NN_IN*NN_H);
    const b1=w.slice(idx, idx+=NN_H);
    const w2=w.slice(idx, idx+=NN_H*NN_OUT);
    const b2=w.slice(idx, idx+=NN_OUT);
    const h=new Float32Array(NN_H);
    for(let j=0;j<NN_H;j++){
        let s=b1[j];
        for(let i=0;i<NN_IN;i++) s+=inputs[i]*w1[j*NN_IN+i];
        h[j]=Math.tanh(s);
    }
    const out=new Float32Array(NN_OUT);
    for(let k=0;k<NN_OUT;k++){
        let s=b2[k];
        for(let j=0;j<NN_H;j++) s+=h[j]*w2[k*NN_H+j];
        out[k]=Math.tanh(s);
    }
    return out;
}

// ── CREATURES ─────────────────────────────────────────────────────────────
let generationCount=0, creatureIdCounter=0;
const SPECIES_DEFS={
    jellyfish:  {diet:'herb',baseColor:'#dd88ff',size:[8,16],  speed:[0.4,1.0], sense:60,  reproduce:0.004, activeAtNight:true },
    manta:      {diet:'herb',baseColor:'#00fff5',size:[14,24], speed:[0.3,0.8], sense:80,  reproduce:0.003, activeAtNight:false},
    seahorse:   {diet:'herb',baseColor:'#ff6ec7',size:[6,12],  speed:[0.2,0.5], sense:40,  reproduce:0.004, activeAtNight:false},
    shark:      {diet:'carn',baseColor:'#cc00ff',size:[18,32], speed:[0.6,1.4], sense:120, reproduce:0.0008,activeAtNight:true },
    anglerfish: {diet:'carn',baseColor:'#ff2d78',size:[14,26], speed:[0.3,0.9], sense:100, reproduce:0.0008,activeAtNight:true },
    leviathan:  {diet:'apex',baseColor:'#ff6b35',size:[40,80], speed:[0.30,0.75],sense:200,reproduce:0.0003,activeAtNight:true },
};
let creatures=[], evoLog=[];
let popHistory={jellyfish:[],manta:[],seahorse:[],shark:[],anglerfish:[],leviathan:[]};
const POP_MAX=120, POP_CAP=200;
let traitHistory={};

function lineageDrift(hex){
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return '#'+[r,g,b].map(v=>clamp(v+Math.floor(rnd(-10,10)),0,255).toString(16).padStart(2,'0')).join('');
}

function spawnCreature(key, x, y, parent){
    const def=SPECIES_DEFS[key];
    const mut=(v,r)=>parent?clamp(v+rnd(-r*2,r*2),r*.05,r*25):v;
    return {
        id:creatureIdCounter++, species:key, diet:def.diet,
        x:x??rnd(50,W-50), y:y??rnd(50,H-50),
        vx:rnd(-.5,.5), vy:rnd(-.5,.5),
        size:   parent?mut(parent.size,1.2)   :rnd(def.size[0],def.size[1]),
        speed:  parent?mut(parent.speed,.08)  :rnd(def.speed[0],def.speed[1]),
        sense:  parent?mut(parent.sense,6)    :def.sense,
        reproduce: parent?clamp(parent.reproduce+rnd(-.0001,.0002),.00005,.003):def.reproduce,
        color:  parent?lineageDrift(parent.color):def.baseColor,
        energy:160, age:0, maxAge:rnd(2500,6000), reproduced:false,
        frame:Math.random()*Math.PI*2,
        generation: parent?parent.generation+1:0,
        parentId: parent?parent.id:null,
        socialTrait: parent?clamp(parent.socialTrait+rnd(-.05,.08),0,1):rnd(0,.3),
        nnWeights: parent ? mutateWeights(parent.nnWeights) : randomWeights(),
        _wanderAngle:Math.random()*Math.PI*2, _scared:0, _newborn:parent?60:0, _children:[],
    };
}
function initCreatures(){
    Object.keys(SPECIES_DEFS).forEach(k=>{
        const n=k==='leviathan'?2:k==='shark'||k==='anglerfish'?5:k==='seahorse'?14:10;
        for(let i=0;i<n;i++) creatures.push(spawnCreature(k));
    });
}

// ── DRAWING ───────────────────────────────────────────────────────────────
function drawCreature(c){
    if(c._scared>0) c._scared--;
    if(c._newborn>0) c._newborn--;
    ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(Math.atan2(c.vy,c.vx));
    const s=c.size, def=SPECIES_DEFS[c.species];
    c.frame+=.05*c.speed*(c._scared>0?2:1);
    const w=Math.sin(c.frame)*s*.15;
    const nightDim=def.activeAtNight?1.0:0.3+0.7*dayT;
    if(c._newborn>0){ ctx.globalAlpha=(c._newborn/60)*.7; ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(0,0,s*1.6,0,Math.PI*2); ctx.fill(); }
    ctx.globalAlpha=clamp(c.energy/120,.3,1.0)*nightDim;
    ctx.fillStyle=c._scared>0?'#ffffff':c.color;
    switch(c.species){
        case 'jellyfish':  drawJF(c,s,w); break;
        case 'manta':      drawManta(c,s,w); break;
        case 'seahorse':   drawSH(c,s,w); break;
        case 'shark':      drawShark(c,s,w); break;
        case 'anglerfish': drawAF(c,s,w); break;
        case 'leviathan':  drawLev(c,s,w); break;
    }
    if(c===inspectedCreature){ ctx.globalAlpha=.6; ctx.strokeStyle='#ffffff'; ctx.lineWidth=2; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.arc(0,0,s+6,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
}
function drawJF(c,s,w){ ctx.fillStyle=c.color+'99'; ctx.beginPath(); ctx.ellipse(0,0,s*.7,s*.5,0,Math.PI,0); ctx.fill(); ctx.fillStyle=c.color+'44'; ctx.beginPath(); ctx.ellipse(0,0,s*.7,s*.5,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=c.color+'66'; ctx.lineWidth=1; for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(i*s*.15,s*.5); ctx.quadraticCurveTo(i*s*.2+w,s+w,i*s*.1,s*1.3+Math.abs(w)); ctx.stroke(); } }
function drawManta(c,s,w){ ctx.fillStyle=c.color+'cc'; ctx.beginPath(); ctx.moveTo(s*.8,0); ctx.quadraticCurveTo(0,-s*.5+w,-s*.8,0); ctx.quadraticCurveTo(0,s*.3-w,s*.8,0); ctx.fill(); ctx.strokeStyle=c.color+'66'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(-s*.8,0); ctx.quadraticCurveTo(-s,w*.5,-s*1.3,w); ctx.stroke(); }
function drawSH(c,s,w){ ctx.strokeStyle=c.color; ctx.lineWidth=s*.22; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(0,-s*.6); ctx.quadraticCurveTo(s*.3,0,w*.3,s*.4); ctx.quadraticCurveTo(-s*.3,s*.7,0,s*.8); ctx.stroke(); ctx.fillStyle=c.color; ctx.beginPath(); ctx.ellipse(s*.1,-s*.6,s*.2,s*.14,.5,0,Math.PI*2); ctx.fill(); }
function drawShark(c,s,w){ ctx.fillStyle=c.color+'cc'; ctx.beginPath(); ctx.moveTo(s,0); ctx.quadraticCurveTo(0,-s*.25+w*.2,-s,0); ctx.quadraticCurveTo(0,s*.2-w*.2,s,0); ctx.fill(); ctx.fillStyle=c.color; ctx.beginPath(); ctx.moveTo(0,-s*.18); ctx.lineTo(-s*.1,-s*.5); ctx.lineTo(-s*.25,-s*.18); ctx.fill(); ctx.beginPath(); ctx.moveTo(-s,0); ctx.lineTo(-s*1.3+w,-s*.3); ctx.lineTo(-s*1.3-w,s*.3); ctx.fill(); }
function drawAF(c,s,w){ ctx.fillStyle=c.color+'bb'; ctx.beginPath(); ctx.ellipse(0,0,s*.8,s*.6,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=c.color+'88'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(s*.6,-s*.3); ctx.quadraticCurveTo(s,-s*.8+w,s*.9,-s*.9); ctx.stroke(); ctx.fillStyle='#ffffaa'; ctx.beginPath(); ctx.arc(s*.9,-s*.9,s*.1,0,Math.PI*2); ctx.fill(); }
function drawLev(c,s,w){ ctx.fillStyle=c.color+'99'; ctx.beginPath(); ctx.moveTo(s,0); ctx.bezierCurveTo(s*.3,-s*.4+w,-s*.3,s*.4-w,-s,0); ctx.bezierCurveTo(-s*.3,s*.3,s*.3,-s*.3,s,0); ctx.fill(); ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(s*.7,-s*.1,s*.07,0,Math.PI*2); ctx.fill(); }

// ── AI + NEURAL NET UPDATE ────────────────────────────────────────────────
let godMode={foodMult:1.0,aggrMult:1.0,mutMult:1.0};

function updateCreature(c, planets, galaxies, stars, newChildren, suns){
    c.age++;
    const def=SPECIES_DEFS[c.species];
    const nightPenalty=def.activeAtNight?1.0:(0.3+0.7*dayT);
    const drainMult=c.reproduced?1.0:0.1;
    c.energy -= (0.22+c.size*.007)*drainMult*nightPenalty;
    c.energy += 0.04*godMode.foodMult;
    if(c.age>c.maxAge||c.energy<=0) return false;

    if(window._zergActive){
        const ef=150;
        if(c.x<ef) c.vx+=.08; if(c.x>W-ef) c.vx-=.08;
        if(c.y<ef) c.vy+=.08; if(c.y>H-ef) c.vy-=.08;
        if(Math.min(c.x,W-c.x,c.y,H-c.y)<ef) c._scared=Math.max(c._scared,10);
    }

    // OPTIMIZED: use spatial hash instead of scanning all creatures
    const nearby=spatialHash.query(c.x,c.y,Math.max(c.sense*2, 200));

    let threatDx=0,threatDy=0,threatD=Infinity;
    let preyDx=0,preyDy=0,preyD=Infinity;
    let mateDx=0,mateDy=0,mateD=Infinity, mateFound=null;

    nearby.forEach(o=>{
        if(o===c||o._dead) return;
        const dx=o.x-c.x, dy=o.y-c.y, d=dx*dx+dy*dy; // OPTIMIZED: skip sqrt until needed
        const isThreat=(c.diet==='herb'&&(o.diet==='carn'||o.diet==='apex'))||(c.diet==='carn'&&o.diet==='apex');
        const sense2threat=(c.sense*1.5)*(c.sense*1.5);
        if(isThreat&&d<sense2threat&&d<threatD){ threatDx=-(o.x-c.x); threatDy=-(o.y-c.y); threatD=d; }
        const isPrey=(c.diet==='carn'&&o.diet==='herb')||(c.diet==='apex'&&(o.diet==='herb'||o.diet==='carn'));
        const sense2prey=(c.sense*godMode.aggrMult)*(c.sense*godMode.aggrMult);
        if(isPrey&&d<sense2prey&&d<preyD){ preyDx=o.x-c.x; preyDy=o.y-c.y; preyD=d; }
        if(!c.reproduced&&o.species===c.species&&o.energy>110){
            const sense2mate=(c.sense*2)*(c.sense*2);
            if(d<sense2mate&&d<mateD){ mateDx=o.x-c.x; mateDy=o.y-c.y; mateD=d; mateFound=o; }
        }
    });

    // Celestial food (small fixed arrays, no optimization needed)
    let foodDx=0,foodDy=0,foodD=Infinity;
    [...planets,...galaxies,...suns].forEach(obj=>{
        const dx=obj.x-c.x, dy=obj.y-c.y, d=dx*dx+dy*dy;
        if(d<obj.grav*obj.grav&&d<foodD){ foodDx=dx; foodDy=dy; foodD=d; }
    });
    foodBlooms.forEach(b=>{ const dx=b.x-c.x,dy=b.y-c.y,d=dx*dx+dy*dy; if(d<(b.r*2)*(b.r*2)&&d<foodD){foodDx=dx;foodDy=dy;foodD=d;} });

    const ns=(v,mx)=>clamp(v/mx,-1,1);
    const inputs=new Float32Array([
        ns(threatDx,c.sense), ns(threatDy,c.sense),
        ns(preyDx,c.sense),   ns(preyDy,c.sense),
        ns(foodDx,400),        ns(foodDy,400),
        ns(mateDx,c.sense*2), ns(mateDy,c.sense*2),
    ]);

    const nnOut = nnForward(c.nnWeights, inputs);

    let desiredX=c.vx, desiredY=c.vy, dominated=false;

    if(c._scared>0){
        c._wanderAngle=Math.atan2(c.vy,c.vx);
    } else {
        const fleeWeight = clamp(0.5 - nnOut[0]*0.5, 0, 1);
        const huntWeight = clamp(0.5 + nnOut[0]*0.5, 0, 1);
        const mateWeight = clamp(0.5 + nnOut[1]*0.5, 0, 1);
        const foodWeight = clamp(0.5 - nnOut[1]*0.5, 0, 1);

        if(c.species==='shark'){ const n=creatures.filter(x=>x.species==='shark').length; c._crowdFactor=clamp(1-(n-8)*.05,.4,1); }
        else c._crowdFactor=1;

        if(threatD<Infinity && fleeWeight>0.3){
            const d=Math.sqrt(threatDx*threatDx+threatDy*threatDy)||1;
            desiredX=threatDx/d*c.speed*fleeWeight*2; desiredY=threatDy/d*c.speed*fleeWeight*2;
            dominated=true; c._scared=Math.min(c._scared+2,30);
        }

        if(!dominated&&preyD<Infinity&&huntWeight>0.4){
            const d=Math.sqrt(preyDx*preyDx+preyDy*preyDy)||1;
            desiredX=preyDx/d*c.speed*(c._crowdFactor||1); desiredY=preyDy/d*c.speed*(c._crowdFactor||1); dominated=true;
            // Kill check using nearby (already filtered)
            nearby.forEach(p=>{ if(p===c||p._dead) return; const isPrey=(c.diet==='carn'&&p.diet==='herb')||(c.diet==='apex'&&(p.diet==='herb'||p.diet==='carn')); if(!isPrey) return; const dx=p.x-c.x,dy=p.y-c.y,d2=Math.sqrt(dx*dx+dy*dy); if(d2<c.size+p.size){ c.energy+=p.size*14*(1+c.size*.04); p._dead=true; } });
        }

        if(!dominated&&!c.reproduced&&mateD<Infinity&&mateWeight>0.5){
            const d=Math.sqrt(mateDx*mateDx+mateDy*mateDy)||1;
            desiredX=mateDx/d*c.speed; desiredY=mateDy/d*c.speed; dominated=true;
        }

        if(!dominated&&(c.diet==='herb'||c.energy<80)){
            if(foodD<Infinity&&foodWeight>0.3){
                const d=Math.sqrt(foodDx*foodDx+foodDy*foodDy)||1;
                desiredX=foodDx/d*c.speed; desiredY=foodDy/d*c.speed; dominated=true;
            }
        }

        if(c.diet==='carn'||c.diet==='apex'){
            [...planets,...galaxies].forEach(obj=>{ const dx=obj.x-c.x,dy=obj.y-c.y,dist=Math.sqrt(dx*dx+dy*dy); if(dist<obj.r*1.8){desiredX-=dx/dist*c.speed;desiredY-=dy/dist*c.speed;dominated=true;} });
        }

        if(c.diet==='herb'){
            [...planets,...galaxies].forEach(obj=>{ const dx=obj.x-c.x,dy=obj.y-c.y,d=Math.sqrt(dx*dx+dy*dy); if(d<obj.r*1.2) c.energy-=.4; else if(d<obj.r*3) c.energy+=2.2*godMode.foodMult; });
            suns.forEach(s=>{ const dx=s.x-c.x,dy=s.y-c.y,d=Math.sqrt(dx*dx+dy*dy); if(d<s.grav) c.energy+=(1-d/s.grav)*2.5*godMode.foodMult; });
            stars.forEach(s=>{ const dx=s.x-c.x,dy=s.y-c.y,d=Math.sqrt(dx*dx+dy*dy); if(d<80) c.energy+=.6*godMode.foodMult; });
            const edgeD=Math.min(c.x,c.y,W-c.x,H-c.y); if(edgeD<120) c.energy+=(1-edgeD/120)*1.5*godMode.foodMult;
            c.energy+=.04*godMode.foodMult;
        }
        foodBlooms.forEach(b=>{ const dx=b.x-c.x,dy=b.y-c.y,d=Math.sqrt(dx*dx+dy*dy); if(d<b.r) c.energy+=3*godMode.foodMult; });
    }

    if(!dominated&&_complexityUnlocked){
        const em=applyEmergent(c,nearby); // OPTIMIZED: pass pre-filtered nearby
        if(em){ desiredX=em.vx; desiredY=em.vy; dominated=true; }
    }

    if(!dominated){
        c._wanderAngle+=clamp(rnd(-.03,.03),-.025,.025);
        desiredX=Math.cos(c._wanderAngle)*c.speed; desiredY=Math.sin(c._wanderAngle)*c.speed;
    }

    if(c._scared<=0){ const mt=.015; c.vx+=clamp((desiredX-c.vx)*.025,-mt,mt); c.vy+=clamp((desiredY-c.vy)*.025,-mt,mt); }
    const spd=Math.sqrt(c.vx*c.vx+c.vy*c.vy);
    const szPen=clamp(1-(c.size-12)*.008,.5,1);
    const maxSpd=c._scared>0?c.speed*3.5:c.speed*szPen*(c._crowdFactor||1);
    if(spd>maxSpd){c.vx=c.vx/spd*maxSpd;c.vy=c.vy/spd*maxSpd;}
    if(c._scared>0){c.vx*=.97;c.vy*=.97;}
    if(spd<.05&&c._scared<=0){c.vx+=rnd(-.04,.04);c.vy+=rnd(-.04,.04);}
    const pad=80;
    if(c.x<pad)c.vx+=.05; if(c.x>W-pad)c.vx-=.05;
    if(c.y<pad)c.vy+=.05; if(c.y>H-pad)c.vy-=.05;
    c.x+=c.vx; c.y+=c.vy;

    const reproRate=c.reproduce*godMode.mutMult;
    if(c.energy>130&&mateFound&&Math.random()<reproRate&&creatures.length<POP_CAP){
        c.reproduced=true; mateFound.energy*=.6; c.energy*=.45;
        const child=spawnCreature(c.species,c.x+rnd(-20,20),c.y+rnd(-20,20),c);
        c._children.push(child.id); newChildren.push(child);
        if(child.generation>generationCount){ generationCount=child.generation; if(evoLog.length<20) evoLog.push(`Gen ${child.generation}: ${child.species}`); }
        if(!traitHistory[c.species]) traitHistory[c.species]=[];
        const sp=creatures.filter(x=>x.species===c.species);
        if(sp.length){ const avgSz=sp.reduce((a,x)=>a+x.size,0)/sp.length, avgSpd=sp.reduce((a,x)=>a+x.speed,0)/sp.length; traitHistory[c.species].push({gen:child.generation,avgSize:avgSz,avgSpeed:avgSpd}); if(traitHistory[c.species].length>50) traitHistory[c.species].shift(); }
    }
    c.energy=clamp(c.energy,0,200);
    return true;
}

// ── EMERGENT INTELLIGENCE ─────────────────────────────────────────────────
let _complexityScore=0, _complexityUnlocked=false;
function updateComplexity(){
    if(!creatures.length) return;
    const n=creatures.length;
    const avgSense=creatures.reduce((a,c)=>a+c.sense,0)/n;
    const avgSocial=creatures.reduce((a,c)=>a+(c.socialTrait||0),0)/n;
    const avgAge=creatures.reduce((a,c)=>a+c.age,0)/n;
    _complexityScore=avgSense*avgSocial*(avgAge/2000);
    _complexityUnlocked=_complexityScore>0.8;
}
// OPTIMIZED: now receives pre-filtered nearby array instead of scanning all creatures
function applyEmergent(c, nearby){
    const social=c.socialTrait||0; if(social<.4) return null;
    const sameSpecies=nearby.filter(o=>!o._dead&&o.species===c.species&&(()=>{const dx=o.x-c.x,dy=o.y-c.y;return Math.sqrt(dx*dx+dy*dy)<c.sense*1.2;})());
    if(sameSpecies.length<2) return null;
    if((c.diet==='carn'||c.diet==='apex')&&social>.5){
        const cx2=sameSpecies.reduce((a,o)=>a+o.x,c.x)/(sameSpecies.length+1), cy2=sameSpecies.reduce((a,o)=>a+o.y,c.y)/(sameSpecies.length+1);
        let bp=null,bd=Infinity;
        nearby.forEach(p=>{ if(p._dead) return; const ip=(c.diet==='carn'&&p.diet==='herb')||(c.diet==='apex'&&(p.diet==='herb'||p.diet==='carn')); if(!ip) return; const dx=p.x-cx2,dy=p.y-cy2,d=Math.sqrt(dx*dx+dy*dy); if(d<c.sense*2&&d<bd){bd=d;bp=p;} });
        if(bp){ const dx=bp.x-c.x,dy=bp.y-c.y,d=Math.sqrt(dx*dx+dy*dy)||1; return {vx:dx/d*c.speed,vy:dy/d*c.speed}; }
    }
    if(c.diet==='herb'&&social>.45){
        if(sameSpecies.some(o=>o._scared>0)||c._scared>0){
            const cx2=sameSpecies.reduce((a,o)=>a+o.x,c.x)/(sameSpecies.length+1), cy2=sameSpecies.reduce((a,o)=>a+o.y,c.y)/(sameSpecies.length+1);
            const dx=c.x-cx2,dy=c.y-cy2,d=Math.sqrt(dx*dx+dy*dy)||1, tr=40+sameSpecies.length*8, diff=d-tr;
            if(Math.abs(diff)>10){ const dir=diff>0?-1:1; return {vx:(dx/d)*dir*c.speed*.7+(-dy/d)*c.speed*.5,vy:(dy/d)*dir*c.speed*.7+(dx/d)*c.speed*.5}; }
            return {vx:(-dy/d)*c.speed,vy:(dx/d)*c.speed};
        }
    }
    if(social>.65&&sameSpecies.length>=3){
        const avgVx=sameSpecies.reduce((a,o)=>a+o.vx,0)/sameSpecies.length, avgVy=sameSpecies.reduce((a,o)=>a+o.vy,0)/sameSpecies.length;
        return {vx:avgVx*.6+c.vx*.4, vy:avgVy*.6+c.vy*.4};
    }
    return null;
}

// ── INSPECT PANEL ─────────────────────────────────────────────────────────
let inspectedCreature=null, inspectPanel=null;
function createInspectPanel(){
    inspectPanel=document.createElement('div'); inspectPanel.id='eco-inspect';
    inspectPanel.style.cssText="position:fixed;top:50%;right:16px;transform:translateY(-50%);background:#0d0010ee;border:1px solid #cc00ff;color:#e8d5f5;font-family:'Share Tech Mono',monospace;font-size:11px;padding:12px;z-index:9000;min-width:180px;max-width:220px;display:none;line-height:1.6;pointer-events:auto;";
    document.body.appendChild(inspectPanel);
}
function updateInspectPanel(){
    if(!inspectedCreature||!inspectPanel) return;
    const c=inspectedCreature;
    if(!creatures.includes(c)){ closeInspect(); return; }
    const def=SPECIES_DEFS[c.species], par=creatures.find(x=>x.id===c.parentId);
    const topW=Array.from(c.nnWeights).slice(0,6).map(v=>v.toFixed(2)).join(' ');
    inspectPanel.innerHTML=`
        <div style="color:${def.baseColor};font-size:13px;margin-bottom:6px">◈ ${c.species.toUpperCase()}</div>
        <div>gen: <b style="color:#ff6ec7">${c.generation}</b></div>
        <div>energy: <b style="color:${c.energy>100?'#00fff5':'#ff2d78'}">${Math.round(c.energy)}</b></div>
        <div>size: ${c.size.toFixed(1)} | spd: ${c.speed.toFixed(2)}</div>
        <div>sense: ${c.sense.toFixed(0)} | social: ${(c.socialTrait||0).toFixed(2)}</div>
        <div>age: ${c.age}/${Math.round(c.maxAge)}</div>
        <div>children: ${c._children.length} | parent: ${par?par.species:'none'}</div>
        <div>reproduced: <b style="color:${c.reproduced?'#00fff5':'#ff6b35'}">${c.reproduced}</b></div>
        <div style="color:#9b7db5;font-size:9px;margin-top:4px;word-break:break-all">net: ${topW}…</div>
        <div style="color:#9b7db5;font-size:10px;margin-top:4px">right-click to close</div>`;
    inspectPanel.style.display='block';
}
function closeInspect(){ inspectedCreature=null; if(inspectPanel) inspectPanel.style.display='none'; }

// ── GRAPH ─────────────────────────────────────────────────────────────────
let graphCanvas,graphCtx,showGraph=false;
function createGraphPanel(){
    graphCanvas=document.createElement('canvas'); graphCanvas.width=360; graphCanvas.height=180;
    graphCanvas.style.cssText='position:fixed;bottom:16px;right:16px;z-index:9000;border:1px solid #cc00ff66;display:none;background:#0d0010bb;pointer-events:none;opacity:0.75;';
    document.body.appendChild(graphCanvas); graphCtx=graphCanvas.getContext('2d');
}
function drawGraph(){
    if(!showGraph) return;
    const gc=graphCtx,gw=graphCanvas.width,gh=graphCanvas.height;
    gc.clearRect(0,0,gw,gh); gc.fillStyle='#0d0010cc'; gc.fillRect(0,0,gw,gh);
    const spp=Object.keys(popHistory), maxP=Math.max(10,...spp.flatMap(s=>popHistory[s]));
    const off=100;
    spp.forEach(sp=>{
        const hist=popHistory[sp]; if(hist.length<2) return;
        gc.strokeStyle=SPECIES_DEFS[sp].baseColor+'cc'; gc.lineWidth=1.5; gc.beginPath();
        hist.forEach((v,i)=>{ const x=off+(i/(POP_MAX-1))*(gw-off), y=gh-(v/maxP)*(gh-6)-3; i===0?gc.moveTo(x,y):gc.lineTo(x,y); }); gc.stroke();
    });
    const lh=13,lp=4;
    gc.fillStyle='rgba(8,0,16,0.85)'; gc.fillRect(0,0,100,spp.length*lh+lp*2);
    gc.font='9px Share Tech Mono,monospace';
    spp.forEach((sp,i)=>{ const cur=popHistory[sp][popHistory[sp].length-1]||0; gc.fillStyle=SPECIES_DEFS[sp].baseColor; gc.fillText(`● ${sp} ${cur}`,lp,lp+lh*(i+.85)); });
}

// ── TRAIT PANEL ───────────────────────────────────────────────────────────
let traitPanel,showTraits=false;
function createTraitPanel(){
    traitPanel=document.createElement('div');
    traitPanel.style.cssText="position:fixed;bottom:130px;left:10px;z-index:9000;background:#0d0010cc;border:1px solid #cc00ff44;color:#e8d5f5;font-family:'Share Tech Mono',monospace;font-size:10px;padding:8px;display:none;pointer-events:none;min-width:160px;line-height:1.5;";
    document.body.appendChild(traitPanel);
}
function updateTraitPanel(){
    if(!showTraits||!traitPanel) return;
    let h='<div style="color:#cc00ff;margin-bottom:4px">TRAIT EVOLUTION</div>';
    Object.keys(SPECIES_DEFS).forEach(sp=>{
        const cur=creatures.filter(c=>c.species===sp); if(!cur.length) return;
        const avgSz=(cur.reduce((a,c)=>a+c.size,0)/cur.length).toFixed(1);
        const avgSpd=(cur.reduce((a,c)=>a+c.speed,0)/cur.length).toFixed(2);
        const minSz=Math.min(...cur.map(c=>c.size)).toFixed(1), maxSz=Math.max(...cur.map(c=>c.size)).toFixed(1);
        h+=`<div style="color:${SPECIES_DEFS[sp].baseColor};margin-top:4px">${sp}</div><div>sz:${minSz}–${maxSz} avg:${avgSz} spd:${avgSpd}</div>`;
    });
    traitPanel.innerHTML=h; traitPanel.style.display='block';
}

// ── GOD MODE ──────────────────────────────────────────────────────────────
let godPanel,showGod=false;
function createGodPanel(){
    godPanel=document.createElement('div'); godPanel.id='eco-god';
    godPanel.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#0d0010f0;border:1px solid #ff00ff;color:#e8d5f5;font-family:'Share Tech Mono',monospace;font-size:12px;padding:16px 20px;z-index:9999;display:none;min-width:260px;pointer-events:auto;";
    godPanel.innerHTML=`<div style="color:#ff00ff;font-size:14px;margin-bottom:12px">⚡ GOD MODE</div>
        ${[['food','Food Mult','#ff00ff',0,5],['aggr','Predator Aggr','#cc00ff',0,3],['mut','Mutation Rate','#00fff5',0,5],['day','Day Speed','#ffff00',.1,10]].map(([id,label,col,mn,mx])=>`<div style="margin-bottom:8px"><label>${label}: <span id="god-${id}-val">1.0</span>x</label><br><input id="god-${id}" type="range" min="${mn}" max="${mx}" step="0.1" value="1" style="width:100%;accent-color:${col}"></div>`).join('')}
        <div style="color:#9b7db5;font-size:10px;margin-top:8px">press G to close</div>`;
    document.body.appendChild(godPanel);
    const bind=(id,cb)=>{ godPanel.querySelector(`#god-${id}`).addEventListener('input',e=>{ const v=parseFloat(e.target.value); godPanel.querySelector(`#god-${id}-val`).textContent=v.toFixed(1); cb(v); }); };
    bind('food',v=>godMode.foodMult=v); bind('aggr',v=>godMode.aggrMult=v); bind('mut',v=>godMode.mutMult=v); bind('day',v=>window._daySpeedMult=v);
}
window._daySpeedMult=1;

// ── HUD ───────────────────────────────────────────────────────────────────
function drawHUD(){
    const counts={};
    creatures.forEach(c=>{counts[c.species]=(counts[c.species]||0)+1;});
    ctx.save(); ctx.font='11px Share Tech Mono,monospace';
    let y=18;
    Object.entries(counts).forEach(([sp,n])=>{ ctx.globalAlpha=.75; ctx.fillStyle=SPECIES_DEFS[sp].baseColor; ctx.fillText(`${sp}: ${n}`,10,y); y+=14; });
    if(generationCount>0){ ctx.fillStyle='#dd88ff'; ctx.fillText(`max gen: ${generationCount}`,10,y+2); y+=14; }
    ctx.fillStyle=dayT>.5?'#ffffaa':'#8888ff'; ctx.fillText(dayT>.5?'DAY':'NIGHT',10,y+2);
    ctx.globalAlpha=1; ctx.restore();
}

// ── BUTTONS ───────────────────────────────────────────────────────────────
function addGodButton(){
    const mkBtn=(label,col,bottom,onClick)=>{
        const b=document.createElement('button');
        b.innerText=label; b.style.cssText=`position:fixed;bottom:${bottom}px;left:18px;z-index:99998;background:#0d0010;color:${col};font-family:"Comic Sans MS",monospace;font-size:15px;font-weight:bold;padding:10px 18px;border:2px solid ${col};cursor:pointer;text-shadow:0 0 8px ${col};box-shadow:0 0 15px ${col}44;letter-spacing:1px;`;
        b.addEventListener('click',onClick); document.body.appendChild(b); return b;
    };
    mkBtn('⚡ GOD MODE','#ffff00',122,()=>{ showGod=!showGod; godPanel.style.display=showGod?'block':'none'; });
    mkBtn('📈 GRAPH','#00fff5',174,()=>{
        showGraph=!showGraph; showTraits=showGraph;
        graphCanvas.style.display=showGraph?'block':'none';
        if(traitPanel) traitPanel.style.display=showTraits?'block':'none';
    });
    document.addEventListener('keydown',e=>{ if(e.key==='g'||e.key==='G'){ showGod=!showGod; godPanel.style.display=showGod?'block':'none'; } });
}

// ── INPUT ─────────────────────────────────────────────────────────────────
function initInput(){
    canvas.style.pointerEvents='auto';
    canvas.addEventListener('mousedown',e=>{ if(e.button===0) isDragging=true; });
    canvas.addEventListener('mousemove',e=>{ if(!isDragging) return; const r=canvas.getBoundingClientRect(); if(++dragBloomTimer%8===0) addFoodBloom(e.clientX-r.left,e.clientY-r.top); },{passive:true});
    canvas.addEventListener('mouseup',e=>{
        if(e.button!==0) return; isDragging=false; dragBloomTimer=0;
        const r=canvas.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
        creatures.forEach(c=>{ const dx=c.x-mx,dy=c.y-my,d=Math.sqrt(dx*dx+dy*dy); if(d<c.size*5+35&&d>0){ const f=clamp((c.size*2.5+20-d)/(c.size*2.5+20),.2,1), a=Math.atan2(dy,dx), sp=rnd(-.6,.6); c.vx=Math.cos(a+sp)*c.speed*3.5*f; c.vy=Math.sin(a+sp)*c.speed*3.5*f; c._wanderAngle=a+sp; c._scared=80; } });
    });
    canvas.addEventListener('contextmenu',e=>{
        e.preventDefault();
        if(inspectedCreature){ closeInspect(); return; }
        const r=canvas.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
        let nearest=null,nd=Infinity;
        creatures.forEach(c=>{ const dx=c.x-mx,dy=c.y-my,d=Math.sqrt(dx*dx+dy*dy); if(d<c.size*4+30&&d<nd){nd=d;nearest=c;} });
        if(nearest){ inspectedCreature=nearest; updateInspectPanel(); }
    });
    canvas.addEventListener('touchmove',e=>{ e.preventDefault(); const r=canvas.getBoundingClientRect(),t=e.touches[0]; if(++dragBloomTimer%8===0) addFoodBloom(t.clientX-r.left,t.clientY-r.top); },{passive:false});
    canvas.addEventListener('touchend',()=>{ isDragging=false; dragBloomTimer=0; });
}

// ── INIT & LOOP ───────────────────────────────────────────────────────────
const stars  =Array.from({length:140},()=>new Star());
const planets=Array.from({length:5},  ()=>new Planet());
const galaxies=Array.from({length:2}, ()=>new Galaxy());
const suns   =Array.from({length:4},  ()=>new Sun());
const comets =Array.from({length:3},  ()=>new Comet());
const nebulas=Array.from({length:10}, ()=>new Nebula());

window.addEventListener('load',()=>{ resize(); initCreatures(); createInspectPanel(); createGraphPanel(); createTraitPanel(); createGodPanel(); addGodButton(); initInput(); loop(); });

let frameCount=0;
// OPTIMIZED: track previous dayT phase to decide when bg needs refresh
let _lastBgDayT=-1;

function loop(){
    requestAnimationFrame(loop);
    if(!W||!H) return;
    frameCount++;
    updateDayNight();
    for(let i=1;i<Math.floor(window._daySpeedMult||1);i++) updateDayNight();

    // OPTIMIZED: rebuild spatial hash once per frame
    spatialHash.clear();
    creatures.forEach(c=>spatialHash.insert(c));

    // OPTIMIZED: only redraw BG when day phase changes meaningfully (every ~6 frames)
    const dayChanged=Math.abs(dayT-_lastBgDayT)>0.002;
    if(dayChanged||_bgDirty){
        ensureBgCanvas();
        nebulas.forEach(n=>n.update()); // still update positions
        renderBgToCache(nebulas);
        _lastBgDayT=dayT;
    }

    // Blit cached background in one call — no gradient recomputation
    ctx.drawImage(_bgCanvas,0,0);

    updateDrawBlooms();

    // OPTIMIZED: update stars every 2 frames, draw every frame
    if(frameCount%2===0) stars.forEach(s=>s.update());
    drawStarsBatched(stars); // batched by color group

    galaxies.forEach(g=>{g.update();g.draw();});
    suns.forEach(s=>{s.update();s.draw();});
    planets.forEach(p=>{p.update();p.draw();});
    comets.forEach(c=>{c.update();c.draw();});

    const newChildren=[];
    creatures=creatures.filter(c=>{ if(c._dead) return false; return updateCreature(c,planets,galaxies,stars,newChildren,suns); });
    newChildren.forEach(ch=>creatures.push(ch));

    Object.keys(SPECIES_DEFS).forEach(k=>{ if(!creatures.some(c=>c.species===k)){ const n=k==='leviathan'?1:k==='shark'||k==='anglerfish'?2:4; for(let i=0;i<n;i++) creatures.push(spawnCreature(k)); } });

    creatures.forEach(c=>drawCreature(c));
    ctx.globalAlpha=1;

    if(frameCount%120===0){
        const counts={}; creatures.forEach(c=>{counts[c.species]=(counts[c.species]||0)+1;});
        Object.keys(SPECIES_DEFS).forEach(sp=>{ popHistory[sp].push(counts[sp]||0); if(popHistory[sp].length>POP_MAX) popHistory[sp].shift(); });
    }
    if(frameCount%180===0) updateComplexity();
    drawHUD(); drawGraph(); updateTraitPanel();
    if(inspectedCreature) updateInspectPanel();
}

})();
