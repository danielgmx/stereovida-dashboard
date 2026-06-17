const SectionAudioShows = (() => {
  const WORKER_URL   = 'https://stereovida-upload.danielgomezortiz.workers.dev';
  const WORKER_TOKEN = 'stereovida2024secure';

  const html = () => `
    <div class="section-header">
      <h1>Shows de Audio</h1>
      <button class="btn btn-primary" onclick="SectionAudioShows.openNew()">${Icons.plus} Nuevo show</button>
    </div>
    <p class="muted" style="margin-bottom:16px;font-size:13px;">Define los shows (series) a los que pertenecen tus grabaciones. Cada show tiene su propia imagen y descripción.</p>
    <div id="audio-shows-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="audio-shows-modal" class="modal hidden"></div>`;

  async function load() {
    let res;
    try { res = await API.list('audio_shows', 'sort=name&perPage=100'); } catch (e) {
      document.getElementById('audio-shows-list').innerHTML = `<p class="muted empty-state">Error al cargar: ${e.message}</p>`; return;
    }
    const items = res?.items ?? [];
    const el = document.getElementById('audio-shows-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay shows de audio registrados. Crea uno para empezar.</p>'; return; }
    el.innerHTML = items.map(s => `
      <div class="list-card">
        <div class="list-card-img">
          ${s.cover_url ? `<img src="${esc(s.cover_url)}" alt="${esc(s.name)}" />` : `<div class="img-placeholder">${Icons.mic}</div>`}
        </div>
        <div class="list-card-body">
          <div class="list-card-title">${esc(s.name)}</div>
          <div class="list-card-meta">${s.description ? esc(s.description).substring(0, 90) + (s.description.length > 90 ? '…' : '') : '<span style="opacity:0.5">Sin descripción</span>'}</div>
        </div>
        <div class="list-card-actions">
          <span class="badge ${s.is_active !== false ? 'badge-on' : 'badge-off'}">${s.is_active !== false ? 'Activo' : 'Inactivo'}</span>
          <button class="btn-icon" onclick="SectionAudioShows.openEdit('${s.id}')">${Icons.edit}</button>
          <button class="btn-icon btn-danger" onclick="SectionAudioShows.confirmDelete('${s.id}', '${esc(s.name)}')">${Icons.trash}</button>
        </div>
      </div>`).join('');
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('audio_shows', id)); }

  function openModal(item) {
    const isNew = !item;
    document.getElementById('audio-shows-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionAudioShows.closeModal()"></div>
      <div class="modal-box">
        <div class="modal-header">
          <h2>${isNew ? 'Nuevo show de audio' : 'Editar show de audio'}</h2>
          <button class="modal-close" onclick="SectionAudioShows.closeModal()">✕</button>
        </div>
        <form id="audio-shows-form">
          <div class="field">
            <label>Nombre del show</label>
            <input type="text" name="name" value="${esc(item?.name ?? '')}" placeholder="Ej. Hola Tecnología!" required />
          </div>
          <div class="field">
            <label>Imagen de portada</label>
            ${item?.cover_url ? `
              <div style="margin-bottom:10px;display:flex;align-items:center;gap:12px;">
                <img src="${esc(item.cover_url)}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--border);" />
                <span class="muted" style="font-size:12px;">Sube otra imagen para reemplazarla.</span>
              </div>` : ''}
            <input type="file" name="cover_file" accept="image/*" ${isNew ? 'required' : ''} />
            <div id="img-upload-wrap" class="hidden" style="margin-top:10px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                <span style="font-size:12px;color:var(--text-muted);">Subiendo imagen…</span>
                <span id="img-upload-pct" style="font-size:12px;font-weight:700;color:var(--primary);">0%</span>
              </div>
              <div style="background:var(--surface2);border-radius:4px;height:6px;overflow:hidden;">
                <div id="img-upload-bar" style="height:100%;background:var(--primary);width:0%;border-radius:4px;transition:width 0.15s;"></div>
              </div>
            </div>
          </div>
          <div class="field">
            <label>Descripción del show</label>
            <textarea name="description" rows="3" placeholder="Breve descripción del show…">${esc(item?.description ?? '')}</textarea>
          </div>
          <div class="field field-inline">
            <input type="checkbox" name="is_active" id="audio-show-active" ${item?.is_active !== false ? 'checked' : ''} />
            <label for="audio-show-active">Activo</label>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="SectionAudioShows.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew ? 'Crear show' : 'Guardar'}</button>
            <span id="audio-shows-status" class="status-msg hidden"></span>
          </div>
        </form>
      </div>`;
    document.getElementById('audio-shows-modal').classList.remove('hidden');
    document.getElementById('audio-shows-form').addEventListener('submit', (e) => save(e, item?.id ?? null, item?.cover_url ?? null));
  }

  async function save(e, id, existingCoverUrl) {
    e.preventDefault();
    const form   = e.target;
    const status = document.getElementById('audio-shows-status');
    const btn    = form.querySelector('[type="submit"]');
    btn.disabled = true;

    let cover_url = existingCoverUrl;
    const coverFile = form.cover_file.files[0];

    if (coverFile) {
      const wrap = document.getElementById('img-upload-wrap');
      const bar  = document.getElementById('img-upload-bar');
      const pct  = document.getElementById('img-upload-pct');
      wrap.classList.remove('hidden');
      try {
        cover_url = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const fd  = new FormData();
          fd.append('file', coverFile);
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
              reject(new Error(`Error al subir imagen (${xhr.status})`));
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

    const fields = {
      name:        form.name.value.trim(),
      description: form.description.value.trim(),
      cover_url:   cover_url ?? '',
      is_active:   form.is_active.checked,
    };

    try {
      if (id) await API.update('audio_shows', id, fields);
      else    await API.create('audio_shows', fields);
      closeModal();
      load();
    } catch (err) {
      showStatus(status, 'Error: ' + (err?.message ?? err), 'error');
      btn.disabled = false;
    }
  }

  function closeModal() {
    const m = document.getElementById('audio-shows-modal');
    m.innerHTML = '';
    m.classList.add('hidden');
  }

  function confirmDelete(id, name) {
    if (!confirm(`¿Eliminar el show "${name}"?\n\nLas grabaciones asociadas no se eliminarán, pero perderán su referencia al show.`)) return;
    API.remove('audio_shows', id).then(() => load());
  }

  return { html, load, openNew, openEdit, closeModal, confirmDelete };
})();
