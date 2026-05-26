const SectionPromotions = (() => {
  const html = () => `
    <div class="section-header">
      <h1>Promociones</h1>
      <button class="btn btn-primary" onclick="SectionPromotions.openNew()">${Icons.plus} Agregar promoción</button>
    </div>
    <div id="promos-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="promos-modal" class="modal hidden"></div>`;

  async function load() {
    let res;
    try { res = await API.list('promotions', 'sort=-created&perPage=50'); } catch (e) {
      document.getElementById('promos-list').innerHTML = `<p class="muted empty-state">Error al cargar: ${e.message}</p>`; return;
    }
    const items = res?.items ?? [];
    const el = document.getElementById('promos-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay promociones registradas.</p>'; return; }
    el.innerHTML = items.map(p => {
      const imgUrl = p.image ? API.fileUrl('promotions', p.id, p.image) : '';
      return `
      <div class="list-card">
        <div class="list-card-img">
          ${imgUrl ? `<img src="${esc(imgUrl)}" alt="${esc(p.title)}" />` : `<div class="img-placeholder">${Icons.tag_ph}</div>`}
        </div>
        <div class="list-card-body">
          <div class="list-card-title">${esc(p.title)}</div>
          <div class="list-card-meta">${esc(p.summary || '')}</div>
        </div>
        <div class="list-card-actions">
          <span class="badge ${p.is_active !== false ? 'badge-on' : 'badge-off'}">${p.is_active !== false ? 'Activo' : 'Inactivo'}</span>
          <button class="btn-icon" onclick="SectionPromotions.openEdit('${p.id}')">${Icons.edit}</button>
          <button class="btn-icon btn-danger" onclick="SectionPromotions.confirmDelete('${p.id}', '${esc(p.title)}')">${Icons.trash}</button>
        </div>
      </div>`}).join('');
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('promotions', id)); }

  function openModal(item) {
    const isNew = !item;
    const imgUrl = item?.image ? API.fileUrl('promotions', item.id, item.image) : '';
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
            <label>Imagen de la promoción</label>
            ${imgUrl ? `<img src="${esc(imgUrl)}" style="max-height:80px;border-radius:6px;margin-bottom:6px" />` : ''}
            <input type="file" name="image" accept="image/*" />
          </div>
          <div class="field">
            <label>Resumen (aparece en la lista)</label>
            <input type="text" name="summary" value="${esc(item?.summary ?? '')}" />
          </div>
          <div class="field">
            <label>Descripción completa</label>
            <textarea name="details" rows="4">${esc(item?.details ?? '')}</textarea>
          </div>
          <div class="field">
            <label>Mecánica (cómo participar)</label>
            <textarea name="mechanics" rows="3">${esc(item?.mechanics ?? '')}</textarea>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Fecha inicio (MM-DD-YYYY)</label>
              <input type="text" name="_start_date" value="${esc(item?._start_date ?? '')}" placeholder="05-01-2026" />
            </div>
            <div class="field">
              <label>Fecha fin (MM-DD-YYYY)</label>
              <input type="text" name="end_date" value="${esc(item?.end_date ?? '')}" placeholder="05-31-2026" />
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

    const fields = {
      title: form.title.value.trim(),
      summary: form.summary.value.trim(),
      details: form.details.value.trim(),
      mechanics: form.mechanics.value.trim(),
      _start_date: form._start_date.value.trim(),
      end_date: form.end_date.value.trim(),
      cta_label: form.cta_label.value.trim(),
      cta_url: form.cta_url.value.trim(),
      is_active: form.is_active.checked,
    };

    try {
      const file = form.image.files[0];
      if (file) {
        const formData = new FormData();
        for (const [k, v] of Object.entries(fields)) formData.append(k, v);
        formData.append('image', file);
        const url = id
          ? `${PB_URL}/api/collections/promotions/records/${id}`
          : `${PB_URL}/api/collections/promotions/records`;
        const res = await fetch(url, {
          method: id ? 'PATCH' : 'POST',
          headers: { 'Authorization': Auth.getToken() },
          body: formData,
        });
        if (!res.ok) throw new Error();
      } else {
        if (id) await API.update('promotions', id, fields);
        else await API.create('promotions', fields);
      }
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
