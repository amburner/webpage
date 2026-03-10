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
// KILL CHECK (INCREASED ENERGY GAIN: 6x → 12x)
// ─────────────────────────────────────────────────────────────────────────────
function doKillCheck(c, nearby) {
    for (const p of nearby) {
        if (p === c || p._dead) continue;
        const ip = (c.diet==='carn' && p.diet==='herb')
                || (c.diet==='apex' && p.diet==='carn');  // Apex only eats carnivores now!
        if (!ip) continue;
        const dx=p.x-c.x, dy=p.y-c.y;
        if (Math.sqrt(dx*dx+dy*dy) < c.size+p.size) {
            c.energy += p.size * 12 * (1 + c.size*0.02);  // INCREASED from 6 to 12
            p._dead = true;
        }
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// WANDER  (edge-aware, used as fallback when no target exists)
// ─────────────────────────────────────────────────────────────────────────────
function doWander(c, turnCap) {
    // Initialize Lévy flight state
    if (!c._levyState) c._levyState = 'explore';  // 'explore' or 'relocate'
    if (!c._levyTimer) c._levyTimer = 0;
    
    c._levyTimer++;
    
    // Edge avoidance (keep existing logic)
    const edgePad = 150*S;
    let wb = 0;
    if (c.x < edgePad)   wb  =  Math.PI*0.5*(1 - c.x/edgePad);
    if (c.x > W-edgePad) wb  = -Math.PI*0.5*(1 - (W-c.x)/edgePad);
    if (c.y < edgePad)   wb +=  Math.PI*0.5*(1 - c.y/edgePad);
    if (c.y > H-edgePad) wb -= Math.PI*0.5*(1 - (H-c.y)/edgePad);
    
    if (wb !== 0) {
        // Strong edge correction
        const tgt  = Math.atan2(H/2 - c.y, W/2 - c.x);
        const diff = ((tgt - c._wanderAngle + Math.PI*3) % (Math.PI*2)) - Math.PI;
        const str  = clamp(Math.abs(wb) / (Math.PI*0.5), 0, 1);
        c._wanderAngle += clamp(diff*0.12*str, -turnCap*3, turnCap*3);
        c._levyState = 'explore';  // Reset to exploration
        c._levyTimer = 0;
        steerToward(c, Math.cos(c._wanderAngle)*c.speed, Math.sin(c._wanderAngle)*c.speed, turnCap);
        return;
    }
    
    // LÉVY FLIGHT: alternates between local exploration and long-distance relocation
    if (c._levyState === 'explore') {
        // Local exploration: slow meandering with small turns
        c._wanderAngle += clamp(rnd(-0.025, 0.025), -0.02, 0.02);
        steerToward(c, 
            Math.cos(c._wanderAngle) * c.speed * 0.7, 
            Math.sin(c._wanderAngle) * c.speed * 0.7, 
            turnCap
        );
        
        // Randomly switch to relocation (Lévy exponent ~ 2)
        // Probability increases with time spent exploring
        const relocateChance = Math.min(c._levyTimer / 200, 0.25);
        if (Math.random() < relocateChance) {
            c._levyState = 'relocate';
            c._levyTimer = 0;
            
            // Choose distant target (power-law distribution)
            const jumpDist = Math.pow(Math.random(), -0.5) * Math.max(W, H) * 0.3;
            const jumpAngle = Math.random() * Math.PI * 2;
            
            c._levyTarget = {
                x: clamp(c.x + Math.cos(jumpAngle) * jumpDist, edgePad, W - edgePad),
                y: clamp(c.y + Math.sin(jumpAngle) * jumpDist, edgePad, H - edgePad)
            };
        }
        
    } else {  // 'relocate'
        // Long-distance directed movement
        const dx = c._levyTarget.x - c.x;
        const dy = c._levyTarget.y - c.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 40*S || c._levyTimer > 100) {
            // Arrived or timeout - back to exploration
            c._levyState = 'explore';
            c._levyTimer = 0;
            c._wanderAngle = Math.atan2(dy, dx);  // Continue in same direction
        } else {
            // Move toward target at full speed
            steerToward(c, dx, dy, turnCap * 1.3);
        }
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// DECIDE
// ─────────────────────────────────────────────────────────────────────────────
function decide(c, e) {
    const {
        nearby, turnCap, wantsMate, energyFull, breedRange,
        threatDx, threatDy, threatD,
        preyDx,   preyDy,   preyD,
        mateDx,   mateDy,   mateD,   mateFound,
        foodDx,   foodDy,   foodD,
        planets,  galaxies, stars,   suns,
        newChildren,
    } = e;

    const hungry  = c.energy < c.hunger;
    const fullish = c.energy >= c.seekMate;

    // ── FLEE ─────────────────────────────────────────────────────────────────
    // Always highest priority — even a full creature runs from predators.
    if (threatD < c.sense/2) {
        steerToward(c, threatDx*2.5, threatDy*2.5, turnCap*1.5);
        c._scared = Math.min(c._scared + 3, 40);
        c._state  = 'FLEEING';
        return true;
    }


    // ── HUNT / FEED ───────────────────────────────────────────────────────────
    // Eat if hungry OR if not yet full enough to mate.
    // Apex always hunts when prey is available unless actively mating.
    const wantFood = hungry || !fullish;

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

        // No mate visible — spiral search pattern
        if (!c._mateSearchTimer) c._mateSearchTimer = 0;
        if (!c._mateSearchCenter) {
            // Set search center at current position
            c._mateSearchCenter = { x: c.x, y: c.y };
            c._mateSearchAngle = Math.random() * Math.PI * 2;
        }

        c._mateSearchTimer++;

        // Spiral outward from search center
        const spiralRadius = Math.min(c._mateSearchTimer * 0.5, c.sense * 4);
        const spiralSpeed = 0.08;  // Angular velocity

        c._mateSearchAngle += spiralSpeed;

        // Target position on spiral
        const targetX = c._mateSearchCenter.x + Math.cos(c._mateSearchAngle) * spiralRadius;
        const targetY = c._mateSearchCenter.y + Math.sin(c._mateSearchAngle) * spiralRadius;

        // Steer toward target
        const dx = targetX - c.x;
        const dy = targetY - c.y;
        steerToward(c, dx, dy, turnCap);

        // Reset search if we've searched too long or found edge
        if (c._mateSearchTimer > 400 || 
            c.x < 100*S || c.x > W-100*S || c.y < 100*S || c.y > H-100*S) {
            // Pick new search center near current position
            c._mateSearchCenter = { 
                x: clamp(c.x + rnd(-200, 200)*S, 150*S, W-150*S),
                y: clamp(c.y + rnd(-200, 200)*S, 150*S, H-150*S)
            };
            c._mateSearchTimer = 0;
            c._mateSearchAngle = Math.random() * Math.PI * 2;
        }

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