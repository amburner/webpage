// =============================================
// COSMIC ECOSYSTEM — FIREBASE SYNC
// Load this FIRST, before all other eco-*.js files
// =============================================

// ── PASTE YOUR FIREBASE CONFIG HERE ──────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDdGEg-Yz3cxDkk1BzheN732YTyozibKCQ",
  authDomain: "webpage-bec84.firebaseapp.com",
  databaseURL: "https://webpage-bec84-default-rtdb.firebaseio.com",
  projectId: "webpage-bec84",
  storageBucket: "webpage-bec84.firebasestorage.app",
  messagingSenderId: "685538314597",
  appId: "1:685538314597:web:23374def9e297681cab98c"
};
// ─────────────────────────────────────────────────────────────

// How often the master tab pushes state (ms)
const PUSH_INTERVAL    = 5000;
// How often viewer tabs poll for new state (ms)
const POLL_INTERVAL    = 6000;
// If no push seen in this long, any tab can claim master (ms)
const MASTER_TIMEOUT   = 12000;

// ── FIREBASE LOADER ───────────────────────────────────────────
// Dynamically loads Firebase SDKs from CDN so no bundler needed
const _fbVersion = '10.12.2';
function _loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }

// ── SYNC STATE ────────────────────────────────────────────────
let _db          = null;   // Firebase database instance
let _isMaster    = false;  // does this tab own the sim?
let _lastPushAt  = 0;      // timestamp of last push we did
let _lastSeenAt  = 0;      // timestamp of last push we received
let _pushTimer   = null;
let _pollTimer   = null;
let _statusEl    = null;
let _syncReady   = false;  // true once Firebase is loaded & state fetched

// Public flag — eco-main.js checks this before starting the loop
window.ecoSyncReady = false;

// ── STATUS INDICATOR ─────────────────────────────────────────
function _makeStatus(){
    _statusEl = document.createElement('div');
    _statusEl.id = 'eco-sync-status';
    _statusEl.style.cssText = [
        'position:fixed', 'bottom:8px', 'right:12px',
        'z-index:99999', 'font-family:"Share Tech Mono",monospace',
        'font-size:10px', 'padding:3px 8px',
        'background:rgba(13,0,16,0.85)',
        'border:1px solid #cc00ff44',
        'color:#9b7db5', 'pointer-events:none',
        'letter-spacing:1px', 'transition:color 0.3s',
    ].join(';');
    document.body.appendChild(_statusEl);
}
function _setStatus(msg, col='#9b7db5'){
    if(!_statusEl) return;
    _statusEl.textContent = msg;
    _statusEl.style.color = col;
}

// ── SERIALISATION ─────────────────────────────────────────────
// Float32Array can't go to JSON directly
function _serialiseCreatures(creatures){
    if(!creatures || !creatures.length) return [];
    return creatures.map(c=>({
        ...c,
        qTable: c.qTable ? Array.from(c.qTable) : [],
    }));
}
function _deserialiseCreatures(raw){
    if(!raw || !raw.length) return [];
    return raw.map(c=>({
        ...c,
        qTable: new Float32Array(c.qTable || []),
        _children:     c._children     || [],
        _scared:       c._scared       ?? 0,
        _newborn:      c._newborn      ?? 0,
        _wanderAngle:  c._wanderAngle  ?? Math.random()*Math.PI*2,
        _crowdFactor:  c._crowdFactor  ?? 1,
        _qState:       c._qState       ?? 0,
        _qAction:      c._qAction      ?? 0,
        _qEnergy:      c._qEnergy      ?? 160,
        _qLock:        c._qLock        ?? 0,
        _qHold:        c._qHold        ?? 0,
    }));
}

// ── BUILD SNAPSHOT ────────────────────────────────────────────
function _buildSnapshot(){
    return {
        version: 2,
        creatures:       _serialiseCreatures(window.creatures       || []),
        generationCount: window.generationCount ?? 0,
        evoLog:          window.evoLog           || [],
        frameCount:      window.frameCount       || 0,
        dayPhase:        window.dayPhase         || 0,
        pushedAt:        Date.now(),
        pusherId:        _myId,
        celestials: {
            stars:   (window.stars   ||[]).map(s=>({x:s.x,y:s.y,r:s.r,col:s.col,dir:s.dir})),
            planets: (window.planets ||[]).map(p=>({x:p.x,y:p.y,r:p.r,col:p.col,col2:p.col2,rings:p.rings,ringTilt:p.ringTilt,dx:p.dx,dy:p.dy})),
            galaxies:(window.galaxies||[]).map(g=>({x:g.x,y:g.y,r:g.r,col:g.col,col2:g.col2,arms:g.arms,dx:g.dx,dy:g.dy,rot:g.rot})),
            suns:    (window.suns    ||[]).map(s=>({x:s.x,y:s.y,r:s.r,col:s.col,dx:s.dx,dy:s.dy})),
            nebulas: (window.nebulas ||[]).map(n=>({x:n.x,y:n.y,r:n.r,col:n.col,col2:n.col2,rot:n.rot})),
        },
    };
}

// ── APPLY SNAPSHOT ────────────────────────────────────────────
function _applySnapshot(snap){
    if(!snap) return;
    if(!snap.version || snap.version < 2){
        console.log('[eco-sync] stale save (v1), ignoring');
        return;
    }
    if(snap.creatures       != null) window.creatures       = _deserialiseCreatures(snap.creatures);
    if(snap.generationCount != null) window.generationCount = snap.generationCount;
    if(snap.evoLog          != null) window.evoLog          = snap.evoLog;
    if(snap.frameCount      != null) window.frameCount      = snap.frameCount;
    if(snap.dayPhase        != null) window.dayPhase        = snap.dayPhase;
    if(snap.celestials){
        if(window.stars){
            const d = snap.celestials;
            if(d.stars)    window.stars.forEach((s,i)=>{ if(d.stars[i])    Object.assign(s,d.stars[i]); });
            if(d.planets)  window.planets.forEach((p,i)=>{ if(d.planets[i])  Object.assign(p,d.planets[i]); });
            if(d.galaxies) window.galaxies.forEach((g,i)=>{ if(d.galaxies[i]) Object.assign(g,d.galaxies[i]); });
            if(d.suns)     window.suns.forEach((s,i)=>{ if(d.suns[i])     Object.assign(s,d.suns[i]); });
            if(d.nebulas)  window.nebulas.forEach((n,i)=>{ if(d.nebulas[i])  Object.assign(n,d.nebulas[i]); });
        } else {
            window._pendingCelestials = snap.celestials;
        }
    }
}

// ── UNIQUE TAB ID ─────────────────────────────────────────────
const _myId = Math.random().toString(36).slice(2);

// ── MASTER ELECTION ───────────────────────────────────────────
// We become master if no other tab has pushed recently
function _electMaster(){
    const now = Date.now();
    if(now - _lastSeenAt > MASTER_TIMEOUT){
        if(!_isMaster){
            _isMaster = true;
            _setStatus('◉ MASTER', '#ff00ff');
            console.log('[eco-sync] became master');
            _startPushing();
        }
    }
}

// ── PUSH TO FIREBASE ──────────────────────────────────────────
async function _push(){
    if(!_db || !_isMaster) return;
    try {
        const { ref, set } = await import(`https://www.gstatic.com/firebasejs/${_fbVersion}/firebase-database.js`);
        const snap = _buildSnapshot();
        await set(ref(_db, 'ecosystem'), snap);
        _lastPushAt = Date.now();
        _setStatus('◉ MASTER · SAVED', '#ff00ff');
    } catch(e){
        _setStatus('◉ MASTER · ERR', '#ff2d78');
        console.warn('[eco-sync] push failed', e);
    }
}

function _startPushing(){
    if(_pushTimer) clearInterval(_pushTimer);
    _pushTimer = setInterval(_push, PUSH_INTERVAL);
}

// ── POLL FROM FIREBASE ────────────────────────────────────────
async function _poll(){
    if(!_db || _isMaster) return;
    try {
        const { ref, get } = await import(`https://www.gstatic.com/firebasejs/${_fbVersion}/firebase-database.js`);
        const snapshot = await get(ref(_db, 'ecosystem'));
        const data = snapshot.val();
        if(!data) return;

        _lastSeenAt = data.pushedAt || Date.now();

        // Another tab is actively pushing — stay as viewer
        if(data.pusherId !== _myId){
            _applySnapshot(data);
            _setStatus('◎ SYNCED', '#00fff5');
        }
    } catch(e){
        _setStatus('◎ OFFLINE', '#ff6b35');
        console.warn('[eco-sync] poll failed', e);
    }

    // Check if we should become master
    _electMaster();
}

// ── REAL-TIME LISTENER (replaces polling when possible) ───────
async function _listenRealtime(){
    try {
        const { ref, onValue } = await import(`https://www.gstatic.com/firebasejs/${_fbVersion}/firebase-database.js`);
        onValue(ref(_db, 'ecosystem'), (snapshot) => {
            const data = snapshot.val();
            if(!data) return;
            _lastSeenAt = data.pushedAt || Date.now();
            if(_isMaster) return; // master ignores incoming — it owns the state
            if(data.pusherId === _myId) return; // our own push echoing back
            _applySnapshot(data);
            _setStatus('◎ LIVE', '#00fff5');
        });
        // Real-time listener is active — no need to poll
        clearInterval(_pollTimer);
    } catch(e){
        // Fall back to polling if onValue fails
        console.warn('[eco-sync] realtime listener failed, using polling', e);
        _pollTimer = setInterval(_poll, POLL_INTERVAL);
    }
}

// ── INIT ──────────────────────────────────────────────────────
async function initSync(){
    if(document.readyState === 'loading'){
        await new Promise(r => document.addEventListener('DOMContentLoaded', r));
    }
    _makeStatus();
    _setStatus('◌ CONNECTING…', '#9b7db5');

    try {
        const [
            { initializeApp },
            { getDatabase, ref, get },
            { getAuth, signInAnonymously }          // ← add this
        ] = await Promise.all([
            import(`https://www.gstatic.com/firebasejs/${_fbVersion}/firebase-app.js`),
            import(`https://www.gstatic.com/firebasejs/${_fbVersion}/firebase-database.js`),
            import(`https://www.gstatic.com/firebasejs/${_fbVersion}/firebase-auth.js`), // ← add this
        ]);

        const app = initializeApp(FIREBASE_CONFIG);
        _db = getDatabase(app);

        // Sign in anonymously before any DB access         ← add this block
        const auth = getAuth(app);
        await signInAnonymously(auth);
        console.log('[eco-sync] signed in anonymously');

        // ... rest of your existing code unchanged ...
    // Wait for DOM so we can append the status element
    if(document.readyState === 'loading'){
        await new Promise(r => document.addEventListener('DOMContentLoaded', r));
    }
    _makeStatus();
    _setStatus('◌ CONNECTING…', '#9b7db5');

    try {
        // Load Firebase app + database modules from CDN
        const [{ initializeApp }, { getDatabase, ref, get }] = await Promise.all([
            import(`https://www.gstatic.com/firebasejs/${_fbVersion}/firebase-app.js`),
            import(`https://www.gstatic.com/firebasejs/${_fbVersion}/firebase-database.js`),
        ]);

        const app = initializeApp(FIREBASE_CONFIG);
        _db = getDatabase(app);

        // Try to load existing state
        _setStatus('◌ LOADING…', '#9b7db5');
        const snapshot = await get(ref(_db, 'ecosystem'));
        const data = snapshot.val();

        if(data && data.version >= 2){
            _lastSeenAt = data.pushedAt || 0;
            const age = Date.now() - _lastSeenAt;
            if(age < MASTER_TIMEOUT){
                // Recent valid save — load it, stay as viewer
                _applySnapshot(data);
                _setStatus('◎ LOADED', '#00fff5');
                console.log('[eco-sync] loaded remote state, creatures:', window.creatures?.length);
            } else {
                // Save exists but is stale — load it then claim master
                _applySnapshot(data);
                _isMaster = true;
                _setStatus('◉ MASTER · RESUMED', '#ff00ff');
                console.log('[eco-sync] stale save, resuming as master');
                _startPushing();
            }
        } else {
            // No valid save — start fresh as master
            _isMaster = true;
            _setStatus('◉ MASTER · NEW', '#ff00ff');
            console.log('[eco-sync] no valid save, starting fresh as master');
            _startPushing();
        }
        // _electMaster() removed here — master status already decided above

        // Start real-time listener (falls back to polling)
        await _listenRealtime();

        // Save on tab close
        window.addEventListener('pagehide', ()=>{
            if(_isMaster) _push();
        });

        _syncReady = true;
        window.ecoSyncReady = true;

    } catch(e){
        console.error('[eco-sync] Firebase init failed:', e);
        _setStatus('◌ OFFLINE MODE', '#ff6b35');
        // Still let the sim run locally
        _syncReady = true;
        window.ecoSyncReady = true;
    }
}

// Expose manual push for debugging
window.ecoForcePush = _push;

// Kick off
initSync();