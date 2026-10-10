/* Rendering, skill filters, screenshot gallery, theme toggle and the solar-system flight. */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const PH = '<span class="ph">Placeholder</span>';
const active = new Set();
let tab = "All";

const usage = {};
[...CV.projects, ...CV.journey.filter(j=>j.type!=="project")].forEach(p => (p.skills||[]).forEach(s => usage[s] = (usage[s]||0)+1));

function renderStats(){
  const nSkills = CV.skills.reduce((a,g)=>a+g.items.length,0);
  const roles = CV.journey.filter(t=>t.type==="work").length;
  $("#stats").innerHTML = `<div><b>${roles}</b>consulting roles</div><div><b>${CV.projects.length}</b>projects</div><div><b>${nSkills}</b>skills</div><div><b>${CV.languages.length}</b>languages</div>`;
}

function renderSkills(){
  $("#skillgroups").innerHTML = CV.skills.map(g => `
    <div class="sg"><h3>${esc(g.group)}</h3><div class="chips">
      ${g.items.map(s => `<button type="button" class="chip" data-skill="${esc(s.name)}" aria-pressed="${active.has(s.name)}" title="${s.placeholder?'Placeholder: confirm or replace':''}">
        <span class="lvl" aria-label="Level ${s.level} of 5">${[1,2,3,4,5].map(i=>`<i class="${i<=s.level?'f':''}"></i>`).join("")}</span>
        ${esc(s.name)}${s.placeholder?' *':''}<span class="n">${usage[s.name]||0}</span></button>`).join("")}
    </div></div>`).join("");
  const any = CV.skills.some(g=>g.items.some(s=>s.placeholder));
  $("#filterbar").innerHTML = active.size
    ? `Showing work that uses <b>${[...active].map(esc).join("</b> or <b>")}</b><button class="clear" id="clear" type="button">Clear filter</button>`
    : (any ? `<span class="legend">* placeholder skill: confirm or replace</span>` : "");
}

function matches(skills){ return !active.size || skills.some(s=>active.has(s)); }

function renderProjects(){
  const cats = ["All", ...new Set(CV.projects.map(p=>p.category))];
  $("#tabs").innerHTML = cats.map(c=>`<button type="button" role="tab" class="tab" data-tab="${esc(c)}" aria-selected="${c===tab}">${esc(c)} <span class="repo">${c==="All"?CV.projects.length:CV.projects.filter(p=>p.category===c).length}</span></button>`).join("");
  const list = CV.projects.filter(p => tab==="All" || p.category===tab);
  list.sort((a,b)=>matches(b.skills)-matches(a.skills));
  $("#grid").innerHTML = list.length ? list.map(p => `
    <article class="card ${matches(p.skills)?'':'dim'}">
      ${coverHTML(p)}
      <div class="top"><h3>${esc(p.name)}</h3>${p.placeholder?PH:''}</div>
      ${p.repo?`<div class="repo">${esc(p.repo)}</div>`:''}
      <p>${esc(p.desc)}</p>
      ${p.details?`<details><summary>Details</summary><ul>${p.details.map(d=>`<li>${esc(d)}</li>`).join("")}</ul></details>`:''}
      <div class="tags">${p.skills.map(s=>`<span class="tag">${esc(s)}</span>`).join("")}</div>
      <div class="meta"><span>${esc(p.context||"")}</span>${p.url?`<a href="${esc(p.url)}" target="_blank" rel="noopener">View repo ↗</a>`:'<span>Repo coming soon</span>'}</div>
    </article>`).join("") : `<p class="empty">No projects in this category yet.</p>`;
}

function coverHTML(p){
  const i = CV.projects.indexOf(p);
  if (!p.shots || !p.shots.length){
    const init = p.name.replace(/^Project /,"").split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase();
    return `<div class="cover blank" aria-hidden="true"><span>${esc(init)}</span><small>Screenshots coming soon</small></div>`;
  }
  return `<button type="button" class="cover" data-proj="${i}" aria-label="View ${p.shots.length} screenshot${p.shots.length>1?'s':''} of ${esc(p.name)}">
    ${p.shots.map((s,k)=>`<img src="${esc(s.src)}" alt="" loading="lazy" class="${k===0?'on':''}">`).join("")}
    ${p.shots.length>1 && p.shots.length<=8?`<span class="dots">${p.shots.map((_,k)=>`<i class="${k===0?'on':''}"></i>`).join("")}</span>`:''}
    <span class="badge">${p.shots.length>1?p.shots.length+' screenshots':'View image'} ↗</span></button>`;
}

const TYPE_LABEL = {edu:"Education", work:"Work", project:"Project", soon:"Coming soon", next:"Destination"};
function renderJourney(){
  $("#mslist").innerHTML = CV.journey.map((m,i) => {
    const proj = m.project ? CV.projects.find(p=>p.name===m.project) : null;
    const shot = proj && proj.shots && proj.shots.length ? coverHTML(proj) : "";
    const dim = m.type!=="next" && m.type!=="soon" && !matches(m.skills||[]);
    return `<li class="ms ${m.type==='next'?'ms-next':''} ${m.type==='soon'?'ms-soon':''} ${shot?'has-cover':''} ${dim?'dim':''}" data-i="${i}">
      ${shot}
      <div class="ms-when"><span class="ms-planet"><i style="background:${planetOf(i).c[0]};box-shadow:inset -3px -3px 0 ${planetOf(i).c[1]}"></i>${esc(planetOf(i).n)}</span><span class="ms-type ${m.type}">${TYPE_LABEL[m.type]}</span>${esc(m.when)}${m.current?' <span class="now">Current</span>':''}</div>
      <h3>${esc(m.title)}</h3>
      <div class="org">${esc(m.org)}</div>
      ${m.points.length?`<ul>${m.points.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:''}
      ${m.type==='next'?'<a class="btn primary" href="#contact">Get in touch →</a>':''}
    </li>`;
  }).join("");
  $("#langs").innerHTML = CV.languages.map(l=>`<div class="lang"><span>${esc(l.name)}</span><b>${esc(l.level)}</b></div>`).join("");
  if (window.Flight) Flight.measure();
}

function renderContact(){
  $("#contactlist").innerHTML = CV.contact.map((c,i) => `
    <div class="cline"><div style="min-width:0"><small>${esc(c.label)} ${c.placeholder?PH:''}</small>
      <span>${c.href?`<a href="${esc(c.href)}" target="_blank" rel="noopener">${esc(c.value)}</a>`:esc(c.value)}</span></div>
      <button class="copy" type="button" data-copy="${i}">Copy</button></div>`).join("");
}

function renderAll(){ renderSkills(); renderProjects(); renderJourney(); }

document.addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (chip){ const s = chip.dataset.skill; active.has(s)?active.delete(s):active.add(s); renderAll(); return; }
  if (e.target.closest("#clear")){ active.clear(); renderAll(); return; }
  const t = e.target.closest(".tab");
  if (t){ tab = t.dataset.tab; renderProjects(); return; }
  const cp = e.target.closest(".copy");
  if (cp){
    const v = CV.contact[+cp.dataset.copy].value;
    const done = ok => { cp.textContent = ok?"Copied":"Select it"; setTimeout(()=>cp.textContent="Copy",1600); };
    try { navigator.clipboard.writeText(v).then(()=>done(true), ()=>done(false)); } catch(_) { done(false); }
  }
});

/* theme toggle */
const root = document.documentElement;
function currentDark(){ const d = root.dataset.theme; return d ? d==="dark" : matchMedia("(prefers-color-scheme: dark)").matches; }
function labelTheme(){
  const b = $("#themebtn"), dark = currentDark(), label = dark ? "Light mode" : "Dark mode";
  b.innerHTML = `<span class="ti" aria-hidden="true">${dark ? "☀" : "☾"}</span><span class="tl">${label}</span>`;
  b.setAttribute("aria-label", label);
}
$("#themebtn").addEventListener("click", () => {
  root.dataset.theme = currentDark() ? "light" : "dark";
  try{ localStorage.setItem("cv-theme", root.dataset.theme); }catch(_){}
  labelTheme();
});
try{ const t = localStorage.getItem("cv-theme"); if (t) root.dataset.theme = t; }catch(_){}
labelTheme();

/* active nav link */
const links = [...document.querySelectorAll("#navlinks a")];
const io = new IntersectionObserver(es => es.forEach(en => {
  if (en.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href")==="#"+en.target.id));
}), { rootMargin:"-45% 0px -50% 0px" });
document.querySelectorAll("main section").forEach(s => io.observe(s));

/* hover slideshow on covers */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let cycleTimer = null, cycleEl = null;
function showFrame(el, k){
  el.querySelectorAll("img").forEach((im,j)=>im.classList.toggle("on", j===k));
  el.querySelectorAll(".dots i").forEach((d,j)=>d.classList.toggle("on", j===k));
  el.dataset.k = k;
}
function startCycle(el){
  if (reduce || cycleEl===el) return;
  stopCycle(); cycleEl = el;
  const n = el.querySelectorAll("img").length; if (n<2) return;
  cycleTimer = setInterval(()=>showFrame(el, ((+el.dataset.k||0)+1)%n), 1300);
}
function stopCycle(){ if (cycleEl) showFrame(cycleEl,0); clearInterval(cycleTimer); cycleTimer=null; cycleEl=null; }
document.addEventListener("pointerover", e => { const c = e.target.closest(".cover[data-proj]"); if (c) startCycle(c); else if (cycleEl && !cycleEl.contains(e.target)) stopCycle(); });
document.addEventListener("focusin", e => { const c = e.target.closest(".cover[data-proj]"); c ? startCycle(c) : stopCycle(); });

/* lightbox */
const lb = $("#lb"); let lbProj = null, lbIdx = 0, lastFocus = null;
function lbShow(k, dir){
  const shots = lbProj.shots; lbIdx = (k + shots.length) % shots.length;
  const img = $("#lbimg"); const s = shots[lbIdx];
  img.className = ""; void img.offsetWidth;
  img.src = s.src; img.alt = s.caption;
  if (dir && !reduce) img.className = dir>0 ? "from-r" : "from-l";
  $("#lbcap").textContent = s.caption;
  $("#lbcount").textContent = shots.length>1 ? `${lbIdx+1} / ${shots.length}` : "";
  $("#lbprev").hidden = $("#lbnext").hidden = shots.length<2;
  $("#lbthumbs").querySelectorAll("button").forEach((b,j)=>b.setAttribute("aria-current", j===lbIdx));
}
function lbOpen(p){
  lbProj = p; lastFocus = document.activeElement; stopCycle();
  $("#lbtitle").textContent = p.name;
  $("#lbthumbs").innerHTML = p.shots.length>1 ? p.shots.map((s,j)=>`<button type="button" data-k="${j}" aria-label="${esc(s.caption)}"><img src="${esc(s.src)}" alt=""></button>`).join("") : "";
  lbShow(0); lb.hidden = false; document.body.style.overflow = "hidden"; $("#lbclose").focus();
}
function lbCloseFn(){ lb.hidden = true; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
$("#lbclose").addEventListener("click", lbCloseFn);
$("#lbprev").addEventListener("click", ()=>lbShow(lbIdx-1,-1));
$("#lbnext").addEventListener("click", ()=>lbShow(lbIdx+1,1));
$("#lbthumbs").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ const k=+b.dataset.k; lbShow(k, k>lbIdx?1:-1); } });
lb.addEventListener("click", e => { if (e.target === lb) lbCloseFn(); });
document.addEventListener("keydown", e => {
  if (lb.hidden) return;
  if (e.key==="Escape") lbCloseFn();
  else if (e.key==="ArrowRight") lbShow(lbIdx+1,1);
  else if (e.key==="ArrowLeft") lbShow(lbIdx-1,-1);
});
let tx = null;
$("#lbstage").addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, {passive:true});
$("#lbstage").addEventListener("touchend", e => { if (tx===null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx)>40) dx<0 ? lbShow(lbIdx+1,1) : lbShow(lbIdx-1,-1); });
document.addEventListener("click", e => {
  const c = e.target.closest(".cover[data-proj], .ms-shot[data-proj]");
  if (c){ lbOpen(CV.projects[+c.dataset.proj]); return; }
  const card = e.target.closest(".card, .ms.has-cover");
  if (card && !e.target.closest("a,button,details,summary")){
    const cv = card.querySelector(".cover[data-proj]"); if (cv) lbOpen(CV.projects[+cv.dataset.proj]);
  }
});

/* ===== solar system flight ===== */
const PLANETS = [
  {n:"Mercury", au:.39, r:9,  c:["#e2ded8","#857f78"]},
  {n:"Venus",   au:.72, r:15, c:["#fbe9b8","#c4924a"]},
  {n:"Earth",   au:1,   r:16, c:["#7db8ff","#1d4aa6"], earth:1},
  {n:"Mars",    au:1.52,r:12, c:["#f39468","#97391c"]},
  {n:"Jupiter", au:5.2, r:40, c:["#f3dcb6","#b07a4b"], bands:1},
  {n:"Saturn",  au:9.54,r:29, c:["#f6e6bb","#c4a05c"], rings:1},
  {n:"Uranus",  au:19.2,r:21, c:["#d3f6f7","#5bb3c1"], uring:1},
  {n:"Neptune", au:30.1,r:20, c:["#86a8ff","#22389a"]},
  {n:"Interstellar", au:120, r:6, c:["#ffffff","#bcd0ff"], star:1},
];
const planetOf = i => i >= CV.journey.length-1 ? PLANETS[PLANETS.length-1] : PLANETS[Math.min(i, PLANETS.length-2)];
const Flight = (() => {
  const cv = $("#sky"), ctx = cv.getContext("2d"), scene = $("#scene");
  let W=0, H=0, S=1, dpr=1, stars=[], rocks=[], parts=[], cards=[], hits=[];
  let target=0, pos=0, vel=0, active=-1, last=performance.now(), camX=0, camY=0, camInit=false;
  const N = () => CV.journey.length;
  const XS = [0,.75,-.65,.55,-.45,.6,-.7,.5,-.35,0];
  function resize(){
    const r = scene.getBoundingClientRect(); dpr = Math.min(devicePixelRatio||1,2);
    W=r.width; H=r.height; S=Math.max(Math.min(W,H)/420,.72);
    cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    stars = Array.from({length:Math.round(W*H/2300)}, () => ({x:Math.random(), y:Math.random(), r:Math.random()*1.3+.3, ph:Math.random()*6.28, d:Math.random()*.8+.2}));
    if (!rocks.length) rocks = Array.from({length:70}, () => ({u:Math.random(), v:Math.random(), r:Math.random()*2.2+.6}));
  }
  const SP = () => H*.5;
  function way(i){ const AX = Math.min(W*.2, 170); return {x:(XS[i%XS.length]||0)*AX, y:-i*SP()}; }
  function planetPos(i){
    const w = way(i), p = planetOf(i), side = w.x >= 0 ? 1 : -1;
    if (p.star) return {x:w.x, y:w.y - 46*S};
    return {x:w.x + side*(p.r*S + 30*S), y:w.y - 6*S};
  }
  function spline(f){
    const n = N(); f = Math.max(0, Math.min(n-1, f));
    let i = Math.min(Math.floor(f), n-2), u = f-i;
    const p0=way(Math.max(i-1,0)), p1=way(i), p2=way(i+1), p3=way(Math.min(i+2,n-1));
    const cr = (a,b,c,d) => .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u);
    return {x:cr(p0.x,p1.x,p2.x,p3.x), y:cr(p0.y,p1.y,p2.y,p3.y)};
  }
  const sx = x => x - camX + W/2, sy = y => y - camY + H*.5;
  function measure(){ cards = [...document.querySelectorAll("#mslist .ms")]; buildMap(); }
  function buildMap(){
    const m = $("#sysmap"); if (!m) return;
    m.innerHTML = CV.journey.map((j,i) => { const p = planetOf(i); const d = Math.max(6, Math.min(14, p.r*.38+4));
      return `<button type="button" data-i="${i}" aria-label="${esc(p.n)}: ${esc(j.title)}" title="${esc(p.n)}"><i style="width:${d}px;height:${d}px;background:${p.c[0]}"></i></button>`; }).join("");
  }
  function goTo(i){ if (cards[i]) cards[i].scrollIntoView({behavior:reduce?"auto":"smooth", block: innerWidth<=820 ? "end" : "center"}); }
  function computeTarget(){
    if (!cards.length) return;
    const narrow = innerWidth<=820, sr = scene.getBoundingClientRect();
    const focus = narrow ? sr.bottom + (innerHeight-sr.bottom)*.45 : innerHeight*.5;
    const ys = cards.map(c => { const r = c.getBoundingClientRect(); return r.top + Math.min(r.height,220)/2; });
    let f;
    if (focus <= ys[0]) f = 0; else if (focus >= ys[ys.length-1]) f = ys.length-1;
    else { let i=0; while (focus > ys[i+1]) i++; f = i + (focus-ys[i])/(ys[i+1]-ys[i]); }
    target = f;
    const a = Math.round(f);
    if (a !== active){
      active = a; cards.forEach((c,j)=>c.classList.toggle("on", j===a));
      document.querySelectorAll("#sysmap button").forEach((b,j)=>b.classList.toggle("on", j===a));
      const m = CV.journey[a], p = planetOf(a);
      $("#hudStage").textContent = a+1; $("#hudTotal").textContent = N();
      $("#hudYear").textContent = (m.type==="next" ? "Next" : "T+ "+m.year) + " · " + p.n;
    }
  }
  function drawPlanet(i, now){
    const p = planetOf(i), c = planetPos(i), x = sx(c.x), y = sy(c.y), r = p.r*S;
    if (y < -r*4 || y > H + r*4) return;
    hits.push({x,y,r:Math.max(r,14),i});
    const soon = CV.journey[i].type==="soon";
    if (soon){ ctx.save(); ctx.globalAlpha=.3; }
    if (p.star){
      const g = ctx.createRadialGradient(x,y,0,x,y,r*7); g.addColorStop(0,"rgba(220,232,255,.9)"); g.addColorStop(1,"rgba(220,232,255,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r*7,0,6.283); ctx.fill();
      ctx.strokeStyle="rgba(235,242,255,.85)"; ctx.lineWidth=1.2; const k = r*4*(1+.15*Math.sin(now/400));
      ctx.beginPath(); ctx.moveTo(x-k,y); ctx.lineTo(x+k,y); ctx.moveTo(x,y-k); ctx.lineTo(x,y+k); ctx.stroke();
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(x,y,r*.7,0,6.283); ctx.fill();
      ctx.strokeStyle="rgba(140,170,255,.18)"; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(x, y+H*.55, W*1.2, H*.5, 0, Math.PI*1.08, Math.PI*1.92); ctx.stroke();
    } else {
      const ring = (front) => { ctx.save(); ctx.translate(x,y); ctx.rotate(-.35);
        ctx.strokeStyle = front ? "rgba(236,214,160,.9)" : "rgba(236,214,160,.45)"; ctx.lineWidth = r*.22;
        ctx.beginPath(); ctx.ellipse(0,0,r*2,r*.5,0, front?0:Math.PI, front?Math.PI:2*Math.PI); ctx.stroke();
        ctx.strokeStyle = front ? "rgba(200,170,110,.7)" : "rgba(200,170,110,.35)"; ctx.lineWidth = r*.08;
        ctx.beginPath(); ctx.ellipse(0,0,r*1.6,r*.4,0, front?0:Math.PI, front?Math.PI:2*Math.PI); ctx.stroke(); ctx.restore(); };
      if (p.rings) ring(false);
      if (p.uring){ ctx.save(); ctx.translate(x,y); ctx.rotate(1.35); ctx.strokeStyle="rgba(200,240,245,.35)"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.ellipse(0,0,r*1.7,r*.35,0,Math.PI,2*Math.PI); ctx.stroke(); ctx.restore(); }
      const glow = ctx.createRadialGradient(x,y,r*.9,x,y,r*1.6); glow.addColorStop(0,p.c[0]+"55"); glow.addColorStop(1,p.c[0]+"00");
      ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(x,y,r*1.6,0,6.283); ctx.fill();
      const g = ctx.createRadialGradient(x-r*.4,y-r*.4,r*.1,x,y,r*1.05); g.addColorStop(0,p.c[0]); g.addColorStop(1,p.c[1]);
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,6.283); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(x,y,r,0,6.283); ctx.clip();
      if (p.bands){ ["rgba(160,100,60,.35)","rgba(255,240,220,.3)","rgba(150,90,55,.3)","rgba(255,240,220,.25)"].forEach((col,k)=>{ ctx.fillStyle=col; ctx.fillRect(x-r, y-r*.7+k*r*.38, r*2, r*.18); });
        ctx.fillStyle="rgba(190,80,50,.8)"; ctx.beginPath(); ctx.ellipse(x+r*.35,y+r*.3,r*.2,r*.11,0,0,6.283); ctx.fill(); }
      if (p.rings){ ctx.fillStyle="rgba(170,130,70,.22)"; ctx.fillRect(x-r,y-r*.25,r*2,r*.16); ctx.fillRect(x-r,y+r*.2,r*2,r*.1); }
      if (p.earth){ ctx.fillStyle="rgba(95,180,110,.85)"; ctx.beginPath(); ctx.ellipse(x-r*.3,y-r*.2,r*.32,r*.22,-.5,0,6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(x+r*.35,y+r*.3,r*.3,r*.18,.6,0,6.283); ctx.fill();
        ctx.fillStyle="rgba(255,255,255,.55)"; ctx.fillRect(x-r,y-r*.95,r*2,r*.18); }
      if (p.n==="Mercury"){ ctx.fillStyle="rgba(90,85,80,.45)"; [[.3,-.2,.25],[-.35,.25,.2],[.1,.45,.14]].forEach(([a,b,cc])=>{ctx.beginPath();ctx.arc(x+a*r,y+b*r,cc*r,0,6.283);ctx.fill();}); }
      if (p.n==="Mars"){ ctx.fillStyle="rgba(255,255,255,.7)"; ctx.beginPath(); ctx.ellipse(x,y-r*.9,r*.35,r*.15,0,0,6.283); ctx.fill(); }
      if (p.heart){ ctx.fillStyle="rgba(255,245,235,.85)"; ctx.beginPath(); ctx.arc(x+r*.1,y+r*.15,r*.32,0,6.283); ctx.arc(x+r*.42,y+r*.1,r*.26,0,6.283); ctx.fill(); }
      ctx.fillStyle="rgba(0,0,10,.35)"; ctx.beginPath(); ctx.arc(x+r*.35,y+r*.35,r*1.05,0,6.283); ctx.fill();
      ctx.restore();
      if (p.rings) ring(true);
      if (p.earth){ const a = now/1600; ctx.fillStyle="#d6d9e2"; ctx.beginPath(); ctx.arc(x+Math.cos(a)*r*1.8, y+Math.sin(a)*r*.7, r*.27, 0, 6.283); ctx.fill(); }
    }
    if (soon){ ctx.restore(); ctx.setLineDash([3,4]); ctx.strokeStyle="rgba(200,215,255,.6)"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(x,y,r+6,0,6.283); ctx.stroke(); ctx.setLineDash([]); }
    const isOn = i===active, j = CV.journey[i];
    if (isOn && !reduce){ ctx.strokeStyle="rgba(242,196,109,.8)"; ctx.globalAlpha=.4+.4*Math.sin(now/260); ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x,y,(p.rings?r*2.2:r)+10,0,6.283); ctx.stroke(); ctx.globalAlpha=1; }
    ctx.textAlign="center"; ctx.font=`600 ${Math.round(10.5*Math.min(S,1.2))}px 'JetBrains Mono', monospace`;
    const ly = y + (p.rings ? r*1.1 : r) + 16;
    ctx.fillStyle = isOn ? "#f2c46d" : "rgba(220,230,255,.8)"; ctx.fillText(p.n.toUpperCase(), x, ly);
    ctx.fillStyle = "rgba(190,205,240,.6)"; ctx.fillText(j.type==="next" ? "NEXT" : j.type==="soon" ? "SOON" : j.year, x, ly+13);
  }
  function drawRocket(x,y,ang,thrust){
    ctx.save(); ctx.translate(x,y); ctx.rotate(ang); const s = Math.max(S*.95,.7); ctx.scale(s,s);
    if (thrust > .02){ const L = 10 + thrust*36 + Math.random()*6, g = ctx.createLinearGradient(0,14,0,14+L);
      g.addColorStop(0,"rgba(255,244,200,1)"); g.addColorStop(.35,"rgba(255,170,60,.95)"); g.addColorStop(1,"rgba(255,80,40,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(-6,14); ctx.quadraticCurveTo(0,14+L*1.1,6,14); ctx.fill(); }
    ctx.fillStyle="#e6a53d"; ctx.beginPath(); ctx.moveTo(-7,4); ctx.lineTo(-14,16); ctx.lineTo(-7,14); ctx.fill(); ctx.beginPath(); ctx.moveTo(7,4); ctx.lineTo(14,16); ctx.lineTo(7,14); ctx.fill();
    const body = ctx.createLinearGradient(-8,0,8,0); body.addColorStop(0,"#c9d2ea"); body.addColorStop(.5,"#ffffff"); body.addColorStop(1,"#aeb9d6");
    ctx.fillStyle=body; ctx.beginPath(); ctx.moveTo(0,-26); ctx.bezierCurveTo(10,-16,8,6,7,15); ctx.lineTo(-7,15); ctx.bezierCurveTo(-8,6,-10,-16,0,-26); ctx.fill();
    ctx.fillStyle="#2f5be0"; ctx.beginPath(); ctx.arc(0,-8,4.2,0,6.283); ctx.fill(); ctx.strokeStyle="#0b1433"; ctx.lineWidth=1.4; ctx.stroke();
    ctx.fillStyle="#e6a53d"; ctx.beginPath(); ctx.moveTo(0,-26); ctx.bezierCurveTo(4,-22,6,-19,6.6,-17); ctx.lineTo(-6.6,-17); ctx.bezierCurveTo(-6,-19,-4,-22,0,-26); ctx.fill();
    ctx.restore();
  }
  function frame(now){
    const dt = Math.min((now-last)/1000,.05); last = now;
    computeTarget();
    const prev = pos; pos = reduce ? target : pos + (target-pos)*Math.min(dt*4,1);
    vel = Math.abs(pos-prev)/Math.max(dt,.001);
    const R = spline(pos);
    const bob = reduce ? 0 : Math.sin(now/600)*2;
    const cx = R.x*.55, cy = R.y - H*.1;
    if (!camInit || reduce){ camX=cx; camY=cy; camInit=true; } else { camX += (cx-camX)*Math.min(dt*6,1); camY += (cy-camY)*Math.min(dt*6,1); }
    hits = [];
    // space
    const sky = ctx.createLinearGradient(0,0,0,H); sky.addColorStop(0,"#03050f"); sky.addColorStop(1,"#0a1330");
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
    for (const st of stars){
      const px = ((st.x*W - camX*.08*st.d) % W + W) % W, py = ((st.y*H - camY*.12*st.d) % H + H) % H;
      ctx.globalAlpha = reduce ? .8 : .4 + .45*Math.sin(now/700*st.d + st.ph); ctx.fillStyle="#fff";
      ctx.beginPath(); ctx.arc(px,py,st.r,0,6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // sun
    const sun = {x:sx(0), y:sy(SP()*1.05)}, sr = Math.max(W,H)*.75;
    if (sun.y - sr < H){ const g = ctx.createRadialGradient(sun.x,sun.y,0,sun.x,sun.y,sr);
      g.addColorStop(0,"rgba(255,230,150,1)"); g.addColorStop(.12,"rgba(255,190,90,.9)"); g.addColorStop(.3,"rgba(255,140,60,.25)"); g.addColorStop(1,"rgba(255,120,40,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sun.x,sun.y,sr,0,6.283); ctx.fill();
      ctx.font="600 10px 'JetBrains Mono', monospace"; ctx.fillStyle="rgba(60,30,0,.75)"; ctx.textAlign="center"; ctx.fillText("SUN", sun.x, sun.y - sr*.04); }
    // asteroid belt between Mars (3) and Jupiter (4)
    if (N() > 4){ const y0 = way(3).y, y1 = way(4).y;
      for (const k of rocks){ const x = sx((k.u-.5)*W*1.6), y = sy(y0 + (y1-y0)*(.35+k.v*.3)); if (y<-5||y>H+5) continue;
        ctx.fillStyle="rgba(170,160,150,.7)"; ctx.beginPath(); ctx.arc(x,y,k.r*S,0,6.283); ctx.fill(); } }
    // flight path
    const n = N(), steps = (n-1)*16;
    ctx.setLineDash([3,7]); ctx.strokeStyle="rgba(200,215,255,.25)"; ctx.lineWidth=1.5; ctx.beginPath();
    for (let k=0;k<=steps;k++){ const q = spline(k/16); k?ctx.lineTo(sx(q.x),sy(q.y)):ctx.moveTo(sx(q.x),sy(q.y)); } ctx.stroke(); ctx.setLineDash([]);
    if (pos>0){ ctx.strokeStyle="rgba(122,162,255,.85)"; ctx.lineWidth=2.2; ctx.beginPath(); const m = Math.ceil(pos*16);
      for (let k=0;k<=m;k++){ const q = spline(Math.min(k/16,pos)); k?ctx.lineTo(sx(q.x),sy(q.y)):ctx.moveTo(sx(q.x),sy(q.y)); } ctx.stroke(); }
    for (let i=0;i<n;i++) drawPlanet(i, now);
    // rocket
    const q1 = spline(Math.max(pos-.02,0)), q2 = spline(Math.min(pos+.02,n-1));
    const ang = Math.atan2(q2.y-q1.y, q2.x-q1.x) + Math.PI/2;
    const thrust = Math.min(vel*1.2, 1), rx = sx(R.x), ry = sy(R.y)+bob;
    if (!reduce && thrust > .05) for (let k=0;k<Math.ceil(thrust*3);k++)
      parts.push({x:R.x - Math.sin(ang)*18 + (Math.random()-.5)*4, y:R.y + Math.cos(ang)*18, vx:-Math.sin(ang)*28+(Math.random()-.5)*12, vy:Math.cos(ang)*28+(Math.random()-.5)*12, life:1, r:2+Math.random()*2});
    parts = parts.filter(pp => (pp.life -= dt*1.3) > 0);
    for (const pp of parts){ pp.x+=pp.vx*dt; pp.y+=pp.vy*dt; pp.r+=dt*7; ctx.globalAlpha=pp.life*.33; ctx.fillStyle="#cdd6f0"; ctx.beginPath(); ctx.arc(sx(pp.x),sy(pp.y),pp.r,0,6.283); ctx.fill(); }
    ctx.globalAlpha=1;
    drawRocket(rx, ry, ang, Math.max(thrust, reduce?0:.08));
    // distance from the Sun, interpolated between planets
    const snap = Math.abs(pos-Math.round(pos)) < .2 ? Math.round(pos) : pos; const i0 = Math.min(Math.floor(snap), n-2), u = snap-i0, au = planetOf(i0).au + (planetOf(i0+1).au-planetOf(i0).au)*u;
    $("#hudAlt").textContent = (au < 10 ? au.toFixed(2) : au.toFixed(1)) + " AU";
    $("#hint").classList.toggle("gone", pos > .02);
    requestAnimationFrame(frame);
  }
  const hitAt = e => { const r = cv.getBoundingClientRect(), x = e.clientX-r.left, y = e.clientY-r.top; return hits.find(h => Math.hypot(h.x-x,h.y-y) < h.r+8); };
  cv.addEventListener("click", e => { const h = hitAt(e); if (h) goTo(h.i); });
  cv.addEventListener("mousemove", e => { cv.style.cursor = hitAt(e) ? "pointer" : "default"; });
  $("#sysmap").addEventListener("click", e => { const b = e.target.closest("button"); if (b) goTo(+b.dataset.i); });
  new ResizeObserver(resize).observe(scene);
  resize(); measure();
  requestAnimationFrame(t => { last=t; frame(t); });
  return { measure };
})();
window.Flight = Flight;

renderStats(); renderAll(); renderContact();
