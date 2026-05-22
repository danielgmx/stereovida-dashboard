const SectionConfig = (() => {
  let recordId = null;

  const html = () => `
    <div class="section-header">
      <h1>Configuración General</h1>
    </div>
    <div class="card" id="config-card">
      <div class="loading-placeholder">Cargando...</div>
    </div>`;

  async function load() {
    const res = await API.list('app_config', 'perPage=1');
    if (!res?.items?.length) {
      document.getElementById('config-card').innerHTML = '<p class="muted">No hay configuración creada.</p>';
      return;
    }
    const cfg = res.items[0];
    recordId = cfg.id;
    const logoUrl = cfg.logo ? API.fileUrl('app_config', cfg.id, cfg.logo) : '';
    document.getElementById('config-card').innerHTML = `
      <form id="config-form">
        <div class="form-grid">
          <div class="field">
            <label>URL del stream</label>
            <input type="url" name="stream_url" value="${esc(cfg.stream_url || '')}" placeholder="http://..." required />
          </div>
          <div class="field">
            <label>WhatsApp (número con código de país)</label>
            <input type="text" name="whatsapp_number" value="${esc(cfg.whatsapp_number || '')}" placeholder="5281XXXXXXXX" />
          </div>
          <div class="field">
            <label>Color primario</label>
            <div class="color-row">
              <input type="color" name="primary_color" value="${esc(cfg.primary_color || '#00F9D2')}" class="color-swatch" />
              <input type="text" name="primary_color_hex" value="${esc(cfg.primary_color || '#00F9D2')}" class="color-hex" maxlength="7" placeholder="#00F9D2" />
            </div>
          </div>
          <div class="field">
            <label>Color de fondo</label>
            <div class="color-row">
              <input type="color" name="background_color" value="${esc(cfg.background_color || '#0D1117')}" class="color-swatch" />
              <input type="text" name="background_color_hex" value="${esc(cfg.background_color || '#0D1117')}" class="color-hex" maxlength="7" placeholder="#0D1117" />
            </div>
          </div>
          <div class="field field-full">
            <label>Logo de la estación</label>
            ${logoUrl ? `<img src="${logoUrl}" class="preview-logo" alt="Logo actual" />` : ''}
            <input type="file" name="logo_file" accept="image/*" />
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Guardar cambios</button>
          <span id="config-status" class="status-msg hidden"></span>
        </div>
      </form>`;

    syncColorPickers('primary_color', 'primary_color_hex');
    syncColorPickers('background_color', 'background_color_hex');

    document.getElementById('config-form').addEventListener('submit', save);
  }

  function syncColorPickers(swatchName, hexName) {
    const swatch = document.querySelector(`[name="${swatchName}"]`);
    const hex = document.querySelector(`[name="${hexName}"]`);
    swatch.addEventListener('input', () => hex.value = swatch.value);
    hex.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) swatch.value = hex.value;
    });
  }

  async function save(e) {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById('config-status');
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    status.classList.add('hidden');

    const data = {
      stream_url: form.stream_url.value.trim(),
      whatsapp_number: form.whatsapp_number.value.trim(),
      primary_color: form.primary_color_hex.value.trim(),
      background_color: form.background_color_hex.value.trim(),
    };

    try {
      const file = form.logo_file.files[0];
      if (file) {
        const formData = new FormData();
        for (const [k, v] of Object.entries(data)) formData.append(k, v);
        formData.append('logo', file);
        const res = await fetch(`${PB_URL}/api/collections/app_config/records/${recordId}`, {
          method: 'PATCH',
          headers: { 'Authorization': Auth.getToken() },
          body: formData,
        });
        if (!res.ok) throw new Error();
      } else {
        await API.update('app_config', recordId, data);
      }
      showStatus(status, 'Guardado correctamente', 'success');
      load();
    } catch {
      showStatus(status, 'Error al guardar', 'error');
    }
    btn.disabled = false;
  }

  return { html, load };
})();
