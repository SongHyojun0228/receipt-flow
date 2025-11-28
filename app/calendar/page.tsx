"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "../components/Navigation"
import { supabase } from "@/lib/supabase"

interface DayTransaction {
  id: string
  place: string
  total_amount: number
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  transactions: DayTransaction[]
  totalAmount: number
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDayTransactions, setSelectedDayTransactions] = useState<DayTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (userId) {
      loadCalendarData()
    }
  }, [currentDate, userId])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push("/login")
      return
    }
    setUserId(session.user.id)
  }

  // 로컬 날짜를 YYYY-MM-DD 형식으로 변환 (타임존 이슈 방지)
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const loadCalendarData = async () => {
    if (!userId) return

    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()

      // 이번 달의 첫 날과 마지막 날
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      // 캘린더 시작일 (이전 달 포함)
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay())

      // 캘린더 종료일 (다음 달 포함)
      const endDate = new Date(lastDay)
      endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

      // 거래 내역 가져오기
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("id, date, place, total_amount")
        .eq("user_id", userId)
        .gte("date", formatDateKey(startDate))
        .lte("date", formatDateKey(endDate))
        .order("date")

      if (error) throw error

      // 날짜별로 거래 그룹화
      const transactionsByDate = new Map<string, DayTransaction[]>()
      transactions?.forEach((t) => {
        const dateKey = t.date
        if (!transactionsByDate.has(dateKey)) {
          transactionsByDate.set(dateKey, [])
        }
        transactionsByDate.get(dateKey)!.push({
          id: t.id,
          place: t.place,
          total_amount: t.total_amount,
        })
      })

      // 캘린더 날짜 배열 생성
      const days: CalendarDay[] = []
      const current = new Date(startDate)

      while (current <= endDate) {
        const dateKey = formatDateKey(current)
        const dayTransactions = transactionsByDate.get(dateKey) || []
        const totalAmount = dayTransactions.reduce((sum, t) => sum + t.total_amount, 0)

        days.push({
          date: new Date(current),
          isCurrentMonth: current.getMonth() === month,
          transactions: dayTransactions,
          totalAmount,
        })

        current.setDate(current.getDate() + 1)
      }

      setCalendarDays(days)
    } catch (error) {
      console.error("Error loading calendar data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day.date)
    setSelectedDayTransactions(day.transactions)
  }

  const handleAddTransaction = (date: Date) => {
    const dateString = formatDateKey(date)
    router.push(`/manual-entry?date=${dateString}`)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const formatMonth = () => {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
    }).format(currentDate)
  }

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"]

  if (!userId) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            캘린더
          </h1>
          <button
            onClick={handleToday}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            오늘
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          날짜별로 지출 내역을 확인하고 추가하세요.
        </p>

        {/* 월 네비게이션 */}
        <div className="mt-8 flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            onClick={handlePreviousMonth}
            className="rounded-lg p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {formatMonth()}
          </h2>
          <button
            onClick={handleNextMonth}
            className="rounded-lg p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 캘린더 그리드 */}
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {loading ? (
            <div className="py-12 text-center text-sm text-zinc-600 dark:text-zinc-400">
              로딩 중...
            </div>
          ) : (
            <>
              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                {weekDays.map((day, index) => (
                  <div
                    key={day}
                    className={`text-center text-sm font-semibold ${
                      index === 0
                        ? "text-red-600 dark:text-red-400"
                        : index === 6
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-900 dark:text-zinc-50"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className="mt-2 grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => handleDayClick(day)}
                    className={`min-h-[100px] rounded-lg border p-2 text-left transition-all hover:border-zinc-400 dark:hover:border-zinc-600 ${
                      day.isCurrentMonth
                        ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                        : "border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                    } ${
                      isToday(day.date)
                        ? "ring-2 ring-zinc-900 dark:ring-zinc-50"
                        : ""
                    } ${
                      selectedDate?.toDateString() === day.date.toDateString()
                        ? "border-zinc-900 dark:border-zinc-50"
                        : ""
                    }`}
                  >
                    <div
                      className={`text-sm font-semibold ${
                        day.isCurrentMonth
                          ? "text-zinc-900 dark:text-zinc-50"
                          : "text-zinc-400 dark:text-zinc-600"
                      } ${isToday(day.date) ? "text-zinc-900 dark:text-zinc-50" : ""}`}
                    >
                      {day.date.getDate()}
                    </div>
                    {day.totalAmount > 0 && (
                      <div className="mt-1">
                        <div className="rounded bg-red-100 px-1 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
                          {day.totalAmount.toLocaleString()}원
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                          {day.transactions.length}건
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 선택된 날짜의 거래 내역 */}
        {selectedDate && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {new Intl.DateTimeFormat("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                }).format(selectedDate)}
              </h3>
              <button
                onClick={() => handleAddTransaction(selectedDate)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                + 거래 추가
              </button>
            </div>

            {selectedDayTransactions.length === 0 ? (
              <div className="mt-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
                이 날짜에는 거래 내역이 없습니다.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {selectedDayTransactions.map((transaction) => (
                  <button
                    key={transaction.id}
                    onClick={() => router.push("/transactions")}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-left transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {transaction.place}
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {transaction.total_amount.toLocaleString()}원
                    </span>
                  </button>
                ))}
                <div className="mt-4 border-t border-zinc-200 pt-3 text-right dark:border-zinc-700">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">총 지출: </span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {selectedDayTransactions
                      .reduce((sum, t) => sum + t.total_amount, 0)
                      .toLocaleString()}
                    원
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
