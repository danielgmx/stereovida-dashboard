// Noticias del sitio web: se buscan solas cada 2 horas; aquí se revisan, se quitan (una o varias a la vez)
// y se bloquean por palabras. Las notas viven en el Worker del sitio (stereovida1023.com/api).
const SectionNews = (() => {
  const API_URL = window.SV_NEWS_API || 'https://stereovida1023.com/api/admin'; // SV_NEWS_API solo se usa para pruebas
  let data = { items: [], words: [], perDay: 3, home: 12, keepDays: 60, updated: null };
  let filter = 'all', query = '';
  const selected = new Set();

  async function call(path, body) {
    const res = await fetch(`${API_URL}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Authorization': Auth.getToken(), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401) throw new Error('Tu sesión venció. Cierra sesión y vuelve a entrar.');
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
  }

  const html = () => `
    <div class="section-header">
      <h1>Noticias</h1>
      <button class="btn btn-ghost" id="nw-refresh" onclick="SectionNews.refreshNow()">Buscar notas nuevas ahora</button>
    </div>
    <p class="muted" style="margin-bottom:6px;font-size:13px;">Las notas de espectáculos (música, cine y televisión de México y Estados Unidos) se buscan solas cada 2 horas y se guardan 2 meses. En la portada del sitio salen las 12 más nuevas que no hayas quitado. Los cambios se ven en el sitio en pocos minutos.</p>
    <p class="muted" id="nw-info" style="margin-bottom:16px;font-size:12.5px;"></p>
    <div class="nw-top">
      <div class="card nw-card">
        <h3>Palabras bloqueadas</h3>
        <p class="muted">Si una nota menciona alguna de estas palabras o frases, no entra y se oculta del sitio. Ejemplo: <em>Shakira</em>. No importan mayúsculas ni acentos.</p>
        <div class="nw-add"><input type="text" id="nw-word" placeholder="Escribe una palabra o frase" /><button class="btn btn-primary" onclick="SectionNews.addWord()">Agregar</button></div>
        <div class="nw-chips" id="nw-chips"></div>
      </div>
      <div class="card nw-card">
        <h3>Notas nuevas por día</h3>
        <p class="muted">Máximo de notas que entran cada día, sumando todas las fuentes (de 1 a 10).</p>
        <div class="nw-add"><input type="number" id="nw-perday" min="1" max="10" value="3" /><button class="btn btn-primary" onclick="SectionNews.savePerDay()">Guardar</button></div>
        <span id="nw-status" class="status-msg hidden"></span>
      </div>
    </div>
    <div class="nw-bar">
      <div class="nw-tabs" id="nw-tabs"></div>
      <input type="search" id="nw-q" placeholder="Buscar en los títulos" />
    </div>
    <div class="nw-bulk" id="nw-bulk"></div>
    <div id="nw-list" class="nw-list"><div class="loading-placeholder">Cargando...</div></div>`;

  async function load() {
    const list = document.getElementById('nw-list');
    try { data = await call('/news'); }
    catch (e) { list.innerHTML = `<p class="muted empty-state">${esc(e.message)}</p>`; return; }
    selected.clear();
    document.getElementById('nw-q').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); paint(); });
    document.getElementById('nw-word').addEventListener('keydown', (e) => { if (e.key === 'Enter') addWord(); });
    paint();
  }

  const state = (n) => (n.hidden ? 'hidden' : n.blocked ? 'blocked' : n.onSite ? 'site' : 'archive');
  const labels = { site: ['En la portada', 'badge-on'], archive: ['Archivo', 'badge-off'], hidden: ['Quitada', 'badge-off'], blocked: ['Bloqueada', 'badge-off'] };
  const fmt = (iso) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Chicago' });

  function paint() {
    const items = data.items;
    const count = (f) => items.filter((n) => f === 'all' || state(n) === f).length;
    document.getElementById('nw-info').textContent = `${items.length} notas guardadas · ${count('site')} en la portada · última búsqueda: ${data.updated ? new Date(data.updated).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago' }) : 'aún no'}`;
    document.getElementById('nw-perday').value = data.perDay;
    document.getElementById('nw-chips').innerHTML = data.words.length
      ? data.words.map((w) => `<span class="nw-chip">${esc(w)}<button title="Quitar" onclick="SectionNews.removeWord('${esc(w).replace(/'/g, '&#39;')}')">✕</button></span>`).join('')
      : '<span class="muted">Aún no hay palabras bloqueadas.</span>';
    document.getElementById('nw-tabs').innerHTML = [['all', 'Todas'], ['site', 'En la portada'], ['archive', 'Archivo'], ['hidden', 'Quitadas'], ['blocked', 'Bloqueadas']]
      .map(([f, l]) => `<button class="nw-tab ${filter === f ? 'is-on' : ''}" onclick="SectionNews.setFilter('${f}')">${l} <span>${count(f)}</span></button>`).join('');
    const shown = items.filter((n) => (filter === 'all' || state(n) === filter) && (!query || n.title.toLowerCase().includes(query)));
    const el = document.getElementById('nw-list');
    if (!shown.length) { el.innerHTML = '<p class="muted empty-state">No hay notas con ese filtro.</p>'; renderBulk(shown); return; }
    el.innerHTML = shown.map((n) => {
      const st = state(n), [label, cls] = labels[st];
      return `
      <div class="nw-row ${selected.has(n.slug) ? 'is-sel' : ''}">
        <input type="checkbox" class="nw-chk" data-slug="${esc(n.slug)}" ${selected.has(n.slug) ? 'checked' : ''} aria-label="Seleccionar" />
        <img class="nw-thumb" src="${esc(n.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
        <div class="nw-txt">
          <a class="nw-title" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a>
          <div class="nw-meta">${esc(n.source)} · ${esc(fmt(n.date))}${n.blocked ? ` · contiene «${esc(n.blocked)}»` : ''}</div>
        </div>
        <span class="badge ${cls}">${label}</span>
        ${n.hidden
          ? `<button class="btn btn-ghost" onclick="SectionNews.setHidden(['${esc(n.slug)}'], false)">Restaurar</button>`
          : `<button class="btn-icon btn-danger" title="Quitar" onclick="SectionNews.setHidden(['${esc(n.slug)}'], true)">${Icons.trash}</button>`}
      </div>`;
    }).join('');
    el.querySelectorAll('.nw-chk').forEach((c) => c.addEventListener('change', () => {
      c.checked ? selected.add(c.dataset.slug) : selected.delete(c.dataset.slug);
      c.closest('.nw-row').classList.toggle('is-sel', c.checked); renderBulk(shown);
    }));
    renderBulk(shown);
  }

  // Barra de acciones en bloque: seleccionar todas las visibles, quitar o restaurar varias a la vez.
  function renderBulk(shown) {
    const bar = document.getElementById('nw-bulk');
    const n = selected.size, allOn = shown.length && shown.every((x) => selected.has(x.slug));
    const toRestore = [...selected].filter((s) => data.items.find((x) => x.slug === s)?.hidden).length;
    bar.innerHTML = `
      <label class="nw-all"><input type="checkbox" id="nw-all" ${allOn ? 'checked' : ''} /> Seleccionar todas las que se ven (${shown.length})</label>
      ${n ? `<span class="nw-count">${n} seleccionada${n !== 1 ? 's' : ''}</span>
      <button class="btn btn-danger-solid" onclick="SectionNews.bulk(true)">Quitar seleccionadas</button>
      ${toRestore ? `<button class="btn btn-ghost" onclick="SectionNews.bulk(false)">Restaurar seleccionadas</button>` : ''}
      <button class="btn btn-ghost" onclick="SectionNews.clearSel()">Cancelar</button>` : ''}`;
    document.getElementById('nw-all').addEventListener('change', (e) => {
      shown.forEach((x) => (e.target.checked ? selected.add(x.slug) : selected.delete(x.slug)));
      paint();
    });
  }

  const setFilter = (f) => { filter = f; selected.clear(); paint(); };
  const clearSel = () => { selected.clear(); paint(); };

  async function setHidden(slugs, hidden) {
    if (slugs.length > 1 && hidden && !confirm(`¿Quitar ${slugs.length} notas del sitio?`)) return;
    try { await call('/news/hide', { slugs, hidden }); } catch (e) { alert(e.message); return; }
    await load();
  }
  const bulk = (hidden) => setHidden([...selected].filter((s) => data.items.find((x) => x.slug === s)?.hidden !== hidden), hidden);

  async function saveSettings(patch, msg) {
    const status = document.getElementById('nw-status');
    try {
      await call('/settings', { perDay: data.perDay, words: data.words, ...patch });
      await load();
      showStatus(document.getElementById('nw-status'), msg);
    } catch (e) { showStatus(status, e.message, 'error'); }
  }
  function addWord() {
    const inp = document.getElementById('nw-word'), w = inp.value.trim();
    if (w.length < 3) { alert('Escribe una palabra de al menos 3 letras.'); return; }
    inp.value = '';
    saveSettings({ words: [...data.words, w] }, 'Palabra agregada ✓');
  }
  const removeWord = (w) => saveSettings({ words: data.words.filter((x) => x !== w) }, 'Palabra quitada ✓');
  const savePerDay = () => saveSettings({ perDay: Math.min(10, Math.max(1, Number(document.getElementById('nw-perday').value) || 3)) }, 'Guardado ✓');

  async function refreshNow() {
    const btn = document.getElementById('nw-refresh');
    btn.disabled = true; btn.textContent = 'Buscando...';
    try {
      const r = await call('/news/refresh', {});
      await load();
      alert(r.added ? `Se agregaron ${r.added} nota${r.added !== 1 ? 's' : ''} nueva${r.added !== 1 ? 's' : ''}.` : 'No había notas nuevas que agregar (o ya se llegó al máximo de hoy).');
    } catch (e) { alert(e.message); }
    btn.disabled = false; btn.textContent = 'Buscar notas nuevas ahora';
  }

  return { html, load, setFilter, clearSel, setHidden, bulk, addWord, removeWord, savePerDay, refreshNow };
})();
