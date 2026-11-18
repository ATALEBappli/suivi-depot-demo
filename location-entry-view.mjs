import { connected, request } from './rec-client.mjs';
import { availableRentals, prepareTestRentPayment } from './location-entry.mjs';

const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date());
const text = (tag, value) => { const el = document.createElement(tag); el.textContent = String(value ?? ''); return el; };

export async function renderLocationEntry(main) {
  main.innerHTML = `<section class="form-page"><div class="page-top"><div><h1>Saisie — REC</h1><p>Enregistrement exclusivement fictif, dans un journal REC distinct</p></div><span class="badge">TEST REC</span></div>
    <form class="card" id="rental-entry"><div id="rental-status" role="status">Chargement du référentiel REC…</div>
    <div class="form-grid"><label class="field">Type<select name="direction"><option value="in">Entrée</option><option value="out">Sortie</option></select></label>
    <label class="field">Activité<select name="activity"><option value="rental">Dépôt locatif</option><option value="headm">HEADM — Construction</option><option value="common">Charges communes</option><option value="family">Famille / Divers</option></select></label>
    <label class="field">Catégorie<select name="category"><option value="rent">Loyer</option></select></label>
    <label class="field">Date d'opération<input type="date" name="date" required></label>
    <label class="field">Appartement<select name="housing" required><option value="">Chargement…</option></select></label>
    <label class="field">Locataire<input name="tenant" readonly></label>
    <label class="field">Période du loyer<input type="month" name="period" required></label>
    <label class="field">Montant (DA)<input type="number" name="amount" min="0.01" step="0.01" required></label>
    <label class="field">Paiement<select name="payment"><option value="cash">Espèces</option><option value="bank">Banque</option></select></label></div>
    <div class="panel" id="rental-preview" aria-live="polite">Choisissez un appartement pour voir la simulation.</div>
    <div class="form-footer"><button class="primary" type="submit">Prévisualiser TEST REC</button><button class="secondary" id="rental-save" type="button" disabled>Enregistrer TEST REC (désactivé)</button></div>
    <p class="hint">Écritures bloquées sauf activation serveur explicite REC et compte administrateur. Aucune opération PROD.</p></form>
    <section class="card"><h2>Opérations de test enregistrées en REC</h2><p id="rental-list" role="status">Lecture en cours…</p></section></section>`;
  const form = main.querySelector('#rental-entry'), status = form.querySelector('#rental-status');
  const field = name => form.elements.namedItem(name);
  field('date').value = today();field('period').value = today().slice(0, 7);
  let reference = null, rentals = [], valid = false, enabled = false, pending = null, busy = false;
  const preview = form.querySelector('#rental-preview'), save = form.querySelector('#rental-save'), list = main.querySelector('#rental-list');
  const saveState = () => {save.disabled = !enabled || !valid || busy || !connected();save.textContent = enabled ? 'Enregistrer TEST REC' : 'Enregistrer TEST REC (désactivé)';};
  function collect() {
    if (!connected() || !valid) throw Error('Opération indisponible : reconnectez-vous en REC ou sélectionnez Loyer.');
    const rental = rentals.find(r => r.bailId === field('housing').value);
    return {rental,transaction:prepareTestRentPayment({ rental, date: field('date').value, period: field('period').value,
      amount: field('amount').value, payment: field('payment').value })};
  }
  async function loadTests() {
    try {
      const r = await request({action:'rec.testTransaction.list'});
      if (r.ok !== true || r.environment !== 'REC' || r.testOnly !== true || !Array.isArray(r.transactions)) throw Error('Lecture REC non confirmée.');
      list.replaceChildren(text('p', `${r.transactions.length} transaction(s) fictive(s) en REC.`));
      const items = document.createElement('ul');
      for (const tx of r.transactions.slice(-20).reverse()) {
        if (tx.testOnly !== true || tx.environment !== 'REC') throw Error('Transaction non fictive détectée dans la réponse REC.');
        items.append(text('li', `${tx.operationDate} · ${tx.period} · ${Number(tx.amount).toLocaleString('fr-FR')} DA · TEST REC`));
      }
      list.append(items);
    } catch (error) { list.textContent = `Historique indisponible : ${error.message}`; }
  }
  function refresh() {
    if(pending) {preview.textContent='Une demande d’enregistrement reste incertaine. Réessayez la même demande sans modifier la saisie, ou rechargez après vérification.';return;}
    preview.textContent = 'Aucune transaction enregistrée.';
    field('tenant').value = '';field('amount').value = '';
    const select = field('housing'), old = select.value;
    select.replaceChildren(new Option('Choisir un appartement', ''));
    valid = field('direction').value === 'in' && field('activity').value === 'rental' && field('category').value === 'rent';
    if (!valid) {
      status.textContent = 'Seule la catégorie Entrée → Dépôt locatif → Loyer est disponible dans cette préparation.';
      select.disabled = true;
      return;
    }
    select.disabled = false;
    try {
      rentals = availableRentals(reference, field('date').value);
      for (const rental of rentals) select.add(new Option(`${rental.numero} — ${rental.type || 'Appartement'}`, rental.bailId));
      if (rentals.some(r => r.bailId === old)) select.value = old;
      status.textContent = `${rentals.length} location(s) active(s) à cette date dans le référentiel REC.`;
      selected();saveState();
    } catch (e) {
      status.textContent = e.message;
      select.disabled = true;
    }
  }
  function selected() {
    if(pending)return;
    const rental = rentals.find(r => r.bailId === field('housing').value);
    field('tenant').value = rental?.locataire || '';
    field('amount').value = rental ? String(rental.loyer) : '';
    preview.textContent = rental ? `Loyer suggéré : ${rental.loyer.toLocaleString('fr-FR')} DA (modifiable). Aucun enregistrement effectué.` : 'Choisissez un appartement.';
  }
  for (const name of ['date', 'direction', 'activity', 'category']) field(name).addEventListener('change', refresh);
  field('housing').addEventListener('change', selected);
  form.addEventListener('submit', e => {
    e.preventDefault();
    try {
      const {rental,transaction} = collect();
      preview.replaceChildren(text('strong', 'Aperçu uniquement — aucune écriture :'),
        text('p', `${rental.numero} · ${rental.locataire} · ${transaction.period} · ${transaction.amount.toLocaleString('fr-FR')} DA · ${transaction.payment === 'cash' ? 'Espèces' : 'Banque'} · TEST REC`));
    } catch (error) { preview.textContent = error.message; }
  });
  save.addEventListener('click',async () => {
    if(!enabled || busy || !connected())return;
    try {
      const {rental,transaction}=collect();
      if(pending && JSON.stringify(pending.transaction)!==JSON.stringify(transaction))throw Error('Demande incertaine : ne modifiez pas les données avant la vérification.');
      if(!window.confirm(`Confirmer une écriture FICTIVE REC pour ${rental.numero}, période ${transaction.period}, montant ${transaction.amount} DA ?`))return;
      pending ??= {action:'rec.testTransaction.create',requestId:crypto.randomUUID(),transaction};
      busy=true;saveState();
      const response=await request(pending);
      if(response.ok!==true || response.environment!=='REC' || response.testOnly!==true || response.requestId!==pending.requestId)throw Error('Confirmation REC invalide. Vérifier l’historique avant de réessayer.');
      pending=null;
      preview.textContent='✅ Transaction fictive REC enregistrée. Aucune opération PROD.';
      await loadTests();
    }catch(error){preview.textContent=error.message+' Si la réponse est incertaine, réessayez sans modifier les champs.';}
    finally{busy=false;saveState();}
  });
  if (!connected()) {status.textContent = 'Connexion REC requise. Ouvrez Paramétrage et connectez votre compte Google autorisé.';form.querySelectorAll('input, select, button').forEach(el => el.disabled = true);return;}
  try {
    const [data,statusResponse] = await Promise.all([request({ action: 'v2.read' }),request({action:'rec.status'})]);
    if (!main.contains(form)) return;
    if(statusResponse.ok!==true || statusResponse.environment!=='REC')throw Error('Environnement REC non confirmé.');
    enabled=statusResponse.canWrite===true && statusResponse.testTransactionsEnabled===true;
    reference = { ...data, environment: 'REC' };
    if (data.ok !== true || !data.state) throw Error('Référentiel REC inaccessible.');
    refresh();
    saveState();
    await loadTests();
  } catch (e) {status.textContent = e.message;form.querySelectorAll('input, select, button').forEach(el => el.disabled = true);}
}
