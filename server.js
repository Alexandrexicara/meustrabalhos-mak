import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const app = express();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const JWT = process.env.JWT_SECRET;
const ADMIN = process.env.ADMIN_KEY;
const PORT = process.env.PORT || 10000;

if (!process.env.DATABASE_URL || !JWT || !ADMIN) throw Error('Missing DATABASE_URL/JWT_SECRET/ADMIN_KEY');

app.use(cors({ origin: ['https://tactical-fpsmake.netlify.app'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'] }));
app.use(express.json({ limit: '32kb' }));

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const signPlayer = player => jwt.sign({ id: player.id, email: player.email, role: 'player' }, JWT, { expiresIn: '30d' });
const signAdmin = () => jwt.sign({ role: 'admin' }, JWT, { expiresIn: '12h' });

function auth(req, res, next) {
  try {
    req.user = jwt.verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''), JWT);
    if (req.user.role !== 'player') return res.status(403).json({ error: 'Acesso de jogador não autorizado.' });
    next();
  } catch { res.status(401).json({ error: 'Faça login novamente.' }); }
}
function adminAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const user = jwt.verify(token, JWT);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Acesso administrativo necessário.' });
    req.admin = user;
    next();
  } catch { res.status(401).json({ error: 'Sessão administrativa expirada. Entre novamente.' }); }
}

async function init() {
  await pool.query("CREATE TABLE IF NOT EXISTS players(id BIGSERIAL PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,license_active BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ DEFAULT NOW(),unlocked_at TIMESTAMPTZ)");
  await pool.query("CREATE TABLE IF NOT EXISTS payment_requests(id BIGSERIAL PRIMARY KEY,player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,amount_cents INT NOT NULL DEFAULT 1000,status TEXT NOT NULL DEFAULT 'awaiting_review',created_at TIMESTAMPTZ DEFAULT NOW())");
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'tactical-strike-api' }));
app.get('/api/config', (_req, res) => res.json({ priceCents: 1000, pixKey: 'santossilvac992@gmail.com', whatsapp: '5538988283318' }));

app.post('/api/auth/register', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const pass = String(req.body.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || pass.length < 8) return res.status(400).json({ error: 'E-mail válido e senha com mínimo de 8 caracteres.' });
  try {
    const result = await pool.query('INSERT INTO players(email,password_hash) VALUES($1,$2) RETURNING id,email,license_active', [email, await bcrypt.hash(pass, 12)]);
    res.status(201).json({ token: signPlayer(result.rows[0]), player: { email, licenseActive: false } });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'E-mail já cadastrado. Entre na conta.' });
    throw error;
  }
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const result = await pool.query('SELECT * FROM players WHERE email=$1', [email]);
  const player = result.rows[0];
  if (!player || !await bcrypt.compare(String(req.body.password || ''), player.password_hash)) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  res.json({ token: signPlayer(player), player: { email: player.email, licenseActive: player.license_active } });
}));

app.get('/api/me', auth, wrap(async (req, res) => {
  const result = await pool.query('SELECT email,license_active FROM players WHERE id=$1', [req.user.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Conta não encontrada.' });
  res.json({ email: result.rows[0].email, licenseActive: result.rows[0].license_active });
}));

app.post('/api/payment/request', auth, wrap(async (req, res) => {
  await pool.query("INSERT INTO payment_requests(player_id,status) VALUES($1,'awaiting_review')", [req.user.id]);
  res.json({ ok: true, amountCents: 1000 });
}));

// Admin login: the password is the ADMIN_KEY environment variable stored only on Render.
app.post('/api/admin/login', (req, res) => {
  if (String(req.body.password || '') !== ADMIN) return res.status(401).json({ error: 'Senha administrativa incorreta.' });
  res.json({ token: signAdmin(), expiresIn: '12h' });
});

app.get('/api/admin/players', adminAuth, wrap(async (_req, res) => {
  const result = await pool.query(`
    SELECT p.id, p.email, p.created_at, p.license_active,
      pay.status AS payment_status, pay.amount_cents, pay.created_at AS payment_created_at
    FROM players p
    LEFT JOIN LATERAL (
      SELECT status, amount_cents, created_at
      FROM payment_requests
      WHERE player_id = p.id
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    ) pay ON TRUE
    ORDER BY p.created_at DESC, p.id DESC
  `);
  res.json({ players: result.rows });
}));

app.patch('/api/admin/players/:id', adminAuth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const action = String(req.body.action || '');
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Cadastro inválido.' });
  if (!['approve', 'reject', 'activate', 'deactivate'].includes(action)) return res.status(400).json({ error: 'Ação inválida.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const player = await client.query('SELECT id FROM players WHERE id=$1 FOR UPDATE', [id]);
    if (!player.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Jogador não encontrado.' }); }
    if (action === 'approve') {
      await client.query("UPDATE payment_requests SET status='approved' WHERE id=(SELECT id FROM payment_requests WHERE player_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1)", [id]);
      await client.query('UPDATE players SET license_active=TRUE,unlocked_at=NOW() WHERE id=$1', [id]);
    } else if (action === 'reject') {
      await client.query("UPDATE payment_requests SET status='rejected' WHERE id=(SELECT id FROM payment_requests WHERE player_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1)", [id]);
      await client.query('UPDATE players SET license_active=FALSE,unlocked_at=NULL WHERE id=$1', [id]);
    } else if (action === 'activate') {
      await client.query('UPDATE players SET license_active=TRUE,unlocked_at=NOW() WHERE id=$1', [id]);
    } else {
      await client.query('UPDATE players SET license_active=FALSE,unlocked_at=NULL WHERE id=$1', [id]);
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Erro interno.' });
});

init().then(() => app.listen(PORT, '0.0.0.0', () => console.log('Tactical Strike API ready'))).catch(error => {
  console.error(error);
  process.exit(1);
});
