import { defaults, opposite, append, output, restore } from './core.js';
const $ = id => document.getElementById(id);
const key = 'alt-paste-v1';
let state = defaults(), history = [], editing = null, busy = false, storageBlocked = false;
try { const raw = localStorage.getItem(key); if (raw) state = restore(raw); }
catch { storageBlocked = true; $('saveStatus').textContent = '保存データを読み込めないため自動保存は停止中'; }
const say = message => { $('status').textContent = message; };
function save() {
  if (storageBlocked) return;
  try { localStorage.setItem(key, JSON.stringify(state)); $('saveStatus').textContent = 'この端末に自動保存'; }
  catch { $('saveStatus').textContent = '保存できないため、コピーして控えてね'; }
}
function snapshot() { history.push(JSON.stringify(state)); if (history.length > 20) history.shift(); }
function render() {
  $('nextName').textContent = state.names[state.next];
  $('turnLabel').textContent = state.entries.length ? '次に貼る発言者' : '最初の発言者';
  document.querySelector('.segmented').hidden = !!state.entries.length;
  $('switchNext').hidden = !state.entries.length;
  ['startUser', 'startAI'].forEach((id, role) => { $(id).textContent = state.names[role]; $(id).setAttribute('aria-pressed', String(state.next === role)); });
  $('count').textContent = state.entries.length;
  $('characters').textContent = `${output(state).length.toLocaleString()} 文字`;
  $('copyButton').disabled = $('clearButton').disabled = !state.entries.length;
  $('undoButton').disabled = !history.length;
  $('pasteInput').value = state.draft;
  $('addDraft').hidden = !state.draft.trim();
  const log = $('log'); log.replaceChildren();
  if (!state.entries.length) {
    const empty = document.createElement('div'); empty.className = 'empty';
    empty.innerHTML = '<span aria-hidden="true">↔</span><p>会話を、ひとつずつ。</p><small>発言者は貼るたびに自動で切り替わる。</small>';
    log.append(empty);
  }
  for (const entry of state.entries) {
    const article = document.createElement('article'); article.className = 'entry'; article.dataset.role = entry.role;
    const head = document.createElement('div'); head.className = 'entry-head';
    const speaker = document.createElement('span'); speaker.className = 'speaker'; speaker.textContent = state.names[entry.role];
    const edit = document.createElement('button'); edit.className = 'quiet'; edit.textContent = '編集'; edit.setAttribute('aria-label', `${state.names[entry.role]}の発言を編集`); edit.onclick = () => openEdit(entry.id);
    const body = document.createElement('pre'); body.textContent = entry.text;
    head.append(speaker, edit); article.append(head, body); log.append(article);
  }
}
function add(text) {
  if (!text.trim()) { say('文字のある発言をコピーしてから貼ってね。'); return; }
  snapshot(); const name = state.names[state.next]; append(state, text); state.draft = ''; save(); render();
  $('log').scrollTop = $('log').scrollHeight; say(`${name}の発言を追加。次は${state.names[state.next]}。`);
}
$('pasteInput').addEventListener('paste', event => {
  if (!event.clipboardData) return;
  event.preventDefault();
  const pasted = event.clipboardData.getData('text/plain');
  if (state.draft) {
    const field = $('pasteInput');
    state.draft = state.draft.slice(0, field.selectionStart) + pasted + state.draft.slice(field.selectionEnd);
    field.value = state.draft; $('addDraft').hidden = !state.draft.trim(); save();
    say('入力中の文章に貼り付けた。「入力分を追加」で確定。'); return;
  }
  add(pasted);
});
$('pasteInput').addEventListener('input', event => { state.draft = event.target.value; $('addDraft').hidden = !state.draft.trim(); save(); });
$('addDraft').onclick = () => add(state.draft);
$('pasteButton').onclick = async () => {
  if (state.draft.trim()) { say('入力中の文章を先に追加するか、消してから貼ってね。'); $('pasteInput').focus(); return; }
  if (busy) return;
  busy = true; $('pasteButton').disabled = true;
  try {
    if (!navigator.clipboard?.readText) throw new Error('Clipboard unavailable');
    const text = await navigator.clipboard.readText(); add(text);
  } catch { say('下の欄を長押しして「ペースト」、または Ctrl・⌘ + V で貼れる。'); $('pasteInput').focus(); }
  finally { busy = false; $('pasteButton').disabled = false; }
};
function selectStart(role) { snapshot(); state.start = state.next = role; save(); render(); say(`${state.names[role]}から始める。`); }
$('startUser').onclick = () => selectStart(0); $('startAI').onclick = () => selectStart(1);
$('switchNext').onclick = () => { snapshot(); state.next = opposite(state.next); save(); render(); say(`次は${state.names[state.next]}。追加済みの発言はそのまま。`); };
$('undoButton').onclick = () => { if (!history.length) return; state = restore(history.pop()); save(); render(); say('直前の操作を取り消した。'); };
$('settingsButton').onclick = () => { $('userName').value = state.names[0]; $('aiName').value = state.names[1]; $('format').value = state.format; $('settingsDialog').showModal(); };
$('settingsForm').onsubmit = event => { event.preventDefault(); snapshot(); state.names = [$('userName').value.trim() || 'ユーザー', $('aiName').value.trim() || 'AI']; state.format = $('format').value; save(); render(); $('settingsDialog').close(); say('設定を保存した。'); };
function openEdit(id) {
  const entry = state.entries.find(e => e.id === id); if (!entry) return;
  editing = id; Array.from($('editRole').options).forEach((o, i) => o.textContent = state.names[i]);
  $('editRole').value = entry.role; $('editText').value = entry.text; $('editDialog').showModal();
}
$('editForm').onsubmit = event => {
  event.preventDefault(); const text = $('editText').value; if (!text.trim()) return;
  const entry = state.entries.find(e => e.id === editing); if (!entry) return;
  snapshot(); entry.text = text; entry.role = Number($('editRole').value);
  if (entry === state.entries.at(-1)) state.next = opposite(entry.role);
  save(); render(); $('editDialog').close(); say('発言を更新した。');
};
$('deleteEntry').onclick = () => {
  snapshot(); const wasLast = state.entries.at(-1)?.id === editing;
  state.entries = state.entries.filter(e => e.id !== editing);
  if (wasLast) state.next = state.entries.length ? opposite(state.entries.at(-1).role) : state.start;
  save(); render(); $('editDialog').close(); say('発言を削除した。「取り消し」で戻せる。');
};
$('clearButton').onclick = () => $('clearDialog').showModal();
$('confirmClear').onclick = () => { snapshot(); state.entries = []; state.next = state.start; save(); render(); $('clearDialog').close(); say('ログを消去した。「取り消し」で戻せる。'); };
$('copyButton').onclick = async () => {
  const text = output(state);
  try { await navigator.clipboard.writeText(text); say(`${state.entries.length}件のログをコピーした。`); }
  catch {
    $('copyText').value = text; $('copyDialog').showModal(); $('copyText').focus(); $('copyText').select(); $('copyText').setSelectionRange(0, text.length);
  }
};
$('selectCopy').onclick = () => { $('copyText').focus(); $('copyText').select(); $('copyText').setSelectionRange(0, $('copyText').value.length); };
document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => $(button.dataset.close).close());
render();
if (state.entries.length) say(`${state.entries.length}件のログを復元。次は${state.names[state.next]}。`);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => { $('saveStatus').textContent += ' · オフライン準備は未完了'; });
