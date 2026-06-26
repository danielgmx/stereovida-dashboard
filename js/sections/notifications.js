const SectionNotifications = (() => {
  const html = () => `
    <div class="section-header">
      <h1>Notificaciones Push</h1>
      <button class="btn btn-primary" onclick="SectionNotifications.openNew()">${Icons.plus} Nueva notificación</button>
    </div>
    <div id="notif-stats" class="notif-stats-row"></div>
    <div id="notif-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="notif-modal" class="modal hidden"></div>`;

  async function load() {
    await Promise.all([loadStats(), loadList()]);
  }

  async function loadStats() {
    try {
      const tokens = await API.list('device_tokens', 'perPage=1');
      const pending = await API.list('push_notifications', 'perPage=1&filter=' + encodeURIComponent('status="pending"'));
      document.getElementById('notif-stats').innerHTML = `
        <div class="notif-stat-card">
          <div class="notif-stat-num">${tokens?.totalItems ?? 0}</div>
          <div class="notif-stat-label">Dispositivos registrados</div>
        </div>
        <div class="notif-stat-card">
          <div class="notif-stat-num">${pending?.totalItems ?? 0}</div>
          <div class="notif-stat-label">Programadas pendientes</div>
        </div>`;
    } catch {}
  }

  async function loadList() {
    let res;
    try { res = await API.list('push_notifications', 'sort=-created&perPage=50'); } catch (e) {
      document.getElementById('notif-list').innerHTML = `<p class="muted empty-state">Error al cargar: ${e.message}</p>`; return;
    }
    const items = res?.items ?? [];
    const el = document.getElementById('notif-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay notificaciones registradas.</p>'; return; }
    el.innerHTML = items.map(n => {
      const statusLabel = { pending: 'Programada', sent: 'Enviada', failed: 'Error' }[n.status] ?? n.status;
      const statusClass = { pending: 'badge-warn', sent: 'badge-on', failed: 'badge-off' }[n.status] ?? '';
      const scheduled = n.scheduled_at ? new Date(n.scheduled_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
      const sentInfo = n.status === 'sent'
        ? `<span class="list-card-meta">${n.device_count ?? 0} dispositivos · ${new Date(n.sent_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>`
        : `<span class="list-card-meta">Programada: ${scheduled}</span>`;
      return `
      <div class="list-card">
        <div class="list-card-img" style="background:none;width:44px;display:flex;align-items:center;justify-content:center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </div>
        <div class="list-card-body">
          <div class="list-card-title">${esc(n.title)}</div>
          <div class="list-card-meta" style="color:var(--muted)">${esc(n.body)}</div>
          ${sentInfo}
        </div>
        <div class="list-card-actions">
          <span class="badge ${statusClass}">${statusLabel}</span>
          <button class="btn-icon btn-danger" onclick="SectionNotifications.confirmDelete('${n.id}', '${esc(n.title)}')">${Icons.trash}</button>
        </div>
      </div>`;
    }).join('');
  }

  function openNew() { openModal(); }

  async function openModal() {
    let promos = [];
    try {
      const res = await API.list('promotions', 'filter=' + encodeURIComponent('is_active=true') + '&sort=title&perPage=100');
      promos = res?.items ?? [];
    } catch {}

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const localNow = now.toISOString().slice(0, 16);

    document.getElementById('notif-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionNotifications.closeModal()"></div>
      <div class="modal-box">
        <div class="modal-header">
          <h2>Nueva notificación push</h2>
          <button class="modal-close" onclick="SectionNotifications.closeModal()">✕</button>
        </div>
        <p id="notif-status" class="status-msg hidden"></p>
        <form id="notif-form">
          <div class="field">
            <label>Título <span style="color:var(--muted);font-weight:400">(aparece en la notificación)</span></label>
            <input type="text" name="title" placeholder="¡Nueva promo en Stereo Vida!" required />
          </div>
          <div class="field">
            <label>Mensaje</label>
            <textarea name="body" rows="3" placeholder="Descripción breve de la promoción o anuncio..." required></textarea>
          </div>
          <div class="field">
            <label>Promoción vinculada <span style="color:var(--muted);font-weight:400">(al abrir la notif abre esta promo)</span></label>
            <select name="promo_id">
              <option value="">— Sin vincular —</option>
              ${promos.map(p => `<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>¿Cuándo enviar?</label>
            <div style="display:flex;gap:10px;margin-bottom:10px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <input type="radio" name="when" value="now" checked onchange="SectionNotifications.toggleSchedule(this)"> Enviar ahora
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <input type="radio" name="when" value="schedule" onchange="SectionNotifications.toggleSchedule(this)"> Programar
              </label>
            </div>
            <input type="datetime-local" name="scheduled_at" id="notif-schedule-input"
              value="${localNow}" min="${localNow}" style="display:none" />
          </div>
          <div class="field">
            <label>Expiración <span style="color:var(--muted);font-weight:400">(desaparece del historial en el app)</span></label>
            <select name="expires_hours">
              <option value="0">Sin expiración</option>
              <option value="1">1 hora</option>
              <option value="6">6 horas</option>
              <option value="12">12 horas</option>
              <option value="24">24 horas</option>
              <option value="48">48 horas</option>
              <option value="168">7 días</option>
            </select>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" onclick="SectionNotifications.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar notificación</button>
          </div>
        </form>
      </div>`;

    document.getElementById('notif-modal').classList.remove('hidden');
    document.getElementById('notif-form').onsubmit = handleSubmit;
  }

  function toggleSchedule(radio) {
    document.getElementById('notif-schedule-input').style.display =
      radio.value === 'schedule' ? 'block' : 'none';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const statusEl = document.getElementById('notif-status');
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const form = new FormData(e.target);
    const when = form.get('when');
    let scheduledAt;

    if (when === 'now') {
      scheduledAt = new Date().toISOString();
    } else {
      const raw = form.get('scheduled_at');
      if (!raw) { showStatus(statusEl, 'Elige una fecha y hora.', 'error'); btn.disabled = false; btn.textContent = 'Guardar notificación'; return; }
      scheduledAt = new Date(raw).toISOString();
    }

    const expHours = parseInt(form.get('expires_hours') || '0');
    let expiresAt = '';
    if (expHours > 0) {
      const expDate = new Date(scheduledAt);
      expDate.setHours(expDate.getHours() + expHours);
      expiresAt = expDate.toISOString();
    }

    try {
      await API.create('push_notifications', {
        title: form.get('title'),
        body: form.get('body'),
        promo_id: form.get('promo_id') || '',
        scheduled_at: scheduledAt,
        expires_at: expiresAt,
        status: 'pending',
        device_count: 0,
      });
      closeModal();
      await load();
    } catch (err) {
      showStatus(statusEl, `Error: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = 'Guardar notificación';
    }
  }

  function confirmDelete(id, title) {
    if (!confirm(`¿Eliminar la notificación "${title}"?`)) return;
    API.remove('push_notifications', id).then(load).catch(err => alert(err.message));
  }

  function closeModal() {
    document.getElementById('notif-modal').classList.add('hidden');
    document.getElementById('notif-modal').innerHTML = '';
  }

  return { html, load, openNew, closeModal, confirmDelete, toggleSchedule };
})();
