"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { signOut } from "@/lib/auth"

export default function Navigation() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    // 현재 사용자 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Receipt Flow
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              홈
            </Link>
            {user && (
              <>
                <Link
                  href="/receipt-upload"
                  className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  영수증업로드
                </Link>
                <Link
                  href="/manual-entry"
                  className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  수기입력
                </Link>
                <Link
                  href="/calendar"
                  className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  캘린더
                </Link>
                <Link
                  href="/transactions"
                  className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  거래내역
                </Link>
                <Link
                  href="/categories"
                  className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  카테고리
                </Link>
                <Link
                  href="/analytics"
                  className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  통계
                </Link>
              </>
            )}

            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
