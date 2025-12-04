"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "../components/Navigation"
import { supabase } from "@/lib/supabase"
import ReactMarkdown from "react-markdown"

interface CategoryStat {
  categoryId: string
  categoryName: string
  totalAmount: number
  itemCount: number
  percentage: number
}

interface Budget {
  id: string
  category_id: string | null
  amount: number
}

type ViewMode = "weekly" | "monthly"

export default function AnalyticsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("monthly")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [stats, setStats] = useState<CategoryStat[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string>("")
  const [budgets, setBudgets] = useState<Budget[]>([])
  const router = useRouter()

  useEffect(() => {
    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (userId) {
      loadStatistics()
      loadBudgets()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode, userId])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push("/login")
      return
    }
    setUserId(session.user.id)
  }

  const getDateRange = () => {
    if (viewMode === "weekly") {
      // 주간: 월요일 시작, 일요일 종료
      const day = currentDate.getDay()
      const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1) // 월요일로 조정
      const monday = new Date(currentDate)
      monday.setDate(diff)
      monday.setHours(0, 0, 0, 0)

      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)

      return { startDate: monday, endDate: sunday }
    } else {
      // 월간: 해당 월의 첫날과 마지막날
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)

      return { startDate, endDate }
    }
  }

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const loadStatistics = async () => {
    if (!userId) return

    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange()

      // 거래 아이템과 카테고리 정보 가져오기
      const { data: items, error } = await supabase
        .from("transaction_items")
        .select(`
          total_price,
          category_id,
          category:categories(name),
          transaction:transactions!inner(user_id, date)
        `)
        .eq("transaction.user_id", userId)
        .gte("transaction.date", formatDateKey(startDate))
        .lte("transaction.date", formatDateKey(endDate))

      if (error) throw error

      // 카테고리별 집계
      const categoryMap = new Map<string, { name: string; total: number; count: number }>()
      let total = 0

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items?.forEach((item: any) => {
        const categoryId = item.category_id || "uncategorized"
        const categoryName = item.category?.name || "미분류"
        const amount = item.total_price || 0

        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, { name: categoryName, total: 0, count: 0 })
        }

        const stat = categoryMap.get(categoryId)!
        stat.total += amount
        stat.count += 1
        total += amount
      })

      // 배열로 변환하고 금액 기준 내림차순 정렬
      const statsArray: CategoryStat[] = Array.from(categoryMap.entries())
        .map(([categoryId, data]) => ({
          categoryId,
          categoryName: data.name,
          totalAmount: data.total,
          itemCount: data.count,
          percentage: total > 0 ? (data.total / total) * 100 : 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)

      setStats(statsArray)
      setTotalAmount(total)
    } catch (error) {
      console.error("Error loading statistics:", error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentPeriodStart = (): string => {
    const now = currentDate
    if (viewMode === "weekly") {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(now)
      monday.setDate(diff)
      return monday.toISOString().split("T")[0]
    } else {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
    }
  }

  const loadBudgets = async () => {
    if (!userId) return

    try {
      const startDate = getCurrentPeriodStart()

      const { data, error } = await supabase
        .from("budgets")
        .select("id, category_id, amount")
        .eq("user_id", userId)
        .eq("period_type", viewMode)
        .eq("start_date", startDate)

      if (error) throw error
      setBudgets(data || [])
    } catch (error) {
      console.error("Error loading budgets:", error)
    }
  }

  const getBudgetProgress = (categoryId: string | null) => {
    const budget = budgets.find((b) => b.category_id === categoryId)
    if (!budget) return null

    const spent = categoryId
      ? stats.find((s) => s.categoryId === categoryId)?.totalAmount || 0
      : totalAmount

    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
    const remaining = budget.amount - spent

    return {
      budget: budget.amount,
      spent,
      percentage,
      remaining,
      isOverBudget: spent > budget.amount,
    }
  }

  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const formatPeriod = () => {
    const { startDate, endDate } = getDateRange()

    if (viewMode === "weekly") {
      return `${startDate.getMonth() + 1}월 ${startDate.getDate()}일 - ${
        endDate.getMonth() + 1
      }월 ${endDate.getDate()}일`
    } else {
      return `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`
    }
  }

  const getCategoryColor = (index: number) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-orange-500",
    ]
    return colors[index % colors.length]
  }

  const handleAIAnalysis = async () => {
    if (stats.length === 0) return

    setAnalyzing(true)
    setAnalysis("")

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period: formatPeriod(),
          stats,
          totalAmount,
          viewMode,
        }),
      })

      if (!response.ok) {
        throw new Error("AI 분석 요청 실패")
      }

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (error) {
      console.error("AI 분석 오류:", error)
      alert("AI 분석 중 오류가 발생했습니다.")
    } finally {
      setAnalyzing(false)
    }
  }

  if (!userId) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">통계</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          카테고리별 지출 분석을 확인하세요.
        </p>

        {/* 뷰 모드 선택 */}
        <div className="mt-8 flex gap-2">
          <button
            onClick={() => setViewMode("weekly")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              viewMode === "weekly"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            주간
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              viewMode === "monthly"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            월간
          </button>
        </div>

        {/* 기간 네비게이션 */}
        <div className="mt-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            onClick={handlePrevious}
            className="rounded-lg p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatPeriod()}
            </h2>
            <button
              onClick={handleToday}
              className="mt-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              이번 {viewMode === "weekly" ? "주" : "달"}
            </button>
          </div>
          <button
            onClick={handleNext}
            className="rounded-lg p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 총 지출 */}
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">총 지출</p>
            <p className="mt-2 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              {totalAmount.toLocaleString()}원
            </p>
          </div>
        </div>

        {/* 예산 진행률 */}
        {!loading && getBudgetProgress(null) && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                예산 진행률
              </h3>
              <a
                href="/budgets"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                예산 설정 →
              </a>
            </div>
            {(() => {
              const progress = getBudgetProgress(null)!
              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">전체 예산</span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {progress.spent.toLocaleString()} / {progress.budget.toLocaleString()}원
                    </span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full transition-all ${
                        progress.isOverBudget
                          ? "bg-red-500"
                          : progress.percentage > 80
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${
                        progress.isOverBudget
                          ? "text-red-600 dark:text-red-400"
                          : progress.percentage > 80
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {progress.isOverBudget
                        ? `예산 초과 ${Math.abs(progress.remaining).toLocaleString()}원`
                        : `${progress.remaining.toLocaleString()}원 남음`}
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-500">
                      {progress.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* 카테고리별 통계 */}
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            카테고리별 지출
          </h3>

          {loading ? (
            <div className="mt-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
              로딩 중...
            </div>
          ) : stats.length === 0 ? (
            <div className="mt-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
              이 기간에는 지출 내역이 없습니다.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {stats.map((stat, index) => (
                <div key={stat.categoryId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${getCategoryColor(index)}`} />
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {stat.categoryName}
                      </span>
                      <span className="text-sm text-zinc-500 dark:text-zinc-500">
                        {stat.itemCount}건
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {stat.totalAmount.toLocaleString()}원
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-500">
                        {stat.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full ${getCategoryColor(index)} transition-all`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 카테고리별 비율 차트 */}
        {!loading && stats.length > 0 && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              카테고리 비율
            </h3>
            <div className="mt-4 flex h-8 overflow-hidden rounded-full">
              {stats.map((stat, index) => (
                <div
                  key={stat.categoryId}
                  className={`${getCategoryColor(index)} transition-all`}
                  style={{ width: `${stat.percentage}%` }}
                  title={`${stat.categoryName}: ${stat.percentage.toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map((stat, index) => (
                <div key={stat.categoryId} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${getCategoryColor(index)}`} />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {stat.categoryName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI 분석 버튼 */}
        {!loading && stats.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleAIAnalysis}
              disabled={analyzing}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-white font-semibold shadow-lg transition-all hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <>
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  AI 분석 중...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  AI 분석 받기
                </>
              )}
            </button>
          </div>
        )}

        {/* AI 분석 결과 */}
        {analysis && (
          <div className="mt-6 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-6 dark:border-purple-900 dark:from-purple-950 dark:to-blue-950">
            <div className="flex items-center gap-2 mb-4">
              <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                AI 분석 결과
              </h3>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-6 mb-3">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-purple-800 dark:text-purple-200 mt-5 mb-2">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mt-4 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-zinc-800 dark:text-zinc-200 mb-3 leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-2 text-zinc-800 dark:text-zinc-200 mb-3">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-2 text-zinc-800 dark:text-zinc-200 mb-3">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="ml-4">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-bold text-purple-900 dark:text-purple-100">
                      {children}
                    </strong>
                  ),
                }}
              >
                {analysis}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
