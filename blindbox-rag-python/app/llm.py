# app/llm.py

# requests 用来发送 HTTP 请求，调用大模型 API
import requests

# 导入配置对象 settings
# 后面会用到 API Key 和模型名称
from app.config import settings


def ask_llm(prompt: str) -> str:
    """
    调用 DeepSeek 聊天接口，并返回模型生成的正文字符串。

    参数：
    - prompt: 已经拼好的提示词字符串

    返回：
    - 模型返回的 content 字符串
      例如：
      '{"answer": "隐藏款通常数量较少，出现概率更低，并具有较高收藏价值。"}'

    为什么这个函数只返回字符串？
    因为它的职责只是“调模型并拿回原始结果”。
    至于后面要不要 json.loads()，那属于业务层或接口层的事情，
    不一定必须放在这里做。
    """

    # 如果没有配置 API Key，直接抛错
    # 这样可以避免请求发出去后才发现鉴权失败
    if not settings.DEEPSEEK_API_KEY:
        raise ValueError("未配置 DEEPSEEK_API_KEY")

    # DeepSeek 聊天接口地址
    url = "https://api.deepseek.com/chat/completions"

    # 请求体 payload
    # 它会被作为 JSON 发给模型接口
    payload = {
        # 模型名称，从 .env 里读取
        "model": settings.MODEL_NAME,

        # messages 是聊天模型最核心的输入格式
        # system: 定义模型角色和行为边界
        # user:   真正的业务 prompt
        "messages": [
            {
                "role": "system",
                "content": "你是一个严谨的盲盒规则解释助手，只基于提供资料回答。"
            },
            {
                "role": "user",
                "content": prompt
            }
        ],

        # temperature 越低，回答越稳定，越不容易自由发挥
        # 规则问答类场景通常设低一点更合适
        "temperature": 0.2,

        # 要求模型输出 JSON 对象格式
        # 这样后面更容易解析 answer 字段
        "response_format": {
            "type": "json_object"
        }
    }

    # 请求头 headers
    headers = {
        # Bearer Token 鉴权
        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",

        # 请求体是 JSON
        "Content-Type": "application/json"
    }

    # 发送 POST 请求
    # timeout=30 表示最多等 30 秒，避免接口一直卡住
    response = requests.post(
        url=url,
        json=payload,
        headers=headers,
        timeout=30
    )

    # 如果状态码不是 2xx，这里会直接抛异常
    # 例如 401、500 之类
    response.raise_for_status()

    # 把响应体转成 Python 字典
    data = response.json()

    # 从返回结构中取出模型正文
    # DeepSeek / OpenAI 风格接口通常是这个层级
    # data["choices"][0]["message"]["content"]
    content = data["choices"][0]["message"]["content"]

    return content