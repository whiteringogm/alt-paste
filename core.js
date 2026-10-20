export const defaults = () => ({ version: 1, names: ['ユーザー', 'AI'], format: 'brackets', start: 0, next: 0, entries: [], draft: '' });
export const opposite = role => role === 0 ? 1 : 0;
export function append(state, text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  state.entries.push({ id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, role: state.next, text });
  state.next = opposite(state.next);
  return true;
}
export function output(state) {
  return state.entries.map(e => `${state.format === 'colon' ? state.names[e.role] + '：' : '【' + state.names[e.role] + '】'}\n${e.text}`).join('\n\n');
}
export function restore(raw) {
  const s = JSON.parse(raw);
  if (!s || s.version !== 1 || !Array.isArray(s.entries) || !Array.isArray(s.names) || s.names.length !== 2 || !s.names.every(n => typeof n === 'string') || ![0, 1].includes(s.start) || ![0, 1].includes(s.next) || !['brackets', 'colon'].includes(s.format) || !s.entries.every(e => e && typeof e.id === 'string' && [0, 1].includes(e.role) && typeof e.text === 'string')) throw new Error('Invalid saved data');
  s.draft = typeof s.draft === 'string' ? s.draft : '';
  return s;
}
