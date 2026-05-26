const SectionShows = (() => {
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
    if (!days) return 'Todos los días';
    if (typeof days === 'string') return days;
    if (!Array.isArray(days) || !days.length) return 'Todos los días';
    return days.map(d => DAYS[d] ?? d).join(', ');
  }

  function openNew() { openModal(null); }

  async function openEdit(id) {
    const show = await API.get('shows', id);
    openModal(show);
  }

  function openModal(show) {
    const isNew = !show;
    const days = show?.days ?? [];
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
            <label>URL de imagen</label>
            <input type="url" name="image_url" value="${esc(show?.image_url ?? '')}" placeholder="https://..." />
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
            <label>Activo</label>
            <input type="checkbox" name="is_active" ${show?.is_active !== false ? 'checked' : ''} />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="SectionShows.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew ? 'Crear' : 'Guardar'}</button>
            <span id="show-status" class="status-msg hidden"></span>
          </div>
        </form>
      </div>`;
    document.getElementById('show-modal').classList.remove('hidden');
    document.getElementById('show-form').addEventListener('submit', (e) => saveShow(e, show?.id ?? null));
  }

  async function saveShow(e, id) {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById('show-status');
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;

    const checkedDays = [...form.querySelectorAll('[name="days"]:checked')].map(c => parseInt(c.value));
    const data = {
      name: form.name.value.trim(),
      image_url: form.image_url.value.trim(),
      start_time: form.start_time.value,
      end_time: form.end_time.value,
      days: checkedDays,
      is_active: form.is_active.checked,
    };

    try {
      if (id) await API.update('shows', id, data);
      else await API.create('shows', data);
      closeModal();
      load();
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
