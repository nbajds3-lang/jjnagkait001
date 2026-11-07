# 전산 요청 관리 시스템 (IT Request Management)

지점별 전산(IT) 접수를 등록·조회·처리하는 내부 웹 애플리케이션입니다. 원래 Claude 아티팩트(claude.ai)에서 동작하던 버전을 외부 정식 서비스로 이전하는 중입니다.

## 상태

- [ ] Firebase 프로젝트 생성 (Firestore + Storage)
- [ ] `resolveDb()` / `resolveAssets()` Firebase SDK로 교체
- [ ] Firestore 보안 규칙(firestore.rules) 적용
- [x] 기존 데이터(tickets/members/config) 내보내기 완료, Firestore 반입 스크립트 준비 완료 (실행은 사용자 PC에서 필요)
- [ ] GitHub 저장소 연결 및 최초 커밋
- [ ] Firebase Hosting 배포, URL 확정
- [ ] 오픈 전 점검 완료

## 구조

단일 HTML 파일(`index.html`)로 구성되어 있습니다. CSS/JS가 모두 이 파일 안에 인라인으로 포함되어 있어, 파일 하나만 호스팅하면 동작합니다.

```
.
├── index.html          # 전체 앱 (UI + 로직 단일 파일)
├── firestore.rules     # Firestore 보안 규칙
├── firebase.json        # Firebase Hosting 설정
└── migration/           # 기존 데이터 백업/이전 스크립트 (git에는 스크립트만, 데이터 json은 제외)
```

## 로컬에서 미리보기

별도 빌드 과정이 없으므로, `index.html`을 브라우저로 바로 열거나 아무 정적 서버로 띄우면 됩니다.

```bash
npx serve .
```

단, Firebase 연동 전에는 로그인 승인·접수 저장·통계·첨부파일 기능이 동작하지 않습니다(백엔드가 아직 연결되지 않은 상태).

## 배포 (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # 기존 firebase.json 유지 선택
firebase deploy
```

## 기존 데이터 마이그레이션 (아티팩트 → Firestore)

기존 Claude 아티팩트에 있던 데이터(접수 2,478건, 회원 2건, 공통설정 1건)는 이미 `migration/export/`에 내보내져 있습니다(이 폴더는 실제 개인정보가 포함되어 있어 git에는 올리지 않습니다).

Firestore로 실제로 밀어넣는 작업은 관리자 키가 필요하므로 **본인 PC에서 직접** 실행해야 합니다:

1. [Firebase 콘솔 > 서비스 계정](https://console.firebase.google.com/project/jjangkait001/settings/serviceaccounts/adminsdk)에서 "새 비공개 키 생성" → JSON 다운로드
2. 다운로드한 파일을 프로젝트 루트에 `serviceAccountKey.json`으로 저장 (`.gitignore`에 이미 등록되어 있어 안전)
3. 실행:
   ```bash
   cd it-request-system
   npm install firebase-admin
   node migration/migrate-to-firestore.js
   ```
4. 콘솔에 출력되는 완료 메시지(건수)를 확인하고, [Firestore 데이터 화면](https://console.firebase.google.com/project/jjangkait001/firestore/data)에서 직접 확인하세요.

## 로그인 (Firebase Authentication)

화면은 **연락처 + 비밀번호**, 내부는 Firebase Authentication 이메일/비밀번호입니다. 연락처를 이메일 형식으로 바꿔 쓰며 메일은 보내지 않습니다.

- 일반 직원: `01012345678_<랜덤 10자>@jjangkait001.firebaseapp.com` (첫 설정·초기화·신규 등록 때 만들어짐)
- 최고관리자: `01094820353@jjangkait001.firebaseapp.com` (**콘솔에서 직접 만든 계정만** 인정)
- `members.authEmail` = 지금 유효한 로그인 계정. 규칙은 이 값과 같은 계정만 승인된 사용자로 인정합니다.
- 로그인할 때 `logins/{연락처}` 문서에서 계정 이메일을 찾습니다(1건씩 조회만 가능, 목록 조회 불가).

### 권한

| | 접수 보기 | 접수 등록 | 처리상태·답변·삭제·지점 일괄변경 | 기준관리 | 엑셀 가져오기 | 회원관리·코드 발급 |
|---|---|---|---|---|---|---|
| 전체관리자 `admin` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 운영관리자 `manager` | ✓ | ✓ (본인 명의) | ✓ | | | |
| 요청자 `requester` | ✓ (화면은 본인 접수만) | ✓ (본인 명의) | 본인 접수 내용만 수정 | | | |

승인 대기·거절·미전환 계정은 접수·설정·첨부파일 모두 볼 수 없습니다. 첨부파일은 승인된 사용자만 보고 올릴 수 있고, 지우는 건 올린 본인 또는 전체관리자입니다.

### 기존 직원 전환: 첫 설정 코드

전환 전부터 있던 직원은 회원 정보에 로그인 계정이 없어서 **관리자가 발급한 코드 없이는 들어올 수 없습니다**(먼저 비밀번호를 정하는 사람이 계정을 가져가는 것을 막기 위함).

1. 전체관리자: **회원 관리 → 로그인 전환 · 비밀번호 코드** → 대상(전체 또는 지점) 선택 → **첫 설정 코드 일괄 발급**
2. 발급과 동시에 `첫설정코드_<지점>_<날짜>.xlsx`가 내려받아집니다(지점·이름·연락처·코드·만료 시각). 나중에 다시 받으려면 **유효한 코드 엑셀 다운로드**.
3. 직원: 로그인 화면 → **코드로 비밀번호 설정** → 연락처 + 코드(예: `K7MP-4XQ9`) + 새 비밀번호 → 바로 로그인. 승인·지점·권한·이름은 그대로입니다.

- 코드: 영문+숫자 8자리(헷갈리는 0·O·1·I·L 제외), **24시간**, 1회용. 다시 발급하면 예전 코드는 없어집니다.
- "아직 전환 안 한 직원만"을 끄면 이미 전환한 직원에게도 발급됩니다(사실상 24시간짜리 비밀번호 초기화).

### 비밀번호 초기화

1. 직원: 로그인 화면 → **비밀번호를 잊었어요** → 연락처 입력
2. 전체관리자: 회원 관리 메뉴 배지에 표시 → **승인 (6자리 코드)** → 화면 알림에 나온 코드를 본인에게 전달
3. 직원: **코드로 비밀번호 설정**에 6자리 코드 입력 (**30분**, 1회용)

초기화하면 새 로그인 계정이 만들어지고 예전 계정은 바로 차단됩니다(다른 기기에 로그인돼 있던 것도 자동 로그아웃).

### 최고관리자 (01094820353)

- 화면 초기화 대상이 아닙니다. 비밀번호를 잊으면 [Firebase 콘솔 → Authentication → 사용자](https://console.firebase.google.com/project/jjangkait001/authentication/users)에서 `01094820353@jjangkait001.firebaseapp.com`의 비밀번호를 직접 재설정하세요.
- `index.html`의 `ADMIN_PHONE_DIGITS`와 `firestore.rules` / `storage.rules`의 `superId()`는 같아야 합니다.

## 배포 당일 순서

### 0. 전날까지 (콘솔 준비, 직원 영향 없음)

1. [Authentication → 로그인 방법](https://console.firebase.google.com/project/jjangkait001/authentication/providers)에서 **이메일/비밀번호** 사용 설정
2. [Authentication → 사용자](https://console.firebase.google.com/project/jjangkait001/authentication/users) → **사용자 추가**: 이메일 `01094820353@jjangkait001.firebaseapp.com`, 비밀번호는 최고관리자가 직접 정함
3. 지금 배포된 Firestore·Storage 규칙을 콘솔에서 복사해 보관(되돌릴 때 사용). 로컬 백업은 `_backup/*_2026-11-07_before-auth.*`
4. 회원관리에서 승인된 직원의 **연락처·지점**이 맞는지 확인(코드가 연락처 기준으로 나갑니다)

### 1. 직원 공지 (전날 또는 당일 오전)

> [전산 요청 시스템 로그인 방식 변경 안내]
> ○월 ○일 ○시부터 전산 요청 시스템이 **연락처 + 비밀번호** 로그인으로 바뀝니다.
> 1) 지점장(또는 IT실)에게 **첫 설정 코드**(8자리)를 받습니다.
> 2) 로그인 화면 → "코드로 비밀번호 설정" → 연락처, 코드, 새 비밀번호를 입력하면 바로 접속됩니다.
> 3) 코드는 **받은 뒤 24시간** 동안만 쓸 수 있습니다. 지나면 다시 요청해주세요.
> 기존 접수 내역과 지점·권한은 그대로 유지됩니다.

### 2. 배포 (업무가 적은 시간, 약 10분)

1. `deploy.bat` 실행 → GitHub push → Actions가 화면(Hosting)을 배포 (1~2분, [Actions](https://github.com/nbajds3-lang/jjnagkait001/actions)에서 완료 확인)
2. 끝나자마자 규칙 배포:
   ```
   firebase deploy --only firestore:rules,storage
   ```
   Storage 규칙이 Firestore 회원 정보를 읽도록 **권한을 부여할지 물으면 Yes**를 선택합니다.
3. https://jjangkait001.web.app 에서 최고관리자(01094820353 + 콘솔에서 정한 비밀번호)로 로그인 → 대시보드·접수 목록·기준관리가 보이는지 확인

> 1과 2 사이 몇 분 동안은 새 화면 + 예전 규칙 상태라 첫 설정이 실패할 수 있습니다. 코드는 2가 끝난 뒤에 발급하세요.

### 3. 코드 일괄 발급

회원 관리 → 로그인 전환 · 비밀번호 코드 → 대상 선택(전체 또는 지점별) → **첫 설정 코드 일괄 발급** → 엑셀이 내려받아짐.
지점별로 나눠 발급하면 지점장에게 그 지점 파일만 전달할 수 있습니다.

### 4. 전달

- 엑셀의 코드를 **본인에게 1:1로** 전달합니다(문자·메신저). 단체방에 파일 전체를 올리지 마세요.
- 전달이 끝나면 엑셀 파일을 지웁니다.
- 같은 화면의 "로그인 전환: X / Y명 완료"로 진행 상황을 봅니다. 24시간이 지나도 전환하지 않은 직원은 "아직 전환 안 한 직원만"으로 다시 발급합니다.

### 문제가 생기면 (되돌리기)

`_backup/index_2026-11-07_before-auth.html`을 `index.html`로, `_backup/firestore_2026-11-07_before-auth.rules` / `_backup/storage_2026-11-07_before-auth.rules`를 각각 복사한 뒤 같은 순서(push → 규칙 배포)로 배포하면 이전 상태로 돌아갑니다. 이미 전환한 직원 정보는 남아 있어서 다시 전환할 때 그대로 쓸 수 있습니다.

## 보안 테스트

`C:\ai_pro\security-test`에서 `npm test`(Java 21 필요). 에뮬레이터(demo 프로젝트)에서만 돌며 실제 프로젝트에 접속하지 않습니다.
보안 23개 + 역할별 권한 + 기존 기능 + 첫 설정·초기화 코드 + 첨부파일 + Chrome 헤드리스 화면 시나리오.

## 비용

이메일/비밀번호 로그인은 무료입니다. 규칙이 권한을 확인할 때 Firestore 읽기가 생기지만(첨부파일 확인 포함) 무료 한도 안입니다. 문자(SMS) 인증·Cloud Functions는 쓰지 않습니다.