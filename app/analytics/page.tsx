"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "../components/Navigation"
import { supabase } from "@/lib/supabase"

interface CategoryStat {
  categoryId: string
  categoryName: string
  totalAmount: number
  itemCount: number
  percentage: number
}

type ViewMode = "weekly" | "monthly"

export default function AnalyticsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("monthly")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [stats, setStats] = useState<CategoryStat[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (userId) {
      loadStatistics()
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
      </main>
    </div>
  )
}
