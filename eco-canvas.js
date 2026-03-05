// =============================================
// COSMIC ECOSYSTEM — CANVAS, BACKGROUND, CELESTIAL OBJECTS
// Load order: eco-canvas.js → eco-creatures.js → eco-ui.js → eco-main.js
// =============================================
// ── IS_MOBILE & SCALE FACTOR ─────────────────────────────────────────────
// IS_MOBILE declared first so all files can use it at parse time
const IS_MOBILE=/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||window.innerWidth<768;
// S: linear scale relative to 1920×1080 baseline (diagonal ratio).
// Sizes/radii multiply by S; speeds multiply by S^0.5 so large screens feel
// proportionally faster without being chaotic.
function getScale(){ const d=Math.sqrt(window.innerWidth**2+window.innerHeight**2); return d/Math.sqrt(1920**2+1080**2); }
let S=getScale(), Ss=Math.sqrt(S);
// Recompute on resize so newly spawned objects use correct scale

const canvas=document.createElement('canvas');
canvas.id='ecosystem-canvas';
// OPTIMIZED: will-change promotes to GPU layer; image-rendering improves pixel perf
canvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;will-change:transform;';
document.addEventListener('DOMContentLoaded',()=>document.body.prepend(canvas));
const ctx=canvas.getContext('2d', {alpha:false}); // OPTIMIZED: alpha:false skips compositing
let W,H,_prevW=0,_prevH=0;
function resize(){
    const newW=window.innerWidth, newH=window.innerHeight;
    W=canvas.width=newW; H=canvas.height=newH;
    if(_bgCanvas){ _bgCanvas.width=W; _bgCanvas.height=H; }
    _bgDirty=true;

    // Scale all positions proportionally so layout is preserved across any resize
    if(_prevW>0&&_prevH>0&&typeof stars!=='undefined'){
        const sx=newW/_prevW, sy=newH/_prevH;
        stars.forEach(s=>{ s.x*=sx; s.y*=sy; });
        planets.forEach(p=>{ p.x*=sx; p.y*=sy; });
        galaxies.forEach(g=>{ g.x*=sx; g.y*=sy; });
        suns.forEach(s=>{ s.x*=sx; s.y*=sy; });
        comets.forEach(c=>{ c.x*=sx; c.y*=sy; });
        nebulas.forEach(n=>{ n.x*=sx; n.y*=sy; });
        if(typeof creatures!=='undefined') creatures.forEach(c=>{ c.x*=sx; c.y*=sy; });
    }
    _prevW=newW; _prevH=newH;
    S=getScale(); Ss=Math.sqrt(S);
}
window.addEventListener('load',resize); window.addEventListener('resize',resize);

const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PALETTE=[
    '#ff00ff','#dd00ff','#ff44ff',  // magentas
    '#00ffff','#00ddff','#44ffff',  // cyans
    '#ff0088','#ff2d78','#ff44aa',  // pinks
    '#ff6600','#ff8800','#ffaa00',  // oranges
    '#7700ff','#4400ff','#aa44ff',  // purples
    '#00ff88','#00ffcc','#44ffaa',  // teals
];
// ── OFFSCREEN BACKGROUND CACHE ────────────────────────────────────────────
// Single persistent offscreen canvas; resized in-place on window resize
let _bgCanvas=document.createElement('canvas'), _bgCtx=null, _bgDirty=true;
_bgCanvas.width=1; _bgCanvas.height=1;
_bgCtx=_bgCanvas.getContext('2d');

// ── DAY/NIGHT ─────────────────────────────────────────────────────────────
let dayPhase=0, dayT=0;
const DAY_LEN=7200;
function updateDayNight(){ dayT=(Math.sin(dayPhase*Math.PI*2/DAY_LEN)+1)/2; dayPhase=(dayPhase+1)%DAY_LEN; }

// OPTIMIZED: draw background to offscreen canvas, blit to main in one drawImage call
// BG is redrawn only when dayT changes enough — nebulas are baked in at that point
function renderBgToCache(nebulas){
    if(!_bgCtx||!W||!H) return;
    const gc=_bgCtx;
    const night=1-dayT;

    // Base fill
    gc.fillStyle=night>0.5?'#04000a':'#1a0028';
    gc.fillRect(0,0,W,H);

    // Night vignette overlay
    if(night>0.05){
        gc.globalAlpha=night*0.6;
        const ng=gc.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,Math.max(W,H)*.85);
        ng.addColorStop(0,'#0a0020'); ng.addColorStop(.5,'#06001a'); ng.addColorStop(1,'#000000');
        gc.fillStyle=ng; gc.fillRect(0,0,W,H); gc.globalAlpha=1;
    }

    // Sunrise/sunset horizon glow (bottom only, no top rays)
    const tt=1-Math.abs(dayT-0.5)*2;
    if(tt>0.05){
        gc.globalAlpha=tt*0.45;
        const dg=gc.createLinearGradient(0,H*0.6,0,H);
        if(dayT>0.5){ dg.addColorStop(0,'#ff440000'); dg.addColorStop(.5,'#ff440033'); dg.addColorStop(1,'#ff660066'); }
        else        { dg.addColorStop(0,'#88000000'); dg.addColorStop(.5,'#880000aa'); dg.addColorStop(1,'#ff004488'); }        gc.fillStyle=dg; gc.fillRect(0,H*0.6,W,H*0.4); gc.globalAlpha=1;
    }

    // Nebulas baked in (positions already updated separately on a slow timer)
    nebulas.forEach(n=>n.drawTo(gc));
    _bgDirty=false;
}

// ── FOOD BLOOMS ───────────────────────────────────────────────────────────
let foodBlooms=[], isDragging=false, dragBloomTimer=0;
function addFoodBloom(x,y){ foodBlooms.push({x,y,r:60*S,life:300,maxLife:300}); }
function updateDrawBlooms(){
    foodBlooms=foodBlooms.filter(b=>b.life>0);
    foodBlooms.forEach(b=>{
        b.life--;
        ctx.globalAlpha=(b.life/b.maxLife)*0.4;
        const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r); g.addColorStop(0,'#00ffaa'); g.addColorStop(1,'#00ffaa00');        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    });
}

// ── CELESTIAL OBJECTS ─────────────────────────────────────────────────────
class Star {
    constructor(){ this.reset(true); }
    reset(init){ this.x=rnd(0,W||1200); this.y=rnd(0,H||800); this.r=rnd(.3,1.8)*S; this.spd=rnd(.02,.15)*Ss; this.dir=rnd(0,Math.PI*2); this.tw=rnd(0,Math.PI*2); this.twSpd=rnd(.02,.05); this.col=pick(['#ffffff','#ffe8ff','#e8e8ff','#ffd0ff','#d0ffff']); }
    update(){
        this.dir += rnd(-.015, .015);
        this.x += Math.cos(this.dir) * this.spd;
        this.y += Math.sin(this.dir) * this.spd;
        this.tw += this.twSpd;
        if(this.x < -5 || this.x > W + 5 || this.y < -5 || this.y > H + 5) this.reset(false);
    }
    draw(){ ctx.globalAlpha=(0.4+0.5*Math.sin(this.tw))*(0.4+0.6*dayT); ctx.fillStyle=this.col; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
}

// OPTIMIZED: batch all stars in one draw pass using a single beginPath per color group
function drawStarsBatched(stars){
    const groups={};
    for(let i=0;i<stars.length;i++){
        const s=stars[i];
        if(!groups[s.col]) groups[s.col]=[];
        groups[s.col].push(s);
    }
    const keys=Object.keys(groups);
    for(let k=0;k<keys.length;k++){
        const g=groups[keys[k]];
        ctx.fillStyle=keys[k];
        for(let i=0;i<g.length;i++){
            const s=g[i];
            ctx.globalAlpha=(0.4+0.5*Math.sin(s.tw))*(0.4+0.6*dayT);
            ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
        }
    }
    ctx.globalAlpha=1;
}

class Planet {
    constructor(){ this.reset(true); }
    reset(init){
        this.r = rnd(18, 52)*S;
        if(init){
            this.x = rnd(0, W || 1200);
            this.y = rnd(this.r, (H || 800) - this.r);
            this.dx = (Math.random() < .5 ? 1 : -1) * rnd(.04, .2)*Ss;
            this.dy = rnd(-.06, .06)*Ss;
        } else {
            const edge = Math.floor(Math.random() * 4);
            if(edge === 0){      this.x = -this.r - 10;    this.y = rnd(0, H); }
            else if(edge === 1){ this.x = W + this.r + 10;  this.y = rnd(0, H); }
            else if(edge === 2){ this.x = rnd(0, W);         this.y = -this.r - 10; }
            else {               this.x = rnd(0, W);         this.y = H + this.r + 10; }
            const targetX = W * rnd(0.25, 0.75);
            const targetY = H * rnd(0.25, 0.75);
            const angle = Math.atan2(targetY - this.y, targetX - this.x);
            const spd = rnd(.04, .2)*Ss;
            this.dx = Math.cos(angle) * spd;
            this.dy = Math.sin(angle) * spd;
        }
        this.spd = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        this.col = pick(PALETTE); this.col2 = pick(PALETTE);
        this.rings = Math.random() < .4; this.ringTilt = rnd(.2, .6);
        this.rot = rnd(0, Math.PI * 2); this.rotSpd = rnd(-.004, .004);
        this.grav = this.r * 7; // r already scaled
    }
    update(){
        this.x += this.dx;
        this.y += this.dy;
        this.rot += this.rotSpd;
        this.dx += rnd(-.003, .003);
        this.dy += rnd(-.003, .003);
        const spd = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if(spd > 0.25*Ss){ this.dx = this.dx / spd * 0.25*Ss; this.dy = this.dy / spd * 0.25*Ss; }
        if(spd < 0.04*Ss){ this.dx *= 1.05; this.dy *= 1.05; }
        if(this.x < -this.r - 60 || this.x > W + this.r + 60 ||
        this.y < -this.r - 60 || this.y > H + this.r + 60) this.reset(false);
    }
    draw(){
        ctx.save(); ctx.translate(this.x,this.y);
        const g1=ctx.createRadialGradient(0,0,this.r*.5,0,0,this.r*2); g1.addColorStop(0,this.col+'22'); g1.addColorStop(1,this.col+'00');        const g2=ctx.createRadialGradient(-this.r*.3,-this.r*.3,this.r*.1,0,0,this.r); g2.addColorStop(0,'#ffffff33'); g2.addColorStop(.4,this.col); g2.addColorStop(1,this.col2); ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
        if(this.rings){ ctx.save(); ctx.scale(1,this.ringTilt); ctx.strokeStyle=this.col+'88'; ctx.lineWidth=this.r*.16; ctx.beginPath(); ctx.arc(0,0,this.r*1.55,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
        ctx.restore();
    }
}
class Galaxy {
    constructor(){ this.reset(true); }
    reset(init){
        this.r = rnd(40, 100)*S;
        if(init){
            this.x = rnd(0, W || 1200);
            this.y = rnd(this.r, (H || 800) - this.r);
            this.dx = (Math.random() < .5 ? 1 : -1) * rnd(.01, .07)*Ss;
            this.dy = rnd(-.04, .04)*Ss;
        } else {
            const edge = Math.floor(Math.random() * 4);
            if(edge === 0){      this.x = -this.r - 20;    this.y = rnd(0, H); }
            else if(edge === 1){ this.x = W + this.r + 20;  this.y = rnd(0, H); }
            else if(edge === 2){ this.x = rnd(0, W);         this.y = -this.r - 20; }
            else {               this.x = rnd(0, W);         this.y = H + this.r + 20; }
            const targetX = W * rnd(0.25, 0.75);
            const targetY = H * rnd(0.25, 0.75);
            const angle = Math.atan2(targetY - this.y, targetX - this.x);
            const spd = rnd(.01, .07)*Ss;
            this.dx = Math.cos(angle) * spd;
            this.dy = Math.sin(angle) * spd;
        }
        this.rot = rnd(0, Math.PI * 2); this.rotSpd = rnd(-.002, .002);
        this.arms = Math.floor(rnd(2, 5));
        this.col = pick(PALETTE); this.col2 = pick(PALETTE);
        this.grav = this.r * 6;
    }
    update(){
        this.x += this.dx;
        this.y += (this.dy || 0);
        this.rot += this.rotSpd;
        this.dx += rnd(-.002, .002);
        this.dy = (this.dy || 0) + rnd(-.002, .002);
        const spd = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if(spd > 0.09*Ss){ this.dx = this.dx / spd * 0.09*Ss; this.dy = this.dy / spd * 0.09*Ss; }
        if(spd < 0.01*Ss){ this.dx *= 1.05; this.dy *= 1.05; }
        if(this.x < -this.r - 80 || this.x > W + this.r + 80 ||
        this.y < -this.r - 80 || this.y > H + this.r + 80) this.reset(false);
    }
    draw(){
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot);

        // Outer glow halo
        const halo = ctx.createRadialGradient(0, 0, this.r * .3, 0, 0, this.r * 1.6);
        halo.addColorStop(0,   this.col + '00');
        halo.addColorStop(.4,  this.col + '18');
        halo.addColorStop(.8,  this.col2 + '22');
        halo.addColorStop(1,   this.col + '00');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(0, 0, this.r * 1.6, 0, Math.PI * 2); ctx.fill();

        // Spiral arms — two passes, wide soft base + narrow bright core
        for(let a = 0; a < this.arms; a++){
            ctx.save(); ctx.rotate(Math.PI * 2 / this.arms * a);

            // Wide soft arm
            const ag1 = ctx.createLinearGradient(0, 0, this.r, 0);
            ag1.addColorStop(0,   this.col + 'cc');
            ag1.addColorStop(.4,  this.col2 + '99');
            ag1.addColorStop(.75, this.col + '44');
            ag1.addColorStop(1,   this.col + '00');
            ctx.strokeStyle = ag1;
            ctx.lineWidth = this.r * .22;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for(let t = 0; t < 1; t += .02){
                const ang = t * Math.PI * 1.8, rad = t * this.r;
                ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
            }
            ctx.stroke();

            // Bright narrow arm core
            const ag2 = ctx.createLinearGradient(0, 0, this.r * .8, 0);
            ag2.addColorStop(0,   '#ffffff99');
            ag2.addColorStop(.3,  this.col2 + 'bb');
            ag2.addColorStop(.7,  this.col + '66');
            ag2.addColorStop(1,   this.col + '00');
            ctx.strokeStyle = ag2;
            ctx.lineWidth = this.r * .06;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for(let t = 0; t < 1; t += .02){
                const ang = t * Math.PI * 1.8, rad = t * this.r * .85;
                ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
            }
            ctx.stroke();

            ctx.restore();
        }

        // Dense bright core
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r * .28);
        core.addColorStop(0,   '#ffffff');
        core.addColorStop(.2,  '#ffffffdd');
        core.addColorStop(.5,  this.col2 + 'ee');
        core.addColorStop(.8,  this.col + 'aa');
        core.addColorStop(1,   this.col + '00');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(0, 0, this.r * .28, 0, Math.PI * 2); ctx.fill();

        // Core star burst — 4 rays
        ctx.save();
        for(let i = 0; i < 4; i++){
            ctx.rotate(Math.PI / 4);
            const ray = ctx.createLinearGradient(0, 0, this.r * .35, 0);
            ray.addColorStop(0,   '#ffffffcc');
            ray.addColorStop(.5,  this.col2 + '55');
            ray.addColorStop(1,   this.col + '00');
            ctx.strokeStyle = ray;
            ctx.lineWidth = this.r * .03;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(this.r * .35, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-this.r * .35, 0); ctx.stroke();
        }
        ctx.restore();

        ctx.restore();
    }
}
class Sun {
    constructor(){ this.reset(true); }
    reset(init){
        this.r = rnd(12, 30)*S;
        if(init){
            this.x = rnd(0, W || 1200);
            this.y = rnd(this.r, (H || 800) - this.r);
            this.dx = (Math.random() < .5 ? 1 : -1) * rnd(.03, .12)*Ss;
            this.dy = rnd(-.05, .05)*Ss;
        } else {
            const edge = Math.floor(Math.random() * 4);
            if(edge === 0){      this.x = -this.r - 10;    this.y = rnd(0, H); }
            else if(edge === 1){ this.x = W + this.r + 10;  this.y = rnd(0, H); }
            else if(edge === 2){ this.x = rnd(0, W);         this.y = -this.r - 10; }
            else {               this.x = rnd(0, W);         this.y = H + this.r + 10; }
            const targetX = W * rnd(0.25, 0.75);
            const targetY = H * rnd(0.25, 0.75);
            const angle = Math.atan2(targetY - this.y, targetX - this.x);
            const spd = rnd(.03, .12)*Ss;
            this.dx = Math.cos(angle) * spd;
            this.dy = Math.sin(angle) * spd;
        }
        this.col = pick(['#ffffff','#ffe8aa','#ffcc44','#ffaa22','#ff8800']);
        this.pulse = rnd(0, Math.PI * 2); this.pulseSpd = rnd(.02, .05);
        this.grav = this.r * 5;
    }
    update(){
        this.x += this.dx;
        this.y += this.dy;
        this.pulse += this.pulseSpd;
        this.dx += rnd(-.004, .004);
        this.dy += rnd(-.004, .004);
        const spd = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if(spd > 0.15*Ss){ this.dx = this.dx / spd * 0.15*Ss; this.dy = this.dy / spd * 0.15*Ss; }
        if(spd < 0.03*Ss){ this.dx *= 1.05; this.dy *= 1.05; }
        if(this.x < -this.r - 60 || this.x > W + this.r + 60 ||
        this.y < -this.r - 60 || this.y > H + this.r + 60) this.reset(false);
    }
    draw(){
        ctx.save(); ctx.translate(this.x,this.y);
        const pr=this.r*(1.1+.15*Math.sin(this.pulse));
        const cg=ctx.createRadialGradient(0,0,this.r*.5,0,0,pr*4); cg.addColorStop(0,this.col+'44'); cg.addColorStop(1,this.col+'00'); ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(0,0,pr*4,0,Math.PI*2); ctx.fill();        const bg=ctx.createRadialGradient(-this.r*.2,-this.r*.2,0,0,0,pr); bg.addColorStop(0,'#ffffff'); bg.addColorStop(.3,this.col); bg.addColorStop(1,this.col+'88'); ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(0,0,pr,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }
}
class Comet {
    constructor(){ this.reset(true); }
    reset(init){ const fl=Math.random()<.5; this.y=rnd(0,H||800); this.x=init?rnd(0,W||1200):(fl?-20:(W||1200)+20); this.spd=rnd(2.5,6)*Ss; this.dx=fl?this.spd:-this.spd; this.dy=rnd(-.8,.8)*Ss; this.tailLen=rnd(60,160)*S; this.r=rnd(1.5,3.5)*S; this.col=pick(['#ffffff','#aaffff','#ffeedd','#ffcc88','#88ccff']); this.life=rnd(180,400); this.maxLife=this.life; }
    update(){ this.x+=this.dx; this.y+=this.dy; this.life--; if(this.life<=0||this.x<-200||this.x>W+200) this.reset(false); }
    draw(){
        const alpha=Math.min(1,this.life/30)*.85, angle=Math.atan2(this.dy,this.dx);
        ctx.save(); ctx.globalAlpha=alpha;
        const tg=ctx.createLinearGradient(this.x,this.y,this.x-Math.cos(angle)*this.tailLen,this.y-Math.sin(angle)*this.tailLen);
        tg.addColorStop(0,this.col+'cc'); tg.addColorStop(1,this.col+'00');
        ctx.strokeStyle=tg; ctx.lineWidth=this.r*1.2; ctx.beginPath(); ctx.moveTo(this.x,this.y); ctx.lineTo(this.x-Math.cos(angle)*this.tailLen,this.y-Math.sin(angle)*this.tailLen); ctx.stroke();
        ctx.fillStyle=this.col; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1; ctx.restore();
    }
}

// OPTIMIZED: Nebula draws to a provided context (so it can go into the BG cache)
// Purple/blue palette, multi-lobe feathered edges, rare warm accent
// Each nebula pre-bakes itself to a small offscreen canvas on reset — drawTo is a single drawImage
const NEBULA_COLS=[
  ['#3300aa','#6600cc'],['#220066','#4400ff'],['#0022bb','#0055ff'],
  ['#440088','#9900cc'],['#001166','#0033cc'],['#550099','#aa00ff'],
  ['#cc2200','#ff6600'],['#ff4400','#ff8800'],
  ['#990044','#ff0077'],['#cc0066','#880055'],
  ['#882200','#ff4422'],['#660033','#ff2255'],
];
class Nebula {
    constructor(){ this._bc=document.createElement('canvas'); this._bctx=this._bc.getContext('2d'); this.reset(true); }
    reset(init){
        this.x=rnd(0,W||1200); this.y=rnd(0,H||800);
        this.r=rnd(130,340)*S;
        const warm=Math.random()<0.17;
        const pool=warm?NEBULA_COLS.slice(8):NEBULA_COLS.slice(0,8);
        const [c1,c2]=pick(pool);
        this.col=c1; this.col2=c2;
        this.rot=rnd(0,Math.PI*2); this.rotSpd=rnd(-.00015,.00015);
        this.dx=rnd(-.03,.03); this.dy=rnd(-.015,.015);
        this.lobes=Array.from({length:Math.floor(rnd(3,6))},()=>({
            ox:rnd(-.4,.4), oy:rnd(-.4,.4),
            sx:rnd(.6,1.3),  sy:rnd(.5,1.0),
            a:rnd(.035,.08), r:rnd(.5,.9),
        }));
        this._bake();
    }
    _bake(){
        // Render the nebula shape once into a local canvas sized to 2.8r × 2.8r
        const sz=Math.ceil(this.r*2.8);
        this._bc.width=sz; this._bc.height=sz;
        const gc=this._bctx, cx=sz/2, cy=sz/2;
        gc.clearRect(0,0,sz,sz);
        this.lobes.forEach(l=>{
            gc.save();
            gc.translate(cx+this.r*l.ox, cy+this.r*l.oy);
            gc.scale(l.sx, l.sy);
            const lr=this.r*l.r;
            // Feathered outer halo
            const gOut = gc.createRadialGradient(0, 0, lr * .25, 0, 0, lr * 1.2);
            gOut.addColorStop(0,   this.col2 + '00');
            gOut.addColorStop(.5,  this.col2 + '14');
            gOut.addColorStop(1,   this.col2 + '00');
            gc.globalAlpha=l.a*.7;
            gc.fillStyle=gOut;
            gc.beginPath(); gc.arc(0,0,lr*1.2,0,Math.PI*2); gc.fill();
            // Main lobe — hard-feathers to transparent
            const g = gc.createRadialGradient(0, 0, 0, 0, 0, lr);
            g.addColorStop(0,   this.col + '4a');
            g.addColorStop(.35, this.col2 + '38');
            g.addColorStop(.7,  this.col + '1a');
            g.addColorStop(1,   this.col + '00');
            gc.globalAlpha=l.a;
            gc.fillStyle=g;
            gc.beginPath(); gc.arc(0,0,lr,0,Math.PI*2); gc.fill();
            gc.restore();
        });
    }
    // Called on a slow timer (every 90 frames), NOT every frame
    updatePosition(){ this.x+=this.dx*90; this.y+=this.dy*90; this.rot+=this.rotSpd*90; if(this.x<-this.r*2||this.x>W+this.r*2||this.y<-this.r*2||this.y>H+this.r*2) this.reset(false); }
    drawTo(gc){
        const sz=this._bc.width;
        gc.save(); gc.translate(this.x,this.y); gc.rotate(this.rot);
        gc.drawImage(this._bc,-sz/2,-sz/2);
        gc.restore();
    }
    draw(){ this.drawTo(ctx); }
}