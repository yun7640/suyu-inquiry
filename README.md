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
   - `MAIL_USER` = 발송용 Gmail 주소
   - `MAIL_PASS` = 해당 Gmail 앱 비밀번호 16자리
   - `MAIL_TO` = 받을 주소들, 쉼표 구분 (임대인,중개사)
5. **Settings → Networking → Generate Domain** → 새 문의용 링크 생성
6. 재배포 후 Deploy Logs에 `DB ready` / `[Mail config] enabled: true` 확인

## Gmail 앱 비밀번호 발급

1. 발송용 Gmail 계정 준비 (임대 전용 계정 권장)
2. 구글 계정 → 보안 → **2단계 인증** 활성화
3. 같은 화면에서 **앱 비밀번호** 생성 → 16자리 복사 (한 번만 표시)
4. Railway `MAIL_PASS`에 입력

## 참고

- 이 앱은 브리핑용 대시보드와 **독립된 별개 프로젝트**입니다. DB·환경변수도 따로 설정합니다.
- 메일 환경변수를 설정하지 않으면 이메일 발송 없이 DB 저장만 동작합니다.
- 메일의 **답장** 버튼을 누르면 문의자에게 바로 회신됩니다.
