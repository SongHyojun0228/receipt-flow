"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "../components/Navigation"
import { supabase } from "@/lib/supabase"

interface Category {
  id: string
  name: string
}

interface Budget {
  id: string
  period_type: "weekly" | "monthly"
  category_id: string | null
  category_name: string
  amount: number
  start_date: string
}

type PeriodType = "weekly" | "monthly"

export default function BudgetsPage() {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly")
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [editingBudget, setEditingBudget] = useState<{
    categoryId: string | null
    amount: string
  } | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (userId) {
      loadCategories()
      loadBudgets()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, periodType])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push("/login")
      return
    }
    setUserId(session.user.id)
  }

  const loadCategories = async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", userId)
        .order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error loading categories:", error)
    }
  }

  const getCurrentPeriodStart = (): string => {
    const now = new Date()
    if (periodType === "weekly") {
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

    setLoading(true)
    try {
      const startDate = getCurrentPeriodStart()

      const { data, error } = await supabase
        .from("budgets")
        .select(`
          id,
          period_type,
          category_id,
          amount,
          start_date,
          category:categories(name)
        `)
        .eq("user_id", userId)
        .eq("period_type", periodType)
        .eq("start_date", startDate)

      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedBudgets: Budget[] = (data || []).map((budget: any) => ({
        id: budget.id,
        period_type: budget.period_type,
        category_id: budget.category_id,
        category_name: budget.category?.name || "전체",
        amount: budget.amount,
        start_date: budget.start_date,
      }))

      setBudgets(formattedBudgets)
    } catch (error) {
      console.error("Error loading budgets:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveBudget = async () => {
    if (!userId || !editingBudget) return

    try {
      const startDate = getCurrentPeriodStart()
      const amount = parseFloat(editingBudget.amount)

      if (isNaN(amount) || amount < 0) {
        alert("올바른 금액을 입력하세요")
        return
      }

      // Check if budget already exists
      const existingBudget = budgets.find(
        (b) => b.category_id === editingBudget.categoryId
      )

      if (existingBudget) {
        // Update existing budget
        const { error } = await supabase
          .from("budgets")
          .update({ amount })
          .eq("id", existingBudget.id)

        if (error) throw error
      } else {
        // Insert new budget
        const { error } = await supabase.from("budgets").insert({
          user_id: userId,
          period_type: periodType,
          category_id: editingBudget.categoryId,
          amount,
          start_date: startDate,
        })

        if (error) throw error
      }

      setEditingBudget(null)
      loadBudgets()
    } catch (error) {
      console.error("Error saving budget:", error)
      alert("예산 저장 중 오류가 발생했습니다")
    }
  }

  const deleteBudget = async (budgetId: string) => {
    if (!confirm("이 예산을 삭제하시겠습니까?")) return

    try {
      const { error } = await supabase.from("budgets").delete().eq("id", budgetId)

      if (error) throw error
      loadBudgets()
    } catch (error) {
      console.error("Error deleting budget:", error)
      alert("예산 삭제 중 오류가 발생했습니다")
    }
  }

  const getBudgetForCategory = (categoryId: string | null): Budget | undefined => {
    return budgets.find((b) => b.category_id === categoryId)
  }

  const openEditModal = (categoryId: string | null) => {
    const existing = getBudgetForCategory(categoryId)
    setEditingBudget({
      categoryId,
      amount: existing ? existing.amount.toString() : "",
    })
  }

  if (!userId) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">예산 설정</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          주간/월간 예산을 설정하고 지출을 관리하세요.
        </p>

        {/* Period Type Selection */}
        <div className="mt-8 flex gap-2">
          <button
            onClick={() => setPeriodType("weekly")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              periodType === "weekly"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            주간
          </button>
          <button
            onClick={() => setPeriodType("monthly")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              periodType === "monthly"
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            월간
          </button>
        </div>

        {/* Overall Budget */}
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            전체 예산
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {periodType === "weekly" ? "이번 주" : "이번 달"} 전체 지출 예산
          </p>

          {loading ? (
            <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">로딩 중...</div>
          ) : (
            <div className="mt-4">
              {getBudgetForCategory(null) ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {getBudgetForCategory(null)!.amount.toLocaleString()}원
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(null)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => deleteBudget(getBudgetForCategory(null)!.id)}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => openEditModal(null)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  예산 설정하기
                </button>
              )}
            </div>
          )}
        </div>

        {/* Category Budgets */}
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            카테고리별 예산
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            각 카테고리별로 세부 예산을 설정하세요
          </p>

          {loading ? (
            <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">로딩 중...</div>
          ) : categories.length === 0 ? (
            <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
              카테고리가 없습니다. 먼저 카테고리를 만들어주세요.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {categories.map((category) => {
                const budget = getBudgetForCategory(category.id)
                return (
                  <div
                    key={category.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {category.name}
                      </p>
                      {budget && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {budget.amount.toLocaleString()}원
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {budget ? (
                        <>
                          <button
                            onClick={() => openEditModal(category.id)}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => deleteBudget(budget.id)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                          >
                            삭제
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openEditModal(category.id)}
                          className="rounded-lg bg-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        >
                          설정
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 dark:bg-zinc-900">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              예산 {getBudgetForCategory(editingBudget.categoryId) ? "수정" : "설정"}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {editingBudget.categoryId
                ? categories.find((c) => c.id === editingBudget.categoryId)?.name
                : "전체"}{" "}
              카테고리의 {periodType === "weekly" ? "주간" : "월간"} 예산을 입력하세요.
            </p>

            <div className="mt-6">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                예산 금액 (원)
              </label>
              <input
                type="number"
                value={editingBudget.amount}
                onChange={(e) =>
                  setEditingBudget({ ...editingBudget, amount: e.target.value })
                }
                placeholder="예: 500000"
                className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={saveBudget}
                className="flex-1 rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700"
              >
                저장
              </button>
              <button
                onClick={() => setEditingBudget(null)}
                className="flex-1 rounded-lg bg-zinc-200 py-2 font-semibold text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
