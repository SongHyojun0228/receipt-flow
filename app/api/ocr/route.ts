import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "파일이 없습니다" },
        { status: 400 }
      )
    }

    // Naver CLOVA OCR API 호출을 위한 FormData 생성
    const ocrFormData = new FormData()
    ocrFormData.append("file", file)

    // JSON 메시지 추가
    const message = {
      version: "V2",
      requestId: `receipt-${Date.now()}`,
      timestamp: Date.now(),
      images: [
        {
          format: file.type.split("/")[1] || "jpg",
          name: "receipt",
        },
      ],
    }
    ocrFormData.append("message", JSON.stringify(message))

    // Naver CLOVA OCR API 호출
    const response = await fetch(process.env.NEXT_PUBLIC_NAVER_OCR_URL!, {
      method: "POST",
      headers: {
        "X-OCR-SECRET": process.env.NEXT_PUBLIC_NAVER_OCR_SECRET_KEY!,
      },
      body: ocrFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Naver OCR Error:", errorText)
      return NextResponse.json(
        { error: "OCR API 호출 실패", details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("OCR API Error:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
