/* Aplicación: carga de datos, pestañas, KPIs, lectura ejecutiva, tablas y botón Actualizar */
(() => {
  const S = {data: null, mode: null, tab: 'resumen', periodo: 'TOTAL', prod: {key: 'ventas', dir: -1, q: '', abc: ''}};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CACHE_KEY = 'finav_tablero_cache_v2';
  const PERIOD_KEY = 'finav_tablero_periodo';

  /* ---------- utilidades ---------- */
  const V = () => (S.data && S.data.por_periodo && (S.data.por_periodo[S.periodo] || S.data.por_periodo.TOTAL)) || {};
  const isMes = () => S.periodo !== 'TOTAL';
  const periodoInfo = () => ((S.data && S.data.periodos) || []).find((p) => p.clave === S.periodo) || {};
  const kpi = (k) => { const r = (V().kpis || []).find((x) => x.indicador === k); return r && r.valor !== '' && r.valor !== null ? Number(r.valor) : null; };
  const txt = (k) => { const r = (V().textos || []).find((x) => x.indicador === k); return r && r.valor !== null ? String(r.valor) : ''; };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const fmtDate = (s) => {
    if (!s) return '—';
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (!m) return String(s);
    const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    return d.toLocaleDateString(FINAV_CONFIG.LOCALE, {day: 'numeric', month: 'short', year: 'numeric'}) + (m[4] ? ' ' + m[4] + ':' + m[5] : '');
  };

  /* ---------- estado de sincronización ---------- */
  function setStatus(state, text) {
    const p = $('#status-pill'); p.dataset.state = state; $('#status-text').textContent = text;
  }
  function paintSource() {
    const f = S.data.fuente || {};
    const pi = periodoInfo();
    $('#sync-detail').textContent = isMes() ? `${pi.etiqueta}: ${fmtDate(pi.desde)} – ${fmtDate(pi.hasta)}` : `Período: ${fmtDate(f.fecha_inicio)} – ${fmtDate(f.fecha_corte)}`;
    $('#foot-source').textContent = `hoja "${f.hoja || '—'}" · ${FMT.f('int', f.filas_validas)} filas válidas · última actualización ${f.actualizado === 'demo' ? '(demostración)' : fmtDate(f.actualizado)}`;
    if (S.mode === 'demo') setStatus('demo', 'Datos de demostración');
    else setStatus('live', 'Google Sheets · ' + (f.actualizado ? fmtDate(f.actualizado) : 'conectado'));
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg, type = 'ok', action) {
    const t = $('#toast');
    t.className = 'toast' + (type === 'ok' ? '' : ' ' + type);
    t.replaceChildren(el('span', '', msg));
    if (action) { const b = el('button', '', action.label); b.type = 'button'; b.addEventListener('click', () => { t.hidden = true; action.fn(); }); t.appendChild(b); }
    const x = el('button', '', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar'); x.addEventListener('click', () => { t.hidden = true; }); t.appendChild(x);
    t.hidden = false;
    clearTimeout(toastTimer);
    if (type !== 'error') toastTimer = setTimeout(() => { t.hidden = true; }, 7000);
  }

  /* ---------- KPIs y textos ---------- */
  function paintValues() {
    $$('[data-k]').forEach((e) => {
      const v = kpi(e.dataset.k);
      e.textContent = FMT.f(e.dataset.f, v);
      if (e.dataset.f === 'delta' && v !== null) { e.classList.toggle('up', v > 0.005); e.classList.toggle('down', v < -0.005); }
    });
    $$('[data-t]').forEach((e) => { e.textContent = txt(e.dataset.t) || '—'; });
    const modo = !isMes() ? 'total' : (kpi('ventas_mes_anterior') === null ? 'mes0' : 'mes');
    $$('[data-mode]').forEach((e) => { e.hidden = !e.dataset.mode.split(' ').includes(modo); });
    $$('[data-period]').forEach((e) => { e.textContent = periodoInfo().etiqueta || 'Todo el período'; });
    $$('.period-chip').forEach((e) => e.classList.toggle('is-month', isMes()));
  }

  function lede() {
    const p = $('#lede'); p.replaceChildren();
    const parts = isMes()
      ? ['En ', periodoInfo().etiqueta, ' el local vendió ', ['money0', kpi('ventas_netas')], ' en ', ['int', kpi('tickets')], ' tickets, ', ['money0', kpi('venta_dia')],
        ' por día operado. Sábado y domingo concentraron ', ['pct', kpi('pct_finde')], ' de la venta y la mañana (antes de las 12h) ', ['pct', kpi('pct_manana')], '.']
      : ['El local vendió ', ['money0', kpi('ventas_netas')], ' en ', ['int', kpi('tickets')], ' tickets, un promedio de ', ['money0', kpi('prom_mensual')],
        ' al mes. Sábado y domingo concentran ', ['pct', kpi('pct_finde')], ' de la venta y la mañana (antes de las 12h) ', ['pct', kpi('pct_manana')], '.'];
    parts.forEach((x) => p.append(Array.isArray(x) ? el('b', '', FMT.f(x[0], x[1])) : x));
  }

  function insights() {
    const ul = $('#insights'); ul.replaceChildren();
    const add = (parts, warn) => {
      const li = el('li', warn ? 'warn' : '');
      const span = el('span');
      parts.forEach((x) => span.append(Array.isArray(x) ? el('b', '', x.length === 1 ? x[0] : FMT.f(x[0], x[1])) : x));
      li.appendChild(span); ul.appendChild(li);
    };
    const lj = kpi('venta_dia_lun_jue'), sd = kpi('venta_dia_sab_dom');
    if (lj && sd) add(['De lunes a jueves se vende ', ['money0', lj], ' por día, frente a ', ['money0', sd], ' en fin de semana: los días de semana son la mayor capacidad ociosa.'], lj / sd < 0.5);
    add(['Solo ', ['pct', kpi('pct_tickets_bebida')], ' de los tickets lleva bebida; con bebida el ticket sube de ', ['money', kpi('ticket_sin_bebida')], ' a ', ['money', kpi('ticket_con_bebida')], '.']);
    if (isMes()) {
      const na = kpi('nuevos_mes_anterior');
      const parts = [['int', kpi('nuevos_periodo')], ' clientes nuevos en el mes'];
      if (na !== null) parts.push(' frente a ', ['int', na], ' en ', [txt('mes_anterior')]);
      parts.push('. Al cierre, ', ['int', kpi('frecuentes_inactivos')], ' clientes frecuentes llevaban más de 60 días sin volver.');
      add(parts, na !== null && kpi('nuevos_periodo') < na);
    } else {
      add([['pct', kpi('pct_clientes_una_visita')], ' de los clientes vino una sola vez y ', ['int', kpi('frecuentes_inactivos')], ' frecuentes no vuelven hace 60 días. Clientes nuevos: ', ['int', kpi('nuevos_primer_mes')], ' en ', [txt('mes_primero')], ' y ', ['int', kpi('nuevos_ref_mes')], ' en ', [txt('mes_ref')], '.'], kpi('nuevos_ref_mes') < kpi('nuevos_primer_mes'));
    }
    add(['Desde las 13h entra apenas ', ['pct', kpi('pct_tarde')], ' de la venta: definir una oferta de tarde o ajustar turnos.']);
    add([['int', kpi('productos_A')], ' de ', ['int', kpi('productos')], ' productos hacen el 80% de la venta y ', ['int', kpi('productos_multiprecio')], ' productos se cobraron a 3 o más precios.']);
    const d = kpi('delta_ref_vs_prom');
    if (isMes() && kpi('delta_vs_anterior') !== null) {
      const da = kpi('delta_vs_anterior');
      add([[txt('mes_ref')], ' vendió ', ['money0', kpi('ventas_netas')], ' (', ['delta', da], ' frente a ', [txt('mes_anterior')], ' y ', ['delta', d], ' frente al promedio mensual) con ticket de ', ['money', kpi('ticket_prom')], '.'], da < 0);
    } else {
      add([[txt('mes_ref')], ' vendió ', ['money0', kpi('ventas_ref_mes')], ' (', ['delta', d], ' frente al promedio mensual) con ticket de ', ['money', kpi('ticket_ref_mes')], '.'], d < 0);
    }
  }

  /* ---------- gráficos por pestaña ---------- */
  const mesTip = (r) => [r.mes, 'Ventas ' + FMT.f('money0', r.ventas), 'Tickets ' + FMT.f('int', r.tickets), 'Ticket prom. ' + FMT.f('money', r.ticket_prom), 'Venta por día ' + FMT.f('money0', r.venta_dia), 'Clientes nuevos ' + FMT.f('int', r.clientes_nuevos)];
  const draw = {
    resumen() {
      const m = (S.data.mensual || []).slice().sort((a, b) => a.orden - b.orden);
      const sel = (d) => d.clave === S.periodo;
      if (isMes()) {
        const dd = (V().diario || []).slice().sort((a, b) => a.orden - b.orden);
        CH.bars($('#ch-mes'), dd, {x: (d) => String(d.dia).slice(8, 10), xFmt: (v) => String(+v), y: (d) => +d.ventas, fmt: 'money0', avg: true, avgLabel: 'Promedio diario', height: 280,
          color: (d, c) => (d.fin_de_semana === 'Sí' ? c.navy400 : c.navy),
          tip: (d) => [`${d.dia_semana} ${fmtDate(d.dia).replace(/ \d{4}$/, '')}`, 'Ventas ' + FMT.f('money0', d.ventas), 'Tickets ' + FMT.f('int', d.tickets), 'Ticket prom. ' + FMT.f('money', d.ticket_prom)]});
      } else {
        CH.bars($('#ch-mes'), m, {x: (d) => d.mes, y: (d) => +d.ventas, fmt: 'money0', avg: true, height: 280, tip: mesTip,
          color: (d, c) => (+d.orden === m.length ? c.navy400 : c.navy)});
      }
      CH.line($('#ch-ticket'), m, {x: (d) => d.mes, y: (d) => +d.ticket_prom, fmt: 'money', tip: mesTip, highlight: isMes() ? sel : null});
      CH.bars($('#ch-nuevos'), m, {x: (d) => d.mes, y: (d) => +d.clientes_nuevos, fmt: 'int', labels: true, tip: mesTip,
        color: (d, c) => (!isMes() || sel(d) ? c.gold : c.muted)});
    },
    cuando() {
      CH.heatmap($('#ch-heat'), V().diaHora);
      const dw = (V().diaSemana || []).slice().sort((a, b) => a.orden - b.orden);
      CH.hbars($('#ch-dow'), dw, {y: (d) => d.dia, x: (d) => +d.venta_dia, fmt: 'money0', height: 260, color: (d, c) => (+d.orden >= 6 ? c.gold : c.navy),
        tip: (d) => [d.dia, 'Venta por día ' + FMT.f('money0', d.venta_dia), 'Tickets por día ' + FMT.f('dec1', d.tickets_dia), 'Ticket prom. ' + FMT.f('money', d.ticket_prom), 'Participación ' + FMT.f('pct', d.participacion)]});
      const ho = (V().hora || []).slice().sort((a, b) => a.hora - b.hora);
      CH.bars($('#ch-hora'), ho, {x: (d) => +d.hora, xFmt: (v) => v + 'h', y: (d) => +d.participacion, fmt: 'pct', height: 260,
        color: (d, c) => (+d.hora >= 8 && +d.hora <= 11 ? c.navy : c.muted),
        tip: (d) => [`${d.hora}:00–${d.hora}:59`, 'Participación ' + FMT.f('pct', d.participacion), 'Ventas ' + FMT.f('money0', d.ventas), 'Tickets ' + FMT.f('int', d.tickets), 'Ticket prom. ' + FMT.f('money', d.ticket_prom)]});
    },
    que() {
      const rows = (V().lineas || []).map((r) => ({l: r.linea, a: +r.prom_previo || 0, b: +r.prom_reciente || 0, share: +r.participacion})).filter((d) => d.a + d.b > 0);
      if (txt('periodo_previo')) CH.dumbbell($('#ch-lineas'), rows, {pa: txt('periodo_previo'), pb: txt('periodo_reciente')});
      else CH.hbars($('#ch-lineas'), (V().lineas || []).map((r) => ({l: FMT.title(r.linea), v: +r.ventas, r})), {y: (d) => d.l, x: (d) => d.v, fmt: 'money0',
        tip: (d) => [d.l, 'Ventas ' + FMT.f('money0', d.v), 'Participación ' + FMT.f('pct', d.r.participacion)]});
      prodTable();
    },
    clientes() { cliTable(); usuTable(); anuTable(); },
    plan() { planDraw(); }
  };

  /* ---------- tablas ---------- */
  function td(tr, text, cls) { const c = el('td', cls || '', text); tr.appendChild(c); return c; }

  function prodRows() {
    const P = S.prod;
    let rows = (V().productos || []).slice();
    if (P.abc) rows = rows.filter((r) => r.abc === P.abc);
    if (P.q) rows = rows.filter((r) => (r.producto + ' ' + r.linea).toLowerCase().includes(P.q));
    const num = !['producto', 'linea', 'abc'].includes(P.key);
    const val = (r) => (P.key === 'tendencia' ? (r.tendencia === 'Nuevo' ? 99 : (r.tendencia === '' ? -99 : +r.tendencia)) : r[P.key]);
    rows.sort((a, b) => (num ? (val(a) - val(b)) : String(val(a)).localeCompare(String(val(b)), 'es')) * P.dir);
    return rows;
  }
  function prodTable() {
    const tb = $('#tbl-prod tbody'); tb.replaceChildren();
    const rows = prodRows();
    const frag = document.createDocumentFragment();
    rows.forEach((r) => {
      const tr = el('tr');
      td(tr, FMT.title(r.producto), 'strong');
      td(tr, FMT.title(r.linea));
      const c = td(tr, ''); c.appendChild(el('span', 'badge ' + r.abc, r.abc));
      td(tr, FMT.f('money', r.ventas), 'num');
      td(tr, FMT.f('int', r.unidades), 'num col-opt');
      td(tr, FMT.f('money', r.precio_prom), 'num col-opt');
      td(tr, FMT.f('pct', r.participacion), 'num');
      const t = r.tendencia;
      if (t === 'Nuevo') td(tr, 'Nuevo', 'num t-new');
      else if (t === '' || t === null || t === undefined) td(tr, '—', 'num');
      else td(tr, FMT.f('delta', t), 'num ' + (+t > 0.05 ? 't-up' : (+t < -0.05 ? 't-down' : '')));
      td(tr, FMT.f('int', r.precios_distintos), 'num col-opt' + (+r.precios_distintos >= 3 ? ' warn-cell' : ''));
      frag.appendChild(tr);
    });
    tb.appendChild(frag);
    const total = rows.reduce((s, r) => s + Number(r.ventas), 0);
    $('#prod-count').textContent = `${FMT.f('int', rows.length)} de ${FMT.f('int', (V().productos || []).length)} productos · ventas ${FMT.f('money0', total)}`;
    $$('#tbl-prod th[data-sort]').forEach((th) => th.setAttribute('aria-sort', th.dataset.sort === S.prod.key ? (S.prod.dir > 0 ? 'ascending' : 'descending') : 'none'));
  }
  function cliTable() {
    const tb = $('#tbl-cli tbody'); tb.replaceChildren();
    const rows = (V().clientes || []).slice().sort((a, b) => a.orden - b.orden);
    const totV = rows.reduce((s, r) => s + Number(r.ventas), 0) || 1;
    rows.forEach((r) => {
      const tr = el('tr');
      td(tr, r.segmento, 'strong'); td(tr, FMT.f('int', r.clientes), 'num');
      const c = td(tr, '', 'col-bar'); const b = el('div', 'bars2');
      const b1 = el('span', 'b1'); b1.style.width = (Number(r.participacion_clientes) * 100) + '%'; b1.title = 'Clientes ' + FMT.f('pct', r.participacion_clientes);
      const b2 = el('span', 'b2'); b2.style.width = (Number(r.ventas) / totV * 100) + '%'; b2.title = 'Ventas ' + FMT.f('pct', Number(r.ventas) / totV);
      b.append(b1, b2); c.appendChild(b);
      td(tr, FMT.f('money0', r.ventas), 'num'); td(tr, FMT.f('money', r.venta_por_cliente), 'num'); td(tr, FMT.f('int', r.sin_visita_reciente), 'num col-opt');
      tb.appendChild(tr);
    });
    const leg = el('tr'); const lc = el('td', 'table-foot'); lc.colSpan = 6;
    lc.append(el('span', 'inline-bar', ''), '% de clientes   ');
    const s2 = el('span', 'inline-bar'); s2.style.background = 'var(--gold)'; lc.append(s2, '% de ventas');
    lc.firstChild.style.width = '18px'; lc.firstChild.style.background = 'var(--navy-400)'; s2.style.width = '18px';
    leg.appendChild(lc); tb.appendChild(leg);
  }
  function usuTable() {
    const tb = $('#tbl-usu tbody'); tb.replaceChildren();
    const rows = V().usuarios || [];
    const maxB = Math.max(...rows.map((r) => +r.pct_con_bebida));
    rows.forEach((r) => {
      const tr = el('tr');
      td(tr, FMT.title(r.usuario), 'strong'); td(tr, FMT.f('money0', r.ventas), 'num'); td(tr, FMT.f('int', r.tickets), 'num col-opt');
      td(tr, FMT.f('money', r.ticket_prom), 'num'); td(tr, FMT.f('pct', r.pct_con_bebida), 'num' + (+r.pct_con_bebida === maxB ? ' t-up' : ''));
      td(tr, FMT.f('pct', r.pct_fin_de_semana), 'num col-opt');
      tb.appendChild(tr);
    });
  }
  function anuTable() {
    const tb = $('#tbl-anu tbody'); tb.replaceChildren();
    (V().anulaciones || []).forEach((r) => {
      const tr = el('tr');
      td(tr, r.motivo, r.motivo === 'Pruebas del sistema' ? 'strong warn-cell' : 'strong'); td(tr, FMT.f('money', r.valor), 'num'); td(tr, FMT.f('int', r.documentos), 'num');
      tb.appendChild(tr);
    });
  }

  function exportCsv() {
    const rows = prodRows();
    const cols = ['ranking', 'producto', 'linea', 'abc', 'ventas', 'unidades', 'precio_prom', 'participacion', 'acumulado', 'tendencia', 'precios_distintos', 'pvp_min', 'pvp_max'];
    const esc = (v) => { const s = v === undefined || v === null ? '' : String(v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [cols.join(';')].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(';'))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    a.download = 'productos_maiz_yuca_' + (isMes() ? S.periodo.slice(1) : 'total') + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- plan de acción ---------- */
  const PLAN_KEY = 'finav_plan_supuestos_v1';
  const PLAN_INPUTS = ['s-semana', 's-retorno', 's-tarde', 's-conv', 's-precio'];
  const DIAS_LUN_JUE_MES = 17.3; // 4 días × 4,33 semanas
  try { const sv = JSON.parse(localStorage.getItem(PLAN_KEY) || 'null'); if (sv) PLAN_INPUTS.forEach((id) => { if (sv[id] !== undefined) $('#' + id).value = sv[id]; }); } catch (e) { /* sin almacenamiento */ }
  const inp = (id) => { const v = parseFloat(String($('#' + id).value).replace(',', '.')); return isFinite(v) && v >= 0 ? v : 0; };

  function planCalc() {
    const meses = kpi('meses') || 1;
    const sup = {semana: inp('s-semana') / 100, retorno: inp('s-retorno') / 100, tarde: inp('s-tarde') / 100, conv: inp('s-conv') / 100, precio: inp('s-precio')};
    const ventaTardeMes = (kpi('pct_tarde') || 0) * (kpi('ventas_netas') || 0) / meses;
    const sinBebMes = (kpi('tickets_sin_bebida') || 0) / meses;
    const rows = {
      semana: {base: FMT.f('money0', kpi('venta_dia_lun_jue')) + ' / día', imp: (kpi('venta_dia_lun_jue') || 0) * sup.semana * DIAS_LUN_JUE_MES},
      frecuentes: {base: FMT.f('int', kpi('frecuentes_inactivos')) + ' clientes', imp: (kpi('frecuentes_inactivos') || 0) * sup.retorno * (kpi('ticket_prom') || 0)},
      tarde: {base: FMT.f('money0', ventaTardeMes) + ' / mes', imp: ventaTardeMes * sup.tarde},
      bebida: {base: FMT.f('int', sinBebMes) + ' tickets / mes', imp: sinBebMes * sup.conv * sup.precio}
    };
    const total = Object.values(rows).reduce((s, r) => s + r.imp, 0);
    return {sup, rows, total};
  }

  function planDraw() {
    const P = planCalc();
    const max = Math.max(...Object.values(P.rows).map((r) => r.imp), 1);
    $$('#tbl-esc tbody tr').forEach((tr) => {
      const r = P.rows[tr.dataset.row]; if (!r) return;
      $('[data-base]', tr).textContent = r.base;
      $('[data-imp]', tr).textContent = FMT.f('money0', r.imp);
      $('[data-bar]', tr).style.width = (r.imp / max * 100) + '%';
    });
    $('#esc-total').textContent = FMT.f('money0', P.total);
    $('#plan-total').textContent = FMT.f('money0', P.total);
    $('#plan-pct').textContent = FMT.f('pct', P.total / (kpi('prom_mensual') || 1));
    $('#plan-anual').textContent = FMT.f('money0', P.total * 12);
    const f = S.data.fuente || {};
    const pi = periodoInfo();
    $$('[data-src="periodo"]').forEach((e) => { e.textContent = isMes() ? fmtDate(pi.desde) + ' – ' + fmtDate(pi.hasta) : fmtDate(f.fecha_inicio) + ' – ' + fmtDate(f.fecha_corte); });
    $$('[data-src="emitido"]').forEach((e) => { e.textContent = new Date().toLocaleDateString(FINAV_CONFIG.LOCALE, {day: 'numeric', month: 'long', year: 'numeric'}); });

    // seguimiento semanal: línea base y meta derivada de los supuestos
    const s = P.sup, b = (k) => kpi(k) || 0;
    const seg = [
      ['Venta por día, lunes a jueves', 'money0', b('venta_dia_lun_jue'), b('venta_dia_lun_jue') * (1 + s.semana)],
      ['% de tickets con bebida', 'pct', b('pct_tickets_bebida'), b('pct_tickets_bebida') + (1 - b('pct_tickets_bebida')) * s.conv],
      ['Ticket promedio', 'money', b('ticket_prom'), b('ticket_prom') + (b('tickets_sin_bebida') * s.conv * s.precio) / Math.max(1, b('tickets'))],
      ['Venta mensual desde las 13h', 'money0', b('pct_tarde') * b('ventas_netas') / Math.max(1, b('meses')), b('pct_tarde') * b('ventas_netas') / Math.max(1, b('meses')) * (1 + s.tarde)],
      ['Frecuentes inactivos recuperados', 'int', 0, b('frecuentes_inactivos') * s.retorno],
      ['Clientes nuevos por mes', 'int', b('nuevos_ref_mes'), Math.max(b('nuevos_ref_mes'), b('nuevos_primer_mes'))],
      ['% de tickets a consumidor final', 'pct', b('pct_consumidor_final'), Math.max(0, b('pct_consumidor_final') - 0.10)],
      ['Anulaciones por pruebas del sistema', 'money0', b('anulado_pruebas'), 0]
    ];
    const tb = $('#tbl-seg tbody'); tb.replaceChildren();
    seg.forEach(([name, fm, base, meta]) => {
      const tr = el('tr');
      td(tr, name, 'strong'); td(tr, FMT.f(fm, base), 'num'); td(tr, FMT.f(fm, meta), 'num meta');
      for (let i = 0; i < 4; i++) td(tr, '', 'wk');
      tb.appendChild(tr);
    });
  }

  /* ---------- render ---------- */
  function renderAll() {
    if (!S.data) return;
    if (!S.data.por_periodo) { setStatus('error', 'Formato antiguo'); toast('La API devolvió un formato anterior. Actualice los archivos .gs y cree una nueva versión de la implementación.', 'error'); return; }
    fillPeriods(); paintSource(); paintValues(); lede(); insights();
    draw[S.tab]();
  }

  /* ---------- selector de período ---------- */
  function fillPeriods() {
    const sel = $('#periodo');
    const ps = (S.data.periodos || []).slice().sort((a, b) => a.orden - b.orden);
    if (!ps.some((p) => p.clave === S.periodo)) S.periodo = 'TOTAL';
    sel.replaceChildren(...ps.map((p) => { const o = new Option(p.clave === 'TOTAL' ? 'Todo el período' : p.etiqueta, p.clave); return o; }));
    sel.value = S.periodo;
    const i = ps.findIndex((p) => p.clave === S.periodo);
    $('#per-prev').disabled = i <= 0;
    $('#per-next').disabled = i >= ps.length - 1;
  }
  function setPeriodo(clave) {
    S.periodo = clave;
    try { sessionStorage.setItem(PERIOD_KEY, clave); } catch (e) { /* sin almacenamiento */ }
    renderAll();
  }
  $('#periodo').addEventListener('change', (e) => setPeriodo(e.target.value));
  const stepPeriodo = (d) => {
    const ps = (S.data.periodos || []).slice().sort((a, b) => a.orden - b.orden);
    const i = ps.findIndex((p) => p.clave === S.periodo) + d;
    if (ps[i]) setPeriodo(ps[i].clave);
  };
  $('#per-prev').addEventListener('click', () => stepPeriodo(-1));
  $('#per-next').addEventListener('click', () => stepPeriodo(1));
  try { const sp = sessionStorage.getItem(PERIOD_KEY); if (sp) S.periodo = sp; } catch (e) { /* sin almacenamiento */ }

  /* ---------- pestañas ---------- */
  function showTab(name, focus) {
    if (!draw[name]) name = 'resumen';
    S.tab = name;
    $$('.tab').forEach((t) => { const on = t.dataset.tab === name; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    $$('.page').forEach((p) => { p.hidden = p.id !== 'p-' + name; });
    if (history.replaceState) history.replaceState(null, '', '#' + name);
    if (S.data) draw[name]();
  }
  $$('.tab').forEach((t, i, all) => {
    t.addEventListener('click', () => showTab(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      const k = e.key; let j = null;
      if (k === 'ArrowRight') j = (i + 1) % all.length; else if (k === 'ArrowLeft') j = (i - 1 + all.length) % all.length; else if (k === 'Home') j = 0; else if (k === 'End') j = all.length - 1;
      if (j !== null) { e.preventDefault(); showTab(all[j].dataset.tab, true); }
    });
  });

  /* ---------- controles de tabla ---------- */
  $('#prod-q').addEventListener('input', (e) => { S.prod.q = e.target.value.trim().toLowerCase(); prodTable(); });
  $$('#tbl-prod th[data-sort] button').forEach((b) => b.addEventListener('click', () => {
    const k = b.parentElement.dataset.sort;
    if (S.prod.key === k) S.prod.dir *= -1; else { S.prod.key = k; S.prod.dir = ['producto', 'linea', 'abc'].includes(k) ? 1 : -1; }
    prodTable();
  }));
  $$('.seg-btn').forEach((b) => b.addEventListener('click', () => {
    S.prod.abc = b.dataset.abc; $$('.seg-btn').forEach((o) => o.setAttribute('aria-pressed', o === b)); prodTable();
  }));
  $('#prod-csv').addEventListener('click', exportCsv);

  /* ---------- controles del plan ---------- */
  PLAN_INPUTS.forEach((id) => $('#' + id).addEventListener('input', () => {
    if (!S.data) return;
    planDraw();
    try { localStorage.setItem(PLAN_KEY, JSON.stringify(Object.fromEntries(PLAN_INPUTS.map((k) => [k, $('#' + k).value])))); } catch (e) { /* sin almacenamiento */ }
  }));
  $('#btn-print').addEventListener('click', () => {
    if (!S.data) { toast('Espere a que carguen los datos para imprimir.', 'info'); return; }
    if (S.tab !== 'plan') showTab('plan');
    planDraw();
    document.body.classList.add('printing-plan');
    setTimeout(() => window.print(), 50);
  });
  window.addEventListener('afterprint', () => document.body.classList.remove('printing-plan'));

  /* ---------- carga y actualización ---------- */
  const loadingCharts = (on) => $$('.chart').forEach((c) => { if (on && !c.querySelector('svg')) c.classList.add('loading'); if (!on) c.classList.remove('loading'); });

  async function init() {
    loadingCharts(true);
    // pinta al instante la última copia guardada, si existe
    try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (c && API.hasApi() && c.data) { S.data = c.data; S.mode = 'live'; renderAll(); setStatus('loading', 'Sincronizando…'); } } catch (e) { /* sin caché */ }
    try {
      const r = await API.load();
      S.data = r.data; S.mode = r.mode;
      try { if (r.mode === 'live') localStorage.setItem(CACHE_KEY, JSON.stringify({data: r.data})); } catch (e) { /* almacenamiento no disponible */ }
      renderAll();
      if (r.mode === 'demo') toast('Mostrando datos de demostración. Configure la URL de la API para conectar Google Sheets.', 'info');
    } catch (err) {
      loadingCharts(false);
      setStatus('error', 'Sin conexión');
      toast('No se pudieron cargar los datos: ' + err.message, 'error', {label: 'Reintentar', fn: init});
    }
  }

  async function refresh() {
    const btn = $('#btn-refresh');
    if (btn.disabled) return;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true'); $('.btn-label', btn).textContent = 'Actualizando…';
    $('#progress').hidden = false; setStatus('loading', 'Revisando y estructurando la hoja…');
    const t0 = performance.now();
    try {
      const r = await API.refresh();
      S.data = r.data; S.mode = r.mode;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({data: r.data})); } catch (e) { /* sin almacenamiento */ }
      renderAll();
      const f = r.data.fuente || {};
      toast(`Análisis actualizado: ${FMT.f('int', f.filas_validas)} filas procesadas (corte ${fmtDate(f.fecha_corte)}) en ${FMT.f('dec1', (performance.now() - t0) / 1000)} s.`);
    } catch (err) {
      if (S.data) paintSource(); else setStatus('error', 'Error');
      toast('No se pudo actualizar: ' + err.message, 'error', {label: 'Reintentar', fn: refresh});
    } finally {
      btn.disabled = false; btn.removeAttribute('aria-busy'); $('.btn-label', btn).textContent = 'Actualizar'; $('#progress').hidden = true;
    }
  }
  $('#btn-refresh').addEventListener('click', refresh);

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (S.data) draw[S.tab](); }, 150); });

  const h = location.hash.slice(1);
  showTab(draw[h] ? h : 'resumen');
  init();
})();
