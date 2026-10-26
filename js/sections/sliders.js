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
    <div id="sliders-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>`;

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

  function openNew() { openEditor(null); }
  async function openEdit(id) { openEditor(await API.get('sliders', id)); }
  function back() { navigate('sliders'); }

  // Editor en página completa (no flotante): vista previa de cómo se ve en computadora y en teléfono.
  function openEditor(item) {
    const isNew = !item;
    const web = item?.image_web ? API.fileUrl('sliders', item.id, item.image_web) : '';
    const mob = item?.image_mobile ? API.fileUrl('sliders', item.id, item.image_mobile) : '';
    document.getElementById('main-content').innerHTML = `
      <div class="section-header">
        <div class="sl-head">
          <button type="button" class="btn btn-ghost" onclick="SectionSliders.back()">← Regresar a la lista</button>
          <h1>${isNew ? 'Nuevo slider' : 'Editar slider'}</h1>
        </div>
      </div>
      <form id="sliders-form" class="sl-editor">
        <div class="sl-grid">
          <section class="card sl-card">
            <h3>Banner para computadora ${isNew ? '<span class="sl-req">obligatorio</span>' : ''}</h3>
            <p class="muted">1926×817 px (proporción 2,36:1). JPG, PNG o WebP, hasta 8 MB.</p>
            <div class="sl-preview sl-preview--web" id="sl-prev-web">${web ? `<img src="${esc(web)}" alt="" />` : '<span class="muted">Aún no hay imagen</span>'}</div>
            <p class="sl-size muted" id="sl-web-info"></p>
            <label class="btn btn-ghost sl-file">${web ? 'Cambiar imagen' : 'Elegir imagen'}<input type="file" name="image_web" accept="image/jpeg,image/png,image/webp" ${isNew ? 'required' : ''} hidden /></label>
          </section>
          <section class="card sl-card">
            <h3>Banner para teléfono <span class="muted">(opcional)</span></h3>
            <p class="muted">1080×900 px o 1080×1350 px. Si no subes uno, en el teléfono se muestra el banner de computadora recortado.</p>
            <div class="sl-preview sl-preview--mobile" id="sl-prev-mob"></div>
            <p class="sl-size muted" id="sl-mob-info"></p>
            <div class="sl-row">
              <label class="btn btn-ghost sl-file">Elegir imagen<input type="file" name="image_mobile" accept="image/jpeg,image/png,image/webp" hidden /></label>
              <button type="button" class="btn btn-ghost hidden" id="sl-mob-remove">Quitar banner de teléfono</button>
            </div>
            <div class="field sl-focus" id="sl-focus-box">
              <label>Qué parte se ve en el teléfono</label>
              <input type="range" name="focus" min="0" max="100" value="${esc(item?.focus ?? 50)}" />
              <div class="sl-scale muted"><span>Izquierda</span><span>Centro</span><span>Derecha</span></div>
            </div>
          </section>
        </div>
        <div class="sl-grid">
          <section class="card sl-card">
            <h3>Información</h3>
            <div class="field">
              <label>Nombre (solo para ti)</label>
              <input type="text" name="name" value="${esc(item?.name ?? '')}" required placeholder="Ej. Concierto Sin Bandera" />
            </div>
            <div class="field">
              <label>Descripción de la imagen</label>
              <textarea name="alt" rows="3" placeholder="Ej. Sin Bandera en el Sames Auto Arena, 7 de noviembre">${esc(item?.alt ?? '')}</textarea>
              <span class="sl-hint muted">La leen los lectores de pantalla y Google. Escribe lo que dice el banner.</span>
            </div>
            <div class="field">
              <label>Enlace al tocar el banner (opcional)</label>
              <input type="url" name="link" value="${esc(item?.link ?? '')}" placeholder="https://..." />
            </div>
          </section>
          <section class="card sl-card">
            <h3>Cuándo se muestra</h3>
            <div class="form-grid">
              <div class="field">
                <label>Desde</label>
                <input type="date" name="starts_at" value="${esc(day(item?.starts_at))}" />
              </div>
              <div class="field">
                <label>Hasta (inclusive)</label>
                <input type="date" name="ends_at" value="${esc(day(item?.ends_at))}" />
              </div>
            </div>
            <p class="sl-hint muted">Si dejas las fechas vacías, se muestra siempre. Al llegar la fecha final, el banner se quita solo.</p>
            <div class="field field-inline">
              <input type="checkbox" id="sl-active" name="is_active" ${item?.is_active !== false ? 'checked' : ''} />
              <label for="sl-active">Activo (si lo desmarcas, no se muestra aunque esté en fechas)</label>
            </div>
            ${isNew ? '<p class="sl-hint muted">Al crearlo queda como borrador: para que salga en el sitio, presiona «Enviar cambios» (arriba a la derecha).</p>' : ''}
          </section>
        </div>
        <div class="sl-actions">
          <span id="sliders-status" class="status-msg hidden"></span>
          <button type="button" class="btn btn-ghost" onclick="SectionSliders.back()">Cancelar</button>
          <button type="submit" class="btn btn-primary">${isNew ? 'Crear slider' : 'Guardar cambios'}</button>
        </div>
      </form>`;
    const form = document.getElementById('sliders-form');
    form.addEventListener('submit', (e) => save(e, item));
    wirePreview(form, { web, mob });
  }

  // Vista previa en vivo: imagen elegida, tamaño detectado y recorte en teléfono según la posición.
  function wirePreview(form, current) {
    const prevWeb = document.getElementById('sl-prev-web'), prevMob = document.getElementById('sl-prev-mob');
    const webInfo = document.getElementById('sl-web-info'), mobInfo = document.getElementById('sl-mob-info');
    const rm = document.getElementById('sl-mob-remove'), focusBox = document.getElementById('sl-focus-box');
    const st = { web: current.web, mob: current.mob, removeMob: false };
    const info = (el, url, kind) => {
      if (!url) { el.textContent = ''; return; }
      const im = new Image();
      im.onload = () => {
        const r = im.naturalWidth / im.naturalHeight;
        let msg = `${im.naturalWidth}×${im.naturalHeight} px`, ok = true;
        if (kind === 'web' && (Math.abs(r - 2.357) > 0.12 || im.naturalWidth < 1200)) { ok = false; msg += ' · no es 1926×817: se recortará un poco'; }
        if (kind === 'mob' && (r < 0.7 || r > 1.3)) { ok = false; msg += ' · se recomienda 1080×900 o 1080×1350'; }
        el.textContent = (ok ? '✓ ' : '⚠ ') + msg; el.classList.toggle('sl-warn', !ok);
      };
      im.src = url;
    };
    const paint = () => {
      const focus = form.focus.value;
      prevWeb.innerHTML = st.web ? `<img src="${esc(st.web)}" alt="" />` : '<span class="muted">Aún no hay imagen</span>';
      const mob = st.removeMob ? '' : st.mob;
      if (mob) prevMob.innerHTML = `<img class="sl-mob-own" src="${esc(mob)}" alt="" />`;
      else if (st.web) prevMob.innerHTML = `<img src="${esc(st.web)}" alt="" style="object-position:${focus}% 50%" />`;
      else prevMob.innerHTML = '<span class="muted">Sin imagen</span>';
      focusBox.classList.toggle('hidden', !!mob);
      rm.classList.toggle('hidden', !(st.mob && !st.removeMob));
      prevMob.dataset.note = mob ? 'Así se verá en el teléfono' : 'Así se verá en el teléfono (recortado)';
    };
    form.image_web.addEventListener('change', () => {
      const f = form.image_web.files[0]; if (!f) return;
      st.web = URL.createObjectURL(f); info(webInfo, st.web, 'web'); paint();
    });
    form.image_mobile.addEventListener('change', () => {
      const f = form.image_mobile.files[0]; if (!f) return;
      st.mob = URL.createObjectURL(f); st.removeMob = false; info(mobInfo, st.mob, 'mob'); paint();
    });
    rm.addEventListener('click', () => { st.removeMob = true; form.image_mobile.value = ''; mobInfo.textContent = ''; form._removeMobile = true; paint(); });
    form.focus.addEventListener('input', paint);
    info(webInfo, current.web, 'web'); info(mobInfo, current.mob, 'mob'); paint();
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
    else if (form._removeMobile) fd.append('image_mobile', '');
    try {
      const res = await fetch(`${PB_URL}/api/collections/sliders/records${id ? '/' + id : ''}`, {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Authorization': Auth.getToken() },
        body: fd,
      });
      if (!res.ok) { let m = 'Error al guardar'; try { m = (await res.json()).message || m; } catch {} throw new Error(m); }
      updatePendingCount();
      back();
    } catch (err) {
      showStatus(status, err.message || 'Error al guardar', 'error');
      btn.disabled = false;
    }
  }

  function confirmDelete(id, name) {
    if (!confirm(`¿Eliminar el slider "${name}"?`)) return;
    API.remove('sliders', id).then(() => load());
  }

  return { html, load, openNew, openEdit, back, confirmDelete, move };
})();
