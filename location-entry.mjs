// Adaptateur de lecture pour la saisie des loyers en REC.
// Ne contient aucune donnée personnelle et ne déclenche aucune écriture.
const isoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z'));

export function availableRentals(response, date) {
  if (!isoDate(date)) throw Error('Date de saisie invalide.');
  if (response?.ok !== true || response?.environment && response.environment !== 'REC' || !response.state) throw Error('Référentiel REC non confirmé.');
  const { logements, baux, locataires, loyers } = response.state;
  if (![logements, baux, locataires, loyers].every(Array.isArray)) throw Error('Référentiel incomplet.');
  return logements.filter(l => l.actif === true).flatMap(logement => {
    const contrats = baux.filter(b => b.logementId === logement.id && b.statut === 'actif' &&
      (!b.arrivee || b.arrivee <= date) && (!b.depart || b.depart > date));
    if (contrats.length > 1) throw Error('Plusieurs locations actives pour un même logement.');
    return contrats.flatMap(bail => {
      const locataire = locataires.find(t => t.id === bail.locataireId);
      const versions = loyers.filter(l => l.bailId === bail.id && (!l.effet || l.effet <= date))
        .sort((a, b) => (b.effet || '').localeCompare(a.effet || ''));
      if (!locataire || !versions.length) return [];
      const montant = Number(versions[0].montant);
      if (!Number.isFinite(montant) || montant < 0) throw Error('Loyer du référentiel invalide.');
      return [{ logementId: logement.id, numero: logement.numero, type: logement.type,
        bailId: bail.id, locataireId: locataire.id, locataire: locataire.nom, loyer: montant }];
    });
  }).sort((a, b) => String(a.numero).localeCompare(String(b.numero), 'fr', { numeric: true }));
}

export function prepareTestRentPayment({ rental, date, period, amount, payment = 'cash' }) {
  if (!rental?.bailId || !rental.logementId || !rental.locataireId) throw Error('Sélectionner une location issue du référentiel REC.');
  if (!isoDate(date) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw Error('Date ou période de loyer invalide.');
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0 || Math.round(value * 100) !== value * 100) throw Error('Montant de test invalide.');
  if (!['cash', 'bank'].includes(payment)) throw Error('Mode de paiement invalide.');
  return { environment: 'REC', testOnly: true, activity: 'rental', direction: 'in', nature: 'income',
    operationDate: date, period, amount: value, payment, logementId: rental.logementId,
    bailId: rental.bailId, locataireId: rental.locataireId, description: `Loyer ${period} — TEST REC` };
}
