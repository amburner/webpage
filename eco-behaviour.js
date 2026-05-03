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
// SEARCHED-REGION MEMORY
// Divides the screen into a GRID_COLS × GRID_ROWS grid.
// Each creature carries a _noGo map: { cellKey → frameMarked }.
// Regions expire after NO_GO_TTL frames so the creature will retry them later.
// ─────────────────────────────────────────────────────────────────────────────
const GRID_COLS  = 10;
const GRID_ROWS  = 10;
const NO_GO_TTL  = 1000;   // frames before a searched cell becomes available again

function _cellKey(x, y) {
    const col = Math.floor(clamp(x / W, 0, 0.999) * GRID_COLS);
    const row = Math.floor(clamp(y / H, 0, 0.999) * GRID_ROWS);
    return col + row * GRID_COLS;
}

// Mark the creature's current cell as searched (called when no target found)
function _markSearched(c) {
    if (!c._noGo) c._noGo = {};
    c._noGo[_cellKey(c.x, c.y)] = window.frameCount || 0;
}

// Prune expired entries so the map doesn't grow forever
function _pruneNoGo(c) {
    if (!c._noGo) return;
    const now = window.frameCount || 0;
    for (const k in c._noGo) {
        if (now - c._noGo[k] > NO_GO_TTL) delete c._noGo[k];
    }
}

// Returns true if world-position (x,y) is inside a recently-searched cell
function _isNoGo(c, x, y) {
    if (!c._noGo) return false;
    const k = _cellKey(x, y);
    if (!(k in c._noGo)) return false;
    return (window.frameCount || 0) - c._noGo[k] < NO_GO_TTL;
}

// Pick a candidate world position that avoids recently-searched cells.
// Tries up to `attempts` random points and returns the least-bad one.
function _pickAvoidTarget(c, minDist, maxDist, edgePad, attempts) {
    attempts = attempts || 8;
    let best = null, bestScore = -1;
    for (let i = 0; i < attempts; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = minDist + Math.random() * (maxDist - minDist);
        const tx    = clamp(c.x + Math.cos(angle) * dist, edgePad, W - edgePad);
        const ty    = clamp(c.y + Math.sin(angle) * dist, edgePad, H - edgePad);
        // Score: prefer cells not in noGo, and reasonably far from current pos
        const score = (_isNoGo(c, tx, ty) ? 0 : 2) + Math.random() * 0.5;
        if (score > bestScore) { bestScore = score; best = { x: tx, y: ty }; }
    }
    return best;
}


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
    if (!c._levyState) c._levyState = 'explore';
    if (!c._levyTimer) c._levyTimer = 0;

    c._levyTimer++;

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
        c._levyState = 'explore';
        c._levyTimer = 0;
        steerToward(c, Math.cos(c._wanderAngle)*c.speed, Math.sin(c._wanderAngle)*c.speed, turnCap);
        return;
    }

    if (c._levyState === 'explore') {
        c._wanderAngle += clamp(rnd(-0.025, 0.025), -0.02, 0.02);
        steerToward(c,
            Math.cos(c._wanderAngle) * c.speed * 0.7,
            Math.sin(c._wanderAngle) * c.speed * 0.7,
            turnCap
        );

        const relocateChance = Math.min(c._levyTimer / 100, 0.25);
        if (Math.random() < relocateChance) {
            c._levyState = 'relocate';
            c._levyTimer = 0;

            // ── CHANGED: prefer cells not recently searched ──────────────────
            const jumpDist = Math.pow(Math.random(), -0.5) * Math.max(W, H) * 0.3;
            const target   = _pickAvoidTarget(c, jumpDist * 0.5, jumpDist, edgePad, 8);
            c._levyTarget  = target;
            // ────────────────────────────────────────────────────────────────
        }

    } else {  // 'relocate'
        const dx = c._levyTarget.x - c.x;
        const dy = c._levyTarget.y - c.y;
        const dist = Math.sqrt(dx*dx+dy*dy);

        if (dist < 80*S || c._levyTimer > 100) {
            c._levyState = 'explore';
            c._levyTimer = 0;
            c._wanderAngle = Math.atan2(dy, dx);
        } else {
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

    // Prune stale no-go entries once in a while
    if ((window.frameCount || 0) % 60 === 0) _pruneNoGo(c);

    // ── FLEE ─────────────────────────────────────────────────────────────────
    if (threatD < c.sense/2) {
        steerToward(c, threatDx*2.5, threatDy*2.5, turnCap*1.5);
        c._scared = Math.min(c._scared + 3, 40);
        c._state  = 'FLEEING';
        return true;
    }


    // ── HUNT / FEED ───────────────────────────────────────────────────────────
    const wantFood = hungry || !fullish;

    if (wantFood && c.diet === 'herb') {
        if (foodD < Infinity) {
            // ── CHANGED: found food here, clear this cell from no-go ─────────
            if (c._noGo) delete c._noGo[_cellKey(c.x, c.y)];
            // ──────────────────────────────────────────────────────────────────
            const dist = Math.sqrt(foodD);
            if (dist < c.sense * 0.35) {
                c.vx *= 0.93; c.vy *= 0.93;
                steerToward(c, foodDx*0.25, foodDy*0.25, turnCap*0.3);
                c._state = 'GRAZING';
            } else {
                steerToward(c, foodDx, foodDy, turnCap);
                c._state = 'FEEDING';
            }
            return true;
        } else {
            // ── CHANGED: no food visible here — mark region searched ─────────
            _markSearched(c);
            // ──────────────────────────────────────────────────────────────────
        }
    }

    if (wantFood && (c.diet === 'carn' || c.diet === 'apex')) {
        if (preyD < Infinity) {
            // ── CHANGED: found prey here, clear this cell from no-go ─────────
            if (c._noGo) delete c._noGo[_cellKey(c.x, c.y)];
            // ──────────────────────────────────────────────────────────────────
            steerToward(c, preyDx, preyDy, turnCap);
            doKillCheck(c, nearby);
            c._state = 'HUNTING';
            return true;
        } else {
            // ── CHANGED: no prey visible here — mark region searched ──────────
            _markSearched(c);
            // ──────────────────────────────────────────────────────────────────
        }
    }


    // ── SEEK MATE ────────────────────────────────────────────────────────────
    if (fullish && wantsMate) {

        if (mateD < Infinity) {
            // ── CHANGED: found a mate here, clear this cell ──────────────────
            if (c._noGo) delete c._noGo[_cellKey(c.x, c.y)];
            // ──────────────────────────────────────────────────────────────────
            const dist = Math.sqrt(mateD);
            if (dist > breedRange) {
                steerToward(c, mateDx, mateDy, turnCap);
            } else {
                steerToward(c, -mateDy/dist*c.speed*0.35, mateDx/dist*c.speed*0.35, turnCap);
            }
            c._state = 'MATING';
            return true;
        }

        // No mate visible — mark region and spiral search
        // ── CHANGED: mark current region as searched ─────────────────────────
        _markSearched(c);
        // ─────────────────────────────────────────────────────────────────────

        if (!c._mateSearchTimer) c._mateSearchTimer = 0;
        if (!c._mateSearchCenter) {
            c._mateSearchCenter = { x: c.x, y: c.y };
            c._mateSearchAngle = Math.random() * Math.PI * 2;
        }

        c._mateSearchTimer++;

        const spiralRadius = Math.min(c._mateSearchTimer * 0.5, c.sense * 4);
        c._mateSearchAngle += 0.08;

        // ── CHANGED: bias spiral target away from searched regions ───────────
        const naiveX = c._mateSearchCenter.x + Math.cos(c._mateSearchAngle) * spiralRadius;
        const naiveY = c._mateSearchCenter.y + Math.sin(c._mateSearchAngle) * spiralRadius;
        let targetX = naiveX, targetY = naiveY;
        if (_isNoGo(c, naiveX, naiveY)) {
            const alt = _pickAvoidTarget(c, spiralRadius * 0.5, spiralRadius * 1.5, 100*S, 6);
            targetX = alt.x; targetY = alt.y;
        }
        // ─────────────────────────────────────────────────────────────────────

        const dx = targetX - c.x;
        const dy = targetY - c.y;
        steerToward(c, dx, dy, turnCap);

        if (c._mateSearchTimer > 400 ||
            c.x < 100*S || c.x > W-100*S || c.y < 100*S || c.y > H-100*S) {
            // ── CHANGED: pick new search center avoiding searched regions ─────
            const newCenter = _pickAvoidTarget(c, 100*S, 300*S, 150*S, 6);
            c._mateSearchCenter = newCenter;
            // ──────────────────────────────────────────────────────────────────
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