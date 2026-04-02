from app.config import settings
from typing import List, Dict
def load_documents() -> List[Dict]:
    docs = []
    for file_path in settings.DOCS_DIR.glob("*.txt"):
        content = file_path.read_text(encoding="utf-8")
        docs.append({
            "file_name": file_path.name,
            "content": content
        })
    return docs
def split_into_chunks(documents: List[Dict]) -> List[Dict]:
    # 用来保存切分后的所有 chunk
    chunks = []
    for doc in documents:

        # doc["content"] 是整个文件内容
        # splitlines() 会按行拆开，得到一个列表
        # line.strip() 去掉每一行前后的空格
        # if line.strip() 用来过滤空行
        lines = [line.strip() for line in doc["content"].splitlines() if line.strip()]

        # 遍历当前文档中的每一行
        for line in lines:
            # 每一行都变成一个 chunk
            chunks.append(
                {
                    # 记录这个 chunk 来自哪个文件
                    "file_name": doc["file_name"],

                    # 这一条知识的正文
                    "text": line,
                }
            )

        # 返回所有 chunk
    return chunks