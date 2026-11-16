'use strict';
/* Cafefall — a café quiz for the EduGames portal. The chef cat cooks what the customers order;
   every dish is a question. Right: cooked and served, coins and a tip. Wrong: it burns, try again. */
const $=id=>document.getElementById(id);
const {SUBJECTS,SICON,SHUE,DIFFNAME,stream}=EduQ;
const GAME='cafefall';
const SVGNS='http://www.w3.org/2000/svg';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const easeOut=t=>1-Math.pow(1-t,3);
const easeInOut=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const RM=matchMedia('(prefers-reduced-motion: reduce)');let reduced=RM.matches;
try{RM.addEventListener('change',e=>{reduced=e.matches})}catch(e){}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function sv(tag,attrs,parent){const e=document.createElementNS(SVGNS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.append(e);return e}

/* ======================= LANGUAGE =======================
   questions.js switches the shared words (Play, Difficulty, Resume…) to Romanian by itself.
   The café's own words live here so questions.js stays byte-identical to the other games. */
const LANG=(EduQ.getLang&&EduQ.getLang())||'en';
const RO={'tips':'bacșiș','Cook it right':'Gătește corect','Answer right. Serve it hot.':'Răspunde corect. Servește cald.','Animal art: Kenney.nl (CC0)':'Desene cu animale: Kenney.nl (CC0)',
 'Open the café':'Deschide cafeneaua','customers served':'clienți serviți','Walked out':'Au plecat','Toast':'Pâine prăjită','Sandwich':'Sandviș','Juice':'Suc','Pizza':'Pizza','Cake':'Prăjitură',
 'Ice cream':'Înghețată','Donut':'Gogoașă','Pancakes':'Clătite','Orders':'Comenzi','Order':'Comanda','Café closed':'Cafeneaua s-a închis',"Time's up":'Timpul a expirat','Run ended':'Jocul s-a terminat',
 'Café open!':'Cafeneaua e deschisă!','Tap the food the customer wants':'Atinge mâncarea pe care o vrea clientul','Nobody ordered that':'Nu a comandat nimeni asta','Yum!':'Delicios!',
 'Burnt! Here is another one.':'Ars! Iată altă întrebare.','Cooked!':'Gata!','3 in a row! Tips ×2':'3 la rând! Bacșiș ×2','5 in a row! Tips ×3':'5 la rând! Bacșiș ×3','Streak lost':'Serie pierdută',
 'They left!':'A plecat!','Every answer right. Five-star café!':'Toate răspunsurile corecte. Cafenea de cinci stele!','New best!':'Record nou!','Best':'Record','coins':'monede','Step 1 of 2':'Pasul 1 din 2','Step 2 of 2':'Pasul 2 din 2',
 'Worth another look':'Merită să le mai vezi','Play for':'Joacă','Seconds':'Secunde','Coins':'Monede','Answers right':'Răspunsuri corecte','Best streak':'Cea mai lungă serie','Run length':'Durata','Custom':'Personalizat',
 'Result sent to your teacher.':'Rezultatul a fost trimis profesorului.','Café menu':'Meniul cafenelei','Question':'Întrebare'};
const L=s=>LANG==='ro'&&RO[s]!=null?RO[s]:s;
const DIFFN=d=>DIFFNAME[d]||['','Easy','Medium','Hard'][d];
const modeName=m=>m.kind==='o'?(LANG==='ro'?`${m.n} comenzi`:`${m.n} orders`):`${m.n} sec`;
function translateStatic(){if(LANG!=='ro')return;
  [$('app'),$('sheet')].forEach(root=>{const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
    while(n=w.nextNode()){const p=n.parentElement;if(!p||p.closest('[data-noi18n],svg'))continue;const k=n.nodeValue.trim();if(k&&RO[k]!=null)n.nodeValue=n.nodeValue.replace(k,RO[k])}})}

/* ======================= DATA ======================= */
const ITEMS=[{id:'toast',name:'Toast'},{id:'juice',name:'Juice'},{id:'pizza',name:'Pizza'},{id:'icecream',name:'Ice cream'},
  {id:'sandwich',name:'Sandwich'},{id:'cake',name:'Cake'},{id:'donut',name:'Donut'},{id:'pancakes',name:'Pancakes'}];
/* Kenney Animal Pack Redux heads (CC0). w,h: crop size in the original 277px art; cx,cy: centre of the round face */
const ANIMALS={
 dog:{w:135,h:164,cx:67,cy:96,c:'#cfcfcf',o:'#6f6f6f',b:'#eeeeee'},bear:{w:160,h:139,cx:79.5,cy:71,c:'#a0603a',o:'#5e3a1c',b:'#c98f60'},
 panda:{w:181,h:136,cx:90,cy:68,c:'#f2f2f2',o:'#4a4a4a',b:'#ffffff',a:'#3c3c3c'},rabbit:{w:135,h:183,cx:67,cy:115,c:'#d2d0d0',o:'#7a7474',b:'#f6f6f6'},
 chick:{w:136,h:136,cx:67.5,cy:68,c:'#f8c800',o:'#8a6d00',b:'#ffe066'},pig:{w:152,h:136,cx:75.5,cy:68,c:'#ec9cec',o:'#8f5a8f',b:'#f8c0f8'},
 monkey:{w:180,h:136,cx:89.5,cy:68,c:'#a0603a',o:'#5e3a1c',b:'#e0b48a'},elephant:{w:191,h:162,cx:95.5,cy:67,c:'#cfcfcf',o:'#7a7474',b:'#e6e6e6'},
 penguin:{w:147,h:136,cx:73,cy:68,c:'#305860',o:'#162c32',b:'#f0f8f8'},duck:{w:136,h:136,cx:67.5,cy:68,c:'#2cc874',o:'#167a40',b:'#f0f0f0'},
 zebra:{w:136,h:149,cx:67.5,cy:81,c:'#eaeaea',o:'#3a3a3a',b:'#ffffff',a:'#3a3a3a'},horse:{w:136,h:149,cx:67,cy:81,c:'#8a5a30',o:'#55361a',b:'#b88a5a'},
 gorilla:{w:136,h:136,cx:67.5,cy:68,c:'#454545',o:'#232323',b:'#9a9494'},goat:{w:190,h:178,cx:94.5,cy:90,c:'#a0603a',o:'#5e3a1c',b:'#e9d2b0'}};
const ANIMAL_IDS=Object.keys(ANIMALS);
/* difficulty: how many wait at once, patience (seconds), items on the menu, two-item orders, moving queue */
const LV={1:{max:1,min:1,pat:45,items:6,two:false,gap:[.6,.9]},
          2:{max:3,min:2,pat:34,items:8,two:false,gap:[4,7]},
          3:{max:3,min:2,pat:24,items:8,two:true,gap:[2.6,4],move:true}};
let SLOTS=[600,410,220];
const PRICE=5;

/* ======================= SETTINGS ======================= */
const MODES=[{id:'o10',kind:'o',n:10},{id:'o20',kind:'o',n:20},{id:'t60',kind:'t',n:60},{id:'t90',kind:'t',n:90}];
const cfg={subject:'english',topic:'irregular',diffs:{},mode:'o10',mcustom:false,cmode:''};
try{const s=JSON.parse(localStorage.getItem('cafefall-cfg')||'{}');for(const k of Object.keys(cfg))if(s[k]!=null)cfg[k]=s[k]}catch(e){}
const saveCfg=()=>{try{localStorage.setItem('cafefall-cfg',JSON.stringify(cfg))}catch(e){}};
/* settings from the portal live here and are never written to cfg (contract: don't save over the player's own) */
let ov=null;
const curSubject=()=>{const id=ov?ov.subject:cfg.subject;return SUBJECTS.find(s=>s.id===id)||SUBJECTS[0]};
const curTopic=()=>{const s=curSubject(),id=ov?ov.topic:cfg.topic;return s.topics.find(t=>t.id===id)||s.topics[0]};
const topicDiff=tp=>cfg.diffs[tp.id]||tp.d;
const DIFF=()=>ov?(ov.level||curTopic().d):topicDiff(curTopic());
/* custom run length: 'o<n>' = n orders (3–50), 't<n>' = n seconds (20–600) */
const parseMode=id=>{const f=MODES.find(m=>m.id===id);if(f)return f;const x=/^([ot])(\d{1,3})$/.exec(String(id||''));if(!x)return null;
  const kind=x[1],n=kind==='o'?clamp(+x[2],3,50):clamp(Math.round(+x[2]/10)*10,20,600);return{id:kind+n,kind,n,custom:true}};
const MODE=()=>parseMode(ov&&ov.mode?ov.mode:cfg.mode)||MODES[0];
const bestKey=(id,d,m)=>`cafefall-best-${id||curTopic().id}-d${d||DIFF()}-${m||MODE().id}`;
const getBest=(id,d,m)=>{try{return +localStorage.getItem(bestKey(id,d,m))||0}catch(e){return 0}};
function logResult(r){
  try{const k='edu-results',a=JSON.parse(localStorage.getItem(k)||'[]');a.push(r);localStorage.setItem(k,JSON.stringify(a.slice(-200)))}catch(e){}
  try{if(window.parent&&window.parent!==window)window.parent.postMessage({type:'edu-result',result:r},'*')}catch(e){}
}

/* ======================= AUDIO (synthesised, no files) ======================= */
const A={on:true,ctx:null,master:null,noise:null};
try{const s=JSON.parse(localStorage.getItem('cafefall-audio')||'{}');if(s.on===false)A.on=false}catch(e){}
function au(){
  if(A.ctx)return A.ctx;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
  try{A.ctx=new C()}catch(e){return null}
  const c=A.ctx;A.master=c.createGain();A.master.gain.value=A.on?.8:0;A.master.connect(c.destination);
  const len=c.sampleRate*1.5,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;A.noise=b;
  return c}
function unlock(){const c=au();if(c&&c.state==='suspended')c.resume()}
function tone(f,dur,{type='sine',vol=.3,at=0,to=null,attack=.005}={}){const c=au();if(!c||!A.on)return;const t=c.currentTime+at;
  const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g);g.connect(A.master);o.start(t);o.stop(t+dur+.05)}
function noise(dur,{f=1200,q=1,vol=.25,at=0,type='bandpass',to=null}={}){const c=au();if(!c||!A.on)return;const t=c.currentTime+at;
  const s=c.createBufferSource();s.buffer=A.noise;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(to)fl.frequency.exponentialRampToValueAtTime(to,t+dur);fl.Q.value=q;
  const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.02);g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  s.connect(fl);fl.connect(g);g.connect(A.master);s.start(t,Math.random()*.4);s.stop(t+dur+.05)}
const S={
  tap(){tone(660,.06,{type:'triangle',vol:.12})},
  bell(){[1568,2093,3136].forEach((f,i)=>tone(f,1.1-i*.25,{vol:.18-i*.05}));tone(1568,.9,{vol:.12,at:.16});tone(2093,.7,{vol:.08,at:.16})},
  sizzle(){noise(.75,{f:5200,q:.7,vol:.16,type:'highpass'});for(let i=0;i<7;i++)noise(.03,{f:3000+Math.random()*3000,q:3,vol:.12,at:Math.random()*.6})},
  coins(n=2){for(let i=0;i<n;i++){tone(1318,.09,{type:'square',vol:.07,at:i*.09});tone(1976,.2,{type:'square',vol:.07,at:i*.09+.05})}},
  burn(){noise(.9,{f:900,q:.6,vol:.28,type:'lowpass',to:200});tone(220,.5,{type:'sawtooth',vol:.06,to:90})},
  frown(){tone(440,.28,{type:'triangle',vol:.14,to:330});tone(330,.4,{type:'triangle',vol:.14,at:.22,to:220})},
  yum(){tone(784,.1,{type:'triangle',vol:.14});tone(1047,.16,{type:'triangle',vol:.14,at:.08})},
  streak(){[784,988,1175,1568].forEach((f,i)=>tone(f,.18,{type:'triangle',vol:.14,at:i*.07}))},
  nope(){tone(200,.12,{type:'square',vol:.06})},
  step(){tone(180,.05,{type:'triangle',vol:.05})}};
function paintAudio(){['mute','sndT','sndT2'].forEach(id=>$(id).setAttribute('aria-pressed',A.on));if(A.master)A.master.gain.value=A.on?.8:0}
function toggleAudio(){A.on=!A.on;try{localStorage.setItem('cafefall-audio',JSON.stringify({on:A.on}))}catch(e){}unlock();paintAudio();if(A.on)S.tap()}
['mute','sndT','sndT2'].forEach(id=>$(id).onclick=e=>{e.stopPropagation();toggleAudio()});

/* ======================= SCENE ======================= */
const svg=$('scene'),Qg=$('queue'),FX=$('fx'),chef=$('chef');
$('scene').querySelector('defs').insertAdjacentHTML('beforeend','<filter id="burnt"><feColorMatrix type="matrix" values=".18 .05 0 0 0  .12 .05 0 0 0  .08 .04 0 0 0  0 0 0 1 0"/></filter>');
let vb={x:110,y:40,w:890,h:560};
function layout(){
  const r=svg.getBoundingClientRect();if(!r.width||!r.height)return;
  /* portrait: customers stand a little closer so everyone can be drawn bigger */
  const portrait=r.width<r.height*1.05,X0=portrait?118:110,X1=portrait?972:1000;
  const ns=portrait?[606,414,222]:[600,410,220];if(ns[0]!==SLOTS[0]){SLOTS=ns;customers.forEach(c=>{if((c.st==='wait'||c.st==='walkin')&&c.slot>=0){c.tx=SLOTS[c.slot];c.moving=true}})}
  const CW=X1-X0,CH=565,s=Math.min(r.width/CW,r.height/CH);const w=r.width/s,h=r.height/s;
  vb={x:X0-(w-CW)/2,y:600-h,w,h};svg.setAttribute('viewBox',`${vb.x} ${vb.y} ${w} ${h}`);
  /* free wall above the customers' bubbles (y < 35): window, lamps and the sign go there when there is room */
  const free=35-vb.y,tall=free>260;
  $('window').style.display=tall?'':'none';$('lamps').style.display=free>140?'':'none';
  $('window').setAttribute('transform',`translate(${portrait?300:250} ${Math.round(vb.y+free/2-110)})`);
  $('lamps').setAttribute('transform',`translate(0 ${Math.round(vb.y+Math.min(80,free*.25))})`);
  const sy=tall?Math.round(vb.y+free*.55):Math.max(vb.y+70,90);$("sign").setAttribute("transform",`translate(${portrait?800:860} ${Math.min(sy,92)})`);
  $('sign').style.display=free>150?'':'none';
  $('shelf').style.setProperty('--n',menuItems().length)}
addEventListener('resize',()=>{layout();customers.forEach(placeCustomer)});
if(window.ResizeObserver)new ResizeObserver(layout).observe($('stage'));

/* customer art: body drawn here in the head's own colours, head is the Kenney picture */
function buildCustomer(c){
  const a=ANIMALS[c.animal],g=sv('g',{class:'cust'},Qg);
  sv('ellipse',{cx:0,cy:-2,rx:72,ry:12,fill:'rgba(59,36,22,.16)'},g);
  const walk=sv('g',{},g);
  sv('ellipse',{cx:-32,cy:-12,rx:28,ry:14,fill:a.o},walk);sv('ellipse',{cx:32,cy:-12,rx:28,ry:14,fill:a.o},walk);
  const arm=a.a||a.c;
  [[-1],[1]].forEach(([d])=>{sv('path',{d:`M${58*d} -150 Q${84*d} -110 ${72*d} -70`,stroke:a.o,'stroke-width':30,'stroke-linecap':'round',fill:'none'},walk);
    sv('path',{d:`M${58*d} -150 Q${84*d} -110 ${72*d} -70`,stroke:arm,'stroke-width':18,'stroke-linecap':'round',fill:'none'},walk)});
  sv('path',{d:'M-54-178C-82-120-80-60-72-30Q-68-16-50-16H50Q68-16 72-30C80-60 82-120 54-178Q30-196 0-196T-54-178Z',fill:a.c,stroke:a.o,'stroke-width':7,'stroke-linejoin':'round'},walk);
  sv('ellipse',{cx:0,cy:-86,rx:38,ry:50,fill:a.b},walk);
  if(c.animal==='zebra')['M-50-150q14 6 20 0','M-56-110q14 6 20 0','M50-150q-14 6-20 0','M56-110q-14 6-20 0'].forEach(d=>sv('path',{d,stroke:'#3a3a3a','stroke-width':7,fill:'none','stroke-linecap':'round'},walk));
  const k=150/136,head=sv('g',{class:'head',transform:'translate(0 -250)'},walk);
  sv('image',{href:`animals/${c.animal}.png`,x:-a.cx*k,y:-a.cy*k,width:a.w*k,height:a.h*k},head);
  /* speech bubble with the order and the patience bar */
  const n=c.order.length,bw=n>1?186:150,iz=n>1?78:96,top=-540,bh=134;
  const bub=sv('g',{class:'bub'},g);
  sv('rect',{class:'ring',x:-bw/2-10,y:top-10,width:bw+20,height:bh+20,rx:38,fill:'none',stroke:'#ffc83d','stroke-width':10},bub);
  sv('path',{d:`M-18 ${top+bh-4}L-2 ${top+bh+30}L22 ${top+bh-4}Z`,fill:'#fff',stroke:'#3b2416','stroke-width':7,'stroke-linejoin':'round'},bub);
  sv('rect',{x:-bw/2,y:top,width:bw,height:bh,rx:30,fill:'#fff',stroke:'#3b2416','stroke-width':7},bub);
  sv('path',{d:`M-26 ${top+bh-7.5}h44`,stroke:'#fff','stroke-width':9},bub);
  c.slotsEl=[];c.order.forEach((it,i)=>{const x=n>1?(i?42:-42):0;const u=sv('use',{href:'#i-'+it,x:x-iz/2,y:top+8,width:iz,height:iz},bub);
    const t=sv('use',{href:'#tick',x:x+iz/2-34,y:top+6,width:36,height:36,opacity:0},bub);c.slotsEl.push({u,t})});
  const bx=-bw/2+18,bwid=bw-36;
  sv('rect',{x:bx,y:top+bh-26,width:bwid,height:14,rx:7,fill:'#eadfd2'},bub);
  c.bar=sv('rect',{x:bx,y:top+bh-26,width:bwid,height:14,rx:7,fill:'#2fb36b'},bub);c.barW=bwid;
  c.mood=sv('use',{href:'#f-happy',x:-48,y:top+18,width:96,height:96,opacity:0},bub);
  c.g=g;c.walkG=walk;c.headG=head;c.bub=bub;
  g.addEventListener('pointerdown',e=>{e.preventDefault();tapCustomer(c)});
  return g}
function placeCustomer(c){
  const bob=c.moving&&!reduced?-Math.abs(Math.sin(c.phase))*12:0,tilt=c.moving&&!reduced?Math.sin(c.phase)*3:(c.tilt||0);
  const lift=c.slot%2===1?-40:0;c.lift+=(lift-c.lift)*.15;
  c.g.setAttribute('transform',`translate(${c.x.toFixed(1)} 590)`);
  c.walkG.setAttribute('transform',`translate(0 ${(bob+(c.hop||0)).toFixed(1)}) rotate(${tilt.toFixed(2)} 0 -100)`);
  c.bub.setAttribute('transform',`translate(0 ${(c.lift+(c.hop||0)).toFixed(1)})`);
  c.bub.style.opacity=c.st==='walkin'&&!reduced?Math.max(0,1-Math.abs(c.tx-c.x)/160):1}
function paintBar(c){const p=clamp(c.p,0,1);c.bar.setAttribute('width',Math.max(0,c.barW*p).toFixed(1));c.bar.setAttribute('fill',p>.5?'#2fb36b':p>.25?'#f2a516':'#e5484d')}

/* ======================= GAME STATE ======================= */
let state='menu',gameT=0,customers=[],cur=null,Q=null,answered=false,next=null,seen=new Set();
let coins=0,served=0,finished=0,walkouts=0,right=0,asked=0,streak=0,bestStreak=0,missed=[],spawned=0,spawnT=0,timeLeft=0,runStart=0,hintShown=false;
const timers=[];/* game-time timers: they wait while the game is paused */
function later(sec,fn){timers.push({t:gameT+sec,fn})}
const tweens=[];
function tween(dur,step,done){tweens.push({t:0,dur,step,done})}
const menuItems=()=>ITEMS.slice(0,LV[DIFF()]?LV[DIFF()].items:8);
const lvl=()=>LV[DIFF()]||LV[2];
const qid=q=>q.q+'|'+q.answer+'|'+(q.img||'');
function nextQ(){let q,d=0;do{q=next();d++}while(seen.has(qid(q))&&d<40);seen.add(qid(q));if(seen.size>60)seen=new Set();return q}

function renderShelf(){const box=$('shelf');box.innerHTML='';
  menuItems().forEach(it=>{const b=el('button','item');b.type='button';b.id='it-'+it.id;b.setAttribute('aria-label',L(it.name));
    b.innerHTML=`<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#i-${it.id}"/></svg>`;b.append(el('span',null,L(it.name)),el('i',null,''));
    b.onclick=()=>tapItem(it.id,b);box.append(b)});
  box.style.setProperty('--n',menuItems().length)}
function paintShelf(){const want={};customers.forEach(c=>{if(c.st!=='wait')return;c.order.forEach((it,i)=>{if(!c.done[i])want[it]=(want[it]||0)+1})});
  menuItems().forEach(it=>{const b=$('it-'+it.id);if(!b)return;const n=want[it.id]||0;b.classList.toggle('want',n>0);b.querySelector('i').textContent=n>1?n:'!'})}
function paintHud(){const m=MODE();$('coins').textContent=coins;
  if(m.kind==='o'){$('clock').textContent=`${L('Order')} ${Math.min(finished+1,m.n)}/${m.n}`;$('clockChip').classList.remove('low')}
  else{const s=Math.max(0,Math.ceil(timeLeft));$('clock').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;$('clockChip').classList.toggle('low',s<=10)}
  const mult=streak>=5?3:streak>=3?2:1,mc=$('multChip');$('multN').textContent=mult;mc.classList.toggle('on',mult>1)}
function show(id,on){$(id).classList.toggle('off',!on)}
function banner(big,small,bad){const b=$('banner');b.querySelector('span').textContent=big;b.querySelector('small').textContent=small||'';b.classList.toggle('bad',!!bad);
  b.classList.remove('show');void b.offsetWidth;b.classList.add('show')}
function hint(text){const h=$('hint');if(!text){show('hint',false);return}h.textContent=text;show('hint',true)}

/* screen position of a point in the scene */
function toScreen(x,y){const m=svg.getScreenCTM();if(!m)return{x:0,y:0};const p=svg.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(m);return{x:q.x,y:q.y}}
function popText(x,y,text){const s=toScreen(x,y),d=el('div','pop',text);d.style.left=s.x+'px';d.style.top=s.y+'px';document.body.append(d);setTimeout(()=>d.remove(),1400)}
function flyCoins(x,y,n){
  const chip=$('coinChip').getBoundingClientRect(),to={x:chip.left+20,y:chip.top+chip.height/2-13};
  if(reduced){bumpCoins();return}
  const s=toScreen(x,y);for(let i=0;i<Math.min(n,6);i++){const d=document.createElementNS(SVGNS,'svg');d.setAttribute('viewBox','0 0 100 100');d.setAttribute('class','fly');
    d.innerHTML='<use href="#coin"/>';const ox=rnd(-30,30),oy=rnd(-30,10);d.style.transform=`translate(${s.x+ox}px,${s.y+oy}px)`;document.body.append(d);
    setTimeout(()=>{d.style.transform=`translate(${to.x}px,${to.y}px) scale(.8)`;d.style.opacity='.4'},40+i*70);
    setTimeout(()=>{d.remove();if(i===0)bumpCoins()},800+i*70)}}
function bumpCoins(){const c=$('coinChip');c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop');paintHud()}

/* ---------- customers ---------- */
let uid=0;
function freeSlot(){const used=new Set(customers.filter(c=>c.st==='walkin'||c.st==='wait').map(c=>c.slot));for(let i=0;i<SLOTS.length;i++)if(!used.has(i))return i;return -1}
function spawn(){
  const lv=lvl(),slot=freeSlot();if(slot<0)return;
  const inUse=new Set(customers.filter(c=>c.st!=='gone').map(c=>c.animal));const pool=ANIMAL_IDS.filter(a=>!inUse.has(a));
  const items=menuItems().map(i=>i.id);let order=[pick(items)];if(lv.two){let b;do{b=pick(items)}while(b===order[0]);order.push(b)}
  const c={id:++uid,animal:pick(pool.length?pool:ANIMAL_IDS),order,done:order.map(()=>false),slot,x:-260,tx:SLOTS[slot],st:'walkin',p:1,
    dur:lv.pat*(lv.two?1.45:1),moving:true,phase:0,lift:slot%2?-40:0,hop:0,tilt:0};
  buildCustomer(c);customers.push(c);spawned++;placeCustomer(c);paintBar(c);
  if(reduced){c.x=c.tx}
  S.bell()}
function leave(c,happy){
  if(c.st==='leaving'||c.st==='gone')return;
  if(cur&&cur.c===c)closeCard();
  c.st='leaving';c.g.classList.remove('serving');finished++;
  if(happy){served++;c.mood.setAttribute('href','#f-happy')}else{walkouts++;c.mood.setAttribute('href','#f-sad');c.g.classList.add('sad');c.tilt=-6}
  c.mood.setAttribute('opacity',1);c.slotsEl.forEach(s=>{s.u.setAttribute('opacity',0);s.t.setAttribute('opacity',0)});
  if(happy){S.yum();hopCustomer(c)}else{S.frown();popText(c.x,590-560,L('They left!'));
    if(streak>0){if(streak>=3)banner(L('Streak lost'),'',true);streak=0}}
  later(reduced?.4:.9,()=>{c.tx=-300;c.moving=true;c.slot=-1});
  /* moving queue (Hard): everyone behind steps forward */
  if(lvl().move){const freed=customers.filter(o=>o!==c&&(o.st==='wait'||o.st==='walkin')).sort((a,b)=>a.slot-b.slot);
    later(reduced?.4:.95,()=>freed.forEach((o,i)=>{if(o.st==='wait'||o.st==='walkin'){if(o.slot!==i){o.slot=i;o.tx=SLOTS[i];o.moving=true}}}))}
  if(lvl().max===1)spawnT=(reduced?.4:1.2)+rnd(...lvl().gap);
  paintHud();paintShelf();checkEnd()}
function hopCustomer(c){if(reduced)return;tween(.5,t=>{c.hop=-Math.sin(t*Math.PI)*34},()=>{c.hop=0})}

/* ---------- serving ---------- */
function tapItem(id,btn){
  if(state!=='play'){return}if(cur){return}
  unlock();const wait=customers.filter(c=>c.st==='wait'&&c.order.some((it,i)=>it===id&&!c.done[i]));
  if(!wait.length){btn.classList.remove('nope');void btn.offsetWidth;btn.classList.add('nope');S.nope();hint(L('Nobody ordered that'));later(1.6,()=>{if(!cur)hint('')});return}
  wait.sort((a,b)=>a.p-b.p);const c=wait[0];serve(c,c.order.findIndex((it,i)=>it===id&&!c.done[i]))}
function tapCustomer(c){if(state!=='play'||cur||c.st!=='wait')return;unlock();const i=c.done.indexOf(false);if(i>=0)serve(c,i)}
function serve(c,idx){
  cur={c,idx,item:c.order[idx]};c.g.classList.add('serving');S.tap();hint('');hintShown=true;
  $('panUse').setAttribute('href','#i-'+cur.item);$('panItem').style.opacity=1;$('panItem').removeAttribute('filter');
  setPanFx('raw');$('cWho').src=`animals/${c.animal}.png`;$('cItem').setAttribute('href','#i-'+cur.item);
  $('cName').textContent=L(ITEMS.find(i=>i.id===cur.item).name);
  askQ();show('card',true);paintShelf()}
function askQ(){
  Q=nextQ();answered=false;const qt=$('qtext'),im=$('qimg');qt.textContent='';if(Q.code)qt.append(el('span','code',Q.code));qt.append(Q.q);
  if(Q.img){im.src=Q.img;im.hidden=false}else{im.hidden=true;im.removeAttribute('src')}
  $('qtag').textContent=Q.tag||'';$('verdict').textContent='';$('verdict').className='';
  const bs=[...$('ans').querySelectorAll('button')];$('ans').classList.remove('locked');
  bs.forEach((b,i)=>{b.className='';b.querySelector('span').textContent=Q.ans[i]})}
function closeCard(){show('card',false);if(cur){cur.c.g.classList.remove('serving')}cur=null;Q=null;paintShelf()}
function setPanFx(m){$('flames').style.opacity=m==='cook'||m==='burn'?1:0;$('steamG').style.opacity=m==='cook'?1:0;$('smoke').style.opacity=m==='burn'?1:0}
function answer(i){
  if(state!=='play'||!cur||answered||!Q)return;answered=true;asked++;
  const ok=i===Q.correct,bs=[...$('ans').querySelectorAll('button')],c=cur.c,idx=cur.idx;$('ans').classList.add('locked');
  bs.forEach((b,j)=>{if(j===Q.correct)b.classList.add('right');else if(j===i)b.classList.add('wrong');else b.classList.add('dim')});
  if(ok){
    right++;streak++;bestStreak=Math.max(bestStreak,streak);
    lastAns={q:Q.img?'This flag':Q.q,img:Q.img||null,answer:Q.answer,picked:Q.answer,ok:1,tag:Q.tag||null};
    $('verdict').textContent=L('Cooked!');$('verdict').className='good';
    if(streak===3||streak===5){banner(L(streak===3?'3 in a row! Tips ×2':'5 in a row! Tips ×3'));S.streak()}
    c.done[idx]=true;cook(c,idx);later(reduced?.35:.55,closeCard)}
  else{
    if(streak>=3)banner(L('Streak lost'),'',true);streak=0;
    missed.push({q:Q.img?'This flag':Q.q,img:Q.img,answer:Q.answer,picked:Q.ans[i]});
    lastAns=Object.assign({},missed[missed.length-1],{ok:0,tag:Q.tag||null});
    $('verdict').textContent=L('Burnt! Here is another one.');$('verdict').className='bad';
    burn();c.p-=.15;paintBar(c);
    later(1.6,()=>{if(!cur||cur.c!==c||state!=='play')return;if(c.p<=0){leave(c,false);return}askQ()})}
  paintHud();
  toParent({type:'edu-progress',game:GAME,score:coins,right,asked,served,coins})}
function cook(c,idx){
  const item=c.order[idx];setPanFx('cook');S.sizzle();chefMood('happy',1.2);
  const wob=t=>$('panItem').setAttribute('transform',`translate(0 ${-62-Math.abs(Math.sin(t*Math.PI*3))*16}) rotate(${Math.sin(t*Math.PI*4)*8})`);
  const cookT=reduced?.15:.55;
  if(!reduced)tween(cookT,wob);
  later(cookT,()=>{
    setPanFx('');$('panItem').style.opacity=0;$('panItem').setAttribute('transform','translate(0 -62)');
    /* the dish flies from the pan to the customer's bubble */
    const lift=c.slot%2===1?-40:0,n=c.order.length,ix=n>1?(idx?42:-42):0;
    const from={x:785,y:404-62},to={x:c.x+ix,y:590-540+48+lift};
    const done=()=>{c.slotsEl[idx].t.setAttribute('opacity',1);c.slotsEl[idx].u.setAttribute('opacity',.55);
      coins+=PRICE;flyCoins(to.x,to.y,2);S.coins(1);popText(to.x,to.y-40,`+${PRICE}`);
      if(c.done.every(Boolean)&&!c.tipped){c.tipped=true;const mult=streak>=5?3:streak>=3?2:1,tip=(2+Math.round(clamp(c.p,0,1)*6))*mult;coins+=tip;
        later(.25,()=>{flyCoins(c.x,590-300,tip>6?5:3);S.coins(3);popText(c.x,590-560,`${L('Yum!')} +${tip}${mult>1?` (×${mult})`:''}`)});leave(c,true)}
      paintHud();paintShelf()};
    if(reduced){done();return}
    const u=sv('use',{href:'#i-'+item,width:84,height:84},FX);
    tween(.45,t=>{const e=easeInOut(t),x=from.x+(to.x-from.x)*e,y=from.y+(to.y-from.y)*e-Math.sin(t*Math.PI)*120;u.setAttribute('x',x-42);u.setAttribute('y',y-42)},()=>{u.remove();done()})})}
function burn(){
  setPanFx('burn');S.burn();chefMood('oops',1.5);$('panItem').setAttribute('filter','url(#burnt)');
  if(!reduced)tween(.4,t=>$('panItem').setAttribute('transform',`translate(${Math.sin(t*Math.PI*8)*5} -62)`));
  later(1.45,()=>{if(cur){$('panItem').removeAttribute('filter');setPanFx('raw')}else{setPanFx('');$('panItem').style.opacity=0}})}
let moodTO=null;function chefMood(m,sec){chef.classList.remove('happy','oops');chef.classList.add(m);const k=moodTO={};later(sec,()=>{if(moodTO===k)chef.classList.remove(m)})}

$('ans').querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>answer(i)));

/* ---------- run ---------- */
function panel(id){['scrHome','stepSubj','stepTopic','pauseP','over'].forEach(x=>$(x).hidden=x!==id);$('sheet').hidden=!id;$('sheet').classList.toggle('dark',id==='pauseP'||id==='over')}
function clearScene(){customers.forEach(c=>c.g.remove());customers=[];FX.innerHTML='';timers.length=0;tweens.length=0;cur=null;Q=null;show('card',false);setPanFx('');$('panItem').style.opacity=0;chef.classList.remove('happy','oops')}
function start(){
  unlock();clearScene();
  coins=served=finished=walkouts=right=asked=streak=bestStreak=spawned=0;missed=[];seen=new Set();gameT=0;
  const m=MODE();timeLeft=m.kind==='t'?m.n:0;runStart=performance.now();
  next=stream(curTopic(),DIFF(),EMBED_REG?{regions:EMBED_REG}:undefined);
  renderShelf();panel(null);show('hud',true);show('shelf',true);paintHud();paintShelf();layout();
  banner(L('Café open!'),`${curTopic().name} · ${DIFFN(DIFF())} · ${modeName(m)}`);
  state='play';spawnT=reduced?.3:.9;
  if(!EMBED&&!hintShown)later(2.6,()=>{if(!cur&&state==='play'&&!hintShown)hint(L('Tap the food the customer wants'))})}
function checkEnd(){const m=MODE();if(m.kind==='o'&&finished>=m.n)later(1,()=>end('full'))}
function end(cause){
  if(state==='over'||state==='menu')return;const wasPaused=state==='paused';state='over';hint('');closeCard();
  const m=MODE(),best0=getBest(),isBest=coins>best0&&coins>0;if(isBest){try{localStorage.setItem(bestKey(),coins)}catch(e){}}
  const timeUsed=Math.round((performance.now()-runStart)/100)/10;
  logResult({game:GAME,subject:curSubject().id,topic:curTopic().id,topicName:curTopic().name,level:DIFF(),
    score:coins,right,asked,bestStreak,missed:missed.map(x=>({q:x.q,answer:x.answer,picked:x.picked})),
    served,coins,orders:finished,walkouts,mode:m.id,cause,timeUsed,at:new Date().toISOString()});
  if(cause!=='quit')S.bell();
  setTimeout(()=>{
    $('rCause').textContent=L({full:'Café closed',time:"Time's up",quit:'Run ended'}[cause]||'Café closed');
    $('rServed').textContent=served;$('rOrders').textContent=finished;$('rCoins').textContent=coins;$('rStreak').textContent=bestStreak;
    $('rRight').textContent=`${right}/${asked}`;$('rLeft').textContent=walkouts;
    const pb=$('rBest');pb.textContent=isBest?L('New best!'):`${L('Best')} ${Math.max(best0,coins)} ${L('coins')}`;pb.classList.toggle('best',isBest);
    $('rTopic').textContent=`${curSubject().name} · ${curTopic().name} · ${DIFFN(DIFF())} · ${modeName(m)}`;
    const rv=$('review');rv.innerHTML='';
    if(missed.length){rv.append(el('h3',null,L('Worth another look')));const ol=el('ol');
      missed.forEach(x=>{const li=el('li');const q=el('span');if(x.img){const im=el('img');im.src=x.img;im.alt='';q.append(im)}q.append(x.q);
        const a=el('div');a.append(el('s',null,x.picked),el('b',null,x.answer));li.append(q,a);ol.append(li)});rv.append(ol)}
    else if(asked)rv.append(el('p','perfect',L('Every answer right. Five-star café!')));
    show('hud',false);show('shelf',false);panel('over');document.body.classList.remove('body-paused')},cause==='quit'||wasPaused?0:900)}
function pause(){if(state!=='play')return;state='paused';document.body.classList.add('body-paused');$('pScore').textContent=coins;
  $('pLine').textContent=`${curTopic().name} · ${DIFFN(DIFF())}`;panel('pauseP');paintAudio()}
function resume(){if(state!=='paused')return;panel(null);state='play';document.body.classList.remove('body-paused');last=performance.now()}
$('pauseBtn').onclick=()=>{S.tap();pause()};$('resumeBtn').onclick=()=>{S.tap();resume()};$('quitBtn').onclick=()=>end('quit');
$('againBtn').onclick=()=>{if(EMBED&&EMBED.lock)return;S.tap();start()};
$('menuBtn').onclick=()=>{if(EMBED&&EMBED.lock)return;S.tap();ov=null;clearScene();state='menu';go('stepTopic')};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
addEventListener('keydown',e=>{if(e.repeat)return;
  if(e.code==='Escape'||e.code==='KeyP'){state==='paused'?resume():pause();return}
  if(state==='over'&&e.code==='Enter'&&!(EMBED&&EMBED.lock)&&!$('over').hidden){start();return}
  if(state!=='play')return;const n={Digit1:0,Digit2:1,Digit3:2,Numpad1:0,Numpad2:1,Numpad3:2}[e.code];if(n!=null&&cur){e.preventDefault();answer(n)}});

/* ======================= MENUS ======================= */
function renderSubjects(){const box=$('subjects');box.innerHTML='';
  SUBJECTS.forEach(s=>{const b=el('button','tile');b.type='button';b.id='subj-'+s.id;b.style.setProperty('--h',SHUE[s.id]);
    const ic=el('span','sicon');ic.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${SICON[s.id]||''}</svg>`;
    const tx=el('span','tx');tx.append(el('strong',null,s.name),el('span',null,`${s.topics.filter(x=>!x.unit).length} topics`));b.append(ic,tx);
    b.onclick=()=>{if(cfg.subject!==s.id){cfg.subject=s.id;cfg.topic=s.topics[0].id}saveCfg();S.tap();go('stepTopic')};box.append(b)})}
function renderTopics(){const s=curSubject(),tp0=curTopic();cfg.topic=tp0.id;$('subName').textContent=s.name;
  const box=$('topics');box.innerHTML='';
  {const o=document.getElementById('topTabs');if(o)o.remove();const tb=EduQ.topicTabs&&EduQ.topicTabs(s,tp0,id=>{cfg.topic=id;saveCfg();renderTopics()});if(tb){tb.id='topTabs';box.before(tb)}}
  (EduQ.topicsOf?EduQ.topicsOf(s,tp0):s.topics).forEach(tp=>{const b=el('button','row');b.type='button';b.id='topic-'+tp.id;b.setAttribute('aria-pressed',tp.id===cfg.topic);
    const tx=el('span','tx');tx.append(el('strong',null,tp.name),el('span',null,tp.regions&&EduQ.regionLabel?EduQ.regionLabel(EduQ.getRegions(tp.id)):tp.bl));
    b.append(el('span','radio'),tx);const bs=getBest(tp.id,topicDiff(tp),cfg.mode);if(bs)b.append(el('span','best',`best ${bs}`));
    b.onclick=()=>{cfg.topic=tp.id;saveCfg();renderTopics()};box.append(b)});
  {const old=document.getElementById('regPick');if(old)old.remove();const pk=EduQ.regionPicker&&EduQ.regionPicker(tp0,{onChange:renderTopics});if(pk){pk.id='regPick';box.after(pk)}}
  const dd=topicDiff(tp0);document.querySelectorAll('#diffSeg button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.d===dd));
  const ms=$('modeSeg');ms.innerHTML='';const isC=!!cfg.mcustom;
  MODES.forEach(m=>{const b=el('button',null,modeName(m));b.type='button';b.setAttribute('aria-pressed',!isC&&m.id===cfg.mode);b.onclick=()=>{cfg.mode=m.id;cfg.mcustom=false;saveCfg();renderTopics()};ms.append(b)});
  {const b=el('button',null,L('Custom'));b.type='button';b.setAttribute('aria-pressed',isC);b.onclick=()=>{cfg.mcustom=true;cfg.mode=(parseMode(cfg.cmode)||parseMode('o15')).id;saveCfg();renderTopics()};ms.append(b)}
  {const o=document.getElementById('customMode');if(o)o.remove();if(isC&&EduQ.customRow){const m=MODE();
    const row=EduQ.customRow([{key:'kind',label:L('Play for'),options:[['o',L('Orders')],['t',L('Seconds')]]},m.kind==='o'?{key:'n',label:L('Orders'),min:3,max:50,step:1}:{key:'n',label:L('Seconds'),unit:'s',min:20,max:600,step:10}],{kind:m.kind,n:m.n},
      v=>{const k=v.kind,n=k!==m.kind?(k==='o'?15:90):v.n;const nm=parseMode(k+n);cfg.mode=cfg.cmode=nm.id;saveCfg();renderTopics()});row.id='customMode';ms.after(row)}}}
document.querySelectorAll('#diffSeg button').forEach(b=>b.onclick=()=>{cfg.diffs[curTopic().id]=+b.dataset.d;saveCfg();S.tap();renderTopics()});
$('startBtn').onclick=()=>{S.tap();start()};
function go(id){panel(id);({scrHome:paintAudio,stepSubj:renderSubjects,stepTopic:renderTopics})[id]();const sc=$(id).querySelector('.scroll');if(sc)sc.scrollTop=0}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b){unlock();S.tap();go(b.dataset.go)}});

/* ======================= PORTAL EMBED (edugames contract v1) =======================
   Opened by the portal as ?topic=<id>&level=1-3&mode=o10|o20|t60|t90|o<n>|t<n>&regions=eu,as&lock=1 → settings come from the portal and the run starts at once.
   lock=1 (class mode): no replay, no topic menu. Posts edu-ready on load, edu-progress after every answer, edu-result at the end. */
const EMBED=(()=>{const p=new URLSearchParams(location.search);if(!p.get('topic'))return null;
  return{topic:p.get('topic'),level:+p.get('level')||0,mode:p.get('mode')||'',lock:p.get('lock')==='1'}})();
/* continents from the portal (class mode); no regions param = all continents */
const EMBED_REG=EMBED?(EduQ.parseRegions?EduQ.parseRegions(new URLSearchParams(location.search).get('regions'))||EduQ.REGIONS.map(r=>r.id):null):null;
let lastAns=null;/* the last answer rides on the next edu-progress, for the portal's mistakes report */
const toParent=m=>{try{if(m&&m.type==='edu-progress'&&lastAns){m.last=lastAns;lastAns=null}if(window.parent!==window)window.parent.postMessage(m,'*')}catch(e){}};
function applyEmbed(){if(!EMBED)return false;const s=SUBJECTS.find(s=>s.topics.some(t=>t.id===EMBED.topic));if(!s)return false;
  ov={subject:s.id,topic:EMBED.topic,level:[1,2,3].includes(EMBED.level)?EMBED.level:0,mode:parseMode(EMBED.mode)?parseMode(EMBED.mode).id:'o10'};
  if(EMBED.lock){$('againBtn').hidden=true;$('menuBtn').hidden=true;$('overActions').prepend(el('p','sent',L('Result sent to your teacher.')))}
  return true}

/* ======================= LOOP ======================= */
let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(state!=='play'&&state!=='over')return;
  if(state==='play'){
    gameT+=dt;
    for(let i=timers.length-1;i>=0;i--)if(timers[i].t<=gameT){const f=timers[i].fn;timers.splice(i,1);f()}
    const m=MODE();
    if(m.kind==='t'){const before=Math.ceil(timeLeft);timeLeft-=dt;if(Math.ceil(timeLeft)!==before)paintHud();if(timeLeft<=0){end('time');return}}
    /* customers arrive */
    const lv=lvl(),active=customers.filter(c=>c.st==='walkin'||c.st==='wait');spawnT-=dt;
    const room=m.kind!=='o'||spawned<m.n;
    if(room&&active.length<lv.max){if(active.length<lv.min&&lv.max>1)spawnT=Math.min(spawnT,1.4);if(spawnT<=0&&freeSlot()>=0){spawn();spawnT=rnd(...lv.gap);if(lv.max===1)spawnT=99}}
    /* patience: the customer you are cooking for waits happily */
    customers.forEach(c=>{if(c.st!=='wait'||c.done.every(Boolean))return;if(cur&&cur.c===c)return;c.p-=dt/c.dur;paintBar(c);
      if(c.p<.25&&!reduced){c.tilt=Math.sin(gameT*14)*2.5}else c.tilt=0;
      if(c.p<=0)leave(c,false)})}
  for(let i=tweens.length-1;i>=0;i--){const w=tweens[i];w.t+=dt;const k=Math.min(1,w.t/w.dur);w.step(k);if(k>=1){tweens.splice(i,1);w.done&&w.done()}}
  /* walking */
  customers.forEach(c=>{if(c.st==='gone')return;
    if(c.moving){const d=c.tx-c.x,sp=(reduced?4000:540)*dt;if(Math.abs(d)<=sp){c.x=c.tx;c.moving=false;c.phase=0;
        if(c.st==='walkin'){c.st='wait';paintShelf()}else if(c.st==='leaving'){c.st='gone';c.g.remove()}}
      else{c.x+=Math.sign(d)*sp;c.phase+=dt*11}}
    if(c.st!=='gone')placeCustomer(c)});
  if(customers.length>8)customers=customers.filter(c=>c.st!=='gone')}

/* ======================= BOOT ======================= */
translateStatic();paintAudio();renderShelf();layout();panel('scrHome');go('scrHome');requestAnimationFrame(frame);
if(applyEmbed())start();toParent({type:'edu-ready',game:GAME});
