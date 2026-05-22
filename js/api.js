const API = (() => {
  function headers(extra = {}) {
    return {
      'Content-Type': 'application/json',
      'Authorization': Auth.getToken(),
      ...extra,
    };
  }

  async function request(method, path, body = null) {
    const opts = { method, headers: headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${PB_URL}/api/collections/${path}`, opts);
    if (res.status === 401) { Auth.logout(); return null; }
    if (!res.ok) throw new Error(`API error ${res.status}`);
    if (res.status === 204) return null;
    return res.json();
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
