import assert from 'node:assert/strict';
import {normalizeAngle,turntableView} from '../lib/turntable.ts';

assert.equal(normalizeAngle(361),1);
assert.equal(normalizeAngle(-1),359);
assert.equal(normalizeAngle(720),0);
assert.equal(normalizeAngle(Number.NaN),0);
assert.equal(turntableView(0),'front');
assert.equal(turntableView(90),'side');
assert.equal(turntableView(180),'back');
assert.equal(turntableView(270),'side');
assert.equal(turntableView(359),'front');

console.log('Turntable angle checks passed: wraparound and front/side/back labels.');
