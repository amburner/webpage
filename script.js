// =============================================
// AMBER MILLER — MAXIMUM CHAOS EDITION
// =============================================

// ---------- Rainbow H1 letters ----------
function rainbowifyH1() {
    const h1 = document.querySelector('h1');
    if (!h1) return;
    const text = h1.innerText;
    h1.innerHTML = text.split('').map(ch =>
        ch === ' ' ? ' ' : `<span class="rainbow-letter">${ch}</span>`
    ).join('');
}

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
        mq.style.cssText = `background:#ff00ff;color:yellow;font-weight:bold;font-size:11px;padding:2px 0;border-top:2px dashed yellow;margin-top:6px;display:block;`;
        mq.innerText = msgs[i % msgs.length];
        s.parentElement.insertBefore(mq, s.nextSibling);
    });
}

// ---------- Sparkle effect ----------
let lastSparkTime = 0;
let sparkActive = true;
const symbols = ['✶','★','⚡','💥','✨','🌟','☆','◆','♦','❋','+','˚'];
const neonColors = ['#ff00ff','#00ffff','#ffff00','#ff0000','#00ff00','#ff7700','#ff00aa','#00aaff'];

function createSparkle(e) {
    const currentTime = Date.now();
    if (sparkActive == true) {
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
}
document.addEventListener('mousemove', createSparkle);
document.addEventListener('touchmove', createSparkle);

// ---------- Pulsing h2 colors ----------
function animateH2s() {
    const colors = ['#ff0000','#ff7700','#cc00cc','#0000cc','#007700','#cc6600'];
    let idx = 0;
    setInterval(() => {
        document.querySelectorAll('h2').forEach(el => { el.style.color = colors[idx % colors.length]; });
        idx++;
    }, 600);
}

// ---------- Cycling card borders ----------
function cycleBorders() {
    const cards = document.querySelectorAll('.project');
    const borders = ['#ff00ff','#00ffff','#ffff00','#ff0000','#00ff00','#ff7700'];
    let i = 0;
    setInterval(() => {
        cards.forEach((card, ci) => {
            if (!card._zergDead) card.style.borderColor = borders[(i + ci) % borders.length];
        });
        i++;
    }, 400);
}

// =============================================
// ZERG RUSH MINIGAME
// =============================================

const ZERGLING_FRAMES = ['ᗤ','ᗣ','ᗡ','ᗢ'];  // rotating zergling glyphs
const ZERGLING_COLORS = ['#aa0000','#cc2200','#ff3300','#dd1100'];
const BITE_CHARS = [' ',' ','·','░'];  // border degradation chars

let zergGameActive = false;
let zerglings = [];
let zergInterval = null;
let zergSpawnInterval = null;
let zergScore = 0;
let zergScoreEl = null;
let zergBtn = null;

// Each card tracks its border health per side: top, right, bottom, left (0-100)
// We visualise health by changing border-width and border-style
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

    // Interpolate border width: 6px at 100hp → 0px at 0hp
    const w = Math.round((hp / 100) * 6);
    // Style degrades: double → solid → dashed → dotted → none
    const styleIdx = Math.min(BORDER_STYLES.length - 1, Math.floor((1 - hp/100) * BORDER_STYLES.length));
    const style = hp <= 0 ? 'none' : BORDER_STYLES[styleIdx];

    card.style[`border-${side}-width`] = w + 'px';
    card.style[`border-${side}-style`] = style;

    // Flash damage colour
    card.style[`border-${side}-color`] = '#ff0000';
    setTimeout(() => {
        if (!card._zergDead) card.style[`border-${side}-color`] = '';
    }, 120);

    // If all sides dead, card "dies"
    if (h.top <= 0 && h.right <= 0 && h.bottom <= 0 && h.left <= 0) {
        destroyCard(card);
    }
}

function destroyCard(card) {
    card._zergDead = true;
    card.style.border = 'none';
    card.style.opacity = '0.35';
    card.style.filter = 'grayscale(1)';

    // Explosion effect
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

// ---- Zergling object ----
function createZergling(targetCard, targetSide) {
    const rect = targetCard.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Spawn off-screen edge matching side
    let startX, startY, targetX, targetY;
    const margin = 40;

    switch (targetSide) {
        case 'top':
            targetX = rect.left + scrollX + Math.random() * rect.width;
            targetY = rect.top  + scrollY;
            startX  = targetX + (Math.random()-0.5)*60;
            startY  = targetY - 80 - Math.random()*60;
            break;
        case 'bottom':
            targetX = rect.left + scrollX + Math.random() * rect.width;
            targetY = rect.bottom + scrollY;
            startX  = targetX + (Math.random()-0.5)*60;
            startY  = targetY + 80 + Math.random()*60;
            break;
        case 'left':
            targetX = rect.left + scrollX;
            targetY = rect.top  + scrollY + Math.random() * rect.height;
            startX  = targetX - 80 - Math.random()*60;
            startY  = targetY + (Math.random()-0.5)*60;
            break;
        case 'right':
            targetX = rect.right + scrollX;
            targetY = rect.top   + scrollY + Math.random() * rect.height;
            startX  = targetX + 80 + Math.random()*60;
            startY  = targetY + (Math.random()-0.5)*60;
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

    // Click to kill
    el.addEventListener('click', () => killZergling(zl));
    el.addEventListener('touchstart', (e) => { e.preventDefault(); killZergling(zl); });

    const zl = {
        el,
        x: startX,
        y: startY,
        tx: targetX,
        ty: targetY,
        card: targetCard,
        side: targetSide,
        speed: 0.8 + Math.random() * 1.0,
        frame: 0,
        frameTimer: 0,
        state: 'moving',   // 'moving' | 'attacking' | 'dead'
        attackTimer: 0,
        hp: 1,
    };
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

        // Animate frame
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
            // Shake while attacking
            const shake = (Math.random()-0.5)*3;
            zl.el.style.left = (zl.tx + shake) + 'px';
            zl.el.style.top  = (zl.ty + shake) + 'px';

            // Deal damage every 20 ticks (~0.33s at 60fps)
            if (zl.attackTimer % 20 === 0) {
                if (!zl.card._zergDead) {
                    applyBorderDamage(zl.card, zl.side, 8 + Math.random()*4);
                } else {
                    // Card already dead, pick a new target
                    reassignZergling(zl);
                }
            }

            // Alternate attack glyphs
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
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    zl.card = card;
    zl.side = side;
    switch (side) {
        case 'top':    zl.tx = rect.left+scrollX+Math.random()*rect.width; zl.ty = rect.top+scrollY; break;
        case 'bottom': zl.tx = rect.left+scrollX+Math.random()*rect.width; zl.ty = rect.bottom+scrollY; break;
        case 'left':   zl.tx = rect.left+scrollX; zl.ty = rect.top+scrollY+Math.random()*rect.height; break;
        case 'right':  zl.tx = rect.right+scrollX; zl.ty = rect.top+scrollY+Math.random()*rect.height; break;
    }
    zl.state = 'moving';
    zl.attackTimer = 0;
}

function spawnWave() {
    const cards = Array.from(document.querySelectorAll('.project')).filter(c => !c._zergDead);
    if (cards.length === 0) { endZergRush(); return; }
    const sides = ['top','right','bottom','left'];
    const count = 2 + Math.floor(Math.random() * 3); // 2-4 per wave
    for (let i = 0; i < count; i++) {
        const card = cards[Math.floor(Math.random() * cards.length)];
        const side = sides[Math.floor(Math.random() * sides.length)];
        createZergling(card, side);
    }
}

function startZergRush() {
    if (zergGameActive) { endZergRush(); return; }
    zergGameActive = true;
    zergScore = 0;
    zerglings = [];
    sparkActive = false;

    // Reset card borders
    document.querySelectorAll('.project').forEach(card => {
        card._borderHealth = { top: 100, right: 100, bottom: 100, left: 100 };
        card._zergDead = false;
        card.style.opacity = '';
        card.style.filter = '';
        card.style.border = '';
    });

    // Score display
    zergScoreEl = document.createElement('div');
    zergScoreEl.id = 'zerg-score';
    zergScoreEl.style.cssText = `
        position: fixed;
        top: 10px;
        right: 14px;
        background: #000;
        color: #ff0000;
        font-family: "Comic Sans MS", monospace;
        font-size: 16px;
        font-weight: bold;
        padding: 6px 12px;
        border: 3px solid #ff0000;
        z-index: 99999;
        text-shadow: 0 0 6px #ff0000;
        pointer-events: none;
    `;
    zergScoreEl.innerText = '☠ KILLS: 0';
    document.body.appendChild(zergScoreEl);

    // Instruction flash
    const msg = document.createElement('div');
    msg.style.cssText = `
        position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        background:#000;color:#ff0000;font-family:"Comic Sans MS",monospace;
        font-size:28px;font-weight:bold;padding:20px 32px;
        border:4px solid #ff0000;z-index:99999;text-align:center;
        text-shadow:0 0 10px #ff0000;pointer-events:none;
    `;
    msg.innerHTML = '🐞 ZERG RUSH! 🐞<br><span style="font-size:16px">CLICK THE ZERGLINGS TO KILL THEM!</span>';
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2200);

    zergBtn.innerText = '🛑 END RUSH';
    zergBtn.style.background = '#ff0000';
    zergBtn.style.color = '#fff';

    // Spawn initial wave then every 2.5s
    spawnWave();
    zergSpawnInterval = setInterval(spawnWave, 2500);
    zergInterval     = setInterval(tickZerg, 16);
}

function endZergRush() {
    zergGameActive = false;
    sparkActive = true;
    clearInterval(zergInterval);
    clearInterval(zergSpawnInterval);

    // Kill all remaining zerglings
    zerglings.forEach(zl => { if (zl.el.parentNode) zl.el.remove(); });
    zerglings = [];

    // Final score
    if (zergScoreEl) {
        zergScoreEl.style.pointerEvents = 'none';
        const final = document.createElement('div');
        final.style.cssText = `
            position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
            background:#000;color:#ff0000;font-family:"Comic Sans MS",monospace;
            font-size:24px;font-weight:bold;padding:20px 32px;
            border:4px solid #ff0000;z-index:99999;text-align:center;
            text-shadow:0 0 10px #ff0000;
        `;
        final.innerHTML = `🐞 RUSH OVER 🐞<br>KILLS: ${zergScore}<br><span style="font-size:14px;cursor:pointer;color:#ffff00" id="zerg-close">[ CLOSE ]</span>`;
        document.body.appendChild(final);
        document.getElementById('zerg-close').addEventListener('click', () => final.remove());
        setTimeout(() => { if (final.parentNode) final.remove(); }, 4000);
        setTimeout(() => { if (zergScoreEl && zergScoreEl.parentNode) zergScoreEl.remove(); }, 4000);
    }

    // Restore cards
    document.querySelectorAll('.project').forEach(card => {
        card._borderHealth = undefined;
        card._zergDead = false;
        card.style.opacity = '';
        card.style.filter = '';
        card.style.border = '';
        card.style.borderTopWidth    = '';
        card.style.borderRightWidth  = '';
        card.style.borderBottomWidth = '';
        card.style.borderLeftWidth   = '';
        card.style.borderTopStyle    = '';
        card.style.borderRightStyle  = '';
        card.style.borderBottomStyle = '';
        card.style.borderLeftStyle   = '';
    });

    zergBtn.innerText = '🐞 ZERG RUSH';
    zergBtn.style.background = '#000';
    zergBtn.style.color = '#00ff00';
}

function addZergButton() {
    zergBtn = document.createElement('button');
    zergBtn.innerText = '🐞 ZERG RUSH';
    zergBtn.style.cssText = `
        position: fixed;
        bottom: 18px;
        left: 18px;
        z-index: 99998;
        background: #000;
        color: #00ff00;
        font-family: "Comic Sans MS", monospace;
        font-size: 15px;
        font-weight: bold;
        padding: 10px 18px;
        border: 3px solid #00ff00;
        cursor: pointer;
        text-shadow: 0 0 6px #00ff00;
        box-shadow: 0 0 12px #00ff00;
        letter-spacing: 1px;
    `;
    zergBtn.addEventListener('click', startZergRush);
    document.body.appendChild(zergBtn);
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
    rainbowifyH1();
    addCardMarquees();
    animateH2s();
    cycleBorders();
    addZergButton();
});
