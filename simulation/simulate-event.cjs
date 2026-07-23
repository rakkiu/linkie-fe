/**
 * ============================================================
 *  LINKIE - EVENT SIMULATION SCRIPT
 *  Su kien: All-Rounder Concert - Soobin 2026
 *  Ngay: 22/07/2026 | Khung gio: 19:00 - 20:00 (GMT+7)
 * ============================================================
 *
 *  Chuc nang:
 *  1. Dang ky 20 tai khoan Attendee
 *  2. Bypass xac thuc email qua SQL (can chay manually)
 *  3. Dang nhap va lay access token
 *  4. Gui 2-3 tin nhan Wishwall chu de concert Soobin
 *  5. Danh gia su kien 4-5 sao
 *  6. Xuat SQL de backdate timestamps ve khung gio 19:00-20:00
 *
 *  Chay: node simulate-event.js
 * ============================================================
 */

const https = require('https');
const http = require('http');

// ── CAU HINH ─────────────────────────────────────────────────
const CONFIG = {
  BASE_URL: 'https://linkie-be.onrender.com',

  // Neu EVENT_ID = null, script se tu dong tim su kien Soobin
  EVENT_ID: null,

  DEFAULT_PASSWORD: 'Linkie@2026',

  // 19:00 GMT+7 = 12:00 UTC, 20:00 GMT+7 = 13:00 UTC
  SIMULATION_DATE: '2026-07-22',
  START_HOUR_UTC: 12,
  END_HOUR_UTC: 13,

  REQUEST_DELAY_MS: 1500,
};

// ── DANH SACH 20 TAI KHOAN ─────────────────────────────────
const ACCOUNTS = [
  { name: 'Le Ngoc Linh',              email: 'linhan9a9@gmail.com' },
  { name: 'Nguyen Thanh Hien',         email: 'nguyenthianhnguyet2004aa@gmail.com' },
  { name: 'Truong Van Truong',         email: 'truongvantruongkkg@gmail.com' },
  { name: 'Phan Thi Thao',            email: 'phanthithao0904@gmail.com' },
  { name: 'Le Thi Thanh Nga',         email: 'ltthnga.lethithanhnaga@gmail.com' },
  { name: 'Pham Tat Son',             email: 'phatttse183281@fpt.edu.vn' },
  { name: 'Khanh Ly',                  email: 'khanhly052005@gmail.com' },
  { name: 'Tran Hieu Nam',            email: 'tahieunhann@gmail.com' },
  { name: 'Kim Nguyen',                email: 'kimnguyen26082003@gmail.com' },
  { name: 'Coco Candy',                email: 'cococandy1407@gmail.com' },
  { name: 'Nguyen Minh Nguyen',        email: 'nguyenminhnguyen08112004@gmail.com' },
  { name: 'Hung Tat Son',             email: 'hungttse184584@fpt.edu.vn' },
  { name: 'Bui Ngoc Diem My',         email: 'bndiemmy1409@gmail.com' },
  { name: 'Nguyen Huy Nhan Thanh Thu', email: 'nguyenhuynhanhthu232vl@gmail.com' },
  { name: 'Ngoc Minh',                 email: 'ngocminh6556@gmail.com' },
  { name: 'Le Diem Trinh',            email: 'lediemtrinh3101@gmail.com' },
  { name: 'Nguyen Thao Uyen My',      email: 'nguyenthaouyenmy0204@gmail.com' },
  { name: 'Thao Tong',                 email: 'thaotgdd074@gmail.com' },
  { name: 'Nguyen Buu Hong Ngoc',     email: 'nguyenbuuhongngoc7@gmail.com' },
  { name: 'Bao Thy',                   email: 'baothy.bte@gmail.com' },
];

// ── NOI DUNG TIN NHAN WISHWALL (chu de concert Soobin) ────
const WISHWALL_MESSAGES = [
  'Soobin oi, em da doi concert nay ca nam troi roi! Hom nay cuc vui! Tuyet voi!',
  'All-Rounder concert that su qua dinh! Giong hat cua anh Soobin lam em rot nuoc mat roi',
  'Cam on Linkie da to chuc su kien hoan hao den the nay! Qua tuyet voi!',
  'Khong khi concert All-Rounder dinh qua troi! Moi nguoi xung quanh deu dang nhay theo',
  'Soobin hat live hay hon ca tren CD luon a! Anh ay that su la All-Rounder',
  'Vua nghe xong "Muon Roi Ma Sao Con" live ma tim van con dap loan xa',
  'Concert hom nay se la ky uc dep nhat nam 2026 cua toi. Cam on Soobin va team Linkie!',
  'Chuc Soobin ngay cang thanh cong va tiep tuc mang am nhac tuyet voi den cho fan',
  'Band nhac cua Soobin toi nay qua tuyet! Phan guitar solo lam ca san khau bung chay',
  'Soobin oi anh dep trai qua di mat! Concert nay la best concert em tung den!',
  'Nhung giai dieu quen thuoc vang len tren san khau, bao nhieu cam xuc ua ve... Cam on Soobin!',
  'Phan mashup cua anh Soobin toi nay hay den muc khong the dien ta thanh loi duoc!',
  'Toi da hat theo tung bai hat va cam thay that hanh phuc. Tuyet voi qua!',
  'Dung app Linkie de trai nghiem concert that su tien loi va thu vi! Moi thu deu trong 1 app',
  'Tinh nang Wishwall cua Linkie qua hay! Cam giac duoc ket noi voi ca nghin fan cung luc',
  'Chuc anh Soobin luon khoe manh va tiep tuc toa sang tren con duong am nhac!',
  'All-Rounder concert 2026 - Mot dem khong the quen! Hen gap lai anh Soobin nam sau nha!',
  'Cam on vi dem nhac tuyet voi nhat ma toi tung duoc tham du trong cuoc doi! Cam on Linkie!',
  'Am nhac cua Soobin that su cham den trai tim! Qua happy khi duoc du concert lan nay',
  'Moi thu trong concert hom nay deu hoan hao tu am thanh, anh sang den giong hat cua Soobin!',
  'Khong co gi tuyet hon la duoc nghe Soobin hat live! Cam on vi dem nhac dang nho nay',
  'Soobin da mang den mot dem nhac day cam xuc va an tuong. Fan van luon yeu anh nhieu lam!',
  'Toi rat hanh phuc khi duoc trai nghiem concert All-Rounder cua Soobin! Tuyet voi!',
  'Giai dieu va loi ca cua Soobin that su rat dep va y nghia. Cam on anh nhieu lam!',
];

// ── UTILITY FUNCTIONS ─────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.BASE_URL + path);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── STEP 1: LAY DANH SACH SU KIEN ──────────────────────────
async function fetchEventId() {
  console.log('\n[*] Dang lay danh sach su kien tu API...');
  const res = await apiRequest('GET', '/api/events');

  if (res.status !== 200) {
    throw new Error(`Khong the lay danh sach su kien. Status: ${res.status}`);
  }

  const events = res.body.data || [];
  console.log(`\n[LIST] Tim thay ${events.length} su kien:`);
  events.forEach((ev, idx) => {
    const name = ev.name || ev.title || '(no name)';
    console.log(`  ${idx + 1}. ID: ${ev.id}`);
    console.log(`     Ten: ${name} | Status: ${ev.status || 'N/A'}`);
  });

  // Tu dong tim su kien Soobin
  const soobinEvent = events.find(ev => {
    const name = (ev.name || ev.title || '').toLowerCase();
    return name.includes('soobin') || name.includes('all-rounder') || name.includes('rounder');
  });

  if (soobinEvent) {
    const name = soobinEvent.name || soobinEvent.title;
    console.log(`\n[OK] Tim thay su kien: "${name}"`);
    console.log(`     Event ID: ${soobinEvent.id}`);
    return soobinEvent.id;
  } else {
    console.log('\n[!] Khong tu dong tim thay su kien Soobin.');
    console.log('    -> Vui long copy Event ID tu danh sach tren va set vao CONFIG.EVENT_ID trong script.');
    process.exit(0);
  }
}

// ── STEP 2: DANG KY TAI KHOAN ──────────────────────────────
async function registerAccount(account) {
  const res = await apiRequest('POST', '/api/Auth/register', {
    name: account.name,
    email: account.email,
    password: CONFIG.DEFAULT_PASSWORD,
  });

  if (res.status === 201) {
    return { success: true, userId: res.body.data?.id, isNew: true };
  } else if (res.status === 409) {
    return { success: true, alreadyExists: true };
  } else {
    return { success: false, error: res.body?.message || `HTTP ${res.status}` };
  }
}

// ── STEP 3: DANG NHAP ───────────────────────────────────────
async function loginAccount(account) {
  const res = await apiRequest('POST', '/api/Auth/login', {
    email: account.email,
    password: CONFIG.DEFAULT_PASSWORD,
  });

  if (res.status === 200) {
    const data = res.body.data || {};
    return { success: true, accessToken: data.accessToken, userId: data.id };
  } else {
    return { success: false, error: res.body?.message || `HTTP ${res.status}` };
  }
}

// ── STEP 4: GUI TIN NHAN WISHWALL ──────────────────────────
async function sendWishwallMessages(account, token, eventId) {
  const count = randomBetween(2, 3);
  const results = [];
  const usedIndices = new Set();

  for (let i = 0; i < count; i++) {
    // Chon tin nhan ngau nhien, khong trung nhau
    let idx;
    do {
      idx = randomBetween(0, WISHWALL_MESSAGES.length - 1);
    } while (usedIndices.has(idx) && usedIndices.size < WISHWALL_MESSAGES.length);
    usedIndices.add(idx);

    const message = WISHWALL_MESSAGES[idx];

    const res = await apiRequest(
      'POST',
      `/api/events/${eventId}/wishwall`,
      { message },
      token
    );

    const preview = message.substring(0, 50) + '...';
    if (res.status === 201 || res.status === 200) {
      results.push({ success: true, preview });
    } else {
      results.push({ success: false, error: res.body?.message || `HTTP ${res.status}`, preview });
    }

    await sleep(randomBetween(600, 1500));
  }

  return results;
}

// ── STEP 5: DANH GIA SAO ────────────────────────────────────
async function submitRating(account, token, eventId) {
  const stars = randomBetween(4, 5);

  const res = await apiRequest(
    'POST',
    `/api/events/${eventId}/rating`,
    { starRating: stars },
    token
  );

  if (res.status === 200) {
    return { success: true, stars };
  } else {
    return { success: false, error: res.body?.message || `HTTP ${res.status}`, stars };
  }
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log('LINKIE EVENT SIMULATION - SOOBIN CONCERT 2026');
  console.log('='.repeat(60));
  console.log(`Ngay   : ${CONFIG.SIMULATION_DATE}`);
  console.log(`Gio    : 19:00 - 20:00 (GMT+7)`);
  console.log(`Accounts: ${ACCOUNTS.length} tai khoan`);
  console.log(`API    : ${CONFIG.BASE_URL}`);
  console.log('='.repeat(60));

  // Buoc 1: Lay Event ID
  let eventId = CONFIG.EVENT_ID;
  if (!eventId) {
    eventId = await fetchEventId();
  }
  console.log(`\n[TARGET] Event ID: ${eventId}`);

  const report = {
    registered: 0,
    alreadyExisted: 0,
    loginFailed: [],
    wishwallSent: 0,
    wishwallFailed: 0,
    ratingSubmitted: 0,
    ratingFailed: 0,
    needVerify: [],
  };

  // Buoc 2-5: Xu ly tung tai khoan
  for (let i = 0; i < ACCOUNTS.length; i++) {
    const account = ACCOUNTS[i];
    console.log(`\n${'-'.repeat(50)}`);
    console.log(`[${i + 1}/${ACCOUNTS.length}] ${account.name} | ${account.email}`);

    // -- Dang ky --
    process.stdout.write('  [1] Dang ky... ');
    const regResult = await registerAccount(account);

    if (!regResult.success) {
      console.log(`THAT BAI: ${regResult.error}`);
      report.loginFailed.push(account.email);
      await sleep(CONFIG.REQUEST_DELAY_MS);
      continue;
    }

    if (regResult.alreadyExists) {
      console.log('Da ton tai - se dang nhap truc tiep');
      report.alreadyExisted++;
    } else {
      console.log('THANH CONG');
      report.registered++;
      report.needVerify.push(account.email);
    }

    await sleep(CONFIG.REQUEST_DELAY_MS);

    // -- Dang nhap --
    process.stdout.write('  [2] Dang nhap... ');
    const loginResult = await loginAccount(account);

    if (!loginResult.success) {
      console.log(`THAT BAI: ${loginResult.error}`);
      if (loginResult.error.toLowerCase().includes('verif') ||
          loginResult.error.toLowerCase().includes('email')) {
        console.log('      -> Tai khoan chua verify email. Hay chay SQL ben duoi truoc!');
      }
      report.loginFailed.push(account.email);
      await sleep(CONFIG.REQUEST_DELAY_MS);
      continue;
    }

    const token = loginResult.accessToken;
    console.log('THANH CONG (Token OK)');

    await sleep(CONFIG.REQUEST_DELAY_MS);

    // -- Gui Wishwall --
    process.stdout.write('  [3] Gui Wishwall (2-3 tin)... ');
    const wishResults = await sendWishwallMessages(account, token, eventId);
    const successCount = wishResults.filter(r => r.success).length;
    const failCount = wishResults.filter(r => !r.success).length;
    report.wishwallSent += successCount;
    report.wishwallFailed += failCount;

    if (failCount === 0) {
      console.log(`OK - ${successCount} tin gui thanh cong`);
    } else {
      console.log(`PARTIAL - ${successCount} thanh cong, ${failCount} that bai`);
    }
    wishResults.forEach(r => {
      const status = r.success ? '     [OK]' : '     [FAIL]';
      console.log(`${status} "${r.preview}"`);
      if (!r.success) console.log(`            Loi: ${r.error}`);
    });

    await sleep(CONFIG.REQUEST_DELAY_MS);

    // -- Danh gia sao --
    process.stdout.write('  [4] Danh gia sao... ');
    const ratingResult = await submitRating(account, token, eventId);
    if (ratingResult.success) {
      report.ratingSubmitted++;
      console.log(`OK - ${ratingResult.stars} sao`);
    } else {
      report.ratingFailed++;
      console.log(`THAT BAI: ${ratingResult.error}`);
    }

    await sleep(CONFIG.REQUEST_DELAY_MS);
  }

  // ── BAO CAO KET QUA ─────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log('BAO CAO KET QUA SIMULATION');
  console.log('='.repeat(60));
  console.log(`Dang ky moi thanh cong   : ${report.registered}`);
  console.log(`Email da ton tai truoc do: ${report.alreadyExisted}`);
  console.log(`Dang nhap that bai        : ${report.loginFailed.length}`);
  console.log(`Wishwall gui thanh cong  : ${report.wishwallSent} tin nhan`);
  console.log(`Wishwall gui that bai    : ${report.wishwallFailed} tin nhan`);
  console.log(`Danh gia sao thanh cong  : ${report.ratingSubmitted}`);
  console.log(`Danh gia sao that bai    : ${report.ratingFailed}`);

  if (report.loginFailed.length > 0) {
    console.log(`\nTai khoan dang nhap that bai:`);
    report.loginFailed.forEach(e => console.log(`  - ${e}`));
  }

  // ── SQL BYPASS EMAIL VERIFICATION ───────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log('SQL BYPASS EMAIL VERIFICATION');
  console.log('(Chay trong Neon Console truoc khi re-run script)');
  console.log('='.repeat(60));
  console.log('');
  console.log('-- Kich hoat tat ca tai khoan moi dang ky (chua verify) trong 30 phut qua:');
  console.log('-- BUOC 1: Kiem tra ten cot chinh xac cua bang Users');
  console.log('SELECT column_name FROM information_schema.columns');
  console.log('WHERE table_name = \'Users\' AND column_name ILIKE \'%verif%\';');
  console.log('');
  console.log('-- BUOC 2: Chay update (dieu chinh ten cot neu can):');
  console.log('UPDATE "Users"');
  console.log('SET "EmailVerified" = true');
  console.log('WHERE "CreatedAt" > NOW() - INTERVAL \'30 minutes\'');
  console.log('  AND "EmailVerified" = false;');

  // ── SQL BACKDATE TIMESTAMPS ──────────────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log('SQL BACKDATE TIMESTAMPS -> 19:00-20:00 (22/07/2026)');
  console.log('(Chay SAU KHI simulation hoan tat thanh cong)');
  console.log('='.repeat(60));
  console.log('');
  console.log('-- 1. Backdate WishwallMessages');
  console.log('UPDATE "WishwallMessages"');
  console.log('SET "CreatedAt" = \'2026-07-22 12:00:00\'::timestamp +');
  console.log('                  make_interval(secs => RANDOM() * 3600)');
  console.log('WHERE "CreatedAt" > NOW() - INTERVAL \'3 hours\'');
  console.log('  AND "CreatedAt"::date = \'2026-07-22\';');
  console.log('');
  console.log('-- 2. Backdate EventRatings');
  console.log('UPDATE "EventRatings"');
  console.log('SET "CreatedAt" = \'2026-07-22 12:00:00\'::timestamp +');
  console.log('                  make_interval(secs => RANDOM() * 3600)');
  console.log('WHERE "CreatedAt" > NOW() - INTERVAL \'3 hours\'');
  console.log('  AND "CreatedAt"::date = \'2026-07-22\';');

  console.log(`\n${'='.repeat(60)}`);
  console.log('SIMULATION HOAN TAT!');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
});
