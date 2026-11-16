import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import './style.css';

const canvas = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x89999a);
scene.fog = new THREE.Fog(0x89999a, 22, 78);
const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 1.72, 8);
let renderer = null;
try {
 renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false });
} catch (error) {
 console.error('WebGL2 initialization failed:', error);
 canvas.style.display = 'none';
 const fallback = document.createElement('section');
 fallback.setAttribute('role', 'alert');
 fallback.style.cssText = 'position:fixed;inset:0;z-index:9999;display:grid;place-content:center;gap:14px;padding:32px;background:#080d12;color:#e8eee9;font:14px/1.6 system-ui,sans-serif;text-align:center';
 fallback.innerHTML = '<div style="font-size:28px;font-weight:800;letter-spacing:.12em">GRAPHICS UNAVAILABLE</div><div style="max-width:560px;color:#b9c6bf">This tactical FPS requires WebGL 2, but this browser session refused to create a graphics context.</div><div style="max-width:560px;color:#8fa39a">Open the game in a regular Chrome tab (not an embedded or sandboxed preview), enable hardware acceleration in Chrome settings, and reload the page.</div><div style="color:#6f887d;font-size:11px;letter-spacing:.12em">NO GAME DATA WAS LOST</div>';
 document.body.appendChild(fallback);
}
if (renderer) {
 renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.15));
 renderer.setSize(innerWidth, innerHeight, false);
 renderer.domElement.style.width = '100%';
 renderer.domElement.style.height = '100%';
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

scene.add(new THREE.HemisphereLight(0xc9e2e4, 0x303a35, 2.0));
const sun = new THREE.DirectionalLight(0xffe4bd, 2.8);
sun.position.set(-12, 24, 10); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -36; sun.shadow.camera.right = 36;
sun.shadow.camera.top = 36; sun.shadow.camera.bottom = -36;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 75;
sun.shadow.bias = -0.00025;

scene.add(sun);

const mat = (color, roughness = .85, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const concrete = mat(0x66716c), darkConcrete = mat(0x3b4948), sand = mat(0x9a927e), metal = mat(0x29383b, .45, .55), trim = mat(0x1b282b), green = mat(0x687d59), glass = new THREE.MeshStandardMaterial({ color:0x76969a, roughness:.25, metalness:.5 });
// Mission maps: three distinct environments built as real 3D geometry.
const world=new THREE.Group();scene.add(world);
const colliders=[];
function box(x,y,z,sx,sy,sz,material,collide=true){
 const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;world.add(m);
 if(collide)colliders.push({x,z,hx:sx/2,hz:sz/2,top:y+sy/2});return m;
}
function building(x,z,w,d,h,material=concrete){
 box(x,h/2,z,w,h,d,material);
 box(x,h+.08,z,w+.18,.16,d+.18,trim,false);
 for(let i=-1;i<=1;i++)box(x+i*w*.28,h*.58,z-d/2-.012,w*.13,h*.2,.025,glass,false);
}
const mapThemes=[
 {name:'OLD TOWN // URBAN WARZONE',sky:0x89999a,fog:0x89999a,ground:0x777363,wall:0x66716c,accent:0x687d59},
 {name:'RED DUNE // DESERT OUTPOST',sky:0xc69a70,fog:0xc69a70,ground:0xb69a70,wall:0x9b7854,accent:0x786044},
 {name:'IRON YARD // INDUSTRIAL COMPLEX',sky:0x65777d,fog:0x65777d,ground:0x4e5655,wall:0x414b4c,accent:0x59684a},
 {name:'NIGHTFALL // FORWARD BASE',sky:0x293b4a,fog:0x293b4a,ground:0x353d40,wall:0x37413d,accent:0x52634d}
];
let currentMap=-1;
function buildMap(round){
 const idx=(round-1)%mapThemes.length,theme=mapThemes[idx];currentMap=idx;
 world.clear();
 colliders.length=0;
 scene.background=new THREE.Color(theme.sky);scene.fog=new THREE.Fog(theme.fog,24,88);
 const floorCanvas=document.createElement('canvas');floorCanvas.width=floorCanvas.height=512;
 const ctx=floorCanvas.getContext('2d');ctx.fillStyle='#'+theme.ground.toString(16).padStart(6,'0');ctx.fillRect(0,0,512,512);
 for(let i=0;i<22000;i++){const v=Math.random(),r=Math.random()*2.8+.3;ctx.fillStyle=v>.5?'rgba(28,29,25,.18)':'rgba(230,211,174,.12)';ctx.beginPath();ctx.ellipse(Math.random()*512,Math.random()*512,r,r*.6,Math.random()*3.14,0,Math.PI*2);ctx.fill();}
 for(let i=0;i<70;i++){ctx.strokeStyle='rgba(30,34,31,.24)';ctx.lineWidth=Math.random()*2+.5;ctx.beginPath();let x=Math.random()*512,y=Math.random()*512;ctx.moveTo(x,y);for(let j=0;j<4;j++){x+=(Math.random()-.5)*35;y+=(Math.random()-.5)*35;ctx.lineTo(x,y);}ctx.stroke();}
 const tex=new THREE.CanvasTexture(floorCanvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(10,10);tex.colorSpace=THREE.SRGBColorSpace;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(110,110),new THREE.MeshStandardMaterial({map:tex,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.09;ground.receiveShadow=true;world.add(ground);
 const wall=mat(theme.wall),accent=mat(theme.accent),debris=mat(idx===1?0x9b7954:0x5c625d),steel=mat(0x303b3d,.42,.55);
 // Main combat lanes and map-specific silhouettes.
 if(idx===0||idx===3){
  building(-15,-13,11,12,5.8,wall);building(15,-14,12,11,6.5,wall);building(-15,14,10,11,4.8,wall);building(15,14,11,12,5.7,wall);
  building(0,-24,17,5,4.3,darkConcrete);building(0,24,17,5,4.3,darkConcrete);
  for(let i=0;i<7;i++){box(-7+i*2.3,.7,-5,1.5,1.4,1.5,accent);box(6+i*2.2,.6,6,1.4,1.2,1.4,wall);}
 }else if(idx===1){
  // Desert outpost: perimeter walls, watchtowers, sand berms and fuel stores.
  for(let side of [-1,1]){box(side*19,1.2,0,1.1,2.4,38,wall);box(side*11,.65,-15,8,1.3,1.2,accent);box(side*11,.65,15,8,1.3,1.2,accent);}
  for(let x of [-18,18])for(let z of [-18,18]){box(x,3,z,2.8,6,2.8,wall);box(x,6.2,z,4,.4,4,trim);}
  building(0,-18,13,7,4.2,wall);building(-8,9,8,7,3.4,accent);building(9,10,7,8,3.8,wall);
  for(let i=0;i<9;i++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.8,2.3),1),debris);rock.position.set(rand(-25,25),rand(.3,1),rand(-25,25));rock.scale.y=.55;world.add(rock);}
 }else{
  // Industrial yard: hangar, tanks, loading bays and pipe racks.
  building(0,-20,23,9,7.5,wall);building(-17,4,9,17,5.5,darkConcrete);building(17,5,10,17,5.8,wall);
  for(let x of [-11,-5,5,11]){const tank=new THREE.Mesh(new THREE.CylinderGeometry(2,2,6,20),steel);tank.position.set(x,3,13);tank.castShadow=true;world.add(tank);const cap=new THREE.Mesh(new THREE.CylinderGeometry(2,2,.25,20),accent);cap.position.set(x,6.1,13);world.add(cap);}
  for(let i=0;i<8;i++){box(-20+i*5,1.1,-4,3.8,2.2,2.4,i%2?accent:steel);}
 }
 for(let i=0;i<95;i++){const x=rand(-27,27),z=rand(-27,27);if(Math.abs(x)<4&&z>0&&z<12)continue;const r=rand(.12,.55);const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),debris);rock.position.set(x,-.02+r*.25,z);rock.rotation.set(rand(0,3),rand(0,3),rand(0,3));world.add(rock);}
 for(let i=0;i<6;i++){const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.38,.42,1.05,16),mat(idx===1?0x75603f:0x59483b));barrel.position.set(rand(-22,22),.52,rand(-22,22));barrel.castShadow=true;world.add(barrel);}
 for(let i=0;i<10;i++){const x=-22+i*4.9;box(x,1.15,-1,.2,2.3,.2,steel);box(x,2.35,-1,.5,.12,.5,trim,false);}
}
buildMap(1);
const skyHaze = new THREE.Mesh(new THREE.PlaneGeometry(100,18),new THREE.MeshBasicMaterial({color:0xc1c5b3,transparent:true,opacity:.18,side:THREE.DoubleSide}));skyHaze.position.set(0,11,-38);world.add(skyHaze);
// Distant patrol aircraft: a small, low-cost silhouette that crosses the skyline.
const patrolAircraft=new THREE.Group();
const aircraftBody=mat(0x39413d,.72,.18),aircraftGlass=mat(0x182b32,.25,.45);
const fuselage=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,2.9,10),aircraftBody);fuselage.rotation.z=Math.PI/2;patrolAircraft.add(fuselage);
const wings=new THREE.Mesh(new THREE.BoxGeometry(.18,.055,2.25),aircraftBody);patrolAircraft.add(wings);
const tailWing=new THREE.Mesh(new THREE.BoxGeometry(.14,.045,.85),aircraftBody);tailWing.position.x=-1.12;patrolAircraft.add(tailWing);
const tailFin=new THREE.Mesh(new THREE.BoxGeometry(.32,.36,.06),aircraftBody);tailFin.position.set(-1.18,.16,0);patrolAircraft.add(tailFin);
const cockpit=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),aircraftGlass);cockpit.scale.set(1.5,.7,.9);cockpit.position.x=.62;patrolAircraft.add(cockpit);
patrolAircraft.scale.set(1.15,1.15,1.15);patrolAircraft.position.set(-48,19,-34);scene.add(patrolAircraft);

const weapon = new THREE.Group(); camera.add(weapon); scene.add(camera);
const gunMat=mat(0x20292b,.34,.72), gunPolymer=mat(0x252d2b,.78,.05), gunAccent=mat(0x65734f,.52,.18);
function gunBox(sx,sy,sz,x,y,z,material,bevel=.0){const g=new THREE.BoxGeometry(sx,sy,sz);const o=new THREE.Mesh(g,material);o.position.set(x,y,z);o.castShadow=true;weapon.add(o);return o;}
function gunTube(radius,length,x,y,z,material,sides=12){const o=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,sides),material);o.rotation.x=Math.PI/2;o.position.set(x,y,z);o.castShadow=true;weapon.add(o);return o;}
// First-person assault rifle silhouette: stock, receiver, handguard, barrel, sights and magazine.
gunBox(.16,.16,.42,.34,-.29,-.48,gunPolymer);
gunBox(.19,.19,.38,.34,-.27,-.78,gunMat);
gunBox(.14,.16,.42,.34,-.25,-1.03,gunPolymer);
gunBox(.11,.08,.27,.34,-.39,-.72,gunPolymer);
gunBox(.075,.18,.18,.34,-.43,-.88,gunPolymer);
gunTube(.034,.48,.34,-.22,-1.38,gunMat,16);
gunTube(.052,.09,.34,-.22,-1.64,trim,16);
gunBox(.12,.045,.28,.34,-.16,-1.06,gunMat);
gunBox(.045,.045,.42,.34,-.14,-1.13,gunAccent);
gunBox(.045,.11,.06,.34,-.075,-.83,gunMat);
gunBox(.055,.09,.07,.34,-.07,-1.53,gunMat);
gunBox(.045,.13,.06,.34,-.075,-1.5,gunAccent);
const mag=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,.31,8),gunPolymer);mag.position.set(.34,-.48,-.88);mag.rotation.x=-.12;weapon.add(mag);
gunBox(.055,.12,.12,.34,-.42,-.58,gunPolymer);
gunBox(.12,.045,.19,.34,-.18,-.62,gunAccent);
const muzzleFlash=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),new THREE.MeshBasicMaterial({color:0xffe2a0,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));muzzleFlash.position.set(.34,-.22,-1.72);muzzleFlash.visible=false;weapon.add(muzzleFlash);
const muzzleFlare=new THREE.Mesh(new THREE.ConeGeometry(.085,.42,10),new THREE.MeshBasicMaterial({color:0xff9a3c,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));muzzleFlare.rotation.x=-Math.PI/2;muzzleFlare.position.set(.34,-.22,-1.91);muzzleFlare.visible=false;weapon.add(muzzleFlare);
const muzzleLight=new THREE.PointLight(0xffa34d,0,5,2);muzzleLight.position.set(.34,-.22,-1.72);weapon.add(muzzleLight);
weapon.position.set(0,0,0);

const player={health:100,ammo:30,reserve:120,grenades:3,kills:0,shots:0,hits:0,round:1,reloading:false,alive:true,active:true,velocity:new THREE.Vector3(),onGround:true};
const bots=[]; const bullets=[]; const enemyBullets=[]; const grenades=[]; const explosions=[]; const clock=new THREE.Clock();
let missionMarker=null,missionKind='eliminate',missionProgress=0,missionDuration=0,missionX=0,missionZ=-8,missionDone=false; const raycaster=new THREE.Raycaster();
const keys={}; let pointerLocked=false, elapsed=0, roundTime=120, recoil=0, bob=0, shotCooldown=0, toastTimeout;
const $=id=>document.getElementById(id);
const startScreen=$('start-screen'),pauseScreen=$('pause-screen'),roundScreen=$('round-screen'),gameoverScreen=$('gameover-screen');
const mapBounds=25;
function rand(min,max){return min+Math.random()*(max-min)}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),1700)}
let audioCtx=null,masterGain=null,ambientStarted=false,lastStepSound=0;
function initAudio(){
 if(audioCtx)return;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 audioCtx=new AC();masterGain=audioCtx.createGain();masterGain.gain.value=.42;masterGain.connect(audioCtx.destination);
 if(audioCtx.state==='suspended')audioCtx.resume();
 startAmbientAudio();
}
function tone(freq,duration,type='sine',volume=.08,slide=0){
 if(!audioCtx)return;const now=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
 osc.type=type;osc.frequency.setValueAtTime(freq,now);if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(25,freq+slide),now+duration);
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 osc.connect(gain);gain.connect(masterGain);osc.start(now);osc.stop(now+duration+.02);
}
function noiseBurst(duration=.12,volume=.12,filter=1600){
 if(!audioCtx)return;const n=Math.floor(audioCtx.sampleRate*duration),buffer=audioCtx.createBuffer(1,n,audioCtx.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);
 const src=audioCtx.createBufferSource(),low=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();src.buffer=buffer;low.type='lowpass';low.frequency.value=filter;gain.gain.value=volume;src.connect(low);low.connect(gain);gain.connect(masterGain);src.start();
}
function playSound(kind){
 if(!audioCtx)return;
 if(kind==='shot'){noiseBurst(.16,.23,2200);tone(105,.12,'triangle',.15,-55);tone(850,.035,'square',.025,-500);}
 if(kind==='reload'){tone(420,.055,'square',.035,-180);setTimeout(()=>tone(260,.08,'triangle',.05,120),260);setTimeout(()=>noiseBurst(.08,.07,900),780);}
 if(kind==='hit'){tone(720,.055,'square',.035,-260);}
 if(kind==='enemy'){noiseBurst(.1,.1,1300);tone(150,.1,'triangle',.045,-65);}
 if(kind==='damage'){tone(95,.22,'sawtooth',.09,-45);}
 if(kind==='explosion'){noiseBurst(.62,.38,780);tone(58,.55,'sawtooth',.22,-38);tone(42,.7,'triangle',.16,-25);}
 if(kind==='step'){noiseBurst(.045,.035,420);}
 if(kind==='round'){tone(520,.12,'sine',.06,180);setTimeout(()=>tone(780,.18,'sine',.06,120),130);}
}
function startAmbientAudio(){
 if(!audioCtx||ambientStarted)return;ambientStarted=true;
 // Quiet wind bed, synthesized locally so the game remains fully offline.
 const n=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.22;
 const src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();src.buffer=n;src.loop=true;filter.type='lowpass';filter.frequency.value=360;gain.gain.value=.055;src.connect(filter);filter.connect(gain);gain.connect(masterGain);src.start();
 // Distant aircraft-like engine drone, intentionally subtle.
 const drone=audioCtx.createOscillator(),droneGain=audioCtx.createGain(),droneFilter=audioCtx.createBiquadFilter();drone.type='sawtooth';drone.frequency.value=48;droneFilter.type='lowpass';droneFilter.frequency.value=105;droneGain.gain.value=.012;drone.connect(droneFilter);droneFilter.connect(droneGain);droneGain.connect(masterGain);drone.start();
}
let soldierTemplate=null,soldierClips=[];
const soldierLoader=new GLTFLoader();
soldierLoader.load('https://threejs.org/examples/models/gltf/Soldier.glb',gltf=>{
 soldierTemplate=gltf.scene;soldierClips=gltf.animations||[];
 for(const bot of bots)attachSoldier(bot);
},undefined,error=>console.warn('Soldier model unavailable; using local fallback:',error));
function attachSoldier(bot){
 if(!soldierTemplate||!bot.alive)return;
 const old=bot.group.getObjectByName('fallback-body');if(old)bot.group.remove(old);
 const model=cloneSkeleton(soldierTemplate);model.name='rigged-soldier';model.scale.setScalar(1.0);model.position.y=0;
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material)o.material=o.material.clone();}});
 bot.group.add(model);bot.model=model;
 // Attach a visible rifle to the soldier's hands; barrel points along the soldier's forward axis (+Z).
 const heldRifle=new THREE.Group();heldRifle.name='held-rifle';heldRifle.position.set(.23,1.03,.2);model.add(heldRifle);
 const rifleMetal=mat(0x20282a,.36,.7),riflePoly=mat(0x343b35,.8,.05);
 const receiver=new THREE.Mesh(new THREE.BoxGeometry(.13,.14,.43),rifleMetal);heldRifle.add(receiver);
 const handguard=new THREE.Mesh(new THREE.BoxGeometry(.105,.105,.32),riflePoly);handguard.position.z=.31;heldRifle.add(handguard);
 const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.5,12),rifleMetal);barrel.rotation.x=Math.PI/2;barrel.position.z=.69;heldRifle.add(barrel);
 const stock=new THREE.Mesh(new THREE.BoxGeometry(.1,.12,.25),riflePoly);stock.position.z=-.31;heldRifle.add(stock);
 const magazine=new THREE.Mesh(new THREE.BoxGeometry(.09,.24,.13),rifleMetal);magazine.position.set(0,-.17,.1);heldRifle.add(magazine);
 heldRifle.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 bot.heldRifle=heldRifle;
 bot.mixer=new THREE.AnimationMixer(model);
 const idle=soldierClips.find(c=>/idle/i.test(c.name))||soldierClips[0];
 const walk=soldierClips.find(c=>/walk/i.test(c.name))||idle;
 bot.actions={idle:idle?bot.mixer.clipAction(idle):null,walk:walk?bot.mixer.clipAction(walk):null};
 bot.currentAction=null;setBotAnimation(bot,'idle');
}
function setBotAnimation(bot,name){
 if(!bot.actions)return;const next=bot.actions[name]||bot.actions.idle;if(!next||bot.currentAction===next)return;
 if(bot.currentAction)bot.currentAction.fadeOut(.18);next.reset().fadeIn(.18).play();bot.currentAction=next;
}
function makeBot(index){
 const group=new THREE.Group();
 // Lightweight local fallback is replaced by the rigged animated GLB as soon as it loads.
 const fallback=new THREE.Group();fallback.name='fallback-body';group.add(fallback);
 const uniform=mat(index%2?0x59684a:0x74664d),vestMat=mat(0x303a34),skin=mat(0x9b8067),dark=mat(0x18201f),cloth=mat(0x343b32);
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.52,6,12),uniform);torso.position.y=1.18;torso.scale.set(1,.95,.72);fallback.add(torso);
 const vest=new THREE.Mesh(new THREE.BoxGeometry(.54,.48,.31),vestMat);vest.position.set(0,1.2,-.025);fallback.add(vest);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.16,16,12),skin);head.position.y=1.69;fallback.add(head);
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.2,16,12,0,Math.PI*2,0,Math.PI*.55),dark);helmet.position.y=1.77;fallback.add(helmet);
 for(const side of [-1,1]){
  const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.42,4,8),uniform);arm.position.set(side*.36,1.12,-.02);arm.rotation.z=side*.12;fallback.add(arm);
  const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.48,4,8),cloth);leg.position.set(side*.16,.43,0);fallback.add(leg);
  const boot=new THREE.Mesh(new THREE.BoxGeometry(.2,.12,.32),dark);boot.position.set(side*.16,.12,-.06);fallback.add(boot);
 }
 const rifle=new THREE.Group();rifle.position.set(.24,1.02,.25);fallback.add(rifle);
 const rifleBody=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.46),dark);rifle.add(rifleBody);
 const rifleBarrel=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.48,10),dark);rifleBarrel.rotation.x=Math.PI/2;rifleBarrel.position.z=.43;rifle.add(rifleBarrel);
 const rifleStock=new THREE.Mesh(new THREE.BoxGeometry(.1,.11,.24),cloth);rifleStock.position.z=-.31;rifle.add(rifleStock);
 const rifleMag=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.2,8),vestMat);rifleMag.position.set(0,-.14,.12);rifleMag.rotation.x=-.12;rifle.add(rifleMag);
 // Raise both arms toward the rifle instead of leaving the soldier in a walking-at-ease pose.
 for(const arm of fallback.children.filter(o=>o.geometry?.type==='CapsuleGeometry'&&o.position.y>1)){arm.position.y=1.22;arm.position.z=.16;arm.rotation.x=-.82;}
 const hpbg=new THREE.Mesh(new THREE.PlaneGeometry(.72,.07),new THREE.MeshBasicMaterial({color:0x17211e,side:THREE.DoubleSide}));hpbg.position.y=2.12;hpbg.userData.noHit=true;group.add(hpbg);
 const hp=new THREE.Mesh(new THREE.PlaneGeometry(.68,.045),new THREE.MeshBasicMaterial({color:0xff755e,side:THREE.DoubleSide}));hp.position.set(0,2.12,.006);hp.userData.noHit=true;group.add(hp);
 const a=rand(0,Math.PI*2),r=rand(12,20);group.position.set(Math.cos(a)*r,0,Math.sin(a)*r);
 scene.add(group);const bot={group,hp,hpbg,health:100,maxHealth:100,fire:rand(2.2,4.5),speed:rand(1.2,2),strafe:rand(-1,1),alive:true,hitFlash:0,mixer:null};bots.push(bot);
 if(soldierTemplate)attachSoldier(bot);return bot;
}
function spawnWave(){
 buildMap(player.round);for(const b of bots)scene.remove(b.group);bots.length=0;
 const count=Math.min(4+player.round*2,14);for(let i=0;i<count;i++)makeBot(i);
 $('wave').textContent=String(count).padStart(2,'0');$('radar-count').textContent=String(count).padStart(2,'0');
 $('round-label').textContent='ROUND '+String(player.round).padStart(2,'0');
 const missions=[
  {kind:'eliminate',title:'ELIMINATE HOSTILE FORCES',sub:'Neutralize every hostile in the urban sector',duration:0},
  {kind:'intel',title:'SECURE THE INTEL CACHE',sub:'Clear hostiles, then hold the marked intel zone',duration:8},
  {kind:'defend',title:'DEFEND THE EXTRACTION ZONE',sub:'Clear hostiles and hold the extraction perimeter',duration:25},
  {kind:'sabotage',title:'SABOTAGE THE DEPOT',sub:'Clear hostiles, then secure the marked depot',duration:10}
 ];
 const mission=missions[(player.round-1)%missions.length];missionKind=mission.kind;missionDuration=mission.duration;missionProgress=0;missionDone=mission.kind==='eliminate';
 $('objective').textContent=mission.title;$('objective-sub').textContent=mission.sub;$('match-state').textContent=mapThemes[currentMap].name;
 if(missionMarker){scene.remove(missionMarker);missionMarker=null;}
 if(missionKind!=='eliminate'){
  missionMarker=new THREE.Group();missionMarker.position.set(missionX,0,missionZ);
  const color=missionKind==='defend'?0x59c7ff:0xc5f36b;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.5,.09,8,48),new THREE.MeshBasicMaterial({color}));ring.rotation.x=-Math.PI/2;ring.position.y=.08;missionMarker.add(ring);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.08,.55,4.5,16,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=2.25;missionMarker.add(beam);
  const beacon=new THREE.PointLight(color,2.2,9);beacon.position.y=2;missionMarker.add(beacon);scene.add(missionMarker);
 }
 roundTime=Math.max(55,120-player.round*4);updateTimer();
}
function updateMission(dt){
 if(missionDone||missionKind==='eliminate')return;
 const dx=camera.position.x-missionX,dz=camera.position.z-missionZ;
 const radius=missionKind==='defend'?7.5:3.2,inside=dx*dx+dz*dz<=radius*radius;
 if(inside){missionProgress=Math.min(missionDuration,missionProgress+dt);if(missionMarker)missionMarker.rotation.y+=dt*.7;}
 else if(missionKind==='defend')missionProgress=Math.max(0,missionProgress-dt*.55);
 const pct=Math.floor(missionProgress/missionDuration*100);
 $('objective-sub').textContent=(inside?'ZONE SECURED // ':'MOVE TO MARKER // ')+pct+'%';
 if(missionProgress>=missionDuration){missionDone=true;toast('OBJECTIVE COMPLETE // EXTRACT');$('objective-sub').textContent='OBJECTIVE COMPLETE // SECTOR CLEAR';}
}
function updateTimer(){const m=Math.floor(roundTime/60),s=Math.floor(roundTime%60);$('round-timer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function updateHUD(){
 $('health').textContent=Math.max(0,Math.ceil(player.health));$('health-fill').style.width=Math.max(0,player.health)+'%';$('ammo').textContent=String(player.ammo).padStart(2,'0');$('reserve').textContent=player.reserve;$('grenade-count').textContent=String(player.grenades);$('kills').textContent=String(player.kills).padStart(2,'0');$('accuracy').textContent=(player.shots?Math.round(player.hits/player.shots*100):100)+'%';
 $('radar-count').textContent=String(bots.filter(b=>b.alive).length).padStart(2,'0');$('wave').textContent=String(bots.filter(b=>b.alive).length).padStart(2,'0');
 const bars=$('ammo-bars');bars.innerHTML='';for(let i=0;i<30;i++){const el=document.createElement('i');if(i>=player.ammo)el.className='empty';bars.append(el);}
}
function moveBlocked(x,z){if(Math.abs(x)>mapBounds||Math.abs(z)>mapBounds)return true;return colliders.some(c=>Math.abs(x-c.x)<c.hx+.42&&Math.abs(z-c.z)<c.hz+.42);}
function damagePlayer(amount){if(!player.alive)return;playSound('damage');player.health=Math.max(0,player.health-amount);$('damage-flash').classList.add('show');setTimeout(()=>$('damage-flash').classList.remove('show'),100);updateHUD();if(player.health<=0){player.alive=false;player.active=false;document.exitPointerLock?.();$('gameover-copy').textContent='You neutralized '+player.kills+' hostiles across '+player.round+' rounds.';gameoverScreen.classList.remove('hidden');}}
function fireBot(bot,dt){
 bot.fire-=dt;if(bot.fire>0)return;bot.fire=rand(bot.inCover?1.7:1.2,bot.inCover?2.8:2.1);
 if(bot.heldRifle){const flash=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),new THREE.MeshBasicMaterial({color:0xffc16a,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));flash.position.set(.23,1.03,.98);bot.group.add(flash);setTimeout(()=>{bot.group.remove(flash);flash.geometry.dispose();flash.material.dispose();},65);}
 const origin=bot.group.position.clone().add(new THREE.Vector3(0,1.28,0));
 const target=camera.position.clone().add(new THREE.Vector3(rand(-.65,.65),rand(-.45,.45),rand(-.65,.65)));
 const direction=target.sub(origin).normalize();const distance=origin.distanceTo(camera.position);
 const tracer=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.72,6),new THREE.MeshBasicMaterial({color:0xffb36b}));
 tracer.position.copy(origin).addScaledVector(direction,.5);tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);scene.add(tracer);
 enemyBullets.push({mesh:tracer,velocity:direction.clone().multiplyScalar(34),life:Math.min(1.1,distance/34+.12),damage:rand(5,9)});
 playSound('enemy');
}
function shoot(){
 if(!player.active||!pointerLocked||player.reloading||shotCooldown>0)return;
 if(player.ammo<=0){toast('MAGAZINE EMPTY // PRESS R');return;}
 player.ammo--;player.shots++;playSound('shot');shotCooldown=.2;recoil=Math.min(recoil+.09,.24);
 muzzleFlash.visible=true;muzzleFlare.visible=true;muzzleLight.intensity=7;
 setTimeout(()=>{muzzleFlash.visible=false;muzzleFlare.visible=false;muzzleLight.intensity=0;},95);
 camera.updateMatrixWorld();raycaster.setFromCamera(new THREE.Vector2(0,0),camera);raycaster.far=65;
 const targets=[];for(const b of bots)if(b.alive)b.group.traverse(o=>{if(o.isMesh&&!o.userData.noHit&&o.geometry.type!=='PlaneGeometry')targets.push(o);});
 const hit=raycaster.intersectObjects(targets,false)[0];
 if(hit){playSound('hit');const bot=bots.find(b=>{if(!b.alive)return false;let node=hit.object;while(node){if(node===b.group)return true;node=node.parent;}return false;});if(bot){player.hits++;bot.health-=34;bot.hitFlash=.08;bot.hp.scale.x=Math.max(0,bot.health/bot.maxHealth);$('hit-marker').classList.add('show');setTimeout(()=>$('hit-marker').classList.remove('show'),100);if(bot.health<=0){bot.alive=false;scene.remove(bot.group);player.kills++;toast('HOSTILE NEUTRALIZED');}}}
 updateHUD();
}
function throwGrenade(){
 if(!player.active||!pointerLocked||player.grenades<=0)return;
 player.grenades--;updateHUD();toast('FRAG OUT // '+player.grenades+' LEFT');
 const grenade=new THREE.Mesh(new THREE.SphereGeometry(.105,12,10),mat(0x45513b,.72,.18));
 grenade.position.copy(camera.position).add(new THREE.Vector3(0,-.18,0));
 const direction=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
 const velocity=direction.multiplyScalar(12).add(new THREE.Vector3(0,5.5,0));
 grenade.castShadow=true;scene.add(grenade);grenades.push({mesh:grenade,velocity,fuse:2.15,bounced:false});
}
function detonateGrenade(g){
 const center=g.mesh.position.clone();scene.remove(g.mesh);playSound('explosion');
 const flash=new THREE.Mesh(new THREE.SphereGeometry(.5,16,12),new THREE.MeshBasicMaterial({color:0xffa34d,transparent:true,opacity:.82,depthWrite:false}));
 flash.position.copy(center);scene.add(flash);explosions.push({mesh:flash,age:0});
 for(const bot of bots){if(!bot.alive)continue;const d=bot.group.position.distanceTo(center);if(d<8){const damage=Math.round(115*(1-d/8));bot.health-=damage;bot.hp.scale.x=Math.max(0,bot.health/bot.maxHealth);if(bot.health<=0){bot.alive=false;scene.remove(bot.group);player.kills++;toast('HOSTILE ELIMINATED // FRAG');}}}
 if(camera.position.distanceTo(center)<5.5)damagePlayer(Math.round(30*(1-camera.position.distanceTo(center)/7)));
 updateHUD();
}
function updateProjectiles(dt){
 for(let i=grenades.length-1;i>=0;i--){const g=grenades[i];g.fuse-=dt;g.velocity.y-=9.8*dt;g.mesh.position.addScaledVector(g.velocity,dt);
  if(g.mesh.position.y<.13){g.mesh.position.y=.13;g.velocity.y=Math.abs(g.velocity.y)*.48;g.velocity.x*=.72;g.velocity.z*=.72;g.mesh.rotation.x+=dt*8;g.mesh.rotation.z+=dt*6;}
  if(g.fuse<=0){detonateGrenade(g);grenades.splice(i,1);}
 }
 for(let i=enemyBullets.length-1;i>=0;i--){const b=enemyBullets[i];b.mesh.position.addScaledVector(b.velocity,dt);b.life-=dt;
  if(b.mesh.position.distanceTo(camera.position)<.48){damagePlayer(b.damage);b.life=-1;}
  if(b.life<=0){scene.remove(b.mesh);enemyBullets.splice(i,1);}
 }
 for(let i=explosions.length-1;i>=0;i--){const e=explosions[i];e.age+=dt;e.mesh.scale.setScalar(1+e.age*10);e.mesh.material.opacity=Math.max(0,.82-e.age*1.25);if(e.age>.66){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();explosions.splice(i,1);}}
}
function reload(){if(!player.active||player.reloading||player.ammo===30||player.reserve<=0)return;player.reloading=true;playSound('reload');toast('RELOADING');setTimeout(()=>{const amount=Math.min(30-player.ammo,player.reserve);player.ammo+=amount;player.reserve-=amount;player.reloading=false;updateHUD();},1250);}
function togglePause(){if(!player.active||!player.alive)return;if(pointerLocked){document.exitPointerLock();}else{canvas.requestPointerLock?.();}}
function begin(){initAudio();startScreen.classList.add('hidden');player.active=true;spawnWave();canvas.requestPointerLock?.();toast('OPERATION LIVE // GOOD HUNT');}
$('deploy-btn').addEventListener('click',begin);$('resume-btn').addEventListener('click',()=>canvas.requestPointerLock?.());
$('next-round-btn').addEventListener('click',()=>{roundScreen.classList.add('hidden');player.round++;player.health=Math.min(100,player.health+18);player.ammo=30;player.reserve+=30;player.grenades=Math.min(5,player.grenades+1);player.active=true;spawnWave();updateHUD();canvas.requestPointerLock?.();});
$('retry-btn').addEventListener('click',()=>{gameoverScreen.classList.add('hidden');player.health=100;player.ammo=30;player.reserve=120;player.grenades=3;player.kills=0;player.shots=0;player.hits=0;player.round=1;player.alive=true;player.active=true;camera.position.set(0,1.72,8);spawnWave();updateHUD();canvas.requestPointerLock?.();});
canvas.addEventListener('click',()=>{if(!pointerLocked&&player.active&&player.alive)canvas.requestPointerLock?.();});
document.addEventListener('pointerlockchange',()=>{pointerLocked=document.pointerLockElement===canvas;if(!pointerLocked&&player.active&&player.alive&&!startScreen.classList.contains('hidden'))return;if(!pointerLocked&&player.active&&player.alive){pauseScreen.classList.remove('hidden');}else{pauseScreen.classList.add('hidden');}});
document.addEventListener('mousemove',e=>{if(!pointerLocked||!player.active)return;camera.rotation.order='YXZ';camera.rotation.y-=e.movementX*.0022;camera.rotation.x-=e.movementY*.0022;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x,-1.35,1.35);});
document.addEventListener('mousedown',e=>{if(e.button===0)shoot();if(e.button===2){e.preventDefault();throwGrenade();}});canvas.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyR')reload();if(e.code==='KeyG')throwGrenade();if(e.code==='Escape'&&pointerLocked){};});document.addEventListener('keyup',e=>keys[e.code]=false);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const ratio=Math.min(window.devicePixelRatio||1,1.15);renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);});
let contextLost=false;
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;player.active=false;pauseScreen.classList.add('hidden');toast('GRAPHICS PAUSED // RESTORING WEBGL');});
canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.15));renderer.setSize(innerWidth,innerHeight,false);toast('GRAPHICS RESTORED // CLICK DEPLOY TO RESUME');});
function chooseCover(bot){
 const p=bot.group.position;let best=null,bestScore=Infinity;
 for(const c of colliders){
  const dx=c.x-camera.position.x,dz=c.z-camera.position.z,len=Math.hypot(dx,dz)||1;
  const ux=dx/len,uz=dz/len;
  const offset=Math.max(c.hx,c.hz)+.9;
  const x=c.x+ux*offset,z=c.z+uz*offset;
  const playerDist=Math.hypot(x-camera.position.x,z-camera.position.z);
  if(playerDist<len+Math.min(c.hx,c.hz)*.45)continue;
  const botDist=Math.hypot(x-p.x,z-p.z);
  const score=botDist+Math.max(0,8-playerDist)*2;
  if(score<bestScore&&!moveBlocked(x,z)){bestScore=score;best={x,z};}
 }
 return best;
}
function updateBots(dt){
 for(const b of bots){
  if(!b.alive)continue;if(b.mixer)b.mixer.update(dt);
  const p=b.group.position;
  const dx=camera.position.x-p.x,dz=camera.position.z-p.z,dist=Math.hypot(dx,dz);
  // Face the player first: Object3D.lookAt points the soldier's local +Z toward the target.
  b.group.lookAt(camera.position.x,p.y+1,camera.position.z);
  if(!b.cover||elapsed>(b.coverUntil||0)){b.cover=chooseCover(b);b.coverUntil=elapsed+rand(5,9);}
  const target=b.cover||{x:camera.position.x-dx/Math.max(dist,1)*9,z:camera.position.z-dz/Math.max(dist,1)*9};
  const tx=target.x-p.x,tz=target.z-p.z,td=Math.hypot(tx,tz);
  if(td>1.1&&dist>6){
   setBotAnimation(b,'walk');
   const step=Math.min(td,b.speed*dt);
   const nx=p.x+tx/td*step,nz=p.z+tz/td*step;
   if(!moveBlocked(nx,p.z))p.x=nx;if(!moveBlocked(p.x,nz))p.z=nz;
   b.inCover=false;
  }else{
   setBotAnimation(b,'idle');b.inCover=true;
  }
  // Briefly peek out to fire, then return behind the nearest obstacle.
  if(b.inCover){b.peekTimer=(b.peekTimer||0)-dt;if(b.peekTimer<=0){b.peekTimer=rand(1.8,3.2);b.peek=true;}if(b.peek){fireBot(b,dt);if(b.peekTimer<.55)b.peek=false;}}
  else fireBot(b,dt);
 }
}
function updateRadar(){const root=$('radar-dots');root.innerHTML='';for(const b of bots){if(!b.alive)continue;const dx=(b.group.position.x-camera.position.x)/55*130,dz=(b.group.position.z-camera.position.z)/55*130;const dot=document.createElement('i');dot.className='radar-dot';dot.style.left='calc(50% + '+THREE.MathUtils.clamp(dx,-62,62)+'px)';dot.style.top='calc(50% + '+THREE.MathUtils.clamp(dz,-62,62)+'px)';root.append(dot);}}
function update(dt){
 elapsed+=dt;patrolAircraft.position.x=((elapsed*3.1+48)%110)-55;patrolAircraft.position.y=19+Math.sin(elapsed*.22)*.35;patrolAircraft.position.z=-34+Math.sin(elapsed*.12)*2;shotCooldown=Math.max(0,shotCooldown-dt);recoil=Math.max(0,recoil-dt*.55);
 if(player.active&&player.alive){
  roundTime-=dt;if(roundTime<=0){roundTime=0;damagePlayer(12);roundTime=12;}updateTimer();
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
  const move=new THREE.Vector3();if(keys.KeyW)move.add(forward);if(keys.KeyS)move.sub(forward);if(keys.KeyD)move.add(right);if(keys.KeyA)move.sub(right);
  if(move.lengthSq()>0){if(elapsed-lastStepSound>.38){playSound('step');lastStepSound=elapsed;}move.normalize();const speed=(keys.ShiftLeft||keys.ShiftRight)?8.5:5.2;const nx=camera.position.x+move.x*speed*dt,nz=camera.position.z+move.z*speed*dt;if(!moveBlocked(nx,camera.position.z))camera.position.x=nx;if(!moveBlocked(camera.position.x,nz))camera.position.z=nz;bob+=dt*speed;}
  if(keys.Space&&player.onGround){player.velocity.y=5.1;player.onGround=false;}player.velocity.y-=14*dt;camera.position.y+=player.velocity.y*dt;
  const crouched=!!(keys.KeyC||keys.ControlLeft||keys.ControlRight),eyeHeight=crouched?1.12:1.72;
  if(camera.position.y<eyeHeight&&player.onGround)camera.position.y=THREE.MathUtils.damp(camera.position.y,eyeHeight,18,dt);
  if(camera.position.y<=eyeHeight){camera.position.y=eyeHeight;player.velocity.y=0;player.onGround=true;}
  weapon.position.y=Math.sin(bob*1.7)*.012-recoil*.5+(crouched?-.22:0);weapon.position.x=Math.cos(bob*.85)*.008;weapon.rotation.x=-recoil+(crouched?.035:0);
  updateBots(dt);updateProjectiles(dt);updateMission(dt);
  if(bots.every(b=>!b.alive)&&missionDone){playSound('round');player.active=false;document.exitPointerLock?.();$('round-eyebrow').textContent='SECTOR SECURED';$('round-title').textContent='ROUND COMPLETE';$('round-copy').textContent=mapThemes[currentMap].name+' secured. '+player.kills+' hostile units neutralized. Next operation changes the battlefield and mission.';roundScreen.classList.remove('hidden');}
  if(Math.floor(elapsed*3)%2===0)updateRadar();
 }
 $('clock').textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(Math.floor(elapsed%60)).padStart(2,'0');
}
function animate(){requestAnimationFrame(animate);if(contextLost)return;const dt=Math.min(clock.getDelta(),.04);update(dt);try{renderer.render(scene,camera);}catch(error){console.error('Render failed:',error);}}
spawnWave();updateHUD();animate();
}
