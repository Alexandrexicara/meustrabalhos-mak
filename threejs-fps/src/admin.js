const API = 'https://tactical-strike-api.onrender.com';
const $ = id => document.getElementById(id);
let adminToken = sessionStorage.getItem('tacticalStrikeAdminToken') || '';

function message(id, text, error = false) {
  const el = $(id);
  el.textContent = text;
  el.style.color = error ? '#ffaaa2' : '#c5f36b';
}
function showDashboard() {
  $('admin-login').classList.add('hidden');
  $('admin-dashboard').classList.remove('hidden');
}
function showLogin() {
  $('admin-dashboard').classList.add('hidden');
  $('admin-login').classList.remove('hidden');
}
async function api(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(adminToken ? { Authorization: 'Bearer ' + adminToken } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      adminToken = '';
      sessionStorage.removeItem('tacticalStrikeAdminToken');
      showLogin();
    }
    throw new Error(data.error || 'Não foi possível concluir a operação.');
  }
  return data;
}
function date(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('pt-BR');
}
function statusBadge(text, type) {
  const span = document.createElement('span');
  span.className = 'admin-status ' + type;
  span.textContent = text;
  return span;
}
function actionButton(label, action, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'admin-btn ' + className;
  button.textContent = label;
  button.dataset.action = action;
  return button;
}
function renderPlayers(players) {
  const body = $('admin-players');
  body.replaceChildren();
  const pending = players.filter(p => (p.payment_status || 'awaiting_review') === 'awaiting_review').length;
  const active = players.filter(p => p.license_active).length;
  $('stat-total').textContent = players.length;
  $('stat-pending').textContent = pending;
  $('stat-active').textContent = active;

  if (!players.length) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.className = 'admin-empty';
    cell.textContent = 'Ainda não há jogadores cadastrados.';
    return;
  }

  for (const player of players) {
    const row = body.insertRow();
    const identity = row.insertCell();
    const email = document.createElement('strong');
    email.textContent = player.email;
    identity.append(email);
    const created = document.createElement('small');
    created.style.cssText = 'display:block;color:#91a0a7;margin-top:5px';
    created.textContent = 'ID ' + player.id;
    identity.append(created);

    row.insertCell().textContent = date(player.created_at);

    const paymentCell = row.insertCell();
    const paymentStatus = player.payment_status || 'not_requested';
    const paymentLabels = {
      awaiting_review: ['Aguardando análise', 'wait'],
      approved: ['Aprovado', 'ok'],
      rejected: ['Recusado', 'no'],
      not_requested: ['Sem solicitação', '']
    };
    const payment = paymentLabels[paymentStatus] || [paymentStatus, ''];
    paymentCell.append(statusBadge(payment[0], payment[1]));
    if (player.payment_created_at) {
      const when = document.createElement('small');
      when.style.cssText = 'display:block;color:#91a0a7;margin-top:5px';
      when.textContent = date(player.payment_created_at);
      paymentCell.append(when);
    }

    const licenseCell = row.insertCell();
    licenseCell.append(statusBadge(player.license_active ? 'ATIVA' : 'INATIVA', player.license_active ? 'ok' : 'no'));

    const actions = row.insertCell();
    const group = document.createElement('div');
    group.className = 'admin-actions';
    if (paymentStatus === 'awaiting_review') {
      group.append(actionButton('APROVAR', 'approve', 'admin-primary'));
      group.append(actionButton('RECUSAR', 'reject', 'admin-danger'));
    }
    if (player.license_active) {
      group.append(actionButton('DESATIVAR', 'deactivate', 'admin-danger'));
    } else {
      group.append(actionButton('ATIVAR', 'activate', 'admin-secondary'));
    }
    actions.append(group);
    row.dataset.playerId = player.id;
  }
}
async function loadPlayers() {
  $('admin-refresh').disabled = true;
  message('admin-dashboard-message', 'Atualizando cadastros...');
  try {
    const data = await api('/api/admin/players');
    renderPlayers(data.players || []);
    message('admin-dashboard-message', 'Lista atualizada.');
  } catch (error) {
    message('admin-dashboard-message', error.message, true);
  } finally {
    $('admin-refresh').disabled = false;
  }
}
async function login(email, password) {
  const response = await fetch(API + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Falha ao entrar.');
  adminToken = data.token;
  sessionStorage.setItem('tacticalStrikeAdminToken', adminToken);
  showDashboard();
  await loadPlayers();
}

$('admin-login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  if (button) button.disabled = true;
  message('admin-login-message', 'Verificando acesso...');
  try {
    await login($('admin-email').value, $('admin-password').value);
    $('admin-password').value = '';
  } catch (error) {
    message('admin-login-message', error.message, true);
  } finally {
    if (button) button.disabled = false;
  }
});
$('admin-refresh').addEventListener('click', loadPlayers);
async function launchAdminGame(destination = '/') {
  // O painel já validou a sessão administrativa. Reutilize essa mesma sessão no jogo.
  if (!adminToken || sessionStorage.getItem('tacticalStrikeAdminToken') !== adminToken) {
    throw new Error('Sessão administrativa não encontrada. Entre novamente no painel.');
  }
  sessionStorage.setItem('tacticalStrikeAdminGameToken', adminToken);
  const target = new URL(destination, window.location.origin);
  target.searchParams.set('admin', '1');
  window.location.assign(target.toString());
}

$('admin-play')?.addEventListener('click', async () => {
  const button = $('admin-play');
  button.disabled = true;
  button.textContent = 'VALIDANDO ACESSO...';
  try {
    await launchAdminGame('/');
  } catch (error) {
    message('admin-dashboard-message', error.message, true);
    button.disabled = false;
    button.textContent = 'INICIAR JOGO';
  }
});

document.querySelectorAll('.admin-phase-card').forEach(link => {
  link.addEventListener('click', async event => {
    event.preventDefault();
    if (link.dataset.launching === 'true') return;
    link.dataset.launching = 'true';
    message('admin-dashboard-message', 'LIBERANDO ACESSO À FASE...');
    try {
      await launchAdminGame(link.href);
    } catch (error) {
      link.dataset.launching = 'false';
      message('admin-dashboard-message', error.message, true);
    }
  });
});
$('admin-logout').addEventListener('click', () => {
  adminToken = '';
  sessionStorage.removeItem('tacticalStrikeAdminToken');
  showLogin();
  message('admin-login-message', 'Você saiu do painel.');
});
$('admin-players').addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const row = button.closest('tr');
  const playerId = row?.dataset.playerId;
  if (!playerId) return;
  const labels = { approve: 'aprovar o pagamento e ativar a licença', reject: 'recusar o pagamento e desativar a licença', activate: 'ativar a licença', deactivate: 'desativar a licença' };
  if (!window.confirm('Confirma ' + labels[button.dataset.action] + ' deste jogador?')) return;
  button.disabled = true;
  message('admin-dashboard-message', 'Salvando alteração...');
  try {
    await api('/api/admin/players/' + encodeURIComponent(playerId), {
      method: 'PATCH',
      body: JSON.stringify({ action: button.dataset.action })
    });
    await loadPlayers();
    message('admin-dashboard-message', 'Alteração salva com sucesso.');
  } catch (error) {
    message('admin-dashboard-message', error.message, true);
    button.disabled = false;
  }
});

if (adminToken) {
  showDashboard();
  loadPlayers();
} else {
  showLogin();
}
