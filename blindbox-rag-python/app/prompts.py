# app/prompts.py

from typing import Optional, Dict


def build_ask_prompt(
    question: str,
    context_text: str,
    recommendation: Optional[Dict] = None
) -> str:
    """
    构造发给大模型的问答 prompt。

    参数说明：
    - question: 用户问题
    - context_text: 检索到的资料拼接结果
    - recommendation: 当前推荐结果（可选）
      如果是普通规则问答，可以传 None
      如果是“为什么推荐这个系列”这种解释类问题，可以把推荐结果传进来

    为什么要单独写这个函数？
    因为 prompt 本身也是业务逻辑的一部分：
    1. 要告诉模型它是什么角色
    2. 要告诉模型只能根据资料回答
    3. 要定义输出格式
    4. 要控制模型不要乱发挥

    所以 prompt 应该单独管理，而不是散落在接口代码里。
    """

    # 默认没有推荐结果时，这一段为空
    recommendation_text = ""

    # 如果有 recommendation，就把它拼到 prompt 中
    # 这样模型在做“推荐解释”时能看到当前推荐对象
    if recommendation:
        recommendation_text = (
            f"\n【当前推荐结果】\n"
            f"推荐系列：{recommendation.get('name', '')}\n"
            f"推荐理由：{recommendation.get('reason', '')}\n"
        )

    # 用 f-string 拼接一个多行字符串
    # 这是 Python 里很常见的 prompt 构造方式
    prompt = f"""
    你是一个盲盒规则解释助手。请严格基于给定资料回答问题，不要脱离资料自由发挥。

    【用户问题】
    {question}
    {recommendation_text}

    【检索到的资料】
    {context_text}

    【要求】
    1. 如果资料中已经包含问题的直接答案，请直接总结并回答
    2. 只基于资料回答，不要补充资料外信息
    3. 只有在资料确实无法回答问题时，才说“当前资料不足以完整回答该问题”
    4. 回答尽量简洁清楚
    5. 输出 JSON，格式如下：
    {{
      "answer": "你的回答"
    }}
    """

    # strip() 去掉多余首尾空白，让 prompt 更干净
    return prompt.strip()