const SectionAds = (() => {
  const html = () => `
    <div class="section-header">
      <h1>Publicidad</h1>
      <button class="btn btn-primary" onclick="SectionAds.openNew()">${Icons.plus} Agregar banner</button>
    </div>
    <div id="ads-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="ads-modal" class="modal hidden"></div>`;

  async function load() {
    const res = await API.list('ads', 'sort=-created&perPage=20');
    const items = res?.items ?? [];
    const el = document.getElementById('ads-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay banners registrados.</p>'; return; }
    el.innerHTML = items.map(a => `
      <div class="list-card">
        <div class="list-card-img wide">
          ${a.image_url ? `<img src="${esc(a.image_url)}" alt="Banner" />` : `<div class="img-placeholder">${Icons.monitor_ph}</div>`}
        </div>
        <div class="list-card-body">
          <div class="list-card-title">${esc(a.link_url || 'Sin enlace')}</div>
        </div>
        <div class="list-card-actions">
          <span class="badge ${a.is_active ? 'badge-on' : 'badge-off'}">${a.is_active ? 'Activo' : 'Inactivo'}</span>
          <button class="btn-icon" onclick="SectionAds.openEdit('${a.id}')">${Icons.edit}</button>
          <button class="btn-icon btn-danger" onclick="SectionAds.confirmDelete('${a.id}')">${Icons.trash}</button>
        </div>
      </div>`).join('');
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('ads', id)); }

  function openModal(item) {
    const isNew = !item;
    document.getElementById('ads-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionAds.closeModal()"></div>
      <div class="modal-box">
        <div class="modal-header">
          <h2>${isNew ? 'Nuevo banner' : 'Editar banner'}</h2>
          <button class="modal-close" onclick="SectionAds.closeModal()">✕</button>
        </div>
        <form id="ads-form">
          <div class="field">
            <label>URL de imagen del banner</label>
            <input type="url" name="image_url" value="${esc(item?.image_url ?? '')}" placeholder="https://..." required />
          </div>
          <div class="field">
            <label>URL de destino al tocar</label>
            <input type="url" name="link_url" value="${esc(item?.link_url ?? '')}" placeholder="https://..." />
          </div>
          <div class="field field-inline">
            <label>Activo</label>
            <input type="checkbox" name="is_active" ${item?.is_active !== false ? 'checked' : ''} />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="SectionAds.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew ? 'Crear' : 'Guardar'}</button>
            <span id="ads-status" class="status-msg hidden"></span>
          </div>
        </form>
      </div>`;
    document.getElementById('ads-modal').classList.remove('hidden');
    document.getElementById('ads-form').addEventListener('submit', (e) => save(e, item?.id ?? null));
  }

  async function save(e, id) {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById('ads-status');
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    const data = {
      image_url: form.image_url.value.trim(),
      link_url: form.link_url.value.trim(),
      is_active: form.is_active.checked,
    };
    try {
      if (id) await API.update('ads', id, data);
      else await API.create('ads', { ...data, is_published: false });
      closeModal();
      load();
      updatePendingCount();
    } catch {
      showStatus(status, 'Error al guardar', 'error');
      btn.disabled = false;
    }
  }

  function confirmDelete(id) {
    if (!confirm('¿Eliminar este banner?')) return;
    API.remove('ads', id).then(() => load());
  }

  function closeModal() {
    document.getElementById('ads-modal').classList.add('hidden');
    document.getElementById('ads-modal').innerHTML = '';
  }

  return { html, load, openNew, openEdit, closeModal, confirmDelete };
})();
