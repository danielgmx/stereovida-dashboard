// Top 10 Music del sitio web: videos de YouTube que se reproducen dentro de stereovida1023.com.
// Pega el enlace, arrastra para ordenar, quita los que salen. Los cambios se ven en el sitio al momento.
const SectionTop10 = (() => {
  const MAX = 10;
  let items = [];
  let dragId = null;

  const html = () => `
    <div class="section-header">
      <h1>Top 10 Music</h1>
      <button class="btn btn-ghost" id="t10-clear" onclick="SectionTop10.clearAll()">Quitar todos</button>
    </div>
    <p class="muted" style="margin-bottom:16px;font-size:13px;">Son los videos de YouTube de la sección «Top 10 Music» del sitio. La gente los reproduce dentro de stereovida1023.com. <strong>Arrastra</strong> los renglones (o usa las flechas) para cambiar el orden. Los cambios se ven en el sitio al momento, sin «Enviar cambios».</p>

    <div class="card t10-add">
      <h3>Agregar videos <span class="muted" id="t10-count"></span></h3>
      <textarea id="t10-urls" rows="2" placeholder="Pega aquí el enlace de YouTube (puedes pegar varios, uno por línea)"></textarea>
      <div class="t10-add-row">
        <button class="btn btn-primary" id="t10-add" onclick="SectionTop10.addFromText()">Agregar</button>
        <span id="t10-status" class="status-msg hidden"></span>
      </div>
    </div>

    <div id="t10-list" class="t10-list"><div class="loading-placeholder">Cargando...</div></div>`;

  const ytId = (u) => {
    u = (u || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(u)) return u;
    try {
      const x = new URL(u.startsWith('http') ? u : `https://${u}`);
      if (/youtu\.be$/.test(x.hostname)) return x.pathname.slice(1, 12);
      if (/youtube(-nocookie)?\.com$/.test(x.hostname.replace(/^(www|m|music)\./, ''))) {
        if (x.searchParams.get('v')) return x.searchParams.get('v').slice(0, 11);
        const m = x.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
        if (m) return m[1];
      }
    } catch {}
    return null;
  };

  // «Artista - Canción (Official Video)» -> { artist, title }
  function split(raw, channel) {
    let t = (raw || '').split(/\s+\|\s+/)[0]
      .replace(/\s*[\(\[][^)\]]*(official|oficial|video|visuali[sz]er|lyric|letra|audio|live|en vivo|mv|hd|4k)[^)\]]*[\)\]]/gi, '')
      .replace(/\s{2,}/g, ' ').trim();
    const ch = (channel || '').replace(/(VEVO|Official|Oficial)$/i, '').replace(/\s*-\s*Topic$/i, '').trim();
    const i = t.indexOf(' - ');
    if (i > 0) return { artist: t.slice(0, i).trim(), title: t.slice(i + 3).trim() };
    return { artist: ch, title: t };
  }

  // YouTube responde 200 solo si el video existe y permite reproducirse en otros sitios.
  async function info(id) {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}&format=json`);
      if (!r.ok) return null;
      const d = await r.json();
      return split(d.title, d.author_name);
    } catch { return { artist: '', title: '' }; } // sin red hacia YouTube: se agrega y se corrige a mano
  }

  async function load() {
    const el = document.getElementById('t10-list');
    try { items = (await API.list('top10', 'sort=sort_order,created&perPage=50'))?.items ?? []; }
    catch (e) { el.innerHTML = `<p class="muted empty-state">Error al cargar: ${esc(e.message)}</p>`; return; }
    paint();
  }

  function paint() {
    const el = document.getElementById('t10-list');
    const full = items.length >= MAX;
    document.getElementById('t10-count').textContent = `(${items.length} de ${MAX})`;
    document.getElementById('t10-add').disabled = full;
    document.getElementById('t10-clear').classList.toggle('hidden', !items.length);
    if (full) document.getElementById('t10-urls').placeholder = 'La lista está completa. Quita un video para agregar otro.';
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">Aún no hay videos. Pega el primer enlace arriba.</p>'; return; }
    el.innerHTML = items.map((s, i) => `
      <div class="t10-row" draggable="true" data-id="${s.id}">
        <span class="t10-grip" title="Arrastra para cambiar el orden">⋮⋮</span>
        <span class="t10-n">${i + 1}</span>
        <img class="t10-thumb" src="https://i.ytimg.com/vi/${esc(s.youtube_id)}/mqdefault.jpg" alt="" loading="lazy" />
        <div class="t10-txt">
          <input class="t10-in t10-in-title" value="${esc(s.title)}" data-field="title" data-id="${s.id}" aria-label="Canción" />
          <input class="t10-in t10-in-artist" value="${esc(s.artist || '')}" data-field="artist" data-id="${s.id}" placeholder="Artista" aria-label="Artista" />
        </div>
        <a class="btn-icon" href="https://www.youtube.com/watch?v=${esc(s.youtube_id)}" target="_blank" rel="noopener" title="Ver en YouTube">↗</a>
        <button class="btn-icon" title="Subir" ${i === 0 ? 'disabled' : ''} onclick="SectionTop10.move('${s.id}', -1)">↑</button>
        <button class="btn-icon" title="Bajar" ${i === items.length - 1 ? 'disabled' : ''} onclick="SectionTop10.move('${s.id}', 1)">↓</button>
        <button class="btn-icon btn-danger" title="Quitar" onclick="SectionTop10.remove('${s.id}')">${Icons.trash}</button>
      </div>`).join('');
    wireRows();
  }

  function wireRows() {
    const list = document.getElementById('t10-list');
    list.querySelectorAll('.t10-in').forEach((inp) => inp.addEventListener('change', async () => {
      const v = inp.value.trim();
      if (inp.dataset.field === 'title' && !v) { load(); return; }
      try { await API.update('top10', inp.dataset.id, { [inp.dataset.field]: v }); inp.classList.add('t10-saved'); setTimeout(() => inp.classList.remove('t10-saved'), 900); }
      catch (e) { alert('No se pudo guardar: ' + e.message); }
    }));
    list.querySelectorAll('.t10-row').forEach((row) => {
      row.addEventListener('dragstart', (e) => { dragId = row.dataset.id; row.classList.add('t10-drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
      row.addEventListener('dragend', () => { dragId = null; list.querySelectorAll('.t10-row').forEach((r) => r.classList.remove('t10-drag', 't10-over')); });
      row.addEventListener('dragover', (e) => { if (!dragId) return; e.preventDefault(); list.querySelectorAll('.t10-row').forEach((r) => r.classList.toggle('t10-over', r === row && r.dataset.id !== dragId)); });
      row.addEventListener('drop', (e) => { e.preventDefault(); if (dragId && dragId !== row.dataset.id) reorder(dragId, row.dataset.id); });
    });
  }

  // Mueve un renglón a la posición de otro y reescribe el orden completo.
  async function reorder(fromId, toId) {
    const order = items.map((s) => s.id);
    const from = order.indexOf(fromId), to = order.indexOf(toId);
    order.splice(from, 1);
    order.splice(to, 0, fromId); // hacia abajo queda después del destino y hacia arriba antes
    await saveOrder(order);
  }
  async function move(id, dir) {
    const order = items.map((s) => s.id), i = order.indexOf(id), j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    await saveOrder(order);
  }
  async function saveOrder(order) {
    try {
      for (let k = 0; k < order.length; k++) {
        const cur = items.find((s) => s.id === order[k]);
        if (cur.sort_order !== k + 1) await API.update('top10', cur.id, { sort_order: k + 1 });
      }
    } catch (e) { alert('No se pudo cambiar el orden: ' + e.message); }
    load();
  }

  async function addFromText() {
    const box = document.getElementById('t10-urls'), status = document.getElementById('t10-status'), btn = document.getElementById('t10-add');
    const lines = box.value.split(/\s+/).map((x) => x.trim()).filter(Boolean);
    if (!lines.length) { showStatus(status, 'Pega al menos un enlace', 'error'); return; }
    btn.disabled = true;
    const problems = [];
    let added = 0;
    for (const raw of lines) {
      if (items.length >= MAX) { problems.push('La lista ya tiene 10 videos; los demás no se agregaron.'); break; }
      const id = ytId(raw);
      if (!id) { problems.push(`No es un enlace de YouTube: ${raw.slice(0, 40)}`); continue; }
      if (items.some((s) => s.youtube_id === id)) { problems.push('Ya estaba en la lista: ' + id); continue; }
      const meta = await info(id);
      if (!meta) { problems.push(`Ese video no existe o no permite verse en otros sitios (${id}). Prueba con otra versión.`); continue; }
      try {
        const rec = await API.create('top10', { youtube_id: id, title: meta.title || 'Sin título', artist: meta.artist || '', sort_order: items.length + 1 });
        items.push(rec); added++;
      } catch (e) { problems.push('No se pudo guardar: ' + e.message); }
    }
    box.value = '';
    btn.disabled = false;
    await load();
    if (problems.length) alert(problems.join('\n'));
    else if (added) showStatus(status, `${added} agregado${added !== 1 ? 's' : ''} ✓`);
  }

  async function remove(id) {
    const s = items.find((x) => x.id === id);
    if (!confirm(`¿Quitar «${s?.title ?? 'este video'}» del Top 10?`)) return;
    try { await API.remove('top10', id); } catch (e) { alert('No se pudo quitar: ' + e.message); }
    // se cierran los huecos del orden
    await load();
    await saveOrder(items.map((x) => x.id));
  }

  async function clearAll() {
    if (!items.length || !confirm(`¿Quitar los ${items.length} videos? Después puedes pegar la lista nueva.`)) return;
    try { for (const s of items) await API.remove('top10', s.id); } catch (e) { alert('No se pudo quitar todo: ' + e.message); }
    load();
  }

  return { html, load, move, remove, clearAll, addFromText };
})();
