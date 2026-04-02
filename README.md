\# 智能盲盒推荐与问答系统



\## 项目简介

一个基于 React + Node.js + MySQL + Python/FastAPI + RAG 的盲盒推荐与问答系统。



\## 项目结构

\- blindbox-frontend：前端页面

\- blindbox-backend：Node/Express 业务服务

\- blindbox-rag-python：Python/FastAPI RAG 服务



\## 核心功能

\- 系列展示

\- 抽盒

\- 历史记录

\- 个性化推荐

\- 基于知识库的规则问答与推荐解释



\## 技术栈

React、Node.js、Express、MySQL、Python、FastAPI、RAG



\## 启动方式

\### 前端

cd blindbox-frontend

npm install

npm run dev



\### Node 后端

cd blindbox-backend

npm install

npm run dev



\### Python RAG 服务

cd blindbox-rag-python

pip install -r requirements.txt

python -m uvicorn app.main:app --reload

