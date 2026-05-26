const SectionSocial = (() => {
  const html = () => `
    <div class="section-header">
      <h1>Redes Sociales</h1>
      <button class="btn btn-primary" onclick="SectionSocial.openNew()">${Icons.plus} Agregar red</button>
    </div>
    <div id="social-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="social-modal" class="modal hidden"></div>`;

  async function load() {
    const res = await API.list('social_links', 'sort=sort_order&perPage=20');
    const items = res?.items ?? [];
    const el = document.getElementById('social-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay redes sociales configuradas.</p>'; return; }
    el.innerHTML = items.map(s => `
      <div class="list-card">
        <div class="list-card-body">
          <div class="list-card-title">${esc(s.label || s.platform)}</div>
          <div class="list-card-meta">${esc(s.url)} &nbsp;·&nbsp; Orden: ${s.sort_order ?? 0}</div>
        </div>
        <div class="list-card-actions">
          <span class="badge ${s.is_active ? 'badge-on' : 'badge-off'}">${s.is_active ? 'Activo' : 'Inactivo'}</span>
          <button class="btn-icon" onclick="SectionSocial.openEdit('${s.id}')">${Icons.edit}</button>
          <button class="btn-icon btn-danger" onclick="SectionSocial.confirmDelete('${s.id}', '${esc(s.label || s.platform)}')">${Icons.trash}</button>
        </div>
      </div>`).join('');
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('social_links', id)); }

  function openModal(item) {
    const isNew = !item;
    document.getElementById('social-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionSocial.closeModal()"></div>
      <div class="modal-box">
        <div class="modal-header">
          <h2>${isNew ? 'Nueva red social' : 'Editar red social'}</h2>
          <button class="modal-close" onclick="SectionSocial.closeModal()">✕</button>
        </div>
        <form id="social-form">
          <div class="field">
            <label>Plataforma</label>
            <select name="platform">
              ${['facebook','instagram','twitter','youtube','tiktok','spotify','whatsapp','website'].map(p =>
                `<option value="${p}" ${item?.platform === p ? 'selected' : ''}>${p}</option>`
              ).join('')}
            </select>
          </div>
          <div class="field">
            <label>Etiqueta (texto visible)</label>
            <input type="text" name="label" value="${esc(item?.label ?? '')}" placeholder="Ej: Stereo Vida en Facebook" />
          </div>
          <div class="field">
            <label>URL</label>
            <input type="url" name="url" value="${esc(item?.url ?? '')}" placeholder="https://..." required />
          </div>
          <div class="field">
            <label>Orden</label>
            <input type="number" name="sort_order" value="${item?.sort_order ?? 0}" min="0" />
          </div>
          <div class="field field-inline">
            <label>Activo</label>
            <input type="checkbox" name="is_active" ${item?.is_active !== false ? 'checked' : ''} />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="SectionSocial.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew ? 'Crear' : 'Guardar'}</button>
            <span id="social-status" class="status-msg hidden"></span>
          </div>
        </form>
      </div>`;
    document.getElementById('social-modal').classList.remove('hidden');
    document.getElementById('social-form').addEventListener('submit', (e) => save(e, item?.id ?? null));
  }

  async function save(e, id) {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById('social-status');
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    const data = {
      platform: form.platform.value,
      label: form.label.value.trim(),
      url: form.url.value.trim(),
      sort_order: parseInt(form.sort_order.value) || 0,
      is_active: form.is_active.checked,
    };
    try {
      if (id) await API.update('social_links', id, data);
      else await API.create('social_links', { ...data, is_published: false });
      closeModal();
      load();
      updatePendingCount();
    } catch {
      showStatus(status, 'Error al guardar', 'error');
      btn.disabled = false;
    }
  }

  function confirmDelete(id, name) {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    API.remove('social_links', id).then(() => load());
  }

  function closeModal() {
    document.getElementById('social-modal').classList.add('hidden');
    document.getElementById('social-modal').innerHTML = '';
  }

  return { html, load, openNew, openEdit, closeModal, confirmDelete };
})();
