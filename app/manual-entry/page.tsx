"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Navigation from "../components/Navigation"
import { supabase } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

interface TransactionItem {
  productName: string
  amount: number
  pricePerUnit: number
  categoryId: string
}

interface Category {
  id: string
  name: string
}

export default function ManualEntryPage() {
  const searchParams = useSearchParams()
  const dateParam = searchParams.get("date")
  const [date, setDate] = useState(dateParam || new Date().toISOString().split("T")[0])
  const [place, setPlace] = useState("")
  const [items, setItems] = useState<TransactionItem[]>([
    { productName: "", amount: 1, pricePerUnit: 0, categoryId: "" },
  ])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (dateParam) {
      setDate(dateParam)
    }
  }, [dateParam])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push("/login")
      return
    }
    setUserId(session.user.id)
    loadCategories(session.user.id)
  }

  const loadCategories = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", uid)
        .order("name")

      if (error) throw error
      setCategories(data || [])

      // 첫 번째 카테고리를 기본값으로 설정
      if (data && data.length > 0) {
        setItems([
          {
            productName: "",
            amount: 1,
            pricePerUnit: 0,
            categoryId: data[0].id,
          },
        ])
      }
    } catch (error) {
      console.error("Error loading categories:", error)
    }
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productName: "",
        amount: 1,
        pricePerUnit: 0,
        categoryId: categories[0]?.id || "",
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (
    index: number,
    field: keyof TransactionItem,
    value: string | number
  ) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const getTotalAmount = () => {
    return items.reduce(
      (sum, item) => sum + item.amount * item.pricePerUnit,
      0
    )
  }

  const handleSubmit = async () => {
    if (!userId) {
      alert("로그인이 필요합니다.")
      router.push("/login")
      return
    }

    // 유효성 검사
    if (!place.trim()) {
      alert("장소를 입력해주세요.")
      return
    }

    if (items.some((item) => !item.productName.trim())) {
      alert("모든 품목의 상품명을 입력해주세요.")
      return
    }

    if (items.some((item) => item.pricePerUnit <= 0)) {
      alert("모든 품목의 가격을 입력해주세요.")
      return
    }

    setLoading(true)

    try {
      // 1. 거래 저장
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            user_id: userId,
            date,
            place: place.trim(),
            total_amount: getTotalAmount(),
            receipt_url: "", // 수기입력이므로 빈 문자열
          },
        ])
        .select()
        .single()

      if (transactionError) throw transactionError

      // 2. 품목들 저장
      const transactionItems = items.map((item) => ({
        transaction_id: transaction.id,
        product_name: item.productName.trim(),
        amount: item.amount,
        price_per_unit: item.pricePerUnit,
        total_price: item.amount * item.pricePerUnit,
        category_id: item.categoryId || null,
        is_manual_entry: true,
      }))

      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(transactionItems)

      if (itemsError) throw itemsError

      alert("거래가 저장되었습니다!")
      router.push("/transactions")
    } catch (error) {
      console.error("Error saving transaction:", error)
      alert("저장 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  if (!userId) {
    return null
  }

  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Navigation />
        <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              먼저 카테고리를 추가해주세요.
            </p>
            <a
              href="/categories"
              className="mt-4 inline-block rounded-lg bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              카테고리 관리로 이동
            </a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          수기 입력
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          영수증 정보를 직접 입력하세요.
        </p>

        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          {/* 날짜 & 장소 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                날짜
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                장소
              </label>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="예: 이마트, 스타벅스"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-50"
              />
            </div>
          </div>

          {/* 품목 목록 */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                품목
              </label>
              <button
                onClick={handleAddItem}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                + 품목 추가
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <div className="space-y-3">
                    {/* 상품명 */}
                    <div>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) =>
                          handleItemChange(index, "productName", e.target.value)
                        }
                        placeholder="상품명"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50 dark:focus:border-zinc-50"
                      />
                    </div>

                    {/* 수량, 단가, 카테고리 */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "amount",
                              parseInt(e.target.value) || 1
                            )
                          }
                          placeholder="수량"
                          min="1"
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50 dark:focus:border-zinc-50"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={item.pricePerUnit}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "pricePerUnit",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="단가"
                          min="0"
                          step="100"
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50 dark:focus:border-zinc-50"
                        />
                      </div>
                      <div>
                        <select
                          value={item.categoryId}
                          onChange={(e) =>
                            handleItemChange(index, "categoryId", e.target.value)
                          }
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50 dark:focus:border-zinc-50"
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 소계와 삭제 버튼 */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        소계: {(item.amount * item.pricePerUnit).toLocaleString()}원
                      </div>
                      {items.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-700 dark:hover:text-red-400"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 총액 & 저장 버튼 */}
          <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-700">
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              총액: {getTotalAmount().toLocaleString()}원
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
