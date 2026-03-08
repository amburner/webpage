// =============================================
// COSMIC ECOSYSTEM — BEHAVIOUR SYSTEM
// Swap this file to change the AI entirely.
// Must export a single object: behaviourSystem
// with one method: decide(c, ctx) → void
// =============================================

// ── Q-TABLE ENGINE ────────────────────────────────────────────
const Q_STATES  = 32;
const Q_ACTIONS = 16;
const Q_ALPHA   = 0.12;
const Q_GAMMA   = 0.88;

const Q_ACTION_NAMES = [
    'FLEEING','FLEE-FAST','HIDING',
    'HUNTING','AMBUSH','STALKING',
    'FEEDING','GRAZING','WANDERING',
    'SEEKING MATE','MATING',
    'SCHOOLING','DISPERSING','FOLLOWING',
    'PATROLLING','WANDERING',
];

function qInit() {
    const t = new Float32Array(Q_STATES * Q_ACTIONS);
    for (let i=0; i<t.length; i++) t[i] = (Math.random()-0.5)*0.1;
    for (let s=0; s<Q_STATES; s++) {
        t[s * Q_ACTIONS + 9]  += 0.4;
        t[s * Q_ACTIONS + 10] += 0.4;
    }
    return t;
}

function qMutate(parent, rate=0.1, scale=0.08) {
    const t = new Float32Array(parent);
    for (let i=0; i<t.length; i++) {
        if (Math.random() < rate) t[i] = clamp(t[i] + (Math.random()-0.5)*scale, -2, 2);
    }
    return t;
}

function qChoose(c, state, epsilon) {
    if (Math.random() < epsilon) return Math.floor(Math.random() * Q_ACTIONS);
    const base = state * Q_ACTIONS;
    let best=0, bestV=-Infinity;
    for (let a=0; a<Q_ACTIONS; a++) {
        const v = c.qTable[base+a];
        if (v > bestV) { bestV=v; best=a; }
    }
    return best;
}

function qUpdate(c, prevState, action, reward, newState) {
    const idx = prevState * Q_ACTIONS + action;
    let maxFuture = -Infinity;
    const base = newState * Q_ACTIONS;
    for (let a=0; a<Q_ACTIONS; a++) { const v=c.qTable[base+a]; if(v>maxFuture) maxFuture=v; }
    c.qTable[idx] += Q_ALPHA * (reward + Q_GAMMA * maxFuture - c.qTable[idx]);
}

function qReward(c, prevEnergy) {
    let r = (c.energy - prevEnergy) * 0.08;
    if (c._scared > 0)  r -= 0.15;
    if (c._dead)        r -= 8.0;
    if (c._breedCooldown > 0 && c._breedCooldown > (SPECIES_DEFS[c.species]?.breedCooldown??800)*0.97) r += 12.0;
    if ((c._qAction === 9 || c._qAction === 10) && c._matingRewardCooldown <= 0) {
        const matingNearby = creatures.filter(o =>
            !o._dead && o !== c && o.species === c.species &&
            (o._qAction === 9 || o._qAction === 10) &&
            Math.sqrt((o.x-c.x)**2 + (o.y-c.y)**2) < c.sense * 2.5
        );
        if (matingNearby.length > 0) { r += 4.0; c._matingRewardCooldown = 300; }
    }
    if (c._matingRewardCooldown > 0) c._matingRewardCooldown--;
    return r;
}

// ── EXTRA SPAWN FIELDS ────────────────────────────────────────
// Called by spawnCreature to attach behaviour-specific fields.
// Return an object — it gets spread into the creature at spawn time.
function behaviourSpawnFields(parent) {
    return {
        qTable:  parent ? qMutate(parent.qTable) : qInit(),
        _qState:  0,
        _qAction: 0,
        _qEnergy: 160,
        _qLock:   0,
        _qHold:   0,
        _matingRewardCooldown: 0,
    };
}

// ── DECIDE ────────────────────────────────────────────────────
// Called once per creature per frame from updateCreature.
// Mutates c._state and calls steerToward. Returns true if
// a behaviour fired (dominated), false if nothing applied.
function decide(c, e) {
    const { nearby, turnCap, wantsMate, energyFull, breedRange,
            threatDx, threatDy, threatD,
            preyDx,   preyDy,   preyD,
            mateDx,   mateDy,   mateD,   mateFound,
            foodDx,   foodDy,   foodD,
            planets,  galaxies } = e;

    // State flags
    const stFlee   = threatD < Infinity ? 1 : 0;
    const stPrey   = preyD   < Infinity ? 1 : 0;
    const stMate   = mateD   < Infinity ? 1 : 0;
    const stFood   = foodD   < Infinity ? 1 : 0;
    const stHungry = c.energy < (c.diet==='herb' ? 100 : 80) ? 1 : 0;
    const qState   = (stFlee<<4)|(stPrey<<3)|(stMate<<2)|(stFood<<1)|stHungry;

    // Q-update
    const reward = qReward(c, c._qEnergy);
    qUpdate(c, c._qState, c._qAction, reward, qState);
    c._qEnergy = c.energy;

    // Action selection
    if (c._qLock <= 0) {
        const epsilon = Math.max(0.05, 0.5 - c.generation * 0.006);
        const action  = qChoose(c, qState, epsilon);
        c._qState  = qState;
        c._qAction = action;
        const topVal     = c.qTable[qState * Q_ACTIONS + action];
        const confidence = clamp((topVal + 1) / 2, 0, 1);
        c._qLock = 20 + Math.floor(confidence * 80);
    } else {
        c._qLock--;
    }

    // Execute — identical switch to before, just moved here
    switch (c._qAction) {
        case 0:
            if (threatD < Infinity) { steerToward(c, threatDx*2, threatDy*2, turnCap); c._scared=Math.min(c._scared+2,30); c._state='FLEEING'; return true; }
            break;
        case 1:
            if (threatD < Infinity) { steerToward(c, threatDx*3, threatDy*3, turnCap*2); c._scared=Math.min(c._scared+4,60); c._state='FLEEING'; return true; }
            break;
        case 2:
            if (planets.length || galaxies.length) {
                const cover = [...planets, ...galaxies].reduce((best,obj) => { const d2=(obj.x-c.x)**2+(obj.y-c.y)**2; return d2<best.d2?{obj,d2}:best; },{obj:null,d2:Infinity});
                if (cover.obj) { steerToward(c, cover.obj.x-c.x, cover.obj.y-c.y, turnCap); c._state='HIDING'; return true; }
            }
            break;
        case 3:
            if (preyD < Infinity) {
                const hungry = (SPECIES_DEFS[c.species].huntHunger===null || c.energy<SPECIES_DEFS[c.species].huntHunger) && !(wantsMate&&mateD<Infinity);
                if (hungry) {
                    steerToward(c, preyDx, preyDy, turnCap); c._state='HUNTING';
                    for (const p of nearby) {
                        if (p===c||p._dead) continue;
                        const ip=(c.diet==='carn'&&p.diet==='herb')||(c.diet==='apex'&&(p.diet==='herb'||p.diet==='carn'));
                        if (!ip) continue;
                        const dx=p.x-c.x, dy=p.y-c.y;
                        if (Math.sqrt(dx*dx+dy*dy)<c.size+p.size) { c.energy+=p.size*6*(1+c.size*0.02); p._dead=true; }
                    }
                    return true;
                }
            }
            break;
        case 4:
            { c.vx*=0.85; c.vy*=0.85; c._state='AMBUSH';
              const closeR=c.sense*0.4;
              for (const p of nearby) {
                if (p===c||p._dead) continue;
                const ip=(c.diet==='carn'&&p.diet==='herb')||(c.diet==='apex'&&(p.diet==='herb'||p.diet==='carn'));
                if (!ip) continue;
                const dx=p.x-c.x, dy=p.y-c.y, d=Math.sqrt(dx*dx+dy*dy);
                if (d<closeR) { steerToward(c,dx,dy,turnCap*3); c._state='HUNTING'; if(d<c.size+p.size){c.energy+=p.size*6*(1+c.size*0.02);p._dead=true;} }
              }
              return true; }
        case 5:
            if (preyD < Infinity) {
                const dist=Math.sqrt(preyD), orbitR=c.sense*0.6;
                dist>orbitR ? steerToward(c,preyDx,preyDy,turnCap*0.6) : steerToward(c,-preyDy/dist*c.speed,preyDx/dist*c.speed,turnCap);
                c._state='STALKING';
                for (const p of nearby) {
                    if (p===c||p._dead) continue;
                    const ip=(c.diet==='carn'&&p.diet==='herb')||(c.diet==='apex'&&(p.diet==='herb'||p.diet==='carn'));
                    if (!ip) continue;
                    const dx=p.x-c.x,dy=p.y-c.y;
                    if (Math.sqrt(dx*dx+dy*dy)<c.size+p.size){c.energy+=p.size*6*(1+c.size*0.02);p._dead=true;}
                }
                return true;
            }
            break;
        case 6:
            if (foodD < Infinity) { steerToward(c, foodDx, foodDy, turnCap); c._state='FEEDING'; return true; }
            break;
        case 7:
            if (foodD < Infinity) { c.vx*=0.92; c.vy*=0.92; steerToward(c,foodDx*0.4,foodDy*0.4,turnCap*0.5); c._state='GRAZING'; return true; }
            break;
        case 8:
            c._wanderAngle+=clamp(rnd(-0.015,0.015),-0.012,0.012);
            steerToward(c,Math.cos(c._wanderAngle)*c.speed,Math.sin(c._wanderAngle)*c.speed,turnCap);
            c._state='WANDERING'; return true;
        case 9:
            if (wantsMate && (energyFull||c.diet!=='herb') && mateD===Infinity) {
                const kin=nearby.filter(o=>!o._dead&&o.species===c.species);
                if (kin.length>0) {
                    const ax=kin.reduce((a,o)=>a+o.x,0)/kin.length, ay=kin.reduce((a,o)=>a+o.y,0)/kin.length;
                    const awayAngle=Math.atan2(c.y-ay,c.x-ax);
                    const diff=((awayAngle-c._wanderAngle+Math.PI*3)%(Math.PI*2))-Math.PI;
                    c._wanderAngle+=clamp(diff*0.015,-turnCap,turnCap);
                } else { c._wanderAngle+=clamp(rnd(-0.04,0.04),-turnCap*2,turnCap*2); }
                steerToward(c,Math.cos(c._wanderAngle)*c.speed*1.2,Math.sin(c._wanderAngle)*c.speed*1.2,turnCap);
                c._state='SEEKING MATE'; return true;
            }
            break;
        case 10:
            if (wantsMate && mateD<Infinity) {
                const dist=Math.sqrt(mateD);
                dist>breedRange ? steerToward(c,mateDx,mateDy,turnCap) : steerToward(c,-mateDy/dist*c.speed*0.4,mateDx/dist*c.speed*0.4,turnCap);
                c._state='MATING'; return true;
            }
            break;
        case 11:
            { const kin=nearby.filter(o=>!o._dead&&o.species===c.species&&o!==c);
              if (kin.length>=2) { steerToward(c,kin.reduce((a,o)=>a+o.vx,0)/kin.length,kin.reduce((a,o)=>a+o.vy,0)/kin.length,turnCap); c._state='SCHOOLING'; return true; } }
            break;
        case 12:
            { const kin=nearby.filter(o=>!o._dead&&o.species===c.species&&o!==c);
              if (kin.length>0) { const ax=kin.reduce((a,o)=>a+o.x,0)/kin.length,ay=kin.reduce((a,o)=>a+o.y,0)/kin.length; steerToward(c,c.x-ax,c.y-ay,turnCap); c._state='DISPERSING'; return true; } }
            break;
        case 13:
            { const kin=nearby.filter(o=>!o._dead&&o.species===c.species&&o!==c);
              if (kin.length>0) { const leader=kin.reduce((b,o)=>{const s=o.vx*o.vx+o.vy*o.vy;return s>b.s?{o,s}:b},{o:null,s:-1}).o; if(leader){steerToward(c,leader.x-c.x,leader.y-c.y,turnCap);c._state='FOLLOWING';return true;} } }
            break;
        case 14:
            c._wanderAngle+=0.025;
            steerToward(c,Math.cos(c._wanderAngle)*c.speed*1.3,Math.sin(c._wanderAngle)*c.speed*1.3,turnCap);
            c._state='PATROLLING'; return true;
        case 15:
        default:
            { c._wanderAngle+=clamp(rnd(-0.015,0.015),-0.012,0.012);
              const edgePad=150*S; let wb=0;
              if(c.x<edgePad)   wb =  Math.PI*0.5*(1-c.x/edgePad);
              if(c.x>W-edgePad) wb = -Math.PI*0.5*(1-(W-c.x)/edgePad);
              if(c.y<edgePad)   wb +=  Math.PI*0.5*(1-c.y/edgePad);
              if(c.y>H-edgePad) wb -= Math.PI*0.5*(1-(H-c.y)/edgePad);
              if(wb!==0){ const tgt=Math.atan2(H/2-c.y,W/2-c.x),diff=((tgt-c._wanderAngle+Math.PI*3)%(Math.PI*2))-Math.PI,str=clamp(Math.abs(wb)/(Math.PI*0.5),0,1); c._wanderAngle+=clamp(diff*0.12*str,-turnCap*3,turnCap*3); }
              steerToward(c,Math.cos(c._wanderAngle)*c.speed,Math.sin(c._wanderAngle)*c.speed,turnCap);
              c._state='WANDERING'; return true; }
    }
    return false;
}

// ── PUBLIC INTERFACE ──────────────────────────────────────────
// This is the only thing eco-creatures.js talks to.
// To swap systems, replace this file and keep the same interface.
const behaviourSystem = {
    decide,
    spawnFields: behaviourSpawnFields,
};