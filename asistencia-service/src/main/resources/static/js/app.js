/* ============================================================
   AsistenciaPro · Panel de gestión
   Consume las APIs REST de los tres microservicios.
   ============================================================ */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     Configuración de APIs
     --------------------------------------------------------- */
  const HOST = location.hostname || 'localhost';
  const API = {
    alumnos: `http://${HOST}:8081/api/alumnos`,
    sesiones: `http://${HOST}:8082/api/sesiones`,
    asistencias: `http://${HOST}:8083/api/asistencias`
  };

  const SERVICE_NAMES = { alumno: 'Alumnos', sesion: 'Sesiones', asistencia: 'Asistencias' };

  const VIEW_META = {
    dashboard:   { title: 'Dashboard',   subtitle: 'Resumen general del sistema de asistencia' },
    alumnos:     { title: 'Alumnos',     subtitle: 'Gestión del padrón de alumnos' },
    sesiones:    { title: 'Sesiones',    subtitle: 'Programación de clases y horarios' },
    asistencias: { title: 'Asistencias', subtitle: 'Registro y control de asistencia' }
  };

  const ESTADOS = {
    PRESENTE: { label: 'Presente', cls: 'status--green', color: '#22c55e' },
    TARDANZA: { label: 'Tardanza', cls: 'status--amber', color: '#f59e0b' },
    FALTA:    { label: 'Falta',    cls: 'status--red',   color: '#ef4444' }
  };

  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  /* ---------------------------------------------------------
     Estado
     --------------------------------------------------------- */
  const state = {
    alumnos: [],
    sesiones: [],
    asistencias: [],
    online: { alumno: null, sesion: null, asistencia: null },
    view: 'dashboard',
    pendingDelete: null,
    history: { alumno: null, registros: [], period: 'todo' },
    loaded: false
  };

  const filters = {
    alumnoSearch: '',
    alumnoEstado: '',
    sesionSearch: '',
    sesionFecha: '',
    idAlumno: '',
    idSesion: '',
    estado: ''
  };

  /* ---------------------------------------------------------
     Helpers
     --------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const pad = (n) => String(n).padStart(2, '0');

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function parseIsoDate(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function fmtDate(iso, long = false) {
    const d = parseIsoDate(iso);
    if (!d) return '—';
    const base = `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return long ? `${DAYS[d.getDay()]}, ${base}` : base;
  }

  function fmtTime(time) {
    if (!time) return '—';
    return String(time).slice(0, 5);
  }

  function fmtRange(start, end) {
    if (!start || !end) return '—';
    return `${fmtTime(start)} – ${fmtTime(end)}`;
  }

  function duration(start, end) {
    if (!start || !end) return '';
    const [h1, m1] = String(start).split(':').map(Number);
    const [h2, m2] = String(end).split(':').map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h ? `${h} h` : ''}${h && m ? ' ' : ''}${m ? `${m} min` : ''}`;
  }

  function initials(nombres, apellidos) {
    const a = (nombres || '').trim().charAt(0);
    const b = (apellidos || '').trim().charAt(0);
    return (a + b || '?').toUpperCase();
  }

  function avatarClass(seed) {
    const text = String(seed ?? '');
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 997;
    return `av-${(hash % 6) + 1}`;
  }

  const fullName = (alumno) => alumno ? `${alumno.nombres} ${alumno.apellidos}`.trim() : '';

  const mapById = (list) => new Map(list.map((item) => [item.id, item]));

  const byId = (list, id) => list.find((item) => item.id === id);

  function plural(count, singular, pluralForm) {
    return `${count} ${count === 1 ? singular : pluralForm}`;
  }

  function statusBadge(estado) {
    const meta = ESTADOS[estado] || { label: estado, cls: 'status--gray' };
    return `<span class="status ${meta.cls}"><span class="dot"></span>${esc(meta.label)}</span>`;
  }

  /* ---------------------------------------------------------
     Capa HTTP
     --------------------------------------------------------- */
  async function http(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body != null) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, { ...options, headers });

    if (response.status === 204) return null;

    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }

    if (!response.ok) {
      const error = new Error(data?.message || `Error ${response.status}`);
      error.status = response.status;
      error.details = data?.details || null;
      throw error;
    }
    return data;
  }

  /* ---------------------------------------------------------
     Carga de datos
     --------------------------------------------------------- */
  async function loadAll({ silent = false } = {}) {
    if (!silent) showSkeletons();

    const [alumnos, sesiones, asistencias] = await Promise.allSettled([
      http(API.alumnos), http(API.sesiones), http(API.asistencias)
    ]);

    state.online.alumno = alumnos.status === 'fulfilled';
    state.online.sesion = sesiones.status === 'fulfilled';
    state.online.asistencia = asistencias.status === 'fulfilled';

    if (alumnos.status === 'fulfilled') state.alumnos = alumnos.value || [];
    if (sesiones.status === 'fulfilled') state.sesiones = sesiones.value || [];
    if (asistencias.status === 'fulfilled') state.asistencias = asistencias.value || [];

    state.loaded = true;
    renderAll();
  }

  async function reload(kind) {
    try {
      if (kind === 'alumno') state.alumnos = await http(API.alumnos) || [];
      if (kind === 'sesion') state.sesiones = await http(API.sesiones) || [];
      if (kind === 'asistencia') state.asistencias = await http(API.asistencias) || [];
      state.online[kind] = true;
    } catch (error) {
      state.online[kind] = false;
      toast('error', 'No se pudo actualizar', error.message);
    }
    renderAll();
  }

  /* ---------------------------------------------------------
     Render general
     --------------------------------------------------------- */
  function renderAll() {
    renderServiceStatus();
    renderOfflineBanner();
    renderNavCounts();
    renderFilterOptions();
    renderDashboard();
    renderAlumnos();
    renderSesiones();
    renderAsistencias();
  }

  function renderNavCounts() {
    $('#navCountAlumnos').textContent = state.alumnos.length;
    $('#navCountSesiones').textContent = state.sesiones.length;
    $('#navCountAsistencias').textContent = state.asistencias.length;
  }

  function renderServiceStatus() {
    $$('#serviceStatus li').forEach((item) => {
      const dot = $('.dot', item);
      const value = state.online[item.dataset.service];
      dot.className = 'dot' + (value === null ? ' pending' : value ? ' on' : ' off');
    });
  }

  function renderOfflineBanner() {
    const banner = $('#offlineBanner');
    const offline = Object.keys(state.online).filter((key) => state.online[key] === false);
    if (!offline.length) {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
    $('#offlineDetail').textContent =
      `Sin conexión con: ${offline.map((key) => SERVICE_NAMES[key]).join(', ')}. Inicia los servicios y reintenta.`;
  }

  /* ---------------------------------------------------------
     Dashboard
     --------------------------------------------------------- */
  function renderDashboard() {
    const totalAlumnos = state.alumnos.length;
    const activos = state.alumnos.filter((a) => a.estado).length;
    const totalSesiones = state.sesiones.length;
    const totalAsistencias = state.asistencias.length;

    const counts = { PRESENTE: 0, TARDANZA: 0, FALTA: 0 };
    state.asistencias.forEach((a) => { if (counts[a.estado] != null) counts[a.estado]++; });
    const efectiva = totalAsistencias
      ? Math.round(((counts.PRESENTE + counts.TARDANZA) / totalAsistencias) * 100)
      : 0;

    const kpis = [
      {
        icon: 'i-users', accent: '#6366f1', value: totalAlumnos,
        label: 'Alumnos registrados', trend: `${activos} activos`
      },
      {
        icon: 'i-calendar', accent: '#0ea5e9', value: totalSesiones,
        label: 'Sesiones de clase', trend: `${upcomingSessions().length} próximas`
      },
      {
        icon: 'i-clipboard', accent: '#14b8a6', value: totalAsistencias,
        label: 'Asistencias registradas', trend: totalAsistencias ? 'histórico' : 'sin datos'
      },
      {
        icon: 'i-trend', accent: '#f59e0b', value: `${efectiva}%`,
        label: 'Asistencia efectiva', trend: `${counts.PRESENTE} presentes`
      }
    ];

    $('#kpiGrid').innerHTML = kpis.map((kpi) => `
      <article class="kpi" style="--accent:${kpi.accent}">
        <div class="kpi-top">
          <div class="kpi-icon"><svg><use href="#${kpi.icon}"/></svg></div>
          <span class="kpi-trend">${esc(kpi.trend)}</span>
        </div>
        <div class="kpi-value">${kpi.value}</div>
        <div class="kpi-label">${esc(kpi.label)}</div>
      </article>
    `).join('');

    /* Hero */
    $('#heroRate').textContent = `${efectiva}%`;
    $('#heroPresentes').textContent = `${counts.PRESENTE} presentes`;
    $('#heroSesiones').textContent = plural(upcomingSessions().length, 'sesión próxima', 'sesiones próximas');
    $('.hero-ring').style.setProperty('--ring', `${efectiva * 3.6}deg`);

    /* Donut */
    const donut = $('#donut');
    $('#donutTotal').textContent = plural(totalAsistencias, 'registro', 'registros');
    $('#donutPct').textContent = `${efectiva}%`;

    if (totalAsistencias) {
      let acc = 0;
      const stops = ['PRESENTE', 'TARDANZA', 'FALTA'].map((estado) => {
        const start = acc * 360;
        acc += counts[estado] / totalAsistencias;
        return `${ESTADOS[estado].color} ${start.toFixed(2)}deg ${(acc * 360).toFixed(2)}deg`;
      });
      donut.style.background = `conic-gradient(from -90deg, ${stops.join(', ')})`;
    } else {
      donut.style.background = 'conic-gradient(var(--line) 0deg, var(--line) 360deg)';
    }

    $('#donutLegend').innerHTML = ['PRESENTE', 'TARDANZA', 'FALTA'].map((estado) => {
      const meta = ESTADOS[estado];
      const pct = totalAsistencias ? Math.round((counts[estado] / totalAsistencias) * 100) : 0;
      return `
        <li>
          <span class="swatch" style="background:${meta.color}"></span>
          <span class="legend-name">${meta.label}</span>
          <span class="legend-value">${counts[estado]}</span>
          <span class="legend-pct">${pct}%</span>
        </li>`;
    }).join('');

    /* Actividad por fecha */
    const byDate = new Map();
    state.asistencias.forEach((a) => byDate.set(a.fecha, (byDate.get(a.fecha) || 0) + 1));
    const dates = Array.from(byDate.keys()).sort().slice(-7);
    const max = Math.max(...dates.map((d) => byDate.get(d)), 1);

    $('#weekBars').innerHTML = dates.length
      ? dates.map((date) => {
          const count = byDate.get(date);
          const height = Math.max(8, Math.round((count / max) * 100));
          const d = parseIsoDate(date);
          const label = d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : date;
          return `
            <div class="bar-col" title="${esc(fmtDate(date, true))}: ${count}">
              <div class="bar-track">
                <div class="bar" style="height:${height}%"><span class="bar-value">${count}</span></div>
              </div>
              <span class="bar-label">${label}</span>
            </div>`;
        }).join('')
      : `<div class="empty empty-sm" style="flex:1"><svg><use href="#i-trend"/></svg><p>Aún no hay datos de actividad.</p></div>`;

    /* Últimos registros */
    const recent = [...state.asistencias]
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || b.id - a.id)
      .slice(0, 6);

    $('#recentAsistencias').innerHTML = recent.map((registro) => {
      const alumno = byId(state.alumnos, registro.idAlumno);
      const sesion = byId(state.sesiones, registro.idSesion);
      return `
        <tr>
          <td>
            <div class="cell-main">
              <div class="avatar ${avatarClass(registro.idAlumno)}">${esc(initials(alumno?.nombres, alumno?.apellidos))}</div>
              <div class="info"><strong>${esc(alumno ? fullName(alumno) : `Alumno #${registro.idAlumno}`)}</strong><small>${esc(alumno?.codigo || 'sin código')}</small></div>
            </div>
          </td>
          <td>${esc(sesion?.nombreCurso || `Sesión #${registro.idSesion}`)}</td>
          <td>${esc(fmtDate(registro.fecha))}</td>
          <td>${statusBadge(registro.estado)}</td>
        </tr>`;
    }).join('');

    const recentEmpty = $('#recentEmpty');
    recentEmpty.hidden = recent.length > 0;
    recentEmpty.previousElementSibling.hidden = recent.length === 0;

    /* Próximas sesiones */
    const upcoming = upcomingSessions().slice(0, 4);
    $('#upcomingSessions').innerHTML = upcoming.map((sesion) => {
      const d = parseIsoDate(sesion.fecha);
      return `
        <li class="session-item">
          <div class="date-badge"><strong>${d ? pad(d.getDate()) : '--'}</strong><span>${d ? MONTHS[d.getMonth()] : ''}</span></div>
          <div class="info">
            <strong>${esc(sesion.nombreCurso)}</strong>
            <small>${esc(sesion.codigoCurso)} · ${esc(fmtRange(sesion.horaInicio, sesion.horaFin))}</small>
          </div>
          <span class="time">${esc(duration(sesion.horaInicio, sesion.horaFin))}</span>
        </li>`;
    }).join('');

    const upcomingEmpty = $('#upcomingEmpty');
    upcomingEmpty.hidden = upcoming.length > 0;
    upcomingEmpty.previousElementSibling.hidden = upcoming.length === 0;
  }

  function upcomingSessions() {
    const today = todayIso();
    return state.sesiones
      .filter((s) => s.fecha >= today)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.horaInicio).localeCompare(String(b.horaInicio)));
  }

  /* ---------------------------------------------------------
     Alumnos
     --------------------------------------------------------- */
  function filteredAlumnos() {
    const q = filters.alumnoSearch.trim().toLowerCase();
    return state.alumnos
      .filter((alumno) => {
        const text = `${alumno.codigo || ''} ${alumno.nombres || ''} ${alumno.apellidos || ''} ${alumno.correo || ''}`.toLowerCase();
        const matchesQuery = !q || text.includes(q);
        const matchesEstado = !filters.alumnoEstado || String(!!alumno.estado) === filters.alumnoEstado;
        return matchesQuery && matchesEstado;
      })
      .sort((a, b) =>
        String(a.apellidos || '').localeCompare(String(b.apellidos || ''), 'es') ||
        String(a.nombres || '').localeCompare(String(b.nombres || ''), 'es'));
  }

  function renderAlumnos() {
    const lista = filteredAlumnos();
    const total = state.alumnos.length;

    $('#alumnosCount').textContent = lista.length === total
      ? plural(total, 'alumno registrado', 'alumnos registrados')
      : `${lista.length} de ${total} alumnos`;

    $('#alumnosBody').innerHTML = lista.map((alumno) => `
      <tr>
        <td>
          <div class="cell-main">
            <div class="avatar ${avatarClass(alumno.id)}">${esc(initials(alumno.nombres, alumno.apellidos))}</div>
            <div class="info">
              <strong>${esc(fullName(alumno))}</strong>
              <small>${esc(alumno.correo || 'sin correo')}</small>
            </div>
          </div>
        </td>
        <td><span class="code-chip">${esc(alumno.codigo)}</span></td>
        <td>
          <span class="status ${alumno.estado ? 'status--green' : 'status--gray'}">
            <span class="dot"></span>${alumno.estado ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td class="ta-right">
          <div class="row-actions">
            <button class="icon-btn-sm" data-action="historial-alumno" data-id="${alumno.id}" title="Ver historial" aria-label="Ver historial de ${esc(fullName(alumno))}">
              <svg><use href="#i-history"/></svg>
            </button>
            <button class="icon-btn-sm" data-action="edit-alumno" data-id="${alumno.id}" title="Editar" aria-label="Editar ${esc(fullName(alumno))}">
              <svg><use href="#i-pencil"/></svg>
            </button>
            <button class="icon-btn-sm danger" data-action="delete-alumno" data-id="${alumno.id}" title="Eliminar" aria-label="Eliminar ${esc(fullName(alumno))}">
              <svg><use href="#i-trash"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    const empty = $('#alumnosEmpty');
    empty.hidden = lista.length > 0;
    empty.previousElementSibling.hidden = lista.length === 0;
  }

  /* ---------------------------------------------------------
     Sesiones
     --------------------------------------------------------- */
  function filteredSesiones() {
    const q = filters.sesionSearch.trim().toLowerCase();
    return state.sesiones
      .filter((sesion) => {
        const text = `${sesion.codigoCurso || ''} ${sesion.nombreCurso || ''}`.toLowerCase();
        return (!q || text.includes(q)) && (!filters.sesionFecha || sesion.fecha === filters.sesionFecha);
      })
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || String(b.horaInicio).localeCompare(String(a.horaInicio)));
  }

  function renderSesiones() {
    const lista = filteredSesiones();
    const total = state.sesiones.length;

    $('#sesionesCount').textContent = lista.length === total
      ? plural(total, 'sesión programada', 'sesiones programadas')
      : `${lista.length} de ${total} sesiones`;

    $('#sesionesBody').innerHTML = lista.map((sesion) => {
      const d = parseIsoDate(sesion.fecha);
      return `
        <tr>
          <td>
            <div class="cell-main">
              <div class="date-badge"><strong>${d ? pad(d.getDate()) : '--'}</strong><span>${d ? MONTHS[d.getMonth()] : ''}</span></div>
              <div class="info">
                <strong>${esc(sesion.nombreCurso)}</strong>
                <small>${esc(sesion.codigoCurso)}</small>
              </div>
            </div>
          </td>
          <td>${esc(fmtDate(sesion.fecha))}</td>
          <td>
            <span class="code-chip">${esc(fmtRange(sesion.horaInicio, sesion.horaFin))}</span>
            <small class="hint" style="display:block;margin-top:3px;color:var(--muted);font-size:11px">${esc(duration(sesion.horaInicio, sesion.horaFin))}</small>
          </td>
          <td class="ta-right">
            <div class="row-actions">
              <button class="icon-btn-sm" data-action="edit-sesion" data-id="${sesion.id}" title="Editar" aria-label="Editar ${esc(sesion.nombreCurso)}">
                <svg><use href="#i-pencil"/></svg>
              </button>
              <button class="icon-btn-sm danger" data-action="delete-sesion" data-id="${sesion.id}" title="Eliminar" aria-label="Eliminar ${esc(sesion.nombreCurso)}">
                <svg><use href="#i-trash"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    const empty = $('#sesionesEmpty');
    empty.hidden = lista.length > 0;
    empty.previousElementSibling.hidden = lista.length === 0;
  }

  /* ---------------------------------------------------------
     Asistencias
     --------------------------------------------------------- */
  function filteredAsistencias() {
    return state.asistencias
      .filter((registro) => {
        const matchesAlumno = !filters.idAlumno || String(registro.idAlumno) === filters.idAlumno;
        const matchesSesion = !filters.idSesion || String(registro.idSesion) === filters.idSesion;
        const matchesEstado = !filters.estado || registro.estado === filters.estado;
        return matchesAlumno && matchesSesion && matchesEstado;
      })
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id);
  }

  function renderAsistencias() {
    const lista = filteredAsistencias();
    const total = state.asistencias.length;

    $('#asistenciasCount').textContent = lista.length === total
      ? plural(total, 'registro de asistencia', 'registros de asistencia')
      : `${lista.length} de ${total} registros`;

    $('#asistenciasBody').innerHTML = lista.map((registro) => {
      const alumno = byId(state.alumnos, registro.idAlumno);
      const sesion = byId(state.sesiones, registro.idSesion);
      return `
        <tr>
          <td>
            <div class="cell-main">
              <div class="avatar ${avatarClass(registro.idAlumno)}">${esc(initials(alumno?.nombres, alumno?.apellidos))}</div>
              <div class="info">
                <strong>${esc(alumno ? fullName(alumno) : `Alumno #${registro.idAlumno}`)}</strong>
                <small>${esc(alumno?.codigo || 'sin código')}</small>
              </div>
            </div>
          </td>
          <td>
            <div class="cell-main">
              <div class="info">
                <strong>${esc(sesion?.nombreCurso || `Sesión #${registro.idSesion}`)}</strong>
                <small>${sesion ? `${esc(sesion.codigoCurso)} · ${esc(fmtDate(sesion.fecha))}` : 'sesión no disponible'}</small>
              </div>
            </div>
          </td>
          <td>${esc(fmtDate(registro.fecha))}</td>
          <td>${statusBadge(registro.estado)}</td>
          <td class="ta-right">
            <div class="row-actions">
              <button class="icon-btn-sm" data-action="historial-alumno" data-id="${registro.idAlumno}" title="Historial del alumno" aria-label="Ver historial del alumno">
                <svg><use href="#i-history"/></svg>
              </button>
              <button class="icon-btn-sm" data-action="edit-asistencia" data-id="${registro.id}" title="Editar" aria-label="Editar asistencia">
                <svg><use href="#i-pencil"/></svg>
              </button>
              <button class="icon-btn-sm danger" data-action="delete-asistencia" data-id="${registro.id}" title="Eliminar" aria-label="Eliminar asistencia">
                <svg><use href="#i-trash"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    const empty = $('#asistenciasEmpty');
    empty.hidden = lista.length > 0;
    empty.previousElementSibling.hidden = lista.length === 0;
  }

  /* ---------------------------------------------------------
     Historial de asistencia por alumno
     --------------------------------------------------------- */
  function showHistoryLayer() {
    $('#historyLayer').hidden = false;
    syncBodyLock();
  }  function closeHistorial() {
    $('#historyLayer').hidden = true;
    state.history = { alumno: null, registros: [], period: 'todo' };
    syncBodyLock();
  }

  async function openHistorial(idAlumno) {
    const alumno = byId(state.alumnos, idAlumno);
    if (!alumno) return;

    state.history = { alumno, registros: [], period: 'todo' };
    $('#historyBody').innerHTML = `
      <div class="history-loading">
        <div class="skeleton-row" style="width:70%"></div>
        <div class="skeleton-row" style="width:45%"></div>
        <div class="skeleton-row" style="width:88%"></div>
      </div>`;
    $('#historySubtitle').textContent = `${alumno.codigo} · cargando historial…`;
    showHistoryLayer();

    try {
      const registros = await http(`${API.asistencias}/alumno/${idAlumno}`);
      state.history.registros = (registros || []).slice().sort(sortAsistencias);
    } catch {
      /* Si el servicio no responde, usamos la copia local ya cargada */
      state.history.registros = state.asistencias
        .filter((registro) => registro.idAlumno === idAlumno)
        .slice()
        .sort(sortAsistencias);
    }

    renderHistorial();
  }

  function sortAsistencias(a, b) {
    return String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id;
  }

  function filterByPeriod(registros, period) {
    if (period === 'todo') return registros;
    const today = new Date();
    if (period === 'mes') {
      return registros.filter((registro) => {
        const d = parseIsoDate(registro.fecha);
        return d && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
      });
    }
    const days = period === 'dias30' ? 30 : 90;
    const desde = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
    return registros.filter((registro) => {
      const d = parseIsoDate(registro.fecha);
      return d && d >= desde;
    });
  }

  function renderHistorial() {
    const { alumno, registros } = state.history;
    if (!alumno) return;

    const total = registros.length;
    const counts = { PRESENTE: 0, TARDANZA: 0, FALTA: 0 };
    registros.forEach((registro) => { if (counts[registro.estado] != null) counts[registro.estado]++; });
    const efectiva = total ? Math.round(((counts.PRESENTE + counts.TARDANZA) / total) * 100) : 0;

    const pctOf = (value) => (total ? (value / total) * 100 : 0);
    const bar = total
      ? `<div class="history-bar" role="img" aria-label="Distribución de asistencia">
           <span style="width:${pctOf(counts.PRESENTE)}%;background:#22c55e"></span>
           <span style="width:${pctOf(counts.TARDANZA)}%;background:#f59e0b"></span>
           <span style="width:${pctOf(counts.FALTA)}%;background:#ef4444"></span>
         </div>`
      : '<div class="history-bar"><span style="width:100%"></span></div>';

    const filtrados = filterByPeriod(registros, state.history.period);
    $('#historySubtitle').textContent = `${alumno.codigo} · ${plural(total, 'registro', 'registros')}`;

    const rows = filtrados.map((registro) => {
      const sesion = byId(state.sesiones, registro.idSesion);
      const d = parseIsoDate(registro.fecha);
      return `
        <tr>
          <td>
            <div class="cell-main">
              <div class="date-badge"><strong>${d ? pad(d.getDate()) : '--'}</strong><span>${d ? MONTHS[d.getMonth()] : ''}</span></div>
              <div class="info">
                <strong>${esc(fmtDate(registro.fecha, true))}</strong>
                <small>Registro #${registro.id}</small>
              </div>
            </div>
          </td>
          <td>
            <div class="info">
              <strong style="font-size:13px;font-weight:600">${esc(sesion?.nombreCurso || `Sesión #${registro.idSesion}`)}</strong>
              <small style="font-size:11.5px;color:var(--muted)">${esc(sesion?.codigoCurso || 'sin curso')}</small>
            </div>
          </td>
          <td>${sesion ? `<span class="code-chip">${esc(fmtRange(sesion.horaInicio, sesion.horaFin))}</span>` : '—'}</td>
          <td>${statusBadge(registro.estado)}</td>
        </tr>`;
    }).join('');

    const periodLabel = { todo: 'Todo el historial', mes: 'Este mes', dias30: 'Últimos 30 días', dias90: 'Últimos 90 días' };

    $('#historyBody').innerHTML = `
      <div class="history-profile">
        <div class="avatar ${avatarClass(alumno.id)}">${esc(initials(alumno.nombres, alumno.apellidos))}</div>
        <div class="info">
          <strong>${esc(fullName(alumno))}</strong>
          <span>${esc(alumno.correo)}</span>
        </div>
        <span class="status ${alumno.estado ? 'status--green' : 'status--gray'}">
          <span class="dot"></span>${alumno.estado ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div class="history-stats">
        <div class="hstat"><span>Total</span><strong>${total}</strong></div>
        <div class="hstat hstat--green"><span>Presente</span><strong>${counts.PRESENTE}</strong></div>
        <div class="hstat hstat--amber"><span>Tardanza</span><strong>${counts.TARDANZA}</strong></div>
        <div class="hstat hstat--red"><span>Falta</span><strong>${counts.FALTA}</strong></div>
        <div class="hstat hstat--brand"><span>Asistencia</span><strong>${efectiva}%</strong></div>
      </div>

      ${bar}

      <div class="history-toolbar">
        <h3>Registros</h3>
        <span class="pill">${filtrados.length} de ${total}</span>
        <select class="select" id="historyPeriod" aria-label="Filtrar historial por periodo">
          ${Object.entries(periodLabel).map(([value, label]) =>
            `<option value="${value}"${state.history.period === value ? ' selected' : ''}>${label}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" data-action="export-historial">
          <svg><use href="#i-download"/></svg> Exportar
        </button>
      </div>

      <div class="table-wrap" ${filtrados.length ? '' : 'hidden'}>
        <table class="data-table table-compact">
          <thead>
            <tr><th>Fecha</th><th>Curso</th><th>Horario</th><th>Estado</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="empty empty-sm" ${filtrados.length ? 'hidden' : ''}>
        <svg><use href="#i-inbox"/></svg>
        <p>${total
          ? 'No hay registros en el periodo seleccionado.'
          : 'Este alumno aún no tiene asistencias registradas.'}</p>
      </div>`;

    const periodSelect = $('#historyPeriod');
    if (periodSelect) {
      periodSelect.addEventListener('change', (event) => {
        state.history.period = event.target.value;
        renderHistorial();
      });
    }
  }

  function exportHistorial() {
    const { alumno, registros } = state.history;
    if (!alumno) return;
    const lista = filterByPeriod(registros, state.history.period);
    if (!lista.length) return toast('info', 'Nada que exportar', 'No hay registros en el periodo seleccionado.');

    downloadCsv(`historial-${alumno.codigo}-${todayIso()}.csv`,
      ['Fecha', 'Curso', 'Código del curso', 'Hora inicio', 'Hora fin', 'Estado'],
      lista.map((registro) => {
        const sesion = byId(state.sesiones, registro.idSesion);
        return [
          registro.fecha,
          sesion?.nombreCurso || `Sesión #${registro.idSesion}`,
          sesion?.codigoCurso || '',
          sesion ? fmtTime(sesion.horaInicio) : '',
          sesion ? fmtTime(sesion.horaFin) : '',
          ESTADOS[registro.estado]?.label || registro.estado
        ];
      }));
  }

  /* ---------------------------------------------------------
     Filtros (selects)
     --------------------------------------------------------- */
  function renderFilterOptions() {
    fillSelect($('#filtroAlumno'), state.alumnos, filters.idAlumno,
      'Todos los alumnos', (a) => `${fullName(a)} · ${a.codigo}`);
    fillSelect($('#filtroSesion'), state.sesiones, filters.idSesion,
      'Todas las sesiones', (s) => `${s.nombreCurso} · ${fmtDate(s.fecha)}`);
  }

  function fillSelect(select, items, selected, placeholder, labelFn) {
    if (!select) return;
    const sorted = [...items].sort((a, b) => String(labelFn(a)).localeCompare(String(labelFn(b)), 'es'));
    select.innerHTML = `<option value="">${esc(placeholder)}</option>` + sorted.map((item) => `
      <option value="${item.id}"${String(item.id) === String(selected) ? ' selected' : ''}>${esc(labelFn(item))}</option>
    `).join('');
    select.value = selected || '';
  }

  /* ---------------------------------------------------------
     Skeletons
     --------------------------------------------------------- */
  function showSkeletons() {
    if (state.loaded) return;
    const row = (cols) => `<tr><td colspan="${cols}"><div class="skeleton-row"></div><div class="skeleton-row" style="width:42%"></div></td></tr>`;
    $('#alumnosBody').innerHTML = row(4);
    $('#sesionesBody').innerHTML = row(4);
    $('#asistenciasBody').innerHTML = row(5);
    $('#recentAsistencias').innerHTML = row(4);
  }

  /* ---------------------------------------------------------
     Router / navegación
     --------------------------------------------------------- */
  function viewFromHash() {
    const match = location.hash.match(/^#\/([a-z]+)/);
    return match && VIEW_META[match[1]] ? match[1] : 'dashboard';
  }

  function setView(view) {
    state.view = view;
    $$('.view').forEach((section) => { section.hidden = section.dataset.view !== view; });
    $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view));

    const meta = VIEW_META[view];
    $('#pageTitle').textContent = meta.title;
    $('#pageSubtitle').textContent = meta.subtitle;

    closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigate(view) {
    if (viewFromHash() === view) setView(view);
    else location.hash = `#/${view}`;
  }

  function openSidebar() {
    $('#sidebar').classList.add('open');
    $('#scrim').hidden = false;
  }

  function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#scrim').hidden = true;
  }

  /* ---------------------------------------------------------
     Modales
     --------------------------------------------------------- */
  let lastFocused = null;

  function syncBodyLock() {
    const open = ['#modalLayer', '#confirmLayer', '#historyLayer']
      .some((selector) => !$(selector).hidden);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function openFormModal({ title, subtitle, icon, html, onSubmit }) {
    lastFocused = document.activeElement;
    $('#modalTitle').textContent = title;
    $('#modalSubtitle').textContent = subtitle;
    $('#modalIcon').innerHTML = `<svg><use href="#${icon}"/></svg>`;
    $('#modalBody').innerHTML = html;
    $('#modalLayer').hidden = false;
    document.body.style.overflow = 'hidden';

    const form = $('#entityForm');
    if (form) {
      form.addEventListener('submit', onSubmit);
      const first = form.querySelector('input:not([type="hidden"]), select');
      if (first) setTimeout(() => first.focus(), 60);
    }
  }

  function closeModal() {
    $('#modalLayer').hidden = true;
    $('#modalBody').innerHTML = '';
    syncBodyLock();
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    lastFocused = null;
  }

  function askDelete(kind, id, name) {
    state.pendingDelete = { kind, id, name };
    const labels = {
      alumno: 'el alumno',
      sesion: 'la sesión',
      asistencia: 'el registro de asistencia'
    };
    $('#confirmTitle').textContent = `¿Eliminar ${labels[kind]}?`;
    $('#confirmText').innerHTML =
      `Se eliminará <span class="confirm-name">${esc(name)}</span> de forma permanente. Esta acción no se puede deshacer.`;
    $('#confirmLayer').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#confirmAccept').focus(), 60);
  }

  function closeConfirm() {
    $('#confirmLayer').hidden = true;
    state.pendingDelete = null;
    syncBodyLock();
  }

  async function confirmDelete() {
    const pending = state.pendingDelete;
    if (!pending) return;
    const endpoints = { alumno: API.alumnos, sesion: API.sesiones, asistencia: API.asistencias };
    const button = $('#confirmAccept');
    setBusy(button, true, 'Eliminando…');
    try {
      await http(`${endpoints[pending.kind]}/${pending.id}`, { method: 'DELETE' });
      closeConfirm();
      toast('success', 'Registro eliminado', `${pending.name} se eliminó correctamente.`);
      await reload(pending.kind);
    } catch (error) {
      toast('error', 'No se pudo eliminar', error.message);
    } finally {
      setBusy(button, false);
    }
  }

  function setBusy(button, busy, text = 'Guardando…') {
    if (!button) return;
    if (busy) {
      button.dataset.html = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="spinner"></span> ${esc(text)}`;
    } else {
      button.disabled = false;
      if (button.dataset.html) button.innerHTML = button.dataset.html;
    }
  }

  /* ---------------------------------------------------------
     Formularios
     --------------------------------------------------------- */
  function alumnoForm(alumno) {
    const editing = Boolean(alumno);
    openFormModal({
      title: editing ? 'Editar alumno' : 'Nuevo alumno',
      subtitle: editing ? 'Actualiza los datos del alumno seleccionado' : 'Registra un nuevo alumno en el padrón',
      icon: 'i-users',
      html: `
        <form id="entityForm" novalidate>
          <div class="form-grid">
            <div class="field">
              <label for="f-codigo">Código</label>
              <input class="input" id="f-codigo" name="codigo" maxlength="20" value="${esc(alumno?.codigo || '')}" placeholder="A001" required>
              <span class="hint">Identificador único del alumno</span>
            </div>
            <div class="field">
              <label>Estado</label>
              <div class="switch-row">
                <input type="checkbox" id="f-estado" name="estado" ${!editing || alumno.estado ? 'checked' : ''}>
                <label class="switch" for="f-estado"></label>
                <span class="switch-text"><strong>Alumno activo</strong><small>Habilitado para asistencia</small></span>
              </div>
            </div>
            <div class="field">
              <label for="f-nombres">Nombres</label>
              <input class="input" id="f-nombres" name="nombres" maxlength="100" value="${esc(alumno?.nombres || '')}" placeholder="Ana María" required>
            </div>
            <div class="field">
              <label for="f-apellidos">Apellidos</label>
              <input class="input" id="f-apellidos" name="apellidos" maxlength="100" value="${esc(alumno?.apellidos || '')}" placeholder="Pérez Gómez" required>
            </div>
            <div class="field full">
              <label for="f-correo">Correo electrónico</label>
              <input class="input" id="f-correo" name="correo" type="email" maxlength="150" value="${esc(alumno?.correo || '')}" placeholder="alumno@example.invalid" required>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-ghost" data-close-modal>Cancelar</button>
              <button type="submit" class="btn btn-primary">
                <svg><use href="#i-${editing ? 'check' : 'plus'}"/></svg>${editing ? 'Guardar cambios' : 'Crear alumno'}
              </button>
            </div>
          </div>
        </form>`,
      onSubmit: (event) => submitForm(event, {
        kind: 'alumno',
        id: alumno?.id,
        endpoint: API.alumnos,
        payload: (fd) => ({
          codigo: String(fd.get('codigo') || '').trim(),
          nombres: String(fd.get('nombres') || '').trim(),
          apellidos: String(fd.get('apellidos') || '').trim(),
          correo: String(fd.get('correo') || '').trim(),
          estado: fd.get('estado') !== null
        }),
        validate: (data) => {
          if (!data.codigo) return { field: 'codigo', message: 'El código es obligatorio' };
          if (!data.nombres) return { field: 'nombres', message: 'Los nombres son obligatorios' };
          if (!data.apellidos) return { field: 'apellidos', message: 'Los apellidos son obligatorios' };
          if (!data.correo) return { field: 'correo', message: 'El correo es obligatorio' };
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)) return { field: 'correo', message: 'El correo no tiene un formato válido' };
          return null;
        },
        success: `Alumno ${editing ? 'actualizado' : 'creado'}`
      })
    });
  }

  function sesionForm(sesion) {
    const editing = Boolean(sesion);
    openFormModal({
      title: editing ? 'Editar sesión' : 'Nueva sesión',
      subtitle: editing ? 'Actualiza la programación de la clase' : 'Programa una nueva sesión de clase',
      icon: 'i-calendar',
      html: `
        <form id="entityForm" novalidate>
          <div class="form-grid">
            <div class="field">
              <label for="f-codigoCurso">Código del curso</label>
              <input class="input" id="f-codigoCurso" name="codigoCurso" maxlength="20" value="${esc(sesion?.codigoCurso || '')}" placeholder="CS101" required>
            </div>
            <div class="field">
              <label for="f-nombreCurso">Nombre del curso</label>
              <input class="input" id="f-nombreCurso" name="nombreCurso" maxlength="150" value="${esc(sesion?.nombreCurso || '')}" placeholder="Programación Java" required>
            </div>
            <div class="field full">
              <label for="f-fecha">Fecha</label>
              <input class="input" id="f-fecha" name="fecha" type="date" value="${esc(sesion?.fecha || todayIso())}" required>
            </div>
            <div class="field">
              <label for="f-horaInicio">Hora de inicio</label>
              <input class="input" id="f-horaInicio" name="horaInicio" type="time" value="${esc(sesion?.horaInicio ? fmtTime(sesion.horaInicio) : '08:00')}" required>
            </div>
            <div class="field">
              <label for="f-horaFin">Hora de fin</label>
              <input class="input" id="f-horaFin" name="horaFin" type="time" value="${esc(sesion?.horaFin ? fmtTime(sesion.horaFin) : '10:00')}" required>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-ghost" data-close-modal>Cancelar</button>
              <button type="submit" class="btn btn-primary">
                <svg><use href="#i-${editing ? 'check' : 'plus'}"/></svg>${editing ? 'Guardar cambios' : 'Crear sesión'}
              </button>
            </div>
          </div>
        </form>`,
      onSubmit: (event) => submitForm(event, {
        kind: 'sesion',
        id: sesion?.id,
        endpoint: API.sesiones,
        payload: (fd) => ({
          codigoCurso: String(fd.get('codigoCurso') || '').trim(),
          nombreCurso: String(fd.get('nombreCurso') || '').trim(),
          fecha: String(fd.get('fecha') || ''),
          horaInicio: String(fd.get('horaInicio') || ''),
          horaFin: String(fd.get('horaFin') || '')
        }),
        validate: (data) => {
          if (!data.codigoCurso) return { field: 'codigoCurso', message: 'El código del curso es obligatorio' };
          if (!data.nombreCurso) return { field: 'nombreCurso', message: 'El nombre del curso es obligatorio' };
          if (!data.fecha) return { field: 'fecha', message: 'La fecha es obligatoria' };
          if (!data.horaInicio) return { field: 'horaInicio', message: 'La hora de inicio es obligatoria' };
          if (!data.horaFin) return { field: 'horaFin', message: 'La hora de fin es obligatoria' };
          if (data.horaFin <= data.horaInicio) return { field: 'horaFin', message: 'La hora de fin debe ser posterior a la de inicio' };
          return null;
        },
        success: `Sesión ${editing ? 'actualizada' : 'creada'}`
      })
    });
  }

  function asistenciaForm(registro) {
    const editing = Boolean(registro);
    const sinCatalogos = !state.alumnos.length || !state.sesiones.length;

    const alumnoOptions = [...state.alumnos]
      .sort((a, b) => fullName(a).localeCompare(fullName(b), 'es'))
      .map((a) => `<option value="${a.id}"${registro?.idAlumno === a.id ? ' selected' : ''}>${esc(fullName(a))} · ${esc(a.codigo)}</option>`)
      .join('');

    const sesionOptions = [...state.sesiones]
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
      .map((s) => `<option value="${s.id}"${registro?.idSesion === s.id ? ' selected' : ''}>${esc(s.nombreCurso)} · ${esc(fmtDate(s.fecha))} ${esc(fmtTime(s.horaInicio))}</option>`)
      .join('');

    const estadoActual = registro?.estado || 'PRESENTE';

    openFormModal({
      title: editing ? 'Editar asistencia' : 'Nueva asistencia',
      subtitle: editing ? 'Actualiza el registro de asistencia' : 'Registra la asistencia de un alumno en una sesión',
      icon: 'i-clipboard',
      html: `
        <form id="entityForm" novalidate>
          <div class="form-grid">
            <div class="field full">
              <label for="f-idAlumno">Alumno</label>
              <select class="select" id="f-idAlumno" name="idAlumno" required ${sinCatalogos ? 'disabled' : ''}>
                <option value="">Selecciona un alumno</option>${alumnoOptions}
              </select>
            </div>
            <div class="field full">
              <label for="f-idSesion">Sesión de clase</label>
              <select class="select" id="f-idSesion" name="idSesion" required ${sinCatalogos ? 'disabled' : ''}>
                <option value="">Selecciona una sesión</option>${sesionOptions}
              </select>
            </div>
            <div class="field full">
              <label for="f-fechaAsistencia">Fecha</label>
              <input class="input" id="f-fechaAsistencia" name="fecha" type="date" value="${esc(registro?.fecha || todayIso())}" required>
            </div>
            <div class="field full">
              <label>Estado de asistencia</label>
              <div class="segmented">
                ${Object.entries(ESTADOS).map(([key, meta]) => `
                  <input type="radio" id="est-${key}" name="estado" value="${key}" ${estadoActual === key ? 'checked' : ''}>
                  <label for="est-${key}" data-estado="${key}"><span class="dot" style="background:${meta.color}"></span>${meta.label}</label>
                `).join('')}
              </div>
            </div>
            ${sinCatalogos ? `
              <div class="field full">
                <div class="form-note">
                  <svg><use href="#i-info"/></svg>
                  <span>Necesitas al menos un alumno y una sesión registrados para crear asistencias.</span>
                </div>
              </div>` : ''}
            <div class="form-actions">
              <button type="button" class="btn btn-ghost" data-close-modal>Cancelar</button>
              <button type="submit" class="btn btn-primary" ${sinCatalogos ? 'disabled' : ''}>
                <svg><use href="#i-${editing ? 'check' : 'plus'}"/></svg>${editing ? 'Guardar cambios' : 'Registrar asistencia'}
              </button>
            </div>
          </div>
        </form>`,
      onSubmit: (event) => submitForm(event, {
        kind: 'asistencia',
        id: registro?.id,
        endpoint: API.asistencias,
        payload: (fd) => ({
          idAlumno: Number(fd.get('idAlumno')) || null,
          idSesion: Number(fd.get('idSesion')) || null,
          fecha: String(fd.get('fecha') || ''),
          estado: String(fd.get('estado') || '')
        }),
        validate: (data) => {
          if (!data.idAlumno) return { field: 'idAlumno', message: 'Selecciona un alumno' };
          if (!data.idSesion) return { field: 'idSesion', message: 'Selecciona una sesión' };
          if (!data.fecha) return { field: 'fecha', message: 'La fecha es obligatoria' };
          if (!data.estado) return { field: 'estado', message: 'Selecciona un estado' };
          const sesion = byId(state.sesiones, data.idSesion);
          if (sesion && data.fecha !== sesion.fecha) {
            return { field: 'fecha', message: 'La fecha debe coincidir con la fecha de la sesión' };
          }
          return null;
        },
        success: `Asistencia ${editing ? 'actualizada' : 'registrada'}`
      })
    });

    // Al cambiar de sesión, la fecha se sincroniza con la fecha de la clase.
    const sesionSelect = $('#f-idSesion');
    const fechaInput = $('#f-fechaAsistencia');
    if (sesionSelect && fechaInput) {
      sesionSelect.addEventListener('change', () => {
        const sesion = byId(state.sesiones, Number(sesionSelect.value));
        if (sesion?.fecha) fechaInput.value = sesion.fecha;
      });
    }
  }

  async function submitForm(event, config) {
    event.preventDefault();
    const form = event.currentTarget;
    clearErrors(form);

    const data = config.payload(new FormData(form));
    const problem = config.validate(data);
    if (problem) {
      markError(form, problem.field, problem.message);
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    setBusy(button, true, 'Guardando…');

    try {
      if (config.id != null) {
        await http(`${config.endpoint}/${config.id}`, { method: 'PUT', body: JSON.stringify(data) });
      } else {
        await http(config.endpoint, { method: 'POST', body: JSON.stringify(data) });
      }
      closeModal();
      toast('success', config.success, 'Los datos se guardaron correctamente.');
      await reload(config.kind);
    } catch (error) {
      if (error.details) {
        Object.entries(error.details).forEach(([field, message]) => markError(form, field, message));
      }
      toast('error', 'No se pudo guardar', error.message);
    } finally {
      setBusy(button, false);
    }
  }

  function markError(form, fieldName, message) {
    const field = form.querySelector(`[name="${fieldName}"]`)?.closest('.field');
    if (!field) return;
    field.classList.add('invalid');
    let hint = field.querySelector('.field-error');
    if (!hint) {
      hint = document.createElement('span');
      hint.className = 'field-error';
      field.appendChild(hint);
    }
    hint.textContent = message;
  }

  function clearErrors(form) {
    $$('.field.invalid', form).forEach((field) => field.classList.remove('invalid'));
    $$('.field-error', form).forEach((hint) => hint.remove());
  }

  /* ---------------------------------------------------------
     Toasts
     --------------------------------------------------------- */
  function toast(type, title, message = '') {
    const icons = { success: 'i-check-circle', error: 'i-alert', info: 'i-info' };
    const element = document.createElement('div');
    element.className = `toast toast--${type}`;
    element.innerHTML = `
      <svg><use href="#${icons[type] || 'i-info'}"/></svg>
      <div class="toast-body">
        <strong>${esc(title)}</strong>
        ${message ? `<span>${esc(message)}</span>` : ''}
      </div>`;
    $('#toasts').appendChild(element);
    setTimeout(() => {
      element.classList.add('out');
      setTimeout(() => element.remove(), 280);
    }, 4200);
  }

  /* ---------------------------------------------------------
     Exportación CSV
     --------------------------------------------------------- */
  function downloadCsv(filename, headers, rows) {
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('info', 'Exportación lista', `${filename} se descargó correctamente.`);
  }

  function exportAlumnos() {
    const lista = filteredAlumnos();
    if (!lista.length) return toast('info', 'Nada que exportar', 'No hay alumnos con los filtros actuales.');
    downloadCsv(`alumnos-${todayIso()}.csv`,
      ['Código', 'Nombres', 'Apellidos', 'Correo', 'Estado'],
      lista.map((a) => [a.codigo, a.nombres, a.apellidos, a.correo, a.estado ? 'Activo' : 'Inactivo']));
  }

  function exportSesiones() {
    const lista = filteredSesiones();
    if (!lista.length) return toast('info', 'Nada que exportar', 'No hay sesiones con los filtros actuales.');
    downloadCsv(`sesiones-${todayIso()}.csv`,
      ['Código del curso', 'Curso', 'Fecha', 'Hora inicio', 'Hora fin'],
      lista.map((s) => [s.codigoCurso, s.nombreCurso, s.fecha, fmtTime(s.horaInicio), fmtTime(s.horaFin)]));
  }

  function exportAsistencias() {
    const lista = filteredAsistencias();
    if (!lista.length) return toast('info', 'Nada que exportar', 'No hay asistencias con los filtros actuales.');
    downloadCsv(`asistencias-${todayIso()}.csv`,
      ['Alumno', 'Código', 'Curso', 'Fecha de sesión', 'Fecha de registro', 'Estado'],
      lista.map((r) => {
        const alumno = byId(state.alumnos, r.idAlumno);
        const sesion = byId(state.sesiones, r.idSesion);
        return [
          alumno ? fullName(alumno) : `Alumno #${r.idAlumno}`,
          alumno?.codigo || '',
          sesion?.nombreCurso || `Sesión #${r.idSesion}`,
          sesion?.fecha || '',
          r.fecha,
          ESTADOS[r.estado]?.label || r.estado
        ];
      }));
  }

  /* ---------------------------------------------------------
     Tema
     --------------------------------------------------------- */
  function initTheme() {
    const stored = localStorage.getItem('asistenciapro-theme');
    const preferred = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = stored || preferred;
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('asistenciapro-theme', next);
  }

  /* ---------------------------------------------------------
     Eventos
     --------------------------------------------------------- */
  function bindEvents() {
    window.addEventListener('hashchange', () => setView(viewFromHash()));

    $$('.nav-item').forEach((item) => {
      item.addEventListener('click', () => closeSidebar());
    });

    $('#menuBtn').addEventListener('click', openSidebar);
    $('#scrim').addEventListener('click', closeSidebar);

    $('#themeBtn').addEventListener('click', toggleTheme);

    $('#refreshBtn').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.style.animation = 'spin .8s linear infinite';
      await loadAll({ silent: true });
      button.style.animation = '';
      toast('info', 'Datos actualizados', 'La información se sincronizó con los servicios.');
    });

    /* Filtros */
    let alumnoTimer;
    let sesionTimer;
    $('#alumnoSearch').addEventListener('input', (event) => {
      clearTimeout(alumnoTimer);
      alumnoTimer = setTimeout(() => { filters.alumnoSearch = event.target.value; renderAlumnos(); }, 120);
    });
    $('#alumnoEstado').addEventListener('change', (event) => {
      filters.alumnoEstado = event.target.value;
      renderAlumnos();
    });

    $('#sesionSearch').addEventListener('input', (event) => {
      clearTimeout(sesionTimer);
      sesionTimer = setTimeout(() => { filters.sesionSearch = event.target.value; renderSesiones(); }, 120);
    });
    $('#sesionFecha').addEventListener('change', (event) => {
      filters.sesionFecha = event.target.value;
      renderSesiones();
    });

    $('#filtroAlumno').addEventListener('change', (event) => {
      filters.idAlumno = event.target.value;
      renderAsistencias();
    });
    $('#filtroSesion').addEventListener('change', (event) => {
      filters.idSesion = event.target.value;
      renderAsistencias();
    });
    $('#filtroEstado').addEventListener('change', (event) => {
      filters.estado = event.target.value;
      renderAsistencias();
    });

    /* Acciones delegadas */
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-action]');
      if (!trigger) return;
      const action = trigger.dataset.action;
      const id = Number(trigger.dataset.id);

      switch (action) {
        case 'new-alumno': alumnoForm(null); break;
        case 'edit-alumno': {
          const alumno = byId(state.alumnos, id);
          if (alumno) alumnoForm(alumno);
          break;
        }
        case 'delete-alumno': {
          const alumno = byId(state.alumnos, id);
          if (alumno) askDelete('alumno', id, fullName(alumno));
          break;
        }

        case 'new-sesion': sesionForm(null); break;
        case 'edit-sesion': {
          const sesion = byId(state.sesiones, id);
          if (sesion) sesionForm(sesion);
          break;
        }
        case 'delete-sesion': {
          const sesion = byId(state.sesiones, id);
          if (sesion) askDelete('sesion', id, `${sesion.nombreCurso} (${sesion.codigoCurso})`);
          break;
        }

        case 'new-asistencia': asistenciaForm(null); break;
        case 'edit-asistencia': {
          const registro = byId(state.asistencias, id);
          if (registro) asistenciaForm(registro);
          break;
        }
        case 'delete-asistencia': {
          const registro = byId(state.asistencias, id);
          if (registro) {
            const alumno = byId(state.alumnos, registro.idAlumno);
            const sesion = byId(state.sesiones, registro.idSesion);
            askDelete('asistencia', id,
              `${alumno ? fullName(alumno) : `Alumno #${registro.idAlumno}`} · ${sesion?.nombreCurso || `Sesión #${registro.idSesion}`}`);
          }
          break;
        }

        case 'export-alumnos': exportAlumnos(); break;
        case 'export-sesiones': exportSesiones(); break;
        case 'export-asistencias': exportAsistencias(); break;
        case 'export-historial': exportHistorial(); break;

        case 'historial-alumno': openHistorial(id); break;

        case 'go-sesiones': navigate('sesiones'); break;
        case 'go-asistencias': navigate('asistencias'); break;

        case 'retry': loadAll(); break;
      }
    });

    /* Cierre de modales */
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-modal]')) closeModal();
      if (event.target.closest('[data-close-confirm]')) closeConfirm();
      if (event.target.closest('[data-close-history]')) closeHistorial();
    });

    $('#confirmAccept').addEventListener('click', confirmDelete);

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!$('#historyLayer').hidden) closeHistorial();
      else if (!$('#confirmLayer').hidden) closeConfirm();
      else if (!$('#modalLayer').hidden) closeModal();
      else closeSidebar();
    });
  }

  /* ---------------------------------------------------------
     Inicialización
     --------------------------------------------------------- */
  function initDateChip() {
    const now = new Date();
    const text = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    $('#todayChip').textContent = text.charAt(0).toUpperCase() + text.slice(1);
  }

  function init() {
    initTheme();
    initDateChip();
    bindEvents();
    setView(viewFromHash());
    showSkeletons();
    loadAll();

    /* Sincronización silenciosa cada minuto */
    setInterval(() => {
      if ($('#modalLayer').hidden && $('#confirmLayer').hidden) loadAll({ silent: true });
    }, 60000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
