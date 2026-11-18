import { connected, request } from './rec-client.mjs';
import { availableRentals, prepareTestRentPayment } from './location-entry.mjs';

const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date());
const text = (tag, value) => { const el = document.createElement(tag); el.textContent = String(value ?? ''); return el; };

export async function renderLocationEntry(main) {
  main.innerHTML = `<section class="form-page"><div class="page-top"><div><h1>Saisie — REC</h1><p>Référentiel des logements REC · aucune transaction enregistrée à cette étape</p></div><span class="badge">TEST REC</span></div>
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
    <div class="form-footer"><button class="primary" type="submit">Prévisualiser TEST REC</button><button class="secondary" type="button" disabled title="API de transactions REC encore indisponible">Enregistrer (indisponible)</button></div>
    <p class="hint">L'aperçu ne crée aucune transaction. Les écritures nécessitent une API REC dédiée, authentifiée et idempotente.</p></form></section>`;
  const form = main.querySelector('#rental-entry'), status = form.querySelector('#rental-status');
  const field = name => form.elements.namedItem(name);
  field('date').value = today();field('period').value = today().slice(0, 7);
  let reference = null, rentals = [], valid = false;
  const preview = form.querySelector('#rental-preview');
  function refresh() {
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
      selected();
    } catch (e) {
      status.textContent = e.message;
      select.disabled = true;
    }
  }
  function selected() {
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
      if (!connected() || !valid) throw Error('Opération indisponible : reconnectez-vous en REC ou sélectionnez Loyer.');
      const rental = rentals.find(r => r.bailId === field('housing').value);
      const transaction = prepareTestRentPayment({ rental, date: field('date').value, period: field('period').value,
        amount: field('amount').value, payment: field('payment').value });
      preview.replaceChildren(text('strong', 'Aperçu uniquement — aucune écriture :'),
        text('p', `${rental.numero} · ${rental.locataire} · ${transaction.period} · ${transaction.amount.toLocaleString('fr-FR')} DA · ${transaction.payment === 'cash' ? 'Espèces' : 'Banque'} · TEST REC`));
    } catch (error) { preview.textContent = error.message; }
  });
  if (!connected()) {status.textContent = 'Connexion REC requise. Ouvrez Paramétrage et connectez votre compte Google autorisé.';form.querySelectorAll('input, select, button').forEach(el => el.disabled = true);return;}
  try {
    const data = await request({ action: 'v2.read' });
    if (!main.contains(form)) return;
    reference = { ...data, environment: 'REC' };
    if (data.ok !== true || !data.state) throw Error('Référentiel REC inaccessible.');
    refresh();
  } catch (e) {status.textContent = e.message;form.querySelectorAll('input, select, button').forEach(el => el.disabled = true);}
}
