"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "../components/Navigation"
import { supabase } from "@/lib/supabase"

interface Category {
  id: string
  user_id: string
  name: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
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
    loadCategories(session.user.id)
  }

  const loadCategories = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", uid)
        .order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error loading categories:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !userId) return

    if (categories.some((c) => c.name === newCategory.trim())) {
      alert("이미 존재하는 카테고리입니다.")
      return
    }

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert([
          {
            user_id: userId,
            name: newCategory.trim(),
          },
        ])
        .select()

      if (error) {
        console.error("Supabase error details:", error)
        alert(`카테고리 추가 실패: ${error.message}`)
        return
      }

      if (data) {
        setCategories([...categories, ...data])
        setNewCategory("")
        alert("카테고리가 추가되었습니다!")
      }
    } catch (error) {
      console.error("Error adding category:", error)
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류"
      alert(`카테고리 추가 실패: ${errorMessage}`)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id)

      if (error) throw error

      setCategories(categories.filter((c) => c.id !== id))
    } catch (error) {
      console.error("Error deleting category:", error)
      alert("카테고리 삭제 실패")
    }
  }

  if (!userId) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navigation />

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          카테고리 관리
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          지출 카테고리를 추가하고 관리하세요.
        </p>

        {/* 카테고리 추가 폼 */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            새 카테고리 추가
          </h2>
          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
              placeholder="카테고리 이름 (예: 외식, 취미)"
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-50"
            />
            <button
              onClick={handleAddCategory}
              className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              추가
            </button>
          </div>
        </div>

        {/* 카테고리 목록 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            카테고리 목록
          </h2>
          {loading ? (
            <div className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
              로딩 중...
            </div>
          ) : categories.length === 0 ? (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                아직 카테고리가 없습니다. 위에서 추가해보세요!
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {category.name}
                  </span>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-zinc-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
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
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
