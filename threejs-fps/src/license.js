const API='https://tactical-strike-api.onrender.com',$=id=>document.getElementById(id);
let token=localStorage.getItem('tacticalStrikeToken')||'';
window.__tacticalLicenseActive=false;
const gate=$('license-gate'),form=$('license-form'),status=$('license-status'),pay=$('payment-panel');
function show(t,error=false){status.textContent=t;status.dataset.error=error?'true':'false';}
function openGate(){gate.classList.remove('hidden');if(token){pay.classList.remove('hidden');}else{pay.classList.add('hidden');}setTimeout(()=>$('license-email').focus(),80);}
window.openTacticalLicense=openGate;
function setPlayer(p){window.__tacticalLicenseActive=!!p.licenseActive;if(p.email)$('license-email').value=p.email;if(p.licenseActive){gate.classList.add('hidden');show('Licença ativa. Boa operação!');}else{openGate();pay.classList.remove('hidden');show('Conta criada. Faça o Pix de R$ 10,00 e envie o comprovante para liberar o jogo.');}}
async function post(path,body={},authorized=true){const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json',...(authorized&&token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Falha ao conectar.');return d;}
async function refresh(){if(!token)return;try{const r=await fetch(API+'/api/me',{headers:{Authorization:'Bearer '+token}});if(!r.ok){token='';localStorage.removeItem('tacticalStrikeToken');return;}const p=await r.json();window.__tacticalLicenseActive=!!p.licenseActive;if(p.licenseActive)gate.classList.add('hidden');}catch{console.warn('Não foi possível validar a licença agora.');}}
form.addEventListener('submit',async e=>{e.preventDefault();const action=e.submitter?.value==='register'?'register':'login';try{const d=await post('/api/auth/'+action,{email:$('license-email').value.trim(),password:$('license-password').value},false);token=d.token;localStorage.setItem('tacticalStrikeToken',token);setPlayer(d.player);if(!d.player.licenseActive)await post('/api/payment/request');}catch(err){show(err.message,true);}});
$('pix-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('santossilvac992@gmail.com');show('Chave Pix copiada. Valor: R$ 10,00.');}catch{show('Chave Pix: santossilvac992@gmail.com');}});
$('whatsapp-proof').addEventListener('click',()=>{const email=$('license-email').value.trim();const message='Olá! Fiz o pagamento de R$ 10,00 do Tactical Strike. Meu e-mail de cadastro é: '+email+'. Segue o comprovante.';window.open('https://wa.me/5538988283318?text='+encodeURIComponent(message),'_blank','noopener');});
$('check-license').addEventListener('click',refresh);
$('license-logout').addEventListener('click',()=>{token='';localStorage.removeItem('tacticalStrikeToken');window.__tacticalLicenseActive=false;gate.classList.add('hidden');pay.classList.add('hidden');show('Você saiu da conta.');});
$('license-back').addEventListener('click',()=>gate.classList.add('hidden'));
refresh();
