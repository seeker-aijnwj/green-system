// Tests unitaires des utilitaires de notification : npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { gsmSafe, inQuiet, maskEmail, maskPhone, normPhone, validEmail, validPhone } from '../server/notify/util.js';
import { MESSAGES } from '../server/notify/messages.js';

test('numéros : format ivoirien et international', () => {
  assert.equal(normPhone('01 02 03 04 05'), '+2250102030405');
  assert.equal(normPhone('00225 01 02 03 04 05'), '+2250102030405');
  assert.equal(normPhone('+225 07-00-00-00-01'), '+225070000000' + '1');
  assert.ok(validPhone('0102030405') && validPhone('+33612345678'));
  assert.ok(!validPhone('abc') && !validPhone('12345') && !validPhone('+0123456789'));
});
test('e-mails', () => { assert.ok(validEmail('a@b.ci')); assert.ok(!validEmail('a@b') && !validEmail('')); });
test('masquage des coordonnées dans le journal', () => {
  assert.equal(maskEmail('yao.kouadio@uscaep.test'), 'y***@uscaep.test');
  assert.equal(maskPhone('+2250102030405'), '+225****05');
});
test('heures calmes (GMT)', () => {
  assert.ok(inQuiet(21, '20-7') && inQuiet(3, '20-7') && inQuiet(20, '20-7'));
  assert.ok(!inQuiet(7, '20-7') && !inQuiet(12, '20-7') && !inQuiet(19, '20-7'));
  assert.ok(!inQuiet(3, 'off') && inQuiet(5, '0-24') && inQuiet(10, '9-12') && !inQuiet(13, '9-12'));
});
test('SMS : tous les messages restent en alphabet GSM (160 caractères)', () => {
  assert.equal(gsmSafe('Bien reçu à l\u202f5\u202f000 kg, très bon œuf ê « ok »'), 'Bien recu à l 5 000 kg, très bon oeuf e " ok "');
  for (const [type, tpl] of Object.entries(MESSAGES)) {
    const sms = gsmSafe(tpl({ name: 'Yao', kg: 1234567, qty: 5000, product: 'cacao', rank: 1, max: 3, coop: 'Daloa', company: 'CocoaTrade', price: 1300, proposedAt: Date.now() }).sms);
    assert.ok(/^[\x20-\x7e\néèùàÉ£$¥]*$/.test(sms), `${type} contient un caractère hors GSM : ${sms}`);
    assert.ok(sms.length <= 160, `${type} dépasse un SMS (${sms.length}) : ${sms}`);
  }
});
