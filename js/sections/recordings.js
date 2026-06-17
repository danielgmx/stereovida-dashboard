const SectionRecordings = (() => {
  const WORKER_URL   = 'https://stereovida-upload.danielgomezortiz.workers.dev';
  const WORKER_TOKEN = 'stereovida2024secure';

  const CATEGORIES = { show: 'Show', entrevista: 'Entrevista', especial: 'Especial' };

  let _audioShows = [];

  const html = () => `
    <div class="section-header">
      <h1>Grabaciones</h1>
      <button class="btn btn-primary" onclick="SectionRecordings.openNew()">${Icons.plus} Agregar grabación</button>
    </div>
    <div id="recordings-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="recordings-modal" class="modal hidden"></div>`;

  async function load() {
    let res;
    try { res = await API.list('recording', 'sort=-created&perPage=50&expand=audio_show'); } catch (e) {
      document.getElementById('recordings-list').innerHTML = `<p class="muted empty-state">Error al cargar: ${e.message}</p>`; return;
    }
    const items = res?.items ?? [];
    const el = document.getElementById('recordings-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay grabaciones registradas.</p>'; return; }
    el.innerHTML = items.map(r => {
      const show     = r.expand?.audio_show;
      const coverImg = show?.cover_url || r.cover_url;
      const showName = show?.name ?? (r.category ? CATEGORIES[r.category] ?? esc(r.category) : '');
      return `
        <div class="list-card">
          <div class="list-card-img">
            ${coverImg ? `<img src="${esc(coverImg)}" alt="${esc(r.title)}" />` : `<div class="img-placeholder">${Icons.mic}</div>`}
          </div>
          <div class="list-card-body">
            <div class="list-card-title">${esc(r.title)}</div>
            <div class="list-card-meta">
              ${showName ? `<span class="badge badge-on" style="font-size:10px;padding:2px 7px;margin-right:4px;">${esc(showName)}</span>` : ''}
              ${r.duration ? esc(r.duration) : ''}${r.date ? ' · ' + esc(r.date) : ''}
            </div>
          </div>
          <div class="list-card-actions">
            <span class="badge ${r.is_active !== false ? 'badge-on' : 'badge-off'}">${r.is_active !== false ? 'Activo' : 'Inactivo'}</span>
            <button class="btn-icon" onclick="SectionRecordings.openEdit('${r.id}')">${Icons.edit}</button>
            <button class="btn-icon btn-danger" onclick="SectionRecordings.confirmDelete('${r.id}', '${esc(r.title)}')">${Icons.trash}</button>
          </div>
        </div>`;
    }).join('');
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('recording', id)); }

  async function openModal(item) {
    const isNew = !item;

    try {
      const res = await API.list('audio_shows', 'sort=name&perPage=100&filter=' + encodeURIComponent('is_active=true'));
      _audioShows = res?.items ?? [];
    } catch { _audioShows = []; }

    const currentShowId = item?.audio_show ?? '';
    const currentShow   = _audioShows.find(s => s.id === currentShowId);

    document.getElementById('recordings-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionRecordings.closeModal()"></div>
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h2>${isNew ? 'Nueva grabación' : 'Editar grabación'}</h2>
          <button class="modal-close" onclick="SectionRecordings.closeModal()">✕</button>
        </div>
        <form id="recordings-form">
          <div class="field">
            <label>Show <span style="color:var(--primary)">*</span></label>
            ${_audioShows.length === 0
              ? `<p class="muted" style="font-size:13px;">No hay shows de audio creados. <a href="#audioShows" onclick="navigate('audioShows')" style="color:var(--primary)">Crea uno primero</a>.</p>`
              : `<div style="display:flex;align-items:center;gap:12px;">
                  <select name="audio_show" id="rec-show-select" onchange="SectionRecordings.onShowChange(this)" style="flex:1;" ${isNew ? 'required' : ''}>
                    <option value="">— Selecciona un show —</option>
                    ${_audioShows.map(s => `<option value="${s.id}" data-cover="${esc(s.cover_url ?? '')}" ${s.id === currentShowId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
                  </select>
                  <div id="show-cover-preview" style="flex-shrink:0;">
                    ${currentShow?.cover_url ? `<img src="${esc(currentShow.cover_url)}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />` : ''}
                  </div>
                </div>`}
          </div>
          <div class="field">
            <label>Título del episodio</label>
            <input type="text" name="title" value="${esc(item?.title ?? '')}" required />
          </div>
          <div class="field">
            <label>Descripción</label>
            <textarea name="description" rows="3">${esc(item?.description ?? '')}</textarea>
          </div>
          <div class="field">
            <label>Archivo de audio (MP3)</label>
            ${item?.audio_url ? `<p class="muted" style="font-size:12px;margin-bottom:6px;">✓ Ya tiene audio. Sube otro para reemplazarlo.</p>` : ''}
            <input type="file" name="audio_file" accept="audio/*" ${isNew ? 'required' : ''} />
            <div id="upload-progress-wrap" class="hidden" style="margin-top:10px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                <span style="font-size:12px;color:var(--text-muted);">Subiendo audio…</span>
                <span id="upload-pct" style="font-size:12px;font-weight:700;color:var(--primary);">0%</span>
              </div>
              <div style="background:var(--surface2);border-radius:4px;height:6px;overflow:hidden;">
                <div id="upload-bar" style="height:100%;background:var(--primary);width:0%;border-radius:4px;transition:width 0.15s;"></div>
              </div>
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Duración</label>
              <input type="text" name="duration" value="${esc(item?.duration ?? '')}" placeholder="ej. 45:30" />
            </div>
            <div class="field">
              <label>Fecha</label>
              <input type="date" name="date" value="${esc(item?.date ?? '')}" />
            </div>
            <div class="field">
              <label>Categoría</label>
              <input type="text" name="category" value="${esc(item?.category ?? 'show')}"
                list="cat-suggestions" placeholder="ej. Show, Entrevista…" />
              <datalist id="cat-suggestions">
                <option value="show">Show</option>
                <option value="entrevista">Entrevista</option>
                <option value="especial">Especial</option>
                <option value="podcast">Podcast</option>
                <option value="reflexion">Reflexión</option>
                <option value="noticias">Noticias</option>
              </datalist>
            </div>
            <div class="field field-inline">
              <input type="checkbox" name="is_active" id="rec-active" ${item?.is_active !== false ? 'checked' : ''} />
              <label for="rec-active">Activo</label>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Guardar</button>
            <span id="recordings-status" class="status-msg hidden"></span>
          </div>
        </form>
      </div>`;
    document.getElementById('recordings-modal').classList.remove('hidden');
    document.getElementById('recordings-form').addEventListener('submit', (e) => save(e, item?.id ?? null));
  }

  function onShowChange(select) {
    const opt      = select.options[select.selectedIndex];
    const coverUrl = opt?.dataset?.cover ?? '';
    const preview  = document.getElementById('show-cover-preview');
    if (!preview) return;
    preview.innerHTML = coverUrl
      ? `<img src="${esc(coverUrl)}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />`
      : '';
  }

  async function save(e, id) {
    e.preventDefault();
    const form   = e.target;
    const status = document.getElementById('recordings-status');
    const btn    = form.querySelector('[type="submit"]');
    btn.disabled = true;

    let audio_url = null;
    const audioFile = form.audio_file.files[0];

    if (audioFile) {
      const wrap = document.getElementById('upload-progress-wrap');
      const bar  = document.getElementById('upload-bar');
      const pct  = document.getElementById('upload-pct');
      wrap.classList.remove('hidden');
      bar.style.width = '0%';
      pct.textContent = '0%';
      try {
        audio_url = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const fd  = new FormData();
          fd.append('file', audioFile);
          xhr.upload.addEventListener('progress', ev => {
            if (ev.lengthComputable) {
              const p = Math.round(ev.loaded / ev.total * 100);
              bar.style.width = p + '%';
              pct.textContent = p + '%';
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText).url); }
              catch { reject(new Error('Respuesta inválida del servidor')); }
            } else {
              reject(new Error(`Error al subir el audio (${xhr.status})`));
            }
          });
          xhr.addEventListener('error', () => reject(new Error('Error de red al subir')));
          xhr.open('POST', WORKER_URL);
          xhr.setRequestHeader('X-Upload-Token', WORKER_TOKEN);
          xhr.send(fd);
        });
        wrap.classList.add('hidden');
      } catch (err) {
        wrap.classList.add('hidden');
        showStatus(status, err.message, 'error');
        btn.disabled = false;
        return;
      }
    }

    const selectedShowId = form.audio_show?.value ?? '';
    const selectedShow   = _audioShows.find(s => s.id === selectedShowId);

    const fields = {
      title:       form.title.value.trim(),
      description: form.description.value.trim(),
      duration:    form.duration.value.trim(),
      date:        form.date.value,
      category:    form.category.value,
      is_active:   form.is_active.checked,
      audio_show:  selectedShowId || null,
    };
    if (selectedShow?.cover_url) fields.cover_url = selectedShow.cover_url;
    if (audio_url) fields.audio_url = audio_url;

    try {
      if (id) await API.update('recording', id, fields);
      else    await API.create('recording', { ...fields, is_published: false });
      closeModal();
      load();
      updatePendingCount();
    } catch (err) {
      showStatus(status, 'Error: ' + (err?.message ?? err), 'error');
      btn.disabled = false;
    }
  }

  function closeModal() {
    const m = document.getElementById('recordings-modal');
    m.innerHTML = '';
    m.classList.add('hidden');
  }

  function confirmDelete(id, name) {
    if (!confirm(`¿Eliminar la grabación "${name}"?`)) return;
    API.remove('recording', id).then(() => load());
  }

  return { html, load, openNew, openEdit, closeModal, confirmDelete, onShowChange };
})();
