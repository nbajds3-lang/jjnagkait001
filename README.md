# 전산 요청 관리 시스템 (IT Request Management)

지점별 전산(IT) 접수를 등록·조회·처리하는 내부 웹 애플리케이션입니다. 원래 Claude 아티팩트(claude.ai)에서 동작하던 버전을 외부 정식 서비스로 이전하는 중입니다.

## 상태

- [ ] Firebase 프로젝트 생성 (Firestore + Storage)
- [ ] `resolveDb()` / `resolveAssets()` Firebase SDK로 교체
- [ ] Firestore 보안 규칙(firestore.rules) 적용
- [ ] 기존 데이터(tickets/members/config) 마이그레이션
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

## 관리자 계정

최초 접속 시 코드에 지정된 전화번호로 로그인하면 자동으로 전체관리자 권한이 부여됩니다. 이 값은 `index.html` 내 `ADMIN_PHONE_DIGITS`, `ADMIN_NAME`, `ADMIN_BRANCH`에 있습니다. 공개 저장소로 운영할 경우 이 값들을 실제 값 그대로 커밋하지 않도록 주의하세요.
