const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// 관리자 비밀번호: Railway 환경변수 ADMIN_PASSWORD로 설정. 미설정 시 기본값(반드시 변경 권장)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';

// ── 이메일 알림 설정 ──────────────────────────────────────────
// Railway 환경변수:
//   MAIL_USER : 발송용 Gmail 주소 (예: suyu.lease@gmail.com)
//   MAIL_PASS : 해당 Gmail의 "앱 비밀번호" 16자리 (구글계정→보안→2단계인증→앱비밀번호)
//   MAIL_TO   : 받을 주소들, 쉼표로 구분 (예: 임대인@gmail.com,중개사@naver.com)
// 세 개가 모두 설정된 경우에만 메일이 발송되며, 미설정 시 저장만 정상 동작합니다.
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_TO = process.env.MAIL_TO;
const mailEnabled = !!(MAIL_USER && MAIL_PASS && MAIL_TO);

console.log('[Mail config] enabled:', mailEnabled, mailEnabled ? `| to: ${MAIL_TO}` : '| MAIL_USER/MAIL_PASS/MAIL_TO 미설정');

const transporter = mailEnabled
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: MAIL_USER, pass: MAIL_PASS },
    })
  : null;

// 문의 내용을 메일로 발송 (실패해도 문의 저장에는 영향 없음)
async function sendInquiryMail({ name, phone, email, floor, biz, message }) {
  if (!transporter) return;
  const when = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const esc = (s) => String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const html = `
    <div style="font-family:'Malgun Gothic',sans-serif;max-width:600px;line-height:1.6">
      <div style="background:#0e5c4a;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
        <h2 style="margin:0;font-size:18px">새 임대 문의가 접수되었습니다</h2>
        <div style="font-size:13px;opacity:.85;margin-top:4px">수유역 상가 · 도봉로87길 8</div>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e4ded0;border-top:0">
        <tr><td style="padding:10px 14px;background:#f5f2ea;width:110px;font-weight:bold">이름/업체</td><td style="padding:10px 14px">${esc(name)}</td></tr>
        <tr><td style="padding:10px 14px;background:#f5f2ea;font-weight:bold">연락처</td><td style="padding:10px 14px"><a href="tel:${esc(phone)}">${esc(phone)}</a></td></tr>
        <tr><td style="padding:10px 14px;background:#f5f2ea;font-weight:bold">이메일</td><td style="padding:10px 14px">${email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : '-'}</td></tr>
        <tr><td style="padding:10px 14px;background:#f5f2ea;font-weight:bold">관심 층</td><td style="padding:10px 14px">${esc(floor) || '-'}</td></tr>
        <tr><td style="padding:10px 14px;background:#f5f2ea;font-weight:bold">희망 업종</td><td style="padding:10px 14px">${esc(biz) || '-'}</td></tr>
        <tr><td style="padding:10px 14px;background:#f5f2ea;font-weight:bold;vertical-align:top">문의 내용</td><td style="padding:10px 14px;white-space:pre-wrap">${esc(message)}</td></tr>
        <tr><td style="padding:10px 14px;background:#f5f2ea;font-weight:bold">접수 일시</td><td style="padding:10px 14px">${when}</td></tr>
      </table>
      <p style="font-size:12.5px;color:#6b6b60;margin-top:12px">
        전체 문의 목록은 관리자 페이지에서 확인하실 수 있습니다.
      </p>
    </div>`;

  await transporter.sendMail({
    from: `"수유역 상가 임대" <${MAIL_USER}>`,
    to: MAIL_TO,                       // 쉼표로 구분된 여러 수신자 지원
    replyTo: email || undefined,       // 답장 시 문의자에게 바로 회신
    subject: `[임대문의] ${name} · ${floor || '층 미지정'}${biz ? ' · ' + biz : ''}`,
    html,
  });
}

// DB 연결 설정
// 1순위: DATABASE_URL (Railway 참조 변수)
// 2순위: 개별 PG 변수 (Railway가 Postgres 서비스에 자동 주입: PGHOST, PGPORT, ...)
// 진단 로그: 어떤 방식이 감지됐는지 시작 시 출력
const hasUrl = !!process.env.DATABASE_URL;
const hasPgVars = !!(process.env.PGHOST || process.env.POSTGRES_HOST);

console.log('[DB config] DATABASE_URL present:', hasUrl, '| PGHOST present:', !!process.env.PGHOST);

let poolConfig;
if (hasUrl) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  };
} else if (hasPgVars) {
  poolConfig = {
    host: process.env.PGHOST || process.env.POSTGRES_HOST,
    port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.PGUSER || process.env.POSTGRES_USER,
    password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
    database: process.env.PGDATABASE || process.env.POSTGRES_DB,
    ssl: { rejectUnauthorized: false },
  };
} else {
  console.error('[DB config] 경고: DATABASE_URL도 PG* 변수도 없습니다. DB 연결이 실패합니다.');
  poolConfig = {}; // 연결 시 에러 발생 → 로그로 확인 가능
}

const pool = new Pool(poolConfig);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// DB 테이블 초기화
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      floor TEXT,
      biz TEXT,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // 답글/처리 메모 컬럼 (기존 테이블에도 안전하게 추가)
  await pool.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS memo TEXT;`);
  await pool.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT '신규';`);
  await pool.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS memo_updated_at TIMESTAMPTZ;`);
  console.log('DB ready');
}

// 문의 등록 (공개) — 저장만, 목록 노출 없음
app.post('/api/inquiries', async (req, res) => {
  try {
    const { name, phone, email, floor, biz, message } = req.body;
    if (!name || !phone || !message) {
      return res.status(400).json({ ok: false, error: '필수 항목이 비어 있습니다.' });
    }
    await pool.query(
      `INSERT INTO inquiries (name, phone, email, floor, biz, message)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [name, phone, email || null, floor || null, biz || null, message]
    );
    // 저장 성공을 먼저 응답 (메일 발송 지연이 사용자 경험에 영향 주지 않도록)
    res.json({ ok: true });

    // 이메일 알림 발송 — 실패해도 이미 저장은 완료된 상태
    sendInquiryMail({ name, phone, email, floor, biz, message })
      .then(() => { if (mailEnabled) console.log('[Mail] 발송 완료:', name); })
      .catch(err => console.error('[Mail] 발송 실패:', err.message));
    return;
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: '저장 중 오류가 발생했습니다.' });
  }
});

// 관리자 조회 (비밀번호 필요) — 임대인만 열람
app.post('/api/admin/inquiries', async (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: '비밀번호가 올바르지 않습니다.' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, name, phone, email, floor, biz, message, created_at, memo, status, memo_updated_at
       FROM inquiries ORDER BY created_at DESC`
    );
    res.json({ ok: true, items: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: '조회 중 오류가 발생했습니다.' });
  }
});

// 관리자 메모/상태 저장 (비밀번호 필요)
app.post('/api/admin/memo', async (req, res) => {
  const { password, id, memo, status } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: '비밀번호가 올바르지 않습니다.' });
  }
  if (!id) {
    return res.status(400).json({ ok: false, error: '문의 ID가 필요합니다.' });
  }
  try {
    await pool.query(
      `UPDATE inquiries
       SET memo = $1, status = $2, memo_updated_at = NOW()
       WHERE id = $3`,
      [memo || null, status || '신규', id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: '메모 저장 중 오류가 발생했습니다.' });
  }
});

// 관리자 페이지
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, '0.0.0.0', async () => {
  try { await initDb(); } catch (e) { console.error('DB init failed', e); }
  console.log(`Server on ${PORT}`);
});
