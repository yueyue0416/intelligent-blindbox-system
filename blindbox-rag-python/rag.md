用户问题

&#x20; ↓

main.py

&#x20; ↓

retriever.py

&#x20; ↓

topK chunks

&#x20; ↓

prompts.py

&#x20; ↓

llm.py

&#x20; ↓

模型回答

&#x20; ↓

main.py 返回 JSON



config.py：统一读取项目配置

loader.py：读取知识库文档并切成 chunk

retriever.py：根据问题给 chunk 打分并返回 topK

prompts.py：把问题和资料拼成 prompt

llm.py：调用 DeepSeek 并返回模型结果

main.py：把整个 RAG 链路通过 FastAPI 暴露成接口

