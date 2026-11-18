import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecTestTransactions,calculateRecTestSummary} from '../rec-test-summary.mjs';
const tx=(id,date,amount,payment='cash',logementId='L1')=>({requestId:id,environment:'REC',testOnly:true,activity:'rental',direction:'in',nature:'income',operationDate:date,period:date.slice(0,7),amount,payment,logementId});
test('synthèse fictive : filtres et calculs en centimes',()=>{
 const data=normalizeRecTestTransactions({ok:true,environment:'REC',testOnly:true,transactions:[tx('a','2026-11-18',15000.25),tx('b','2026-11-16',5000.10,'bank'),tx('c','2026-10-15',1000,'cash','L2')]});
 assert.deepEqual({...calculateRecTestSummary(data,{month:'2026-11'}),transactions:[]},{count:2,total:20000.35,cash:15000.25,bank:5000.10,transactions:[]});
 assert.equal(calculateRecTestSummary(data,{housing:'L2'}).total,1000);
 assert.equal(calculateRecTestSummary(data).transactions[0].id,'a');
});
test('refuse les réponses étrangères ou les écritures sans marquage de test',()=>{
 const base={ok:true,environment:'REC',testOnly:true,transactions:[tx('a','2026-11-18',100)]};
 for(const altered of [{...base,environment:'PROD'},{...base,testOnly:false},{...base,transactions:[{...base.transactions[0],testOnly:false}]},{...base,transactions:[{...base.transactions[0],operationDate:'2026-02-31'}]},{...base,transactions:[{...base.transactions[0],amount:-10}]}])assert.throws(()=>normalizeRecTestTransactions(altered));
});
test('ne mélange jamais les mois de saisie et n’invente pas les sorties',()=>{
 const data=normalizeRecTestTransactions({ok:true,environment:'REC',testOnly:true,transactions:[tx('a','2026-11-30',100),tx('b','2026-12-01',200)]});
 const r=calculateRecTestSummary(data,{month:'2026-11'});assert.equal(r.count,1);assert.equal(r.total,100);assert.equal(r.bank,0);
});
