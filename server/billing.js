// Soul Sync billing: credit balances, ledger, orders and subscriptions.
// One SQLite file per install (DATA_DIR/billing.sqlite). Every balance change runs inside a
// transaction, so two requests can never spend the same credit twice.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const DAY = 24 * 60 * 60 * 1000;

// Prices are in paise for the gateway (INR * 100) and rupees for the UI.
export const PRODUCTS = {
  pack49: {
    id: 'pack49',
    name: 'Starter Sachet',
    price: 49,
    amount: 4900,
    credits: 60,
    validityDays: 7,
    kind: 'pack',
    badge: 'One-time · valid 7 days',
    perks: ['60 credits', 'Full chat analyzer (deep history)', 'Valid for 7 days']
  },
  pro199: {
    id: 'pro199',
    name: 'Soul Sync Pro',
    price: 199,
    amount: 19900,
    credits: 500,
    validityDays: 30,
    kind: 'pro',
    badge: 'Monthly · cancel anytime',
    perks: ['500 credits every month', 'Priority speed', 'Custom tone selector', 'Full chat analyzer']
  }
};

// What each action costs, and what the free tier gets.
export const COSTS = { reply: 1, analyze: 1, deep: 5 };
export const FREE = { signupCredits: 10, dailyCredits: 3, deepHistory: 200 };

const BUCKETS = ['daily', 'pack', 'plan', 'bonus'];

export function createBilling({ dataDir, log = console }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'billing.sqlite'));
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 4000');

  db.exec(`
    -- One row per signed-in device owner. Balance columns are kept denormalised so a
    -- deduction is a single UPDATE inside a transaction.
    CREATE TABLE IF NOT EXISTS users (
      user_id               TEXT PRIMARY KEY,
      email                 TEXT,
      bonus_credits         INTEGER NOT NULL DEFAULT 0,
      daily_credits         INTEGER NOT NULL DEFAULT 0,
      daily_reset_at        INTEGER NOT NULL DEFAULT 0,
      pack_credits          INTEGER NOT NULL DEFAULT 0,
      pack_expires_at       INTEGER NOT NULL DEFAULT 0,
      plan_id               TEXT,
      plan_credits          INTEGER NOT NULL DEFAULT 0,
      plan_expires_at       INTEGER NOT NULL DEFAULT 0,
      priority              INTEGER NOT NULL DEFAULT 0,
      tone_selector         INTEGER NOT NULL DEFAULT 0,
      signup_bonus_granted  INTEGER NOT NULL DEFAULT 0,
      created_at            INTEGER NOT NULL,
      updated_at            INTEGER NOT NULL
    );

    -- Append-only history: every grant and every spend, with the bucket it touched.
    CREATE TABLE IF NOT EXISTS credit_ledger (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       TEXT NOT NULL,
      delta         INTEGER NOT NULL,
      bucket        TEXT NOT NULL,
      reason        TEXT NOT NULL,
      reference     TEXT,
      balance_after INTEGER NOT NULL,
      created_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_user ON credit_ledger(user_id, id DESC);

    -- Rupee orders. status: created -> paid | failed. Unique payment_id makes webhooks idempotent.
    CREATE TABLE IF NOT EXISTS orders (
      order_id         TEXT PRIMARY KEY,
      user_id          TEXT NOT NULL,
      product          TEXT NOT NULL,
      amount           INTEGER NOT NULL,
      currency         TEXT NOT NULL DEFAULT 'INR',
      status           TEXT NOT NULL DEFAULT 'created',
      gateway_order_id TEXT,
      payment_id       TEXT,
      created_at       INTEGER NOT NULL,
      paid_at          INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_gateway ON orders(gateway_order_id) WHERE gateway_order_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS subscriptions (
      id                      TEXT PRIMARY KEY,
      user_id                 TEXT NOT NULL,
      product                 TEXT NOT NULL,
      status                  TEXT NOT NULL,
      started_at              INTEGER NOT NULL,
      current_period_end      INTEGER NOT NULL,
      gateway_subscription_id TEXT,
      updated_at              INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id, updated_at DESC);
  `);

  const now = () => Date.now();
  const getStmt = db.prepare('SELECT * FROM users WHERE user_id = ?');
  const getUser = id => getStmt.get(id) || null;
  const totalOf = u => u ? u.daily_credits + u.pack_credits + u.plan_credits + u.bonus_credits : 0;

  const ledger = (userId, delta, bucket, reason, reference, balanceAfter) => {
    db.prepare('INSERT INTO credit_ledger (user_id, delta, bucket, reason, reference, balance_after, created_at) VALUES (?,?,?,?,?,?,?)')
      .run(userId, delta, bucket, reason, reference || null, balanceAfter, now());
  };

  function ensure(userId, email) {
    let u = getUser(userId);
    if (u) {
      if (email && email !== u.email) {
        db.prepare('UPDATE users SET email = ?, updated_at = ? WHERE user_id = ?').run(email, now(), userId);
        u = getUser(userId);
      }
      return u;
    }
    const t = now();
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`INSERT INTO users (user_id, email, bonus_credits, daily_credits, daily_reset_at,
        signup_bonus_granted, created_at, updated_at) VALUES (?,?,?,?,?,1,?,?)`)
        .run(userId, email || null, FREE.signupCredits, FREE.dailyCredits, t + DAY, t, t);
      ledger(userId, FREE.signupCredits, 'bonus', 'signup_bonus', 'welcome', FREE.signupCredits);
      ledger(userId, FREE.dailyCredits, 'daily', 'daily_reset', null, FREE.signupCredits + FREE.dailyCredits);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return getUser(userId);
  }

  // Applies the two time-based rules: 3 free credits every 24h, and expiry of pack/plan credits.
  function refresh(userId) {
    let u = getUser(userId);
    if (!u) return null;
    const t = now();
    let changed = false;
    if (t >= u.daily_reset_at) {
      u.daily_credits = FREE.dailyCredits;
      u.daily_reset_at = t + DAY;
      changed = true;
      db.prepare('UPDATE users SET daily_credits = ?, daily_reset_at = ?, updated_at = ? WHERE user_id = ?')
        .run(u.daily_credits, u.daily_reset_at, t, userId);
      ledger(userId, FREE.dailyCredits, 'daily', 'daily_reset', null, totalOf(u));
    }
    if (u.pack_credits > 0 && u.pack_expires_at && t > u.pack_expires_at) {
      const lost = u.pack_credits;
      u.pack_credits = 0;
      changed = true;
      db.prepare('UPDATE users SET pack_credits = 0, updated_at = ? WHERE user_id = ?').run(t, userId);
      ledger(userId, -lost, 'pack', 'pack_expired', null, totalOf(u));
    }
    if (t > u.plan_expires_at && u.plan_expires_at && (u.plan_credits > 0 || u.plan_id)) {
      const lost = u.plan_credits;
      u.plan_credits = 0;
      u.plan_id = null;
      u.priority = 0;
      u.tone_selector = 0;
      changed = true;
      db.prepare('UPDATE users SET plan_credits = 0, plan_id = NULL, priority = 0, tone_selector = 0, updated_at = ? WHERE user_id = ?').run(t, userId);
      if (lost) ledger(userId, -lost, 'plan', 'plan_expired', null, totalOf(u));
      db.prepare(`UPDATE subscriptions SET status = 'expired', updated_at = ? WHERE user_id = ? AND status = 'active'`).run(t, userId);
    }
    return changed ? getUser(userId) : u;
  }

  function snapshot(userId, email) {
    const u = refresh(userId) || ensure(userId, email);
    const t = now();
    const planActive = !!u.plan_id && u.plan_expires_at > t;
    const packActive = u.pack_credits > 0 && (!u.pack_expires_at || u.pack_expires_at > t);
    return {
      total: totalOf(u),
      balance: { daily: u.daily_credits, pack: u.pack_credits, plan: u.plan_credits, bonus: u.bonus_credits },
      daily: {
        credits: u.daily_credits,
        resetsAt: new Date(u.daily_reset_at).toISOString(),
        secondsLeft: Math.max(0, Math.ceil((u.daily_reset_at - t) / 1000))
      },
      plan: {
        tier: planActive ? 'pro' : packActive ? 'starter' : 'free',
        active: planActive,
        id: planActive ? u.plan_id : null,
        expiresAt: u.plan_expires_at ? new Date(u.plan_expires_at).toISOString() : null,
        priority: !!u.priority && planActive,
        toneSelector: !!u.tone_selector && planActive
      },
      analyzer: planActive || packActive,
      costs: COSTS,
      free: FREE,
      pricing: Object.values(PRODUCTS).map(p => ({
        id: p.id, name: p.name, price: p.price, credits: p.credits, kind: p.kind,
        validityDays: p.validityDays, badge: p.badge, perks: p.perks
      })),
      updatedAt: new Date(u.updated_at).toISOString()
    };
  }

  /**
   * Atomically spend `cost` credits. Returns { ok, used, ...snapshot }.
   * Spends the credits that expire first: daily, then pack, then plan, then lifetime bonus.
   */
  function charge(userId, cost, reason, reference = '') {
    cost = Math.max(0, Math.floor(cost));
    const before = refresh(userId) || ensure(userId);
    const total = totalOf(before);
    if (cost === 0) return { ok: true, used: [], ...snapshot(userId) };
    if (total < cost) return { ok: false, short: cost - total, used: [], ...snapshot(userId) };

    db.exec('BEGIN IMMEDIATE');
    try {
      const u = getUser(userId);
      let left = cost;
      let running = total;
      const used = [];
      const take = (bucket, column) => {
        const have = u[column];
        const n = Math.min(left, have);
        if (n <= 0) return;
        u[column] = have - n;
        left -= n;
        running -= n;
        used.push({ bucket, credits: n });
        db.prepare(`UPDATE users SET ${column} = ?, updated_at = ? WHERE user_id = ?`).run(u[column], now(), userId);
        ledger(userId, -n, bucket, reason, reference, running);
      };
      take('daily', 'daily_credits');
      take('pack', 'pack_credits');
      take('plan', 'plan_credits');
      take('bonus', 'bonus_credits');
      if (left > 0) throw new Error('credit accounting mismatch');
      db.exec('COMMIT');
      return { ok: true, used, ...snapshot(userId) };
    } catch (e) {
      db.exec('ROLLBACK');
      log.error?.('[billing] charge failed', e);
      return { ok: false, short: cost, used: [], ...snapshot(userId) };
    }
  }

  // Give back exactly what a failed call took, into the same buckets.
  function refund(userId, used, reason = 'refund') {
    if (!Array.isArray(used) || !used.length) return;
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const x of used) {
        const col = x.bucket === 'daily' ? 'daily_credits' : x.bucket === 'pack' ? 'pack_credits' : x.bucket === 'plan' ? 'plan_credits' : 'bonus_credits';
        db.prepare(`UPDATE users SET ${col} = ${col} + ?, updated_at = ? WHERE user_id = ?`).run(x.credits, now(), userId);
      }
      const u = getUser(userId);
      for (const x of used) ledger(userId, x.credits, x.bucket, reason, null, totalOf(u));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      log.error?.('[billing] refund failed', e);
    }
  }

  function grant(userId, { bucket = 'bonus', credits, expiresAt = 0, reason = 'grant', reference = '' }) {
    const col = bucket === 'daily' ? 'daily_credits' : bucket === 'pack' ? 'pack_credits' : bucket === 'plan' ? 'plan_credits' : 'bonus_credits';
    const expCol = bucket === 'pack' ? 'pack_expires_at' : bucket === 'plan' ? 'plan_expires_at' : null;
    if (!getUser(userId)) ensure(userId);
    db.exec('BEGIN IMMEDIATE');
    try {
      ensure(userId);
      if (expCol) {
        db.prepare(`UPDATE users SET ${col} = ${col} + ?, ${expCol} = MAX(${expCol}, ?), updated_at = ? WHERE user_id = ?`)
          .run(credits, expiresAt, now(), userId);
      } else {
        db.prepare(`UPDATE users SET ${col} = ${col} + ?, updated_at = ? WHERE user_id = ?`).run(credits, now(), userId);
      }
      ledger(userId, credits, bucket, reason, reference, totalOf(getUser(userId)));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return snapshot(userId);
  }

  const getOrder = id => db.prepare('SELECT * FROM orders WHERE order_id = ?').get(id) || null;
  const orderByGateway = id => db.prepare('SELECT * FROM orders WHERE gateway_order_id = ?').get(id) || null;

  function createOrder(userId, productId) {
    const p = PRODUCTS[productId];
    if (!p) throw new Error('unknown product');
    const orderId = 'ord_' + crypto.randomBytes(12).toString('hex');
    db.prepare('INSERT INTO orders (order_id, user_id, product, amount, currency, status, created_at) VALUES (?,?,?,?,?,?,?)')
      .run(orderId, userId, p.id, p.amount, 'INR', 'created', now());
    return { orderId, product: p, amount: p.amount, currency: 'INR' };
  }

  function attachGateway(orderId, gatewayOrderId) {
    db.prepare('UPDATE orders SET gateway_order_id = ? WHERE order_id = ?').run(gatewayOrderId, orderId);
    return getOrder(orderId);
  }

  function applyProduct(userId, p, reference) {
    const t = now();
    if (p.kind === 'pack') {
      const u = getUser(userId);
      const base = Math.max(t, u?.pack_expires_at || 0);
      db.prepare('UPDATE users SET pack_credits = pack_credits + ?, pack_expires_at = ?, updated_at = ? WHERE user_id = ?')
        .run(p.credits, base + p.validityDays * DAY, t, userId);
      ledger(userId, p.credits, 'pack', 'purchase', reference, totalOf(getUser(userId)));
      return;
    }
    if (p.kind === 'pro') {
      const u = getUser(userId);
      const base = Math.max(t, u?.plan_expires_at || 0);
      const end = base + p.validityDays * DAY;
      db.prepare(`UPDATE users SET plan_id = ?, plan_credits = plan_credits + ?, plan_expires_at = ?,
        priority = 1, tone_selector = 1, updated_at = ? WHERE user_id = ?`)
        .run('pro_monthly', p.credits, end, t, userId);
      ledger(userId, p.credits, 'plan', 'subscription', reference, totalOf(getUser(userId)));
      db.prepare('UPDATE subscriptions SET status = ?, current_period_end = ?, updated_at = ? WHERE user_id = ? AND status = ?')
        .run('active', end, t, userId, 'active');
      const open = db.prepare("SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active'").get(userId);
      if (!open) {
        db.prepare('INSERT INTO subscriptions (id, user_id, product, status, started_at, current_period_end, updated_at) VALUES (?,?,?,?,?,?,?)')
          .run('sub_' + crypto.randomBytes(8).toString('hex'), userId, p.id, 'active', t, end, t);
      }
    }
  }

  // Idempotent: the same order can be confirmed by the browser and by the webhook.
  function markPaid(orderId, paymentId = '') {
    const o = getOrder(orderId);
    if (!o) return { ok: false, error: 'unknown order' };
    if (o.status === 'paid') return { ok: true, already: true, order: o };
    const p = PRODUCTS[o.product];
    if (!p) return { ok: false, error: 'unknown product' };
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare("UPDATE orders SET status = 'paid', payment_id = ?, paid_at = ? WHERE order_id = ? AND status <> 'paid'")
        .run(paymentId || null, now(), orderId);
      ensure(o.user_id);
      applyProduct(o.user_id, p, orderId);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return { ok: true, order: getOrder(orderId), billing: snapshot(o.user_id) };
  }

  function markFailed(orderId, paymentId = '') {
    db.prepare("UPDATE orders SET status = 'failed', payment_id = ?, paid_at = ? WHERE order_id = ? AND status = 'created'")
      .run(paymentId || null, now(), orderId);
  }

  const history = (userId, limit = 25) => db.prepare('SELECT delta, bucket, reason, reference, balance_after, created_at FROM credit_ledger WHERE user_id = ? ORDER BY id DESC LIMIT ?')
    .all(userId, limit)
    .map(r => ({ ...r, at: new Date(r.created_at).toISOString() }));

  function hasReference(reference) {
    if (!reference) return false;
    return !!db.prepare('SELECT 1 FROM credit_ledger WHERE reference = ? LIMIT 1').get(reference);
  }
  return {
    db, ensure, snapshot, charge, refund, grant, history,
    createOrder, attachGateway, markPaid, markFailed, getOrder, orderByGateway, hasReference,
    close: () => db.close()
  };
}
