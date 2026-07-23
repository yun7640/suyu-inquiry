# 수유역 상가 임대 문의 접수 (독립 배포용)

수유역 도봉로87길 8 상가의 **임대 문의 전용** 웹앱입니다.
브리핑용 대시보드와는 **별도 링크**로 운영되며, 서로 연결되지 않습니다.

## 구성 파일

```
inquiry-app/
├── server.js          # Express 서버 (문의 저장 + 이메일 발송 + 관리자 API)
├── package.json       # 의존성 및 실행 스크립트
├── .gitignore
├── README.md
└── public/
    ├── index.html     # 매물 소개 + 임대 문의 폼 (브리핑 내용 전체 포함)
    ├── admin.html     # 관리자 페이지 (임대인 전용, 비밀번호 보호)
    └── photos/        # 건물·공실 사진 5장
```

## 페이지

- **메인 페이지** (`/`): 브리핑 사이트와 **동일한 매물 정보 전체**(2·3층 조건, 층별 구성, 적합 업종,
  위치 지도, 건물·공실 사진)에 더해, 하단에 **임대 문의 폼**이 포함되어 있습니다.
  문의 작성 시 DB 저장 + 임대인·중개사에게 **이메일 자동 발송**
- **관리자 페이지** (`/admin`): 비밀번호 입력 후 문의 목록 열람, 이메일 답장, 처리 메모·상태 관리

## Railway 배포 순서 (브리핑용과 별개의 새 프로젝트)

1. **새 GitHub 저장소 생성** (예: `suyu-inquiry`) → 이 폴더 전체 업로드
2. **Railway → New Project → Deploy from GitHub repo** → 방금 만든 저장소 선택
3. **New → Database → PostgreSQL** 추가 (같은 프로젝트 안에)
4. **환경변수 설정** (Node 서비스 → Variables)
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `ADMIN_PASSWORD` = 관리자 비밀번호
   **이메일 알림을 쓰려면 아래 2개도 추가** (선택 · 미설정 시 저장만 동작):
   - `RESEND_API_KEY` = Resend에서 발급한 API 키 (`re_`로 시작)
   - `MAIL_TO` = 받을 주소들, 쉼표로 구분 (예: 임대인@gmail.com,중개사@naver.com)
   - (선택) `MAIL_FROM` = 발신 주소. 도메인 인증 전에는 생략하면 `onboarding@resend.dev` 사용

5. **Settings → Networking → Generate Domain** → 새 문의용 링크 생성
6. 재배포 후 Deploy Logs에 `DB ready` / `[Mail config] enabled: true` 확인

## Resend 설정 (이메일 발송)

Railway는 Hobby 플랜에서 SMTP(포트 25/465/587)를 차단하므로, HTTPS API 방식인 **Resend**를 사용합니다.
무료 티어로 월 3,000건까지 발송할 수 있어 임대 문의 용도로는 충분합니다.

1. **resend.com** 접속 → 무료 가입
2. 좌측 메뉴 **API Keys** → **Create API Key**
   - 이름 아무거나 (예: `suyu-inquiry`), 권한은 **Sending access**
   - 생성된 키(`re_...`)를 복사 — 한 번만 표시되므로 반드시 기록
3. Railway Variables에 `RESEND_API_KEY` = 복사한 키, `MAIL_TO` = 받을 주소들 입력
4. 재배포 후 Deploy Logs에 `[Mail config] enabled: true` 확인
5. 문의를 제출해 메일 수신 확인 (스팸함도 함께 확인)

### 수신 주소 제한 관련

Resend는 도메인 인증 전에는 발신 주소로 `onboarding@resend.dev`만 쓸 수 있고,
**Resend 가입 시 사용한 이메일 주소로만 발송**되는 제한이 있습니다.

- 여러 명(임대인·중개사)에게 보내려면 **본인 도메인을 Resend에 등록·인증**하면 됩니다
  (Resend → Domains → Add Domain → DNS 레코드 등록)
- 도메인이 없다면: `MAIL_TO`에 **Resend 가입 이메일 하나만** 넣고,
  해당 메일함(Gmail 등)에서 **자동 전달 규칙**을 만들어 중개사에게 포워딩하는 방법이 간단합니다

## 참고

- 이 앱은 브리핑용 대시보드와 **독립된 별개 프로젝트**입니다. DB·환경변수도 따로 설정합니다.
- 메일 환경변수를 설정하지 않으면 이메일 발송 없이 DB 저장만 동작합니다.
- 메일의 **답장** 버튼을 누르면 문의자에게 바로 회신됩니다.
