const SectionRecordings = (() => {
  const WORKER_URL   = 'https://stereovida-upload.danielgomezortiz.workers.dev';
  const WORKER_TOKEN = 'stereovida2024secure';

  const CATEGORIES = { show: 'Show', entrevista: 'Entrevista', especial: 'Especial' };

  const html = () => `
    <div class="section-header">
      <h1>Grabaciones</h1>
      <button class="btn btn-primary" onclick="SectionRecordings.openNew()">${Icons.plus} Agregar grabación</button>
    </div>
    <div id="recordings-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="recordings-modal" class="modal hidden"></div>`;

  async function load() {
    let res;
    try { res = await API.list('recordings', 'sort=-created&perPage=50'); } catch (e) {
      document.getElementById('recordings-list').innerHTML = `<p class="muted empty-state">Error al cargar: ${e.message}</p>`; return;
    }
    const items = res?.items ?? [];
    const el = document.getElementById('recordings-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay grabaciones registradas.</p>'; return; }
    el.innerHTML = items.map(r => `
      <div class="list-card">
        <div class="list-card-img">
          ${r.cover_url ? `<img src="${esc(r.cover_url)}" alt="${esc(r.title)}" />` : `<div class="img-placeholder">${Icons.mic}</div>`}
        </div>
        <div class="list-card-body">
          <div class="list-card-title">${esc(r.title)}</div>
          <div class="list-card-meta">${CATEGORIES[r.category] ?? esc(r.category)} ${r.duration ? '· ' + esc(r.duration) : ''} ${r.date ? '· ' + esc(r.date) : ''}</div>
        </div>
        <div class="list-card-actions">
          <span class="badge ${r.is_active !== false ? 'badge-on' : 'badge-off'}">${r.is_active !== false ? 'Activo' : 'Inactivo'}</span>
          <button class="btn-icon" onclick="SectionRecordings.openEdit('${r.id}')">${Icons.edit}</button>
          <button class="btn-icon btn-danger" onclick="SectionRecordings.confirmDelete('${r.id}', '${esc(r.title)}')">${Icons.trash}</button>
        </div>
      </div>`).join('');
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('recordings', id)); }

  function openModal(item) {
    const isNew = !item;
    document.getElementById('recordings-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionRecordings.closeModal()"></div>
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h2>${isNew ? 'Nueva grabación' : 'Editar grabación'}</h2>
          <button class="modal-close" onclick="SectionRecordings.closeModal()">✕</button>
        </div>
        <form id="recordings-form">
          <div class="field">
            <label>Título</label>
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
            <span id="upload-progress" class="status-msg hidden"></span>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>URL de portada</label>
              <input type="url" name="cover_url" value="${esc(item?.cover_url ?? '')}" placeholder="https://..." />
            </div>
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
              <select name="category">
                <option value="show"       ${(item?.category ?? 'show') === 'show'       ? 'selected' : ''}>Show</option>
                <option value="entrevista" ${item?.category === 'entrevista' ? 'selected' : ''}>Entrevista</option>
                <option value="especial"   ${item?.category === 'especial'   ? 'selected' : ''}>Especial</option>
              </select>
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

  async function save(e, id) {
    e.preventDefault();
    const form = e.target;
    const status   = document.getElementById('recordings-status');
    const progress = document.getElementById('upload-progress');
    const btn      = form.querySelector('[type="submit"]');
    btn.disabled   = true;

    let audio_url = null;
    const audioFile = form.audio_file.files[0];

    if (audioFile) {
      showStatus(progress, 'Subiendo audio… esto puede tardar un momento', 'success');
      try {
        const fd = new FormData();
        fd.append('file', audioFile);
        const res = await fetch(WORKER_URL, {
          method: 'POST',
          headers: { 'X-Upload-Token': WORKER_TOKEN },
          body: fd,
        });
        if (!res.ok) throw new Error(`Error al subir el audio (${res.status})`);
        const data = await res.json();
        audio_url = data.url;
        progress.classList.add('hidden');
      } catch (err) {
        showStatus(status, err.message, 'error');
        btn.disabled = false;
        return;
      }
    }

    const fields = {
      title:       form.title.value.trim(),
      description: form.description.value.trim(),
      cover_url:   form.cover_url.value.trim(),
      duration:    form.duration.value.trim(),
      date:        form.date.value,
      category:    form.category.value,
      is_active:   form.is_active.checked,
    };
    if (audio_url) fields.audio_url = audio_url;

    try {
      if (id) await API.update('recordings', id, fields);
      else    await API.create('recordings', { ...fields, is_published: false });
      closeModal();
      load();
      updatePendingCount();
    } catch {
      showStatus(status, 'Error al guardar', 'error');
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
    API.remove('recordings', id).then(() => load());
  }

  return { html, load, openNew, openEdit, closeModal, confirmDelete };
})();
