import * as THREE from 'three';
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
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

scene.add(new THREE.HemisphereLight(0xc9e2e4, 0x303a35, 2.0));
const sun = new THREE.DirectionalLight(0xffe4bd, 2.8);
sun.position.set(-12, 24, 10); sun.castShadow = false;

scene.add(sun);

const mat = (color, roughness = .85, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const concrete = mat(0x66716c), darkConcrete = mat(0x3b4948), sand = mat(0x9a927e), metal = mat(0x29383b, .45, .55), trim = mat(0x1b282b), green = mat(0x687d59), glass = new THREE.MeshStandardMaterial({ color:0x76969a, roughness:.25, metalness:.5 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(110,110), sand); ground.rotation.x=-Math.PI/2; ground.position.y=-.08; ground.receiveShadow=true; scene.add(ground);
const grid = new THREE.GridHelper(100,50,0x7e8a7b,0x89917e); grid.position.y=-.06; grid.material.transparent=true; grid.material.opacity=.16; scene.add(grid);

const colliders = [];
function box(x,y,z,sx,sy,sz,material,collide=true){
 const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material); m.position.set(x,y,z); m.castShadow=false; m.receiveShadow=false; scene.add(m);
 if(collide) colliders.push({x,z,hx:sx/2,hz:sz/2,top:y+sy/2});
 return m;
}
function building(x,z,w,d,h,material=concrete){
 box(x,h/2,z,w,h,d,material);
 box(x,h+.08,z,w+.18,.16,d+.18,trim,false);
 for(let i=-1;i<=1;i++){ const win=box(x+i*w*.28,h*.58,z-d/2-.012,w*.13,h*.2,.025,glass,false); win.castShadow=false; }
}
building(-14,-12,10,12,5.4); building(14,-13,12,10,6.2); building(-15,13,9,10,4.5); building(15,13,10,11,5.5);
building(0,-22,15,5,4.2,darkConcrete); building(0,22,15,5,4.2,darkConcrete);
for(let i=0;i<5;i++){box(-5+i*2.5,.7,-5,1.6,1.4,1.6,green);box(6+i*2.3,.55,5,1.4,1.1,1.4,darkConcrete);}
for(let i=0;i<7;i++){const x=-22+i*7;box(x,1.15,-1,.22,2.3,.22,metal);box(x,2.35,-1,.5,.12,.5,trim,false);}
for(let i=0;i<10;i++){const a=i*Math.PI*2/10;const x=Math.cos(a)*29,z=Math.sin(a)*29;box(x,1.2,z,.45,2.4,.45,metal);box(x,2.45,z,.7,.12,.7,trim,false);}
const skyHaze = new THREE.Mesh(new THREE.PlaneGeometry(100,18),new THREE.MeshBasicMaterial({color:0xc1c5b3,transparent:true,opacity:.18,side:THREE.DoubleSide}));skyHaze.position.set(0,11,-38);scene.add(skyHaze);

const weapon = new THREE.Group(); camera.add(weapon); scene.add(camera);
const gunMat=mat(0x202b2d,.4,.6), gunAccent=mat(0x65734f,.5,.2);
function gunPart(sx,sy,sz,x,y,z,material){const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);o.position.set(x,y,z);o.castShadow=true;weapon.add(o);return o;}
gunPart(.22,.2,.7,.34,-.28,-.72,gunMat);gunPart(.1,.1,.56,.34,-.18,-1.12,metal);gunPart(.12,.24,.2,.34,-.42,-.55,trim);gunPart(.08,.05,.28,.34,-.14,-.85,gunAccent);gunPart(.05,.06,.12,.34,-.07,-.92,trim);
const muzzleFlash=new THREE.Mesh(new THREE.SphereGeometry(.1,8,8),new THREE.MeshBasicMaterial({color:0xffd18a}));muzzleFlash.position.set(.34,-.18,-1.43);muzzleFlash.visible=false;weapon.add(muzzleFlash);
weapon.position.set(0,0,0);

const player={health:100,ammo:30,reserve:120,kills:0,shots:0,hits:0,round:1,reloading:false,alive:true,active:true,velocity:new THREE.Vector3(),onGround:true};
const bots=[]; const bullets=[]; const clock=new THREE.Clock(); const raycaster=new THREE.Raycaster();
const keys={}; let pointerLocked=false, elapsed=0, roundTime=120, recoil=0, bob=0, shotCooldown=0, toastTimeout;
const $=id=>document.getElementById(id);
const startScreen=$('start-screen'),pauseScreen=$('pause-screen'),roundScreen=$('round-screen'),gameoverScreen=$('gameover-screen');
const mapBounds=25;
function rand(min,max){return min+Math.random()*(max-min)}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),1700)}
function makeBot(index){
 const group=new THREE.Group(); const bodyMat=mat(index%2?0x667b54:0x8b7659,.82), vestMat=mat(0x303c38), skin=mat(0x9b8269), black=mat(0x182326);
 const torso=new THREE.Mesh(new THREE.BoxGeometry(.62,.78,.34),bodyMat);torso.position.y=1.12;torso.castShadow=true;group.add(torso);
 const vest=new THREE.Mesh(new THREE.BoxGeometry(.66,.48,.36),vestMat);vest.position.set(0,1.13,-.015);vest.castShadow=true;group.add(vest);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.2,12,10),skin);head.position.y=1.68;head.castShadow=true;group.add(head);
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.23,12,8,0,Math.PI*2,0,Math.PI*.58),black);helmet.position.y=1.75;helmet.castShadow=true;group.add(helmet);
 for(const side of [-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,.65,.25),black);leg.position.set(side*.17,.42,0);leg.castShadow=true;group.add(leg);const arm=new THREE.Mesh(new THREE.BoxGeometry(.18,.55,.2),bodyMat);arm.position.set(side*.4,1.12,-.05);arm.rotation.z=side*.12;arm.castShadow=true;group.add(arm);}
 const rifle=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.75),gunMat);rifle.position.set(.23,1.05,-.42);rifle.rotation.x=-.12;group.add(rifle);
 const hpbg=new THREE.Mesh(new THREE.PlaneGeometry(.72,.07),new THREE.MeshBasicMaterial({color:0x17211e,side:THREE.DoubleSide}));hpbg.position.y=2.12;group.add(hpbg);
 const hp=new THREE.Mesh(new THREE.PlaneGeometry(.68,.045),new THREE.MeshBasicMaterial({color:0xff755e,side:THREE.DoubleSide}));hp.position.set(0,2.12,.006);group.add(hp);
 const a=rand(0,Math.PI*2),r=rand(12,20);group.position.set(Math.cos(a)*r,0,Math.sin(a)*r);
 scene.add(group);const bot={group,hp,hpbg,health:100,maxHealth:100,fire:rand(.8,2.5),speed:rand(1.2,2),strafe:rand(-1,1),alive:true,hitFlash:0};bots.push(bot);return bot;
}
function spawnWave(){for(const b of bots){scene.remove(b.group)}bots.length=0;const count=Math.min(4+player.round*2,14);for(let i=0;i<count;i++)makeBot(i);$('wave').textContent=String(count).padStart(2,'0');$('radar-count').textContent=String(count).padStart(2,'0');$('round-label').textContent='ROUND '+String(player.round).padStart(2,'0');$('objective-sub').textContent=count+' hostile signatures detected';roundTime=Math.max(55,120-player.round*4);updateTimer();}
function updateTimer(){const m=Math.floor(roundTime/60),s=Math.floor(roundTime%60);$('round-timer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function updateHUD(){
 $('health').textContent=Math.max(0,Math.ceil(player.health));$('health-fill').style.width=Math.max(0,player.health)+'%';$('ammo').textContent=String(player.ammo).padStart(2,'0');$('reserve').textContent=player.reserve;$('kills').textContent=String(player.kills).padStart(2,'0');$('accuracy').textContent=(player.shots?Math.round(player.hits/player.shots*100):100)+'%';
 $('radar-count').textContent=String(bots.filter(b=>b.alive).length).padStart(2,'0');$('wave').textContent=String(bots.filter(b=>b.alive).length).padStart(2,'0');
 const bars=$('ammo-bars');bars.innerHTML='';for(let i=0;i<30;i++){const el=document.createElement('i');if(i>=player.ammo)el.className='empty';bars.append(el);}
}
function moveBlocked(x,z){if(Math.abs(x)>mapBounds||Math.abs(z)>mapBounds)return true;return colliders.some(c=>Math.abs(x-c.x)<c.hx+.42&&Math.abs(z-c.z)<c.hz+.42);}
function damagePlayer(amount){if(!player.alive)return;player.health=Math.max(0,player.health-amount);$('damage-flash').classList.add('show');setTimeout(()=>$('damage-flash').classList.remove('show'),100);updateHUD();if(player.health<=0){player.alive=false;player.active=false;document.exitPointerLock?.();$('gameover-copy').textContent='You neutralized '+player.kills+' hostiles across '+player.round+' rounds.';gameoverScreen.classList.remove('hidden');}}
function fireBot(bot,dt){bot.fire-=dt;if(bot.fire>0)return;bot.fire=rand(1.1,2.3);const target=camera.position.clone();const origin=bot.group.position.clone().add(new THREE.Vector3(0,1.25,0));const dir=target.sub(origin).normalize();const dist=origin.distanceTo(camera.position);if(dist<24){const spread=rand(.02,.12);if(Math.random()<Math.max(.12,.48-dist*.012)){damagePlayer(rand(5,10));}}}
function shoot(){
 if(!player.active||!pointerLocked||player.reloading||shotCooldown>0)return;
 if(player.ammo<=0){toast('MAGAZINE EMPTY // PRESS R');return;}
 player.ammo--;player.shots++;shotCooldown=.16;recoil=Math.min(recoil+.09,.24);muzzleFlash.visible=true;setTimeout(()=>muzzleFlash.visible=false,55);
 camera.updateMatrixWorld();raycaster.setFromCamera(new THREE.Vector2(0,0),camera);raycaster.far=65;
 const targets=[];for(const b of bots)if(b.alive)targets.push(...b.group.children.filter(o=>o.isMesh&&o.geometry.type!=='PlaneGeometry'));
 const hit=raycaster.intersectObjects(targets,false)[0];
 if(hit){const bot=bots.find(b=>b.alive&&b.group.children.includes(hit.object));if(bot){player.hits++;bot.health-=34;bot.hitFlash=.08;bot.hp.scale.x=Math.max(0,bot.health/bot.maxHealth);$('hit-marker').classList.add('show');setTimeout(()=>$('hit-marker').classList.remove('show'),100);if(bot.health<=0){bot.alive=false;scene.remove(bot.group);player.kills++;toast('HOSTILE NEUTRALIZED');}}}
 updateHUD();
}
function reload(){if(!player.active||player.reloading||player.ammo===30||player.reserve<=0)return;player.reloading=true;toast('RELOADING');setTimeout(()=>{const amount=Math.min(30-player.ammo,player.reserve);player.ammo+=amount;player.reserve-=amount;player.reloading=false;updateHUD();},1250);}
function togglePause(){if(!player.active||!player.alive)return;if(pointerLocked){document.exitPointerLock();}else{canvas.requestPointerLock?.();}}
function begin(){startScreen.classList.add('hidden');player.active=true;spawnWave();canvas.requestPointerLock?.();toast('OPERATION LIVE // GOOD HUNT');}
$('deploy-btn').addEventListener('click',begin);$('resume-btn').addEventListener('click',()=>canvas.requestPointerLock?.());
$('next-round-btn').addEventListener('click',()=>{roundScreen.classList.add('hidden');player.round++;player.health=Math.min(100,player.health+18);player.ammo=30;player.reserve+=30;player.active=true;spawnWave();updateHUD();canvas.requestPointerLock?.();});
$('retry-btn').addEventListener('click',()=>{gameoverScreen.classList.add('hidden');player.health=100;player.ammo=30;player.reserve=120;player.kills=0;player.shots=0;player.hits=0;player.round=1;player.alive=true;player.active=true;camera.position.set(0,1.72,8);spawnWave();updateHUD();canvas.requestPointerLock?.();});
canvas.addEventListener('click',()=>{if(!pointerLocked&&player.active&&player.alive)canvas.requestPointerLock?.();else shoot();});
document.addEventListener('pointerlockchange',()=>{pointerLocked=document.pointerLockElement===canvas;if(!pointerLocked&&player.active&&player.alive&&!startScreen.classList.contains('hidden'))return;if(!pointerLocked&&player.active&&player.alive){pauseScreen.classList.remove('hidden');}else{pauseScreen.classList.add('hidden');}});
document.addEventListener('mousemove',e=>{if(!pointerLocked||!player.active)return;camera.rotation.order='YXZ';camera.rotation.y-=e.movementX*.0022;camera.rotation.x-=e.movementY*.0022;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x,-1.35,1.35);});
document.addEventListener('mousedown',e=>{if(e.button===0)shoot();});document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyR')reload();if(e.code==='Escape'&&pointerLocked){};});document.addEventListener('keyup',e=>keys[e.code]=false);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const ratio=Math.min(window.devicePixelRatio||1,1.15);renderer.setPixelRatio(ratio);renderer.setSize(Math.floor(innerWidth*ratio),Math.floor(innerHeight*ratio),false);});
let contextLost=false;
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;player.active=false;pauseScreen.classList.add('hidden');toast('GRAPHICS PAUSED // RESTORING WEBGL');});
canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;renderer.setSize(Math.floor(innerWidth*Math.min(window.devicePixelRatio||1,1.15)),Math.floor(innerHeight*Math.min(window.devicePixelRatio||1,1.15)),false);toast('GRAPHICS RESTORED // CLICK DEPLOY TO RESUME');});
function updateBots(dt){
 for(const b of bots){if(!b.alive)continue;const p=b.group.position;const toPlayer=new THREE.Vector3(camera.position.x-p.x,0,camera.position.z-p.z);const dist=toPlayer.length();if(dist>5){toPlayer.normalize();const side=new THREE.Vector3(-toPlayer.z,0,toPlayer.x).multiplyScalar(Math.sin(elapsed*1.3+b.group.id)*.38);const move=toPlayer.multiplyScalar(b.speed*dt).add(side.multiplyScalar(dt));const nx=p.x+move.x,nz=p.z+move.z;if(!moveBlocked(nx,p.z))p.x=nx;if(!moveBlocked(p.x,nz))p.z=nz;}b.group.lookAt(camera.position.x,0,camera.position.z);fireBot(b,dt);}
}
function updateRadar(){const root=$('radar-dots');root.innerHTML='';for(const b of bots){if(!b.alive)continue;const dx=(b.group.position.x-camera.position.x)/55*130,dz=(b.group.position.z-camera.position.z)/55*130;const dot=document.createElement('i');dot.className='radar-dot';dot.style.left='calc(50% + '+THREE.MathUtils.clamp(dx,-62,62)+'px)';dot.style.top='calc(50% + '+THREE.MathUtils.clamp(dz,-62,62)+'px)';root.append(dot);}}
function update(dt){
 elapsed+=dt;shotCooldown=Math.max(0,shotCooldown-dt);recoil=Math.max(0,recoil-dt*.55);
 if(player.active&&player.alive){
  roundTime-=dt;if(roundTime<=0){roundTime=0;damagePlayer(12);roundTime=12;}updateTimer();
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
  const move=new THREE.Vector3();if(keys.KeyW)move.add(forward);if(keys.KeyS)move.sub(forward);if(keys.KeyD)move.add(right);if(keys.KeyA)move.sub(right);
  if(move.lengthSq()>0){move.normalize();const speed=(keys.ShiftLeft||keys.ShiftRight)?8.5:5.2;const nx=camera.position.x+move.x*speed*dt,nz=camera.position.z+move.z*speed*dt;if(!moveBlocked(nx,camera.position.z))camera.position.x=nx;if(!moveBlocked(camera.position.x,nz))camera.position.z=nz;bob+=dt*speed;}
  if(keys.Space&&player.onGround){player.velocity.y=5.1;player.onGround=false;}player.velocity.y-=14*dt;camera.position.y+=player.velocity.y*dt;if(camera.position.y<=1.72){camera.position.y=1.72;player.velocity.y=0;player.onGround=true;}
  weapon.position.y=Math.sin(bob*1.7)*.012-recoil*.5;weapon.position.x=Math.cos(bob*.85)*.008;weapon.rotation.x=-recoil;
  updateBots(dt);
  if(bots.every(b=>!b.alive)){player.active=false;document.exitPointerLock?.();$('round-eyebrow').textContent='SECTOR SECURED';$('round-title').textContent='ROUND COMPLETE';$('round-copy').textContent=player.kills+' hostile units neutralized. Prepare for the next wave.';roundScreen.classList.remove('hidden');}
  if(Math.floor(elapsed*3)%2===0)updateRadar();
 }
 $('clock').textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(Math.floor(elapsed%60)).padStart(2,'0');
}
function animate(){requestAnimationFrame(animate);if(contextLost)return;const dt=Math.min(clock.getDelta(),.04);update(dt);try{renderer.render(scene,camera);}catch(error){console.error('Render failed:',error);}}
spawnWave();updateHUD();animate();
}
