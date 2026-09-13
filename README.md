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

## 관리자 계정

최초 접속 시 코드에 지정된 전화번호로 로그인하면 자동으로 전체관리자 권한이 부여됩니다. 이 값은 `index.html` 내 `ADMIN_PHONE_DIGITS`, `ADMIN_NAME`, `ADMIN_BRANCH`에 있습니다. 공개 저장소로 운영할 경우 이 값들을 실제 값 그대로 커밋하지 않도록 주의하세요.
