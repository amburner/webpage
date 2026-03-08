// =============================================
// COSMIC ECOSYSTEM — INIT & MAIN LOOP
// Depends on: eco-sync.js, eco-canvas.js, eco-creatures.js, eco-ui.js
// =============================================

// ── INIT & LOOP ───────────────────────────────────────────────────────────
const stars  =Array.from({length:90}, ()=>new Star());
const planets=Array.from({length:5},  ()=>new Planet());
const galaxies=Array.from({length:2}, ()=>new Galaxy());
const suns   =Array.from({length:4},  ()=>new Sun());
const comets =Array.from({length:3},  ()=>new Comet());
const nebulas=Array.from({length:8},  ()=>new Nebula());

window.addEventListener('load', async ()=>{
    resize();

    // Wait for Firebase sync to load remote state before spawning creatures
    await new Promise(resolve => {
        if(window.ecoSyncReady){ resolve(); return; }
        const check = setInterval(()=>{
            if(window.ecoSyncReady){ clearInterval(check); resolve(); }
        }, 100);
    });

    // Only spawn fresh creatures if sync didn't load any
    if(!window.creatures || window.creatures.length === 0){
        initCreatures();
    } else {
        creatures = window.creatures;
    }

    // Expose locals to window so eco-sync.js can read/write them
    Object.defineProperty(window, 'creatures',       { get:()=>creatures,       set:v=>{ creatures=v; },       configurable:true });
    Object.defineProperty(window, 'generationCount', { get:()=>generationCount, set:v=>{ generationCount=v; }, configurable:true });
    Object.defineProperty(window, 'evoLog',          { get:()=>evoLog,          set:v=>{ evoLog=v; },          configurable:true });
    Object.defineProperty(window, 'frameCount',      { get:()=>frameCount,      set:v=>{ frameCount=v; },      configurable:true });
    Object.defineProperty(window, 'dayPhase',        { get:()=>dayPhase,        set:v=>{ dayPhase=v; },        configurable:true });
    Object.defineProperty(window, 'stars',   { get:()=>stars,   configurable:true });
    Object.defineProperty(window, 'planets', { get:()=>planets, configurable:true });
    Object.defineProperty(window, 'galaxies',{ get:()=>galaxies,configurable:true });
    Object.defineProperty(window, 'suns',    { get:()=>suns,    configurable:true });
    Object.defineProperty(window, 'nebulas', { get:()=>nebulas, configurable:true });

    if(window._pendingCelestials){
        const d = window._pendingCelestials;
        if(d.stars)    stars.forEach((s,i)=>{ if(d.stars[i])    Object.assign(s,d.stars[i]); });
        if(d.planets)  planets.forEach((p,i)=>{ if(d.planets[i])  Object.assign(p,d.planets[i]); });
        if(d.galaxies) galaxies.forEach((g,i)=>{ if(d.galaxies[i]) Object.assign(g,d.galaxies[i]); });
        if(d.suns)     suns.forEach((s,i)=>{ if(d.suns[i])     Object.assign(s,d.suns[i]); });
        if(d.nebulas)  nebulas.forEach((n,i)=>{ if(d.nebulas[i]) Object.assign(n,d.nebulas[i]); });
        _bgDirty = true;
        delete window._pendingCelestials;
    }

    createInspectPanel(); createGraphPanel(); createTraitPanel(); createGodPanel(); addGodButton(); initInput();
    loop();
});

let frameCount=0;
let _lastBgDayT=-1;
let _nebulaUpdateTimer=0;

function loop(){
    requestAnimationFrame(loop);
    if(!W||!H) return;
    frameCount++;
    updateDayNight();
    for(let i=1;i<Math.floor(window._daySpeedMult||1);i++) updateDayNight();

    spatialHash.clear();
    creatures.forEach(c=>spatialHash.insert(c));

    _nebulaUpdateTimer++;
    if(_nebulaUpdateTimer>=90){ _nebulaUpdateTimer=0; nebulas.forEach(n=>n.updatePosition()); _bgDirty=true; }

    const dayChanged=Math.abs(dayT-_lastBgDayT)>0.004;
    if(dayChanged||_bgDirty){
        renderBgToCache(nebulas);
        _lastBgDayT=dayT;
    }

    ctx.drawImage(_bgCanvas,0,0);
    updateDrawBlooms();

    if(frameCount%3===0) stars.forEach(s=>s.update());
    drawStarsBatched(stars);

    galaxies.forEach(g=>{g.update();g.draw();});
    suns.forEach(s=>{s.update();s.draw();});
    planets.forEach(p=>{p.update();p.draw();});
    comets.forEach(c=>{c.update();c.draw();});

    const newChildren=[];
    creatures=creatures.filter(c=>{ if(c._dead) return false; return updateCreature(c,planets,galaxies,stars,newChildren,suns); });
    newChildren.forEach(ch=>creatures.push(ch));

    const RESPAWN_COUNT={jellyfish:4,manta:3,seahorse:4,shark:3,anglerfish:3,leviathan:2};
    Object.keys(SPECIES_DEFS).forEach(k=>{
        if(!creatures.some(c=>c.species===k)){
            const def=SPECIES_DEFS[k];
            const margin=80*S;
            const n=RESPAWN_COUNT[k]??2;
            Array.from({length:n},(_,i)=>({x:rnd(margin,i<n/2?W*0.45:W*0.55+margin),y:rnd(margin,H-margin)})).forEach(pos=>{
                const c=spawnCreature(k,pos.x,pos.y);
                c.age=0;
                c.energy=160;
                creatures.push(c);
            });
        }
    });

    creatures.forEach(c=>drawCreature(c));
    ctx.globalAlpha=1;

    if(frameCount%120===0){
        const counts={}; creatures.forEach(c=>{counts[c.species]=(counts[c.species]||0)+1;});
        Object.keys(SPECIES_DEFS).forEach(sp=>{ popHistory[sp].push(counts[sp]||0); if(popHistory[sp].length>POP_MAX) popHistory[sp].shift(); });
    }
    drawHUD(); drawGraph(); updateTraitPanel();
    if(inspectedCreature) updateInspectPanel();
}