import { useEffect, useState } from 'react'
import axios from 'axios'

function History() {
  // 保存后端返回的历史记录列表
  const [historyList, setHistoryList] = useState([])

  // 控制加载状态
  const [loading, setLoading] = useState(true)

  // 保存错误信息
  const [error, setError] = useState('')

  // 从后端获取历史记录
  const loadHistory = async () => {
    try {
      // 开始请求前，先清空旧错误
      setError('')

      // 请求后端历史记录接口
      const response = await axios.get('http://localhost:3001/api/history')

      // 把后端返回的数据保存到状态里
      setHistoryList(response.data)
    } catch (err) {
      console.error('获取历史记录失败：', err)
      setError('获取历史记录失败，请检查后端是否启动')
    } finally {
      setLoading(false)
    }
  }

  // 页面第一次加载时自动获取历史记录
  useEffect(() => {
    loadHistory()
  }, [])

  return (
    <div>
      <h2>抽取历史记录</h2>

      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
        <button
          onClick={loadHistory}
          style={{
            marginRight: '12px',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          刷新记录
        </button>
      </div>

      {/* 加载中提示 */}
      {loading ? (
        <p>历史记录加载中...</p>
      ) : error ? (
        // 错误提示
        <p style={{ color: 'red' }}>{error}</p>
      ) : historyList.length === 0 ? (
        // 空数据提示
        <p>暂无抽取记录</p>
      ) : (
        // 正常显示历史记录
        <div style={{ marginTop: '20px', display: 'grid', gap: '16px' }}>
          {historyList.map((item, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #ddd',
                borderRadius: '10px',
                padding: '16px',
                backgroundColor: '#fafafa',
              }}
            >
              <p><strong>系列ID：</strong>{item.seriesId}</p>
              <p><strong>系列名称：</strong>{item.seriesName}</p>
              <p><strong>抽中结果：</strong>{item.result}</p>
              <p><strong>时间：</strong>{item.time}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default History