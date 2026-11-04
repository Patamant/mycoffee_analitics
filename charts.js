/* Gráficos (d3 v7). Cada función limpia el contenedor y redibuja según su ancho actual. */
window.CH = (() => {
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const COL = () => ({navy: css('--navy'), navy400: css('--navy-400'), gold: css('--gold'), muted: css('--chart-muted'), grid: css('--grid'), ink: css('--ink'),
    sub: css('--muted'), bad: css('--bad'), panel: css('--panel'), navy50: css('--navy-50')});
  const tipEl = () => document.getElementById('tooltip');

  const tip = {
    show(ev, lines) {
      const t = tipEl();
      t.replaceChildren(...lines.map((l, i) => { const d = document.createElement('div'); if (i === 0) d.className = 'tt-k'; d.textContent = l; return d; }));
      t.hidden = false;
      const pad = 14, w = t.offsetWidth, h = t.offsetHeight;
      let x = ev.clientX + pad, y = ev.clientY + pad;
      if (x + w > window.innerWidth - 8) x = ev.clientX - w - pad;
      if (y + h > window.innerHeight - 8) y = ev.clientY - h - pad;
      t.style.left = Math.max(8, x) + 'px'; t.style.top = Math.max(8, y) + 'px';
    },
    hide() { tipEl().hidden = true; }
  };

  const setup = (el, h) => {
    el.classList.remove('loading');
    el.replaceChildren();
    const w = Math.max(280, el.clientWidth || 600);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', h).attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img');
    return {svg, w};
  };
  const measure = (svg, s, size = 12) => { const t = svg.append('text').attr('font-size', size).text(s); const n = t.node().getComputedTextLength(); t.remove(); return n; };
  const styleAxis = (g, c) => {
    g.attr('font-size', null).attr('font-family', null);
    g.selectAll('text').attr('fill', c.sub).attr('font-size', 12);
    g.selectAll('.domain').attr('stroke', c.muted);
    g.selectAll('.tick line').attr('stroke', c.grid);
  };
  const empty = (el, msg) => { el.classList.remove('loading'); el.replaceChildren(); const d = document.createElement('div'); d.className = 'chart-empty'; d.textContent = msg || 'Sin datos para mostrar'; el.appendChild(d); };
  const touch = (sel, lines) => sel.on('pointermove', (ev, d) => tip.show(ev, lines(d))).on('pointerleave', tip.hide);

  /* Barras verticales */
  function bars(el, data, o) {
    if (!data || !data.length) return empty(el);
    const c = COL(), h = o.height || 250;
    const {svg, w} = setup(el, h);
    const ml = measure(svg, FMT.f(o.fmt, d3.max(data, o.y))) + 12, mr = 8, mt = 22, mb = 26;
    const x = d3.scaleBand(data.map(o.x), [ml, w - mr]).padding(0.3);
    const y = d3.scaleLinear([0, d3.max(data, o.y) * 1.12], [h - mb, mt]).nice();
    const gy = svg.append('g').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w - ml - mr)).tickFormat((v) => FMT.f(o.fmt, v)));
    styleAxis(gy, c); gy.select('.domain').remove();
    const step = Math.ceil(data.length / Math.max(1, Math.floor((w - ml) / 34)));
    const gx = svg.append('g').attr('transform', `translate(0,${h - mb})`).call(d3.axisBottom(x).tickSize(0).tickPadding(9).tickValues(x.domain().filter((_, i) => i % step === 0)).tickFormat(o.xFmt || ((v) => v)));
    styleAxis(gx, c);
    const bw = Math.min(34, x.bandwidth());
    const r = svg.append('g').selectAll('rect').data(data).join('rect')
      .attr('x', (d) => x(o.x(d)) + (x.bandwidth() - bw) / 2).attr('width', bw)
      .attr('y', (d) => y(o.y(d))).attr('height', (d) => y(0) - y(o.y(d))).attr('rx', 3)
      .attr('fill', (d) => (o.color ? o.color(d, c) : c.navy));
    if (o.tip) touch(r, o.tip);
    if (o.labels && bw >= 26) {
      svg.append('g').selectAll('text').data(data).join('text').attr('x', (d) => x(o.x(d)) + x.bandwidth() / 2).attr('y', (d) => y(o.y(d)) - 6)
        .attr('text-anchor', 'middle').attr('font-size', 11.5).attr('fill', c.sub).text((d) => FMT.f(o.labelFmt || o.fmt, o.y(d)));
    }
    if (o.avg) {
      const a = d3.mean(data, o.y);
      svg.append('line').attr('x1', ml).attr('x2', w - mr).attr('y1', y(a)).attr('y2', y(a)).attr('stroke', c.gold).attr('stroke-width', 2).attr('stroke-dasharray', '6 4');
      const lbl = (o.avgLabel || 'Promedio') + ' ' + FMT.f(o.fmt, a);
      const lw = measure(svg, lbl, 12) + 12;
      svg.append('rect').attr('x', w - mr - lw).attr('y', y(a) - 22).attr('width', lw).attr('height', 18).attr('rx', 4).attr('fill', c.panel).attr('opacity', .9);
      svg.append('text').attr('x', w - mr - 6).attr('y', y(a) - 9).attr('text-anchor', 'end').attr('font-size', 12).attr('font-weight', 600).attr('fill', css('--gold-700')).text(lbl);
    }
  }

  /* Línea con puntos */
  function line(el, data, o) {
    if (!data || !data.length) return empty(el);
    const c = COL(), h = o.height || 250;
    const {svg, w} = setup(el, h);
    const ext = d3.extent(data, o.y), span = (ext[1] - ext[0]) || 1;
    const y = d3.scaleLinear([ext[0] - span * 0.35, ext[1] + span * 0.35], [h - 26, 18]).nice();
    const ml = measure(svg, FMT.f(o.fmt, y.domain()[1])) + 12, mr = 14;
    const x = d3.scalePoint(data.map(o.x), [ml, w - mr]).padding(0.4);
    const gy = svg.append('g').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w - ml - mr)).tickFormat((v) => FMT.f(o.fmt, v)));
    styleAxis(gy, c); gy.select('.domain').remove();
    const stepL = Math.ceil(data.length / Math.max(1, Math.floor((w - ml) / 34)));
    const gx = svg.append('g').attr('transform', `translate(0,${h - 26})`).call(d3.axisBottom(x).tickSize(0).tickPadding(9).tickValues(x.domain().filter((_, i) => i % stepL === 0))); styleAxis(gx, c);
    const grad = 'g' + Math.random().toString(36).slice(2, 7);
    const lg = svg.append('defs').append('linearGradient').attr('id', grad).attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    [[0, .22], [.5, .08], [1, 0]].forEach(([o2, op]) => lg.append('stop').attr('offset', o2).attr('stop-color', c.navy).attr('stop-opacity', op));
    svg.append('path').datum(data).attr('fill', `url(#${grad})`).attr('d', d3.area().x((d) => x(o.x(d))).y0(h - 26).y1((d) => y(o.y(d))));
    svg.append('path').datum(data).attr('fill', 'none').attr('stroke', c.navy).attr('stroke-width', 2.25).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
      .attr('d', d3.line().x((d) => x(o.x(d))).y((d) => y(o.y(d))));
    const minV = ext[0];
    const hl = o.highlight ? data.find(o.highlight) : null;
    if (hl) svg.append('rect').attr('x', x(o.x(hl)) - 16).attr('y', 12).attr('width', 32).attr('height', h - 38).attr('rx', 6).attr('fill', c.gold).attr('opacity', .14);
    const pts = svg.append('g').selectAll('circle').data(data).join('circle').attr('cx', (d) => x(o.x(d))).attr('cy', (d) => y(o.y(d)))
      .attr('r', (d) => (d === hl ? 6.5 : o.y(d) === minV ? 5.5 : 4)).attr('fill', (d) => (d === hl ? c.gold : o.y(d) === minV ? c.bad : c.navy)).attr('stroke', c.panel).attr('stroke-width', 2);
    if (o.tip) touch(pts, o.tip);
    const last = hl || data[data.length - 1];
    svg.append('text').attr('x', x(o.x(last))).attr('y', y(o.y(last)) - 12).attr('text-anchor', 'middle').attr('font-size', 12).attr('font-weight', 700)
      .attr('fill', last === hl ? css('--gold-700') : o.y(last) === minV ? c.bad : c.navy).text(FMT.f(o.fmt, o.y(last)));
  }

  /* Barras horizontales */
  function hbars(el, data, o) {
    if (!data || !data.length) return empty(el);
    const c = COL(), h = o.height || Math.max(230, data.length * 34 + 10);
    el.style.minHeight = h + 'px';
    const {svg, w} = setup(el, h);
    const ml = d3.max(data, (d) => measure(svg, o.y(d))) + 12, mr = measure(svg, FMT.f(o.fmt, d3.max(data, o.x))) + 14;
    const y = d3.scaleBand(data.map(o.y), [4, h - 4]).padding(0.28);
    const x = d3.scaleLinear([0, d3.max(data, o.x)], [ml, w - mr]);
    const bh = Math.min(24, y.bandwidth());
    const r = svg.append('g').selectAll('rect').data(data).join('rect').attr('x', ml).attr('y', (d) => y(o.y(d)) + (y.bandwidth() - bh) / 2).attr('height', bh)
      .attr('width', (d) => Math.max(1, x(o.x(d)) - ml)).attr('rx', 3).attr('fill', (d) => (o.color ? o.color(d, c) : c.navy));
    if (o.tip) touch(r, o.tip);
    svg.append('g').selectAll('text').data(data).join('text').attr('x', (d) => x(o.x(d)) + 6).attr('y', (d) => y(o.y(d)) + y.bandwidth() / 2 + 4)
      .attr('font-size', 12.5).attr('font-weight', 600).attr('fill', c.ink).text((d) => FMT.f(o.fmt, o.x(d)));
    const gy = svg.append('g').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).tickSize(0).tickPadding(10)); styleAxis(gy, c); gy.select('.domain').remove();
    gy.selectAll('text').attr('fill', c.ink).attr('font-size', 12.5);
  }

  /* Mapa de calor día × hora */
  function heatmap(el, rows) {
    if (!rows || !rows.length) return empty(el);
    const c = COL(), h = 320;
    const {svg, w} = setup(el, h);
    const data = rows.map((r) => ({o: +r.orden, d: r.dia, h: +r.hora, v: +r.venta_prom}));
    const days = [...new Map(data.map((d) => [d.o, d.d]))].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
    const hours = d3.range(d3.min(data, (d) => d.h), d3.max(data, (d) => d.h) + 1);
    const ml = d3.max(days, (d) => measure(svg, d)) + 12, mr = 2, mt = 2, mb = 26;
    const x = d3.scaleBand(hours, [ml, w - mr]).padding(0.07);
    const y = d3.scaleBand(days, [mt, h - mb]).padding(0.07);
    const max = d3.max(data, (d) => d.v);
    const col = d3.scaleSequentialSqrt([0, max], d3.interpolateRgb(c.navy50, c.navy));
    const g = svg.append('g').selectAll('g').data(data).join('g');
    const r = g.append('rect').attr('x', (d) => x(d.h)).attr('y', (d) => y(d.d)).attr('width', x.bandwidth()).attr('height', y.bandwidth()).attr('rx', 4).attr('fill', (d) => col(d.v));
    touch(r, (d) => [`${d.d} · ${d.h}:00–${d.h}:59`, 'Venta promedio ' + FMT.f('money', d.v)]);
    if (x.bandwidth() > 36) {
      g.append('text').attr('x', (d) => x(d.h) + x.bandwidth() / 2).attr('y', (d) => y(d.d) + y.bandwidth() / 2 + 4).attr('text-anchor', 'middle').attr('pointer-events', 'none')
        .attr('font-size', 11.5).attr('font-weight', 600).attr('fill', (d) => (Math.sqrt(d.v / max) > 0.5 ? '#fff' : c.navy)).text((d) => '$' + Math.round(d.v));
    }
    const gx = svg.append('g').attr('transform', `translate(0,${h - mb})`).call(d3.axisBottom(x).tickSize(0).tickPadding(9).tickFormat((t) => t + 'h')
      .tickValues(x.bandwidth() < 24 ? hours.filter((t) => t % 2 === 1) : hours));
    styleAxis(gx, c); gx.select('.domain').remove();
    const gy = svg.append('g').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).tickSize(0).tickPadding(10)); styleAxis(gy, c); gy.select('.domain').remove();
  }

  /* Pesas (antes vs después) */
  function dumbbell(el, rows, o) {
    if (!rows || !rows.length) return empty(el);
    const c = COL();
    const data = rows.slice().sort((a, b) => b.b - a.b);
    const h = Math.max(300, data.length * 30 + 34);
    el.style.minHeight = h + 'px';
    const {svg, w} = setup(el, h);
    const ml = d3.max(data, (d) => measure(svg, d.l)) + 14, mr = 70, mt = 4, mb = 26;
    const y = d3.scaleBand(data.map((d) => d.l), [mt, h - mb]).padding(0.3);
    const x = d3.scaleLinear([0, d3.max(data, (d) => Math.max(d.a, d.b))], [ml, w - mr]).nice();
    const gx = svg.append('g').attr('transform', `translate(0,${h - mb})`).call(d3.axisBottom(x).ticks(Math.max(2, Math.floor((w - ml) / 100))).tickSize(-(h - mb - mt)).tickFormat((v) => FMT.f('money0', v)));
    styleAxis(gx, c); gx.select('.domain').remove();
    const g = svg.append('g').selectAll('g').data(data).join('g').attr('transform', (d) => `translate(0,${y(d.l) + y.bandwidth() / 2})`);
    g.append('line').attr('x1', (d) => x(Math.min(d.a, d.b))).attr('x2', (d) => x(Math.max(d.a, d.b))).attr('stroke', (d) => (d.b >= d.a ? c.navy400 : c.bad)).attr('stroke-width', 3).attr('stroke-opacity', .55);
    g.append('circle').attr('cx', (d) => x(d.a)).attr('r', 5.5).attr('fill', c.panel).attr('stroke', c.navy400).attr('stroke-width', 2);
    g.append('circle').attr('cx', (d) => x(d.b)).attr('r', 6).attr('fill', c.navy);
    g.append('text').attr('x', w - mr + 10).attr('y', 4).attr('font-size', 12).attr('font-weight', 700)
      .attr('fill', (d) => (d.a <= 0 ? css('--gold-700') : d.b >= d.a ? c.navy : c.bad))
      .text((d) => (d.a > 0 ? FMT.f('delta', d.b / d.a - 1) : 'Nueva'));
    const hit = g.append('rect').attr('x', 0).attr('y', -y.bandwidth() / 2).attr('width', w).attr('height', y.bandwidth()).attr('fill', 'transparent');
    touch(hit, (d) => [FMT.title(d.l), `${o.pa}: ${FMT.f('money0', d.a)} / mes`, `${o.pb}: ${FMT.f('money0', d.b)} / mes`, 'Participación del período ' + FMT.f('pct', d.share)]);
    const gy = svg.append('g').attr('transform', `translate(${ml},0)`).call(d3.axisLeft(y).tickSize(0).tickPadding(12).tickFormat(FMT.title)); styleAxis(gy, c); gy.select('.domain').remove();
    gy.selectAll('text').attr('fill', c.ink).attr('font-size', 12.5);
  }

  return {bars, line, hbars, heatmap, dumbbell, tip};
})();
