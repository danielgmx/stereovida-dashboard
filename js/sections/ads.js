const SectionAds = (() => {
  const WORKER_URL   = 'https://stereovida-upload.danielgomezortiz.workers.dev';
  const WORKER_TOKEN = 'stereovida2024secure';

  let _shows = [];

  const TYPE_LABELS = {
    main_banner:   'Main Banner',
    show_sponsor:  'Sponsor de Show',
  };

  const html = () => `
    <div class="section-header">
      <h1>Publicidad</h1>
      <button class="btn btn-primary" onclick="SectionAds.openNew()">${Icons.plus} Agregar banner</button>
    </div>
    <p class="muted" style="margin-bottom:16px;font-size:13px;">
      <strong>Main Banner</strong> — aparece en la barra inferior del player (formato horizontal).<br>
      <strong>Sponsor de Show</strong> — imagen 1:1 que rota con la portada del show seleccionado cada 15 segundos.
    </p>
    <div id="ads-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="ads-modal" class="modal hidden"></div>`;

  async function load() {
    let res;
    try { res = await API.list('ads', 'sort=-created&perPage=20&expand=show_id'); } catch (e) {
      document.getElementById('ads-list').innerHTML = `<p class="muted empty-state">Error: ${e.message}</p>`; return;
    }
    const items = res?.items ?? [];
    const el = document.getElementById('ads-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay banners registrados.</p>'; return; }
    el.innerHTML = items.map(a => {
      const type = a.ad_type || 'main_banner';
      const showName = a.expand?.show_id?.name ?? '';
      return `
        <div class="list-card">
          <div class="list-card-img ${type === 'show_sponsor' ? '' : 'wide'}">
            ${a.image_url ? `<img src="${esc(a.image_url)}" alt="Banner" style="${type === 'show_sponsor' ? 'aspect-ratio:1/1;object-fit:cover;' : ''}" />` : `<div class="img-placeholder">${Icons.monitor_ph}</div>`}
          </div>
          <div class="list-card-body">
            <div class="list-card-title">${esc(TYPE_LABELS[type] ?? type)}</div>
            <div class="list-card-meta">
              ${type === 'show_sponsor' && showName ? `<span class="badge badge-on" style="font-size:10px;padding:2px 6px;margin-right:4px;">${esc(showName)}</span>` : ''}
              ${a.link_url ? esc(a.link_url) : '<span style="opacity:0.5">Sin enlace</span>'}
            </div>
          </div>
          <div class="list-card-actions">
            <span class="badge ${a.is_active ? 'badge-on' : 'badge-off'}">${a.is_active ? 'Activo' : 'Inactivo'}</span>
            <button class="btn-icon" onclick="SectionAds.openEdit('${a.id}')">${Icons.edit}</button>
            <button class="btn-icon btn-danger" onclick="SectionAds.confirmDelete('${a.id}')">${Icons.trash}</button>
          </div>
        </div>`;
    }).join('');
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('ads', id)); }

  async function openModal(item) {
    const isNew = !item;
    // Load shows for the sponsor picker
    try {
      const res = await API.list('shows', 'sort=start_time&perPage=50&filter=' + encodeURIComponent('is_active=true'));
      _shows = res?.items ?? [];
    } catch { _shows = []; }

    const currentType = item?.ad_type || 'main_banner';
    const currentShowId = item?.show_id || '';

    document.getElementById('ads-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionAds.closeModal()"></div>
      <div class="modal-box">
        <div class="modal-header">
          <h2>${isNew ? 'Nuevo banner' : 'Editar banner'}</h2>
          <button class="modal-close" onclick="SectionAds.closeModal()">✕</button>
        </div>
        <form id="ads-form">
          <div class="field">
            <label>Tipo de banner</label>
            <select name="ad_type" id="ad-type-select" onchange="SectionAds.onTypeChange(this)">
              <option value="main_banner" ${currentType === 'main_banner' ? 'selected' : ''}>Main Banner — barra inferior del player (horizontal)</option>
              <option value="show_sponsor" ${currentType === 'show_sponsor' ? 'selected' : ''}>Sponsor de Show — rota con imagen del show (1:1)</option>
            </select>
          </div>
          <div class="field" id="show-picker-field" style="${currentType === 'show_sponsor' ? '' : 'display:none'}">
            <label>Show que patrocina</label>
            ${_shows.length === 0
              ? `<p class="muted" style="font-size:13px;">No hay shows en Programación.</p>`
              : `<select name="show_id">
                  <option value="">— Selecciona un show —</option>
                  ${_shows.map(s => `<option value="${s.id}" ${s.id === currentShowId ? 'selected' : ''}>${esc(s.name)} (${esc(s.start_time)}–${esc(s.end_time)})</option>`).join('')}
                </select>`}
          </div>
          <div class="field">
            <label>Imagen <span id="img-format-hint" style="font-size:11px;color:var(--text-muted)">${currentType === 'show_sponsor' ? '(formato 1:1 cuadrado)' : '(formato horizontal)'}</span></label>
            ${item?.image_url ? `
              <div style="margin-bottom:10px;display:flex;align-items:center;gap:12px;">
                <img src="${esc(item.image_url)}" style="height:56px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />
                <span class="muted" style="font-size:12px;">Sube otra imagen para reemplazarla.</span>
              </div>` : ''}
            <input type="file" name="image_file" accept="image/*" ${isNew ? 'required' : ''} />
            <div id="ad-img-wrap" class="hidden" style="margin-top:10px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                <span style="font-size:12px;color:var(--text-muted);">Subiendo imagen…</span>
                <span id="ad-img-pct" style="font-size:12px;font-weight:700;color:var(--primary);">0%</span>
              </div>
              <div style="background:var(--surface2);border-radius:4px;height:6px;overflow:hidden;">
                <div id="ad-img-bar" style="height:100%;background:var(--primary);width:0%;border-radius:4px;transition:width 0.15s;"></div>
              </div>
            </div>
          </div>
          <div class="field">
            <label>URL de destino al tocar</label>
            <input type="url" name="link_url" value="${esc(item?.link_url ?? '')}" placeholder="https://..." />
          </div>
          <div class="field field-inline">
            <input type="checkbox" name="is_active" id="ad-active" ${item?.is_active !== false ? 'checked' : ''} />
            <label for="ad-active">Activo</label>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="SectionAds.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${isNew ? 'Crear' : 'Guardar'}</button>
            <span id="ads-status" class="status-msg hidden"></span>
          </div>
        </form>
      </div>`;
    document.getElementById('ads-modal').classList.remove('hidden');
    document.getElementById('ads-form').addEventListener('submit', (e) => save(e, item?.id ?? null, item?.image_url ?? null));
  }

  function onTypeChange(select) {
    const type = select.value;
    const picker = document.getElementById('show-picker-field');
    const hint   = document.getElementById('img-format-hint');
    if (picker) picker.style.display = type === 'show_sponsor' ? '' : 'none';
    if (hint)   hint.textContent = type === 'show_sponsor' ? '(formato 1:1 cuadrado)' : '(formato horizontal)';
  }

  async function save(e, id, existingImageUrl) {
    e.preventDefault();
    const form   = e.target;
    const status = document.getElementById('ads-status');
    const btn    = form.querySelector('[type="submit"]');
    btn.disabled = true;

    let image_url = existingImageUrl;
    const imageFile = form.image_file.files[0];

    if (imageFile) {
      const wrap = document.getElementById('ad-img-wrap');
      const bar  = document.getElementById('ad-img-bar');
      const pct  = document.getElementById('ad-img-pct');
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
          xhr.setRequestHeader('X-Upload-Token', WORKER_TOKEN);
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

    const adType = form.ad_type.value;
    const data = {
      ad_type:   adType,
      image_url: image_url ?? '',
      link_url:  form.link_url.value.trim(),
      is_active: form.is_active.checked,
      show_id:   adType === 'show_sponsor' ? (form.show_id?.value || null) : null,
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

  return { html, load, openNew, openEdit, closeModal, confirmDelete, onTypeChange };
})();
