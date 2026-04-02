# app/main.py

# json 用来解析模型返回的 JSON 字符串
# 例如模型返回：
# {"answer": "隐藏款通常数量较少，出现概率更低。"}
# 我们要把它变成 Python 字典，才能取出 answer 字段
import json
from app.retriever import retrieve_docs, build_context_text, build_llm_context_text
# FastAPI 是我们要用的 Web 框架
# HTTPException 用来在接口出错时返回标准错误信息
from fastapi import FastAPI, HTTPException

# 导入配置
from app.config import settings

# 导入请求/响应的数据结构定义
from app.schemas import RagRequest, ExplainRequest

# 导入文档加载与 chunk 切分函数
from app.loader import load_documents, split_into_chunks

# 导入检索相关函数
from app.retriever import retrieve_docs, build_context_text

# 导入 prompt 构造函数
from app.prompts import build_ask_prompt

# 导入模型调用函数
from app.llm import ask_llm


# 创建 FastAPI 应用对象
# title 会显示在 Swagger 文档页面中
app = FastAPI(title="Lightweight Python RAG Service")


# --------------------------------------------------
# 服务启动时，先把文档加载并切分好
# --------------------------------------------------
# 为什么要在启动时提前做？
# 因为 docs 是相对静态的知识库，
# 没必要每次请求都重新读文件、重新切 chunk。
# 这样做能减少重复计算，让接口更快。
DOCUMENTS = load_documents()
CHUNKS = split_into_chunks(DOCUMENTS)


@app.get("/")
def root():
    """
    健康检查接口。

    用来快速确认服务是否启动成功。
    浏览器打开 http://127.0.0.1:8000/ 时，
    如果能返回这段 JSON，说明服务至少跑起来了。
    """
    return {"message": "Python RAG service is running"}


@app.post("/rag/debug")
def rag_debug(req: RagRequest):
    """
    只做检索调试，不调用模型。

    这个接口的用途是：
    1. 看 topK chunk 是否合理
    2. 看分数和命中短语是否符合预期
    3. 看拼接后的 context 是否干净

    这对调试 RAG 特别重要，
    因为很多时候问题不在模型，而在检索阶段。
    """

    # 调用检索函数，根据用户问题从所有 chunk 中取出前 TOP_K 个相关片段
    retrieved_chunks = retrieve_docs(
        question=req.question,
        chunks=CHUNKS,
        top_k=settings.TOP_K,
    )

    # 把检索结果拼成大模型可读的上下文文本
    context_text = build_llm_context_text(retrieved_chunks)

    # 返回调试信息
    return {
        "success": True,
        "question": req.question,
        "retrieved_chunks": retrieved_chunks,
        "context_text": context_text,
    }


@app.post("/rag/ask")
def rag_ask(req: RagRequest):
    """
    完整问答接口。

    它会完成整条 RAG 链路：
    1. 检索相关 chunk
    2. 拼 context
    3. 构造 prompt
    4. 调用模型
    5. 解析 answer
    6. 返回结果
    """
    try:
        # 1. 做检索
        retrieved_chunks = retrieve_docs(
            question=req.question,
            chunks=CHUNKS,
            top_k=settings.TOP_K,
        )

        # 2. 拼接检索上下文
        context_text = build_llm_context_text(retrieved_chunks)

        # 3. 构造 prompt
        # recommendation=None 表示这是普通规则问答，不是推荐解释
        prompt = build_ask_prompt(
            question=req.question,
            context_text=context_text,
            recommendation=None,
        )

        # 4. 调用大模型
        llm_result = ask_llm(prompt)

        # 5. 解析模型返回结果
        # 模型返回的是 JSON 字符串，所以这里需要 json.loads
        parsed = json.loads(llm_result)

        # 6. 返回给前端
        return {
            "success": True,
            "question": req.question,
            "answer": parsed.get("answer", ""),
            "retrieved_chunks": retrieved_chunks,
        }

    except Exception as e:
        # 如果任何一步出错，例如：
        # - API Key 错误
        # - 网络请求失败
        # - 模型没按 JSON 返回
        # 就统一返回 500
        raise HTTPException(status_code=500, detail=f"RAG ask failed: {str(e)}")


@app.post("/rag/explain")
def rag_explain(req: ExplainRequest):
    """
    推荐解释接口。

    和 /rag/ask 的区别在于：
    这里除了 question 之外，还会额外带一个 recommendation，
    让模型在解释“为什么推荐这个系列”时，
    能看到当前推荐对象和推荐理由。
    """
    try:
        # 1. 检索和问题相关的知识片段
        retrieved_chunks = retrieve_docs(
            question=req.question,
            chunks=CHUNKS,
            top_k=settings.TOP_K,
        )

        # 2. 拼接检索上下文
        context_text = build_llm_context_text(retrieved_chunks)

        # 3. 构造 prompt
        # 这里把 req.recommendation 也传进去
        prompt = build_ask_prompt(
            question=req.question,
            context_text=context_text,
            recommendation=req.recommendation,
        )

        # 4. 调用模型
        llm_result = ask_llm(prompt)

        # 5. 解析 JSON 字符串
        parsed = json.loads(llm_result)

        # 6. 返回结果
        return {
            "success": True,
            "question": req.question,
            "answer": parsed.get("answer", ""),
            "retrieved_chunks": retrieved_chunks,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG explain failed: {str(e)}")