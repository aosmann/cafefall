'use strict';
/* Cafefall — a 3D café quiz for the EduGames portal. Customers walk up to the counter and order; every dish is a
   question. Right: the chef cooks it and serves it, coins and a tip. Wrong: it burns, and a new question comes up.
   Art: KayKit Restaurant Bits + Adventurers (CC0, Kay Lousberg). Rendering: three.js r170. */
const $=id=>document.getElementById(id);
const {SUBJECTS,SICON,SHUE,DIFFNAME,stream}=EduQ;
const GAME='cafefall';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const lerp=(a,b,t)=>a+(b-a)*t;
const easeInOut=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const RM=matchMedia('(prefers-reduced-motion: reduce)');let reduced=RM.matches;
try{RM.addEventListener('change',e=>{reduced=e.matches})}catch(e){}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}

/* ======================= LANGUAGE =======================
   questions.js switches the shared words (Play, Difficulty, Resume…) to Romanian by itself.
   The café's own words live here so questions.js stays byte-identical to the other games. */
const LANG=(EduQ.getLang&&EduQ.getLang())||'en';
const RO={'tips':'bacșiș','Cook it right':'Gătește corect','Answer right. Serve it hot.':'Răspunde corect. Servește cald.','3D art: KayKit by Kay Lousberg (CC0)':'Grafică 3D: KayKit de Kay Lousberg (CC0)',
 'Open the café':'Deschide cafeneaua','customers served':'clienți serviți','Walked out':'Au plecat','Burger':'Burger','Veggie burger':'Burger vegetarian','Stew':'Tocăniță','Chicken dinner':'Pulpă de pui',
 'Orders':'Comenzi','Order':'Comanda','Café closed':'Cafeneaua s-a închis',"Time's up":'Timpul a expirat','Run ended':'Jocul s-a terminat','Café open!':'Cafeneaua e deschisă!',
 'Tap an order to start cooking':'Atinge o comandă ca să începi să gătești','Yum!':'Delicios!','Burnt! Here is another one.':'Ars! Iată altă întrebare.','Cooked!':'Gata!',
 '3 in a row! Tips ×2':'3 la rând! Bacșiș ×2','5 in a row! Tips ×3':'5 la rând! Bacșiș ×3','Streak lost':'Serie pierdută','They left!':'A plecat!',
 'Every answer right. Five-star café!':'Toate răspunsurile corecte. Cafenea de cinci stele!','New best!':'Record nou!','Best':'Record','coins':'monede','Step 1 of 2':'Pasul 1 din 2','Step 2 of 2':'Pasul 2 din 2',
 'Worth another look':'Merită să le mai vezi','Play for':'Joacă','Seconds':'Secunde','Coins':'Monede','Answers right':'Răspunsuri corecte','Best streak':'Cea mai lungă serie','Run length':'Durata','Custom':'Personalizat',
 'Result sent to your teacher.':'Rezultatul a fost trimis profesorului.','Setting up the kitchen…':'Pregătim bucătăria…','Knight':'Cavalerul','Mage':'Magul','Barbarian':'Barbarul','Ranger':'Arcașul','waiting':'așteaptă','served':'servit'};
const L=s=>LANG==='ro'&&RO[s]!=null?RO[s]:s;
const DIFFN=d=>DIFFNAME[d]||['','Easy','Medium','Hard'][d];
const modeName=m=>m.kind==='o'?(LANG==='ro'?`${m.n} comenzi`:`${m.n} orders`):`${m.n} sec`;
function translateStatic(){if(LANG!=='ro')return;
  [$('app'),$('sheet'),$('loading')].forEach(root=>{const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
    while(n=w.nextNode()){const p=n.parentElement;if(!p||p.closest('[data-noi18n],svg'))continue;const k=n.nodeValue.trim();if(k&&RO[k]!=null)n.nodeValue=n.nodeValue.replace(k,RO[k])}})}

/* ======================= DATA ======================= */
/* each dish: where it cooks, the model on the stove raw / cooked / burnt, and the plate that is served */
const DISHES=[
 {id:'burger',name:'Burger',station:'pan',raw:'food_ingredient_burger_uncooked',cooked:'food_ingredient_burger_cooked',burnt:'food_ingredient_burger_trash',serve:'food_burger',plate:true},
 {id:'stew',name:'Stew',station:'pot',raw:'pot_A',cooked:'pot_A_stew',burnt:'pot_A_stew',burntTint:true,serve:'stew_bowl'},
 {id:'chicken',name:'Chicken dinner',station:'pan',raw:'food_ingredient_ham',cooked:'food_ingredient_ham_cooked',burnt:'food_ingredient_ham_trash',serve:'food_dinner'},
 {id:'veggie',name:'Veggie burger',station:'pan',raw:'food_ingredient_vegetableburger_uncooked',cooked:'food_ingredient_vegetableburger_cooked',burnt:'food_ingredient_burger_trash',serve:'food_vegetableburger',plate:true}];
const DISH=id=>DISHES.find(d=>d.id===id);
const CUSTOMERS=[{id:'Knight',name:'Knight'},{id:'Mage',name:'Mage'},{id:'Barbarian',name:'Barbarian'},{id:'Rogue_Hooded',name:'Ranger'}];
/* difficulty: how many wait at once, patience (seconds), dishes on the menu, two-dish orders, moving queue */
const LV={1:{max:1,min:1,pat:45,dishes:3,two:false,gap:[.6,.9]},
          2:{max:3,min:2,pat:34,dishes:4,two:false,gap:[4,7]},
          3:{max:3,min:2,pat:24,dishes:4,two:true,gap:[2.6,4],move:true}};
const SLOT_Z=[-2,.3,2.6];          /* where customers stand along the counter, front of the queue first */
const STAND_X=3.75,SERVE_X=1.85,COUNTER_TOP=1.0;
const ENTRY=[4.4,0,8.5];
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
  bell(){[1568,2093,3136].forEach((f,i)=>tone(f,1.1-i*.25,{vol:.16-i*.04}));tone(1568,.9,{vol:.1,at:.16});tone(2093,.7,{vol:.07,at:.16})},
  sizzle(){noise(.8,{f:5200,q:.7,vol:.15,type:'highpass'});for(let i=0;i<7;i++)noise(.03,{f:3000+Math.random()*3000,q:3,vol:.11,at:Math.random()*.6})},
  coins(n=2){for(let i=0;i<n;i++){tone(1318,.09,{type:'square',vol:.06,at:i*.09});tone(1976,.2,{type:'square',vol:.06,at:i*.09+.05})}},
  burn(){noise(.9,{f:900,q:.6,vol:.26,type:'lowpass',to:200});tone(220,.5,{type:'sawtooth',vol:.05,to:90})},
  frown(){tone(440,.28,{type:'triangle',vol:.13,to:330});tone(330,.4,{type:'triangle',vol:.13,at:.22,to:220})},
  yum(){tone(784,.1,{type:'triangle',vol:.13});tone(1047,.16,{type:'triangle',vol:.13,at:.08})},
  streak(){[784,988,1175,1568].forEach((f,i)=>tone(f,.18,{type:'triangle',vol:.13,at:i*.07}))},
  plate(){tone(2200,.12,{type:'sine',vol:.08});tone(3300,.08,{type:'sine',vol:.05,at:.02})}};
function paintAudio(){['mute','sndT','sndT2'].forEach(id=>$(id).setAttribute('aria-pressed',A.on));if(A.master)A.master.gain.value=A.on?.8:0}
function toggleAudio(){A.on=!A.on;try{localStorage.setItem('cafefall-audio',JSON.stringify({on:A.on}))}catch(e){}unlock();paintAudio();if(A.on)S.tap()}
['mute','sndT','sndT2'].forEach(id=>$(id).onclick=e=>{e.stopPropagation();toggleAudio()});

/* ======================= 3D SCENE ======================= */
const canvas=$('gl');
const R=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
R.setPixelRatio(Math.min(devicePixelRatio||1,1.75));R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;
R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#f3d9b5');
const cam=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);
const CAM_DIR=new THREE.Vector3(-10,12.5,8.5).normalize();
const CAM_PORTRAIT=new THREE.Vector3(10,11.5,10).normalize(),CAM_LAND=new THREE.Vector3(10,11.5,10).normalize();
scene.add(new THREE.HemisphereLight('#fff6e8','#b98a5a',1.35));
const sun=new THREE.DirectionalLight('#fff1d6',2.3);sun.position.set(7,13,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:1,far:40});sun.shadow.bias=-.0005;sun.shadow.normalBias=.02;scene.add(sun);
const loader=new GLTFLoader();
let KITMAT=null;const kit={};
const loadGLTF=u=>new Promise((res,rej)=>loader.load(u,res,undefined,rej));
async function loadKit(names,onStep){
  for(const n of names){const g=await loadGLTF(`models/kit/${n}.gltf`);
    g.scene.traverse(m=>{if(m.isMesh){if(!KITMAT){KITMAT=m.material;KITMAT.side=THREE.FrontSide}else{const old=m.material;m.material=KITMAT;if(old!==KITMAT){if(old.map&&old.map!==KITMAT.map)old.map.dispose();old.dispose()}}m.castShadow=true;m.receiveShadow=true}});
    kit[n]=g.scene;onStep&&onStep()}}
const BURNT_MAT=()=>{const m=KITMAT.clone();m.color=new THREE.Color('#2a221e');return m};
function inst(n,x=0,y=0,z=0,ry=0,parent=scene){const o=kit[n].clone(true);o.position.set(x,y,z);o.rotation.y=ry;parent.add(o);return o}
const chars={};let CLIPS=[];
async function loadChars(onStep){
  const chef=await loadGLTF('models/chars/Chef.glb');CLIPS=chef.animations;chars.Chef=chef.scene;onStep&&onStep();
  for(const c of CUSTOMERS){const g=await loadGLTF(`models/chars/${c.id}.glb`);chars[c.id]=g.scene;onStep&&onStep()}
  Object.values(chars).forEach(s=>s.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=false}}))}
/* a character with its own animation mixer; clips come from the chef file (all KayKit characters share one rig) */
class Actor{
  constructor(id){this.root=new THREE.Group();this.model=SkeletonUtils.clone(chars[id]);this.root.add(this.model);scene.add(this.root);
    this.mixer=new THREE.AnimationMixer(this.model);this.acts={};this.cur=null;this.target=null;this.speed=4;this.face=null;this.onArrive=null}
  act(name){if(!this.acts[name]){const c=CLIPS.find(c=>c.name===name);if(!c)return null;this.acts[name]=this.mixer.clipAction(c)}return this.acts[name]}
  play(name,{fade=.2,once=false,then=null}={}){const a=this.act(name);if(!a)return;
    if(this.cur===a&&!once)return;a.reset();a.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat);a.clampWhenFinished=once;a.enabled=true;a.setEffectiveWeight(1);
    if(this.cur&&this.cur!==a)this.cur.crossFadeTo(a,fade,false);a.play();this.cur=a;
    if(once&&then){const f=e=>{if(e.action===a){this.mixer.removeEventListener('finished',f);then()}};this.mixer.addEventListener('finished',f)}}
  walkTo(x,z,face,onArrive){this.target=new THREE.Vector3(x,0,z);this.face=face;this.onArrive=onArrive||null;
    if(reduced){this.root.position.copy(this.target);this.arrive();return}this.play('Walking_A')}
  arrive(){this.target=null;if(this.face!=null)this.root.rotation.y=this.face;this.play('Idle');const f=this.onArrive;this.onArrive=null;f&&f()}
  update(dt){this.mixer.update(dt);if(!this.target)return;const p=this.root.position,d=this.target.clone().sub(p);d.y=0;const L=d.length(),st=this.speed*dt;
    if(L<=st){p.copy(this.target);this.arrive();return}
    d.multiplyScalar(1/L);p.addScaledVector(d,st);const want=Math.atan2(d.x,d.z);let dr=want-this.root.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));this.root.rotation.y+=dr*Math.min(1,dt*12)}
  remove(){scene.remove(this.root);this.mixer.stopAllAction()}}

/* kitchen layout */
function buildKitchen(){
  for(const x of [-4,0,4])for(const z of [-4,0,4])inst('floor_kitchen',x,-.5,z);
  inst('floor_kitchen',4,-.5,8);
  for(const x of [-4,0,4])inst(x===0?'wall_window_open':'wall_decorated',x,0,-6.25);
  for(const z of [-4,0,4])inst('wall',-6.25,0,z,Math.PI/2);
  /* the counter with the stove at the far end */
  for(const z of [-4,-2,0,2])inst('kitchencounter_straight_A',1.2,0,z,Math.PI/2);
  inst('stove_multi_countertop',1.2,1,-4,Math.PI/2);
  inst('cuttingboard',.9,1,-2.9,Math.PI/2);inst('food_ingredient_tomato_slices',.9,1.08,-2.9);
  /* the kitchen line along the back walls */
  inst('fridge_A_decorated',-4.6,0,-5.1);inst('kitchencounter_straight_A_decorated',-2.4,0,-5.1);
  inst('kitchencounter_sink_backsplash',-.4,0,-5.1);inst('stove_multi_decorated',1.6,0,-5.1);
  inst('kitchencounter_straight_A',-5.1,0,-1.6,Math.PI/2);inst('dishrack_plates',-5.1,1,-1.6,Math.PI/2);
  inst('shelf_papertowel_decorated',-5.4,2,1.6,Math.PI/2);
  inst('crate_tomatoes',-4.7,0,3.2);inst('crate_carrots',-4.7,0,5);inst('crate_buns',-2.8,0,5);
  /* a table in the dining corner */
  inst('table_round_A_decorated',6.6,0,-4.2);inst('chair_A',6.6,0,-2.9,Math.PI);
  inst('menu',1.25,1,3.4,Math.PI/2)}
/* the two cooking spots on the stove and their props */
const PAN_POS=new THREE.Vector3(1.0,1.27,-4.35),POT_POS=new THREE.Vector3(1.4,1.27,-3.55);
let panObj=null,stationItem=null,flames=null;
function buildStation(){
  panObj=inst('pan_A',PAN_POS.x,PAN_POS.y,PAN_POS.z,Math.PI/2);
  flames=new THREE.Group();const fm=new THREE.MeshBasicMaterial({color:'#ff8a2a',transparent:true,opacity:.9});
  for(let i=0;i<6;i++){const f=new THREE.Mesh(new THREE.ConeGeometry(.07,.22,6),fm);const a=i/6*Math.PI*2;f.position.set(Math.cos(a)*.28,0,Math.sin(a)*.28);flames.add(f)}
  flames.visible=false;scene.add(flames)}
function setStation(dish,state){
  if(stationItem){scene.remove(stationItem);stationItem=null}
  if(!dish){flames.visible=false;return}
  const n=state==='raw'?dish.raw:state==='cooked'?dish.cooked:dish.burnt;const p=dish.station==='pan'?PAN_POS:POT_POS;
  stationItem=inst(n,p.x,p.y+(dish.station==='pan'?.08:0),p.z);
  if(state==='burnt'&&dish.burntTint){const m=BURNT_MAT();stationItem.traverse(o=>{if(o.isMesh)o.material=m})}
  flames.position.set(p.x,p.y-.04,p.z);flames.visible=state!=='raw'||true}

/* soft round particles for steam and smoke */
const puffTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,2,32,32,30);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
const puffs=[];
function puff(pos,color,n,{up=1.6,spread=.25,size=.7,life=1.2}={}){if(reduced)n=Math.ceil(n/3);
  for(let i=0;i<n;i++){const m=new THREE.SpriteMaterial({map:puffTex,color,transparent:true,opacity:0,depthWrite:false});const s=new THREE.Sprite(m);
    s.position.set(pos.x+rnd(-spread,spread),pos.y+rnd(0,.2),pos.z+rnd(-spread,spread));s.scale.setScalar(size*.5);scene.add(s);
    puffs.push({s,t:-i*.06,life,up:up*rnd(.7,1.2),size,dx:rnd(-.3,.3),dz:rnd(-.3,.3)})}}
function updatePuffs(dt){for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];p.t+=dt;if(p.t<0)continue;const k=p.t/p.life;
  if(k>=1){scene.remove(p.s);p.s.material.dispose();puffs.splice(i,1);continue}
  p.s.position.y+=p.up*dt;p.s.position.x+=p.dx*dt;p.s.position.z+=p.dz*dt;p.s.scale.setScalar(p.size*(.5+k));p.s.material.opacity=Math.sin(k*Math.PI)*.8}}

/* dish pictures for the tickets and the card, rendered once from the real models */
const thumbs={};
function makeThumbs(){
  const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setSize(128,128);r.setPixelRatio(1);r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;
  const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#fff6e8','#b98a5a',1.6));const dl=new THREE.DirectionalLight('#fff',2);dl.position.set(3,6,4);sc.add(dl);
  const c=new THREE.OrthographicCamera(-1,1,1,-1,.1,50);
  for(const d of DISHES){const o=kit[d.serve].clone(true);const g=new THREE.Group();g.add(o);
    if(d.plate){const p=kit.plate.clone(true);g.add(p);o.position.y=.08}
    sc.add(g);const b=new THREE.Box3().setFromObject(g),ctr=b.getCenter(new THREE.Vector3()),sz=b.getSize(new THREE.Vector3()).length()/2*1.05;
    c.left=-sz;c.right=sz;c.top=sz;c.bottom=-sz;c.updateProjectionMatrix();c.position.copy(ctr).add(new THREE.Vector3(3,4,3).normalize().multiplyScalar(10));c.lookAt(ctr);
    r.render(sc,c);thumbs[d.id]=r.domElement.toDataURL();sc.remove(g)}
  r.dispose();try{r.forceContextLoss()}catch(e){}}

/* camera: fits the counter, the stove and the queue into the space the HUD and the card leave free */
const KEY_PTS=[[1.6,1.4,-5],[-1,3.2,-4.4],[-1,3.2,1],[.2,0,3.6],[5.1,0,3.9],[5.1,4.6,-3],[5.1,4.6,3.6],[3,0,-3],[2.6,4.6,3.8],[5.7,2,-3.3]].map(p=>new THREE.Vector3(...p));
const view={s:.02,ts:.02,dx:0,dy:0,tdx:0,tdy:0,center:new THREE.Vector3(1.8,1.2,-.4)};
function fitCamera(instant){
  const W=innerWidth,H=innerHeight;if(!W||!H)return;R.setSize(W,H,false);
  CAM_DIR.copy(W<H*1.05?CAM_PORTRAIT:CAM_LAND);
  const land=W>H*1.3,cardOn=!$('card').classList.contains('off');
  const topH=($('top').classList.contains('off')?0:$('top').getBoundingClientRect().height)+8;
  let left=0,bottom=0;const cr=$('card').getBoundingClientRect();
  if(cardOn){if(land)left=cr.right+6;else bottom=H-cr.top+6}
  const aw=Math.max(80,W-left-12),ah=Math.max(80,H-topH-bottom-12);
  /* project the key points in camera space */
  cam.position.copy(view.center).addScaledVector(CAM_DIR,30);cam.lookAt(view.center);cam.updateMatrixWorld();
  const inv=cam.matrixWorldInverse;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  KEY_PTS.forEach(p=>{const q=p.clone().applyMatrix4(inv);x0=Math.min(x0,q.x);x1=Math.max(x1,q.x);y0=Math.min(y0,q.y);y1=Math.max(y1,q.y)});
  const s=Math.max((x1-x0)/aw,(y1-y0)/ah)*1.08;
  /* where the middle of the key points must land on screen */
  const midX=(x0+x1)/2,midY=(y0+y1)/2;const cx=left+6+aw/2,cy=topH+6+ah/2;
  view.ts=s;view.tdx=(cx-W/2)-midX/s;view.tdy=(cy-H/2)+midY/s;
  if(instant||reduced){view.s=view.ts;view.dx=view.tdx;view.dy=view.tdy}}
function applyCamera(dt){const k=1-Math.exp(-dt*6);view.s=lerp(view.s,view.ts,k);view.dx=lerp(view.dx,view.tdx,k);view.dy=lerp(view.dy,view.tdy,k);
  const W=innerWidth,H=innerHeight,s=view.s;cam.left=-W/2*s;cam.right=W/2*s;cam.top=H/2*s;cam.bottom=-H/2*s;
  cam.position.copy(view.center).addScaledVector(CAM_DIR,30);cam.lookAt(view.center);
  /* shift the picture by (dx,dy) pixels */
  cam.left-=view.dx*s;cam.right-=view.dx*s;cam.top+=view.dy*s;cam.bottom+=view.dy*s;cam.updateProjectionMatrix()}
const _v=new THREE.Vector3();
function toScreen(v){_v.copy(v).project(cam);return{x:(_v.x+1)/2*innerWidth,y:(1-_v.y)/2*innerHeight}}
addEventListener('resize',()=>fitCamera(true));

/* ======================= GAME STATE ======================= */
let state='loading',gameT=0,customers=[],cur=null,Q=null,answered=false,next=null,seen=new Set(),chef=null;
let coins=0,served=0,finished=0,walkouts=0,right=0,asked=0,streak=0,bestStreak=0,missed=[],spawned=0,spawnT=0,timeLeft=0,runStart=0,hintShown=false;
const timers=[];/* game-time timers: they wait while the game is paused */
function later(sec,fn){timers.push({t:gameT+sec,fn})}
const tweens=[];function tween(dur,step,done){tweens.push({t:0,dur,step,done})}
const lvl=()=>LV[DIFF()]||LV[2];
const menuDishes=()=>DISHES.slice(0,lvl().dishes);
const qid=q=>q.q+'|'+q.answer+'|'+(q.img||'');
function nextQ(){let q,d=0;do{q=next();d++}while(seen.has(qid(q))&&d<40);seen.add(qid(q));if(seen.size>60)seen=new Set();return q}

function paintHud(){const m=MODE();$('coins').textContent=coins;
  if(m.kind==='o'){$('clock').textContent=`${L('Order')} ${Math.min(finished+1,m.n)}/${m.n}`;$('clockChip').classList.remove('low')}
  else{const s=Math.max(0,Math.ceil(timeLeft));$('clock').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;$('clockChip').classList.toggle('low',s<=10)}
  const mult=streak>=5?3:streak>=3?2:1;$('multN').textContent=mult;$('multChip').classList.toggle('on',mult>1)}
function show(id,on){$(id).classList.toggle('off',!on)}
function banner(big,small,kind){const b=$('banner');b.querySelector('span').textContent=big;b.querySelector('small').textContent=small||'';b.className='';if(kind)b.classList.add(kind);void b.offsetWidth;b.classList.add('show')}
function hint(text){const h=$('hint');if(!text){show('hint',false);return}h.textContent=text;show('hint',true)}
function popText(x,y,text){const d=el('div','pop',text);d.style.left=x+'px';d.style.top=y+'px';document.body.append(d);setTimeout(()=>d.remove(),1400)}
function bumpCoins(){const c=$('coinChip');c.classList.remove('bump');void c.offsetWidth;c.classList.add('bump');paintHud()}
function flyCoins(x,y,n){if(reduced){bumpCoins();return}const r=$('coinChip').getBoundingClientRect(),to={x:r.left+14,y:r.top+r.height/2-11};
  for(let i=0;i<Math.min(n,6);i++){const d=el('i','fly');d.style.transform=`translate(${x+rnd(-24,24)}px,${y+rnd(-24,8)}px)`;document.body.append(d);
    setTimeout(()=>{d.style.transform=`translate(${to.x}px,${to.y}px) scale(.8)`;d.style.opacity='.5'},40+i*70);setTimeout(()=>{d.remove();if(i===0)bumpCoins()},800+i*70)}}

/* ---------- tickets and head markers ---------- */
function ticketOf(c){
  const t=el('button','tk new');t.type='button';t.setAttribute('aria-label',`${L(c.name)}: ${c.order.map(o=>L(DISH(o).name)).join(', ')}`);
  const ds=el('span','dishes');c.order.forEach(o=>{const im=el('img');im.src=thumbs[o];im.alt='';ds.append(im)});
  const tx=el('span','tx');const nm=el('b',null,c.order.map(o=>L(DISH(o).name)).join(' + '));const sm=el('small',null,L(c.name));const bar=el('span','bar');const bi=el('i');bar.append(bi);tx.append(nm,sm,bar);
  t.append(ds,tx);t.onclick=()=>tapCustomer(c);c.tk=t;c.tkBar=bi;c.tkImgs=[...ds.children];
  const mk=el('div','mk');const mi=el('img');mi.src=thumbs[c.order[0]];mi.alt='';mk.append(mi);$('marks').append(mk);c.mk=mk;c.mkImg=mi;
  return t}
function paintTickets(){const box=$('tickets');const list=customers.filter(c=>c.st==='wait'||c.st==='walkin').sort((a,b)=>a.slot-b.slot);
  [...box.children].forEach(t=>{if(!list.some(c=>c.tk===t))t.remove()});list.forEach(c=>{if(c.tk.parentNode!==box||box.children[list.indexOf(c)]!==c.tk)box.insertBefore(c.tk,box.children[list.indexOf(c)]||null);
    c.tk.classList.toggle('serving',!!(cur&&cur.c===c));c.tkImgs.forEach((im,i)=>im.classList.toggle('done',c.done[i]));c.tk.style.opacity=c.st==='walkin'?.6:1})}
function paintBar(c){const p=clamp(c.p,0,1);c.tkBar.style.width=(p*100).toFixed(1)+'%';c.tkBar.style.background=p>.5?'var(--good)':p>.25?'#f2a516':'var(--bad)'}

/* ---------- customers ---------- */
let uid=0;
function freeSlot(){const used=new Set(customers.filter(c=>c.st==='walkin'||c.st==='wait').map(c=>c.slot));for(let i=0;i<SLOT_Z.length;i++)if(!used.has(i))return i;return -1}
function spawn(){
  const lv=lvl(),slot=freeSlot();if(slot<0)return;
  const inUse=new Set(customers.filter(c=>c.st!=='gone').map(c=>c.kind));const pool=CUSTOMERS.filter(a=>!inUse.has(a.id));const k=pick(pool.length?pool:CUSTOMERS);
  const ids=menuDishes().map(d=>d.id);let order=[pick(ids)];if(lv.two){let b;do{b=pick(ids)}while(b===order[0]);order.push(b)}
  const a=new Actor(k.id);a.root.position.set(...ENTRY);a.root.rotation.y=Math.PI;
  const c={id:++uid,kind:k.id,name:k.name,actor:a,order,done:order.map(()=>false),plates:[],slot,st:'walkin',p:1,dur:lv.pat*(lv.two?1.45:1)};
  customers.push(c);spawned++;$('tickets').append(ticketOf(c));paintBar(c);
  a.walkTo(STAND_X,SLOT_Z[slot],-Math.PI/2,()=>{if(c.st==='walkin'){c.st='wait';paintTickets()}});
  paintTickets();S.bell()}
function leave(c,happy){
  if(c.st==='leaving'||c.st==='gone')return;
  if(cur&&cur.c===c)closeCard();
  c.st='leaving';finished++;c.tk.remove();
  c.mk.classList.add('face');c.mk.innerHTML='';
  if(happy){served++;c.mk.textContent='♥';S.yum();c.actor.play('Cheer',{once:true})}
  else{walkouts++;c.mk.classList.add('sad');c.mk.textContent='…';S.frown();const s=toScreen(c.actor.root.position.clone().setY(4.3));popText(s.x,s.y,L('They left!'));c.actor.play('Hit_B',{once:true});
    if(streak>0){if(streak>=3)banner(L('Streak lost'),'','bad');streak=0}}
  /* happy customers take their food with them */
  if(happy){const carry=c.plates.pop();if(carry){carry.position.set(0,1.25,.55);carry.rotation.set(0,0,0);c.actor.root.add(carry)}}
  later(reduced?.3:1.1,()=>{c.plates.forEach(p=>scene.remove(p));c.plates=[];c.slot=-1;c.actor.walkTo(ENTRY[0],ENTRY[2]+1,0,()=>{c.st='gone';c.actor.remove();c.mk.remove()})});
  if(lvl().move){later(reduced?.3:1.2,()=>{const q=customers.filter(o=>o.st==='wait'||o.st==='walkin').sort((a,b)=>a.slot-b.slot);
    q.forEach((o,i)=>{if(o.slot!==i){o.slot=i;o.plates.forEach(p=>p.position.z=SLOT_Z[i]);o.actor.walkTo(STAND_X,SLOT_Z[i],-Math.PI/2,()=>{if(o.st==='walkin'){o.st='wait'}paintTickets()})}});paintTickets()})}
  if(lvl().max===1)spawnT=(reduced?.4:1.4)+rnd(...lvl().gap);
  paintHud();paintTickets();checkEnd()}

/* ---------- serving ---------- */
function tapCustomer(c){if(state!=='play'||cur||c.st!=='wait')return;unlock();const i=c.done.indexOf(false);if(i>=0)serve(c,i)}
function serve(c,idx){
  const dish=DISH(c.order[idx]);cur={c,idx,dish};S.tap();hint('');hintShown=true;
  $('cDish').src=thumbs[dish.id];$('cName').textContent=L(dish.name);
  setStation(dish,'raw');chef.walkTo(-.35,dish.station==='pan'?-4.3:-3.6,Math.PI/2,()=>{if(cur&&cur.dish===dish)chef.play('Interact')});
  askQ();show('card',true);paintTickets();fitCamera()}
function askQ(){
  Q=nextQ();answered=false;const qt=$('qtext'),im=$('qimg');qt.textContent='';if(Q.code)qt.append(el('span','code',Q.code));qt.append(Q.q);
  if(Q.img){im.src=Q.img;im.hidden=false}else{im.hidden=true;im.removeAttribute('src')}
  $('qtag').textContent=Q.tag||'';$('verdict').textContent='';$('verdict').className='';
  $('ans').classList.remove('locked');[...$('ans').querySelectorAll('button')].forEach((b,i)=>{b.className='';b.querySelector('span').textContent=Q.ans[i]})}
function closeCard(){show('card',false);cur=null;Q=null;paintTickets();fitCamera()}
function answer(i){
  if(state!=='play'||!cur||answered||!Q)return;answered=true;asked++;
  const ok=i===Q.correct,c=cur.c,idx=cur.idx,dish=cur.dish;$('ans').classList.add('locked');
  [...$('ans').querySelectorAll('button')].forEach((b,j)=>{if(j===Q.correct)b.classList.add('right');else if(j===i)b.classList.add('wrong');else b.classList.add('dim')});
  if(ok){
    right++;streak++;bestStreak=Math.max(bestStreak,streak);
    lastAns={q:Q.img?'This flag':Q.q,img:Q.img||null,answer:Q.answer,picked:Q.answer,ok:1,tag:Q.tag||null};
    $('verdict').textContent=L('Cooked!');$('verdict').className='good';
    if(streak===3||streak===5){banner(L(streak===3?'3 in a row! Tips ×2':'5 in a row! Tips ×3'),'','gold');S.streak()}
    c.done[idx]=true;cook(c,idx,dish);
    /* two-dish orders: go straight on to the next dish, no second tap */
    const more=c.done.indexOf(false);
    if(more>=0)later(reduced?.4:.75,()=>{if(state==='play'&&cur&&cur.c===c&&c.st==='wait')serve(c,more);else if(cur&&cur.c===c)closeCard()});
    else later(reduced?.35:.6,closeCard)}
  else{
    if(streak>=3)banner(L('Streak lost'),'','bad');streak=0;
    missed.push({q:Q.img?'This flag':Q.q,img:Q.img,answer:Q.answer,picked:Q.ans[i]});
    lastAns=Object.assign({},missed[missed.length-1],{ok:0,tag:Q.tag||null});
    $('verdict').textContent=L('Burnt! Here is another one.');$('verdict').className='bad';
    burn(dish);c.p-=.15;paintBar(c);
    later(1.6,()=>{if(!cur||cur.c!==c||state!=='play')return;if(c.p<=0){setStation(null);leave(c,false);return}setStation(dish,'raw');chef.play('Interact');askQ()})}
  paintHud();
  toParent({type:'edu-progress',game:GAME,score:coins,right,asked,served,coins})}
function cook(c,idx,dish){
  setStation(dish,'cooked');S.sizzle();chef.play('Cheer',{once:true,then:()=>chef.play('Idle')});
  const sp=(dish.station==='pan'?PAN_POS:POT_POS).clone();puff(sp.clone().setY(sp.y+.2),'#ffffff',8,{up:1.4,size:.8});
  const cookT=reduced?.15:.6;
  later(cookT,()=>{
    setStation(null);
    /* the plate flies from the stove to the counter in front of the customer */
    const g=new THREE.Group();const food=kit[dish.serve].clone(true);g.add(food);if(dish.plate){g.add(kit.plate.clone(true));food.position.y=.08}
    const from=sp.clone().setY(sp.y+.25),to=new THREE.Vector3(SERVE_X,COUNTER_TOP,SLOT_Z[Math.max(0,c.slot)]+(c.order.length>1?(idx?.45:-.45):0));
    g.position.copy(from);scene.add(g);c.plates.push(g);
    const done=()=>{g.position.copy(to);S.plate();coins+=PRICE;const s=toScreen(to);flyCoins(s.x,s.y,2);S.coins(1);popText(s.x,s.y-30,`+${PRICE}`);
      if(c.done.every(Boolean)&&!c.tipped){c.tipped=true;const mult=streak>=5?3:streak>=3?2:1,tip=(2+Math.round(clamp(c.p,0,1)*6))*mult;coins+=tip;
        later(.3,()=>{const h=toScreen(c.actor.root.position.clone().setY(3.4));flyCoins(h.x,h.y,tip>6?5:3);S.coins(3);popText(h.x,h.y-40,`${L('Yum!')} +${tip}${mult>1?` (×${mult})`:''}`)});leave(c,true)}
      else if(c.st==='wait'){c.mkImg.src=thumbs[c.order[c.done.indexOf(false)]]||c.mkImg.src}
      paintHud();paintTickets()};
    if(reduced){done();return}
    chef.walkTo(-.35,clamp(to.z,-3.6,3),Math.PI/2,()=>chef.play('Use_Item',{once:true,then:()=>chef.play('Idle')}));
    tween(.55,t=>{const e=easeInOut(t);g.position.lerpVectors(from,to,e);g.position.y+=Math.sin(t*Math.PI)*1.6;g.rotation.y=t*Math.PI*2},done)})}
function burn(dish){
  setStation(dish,'burnt');S.burn();chef.play('Hit_A',{once:true,then:()=>chef.play('Interact')});
  const sp=(dish.station==='pan'?PAN_POS:POT_POS).clone();puff(sp.clone().setY(sp.y+.2),'#4a4440',12,{up:1.8,size:1,life:1.5})}
$('ans').querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>answer(i)));
/* tapping a customer in the kitchen works like tapping the ticket */
canvas.addEventListener('pointerdown',e=>{if(state!=='play'||cur)return;let best=null,bd=70;
  customers.forEach(c=>{if(c.st!=='wait')return;const s=toScreen(c.actor.root.position.clone().setY(1.6));const d=Math.hypot(s.x-e.clientX,s.y-e.clientY);if(d<bd){bd=d;best=c}});
  if(best)tapCustomer(best)});

/* ---------- run ---------- */
const SCREENS=['scrHome','stepSubj','stepTopic','pauseP','over'];
function panel(id){SCREENS.forEach(x=>$(x).hidden=x!==id);$('sheet').hidden=!id;$('sheet').classList.toggle('dark',id==='pauseP'||id==='over')}
function clearRun(){customers.forEach(c=>{c.actor.remove();c.mk.remove();c.plates.forEach(p=>scene.remove(p))});customers=[];$('tickets').innerHTML='';timers.length=0;tweens.length=0;
  cur=null;Q=null;show('card',false);setStation(null);if(chef){chef.root.position.set(-.35,0,0);chef.root.rotation.y=Math.PI/2;chef.target=null;chef.play('Idle')}}
function start(){
  unlock();clearRun();
  coins=served=finished=walkouts=right=asked=streak=bestStreak=spawned=0;missed=[];seen=new Set();gameT=0;
  const m=MODE();timeLeft=m.kind==='t'?m.n:0;runStart=performance.now();
  next=stream(curTopic(),DIFF(),EMBED_REG?{regions:EMBED_REG}:undefined);
  panel(null);show('top',true);paintHud();fitCamera();
  banner(L('Café open!'),`${curTopic().name} · ${DIFFN(DIFF())} · ${modeName(m)}`);S.bell();
  state='play';spawnT=reduced?.3:.8;
  if(!EMBED&&!hintShown)later(4.5,()=>{if(!cur&&state==='play'&&!hintShown)hint(L('Tap an order to start cooking'))})}
function checkEnd(){const m=MODE();if(m.kind==='o'&&finished>=m.n)later(1.4,()=>end('full'))}
function end(cause){
  if(state==='over'||state==='menu'||state==='loading')return;const wasPaused=state==='paused';state='over';hint('');if(cur)closeCard();
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
    show('top',false);panel('over')},cause==='quit'||wasPaused?0:900)}
function pause(){if(state!=='play')return;state='paused';$('pScore').textContent=coins;$('pLine').textContent=`${curTopic().name} · ${DIFFN(DIFF())}`;panel('pauseP');paintAudio()}
function resume(){if(state!=='paused')return;panel(null);state='play';last=performance.now()}
$('pauseBtn').onclick=()=>{S.tap();pause()};$('resumeBtn').onclick=()=>{S.tap();resume()};$('quitBtn').onclick=()=>end('quit');
$('againBtn').onclick=()=>{if(EMBED&&EMBED.lock)return;S.tap();start()};
$('menuBtn').onclick=()=>{if(EMBED&&EMBED.lock)return;S.tap();ov=null;clearRun();state='menu';go('stepTopic')};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
addEventListener('keydown',e=>{if(e.repeat)return;
  if(e.code==='Escape'||e.code==='KeyP'){state==='paused'?resume():pause();return}
  if(state==='over'&&e.code==='Enter'&&!(EMBED&&EMBED.lock)&&!$('over').hidden){start();return}
  if(state!=='play')return;const n={Digit1:0,Digit2:1,Digit3:2,Numpad1:0,Numpad2:1,Numpad3:2}[e.code];
  if(n!=null){e.preventDefault();if(cur)answer(n);else{const c=customers.filter(c=>c.st==='wait').sort((a,b)=>a.slot-b.slot)[n];if(c)tapCustomer(c)}}});

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
const TS=+new URLSearchParams(location.search).get('ts')||1;/* test hook: time scale */
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05*TS,(now-last)/1000*TS);last=now;
  if(state==='loading')return;
  if(state==='play'){
    gameT+=dt;
    for(let i=timers.length-1;i>=0;i--)if(timers[i].t<=gameT){const f=timers[i].fn;timers.splice(i,1);f()}
    const m=MODE();
    if(m.kind==='t'){const before=Math.ceil(timeLeft);timeLeft-=dt;if(Math.ceil(timeLeft)!==before)paintHud();if(timeLeft<=0){end('time')}}
    const lv=lvl(),active=customers.filter(c=>c.st==='walkin'||c.st==='wait');spawnT-=dt;
    const room=m.kind!=='o'||spawned<m.n;
    if(state==='play'&&room&&active.length<lv.max){if(active.length<lv.min&&lv.max>1)spawnT=Math.min(spawnT,1.4);if(spawnT<=0&&freeSlot()>=0){spawn();spawnT=rnd(...lv.gap);if(lv.max===1)spawnT=99}}
    /* patience: the customer you are cooking for waits happily */
    customers.forEach(c=>{if(c.st!=='wait'||c.done.every(Boolean))return;if(cur&&cur.c===c)return;c.p-=dt/c.dur;paintBar(c);if(c.p<=0)leave(c,false)})}
  if(state!=='paused'){
    for(let i=tweens.length-1;i>=0;i--){const w=tweens[i];w.t+=dt;const k=Math.min(1,w.t/w.dur);w.step(k);if(k>=1){tweens.splice(i,1);w.done&&w.done()}}
    if(chef)chef.update(dt);customers.forEach(c=>{if(c.st!=='gone')c.actor.update(dt)});
    updatePuffs(dt);
    if(flames&&flames.visible&&!reduced)flames.children.forEach((f,i)=>{f.scale.y=.8+Math.sin(now/60+i*1.7)*.35})
    if(customers.length>8)customers=customers.filter(c=>c.st!=='gone')}
  applyCamera(dt);
  /* markers over heads */
  customers.forEach(c=>{if(c.st==='gone')return;const s=toScreen(c.actor.root.position.clone().setY(3.15));c.mk.style.transform=`translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px)`;
    c.mk.style.opacity=c.st==='walkin'?Math.max(0,1-c.actor.root.position.distanceTo(new THREE.Vector3(STAND_X,0,SLOT_Z[Math.max(0,c.slot)]))/4):1});
  R.render(scene,cam)}

/* ======================= BOOT ======================= */
const KIT_NAMES=['floor_kitchen','wall','wall_decorated','wall_window_open','kitchencounter_straight_A','kitchencounter_straight_A_decorated','kitchencounter_sink_backsplash','stove_multi_countertop','stove_multi_decorated',
  'fridge_A_decorated','shelf_papertowel_decorated','crate_tomatoes','crate_carrots','crate_buns','cuttingboard','pan_A','pot_A','pot_A_stew','plate','food_burger','food_vegetableburger','stew_bowl','food_dinner',
  'food_ingredient_burger_uncooked','food_ingredient_burger_cooked','food_ingredient_burger_trash','food_ingredient_vegetableburger_uncooked','food_ingredient_vegetableburger_cooked',
  'food_ingredient_ham','food_ingredient_ham_cooked','food_ingredient_ham_trash','food_ingredient_tomato_slices','table_round_A_decorated','chair_A','dishrack_plates','menu'];
(async function boot(){
  translateStatic();paintAudio();
  const total=KIT_NAMES.length+1+CUSTOMERS.length;let n=0;const step=()=>{n++;$('loadBar').style.width=(n/total*100).toFixed(0)+'%'};
  try{await loadKit(KIT_NAMES,step);await loadChars(step)}catch(e){console.error(e);$('loading').querySelector('span').textContent='Could not load the kitchen. Check the connection and reload.';return}
  buildKitchen();buildStation();makeThumbs();
  chef=new Actor('Chef');chef.root.position.set(-.35,0,0);chef.root.rotation.y=Math.PI/2;chef.play('Idle');
  /* the chef's hat: made here, it rides on the head bone */
  const hat=new THREE.Group(),wm=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.85});
  const band=new THREE.Mesh(new THREE.CylinderGeometry(.42,.38,.4,24),wm);hat.add(band);
  [[0,0,.42],[.24,.18,.3],[-.24,.18,.3],[.24,-.18,.3],[-.24,-.18,.3]].forEach(([x,z,r])=>{const s=new THREE.Mesh(new THREE.SphereGeometry(r,18,12),wm);s.position.set(x,.32,z);hat.add(s)});
  hat.traverse(m=>{if(m.isMesh)m.castShadow=true});
  let head=null;chef.model.traverse(o=>{if(!head&&o.isBone&&/head/i.test(o.name))head=o});
  if(head){head.add(hat);hat.position.set(0,1.05,0)}else{hat.position.set(0,2.75,0);chef.root.add(hat)}
  fitCamera(true);applyCamera(0);R.render(scene,cam);
  $('loading').classList.add('done');setTimeout(()=>$('loading').remove(),500);
  state='menu';requestAnimationFrame(frame);
  if(applyEmbed())start();else go('scrHome');
})();
toParent({type:'edu-ready',game:GAME});
