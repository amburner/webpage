// =============================================
// COSMIC ECOSYSTEM — CREATURES & AI (REBALANCED)
// Target equilibrium: F=100, H=40, C=15, A=3
// Changes:
//   - Apex predators ONLY hunt carnivores (not herbivores)
//   - Increased maxEnergy for carnivores (200→300) and apex (200→500)
//   - Removed hard population cap (POP_CAP)
//   - Increased herbivore food absorption (2.2→4.0)
//   - Increased energy gain from kills (6→12 multiplier)
//   - Allowing natural boom-bust population cycles
// =============================================


// ─────────────────────────────────────────────────────────────────────────────
// SPATIAL HASH
// ─────────────────────────────────────────────────────────────────────────────
class SpatialHash {
    constructor(cellSize) {
        this.cs    = cellSize;
        this.cells = new Map();
    }
    _key(x, y) { return ((x/this.cs|0) << 16) ^ (y/this.cs|0); }
    clear()     { this.cells.clear(); }
    insert(c) {
        const k = this._key(c.x, c.y);
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k).push(c);
    }
    query(x, y, r) {
        const out = [], cs = this.cs;
        const x0=(x-r)/cs|0, x1=(x+r)/cs|0;
        const y0=(y-r)/cs|0, y1=(y+r)/cs|0;
        for (let cx=x0; cx<=x1; cx++)
            for (let cy=y0; cy<=y1; cy++) {
                const cell = this.cells.get((cx<<16)^cy);
                if (cell) for (const c of cell) out.push(c);
            }
        return out;
    }
}
const spatialHash = new SpatialHash(120);


// ─────────────────────────────────────────────────────────────────────────────
// SPECIES DEFINITIONS (REBALANCED)
// ─────────────────────────────────────────────────────────────────────────────
let generationCount = 0, creatureIdCounter = 0;

const SPECIES_DEFS = {
    //          diet    colour      size       speed       sense  breed/frame  hungry@   night?   breedAge  cooldown  litter      maxAge         maxEnergy
    jellyfish:  { diet:'herb', baseColor:'#dd88ff', size:[8,16],   speed:[0.4,1.0],  sense:80,  reproduce:0.0009, hunger:80, seekMate:120, mateMin: 80, mateR: 2.5*80, activeAtNight:true,  minBreedAge:300,  breedCooldown:400,  litterSize:[1,3], maxAge:[2500,5000], spawnEnergy:80, maxEnergy:200},
    manta:      { diet:'herb', baseColor:'#00fff5', size:[14,24],  speed:[0.3,0.8],  sense:90,  reproduce:0.0009, hunger:90, seekMate:120, mateMin: 80, mateR: 2.5*90, activeAtNight:true, minBreedAge:400,  breedCooldown:500,  litterSize:[1,2], maxAge:[3000,6000], spawnEnergy:80, maxEnergy:200},
    seahorse:   { diet:'herb', baseColor:'#ff6ec7', size:[6,12],   speed:[0.2,0.5],  sense:70,  reproduce:0.0009, hunger:70, seekMate:120, mateMin: 80, mateR: 2.5*70, activeAtNight:true, minBreedAge:250,  breedCooldown:350,  litterSize:[2,4], maxAge:[2000,4000], spawnEnergy:80, maxEnergy:200},
    shark:      { diet:'carn', baseColor:'#cc00ff', size:[18,32],  speed:[0.8,1.4],  sense:120, reproduce:0.0012, hunger:80, seekMate:120, mateMin: 80, mateR: 3.5*120,  activeAtNight:true,  minBreedAge:700,  breedCooldown:900,  litterSize:[1,2], maxAge:[6000,12000], spawnEnergy:100, maxEnergy:200},  // 200→300
    anglerfish: { diet:'carn', baseColor:'#ff2d78', size:[14,26],  speed:[0.3,0.9],  sense:130, reproduce:0.0012, hunger:80, seekMate:120, mateMin: 80, mateR: 3.5*150,  activeAtNight:true,  minBreedAge:600,  breedCooldown:800,  litterSize:[1,2], maxAge:[5000,10000], spawnEnergy:100, maxEnergy:200},  // 200→300
    leviathan:  { diet:'apex', baseColor:'#ff6b35', size:[40,80],  speed:[0.7,1.2], sense:200, reproduce:0.0008, hunger:150, seekMate:200, mateMin: 100, mateR: 3.5*200,  activeAtNight:true,  minBreedAge:2500, breedCooldown:1800, litterSize:[1,1], maxAge:[7000,15000], spawnEnergy:150, maxEnergy:300},  // 200→500
};

let creatures = [], evoLog = [];
let popHistory   = { jellyfish:[],manta:[],seahorse:[],shark:[],anglerfish:[],leviathan:[] };
let traitHistory = {};


// REMOVED: const POP_CAP = 60;  // No more hard population ceiling!

let godMode = { foodMult:1.0, aggrMult:1.0, mutMult:1.0 };
const POP_MAX = 35;
const POP_CAP = 35;

// ─────────────────────────────────────────────────────────────────────────────
// TURN CAPS
// ─────────────────────────────────────────────────────────────────────────────
const TURN_CAP = {
    jellyfish:  0.022,
    manta:      0.014,
    seahorse:   0.028,
    shark:      0.009,
    anglerfish: 0.013,
    leviathan:  0.004,
};


// ─────────────────────────────────────────────────────────────────────────────
// STEER TOWARD
// ─────────────────────────────────────────────────────────────────────────────
function steerToward(c, tx, ty, turnCap) {
    const mag = Math.sqrt(tx*tx + ty*ty) || 1;
    const nx  = tx/mag * c.speed;
    const ny  = ty/mag * c.speed;
    c.vx += clamp(nx - c.vx, -turnCap, turnCap);
    c.vy += clamp(ny - c.vy, -turnCap, turnCap);
}


// ─────────────────────────────────────────────────────────────────────────────
// SPAWN
// ─────────────────────────────────────────────────────────────────────────────
function lineageDrift(hex) {
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return '#' + [r,g,b].map(v => clamp(v+Math.floor(rnd(-10,10)),0,255).toString(16).padStart(2,'0')).join('');
}

function spawnCreature(key, x, y, parent) {
    const def = SPECIES_DEFS[key];
    const mut = (v, r) => parent ? clamp(v + rnd(-r, r), r*0.05, r*25) : v;

    return {
        id:        creatureIdCounter++,
        species:   key,
        diet:      def.diet,
        x:         x ?? rnd(50, W-50),
        y:         y ?? rnd(50, H-50),
        vx:        rnd(-0.5, 0.5) * Ss,
        vy:        rnd(-0.5, 0.5) * Ss,

        // ── Heritable traits ──
        size:      parent ? mut(parent.size,  1.5)  : rnd(def.size[0],  def.size[1])  * S,
        speed:     parent ? mut(parent.speed, 0.08) : rnd(def.speed[0], def.speed[1]) * Ss,
        sense:     parent ? mut(parent.sense, 6)    : def.sense * S,
        reproduce: parent ? clamp(parent.reproduce + rnd(-0.0001, 0.0001), 0.00003, 0.0015)
                          : def.reproduce,
        color:     parent ? lineageDrift(parent.color) : def.baseColor,

        // ── Non-heritable state ──
        energy:        def.spawnEnergy,
        age:           0,
        maxAge:        rnd(def.maxAge[0], def.maxAge[1]),
        hunger:        def.hunger,
        seekMate:      def.seekMate,
        mateMin:       def.mateMin,
        mateR:         def.mateR,
        generation:    parent ? parent.generation + 1 : 0,
        parentId:      parent ? parent.id : null,
        frame:         Math.random() * Math.PI * 2,
        _wanderAngle:  Math.random() * Math.PI * 2,
        _scared:       0,
        _newborn:      parent ? 60 : 0,
        _children:     [],
        _breedCooldown:0,
        _state:        'WANDERING',
        _levyState: 'explore',
        _levyTimer: 0,
        _levyTarget: null,

        // ── Heritable social trait ──
        socialTrait: parent ? clamp(parent.socialTrait + rnd(-0.05, 0.08), 0, 1) : rnd(0, 0.3),

        // ── Behaviour system fields ──
        ...behaviourSystem.spawnFields(parent),
    };
}

function initCreatures() {
    // Starting populations closer to equilibrium targets: H=40, C=15, A=3
    Object.keys(SPECIES_DEFS).forEach(k => {
        const n = k==='leviathan' ? 2 : 
                k==='shark' ? 6 : 
                k==='anglerfish' ? 6 : 
                k==='jellyfish' ? 15 : 
                k==='manta' ? 15 : 
                k==='seahorse' ? 15 : 0;
        for (let i=0; i<n; i++) creatures.push(spawnCreature(k));
    });
}


// ─────────────────────────────────────────────────────────────────────────────
// DRAW CREATURE
// ─────────────────────────────────────────────────────────────────────────────
function drawCreature(c) {
    if (c._scared  > 0) c._scared--;
    if (c._newborn > 0) c._newborn--;

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.atan2(c.vy, c.vx));

    const s   = c.size;
    const def = SPECIES_DEFS[c.species];
    c.frame  += 0.05 * c.speed * (c._scared > 0 ? 2 : 1);
    const w   = Math.sin(c.frame) * s * 0.15;

    const nightDim = def.activeAtNight ? 1.0 : 0.3 + 0.7 * dayT;

    if (c._newborn > 0) {
        ctx.globalAlpha = (c._newborn/60) * 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0,0,s*1.6,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = clamp(c.energy/120, 0.3, 1.0) * nightDim;
    ctx.fillStyle   = c._scared > 0 ? '#ffffff' : c.color;

    switch (c.species) {
        case 'jellyfish':  drawJF(c,s,w);    break;
        case 'manta':      drawManta(c,s,w); break;
        case 'seahorse':   drawSH(c,s,w);    break;
        case 'shark':      drawShark(c,s,w); break;
        case 'anglerfish': drawAF(c,s,w);    break;
        case 'leviathan':  drawLev(c,s,w);   break;
    }

    if (c === inspectedCreature) {
        const STATE_COL = {
            SCARED:'#ff2d78', REPRODUCING:'#ff00ff', MATING:'#ff88ff',
            'SEEKING MATE':'#ffaaff', HUNTING:'#cc00ff', FLEEING:'#ff6b35',
            'FLEE-FAST':'#ff4400', HIDING:'#ff8844', AMBUSH:'#884400',
            STALKING:'#aa44ff', FEEDING:'#00fff5', GRAZING:'#00ddaa',
            'WANDERING':'#00ffaa', SCHOOLING:'#44ffff', DISPERSING:'#aaffff',
            FOLLOWING:'#88aaff', PATROLLING:'#ffff44', WANDERING:'#9b7db5',
        };
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.arc(0,0,s+6,0,Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.font      = `bold ${clamp(s*0.9,9,13)}px "Share Tech Mono",monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = STATE_COL[c._state] || '#ffffff';
        ctx.fillText(c._state||'', 0, -(s+14));
    }
    ctx.restore();
}

function drawJF(c,s,w){ ctx.fillStyle=c.color+'99'; ctx.beginPath(); ctx.ellipse(0,0,s*.7,s*.5,0,Math.PI,0); ctx.fill(); ctx.fillStyle=c.color+'44'; ctx.beginPath(); ctx.ellipse(0,0,s*.7,s*.5,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=c.color+'66'; ctx.lineWidth=1; for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(i*s*.15,s*.5); ctx.quadraticCurveTo(i*s*.2+w,s+w,i*s*.1,s*1.3+Math.abs(w)); ctx.stroke(); } }
function drawManta(c,s,w){ ctx.fillStyle=c.color+'cc'; ctx.beginPath(); ctx.moveTo(s*.8,0); ctx.quadraticCurveTo(0,-s*.5+w,-s*.8,0); ctx.quadraticCurveTo(0,s*.3-w,s*.8,0); ctx.fill(); ctx.strokeStyle=c.color+'66'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(-s*.8,0); ctx.quadraticCurveTo(-s,w*.5,-s*1.3,w); ctx.stroke(); }
function drawSH(c,s,w){ ctx.strokeStyle=c.color; ctx.lineWidth=s*.22; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(0,-s*.6); ctx.quadraticCurveTo(s*.3,0,w*.3,s*.4); ctx.quadraticCurveTo(-s*.3,s*.7,0,s*.8); ctx.stroke(); ctx.fillStyle=c.color; ctx.beginPath(); ctx.ellipse(s*.1,-s*.6,s*.2,s*.14,.5,0,Math.PI*2); ctx.fill(); }
function drawShark(c,s,w){ ctx.fillStyle=c.color+'cc'; ctx.beginPath(); ctx.moveTo(s,0); ctx.quadraticCurveTo(0,-s*.25+w*.2,-s,0); ctx.quadraticCurveTo(0,s*.2-w*.2,s,0); ctx.fill(); ctx.fillStyle=c.color; ctx.beginPath(); ctx.moveTo(0,-s*.18); ctx.lineTo(-s*.1,-s*.5); ctx.lineTo(-s*.25,-s*.18); ctx.fill(); ctx.beginPath(); ctx.moveTo(-s,0); ctx.lineTo(-s*1.3+w,-s*.3); ctx.lineTo(-s*1.3-w,s*.3); ctx.fill(); }
function drawAF(c,s,w){ ctx.fillStyle=c.color+'bb'; ctx.beginPath(); ctx.ellipse(0,0,s*.8,s*.6,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=c.color+'88'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(s*.6,-s*.3); ctx.quadraticCurveTo(s,-s*.8+w,s*.9,-s*.9); ctx.stroke(); ctx.fillStyle='#ffffaa'; ctx.beginPath(); ctx.arc(s*.9,-s*.9,s*.1,0,Math.PI*2); ctx.fill(); }
function drawLev(c,s,w){ ctx.fillStyle=c.color+'99'; ctx.beginPath(); ctx.moveTo(s,0); ctx.bezierCurveTo(s*.3,-s*.4+w,-s*.3,s*.4-w,-s,0); ctx.bezierCurveTo(-s*.3,s*.3,s*.3,-s*.3,s,0); ctx.fill(); ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(s*.7,-s*.1,s*.07,0,Math.PI*2); ctx.fill(); }


// ─────────────────────────────────────────────────────────────────────────────
// UPDATE CREATURE (REBALANCED)
// ─────────────────────────────────────────────────────────────────────────────
function updateCreature(c, planets, galaxies, stars, newChildren, suns) {
    c.age++;
    const def      = SPECIES_DEFS[c.species];
    const turnCap  = TURN_CAP[c.species] ?? 0.015;
    const prevScared = c._scared;


    // ── 1. ENERGY (INCREASED FOOD ABSORPTION FOR HERBIVORES: 2.2→4.0) ────────
    const nightMult = def.activeAtNight ? 1.0 : (0.3 + 0.7 * dayT);
    if (c.diet == 'herb'){
        c.energy -= (0.045 + c.size * 0.001) * nightMult;
    }
    else {
        c.energy -= (0.045 + c.size * 0.002) * nightMult;
    }

    if (c.diet === 'herb') {
        // Energy absorption from planets/galaxies — INCREASED from 2.2 to 4.0
        for (const obj of [...planets, ...galaxies]) {
            const dx=obj.x-c.x, dy=obj.y-c.y, d=Math.sqrt(dx*dx+dy*dy)||1;
            if (d < obj.r*0.5) {
                c.vx -= clamp(dx/d*c.speed*2, -turnCap*4, turnCap*4);
                c.vy -= clamp(dy/d*c.speed*2, -turnCap*4, turnCap*4);
                c.energy -= 1.5;
            } else if (d < obj.r*4) {
                if (obj._feederCount !== undefined) obj._feederCount++;
                c.energy += 0.3 * godMode.foodMult; // INCREASED from 2.2
            }
        }
        // Sun energy — INCREASED from 2.5 to 4.5
        for (const s of suns) {
            const dx=s.x-c.x, dy=s.y-c.y, d=Math.sqrt(dx*dx+dy*dy)||1;
            if (d < s.r*0.5) {
                c.vx -= clamp(dx/d*c.speed*2, -turnCap*4, turnCap*4);
                c.vy -= clamp(dy/d*c.speed*2, -turnCap*4, turnCap*4);
                c.energy -= 1.0;
            } else if (d < s.grav) {
                if (s._feederCount !== undefined) s._feederCount++;
                c.energy += (1 - d/s.grav) * 0.3 * godMode.foodMult; // INCREASED from 2.5
            }
        }
        // Star energy — INCREASED from 0.002 to 0.005
        for (const s of stars) {
            const dx=s.x-c.x, dy=s.y-c.y;
            if (Math.sqrt(dx*dx+dy*dy) < 80*S) c.energy += 0.002 * godMode.foodMult; // INCREASED
        }
    }

    // Food bloom energy — INCREASED from 3 to 5
    for (const b of foodBlooms) {
        const dx=b.x-c.x, dy=b.y-c.y;
        if (Math.sqrt(dx*dx+dy*dy) < b.r) {
            if (b._feederCount !== undefined) b._feederCount++;
            c.energy += 5 * godMode.foodMult; // INCREASED from 3
        }
    }

    if (c.age > c.maxAge || c.energy <= 0) return false;

    if (window._zergActive) {
        const ef = 150*S;
        if (c.x < ef)     c.vx += 0.08*Ss;
        if (c.x > W - ef) c.vx -= 0.08*Ss;
        if (c.y < ef)     c.vy += 0.08*Ss;
        if (c.y > H - ef) c.vy -= 0.08*Ss;
        if (Math.min(c.x, W-c.x, c.y, H-c.y) < ef) c._scared = Math.max(c._scared, 10);
    }


    // ── 2. SENSE ─────────────────────────────────────────────────────────────
    const searchR = Math.max(c.sense * 3.5, 200*S);
    const nearby  = spatialHash.query(c.x, c.y, searchR);

    let threatDx=0, threatDy=0, threatD=Infinity;
    let preyDx=0,   preyDy=0,   preyD=Infinity;
    let mateDx=0,   mateDy=0,   mateD=Infinity, mateFound=null;

    for (const o of nearby) {
        if (o === c || o._dead) continue;
        const dx = o.x - c.x,  dy = o.y - c.y;
        const d2 = dx*dx + dy*dy;

        // Threat detection (unchanged)
        const isThreat = (c.diet==='herb' && (o.diet==='carn' || o.diet==='apex'))
                      || (c.diet==='carn' &&  o.diet==='apex');
        if (isThreat && d2 < (c.sense*1.5)**2 && d2 < threatD) {
            threatDx = -dx; threatDy = -dy; threatD = d2;
        }

        // Prey detection — CRITICAL CHANGE: Apex ONLY hunts carnivores!
        const isPrey = (c.diet==='carn' && o.diet==='herb')
                    || (c.diet==='apex' && o.diet==='carn');  // REMOVED: || o.diet==='herb'
        if (isPrey && d2 < (c.sense * godMode.aggrMult)**2 && d2 < preyD) {
            preyDx = dx; preyDy = dy; preyD = d2;
        }

        // Mate detection (unchanged)
        const mateMin = c.mateMin;
        const mateR   = c.mateR;
        if (c._breedCooldown <= 0 && c.age >= def.minBreedAge
            && o.species === c.species && o.energy > mateMin && o._breedCooldown <= 0
            && d2 < mateR*mateR && d2 < mateD) {
            mateDx=dx; mateDy=dy; mateD=d2; mateFound=o;
        }
    }

    // Celestial food targeting (unchanged)
    let foodDx=0, foodDy=0, foodD=Infinity;
    for (const obj of [...planets, ...galaxies, ...suns]) {
        const dx=obj.x-c.x, dy=obj.y-c.y, d2=dx*dx+dy*dy;
        const gravR = obj.grav || obj.r*4;
        if (d2 < gravR*gravR && d2 < foodD) {
            const d=Math.sqrt(d2)||1, orbitR=obj.r*2.2;
            foodDx = d > orbitR ? dx/d*(d-orbitR) : -dy/d*c.speed;
            foodDy = d > orbitR ? dy/d*(d-orbitR) :  dx/d*c.speed;
            foodD  = d2;
        }
    }
    for (const b of foodBlooms) {
        const dx=b.x-c.x, dy=b.y-c.y, d2=dx*dx+dy*dy;
        if (d2 < (b.r*2)**2 && d2 < foodD) { foodDx=dx; foodDy=dy; foodD=d2; }
    }

    const breedRange = c.sense * 2.5;
    const wantsMate  = c._breedCooldown <= 0 && c.age >= def.minBreedAge;
    const energyFull = c.energy > (c.diet==='herb' ? 160 : 115);

    // ── 3. BEHAVIOUR ─────────────────────────────────────────────
    const dominated = behaviourSystem.decide(c, {
        nearby, turnCap, wantsMate, energyFull, breedRange,
        threatDx, threatDy, threatD,
        preyDx,   preyDy,   preyD,
        mateDx,   mateDy,   mateD,   mateFound,
        foodDx,   foodDy,   foodD,
        planets,  galaxies, stars,   suns,
        newChildren,
    });

    if (c._scared > 0)                             c._state = 'SCARED';
    if (c._breedCooldown >= def.breedCooldown*0.95) c._state = 'REPRODUCING';

    // ── 4. VELOCITY FINALISE ─────────────────────────────────────────────────
    const spd = Math.sqrt(c.vx*c.vx + c.vy*c.vy);
    if (spd < c.speed*0.3 && c._scared <= 0) {
        c.vx += clamp(Math.cos(c._wanderAngle)*c.speed*0.15, -turnCap*3, turnCap*3);
        c.vy += clamp(Math.sin(c._wanderAngle)*c.speed*0.15, -turnCap*3, turnCap*3);
    }

    const szPen  = clamp(1 - (c.size-12)*0.008, 0.5, 1);
    const maxSpd = c._scared > 0 ? c.speed*3.5 : c.speed * szPen;
    const spd2   = Math.sqrt(c.vx*c.vx + c.vy*c.vy);
    if (spd2 > maxSpd) { c.vx = c.vx/spd2*maxSpd; c.vy = c.vy/spd2*maxSpd; }

    if (c._scared > 0) {
        c.vx += clamp(c.vx*0.97 - c.vx, -turnCap, turnCap);
        c.vy += clamp(c.vy*0.97 - c.vy, -turnCap, turnCap);
    }

    const hp = 20*S;
    if (c.x < hp)     { c.vx += clamp( Math.abs(c.vx)+0.2*Ss-c.vx, -turnCap*4, turnCap*4); c._wanderAngle=rnd(-0.5,0.5); }
    if (c.x > W - hp) { c.vx += clamp(-(Math.abs(c.vx)+0.2*Ss)-c.vx, -turnCap*4, turnCap*4); c._wanderAngle=Math.PI+rnd(-0.5,0.5); }
    if (c.y < hp)     { c.vy += clamp( Math.abs(c.vy)+0.2*Ss-c.vy, -turnCap*4, turnCap*4); }
    if (c.y > H - hp) { c.vy += clamp(-(Math.abs(c.vy)+0.2*Ss)-c.vy, -turnCap*4, turnCap*4); }

    c.x += c.vx;
    c.y += c.vy;


    // ── 5. REPRODUCTION (REMOVED POPULATION CAP) ─────────────────────────────
    if (c._breedCooldown > 0) c._breedCooldown--;

    const reproRate      = c.reproduce * godMode.mutMult;
    const speciesFrac    = creatures.filter(x=>x.species===c.species).length / (creatures.length||1);
    const densityPenalty = speciesFrac > 0.4 ? 0.4 : 1.0;  // Still keep density penalty to prevent monoculture
    const energyThresh   = c.diet==='herb' ? 170 : 130;
    const mateEnergyMin  = c.diet==='herb' ? 130 : 90;

    const mateClose = mateFound && Math.sqrt(mateD) < c.sense*2.5;
    const mateOk    = mateClose && mateFound.energy > mateEnergyMin;

    if (c.age >= def.minBreedAge && c._breedCooldown <= 0
        && c.energy > energyThresh && mateOk
        && Math.random() < reproRate * densityPenalty
        && creatures.length + newChildren.length < POP_CAP) {

        const [litMin, litMax] = def.litterSize;
        // REMOVED: Math.min(..., POP_CAP - creatures.length - newChildren.length)
        const litter = Math.min(
            litMin + Math.floor(Math.random()*(litMax-litMin+1)),
            POP_CAP - creatures.length - newChildren.length  // ADD THIS
        );

        if (litter > 0) {
            // Both parents pay energy
            mateFound.energy *= Math.max(0.35, 1 - litter*0.12);
            c.energy         *= Math.max(0.30, 1 - litter*0.15);
            c._breedCooldown          = def.breedCooldown;
            mateFound._breedCooldown  = def.breedCooldown;
            c._qJustBred         = true;
            mateFound._qJustBred = true;

            for (let li=0; li<litter; li++) {
                const child = spawnCreature(c.species, c.x+rnd(-20,20)*S, c.y+rnd(-20,20)*S, c);
                c._children.push(child.id);
                newChildren.push(child);
                if (child.generation > generationCount) {
                    generationCount = child.generation;
                    if (evoLog.length < 20) evoLog.push(`Gen ${child.generation}: ${child.species}`);
                }
            }

            if (!traitHistory[c.species]) traitHistory[c.species] = [];
            const sp   = creatures.filter(x=>x.species===c.species);
            const last = newChildren[newChildren.length-1];
            traitHistory[c.species].push({
                gen:      last.generation,
                avgSize:  sp.reduce((a,x)=>a+x.size, 0)/sp.length,
                avgSpeed: sp.reduce((a,x)=>a+x.speed,0)/sp.length,
            });
            if (traitHistory[c.species].length > 50) traitHistory[c.species].shift();
        }
    }

    // Clamp energy to new maxEnergy values
    c.energy = clamp(c.energy, 0, def.maxEnergy);
    return true;
}
