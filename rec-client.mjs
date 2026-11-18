import config from './rec-config.mjs';
let session='',expires=0;
const key='rec-pkce';
export function isolatedOrigin(){
 if(!config.apiBase)return true;const target=new URL(config.apiBase);
 if(location.origin===target.origin)return true;
 if(target.protocol!=='https:' && !(target.protocol==='http:' && ['localhost','127.0.0.1'].includes(target.hostname)))throw Error('Origine REC invalide.');
 // Aucun ticket/session/verifier n'est créé ou transmis depuis Pages.
 sessionStorage.removeItem(key);const route=/^#(?:synthese|parametrage|saisie-rec|connexion)$/.test(location.hash)?location.hash:'#parametrage';
 location.replace(target.origin+'/'+route);return false;
}
const message={SESSION_REQUIRED:'Session expirée. Reconnectez-vous.',ACCOUNT_NOT_ALLOWED:'Ce compte n’est pas autorisé en REC.',FORBIDDEN:'Accès refusé.',REC_TARGET_NOT_CONFIRMED:'La cible REC n’est pas confirmée. Aucune donnée modifiée.'};
function endpoint(path){if(!config.apiBase)throw Error('Passerelle REC non configurée. Aucun accès Google disponible.');const u=new URL(config.apiBase);if(u.protocol!=='https:' && !(u.protocol==='http:' && ['localhost','127.0.0.1'].includes(u.hostname)))throw Error('Passerelle REC non configurée.');if(u.pathname!=='/' || u.search || u.hash || u.username || u.password)throw Error('Configuration REC invalide.');return u.origin+path;}
async function post(path,body,auth=false){
 if(auth && (!session || Date.now()>=expires))throw Error('Session expirée. Reconnectez-vous.');
 let response;try{response=await fetch(endpoint(path),{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+session}:{})},body:JSON.stringify(body),credentials:'omit',redirect:'error',signal:AbortSignal.timeout(30000)});}catch{throw Error('Connexion REC interrompue. Une écriture peut être incertaine : conserver la même demande ou actualiser avant de réessayer.');}
 const result=await response.json();if(!response.ok){if(result.error==='SESSION_REQUIRED'){session='';expires=0;}throw Error(message[result.error] || 'Accès REC indisponible.');}return result;
}
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export async function login(){
 if(!isolatedOrigin())return;
 endpoint('/auth/start');const verifier=encode(crypto.getRandomValues(new Uint8Array(32))),challenge=encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
 sessionStorage.setItem(key,verifier);const r=await post('/auth/start',{challenge});const u=new URL(r.url);
 if(u.origin!=='https://accounts.google.com' || u.pathname!=='/o/oauth2/v2/auth')throw Error('Destination de connexion refusée.');location.assign(u.href);
}
export async function completeLogin(){
 if(!isolatedOrigin())return false;
 const match=location.hash.match(/^#parametrage\/login\/([A-Za-z0-9_-]{43})$/);if(!match)return false;
 history.replaceState(null,'','#parametrage');const verifier=sessionStorage.getItem(key);sessionStorage.removeItem(key);
 if(!verifier)throw Error('Connexion interrompue. Recommencez depuis cet onglet.');
 const r=await post('/auth/exchange',{ticket:match[1],verifier});
 if(typeof r.session!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(r.session) || r.expiresIn!==900)throw Error('Réponse de connexion invalide.');
 session=r.session;expires=Date.now()+r.expiresIn*1000;return true;
}
export async function logout(){const old=session;session='';expires=0;if(old)try{await fetch(endpoint('/auth/logout'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+old},body:'{}',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});}catch{/* Session locale effacée, session serveur expirera automatiquement. */}}
export const connected=()=>!!session && Date.now()<expires;
export async function request(body){return post('/api',body,true);}
let completion;
export async function renderReference(main,{onAuthenticated=()=>{}}={}){
 main.innerHTML='<section class="card"><h1>Paramétrage REC</h1><p id="rec-state" role="status">Vérification de l’accès…</p><div id="rec-actions"></div></section>';
 const status=main.querySelector('#rec-state'),actions=main.querySelector('#rec-actions');
 try{
  completion ??= completeLogin();await completion;
  if(!connected()){
   status.textContent='Le PIN de démonstration ne donne aucun accès aux données REC. Connectez le compte Google associé à votre adresse Hotmail autorisée.';
   const b=document.createElement('button');b.className='primary';b.textContent='Connexion sécurisée REC';b.onclick=async()=>{b.disabled=true;try{await login();}catch(e){status.textContent=e.message;b.disabled=false;}};actions.append(b);return;
  }
  const result=await request({action:'rec.status'});if(!result.ok || result.environment!=='REC')throw Error('Cible REC non confirmée.');
  onAuthenticated();
  status.textContent='REC authentifiée'+(result.authenticatedAs?.email?' : '+result.authenticatedAs.email:'')+' — '+(result.canWrite?'écritures V2 activées.':'lecture et simulation uniquement.');
  const out=document.createElement('button');out.className='secondary';out.textContent='Déconnecter REC';out.onclick=async()=>{await logout();renderReference(main);};actions.append(out);
  const note=document.createElement('p');note.textContent='Cautions : montant contractuel dans la location uniquement. Encaissements, retenues et restitutions ne sont pas implémentés.';main.append(note);
  window.recReferenceRequest=request;
  const frame=document.createElement('iframe');frame.src='referentiel/index.html';frame.title='Logements, locataires et historique des locations REC';frame.className='rec-reference-frame';main.append(frame);
 }catch(e){status.textContent=e.message;const b=document.createElement('button');b.textContent='Recommencer la connexion';b.onclick=async()=>{completion=Promise.resolve(false);await logout();renderReference(main);};actions.append(b);}
}
