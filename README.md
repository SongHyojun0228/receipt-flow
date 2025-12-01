# Receipt Flow

스마트한 영수증 가계부 웹 애플리케이션

![Next.js](https://img.shields.io/badge/Next.js-15.1.3-black)
![React](https://img.shields.io/badge/React-19.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)
![Built with Claude](https://img.shields.io/badge/Built_with-Claude_Code-5865F2?logo=anthropic&logoColor=white)

## 📝 프로젝트 소개

Receipt Flow는 일상 생활의 지출을 효율적으로 관리할 수 있는 웹 기반 가계부 애플리케이션입니다. 수기 입력을 통해 영수증 정보를 기록하고, 카테고리별로 지출을 분석하여 소비 패턴을 한눈에 파악할 수 있습니다.

### 주요 기능

- 🔐 **사용자 인증**: Supabase Auth를 활용한 안전한 이메일/비밀번호 기반 인증
- ✍️ **수기 입력**: 영수증 정보를 직접 입력하여 거래 내역 관리
- 📊 **카테고리 관리**: 사용자 정의 카테고리를 생성하고 지출 항목 분류
- 📅 **캘린더 뷰**: 날짜별 지출 내역을 캘린더 형태로 시각화
- 📈 **통계 분석**: 주간/월간 카테고리별 지출 통계 및 비율 분석
- 💳 **거래 내역**: 모든 거래를 시간순으로 확인하고 상세 정보 조회

## 🤖 Claude Code와 함께 개발

이 프로젝트는 **Claude Code**와의 AI 협업을 통해 개발되었습니다. Claude Code는 Anthropic의 대화형 AI 코딩 어시스턴트로, 전체 개발 과정에서 다음과 같은 역할을 수행했습니다:

### Claude Code의 역할

- **아키텍처 설계**: Next.js 15 App Router 기반 구조 설계
- **데이터베이스 모델링**: Supabase PostgreSQL 스키마 설계 및 관계 정의
- **UI/UX 구현**: Tailwind CSS를 활용한 반응형 인터페이스 개발
- **기능 구현**: 인증, CRUD 작업, 데이터 시각화 로직 구현
- **디버깅 및 최적화**: TypeScript 타입 에러, Next.js 빌드 이슈 해결
- **배포 지원**: Vercel 배포 설정 및 환경 변수 구성

### 협업 프롬프트 예시

프로젝트 개발 중 사용된 주요 프롬프트:
https://www.notion.so/2b913ddc688b806ebb4ded3f46f1413a

```
1. 초기 설정
"Next.js 15와 Supabase를 사용해서 영수증 가계부 앱을 만들자.
사용자가 수기로 지출 내역을 입력하고 카테고리별로 분석할 수 있어야 해."

2. 데이터베이스 설계
"users, categories, transactions, transaction_items 테이블을 만들어줘.
각 거래는 여러 개의 품목을 가질 수 있고, 각 품목은 카테고리를 가져야 해."

3. UI 개선
"수기입력에서 카테고리 input이 품목 범위 밖으로 넘어가. CSS 수정 요함."

4. 기능 추가
"캘린더보기 버튼 눌렀을 때, 캘린더 나오고 날짜별로 지출 보고 추가할 수 있게 해줘"

5. 배포 문제 해결
"Vercel 배포 시 useSearchParams() should be wrapped in a suspense boundary 오류가 발생해"
```

### 개발 과정에서 배운 점

- Next.js 15의 새로운 기능 및 제약사항 (Suspense boundary, dynamic export)
- TypeScript strict mode에서의 타입 안전성
- Supabase의 RLS (Row Level Security) 정책 관리
- Vercel 배포 시 환경 변수 및 빌드 최적화

## 🛠 기술 스택

### Frontend
- **Next.js 15.1.3**: React 기반 풀스택 프레임워크
- **React 19.2.0**: UI 컴포넌트 라이브러리
- **TypeScript 5**: 타입 안전성을 위한 정적 타입 언어
- **Tailwind CSS 4**: 유틸리티 기반 CSS 프레임워크

### Backend & Database
- **Supabase**: PostgreSQL 데이터베이스 및 인증 서비스
- **Supabase Auth**: 이메일/비밀번호 기반 사용자 인증

### Deployment
- **Vercel**: 자동 빌드 및 배포 플랫폼

## 📦 설치 및 실행

### 사전 요구사항

- Node.js 18.17 이상
- npm 또는 yarn
- Supabase 계정

### 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 로컬 개발 서버 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 프로덕션 빌드

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 🗄 데이터베이스 스키마

### Categories (카테고리)
```sql
- id: UUID (Primary Key)
- user_id: TEXT (사용자 ID)
- name: TEXT (카테고리 이름)
```

### Transactions (거래)
```sql
- id: UUID (Primary Key)
- user_id: TEXT (사용자 ID)
- date: DATE (거래 날짜)
- place: TEXT (거래 장소)
- total_amount: NUMERIC (총 금액)
- receipt_url: TEXT (영수증 이미지 URL)
```

### Transaction Items (거래 품목)
```sql
- id: UUID (Primary Key)
- transaction_id: UUID (Foreign Key → transactions.id)
- product_name: TEXT (상품명)
- amount: INTEGER (수량)
- price_per_unit: NUMERIC (단가)
- total_price: NUMERIC (총 가격)
- category_id: UUID (Foreign Key → categories.id)
- is_manual_entry: BOOLEAN (수기 입력 여부)
```

## 🚀 배포

이 프로젝트는 Vercel에 자동 배포됩니다:

1. GitHub 저장소에 푸시
2. Vercel이 자동으로 빌드 및 배포
3. 환경 변수 설정 (Vercel 대시보드)

**배포 URL**: [[https://receipt-flow.vercel.app]([https://receipt-flow.vercel.app](https://receipt-flow-three.vercel.app/))](https://receipt-flow-three.vercel.app/)

## 📁 프로젝트 구조

```
receipt_flow/
├── app/
│   ├── analytics/        # 통계 페이지
│   ├── calendar/         # 캘린더 뷰
│   ├── categories/       # 카테고리 관리
│   ├── components/       # 공통 컴포넌트
│   ├── login/           # 로그인/회원가입
│   ├── manual-entry/    # 수기 입력
│   ├── transactions/    # 거래 내역
│   ├── layout.tsx       # 루트 레이아웃
│   └── page.tsx         # 홈 페이지
├── lib/
│   ├── auth.ts          # 인증 헬퍼 함수
│   └── supabase.ts      # Supabase 클라이언트
├── types/
│   └── database.ts      # 타입 정의
└── public/              # 정적 파일
```

## 🔮 향후 계획

- [ ] 영수증 이미지 업로드 및 OCR 기능
- [ ] 예산 설정 및 알림 기능
- [ ] 지출 트렌드 차트 (월별, 카테고리별)
- [ ] CSV/Excel 내보내기
- [ ] 다크 모드 개선
- [ ] 모바일 앱 (React Native)

## 📄 라이선스

MIT License

## 👤 개발자

**송효준 (SongHyojun)**
- GitHub: [@SongHyojun0228](https://github.com/SongHyojun0228)

---

**Built with ❤️ using Claude Code**

🤖 이 프로젝트는 [Claude Code](https://claude.com/claude-code)와의 AI 협업으로 개발되었습니다.
