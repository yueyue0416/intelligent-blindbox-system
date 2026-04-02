
# Intelligent Blindbox System

一个基于 React + Node.js + MySQL + Python/FastAPI + RAG 的智能盲盒推荐与问答系统。

```text
用户
  ↓
React 前端（blindbox-local）
  ↓
Node.js / Express（blindbox-backend）
  ├── MySQL（业务数据）
  ├── Agent 编排（任务分流 / 推荐 / 解释）
  └── Python / FastAPI（blindbox-rag-python）
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

### 智能问答服务
- Python
- FastAPI
- Pydantic
- requests
- python-dotenv

### AI 能力
- RAG（Retrieval-Augmented Generation）
- Tool Calling 思路
- DeepSeek API

### 测试与联调
- Postman

---

## 3. 项目结构

```text
intelligent-blindbox-system/
├─ blindbox-local/             # 前端项目（React）
├─ blindbox-backend/          # Node.js/Express 业务后端
├─ blindbox-rag-python/       # Python/FastAPI RAG 服务
├─ .gitignore
└─ README.md
