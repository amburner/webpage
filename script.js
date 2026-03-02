// =============================================
// AMBER MILLER — MAXIMUM CHAOS EDITION
// =============================================

// ---------- Rainbow H1 letters ----------
function rainbowifyH1() {
    const h1 = document.querySelector('h1');
    if (!h1) return;
    const text = h1.innerText;
    h1.innerHTML = text.split('').map(ch =>
        ch === ' '
            ? ' '
            : `<span class="rainbow-letter">${ch}</span>`
    ).join('');
}

// ---------- Inject marquees inside each project card ----------
function addCardMarquees() {
    const summaries = document.querySelectorAll('.project > summary');
    const msgs = [
        ' AWESOME PROJECT ALERT ',
        ' YOU WONT BELIEVE THIS ',
        ' CHECK THIS OUT ',
        ' CONTROLS GO CRAZY ',
        ' AEROSPACE STAYS WINNING ',
    ];
    summaries.forEach((s, i) => {
        const mq = document.createElement('marquee');
        mq.setAttribute('scrollamount', '5');
        mq.style.cssText = `
            background: #ff00ff;
            color: yellow;
            font-weight: bold;
            font-size: 11px;
            padding: 2px 0;
            border-top: 2px dashed yellow;
            margin-top: 6px;
            display: block;
        `;
        mq.innerText = msgs[i % msgs.length];
        // Insert after summary, before the content div
        s.parentElement.insertBefore(mq, s.nextSibling);
    });
}

// ---------- Sparkle effect (more frequent, bigger, more symbols) ----------
let lastSparkTime = 0;
const symbols = ['✶', '★', '⚡', '💥', '✨', '🌟', '☆', '◆', '♦', '❋', '+', '˚'];
const neonColors = [
    '#ff00ff', '#00ffff', '#ffff00', '#ff0000',
    '#00ff00', '#ff7700', '#ff00aa', '#00aaff'
];

function createSparkle(e) {
    const currentTime = Date.now();
    if (currentTime - lastSparkTime > 40) { // fire more often
        const x = e.touches ? e.touches[0].pageX : e.pageX;
        const y = e.touches ? e.touches[0].pageY : e.pageY;

        // Spawn a cluster of 3 sparks per event
        const count = Math.random() < 0.4 ? 3 : 1;
        for (let i = 0; i < count; i++) {
            const spark = document.createElement('div');
            spark.className = 'spark';
            spark.innerText = symbols[Math.floor(Math.random() * symbols.length)];
            spark.style.left = (x + (Math.random() - 0.5) * 30) + 'px';
            spark.style.top  = (y + (Math.random() - 0.5) * 30) + 'px';
            spark.style.setProperty('--spark-color', neonColors[Math.floor(Math.random() * neonColors.length)]);
            spark.style.fontSize = (0.9 + Math.random() * 1.2) + 'em';
            document.body.appendChild(spark);
            setTimeout(() => spark.remove(), 900);
        }
        lastSparkTime = currentTime;
    }
}

document.addEventListener('mousemove', createSparkle);
document.addEventListener('touchmove', createSparkle);

// ---------- Pulsing color cycle on h2 elements ----------
function animateH2s() {
    const colors = ['#ff0000', '#ff7700', '#cc00cc', '#0000cc', '#007700', '#cc6600'];
    let idx = 0;
    setInterval(() => {
        document.querySelectorAll('h2').forEach(el => {
            el.style.color = colors[idx % colors.length];
        });
        idx++;
    }, 600);
}

// ---------- Random border colors cycling on cards ----------
function cycleBorders() {
    const cards = document.querySelectorAll('.project');
    const borders = ['#ff00ff','#00ffff','#ffff00','#ff0000','#00ff00','#ff7700'];
    let i = 0;
    setInterval(() => {
        cards.forEach((card, ci) => {
            card.style.borderColor = borders[(i + ci) % borders.length];
        });
        i++;
    }, 400);
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
    rainbowifyH1();
    addCardMarquees();
    animateH2s();
    cycleBorders();
});
