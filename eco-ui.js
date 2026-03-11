// =============================================
// COSMIC ECOSYSTEM — UI PANELS, HUD, INPUT
// Depends on: eco-canvas.js, eco-creatures.js
// Now with mobile support. You're welcome.
// =============================================

// ── INSPECT PANEL ─────────────────────────────────────────────────────────
let inspectedCreature=null, inspectPanel=null;
function createInspectPanel(){
    inspectPanel=document.createElement('div'); inspectPanel.id='eco-inspect'; // sizing via eco-styles.css
    document.body.appendChild(inspectPanel);
}
function updateInspectPanel(){
    if(!inspectedCreature||!inspectPanel) return;
    const c=inspectedCreature;
    if(!creatures.includes(c)){ closeInspect(); return; }
    const def=SPECIES_DEFS[c.species], par=creatures.find(x=>x.id===c.parentId);
    // Top Q-values for current state (shows what the creature has learned to prefer)
    const nActions = c._qNActions ?? 9;
    const actionNames = c.diet === 'herb'
        ? ['FLEEING','FLEE-FAST','HIDING','FEEDING','GRAZING','WANDERING','SCHOOLING','FOLLOWING','WANDERING']
        : ['FLEEING','FLEE-FAST','HIDING','HUNTING','AMBUSH','STALKING','PATROLLING','WANDERING','WANDERING'];
    const qBase = (c._qState ?? 0) * nActions;
    const qTop = Array.from({length: nActions}, (_, a) => ({a, v: c.qTable?.[qBase + a] ?? 0}))
        .sort((x, y) => y.v - x.v).slice(0, 3)
        .map(({a, v}) => `${(actionNames[a] ?? '?').slice(0, 7)}:${v.toFixed(2)}`).join(' ');

    // Detect touch device so we know whether to show tap-to-close or right-click hint
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    inspectPanel.innerHTML=`
        <div style="color:${def.baseColor};font-size:13px;margin-bottom:6px">◈ ${c.species.toUpperCase()}</div>
        <div>gen: <b style="color:#ff6ec7">${c.generation}</b></div>
        <div>energy: <b style="color:${c.energy>100?'#00fff5':'#ff2d78'}">${Math.round(c.energy)}</b></div>
        <div>size: ${c.size.toFixed(1)} | spd: ${c.speed.toFixed(2)}</div>
        <div>sense: ${c.sense.toFixed(0)} | social: ${(c.socialTrait||0).toFixed(2)}</div>
        <div>age: ${c.age}/${Math.round(c.maxAge)}</div>
        <div>children: ${c._children.length} | parent: ${par?par.species:'none'}</div>
        <div>reproduced: <b style="color:${c.reproduced?'#00fff5':'#ff6b35'}">${c.reproduced??false}</b></div>
        <div>action: <b style="color:#ff6ec7">${c._state}</b></div>
        <div style="color:#9b7db5;font-size:9px;margin-top:4px;word-break:break-all">q-top: ${qTop}</div>
        ${isTouch
            ? `<div id="inspect-close-btn" style="margin-top:8px;padding:6px 8px;background:#ff2d7833;border:1px solid #ff2d78;border-radius:4px;text-align:center;cursor:pointer;color:#ff2d78;font-size:11px">✕ close</div>`
            : `<div style="color:#9b7db5;font-size:10px;margin-top:4px">right-click to close</div>`
        }`;

    inspectPanel.style.display='block';

    // Wire up the touch close button if it exists
    const closeBtn = inspectPanel.querySelector('#inspect-close-btn');
    if(closeBtn) closeBtn.addEventListener('click', closeInspect);
}
function closeInspect(){ inspectedCreature=null; if(inspectPanel) inspectPanel.style.display='none'; }

// ── GRAPH ─────────────────────────────────────────────────────────────────
let graphCanvas,graphCtx,showGraph=false;
function createGraphPanel(){
    graphCanvas=document.createElement('canvas');
    graphCanvas.id='eco-graph-canvas'; // sizing via eco-styles.css
    // Keep internal buffer in sync with CSS-rendered size
    const _syncGraph=()=>{ graphCanvas.width=graphCanvas.offsetWidth||360; graphCanvas.height=graphCanvas.offsetHeight||180; };
    document.body.appendChild(graphCanvas); graphCtx=graphCanvas.getContext('2d');
    new ResizeObserver(_syncGraph).observe(graphCanvas);
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
    traitPanel.id='eco-trait-panel'; // sizing via eco-styles.css
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
    godPanel=document.createElement('div'); godPanel.id='eco-god'; // sizing via eco-styles.css
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
    let _resetBtn = null;
    const mkBtn=(label,col,cls,bottom,onClick)=>{
        const b=document.createElement('button');
        b.innerText=label; b.className='eco-btn '+cls; b.style.color=col; b.style.borderColor=col; b.style.textShadow=`0 0 8px ${col}`; b.style.boxShadow=`0 0 15px ${col}44`;
        b.addEventListener('click',onClick); document.body.appendChild(b); return b;
    };
    mkBtn('⚡ GOD MODE','#ffff00','eco-btn-god',122,()=>{ showGod=!showGod; godPanel.style.display=showGod?'block':'none'; });
    mkBtn('📈 GRAPH','#00fff5','eco-btn-graph',174,()=>{
        showGraph=!showGraph; showTraits=showGraph;
        graphCanvas.style.display=showGraph?'block':'none';
        if(traitPanel) traitPanel.style.display=showTraits?'block':'none';
        if(_resetBtn) _resetBtn.style.display=showGraph?'none':'block';
    });
    _resetBtn = document.createElement('button');
    _resetBtn.innerText = '♻ RESET';
    _resetBtn.className = 'eco-btn eco-btn-reset';
    const resetCol = '#ff6b35';
    _resetBtn.style.color = resetCol;
    _resetBtn.style.borderColor = resetCol;
    _resetBtn.style.textShadow = `0 0 8px ${resetCol}`;
    _resetBtn.style.boxShadow = `0 0 15px ${resetCol}44`;
    _resetBtn.addEventListener('click', () => {
        creatures.length = 0;
        generationCount = 0;
        evoLog.length = 0;
        Object.keys(popHistory).forEach(k => { popHistory[k] = []; });
        closeInspect();
        initCreatures();
        if(window.ecoForcePush) window.ecoForcePush();
    });
    document.body.appendChild(_resetBtn);
    document.addEventListener('keydown',e=>{ if(e.key==='g'||e.key==='G'){ showGod=!showGod; godPanel.style.display=showGod?'block':'none'; } });
}

// ── INPUT ─────────────────────────────────────────────────────────────────
// Long-press state — because mobile users deserve inspect too, obviously
let longPressTimer = null;
const LONG_PRESS_MS = 500;
let touchStartX = 0, touchStartY = 0, touchMoved = false;

function initInput(){
    canvas.style.pointerEvents='auto';

    // ── MOUSE (desktop, you lucky people with right-click) ─────────────────
    canvas.addEventListener('mousedown',e=>{ if(e.button===0) isDragging=true; });
    canvas.addEventListener('mousemove',e=>{
        if(!isDragging) return;
        const r=canvas.getBoundingClientRect();
        if(++dragBloomTimer%8===0) addFoodBloom(e.clientX-r.left,e.clientY-r.top);
    },{passive:true});
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

    // ── TOUCH (mobile — hold to inspect, drag to feed, try to keep up) ─────

    canvas.addEventListener('touchstart', e => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches[0];
        touchStartX = t.clientX - r.left;
        touchStartY = t.clientY - r.top;
        touchMoved = false;
        isDragging = true;

        // Long-press: half a second of commitment earns you an inspect panel
        longPressTimer = setTimeout(() => {
            if(touchMoved) return; // nope, they dragged — bail

            isDragging = false; // cancel drag so we don't spray food on inspect
            dragBloomTimer = 0;

            if(inspectedCreature){ closeInspect(); return; }

            let nearest = null, nd = Infinity;
            creatures.forEach(c => {
                const dx = c.x - touchStartX, dy = c.y - touchStartY;
                const d = Math.sqrt(dx*dx + dy*dy);
                // Bigger hit radius on mobile — fingertips aren't laser pointers
                if(d < c.size * 5 + 44 && d < nd){ nd = d; nearest = c; }
            });

            if(nearest){
                inspectedCreature = nearest;
                updateInspectPanel();
                // Haptic feedback — a little buzz never hurt anyone
                if(navigator.vibrate) navigator.vibrate(40);
            }
        }, LONG_PRESS_MS);

    }, { passive: true });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        const t = e.touches[0];
        const mx = t.clientX - r.left;
        const my = t.clientY - r.top;

        // If they've moved more than 10px, it's a drag — kill the long-press
        const dx = mx - touchStartX, dy = my - touchStartY;
        if(!touchMoved && Math.sqrt(dx*dx + dy*dy) > 10){
            touchMoved = true;
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }

        if(isDragging && ++dragBloomTimer % 8 === 0) addFoodBloom(mx, my);
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        clearTimeout(longPressTimer);
        longPressTimer = null;

        // Quick tap (no drag, no long-press) — scatter nearby creatures,
        // same as the mouse click does. Fair is fair.
        if(!touchMoved && isDragging){
            const r = canvas.getBoundingClientRect();
            // Use last known touch position from touchstart
            const mx = touchStartX, my = touchStartY;
            creatures.forEach(c => {
                const dx = c.x - mx, dy = c.y - my, d = Math.sqrt(dx*dx + dy*dy);
                if(d < c.size * 5 + 35 && d > 0){
                    const f = clamp((c.size * 2.5 + 20 - d) / (c.size * 2.5 + 20), .2, 1);
                    const a = Math.atan2(dy, dx), sp = rnd(-.6, .6);
                    c.vx = Math.cos(a + sp) * c.speed * 3.5 * f;
                    c.vy = Math.sin(a + sp) * c.speed * 3.5 * f;
                    c._wanderAngle = a + sp; c._scared = 80;
                }
            });
        }

        isDragging = false;
        dragBloomTimer = 0;
    });
}