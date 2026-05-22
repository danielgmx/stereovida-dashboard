const SectionSplash = (() => {
  const html = () => `
    <div class="section-header">
      <h1>Splash Screen</h1>
      <button class="btn btn-primary" onclick="SectionSplash.openNew()">+ Agregar</button>
    </div>
    <div id="splash-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="splash-modal" class="modal hidden"></div>`;

  async function load() {
    const res = await API.list('splash_screens', 'sort=-created&perPage=20');
    const items = res?.items ?? [];
    const el = document.getElementById('splash-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay splash screens.</p>'; return; }
    el.innerHTML = items.map(s => `
      <div class="list-card">
        <div class="list-card-img tall">
          ${s.image_url ? `<img src="${esc(s.image_url)}" alt="Splash" />` : '<div class="img-placeholder">🖼️</div>'}
        </div>
        <div class="list-card-body">
          <div class="list-card-title">${esc(s.sponsor_name || 'Sin sponsor')}</div>
          <div class="list-card-meta">${esc(s.image_url || '')}</div>
        </div>
        <div class="list-card-actions">
          <span class="badge ${s.is_active ? 'badge-on' : 'badge-off'}">${s.is_active ? 'Activo' : 'Inactivo'}</span>
          <button class="btn-icon" onclick="SectionSplash.openEdit('${s.id}')">✏️</button>
          <button class="btn-icon btn-danger" onclick="SectionSplash.confirmDelete('${s.id}')">🗑️</button>
        </div>
      </div>`).join('');
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('splash_screens', id)); }

  function openModal(item) {
    const isNew = !item;
    document.getElementById('splash-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionSplash.closeModal()"></div>
      <div class="modal-box">
        <div class="modal-header">
          <h2>${isNew ? 'Nueva splash screen' : 'Editar splash screen'}</h2>
          <button class="modal-close" onclick="SectionSplash.closeModal()">✕</button>
        </div>
        <form id="splash-form">
          <div class="field">
            <label>URL de imagen (JPG fullscreen)</label>
            <input type="url" name="image_url" value="${esc(item?.image_url ?? '')}" placeholder="https://..." required />
          </div>
          <div class="field">
            <label>Nombre del sponsor</label>
            <input type="text" name="sponsor_name" value="${esc(item?.sponsor_name ?? '')}" placeholder="Ej: Concentrix" />
          </div>
          <div class="field field-inline">
            <label>Activo</label>
            <input type="checkbox" name="is_active" ${item?.is_active !== false ? 'checked' : ''} />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="SectionSplash.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew ? 'Crear' : 'Guardar'}</button>
            <span id="splash-status" class="status-msg hidden"></span>
          </div>
        </form>
      </div>`;
    document.getElementById('splash-modal').classList.remove('hidden');
    document.getElementById('splash-form').addEventListener('submit', (e) => save(e, item?.id ?? null));
  }

  async function save(e, id) {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById('splash-status');
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    const data = {
      image_url: form.image_url.value.trim(),
      sponsor_name: form.sponsor_name.value.trim(),
      is_active: form.is_active.checked,
    };
    try {
      if (id) await API.update('splash_screens', id, data);
      else await API.create('splash_screens', data);
      closeModal();
      load();
    } catch {
      showStatus(status, 'Error al guardar', 'error');
      btn.disabled = false;
    }
  }

  function confirmDelete(id) {
    if (!confirm('¿Eliminar esta splash screen?')) return;
    API.remove('splash_screens', id).then(() => load());
  }

  function closeModal() {
    document.getElementById('splash-modal').classList.add('hidden');
    document.getElementById('splash-modal').innerHTML = '';
  }

  return { html, load, openNew, openEdit, closeModal, confirmDelete };
})();
