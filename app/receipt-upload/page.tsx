"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Navigation from "../components/Navigation"
import { supabase } from "@/lib/supabase"
import { createWorker } from "tesseract.js"

interface ExtractedData {
  place?: string
  date?: string
  items: Array<{
    productName: string
    amount: number
    pricePerUnit: number
  }>
  totalAmount?: number
}

export default function ReceiptUploadPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [extractedText, setExtractedText] = useState<string>("")
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
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
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 업로드할 수 있습니다.")
        return
      }
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setExtractedText("")
      setExtractedData(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setExtractedText("")
      setExtractedData(null)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const processOCR = async () => {
    if (!selectedFile || !userId) return

    setIsProcessing(true)
    setOcrProgress(0)

    try {
      // OCR 처리
      const worker = await createWorker("kor", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100))
          }
        },
      })

      const { data: { text } } = await worker.recognize(selectedFile)
      await worker.terminate()

      setExtractedText(text)

      // 텍스트 파싱
      const parsed = parseReceiptText(text)
      setExtractedData(parsed)

      // Supabase Storage에 이미지 업로드
      // 파일 확장자 추출
      const fileExtension = selectedFile.name.split('.').pop() || 'jpg'
      // URL-safe한 파일명 생성 (한글 등 특수문자 제거)
      const fileName = `${userId}/${Date.now()}.${fileExtension}`
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName)

      // 추출된 데이터와 이미지 URL을 세션 스토리지에 저장
      sessionStorage.setItem(
        "receiptData",
        JSON.stringify({
          ...parsed,
          receiptUrl: publicUrl,
        })
      )

      alert("영수증 분석이 완료되었습니다!")
    } catch (error) {
      console.error("OCR Error:", error)
      alert("영수증 처리 중 오류가 발생했습니다.")
    } finally {
      setIsProcessing(false)
      setOcrProgress(0)
    }
  }

  const parseReceiptText = (text: string): ExtractedData => {
    const lines = text.split("\n").filter((line) => line.trim())

    let place = ""
    let date = ""
    let totalAmount = 0
    const items: Array<{ productName: string; amount: number; pricePerUnit: number }> = []

    // 날짜 찾기 (YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD 형식)
    const dateRegex = /(\d{4}[-./]\d{1,2}[-./]\d{1,2})/
    const dateMatch = text.match(dateRegex)
    if (dateMatch) {
      date = dateMatch[1].replace(/[./]/g, "-")
    }

    // 장소 찾기 (주요 마트/매장 이름 패턴)
    const storePatterns = [
      /이마트\s*([^\n]*점)?/i,
      /롯데마트\s*([^\n]*점)?/i,
      /홈플러스\s*([^\n]*점)?/i,
      /GS25/i,
      /CU/i,
      /세븐일레븐/i,
      /올리브영/i,
      /다이소/i,
      /스타벅스/i,
      /맥도날드/i,
    ]

    for (const pattern of storePatterns) {
      const storeMatch = text.match(pattern)
      if (storeMatch) {
        place = storeMatch[0].trim()
        break
      }
    }

    // 장소를 찾지 못한 경우, 한글이 포함된 첫 번째 짧은 줄을 장소로 추정
    if (!place) {
      for (const line of lines) {
        if (line.length < 30 && /[가-힣]/.test(line) && !line.match(/\d{4}[-./]\d{1,2}[-./]\d{1,2}/)) {
          place = line.trim()
          break
        }
      }
    }

    // 품목 추출: 상품코드 + 상품명 + 가격 패턴
    // 예: "001 A3리필속지(20매) 1,300 2 2,600"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 제외할 패턴: 주소, 전화번호, 사업자번호, URL 등
      if (
        line.includes("http") ||
        line.includes("www") ||
        line.includes("주소") ||
        line.includes("전화") ||
        line.includes("사업자") ||
        line.includes("대표") ||
        line.match(/\d{2,3}-\d{3,4}-\d{4}/) || // 전화번호
        line.match(/\d{3}-\d{2}-\d{5}/) || // 사업자번호
        line.includes("고양시") ||
        line.includes("등 톡") ||
        line.includes("번호") ||
        line.includes("영수증") ||
        line.includes("합계") ||
        line.includes("총액") ||
        line.includes("부가세")
      ) {
        continue
      }

      // 상품 패턴: 숫자(상품코드) + 한글/영문(상품명) + 금액 여러 개
      // 또는: 한글/영문(상품명) + 바코드번호 + 금액
      const productPattern1 = /^(\d{3})\s+(.+?)\s+(\d{1,3}(?:,\d{3})*)\s+(\d+)\s+(\d{1,3}(?:,\d{3})*)$/
      const productPattern2 = /^[+*]?(\d{10,})\s*\.?\s*(\d{1,3}(?:,\d{3})*)\s+(\d+)\s+(\d{1,3}(?:,\d{3})*)$/

      const match1 = line.match(productPattern1)
      if (match1) {
        const productName = match1[2].trim()
        const pricePerUnit = parseInt(match1[3].replace(/,/g, ""))
        const amount = parseInt(match1[4])

        if (productName && pricePerUnit > 0 && amount > 0) {
          items.push({
            productName,
            amount,
            pricePerUnit,
          })
        }
        continue
      }

      // 이전 줄에 상품명이 있고, 현재 줄에 바코드+금액 패턴
      const match2 = line.match(productPattern2)
      if (match2 && i > 0) {
        const prevLine = lines[i - 1]
        const productName = prevLine.replace(/^\d{3}\s+/, "").trim()
        const pricePerUnit = parseInt(match2[2].replace(/,/g, ""))
        const amount = parseInt(match2[3])

        if (productName && /[가-힣a-zA-Z]/.test(productName) && pricePerUnit > 0) {
          // 중복 체크
          if (!items.find(item => item.productName === productName)) {
            items.push({
              productName,
              amount,
              pricePerUnit,
            })
          }
        }
      }
    }

    // 총액 찾기: "합계", "총액", 가장 큰 금액 등
    const totalPattern = /(?:합계|총액|total)[:\s]*(\d{1,3}(?:,\d{3})*)/i
    const totalMatch = text.match(totalPattern)
    if (totalMatch) {
      totalAmount = parseInt(totalMatch[1].replace(/,/g, ""))
    } else {
      // 품목의 총합으로 계산
      totalAmount = items.reduce((sum, item) => sum + item.amount * item.pricePerUnit, 0)
    }

    return {
      place: place || "영수증 업로드",
      date: date || new Date().toISOString().split("T")[0],
      items: items.length > 0 ? items : [{ productName: "", amount: 1, pricePerUnit: 0 }],
      totalAmount,
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
          영수증 업로드
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          영수증 이미지를 업로드하면 자동으로 내용을 인식합니다.
        </p>

        {/* 파일 업로드 영역 */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-12 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
          >
            {previewUrl ? (
              <div className="w-full">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="mx-auto max-h-96 rounded-lg object-contain"
                />
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setPreviewUrl(null)
                    setExtractedText("")
                    setExtractedData(null)
                  }}
                  className="mt-4 w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
                >
                  다른 이미지 선택
                </button>
              </div>
            ) : (
              <>
                <svg
                  className="h-12 w-12 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                  클릭하거나 드래그하여 영수증 이미지를 업로드하세요
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  PNG, JPG, JPEG (최대 10MB)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="mt-4 cursor-pointer rounded-lg bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  파일 선택
                </label>
              </>
            )}
          </div>

          {/* OCR 처리 버튼 */}
          {selectedFile && !isProcessing && (
            <button
              onClick={processOCR}
              className="mt-6 w-full rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              영수증 분석하기
            </button>
          )}

          {/* 처리 중 상태 */}
          {isProcessing && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                <span>영수증 분석 중...</span>
                <span>{ocrProgress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full bg-zinc-900 transition-all dark:bg-zinc-50"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 추출된 텍스트 미리보기 */}
        {extractedText && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              추출된 텍스트
            </h2>
            <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-zinc-50 p-4 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {extractedText}
            </pre>
          </div>
        )}

        {/* 파싱된 데이터 미리보기 */}
        {extractedData && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              인식된 정보
            </h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">장소:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {extractedData.place}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">날짜:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {extractedData.date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">품목 수:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {extractedData.items.length}개
                </span>
              </div>

              {/* 품목 상세 */}
              {extractedData.items.length > 0 && (
                <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                  <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    추출된 품목:
                  </h3>
                  <div className="space-y-2">
                    {extractedData.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {item.productName}
                        </span>
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {item.pricePerUnit.toLocaleString()}원 x {item.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {extractedData.totalAmount !== undefined && (
                <div className="flex justify-between border-t border-zinc-200 pt-2 dark:border-zinc-700">
                  <span className="text-zinc-600 dark:text-zinc-400">총액:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-50">
                    {extractedData.totalAmount.toLocaleString()}원
                  </span>
                </div>
              )}
            </div>

            {/* 수기입력으로 이동 버튼 */}
            <button
              onClick={() => router.push("/manual-entry")}
              className="mt-6 w-full rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              수기입력으로 이동하기
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
