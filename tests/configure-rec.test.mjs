import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const script=fileURLToPath(new URL('../scripts/configure-rec.mjs',import.meta.url));
test('configuration publique : origine Cloud Run explicite, CSP bornée et aucun secret',()=>{
 const dir=mkdtempSync(tmpdir()+'/rec-front-');
 try{
  writeFileSync(dir+'/index.html',`<meta content="connect-src 'none'; frame-src 'self';">`);
  for(const url of ['http://fake.run.app','https://script.google.com/macros/s/PROD_FICTIF/exec','https://fake.run.app/secret','https://fake.run.app/?token=fictif'])assert.notEqual(spawnSync(process.execPath,[script],{cwd:dir,env:{...process.env,REC_SERVER_URL:url}}).status,0);
  assert.equal(readFileSync(dir+'/index.html','utf8').includes("connect-src 'none'"),true);
  assert.equal(spawnSync(process.execPath,[script],{cwd:dir,env:{...process.env,REC_SERVER_URL:'https://rec-fictif.run.app'}}).status,0);
  assert.match(readFileSync(dir+'/index.html','utf8'),/connect-src https:\/\/rec-fictif.run.app;/);
  assert.match(readFileSync(dir+'/rec-config.mjs','utf8'),/apiBase/);assert.doesNotMatch(readFileSync(dir+'/rec-config.mjs','utf8'),/client_secret|refresh_token|REC_GATEWAY_KEY/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
