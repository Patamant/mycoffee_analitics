/* Formatos numéricos y utilidades compartidas */
window.FMT = (() => {
  const L = (window.FINAV_CONFIG && FINAV_CONFIG.LOCALE) || 'es-EC';
  const nf = {
    money: new Intl.NumberFormat(L, {style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2}),
    money0: new Intl.NumberFormat(L, {style: 'currency', currency: 'USD', maximumFractionDigits: 0}),
    int: new Intl.NumberFormat(L, {maximumFractionDigits: 0}),
    dec1: new Intl.NumberFormat(L, {minimumFractionDigits: 1, maximumFractionDigits: 1}),
    pct: new Intl.NumberFormat(L, {style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1}),
    pct0: new Intl.NumberFormat(L, {style: 'percent', maximumFractionDigits: 0})
  };
  const num = (x) => (x === '' || x === null || x === undefined || isNaN(Number(x))) ? null : Number(x);
  const f = (kind, x) => {
    const n = num(x);
    if (n === null) return '—';
    if (kind === 'delta') return (n > 0 ? '+' : '') + nf.pct.format(n);
    return (nf[kind] || nf.int).format(n);
  };
  const title = (s) => String(s || '').toLowerCase().replace(/(^|\s|\()(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  return {f, num, title};
})();
