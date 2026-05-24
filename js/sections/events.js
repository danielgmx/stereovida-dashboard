const SectionEvents = (() => {
  const html = () => `
    <div class="section-header">
      <h1>Eventos</h1>
      <button class="btn btn-primary" onclick="SectionEvents.openNew()">+ Agregar evento</button>
    </div>
    <div id="events-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="events-modal" class="modal hidden"></div>`;

  async function load() {
    let res;
    try { res = await API.list('events', 'sort=-created&perPage=50'); } catch (e) {
      document.getElementById('events-list').innerHTML = `<p class="muted empty-state">Error al cargar: ${e.message}</p>`; return;
    }
    const items = res?.items ?? [];
    const el = document.getElementById('events-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay eventos registrados.</p>'; return; }
    el.innerHTML = items.map(ev => {
      const imgUrl = ev.cover_image ? API.fileUrl('events', ev.id, ev.cover_image) : '';
      return `
      <div class="list-card">
        <div class="list-card-img">
          ${imgUrl ? `<img src="${esc(imgUrl)}" alt="${esc(ev.name)}" />` : '<div class="img-placeholder">🎪</div>'}
        </div>
        <div class="list-card-body">
          <div class="list-card-title">${esc(ev.name)}</div>
          <div class="list-card-meta">${esc(ev.date || '')} ${ev.time ? '· ' + esc(ev.time) : ''} ${ev.location_name ? '· ' + esc(ev.location_name) : ''}</div>
        </div>
        <div class="list-card-actions">
          <span class="badge ${ev.is_active !== false ? 'badge-on' : 'badge-off'}">${ev.is_active !== false ? 'Activo' : 'Inactivo'}</span>
          <button class="btn-icon" onclick="SectionEvents.openEdit('${ev.id}')">✏️</button>
          <button class="btn-icon btn-danger" onclick="SectionEvents.confirmDelete('${ev.id}', '${esc(ev.name)}')">🗑️</button>
        </div>
      </div>`}).join('');
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('events', id)); }

  function openModal(item) {
    const isNew = !item;
    const imgUrl = item?.cover_image ? API.fileUrl('events', item.id, item.cover_image) : '';
    document.getElementById('events-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionEvents.closeModal()"></div>
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h2>${isNew ? 'Nuevo evento' : 'Editar evento'}</h2>
          <button class="modal-close" onclick="SectionEvents.closeModal()">✕</button>
        </div>
        <form id="events-form">
          <div class="field">
            <label>Nombre del evento</label>
            <input type="text" name="name" value="${esc(item?.name ?? '')}" required />
          </div>
          <div class="field">
            <label>Imagen del evento</label>
            ${imgUrl ? `<img src="${esc(imgUrl)}" style="max-height:80px;border-radius:6px;margin-bottom:6px" />` : ''}
            <input type="file" name="cover_image" accept="image/*" ${isNew ? '' : ''} />
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Fecha (MM-DD-YYYY)</label>
              <input type="text" name="date" value="${esc(item?.date ?? '')}" placeholder="07-04-2026" />
            </div>
            <div class="field">
              <label>Hora</label>
              <input type="time" name="time" value="${esc(item?.time ?? '')}" />
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Lugar</label>
              <input type="text" name="location_name" value="${esc(item?.location_name ?? '')}" />
            </div>
            <div class="field">
              <label>Categoría</label>
              <input type="text" name="category" value="${esc(item?.category ?? '')}" placeholder="Concert, Feria..." />
            </div>
          </div>
          <div class="field">
            <label>Descripción</label>
            <textarea name="description" rows="4">${esc(item?.description ?? '')}</textarea>
          </div>
          <div class="field">
            <label>Link de mapa (Google Maps)</label>
            <input type="url" name="location_url" value="${esc(item?.location_url ?? '')}" placeholder="https://maps.google.com/..." />
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

    const fields = {
      name: form.name.value.trim(),
      date: form.date.value.trim(),
      time: form.time.value,
      location_name: form.location_name.value.trim(),
      category: form.category.value.trim(),
      description: form.description.value.trim(),
      location_url: form.location_url.value.trim(),
      is_active: form.is_active.checked,
    };

    try {
      const file = form.cover_image.files[0];
      if (file) {
        const formData = new FormData();
        for (const [k, v] of Object.entries(fields)) formData.append(k, v);
        formData.append('cover_image', file);
        const url = id
          ? `${PB_URL}/api/collections/events/records/${id}`
          : `${PB_URL}/api/collections/events/records`;
        const res = await fetch(url, {
          method: id ? 'PATCH' : 'POST',
          headers: { 'Authorization': Auth.getToken() },
          body: formData,
        });
        if (!res.ok) throw new Error();
      } else {
        if (id) await API.update('events', id, fields);
        else await API.create('events', fields);
      }
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
