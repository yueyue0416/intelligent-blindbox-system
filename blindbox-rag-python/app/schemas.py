# app/schemas.py

from typing import List, Optional, Dict
from pydantic import BaseModel


class RagRequest(BaseModel):
    """
    基础问答请求体。
    例如：
    {
        "question": "隐藏款是什么意思"
    }
    """
    question: str


class ExplainRequest(BaseModel):
    """
    推荐解释请求体。
    例如：
    {
        "question": "为什么会推荐这个系列",
        "recommendation": {
            "name": "星球旅行",
            "reason": "用户偏好科幻童趣风格，并且愿意尝试隐藏款"
        }
    }
    """
    question: str
    recommendation: Optional[Dict] = None


class RetrievedChunk(BaseModel):
    """
    单个检索结果的数据结构。
    """
    file_name: str
    text: str
    score: int
    matched_phrases: List[str]
    reasons: List[str]


class DebugResponse(BaseModel):
    """
    /rag/debug 的返回结构。
    """
    success: bool
    question: str
    retrieved_chunks: List[RetrievedChunk]
    context_text: str


class AskResponse(BaseModel):
    """
    /rag/ask 的返回结构。
    """
    success: bool
    question: str
    answer: str
    retrieved_chunks: List[RetrievedChunk]