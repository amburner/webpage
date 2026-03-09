// =============================================
// COSMIC ECOSYSTEM — SIMPLE DRIVE BEHAVIOUR
// Swap in place of eco-behaviour.js
// Same interface: behaviourSystem.decide + behaviourSystem.spawnFields
//
// Rules:
//   1. If hungry  → seek food / prey and eat
//   2. If full    → seek mate
//   3. If mating  → move toward mate, reproduce, pay energy cost
//   4. After bred → hunger drive kicks back in via lowered energy
// =============================================


// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLDS
// All values are energy levels. Tune these to change population dynamics.
//   SEEK_MATE_*   — must be above this to look for a mate
//   HUNGER_*      — below this, food always wins over mating
// ─────────────────────────────────────────────────────────────────────────────
const THRESHOLDS = {
    herb: { seekMate: 150, hunger: 130 },
    carn: { seekMate: 150, hunger: 140 },
    apex: { seekMate: 150, hunger: 120 },
};


// ─────────────────────────────────────────────────────────────────────────────
// KILL CHECK
// ─────────────────────────────────────────────────────────────────────────────
function doKillCheck(c, nearby) {
    for (const p of nearby) {
        if (p === c || p._dead) continue;
        const ip = (c.diet==='carn' && p.diet==='herb')
                || (c.diet==='apex' && (p.diet==='herb' || p.diet==='carn'));
        if (!ip) continue;
        const dx=p.x-c.x, dy=p.y-c.y;
        if (Math.sqrt(dx*dx+dy*dy) < c.size+p.size) {
            c.energy += p.size * 6 * (1 + c.size*0.02);
            p._dead = true;
        }
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// WANDER  (edge-aware, used as fallback when no target exists)
// ─────────────────────────────────────────────────────────────────────────────
function doWander(c, turnCap) {
    c._wanderAngle += clamp(rnd(-0.018, 0.018), -0.015, 0.015);

    const edgePad = 150*S;
    let wb = 0;
    if (c.x < edgePad)   wb  =  Math.PI*0.5*(1 - c.x/edgePad);
    if (c.x > W-edgePad) wb  = -Math.PI*0.5*(1 - (W-c.x)/edgePad);
    if (c.y < edgePad)   wb +=  Math.PI*0.5*(1 - c.y/edgePad);
    if (c.y > H-edgePad) wb -= Math.PI*0.5*(1 - (H-c.y)/edgePad);
    if (wb !== 0) {
        const tgt  = Math.atan2(H/2 - c.y, W/2 - c.x);
        const diff = ((tgt - c._wanderAngle + Math.PI*3) % (Math.PI*2)) - Math.PI;
        const str  = clamp(Math.abs(wb) / (Math.PI*0.5), 0, 1);
        c._wanderAngle += clamp(diff*0.12*str, -turnCap*3, turnCap*3);
    }

    steerToward(c, Math.cos(c._wanderAngle)*c.speed, Math.sin(c._wanderAngle)*c.speed, turnCap);
}


// ─────────────────────────────────────────────────────────────────────────────
// DECIDE
// ─────────────────────────────────────────────────────────────────────────────
function decide(c, e) {
    const {
        nearby, turnCap, wantsMate, breedRange,
        threatDx, threatDy, threatD,
        preyDx,   preyDy,   preyD,
        mateDx,   mateDy,   mateD,   mateFound,
        foodDx,   foodDy,   foodD,
    } = e;

    const thresh  = THRESHOLDS[c.diet] ?? THRESHOLDS.herb;
    const hungry  = c.energy < thresh.hunger;
    const fullish = c.energy >= thresh.seekMate;


    // ── FLEE ─────────────────────────────────────────────────────────────────
    // Always highest priority — even a full creature runs from predators.
    if (threatD < Infinity) {
        steerToward(c, threatDx*2.5, threatDy*2.5, turnCap*1.5);
        c._scared = Math.min(c._scared + 3, 40);
        c._state  = 'FLEEING';
        return true;
    }


    // ── HUNT / FEED ───────────────────────────────────────────────────────────
    // Eat if hungry OR if not yet full enough to mate.
    // Apex always hunts when prey is available unless actively mating.
    const wantFood = hungry || !fullish || c.diet === 'apex';

    if (wantFood && c.diet === 'herb' && foodD < Infinity) {
        const dist = Math.sqrt(foodD);
        if (dist < c.sense * 0.35) {
            // Close enough — slow down and graze
            c.vx *= 0.93; c.vy *= 0.93;
            steerToward(c, foodDx*0.25, foodDy*0.25, turnCap*0.3);
            c._state = 'GRAZING';
        } else {
            steerToward(c, foodDx, foodDy, turnCap);
            c._state = 'FEEDING';
        }
        return true;
    }

    if (wantFood && (c.diet === 'carn' || c.diet === 'apex') && preyD < Infinity) {
        steerToward(c, preyDx, preyDy, turnCap);
        doKillCheck(c, nearby);
        c._state = 'HUNTING';
        return true;
    }


    // ── SEEK MATE ────────────────────────────────────────────────────────────
    // Only fires when above the energy threshold and reproduction is available.
    if (fullish && wantsMate) {

        // A willing mate is in range — move toward them
        if (mateD < Infinity) {
            const dist = Math.sqrt(mateD);
            if (dist > breedRange) {
                steerToward(c, mateDx, mateDy, turnCap);
            } else {
                // Close enough — orbit slowly while reproduction ticks in eco-creatures
                steerToward(c, -mateDy/dist*c.speed*0.35, mateDx/dist*c.speed*0.35, turnCap);
            }
            c._state = 'MATING';
            return true;
        }

        // No mate visible — sweep outward to find one
        c._wanderAngle += clamp(rnd(-0.04, 0.04), -turnCap*2, turnCap*2);
        steerToward(c, Math.cos(c._wanderAngle)*c.speed*1.2, Math.sin(c._wanderAngle)*c.speed*1.2, turnCap);
        c._state = 'SEEKING MATE';
        return true;
    }


    // ── WANDER ───────────────────────────────────────────────────────────────
    doWander(c, turnCap);
    c._state = 'WANDERING';
    return false;
}


// ─────────────────────────────────────────────────────────────────────────────
// SPAWN FIELDS  — nothing extra needed for this system
// ─────────────────────────────────────────────────────────────────────────────
function behaviourSpawnFields(parent) {
    return {};
}


// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC INTERFACE
// ─────────────────────────────────────────────────────────────────────────────
const behaviourSystem = {
    decide,
    spawnFields: behaviourSpawnFields,
};