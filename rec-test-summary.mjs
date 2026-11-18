// Agrégation isolée du journal fictif REC. Jamais fusionnée à financeFixture.
function validDate(value) {
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value;
}
export function normalizeRecTestTransactions(response) {
  if(response?.ok!==true || response.environment!=='REC' || response.testOnly!==true || !Array.isArray(response.transactions))throw Error('Historique de test REC non confirmé.');
  return response.transactions.map(tx=>{
    const amount=tx?.amount;
    if(tx?.environment!=='REC' || tx.testOnly!==true || tx.activity!=='rental' || tx.direction!=='in' || tx.nature!=='income' ||
      !validDate(tx.operationDate) || typeof tx.period!=='string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(tx.period) ||
      typeof amount!=='number' || !Number.isFinite(amount) || amount<=0 || Math.abs(amount*100-Math.round(amount*100))>0.00001 ||
      !['cash','bank'].includes(tx.payment) || typeof tx.logementId!=='string' || !tx.logementId ||
      typeof tx.requestId!=='string' || !tx.requestId)throw Error('Historique REC incohérent : calcul impossible.');
    return {id:tx.requestId,operationDate:tx.operationDate,period:tx.period,amount,logementId:tx.logementId,payment:tx.payment};
  });
}
export function calculateRecTestSummary(transactions,{month='',housing=''}={}) {
  if(month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Mois invalide.');
  const filtered=transactions.filter(tx=>(!month || tx.operationDate.slice(0,7)===month) && (!housing || tx.logementId===housing));
  const cents=filtered.reduce((sum,tx)=>sum+Math.round(tx.amount*100),0);
  const cash=filtered.filter(tx=>tx.payment==='cash').reduce((sum,tx)=>sum+Math.round(tx.amount*100),0);
  return {count:filtered.length,total:cents/100,cash:cash/100,bank:(cents-cash)/100,
    transactions:[...filtered].sort((a,b)=>b.operationDate.localeCompare(a.operationDate) || b.id.localeCompare(a.id))};
}
