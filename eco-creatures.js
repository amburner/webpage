// =============================================
// COSMIC ECOSYSTEM — CREATURES & AI
// Depends on: eco-canvas.js (canvas, ctx, W, H, rnd, pick, clamp, PALETTE,
//              dayT, foodBlooms, godMode declared in eco-ui.js)
// =============================================

// ── SPATIAL HASH for O(1) neighbour lookup ────────────────────────────────
// OPTIMIZED: replaces O(n²) creature.forEach inside updateCreature
class SpatialHash {
    constructor(cellSize){ this.cs=cellSize; this.cells=new Map(); }
    _key(x,y){ return ((x/this.cs|0)<<16)^(y/this.cs|0); }
    clear(){ this.cells.clear(); }
    insert(c){ const k=this._key(c.x,c.y); if(!this.cells.has(k)) this.cells.set(k,[]); this.cells.get(k).push(c); }
    query(x,y,r){
        const results=[], cs=this.cs;
        const x0=(x-r)/cs|0, x1=(x+r)/cs|0, y0=(y-r)/cs|0, y1=(y+r)/cs|0;
        for(let cx=x0;cx<=x1;cx++) for(let cy=y0;cy<=y1;cy++){
            const k=(cx<<16)^cy, cell=this.cells.get(k);
            if(cell) cell.forEach(c=>results.push(c));
        }
        return results;
    }
}
const spatialHash=new SpatialHash(100);

// ── NEURAL NET ────────────────────────────────────────────────────────────
const NN_IN=8, NN_H=6, NN_OUT=2;
const NN_W = NN_IN*NN_H + NN_H*NN_OUT + NN_H + NN_OUT;

function randomWeights(){ return Float32Array.from({length:NN_W},()=>rnd(-1,1)); }
function mutateWeights(w, rate=0.08){
    const out = new Float32Array(w);
    for(let i=0;i<out.length;i++) if(Math.random()<rate) out[i]=clamp(out[i]+rnd(-.3,.3),-2,2);
    return out;
}
function nnForward(w, inputs){
    let idx=0;
    const w1=w.slice(idx, idx+=NN_IN*NN_H);
    const b1=w.slice(idx, idx+=NN_H);
    const w2=w.slice(idx, idx+=NN_H*NN_OUT);
    const b2=w.slice(idx, idx+=NN_OUT);
    const h=new Float32Array(NN_H);
    for(let j=0;j<NN_H;j++){
        let s=b1[j];
        for(let i=0;i<NN_IN;i++) s+=inputs[i]*w1[j*NN_IN+i];
        h[j]=Math.tanh(s);
    }
    const out=new Float32Array(NN_OUT);
    for(let k=0;k<NN_OUT;k++){
        let s=b2[k];
        for(let j=0;j<NN_H;j++) s+=h[j]*w2[k*NN_H+j];
        out[k]=Math.tanh(s);
    }
    return out;
}

// ── CREATURES ─────────────────────────────────────────────────────────────
let generationCount=0, creatureIdCounter=0;
const SPECIES_DEFS={
    jellyfish:  {diet:'herb',baseColor:'#dd88ff',size:[8,16],  speed:[0.4,1.0], sense:60,  reproduce:0.0012,activeAtNight:true,
                 minBreedAge:300,  breedCooldown:400,  litterSize:[1,3], huntHunger:null},
    manta:      {diet:'herb',baseColor:'#00fff5',size:[14,24], speed:[0.3,0.8], sense:80,  reproduce:0.0009,activeAtNight:false,
                 minBreedAge:400,  breedCooldown:500,  litterSize:[1,2], huntHunger:null},
    seahorse:   {diet:'herb',baseColor:'#ff6ec7',size:[6,12],  speed:[0.2,0.5], sense:40,  reproduce:0.0012,activeAtNight:false,
                 minBreedAge:250,  breedCooldown:350,  litterSize:[2,4], huntHunger:null},
    shark:      {diet:'carn',baseColor:'#cc00ff',size:[18,32], speed:[0.6,1.4], sense:120, reproduce:0.0006,activeAtNight:true,
                 minBreedAge:700,  breedCooldown:900,  litterSize:[1,2], huntHunger:130},
    anglerfish: {diet:'carn',baseColor:'#ff2d78',size:[14,26], speed:[0.3,0.9], sense:100, reproduce:0.0006,activeAtNight:true,
                 minBreedAge:600,  breedCooldown:800,  litterSize:[1,2], huntHunger:125},
    leviathan:  {diet:'apex',baseColor:'#ff6b35',size:[40,80], speed:[0.30,0.75],sense:200,reproduce:0.0002,activeAtNight:true,
                 minBreedAge:1200, breedCooldown:1800, litterSize:[1,1], huntHunger:155},
};
let creatures=[], evoLog=[];
let popHistory={jellyfish:[],manta:[],seahorse:[],shark:[],anglerfish:[],leviathan:[]};
const POP_MAX=120, POP_CAP=60; // hard cap at 60 total creatures
let traitHistory={};

function lineageDrift(hex){
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return '#'+[r,g,b].map(v=>clamp(v+Math.floor(rnd(-10,10)),0,255).toString(16).padStart(2,'0')).join('');
}

function spawnCreature(key, x, y, parent){
    const def=SPECIES_DEFS[key];
    const mut=(v,r)=>parent?clamp(v+rnd(-r*2,r*2),r*.05,r*25):v;
    return {
        id:creatureIdCounter++, species:key, diet:def.diet,
        x:x??rnd(50,W-50), y:y??rnd(50,H-50),
        vx:rnd(-.5,.5)*Ss, vy:rnd(-.5,.5)*Ss,
        size:   parent?mut(parent.size,1.2)   :rnd(def.size[0],def.size[1])*S,
        speed:  parent?mut(parent.speed,.08)  :rnd(def.speed[0],def.speed[1])*Ss,
        sense:  parent?mut(parent.sense,6)    :def.sense*S,
        reproduce: parent?clamp(parent.reproduce+rnd(-.00008,.00008),.00003,.0015):def.reproduce,
        color:  parent?lineageDrift(parent.color):def.baseColor,
        energy: parent ? (def.diet==='herb' ? 200 : 185) : 160,
        age:0, maxAge:rnd(2500,6000), reproduced:false,
        frame:Math.random()*Math.PI*2,
        generation: parent?parent.generation+1:0,
        parentId: parent?parent.id:null,
        socialTrait: parent?clamp(parent.socialTrait+rnd(-.05,.08),0,1):rnd(0,.3),
        nnWeights: parent ? mutateWeights(parent.nnWeights) : randomWeights(),
        _wanderAngle:Math.random()*Math.PI*2, _scared:0, _newborn:parent?60:0, _children:[], _breedCooldown:0,
    };
}
function initCreatures(){
    Object.keys(SPECIES_DEFS).forEach(k=>{
        const n=k==='leviathan'?1:k==='shark'||k==='anglerfish'?3:k==='seahorse'?8:6;
        for(let i=0;i<n;i++) creatures.push(spawnCreature(k));
    });
}

// ── DRAWING ───────────────────────────────────────────────────────────────
function drawCreature(c){
    if(c._scared>0) c._scared--;
    if(c._newborn>0) c._newborn--;
    ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(Math.atan2(c.vy,c.vx));
    const s=c.size, def=SPECIES_DEFS[c.species];
    c.frame+=.05*c.speed*(c._scared>0?2:1);
    const w=Math.sin(c.frame)*s*.15;
    const nightDim=def.activeAtNight?1.0:0.3+0.7*dayT;
    if(c._newborn>0){
        ctx.globalAlpha=(c._newborn/60)*.7;
        ctx.fillStyle='#ffffff';
        ctx.beginPath(); ctx.arc(0,0,s*1.6,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1; // reset before main body draw
    }
    ctx.globalAlpha=clamp(c.energy/120,.3,1.0)*nightDim;
    ctx.fillStyle=c._scared>0?'#ffffff':c.color;
    switch(c.species){
        case 'jellyfish':  drawJF(c,s,w); break;
        case 'manta':      drawManta(c,s,w); break;
        case 'seahorse':   drawSH(c,s,w); break;
        case 'shark':      drawShark(c,s,w); break;
        case 'anglerfish': drawAF(c,s,w); break;
        case 'leviathan':  drawLev(c,s,w); break;
    }
    if(c===inspectedCreature){ ctx.globalAlpha=.6; ctx.strokeStyle='#ffffff'; ctx.lineWidth=2; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.arc(0,0,s+6,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
}
function drawJF(c,s,w){ ctx.fillStyle=c.color+'99'; ctx.beginPath(); ctx.ellipse(0,0,s*.7,s*.5,0,Math.PI,0); ctx.fill(); ctx.fillStyle=c.color+'44'; ctx.beginPath(); ctx.ellipse(0,0,s*.7,s*.5,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=c.color+'66'; ctx.lineWidth=1; for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(i*s*.15,s*.5); ctx.quadraticCurveTo(i*s*.2+w,s+w,i*s*.1,s*1.3+Math.abs(w)); ctx.stroke(); } }
function drawManta(c,s,w){ ctx.fillStyle=c.color+'cc'; ctx.beginPath(); ctx.moveTo(s*.8,0); ctx.quadraticCurveTo(0,-s*.5+w,-s*.8,0); ctx.quadraticCurveTo(0,s*.3-w,s*.8,0); ctx.fill(); ctx.strokeStyle=c.color+'66'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(-s*.8,0); ctx.quadraticCurveTo(-s,w*.5,-s*1.3,w); ctx.stroke(); }
function drawSH(c,s,w){ ctx.strokeStyle=c.color; ctx.lineWidth=s*.22; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(0,-s*.6); ctx.quadraticCurveTo(s*.3,0,w*.3,s*.4); ctx.quadraticCurveTo(-s*.3,s*.7,0,s*.8); ctx.stroke(); ctx.fillStyle=c.color; ctx.beginPath(); ctx.ellipse(s*.1,-s*.6,s*.2,s*.14,.5,0,Math.PI*2); ctx.fill(); }
function drawShark(c,s,w){ ctx.fillStyle=c.color+'cc'; ctx.beginPath(); ctx.moveTo(s,0); ctx.quadraticCurveTo(0,-s*.25+w*.2,-s,0); ctx.quadraticCurveTo(0,s*.2-w*.2,s,0); ctx.fill(); ctx.fillStyle=c.color; ctx.beginPath(); ctx.moveTo(0,-s*.18); ctx.lineTo(-s*.1,-s*.5); ctx.lineTo(-s*.25,-s*.18); ctx.fill(); ctx.beginPath(); ctx.moveTo(-s,0); ctx.lineTo(-s*1.3+w,-s*.3); ctx.lineTo(-s*1.3-w,s*.3); ctx.fill(); }
function drawAF(c,s,w){ ctx.fillStyle=c.color+'bb'; ctx.beginPath(); ctx.ellipse(0,0,s*.8,s*.6,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=c.color+'88'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(s*.6,-s*.3); ctx.quadraticCurveTo(s,-s*.8+w,s*.9,-s*.9); ctx.stroke(); ctx.fillStyle='#ffffaa'; ctx.beginPath(); ctx.arc(s*.9,-s*.9,s*.1,0,Math.PI*2); ctx.fill(); }
function drawLev(c,s,w){ ctx.fillStyle=c.color+'99'; ctx.beginPath(); ctx.moveTo(s,0); ctx.bezierCurveTo(s*.3,-s*.4+w,-s*.3,s*.4-w,-s,0); ctx.bezierCurveTo(-s*.3,s*.3,s*.3,-s*.3,s,0); ctx.fill(); ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(s*.7,-s*.1,s*.07,0,Math.PI*2); ctx.fill(); }

// ── AI + NEURAL NET UPDATE ────────────────────────────────────────────────
let godMode={foodMult:1.0,aggrMult:1.0,mutMult:1.0};

function updateCreature(c, planets, galaxies, stars, newChildren, suns){
    c.age++;
    const def=SPECIES_DEFS[c.species];
    const prevScared = c._scared; // track for post-scare wander sync
    const nightPenalty=def.activeAtNight?1.0:(0.3+0.7*dayT);
    c.energy -= (0.08+c.size*.003)*nightPenalty;
    c.energy += 0.06*godMode.foodMult;
    if(c.age>c.maxAge||c.energy<=0) return false;

    if(window._zergActive){
        const ef=150*S;
        if(c.x<ef) c.vx+=.08*Ss; if(c.x>W-ef) c.vx-=.08*Ss;
        if(c.y<ef) c.vy+=.08*Ss; if(c.y>H-ef) c.vy-=.08*Ss;
        if(Math.min(c.x,W-c.x,c.y,H-c.y)<ef) c._scared=Math.max(c._scared,10);
    }

    // OPTIMIZED: use spatial hash instead of scanning all creatures
    const mateSearchR = c.diet==='herb' ? c.sense*2 : c.sense*3.5;
    const nearby=spatialHash.query(c.x,c.y,Math.max(mateSearchR, 200*S));

    let threatDx=0,threatDy=0,threatD=Infinity;
    let preyDx=0,preyDy=0,preyD=Infinity;
    let mateDx=0,mateDy=0,mateD=Infinity, mateFound=null;

    nearby.forEach(o=>{
        if(o===c||o._dead) return;
        const dx=o.x-c.x, dy=o.y-c.y, d=dx*dx+dy*dy; // OPTIMIZED: skip sqrt until needed
        const isThreat=(c.diet==='herb'&&(o.diet==='carn'||o.diet==='apex'))||(c.diet==='carn'&&o.diet==='apex');
        const sense2threat=(c.sense*1.5)*(c.sense*1.5);
        if(isThreat&&d<sense2threat&&d<threatD){ threatDx=-(o.x-c.x); threatDy=-(o.y-c.y); threatD=d; }
        const isPrey=(c.diet==='carn'&&o.diet==='herb')||(c.diet==='apex'&&(o.diet==='herb'||o.diet==='carn'));
        const sense2prey=(c.sense*godMode.aggrMult)*(c.sense*godMode.aggrMult);
        if(isPrey&&d<sense2prey&&d<preyD){ preyDx=o.x-c.x; preyDy=o.y-c.y; preyD=d; }
        const _mateMin = c.diet==='herb' ? 110 : 80;
        if(c._breedCooldown<=0&&c.age>=def.minBreedAge&&o.species===c.species&&o.energy>_mateMin&&o._breedCooldown<=0){            // Predators get wider mate detection — they're spread out and need to find each other
            const mateSearchR = c.diet==='herb' ? c.sense*2 : c.sense*3.5;
            if(d<mateSearchR*mateSearchR&&d<mateD){ mateDx=o.x-c.x; mateDy=o.y-c.y; mateD=d; mateFound=o; }
        }
    });

    // Celestial food — seek an orbit point at safe radius, not the dead center
    let foodDx=0,foodDy=0,foodD=Infinity;
    [...planets,...galaxies,...suns].forEach(obj=>{
        const dx=obj.x-c.x, dy=obj.y-c.y, d2=dx*dx+dy*dy;
        const gravR=obj.grav||obj.r*4;
        if(d2<gravR*gravR&&d2<foodD){
            const d=Math.sqrt(d2)||1;
            const orbitR=obj.r*2.2;
            if(d > orbitR){
                // Outside orbit radius — move toward it
                foodDx=dx/d*(d-orbitR); foodDy=dy/d*(d-orbitR);
            } else {
                // Inside orbit radius — move tangentially to orbit, not away
                foodDx=-dy/d*c.speed; foodDy=dx/d*c.speed;
            }
            foodD=d2;
        }
    });
    foodBlooms.forEach(b=>{ const dx=b.x-c.x,dy=b.y-c.y,d=dx*dx+dy*dy; if(d<(b.r*2)*(b.r*2)&&d<foodD){foodDx=dx;foodDy=dy;foodD=d;} });

    const ns=(v,mx)=>clamp(v/mx,-1,1);
    const inputs=new Float32Array([
        ns(threatDx,c.sense), ns(threatDy,c.sense),
        ns(preyDx,c.sense),   ns(preyDy,c.sense),
        ns(foodDx,400),        ns(foodDy,400),
        ns(mateDx,c.sense*2), ns(mateDy,c.sense*2),
    ]);

    const nnOut = nnForward(c.nnWeights, inputs);

    let desiredX=c.vx, desiredY=c.vy, dominated=false;

    if(c._scared>0){
        c._wanderAngle=Math.atan2(c.vy,c.vx);
    } else {
        // First frame after scare ends — re-sync wander angle so there's no direction discontinuity
        if(prevScared > 0){
            c._wanderAngle=Math.atan2(c.vy,c.vx);
        }
        const fleeWeight = clamp(0.5 - nnOut[0]*0.5, 0, 1);
        const huntWeight = clamp(0.5 + nnOut[0]*0.5, 0, 1);
        const mateWeight = clamp(0.5 + nnOut[1]*0.5, 0, 1);
        const foodWeight = clamp(0.5 - nnOut[1]*0.5, 0, 1);

        if(c.species==='shark'){ const n=creatures.filter(x=>x.species==='shark').length; c._crowdFactor=clamp(1-(n-8)*.05,.4,1); }
        else c._crowdFactor=1;

        if(threatD<Infinity && fleeWeight>0.3){
            const d=Math.sqrt(threatDx*threatDx+threatDy*threatDy)||1;
            desiredX=threatDx/d*c.speed*fleeWeight*2; desiredY=threatDy/d*c.speed*fleeWeight*2;
            dominated=true; c._scared=Math.min(c._scared+2,30);
        }

        if(!dominated&&preyD<Infinity&&huntWeight>0.4){
            const hungry = def.huntHunger===null || c.energy < def.huntHunger;
            if(hungry){
            const d=Math.sqrt(preyDx*preyDx+preyDy*preyDy)||1;
            if(c.diet==='apex'){
                // Apex predators: bypass smoothing, commit velocity directly so they don't oscillate
                c.vx=preyDx/d*c.speed; c.vy=preyDy/d*c.speed;
            }
            desiredX=preyDx/d*c.speed*(c._crowdFactor||1); desiredY=preyDy/d*c.speed*(c._crowdFactor||1); dominated=true;
            // Kill check using nearby (already filtered)
            nearby.forEach(p=>{ if(p===c||p._dead) return; const isPrey=(c.diet==='carn'&&p.diet==='herb')||(c.diet==='apex'&&(p.diet==='herb'||p.diet==='carn')); if(!isPrey) return; const dx=p.x-c.x,dy=p.y-c.y,d2=Math.sqrt(dx*dx+dy*dy); if(d2<c.size+p.size){ c.energy+=p.size*14*(1+c.size*.04); p._dead=true; } });
            }
        }

        const breedRange = c.sense * 2.5;
        // Mate seeking: higher priority than food — always pursue if ready, no NN weight gate
        if(!dominated&&c._breedCooldown<=0&&c.age>=def.minBreedAge&&mateD<Infinity){
            const mateDistReal = Math.sqrt(mateD);
            if(mateDistReal > breedRange){
                const d=mateDistReal||1;
                const mateSpd = c.diet==='herb' ? c.speed : c.speed * 1.2;
                desiredX=mateDx/d*mateSpd; desiredY=mateDy/d*mateSpd; dominated=true;
            } else {
                // Already in breed range — orbit gently so they stay together
                const d=mateDistReal||1;
                desiredX=(-mateDy/d)*c.speed*0.4;
                desiredY=(mateDx/d)*c.speed*0.4;
                dominated=true;
            }
        }

        if(!dominated&&(c.diet==='herb'||c.energy<80)){
            if(foodD<Infinity&&foodWeight>0.3){
                const d=Math.sqrt(foodDx*foodDx+foodDy*foodDy)||1;
                desiredX=foodDx/d*c.speed; desiredY=foodDy/d*c.speed; dominated=true;
            }
        }

        // Universal core repulsion — only if not already committed to a hunt/flee
        if(!dominated && c.diet!=='apex'){
            [...planets,...galaxies,...suns].forEach(obj=>{
                const dx=obj.x-c.x, dy=obj.y-c.y, dist=Math.sqrt(dx*dx+dy*dy)||1;
                const coreR=obj.r*1.1;
                if(dist<coreR){ desiredX-=dx/dist*c.speed*1.5; desiredY-=dy/dist*c.speed*1.5; dominated=true; }
            });
        }

        if(c.diet==='herb'){
            [...planets,...galaxies].forEach(obj=>{
                const dx=obj.x-c.x, dy=obj.y-c.y, d=Math.sqrt(dx*dx+dy*dy)||1;
                if(d<obj.r*0.9){
                    // Inside core — strong push out, lose energy
                    desiredX-=dx/d*c.speed*2; desiredY-=dy/d*c.speed*2; dominated=true;
                    c.energy-=1.5;
                } else if(d<obj.r*2.5){
                    if(obj._feederCount===undefined||obj._feederCount<(obj._feederCap||8)){ if(obj._feederCount!==undefined) obj._feederCount++; c.energy+=2.2*godMode.foodMult; }
                }
            });
            suns.forEach(s=>{
                const dx=s.x-c.x, dy=s.y-c.y, d=Math.sqrt(dx*dx+dy*dy)||1;
                if(d<s.r*1.2){
                    // Too close to sun core — push out
                    desiredX-=dx/d*c.speed*2; desiredY-=dy/d*c.speed*2; dominated=true;
                    c.energy-=1.0;
                } else if(d<s.grav){
                    if(s._feederCount===undefined||s._feederCount<(s._feederCap||6)){ if(s._feederCount!==undefined) s._feederCount++; c.energy+=(1-d/s.grav)*2.5*godMode.foodMult; }
                }
            });
            stars.forEach(s=>{ const dx=s.x-c.x,dy=s.y-c.y,d=Math.sqrt(dx*dx+dy*dy); if(d<80*S) c.energy+=.6*godMode.foodMult; });
            const edgeD=Math.min(c.x,c.y,W-c.x,H-c.y); if(edgeD<120*S) c.energy+=(1-edgeD/(120*S))*1.5*godMode.foodMult;
            c.energy+=.04*godMode.foodMult;
        }
        foodBlooms.forEach(b=>{ const dx=b.x-c.x,dy=b.y-c.y,d=Math.sqrt(dx*dx+dy*dy); if(d<b.r&&(b._feederCount===undefined||b._feederCount<(b._feederCap||3))){ if(b._feederCount!==undefined) b._feederCount++; c.energy+=3*godMode.foodMult; } });
    }

    if(!dominated&&_complexityUnlocked){
        const em=applyEmergent(c,nearby); // OPTIMIZED: pass pre-filtered nearby
        if(em){ desiredX=em.vx; desiredY=em.vy; dominated=true; }
    }

    if(!dominated){
        c._wanderAngle += clamp(rnd(-.015,.015), -.012, .012);

        // Near a wall — steer wander angle back toward center
        const edgePad = 150*S;
        let wallBias = 0;
        if(c.x < edgePad)     wallBias =  Math.PI * 0.5 * (1 - c.x / edgePad);
        if(c.x > W - edgePad) wallBias = -Math.PI * 0.5 * (1 - (W - c.x) / edgePad);
        if(c.y < edgePad)     wallBias +=  Math.PI * 0.5 * (1 - c.y / edgePad);
        if(c.y > H - edgePad) wallBias -= Math.PI * 0.5 * (1 - (H - c.y) / edgePad);

        if(wallBias !== 0){
            const target = Math.atan2(H/2 - c.y, W/2 - c.x);
            const diff = ((target - c._wanderAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            c._wanderAngle += diff * 0.04 * Math.abs(wallBias) / (Math.PI * 0.5);
        }

        desiredX = Math.cos(c._wanderAngle) * c.speed;
        desiredY = Math.sin(c._wanderAngle) * c.speed;
    }

    // When a goal dominates, commit directly — no smoothing lag causing jitter
    // Only apply gentle smoothing during undirected wander
    if(c._scared<=0){
        if(dominated){
            if(c.diet==='herb'){
                // Herbs use gentle smoothing even when goal-directed — prevents orbit oscillation
                const mt = 0.04;
                const smoothing = 0.06;
                c.vx += clamp((desiredX - c.vx) * smoothing, -mt, mt);
                c.vy += clamp((desiredY - c.vy) * smoothing, -mt, mt);
            } else {
                // Carnivores/apex commit directly — full speed toward target immediately
                const targetSpd = Math.sqrt(desiredX*desiredX+desiredY*desiredY)||1;
                c.vx = desiredX/targetSpd*c.speed;
                c.vy = desiredY/targetSpd*c.speed;
            }
        } else {
            // Wander only — gentle smoothing so direction changes feel organic
            const mt = 0.06;
            const smoothing = 0.08;
            c.vx += clamp((desiredX - c.vx) * smoothing, -mt, mt);
            c.vy += clamp((desiredY - c.vy) * smoothing, -mt, mt);
        }
    }
    const spd=Math.sqrt(c.vx*c.vx+c.vy*c.vy);
    const szPen=clamp(1-(c.size-12)*.008,.5,1);
    const maxSpd=c._scared>0?c.speed*3.5:c.speed*szPen*(c._crowdFactor||1);
    if(spd>maxSpd){c.vx=c.vx/spd*maxSpd;c.vy=c.vy/spd*maxSpd;}
    if(c._scared>0){c.vx*=.97;c.vy*=.97;}
    if(spd<.05*Ss&&c._scared<=0){c.vx+=rnd(-.04,.04)*Ss;c.vy+=rnd(-.04,.04)*Ss;}

    // ── SEPARATION: perpendicular nudge keeps heading intact ─────────────
    {
        const hx=c.vx, hy=c.vy, hlen=Math.sqrt(hx*hx+hy*hy)||1;
        const px=hy/hlen, py=-hx/hlen;
        nearby.forEach(o=>{
            if(o===c||o._dead||o.species!==c.species) return;
            const dx=c.x-o.x, dy=c.y-o.y, dist2=dx*dx+dy*dy;
            const minD=(c.size+o.size)*0.5; // true body overlap only
            if(dist2>=minD*minD||dist2===0) return;
            const dist=Math.sqrt(dist2);
            const overlap=(minD-dist)/minD;
            const nx=dx/dist, ny=dy/dist;
            const perpDot=nx*px+ny*py;
            c.vx+=px*perpDot*overlap*c.speed*0.3;
            c.vy+=py*perpDot*overlap*c.speed*0.3;
        });
    }

    // Soft gradient boundary push
    const pad = 120*S;
    if(c.x < pad)     c.vx += (pad - c.x) / pad * 0.3;
    if(c.x > W - pad) c.vx -= (c.x - (W - pad)) / pad * 0.3;
    if(c.y < pad)     c.vy += (pad - c.y) / pad * 0.3;
    if(c.y > H - pad) c.vy -= (c.y - (H - pad)) / pad * 0.3;

    // Hard reflect at true edge
    const hardPad = 20*S;
    if(c.x < hardPad)     { c.vx = Math.abs(c.vx) + 0.2*Ss; c._wanderAngle = rnd(-0.5, 0.5); }
    if(c.x > W - hardPad) { c.vx = -(Math.abs(c.vx) + 0.2*Ss); c._wanderAngle = Math.PI + rnd(-0.5, 0.5); }
    if(c.y < hardPad)     { c.vy = Math.abs(c.vy) + 0.2*Ss; }
    if(c.y > H - hardPad) { c.vy = -(Math.abs(c.vy) + 0.2*Ss); }

    c.x += c.vx; c.y += c.vy;

    // ── REPRODUCTION ─────────────────────────────────────────────────────
    if(c._breedCooldown>0) c._breedCooldown--;

    const reproRate    = c.reproduce * godMode.mutMult;
    const speciesCount = creatures.filter(x=>x.species===c.species).length;
    const densityPenalty = speciesCount/(creatures.length||1)>0.4 ? 0.4 : 1.0;
    const energyThreshold = c.diet==='herb' ? 170 : 130;
    const mateEnergyMin   = c.diet==='herb' ? 130 : 90;

    // Breed when mate is within sense range — no collision needed
    const mateClose = mateFound && Math.sqrt(mateD) < c.sense * 0.9;
    const mateOk    = mateClose && mateFound.energy > mateEnergyMin;
    const mature    = c.age >= def.minBreedAge;
    const cooled    = c._breedCooldown <= 0;

    if(mature && cooled && c.energy>energyThreshold && mateOk
       && Math.random()<reproRate*densityPenalty && creatures.length<POP_CAP){

        const [litMin,litMax] = def.litterSize;
        const litter = Math.min(
            litMin + Math.floor(Math.random()*(litMax-litMin+1)),
            POP_CAP - creatures.length - newChildren.length
        );

        if(litter > 0){
            mateFound.energy *= Math.max(0.35, 1 - litter*0.12);
            c.energy         *= Math.max(0.30, 1 - litter*0.15);
            c._breedCooldown          = def.breedCooldown;
            mateFound._breedCooldown  = def.breedCooldown;

            for(let li=0; li<litter; li++){
                const child = spawnCreature(c.species,
                    c.x + rnd(-20,20)*S, c.y + rnd(-20,20)*S, c);
                c._children.push(child.id);
                newChildren.push(child);
                if(child.generation>generationCount){
                    generationCount=child.generation;
                    if(evoLog.length<20) evoLog.push(`Gen ${child.generation}: ${child.species}`);
                }
            }
            if(!traitHistory[c.species]) traitHistory[c.species]=[];
            const sp = creatures.filter(x=>x.species===c.species);
            if(sp.length){
                const avgSz  = sp.reduce((a,x)=>a+x.size, 0)/sp.length;
                const avgSpd = sp.reduce((a,x)=>a+x.speed,0)/sp.length;
                const lastChild = newChildren[newChildren.length-1];
                traitHistory[c.species].push({gen:lastChild.generation,avgSize:avgSz,avgSpeed:avgSpd});
                if(traitHistory[c.species].length>50) traitHistory[c.species].shift();
            }
        }
    }
    c.energy=clamp(c.energy,0,200);
    return true;
}

// ── EMERGENT INTELLIGENCE ─────────────────────────────────────────────────
let _complexityScore=0, _complexityUnlocked=false;
function updateComplexity(){
    if(!creatures.length) return;
    const n=creatures.length;
    const avgSense=creatures.reduce((a,c)=>a+c.sense,0)/n;
    const avgSocial=creatures.reduce((a,c)=>a+(c.socialTrait||0),0)/n;
    const avgAge=creatures.reduce((a,c)=>a+c.age,0)/n;
    _complexityScore=avgSense*avgSocial*(avgAge/2000);
    _complexityUnlocked=_complexityScore>0.8;
}
// OPTIMIZED: now receives pre-filtered nearby array instead of scanning all creatures
function applyEmergent(c, nearby){
    const social=c.socialTrait||0; if(social<.4) return null;
    const sameSpecies=nearby.filter(o=>!o._dead&&o.species===c.species&&(()=>{const dx=o.x-c.x,dy=o.y-c.y;return Math.sqrt(dx*dx+dy*dy)<c.sense*1.2;})());
    if(sameSpecies.length<2) return null;
    if((c.diet==='carn'||c.diet==='apex')&&social>.5){
        const cx2=sameSpecies.reduce((a,o)=>a+o.x,c.x)/(sameSpecies.length+1), cy2=sameSpecies.reduce((a,o)=>a+o.y,c.y)/(sameSpecies.length+1);
        let bp=null,bd=Infinity;
        nearby.forEach(p=>{ if(p._dead) return; const ip=(c.diet==='carn'&&p.diet==='herb')||(c.diet==='apex'&&(p.diet==='herb'||p.diet==='carn')); if(!ip) return; const dx=p.x-cx2,dy=p.y-cy2,d=Math.sqrt(dx*dx+dy*dy); if(d<c.sense*2&&d<bd){bd=d;bp=p;} });
        if(bp){ const dx=bp.x-c.x,dy=bp.y-c.y,d=Math.sqrt(dx*dx+dy*dy)||1; return {vx:dx/d*c.speed,vy:dy/d*c.speed}; }
    }
    if(c.diet==='herb'&&social>.45){
        if(sameSpecies.some(o=>o._scared>0)||c._scared>0){
            const cx2=sameSpecies.reduce((a,o)=>a+o.x,c.x)/(sameSpecies.length+1), cy2=sameSpecies.reduce((a,o)=>a+o.y,c.y)/(sameSpecies.length+1);
            const dx=c.x-cx2,dy=c.y-cy2,d=Math.sqrt(dx*dx+dy*dy)||1, tr=40+sameSpecies.length*8, diff=d-tr;
            if(Math.abs(diff)>10){ const dir=diff>0?-1:1; return {vx:(dx/d)*dir*c.speed*.7+(-dy/d)*c.speed*.5,vy:(dy/d)*dir*c.speed*.7+(dx/d)*c.speed*.5}; }
            return {vx:(-dy/d)*c.speed,vy:(dx/d)*c.speed};
        }
    }
    if(social>.65&&sameSpecies.length>=3){
        const avgVx=sameSpecies.reduce((a,o)=>a+o.vx,0)/sameSpecies.length, avgVy=sameSpecies.reduce((a,o)=>a+o.vy,0)/sameSpecies.length;
        return {vx:avgVx*.6+c.vx*.4, vy:avgVy*.6+c.vy*.4};
    }
    return null;
}