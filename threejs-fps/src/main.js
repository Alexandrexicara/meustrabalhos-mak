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
const lowPowerDevice = window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 4) <= 4;
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
 renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 0.9 : 1.15));
 renderer.setSize(innerWidth, innerHeight, false);
 renderer.domElement.style.width = '100%';
 renderer.domElement.style.height = '100%';
renderer.shadowMap.enabled = !lowPowerDevice;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

scene.add(new THREE.HemisphereLight(0xc9e2e4, 0x303a35, 2.0));
const sun = new THREE.DirectionalLight(0xffe4bd, 2.8);
sun.position.set(-12, 24, 10); sun.castShadow = !lowPowerDevice;
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
const colliders=[];const destructibleCrates=[];const crateDebris=[];
function box(x,y,z,sx,sy,sz,material,collide=true){
 const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;world.add(m);
 if(collide)colliders.push({x,z,hx:sx/2,hz:sz/2,top:y+sy/2});return m;
}
function building(x,z,w,d,h,material=concrete){
 // House-like silhouette: walls, pitched roof, door, window frames and visible glass.
 box(x,h/2,z,w,h,d,material);
 const roofMat=mat(0x493b32,.94),roofA=new THREE.Mesh(new THREE.BoxGeometry(w*.56,.22,d+.65),roofMat),roofB=new THREE.Mesh(new THREE.BoxGeometry(w*.56,.22,d+.65),roofMat);
 roofA.position.set(x-w*.25,h+.34,z);roofB.position.set(x+w*.25,h+.34,z);roofA.rotation.z=-.48;roofB.rotation.z=.48;world.add(roofA,roofB);roofA.castShadow=roofB.castShadow=true;
 const door=box(x-w*.22,.98,z-d/2-.04,.85,1.95,.12,trim,false);door.material=mat(0x30271f);
 for(let side of [-1,1]){const wx=x+side*w*.24;box(wx,h*.57,z-d/2-.075,w*.19,h*.23,.08,glass,false);box(wx,h*.57,z-d/2-.13,.09,h*.29,.06,trim,false);box(wx,h*.57,z-d/2-.13,w*.22,.07,.06,trim,false);}
 box(x,h+.03,z,w+.12,.12,d+.12,trim,false);
}
let crateWoodTexture=null;
function addCrate(x,z,size=1.35){
 if(!crateWoodTexture){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#765034';ctx.fillRect(0,0,256,256);
  for(let y=0;y<256;y+=32){ctx.fillStyle=y%64?'#805b38':'#67452d';ctx.fillRect(0,y,256,29);ctx.strokeStyle='rgba(35,22,12,.5)';ctx.lineWidth=2;ctx.strokeRect(0,y,256,29);for(let n=0;n<24;n++){const xx=Math.random()*256,yy=y+Math.random()*28;ctx.strokeStyle='rgba(211,164,105,'+(Math.random()*.22)+')';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx+rand(8,42),yy+(Math.random()-.5)*3);ctx.stroke();}}
  crateWoodTexture=new THREE.CanvasTexture(canvas);crateWoodTexture.colorSpace=THREE.SRGBColorSpace;crateWoodTexture.wrapS=crateWoodTexture.wrapT=THREE.RepeatWrapping;
 }
 const group=new THREE.Group();group.position.set(x,0,z);group.name='destructible-wooden-cover';
 const wood=new THREE.MeshStandardMaterial({map:crateWoodTexture,roughness:.94}),edge=mat(0x382b20);
 const add=(geo,material,pos)=>{const m=new THREE.Mesh(geo,material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 add(new THREE.BoxGeometry(size,size*.96,size),wood,[0,size*.48,0]);
 for(let k=-1;k<=1;k++){add(new THREE.BoxGeometry(.075,size*.9,.055),edge,[k*size*.29,size*.48,-size*.505]);add(new THREE.BoxGeometry(size*.9,size*.9,.055),edge,[0,size*.48,k*size*.29]);}
 const brace=add(new THREE.BoxGeometry(size*.82,.09,.06),edge,[0,size*.48,-size*.54]);brace.rotation.z=.62;
 world.add(group);
 const collider={x,z,hx:size*.58,hz:size*.58,top:size*.96,crate:group};colliders.push(collider);
 const record={group,collider,x,z,size,health:100,maxHealth:100,alive:true,marks:[]};group.userData.destructible=record;destructibleCrates.push(record);return group;
}
function markCrateImpact(crate,point,normal){
 const local=crate.group.worldToLocal(point.clone()),n=normal.clone().normalize(),mark=new THREE.Group();mark.position.copy(local).addScaledVector(n,.012);mark.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);crate.group.add(mark);
 const dark=new THREE.MeshBasicMaterial({color:0x17130f,transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide});mark.add(new THREE.Mesh(new THREE.CircleGeometry(.035+Math.random()*.018,8),dark));
 for(let k=0;k<3;k++){const splinter=new THREE.Mesh(new THREE.BoxGeometry(.012,.09+Math.random()*.08,.008),new THREE.MeshStandardMaterial({color:k%2?0x4c2f1d:0xa47b4b,roughness:1}));splinter.position.set((Math.random()-.5)*.1,(Math.random()-.5)*.1,.004);splinter.rotation.z=Math.random()*Math.PI;splinter.castShadow=true;mark.add(splinter);}crate.marks.push(mark);
}
function destroyCrate(crate){
 if(!crate.alive)return;crate.alive=false;world.remove(crate.group);const ci=colliders.indexOf(crate.collider);if(ci>=0)colliders.splice(ci,1);
 for(let i=0;i<11;i++){const size=rand(.12,.34),piece=new THREE.Mesh(new THREE.BoxGeometry(size,rand(.08,.2),rand(.08,.22)),new THREE.MeshStandardMaterial({color:i%2?0x765034:0x9a7047,roughness:.96}));piece.position.set(crate.x+rand(-.6,.6),rand(.25,.95),crate.z+rand(-.6,.6));piece.rotation.set(rand(-1,1),rand(0,6),rand(-1,1));piece.castShadow=true;world.add(piece);crateDebris.push({mesh:piece,velocity:new THREE.Vector3(rand(-3,3),rand(1.5,5),rand(-3,3)),spin:new THREE.Vector3(rand(-5,5),rand(-5,5),rand(-5,5)),life:rand(3,5)});}
 const dust=new THREE.Mesh(new THREE.SphereGeometry(.5,10,8),new THREE.MeshBasicMaterial({color:0x9b7957,transparent:true,opacity:.35,depthWrite:false}));dust.position.set(crate.x,.5,crate.z);world.add(dust);explosions.push({mesh:dust,age:0});
}
function damageCrate(crate,amount,point,normal){
 if(!crate.alive)return;crate.health=Math.max(0,crate.health-amount);if(point&&normal)markCrateImpact(crate,point,normal);if(crate.health<=0)destroyCrate(crate);
}
function damageCratesInBlast(center,radius,damage){
 for(const crate of destructibleCrates){if(!crate.alive)continue;const d=Math.hypot(crate.x-center.x,crate.z-center.z);if(d<radius)damageCrate(crate,damage*(1-d/radius));}
}
const combatVehicles=[];const tankShells=[];const surfaceImpacts=[];
function addTank(x,z){
 const tank=new THREE.Group(),olive=mat(0x46513b,.82,.25),dark=mat(0x202722,.9,.15),steel=mat(0x343b36,.5,.55);
 const hull=new THREE.Mesh(new THREE.BoxGeometry(4.2,1.05,2.55),olive);hull.position.y=.95;hull.castShadow=true;hull.receiveShadow=true;tank.add(hull);
 const glacis=new THREE.Mesh(new THREE.BoxGeometry(3.7,.48,2.5),olive);glacis.position.set(0,1.55,.05);glacis.rotation.x=-.12;tank.add(glacis);
 const wheels=[];
 for(const side of [-1,1]){const track=new THREE.Mesh(new THREE.BoxGeometry(4.55,.72,.48),dark);track.position.set(0,.55,side*1.42);tank.add(track);for(let n=0;n<6;n++){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.18,16),steel);wheel.rotation.x=Math.PI/2;wheel.position.set(-1.65+n*.66,.55,side*1.69);tank.add(wheel);wheels.push(wheel);}}
 const turret=new THREE.Group();turret.position.set(-.15,1.8,0);tank.add(turret);
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.98,1.15,.62,8),olive);body.scale.z=.82;body.castShadow=true;turret.add(body);
 const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,2.65,12),steel);barrel.rotation.z=Math.PI/2;barrel.position.set(1.45,.06,0);turret.add(barrel);
 const muzzle=new THREE.Mesh(new THREE.TorusGeometry(.14,.035,8,16),dark);muzzle.position.set(2.77,.06,0);muzzle.rotation.y=Math.PI/2;turret.add(muzzle);
 const mantlet=new THREE.Mesh(new THREE.SphereGeometry(.28,12,10),olive);mantlet.position.set(.55,.05,0);turret.add(mantlet);
 const crew=makeBot(40+combatVehicles.length);bots.pop();scene.remove(crew.group);crew.ally=false;crew.hp.visible=false;crew.hpbg.visible=false;crew.group.scale.setScalar(.88);crew.group.position.set(0,2.12,0);tank.add(crew.group);if(soldierTemplate)attachSoldier(crew);
 tank.position.set(x,0,z);tank.rotation.y=Math.PI;world.add(tank);
 const collider={x,z,hx:2.55,hz:1.85,top:2.1};colliders.push(collider);
 combatVehicles.push({tank,turret,barrel,wheels,crew,collider,center:new THREE.Vector3(x,0,z),phase:Math.random()*Math.PI*2,cannonCooldown:rand(2.5,4.5),fire:rand(2,4)});
}
function createSurfaceImpact(point,normal){
 if(!point||!normal||Math.abs(normal.y)>.72)return;
 const mark=new THREE.Group();mark.position.copy(point).addScaledVector(normal,.014);mark.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal.clone().normalize());
 const soot=new THREE.Mesh(new THREE.CircleGeometry(rand(.045,.085),10),new THREE.MeshBasicMaterial({color:0x171713,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));mark.add(soot);
 for(let i=0;i<3;i++){const scratch=new THREE.Mesh(new THREE.BoxGeometry(.012,rand(.07,.16),.006),new THREE.MeshBasicMaterial({color:i===0?0x26231d:0x4b463b,side:THREE.DoubleSide}));scratch.position.set(rand(-.09,.09),rand(-.08,.08),.003);scratch.rotation.z=rand(-1.1,1.1);mark.add(scratch);}
 world.add(mark);surfaceImpacts.push(mark);if(surfaceImpacts.length>220){const old=surfaceImpacts.shift();world.remove(old);old.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});}
}
function detonateTankShell(shell,point,normal=null){
 const center=point.clone();if(normal)createSurfaceImpact(center,normal);
 const blast=new THREE.Mesh(new THREE.SphereGeometry(1.25,18,14),new THREE.MeshBasicMaterial({color:0xff8a32,transparent:true,opacity:.92,depthWrite:false,blending:THREE.AdditiveBlending}));blast.position.copy(center);scene.add(blast);explosions.push({mesh:blast,age:0});
 const light=new THREE.PointLight(0xff8a32,7,17);light.position.copy(center);scene.add(light);setTimeout(()=>scene.remove(light),380);
 damageCratesInBlast(center,7,230);
 const playerDistance=camera.position.distanceTo(center);if(playerDistance<6)damagePlayer(Math.max(8,Math.round(34*(1-playerDistance/7))));
 for(const bot of bots){if(!bot.alive)continue;const d=bot.group.position.distanceTo(center);if(d<5.5)damageBot(bot,Math.round(130*(1-d/5.5)),center,'TANK');}
 playSound('explosion');scene.remove(shell.mesh);shell.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
}
function updateCombatVehicles(dt){
 for(const v of combatVehicles){
  if(player.active)v.phase+=dt*.22;const oldX=v.tank.position.x,oldZ=v.tank.position.z;
  if(player.active){v.tank.position.x=v.center.x+Math.cos(v.phase)*2.7;v.tank.position.z=v.center.z+Math.sin(v.phase)*1.9;}
  const dx=v.tank.position.x-oldX,dz=v.tank.position.z-oldZ;if(Math.hypot(dx,dz)>.0001)v.tank.rotation.y=Math.atan2(-dx,-dz);
  v.collider.x=v.tank.position.x;v.collider.z=v.tank.position.z;
  for(const wheel of v.wheels)wheel.rotation.z+=dt*2.8;
  const toPlayer=camera.position.clone().sub(v.tank.position),local=toPlayer.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-v.tank.rotation.y);v.turret.rotation.y=Math.atan2(-local.z,local.x);
  if(v.crew?.mixer)v.crew.mixer.update(dt);if(v.crew?.alive&&player.active){const crewDx=camera.position.x-v.tank.position.x,crewDz=camera.position.z-v.tank.position.z;v.crew.group.rotation.y=Math.atan2(-crewDx,-crewDz)-v.tank.rotation.y;updateHeldRifle(v.crew);fireBot(v.crew,dt);}
  v.cannonCooldown-=dt;
  if(v.cannonCooldown<=0&&player.active&&player.alive){v.cannonCooldown=rand(5.2,7.8);v.tank.updateMatrixWorld(true);v.turret.updateMatrixWorld(true);const start=v.turret.localToWorld(new THREE.Vector3(2.9,.06,0));const direction=new THREE.Vector3(1,0,0).applyQuaternion(v.turret.getWorldQuaternion(new THREE.Quaternion())).normalize();const shellMesh=new THREE.Group();const core=new THREE.Mesh(new THREE.SphereGeometry(.16,12,10),new THREE.MeshBasicMaterial({color:0xffc16a,emissive:0xff5a16}));shellMesh.add(core);const tail=new THREE.Mesh(new THREE.CylinderGeometry(.055,.09,.42,8),new THREE.MeshBasicMaterial({color:0xff7b26,transparent:true,opacity:.8}));tail.rotation.x=Math.PI/2;tail.position.z=.24;shellMesh.add(tail);shellMesh.position.copy(start);shellMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction);scene.add(shellMesh);tankShells.push({mesh:shellMesh,velocity:direction.multiplyScalar(30).add(new THREE.Vector3(0,3.2,0)),life:3.5});playSound('explosion');}
 }
 for(let i=tankShells.length-1;i>=0;i--){const shell=tankShells[i],previous=shell.mesh.position.clone();shell.velocity.y-=7.8*dt;const step=shell.velocity.clone().multiplyScalar(dt),distance=step.length();shell.mesh.position.add(step);shell.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),shell.velocity.clone().normalize());shell.life-=dt;if(distance>0){raycaster.set(previous,step.clone().normalize());raycaster.far=distance;const hit=raycaster.intersectObjects(world.children,true).find(h=>h.object.isMesh&&h.object.visible);if(hit&&hit.distance<=distance+.08){detonateTankShell(shell,hit.point,hit.face?hit.face.normal.clone().transformDirection(hit.object.matrixWorld):null);tankShells.splice(i,1);continue;}}if(shell.mesh.position.distanceTo(camera.position)<.72){detonateTankShell(shell,shell.mesh.position);tankShells.splice(i,1);continue;}if(shell.life<=0||shell.mesh.position.y<.12){detonateTankShell(shell,shell.mesh.position);tankShells.splice(i,1);}}
}
const mapThemes=[
 {name:'OLD TOWN // URBAN WARZONE',sky:0x89999a,fog:0x89999a,ground:0x777363,wall:0x66716c,accent:0x687d59},
 {name:'RED DUNE // DESERT OUTPOST',sky:0xc69a70,fog:0xc69a70,ground:0xb69a70,wall:0x9b7854,accent:0x786044},
 {name:'IRON YARD // INDUSTRIAL COMPLEX',sky:0x65777d,fog:0x65777d,ground:0x4e5655,wall:0x414b4c,accent:0x59684a},
 {name:'NIGHTFALL // FORWARD BASE',sky:0x293b4a,fog:0x293b4a,ground:0x353d40,wall:0x37413d,accent:0x52634d},{name:'STEEL FANG // CLOSED HANGAR',sky:0x46535a,fog:0x46535a,ground:0x343b3e,wall:0x515b5e,accent:0x8a744c},{name:'BLACKWOOD // DEEP FOREST',sky:0x34483b,fog:0x34483b,ground:0x34402f,wall:0x4b5140,accent:0x526c43},{name:'HIGH PASS // MOUNTAIN RIDGE',sky:0x81909a,fog:0x81909a,ground:0x777b78,wall:0x656c70,accent:0x7b806b}
];
let currentMap=-1;
function buildMap(round){
 const requestedPhase=Number(new URLSearchParams(location.search).get('phase'));
 const previewPhase=Number.isInteger(requestedPhase)&&requestedPhase>=1&&requestedPhase<=mapThemes.length?requestedPhase-1:-1;
 const idx=previewPhase>=0?previewPhase:(round-1)%mapThemes.length,theme=mapThemes[idx];currentMap=idx;
 world.clear();
 colliders.length=0;destructibleCrates.length=0;crateDebris.length=0;combatVehicles.length=0;
 scene.background=new THREE.Color(theme.sky);scene.fog=new THREE.Fog(theme.fog,34,132);
 const floorCanvas=document.createElement('canvas');floorCanvas.width=floorCanvas.height=512;
 const ctx=floorCanvas.getContext('2d');ctx.fillStyle='#'+theme.ground.toString(16).padStart(6,'0');ctx.fillRect(0,0,512,512);
 for(let i=0;i<22000;i++){const v=Math.random(),r=Math.random()*2.8+.3;ctx.fillStyle=v>.5?'rgba(28,29,25,.18)':'rgba(230,211,174,.12)';ctx.beginPath();ctx.ellipse(Math.random()*512,Math.random()*512,r,r*.6,Math.random()*3.14,0,Math.PI*2);ctx.fill();}
 for(let i=0;i<70;i++){ctx.strokeStyle='rgba(30,34,31,.24)';ctx.lineWidth=Math.random()*2+.5;ctx.beginPath();let x=Math.random()*512,y=Math.random()*512;ctx.moveTo(x,y);for(let j=0;j<4;j++){x+=(Math.random()-.5)*35;y+=(Math.random()-.5)*35;ctx.lineTo(x,y);}ctx.stroke();}
 const tex=new THREE.CanvasTexture(floorCanvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(14,14);tex.colorSpace=THREE.SRGBColorSpace;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshStandardMaterial({map:tex,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.09;ground.receiveShadow=true;world.add(ground);
 const wall=mat(theme.wall),accent=mat(theme.accent),debris=mat(idx===1?0x9b7954:0x5c625d),steel=mat(0x303b3d,.42,.55);
 // Main combat lanes and map-specific silhouettes.
 if(idx===0){
  building(-15,-13,11,12,5.8,wall);building(15,-14,12,11,6.5,wall);building(-15,14,10,11,4.8,wall);building(15,14,11,12,5.7,wall);
  building(0,-24,17,5,4.3,darkConcrete);building(0,24,17,5,4.3,darkConcrete);
  for(let i=0;i<7;i++){addCrate(-7+i*2.3,-5,1.35);addCrate(6+i*2.2,6,1.25);}
  addTank(-8,17);
 }else if(idx===1){
  // Desert outpost: perimeter walls, watchtowers, sand berms and fuel stores.
  for(let side of [-1,1]){box(side*19,1.2,0,1.1,2.4,38,wall);box(side*11,.65,-15,8,1.3,1.2,accent);box(side*11,.65,15,8,1.3,1.2,accent);}
  for(let x of [-18,18])for(let z of [-18,18]){box(x,3,z,2.8,6,2.8,wall);box(x,6.2,z,4,.4,4,trim);}
  building(0,-18,13,7,4.2,wall);building(-8,9,8,7,3.4,accent);building(9,10,7,8,3.8,wall);
   for(let i=0;i<8;i++)addCrate(-17+(i%4)*2.2,2+Math.floor(i/4)*2,1.3);addTank(12,-2);
  for(let i=0;i<9;i++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.8,2.3),1),debris);rock.position.set(rand(-25,25),rand(.3,1),rand(-25,25));rock.scale.y=.55;world.add(rock);}
 }else if(idx===2){
  // Industrial yard: hangar, tanks, loading bays and pipe racks.
  building(0,-20,23,9,7.5,wall);building(-17,4,9,17,5.5,darkConcrete);building(17,5,10,17,5.8,wall);
  for(let x of [-11,-5,5,11]){const tank=new THREE.Mesh(new THREE.CylinderGeometry(2,2,6,20),steel);tank.position.set(x,3,13);tank.castShadow=true;world.add(tank);const cap=new THREE.Mesh(new THREE.CylinderGeometry(2,2,.25,20),accent);cap.position.set(x,6.1,13);world.add(cap);}
  for(let i=0;i<8;i++){addCrate(-20+i*5,-4,1.45);}
   addTank(10,17);
 }else if(idx===3){building(-13,-18,10,12,5.4,wall);building(13,-18,10,12,5.4,wall);building(-13,17,12,10,4.8,darkConcrete);building(13,17,12,10,4.8,darkConcrete);addTank(0,22);
 }else if(idx===4){building(0,-18,31,3,8,wall);building(-16,0,3,38,8,wall);building(16,0,3,38,8,wall);box(0,8,0,34,1.1,42,steel);for(let z=-18;z<=18;z+=9)box(0,7.2,z,33,.35,.35,trim);building(-8,-12,9,8,4.2,darkConcrete);building(9,12,10,8,4.5,wall);for(let x of [-10,-4,4,10])addCrate(x,-2,1.5);
 }else if(idx===5){for(let i=0;i<95;i++){const x=rand(-34,34),z=rand(-34,34);if(Math.hypot(x,z-8)<7)continue;const t=new THREE.Mesh(new THREE.CylinderGeometry(.22,.38,7,7),mat(0x44382b));t.position.set(x,2.5,z);world.add(t);const c=new THREE.Mesh(new THREE.ConeGeometry(2.4,5,7),mat(0x304b32));c.position.set(x,6.2,z);world.add(c);}building(-18,-20,9,7,3.8,wall);building(18,19,8,7,3.5,accent);
 }else{for(let i=0;i<48;i++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(rand(2,5),1),debris);rock.position.set(rand(-36,36),rand(.5,2.4),rand(-36,36));rock.scale.set(1,1.4,1.25);world.add(rock);}building(-20,-17,10,9,4.5,wall);building(20,-17,10,9,4.5,wall);building(0,-27,17,7,5,darkConcrete);addTank(-11,17);}
 // Large horizon silhouettes make each operation feel like a real, connected battlefield.
 const horizonMat=mat(idx===5?0x263d2b:idx===1?0x8b7658:idx===6?0x59636a:0x3b4948,.98);
 const farMat=mat(idx===5?0x1d3426:idx===1?0xa68b63:idx===6?0x68747a:0x59645d,1);
 for(let side=-1;side<=1;side+=2){
  for(let n=0;n<5;n++){
   const z=-54+n*26,x=side*(49+rand(0,5)),h=rand(9,18),w=rand(7,13);
   if(idx===5){
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.32,.58,h*.55,7),horizonMat);trunk.position.set(x,h*.25,z);world.add(trunk);
    for(let tier=0;tier<3;tier++){const crown=new THREE.Mesh(new THREE.ConeGeometry(w*(.43-tier*.08),h*.42,7),farMat);crown.position.set(x,h*.48+tier*h*.16,z);crown.castShadow=false;world.add(crown);}
   }else if(idx===6){
    const peak=new THREE.Mesh(new THREE.ConeGeometry(w,h,7),farMat);peak.position.set(x,h/2-1,z);peak.scale.z=1.6;world.add(peak);
    const snow=new THREE.Mesh(new THREE.ConeGeometry(w*.34,h*.38,7),mat(0xb7c0c0));snow.position.set(x,h*.79-1,z);world.add(snow);
   }else if(idx===1){
    const mesa=new THREE.Mesh(new THREE.CylinderGeometry(w*.72,w,h*.55,6),farMat);mesa.position.set(x,h*.18,z);world.add(mesa);
   }else{
    const silhouette=new THREE.Mesh(new THREE.BoxGeometry(w,h,rand(5,12)),horizonMat);silhouette.position.set(x,h/2-1,z);world.add(silhouette);
    if(idx===2||idx===4){const stack=new THREE.Mesh(new THREE.CylinderGeometry(.45,.65,h+8,8),steel);stack.position.set(x+w*.32,(h+8)/2-1,z);world.add(stack);}
   }
  }
 }
 // Distinctive landmarks visible beyond the playable perimeter for every phase.
 if(idx===0){for(let i=0;i<7;i++){const tower=box(-48+i*16,rand(5,10),-62,5,rand(10,20),5,horizonMat,false);tower.rotation.y=rand(-.2,.2);}}
 if(idx===1){for(let i=0;i<4;i++){const mast=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,15,8),steel);mast.position.set(-34+i*22,7.5,-48);world.add(mast);}}
 if(idx===2){for(let i=0;i<3;i++){const crane=new THREE.Group();const post=new THREE.Mesh(new THREE.BoxGeometry(.45,17,.45),steel);post.position.y=8.5;crane.add(post);const arm=new THREE.Mesh(new THREE.BoxGeometry(12,.35,.35),accent);arm.position.set(5,16,0);crane.add(arm);crane.position.set(-42+i*42,0,-54);world.add(crane);}}
 if(idx===3){for(let i=0;i<5;i++){const tent=new THREE.Mesh(new THREE.ConeGeometry(4,5,4),accent);tent.position.set(-34+i*17,2.5,-48);tent.rotation.y=Math.PI/4;world.add(tent);}}
 if(idx===4){for(let i=0;i<3;i++){const hangar=box(-34+i*34,7,-55,17,14,9,horizonMat,false);const door=box(-34+i*34,4,-50,9,8,.2,trim,false);}}
 if(idx===5){for(let i=0;i<18;i++){const x=rand(-62,62),z=rand(-65,-43),tree=new THREE.Mesh(new THREE.ConeGeometry(rand(3,5),rand(9,17),7),farMat);tree.position.set(x,tree.geometry.parameters.height/2,z);world.add(tree);}}
 if(idx===6){for(let i=0;i<4;i++){const ridge=new THREE.Mesh(new THREE.ConeGeometry(15,rand(16,25),5),farMat);ridge.position.set(-45+i*30,8,-60);ridge.scale.z=1.8;world.add(ridge);}}
 for(let i=0;i<180;i++){const x=rand(-36,36),z=rand(-36,36);if(Math.abs(x)<4&&z>0&&z<12)continue;const r=rand(.12,.55);const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),debris);rock.position.set(x,-.02+r*.25,z);rock.rotation.set(rand(0,3),rand(0,3),rand(0,3));world.add(rock);}
 for(let i=0;i<6;i++){const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.38,.42,1.05,16),mat(idx===1?0x75603f:0x59483b));barrel.position.set(rand(-22,22),.52,rand(-22,22));barrel.castShadow=true;world.add(barrel);}
  // Extra waist-high wooden cover positions, spread through each combat lane.
  for(const [x,z] of [[-22,-8],[22,-7],[-19,10],[19,11],[-5,18],[5,-13]])addCrate(x,z,1.5);
 for(let i=0;i<10;i++){const x=-22+i*4.9;box(x,1.15,-1,.2,2.3,.2,steel);box(x,2.35,-1,.5,.12,.5,trim,false);}
 // Accessible flat rooftop combat position with a fixed metal ladder on its east wall.
 const roofX=0,roofZ=-17,roofTop=4.6,roofW=13,roofD=11;
 box(roofX,roofTop-.18,roofZ,roofW,.36,roofD,wall,true);
 box(roofX,roofTop+.08,roofZ,roofW+.25,.16,roofD+.25,trim,false);
 for(const side of [-1,1]){box(roofX+side*(roofW/2-.12),roofTop+.48,roofZ,.18,.8,roofD,trim,false);}
 const ladderMat=mat(0x344348,.38,.72),ladderX=roofW/2+.45,ladderZ=roofZ;
 for(const side of [-1,1]){const rail=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,roofTop+.5,10),ladderMat);rail.position.set(ladderX+side*.48,(roofTop+.5)/2,ladderZ);rail.castShadow=true;world.add(rail);}
 for(let rung=.28;rung<roofTop-.05;rung+=.38){const rungMesh=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.96,10),ladderMat);rungMesh.rotation.z=Math.PI/2;rungMesh.position.set(ladderX,rung,ladderZ);rungMesh.castShadow=true;world.add(rungMesh);}
 const ladderSign=new THREE.Mesh(new THREE.BoxGeometry(1.35,.42,.08),mat(0x172326));ladderSign.position.set(ladderX,1.25,ladderZ-.56);world.add(ladderSign);
}
buildMap(1);
const skyHaze = new THREE.Mesh(new THREE.PlaneGeometry(100,18),new THREE.MeshBasicMaterial({color:0xc1c5b3,transparent:true,opacity:.18,side:THREE.DoubleSide}));skyHaze.position.set(0,11,-38);world.add(skyHaze);
// Distant patrol aircraft: a small, low-cost silhouette that crosses the skyline.
// Combat helicopter with recognizable cockpit, tail boom, tail rotor, landing skids and spinning main rotor.
const patrolAircraft=new THREE.Group(),heliBody=mat(0x46513c,.72,.25),heliDark=mat(0x202b2d,.38,.55),heliGlass=mat(0x172d38,.18,.65);let helicopterDestroyed=false;
const cabin=new THREE.Mesh(new THREE.SphereGeometry(1,18,14),heliBody);cabin.scale.set(1.55,.72,.82);patrolAircraft.add(cabin);
const nose=new THREE.Mesh(new THREE.SphereGeometry(.7,16,12),heliBody);nose.scale.set(1.05,.62,.8);nose.position.set(1.12,-.08,0);patrolAircraft.add(nose);
const windshield=new THREE.Mesh(new THREE.SphereGeometry(.57,14,10),heliGlass);windshield.scale.set(.28,.55,.72);windshield.position.set(1.68,.12,0);patrolAircraft.add(windshield);
const tailBoom=new THREE.Mesh(new THREE.CylinderGeometry(.16,.28,3.7,12),heliBody);tailBoom.rotation.z=-Math.PI/2;tailBoom.position.set(-2.35,.2,0);patrolAircraft.add(tailBoom);
const tailFin=new THREE.Mesh(new THREE.BoxGeometry(.75,.9,.12),heliBody);tailFin.position.set(-4.05,.35,0);patrolAircraft.add(tailFin);
const tailRotor=new THREE.Group();tailRotor.position.set(-4.1,.35,.18);for(let i=0;i<4;i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(.08,.92,.07),heliDark);blade.rotation.z=i*Math.PI/2;tailRotor.add(blade);}patrolAircraft.add(tailRotor);
const mast=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.55,10),heliDark);mast.position.y=.85;patrolAircraft.add(mast);
const mainRotor=new THREE.Group();mainRotor.position.y=1.12;for(let i=0;i<4;i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(5.8,.055,.16),heliDark);blade.rotation.y=i*Math.PI/2;mainRotor.add(blade);}patrolAircraft.add(mainRotor);
for(const side of [-1,1]){const skid=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,3.5,8),heliDark);skid.rotation.z=Math.PI/2;skid.position.set(0,-.95,side*.72);patrolAircraft.add(skid);const strut=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.85,8),heliDark);strut.position.set(.45,-.55,side*.72);patrolAircraft.add(strut);}
patrolAircraft.scale.set(1.45,1.45,1.45);patrolAircraft.position.set(-48,15,-34);scene.add(patrolAircraft);
let heliAttack=rand(2.5,4.5);const heliBullets=[];

const weapon = new THREE.Group(); camera.add(weapon); scene.add(camera);

// First-person operator rig: separate shoulder pivots keep both hands aligned with the weapon.
const operatorBody=new THREE.Group();camera.add(operatorBody);
const uniformMat=new THREE.MeshStandardMaterial({color:0x236bd1,roughness:.94});
const uniformDark=new THREE.MeshStandardMaterial({color:0x111820,roughness:.9});
const gloveMat=new THREE.MeshStandardMaterial({color:0x080b0e,roughness:.82});
const seamMat=new THREE.MeshStandardMaterial({color:0x36a66a,roughness:.9});
function limbBetween(parent,a,b,radius,material){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(radius,Math.max(.06,d.length()-radius*2),6,10),material);mesh.position.copy(av.add(bv).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());mesh.castShadow=true;parent.add(mesh);return mesh;}
function armSegment(parent,a,b,rTop,rBottom,material){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBottom,d.length(),14,3),material);mesh.position.copy(av.add(bv).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function gloveHand(parent,x,y,z,scale=1){const hand=new THREE.Group();hand.position.set(x,y,z);hand.scale.setScalar(scale);parent.add(hand);const palm=new THREE.Mesh(new THREE.BoxGeometry(.14,.105,.19),gloveMat);palm.rotation.x=-.18;hand.add(palm);for(let i=0;i<4;i++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.021,.075,4,7),gloveMat);finger.position.set(-.047+i*.031,-.018,-.105);finger.rotation.x=-.35;hand.add(finger);}const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.075,4,7),gloveMat);thumb.position.set(.085,-.005,-.025);thumb.rotation.z=-.85;hand.add(thumb);return hand;}
const rightArmRig=new THREE.Group();rightArmRig.position.set(.64,-.58,-.16);operatorBody.add(rightArmRig);
const rightShoulder=new THREE.Mesh(new THREE.SphereGeometry(.205,18,14),uniformMat);rightShoulder.position.set(-.035,.015,-.10);rightShoulder.scale.set(1,.92,1.12);rightArmRig.add(rightShoulder);
armSegment(rightArmRig,[0,0,0],[-.24,.16,-.52],.165,.125,uniformMat);
const rightElbow=new THREE.Mesh(new THREE.SphereGeometry(.135,14,12),uniformDark);rightElbow.position.set(-.24,.16,-.52);rightElbow.scale.set(1,.92,.82);rightArmRig.add(rightElbow);
armSegment(rightArmRig,[-.24,.16,-.52],[-.28,.16,-.68],.12,.092,uniformDark);
const rightForearmGuard=new THREE.Mesh(new THREE.SphereGeometry(.112,14,12),uniformMat);rightForearmGuard.position.set(-.27,.16,-.60);rightForearmGuard.scale.set(1,1,1.35);rightArmRig.add(rightForearmGuard);
const rightCuff=new THREE.Mesh(new THREE.TorusGeometry(.104,.018,7,14),seamMat);rightCuff.position.set(-.28,.16,-.68);rightCuff.rotation.x=Math.PI/2;rightArmRig.add(rightCuff);
gloveHand(rightArmRig,-.28,.18,-.74,.88);
const leftArmRig=new THREE.Group();leftArmRig.position.set(-.64,-.58,-.16);operatorBody.add(leftArmRig);
const leftShoulder=new THREE.Mesh(new THREE.SphereGeometry(.205,18,14),uniformMat);leftShoulder.position.set(.035,.015,-.10);leftShoulder.scale.set(1,.92,1.12);leftArmRig.add(leftShoulder);
armSegment(leftArmRig,[0,0,0],[.40,.16,-.50],.16,.12,uniformMat);
const leftElbow=new THREE.Mesh(new THREE.SphereGeometry(.135,14,12),uniformDark);leftElbow.position.set(.40,.16,-.50);leftElbow.scale.set(1,.92,.82);leftArmRig.add(leftElbow);
armSegment(leftArmRig,[.40,.16,-.50],[.88,.18,-.72],.12,.09,uniformDark);
const leftForearmGuard=new THREE.Mesh(new THREE.SphereGeometry(.112,14,12),uniformMat);leftForearmGuard.position.set(.67,.17,-.61);leftForearmGuard.scale.set(1,1,1.4);leftArmRig.add(leftForearmGuard);
const leftCuff=new THREE.Mesh(new THREE.TorusGeometry(.104,.018,7,14),seamMat);leftCuff.position.set(.88,.18,-.72);leftCuff.rotation.x=Math.PI/2;leftArmRig.add(leftCuff);
const leftHand=gloveHand(leftArmRig,.88,.20,-.78,.92);
// Reinforced shoulder/elbow stitching remains visible while the arms animate.
for(const side of [-1,1]){const patch=new THREE.Mesh(new THREE.BoxGeometry(.12,.018,.16),seamMat);patch.position.set(side*.52,-.57,-.35);patch.rotation.z=side*.28;operatorBody.add(patch);}
let grenadeThrowAge=-1;
const grenadeInHand=new THREE.Mesh(new THREE.SphereGeometry(.105,12,10),mat(0x45513b,.72,.18));
grenadeInHand.position.set(0,-.015,-.18);grenadeInHand.visible=false;leftHand.add(grenadeInHand);
// Lower-body model is revealed only when the operator looks down.
const operatorLegs=new THREE.Group();camera.add(operatorLegs);operatorLegs.visible=false;
for(const side of [-1,1]){
 const thigh=new THREE.Mesh(new THREE.CapsuleGeometry(.155,.52,6,10),uniformMat);thigh.position.set(side*.22,-1.08,-.62);thigh.rotation.x=-.28;operatorLegs.add(thigh);
 const knee=new THREE.Mesh(new THREE.BoxGeometry(.27,.18,.12),uniformDark);knee.position.set(side*.22,-1.30,-.82);knee.rotation.x=-.25;operatorLegs.add(knee);
 const kneePatch=new THREE.Mesh(new THREE.BoxGeometry(.18,.035,.025),seamMat);kneePatch.position.set(side*.22,-1.28,-.885);operatorLegs.add(kneePatch);
 const shin=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.32,5,9),uniformMat);shin.position.set(side*.22,-1.48,-.96);shin.rotation.x=-.2;operatorLegs.add(shin);
 const boot=new THREE.Group();boot.position.set(side*.22,-1.68,-1.18);operatorLegs.add(boot);
 const upper=new THREE.Mesh(new THREE.BoxGeometry(.22,.19,.34),uniformDark);upper.position.set(0,.015,-.035);boot.add(upper);
 const toe=new THREE.Mesh(new THREE.BoxGeometry(.225,.11,.22),gloveMat);toe.position.set(0,-.045,-.22);boot.add(toe);
 const sole=new THREE.Mesh(new THREE.BoxGeometry(.235,.035,.48),new THREE.MeshStandardMaterial({color:0x101512,roughness:1}));sole.position.set(0,-.105,-.12);boot.add(sole);
 const laceMat=new THREE.MeshStandardMaterial({color:0x9b9a7b,roughness:.9});for(let i=0;i<3;i++){const lace=new THREE.Mesh(new THREE.BoxGeometry(.12,.012,.018),laceMat);lace.position.set(0,.115-i*.035,-.12);boot.add(lace);}
}

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
// Layered, directional muzzle flash: hot core, branching flame tongues and a short-lived light.
const muzzleFlash=new THREE.Group();muzzleFlash.position.set(.34,-.22,-1.69);muzzleFlash.visible=false;weapon.add(muzzleFlash);
const flashCore=new THREE.Mesh(new THREE.SphereGeometry(.14,14,12),new THREE.MeshBasicMaterial({color:0xfff2c2,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));flashCore.scale.set(.8,.8,1.8);muzzleFlash.add(flashCore);
const flameMat=new THREE.MeshBasicMaterial({color:0xffa12b,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
const hotMat=new THREE.MeshBasicMaterial({color:0xffe5a0,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
for(let i=0;i<7;i++){
 const flame=new THREE.Mesh(new THREE.ConeGeometry(i===0?.095:.045,i===0?.48:rand(.24,.42),8),i%2?flameMat:hotMat);
 flame.rotation.x=-Math.PI/2;flame.rotation.z=(i-3)*.34;flame.position.z=-.12-rand(0,.12);muzzleFlash.add(flame);
}
const muzzleLight=new THREE.PointLight(0xffb34e,0,8,1.7);muzzleLight.position.set(.34,-.22,-1.7);weapon.add(muzzleLight);
weapon.position.set(0,0,0);
const pistol=new THREE.Group();camera.add(pistol);pistol.visible=false;
const pbox=(x,y,z,a,b,c,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(a,b,c),m);o.position.set(x,y,z);pistol.add(o);};pbox(.34,-.31,-.55,.13,.16,.38,gunMat);pbox(.34,-.4,-.5,.11,.24,.13,gunPolymer);
const launcher=new THREE.Group();camera.add(launcher);launcher.visible=false;
const tube=new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,1.05,16,1,true),gunMat);tube.rotation.x=Math.PI/2;tube.position.set(.34,-.25,-.8);launcher.add(tube);
const tubeFront=new THREE.Mesh(new THREE.TorusGeometry(.12,.025,8,20),gunAccent);tubeFront.position.set(.34,-.25,-1.325);launcher.add(tubeFront);
const tubeRear=new THREE.Mesh(new THREE.TorusGeometry(.135,.022,8,20),gunMat);tubeRear.position.set(.34,-.25,-.275);launcher.add(tubeRear);
const grip=new THREE.Mesh(new THREE.BoxGeometry(.13,.24,.18),gunPolymer);grip.position.set(.34,-.42,-.55);launcher.add(grip);
const rocketRound=new THREE.Group();rocketRound.name='AT4_VISIBLE_ROCKET';launcher.add(rocketRound);rocketRound.position.set(.34,-.25,-.82);
const rocketBody=new THREE.Mesh(new THREE.CylinderGeometry(.072,.072,.83,12),mat(0x536044,.5,.22));rocketBody.rotation.x=Math.PI/2;rocketRound.add(rocketBody);
const rocketNose=new THREE.Mesh(new THREE.ConeGeometry(.072,.22,12),mat(0x9a9d83,.4,.3));rocketNose.rotation.x=-Math.PI/2;rocketNose.position.z=-.525;rocketRound.add(rocketNose);
const rocketBand=new THREE.Mesh(new THREE.CylinderGeometry(.078,.078,.09,12),gunMat);rocketBand.rotation.x=Math.PI/2;rocketBand.position.z=.22;rocketRound.add(rocketBand);
for(let k=0;k<4;k++){const fin=new THREE.Mesh(new THREE.BoxGeometry(.16,.012,.18),gunAccent);fin.position.set(0,0,.39);fin.rotation.z=k*Math.PI/2;rocketRound.add(fin);}
const rocketProjectiles=[];
function createRocketProjectile(origin,direction){
 const rocket=new THREE.Group();
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.9,12),mat(0x596748,.45,.25));body.rotation.x=Math.PI/2;rocket.add(body);
 const nose=new THREE.Mesh(new THREE.ConeGeometry(.075,.24,12),mat(0xb5b59a,.38,.28));nose.rotation.x=-Math.PI/2;nose.position.z=-.57;rocket.add(nose);
 const band=new THREE.Mesh(new THREE.CylinderGeometry(.082,.082,.1,12),gunMat);band.rotation.x=Math.PI/2;band.position.z=.27;rocket.add(band);
 for(let k=0;k<4;k++){const fin=new THREE.Mesh(new THREE.BoxGeometry(.18,.014,.2),gunAccent);fin.position.set(0,0,.4);fin.rotation.z=k*Math.PI/2;rocket.add(fin);}
 const flame=new THREE.Mesh(new THREE.ConeGeometry(.13,.48,10),new THREE.MeshBasicMaterial({color:0xff8a28,transparent:true,opacity:.9}));flame.rotation.x=Math.PI/2;flame.position.z=.65;rocket.add(flame);
 const smoke=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:0x77736b,transparent:true,opacity:.35,depthWrite:false}));smoke.position.z=.8;rocket.add(smoke);
 rocket.position.copy(origin);rocket.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction.clone().normalize());scene.add(rocket);
 rocketProjectiles.push({mesh:rocket,velocity:direction.clone().normalize().multiplyScalar(42),life:4});
}
function detonateRocket(projectile,point){
 const blast=new THREE.Mesh(new THREE.SphereGeometry(2.5,18,14),new THREE.MeshBasicMaterial({color:0xff8b32,transparent:true,opacity:.9,depthWrite:false}));blast.position.copy(point);scene.add(blast);explosions.push({mesh:blast,age:0});
 const flash=new THREE.PointLight(0xff9a42,5,16);flash.position.copy(point);scene.add(flash);setTimeout(()=>scene.remove(flash),450);
 playSound('explosion');toast('IMPACTO DO AT-4 // EXPLOSÃO');scene.remove(projectile.mesh);
}
function updateRocketProjectiles(dt){
 for(let i=rocketProjectiles.length-1;i>=0;i--){
  const p=rocketProjectiles[i],previous=p.mesh.position.clone(),step=p.velocity.clone().multiplyScalar(dt),distance=step.length();
  p.mesh.position.add(step);p.life-=dt;raycaster.set(previous,step.clone().normalize());raycaster.far=distance+1.2;
  if(!helicopterDestroyed&&patrolAircraft.visible){
   const heliHit=raycaster.intersectObject(patrolAircraft,true).find(h=>h.object.visible);
   if(heliHit&&heliHit.point.distanceTo(previous)<=distance+1.1){helicopterDestroyed=true;patrolAircraft.visible=false;for(const b of heliBullets)scene.remove(b.mesh);heliBullets.length=0;detonateRocket(p,heliHit.point);rocketProjectiles.splice(i,1);toast('HELICÓPTERO DERRUBADO // ALVO DESTRUÍDO');continue;}
  }
  raycaster.set(previous,step.clone().normalize());raycaster.far=distance;
  const obstacle=raycaster.intersectObjects(world.children,true).find(h=>h.object.isMesh&&h.object.visible);
  if(obstacle&&obstacle.distance<=distance+.1){detonateRocket(p,obstacle.point);rocketProjectiles.splice(i,1);continue;}
  if(p.life<=0){scene.remove(p.mesh);rocketProjectiles.splice(i,1);}
 }
}
function loadOptionalWeaponModel(type,path,group,offset){
 fetch(path,{method:'HEAD'}).then(r=>{if(!r.ok)return;new GLTFLoader().load(path,gltf=>{
  const model=gltf.scene;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),largest=Math.max(size.x,size.y,size.z)||1,scale=(type==='rifle'?1.55:type==='pistol'?.82:1.25)/largest;
  model.scale.setScalar(scale);model.position.set(offset.x-center.x*scale,offset.y-center.y*scale,offset.z-center.z*scale);
  for(const child of [...group.children])if(child!==muzzleFlash)child.visible=false;
  group.add(model);group.userData.externalModel=model;
 },undefined,error=>console.warn('Weapon asset could not be loaded:',path,error));}).catch(()=>{});
}
loadOptionalWeaponModel('rifle','/assets/weapons/rifle.glb',weapon,{x:.34,y:-.32,z:-.86});
loadOptionalWeaponModel('pistol','/assets/weapons/pistol.glb',pistol,{x:.34,y:-.32,z:-.58});
loadOptionalWeaponModel('launcher','/assets/weapons/at4.glb',launcher,{x:.34,y:-.3,z:-.78});
function setWeapon(type){player.weaponType=type;if(type==='launcher')rocketRound.visible=player.rocketAmmo>0;weapon.visible=type==='rifle';pistol.visible=type==='pistol';launcher.visible=type==='launcher';const data={rifle:['VX-9 RANGER','5.56 × 45 MM // ASSAULT RIFLE','01 / PRIMARY','/assets/icons/rifle.svg','/assets/icons/rifle-ammo.svg'],pistol:['M9 SIDEARM','9 × 19 MM // SEMI-AUTO','02 / SIDEARM','/assets/icons/pistol.svg','/assets/icons/pistol-ammo.svg'],launcher:['AT-4 ROCKET','84 MM // ANTI-ARMOR','03 / HEAVY','/assets/icons/at4.svg','/assets/icons/rocket-ammo.svg']}[type];$('weapon-name').textContent=data[0];$('weapon-desc').textContent=data[1];$('weapon-slot').textContent=data[2];$('weapon-image').src=data[3];$('ammo-image').src=data[4];$('weapon-image').alt=data[0];$('ammo-image').alt=data[1];updateHUD();}
const supplyArtCache=new Map();
const supplyArtPaths={rifle:'/assets/icons/rifle-ammo.svg',pistol:'/assets/icons/pistol-ammo.svg',grenade:'/assets/icons/grenade-ammo.svg',launcher:'/assets/icons/at4.svg'};
const supplyLabels={rifle:'MUNICAO DE FUZIL  +60',pistol:'MUNICAO DE PISTOLA  +24',grenade:'GRANADAS  +2',launcher:'LANCADOR AT-4  /  1 FOGUETE'};
function makeSupplyLabel(type){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');
 ctx.fillStyle='rgba(5,12,15,.94)';ctx.fillRect(0,0,512,96);ctx.strokeStyle=type==='launcher'?'#ffad55':'#b8e78c';ctx.lineWidth=5;ctx.strokeRect(3,3,506,90);
 ctx.fillStyle='#eaf3e7';ctx.font='bold 29px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(supplyLabels[type],256,49);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function supplyIconTexture(type){
 if(supplyArtCache.has(type))return supplyArtCache.get(type);
 const texture=new THREE.TextureLoader().load(supplyArtPaths[type]);texture.colorSpace=THREE.SRGBColorSpace;supplyArtCache.set(type,texture);return texture;
}
function spawnSupplyPickups(){
 supplyPickups.length=0;
 const layout=[['rifle',-24,-8,false],['rifle',21,12,false],['pistol',-8,24,false],['pistol',25,-14,false],['grenade',-25,18,false],['grenade',8,-25,false],['launcher',-20,1,false],['launcher',0,-17,true]];
 for(const [type,x,z,rooftop=false] of layout){
  const g=new THREE.Group();g.position.set(x,rooftop?roofTopHeight+.18:.18,z);
  const color={rifle:0x80633d,pistol:0x6d755d,grenade:0x526b3d,launcher:0x58634b}[type];
  const crate=new THREE.Mesh(new THREE.BoxGeometry(1.35,.64,1.05),mat(color,.8,.12));crate.castShadow=true;crate.receiveShadow=true;g.add(crate);
  const lid=new THREE.Mesh(new THREE.BoxGeometry(1.39,.11,1.09),mat(type==='launcher'?0xd18b36:0xc0ad78));lid.position.y=.34;g.add(lid);
  for(let side=-1;side<=1;side+=2){const strap=new THREE.Mesh(new THREE.BoxGeometry(.12,.67,1.08),mat(0x252b26,.9,.08));strap.position.x=side*.43;g.add(strap);}
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.86,.045,8,32),new THREE.MeshBasicMaterial({color:type==='launcher'?0xffa34a:type==='grenade'?0x9be36e:0x8ed0a0}));halo.rotation.x=Math.PI/2;halo.position.y=.4;g.add(halo);
  const icon=new THREE.Sprite(new THREE.SpriteMaterial({map:supplyIconTexture(type),transparent:true,depthWrite:false,alphaTest:.08}));icon.name='supply-item-art';icon.position.set(0,1.22,0);icon.scale.set(type==='launcher'?1.45:.98,type==='launcher'?.48:.58,1);g.add(icon);
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:makeSupplyLabel(type),transparent:true,depthWrite:false}));label.name='supply-item-label';label.position.set(0,.72,0);label.scale.set(1.9,.36,1);g.add(label);
  world.add(g);supplyPickups.push({g,type,x,z,rooftop,icon,label,baseY:1.22,phase:Math.random()*Math.PI*2});
 }
}
function collectSupplyPickups(){for(let i=supplyPickups.length-1;i>=0;i--){const p=supplyPickups[i];if(Math.hypot(camera.position.x-p.x,camera.position.z-p.z)>2.25)continue;if(p.rooftop&&!onRooftop)continue;if(!p.rooftop&&onRooftop)continue;let message='';if(p.type==='rifle'){player.reserve+=60;message='CAIXA DE FUZIL // +60 CARTUCHOS';}else if(p.type==='pistol'){player.pistolReserve+=24;message='CAIXA DE PISTOLA // +24 CARTUCHOS';}else if(p.type==='grenade'){const before=player.grenades;player.grenades=Math.min(5,player.grenades+2);message=player.grenades>before?'GRANADAS RECOLHIDAS // +'+(player.grenades-before):'BOLSAS DE GRANADA JÁ ESTÃO CHEIAS';}else{if(player.rocketAmmo>0){toast('LANÇA-FOGUETES JÁ CARREGADO // USE ANTES DE PEGAR OUTRO');continue;}player.rocketAmmo=1;setWeapon('launcher');message='AT-4 RECOLHIDO // 1 FOGUETE';}world.remove(p.g);supplyPickups.splice(i,1);toast(message);updateHUD();}}

const player={health:100,ammo:30,reserve:120,pistolAmmo:12,pistolReserve:48,rocketAmmo:0,weaponType:'rifle',grenades:3,kills:0,shots:0,hits:0,round:1,reloading:false,alive:true,active:true,velocity:new THREE.Vector3(),onGround:true};
const bots=[]; const allies=[]; const bullets=[]; const enemyBullets=[]; const grenades=[]; const explosions=[]; const bloodParticles=[]; const clock=new THREE.Clock();
let missionMarker=null,routeMarker=null,routeActive=false,missionKind='eliminate',missionProgress=0,missionDuration=0,missionX=0,missionZ=-8,missionDone=false; const raycaster=new THREE.Raycaster();
const keys={}; let pointerLocked=false, elapsed=0, roundTime=120, recoil=0, bob=0, shotCooldown=0, toastTimeout;
const isTouchDevice=window.matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0;
let mobileFiring=false;
const $=id=>document.getElementById(id);
const startScreen=$('start-screen'),pauseScreen=$('pause-screen'),roundScreen=$('round-screen'),gameoverScreen=$('gameover-screen');
const mapBounds=36;const supplyPickups=[];const roofTopHeight=4.6;let onRooftop=false;const ladderPosition={x:6.95,z:-17};
function rand(min,max){return min+Math.random()*(max-min)}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),1700)}
let audioCtx=null,masterGain=null,ambientStarted=false,lastStepSound=0;
function initAudio(){
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 if(!audioCtx){
  audioCtx=new AC();masterGain=audioCtx.createGain();masterGain.gain.value=.42;masterGain.connect(audioCtx.destination);
 }
 // Mobile browsers may suspend audio after tab changes or interruptions.
 // Always attempt to resume on a fresh user gesture, even after context creation.
 if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
 startAmbientAudio();
}
document.addEventListener('pointerdown',()=>{if(player.active&&audioCtx?.state==='suspended')audioCtx.resume().catch(()=>{});},{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&player.active&&audioCtx?.state==='suspended')audioCtx.resume().catch(()=>{});});
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
 for(const ally of allies)attachSoldier(ally);
 for(const vehicle of combatVehicles)if(vehicle.crew)attachSoldier(vehicle.crew);
},undefined,error=>console.warn('Soldier model unavailable; using local fallback:',error));
function attachSoldier(bot){
 if(!soldierTemplate||!bot.alive)return;
 const old=bot.group.getObjectByName('fallback-body');
 // Keep the fallback rifle for every soldier; it will be repositioned from the rig's hand bones.
 const fallbackWeapon=old?old.getObjectByName('held-rifle'):null;
 const model=cloneSkeleton(soldierTemplate);model.name='rigged-soldier';model.scale.setScalar(1.0);model.position.y=0;
 // Soldier.glb already faces -Z, the same forward direction as the player.
 model.rotation.y=0;
 model.updateMatrixWorld(true);
 model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;if(!o.material)return;
  const paintAlly=material=>{const m=material.clone();if(bot.ally&&m.color){
   const tag=((o.name||'')+' '+(material.name||'')).toLowerCase();
   const worldBox=new THREE.Box3().setFromObject(o),center=worldBox.getCenter(new THREE.Vector3());
   const skinLike=/skin|face|head|eye|hand/i.test(tag)||center.y>1.53;
   if(!skinLike){
    if(/vest|armor|armour|chest|plate|pack|pouch/i.test(tag))m.color.setHex(0x36a66a);
    else if(/helmet|boot|shoe|glove|belt|weapon|rifle|gun|gear/i.test(tag)||center.y<.25)m.color.setHex(0x080b0e);
    else m.color.setHex(0x236bd1);
   }
   m.needsUpdate=true;
  }return m;};
  o.material=Array.isArray(o.material)?o.material.map(paintAlly):paintAlly(o.material);
 });
 if(old)bot.group.remove(old);
 bot.group.add(model);bot.model=model;
 // Reparent the same rifle to the animated soldier rig for both allies and enemies.
 if(fallbackWeapon){
  model.add(fallbackWeapon);
  fallbackWeapon.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  bot.heldRifle=fallbackWeapon;
 }
 bot.rightHand=null;bot.leftHand=null;bot.rightArm=null;bot.leftArm=null;bot.rightForeArm=null;bot.leftForeArm=null;
 model.traverse(o=>{
  if(!o.isBone)return;
  const boneName=(o.name||'').toLowerCase().replace(/[^a-z]/g,'');
  if(boneName.endsWith('righthand'))bot.rightHand=o;
  else if(boneName.endsWith('lefthand'))bot.leftHand=o;
  else if(boneName.endsWith('rightforearm'))bot.rightForeArm=o;
  else if(boneName.endsWith('leftforearm'))bot.leftForeArm=o;
  else if(boneName.endsWith('rightarm'))bot.rightArm=o;
  else if(boneName.endsWith('leftarm'))bot.leftArm=o;
 });
 bot.combatBase={};
 for(const key of ['rightArm','leftArm','rightForeArm','leftForeArm']){
  const bone=bot[key];if(bone)bot.combatBase[key]=bone.quaternion.clone();
 }
 // Preserve the original Soldier.glb rig and its animated arms; do not add duplicate geometry.
 bot.mixer=new THREE.AnimationMixer(model);
 const idle=soldierClips.find(c=>/idle/i.test(c.name))||soldierClips[0];
 const walk=soldierClips.find(c=>/walk/i.test(c.name))||idle;
 const run=soldierClips.find(c=>/run/i.test(c.name))||walk;
 // Use the complete authored clips. Removing arm tracks caused the soldiers to run with arms spread.
 bot.actions={idle:idle?bot.mixer.clipAction(idle):null,walk:walk?bot.mixer.clipAction(walk):null,run:run?bot.mixer.clipAction(run):null};
 bot.currentAction=null;setBotAnimation(bot,'idle');
}
function updateHeldRifle(bot){
 if(!bot?.model||!bot.heldRifle)return;
 const base=bot.combatBase||{};
 const pose=(key,axis,angle)=>{
  const bone=bot[key],q=base[key];if(!bone||!q)return;
  bone.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));
 };
 pose('rightArm',new THREE.Vector3(0,1,0),.88);
 pose('leftArm',new THREE.Vector3(0,1,0),-.88);
 pose('rightForeArm',new THREE.Vector3(0,0,1),-1.02);
 pose('leftForeArm',new THREE.Vector3(0,0,1),1.02);
 bot.model.updateMatrixWorld(true);
 const right=bot.rightHand,left=bot.leftHand;
 // Set the rifle across the upper chest, with its muzzle facing the soldier's forward (-Z) direction.
 bot.heldRifle.position.set(.02,1.28,-.34);
 bot.heldRifle.rotation.set(0,Math.PI,0);
 // Move the rigged wrist joints onto the rifle grips after the animation mixer runs.
 const placeJoint=(bone,modelPoint)=>{
  if(!bone?.parent)return;
  bot.model.updateMatrixWorld(true);
  const worldPoint=bot.model.localToWorld(new THREE.Vector3(...modelPoint));
  bone.position.copy(bone.parent.worldToLocal(worldPoint));
  bot.model.updateMatrixWorld(true);
 };
 placeJoint(bot.rightForeArm,[.34,1.42,-.12]);
 placeJoint(bot.leftForeArm,[-.34,1.42,-.12]);
 placeJoint(bot.rightHand,[.14,1.29,-.31]);
 placeJoint(bot.leftHand,[-.12,1.29,-.57]);
}
function setBotAnimation(bot,name){
 if(!bot.actions)return;const next=bot.actions[name]||bot.actions.idle;if(!next||bot.currentAction===next)return;
 if(bot.currentAction)bot.currentAction.fadeOut(.18);next.reset().fadeIn(.18).play();bot.currentAction=next;
}
function makeBot(index){
 const group=new THREE.Group();
 // Lightweight local fallback is replaced by the rigged animated GLB as soon as it loads.
 const fallback=new THREE.Group();fallback.name='fallback-body';fallback.rotation.y=Math.PI;group.add(fallback);
 const isAlly=index>=60;const uniform=mat(isAlly?0x236bd1:(index%2?0x59684a:0x74664d)),vestMat=mat(isAlly?0x36a66a:0x303a34),skin=mat(0x9b8067),dark=mat(isAlly?0x080b0e:0x18201f),cloth=mat(isAlly?0x111820:0x343b32);
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.52,6,12),uniform);torso.position.y=1.18;torso.scale.set(1,.95,.72);fallback.add(torso);
 const vest=new THREE.Mesh(new THREE.BoxGeometry(.54,.48,.31),vestMat);vest.position.set(0,1.2,-.025);fallback.add(vest);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.16,16,12),skin);head.position.y=1.69;fallback.add(head);
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.2,16,12,0,Math.PI*2,0,Math.PI*.55),dark);helmet.position.y=1.77;fallback.add(helmet);
 for(const side of [-1,1]){
  const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.42,4,8),uniform);arm.position.set(side*.36,1.12,-.02);arm.rotation.z=side*.12;fallback.add(arm);
  const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.48,4,8),cloth);leg.position.set(side*.16,.43,0);fallback.add(leg);
  const boot=new THREE.Mesh(new THREE.BoxGeometry(.2,.12,.32),dark);boot.position.set(side*.16,.12,-.06);fallback.add(boot);
 }
 const rifle=new THREE.Group();rifle.name='held-rifle';rifle.position.set(.02,1.43,.34);fallback.add(rifle);
 const rifleBody=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.46),dark);rifle.add(rifleBody);
 const rifleBarrel=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.48,10),dark);rifleBarrel.rotation.x=Math.PI/2;rifleBarrel.position.z=.43;rifle.add(rifleBarrel);
 const rifleStock=new THREE.Mesh(new THREE.BoxGeometry(.1,.11,.24),cloth);rifleStock.position.z=-.31;rifle.add(rifleStock);
 const rifleMag=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.2,8),vestMat);rifleMag.position.set(0,-.14,.12);rifleMag.rotation.x=-.12;rifle.add(rifleMag);
 // Raise both arms toward the rifle instead of leaving the soldier in a walking-at-ease pose.
 for(const arm of fallback.children.filter(o=>o.geometry?.type==='CapsuleGeometry'&&o.position.y>1))fallback.remove(arm);
 const makeArm=(a,b)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),limb=new THREE.Mesh(new THREE.CapsuleGeometry(.075,Math.max(.12,delta.length()-.14),5,8),uniform);limb.position.copy(start.add(end).multiplyScalar(.5));limb.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());fallback.add(limb);};
 // Both arms reach forward to the weapon: right hand at the pistol grip, left hand under the handguard.
 makeArm([.29,1.43,.02],[.16,1.34,.43]);makeArm([-.29,1.43,.02],[-.13,1.34,.48]);
 const hpbg=new THREE.Mesh(new THREE.PlaneGeometry(.72,.07),new THREE.MeshBasicMaterial({color:0x17211e,side:THREE.DoubleSide}));hpbg.position.y=2.12;hpbg.userData.noHit=true;group.add(hpbg);
 const hp=new THREE.Mesh(new THREE.PlaneGeometry(.68,.045),new THREE.MeshBasicMaterial({color:0xff755e,side:THREE.DoubleSide}));hp.position.set(0,2.12,.006);hp.userData.noHit=true;group.add(hp);
 // Spawn around the whole combat perimeter, not in one narrow front cluster.
 let spawn=null,bestCandidate=null,bestGap=-1;
 for(let attempt=0;attempt<1400;attempt++){
  const angle=Math.random()*Math.PI*2,radius=rand(18,34);
  const candidate={x:THREE.MathUtils.clamp(camera.position.x+Math.cos(angle)*radius,-34,34),z:THREE.MathUtils.clamp(camera.position.z+Math.sin(angle)*radius,-34,34)};
  if(moveBlocked(candidate.x,candidate.z))continue;
  const gap=bots.filter(other=>other.alive).reduce((m,other)=>Math.min(m,Math.hypot(other.group.position.x-candidate.x,other.group.position.z-candidate.z)),99);
  if(gap>bestGap){bestGap=gap;bestCandidate=candidate;}
  if(gap>=4.8){spawn=candidate;break;}
 }
 if(!spawn)spawn=bestCandidate||{x:THREE.MathUtils.clamp((index%4-1.5)*5,-20,20),z:THREE.MathUtils.clamp(-12-Math.floor(index/4)*4,-22,22)};
 group.position.set(spawn.x,0,spawn.z);
 scene.add(group);const bot={group,hp,hpbg,ally:index>=60,health:100,maxHealth:100,fire:rand(.55,1.15),speed:rand(1.35,1.8),alerted:false,strafe:index%2?1:-1,alive:true,hitFlash:0,mixer:null};bots.push(bot);
 if(soldierTemplate)attachSoldier(bot);return bot;
}

function spawnAllies(){
 // Four friendly AI soldiers are separate from the hostile wave and never count as enemies.
 // Two allies flank each side, staggered slightly so they move alongside the player.
 const offsets=[[-2.8,0.9],[2.8,0.9],[-2.8,-1.3],[2.8,-1.3]];
 for(let i=0;i<4;i++){
  const ally=makeBot(60+i);bots.pop();ally.ally=true;ally.health=180;ally.maxHealth=180;ally.fire=rand(.4,1.1);ally.alerted=false;ally.group.position.set(camera.position.x+offsets[i][0],0,camera.position.z+offsets[i][1]);ally.group.userData.squadName=['ALPHA-2','BRAVO-2','CHARLIE-2','DELTA-2'][i];allies.push(ally);
 }
 $('objective-sub').textContent='SQUAD SUPPORT ACTIVE // 4 ALLIED OPERATORS';
}
function updateAllies(dt){
 for(let i=0;i<allies.length;i++){
  const a=allies[i];if(!a.alive){if(a.dying){a.deathAge+=dt;const t=Math.min(1,a.deathAge/.48);a.group.rotation.z=a.deathSide*1.48*t;a.group.position.y=a.deathStartY-.78*t;if(t>=1){a.dying=false;a.corpse=true;}}continue;}
  if(a.mixer)a.mixer.update(dt);
  updateHeldRifle(a);
  const angle=camera.rotation.y,offset=[[-2.8,0.9],[2.8,0.9],[-2.8,-1.3],[2.8,-1.3]][i];
  const desiredX=camera.position.x+offset[0]*Math.cos(angle)+offset[1]*Math.sin(angle);
  const desiredZ=camera.position.z-offset[0]*Math.sin(angle)+offset[1]*Math.cos(angle);
  const dx=desiredX-a.group.position.x,dz=desiredZ-a.group.position.z,dist=Math.hypot(dx,dz);
  if(dist>1.15){const step=Math.min(dist-1.05,a.speed*1.65*dt);const nx=a.group.position.x+dx/dist*step,nz=a.group.position.z+dz/dist*step;a.group.rotation.y=Math.atan2(-dx,-dz);if(!moveBlocked(nx,a.group.position.z))a.group.position.x=nx;if(!moveBlocked(a.group.position.x,nz))a.group.position.z=nz;setBotAnimation(a,'run');}
  else setBotAnimation(a,'idle');
  // Allies cover the flanks. Hostiles in the player's forward field are reserved
  // for the player to engage, so squad support never clears the main sightline.
  const playerForward=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),camera.rotation.y);
  let target=null,best=32;
  for(const enemy of bots){
   if(!enemy.alive)continue;
   const fromPlayer=enemy.group.position.clone().sub(camera.position);fromPlayer.y=0;
   const playerDistance=fromPlayer.length();
   if(playerDistance>0.001){
    const forwardDot=playerForward.dot(fromPlayer.normalize());
    // Squad fire is reserved for lateral threats only. Enemies in front (or directly behind) remain outside the allies' target sector.
    if(Math.abs(forwardDot)>0.62)continue;
   }
   const d=a.group.position.distanceTo(enemy.group.position);
   if(d<best){best=d;target=enemy;}
  }
  if(target){
   const aim=target.group.position.clone().add(new THREE.Vector3(0,1.25,0)),origin=a.group.position.clone().add(new THREE.Vector3(0,1.42,0)),delta=aim.clone().sub(origin),distance=delta.length();
   a.group.rotation.y=Math.atan2(-delta.x,-delta.z);a.fire-=dt;
   if(a.fire<=0&&distance<32){raycaster.set(origin,delta.normalize());raycaster.far=distance;const block=raycaster.intersectObjects(world.children,true).find(hit=>hit.object.isMesh&&hit.object.visible);if(!block||block.distance>distance-.45){a.fire=rand(.72,1.05);damageBot(target,rand(7,11),aim,'ALLY');const end=aim.clone();const geometry=new THREE.BufferGeometry().setFromPoints([origin,end]);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x9bffb0,transparent:true,opacity:.8}));scene.add(line);setTimeout(()=>{scene.remove(line);geometry.dispose();line.material.dispose();},90);}}
  }
 }
}

function spawnWave(){
 onRooftop=false;helicopterDestroyed=false;patrolAircraft.visible=true;routeActive=false;if(routeMarker){world.remove(routeMarker);routeMarker=null;}buildMap(player.round);spawnSupplyPickups();for(const b of bots)scene.remove(b.group);bots.length=0;for(const a of allies)scene.remove(a.group);allies.length=0;
 const count=Math.min(18+(player.round-1)*4,40);for(let i=0;i<count;i++){const bot=makeBot(i);if(i<4){const roofSpots=[[-4.2,-19.2],[4.2,-19.2],[-2.7,-13.8],[2.7,-13.8]];bot.group.position.set(roofSpots[i][0],roofTopHeight,roofSpots[i][1]);}}spawnAllies();
 $('wave').textContent=String(count).padStart(2,'0');$('radar-count').textContent=String(count).padStart(2,'0');
 $('round-label').textContent='ROUND '+String(player.round).padStart(2,'0');
 const missions=[
  {kind:'eliminate',title:'ELIMINATE HOSTILE FORCES',sub:'Neutralize every hostile in the urban sector',duration:0},
  {kind:'intel',title:'SECURE THE INTEL CACHE',sub:'Clear hostiles, then hold the marked intel zone',duration:8},
  {kind:'defend',title:'DEFEND THE EXTRACTION ZONE',sub:'Clear hostiles and hold the extraction perimeter',duration:25},
  {kind:'sabotage',title:'SABOTAGE THE DEPOT',sub:'Clear hostiles, then secure the marked depot',duration:10}
 ];
 const mission=missions[(player.round-1)%missions.length];missionKind=mission.kind;missionDuration=mission.duration;missionProgress=0;missionDone=false;missionX=player.round%2?-8:8;missionZ=-8;
 $('objective').textContent=mission.title;$('objective-sub').textContent=mission.sub;$('match-state').textContent=mapThemes[currentMap].name;
 if(missionMarker){scene.remove(missionMarker);missionMarker=null;}
 if(missionKind!=='eliminate'){
  missionMarker=new THREE.Group();missionMarker.position.set(missionX,0,missionZ);
  const color=missionKind==='defend'?0x59c7ff:0xc5f36b;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.5,.09,8,48),new THREE.MeshBasicMaterial({color}));ring.rotation.x=-Math.PI/2;ring.position.y=.08;missionMarker.add(ring);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.08,.55,4.5,16,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=2.25;missionMarker.add(beam);
  const beacon=new THREE.PointLight(color,2.2,9);beacon.position.y=2;missionMarker.add(beacon);scene.add(missionMarker);
 }
 roundTime=Math.max(55,120-player.round*4);updateTimer();toast('FRAG READY // G OR RIGHT CLICK');
}
function unlockExitRoute(){
 if(routeActive)return;routeActive=true;missionDone=true;
 if(missionMarker){world.remove(missionMarker);missionMarker=null;}
 const exitX=0,exitZ=-32;routeMarker=new THREE.Group();routeMarker.position.set(exitX,0,exitZ);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(3,.12,10,48),new THREE.MeshBasicMaterial({color:0x7dffb2}));ring.rotation.x=-Math.PI/2;ring.position.y=.1;routeMarker.add(ring);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.12,.8,7,18,1,true),new THREE.MeshBasicMaterial({color:0x7dffb2,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=3.5;routeMarker.add(beam);
 const beacon=new THREE.PointLight(0x7dffb2,3,18);beacon.position.y=2.4;routeMarker.add(beacon);world.add(routeMarker);
 $('objective').textContent='PROCEED TO THE NEXT OPERATION';$('objective-sub').textContent='FOLLOW THE COMPASS // REACH THE EXTRACTION ROUTE';$('match-state').textContent='EXTRACTION ROUTE OPEN';toast('MISSION COMPLETE // FOLLOW THE ROUTE MARKER');
}
function updateCampaignRoute(dt){
 const panel=$('route-compass');if(!routeActive||!routeMarker){panel.classList.add('hidden');return;}
 panel.classList.remove('hidden');const dx=routeMarker.position.x-camera.position.x,dz=routeMarker.position.z-camera.position.z,dist=Math.hypot(dx,dz);
 const bearing=Math.atan2(dx,-dz),relative=bearing+camera.rotation.y;const arrow=$('route-arrow');arrow.style.transform='rotate('+relative+'rad)';$('route-distance').textContent=Math.ceil(dist)+' M';$('route-label').textContent='NEXT OPERATION';
 if(routeMarker)routeMarker.rotation.y+=dt*.55;
 if(dist<3.2){
  routeActive=false;panel.classList.add('hidden');if(routeMarker){world.remove(routeMarker);routeMarker=null;}
  player.round++;player.health=Math.min(100,player.health+18);player.ammo=30;player.reserve+=30;player.grenades=Math.min(5,player.grenades+1);
  camera.position.set(0,1.72,8);camera.rotation.set(0,0,0);player.velocity.set(0,0,0);player.onGround=true;
  spawnWave();updateHUD();toast('NEW OPERATION // '+mapThemes[currentMap].name);return;
 }
}
function updateMission(dt){
 if(missionDone)return;
 const remaining=bots.filter(b=>b.alive).length;
 if(missionKind==='eliminate'){
  $('objective-sub').textContent=remaining>0?'ELIMINATE HOSTILES // '+remaining+' REMAIN':'ALL HOSTILES ELIMINATED // SECTOR CLEAR';
  if(remaining===0){unlockExitRoute();}
  return;
 }
 if(remaining>0){
  missionProgress=0;
  $('objective-sub').textContent='ELIMINATE HOSTILES FIRST // '+remaining+' REMAIN';
  return;
 }
 const dx=camera.position.x-missionX,dz=camera.position.z-missionZ;
 const distance=Math.hypot(dx,dz),radius=missionKind==='defend'?7.5:3.2,inside=distance<=radius;
 if(inside){missionProgress=Math.min(missionDuration,missionProgress+dt);if(missionMarker)missionMarker.rotation.y+=dt*.7;}
 else if(missionKind==='defend')missionProgress=Math.max(0,missionProgress-dt*.55);
 const pct=Math.floor(missionProgress/missionDuration*100);
 $('objective-sub').textContent=inside?'SECURING OBJECTIVE // '+pct+'%':'GO TO BEACON // '+Math.ceil(distance)+' M';
 if(missionProgress>=missionDuration){unlockExitRoute();}
}
function updateTimer(){const m=Math.floor(roundTime/60),s=Math.floor(roundTime%60);$('round-timer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function updateHUD(){
 $('health').textContent=Math.max(0,Math.ceil(player.health));$('health-fill').style.width=Math.max(0,player.health)+'%';const loaded=player.weaponType==='pistol'?player.pistolAmmo:player.weaponType==='launcher'?player.rocketAmmo:player.ammo;const spare=player.weaponType==='pistol'?player.pistolReserve:player.weaponType==='launcher'?'ROCKET':player.reserve;$('ammo').textContent=String(loaded).padStart(2,'0');$('reserve').textContent=spare;$('grenade-count').textContent=String(player.grenades);$('kills').textContent=String(player.kills).padStart(2,'0');$('accuracy').textContent=(player.shots?Math.round(player.hits/player.shots*100):100)+'%';
 $('radar-count').textContent=String(bots.filter(b=>b.alive).length).padStart(2,'0');$('wave').textContent=String(bots.filter(b=>b.alive).length).padStart(2,'0');
 const bars=$('ammo-bars');bars.innerHTML='';const cap=player.weaponType==='pistol'?12:player.weaponType==='launcher'?1:30;const barLoaded=player.weaponType==='pistol'?player.pistolAmmo:player.weaponType==='launcher'?player.rocketAmmo:player.ammo;for(let i=0;i<cap;i++){const el=document.createElement('i');if(i>=barLoaded)el.className='empty';bars.append(el);}
}
function moveBlocked(x,z){if(Math.abs(x)>mapBounds||Math.abs(z)>mapBounds)return true;return colliders.some(c=>Math.abs(x-c.x)<c.hx+.42&&Math.abs(z-c.z)<c.hz+.42&&(!onRooftop||camera.position.y<roofTopHeight+1.0));}
function damagePlayer(amount){if(!player.alive)return;playSound('damage');player.health=Math.max(0,player.health-amount);$('damage-flash').classList.add('show');setTimeout(()=>$('damage-flash').classList.remove('show'),100);updateHUD();if(player.health<=0){player.alive=false;player.active=false;document.exitPointerLock?.();$('gameover-copy').textContent='You neutralized '+player.kills+' hostiles across '+player.round+' rounds.';gameoverScreen.classList.remove('hidden');}}
function fireBot(bot,dt){
 bot.fire-=dt;if(bot.fire>0)return;bot.fire=rand(.72,1.18);
 const origin=bot.heldRifle?bot.heldRifle.localToWorld(new THREE.Vector3(0,0,.94)):bot.group.localToWorld(new THREE.Vector3(0,1.32,.42));
 const target=camera.position.clone().add(new THREE.Vector3(rand(-.9,.9),rand(-.55,.55),rand(-.9,.9)));
 const delta=target.clone().sub(origin),distance=delta.length(),direction=delta.normalize();
 // A hostile cannot shoot through a building, wall, crate or other solid map object.
 raycaster.set(origin,direction);raycaster.far=distance;
 const obstruction=raycaster.intersectObjects(world.children,true).find(hit=>hit.object.isMesh&&hit.object.visible);
 if(obstruction&&obstruction.distance<distance-.35)return;
 if(bot.heldRifle){const flash=new THREE.Mesh(new THREE.SphereGeometry(.065,8,6),new THREE.MeshBasicMaterial({color:0xffc16a,transparent:true,opacity:.98,blending:THREE.AdditiveBlending,depthWrite:false}));flash.position.set(0,0,.96);bot.heldRifle.add(flash);setTimeout(()=>{bot.heldRifle?.remove(flash);flash.geometry.dispose();flash.material.dispose();},65);}
 const tracer=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.58,6),new THREE.MeshBasicMaterial({color:0xffb36b,emissive:0x8b3a12}));
 tracer.position.copy(origin);tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);scene.add(tracer);
 enemyBullets.push({mesh:tracer,velocity:direction.clone().multiplyScalar(36),life:Math.min(1.15,distance/36+.08),damage:rand(4,7)});
 playSound('enemy');
}
function spawnBlood(position){
 for(let i=0;i<9;i++){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(rand(.018,.038),6,5),new THREE.MeshBasicMaterial({color:i%3===0?0x8f1010:0xc51b22,transparent:true,opacity:.95,depthWrite:false}));
  mesh.position.copy(position);scene.add(mesh);
  bloodParticles.push({mesh,velocity:new THREE.Vector3(rand(-2.8,2.8),rand(.8,3.4),rand(-2.8,2.8)),life:rand(.28,.58),maxLife:.58});
 }
}
function killBot(bot,source='BULLET'){
 if(!bot.alive)return;
 bot.alive=false;bot.dying=true;bot.deathAge=0;bot.deathSide=Math.random()<.5?-1:1;
 bot.deathStartY=bot.group.position.y;bot.hp.visible=false;bot.hpbg.visible=false;
 bot.fire=999;if(source!=='ALLY')player.kills++;
 toast(source==='FRAG'?'HOSTILE ELIMINATED // FRAG':'HOSTILE NEUTRALIZED');
}
function damageBot(bot,amount,impact,source='BULLET'){
 if(!bot||!bot.alive)return;
 bot.alerted=true;bot.health=Math.max(0,bot.health-amount);bot.hitFlash=.08;
 bot.hp.scale.x=Math.max(0,bot.health/bot.maxHealth);
 if(impact)spawnBlood(impact);
 if(bot.health<=0)killBot(bot,source);
}
function shoot(){
 if(!player.active||(!pointerLocked&&!isTouchDevice)||player.reloading||shotCooldown>0)return;
 const type=player.weaponType;if(type==='rifle'&&player.ammo<=0&&player.reserve<=0){setWeapon('pistol');toast('FUZIL SEM MUNIÇÃO // PISTOLA SACADA');return;}if(type==='pistol'&&player.pistolAmmo<=0){toast('PISTOLA VAZIA // PROCURE MUNIÇÃO');return;}if(type==='launcher'&&player.rocketAmmo<=0){setWeapon('rifle');toast('LANÇA-FOGUETES DESCARTADO // FUZIL RESTAURADO');return;}if(type==='rifle')player.ammo--;else if(type==='pistol')player.pistolAmmo--;else{player.rocketAmmo=0;toast('FOGUETE DISPARADO // LANÇADOR DESCARTÁVEL');}player.shots++;playSound(type==='launcher'?'explosion':'shot');shotCooldown=type==='pistol'?.32:type==='launcher'?1.1:.2;recoil=Math.min(recoil+(type==='launcher'?.18:.09),.3);
 muzzleFlash.visible=true;muzzleLight.intensity=17;
 muzzleFlash.scale.set(rand(.86,1.18),rand(.86,1.18),rand(.9,1.3));
 setTimeout(()=>{muzzleFlash.visible=false;muzzleLight.intensity=0;},72);
 camera.updateMatrixWorld();raycaster.setFromCamera(new THREE.Vector2(0,0),camera);raycaster.far=65;
 // A bright, fast tracer visibly leaves the rifle barrel on every shot.
 const muzzleWorld=new THREE.Vector3();(type==='rifle'?weapon:type==='pistol'?pistol:launcher).localToWorld(muzzleWorld.set(.34,-.22,type==='launcher'?-1.4:-1.0));
 const shotDir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
 const tracerEnd=muzzleWorld.clone().addScaledVector(shotDir,Math.min(42,raycaster.far));
 const tracerGeo=new THREE.BufferGeometry().setFromPoints([muzzleWorld,tracerEnd]);
 const tracer=new THREE.Line(tracerGeo,new THREE.LineBasicMaterial({color:0xffdf91,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));
 scene.add(tracer);setTimeout(()=>{scene.remove(tracer);tracer.geometry.dispose();tracer.material.dispose();},75);
 if(type==='launcher'){const origin=launcher.localToWorld(new THREE.Vector3(.34,-.25,-1.42));const direction=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();rocketRound.visible=false;createRocketProjectile(origin,direction);}
 const targets=[];for(const b of bots)if(b.alive)b.group.traverse(o=>{if(o.isMesh&&!o.userData.noHit&&o.geometry.type!=='PlaneGeometry')targets.push(o);});
 const hit=type==='launcher'?null:raycaster.intersectObjects(targets,false)[0];
 const crateHits=raycaster.intersectObjects(destructibleCrates.filter(c=>c.alive).flatMap(c=>c.group.children),false);const crateHit=crateHits[0];
 const worldHits=raycaster.intersectObjects(world.children,true).filter(h=>h.object.isMesh&&h.object.visible);const surfaceHit=worldHits.find(h=>!destructibleCrates.some(c=>c.alive&&c.group===h.object.parent));
 if(crateHit&&(!hit||crateHit.distance<hit.distance)&&(!surfaceHit||crateHit.distance<=surfaceHit.distance)){const owner=destructibleCrates.find(c=>c.alive&&c.group===crateHit.object.parent);const normal=crateHit.face?crateHit.face.normal.clone().transformDirection(crateHit.object.matrixWorld):new THREE.Vector3(0,0,1);if(owner)damageCrate(owner,type==='launcher'?100:type==='pistol'?22:28,crateHit.point,normal);if(type==='launcher'){damageCratesInBlast(crateHit.point,7,180);const blast=new THREE.Mesh(new THREE.SphereGeometry(1.15,14,10),new THREE.MeshBasicMaterial({color:0xff9a42,transparent:true,opacity:.78,depthWrite:false}));blast.position.copy(crateHit.point);scene.add(blast);explosions.push({mesh:blast,age:0});}}
 else if(surfaceHit&&(!hit||surfaceHit.distance<hit.distance)){const normal=surfaceHit.face?surfaceHit.face.normal.clone().transformDirection(surfaceHit.object.matrixWorld):new THREE.Vector3(0,0,1);createSurfaceImpact(surfaceHit.point,normal);}
 else if(hit){playSound('hit');const bot=bots.find(b=>{if(!b.alive)return false;let node=hit.object;while(node){if(node===b.group)return true;node=node.parent;}return false;});if(bot){bot.fire=Math.min(bot.fire,.35);player.hits++;const damage=type==='pistol'?24:type==='launcher'?150:34;damageBot(bot,damage,hit.point,type==='launcher'?'ROCKET':'BULLET');if(type==='launcher'){const blast=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),new THREE.MeshBasicMaterial({color:0xff9a42,transparent:true,opacity:.65,depthWrite:false}));blast.position.copy(hit.point);scene.add(blast);explosions.push({mesh:blast,age:0});for(const other of bots){const d=other.group.position.distanceTo(hit.point);if(other!==bot&&other.alive&&d<8)damageBot(other,Math.round(150*(1-d/8)),hit.point,'ROCKET');}}$('hit-marker').classList.add('show');setTimeout(()=>$('hit-marker').classList.remove('show'),100);}}
 if(type==='launcher')setWeapon('rifle');
 updateHUD();
}
function throwGrenade(){
 if(!player.active||(!pointerLocked&&!isTouchDevice)||player.grenades<=0||grenadeThrowAge>=0)return;
 player.grenades--;updateHUD();toast('LANÇAMENTO // '+player.grenades+' GRANADAS RESTANTES');
 grenadeInHand.visible=true;grenadeThrowAge=0;
}
function releaseGrenadeFromLeftHand(){
 camera.updateMatrixWorld(true);leftArmRig.updateMatrixWorld(true);const start=new THREE.Vector3();grenadeInHand.getWorldPosition(start);
 grenadeInHand.visible=false;
 const grenade=new THREE.Mesh(new THREE.SphereGeometry(.105,12,10),mat(0x45513b,.72,.18));
 grenade.position.copy(start);grenade.castShadow=true;scene.add(grenade);
 const direction=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
 const velocity=direction.multiplyScalar(12).add(new THREE.Vector3(0,5.5,0));
 // The throw begins at the left glove, not at the camera center.
 grenades.push({mesh:grenade,velocity,fuse:2.15,bounced:false});
}
function updateFirstPersonRig(dt,crouched){
 const walking=Math.sin(bob*1.7)*.008;
 operatorBody.position.y=(crouched?-.18:0)+walking;
 rightArmRig.rotation.x=-recoil*.62;
 rightArmRig.rotation.z=Math.sin(bob*.85)*.012;
 if(grenadeThrowAge>=0){
  grenadeThrowAge+=dt;
  const t=grenadeThrowAge;
  // Pull the left arm back, drive it forward, release from the glove, then recover.
  if(t<.22){const k=t/.22;leftArmRig.rotation.y=-.48*k;leftArmRig.rotation.x=.12*k;}
  else if(t<.42){const k=(t-.22)/.20;leftArmRig.rotation.y=THREE.MathUtils.lerp(-.48,.92,k);leftArmRig.rotation.x=THREE.MathUtils.lerp(.12,-.22,k);}
  else if(t<.70){const k=(t-.42)/.28;leftArmRig.rotation.y=THREE.MathUtils.lerp(.92,0,k);leftArmRig.rotation.x=THREE.MathUtils.lerp(-.22,0,k);}
  else{leftArmRig.rotation.set(0,0,0);grenadeThrowAge=-1;}
  if(t>=.37&&grenadeInHand.visible)releaseGrenadeFromLeftHand();
 }else{
  leftArmRig.rotation.y=Math.sin(bob*.85)*.012;
  leftArmRig.rotation.x=walking*.7;
 }
}
function detonateGrenade(g){
 const center=g.mesh.position.clone();scene.remove(g.mesh);playSound('explosion');damageCratesInBlast(center,7,190);
 const flash=new THREE.Mesh(new THREE.SphereGeometry(.5,16,12),new THREE.MeshBasicMaterial({color:0xffa34d,transparent:true,opacity:.82,depthWrite:false}));
 flash.position.copy(center);scene.add(flash);explosions.push({mesh:flash,age:0});
 for(const bot of bots){if(!bot.alive)continue;const target=bot.group.position.clone().add(new THREE.Vector3(0,.85,0));const d=target.distanceTo(center);if(d<9){const damage=Math.max(0,Math.round(190*Math.pow(1-d/9,1.35)));if(damage>0)damageBot(bot,damage,target,'FRAG');}}
 if(camera.position.distanceTo(center)<5.5)damagePlayer(Math.round(30*(1-camera.position.distanceTo(center)/7)));
 updateHUD();
}
function updateProjectiles(dt){
 for(let i=grenades.length-1;i>=0;i--){const g=grenades[i];g.fuse-=dt;g.velocity.y-=9.8*dt;g.mesh.position.addScaledVector(g.velocity,dt);
  if(g.mesh.position.y<.13){g.mesh.position.y=.13;g.velocity.y=Math.abs(g.velocity.y)*.48;g.velocity.x*=.72;g.velocity.z*=.72;g.mesh.rotation.x+=dt*8;g.mesh.rotation.z+=dt*6;}
  if(g.fuse<=0){detonateGrenade(g);grenades.splice(i,1);}
 }
 for(let i=enemyBullets.length-1;i>=0;i--){const b=enemyBullets[i];const previous=b.mesh.position.clone();const step=b.velocity.clone().multiplyScalar(dt);const stepLength=step.length();b.mesh.position.add(step);b.life-=dt;
  // Stop each projectile at the first solid map surface, not only at the firing moment.
  if(stepLength>0){raycaster.set(previous,step.clone().normalize());raycaster.far=stepLength;const block=raycaster.intersectObjects(world.children,true).find(hit=>hit.object.isMesh&&hit.object.visible);if(block&&block.distance<stepLength+.04){const normal=block.face?block.face.normal.clone().transformDirection(block.object.matrixWorld):null;createSurfaceImpact(block.point,normal);b.life=-1;}}
  if(b.mesh.position.distanceTo(camera.position)<.48){damagePlayer(b.damage);b.life=-1;}
  if(b.life<=0){scene.remove(b.mesh);enemyBullets.splice(i,1);}
 }
 for(let i=crateDebris.length-1;i>=0;i--){const d=crateDebris[i];d.life-=dt;d.velocity.y-=9.8*dt;d.mesh.position.addScaledVector(d.velocity,dt);d.mesh.rotation.x+=d.spin.x*dt;d.mesh.rotation.y+=d.spin.y*dt;d.mesh.rotation.z+=d.spin.z*dt;if(d.mesh.position.y<.06){d.mesh.position.y=.06;d.velocity.y=Math.abs(d.velocity.y)*.22;d.velocity.x*=.55;d.velocity.z*=.55;}if(d.life<=0){world.remove(d.mesh);d.mesh.geometry.dispose();d.mesh.material.dispose();crateDebris.splice(i,1);}}
 for(let i=explosions.length-1;i>=0;i--){const e=explosions[i];e.age+=dt;e.mesh.scale.setScalar(1+e.age*10);e.mesh.material.opacity=Math.max(0,.82-e.age*1.25);if(e.age>.66){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();explosions.splice(i,1);}}
 for(let i=bloodParticles.length-1;i>=0;i--){const p=bloodParticles[i];p.life-=dt;p.velocity.y-=7.5*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.material.opacity=Math.max(0,p.life/p.maxLife);if(p.mesh.position.y<.025){p.mesh.position.y=.025;p.velocity.set(0,0,0);p.life=Math.min(p.life,.12);}if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();bloodParticles.splice(i,1);}}
}
function reload(){if(!player.active||player.reloading)return;if(player.weaponType==='pistol'){if(player.pistolAmmo===12||player.pistolReserve<=0)return;player.reloading=true;playSound('reload');toast('SIDEARM RELOAD');setTimeout(()=>{const n=Math.min(12-player.pistolAmmo,player.pistolReserve);player.pistolAmmo+=n;player.pistolReserve-=n;player.reloading=false;updateHUD();},900);return;}if(player.weaponType==='launcher'){toast('AT-4 // DISPOSITIVO DE DISPARO ÚNICO');return;}if(player.ammo===30||player.reserve<=0){if(player.reserve<=0)setWeapon('pistol');return;}player.reloading=true;playSound('reload');toast('RELOADING');setTimeout(()=>{const n=Math.min(30-player.ammo,player.reserve);player.ammo+=n;player.reserve-=n;player.reloading=false;updateHUD();},1250);}
function togglePause(){if(!player.active||!player.alive)return;if(pointerLocked){document.exitPointerLock();}else{canvas.requestPointerLock?.();}}
function begin(){if(!window.__tacticalLicenseActive){window.openTacticalLicense?.();document.getElementById('license-gate')?.classList.remove('hidden');return;}initAudio();startScreen.classList.add('hidden');player.active=true;spawnWave();if(!isTouchDevice)canvas.requestPointerLock?.();toast('OPERATION LIVE // GOOD HUNT');}
$('deploy-btn').addEventListener('click',begin);const fullscreenButton=$('fullscreen-btn');const isFullscreen=()=>!!(document.fullscreenElement||document.webkitFullscreenElement||document.webkitIsFullScreen);const syncFullscreenButton=()=>{if(fullscreenButton){const active=isFullscreen();fullscreenButton.textContent=active?'⛶ SAIR DA TELA CHEIA':'⛶ TELA CHEIA';fullscreenButton.setAttribute('aria-label',active?'Sair da tela cheia':'Ativar tela cheia');}};fullscreenButton?.addEventListener('click',async e=>{e.preventDefault();try{if(isFullscreen()){if(document.exitFullscreen)await document.exitFullscreen();else if(document.webkitExitFullscreen)document.webkitExitFullscreen();else if(document.webkitCancelFullScreen)document.webkitCancelFullScreen();}else{const root=document.documentElement;if(root.requestFullscreen)await root.requestFullscreen();else if(root.webkitRequestFullscreen)root.webkitRequestFullscreen();else if(root.webkitRequestFullScreen)root.webkitRequestFullScreen();else throw new Error('Fullscreen API indisponível');}syncFullscreenButton();}catch{toast('NÃO FOI POSSÍVEL ALTERAR A TELA CHEIA NESTE NAVEGADOR');}});document.addEventListener('fullscreenchange',syncFullscreenButton);document.addEventListener('webkitfullscreenchange',syncFullscreenButton);document.addEventListener('webkitfullscreenerror',()=>toast('ERRO AO ALTERAR A TELA CHEIA'));$('resume-btn').addEventListener('click',()=>{if(!isTouchDevice)canvas.requestPointerLock?.();});
$('next-round-btn').addEventListener('click',()=>{roundScreen.classList.add('hidden');player.round++;player.health=Math.min(100,player.health+18);player.ammo=30;player.reserve+=30;player.grenades=Math.min(5,player.grenades+1);player.active=true;spawnWave();updateHUD();if(!isTouchDevice)canvas.requestPointerLock?.();});
$('retry-btn').addEventListener('click',()=>{gameoverScreen.classList.add('hidden');player.health=100;player.ammo=30;player.reserve=120;player.pistolAmmo=12;player.pistolReserve=48;player.rocketAmmo=0;setWeapon('rifle');player.grenades=3;player.kills=0;player.shots=0;player.hits=0;player.round=1;player.alive=true;player.active=true;camera.position.set(0,1.72,8);onRooftop=false;spawnWave();updateHUD();if(!isTouchDevice)canvas.requestPointerLock?.();});
canvas.addEventListener('click',()=>{if(!isTouchDevice&&!pointerLocked&&player.active&&player.alive)canvas.requestPointerLock?.();});
document.addEventListener('pointerlockchange',()=>{pointerLocked=document.pointerLockElement===canvas;if(!pointerLocked&&player.active&&player.alive&&!startScreen.classList.contains('hidden'))return;if(!pointerLocked&&player.active&&player.alive){pauseScreen.classList.remove('hidden');}else{pauseScreen.classList.add('hidden');}});
document.addEventListener('mousemove',e=>{if(!pointerLocked||!player.active)return;camera.rotation.order='YXZ';camera.rotation.y-=e.movementX*.0015;camera.rotation.x-=e.movementY*.0015;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x,-1.35,1.35);});


// Quick HUD panels: start hidden to keep the combat view clear on desktop and mobile.
const radarPanel=document.querySelector('.radar-card');
const weaponPanel=document.querySelector('.weapon-card');
const radarToggle=$('toggle-radar');
const weaponsToggle=$('toggle-weapons');
function setCombatPanel(panel,button,visible){if(!panel||!button)return;panel.classList.toggle('panel-collapsed',!visible);button.setAttribute('aria-expanded',String(visible));button.classList.toggle('is-active',visible);}
setCombatPanel(radarPanel,radarToggle,false);
setCombatPanel(weaponPanel,weaponsToggle,false);
radarToggle?.addEventListener('click',()=>setCombatPanel(radarPanel,radarToggle,radarPanel.classList.contains('panel-collapsed')));
weaponsToggle?.addEventListener('click',()=>setCombatPanel(weaponPanel,weaponsToggle,weaponPanel.classList.contains('panel-collapsed')));

// Touchscreen controls: virtual movement stick, drag-to-look, and action buttons.
if(isTouchDevice){
 $('mobile-controls')?.classList.add('touch-enabled');
 const ladderButton=document.createElement('button');ladderButton.id='mobile-ladder';ladderButton.type='button';ladderButton.textContent='SUBIR ESCADA';ladderButton.style.cssText='position:absolute;right:18px;bottom:190px;z-index:30;padding:12px 14px;border:1px solid #d9b46c;border-radius:8px;background:#18251fe8;color:#fff;font:700 12px system-ui;letter-spacing:.06em;display:none';document.body.appendChild(ladderButton);ladderButton.addEventListener('pointerdown',e=>{e.preventDefault();keys.KeyE=true;});
 const stick=$('move-stick'),knob=$('move-knob'),look=$('mobile-look-zone');
 let stickPointer=null,lookPointer=null,stickCenter={x:0,y:0},lookPoint={x:0,y:0};
 const setMove=(x,y)=>{keys.KeyW=y<-.22;keys.KeyS=y>.22;keys.KeyA=x<-.22;keys.KeyD=x>.22;};
 const resetStick=()=>{stickPointer=null;knob.style.transform='translate(0,0)';setMove(0,0);};
 stick?.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect();stickCenter={x:r.left+r.width/2,y:r.top+r.height/2};});
 stick?.addEventListener('pointermove',e=>{if(e.pointerId!==stickPointer)return;e.preventDefault();const dx=e.clientX-stickCenter.x,dy=e.clientY-stickCenter.y,max=stick.clientWidth*.31,len=Math.hypot(dx,dy)||1,scale=Math.min(1,max/len),x=dx*scale,y=dy*scale;knob.style.transform='translate('+x+'px,'+y+'px)';setMove(x/max,y/max);});
 stick?.addEventListener('pointerup',resetStick);stick?.addEventListener('pointercancel',resetStick);stick?.addEventListener('lostpointercapture',resetStick);
 look?.addEventListener('pointerdown',e=>{if(e.target.closest('button')||e.target.closest('#move-stick'))return;e.preventDefault();lookPointer=e.pointerId;look.setPointerCapture(e.pointerId);lookPoint={x:e.clientX,y:e.clientY};});
 look?.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||!player.active)return;e.preventDefault();const dx=e.clientX-lookPoint.x,dy=e.clientY-lookPoint.y;lookPoint={x:e.clientX,y:e.clientY};camera.rotation.order='YXZ';camera.rotation.y-=dx*.002;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-dy*.002,-1.35,1.35);});
 const stopLook=e=>{if(e.pointerId===lookPointer)lookPointer=null;};look?.addEventListener('pointerup',stopLook);look?.addEventListener('pointercancel',stopLook);
 const bindHold=(id,down,up=()=>{})=>{const el=$(id);if(!el)return;el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();el.setPointerCapture(e.pointerId);down();});const end=e=>{e.preventDefault();up();};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',up);};
 bindHold('mobile-fire',()=>{mobileFiring=true;shoot();},()=>{mobileFiring=false;});
 bindHold('mobile-jump',()=>{keys.Space=true;},()=>{keys.Space=false;});
 $('mobile-grenade')?.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();throwGrenade();});
 $('mobile-reload')?.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();reload();});
 $('mobile-switch')?.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();setWeapon(player.weaponType==='rifle'?'pistol':'rifle');});
}
document.addEventListener('contextmenu',e=>{if(isTouchDevice)e.preventDefault();});
document.addEventListener('mousedown',e=>{if(e.button===0)shoot();if(e.button===2){e.preventDefault();throwGrenade();}});canvas.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyR')reload();if(e.code==='Digit1')setWeapon('rifle');if(e.code==='Digit2')setWeapon('pistol');if(e.code==='Digit3'&&player.rocketAmmo>0)setWeapon('launcher');if(e.code==='KeyG')throwGrenade();if(e.code==='Escape'&&pointerLocked){};});document.addEventListener('keyup',e=>keys[e.code]=false);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const ratio=Math.min(window.devicePixelRatio||1,lowPowerDevice?.9:1.15);renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);});
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
 for(let i=0;i<bots.length;i++){
  const b=bots[i];
  if(b.dying){b.deathAge+=dt;const t=Math.min(1,b.deathAge/.48);b.group.rotation.z=b.deathSide*1.48*t;b.group.position.y=b.deathStartY-.78*t;if(t>=1){b.dying=false;b.corpse=true;}continue;}
  if(!b.alive)continue;
  if(b.mixer)b.mixer.update(dt);
  updateHeldRifle(b);
  const p=b.group.position;
  const dx=camera.position.x-p.x,dz=camera.position.z-p.z,dist=Math.hypot(dx,dz)||1;
  // Soldier.glb faces local -Z: rotate the whole hostile so its chest and rifle face the player.
  b.group.rotation.y=Math.atan2(-dx,-dz);
  // Hostiles stay in a ready stance but only open fire at close range.
  const toPlayer=new THREE.Vector3(dx,0,dz).normalize();const facing=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),b.group.rotation.y);const inVision=dist<=38&&facing.dot(toPlayer)>.12;let clearShot=false;if(inVision){const eye=p.clone().add(new THREE.Vector3(0,1.38,0)),aim=camera.position.clone();const sight=aim.clone().sub(eye),sightDistance=sight.length();raycaster.set(eye,sight.normalize());raycaster.far=sightDistance;const sightBlock=raycaster.intersectObjects(world.children,true).find(hit=>hit.object.isMesh&&hit.object.visible);clearShot=!sightBlock||sightBlock.distance>sightDistance-.35;}if(clearShot&&!b.alerted){b.alerted=true;b.fire=rand(.2,.55);b.burst=rand(3,5);b.strafeTimer=rand(1.5,3.2);}
  if(!b.alerted){setBotAnimation(b,'idle');continue;}
  // Soldiers fight from separated positions. Only a small assault element advances,
  // and it stops at a safe firing distance instead of charging the player as a mob.
  b.strafeTimer=Math.max(0,(b.strafeTimer||0)-dt);
  let moveX=0,moveZ=0,moved=false;
  const assault=(i%5===0);
  if(assault&&dist>13&&dist<28&&b.strafeTimer<=0){
   const side=b.strafe*(Math.random()<.5?1:-1);
   const forward=Math.min(.28,Math.max(0,(dist-13)/dist));
   const vx=(dx/dist)*forward+(-dz/dist)*side*.96;
   const vz=(dz/dist)*forward+(dx/dist)*side*.96;
   const len=Math.hypot(vx,vz)||1;
   moveX=vx/len;moveZ=vz/len;
   const step=Math.min(.65, b.speed*.38)*dt;
   if(!moveBlocked(p.x+moveX*step,p.z+moveZ*step)){
    p.x+=moveX*step;p.z+=moveZ*step;moved=true;
   }
   b.strafeTimer=rand(2.8,5.5);
  }
  // Keep the torso, rifle and muzzle aimed at the player's current position.
  b.group.rotation.y=Math.atan2(-dx,-dz);
  setBotAnimation(b,'idle');
  b.group.scale.y=1;
  if(clearShot&&dist<=38)fireBot(b,dt);
 }
}
function updateRadar(){const root=$('radar-dots');root.innerHTML='';for(const b of bots){if(!b.alive)continue;const dx=(b.group.position.x-camera.position.x)/55*130,dz=(b.group.position.z-camera.position.z)/55*130;const dot=document.createElement('i');dot.className='radar-dot';dot.style.left='calc(50% + '+THREE.MathUtils.clamp(dx,-62,62)+'px)';dot.style.top='calc(50% + '+THREE.MathUtils.clamp(dz,-62,62)+'px)';root.append(dot);}}
function update(dt){
 elapsed+=dt;patrolAircraft.position.x=((elapsed*2.2+48)%110)-55;patrolAircraft.position.y=15+Math.sin(elapsed*.55)*.65;patrolAircraft.position.z=-27+Math.sin(elapsed*.24)*7;patrolAircraft.rotation.y=Math.PI+Math.sin(elapsed*.24)*.12;mainRotor.rotation.y+=dt*34;tailRotor.rotation.x+=dt*29;
 heliAttack-=dt;if(heliAttack<=0&&player.active&&player.alive){heliAttack=rand(2.2,3.5);const origin=patrolAircraft.position.clone().add(new THREE.Vector3(1,-.4,0));const target=camera.position.clone().add(new THREE.Vector3(rand(-1.5,1.5),0,rand(-1.5,1.5)));const dir=target.sub(origin).normalize();const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.85,6),new THREE.MeshBasicMaterial({color:0xffb45e,emissive:0xff5522}));bolt.position.copy(origin);bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);scene.add(bolt);heliBullets.push({mesh:bolt,velocity:dir.multiplyScalar(27),life:2.2});}
 for(let i=heliBullets.length-1;i>=0;i--){const b=heliBullets[i];b.mesh.position.addScaledVector(b.velocity,dt);b.life-=dt;if(b.mesh.position.distanceTo(camera.position)<.65){damagePlayer(10);b.life=-1;}if(b.life<=0){scene.remove(b.mesh);heliBullets.splice(i,1);}}
 updateCombatVehicles(dt);
 updateRocketProjectiles(dt);shotCooldown=Math.max(0,shotCooldown-dt);recoil=Math.max(0,recoil-dt*.55);if(isTouchDevice&&mobileFiring&&player.active)shoot();
 if(player.active&&player.alive){
  if(!routeActive){roundTime-=dt;if(roundTime<=0){roundTime=0;damagePlayer(12);roundTime=12;}updateTimer();}
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
  const move=new THREE.Vector3();if(keys.KeyW)move.add(forward);if(keys.KeyS)move.sub(forward);if(keys.KeyD)move.add(right);if(keys.KeyA)move.sub(right);
  if(move.lengthSq()>0){if(elapsed-lastStepSound>.38){playSound('step');lastStepSound=elapsed;}move.normalize();const speed=(keys.ShiftLeft||keys.ShiftRight)?8.5:5.2;const nx=camera.position.x+move.x*speed*dt,nz=camera.position.z+move.z*speed*dt;if(!moveBlocked(nx,camera.position.z))camera.position.x=nx;if(!moveBlocked(camera.position.x,nz))camera.position.z=nz;bob+=dt*speed;}
  const crouched=!!(keys.KeyC||keys.ControlLeft||keys.ControlRight),eyeHeight=onRooftop?roofTopHeight+1.72:(crouched?1.12:1.72);
  if(player.onGround&&!onRooftop&&Math.hypot(camera.position.x-ladderPosition.x,camera.position.z-ladderPosition.z)<2.45){onRooftop=true;camera.position.set(ladderPosition.x,roofTopHeight+1.72,ladderPosition.z+1.05);player.velocity.y=0;keys.KeyE=false;keys.Space=false;toast('SUBINDO PELA ESCADA // LAJE ALCANÇADA');}else if(keys.KeyE&&onRooftop&&Math.hypot(camera.position.x-ladderPosition.x,camera.position.z-ladderPosition.z)<2.45){onRooftop=false;camera.position.set(ladderPosition.x+.35,1.72,ladderPosition.z+1.05);keys.KeyE=false;toast('DESCENDO PELA ESCADA');}if(keys.Space&&player.onGround&&!onRooftop){player.velocity.y=5.1;player.onGround=false;}player.velocity.y-=14*dt;
  if(player.onGround){camera.position.y=THREE.MathUtils.damp(camera.position.y,eyeHeight,18,dt);if(Math.abs(camera.position.y-eyeHeight)<.015)camera.position.y=eyeHeight;}
  else{camera.position.y+=player.velocity.y*dt;if(camera.position.y<=eyeHeight){camera.position.y=eyeHeight;player.velocity.y=0;player.onGround=true;}}
  weapon.position.y=Math.sin(bob*1.7)*.012-recoil*.5+(crouched?-.22:0);weapon.position.x=Math.cos(bob*.85)*.008;weapon.rotation.x=-recoil+(crouched?.035:0);operatorLegs.visible=camera.rotation.x<-.10;operatorLegs.position.y=crouched?-.12:0;updateFirstPersonRig(dt,crouched);
  const nearLadder=Math.hypot(camera.position.x-ladderPosition.x,camera.position.z-ladderPosition.z)<2.8;if(keys.KeyE&&!nearLadder)keys.KeyE=false;if(isTouchDevice){const lb=$('mobile-ladder');if(lb){lb.style.display=nearLadder?'block':'none';lb.textContent=onRooftop?'DESCER ESCADA':'SUBIR ESCADA';}}updateBots(dt);updateAllies(dt);updateProjectiles(dt);for(const p of supplyPickups){p.phase+=dt*1.8;p.icon.position.y=p.baseY+Math.sin(p.phase)*.09;p.label.position.y=.72+Math.sin(p.phase)*.09;}collectSupplyPickups();updateMission(dt);updateCampaignRoute(dt);
  if(Math.floor(elapsed*3)%2===0)updateRadar();
 }
 $('clock').textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(Math.floor(elapsed%60)).padStart(2,'0');
}
function animate(){requestAnimationFrame(animate);if(contextLost)return;const dt=Math.min(clock.getDelta(),.15);update(dt);try{renderer.render(scene,camera);}catch(error){console.error('Render failed:',error);}}
spawnWave();updateHUD();animate();
}
