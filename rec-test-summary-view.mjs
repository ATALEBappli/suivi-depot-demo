import {connected,request} from './rec-client.mjs';
import {normalizeRecTestTransactions,calculateRecTestSummary} from './rec-test-summary.mjs';

const money=value=>`${value.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} DA`;
const label=(tag,value)=>{const node=document.createElement(tag);node.textContent=String(value);return node;};

export async function renderRecTestSummary(main) {
  main.innerHTML=`<section class="finance-page"><div class="page-top"><div><h1>Synthèse des tests REC</h1><p>Uniquement les transactions locatives fictives ; aucune donnée PROD ou caisse réelle.</p></div><span class="badge">TEST REC</span></div>
  <section class="card"><h2>Filtres</h2><div class="form-grid"><label class="field">Mois de saisie<select id="rec-month"><option value="">Tous les mois</option></select></label><label class="field">Appartement<select id="rec-housing"><option value="">Tous les appartements</option></select></label></div><p id="rec-summary-status" role="status">Chargement sécurisé de REC…</p></section>
  <section class="indicator-grid" aria-label="Totaux fictifs"><article class="card"><h3>Entrées test</h3><strong id="rec-total">—</strong></article><article class="card"><h3>Espèces test</h3><strong id="rec-cash">—</strong></article><article class="card"><h3>Banque test</h3><strong id="rec-bank">—</strong></article><article class="card"><h3>Opérations</h3><strong id="rec-count">—</strong></article></section>
  <section class="card"><h2>Historique fictif</h2><div style="overflow-x:auto"><table><thead><tr><th>Date</th><th>Appartement</th><th>Période du loyer</th><th>Règlement</th><th>Montant test</th></tr></thead><tbody id="rec-transactions"></tbody></table></div></section></section>`;
  const $=id=>main.querySelector('#'+id),status=$('rec-summary-status');
  if(!connected()){status.textContent='Connexion Google REC requise depuis Paramétrage.';return;}
  try {
    const [response,reference]=await Promise.all([request({action:'rec.testTransaction.list'}),request({action:'v2.read'})]);
    if(!main.contains(status))return;
    const transactions=normalizeRecTestTransactions(response);
    if(reference.ok!==true || !Array.isArray(reference.state?.logements))throw Error('Référentiel REC non confirmé.');
    const housingNames=new Map(reference.state.logements.map(r=>[r.id,`${r.numero} — ${r.type || 'Appartement'}`]));
    const months=[...new Set(transactions.map(t=>t.operationDate.slice(0,7)))].sort().reverse();
    for(const month of months) $('rec-month').add(new Option(month,month));
    for(const id of [...new Set(transactions.map(t=>t.logementId))].sort((a,b)=>(housingNames.get(a)||a).localeCompare(housingNames.get(b)||b,'fr',{numeric:true}))) $('rec-housing').add(new Option(housingNames.get(id)||'Logement archivé',id));
    function render() {
      const report=calculateRecTestSummary(transactions,{month:$('rec-month').value,housing:$('rec-housing').value});
      $('rec-total').textContent=money(report.total);$('rec-cash').textContent=money(report.cash);
      $('rec-bank').textContent=money(report.bank);$('rec-count').textContent=String(report.count);
      status.textContent=`${report.count} transaction(s) fictive(s) affichée(s). Aucun impact sur la Synthèse réelle.`;
      const body=$('rec-transactions');body.replaceChildren();
      if(!report.count){const tr=document.createElement('tr'),td=label('td','Aucune transaction de test pour ces filtres.');td.colSpan=5;tr.append(td);body.append(tr);return;}
      for(const tx of report.transactions){const tr=document.createElement('tr');
        for(const value of [tx.operationDate,housingNames.get(tx.logementId)||'Logement archivé',tx.period,tx.payment==='cash'?'Espèces':'Banque',money(tx.amount)])tr.append(label('td',value));
        body.append(tr);
      }
    }
    $('rec-month').addEventListener('change',render);$('rec-housing').addEventListener('change',render);render();
  }catch(error){status.textContent='Synthèse REC indisponible : '+error.message;}
}
