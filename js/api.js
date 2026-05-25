const API = (() => {
  function headers(extra = {}) {
    return {
      'Content-Type': 'application/json',
      'Authorization': Auth.getToken(),
      ...extra,
    };
  }

  async function request(method, path, body = null) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const opts = { method, headers: headers(), signal: controller.signal };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(`${PB_URL}/api/collections/${path}`, opts);
      clearTimeout(timer);
      if (res.status === 401) { Auth.logout(); return null; }
      if (!res.ok) {
        const text = await res.text();
        let msg = `Error ${res.status}`;
        try { msg = JSON.parse(text).message || msg; } catch {}
        throw new Error(msg);
      }
      if (res.status === 204) return null;
      return res.json();
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Tiempo de espera agotado. Verifica la conexión.');
      throw err;
    }
  }

  async function uploadFile(collection, recordId, field, file) {
    const form = new FormData();
    form.append(field, file);
    const res = await fetch(`${PB_URL}/api/collections/${collection}/records/${recordId}`, {
      method: 'PATCH',
      headers: { 'Authorization': Auth.getToken() },
      body: form,
    });
    if (!res.ok) throw new Error(`Upload error ${res.status}`);
    return res.json();
  }

  async function createWithFile(collection, fields, fileField, file) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    if (file) form.append(fileField, file);
    const res = await fetch(`${PB_URL}/api/collections/${collection}/records`, {
      method: 'POST',
      headers: { 'Authorization': Auth.getToken() },
      body: form,
    });
    if (!res.ok) throw new Error(`Create error ${res.status}`);
    return res.json();
  }

  const list   = (col, params = '') => request('GET', `${col}/records?${params}`);
  const get    = (col, id)          => request('GET', `${col}/records/${id}`);
  const create = (col, data)        => request('POST', `${col}/records`, data);
  const update = (col, id, data)    => request('PATCH', `${col}/records/${id}`, data);
  const remove = (col, id)          => request('DELETE', `${col}/records/${id}`);

  function fileUrl(collection, recordId, filename) {
    if (!filename) return '';
    return `${PB_URL}/api/files/${collection}/${recordId}/${filename}`;
  }

  return { list, get, create, update, remove, uploadFile, createWithFile, fileUrl };
})();
