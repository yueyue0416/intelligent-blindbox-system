from typing import List, Dict
def normalize_text(text: str) -> str:
    """
    对文本做归一化处理。

    为什么需要归一化？
    因为同一句话可能有不同写法：
    - 隐藏款定义：
    - 隐藏款定义:
    - 隐藏款 定义

    如果不先统一格式，后面匹配容易不稳定。

    这里做了几件事：
    1. 转小写
    2. 去掉常见中英文标点
    3. 去掉空格、换行、制表符
    """
    if not text:
        return ""

    # 定义要去掉的常见标点和空白字符
    punctuation = "，。！？；：、“”‘’（）()《》【】[],.!?;: \n\t"

    # 先统一转成小写
    result = text.lower()

    # 逐个去掉这些字符
    for ch in punctuation:
        result = result.replace(ch, "")

    # 最后再 strip 一下，去掉首尾空白
    return result.strip()

def remove_noise_words(text: str) -> str:
    """
    去掉问题里的低信息词，降低它们对检索的干扰。

    比如：
    “隐藏款是什么意思”
    真正有业务信息的通常是“隐藏款”，
    而“是什么意思”更多是在表达“这是定义类问题”。

    注意：
    这里不是把这些词完全无视，
    而是让“核心业务词”更突出。
    """
    noise_words = [
        "请问",
        "一下",
        "什么意思",
        "是什么",
        "怎么",
        "如何",
        "为什么",
        "有吗",
        "有没有",
        "吗",
        "呢",
    ]

    result = text
    for word in noise_words:
        result = result.replace(word, "")

    return result

def extract_phrases(question: str) -> List[str]:
    """
    从问题中提取 2~4 字短语。

    为什么这么做？
    - 单字匹配太粗
    - 整句匹配太严格
    - 2~4 字短语是比较适中的粒度

    例如：
    问题 = “隐藏款是什么意思”
    去噪后可能剩下 “隐藏款”
    最终可能提取出：
    - 隐藏款
    - 隐藏
    - 藏款

    返回值是一个字符串列表。
    """
    # 先做归一化
    normalized = normalize_text(question)

    # 再去掉低信息问题词
    normalized = remove_noise_words(normalized)

    # 用 set 去重，避免重复短语
    phrases = set()

    # 如果处理后还剩 2 个字以上，把整句也加入
    if len(normalized) >= 2:
        phrases.add(normalized)

    # 提取长度 2~4 的连续子串
    # 这里倒着从 4 到 2 提取，只是为了逻辑上先考虑更长片段
    for size in range(4, 1, -1):
        for i in range(0, len(normalized) - size + 1):
            sub = normalized[i:i + size]
            if len(sub) >= 2:
                phrases.add(sub)

    return list(phrases)
def get_file_bonus(question: str, file_name: str) -> int:
    """
    根据问题内容，对不同文档来源做一个简单加权。

    这是一种“业务规则增强检索”的做法。
    例如：
    - 问规则类问题，更偏向 rules.txt
    - 问推荐类问题，更偏向 faq.txt
    - 问系列介绍类问题，更偏向 series_intro.txt

    返回值是整数分数。
    """
    q = normalize_text(question)
    bonus = 0

    # 规则类问题更偏向 rules.txt
    if ("规则" in q or "隐藏款" in q or "抽盒" in q) and "rules" in file_name:
        bonus += 3

    # 推荐类问题更偏向 faq.txt
    if ("推荐" in q or "依据" in q or "为什么" in q) and "faq" in file_name:
        bonus += 3

    # 系列介绍类问题更偏向 series_intro.txt
    if ("适合谁" in q or "风格" in q or "系列" in q) and "series_intro" in file_name:
        bonus += 3

    return bonus
def score_chunk(question: str, chunk: Dict) -> Dict:
    """
    给单个 chunk 打分。

    输入：
    - question：用户问题
    - chunk：单个知识片段，例如
      {
          "file_name": "rules.txt",
          "text": "隐藏款定义：数量较少，出现概率更低，通常具有较高收藏价值。"
      }

    输出：
    {
        "score": 30,
        "matched_phrases": ["隐藏款", "定义类命中"],
        "reasons": ["短语命中(隐藏款) +9", "定义类问题命中定义句 +10"]
    }

    这样设计的好处：
    1. 后面可以按 score 排序
    2. matched_phrases 方便调试
    3. reasons 方便解释“为什么这条排前面”
    """
    # 原始问题归一化
    normalized_question = normalize_text(question)

    # 去噪后的问题，用于整句强匹配
    normalized_question_no_noise = remove_noise_words(normalized_question)

    # 当前 chunk 文本归一化
    normalized_chunk = normalize_text(chunk["text"])

    # 提取问题短语
    phrases = extract_phrases(question)

    # 初始化分数、命中短语、打分原因
    score = 0
    matched_phrases: List[str] = []
    reasons: List[str] = []

    # -----------------------------
    # 1. 整句强命中
    # -----------------------------
    # 如果“去噪后的整个问题”直接出现在 chunk 里，给高分
    # 例如：
    # 问题“隐藏款是什么意思”去噪后可能是“隐藏款”
    # 如果 chunk 里包含“隐藏款”，说明相关性很高
    if normalized_question_no_noise and normalized_question_no_noise in normalized_chunk:
        score += 20
        matched_phrases.append(normalized_question_no_noise)
        reasons.append("整句命中 +20")

    # -----------------------------
    # 2. 短语命中
    # -----------------------------
    # 对 2~4 字短语逐个匹配
    # 短语越长，得分越高（这里用长度平方）
    for phrase in phrases:
        if phrase in normalized_chunk:
            phrase_score = len(phrase) * len(phrase)
            score += phrase_score
            matched_phrases.append(phrase)
            reasons.append(f"短语命中({phrase}) +{phrase_score}")

    # 去重，避免同一短语重复记录
    matched_phrases = list(set(matched_phrases))

    # -----------------------------
    # 3. 文件类型加权
    # -----------------------------
    # 只有“已经有真实命中”时，才给文件加权
    # 避免某些完全不相关的句子，仅仅因为文件名对了就混进来
    if matched_phrases:
        bonus = get_file_bonus(question, chunk["file_name"])
        if bonus > 0:
            score += bonus
            reasons.append(f"文件加权({chunk['file_name']}) +{bonus}")

    # -----------------------------
    # 4. 定义类问题加权
    # -----------------------------
    # 如果问题像“是什么意思/是什么/定义/含义”
    # 那么优先提升包含“定义/含义/是指”的句子
    definition_triggers = ["什么意思", "是什么", "定义", "含义", "是指"]
    is_definition_question = any(word in question for word in definition_triggers)

    if is_definition_question:
        if any(word in normalized_chunk for word in ["定义", "含义", "是指", "指的是"]):
            score += 10
            matched_phrases.append("定义类命中")
            reasons.append("定义类问题命中定义句 +10")

    # 最终返回该 chunk 的打分信息
    return {
        "score": score,
        "matched_phrases": list(set(matched_phrases)),
        "reasons": reasons,
    }


def retrieve_docs(question: str, chunks: List[Dict], top_k: int = 4) -> List[Dict]:
    """
    检索主函数。

    输入：
    - question：用户问题
    - chunks：所有知识片段
    - top_k：返回前几个结果

    输出：
    - 按相关性排序后的 top_k 个 chunk

    这个函数是整个 retriever.py 的核心入口。
    """
    scored_chunks = []

    # 给每个 chunk 打分
    for chunk in chunks:
        score_info = score_chunk(question, chunk)

        # 把原始 chunk 和打分结果拼起来
        scored_chunk = {
            "file_name": chunk["file_name"],
            "text": chunk["text"],
            "score": score_info["score"],
            "matched_phrases": score_info["matched_phrases"],
            "reasons": score_info["reasons"],
        }

        scored_chunks.append(scored_chunk)

    # 过滤掉完全没命中的 chunk
    # 同时设置一个最低分阈值，避免很弱的噪声混进来
    scored_chunks = [
        c for c in scored_chunks
        if c["matched_phrases"] and c["score"] >= 6
    ]

    # 排序规则：
    # 1. 先按 score 从高到低
    # 2. 如果分数一样，优先短一点的句子（通常更像定义句或规则句）
    scored_chunks.sort(key=lambda x: (-x["score"], len(x["text"])))

    # 只返回前 top_k 条
    return scored_chunks[:top_k]

def build_llm_context_text(retrieved_chunks: List[Dict]) -> str:
    """
    给大模型用的上下文文本。
    这里只保留最核心的知识内容，不放调试信息。
    """
    lines = []

    for idx, chunk in enumerate(retrieved_chunks, start=1):
        line = f"资料{idx}（来源：{chunk['file_name']}）：{chunk['text']}"
        lines.append(line)

    return "\n".join(lines)
def build_context_text(retrieved_chunks: List[Dict]) -> str:
    """
    把检索结果拼接成上下文文本，
    方便后面放进 prompt 里。

    例如返回：
    资料1（来源：rules.txt，分数：30，命中：隐藏款、定义类命中，原因：...）：隐藏款定义：......
    资料2（来源：rules.txt，分数：20，命中：隐藏款，原因：...）：抽盒规则：......
    """
    lines = []

    for idx, chunk in enumerate(retrieved_chunks, start=1):
        line = (
            f"资料{idx}（来源：{chunk['file_name']}，"
            f"分数：{chunk['score']}，"
            f"命中：{'、'.join(chunk['matched_phrases'])}，"
            f"原因：{'；'.join(chunk['reasons'])}）："
            f"{chunk['text']}"
        )
        lines.append(line)

    return "\n".join(lines)