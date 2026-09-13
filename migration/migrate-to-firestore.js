/**
 * 기존 Claude 아티팩트 DB → Firebase Firestore 데이터 이전 스크립트
 *
 * ⚠️ 이 스크립트는 Firebase 관리자 권한(서비스 계정 키)이 필요합니다.
 * 보안을 위해 이 스크립트는 사용자 본인의 PC(VSCode 등)에서 직접 실행해야 하며,
 * 서비스 계정 키를 어시스턴트(Claude)나 이 저장소에 절대 공유하지 마세요.
 *
 * ── 사용 방법 ──────────────────────────────────────────────────────────
 * 1) Firebase 콘솔 접속: https://console.firebase.google.com/project/jjangkait001/settings/serviceaccounts/adminsdk
 * 2) "새 비공개 키 생성" 클릭 → JSON 파일 다운로드
 * 3) 다운로드한 파일을 이 프로젝트 루트에 `serviceAccountKey.json` 이름으로 저장
 *    (이미 .gitignore에 등록되어 있어 git에는 올라가지 않습니다)
 * 4) 터미널에서 아래 실행:
 *      cd it-request-system
 *      npm install firebase-admin
 *      node migration/migrate-to-firestore.js
 * 5) 완료 메시지와 건수를 확인하세요. 이미 있는 문서는 덮어씁니다(merge: true).
 * ─────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'serviceAccountKey.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ serviceAccountKey.json 파일을 찾을 수 없습니다.');
  console.error('   프로젝트 루트(it-request-system/)에 Firebase 서비스 계정 키를 저장한 뒤 다시 실행하세요.');
  console.error('   안내: https://console.firebase.google.com/project/jjangkait001/settings/serviceaccounts/adminsdk');
  process.exit(1);
}

let initializeApp, cert, getFirestore, Timestamp;
try {
  ({ initializeApp, cert } = require('firebase-admin/app'));
  ({ getFirestore, Timestamp } = require('firebase-admin/firestore'));
} catch (e) {
  console.error('❌ firebase-admin 패키지가 설치되어 있지 않거나 버전이 맞지 않습니다.');
  console.error('   다음을 먼저 실행하세요: npm install firebase-admin');
  console.error('   (오류 상세:', e.message, ')');
  process.exit(1);
}

initializeApp({
  credential: cert(require(SERVICE_ACCOUNT_PATH)),
});

const db = getFirestore();

const EXPORT_DIR = path.join(__dirname, 'export');
const TICKETS_DIR = path.join(EXPORT_DIR, 'tickets', 'tickets');
const MEMBERS_DIR = path.join(EXPORT_DIR, 'members', 'members');
const CONFIG_FILE = path.join(EXPORT_DIR, 'config', 'lists.json');

// Firestore Timestamp로 변환하면 좋은 ISO 문자열 필드들.
// 원본 앱이 문자열(ISO)로도 다루므로, 안전하게 "그대로 문자열 유지"가 기본값입니다.
// 만약 Firestore Timestamp 타입으로 저장하고 싶다면 CONVERT_DATE_FIELDS를 true로 바꾸세요.
const CONVERT_DATE_FIELDS = false;
const DATE_FIELDS = ['createdAt', 'updatedAt', 'answeredAt', 'requestedAt', 'approvedAt'];

function maybeConvertDates(data) {
  if (!CONVERT_DATE_FIELDS) return data;
  const out = Object.assign({}, data);
  for (const f of DATE_FIELDS) {
    if (out[f] && typeof out[f] === 'string') {
      const d = new Date(out[f]);
      if (!isNaN(d.getTime())) out[f] = Timestamp.fromDate(d);
    }
  }
  return out;
}

async function importCollection(dir, collectionName) {
  if (!fs.existsSync(dir)) {
    console.log(`⚠️  ${dir} 없음 — ${collectionName} 컬렉션 건너뜀`);
    return 0;
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  console.log(`▶ ${collectionName}: ${files.length}개 문서 가져오는 중...`);

  let count = 0;
  let batch = db.batch();
  let opsInBatch = 0;
  const BATCH_LIMIT = 450; // Firestore 최대 500, 여유있게 450

  for (const file of files) {
    const docId = path.basename(file, '.json');
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error(`  ✗ ${file} JSON 파싱 실패, 건너뜀:`, e.message);
      continue;
    }
    const docRef = db.collection(collectionName).doc(docId);
    batch.set(docRef, maybeConvertDates(data), { merge: true });
    opsInBatch++;
    count++;

    if (opsInBatch >= BATCH_LIMIT) {
      await batch.commit();
      console.log(`  ...${count}/${files.length} 커밋됨`);
      batch = db.batch();
      opsInBatch = 0;
    }
  }
  if (opsInBatch > 0) {
    await batch.commit();
  }
  console.log(`✔ ${collectionName}: ${count}개 문서 완료`);
  return count;
}

async function importConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.log('⚠️  config/lists.json 없음 — config 문서 건너뜀');
    return;
  }
  const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  const data = parsed.data || parsed; // export 형식에 따라 유연하게 처리
  await db.collection('config').doc('lists').set(data, { merge: true });
  console.log('✔ config/lists 문서 완료');
}

(async () => {
  console.log('=== Firestore 데이터 이전 시작 (프로젝트: jjangkait001) ===');
  const t0 = Date.now();
  try {
    const ticketCount = await importCollection(TICKETS_DIR, 'tickets');
    const memberCount = await importCollection(MEMBERS_DIR, 'members');
    await importConfig();
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log('=========================================');
    console.log(`완료! tickets: ${ticketCount}건, members: ${memberCount}건 (${secs}초 소요)`);
    console.log('Firebase 콘솔에서 데이터를 확인하세요:');
    console.log('https://console.firebase.google.com/project/jjangkait001/firestore/data');
  } catch (err) {
    console.error('❌ 이전 중 오류 발생:', err);
    process.exit(1);
  }
  process.exit(0);
})();