// Sliders de la portada del sitio web (stereovida1023.com): banner web, banner móvil, enlace, orden y fechas.
const SectionSliders = (() => {
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const day = (v) => (v || '').slice(0, 10);

  function state(s) {
    if (s.is_active === false) return ['Inactivo', 'badge-off'];
    if (s.is_published === false) return ['Borrador: falta «Enviar cambios»', 'badge-off'];
    if (day(s.starts_at) && day(s.starts_at) > today()) return ['Programado', 'badge-off'];
    if (day(s.ends_at) && day(s.ends_at) < today()) return ['Vencido', 'badge-off'];
    return ['En el sitio', 'badge-on'];
  }

  const html = () => `
    <div class="section-header">
      <h1>Sliders del sitio</h1>
      <button class="btn btn-primary" onclick="SectionSliders.openNew()">${Icons.plus} Nuevo slider</button>
    </div>
    <p class="muted" style="margin-bottom:16px;font-size:13px;">Son los banners grandes de la portada de stereovida1023.com. Se muestran en el orden de esta lista. <strong>Banner web:</strong> 1926×817 px (proporción 2,36:1). <strong>Banner móvil</strong> (opcional, para teléfono): 1080×900 px o 1080×1350 px; si no lo subes, en teléfono se recorta el banner web. Si no hay ninguno activo, el sitio usa los banners de respaldo.</p>
    <div id="sliders-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="sliders-modal" class="modal hidden"></div>`;

  let items = [];
  async function load() {
    const el = document.getElementById('sliders-list');
    try { items = (await API.list('sliders', 'sort=sort_order,-created&perPage=100'))?.items ?? []; }
    catch (e) { el.innerHTML = `<p class="muted empty-state">Error al cargar: ${e.message}</p>`; return; }
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay sliders. Crea uno para empezar.</p>'; return; }
    el.innerHTML = items.map((s, i) => {
      const web = s.image_web ? API.fileUrl('sliders', s.id, s.image_web) : '';
      const mob = s.image_mobile ? API.fileUrl('sliders', s.id, s.image_mobile) : '';
      const [label, cls] = state(s);
      const dates = [day(s.starts_at) && `desde ${day(s.starts_at)}`, day(s.ends_at) && `hasta ${day(s.ends_at)}`].filter(Boolean).join(' · ');
      return `
      <div class="list-card">
        <div class="list-card-img wide" style="width:140px;height:60px">${web ? `<img src="${esc(web)}" alt="${esc(s.name)}" />` : `<div class="img-placeholder">${Icons.image_ph}</div>`}</div>
        ${mob ? `<div class="list-card-img" style="width:48px;height:60px"><img src="${esc(mob)}" alt="Móvil" /></div>` : ''}
        <div class="list-card-body">
          <div class="list-card-title">${esc(s.name)}</div>
          <div class="list-card-meta">#${i + 1}${dates ? ' · ' + esc(dates) : ''}${s.link ? ' · con enlace' : ''}${mob ? ' · con banner móvil' : ''}</div>
        </div>
        <div class="list-card-actions">
          <span class="badge ${cls}">${esc(label)}</span>
          <button class="btn-icon" title="Subir" ${i === 0 ? 'disabled' : ''} onclick="SectionSliders.move('${s.id}', -1)">↑</button>
          <button class="btn-icon" title="Bajar" ${i === items.length - 1 ? 'disabled' : ''} onclick="SectionSliders.move('${s.id}', 1)">↓</button>
          <button class="btn-icon" onclick="SectionSliders.openEdit('${s.id}')">${Icons.edit}</button>
          <button class="btn-icon btn-danger" onclick="SectionSliders.confirmDelete('${s.id}', '${esc(s.name).replace(/'/g, '&#39;')}')">${Icons.trash}</button>
        </div>
      </div>`;
    }).join('');
  }

  // Cambia de lugar con el vecino: se reescribe el orden de toda la lista para que no queden empates.
  async function move(id, dir) {
    const i = items.findIndex((s) => s.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return;
    const order = items.map((s) => s.id);
    [order[i], order[j]] = [order[j], order[i]];
    try {
      for (let k = 0; k < order.length; k++) {
        const cur = items.find((s) => s.id === order[k]);
        if (cur.sort_order !== k + 1) await API.update('sliders', cur.id, { sort_order: k + 1 });
      }
    } catch (e) { alert('No se pudo cambiar el orden: ' + e.message); }
    load();
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('sliders', id)); }

  function openModal(item) {
    const isNew = !item;
    const web = item?.image_web ? API.fileUrl('sliders', item.id, item.image_web) : '';
    const mob = item?.image_mobile ? API.fileUrl('sliders', item.id, item.image_mobile) : '';
    document.getElementById('sliders-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionSliders.closeModal()"></div>
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h2>${isNew ? 'Nuevo slider' : 'Editar slider'}</h2>
          <button class="modal-close" onclick="SectionSliders.closeModal()">✕</button>
        </div>
        <form id="sliders-form">
          <div class="field">
            <label>Nombre (solo para ti)</label>
            <input type="text" name="name" value="${esc(item?.name ?? '')}" required placeholder="Ej. Concierto Sin Bandera" />
          </div>
          <div class="field">
            <label>Banner web (1926×817 px) ${isNew ? '*' : ''}</label>
            ${web ? `<img src="${esc(web)}" style="max-width:100%;max-height:90px;border-radius:6px;margin-bottom:6px" />` : ''}
            <input type="file" name="image_web" accept="image/jpeg,image/png,image/webp" ${isNew ? 'required' : ''} />
          </div>
          <div class="field">
            <label>Banner móvil (opcional, 1080×900 o 1080×1350 px)</label>
            ${mob ? `<img src="${esc(mob)}" style="max-height:110px;border-radius:6px;margin-bottom:6px" />
              <label style="text-transform:none;font-weight:500"><input type="checkbox" name="remove_mobile" /> Quitar el banner móvil actual</label>` : ''}
            <input type="file" name="image_mobile" accept="image/jpeg,image/png,image/webp" />
          </div>
          <div class="field">
            <label>Texto alternativo (describe el banner para lectores de pantalla y Google)</label>
            <input type="text" name="alt" value="${esc(item?.alt ?? '')}" placeholder="Ej. Sin Bandera en el Sames Auto Arena, 7 de noviembre" />
          </div>
          <div class="field">
            <label>Enlace al tocar el banner (opcional)</label>
            <input type="url" name="link" value="${esc(item?.link ?? '')}" placeholder="https://..." />
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Mostrar desde (opcional)</label>
              <input type="date" name="starts_at" value="${esc(day(item?.starts_at))}" />
            </div>
            <div class="field">
              <label>Mostrar hasta (opcional, inclusive)</label>
              <input type="date" name="ends_at" value="${esc(day(item?.ends_at))}" />
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Posición en teléfono, si no hay banner móvil (0 = izquierda, 100 = derecha)</label>
              <input type="number" name="focus" min="0" max="100" value="${esc(item?.focus ?? 50)}" />
            </div>
            <div class="field field-inline" style="align-self:end">
              <label>Activo</label>
              <input type="checkbox" name="is_active" ${item?.is_active !== false ? 'checked' : ''} />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="SectionSliders.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew ? 'Crear' : 'Guardar'}</button>
            <span id="sliders-status" class="status-msg hidden"></span>
          </div>
        </form>
      </div>`;
    document.getElementById('sliders-modal').classList.remove('hidden');
    document.getElementById('sliders-form').addEventListener('submit', (e) => save(e, item));
  }

  async function save(e, item) {
    e.preventDefault();
    const form = e.target, id = item?.id ?? null;
    const status = document.getElementById('sliders-status');
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    const fd = new FormData();
    fd.append('name', form.name.value.trim());
    fd.append('alt', form.alt.value.trim());
    fd.append('link', form.link.value.trim());
    fd.append('starts_at', form.starts_at.value);
    fd.append('ends_at', form.ends_at.value);
    fd.append('focus', form.focus.value === '' ? '50' : form.focus.value);
    fd.append('is_active', form.is_active.checked ? 'true' : 'false');
    if (!id) {
      fd.append('is_published', 'false');
      const last = items.reduce((m, s) => Math.max(m, s.sort_order || 0), 0);
      fd.append('sort_order', String(last + 1));
    }
    if (form.image_web.files[0]) fd.append('image_web', form.image_web.files[0]);
    if (form.image_mobile.files[0]) fd.append('image_mobile', form.image_mobile.files[0]);
    else if (form.remove_mobile?.checked) fd.append('image_mobile', '');
    try {
      const res = await fetch(`${PB_URL}/api/collections/sliders/records${id ? '/' + id : ''}`, {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Authorization': Auth.getToken() },
        body: fd,
      });
      if (!res.ok) { let m = 'Error al guardar'; try { m = (await res.json()).message || m; } catch {} throw new Error(m); }
      closeModal(); load(); updatePendingCount();
    } catch (err) {
      showStatus(status, err.message || 'Error al guardar', 'error');
      btn.disabled = false;
    }
  }

  function confirmDelete(id, name) {
    if (!confirm(`¿Eliminar el slider "${name}"?`)) return;
    API.remove('sliders', id).then(() => load());
  }

  function closeModal() {
    document.getElementById('sliders-modal').classList.add('hidden');
    document.getElementById('sliders-modal').innerHTML = '';
  }

  return { html, load, openNew, openEdit, closeModal, confirmDelete, move };
})();
