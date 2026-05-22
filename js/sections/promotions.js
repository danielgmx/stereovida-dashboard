const SectionPromotions = (() => {
  const html = () => `
    <div class="section-header">
      <h1>Promociones</h1>
      <button class="btn btn-primary" onclick="SectionPromotions.openNew()">+ Agregar promoción</button>
    </div>
    <div id="promos-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="promos-modal" class="modal hidden"></div>`;

  async function load() {
    const res = await API.list('promotions', 'sort=-created&perPage=50');
    const items = res?.items ?? [];
    const el = document.getElementById('promos-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay promociones registradas.</p>'; return; }
    el.innerHTML = items.map(p => `
      <div class="list-card">
        <div class="list-card-img">
          ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.title)}" />` : '<div class="img-placeholder">🎁</div>'}
        </div>
        <div class="list-card-body">
          <div class="list-card-title">${esc(p.title)}</div>
          <div class="list-card-meta">${esc(p.summary || '')}</div>
        </div>
        <div class="list-card-actions">
          <span class="badge ${p.is_active !== false ? 'badge-on' : 'badge-off'}">${p.is_active !== false ? 'Activo' : 'Inactivo'}</span>
          <button class="btn-icon" onclick="SectionPromotions.openEdit('${p.id}')">✏️</button>
          <button class="btn-icon btn-danger" onclick="SectionPromotions.confirmDelete('${p.id}', '${esc(p.title)}')">🗑️</button>
        </div>
      </div>`).join('');
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('promotions', id)); }

  function openModal(item) {
    const isNew = !item;
    const startVal = item?.start_date ? item.start_date.slice(0, 10) : '';
    const endVal = item?.end_date ? item.end_date.slice(0, 10) : '';
    document.getElementById('promos-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionPromotions.closeModal()"></div>
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h2>${isNew ? 'Nueva promoción' : 'Editar promoción'}</h2>
          <button class="modal-close" onclick="SectionPromotions.closeModal()">✕</button>
        </div>
        <form id="promos-form">
          <div class="field">
            <label>Título</label>
            <input type="text" name="title" value="${esc(item?.title ?? '')}" required />
          </div>
          <div class="field">
            <label>URL de imagen</label>
            <input type="url" name="image_url" value="${esc(item?.image_url ?? '')}" placeholder="https://..." />
          </div>
          <div class="field">
            <label>Resumen (aparece en la lista)</label>
            <input type="text" name="summary" value="${esc(item?.summary ?? '')}" />
          </div>
          <div class="field">
            <label>Descripción completa</label>
            <textarea name="description" rows="4">${esc(item?.description ?? '')}</textarea>
          </div>
          <div class="field">
            <label>Dinámica (cómo participar)</label>
            <textarea name="dynamics" rows="3">${esc(item?.dynamics ?? '')}</textarea>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Fecha inicio</label>
              <input type="date" name="start_date" value="${startVal}" />
            </div>
            <div class="field">
              <label>Fecha fin</label>
              <input type="date" name="end_date" value="${endVal}" />
            </div>
          </div>
          <div class="field">
            <label>Texto del botón CTA</label>
            <input type="text" name="cta_label" value="${esc(item?.cta_label ?? 'Participar')}" />
          </div>
          <div class="field">
            <label>URL del botón CTA</label>
            <input type="url" name="cta_url" value="${esc(item?.cta_url ?? '')}" placeholder="https://..." />
          </div>
          <div class="field field-inline">
            <label>Activo</label>
            <input type="checkbox" name="is_active" ${item?.is_active !== false ? 'checked' : ''} />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="SectionPromotions.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew ? 'Crear' : 'Guardar'}</button>
            <span id="promos-status" class="status-msg hidden"></span>
          </div>
        </form>
      </div>`;
    document.getElementById('promos-modal').classList.remove('hidden');
    document.getElementById('promos-form').addEventListener('submit', (e) => save(e, item?.id ?? null));
  }

  async function save(e, id) {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById('promos-status');
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    const data = {
      title: form.title.value.trim(),
      image_url: form.image_url.value.trim(),
      summary: form.summary.value.trim(),
      description: form.description.value.trim(),
      dynamics: form.dynamics.value.trim(),
      start_date: form.start_date.value || null,
      end_date: form.end_date.value || null,
      cta_label: form.cta_label.value.trim(),
      cta_url: form.cta_url.value.trim(),
      is_active: form.is_active.checked,
    };
    try {
      if (id) await API.update('promotions', id, data);
      else await API.create('promotions', data);
      closeModal();
      load();
    } catch {
      showStatus(status, 'Error al guardar', 'error');
      btn.disabled = false;
    }
  }

  function confirmDelete(id, name) {
    if (!confirm(`¿Eliminar la promoción "${name}"?`)) return;
    API.remove('promotions', id).then(() => load());
  }

  function closeModal() {
    document.getElementById('promos-modal').classList.add('hidden');
    document.getElementById('promos-modal').innerHTML = '';
  }

  return { html, load, openNew, openEdit, closeModal, confirmDelete };
})();
