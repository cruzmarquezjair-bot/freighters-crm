/**
 * Freighters CRM — Frontend App
 */

const state = {
  clients: { TWT: [], DAIRAL: [], FREIGHTERS: [] },
  sortState: { TWT: null, DAIRAL: null, FREIGHTERS: null },
  deleteTargetId: null,
  searchTerm: '',
  statusFilter: ''
};

const LINES = ['TWT', 'DAIRAL', 'FREIGHTERS'];
const STATUSES = ['Prospect', 'Active', 'Negotiation', 'Closed', 'Lost'];
const EQUIPMENT = ['', 'Caja seca', 'Plataforma'];

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ─── API ──────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error' }));
    throw new Error(err.error || 'Error');
  }
  return res.json();
}

// ─── Toast ────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

// ─── Screens ──────────────────────────────────────────
function showScreen(name) {
  document.getElementById('login-screen').classList.toggle('hidden', name !== 'login');
  document.getElementById('dashboard').classList.toggle('hidden', name !== 'dashboard');
}

// ─── Auth ─────────────────────────────────────────────
async function checkSession() {
  try {
    const data = await api('GET', '/api/me');
    if (data.loggedIn) { showScreen('dashboard'); await loadAllClients(); }
    else showScreen('login');
  } catch { showScreen('login'); }
}

document.getElementById('login-btn').addEventListener('click', doLogin);
document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  try {
    await api('POST', '/api/login', { username, password });
    showScreen('dashboard');
    await loadAllClients();
  } catch { errEl.classList.remove('hidden'); }
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('POST', '/api/logout');
  state.clients = { TWT: [], DAIRAL: [], FREIGHTERS: [] };
  showScreen('login');
});

// ─── Load Data ────────────────────────────────────────
async function loadAllClients() {
  try {
    const all = await api('GET', '/api/clients');
    LINES.forEach(line => { state.clients[line] = all.filter(c => c.business_line === line); });
    LINES.forEach(renderTable);
  } catch (e) { showToast('Error: ' + e.message); }
}

// ─── Render Table ─────────────────────────────────────
function renderTable(line) {
  const tbody = document.getElementById(`tbody-${line}`);
  let rows = [...state.clients[line]];

  const sort = state.sortState[line];
  if (sort) {
    rows.sort((a, b) => {
      const av = (a[sort.col] || '').toLowerCase();
      const bv = (b[sort.col] || '').toLowerCase();
      return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }

  tbody.innerHTML = '';
  if (rows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Sin clientes — haz clic en <strong>Agregar</strong> para comenzar</td></tr>`;
  } else {
    rows.forEach(client => tbody.appendChild(createRow(line, client)));
  }

  document.getElementById(`count-${line}`).textContent =
    `${rows.length} cliente${rows.length !== 1 ? 's' : ''}`;

  applySearchFilter();
}

// ─── Create Row ───────────────────────────────────────
function createRow(line, client) {
  const tr = document.createElement('tr');
  tr.dataset.id = client.id;
  tr.dataset.line = line;
  tr.dataset.status = client.status;
  tr.dataset.client = (client.client || '').toLowerCase();

  const savingId = `saving-${client.id}`;

  tr.innerHTML = `
    <td><input class="cell-input" data-field="client"  value="${esc(client.client)}"  placeholder="Empresa" /></td>
    <td><input class="cell-input" data-field="contact" value="${esc(client.contact)}" placeholder="Nombre" /></td>
    <td><input class="cell-input" data-field="phone"   value="${esc(client.phone)}"   placeholder="+52 81…" /></td>
    <td><input class="cell-input" data-field="email"   value="${esc(client.email)}"   placeholder="correo@dominio.com" /></td>
    <td><input class="cell-input" data-field="route"   value="${esc(client.route)}"   placeholder="MTY → CDMX" /></td>
    <td>
      <select class="cell-equipment${client.equipment ? ' has-value' : ''}" data-field="equipment">
        ${EQUIPMENT.map(e => `<option value="${e}"${e === client.equipment ? ' selected' : ''}>${e || '— Eq. —'}</option>`).join('')}
      </select>
    </td>
    <td class="status-${esc(client.status)}">
      <select class="cell-status" data-field="status">
        ${STATUSES.map(s => `<option value="${s}"${s === client.status ? ' selected' : ''}>${s}</option>`).join('')}
      </select>
      <span class="saving-dot" id="${savingId}"></span>
    </td>
    <td class="col-actions">
      <button class="btn-delete-row" title="Eliminar">✕</button>
    </td>
  `;

  const debouncedSave = debounce(() => saveRow(tr, line, client.id, savingId), 800);

  tr.querySelectorAll('.cell-input').forEach(input => {
    input.addEventListener('input', debouncedSave);
  });

  const eqSelect = tr.querySelector('.cell-equipment');
  eqSelect.addEventListener('change', () => {
    eqSelect.classList.toggle('has-value', !!eqSelect.value);
    saveRow(tr, line, client.id, savingId);
  });

  const statusSelect = tr.querySelector('.cell-status');
  statusSelect.addEventListener('change', () => {
    tr.dataset.status = statusSelect.value;
    tr.querySelector('td:nth-child(7)').className = `status-${statusSelect.value}`;
    saveRow(tr, line, client.id, savingId);
    applySearchFilter();
  });

  tr.querySelector('.btn-delete-row').addEventListener('click', () => openDeleteModal(client.id));

  return tr;
}

// ─── Save Row ─────────────────────────────────────────
async function saveRow(tr, line, id, savingId) {
  const dot = document.getElementById(savingId);
  if (dot) dot.classList.add('active');

  const data = {};
  tr.querySelectorAll('[data-field]').forEach(el => { data[el.dataset.field] = el.value; });

  try {
    const updated = await api('PUT', `/api/clients/${id}`, data);
    const arr = state.clients[line];
    const idx = arr.findIndex(c => c.id === id);
    if (idx >= 0) arr[idx] = updated;
    tr.dataset.client = (updated.client || '').toLowerCase();
    tr.dataset.status = updated.status;
    applySearchFilter();
  } catch (e) {
    showToast('Error al guardar: ' + e.message);
  } finally {
    if (dot) setTimeout(() => dot.classList.remove('active'), 600);
  }
}

// ─── Add Row ──────────────────────────────────────────
LINES.forEach(line => {
  document.querySelector(`.btn-add[data-line="${line}"]`).addEventListener('click', async () => {
    try {
      const newClient = await api('POST', '/api/clients', {
        business_line: line, client: '', contact: '', phone: '',
        email: '', route: '', equipment: '', status: 'Prospect'
      });
      state.clients[line].push(newClient);

      const emptyRow = document.querySelector(`#tbody-${line} .empty-row`);
      if (emptyRow) emptyRow.remove();

      const tbody = document.getElementById(`tbody-${line}`);
      const row = createRow(line, newClient);
      tbody.appendChild(row);
      row.querySelector('.cell-input').focus();

      document.getElementById(`count-${line}`).textContent =
        `${state.clients[line].length} cliente${state.clients[line].length !== 1 ? 's' : ''}`;
    } catch (e) { showToast('No se pudo agregar: ' + e.message); }
  });
});

// ─── Delete ───────────────────────────────────────────
function openDeleteModal(id) {
  state.deleteTargetId = id;
  document.getElementById('delete-modal').classList.remove('hidden');
}
function closeDeleteModal() {
  state.deleteTargetId = null;
  document.getElementById('delete-modal').classList.add('hidden');
}

document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
document.getElementById('delete-cancel-btn').addEventListener('click', closeDeleteModal);
document.getElementById('delete-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeDeleteModal(); });

document.getElementById('delete-confirm-btn').addEventListener('click', async () => {
  const id = state.deleteTargetId;
  if (!id) return;
  closeDeleteModal();
  try {
    await api('DELETE', `/api/clients/${id}`);
    LINES.forEach(line => { state.clients[line] = state.clients[line].filter(c => c.id !== id); });
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) {
      const line = row.dataset.line;
      row.style.opacity = '0';
      row.style.transition = 'opacity .2s';
      setTimeout(() => renderTable(line), 200);
    }
    showToast('Fila eliminada');
  } catch (e) { showToast('Error: ' + e.message); }
});

// ─── Search & Filter ──────────────────────────────────
document.getElementById('global-search').addEventListener('input', debounce(e => {
  state.searchTerm = e.target.value.toLowerCase().trim();
  applySearchFilter();
}, 200));

document.getElementById('status-filter').addEventListener('change', e => {
  state.statusFilter = e.target.value;
  applySearchFilter();
});

function applySearchFilter() {
  document.querySelectorAll('.crm-table tbody tr:not(.empty-row)').forEach(tr => {
    const clientMatch = !state.searchTerm || tr.dataset.client.includes(state.searchTerm);
    const statusMatch = !state.statusFilter || tr.dataset.status === state.statusFilter;
    tr.classList.toggle('filtered-out', !(clientMatch && statusMatch));
  });
}

// ─── Sort ─────────────────────────────────────────────
document.querySelectorAll('.crm-table thead th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    const line = th.dataset.line;
    if (!col || !line) return;
    const prev = state.sortState[line];
    const newDir = prev && prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc';
    state.sortState[line] = { col, dir: newDir };
    document.querySelectorAll(`#table-${line} thead th`).forEach(h => {
      h.classList.remove('sorted');
      const icon = h.querySelector('.sort-icon');
      if (icon) icon.textContent = '↕';
    });
    th.classList.add('sorted');
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = newDir === 'asc' ? '↑' : '↓';
    renderTable(line);
  });
});

// ─── Settings Modal ───────────────────────────────────
document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('settings-modal').classList.remove('hidden');
  ['pwd-error','pwd-success'].forEach(id => document.getElementById(id).classList.add('hidden'));
  ['pwd-current','pwd-new','pwd-confirm'].forEach(id => document.getElementById(id).value = '');
});
document.getElementById('settings-close').addEventListener('click', () => {
  document.getElementById('settings-modal').classList.add('hidden');
});
document.getElementById('settings-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
});

document.getElementById('pwd-save-btn').addEventListener('click', async () => {
  const current = document.getElementById('pwd-current').value;
  const newPwd   = document.getElementById('pwd-new').value;
  const confirm  = document.getElementById('pwd-confirm').value;
  const errEl = document.getElementById('pwd-error');
  const okEl  = document.getElementById('pwd-success');
  errEl.classList.add('hidden'); okEl.classList.add('hidden');

  if (!current || !newPwd || !confirm) { errEl.textContent = 'Completa todos los campos.'; errEl.classList.remove('hidden'); return; }
  if (newPwd !== confirm) { errEl.textContent = 'Las contraseñas no coinciden.'; errEl.classList.remove('hidden'); return; }
  if (newPwd.length < 6)  { errEl.textContent = 'Mínimo 6 caracteres.'; errEl.classList.remove('hidden'); return; }

  try {
    await api('PUT', '/api/password', { currentPassword: current, newPassword: newPwd });
    okEl.classList.remove('hidden');
    ['pwd-current','pwd-new','pwd-confirm'].forEach(id => document.getElementById(id).value = '');
  } catch (e) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
});

// ─── Helpers ──────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ─── Init ─────────────────────────────────────────────
checkSession();
