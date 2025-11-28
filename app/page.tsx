import Navigation from "./components/Navigation"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl">
            영수증으로 시작하는
            <br />
            스마트한 가계부
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            영수증을 찍으면 자동으로 인식하고, 카테고리별로 정리해드립니다.
            <br />
            간편하게 지출을 관리하고 통계를 확인하세요.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/receipts"
              className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              영수증 업로드
            </Link>
            <Link
              href="/calendar"
              className="rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              캘린더 보기
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <svg
                className="h-6 w-6 text-zinc-900 dark:text-zinc-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              자동 인식
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              영수증을 촬영하면 AI가 자동으로 장소, 품목, 금액을 인식합니다.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <svg
                className="h-6 w-6 text-zinc-900 dark:text-zinc-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              카테고리 관리
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              품목별로 카테고리를 지정하고 지출을 체계적으로 관리하세요.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <svg
                className="h-6 w-6 text-zinc-900 dark:text-zinc-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              지출 분석
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              주간·월간 카테고리별 지출 통계를 한눈에 확인하세요.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
