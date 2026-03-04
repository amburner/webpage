// =============================================
// COSMIC ECOSYSTEM — UI PANELS, HUD, INPUT
// Depends on: eco-canvas.js, eco-creatures.js
// =============================================

// ── INSPECT PANEL ─────────────────────────────────────────────────────────
let inspectedCreature=null, inspectPanel=null;
function createInspectPanel(){
    inspectPanel=document.createElement('div'); inspectPanel.id='eco-inspect';
    inspectPanel.style.cssText="position:fixed;top:50%;right:16px;transform:translateY(-50%);background:#0d0010ee;border:1px solid #cc00ff;color:#e8d5f5;font-family:'Share Tech Mono',monospace;font-size:11px;padding:12px;z-index:9000;min-width:180px;max-width:220px;display:none;line-height:1.6;pointer-events:auto;";
    document.body.appendChild(inspectPanel);
}
function updateInspectPanel(){
    if(!inspectedCreature||!inspectPanel) return;
    const c=inspectedCreature;
    if(!creatures.includes(c)){ closeInspect(); return; }
    const def=SPECIES_DEFS[c.species], par=creatures.find(x=>x.id===c.parentId);
    const topW=Array.from(c.nnWeights).slice(0,6).map(v=>v.toFixed(2)).join(' ');
    inspectPanel.innerHTML=`
        <div style="color:${def.baseColor};font-size:13px;margin-bottom:6px">◈ ${c.species.toUpperCase()}</div>
        <div>gen: <b style="color:#ff6ec7">${c.generation}</b></div>
        <div>energy: <b style="color:${c.energy>100?'#00fff5':'#ff2d78'}">${Math.round(c.energy)}</b></div>
        <div>size: ${c.size.toFixed(1)} | spd: ${c.speed.toFixed(2)}</div>
        <div>sense: ${c.sense.toFixed(0)} | social: ${(c.socialTrait||0).toFixed(2)}</div>
        <div>age: ${c.age}/${Math.round(c.maxAge)}</div>
        <div>children: ${c._children.length} | parent: ${par?par.species:'none'}</div>
        <div>reproduced: <b style="color:${c.reproduced?'#00fff5':'#ff6b35'}">${c.reproduced}</b></div>
        <div style="color:#9b7db5;font-size:9px;margin-top:4px;word-break:break-all">net: ${topW}…</div>
        <div style="color:#9b7db5;font-size:10px;margin-top:4px">right-click to close</div>`;
    inspectPanel.style.display='block';
}
function closeInspect(){ inspectedCreature=null; if(inspectPanel) inspectPanel.style.display='none'; }

// ── GRAPH ─────────────────────────────────────────────────────────────────
let graphCanvas,graphCtx,showGraph=false;
function createGraphPanel(){
    graphCanvas=document.createElement('canvas'); graphCanvas.width=360; graphCanvas.height=180;
    graphCanvas.style.cssText='position:fixed;top:16px;right:16px;z-index:9000;border:1px solid #cc00ff66;display:none;background:#0d0010bb;pointer-events:none;opacity:0.75;';
    document.body.appendChild(graphCanvas); graphCtx=graphCanvas.getContext('2d');
}
function drawGraph(){
    if(!showGraph) return;
    const gc=graphCtx,gw=graphCanvas.width,gh=graphCanvas.height;
    gc.clearRect(0,0,gw,gh); gc.fillStyle='#0d0010cc'; gc.fillRect(0,0,gw,gh);
    const spp=Object.keys(popHistory), maxP=Math.max(10,...spp.flatMap(s=>popHistory[s]));
    const off=100;
    spp.forEach(sp=>{
        const hist=popHistory[sp]; if(hist.length<2) return;
        gc.strokeStyle=SPECIES_DEFS[sp].baseColor+'cc'; gc.lineWidth=1.5; gc.beginPath();
        hist.forEach((v,i)=>{ const x=off+(i/(POP_MAX-1))*(gw-off), y=gh-(v/maxP)*(gh-6)-3; i===0?gc.moveTo(x,y):gc.lineTo(x,y); }); gc.stroke();
    });
    const lh=13,lp=4;
    gc.fillStyle='rgba(8,0,16,0.85)'; gc.fillRect(0,0,100,spp.length*lh+lp*2);
    gc.font='9px Share Tech Mono,monospace';
    spp.forEach((sp,i)=>{ const cur=popHistory[sp][popHistory[sp].length-1]||0; gc.fillStyle=SPECIES_DEFS[sp].baseColor; gc.fillText(`● ${sp} ${cur}`,lp,lp+lh*(i+.85)); });
}

// ── TRAIT PANEL ───────────────────────────────────────────────────────────
let traitPanel,showTraits=false;
function createTraitPanel(){
    traitPanel=document.createElement('div');
    traitPanel.style.cssText="position:fixed;bottom:130px;left:10px;z-index:9000;background:#0d0010cc;border:1px solid #cc00ff44;color:#e8d5f5;font-family:'Share Tech Mono',monospace;font-size:10px;padding:8px;display:none;pointer-events:none;min-width:160px;line-height:1.5;";
    document.body.appendChild(traitPanel);
}
function updateTraitPanel(){
    if(!showTraits||!traitPanel) return;
    let h='<div style="color:#cc00ff;margin-bottom:4px">TRAIT EVOLUTION</div>';
    Object.keys(SPECIES_DEFS).forEach(sp=>{
        const cur=creatures.filter(c=>c.species===sp); if(!cur.length) return;
        const avgSz=(cur.reduce((a,c)=>a+c.size,0)/cur.length).toFixed(1);
        const avgSpd=(cur.reduce((a,c)=>a+c.speed,0)/cur.length).toFixed(2);
        const minSz=Math.min(...cur.map(c=>c.size)).toFixed(1), maxSz=Math.max(...cur.map(c=>c.size)).toFixed(1);
        h+=`<div style="color:${SPECIES_DEFS[sp].baseColor};margin-top:4px">${sp}</div><div>sz:${minSz}–${maxSz} avg:${avgSz} spd:${avgSpd}</div>`;
    });
    traitPanel.innerHTML=h; traitPanel.style.display='block';
}

// ── GOD MODE ──────────────────────────────────────────────────────────────
let godPanel,showGod=false;
function createGodPanel(){
    godPanel=document.createElement('div'); godPanel.id='eco-god';
    godPanel.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#0d0010f0;border:1px solid #ff00ff;color:#e8d5f5;font-family:'Share Tech Mono',monospace;font-size:12px;padding:16px 20px;z-index:9999;display:none;min-width:260px;pointer-events:auto;";
    godPanel.innerHTML=`<div style="color:#ff00ff;font-size:14px;margin-bottom:12px">⚡ GOD MODE</div>
        ${[['food','Food Mult','#ff00ff',0,5],['aggr','Predator Aggr','#cc00ff',0,3],['mut','Mutation Rate','#00fff5',0,5],['day','Day Speed','#ffff00',.1,10]].map(([id,label,col,mn,mx])=>`<div style="margin-bottom:8px"><label>${label}: <span id="god-${id}-val">1.0</span>x</label><br><input id="god-${id}" type="range" min="${mn}" max="${mx}" step="0.1" value="1" style="width:100%;accent-color:${col}"></div>`).join('')}
        <div style="color:#9b7db5;font-size:10px;margin-top:8px">press G to close</div>`;
    document.body.appendChild(godPanel);
    const bind=(id,cb)=>{ godPanel.querySelector(`#god-${id}`).addEventListener('input',e=>{ const v=parseFloat(e.target.value); godPanel.querySelector(`#god-${id}-val`).textContent=v.toFixed(1); cb(v); }); };
    bind('food',v=>godMode.foodMult=v); bind('aggr',v=>godMode.aggrMult=v); bind('mut',v=>godMode.mutMult=v); bind('day',v=>window._daySpeedMult=v);
}
window._daySpeedMult=1;

// ── HUD ───────────────────────────────────────────────────────────────────
function drawHUD(){
    const counts={};
    creatures.forEach(c=>{counts[c.species]=(counts[c.species]||0)+1;});
    ctx.save(); ctx.font='11px Share Tech Mono,monospace';
    let y=18;
    Object.entries(counts).forEach(([sp,n])=>{ ctx.globalAlpha=.75; ctx.fillStyle=SPECIES_DEFS[sp].baseColor; ctx.fillText(`${sp}: ${n}`,10,y); y+=14; });
    if(generationCount>0){ ctx.fillStyle='#dd88ff'; ctx.fillText(`max gen: ${generationCount}`,10,y+2); y+=14; }
    ctx.fillStyle=dayT>.5?'#ffffaa':'#8888ff'; ctx.fillText(dayT>.5?'DAY':'NIGHT',10,y+2);
    ctx.globalAlpha=1; ctx.restore();
}

// ── BUTTONS ───────────────────────────────────────────────────────────────
function addGodButton(){
    const mkBtn=(label,col,bottom,onClick)=>{
        const b=document.createElement('button');
        b.innerText=label; b.style.cssText=`position:fixed;bottom:${bottom}px;left:18px;z-index:99998;background:#0d0010;color:${col};font-family:"Comic Sans MS",monospace;font-size:15px;font-weight:bold;padding:10px 18px;border:2px solid ${col};cursor:pointer;text-shadow:0 0 8px ${col};box-shadow:0 0 15px ${col}44;letter-spacing:1px;`;
        b.addEventListener('click',onClick); document.body.appendChild(b); return b;
    };
    mkBtn('⚡ GOD MODE','#ffff00',122,()=>{ showGod=!showGod; godPanel.style.display=showGod?'block':'none'; });
    mkBtn('📈 GRAPH','#00fff5',174,()=>{
        showGraph=!showGraph; showTraits=showGraph;
        graphCanvas.style.display=showGraph?'block':'none';
        if(traitPanel) traitPanel.style.display=showTraits?'block':'none';
    });
    document.addEventListener('keydown',e=>{ if(e.key==='g'||e.key==='G'){ showGod=!showGod; godPanel.style.display=showGod?'block':'none'; } });
}

// ── INPUT ─────────────────────────────────────────────────────────────────
function initInput(){
    canvas.style.pointerEvents='auto';
    canvas.addEventListener('mousedown',e=>{ if(e.button===0) isDragging=true; });
    canvas.addEventListener('mousemove',e=>{ if(!isDragging) return; const r=canvas.getBoundingClientRect(); if(++dragBloomTimer%8===0) addFoodBloom(e.clientX-r.left,e.clientY-r.top); },{passive:true});
    canvas.addEventListener('mouseup',e=>{
        if(e.button!==0) return; isDragging=false; dragBloomTimer=0;
        const r=canvas.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
        creatures.forEach(c=>{ const dx=c.x-mx,dy=c.y-my,d=Math.sqrt(dx*dx+dy*dy); if(d<c.size*5+35&&d>0){ const f=clamp((c.size*2.5+20-d)/(c.size*2.5+20),.2,1), a=Math.atan2(dy,dx), sp=rnd(-.6,.6); c.vx=Math.cos(a+sp)*c.speed*3.5*f; c.vy=Math.sin(a+sp)*c.speed*3.5*f; c._wanderAngle=a+sp; c._scared=80; } });
    });
    canvas.addEventListener('contextmenu',e=>{
        e.preventDefault();
        if(inspectedCreature){ closeInspect(); return; }
        const r=canvas.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
        let nearest=null,nd=Infinity;
        creatures.forEach(c=>{ const dx=c.x-mx,dy=c.y-my,d=Math.sqrt(dx*dx+dy*dy); if(d<c.size*4+30&&d<nd){nd=d;nearest=c;} });
        if(nearest){ inspectedCreature=nearest; updateInspectPanel(); }
    });
    canvas.addEventListener('touchmove',e=>{ e.preventDefault(); const r=canvas.getBoundingClientRect(),t=e.touches[0]; if(++dragBloomTimer%8===0) addFoodBloom(t.clientX-r.left,t.clientY-r.top); },{passive:false});
    canvas.addEventListener('touchend',()=>{ isDragging=false; dragBloomTimer=0; });
}
