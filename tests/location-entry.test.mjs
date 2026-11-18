import test from 'node:test';
import assert from 'node:assert/strict';
import { availableRentals, prepareTestRentPayment } from '../location-entry.mjs';

const response = { ok: true, environment: 'REC', state: {
  logements: [{ id: 'L1', numero: '01', type: 'F3', actif: true }, { id: 'L2', numero: '02', actif: true }],
  locataires: [{ id: 'T1', nom: 'Locataire fictif' }],
  baux: [{ id: 'B1', logementId: 'L1', locataireId: 'T1', statut: 'actif', arrivee: '2026-01-01', depart: null }],
  loyers: [{ bailId: 'B1', montant: 15000, effet: null }, { bailId: 'B1', montant: 18000, effet: '2026-11-01' }],
} };

test('propose uniquement les logements occupés et le loyer applicable à la date', () => {
  assert.equal(availableRentals(response, '2026-10-31')[0].loyer, 15000);
  const rows = availableRentals(response, '2026-11-18');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].loyer, 18000);
});

test('refuse une réponse non confirmée et les baux simultanés', () => {
  assert.throws(() => availableRentals({ ...response, environment: 'PROD' }, '2026-11-18'));
  const conflicting = structuredClone(response);
  conflicting.state.baux.push({ ...conflicting.state.baux[0], id: 'B2' });
  assert.throws(() => availableRentals(conflicting, '2026-11-18'), /Plusieurs locations/);
});

test('prépare une transaction uniquement fictive REC, sans écriture', () => {
  const rental = availableRentals(response, '2026-11-18')[0];
  const entry = prepareTestRentPayment({ rental, date: '2026-11-18', period: '2026-11', amount: 18000 });
  assert.equal(entry.testOnly, true);
  assert.equal(entry.environment, 'REC');
  assert.equal(entry.bailId, 'B1');
  assert.match(entry.description, /TEST REC/);
  assert.throws(() => prepareTestRentPayment({ rental, date: '2026-11-18', period: '2026-11', amount: -1 }));
});
