import { createAgent, tool, toolStrategy } from "langchain";
import { ChatDeepSeek } from "@langchain/deepseek";
//zod 标准化输出帮你校验
import * as z from "zod";

const RecommendationSchema = z.object({
  id: z.string().describe("推荐系列ID"),
  name: z.string().describe("推荐系列名称"),
  reason: z.string().describe("推荐理由"),
});

const model = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0.3,
});

export function createRecommendationAgentLangChain({ getAllSeriesFromDb }) {
  const getAllSeriesTool = tool(
    async () => {
      const series = await getAllSeriesFromDb();
      return { series };
    },
    {
      name: "get_all_series",
      description:
        "获取当前所有盲盒系列信息，包括系列ID、名称、价格、简介、隐藏款提示、款式列表等",
      schema: z.object({}),
    }
  );

  const agent = createAgent({
    model,
    tools: [getAllSeriesTool],
    systemPrompt: `
你是一个盲盒推荐顾问。
你可以在需要时调用工具获取盲盒系列数据。
你的目标是基于用户预算、风格偏好、是否想追隐藏款，推荐一个最合适的系列。
输出必须严格符合给定 schema，不要输出多余字段。
`,
    responseFormat: toolStrategy(RecommendationSchema),
  });

  return async function recommendationAgentLangChain({
    budget,
    style,
    wantHidden,
  }) {
    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: `
请根据用户需求推荐一个最合适的盲盒系列。

【用户信息】
- 预算：${budget ?? "未提供"}
- 风格偏好：${style || "未提供"}
- 是否想追隐藏款：${wantHidden ? "是" : "否"}

【任务要求】
1. 如有需要，你可以调用 get_all_series 工具；
2. 推荐结果必须结合真实系列数据；
3. reason 要简洁、具体，说明为什么它适合该用户；
4. 不要输出 schema 以外的字段。
`,
        },
      ],
    });

    if (!result.structuredResponse) {
      throw new Error("LangChain Agent 没有返回 structuredResponse");
    }

    return result.structuredResponse;
  };
}
