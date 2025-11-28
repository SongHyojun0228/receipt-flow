"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "../components/Navigation"
import { supabase } from "@/lib/supabase"

interface TransactionItem {
  id: string
  product_name: string
  amount: number
  price_per_unit: number
  total_price: number
  category_id: string | null
  category?: {
    name: string
  }
}

interface Transaction {
  id: string
  date: string
  place: string
  total_amount: number
  receipt_url: string
  items: TransactionItem[]
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push("/login")
      return
    }
    setUserId(session.user.id)
    loadTransactions(session.user.id)
  }

  const loadTransactions = async (uid: string) => {
    try {
      // 1. 거래 내역 가져오기
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", uid)
        .order("date", { ascending: false })

      if (transactionsError) throw transactionsError

      // 2. 각 거래의 아이템들과 카테고리 정보 가져오기
      const transactionsWithItems = await Promise.all(
        (transactionsData || []).map(async (transaction) => {
          const { data: items, error: itemsError } = await supabase
            .from("transaction_items")
            .select(`
              *,
              category:categories(name)
            `)
            .eq("transaction_id", transaction.id)

          if (itemsError) throw itemsError

          return {
            ...transaction,
            items: items || [],
          }
        })
      )

      setTransactions(transactionsWithItems)
    } catch (error) {
      console.error("Error loading transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date)
  }

  if (!userId) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          거래 내역
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          저장된 모든 영수증과 거래 내역을 확인하세요.
        </p>

        {loading ? (
          <div className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            로딩 중...
          </div>
        ) : transactions.length === 0 ? (
          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              아직 거래 내역이 없습니다.
            </p>
            <a
              href="/manual-entry"
              className="mt-4 inline-block rounded-lg bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              첫 거래 입력하기
            </a>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <button
                  onClick={() => toggleExpand(transaction.id)}
                  className="w-full p-6 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                          {transaction.place}
                        </h3>
                        {!transaction.receipt_url && (
                          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            수기입력
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {formatDate(transaction.date)}
                      </p>
                      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
                        {transaction.items.length}개 품목
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                        {transaction.total_amount.toLocaleString()}원
                      </p>
                      <svg
                        className={`mt-2 h-5 w-5 text-zinc-400 transition-transform ${
                          expandedId === transaction.id ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </button>

                {expandedId === transaction.id && (
                  <div className="border-t border-zinc-200 p-6 dark:border-zinc-800">
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      품목 내역
                    </h4>
                    <div className="space-y-2">
                      {transaction.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {item.product_name}
                              </span>
                              {item.category && (
                                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                                  {item.category.name}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                              {item.price_per_unit.toLocaleString()}원 × {item.amount}개
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {item.total_price.toLocaleString()}원
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
