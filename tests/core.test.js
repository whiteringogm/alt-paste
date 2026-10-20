import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, append, output, restore } from '../core.js';
test('paste alternates from either starting side, preserves whitespace and ignores empty text', () => {
  for (const first of [0, 1]) {
    const s = defaults(); s.start = s.next = first;
    assert.equal(append(s, ' \n'), false); assert.equal(s.next, first);
    append(s, '  一行目\n\n二行目  '); append(s, '<script>not executable</script>'); append(s, '三つ目');
    assert.deepEqual(s.entries.map(e => e.role), [first, 1-first, first]);
    assert.equal(s.entries[0].text, '  一行目\n\n二行目  ');
    assert.equal(s.next, 1-first);
    assert.deepEqual(restore(JSON.stringify(s)), s);
  }
});
test('copy has names, blank-line boundaries and exact message body', () => {
  const s = defaults(); append(s, 'こんにちは\n続き'); append(s, '返事');
  assert.equal(output(s), '【ユーザー】\nこんにちは\n続き\n\n【AI】\n返事');
  s.names = ['A', 'B']; s.format = 'colon';
  assert.equal(output(s), 'A：\nこんにちは\n続き\n\nB：\n返事');
});
test('invalid saved data is rejected rather than silently overwritten', () => {
  assert.throws(() => restore('{'));
  const s = defaults(); s.entries = [{id: '1', role: 8, text: 'bad'}];
  assert.throws(() => restore(JSON.stringify(s)));
});
