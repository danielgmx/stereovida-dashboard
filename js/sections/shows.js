const SectionShows = (() => {
  const WORKER_URL = 'https://stereovida-upload.danielgomezortiz.workers.dev'; // la subida usa tu sesión del tablero, sin token fijo

  const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const html = () => `
    <div class="section-header">
      <h1>Programación</h1>
      <button class="btn btn-primary" onclick="SectionShows.openNew()">${Icons.plus} Agregar show</button>
    </div>
    <div id="shows-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>`;

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
    if (!days || (typeof days === 'string' && !days.trim())) return 'Todos los días';
    if (typeof days === 'string') return days;
    if (!Array.isArray(days) || !days.length) return 'Todos los días';
    return days.map(d => DAYS[d] ?? d).join(', ');
  }

  function parseDaysFromRecord(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(Number).filter(n => n >= 0 && n <= 6);
    if (typeof raw === 'string') return DAYS.map((d, i) => raw.includes(d) ? i : -1).filter(i => i !== -1);
    return [];
  }

  function openNew() { openEditor(null); }

  async function openEdit(id) { openEditor(await API.get('shows', id)); }

  function back() { navigate('shows'); }

  // Editor en página completa (no flotante): datos del programa a la izquierda; textos para la app y para el sitio web a la derecha.
  function openEditor(show) {
    const isNew = !show;
    const days = parseDaysFromRecord(show?.days);
    document.getElementById('main-content').innerHTML = `
      <div class="section-header">
        <div class="sl-head">
          <button type="button" class="btn btn-ghost" onclick="SectionShows.back()">← Regresar a la lista</button>
          <h1>${isNew ? 'Nuevo show' : esc(show.name)}</h1>
        </div>
      </div>
      <form id="show-form" class="sl-editor">
        <div class="sl-grid">
          <div style="display:grid;gap:20px;align-content:start;">
            <section class="card sl-card">
              <h3>Datos del programa</h3>
              <div class="field">
                <label>Nombre del show</label>
                <input type="text" name="name" value="${esc(show?.name ?? '')}" required />
              </div>
              <div class="field">
                <label>Imagen del show ${isNew ? '*' : ''}</label>
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                  <div class="sl-preview" style="width:140px;aspect-ratio:1;border-radius:12px;flex:none;" id="show-img-prev">${show?.image_url ? `<img src="${esc(show.image_url)}" alt="" />` : '<span class="muted">Sin imagen</span>'}</div>
                  <div style="display:grid;gap:8px;">
                    <label class="btn btn-ghost sl-file">${show?.image_url ? 'Cambiar imagen' : 'Elegir imagen'}<input type="file" name="image_file" accept="image/*" ${isNew ? 'required' : ''} hidden /></label>
                    <span class="muted" style="font-size:12px;">Cuadrada, de preferencia 800×800 px.</span>
                  </div>
                </div>
                <div id="show-img-wrap" class="hidden" style="margin-top:10px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                    <span style="font-size:12px;color:var(--text-muted);">Subiendo imagen…</span>
                    <span id="show-img-pct" style="font-size:12px;font-weight:700;color:var(--primary);">0%</span>
                  </div>
                  <div style="background:var(--surface2);border-radius:4px;height:6px;overflow:hidden;">
                    <div id="show-img-bar" style="height:100%;background:var(--primary);width:0%;border-radius:4px;transition:width 0.15s;"></div>
                  </div>
                </div>
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
                <span class="muted" style="font-size:12px;">Sin días marcados = todos los días.</span>
              </div>
              <div class="field field-inline">
                <input type="checkbox" name="is_active" id="show-active" ${show?.is_active !== false ? 'checked' : ''} />
                <label for="show-active">Activo (si lo desmarcas, no sale en la programación)</label>
              </div>
            </section>
            <section class="card sl-card">
              <h3>Para la app</h3>
              <div class="field">
                <label>Descripción del show</label>
                <textarea name="description" rows="5" placeholder="Descripción breve del programa, conductor, dinámica…" style="resize:vertical;">${esc(show?.description ?? '')}</textarea>
                <span class="muted" style="font-size:12px;">Texto corto que ve la gente en la app.</span>
              </div>
            </section>
          </div>
          <section class="card sl-card">
            <h3>Para el sitio web (página «Locutores»)</h3>
            <p class="muted">Si dejas la biografía vacía, este show no aparece en la página de Locutores.</p>
            <div class="field">
              <label>Nombre del locutor</label>
              <input type="text" name="host_name" value="${esc(show?.host_name ?? '')}" placeholder="Ej. Joanna de la Garza" />
            </div>
            <div class="field">
              <label>Biografía para el sitio web</label>
              <textarea name="bio_web" rows="16" placeholder="Escribe la biografía. Separa los párrafos con una línea en blanco." style="resize:vertical;line-height:1.55;">${esc(show?.bio_web ?? '')}</textarea>
              <span class="muted" style="font-size:12px;" id="bio-count"></span>
            </div>
            <div class="field">
              <label>Frase final (opcional)</label>
              <input type="text" name="host_tagline" value="${esc(show?.host_tagline ?? '')}" placeholder="Ej. Chuy Cortez… de lunes a viernes, de 4 a 7 de la tarde." />
            </div>
          </section>
        </div>
        <div class="sl-actions">
          <span id="show-status" class="status-msg hidden"></span>
          <button type="button" class="btn btn-ghost" onclick="SectionShows.back()">Cancelar</button>
          <button type="submit" class="btn btn-primary">${isNew ? 'Crear show' : 'Guardar cambios'}</button>
        </div>
      </form>`;
    const form = document.getElementById('show-form');
    form.addEventListener('submit', (e) => saveShow(e, show?.id ?? null, show?.image_url ?? null));
    // Vista previa de la imagen elegida y conteo de párrafos de la biografía
    form.image_file.addEventListener('change', () => {
      const f = form.image_file.files[0];
      if (f) document.getElementById('show-img-prev').innerHTML = `<img src="${URL.createObjectURL(f)}" alt="" />`;
    });
    const count = () => {
      const n = form.bio_web.value.trim().split(/\n\s*\n/).filter((t) => t.trim()).length;
      document.getElementById('bio-count').textContent = form.bio_web.value.trim() ? `${n} párrafo${n !== 1 ? 's' : ''}` : '';
    };
    form.bio_web.addEventListener('input', count); count();
  }

  async function saveShow(e, id, existingImageUrl) {
    e.preventDefault();
    const form   = e.target;
    const status = document.getElementById('show-status');
    const btn    = form.querySelector('[type="submit"]');
    btn.disabled = true;

    let image_url = existingImageUrl;
    const imageFile = form.image_file.files[0];

    if (imageFile) {
      const wrap = document.getElementById('show-img-wrap');
      const bar  = document.getElementById('show-img-bar');
      const pct  = document.getElementById('show-img-pct');
      wrap.classList.remove('hidden');
      try {
        image_url = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const fd  = new FormData();
          fd.append('file', imageFile);
          xhr.upload.addEventListener('progress', ev => {
            if (ev.lengthComputable) {
              const p = Math.round(ev.loaded / ev.total * 100);
              bar.style.width = p + '%';
              pct.textContent = p + '%';
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText).url); }
              catch { reject(new Error('Respuesta inválida del servidor')); }
            } else {
              reject(new Error(`Error al subir imagen (${xhr.status})`));
            }
          });
          xhr.addEventListener('error', () => reject(new Error('Error de red al subir')));
          xhr.open('POST', WORKER_URL);
          xhr.setRequestHeader('Authorization', Auth.getToken());
          xhr.send(fd);
        });
        wrap.classList.add('hidden');
      } catch (err) {
        wrap.classList.add('hidden');
        showStatus(status, err.message, 'error');
        btn.disabled = false;
        return;
      }
    }

    const checkedDays = [...form.querySelectorAll('[name="days"]:checked')].map(c => parseInt(c.value));
    const data = {
      name:       form.name.value.trim(),
      image_url:  image_url ?? '',
      start_time: form.start_time.value,
      end_time:   form.end_time.value,
      days:        checkedDays.length ? checkedDays.map(d => DAYS[d]).join(', ') : '',
      description: form.description.value.trim(),
      host_name:   form.host_name.value.trim(),
      bio_web:     form.bio_web.value.trim(),
      host_tagline: form.host_tagline.value.trim(),
      is_active:   form.is_active.checked,
    };

    try {
      if (id) await API.update('shows', id, data);
      else await API.create('shows', { ...data, is_published: false });
      updatePendingCount();
      back();
    } catch {
      showStatus(status, 'Error al guardar', 'error');
      btn.disabled = false;
    }
  }

  function confirmDelete(id, name) {
    if (!confirm(`¿Eliminar el show "${name}"?`)) return;
    API.remove('shows', id).then(() => load());
  }

  return { html, load, openNew, openEdit, back, confirmDelete };
})();
