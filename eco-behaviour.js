// =============================================
// COSMIC ECOSYSTEM — BEHAVIOUR SYSTEM
// Swap this file to change the AI entirely.
// Must export a single object: behaviourSystem
// with one method: decide(c, ctx) → void
// =============================================

// ── Q-TABLE ENGINE ────────────────────────────────────────────
const Q_STATES = 32;
const Q_ALPHA  = 0.12;
const Q_GAMMA  = 0.88;

// Herbs and predators have completely different action spaces.
// Using a single 16-action table for both meant herb indices
// collided with pred-only actions (HUNTING, AMBUSH etc) and
// vice-versa — the table wasted half its capacity on actions
// that could never fire for that diet type.
const Q_ACTIONS_HERB = 12;
const Q_ACTIONS_PRED = 11;

// ── HERB ACTION MAP ───────────────────────────────────────────
// 0  FLEE          — flee from predator (hardcoded override, also in table)
// 1  FLEE-FAST     — panic sprint
// 2  HIDING        — run to nearest planet/galaxy
// 3  FEEDING       — steer toward nearest celestial food
// 4  GRAZING       — slow drift toward food
// 5  WANDERING     — gentle random walk
// 6  SEEK MATE     — hardcoded override; table fallthrough to wander
// 7  MATING        — hardcoded override; table fallthrough to wander
// 8  SCHOOLING     — match velocity of kin group
// 9  DISPERSING    — move away from kin centroid
// 10 FOLLOWING     — follow fastest kin
// 11 WANDERING-EDGE— wander with wall avoidance

// ── PRED ACTION MAP ───────────────────────────────────────────
// 0  FLEE          — flee from apex (hardcoded override, also in table)
// 1  FLEE-FAST     — panic sprint
// 2  HIDING        — run to nearest planet/galaxy
// 3  HUNTING       — chase nearest prey
// 4  AMBUSH        — slow down, burst when prey enters close range
// 5  STALKING      — orbit prey, wait for gap
// 6  WANDERING     — gentle random walk
// 7  SEEK MATE     — hardcoded override; table fallthrough to wander
// 8  MATING        — hardcoded override; table fallthrough to wander
// 9  PATROLLING    — steady circular patrol
// 10 WANDERING-EDGE— wander with wall avoidance

function _nActions(c) {
    return c.diet === 'herb' ? Q_ACTIONS_HERB : Q_ACTIONS_PRED;
}

function qInit(nActions) {
    const t = new Float32Array(Q_STATES * nActions);
    for (let i = 0; i < t.length; i++) t[i] = (Math.random() - 0.5) * 0.1;
    // Pre-bias mating slots so early creatures try them before learning kicks in
    for (let s = 0; s < Q_STATES; s++) {
        if (nActions === Q_ACTIONS_HERB) {
            t[s * nActions + 6] += 1.2; // SEEK MATE
            t[s * nActions + 7] += 1.2; // MATING
        } else {
            t[s * nActions + 7] += 1.2; // SEEK MATE
            t[s * nActions + 8] += 1.2; // MATING
            t[s * nActions + 3] += 2.5; // HUNTING
        }
    }
    return t;
}

function qMutate(parent, nActions, rate = 0.1, scale = 0.08) {
    const t = new Float32Array(parent);
    for (let i = 0; i < t.length; i++) {
        if (Math.random() < rate) t[i] = clamp(t[i] + (Math.random() - 0.5) * scale, -2, 2);
    }
    return t;
}

function qChoose(c, state, epsilon, nActions) {
    if (Math.random() < epsilon) return Math.floor(Math.random() * nActions);
    const base = state * nActions;
    let best = 0, bestV = -Infinity;
    for (let a = 0; a < nActions; a++) {
        const v = c.qTable[base + a];
        if (v > bestV) { bestV = v; best = a; }
    }
    return best;
}

function qUpdate(c, prevState, action, reward, newState, nActions) {
    const idx = prevState * nActions + action;
    let maxFuture = -Infinity;
    const base = newState * nActions;
    for (let a = 0; a < nActions; a++) {
        const v = c.qTable[base + a];
        if (v > maxFuture) maxFuture = v;
    }
    c.qTable[idx] += Q_ALPHA * (reward + Q_GAMMA * maxFuture - c.qTable[idx]);
}

function qReward(c, prevEnergy) {
    let r = (c.energy - prevEnergy) * 0.08;
    if (c._scared > 0) r -= 0.15;
    if (c._dead)       r -= 8.0;
    if (c._qJustBred)  { r += 15.0; c._qJustBred = false; }
    if (c._matingRewardCooldown > 0) c._matingRewardCooldown--;
    return r;
}

// Advance _qLock without a Q-update — used when a hardcoded override fires
// so the table doesn't train on behaviour it didn't choose.
function _qSkipUpdate(c) {
    if (c._qLock > 0) c._qLock--;
}

// ── EXTRA SPAWN FIELDS ────────────────────────────────────────
function behaviourSpawnFields(parent) {
    // nActions is determined by diet, which is set on the creature before
    // spawnFields is called — but at spawn time we pass `parent`, not the
    // new creature. We therefore check parent.diet; for initial spawns
    // (no parent) we can't know diet yet, so we create a max-size table
    // and it gets replaced on the first decide() call if wrong.
    // Actually spawnCreature spreads these fields AFTER setting diet, so
    // we read parent.diet for children; initial creatures get a placeholder
    // that decide() never calls (it checks _qTable length and reinits if needed).
    const nActions = parent ? _nActions(parent) : Q_ACTIONS_PRED; // safe default, reinited below
    return {
        qTable:                parent ? qMutate(parent.qTable, nActions) : qInit(nActions),
        _qNActions:            nActions,
        _qState:               0,
        _qAction:              0,
        _qEnergy:              160,
        _qLock:                0,
        _qHold:                0,
        _qJustBred:            false,
        _matingRewardCooldown: 0,
    };
}

// ── DECIDE ────────────────────────────────────────────────────
function decide(c, e) {
    const { nearby, turnCap, wantsMate, energyFull, breedRange,
            threatDx, threatDy, threatD,
            preyDx,   preyDy,   preyD,
            mateDx,   mateDy,   mateD,   mateFound,
            foodDx,   foodDy,   foodD,
            planets,  galaxies } = e;

    if (!isFinite(c._qLock)) c._qLock = 0;

    // Guard: if table size doesn't match diet (e.g. old save or initial spawn
    // that got the wrong default), reinitialise it now.
    const nActions = _nActions(c);
    if (!c.qTable || c.qTable.length !== Q_STATES * nActions) {
        c.qTable    = qInit(nActions);
        c._qNActions = nActions;
    }

    // ── HARDCODED OVERRIDES ───────────────────────────────────
    // Flee and mating bypass the Q-table entirely. Flee because survival
    // is non-negotiable; mating because two independent agents can't
    // coordinate to choose it simultaneously via separate Q-tables.

    if (threatD < Infinity) {
        steerToward(c, threatDx * 2, threatDy * 2, turnCap);
        c._scared = Math.min(c._scared + 2, 30);
        c._state  = 'FLEEING';
        _qSkipUpdate(c);
        return true;
    }

    if (wantsMate && mateD < Infinity && c.energy >= 100) {
        const dist = Math.sqrt(mateD);
        dist > breedRange
            ? steerToward(c, mateDx, mateDy, turnCap)
            : steerToward(c, -mateDy / dist * c.speed * 0.4, mateDx / dist * c.speed * 0.4, turnCap);
        c._state = 'MATING';
        if (mateD <= 2.5*c.sense){
            c.energy += 1;
        }
        _qSkipUpdate(c);
        return true;
    }

    if (wantsMate && (energyFull || (c.diet !== 'herb' && c.energy >= 100))) {
        c._wanderAngle += clamp(rnd(-0.04, 0.04), -turnCap * 2, turnCap * 2);
        steerToward(c, Math.cos(c._wanderAngle) * c.speed * 1.2, Math.sin(c._wanderAngle) * c.speed * 1.2, turnCap);
        c._state = 'SEEKING MATE';
        _qSkipUpdate(c);
        return true;
    }
    // ── END OVERRIDES ─────────────────────────────────────────

    // State encoding — same for both diets
    const stFlee   = threatD < Infinity ? 1 : 0;
    const stPrey   = preyD   < Infinity ? 1 : 0;
    const stMate   = mateD   < Infinity ? 1 : 0;
    const stFood   = foodD   < Infinity ? 1 : 0;
    const stHungry = c.energy < (c.diet === 'herb' ? 100 : 80) ? 1 : 0;
    const qState   = (stFlee << 4) | (stPrey << 3) | (stMate << 2) | (stFood << 1) | stHungry;

    // Q-update
    const reward = qReward(c, c._qEnergy);
    qUpdate(c, c._qState, c._qAction, reward, qState, nActions);
    c._qEnergy = c.energy;

    // Action selection
    if (c._qLock <= 0) {
        const epsilon = Math.max(0.12, 0.6 - c.generation * 0.004);
        const action  = qChoose(c, qState, epsilon, nActions);
        c._qState    = qState;
        c._qAction   = action;
        const topVal     = c.qTable[qState * nActions + action];
        const confidence = clamp((topVal + 1) / 2, 0, 1);
        c._qLock = 10 + Math.floor(confidence * 30);
    } else {
        c._qLock--;
    }

    // ── EXECUTE — HERB ────────────────────────────────────────
    if (c.diet === 'herb') {
        switch (c._qAction) {
            case 0: // FLEE
                if (threatD < Infinity) { steerToward(c, threatDx*2, threatDy*2, turnCap); c._scared=Math.min(c._scared+2,30); c._state='FLEEING'; return true; }
                break;
            case 1: // FLEE-FAST
                if (threatD < Infinity) { steerToward(c, threatDx*3, threatDy*3, turnCap*2); c._scared=Math.min(c._scared+4,60); c._state='FLEEING'; return true; }
                break;
            case 2: // HIDING
                if (planets.length || galaxies.length) {
                    const cover = [...planets, ...galaxies].reduce((best,obj) => { const d2=(obj.x-c.x)**2+(obj.y-c.y)**2; return d2<best.d2?{obj,d2}:best; },{obj:null,d2:Infinity});
                    if (cover.obj) { steerToward(c, cover.obj.x-c.x, cover.obj.y-c.y, turnCap); c._state='HIDING'; return true; }
                }
                break;
            case 3: // FEEDING
                if (foodD < Infinity) { steerToward(c, foodDx, foodDy, turnCap); c._state='FEEDING'; return true; }
                break;
            case 4: // GRAZING
                if (foodD < Infinity) { c.vx*=0.92; c.vy*=0.92; steerToward(c,foodDx*0.4,foodDy*0.4,turnCap*0.5); c._state='GRAZING'; return true; }
                break;
            case 5: // WANDERING
                c._wanderAngle += clamp(rnd(-0.015,0.015),-0.012,0.012);
                steerToward(c, Math.cos(c._wanderAngle)*c.speed, Math.sin(c._wanderAngle)*c.speed, turnCap);
                c._state='WANDERING'; return true;
            case 6: // SEEK MATE — hardcoded above, fallthrough
            case 7: // MATING   — hardcoded above, fallthrough
                break;
            case 8: // SCHOOLING
                { const kin=nearby.filter(o=>!o._dead&&o.species===c.species&&o!==c);
                  if (kin.length>=2) { steerToward(c,kin.reduce((a,o)=>a+o.vx,0)/kin.length,kin.reduce((a,o)=>a+o.vy,0)/kin.length,turnCap); c._state='SCHOOLING'; return true; } }
                break;
            case 9: // DISPERSING
                { const kin=nearby.filter(o=>!o._dead&&o.species===c.species&&o!==c);
                  if (kin.length>0) { const ax=kin.reduce((a,o)=>a+o.x,0)/kin.length,ay=kin.reduce((a,o)=>a+o.y,0)/kin.length; steerToward(c,c.x-ax,c.y-ay,turnCap); c._state='DISPERSING'; return true; } }
                break;
            case 10: // FOLLOWING
                { const kin=nearby.filter(o=>!o._dead&&o.species===c.species&&o!==c);
                  if (kin.length>0) { const leader=kin.reduce((b,o)=>{const s=o.vx*o.vx+o.vy*o.vy;return s>b.s?{o,s}:b},{o:null,s:-1}).o; if(leader){steerToward(c,leader.x-c.x,leader.y-c.y,turnCap);c._state='FOLLOWING';return true;} } }
                break;
            case 11: // WANDERING-EDGE
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
    }

    // ── EXECUTE — PRED (carn + apex) ──────────────────────────
    else {
        switch (c._qAction) {
            case 0: // FLEE (from apex, for carns)
                if (threatD < Infinity) { steerToward(c, threatDx*2, threatDy*2, turnCap); c._scared=Math.min(c._scared+2,30); c._state='FLEEING'; return true; }
                break;
            case 1: // FLEE-FAST
                if (threatD < Infinity) { steerToward(c, threatDx*3, threatDy*3, turnCap*2); c._scared=Math.min(c._scared+4,60); c._state='FLEEING'; return true; }
                break;
            case 2: // HIDING
                if (planets.length || galaxies.length) {
                    const cover = [...planets, ...galaxies].reduce((best,obj) => { const d2=(obj.x-c.x)**2+(obj.y-c.y)**2; return d2<best.d2?{obj,d2}:best; },{obj:null,d2:Infinity});
                    if (cover.obj) { steerToward(c, cover.obj.x-c.x, cover.obj.y-c.y, turnCap); c._state='HIDING'; return true; }
                }
                break;
            case 3: // HUNTING
                if (preyD < Infinity) {
                    const hungry = (SPECIES_DEFS[c.species].huntHunger===null || c.energy<SPECIES_DEFS[c.species].huntHunger);
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
            case 4: // AMBUSH
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
            case 5: // STALKING
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
            case 6: // WANDERING
                c._wanderAngle += clamp(rnd(-0.015,0.015),-0.012,0.012);
                steerToward(c, Math.cos(c._wanderAngle)*c.speed, Math.sin(c._wanderAngle)*c.speed, turnCap);
                c._state='WANDERING'; return true;
            case 7: // SEEK MATE — hardcoded above, fallthrough
            case 8: // MATING   — hardcoded above, fallthrough
                break;
            case 9: // PATROLLING
                c._wanderAngle += 0.025;
                steerToward(c, Math.cos(c._wanderAngle)*c.speed*1.3, Math.sin(c._wanderAngle)*c.speed*1.3, turnCap);
                c._state='PATROLLING'; return true;
            case 10: // WANDERING-EDGE
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
    }

    return false;
}

// ── PUBLIC INTERFACE ──────────────────────────────────────────
const behaviourSystem = {
    decide,
    spawnFields: behaviourSpawnFields,
};