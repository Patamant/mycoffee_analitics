/* Comunicación con la API de Apps Script (fetch con respaldo JSONP) */
window.API = (() => {
  const C = window.FINAV_CONFIG;
  const hasApi = () => !!(C.API_URL && /^https:\/\/script\.google(usercontent)?\.com\//.test(C.API_URL));

  const buildUrl = (params) => {
    const u = new URL(C.API_URL);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') u.searchParams.set(k, v); });
    return u.toString();
  };

  const viaFetch = async (params) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), C.TIMEOUT_MS);
    try {
      const res = await fetch(buildUrl(params), {method: 'GET', redirect: 'follow', signal: ctrl.signal});
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(timer); }
  };

  const viaJsonp = (params) => new Promise((resolve, reject) => {
    const cb = '__finav_cb_' + Date.now();
    const s = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('Tiempo de espera agotado')); }, C.TIMEOUT_MS);
    const cleanup = () => { clearTimeout(timer); delete window[cb]; s.remove(); };
    window[cb] = (data) => { cleanup(); resolve(data); };
    s.onerror = () => { cleanup(); reject(new Error('No se pudo contactar la API')); };
    s.src = buildUrl({...params, callback: cb});
    document.head.appendChild(s);
  });

  const call = async (params) => {
    let out;
    try { out = await viaFetch(params); }
    catch (e) {
      if (e.name === 'AbortError') throw new Error('La actualización tardó demasiado. Revise la hoja Bitácora.');
      out = await viaJsonp(params);
    }
    if (!out || out.ok === false) throw new Error((out && out.error) || 'Respuesta no válida de la API');
    return out.data || out;
  };

  return {
    hasApi,
    async load() {
      if (!hasApi()) {
        const r = await fetch(C.DEMO_DATA, {cache: 'no-store'});
        const j = await r.json();
        return {data: j.data, mode: 'demo'};
      }
      return {data: await call({action: 'data'}), mode: 'live'};
    },
    async refresh() {
      if (!hasApi()) throw new Error('Configure API_URL en assets/js/config.js para actualizar desde Google Sheets.');
      return {data: await call({action: 'refresh', token: C.REFRESH_TOKEN}), mode: 'live'};
    }
  };
})();
