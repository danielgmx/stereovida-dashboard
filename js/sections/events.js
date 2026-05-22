const SectionEvents = (() => {
  const html = () => `
    <div class="section-header">
      <h1>Eventos</h1>
      <button class="btn btn-primary" onclick="SectionEvents.openNew()">+ Agregar evento</button>
    </div>
    <div id="events-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="events-modal" class="modal hidden"></div>`;

  async function load() {
    const res = await API.list('events', 'sort=-event_date&perPage=50');
    const items = res?.items ?? [];
    const el = document.getElementById('events-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay eventos registrados.</p>'; return; }
    el.innerHTML = items.map(ev => `
      <div class="list-card">
        <div class="list-card-img">
          ${ev.image_url ? `<img src="${esc(ev.image_url)}" alt="${esc(ev.title)}" />` : '<div class="img-placeholder">🎪</div>'}
        </div>
        <div class="list-card-body">
          <div class="list-card-title">${esc(ev.title)}</div>
          <div class="list-card-meta">${formatDate(ev.event_date)} &nbsp;·&nbsp; ${esc(ev.location || '')}</div>
        </div>
        <div class="list-card-actions">
          <span class="badge ${ev.is_active !== false ? 'badge-on' : 'badge-off'}">${ev.is_active !== false ? 'Activo' : 'Inactivo'}</span>
          <button class="btn-icon" onclick="SectionEvents.openEdit('${ev.id}')">✏️</button>
          <button class="btn-icon btn-danger" onclick="SectionEvents.confirmDelete('${ev.id}', '${esc(ev.title)}')">🗑️</button>
        </div>
      </div>`).join('');
  }

  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('events', id)); }

  function openModal(item) {
    const isNew = !item;
    const dateVal = item?.event_date ? item.event_date.slice(0, 10) : '';
    document.getElementById('events-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionEvents.closeModal()"></div>
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h2>${isNew ? 'Nuevo evento' : 'Editar evento'}</h2>
          <button class="modal-close" onclick="SectionEvents.closeModal()">✕</button>
        </div>
        <form id="events-form">
          <div class="field">
            <label>Título</label>
            <input type="text" name="title" value="${esc(item?.title ?? '')}" required />
          </div>
          <div class="field">
            <label>URL de imagen</label>
            <input type="url" name="image_url" value="${esc(item?.image_url ?? '')}" placeholder="https://..." />
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Fecha del evento</label>
              <input type="date" name="event_date" value="${dateVal}" />
            </div>
            <div class="field">
              <label>Lugar</label>
              <input type="text" name="location" value="${esc(item?.location ?? '')}" />
            </div>
          </div>
          <div class="field">
            <label>Categoría</label>
            <input type="text" name="category" value="${esc(item?.category ?? '')}" placeholder="Ej: Concierto, Feria, Deportes" />
          </div>
          <div class="field">
            <label>Descripción</label>
            <textarea name="description" rows="4">${esc(item?.description ?? '')}</textarea>
          </div>
          <div class="field">
            <label>Link de mapa (Google Maps)</label>
            <input type="url" name="map_url" value="${esc(item?.map_url ?? '')}" placeholder="https://maps.google.com/..." />
          </div>
          <div class="field field-inline">
            <label>Activo</label>
            <input type="checkbox" name="is_active" ${item?.is_active !== false ? 'checked' : ''} />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="SectionEvents.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew ? 'Crear' : 'Guardar'}</button>
            <span id="events-status" class="status-msg hidden"></span>
          </div>
        </form>
      </div>`;
    document.getElementById('events-modal').classList.remove('hidden');
    document.getElementById('events-form').addEventListener('submit', (e) => save(e, item?.id ?? null));
  }

  async function save(e, id) {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById('events-status');
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    const data = {
      title: form.title.value.trim(),
      image_url: form.image_url.value.trim(),
      event_date: form.event_date.value || null,
      location: form.location.value.trim(),
      category: form.category.value.trim(),
      description: form.description.value.trim(),
      map_url: form.map_url.value.trim(),
      is_active: form.is_active.checked,
    };
    try {
      if (id) await API.update('events', id, data);
      else await API.create('events', data);
      closeModal();
      load();
    } catch {
      showStatus(status, 'Error al guardar', 'error');
      btn.disabled = false;
    }
  }

  function confirmDelete(id, name) {
    if (!confirm(`¿Eliminar el evento "${name}"?`)) return;
    API.remove('events', id).then(() => load());
  }

  function closeModal() {
    document.getElementById('events-modal').classList.add('hidden');
    document.getElementById('events-modal').innerHTML = '';
  }

  return { html, load, openNew, openEdit, closeModal, confirmDelete };
})();
