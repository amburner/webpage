// =============================================
// AMBER MILLER — MAXIMUM CHAOS EDITION
// =============================================

// ---------- Inject marquees inside each project card ----------
function addCardMarquees() {
    const summaries = document.querySelectorAll('.project > summary');
    const msgs = [
        '🚀 SICK PROJECT ALERT 🚀',
        '⚡ ENGINEERING EXCELLENCE ⚡',
        '🔥 CHECK THIS OUT 🔥',
        '💥 CONTROLS & CHAOS 💥',
        '🛸 AEROSPACE INTENSIFIES 🛸',
    ];
    summaries.forEach((s, i) => {
        const mq = document.createElement('marquee');
        mq.setAttribute('scrollamount', '5');
        mq.style.cssText = `background:linear-gradient(90deg,#1a0030,#2d0050,#1a0030);color:#ff00ff;font-family:'Share Tech Mono',monospace;font-size:11px;padding:2px 0;border-top:1px solid #cc00ff;margin-top:6px;display:block;letter-spacing:2px;`;
        mq.innerText = msgs[i % msgs.length];
        s.parentElement.insertBefore(mq, s.nextSibling);
    });
}

// ---------- Sparkle effect ----------
let lastSparkTime = 0;
let sparkActive = true;
const symbols = ['✶','★','⚡','💥','✨','🌟','☆','◆','♦','❋','+','˚'];
const neonColors = ['#ff00ff','#cc00ff','#ff6ec7','#00fff5','#ff2d78','#ff6b35','#dd88ff','#ff44aa'];

function createSparkle(e) {
    if (!sparkActive) return;
    const currentTime = Date.now();
    if (currentTime - lastSparkTime > 40) {
        const x = e.touches ? e.touches[0].pageX : e.pageX;
        const y = e.touches ? e.touches[0].pageY : e.pageY;
        const count = Math.random() < 0.4 ? 3 : 1;
        for (let i = 0; i < count; i++) {
            const spark = document.createElement('div');
            spark.className = 'spark';
            spark.innerText = symbols[Math.floor(Math.random() * symbols.length)];
            spark.style.left = (x + (Math.random() - 0.5) * 30) + 'px';
            spark.style.top  = (y + (Math.random() - 0.5) * 30) + 'px';
            spark.style.setProperty('--spark-color', neonColors[Math.floor(Math.random() * neonColors.length)]);
            spark.style.fontSize = (0.9 + Math.random() * 1.2) + 'em';
            document.body.appendChild(spark);
            setTimeout(() => spark.remove(), 900);
        }
        lastSparkTime = currentTime;
    }
}
document.addEventListener('mousemove', createSparkle);
document.addEventListener('touchmove', createSparkle);

// ---------- Pulsing h2 colors ----------
function animateH2s() {
    const colors = ['#ff00ff','#cc00ff','#ff6ec7','#00fff5','#ff2d78','#ff6b35'];
    let idx = 0;
    setInterval(() => {
        document.querySelectorAll('h2').forEach(el => { el.style.color = colors[idx % colors.length]; });
        idx++;
    }, 600);
}

// ---------- Cycling card borders (no box-shadow — that was causing flashes) ----------
function cycleBorders() {
    const cards = document.querySelectorAll('.project');
    const borders = ['#ff00ff','#cc00ff','#00fff5','#ff2d78','#ff6ec7','#ff6b35'];
    let i = 0;
    setInterval(() => {
        cards.forEach((card, ci) => {
            if (!card._zergDead) {
                card.style.borderColor = borders[(i + ci) % borders.length];
                // No box-shadow cycling — it was causing the strobe flash
            }
        });
        i++;
    }, 400);
}

// =============================================
// ZERG RUSH MINIGAME
// =============================================

const ZERGLING_FRAMES = ['ᗤ','ᗣ','ᗡ','ᗢ'];
const ZERGLING_COLORS = ['#aa0000','#cc2200','#ff3300','#dd1100'];
const BITE_CHARS = [' ',' ','·','░'];

let zergGameActive = false;
let zerglings = [];
let zergInterval = null;
let zergSpawnInterval = null;
let zergScore = 0;
let zergScoreEl = null;
let zergBtn = null;

const BORDER_STYLES = ['double','solid','dashed','dotted','none'];
const BORDER_WIDTHS = [6, 5, 4, 3, 2, 1, 0];

function getBorderHealth(card) {
    if (card._borderHealth === undefined) {
        card._borderHealth = { top: 100, right: 100, bottom: 100, left: 100 };
    }
    return card._borderHealth;
}

function applyBorderDamage(card, side, dmg) {
    const h = getBorderHealth(card);
    h[side] = Math.max(0, h[side] - dmg);
    const hp = h[side];
    const w = Math.round((hp / 100) * 6);
    const styleIdx = Math.min(BORDER_STYLES.length - 1, Math.floor((1 - hp/100) * BORDER_STYLES.length));
    const style = hp <= 0 ? 'none' : BORDER_STYLES[styleIdx];
    card.style[`border-${side}-width`] = w + 'px';
    card.style[`border-${side}-style`] = style;
    card.style[`border-${side}-color`] = '#ff0000';
    setTimeout(() => {
        if (!card._zergDead) card.style[`border-${side}-color`] = '';
    }, 120);
    if (h.top <= 0 && h.right <= 0 && h.bottom <= 0 && h.left <= 0) {
        destroyCard(card);
    }
}

function destroyCard(card) {
    card._zergDead = true;
    card.style.border = 'none';
    card.style.opacity = '0.35';
    card.style.filter = 'grayscale(1)';
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width/2 + window.scrollX;
    const cy = rect.top + rect.height/2 + window.scrollY;
    for (let i = 0; i < 12; i++) {
        const ex = document.createElement('div');
        ex.className = 'spark';
        ex.innerText = ['💥','🔥','✶','★'][Math.floor(Math.random()*4)];
        ex.style.left = (cx + (Math.random()-0.5)*80) + 'px';
        ex.style.top  = (cy + (Math.random()-0.5)*80) + 'px';
        ex.style.fontSize = (1.5 + Math.random()*2) + 'em';
        ex.style.setProperty('--spark-color', '#ff4400');
        document.body.appendChild(ex);
        setTimeout(() => ex.remove(), 900);
    }
}

function createZergling(targetCard, targetSide) {
    const rect = targetCard.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    let startX, startY, targetX, targetY;

    switch (targetSide) {
        case 'top':
            targetX = rect.left + scrollX + Math.random() * rect.width;
            targetY = rect.top  + scrollY;
            startX  = targetX + (Math.random()-0.5)*240;
            startY  = 0;
            break;
        case 'bottom':
            targetX = rect.left + scrollX + Math.random() * rect.width;
            targetY = rect.bottom + scrollY;
            startX  = targetX + (Math.random()-0.5)*240;
            startY  = screen.height;
            break;
        case 'left':
            targetX = rect.left + scrollX;
            targetY = rect.top  + scrollY + Math.random() * rect.height;
            startX  = 0;
            startY  = targetY + (Math.random()-0.5)*240;
            break;
        case 'right':
            targetX = rect.right + scrollX;
            targetY = rect.top   + scrollY + Math.random() * rect.height;
            startX  = screen.width;
            startY  = targetY + (Math.random()-0.5)*240;
            break;
    }

    const el = document.createElement('div');
    el.className = 'zergling';
    el.innerText = ZERGLING_FRAMES[0];
    el.style.cssText = `
        position: absolute;
        left: ${startX}px;
        top: ${startY}px;
        font-size: 18px;
        color: ${ZERGLING_COLORS[Math.floor(Math.random()*ZERGLING_COLORS.length)]};
        z-index: 10000;
        pointer-events: auto;
        cursor: crosshair;
        user-select: none;
        text-shadow: 0 0 4px #ff0000;
        transition: none;
    `;
    document.body.appendChild(el);

    const zl = {
        el, x: startX, y: startY, tx: targetX, ty: targetY,
        card: targetCard, side: targetSide,
        speed: 0.8 + Math.random() * 1.0,
        frame: 0, frameTimer: 0,
        state: 'moving', attackTimer: 0, hp: 1,
    };
    el.addEventListener('click', () => killZergling(zl));
    el.addEventListener('touchstart', (e) => { e.preventDefault(); killZergling(zl); });
    zerglings.push(zl);
    return zl;
}

function killZergling(zl) {
    if (zl.state === 'dead') return;
    zl.state = 'dead';
    zl.el.innerText = '☠';
    zl.el.style.color = '#888';
    zl.el.style.textShadow = 'none';
    zl.el.style.fontSize = '14px';
    zergScore += 1;
    updateScore();
    setTimeout(() => {
        if (zl.el.parentNode) zl.el.remove();
        zerglings = zerglings.filter(z => z !== zl);
    }, 500);
}

function updateScore() {
    if (zergScoreEl) zergScoreEl.innerText = `☠ KILLS: ${zergScore}`;
}

function tickZerg() {
    zerglings.forEach(zl => {
        if (zl.state === 'dead') return;
        zl.frameTimer++;
        if (zl.frameTimer % 8 === 0) {
            zl.frame = (zl.frame + 1) % ZERGLING_FRAMES.length;
            if (zl.state === 'moving') zl.el.innerText = ZERGLING_FRAMES[zl.frame];
        }
        if (zl.state === 'moving') {
            const dx = zl.tx - zl.x;
            const dy = zl.ty - zl.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 6) {
                zl.state = 'attacking';
                zl.el.innerText = '⚔';
            } else {
                zl.x += (dx / dist) * zl.speed;
                zl.y += (dy / dist) * zl.speed;
                zl.el.style.left = zl.x + 'px';
                zl.el.style.top  = zl.y + 'px';
            }
        } else if (zl.state === 'attacking') {
            zl.attackTimer++;
            const shake = (Math.random()-0.5)*3;
            zl.el.style.left = (zl.tx + shake) + 'px';
            zl.el.style.top  = (zl.ty + shake) + 'px';
            if (zl.attackTimer % 20 === 0) {
                if (!zl.card._zergDead) {
                    applyBorderDamage(zl.card, zl.side, 8 + Math.random()*4);
                } else {
                    reassignZergling(zl);
                }
            }
            if (zl.attackTimer % 10 === 0) {
                zl.el.innerText = zl.attackTimer % 20 < 10 ? '⚔' : '🗡';
            }
        }
    });
}

function reassignZergling(zl) {
    const alive = Array.from(document.querySelectorAll('.project')).filter(c => !c._zergDead);
    if (alive.length === 0) { endZergRush(); return; }
    const card = alive[Math.floor(Math.random() * alive.length)];
    const sides = ['top','right','bottom','left'];
    const side  = sides[Math.floor(Math.random() * sides.length)];
    const rect  = card.getBoundingClientRect();
    const scrollY = window.scrollY, scrollX = window.scrollX;
    zl.card = card; zl.side = side;
    switch (side) {
        case 'top':    zl.tx = rect.left+scrollX+Math.random()*rect.width; zl.ty = rect.top+scrollY; break;
        case 'bottom': zl.tx = rect.left+scrollX+Math.random()*rect.width; zl.ty = rect.bottom+scrollY; break;
        case 'left':   zl.tx = rect.left+scrollX; zl.ty = rect.top+scrollY+Math.random()*rect.height; break;
        case 'right':  zl.tx = rect.right+scrollX; zl.ty = rect.top+scrollY+Math.random()*rect.height; break;
    }
    zl.state = 'moving'; zl.attackTimer = 0;
}

function spawnWave() {
    const cards = Array.from(document.querySelectorAll('.project')).filter(c => !c._zergDead);
    if (cards.length === 0) { endZergRush(); return; }
    const sides = ['top','right','bottom','left'];
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        const card = cards[Math.floor(Math.random() * cards.length)];
        const side = sides[Math.floor(Math.random() * sides.length)];
        createZergling(card, side);
    }
}

function addZergOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'zerg-overlay';
    overlay.style.cssText = `position:fixed;inset:0;z-index:9999;background:transparent;cursor:crosshair;`;
    overlay.addEventListener('click', (e) => {
        overlay.style.display = 'none';
        const real = document.elementFromPoint(e.clientX, e.clientY);
        overlay.style.display = '';
        if (real && real.tagName === 'SUMMARY') {
            real.closest('details').toggleAttribute('open');
        }
    });
    document.body.appendChild(overlay);
}

function startZergRush() {
    if (zergGameActive) { endZergRush(); return; }
    zergGameActive = true;
    sparkActive = false;
    window._zergActive = true;
    addZergOverlay();
    zergScore = 0;
    zerglings = [];
    let waveNum = 0;

    document.querySelectorAll('.project').forEach(card => {
        card._borderHealth = { top: 100, right: 100, bottom: 100, left: 100 };
        card._zergDead = false;
        card.style.opacity = '';
        card.style.filter = '';
        card.style.border = '';
    });

    zergScoreEl = document.createElement('div');
    zergScoreEl.id = 'zerg-score';
    zergScoreEl.style.cssText = `
        position:fixed;top:10px;right:14px;background:#000;color:#ff0000;
        font-family:"Comic Sans MS",monospace;font-size:16px;font-weight:bold;
        padding:6px 12px;border:3px solid #ff0000;z-index:99999;
        text-shadow:0 0 6px #ff0000;pointer-events:none;
    `;
    zergScoreEl.innerText = '☠ KILLS: 0';
    document.body.appendChild(zergScoreEl);

    const msg = document.createElement('div');
    msg.style.cssText = `
        position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        background:#000;color:#ff0000;font-family:"Comic Sans MS",monospace;
        font-size:28px;font-weight:bold;padding:20px 32px;border:4px solid #ff0000;
        z-index:99999;text-align:center;text-shadow:0 0 10px #ff0000;pointer-events:none;
    `;
    msg.innerHTML = '🐞 ZERG RUSH! 🐞<br><span style="font-size:16px">CLICK THE ZERGLINGS TO KILL THEM!</span>';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2200);

    zergBtn.innerText = '🛑 END RUSH';
    zergBtn.style.background = '#ff0000';
    zergBtn.style.color = '#fff';

    spawnWave();
    zergSpawnInterval = setInterval(function() {
        spawnWave();
        waveNum += 1;
    }, 5000 - 250 * waveNum);
    zergInterval = setInterval(tickZerg, 16);
}

function endZergRush() {
    zergGameActive = false;
    sparkActive = true;
    window._zergActive = false;
    clearInterval(zergInterval);
    clearInterval(zergSpawnInterval);
    const overlay = document.getElementById('zerg-overlay');
    if (overlay) overlay.remove();

    zerglings.forEach(zl => { if (zl.el.parentNode) zl.el.remove(); });
    zerglings = [];

    if (zergScoreEl) {
        const final = document.createElement('div');
        final.style.cssText = `
            position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
            background:#000;color:#ff0000;font-family:"Comic Sans MS",monospace;
            font-size:24px;font-weight:bold;padding:20px 32px;border:4px solid #ff0000;
            z-index:99999;text-align:center;text-shadow:0 0 10px #ff0000;
        `;
        final.innerHTML = `🐞 RUSH OVER 🐞<br>KILLS: ${zergScore}<br><span style="font-size:14px;cursor:pointer;color:#ffff00" id="zerg-close">[ CLOSE ]</span>`;
        document.body.appendChild(final);
        document.getElementById('zerg-close').addEventListener('click', () => final.remove());
        setTimeout(() => { if (final.parentNode) final.remove(); }, 4000);
        setTimeout(() => { if (zergScoreEl && zergScoreEl.parentNode) zergScoreEl.remove(); }, 4000);
    }

    document.querySelectorAll('.project').forEach(card => {
        card._borderHealth = undefined;
        card._zergDead = false;
        card.style.opacity = '';
        card.style.filter = '';
        card.style.border = '';
        ['Top','Right','Bottom','Left'].forEach(s => {
            card.style[`border${s}Width`] = '';
            card.style[`border${s}Style`] = '';
        });
    });

    zergBtn.innerText = '🐞 ZERG RUSH';
    zergBtn.style.background = '#0d0010';
    zergBtn.style.color = '#ff00ff';
}

function addZergButton() {
    zergBtn = document.createElement('button');
    zergBtn.innerText = '🐞 ZERG RUSH';
    zergBtn.style.cssText = `
        position:fixed;bottom:18px;left:18px;z-index:99998;
        background:#0d0010;color:#ff00ff;font-family:"Comic Sans MS",monospace;
        font-size:15px;font-weight:bold;padding:10px 18px;
        border:2px solid #ff00ff;cursor:pointer;
        text-shadow:0 0 8px #ff00ff;box-shadow:0 0 15px rgba(255,0,255,0.4);
        letter-spacing:1px;
    `;
    zergBtn.addEventListener('click', startZergRush);
    document.body.appendChild(zergBtn);
}

function addHideButton() {
    const btn = document.createElement('button');
    btn.innerText = '🙈 HIDE PROJECTS';
    btn.style.cssText = `
        position:fixed;bottom:70px;left:18px;z-index:99998;
        background:#0d0010;color:#cc00ff;font-family:"Comic Sans MS",monospace;
        font-size:15px;font-weight:bold;padding:10px 18px;
        border:2px solid #cc00ff;cursor:pointer;
        text-shadow:0 0 8px #cc00ff;box-shadow:0 0 15px rgba(204,0,255,0.4);
        letter-spacing:1px;
    `;
    let hidden = false;
    btn.addEventListener('click', () => {
        hidden = !hidden;
        document.querySelectorAll('.project').forEach(p => {
            p.style.visibility = hidden ? 'hidden' : '';
        });
        btn.innerText = hidden ? '👁 SHOW PROJECTS' : '🙈 HIDE PROJECTS';
        btn.style.color = hidden ? '#00fff5' : '#cc00ff';
        btn.style.borderColor = hidden ? '#00fff5' : '#cc00ff';
        btn.style.textShadow = hidden ? '0 0 8px #00fff5' : '0 0 8px #cc00ff';
        btn.style.boxShadow = hidden ? '0 0 15px rgba(0,255,245,0.4)' : '0 0 15px rgba(204,0,255,0.4)';
    });
    document.body.appendChild(btn);
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
    addCardMarquees();
    animateH2s();
    cycleBorders();
    addZergButton();
    addHideButton();
});

// =============================================
// COSMIC AQUATIC ECOSYSTEM
// =============================================

(function() {

const canvas = document.createElement('canvas');
canvas.id = 'ecosystem-canvas';
canvas.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;`;
document.addEventListener('DOMContentLoaded', () => document.body.prepend(canvas));

const ctx = canvas.getContext('2d');
let W, H;

function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
window.addEventListener('load', resize);
window.addEventListener('resize', resize);

const rnd   = (a,b) => a + Math.random()*(b-a);
const pick  = arr  => arr[Math.floor(Math.random()*arr.length)];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

const PALETTE = ['#ff00ff','#cc00ff','#ff6ec7','#00fff5','#ff2d78','#ff6b35','#dd88ff','#ffffaa','#aaffff'];

// =====================
// DAY/NIGHT CYCLE
// =====================
let dayPhase = 0; // 0=day 1=night, cycles over DAY_LEN frames
const DAY_LEN = 7200; // ~2 min full cycle
let dayT = 0; // 0..1

function updateDayNight() {
    dayT = (Math.sin(dayPhase * Math.PI * 2 / DAY_LEN) + 1) / 2; // 0=night 1=day
    dayPhase = (dayPhase + 1) % DAY_LEN;
}

function drawDayNight() {
    // Overlay tint: deep blue at night, transparent at day
    const nightAlpha = (1 - dayT) * 0.45;
    if (nightAlpha > 0.01) {
        ctx.globalAlpha = nightAlpha;
        ctx.fillStyle = '#000033';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
    }
}

// =====================
// FOOD BLOOMS
// =====================
let foodBlooms = [];
let isDragging = false;
let dragBloomTimer = 0;

function addFoodBloom(x, y) {
    foodBlooms.push({ x, y, r: 60, life: 300, maxLife: 300 });
}

function updateDrawBlooms() {
    foodBlooms = foodBlooms.filter(b => b.life > 0);
    foodBlooms.forEach(b => {
        b.life--;
        const alpha = (b.life / b.maxLife) * 0.4;
        ctx.globalAlpha = alpha;
        const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grd.addColorStop(0, '#00ffaa');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
    });
}

// =====================
// CELESTIAL
// =====================
class Star {
    constructor() { this.reset(true); }
    reset(init) {
        this.x = rnd(0,W||1200); this.y = rnd(0,H||800);
        this.r = rnd(0.3,1.8); this.spd = rnd(0.02,0.15);
        this.dir = rnd(0,Math.PI*2); this.twinkle = rnd(0,Math.PI*2);
        this.twinkleSpd = rnd(0.02,0.05);
        this.color = pick(['#ffffff','#ffe8ff','#e8e8ff','#ffd0ff','#d0ffff']);
    }
    update() {
        this.x += Math.cos(this.dir)*this.spd; this.y += Math.sin(this.dir)*this.spd;
        this.twinkle += this.twinkleSpd;
        if(this.x<-5||this.x>W+5||this.y<-5||this.y>H+5) this.reset(false);
    }
    draw() {
        const alpha = (0.4 + 0.5*Math.sin(this.twinkle)) * (0.4 + 0.6*dayT);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class Planet {
    constructor() { this.reset(true); }
    reset(init) {
        this.r = rnd(18,52);
        this.x = init ? rnd(0,W||1200) : (Math.random()<0.5 ? -this.r-10 : (W||1200)+this.r+10);
        this.y = rnd(this.r,(H||800)-this.r);
        this.spd = rnd(0.04,0.2);
        this.dx = (this.x<0?1:-1)*this.spd; this.dy = rnd(-0.04,0.04);
        this.color = pick(PALETTE); this.color2 = pick(PALETTE);
        this.rings = Math.random()<0.4; this.ringTilt = rnd(0.2,0.6);
        this.rot = rnd(0,Math.PI*2); this.rotSpd = rnd(-0.004,0.004);
        this.grav = this.r*7; this.mass = this.r*0.5;
    }
    update() {
        this.x+=this.dx; this.y+=this.dy; this.rot+=this.rotSpd;
        if(this.x<-this.r-60||this.x>W+this.r+60) this.reset(false);
    }
    draw() {
        ctx.save(); ctx.translate(this.x,this.y);
        const grd = ctx.createRadialGradient(0,0,this.r*0.5,0,0,this.r*2);
        grd.addColorStop(0,this.color+'22'); grd.addColorStop(1,'transparent');
        ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(0,0,this.r*2,0,Math.PI*2); ctx.fill();
        const bg = ctx.createRadialGradient(-this.r*0.3,-this.r*0.3,this.r*0.1,0,0,this.r);
        bg.addColorStop(0,'#ffffff33'); bg.addColorStop(0.4,this.color); bg.addColorStop(1,this.color2);
        ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
        if(this.rings) {
            ctx.save(); ctx.scale(1,this.ringTilt);
            ctx.strokeStyle=this.color+'88'; ctx.lineWidth=this.r*0.16;
            ctx.beginPath(); ctx.arc(0,0,this.r*1.55,0,Math.PI*2); ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }
}

class Galaxy {
    constructor() { this.reset(true); }
    reset(init) {
        this.r = rnd(40,100);
        this.x = init ? rnd(0,W||1200) : (Math.random()<0.5 ? -this.r-20 : (W||1200)+this.r+20);
        this.y = rnd(this.r,(H||800)-this.r);
        this.spd = rnd(0.01,0.07); this.dx = (this.x<0?1:-1)*this.spd;
        this.rot = rnd(0,Math.PI*2); this.rotSpd = rnd(-0.002,0.002);
        this.arms = Math.floor(rnd(2,5));
        this.color = pick(PALETTE); this.color2 = pick(PALETTE);
        this.grav = this.r*6; this.mass = this.r*0.3;
    }
    update() { this.x+=this.dx; this.rot+=this.rotSpd; if(this.x<-this.r-80||this.x>W+this.r+80) this.reset(false); }
    draw() {
        ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.rot);
        const cg = ctx.createRadialGradient(0,0,0,0,0,this.r*0.4);
        cg.addColorStop(0,'#ffffff66'); cg.addColorStop(0.3,this.color+'99'); cg.addColorStop(1,'transparent');
        ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(0,0,this.r*0.4,0,Math.PI*2); ctx.fill();
        for(let a=0;a<this.arms;a++) {
            ctx.save(); ctx.rotate((Math.PI*2/this.arms)*a);
            const ag = ctx.createLinearGradient(0,0,this.r,0);
            ag.addColorStop(0,this.color+'88'); ag.addColorStop(1,'transparent');
            ctx.strokeStyle=ag; ctx.lineWidth=this.r*0.15;
            ctx.beginPath(); ctx.moveTo(0,0);
            for(let t=0;t<1;t+=0.03){ const ang=t*Math.PI*1.5,rad=t*this.r; ctx.lineTo(Math.cos(ang)*rad,Math.sin(ang)*rad); }
            ctx.stroke(); ctx.restore();
        }
        ctx.restore();
    }
}

// =====================
// CREATURES
// =====================
let generationCount = 0;
let creatureIdCounter = 0;

const SPECIES_DEFS = {
    jellyfish:  {diet:'herb',baseColor:'#dd88ff',size:[8,16],  speed:[0.4,1.0],sense:60, reproduce:0.008, activeAtNight:true },
    manta:      {diet:'herb',baseColor:'#00fff5',size:[14,24], speed:[0.3,0.8],sense:80, reproduce:0.007, activeAtNight:false},
    seahorse:   {diet:'herb',baseColor:'#ff6ec7',size:[6,12],  speed:[0.2,0.5],sense:40, reproduce:0.009, activeAtNight:false},
    shark:      {diet:'carn',baseColor:'#cc00ff',size:[18,32], speed:[0.6,1.4],sense:120,reproduce:0.004, activeAtNight:true },
    anglerfish: {diet:'carn',baseColor:'#ff2d78',size:[14,26], speed:[0.3,0.9],sense:100,reproduce:0.004, activeAtNight:true },
    leviathan:  {diet:'apex',baseColor:'#ff6b35',size:[28,50], speed:[0.2,0.6],sense:160,reproduce:0.0015,activeAtNight:true },
};

let creatures = [];
let evoLog = [];

// Population history for graph (sample every 120 frames)
let popHistory = { jellyfish:[], manta:[], seahorse:[], shark:[], anglerfish:[], leviathan:[] };
const POP_HISTORY_MAX = 120;

// Trait history for trait tracking
let traitHistory = {}; // species -> [{gen, avgSize, avgSpeed}]

function spawnCreature(speciesKey, x, y, parent) {
    const def = SPECIES_DEFS[speciesKey];
    const mutate = (v,range) => parent ? clamp(v+rnd(-range*2,range*2),range*0.05,range*25) : v;
    const id = creatureIdCounter++;
    return {
        id, species:speciesKey, diet:def.diet,
        x:x??rnd(50,W-50), y:y??rnd(50,H-50),
        vx:rnd(-0.5,0.5), vy:rnd(-0.5,0.5),
        size:      parent?mutate(parent.size,1.2)      :rnd(def.size[0],  def.size[1]),
        speed:     parent?mutate(parent.speed,0.08)    :rnd(def.speed[0], def.speed[1]),
        sense:     parent?mutate(parent.sense,6)       :def.sense,
        reproduce: parent?clamp(parent.reproduce+rnd(-0.0005,0.0008),0.0001,0.02):def.reproduce,
        color:     parent?mutateColor(parent.color)    :def.baseColor,
        energy:200, age:0, maxAge:rnd(2000,6000), reproduced:false,
        frame:Math.random()*Math.PI*2, generation:parent?parent.generation+1:0,
        parentId: parent ? parent.id : null,
        _wanderAngle:Math.random()*Math.PI*2, _scared:0,
        _newborn: parent ? 60 : 0, // glow timer for mutation highlight
        _children: [],
    };
}

function mutateColor(hex) {
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return '#'+[r,g,b].map(v=>clamp(v+Math.floor(rnd(-25,25)),0,255).toString(16).padStart(2,'0')).join('');
}

function initCreatures() {
    Object.keys(SPECIES_DEFS).forEach(k => {
        const n = k==='leviathan'?2:k==='shark'||k==='anglerfish'?5:10;
        for(let i=0;i<n;i++) creatures.push(spawnCreature(k));
    });
}

// ---- Drawing ----
function drawCreature(c) {
    if(c._scared>0) c._scared--;
    if(c._newborn>0) c._newborn--;
    ctx.save();
    ctx.translate(c.x,c.y);
    ctx.rotate(Math.atan2(c.vy,c.vx));
    const s=c.size;
    c.frame += 0.05*c.speed*(c._scared>0?2:1);
    const w=Math.sin(c.frame)*s*0.15;

    // Night dimming for day-only species
    const def = SPECIES_DEFS[c.species];
    const nightDim = def.activeAtNight ? 1.0 : 0.3 + 0.7*dayT;

    // Newborn glow highlight
    if(c._newborn>0) {
        const glowAlpha = (c._newborn/60)*0.7;
        ctx.globalAlpha = glowAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0,0,s*1.6,0,Math.PI*2); ctx.fill();
    }

    ctx.globalAlpha = clamp(c.energy/120,0.3,1.0) * nightDim;
    ctx.fillStyle = c._scared>0 ? '#ffffff' : c.color;

    switch(c.species) {
        case 'jellyfish':  drawJellyfish(c,s,w); break;
        case 'manta':      drawManta(c,s,w); break;
        case 'seahorse':   drawSeahorse(c,s,w); break;
        case 'shark':      drawShark(c,s,w); break;
        case 'anglerfish': drawAnglerfish(c,s,w); break;
        case 'leviathan':  drawLeviathan(c,s,w); break;
    }

    // Inspected creature highlight
    if(c === inspectedCreature) {
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.arc(0,0,s+6,0,Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.restore();
}

function drawJellyfish(c,s,w) {
    ctx.fillStyle=c.color+'99';
    ctx.beginPath(); ctx.ellipse(0,0,s*0.7,s*0.5,0,Math.PI,0); ctx.fill();
    ctx.fillStyle=c.color+'44';
    ctx.beginPath(); ctx.ellipse(0,0,s*0.7,s*0.5,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=c.color+'66'; ctx.lineWidth=1;
    for(let i=-2;i<=2;i++){
        ctx.beginPath(); ctx.moveTo(i*s*0.15,s*0.5);
        ctx.quadraticCurveTo(i*s*0.2+w,s+w,i*s*0.1,s*1.3+Math.abs(w)); ctx.stroke();
    }
}
function drawManta(c,s,w) {
    ctx.fillStyle=c.color+'cc';
    ctx.beginPath(); ctx.moveTo(s*0.8,0);
    ctx.quadraticCurveTo(0,-s*0.5+w,-s*0.8,0);
    ctx.quadraticCurveTo(0,s*0.3-w,s*0.8,0); ctx.fill();
    ctx.strokeStyle=c.color+'66'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-s*0.8,0); ctx.quadraticCurveTo(-s*1.0,w*0.5,-s*1.3,w); ctx.stroke();
}
function drawSeahorse(c,s,w) {
    ctx.strokeStyle=c.color; ctx.lineWidth=s*0.22; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(0,-s*0.6);
    ctx.quadraticCurveTo(s*0.3,0,w*0.3,s*0.4);
    ctx.quadraticCurveTo(-s*0.3,s*0.7,0,s*0.8); ctx.stroke();
    ctx.fillStyle=c.color; ctx.beginPath();
    ctx.ellipse(s*0.1,-s*0.6,s*0.2,s*0.14,0.5,0,Math.PI*2); ctx.fill();
}
function drawShark(c,s,w) {
    ctx.fillStyle=c.color+'cc';
    ctx.beginPath(); ctx.moveTo(s,0);
    ctx.quadraticCurveTo(0,-s*0.25+w*0.2,-s,0);
    ctx.quadraticCurveTo(0,s*0.2-w*0.2,s,0); ctx.fill();
    ctx.fillStyle=c.color;
    ctx.beginPath(); ctx.moveTo(0,-s*0.18); ctx.lineTo(-s*0.1,-s*0.5); ctx.lineTo(-s*0.25,-s*0.18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s,0); ctx.lineTo(-s*1.3+w,-s*0.3); ctx.lineTo(-s*1.3-w,s*0.3); ctx.fill();
}
function drawAnglerfish(c,s,w) {
    ctx.fillStyle=c.color+'bb';
    ctx.beginPath(); ctx.ellipse(0,0,s*0.8,s*0.6,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=c.color+'88'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(s*0.6,-s*0.3); ctx.quadraticCurveTo(s*1.0,-s*0.8+w,s*0.9,-s*0.9); ctx.stroke();
    ctx.fillStyle='#ffffaa';
    ctx.beginPath(); ctx.arc(s*0.9,-s*0.9,s*0.1,0,Math.PI*2); ctx.fill();
}
function drawLeviathan(c,s,w) {
    ctx.fillStyle=c.color+'99';
    ctx.beginPath(); ctx.moveTo(s,0);
    ctx.bezierCurveTo(s*0.3,-s*0.4+w,-s*0.3,s*0.4-w,-s,0);
    ctx.bezierCurveTo(-s*0.3,s*0.3,s*0.3,-s*0.3,s,0); ctx.fill();
    ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.arc(s*0.7,-s*0.1,s*0.07,0,Math.PI*2); ctx.fill();
}

// ---- AI ----
// godMode settings
let godMode = { foodMult:1.0, aggrMult:1.0, mutMult:1.0 };

function updateCreature(c, planets, galaxies, stars) {
    c.age++;
    const drainMult = c.reproduced ? 1.0 : 0.08;
    const def = SPECIES_DEFS[c.species];
    // Night penalty for day species
    const nightPenalty = def.activeAtNight ? 1.0 : (0.3 + 0.7*dayT);
    c.energy -= (0.012 + c.size*0.0003) * drainMult * nightPenalty;
    c.energy += 0.35 * godMode.foodMult;
    if(c.age>c.maxAge||c.energy<=0) return false;

    // Zerg rush: creatures flee screen edges
    if(window._zergActive) {
        const edgeFear = 150;
        if(c.x < edgeFear) { c.vx += 0.08; c._scared = Math.max(c._scared, 10); }
        if(c.x > W-edgeFear) { c.vx -= 0.08; c._scared = Math.max(c._scared, 10); }
        if(c.y < edgeFear) { c.vy += 0.08; c._scared = Math.max(c._scared, 10); }
        if(c.y > H-edgeFear) { c.vy -= 0.08; c._scared = Math.max(c._scared, 10); }
    }

    let desiredX=c.vx, desiredY=c.vy, dominated=false;

    if(c._scared>0) {
        c._wanderAngle = Math.atan2(c.vy,c.vx);
    } else {
        // Flee threat
        if(c.diet==='herb'||c.diet==='carn') {
            let nDist=Infinity,threat=null;
            creatures.forEach(t=>{
                if(t===c||t._dead) return;
                const is=(c.diet==='herb'&&(t.diet==='carn'||t.diet==='apex'))||(c.diet==='carn'&&t.diet==='apex');
                if(!is) return;
                const dx=c.x-t.x,dy=c.y-t.y,d=Math.sqrt(dx*dx+dy*dy);
                if(d<c.sense*1.5&&d<nDist){nDist=d;threat={dx,dy,d};}
            });
            if(threat){desiredX=threat.dx/threat.d*c.speed;desiredY=threat.dy/threat.d*c.speed;dominated=true;}
        }
        // Hunt
        if(!dominated&&(c.diet==='carn'||c.diet==='apex')) {
            const aggrSense = c.sense * godMode.aggrMult;
            let nDist=Infinity,prey=null;
            creatures.forEach(p=>{
                if(p===c||p._dead) return;
                const is=(c.diet==='carn'&&p.diet==='herb')||(c.diet==='apex'&&(p.diet==='herb'||p.diet==='carn'));
                if(!is) return;
                const dx=p.x-c.x,dy=p.y-c.y,d=Math.sqrt(dx*dx+dy*dy);
                if(d<aggrSense&&d<nDist){nDist=d;prey={dx,dy,d,p};}
            });
            if(prey){
                desiredX=prey.dx/prey.d*c.speed;desiredY=prey.dy/prey.d*c.speed;dominated=true;
                if(prey.d<c.size+prey.p.size){c.energy+=prey.p.size*8;prey.p._dead=true;}
            }
            [...planets,...galaxies].forEach(obj=>{
                const dx=obj.x-c.x,dy=obj.y-c.y,dist=Math.sqrt(dx*dx+dy*dy);
                if(dist<obj.r*1.8){desiredX-=(dx/dist)*c.speed;desiredY-=(dy/dist)*c.speed;dominated=true;}
            });
        }
        // Herbivore: orbit celestial, seek food bloom
        if(!dominated&&c.diet==='herb') {
            // Food blooms override celestial
            let nearestBloom=null,bDist=Infinity;
            foodBlooms.forEach(b=>{
                const dx=b.x-c.x,dy=b.y-c.y,d=Math.sqrt(dx*dx+dy*dy);
                if(d<b.r*2&&d<bDist){bDist=d;nearestBloom={dx,dy,d,b};}
            });
            if(nearestBloom){
                desiredX=nearestBloom.dx/nearestBloom.d*c.speed;
                desiredY=nearestBloom.dy/nearestBloom.d*c.speed;
                dominated=true;
                if(nearestBloom.d<nearestBloom.b.r) c.energy+=1.5*godMode.foodMult;
            }

            if(!dominated){
                let best=null,bestScore=Infinity;
                [...planets,...galaxies].forEach(obj=>{
                    const dx=obj.x-c.x,dy=obj.y-c.y,dist=Math.sqrt(dx*dx+dy*dy);
                    const score=Math.abs(dist-obj.r*1.6);
                    if(dist<obj.grav&&score<bestScore){bestScore=score;best={dx,dy,dist,obj};}
                    if(dist<obj.r*1.2) c.energy-=0.4;
                    else if(dist<obj.r*3.0) c.energy+=1.4*godMode.foodMult;
                });
                if(best){
                    const orb=best.obj.r*1.6,diff=best.dist-orb;
                    if(Math.abs(diff)>orb*0.2){
                        const dir=diff>0?1:-1;
                        desiredX=(best.dx/best.dist)*dir*c.speed;
                        desiredY=(best.dy/best.dist)*dir*c.speed;
                        dominated=true;
                    }
                }
            }
            // Stars
            stars.forEach(s=>{
                const dx=s.x-c.x,dy=s.y-c.y,d=Math.sqrt(dx*dx+dy*dy);
                if(d<80) c.energy+=0.4*godMode.foodMult;
            });
            // Herbivore passive
            c.energy += 0.3*godMode.foodMult;
        }
        if(!dominated){
            c._wanderAngle+=clamp(rnd(-0.03,0.03),-0.025,0.025);
            desiredX=Math.cos(c._wanderAngle)*c.speed;
            desiredY=Math.sin(c._wanderAngle)*c.speed;
        }
    }

    if(c._scared<=0){
        const maxTurn=0.015;
        c.vx+=clamp((desiredX-c.vx)*0.025,-maxTurn,maxTurn);
        c.vy+=clamp((desiredY-c.vy)*0.025,-maxTurn,maxTurn);
    }
    const spd=Math.sqrt(c.vx*c.vx+c.vy*c.vy);
    const maxSpd=c._scared>0?c.speed*3.5:c.speed;
    if(spd>maxSpd){c.vx=c.vx/spd*maxSpd;c.vy=c.vy/spd*maxSpd;}
    if(c._scared>0){c.vx*=0.97;c.vy*=0.97;}
    if(spd<0.05&&c._scared<=0){c.vx+=rnd(-0.04,0.04);c.vy+=rnd(-0.04,0.04);}

    const pad=80;
    if(c.x<pad)c.vx+=0.05;if(c.x>W-pad)c.vx-=0.05;
    if(c.y<pad)c.vy+=0.05;if(c.y>H-pad)c.vy-=0.05;

    c.x+=c.vx; c.y+=c.vy;

    // Reproduce
    const reproRate = c.reproduce * godMode.mutMult;
    if(c.energy>55&&Math.random()<reproRate&&creatures.length<280){
        c.reproduced=true;
        c.energy*=0.65;
        const child=spawnCreature(c.species,c.x+rnd(-20,20),c.y+rnd(-20,20),c);
        c._children.push(child.id);
        creatures.push(child);
        if(child.generation>generationCount){
            generationCount=child.generation;
            if(evoLog.length<20) evoLog.push(`Gen ${child.generation}: ${child.species}`);
        }
        // Record trait snapshot
        if(!traitHistory[c.species]) traitHistory[c.species]=[];
        const sp=creatures.filter(x=>x.species===c.species);
        if(sp.length>0){
            const avgSz=sp.reduce((a,x)=>a+x.size,0)/sp.length;
            const avgSpd=sp.reduce((a,x)=>a+x.speed,0)/sp.length;
            traitHistory[c.species].push({gen:child.generation,avgSize:avgSz,avgSpeed:avgSpd});
            if(traitHistory[c.species].length>50) traitHistory[c.species].shift();
        }
    }
    c.energy=clamp(c.energy,0,200);
    return true;
}

// =====================
// INSPECT PANEL
// =====================
let inspectedCreature = null;
let inspectPanel = null;

function createInspectPanel() {
    inspectPanel = document.createElement('div');
    inspectPanel.id = 'eco-inspect';
    inspectPanel.style.cssText = `
        position:fixed;top:50%;right:16px;transform:translateY(-50%);
        background:#0d0010ee;border:1px solid #cc00ff;color:#e8d5f5;
        font-family:'Share Tech Mono',monospace;font-size:11px;
        padding:12px;z-index:9000;min-width:180px;max-width:220px;
        display:none;line-height:1.6;pointer-events:auto;
    `;
    document.body.appendChild(inspectPanel);
}

function updateInspectPanel() {
    if(!inspectedCreature||!inspectPanel) return;
    const c=inspectedCreature;
    // Check still alive
    if(!creatures.includes(c)){ closeInspect(); return; }
    const def=SPECIES_DEFS[c.species];
    const parent=creatures.find(x=>x.id===c.parentId);
    const children=c._children.length;
    const livingChildren = creatures.filter(x => x.parentId === c.id).length;
    inspectPanel.innerHTML = `
        <div style="color:${def.baseColor};font-size:13px;margin-bottom:6px">◈ ${c.species.toUpperCase()}</div>
        <div>gen: <b style="color:#ff6ec7">${c.generation}</b></div>
        <div>energy: <b style="color:${c.energy>100?'#00fff5':'#ff2d78'}">${Math.round(c.energy)}</b></div>
        <div>size: ${c.size.toFixed(1)}</div>
        <div>speed: ${c.speed.toFixed(2)}</div>
        <div>sense: ${c.sense.toFixed(0)}</div>
        <div>repro rate: ${c.reproduce.toFixed(4)}</div>
        <div>age: ${c.age} / ${Math.round(c.maxAge)}</div>
        <div>diet: <b>${c.diet}</b></div>
        <div>reproduced: <b style="color:${c.reproduced?'#00fff5':'#ff6b35'}">${c.reproduced}</b></div>
        <div>children: ${children}</div>
        <div>living children: ${livingChildren}</div>
        <div>parent: ${parent?parent.species:'none'}</div>
        <div style="color:#9b7db5;margin-top:6px;font-size:10px">right-click again to close</div>
    `;
    inspectPanel.style.display='block';
}

function closeInspect() {
    inspectedCreature=null;
    if(inspectPanel) inspectPanel.style.display='none';
}

// =====================
// POPULATION GRAPH
// =====================
let graphCanvas, graphCtx;
let showGraph = false;

function createGraphPanel() {
    graphCanvas = document.createElement('canvas');
    graphCanvas.width = 240; graphCanvas.height = 120;
    graphCanvas.style.cssText = `
        position:fixed;bottom:130px;right:16px;z-index:9000;
        border:1px solid #cc00ff44;display:none;background:#0d0010cc;
        pointer-events:none;
    `;
    document.body.appendChild(graphCanvas);
    graphCtx = graphCanvas.getContext('2d');
}

function drawGraph() {
    if(!showGraph) return;
    const gc=graphCtx, gw=graphCanvas.width, gh=graphCanvas.height;
    gc.clearRect(0,0,gw,gh);
    gc.fillStyle='#0d0010cc';
    gc.fillRect(0,0,gw,gh);

    const species=Object.keys(popHistory);
    const maxPop=Math.max(10,...species.flatMap(s=>popHistory[s]));

    species.forEach(sp=>{
        const hist=popHistory[sp];
        if(hist.length<2) return;
        gc.strokeStyle=SPECIES_DEFS[sp].baseColor+'cc';
        gc.lineWidth=1.5;
        gc.beginPath();
        hist.forEach((v,i)=>{
            const x=(i/(POP_HISTORY_MAX-1))*gw;
            const y=gh-(v/maxPop)*(gh-4)-2;
            i===0?gc.moveTo(x,y):gc.lineTo(x,y);
        });
        gc.stroke();
    });

    // Labels
    gc.font='9px Share Tech Mono,monospace';
    let ly=10;
    species.forEach(sp=>{
        const cur=popHistory[sp][popHistory[sp].length-1]||0;
        gc.fillStyle=SPECIES_DEFS[sp].baseColor;
        gc.fillText(`${sp[0].toUpperCase()}:${cur}`,4,ly);
        ly+=10;
    });
}

// =====================
// TRAIT PANEL
// =====================
let traitPanel, showTraits=false;

function createTraitPanel() {
    traitPanel=document.createElement('div');
    traitPanel.style.cssText=`
        position:fixed;bottom:300px;left:10px;z-index:9000;
        background:#0d0010cc;border:1px solid #cc00ff44;
        color:#e8d5f5;font-family:'Share Tech Mono',monospace;font-size:10px;
        padding:8px;display:none;pointer-events:none;min-width:160px;
        line-height:1.5;
    `;
    document.body.appendChild(traitPanel);
}

function updateTraitPanel() {
    if(!showTraits||!traitPanel) return;
    let html='<div style="color:#cc00ff;margin-bottom:4px">TRAIT EVOLUTION</div>';
    Object.keys(SPECIES_DEFS).forEach(sp=>{
        const hist=traitHistory[sp];
        const cur=creatures.filter(c=>c.species===sp);
        if(cur.length===0) return;
        const avgSz=(cur.reduce((a,c)=>a+c.size,0)/cur.length).toFixed(1);
        const avgSpd=(cur.reduce((a,c)=>a+c.speed,0)/cur.length).toFixed(2);
        const minSz=Math.min(...cur.map(c=>c.size)).toFixed(1);
        const maxSz=Math.max(...cur.map(c=>c.size)).toFixed(1);
        html+=`<div style="color:${SPECIES_DEFS[sp].baseColor};margin-top:4px">${sp}</div>`;
        html+=`<div>sz: ${minSz}–${maxSz} avg:${avgSz}</div>`;
        html+=`<div>spd avg:${avgSpd}</div>`;
    });
    traitPanel.innerHTML=html;
    traitPanel.style.display='block';
}

// =====================
// GOD MODE PANEL
// =====================
let godPanel, showGod=false;

function createGodPanel() {
    godPanel=document.createElement('div');
    godPanel.id='eco-god';
    godPanel.style.cssText=`
        position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        background:#0d0010f0;border:1px solid #ff00ff;color:#e8d5f5;
        font-family:'Share Tech Mono',monospace;font-size:12px;
        padding:16px 20px;z-index:9999;display:none;min-width:260px;
        pointer-events:auto;
    `;
    godPanel.innerHTML=`
        <div style="color:#ff00ff;font-size:14px;margin-bottom:12px">⚡ GOD MODE</div>
        <div style="margin-bottom:8px">
            <label>Food Multiplier: <span id="god-food-val">1.0</span>x</label><br>
            <input id="god-food" type="range" min="0" max="5" step="0.1" value="1" style="width:100%;accent-color:#ff00ff">
        </div>
        <div style="margin-bottom:8px">
            <label>Predator Aggression: <span id="god-aggr-val">1.0</span>x</label><br>
            <input id="god-aggr" type="range" min="0" max="3" step="0.1" value="1" style="width:100%;accent-color:#cc00ff">
        </div>
        <div style="margin-bottom:8px">
            <label>Mutation Rate: <span id="god-mut-val">1.0</span>x</label><br>
            <input id="god-mut" type="range" min="0" max="5" step="0.1" value="1" style="width:100%;accent-color:#00fff5">
        </div>
        <div style="margin-bottom:8px">
            <label>Day/Night Speed: <span id="god-day-val">1.0</span>x</label><br>
            <input id="god-day" type="range" min="0.1" max="10" step="0.1" value="1" style="width:100%;accent-color:#ffff00">
        </div>
        <div style="color:#9b7db5;font-size:10px;margin-top:8px">press G or click GOD to close</div>
    `;
    document.body.appendChild(godPanel);

    let daySpeedMult=1;
    godPanel.querySelector('#god-food').addEventListener('input',e=>{
        godMode.foodMult=parseFloat(e.target.value);
        godPanel.querySelector('#god-food-val').textContent=godMode.foodMult.toFixed(1);
    });
    godPanel.querySelector('#god-aggr').addEventListener('input',e=>{
        godMode.aggrMult=parseFloat(e.target.value);
        godPanel.querySelector('#god-aggr-val').textContent=godMode.aggrMult.toFixed(1);
    });
    godPanel.querySelector('#god-mut').addEventListener('input',e=>{
        godMode.mutMult=parseFloat(e.target.value);
        godPanel.querySelector('#god-mut-val').textContent=godMode.mutMult.toFixed(1);
    });
    godPanel.querySelector('#god-day').addEventListener('input',e=>{
        daySpeedMult=parseFloat(e.target.value);
        godPanel.querySelector('#god-day-val').textContent=daySpeedMult.toFixed(1);
        // Patch day cycle
        window._daySpeedMult=daySpeedMult;
        godPanel.querySelector('#god-day-val').textContent=daySpeedMult.toFixed(1);
    });
}

window._daySpeedMult=1;

// =====================
// HUD
// =====================
function drawHUD() {
    const counts={};
    creatures.forEach(c=>{counts[c.species]=(counts[c.species]||0)+1;});
    ctx.save(); ctx.shadowBlur=0;
    ctx.font='11px Share Tech Mono,monospace';
    let y=18;
    Object.entries(counts).forEach(([sp,n])=>{
        ctx.globalAlpha=0.75; ctx.fillStyle=SPECIES_DEFS[sp].baseColor;
        ctx.fillText(`${sp}: ${n}`,10,y); y+=14;
    });
    if(generationCount>0){ ctx.fillStyle='#dd88ff'; ctx.fillText(`max gen: ${generationCount}`,10,y+2); y+=14; }
    // Day/night indicator
    const phase = dayT > 0.5 ? 'DAY' : 'NIGHT';
    ctx.fillStyle = dayT > 0.5 ? '#ffffaa' : '#8888ff';
    ctx.fillText(phase, 10, y+2);
    ctx.globalAlpha=1; ctx.restore();
}

// =====================
// GOD BUTTON
// =====================
function addGodButton() {
    const btn=document.createElement('button');
    btn.innerText='⚡ GOD MODE';
    btn.style.cssText=`
        position:fixed;bottom:122px;left:18px;z-index:99998;
        background:#0d0010;color:#ffff00;font-family:"Comic Sans MS",monospace;
        font-size:15px;font-weight:bold;padding:10px 18px;
        border:2px solid #ffff00;cursor:pointer;
        text-shadow:0 0 8px #ffff00;box-shadow:0 0 15px rgba(255,255,0,0.4);
        letter-spacing:1px;
    `;
    btn.addEventListener('click',()=>{
        showGod=!showGod;
        godPanel.style.display=showGod?'block':'none';
    });
    document.body.appendChild(btn);

    // Graph toggle
    const gBtn=document.createElement('button');
    gBtn.innerText='📈 GRAPH';
    gBtn.style.cssText=`
        position:fixed;bottom:174px;left:18px;z-index:99998;
        background:#0d0010;color:#00fff5;font-family:"Comic Sans MS",monospace;
        font-size:15px;font-weight:bold;padding:10px 18px;
        border:2px solid #00fff5;cursor:pointer;
        text-shadow:0 0 8px #00fff5;box-shadow:0 0 15px rgba(0,255,245,0.4);
        letter-spacing:1px;
    `;
    gBtn.addEventListener('click',()=>{
        showGraph=!showGraph;
        showTraits=!showTraits;
        graphCanvas.style.display=showGraph?'block':'none';
        traitPanel.style.display=showTraits?'block':'none';
    });
    document.body.appendChild(gBtn);

    // Keyboard shortcut
    document.addEventListener('keydown',e=>{
        if(e.key==='g'||e.key==='G'){
            showGod=!showGod;
            godPanel.style.display=showGod?'block':'none';
        }
    });
}

// =====================
// INPUT
// =====================
function initInput() {
    canvas.style.pointerEvents='auto';

    // Left click/drag = food bloom + scare
    canvas.addEventListener('mousedown',e=>{
        if(e.button!==0) return;
        isDragging=true;
    });
    canvas.addEventListener('mousemove',e=>{
        if(!isDragging) return;
        const rect=canvas.getBoundingClientRect();
        dragBloomTimer++;
        if(dragBloomTimer%8===0) addFoodBloom(e.clientX-rect.left, e.clientY-rect.top);
    });
    canvas.addEventListener('mouseup',e=>{
        if(e.button!==0) return;
        isDragging=false;
        dragBloomTimer=0;
        // Single click = scare nearby
        const rect=canvas.getBoundingClientRect();
        const mx=e.clientX-rect.left, my=e.clientY-rect.top;
        creatures.forEach(c=>{
            const dx=c.x-mx,dy=c.y-my,d=Math.sqrt(dx*dx+dy*dy);
            if(d<c.size*5+35&&d>0){
                const force=clamp((c.size*2.5+20-d)/(c.size*2.5+20),0.2,1.0);
                const angle=Math.atan2(dy,dx);
                const spread=rnd(-0.6,0.6);
                c.vx=Math.cos(angle+spread)*c.speed*3.5*force;
                c.vy=Math.sin(angle+spread)*c.speed*3.5*force;
                c._wanderAngle=angle+spread; c._scared=80;
            }
        });
    });

    // Right click = inspect creature
    canvas.addEventListener('mousedown',e=>{
        
        if(inspectedCreature){ closeInspect(); return; }
        const rect=canvas.getBoundingClientRect();
        const mx=e.clientX-rect.left, my=e.clientY-rect.top;
        let nearest=null,nDist=Infinity;
        creatures.forEach(c=>{
            const dx=c.x-mx,dy=c.y-my,d=Math.sqrt(dx*dx+dy*dy);
            if(d<c.size*4+100&&d<nDist){nDist=d;nearest=c;}
        });
        if(nearest){ inspectedCreature=nearest; updateInspectPanel(); }
    });

    // Touch drag for food blooms
    canvas.addEventListener('touchmove',e=>{
        e.preventDefault();
        const rect=canvas.getBoundingClientRect();
        const t=e.touches[0];
        dragBloomTimer++;
        if(dragBloomTimer%8===0) addFoodBloom(t.clientX-rect.left,t.clientY-rect.top);
    },{passive:false});
    canvas.addEventListener('touchend',()=>{ isDragging=false; dragBloomTimer=0; });
}

// =====================
// INIT & LOOP
// =====================
const stars   = Array.from({length:140}, ()=>new Star());
const planets = Array.from({length:5},   ()=>new Planet());
const galaxies= Array.from({length:2},   ()=>new Galaxy());

window.addEventListener('load',()=>{
    resize();
    initCreatures();
    createInspectPanel();
    createGraphPanel();
    createTraitPanel();
    createGodPanel();
    addGodButton();
    initInput();
    loop();
});

let frameCount=0;
const GEN_INTERVAL=3600;

function loop() {
    requestAnimationFrame(loop);
    if(!W||!H) return;
    frameCount++;

    updateDayNight();
    // Advance day phase by speed multiplier
    for(let i=1;i<Math.floor(window._daySpeedMult||1);i++) updateDayNight();

    ctx.clearRect(0,0,W,H);
    ctx.shadowBlur=0;

    drawDayNight();
    updateDrawBlooms();

    if(frameCount%2===0) stars.forEach(s=>s.update());
    stars.forEach(s=>s.draw());
    galaxies.forEach(g=>{g.update();g.draw();});
    planets.forEach(p=>{p.update();p.draw();});
    ctx.shadowBlur=0;

    creatures=creatures.filter(c=>{ if(c._dead) return false; return updateCreature(c,planets,galaxies,stars); });

    if(frameCount%GEN_INTERVAL===0&&frameCount>0){
        const eligible=creatures.filter(c=>!c.reproduced&&c.energy>40&&creatures.length<280);
        eligible.forEach(c=>{
            c.reproduced=true;
            const child=spawnCreature(c.species,c.x+rnd(-30,30),c.y+rnd(-30,30),c);
            c._children.push(child.id);
            creatures.push(child);
            if(child.generation>generationCount){ generationCount=child.generation; }
        });
        creatures.forEach(c=>{ c.energy=Math.min(c.energy+60,200); });
    }

    Object.keys(SPECIES_DEFS).forEach(k=>{
        if(!creatures.some(c=>c.species===k)){
            const n=k==='leviathan'?1:k==='shark'||k==='anglerfish'?2:4;
            for(let i=0;i<n;i++) creatures.push(spawnCreature(k));
        }
    });

    ctx.shadowBlur=0;
    creatures.forEach(c=>drawCreature(c));
    ctx.shadowBlur=0; ctx.globalAlpha=1;

    // Population history sample
    if(frameCount%120===0){
        const counts={};
        creatures.forEach(c=>{counts[c.species]=(counts[c.species]||0)+1;});
        Object.keys(SPECIES_DEFS).forEach(sp=>{
            popHistory[sp].push(counts[sp]||0);
            if(popHistory[sp].length>POP_HISTORY_MAX) popHistory[sp].shift();
        });
    }

    drawHUD();
    drawGraph();
    updateTraitPanel();
    if(inspectedCreature) updateInspectPanel();
}

})();
