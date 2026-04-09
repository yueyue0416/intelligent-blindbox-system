import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import * as z from "zod";
//langgraph升级
const SupervisorState = new StateSchema({
  budget: z.number().optional(),
  style: z.string().optional(),
  wantHidden: z.boolean().optional(),
  question: z.string().optional(),

  recommendation: z.any().optional(),
  answer: z.string().optional(),
  resultType: z.string().optional(),
});

export function createSupervisorGraph({ recommendationAgent, ruleAgent }) {
  // 1) 推荐节点
  const recommendNode = async (state) => {
    const recommendation = await recommendationAgent({
      budget: state.budget,
      style: state.style,
      wantHidden: state.wantHidden,
    });

    return { recommendation };
  };

  // 2) 解释节点
  const explainNode = async (state) => {
    const answerResult = await ruleAgent({
      question: state.question,
      recommendation: state.recommendation,
    });

    return {
      answer: answerResult.answer ?? answerResult,
    };
  };

  // 3) 纯推荐收尾节点
  const finalizeRecommendationNode = async () => {
    return {
      resultType: "recommendation",
    };
  };

  // 4) 推荐+解释收尾节点
  const finalizeExplanationNode = async () => {
    return {
      resultType: "recommendation_with_explanation",
    };
  };

  // 5) 条件边：推荐完之后决定下一步去哪
  const routeAfterRecommend = (state) => {
    if (state.question && state.question.trim()) {
      return "explain";
    }
    return "finalizeRecommendation";
  };

  const graph = new StateGraph(SupervisorState)
    .addNode("recommend", recommendNode)
    .addNode("explain", explainNode)
    .addNode("finalizeRecommendation", finalizeRecommendationNode)
    .addNode("finalizeExplanation", finalizeExplanationNode)
    .addEdge(START, "recommend")
    .addConditionalEdges("recommend", routeAfterRecommend, [
      "explain",
      "finalizeRecommendation",
    ])
    .addEdge("explain", "finalizeExplanation")
    .addEdge("finalizeRecommendation", END)
    .addEdge("finalizeExplanation", END)
    .compile();

  return graph;
}
