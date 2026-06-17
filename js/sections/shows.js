const SectionShows = (() => {
  const WORKER_URL   = 'https://stereovida-upload.danielgomezortiz.workers.dev';
  const WORKER_TOKEN = 'stereovida2024secure';

  const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const html = () => `
    <div class="section-header">
      <h1>Programación</h1>
      <button class="btn btn-primary" onclick="SectionShows.openNew()">${Icons.plus} Agregar show</button>
    </div>
    <div id="shows-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="show-modal" class="modal hidden"></div>`;

  async function load() {
    let res;
    try { res = await API.list('shows', 'sort=start_time&perPage=50'); } catch (e) {
      document.getElementById('shows-list').innerHTML = `<p class="muted empty-state">Error al cargar: ${e.message}</p>`; return;
    }
    const items = res?.items ?? [];
    const el = document.getElementById('shows-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay shows registrados.</p>'; return; }
    el.innerHTML = items.map(s => `
      <div class="list-card">
        <div class="list-card-img">
          ${s.image_url ? `<img src="${esc(s.image_url)}" alt="${esc(s.name)}" />` : `<div class="img-placeholder">${Icons.mic}</div>`}
        </div>
        <div class="list-card-body">
          <div class="list-card-title">${esc(s.name)}</div>
          <div class="list-card-meta">${esc(s.start_time)} – ${esc(s.end_time)} &nbsp;·&nbsp; ${formatDays(s.days)}</div>
        </div>
        <div class="list-card-actions">
          <span class="badge ${s.is_active ? 'badge-on' : 'badge-off'}">${s.is_active ? 'Activo' : 'Inactivo'}</span>
          <button class="btn-icon" onclick="SectionShows.openEdit('${s.id}')">${Icons.edit}</button>
          <button class="btn-icon btn-danger" onclick="SectionShows.confirmDelete('${s.id}', '${esc(s.name)}')">${Icons.trash}</button>
        </div>
      </div>`).join('');
  }

  function formatDays(days) {
    if (!days || (typeof days === 'string' && !days.trim())) return 'Todos los días';
    if (typeof days === 'string') return days;
    if (!Array.isArray(days) || !days.length) return 'Todos los días';
    return days.map(d => DAYS[d] ?? d).join(', ');
  }

  function parseDaysFromRecord(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(Number).filter(n => n >= 0 && n <= 6);
    if (typeof raw === 'string') return DAYS.map((d, i) => raw.includes(d) ? i : -1).filter(i => i !== -1);
    return [];
  }

  function openNew() { openModal(null); }

  async function openEdit(id) {
    const show = await API.get('shows', id);
    openModal(show);
  }

  function openModal(show) {
    const isNew = !show;
    const days = parseDaysFromRecord(show?.days);
    document.getElementById('show-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionShows.closeModal()"></div>
      <div class="modal-box">
        <div class="modal-header">
          <h2>${isNew ? 'Nuevo show' : 'Editar show'}</h2>
          <button class="modal-close" onclick="SectionShows.closeModal()">✕</button>
        </div>
        <form id="show-form">
          <div class="field">
            <label>Nombre del show</label>
            <input type="text" name="name" value="${esc(show?.name ?? '')}" required />
          </div>
          <div class="field">
            <label>Imagen del show</label>
            ${show?.image_url ? `
              <div style="margin-bottom:10px;display:flex;align-items:center;gap:12px;">
                <img src="${esc(show.image_url)}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--border);" />
                <span class="muted" style="font-size:12px;">Sube otra imagen para reemplazarla.</span>
              </div>` : ''}
            <input type="file" name="image_file" accept="image/*" ${isNew ? 'required' : ''} />
            <div id="show-img-wrap" class="hidden" style="margin-top:10px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                <span style="font-size:12px;color:var(--text-muted);">Subiendo imagen…</span>
                <span id="show-img-pct" style="font-size:12px;font-weight:700;color:var(--primary);">0%</span>
              </div>
              <div style="background:var(--surface2);border-radius:4px;height:6px;overflow:hidden;">
                <div id="show-img-bar" style="height:100%;background:var(--primary);width:0%;border-radius:4px;transition:width 0.15s;"></div>
              </div>
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Hora inicio (HH:MM)</label>
              <input type="time" name="start_time" value="${esc(show?.start_time ?? '')}" required />
            </div>
            <div class="field">
              <label>Hora fin (HH:MM)</label>
              <input type="time" name="end_time" value="${esc(show?.end_time ?? '')}" required />
            </div>
          </div>
          <div class="field">
            <label>Días</label>
            <div class="days-grid">
              ${DAYS.map((d, i) => `
                <label class="day-chip">
                  <input type="checkbox" name="days" value="${i}" ${days.includes(i) ? 'checked' : ''} />
                  <span>${d}</span>
                </label>`).join('')}
            </div>
          </div>
          <div class="field field-inline">
            <input type="checkbox" name="is_active" id="show-active" ${show?.is_active !== false ? 'checked' : ''} />
            <label for="show-active">Activo</label>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="SectionShows.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew ? 'Crear' : 'Guardar'}</button>
            <span id="show-status" class="status-msg hidden"></span>
          </div>
        </form>
      </div>`;
    document.getElementById('show-modal').classList.remove('hidden');
    document.getElementById('show-form').addEventListener('submit', (e) => saveShow(e, show?.id ?? null, show?.image_url ?? null));
  }

  async function saveShow(e, id, existingImageUrl) {
    e.preventDefault();
    const form   = e.target;
    const status = document.getElementById('show-status');
    const btn    = form.querySelector('[type="submit"]');
    btn.disabled = true;

    let image_url = existingImageUrl;
    const imageFile = form.image_file.files[0];

    if (imageFile) {
      const wrap = document.getElementById('show-img-wrap');
      const bar  = document.getElementById('show-img-bar');
      const pct  = document.getElementById('show-img-pct');
      wrap.classList.remove('hidden');
      try {
        image_url = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const fd  = new FormData();
          fd.append('file', imageFile);
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

    const checkedDays = [...form.querySelectorAll('[name="days"]:checked')].map(c => parseInt(c.value));
    const data = {
      name:       form.name.value.trim(),
      image_url:  image_url ?? '',
      start_time: form.start_time.value,
      end_time:   form.end_time.value,
      days:       checkedDays.length ? checkedDays.map(d => DAYS[d]).join(', ') : '',
      is_active:  form.is_active.checked,
    };

    try {
      if (id) await API.update('shows', id, data);
      else await API.create('shows', { ...data, is_published: false });
      closeModal();
      load();
      updatePendingCount();
    } catch {
      showStatus(status, 'Error al guardar', 'error');
      btn.disabled = false;
    }
  }

  function confirmDelete(id, name) {
    if (!confirm(`¿Eliminar el show "${name}"?`)) return;
    API.remove('shows', id).then(() => load());
  }

  function closeModal() {
    document.getElementById('show-modal').classList.add('hidden');
    document.getElementById('show-modal').innerHTML = '';
  }

  return { html, load, openNew, openEdit, closeModal, confirmDelete };
})();
