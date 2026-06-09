const SectionUsuarios = (() => {
  const html = () => `
    <div class="section-header">
      <h1>Usuarios</h1>
      <button class="btn btn-primary" onclick="SectionUsuarios.openNew()">${Icons.plus} Agregar usuario</button>
    </div>
    <div id="users-list" class="card-list"><div class="loading-placeholder">Cargando...</div></div>
    <div id="users-modal" class="modal hidden"></div>`;

  async function load() {
    let res;
    try { res = await API.list('_superusers', 'sort=created&perPage=50'); } catch (e) {
      document.getElementById('users-list').innerHTML = `<p class="muted empty-state">Error al cargar: ${e.message}</p>`; return;
    }
    const items = res?.items ?? [];
    const me = Auth.getUser();
    const el = document.getElementById('users-list');
    if (!items.length) { el.innerHTML = '<p class="muted empty-state">No hay usuarios registrados.</p>'; return; }
    el.innerHTML = items.map(u => `
      <div class="list-card">
        <div class="list-card-img">
          <div class="img-placeholder" style="font-size:20px;color:var(--primary)">${Icons.user_ph}</div>
        </div>
        <div class="list-card-body">
          <div class="list-card-title">${esc(u.name || u.email)}</div>
          <div class="list-card-meta">${esc(u.email)}</div>
        </div>
        <div class="list-card-actions">
          <span class="badge ${u.role === 'admin' ? 'badge-on' : 'badge-off'}">${u.role === 'admin' ? 'Admin' : 'Editor'}</span>
          <button class="btn-icon" onclick="SectionUsuarios.openEdit('${u.id}')">${Icons.edit}</button>
          ${u.id !== me.id ? `<button class="btn-icon btn-danger" onclick="SectionUsuarios.confirmDelete('${u.id}', '${esc(u.email)}')">${Icons.trash}</button>` : '<span style="width:28px"></span>'}
        </div>
      </div>`).join('');
  }

  function openNew() { openModal(null); }
  async function openEdit(id) { openModal(await API.get('_superusers', id)); }

  function openModal(user) {
    const isNew = !user;
    document.getElementById('users-modal').innerHTML = `
      <div class="modal-backdrop" onclick="SectionUsuarios.closeModal()"></div>
      <div class="modal-box">
        <div class="modal-header">
          <h2>${isNew ? 'Nuevo usuario' : 'Editar usuario'}</h2>
          <button class="modal-close" onclick="SectionUsuarios.closeModal()">✕</button>
        </div>
        <form id="users-form">
          <div class="field">
            <label>Nombre (opcional)</label>
            <input type="text" name="name" value="${esc(user?.name ?? '')}" placeholder="Nombre del usuario" />
          </div>
          <div class="field">
            <label>Correo electrónico</label>
            <input type="email" name="email" value="${esc(user?.email ?? '')}" required ${!isNew ? 'disabled' : ''} />
          </div>
          <div class="field">
            <label>Rol</label>
            <select name="role" required>
              <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin — acceso completo</option>
              <option value="editor" ${!user || user?.role === 'editor' ? 'selected' : ''}>Editor — programación, publicidad, eventos, promociones y grabaciones</option>
            </select>
          </div>
          <div class="field">
            <label>${isNew ? 'Contraseña' : 'Nueva contraseña (dejar vacío para no cambiar)'}</label>
            <input type="password" name="password" placeholder="••••••••" ${isNew ? 'required minlength="8"' : 'minlength="8"'} autocomplete="new-password" />
          </div>
          ${isNew ? `<div class="field">
            <label>Confirmar contraseña</label>
            <input type="password" name="passwordConfirm" placeholder="••••••••" required minlength="8" autocomplete="new-password" />
          </div>` : ''}
          <p id="users-form-error" class="error-msg hidden"></p>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" onclick="SectionUsuarios.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="users-save-btn">${isNew ? 'Crear usuario' : 'Guardar cambios'}</button>
          </div>
        </form>
      </div>`;

    document.getElementById('users-modal').classList.remove('hidden');

    document.getElementById('users-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const errorEl = document.getElementById('users-form-error');
      const saveBtn = document.getElementById('users-save-btn');
      errorEl.classList.add('hidden');

      const name = form.name.value.trim();
      const role = form.role.value;
      const password = form.password.value;

      if (isNew) {
        const confirm = form.passwordConfirm.value;
        if (password !== confirm) {
          errorEl.textContent = 'Las contraseñas no coinciden.';
          errorEl.classList.remove('hidden');
          return;
        }
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';

      try {
        const data = { role };
        if (name) data.name = name;
        if (isNew) {
          data.email = form.email.value.trim();
          data.password = password;
          data.passwordConfirm = password;
          await API.create('_superusers', data);
        } else {
          if (password) {
            data.password = password;
            data.passwordConfirm = password;
          }
          await API.update('_superusers', user.id, data);
        }
        closeModal();
        await load();
      } catch (err) {
        errorEl.textContent = err.message || 'Error al guardar.';
        errorEl.classList.remove('hidden');
        saveBtn.disabled = false;
        saveBtn.textContent = isNew ? 'Crear usuario' : 'Guardar cambios';
      }
    });
  }

  function closeModal() {
    const m = document.getElementById('users-modal');
    if (m) { m.classList.add('hidden'); m.innerHTML = ''; }
  }

  function confirmDelete(id, email) {
    if (!confirm(`¿Eliminar el usuario "${email}"? Esta acción no se puede deshacer.`)) return;
    API.remove('_superusers', id).then(load).catch(e => alert('Error al eliminar: ' + e.message));
  }

  return { html, load, openNew, openEdit, closeModal, confirmDelete };
})();
