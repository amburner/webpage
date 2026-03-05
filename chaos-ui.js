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
    zergScoreEl=document.createElement('div'); zergScoreEl.id='zerg-score'; // sizing via eco-styles.css
    zergScoreEl.innerText='☠ KILLS: 0'; document.body.appendChild(zergScoreEl);
    const msg=document.createElement('div');
    msg.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#000;color:#ff0000;font-family:"Comic Sans MS",monospace;font-size:28px;font-weight:bold;padding:20px 32px;border:4px solid #ff0000;z-index:99999;text-align:center;text-shadow:0 0 10px #ff0000;pointer-events:none;';
    msg.innerHTML='🐞 ZERG RUSH! 🐞<br><span style="font-size:16px">CLICK THE ZERGLINGS TO KILL THEM!</span>';
    document.body.appendChild(msg); setTimeout(()=>msg.remove(),2200);
    zergBtn.innerText='🛑 END RUSH'; zergBtn.className='eco-btn eco-btn-zerg'; zergBtn.style.background='#ff0000'; zergBtn.style.color='#fff'; zergBtn.style.borderColor='#ff0000';
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
    zergBtn.innerText='🐞 ZERG RUSH'; zergBtn.className='eco-btn eco-btn-zerg'; zergBtn.style.color='#ff00ff'; zergBtn.style.borderColor='#ff00ff'; zergBtn.style.textShadow='0 0 8px #ff00ff'; zergBtn.style.boxShadow='0 0 15px rgba(255,0,255,0.4)';
}
function addZergButton(){
    zergBtn=document.createElement('button');
    zergBtn.innerText='🐞 ZERG RUSH';
    zergBtn.className='eco-btn eco-btn-zerg'; zergBtn.style.color='#ff00ff'; zergBtn.style.borderColor='#ff00ff'; zergBtn.style.textShadow='0 0 8px #ff00ff'; zergBtn.style.boxShadow='0 0 15px rgba(255,0,255,0.4)';
    zergBtn.addEventListener('click',startZergRush); document.body.appendChild(zergBtn);
}
function addHideButton(){
    const btn=document.createElement('button');
    btn.innerText='🙈 HIDE PROJECTS';
    btn.className='eco-btn eco-btn-hide'; btn.style.color='#cc00ff'; btn.style.borderColor='#cc00ff'; btn.style.textShadow='0 0 8px #cc00ff'; btn.style.boxShadow='0 0 15px rgba(204,0,255,0.4)';
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