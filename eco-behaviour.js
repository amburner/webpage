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
// HYBRID GRID-SENSE MEMORY
// ─────────────────────────────────────────────────────────────────────────────

const CELL_FACTOR      = 0.5;
const NO_GO_TTL        = 1000;
const NO_TARGET_FRAMES = 90;

function _cellSize(c) {
    return c.sense * CELL_FACTOR;
}

function _cellCoords(c, x, y) {
    const cs = _cellSize(c);
    return { col: Math.floor(x / cs), row: Math.floor(y / cs) };
}

function _cellKey(col, row) {
    return col + ',' + row;
}

function _isNoGo(c, x, y) {
    if (!c._noGo) return false;
    const now = window.frameCount || 0;
    const cs  = _cellSize(c);
    const col = Math.floor(x / cs);
    const row = Math.floor(y / cs);
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const k = _cellKey(col + dc, row + dr);
            const t = c._noGo[k];
            if (t !== undefined && now - t < NO_GO_TTL) return true;
        }
    }
    return false;
}

function _stampCells(c) {
    if (!c._noGo) c._noGo = {};
    const now = window.frameCount || 0;
    const cs  = _cellSize(c);
    const halfCells = Math.ceil(1 / CELL_FACTOR) + 1;
    const { col: cc, row: cr } = _cellCoords(c, c.x, c.y);
    const senseR2 = c.sense * c.sense;
    for (let dr = -halfCells; dr <= halfCells; dr++) {
        for (let dc = -halfCells; dc <= halfCells; dc++) {
            const wx = (cc + dc + 0.5) * cs;
            const wy = (cr + dr + 0.5) * cs;
            const dx = wx - c.x, dy = wy - c.y;
            if (dx*dx + dy*dy <= senseR2) {
                c._noGo[_cellKey(cc + dc, cr + dr)] = now;
            }
        }
    }
}

function _markSearched(c, driveLabel) {
    if (c._noTargetDrive !== driveLabel) {
        c._noTargetDrive  = driveLabel;
        c._noTargetFrames = 0;
    }
    c._noTargetFrames = (c._noTargetFrames || 0) + 1;
    if (c._noTargetFrames < NO_TARGET_FRAMES) return;
    c._noTargetFrames = 0;
    _stampCells(c);
}

function _clearSearched(c) {
    c._noTargetFrames = 0;
    c._noTargetDrive  = null;
    if (!c._noGo) return;
    const cs = _cellSize(c);
    const { col: cc, row: cr } = _cellCoords(c, c.x, c.y);
    const halfCells = Math.ceil(1 / CELL_FACTOR) + 1;
    const senseR2   = c.sense * c.sense;
    for (let dr = -halfCells; dr <= halfCells; dr++) {
        for (let dc = -halfCells; dc <= halfCells; dc++) {
            const wx = (cc + dc + 0.5) * cs;
            const wy = (cr + dr + 0.5) * cs;
            const dx = wx - c.x, dy = wy - c.y;
            if (dx*dx + dy*dy <= senseR2) {
                delete c._noGo[_cellKey(cc + dc, cr + dr)];
            }
        }
    }
}

function _pruneNoGo(c) {
    if (!c._noGo) return;
    const now = window.frameCount || 0;
    for (const k in c._noGo) {
        if (now - c._noGo[k] >= NO_GO_TTL) delete c._noGo[k];
    }
}

function _pickAvoidTarget(c, minDist, maxDist, edgePad, attempts) {
    attempts = attempts || 8;
    let best = null, bestScore = -1;
    for (let i = 0; i < attempts; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = minDist + Math.random() * (maxDist - minDist);
        const tx    = clamp(c.x + Math.cos(angle) * dist, edgePad, W - edgePad);
        const ty    = clamp(c.y + Math.sin(angle) * dist, edgePad, H - edgePad);
        const score = (_isNoGo(c, tx, ty) ? 0 : 2) + Math.random() * 0.5;
        if (score > bestScore) { bestScore = score; best = { x: tx, y: ty }; }
    }
    return best;
}


// ─────────────────────────────────────────────────────────────────────────────
// KILL CHECK
// ─────────────────────────────────────────────────────────────────────────────
function doKillCheck(c, nearby) {
    for (const p of nearby) {
        if (p === c || p._dead) continue;
        const ip = (c.diet==='carn' && p.diet==='herb')
                || (c.diet==='apex' && p.diet==='carn');
        if (!ip) continue;
        const dx=p.x-c.x, dy=p.y-c.y;
        if (Math.sqrt(dx*dx+dy*dy) < c.size+p.size) {
            c.energy += p.size * 12 * (1 + c.size*0.02);
            p._dead = true;
        }
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// WANDER  (edge-aware, Lévy flight, avoids searched cells for relocation target)
//
// Changes from original (two lines only):
//   1. explore mode: removed rnd(-0.025, 0.025) angle jitter every frame.
//      Angle is now only updated when a Lévy relocate fires, which is the
//      intended behaviour — straight legs between direction changes.
//   2. explore mode: removed * 0.7 speed damper.
//      Creatures now move at full speed on explore legs, matching relocate legs.
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
        // (no per-frame angle jitter here — was: c._wanderAngle += clamp(rnd(-0.025, 0.025), -0.02, 0.02))
        steerToward(c,
            Math.cos(c._wanderAngle) * c.speed,   // (no * 0.7 damper)
            Math.sin(c._wanderAngle) * c.speed,
            turnCap
        );

        const relocateChance = Math.min(c._levyTimer / 100, 0.25);
        if (Math.random() < relocateChance) {
            c._levyState = 'relocate';
            c._levyTimer = 0;
            const jumpDist = Math.pow(Math.random(), -0.5) * Math.max(W, H) * 0.3;
            c._levyTarget = _pickAvoidTarget(c, jumpDist * 0.5, jumpDist, edgePad, 8);
        }

    } else {  // 'relocate'
        const dx   = c._levyTarget.x - c.x;
        const dy   = c._levyTarget.y - c.y;
        const dist = Math.sqrt(dx*dx+dy*dy);

        if (dist < 80*S || c._levyTimer > 100) {
            c._levyState   = 'explore';
            c._levyTimer   = 0;
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

    if ((window.frameCount || 0) % 60 === 0) _pruneNoGo(c);

    // ── FLEE ─────────────────────────────────────────────────────────────────
    if (threatD < c.sense/2) {
        steerToward(c, threatDx*2.5, threatDy*2.5, turnCap*1.5);
        c._scared         = Math.min(c._scared + 3, 40);
        c._state          = 'FLEEING';
        c._noTargetFrames = 0;
        c._noTargetDrive  = null;
        return true;
    }


    // ── HUNT / FEED ───────────────────────────────────────────────────────────
    const wantFood = hungry || !fullish;

    if (wantFood && c.diet === 'herb') {
        if (foodD < Infinity) {
            _clearSearched(c);
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
            _markSearched(c, 'herb-food');
        }
    }

    if (wantFood && (c.diet === 'carn' || c.diet === 'apex')) {
        if (preyD < Infinity) {
            _clearSearched(c);
            steerToward(c, preyDx, preyDy, turnCap);
            doKillCheck(c, nearby);
            c._state = 'HUNTING';
            return true;
        } else {
            _markSearched(c, 'carn-prey');
        }
    }


    // ── SEEK MATE ────────────────────────────────────────────────────────────
    if (fullish && wantsMate) {

        if (mateD < Infinity) {
            _clearSearched(c);
            c._mateSearchTimer  = 0;
            c._mateSearchCenter = null;

            const dist = Math.sqrt(mateD);
            if (dist > breedRange) {
                steerToward(c, mateDx, mateDy, turnCap);
            } else {
                steerToward(c, -mateDy/dist*c.speed*0.35, mateDx/dist*c.speed*0.35, turnCap);
            }
            c._state = 'MATING';
            return true;
        }

        _markSearched(c, 'mate');

        if (!c._mateSearchTimer) c._mateSearchTimer = 0;
        if (!c._mateSearchCenter) {
            c._mateSearchCenter = { x: c.x, y: c.y };
            c._mateSearchAngle  = Math.random() * Math.PI * 2;
        }

        c._mateSearchTimer++;

        const spiralRadius = Math.min(c._mateSearchTimer * 0.5, c.sense * 4);
        c._mateSearchAngle += 0.08;

        const naiveX = c._mateSearchCenter.x + Math.cos(c._mateSearchAngle) * spiralRadius;
        const naiveY = c._mateSearchCenter.y + Math.sin(c._mateSearchAngle) * spiralRadius;
        let targetX = naiveX, targetY = naiveY;
        if (_isNoGo(c, naiveX, naiveY)) {
            const alt = _pickAvoidTarget(c, spiralRadius * 0.5, spiralRadius * 1.5, 100*S, 6);
            targetX = alt.x; targetY = alt.y;
        }

        const dx = targetX - c.x;
        const dy = targetY - c.y;
        steerToward(c, dx, dy, turnCap);

        if (c._mateSearchTimer > 400 ||
            c.x < 100*S || c.x > W-100*S || c.y < 100*S || c.y > H-100*S) {
            c._mateSearchCenter = _pickAvoidTarget(c, 100*S, 300*S, 150*S, 6);
            c._mateSearchTimer  = 0;
            c._mateSearchAngle  = Math.random() * Math.PI * 2;
        }

        c._state = 'SEEKING MATE';
        return true;
    }


    // ── WANDER ───────────────────────────────────────────────────────────────
    c._noTargetFrames = 0;
    c._noTargetDrive  = null;
    doWander(c, turnCap);
    c._state = 'WANDERING';
    return false;
}


// ─────────────────────────────────────────────────────────────────────────────
// SPAWN FIELDS
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