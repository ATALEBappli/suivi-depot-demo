// Export en tant que données d'un commit explicite. Jamais de secrets ou scripts de build exécutés.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const [sha,destination]=process.argv.slice(2);
if(!/^[a-f0-9]{40}$/.test(sha || '') || !destination)throw Error('SHA approuvé complet et dossier de sortie neuf requis.');
const git=(...args)=>execFileSync('git',args,{maxBuffer:3000000});
if(git('rev-parse',sha+'^{commit}').toString().trim()!==sha)throw Error('Commit absent.');
const files=git('ls-tree','-r','--name-only',sha).toString().trim().split('\n').filter(p=>['index.html','styles.css','app.mjs','model.mjs','finance-data.mjs','finance-model.mjs','finance-view.mjs','rec-client.mjs'].includes(p) || /^assets\/[A-Za-z0-9_-]+\.(svg|woff2|txt|md)$/.test(p) || /^referentiel\/(index.html|transport.js|referentiel-v2(?:-model|-import)?\.js|referentiel-v2.css)$/.test(p));
const out=resolve(destination);if(existsSync(out))throw Error('La sortie doit être neuve ; aucun remplacement implicite.');mkdirSync(out,{recursive:true});
const manifest={schema:1,repository:'ATALEBappli/suivi-depot-demo',sourceSha:sha,files:[]};
for(const p of files){
 const entry=git('ls-tree',sha,'--',p).toString();if(!entry.startsWith('100644 blob '))throw Error('Fichier non ordinaire.');
 let bytes=git('show',sha+':'+p);
 if(p==='index.html')bytes=Buffer.from(bytes.toString().replace(/connect-src [^;]+;/,"connect-src 'self';"));
 const target=out+'/'+p;mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);
 manifest.files.push({path:p,sha256:createHash('sha256').update(bytes).digest('hex')});
}
writeFileSync(out+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log('Assets Cloud Run exportés du commit '+sha+'. Aucune publication.');
