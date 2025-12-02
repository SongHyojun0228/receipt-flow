import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { period, stats, totalAmount, viewMode } = body

    if (!stats || stats.length === 0) {
      return NextResponse.json(
        { error: "분석할 데이터가 없습니다" },
        { status: 400 }
      )
    }

    // Claude에게 전달할 프롬프트 생성
    const prompt = `당신은 가계부 분석 전문가입니다. 다음 ${viewMode === "weekly" ? "주간" : "월간"} 지출 데이터를 분석하고 인사이트를 제공해주세요.

**기간**: ${period}
**총 지출**: ${totalAmount.toLocaleString()}원

**카테고리별 지출:**
${stats.map((stat: { categoryName: string; totalAmount: number; itemCount: number; percentage: number }) =>
  `- ${stat.categoryName}: ${stat.totalAmount.toLocaleString()}원 (${stat.percentage.toFixed(1)}%, ${stat.itemCount}건)`
).join('\n')}

다음 항목들을 포함하여 한국어로 상세히 분석해주세요:

1. **전체 지출 패턴 분석**
   - 총 지출 금액에 대한 평가 (많은지, 적절한지)
   - ${viewMode === "weekly" ? "주간" : "월간"} 지출로서 적정 수준인지

2. **카테고리별 분석**
   - 가장 많이 지출한 카테고리와 그 이유 추정
   - 각 카테고리 지출이 합리적인지 평가
   - 이상 지출 패턴 감지 (너무 높거나 낮은 항목)

3. **절약 제안**
   - 줄일 수 있는 지출 카테고리
   - 구체적인 절약 방법 3가지

4. **예산 추천**
   - 다음 ${viewMode === "weekly" ? "주" : "달"}에 적정한 총 예산
   - 카테고리별 권장 예산 배분

5. **종합 평가**
   - 전반적인 소비 습관 평가
   - 개선이 필요한 부분

응답은 이모지를 적절히 활용하여 읽기 쉽게 작성해주세요. 마크다운 형식으로 작성하되, 각 섹션을 명확히 구분해주세요.`

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const analysis = message.content[0].type === "text" ? message.content[0].text : ""

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Claude API Error:", error)
    return NextResponse.json(
      { error: "AI 분석 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
