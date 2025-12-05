"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "../components/Navigation"
import { supabase } from "@/lib/supabase"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface MonthlyData {
  month: string
  totalAmount: number
  categories: Record<string, number>
}

interface CategoryColor {
  name: string
  color: string
}

export default function TrendsPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [categoryColors, setCategoryColors] = useState<CategoryColor[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [months, setMonths] = useState(6)
  const router = useRouter()

  useEffect(() => {
    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (userId) {
      loadTrendData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, months])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push("/login")
      return
    }
    setUserId(session.user.id)
  }

  const getMonthRange = () => {
    const ranges = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`
      const endDate = new Date(year, month, 0)
      const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(
        endDate.getDate()
      ).padStart(2, "0")}`

      ranges.push({
        label: `${year}년 ${month}월`,
        startDate,
        endDate: endDateStr,
      })
    }

    return ranges
  }

  const loadTrendData = async () => {
    if (!userId) return

    setLoading(true)
    try {
      const monthRanges = getMonthRange()
      const monthlyResults: MonthlyData[] = []
      const categorySet = new Set<string>()

      for (const range of monthRanges) {
        const { data: items, error } = await supabase
          .from("transaction_items")
          .select(`
            total_price,
            category_id,
            category:categories(name),
            transaction:transactions!inner(user_id, date)
          `)
          .eq("transaction.user_id", userId)
          .gte("transaction.date", range.startDate)
          .lte("transaction.date", range.endDate)

        if (error) throw error

        let totalAmount = 0
        const categoryTotals: Record<string, number> = {}

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items?.forEach((item: any) => {
          const amount = item.total_price || 0
          const categoryName = item.category?.name || "미분류"

          totalAmount += amount
          categorySet.add(categoryName)

          if (!categoryTotals[categoryName]) {
            categoryTotals[categoryName] = 0
          }
          categoryTotals[categoryName] += amount
        })

        monthlyResults.push({
          month: range.label,
          totalAmount,
          categories: categoryTotals,
        })
      }

      // Generate colors for categories
      const colors = [
        "#3b82f6", // blue
        "#10b981", // green
        "#f59e0b", // yellow
        "#ef4444", // red
        "#8b5cf6", // purple
        "#ec4899", // pink
        "#6366f1", // indigo
        "#f97316", // orange
      ]

      const categoryList = Array.from(categorySet).map((name, index) => ({
        name,
        color: colors[index % colors.length],
      }))

      setMonthlyData(monthlyResults)
      setCategoryColors(categoryList)
    } catch (error) {
      console.error("Error loading trend data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return `${(value / 10000).toFixed(0)}만원`
  }

  if (!userId) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">지출 트렌드</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          월별 지출 변화를 확인하고 패턴을 분석하세요.
        </p>

        {/* 기간 선택 */}
        <div className="mt-8 flex gap-2">
          <button
            onClick={() => setMonths(3)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              months === 3
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            3개월
          </button>
          <button
            onClick={() => setMonths(6)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              months === 6
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            6개월
          </button>
          <button
            onClick={() => setMonths(12)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              months === 12
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            12개월
          </button>
        </div>

        {loading ? (
          <div className="mt-8 py-16 text-center text-zinc-600 dark:text-zinc-400">
            로딩 중...
          </div>
        ) : monthlyData.length === 0 ? (
          <div className="mt-8 py-16 text-center text-zinc-500 dark:text-zinc-500">
            지출 데이터가 없습니다.
          </div>
        ) : (
          <>
            {/* 월별 총 지출 트렌드 */}
            <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                월별 총 지출 트렌드
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                최근 {months}개월간의 지출 변화를 확인하세요
              </p>

              <div className="mt-6 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis
                      dataKey="month"
                      stroke="#71717a"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="#71717a"
                      style={{ fontSize: "12px" }}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        color: "#fafafa",
                      }}
                      formatter={(value: number) => `${value.toLocaleString()}원`}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalAmount"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: "#3b82f6", r: 4 }}
                      name="총 지출"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 카테고리별 트렌드 */}
            <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                카테고리별 지출 트렌드
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                각 카테고리의 월별 지출 변화를 비교하세요
              </p>

              <div className="mt-6 h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis
                      dataKey="month"
                      stroke="#71717a"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="#71717a"
                      style={{ fontSize: "12px" }}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        color: "#fafafa",
                      }}
                      formatter={(value: number) => `${value.toLocaleString()}원`}
                    />
                    <Legend />
                    {categoryColors.map((category) => (
                      <Bar
                        key={category.name}
                        dataKey={`categories.${category.name}`}
                        stackId="a"
                        fill={category.color}
                        name={category.name}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 통계 요약 */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  평균 월 지출
                </h4>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {(
                    monthlyData.reduce((sum, m) => sum + m.totalAmount, 0) /
                    monthlyData.length
                  ).toLocaleString()}
                  원
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  최고 지출 월
                </h4>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {monthlyData.reduce((max, m) => (m.totalAmount > max.totalAmount ? m : max))
                    .month}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  최저 지출 월
                </h4>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {monthlyData.reduce((min, m) => (m.totalAmount < min.totalAmount ? m : min))
                    .month}
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
