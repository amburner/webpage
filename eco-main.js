// =============================================
// COSMIC ECOSYSTEM — INIT & MAIN LOOP
// Depends on: eco-canvas.js, eco-creatures.js, eco-ui.js
// =============================================

// ── INIT & LOOP ───────────────────────────────────────────────────────────
const stars  =Array.from({length:IS_MOBILE?50:90},  ()=>new Star());
const planets=Array.from({length:IS_MOBILE?3:5},    ()=>new Planet());
const galaxies=Array.from({length:IS_MOBILE?1:2},   ()=>new Galaxy());
const suns   =Array.from({length:IS_MOBILE?2:4},    ()=>new Sun());
const comets =Array.from({length:IS_MOBILE?1:3},    ()=>new Comet());
const nebulas=Array.from({length:IS_MOBILE?4:8},    ()=>new Nebula());

// Defer heavy init so canvas paints its first frame before blocking JS work
window.addEventListener('load',()=>{
    resize();
    createInspectPanel(); createGraphPanel(); createTraitPanel(); createGodPanel(); addGodButton(); initInput();
    loop(); // start rendering immediately — creatures and nebula bakes trickle in
    setTimeout(()=>initCreatures(), IS_MOBILE ? 200 : 0);
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

    // Rebuild spatial hash once per frame
    spatialHash.clear();
    creatures.forEach(c=>spatialHash.insert(c));

    // Bake one unbaked nebula per frame — spreads load across first 4-8 frames
    const unbaked=nebulas.find(n=>!n._baked);
    if(unbaked){ unbaked._bake(); _bgDirty=true; }

    // Nebulas drift very slowly — update position every 90 frames only
    _nebulaUpdateTimer++;
    if(_nebulaUpdateTimer>=90){ _nebulaUpdateTimer=0; nebulas.forEach(n=>n.updatePosition()); _bgDirty=true; }

    // Rebuild BG cache only when day phase changes meaningfully
    const dayChanged=Math.abs(dayT-_lastBgDayT)>0.004;
    if(dayChanged||_bgDirty){
        renderBgToCache(nebulas);
        _lastBgDayT=dayT;
    }

    // Blit cached background — single drawImage, no gradient work
    ctx.drawImage(_bgCanvas,0,0);

    updateDrawBlooms();

    // Stars update every 3 frames on desktop, 4 on mobile
    if(frameCount%(IS_MOBILE?4:3)===0) stars.forEach(s=>s.update());
    drawStarsBatched(stars);

    galaxies.forEach(g=>{g.update();g.draw();});
    suns.forEach(s=>{s.update();s.draw();});
    planets.forEach(p=>{p.update();p.draw();});
    // Skip comet updates every other frame on mobile
    if(!IS_MOBILE||frameCount%2===0) comets.forEach(c=>{c.update();c.draw();});

    const newChildren=[];
    creatures=creatures.filter(c=>{ if(c._dead) return false; return updateCreature(c,planets,galaxies,stars,newChildren,suns); });
    newChildren.forEach(ch=>creatures.push(ch));

    Object.keys(SPECIES_DEFS).forEach(k=>{ if(!creatures.some(c=>c.species===k)){ const n=k==='leviathan'?2:k==='shark'||k==='anglerfish'?1:2; for(let i=0;i<n;i++) creatures.push(spawnCreature(k)); } });

    creatures.forEach(c=>drawCreature(c));
    ctx.globalAlpha=1;

    if(frameCount%120===0){
        const counts={}; creatures.forEach(c=>{counts[c.species]=(counts[c.species]||0)+1;});
        Object.keys(SPECIES_DEFS).forEach(sp=>{ popHistory[sp].push(counts[sp]||0); if(popHistory[sp].length>POP_MAX) popHistory[sp].shift(); });
    }
    if(frameCount%180===0) updateComplexity();
    drawHUD(); drawGraph(); updateTraitPanel();
    if(inspectedCreature) updateInspectPanel();
}
