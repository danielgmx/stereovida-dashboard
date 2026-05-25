const SectionSplash = (() => {
  let recordId = null;

  const html = () => `
    <div class="section-header">
      <h1>Splash Screen</h1>
    </div>
    <div class="card" id="splash-card">
      <div class="loading-placeholder">Cargando...</div>
    </div>`;

  async function load() {
    let res;
    try { res = await API.list('splash_screens', 'sort=-created&perPage=1'); } catch (e) {
      document.getElementById('splash-card').innerHTML = `<p class="muted">Error al cargar: ${e.message}</p>`; return;
    }
    const item = res?.items?.[0] ?? null;
    recordId = item?.id ?? null;
    renderForm(item);
  }

  function renderForm(item) {
    const el = document.getElementById('splash-card');
    if (!el) return;
    el.innerHTML = `
      <form id="splash-form">
        <div class="field">
          <label>URL de imagen (JPG fullscreen)</label>
          ${item?.image_url ? `<img src="${esc(item.image_url)}" class="preview-logo" alt="Splash actual" style="max-height:120px;margin-bottom:8px;" />` : ''}
          <input type="url" name="image_url" value="${esc(item?.image_url ?? '')}" placeholder="https://..." required />
        </div>
        <div class="field">
          <label>Nombre del sponsor</label>
          <input type="text" name="sponsor_name" value="${esc(item?.sponsor_name ?? '')}" placeholder="Ej: Concentrix" />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${recordId ? 'Guardar cambios' : 'Crear'}</button>
          <span id="splash-status" class="status-msg hidden"></span>
        </div>
      </form>`;
    document.getElementById('splash-form').addEventListener('submit', save);
  }

  async function save(e) {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById('splash-status');
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    const data = {
      image_url: form.image_url.value.trim(),
      sponsor_name: form.sponsor_name.value.trim(),
      is_active: true,
    };
    try {
      if (recordId) await API.update('splash_screens', recordId, data);
      else await API.create('splash_screens', data);
      showStatus(status, 'Guardado correctamente', 'success');
      load();
    } catch {
      showStatus(status, 'Error al guardar', 'error');
    }
    btn.disabled = false;
  }

  return { html, load };
})();
