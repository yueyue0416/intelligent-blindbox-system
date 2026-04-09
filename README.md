
# Blindbox AI Agent System

一个结合 **LangChain Agent、LangGraph Workflow 和 Python RAG** 的智能盲盒推荐与解释系统。  
系统能够根据用户的 **预算、风格偏好、隐藏款意愿** 进行推荐，并在用户追问时基于知识库生成解释性回答。

---

```text
用户
  ↓
React 前端（blindbox-local）
  ↓
Node.js / Express（blindbox-backend）
  ↓
LangGraph Supervisor（Workflow 编排层）
  ├── State：budget / style / wantHidden / question / recommendation / answer
  ├── Node：recommend / explain / finalize
  └── Edge：根据 question 条件分支路由
        ├── 无 question → 纯推荐
        └── 有 question → 推荐 + 解释

【推荐链路】
LangChain Agent
  ├── DeepSeek Chat Model
  ├── Tool Calling
  ├── get_all_series
  └── MySQL 业务数据

【解释链路】
Rule Agent
  └── Python FastAPI RAG
        ├── 文档检索
        ├── 规则/FAQ/系列介绍
        └── DeepSeek API

## 1. 项目简介

本项目围绕“智能盲盒推荐与问答”场景展开，支持以下核心功能：

- 盲盒系列展示
- 抽盒
- 历史记录查询
- 个性化推荐
- 基于知识库的规则问答
- 推荐解释

项目整体采用前后端分离架构，并将智能问答能力进一步独立为 Python RAG 服务，形成：

- **Node.js**：业务服务层
- **Python/FastAPI**：RAG 智能服务层

---

## 2. 技术栈

### 前端
- React
- Vite
- React Router
- Axios

### 后端业务服务
- Node.js
- Express
- MySQL
- mysql2
- dotenv

### Agent 与工作流编排
- LangChain
- LangGraph
- Zod
- Tool Calling
- Structured Output

### 智能问答与 RAG 服务
- Python
- FastAPI
- Pydantic
- requests
- python-dotenv
- RAG（Retrieval-Augmented Generation）

### 模型能力
- DeepSeek API
- DeepSeek Chat Model

### 测试与联调
- Postman

## 3. 项目结构

```text
blindbox-system/
├─ blindbox-local/
│  ├─ src/
│  └─ package.json
│
├─ blindbox-backend/
│  ├─ package.json
│  ├─ package-lock.json
│  └─ src/
│     ├─ app.js
│     ├─ db.js
│     ├─ agents/
│     │  └─ recommendationAgent.langchain.mjs
│     └─ graphs/
│        └─ supervisor.langgraph.mjs
│
└─ blindbox-rag-python/
   ├─ app/
   │  ├─ main.py
   │  ├─ loader.py
   │  ├─ retriever.py
   │  ├─ prompts.py
   │  ├─ llm.py
   │  └─ schemas.py
   ├─ data/
   │  └─ docs/
   └─ .env.example

## 4. 升级亮点

### LangChain 升级
- 将原本手写的推荐逻辑升级为 **LangChain Recommendation Agent**
- 使用 `createAgent()` 替代手写两轮模型调用
- 使用 `tool()` 封装数据库查询能力
- 使用 schema + structured output 稳定返回推荐结果

### LangGraph 升级
- 将原本 `if / else` 的 supervisor 路由升级为 **LangGraph Workflow**
- 使用共享 state 管理输入、中间结果和最终结果
- 使用 node 拆分推荐、解释和收尾步骤
- 使用 conditional edge 管理推荐 / 解释分支流转

### RAG 保留与协同
- 保留 Python / FastAPI RAG 服务
- 继续使用规则文档、FAQ 和系列介绍作为知识来源
- 实现推荐与解释协同的完整链路

---
