// Seule configuration publique : origine HTTPS Cloud Run. Aucun jeton ni clé.
import {readFileSync,writeFileSync} from 'node:fs';
const u=new URL(process.env.REC_SERVER_URL || '');
if(u.protocol!=='https:' || !u.hostname.endsWith('.run.app') || u.port || u.pathname!=='/' || u.search || u.hash || u.username || u.password)throw Error('URL HTTPS Cloud Run REC requise, sans chemin ni paramètres.');
const html=readFileSync('index.html','utf8');
const next=html.replace(/connect-src [^;]+;/,()=>"connect-src 'none';");
if(next===html && !html.includes("connect-src 'none';"))throw Error('CSP introuvable.');
writeFileSync('rec-config.mjs','// Configuration publique REC, aucun secret.\nexport default Object.freeze('+JSON.stringify({apiBase:u.origin})+');\n');
writeFileSync('index.html',next);
