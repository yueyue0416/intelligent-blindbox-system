import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function Series() {
  // 用来保存后端返回的系列列表数据
  const [seriesList, setSeriesList] = useState([])

  // 用来表示数据是否正在加载
  const [loading, setLoading] = useState(true)

  // 用来保存请求失败时的错误信息
  const [error, setError] = useState('')

  useEffect(() => {
    // 定义一个异步函数，专门去请求后端接口
    const fetchSeries = async () => {
      try {
        // 向后端发送 GET 请求，获取盲盒系列列表
        const response = await axios.get('http://localhost:3001/api/series')

        // 把后端返回的数据保存到 React 状态中
        setSeriesList(response.data)
      } catch (err) {
        // 如果请求失败，就保存错误信息
        setError('获取盲盒系列失败，请检查后端是否启动')
        console.error('获取系列数据失败：', err)
      } finally {
        // 不管成功还是失败，最终都结束加载状态
        setLoading(false)
      }
    }

    // 页面第一次加载时执行请求
    fetchSeries()
  }, [])

  // 如果还在加载中，先显示加载提示
  if (loading) {
    return <h2>系列数据加载中...</h2>
  }

  // 如果请求出错，显示错误信息
  if (error) {
    return <h2>{error}</h2>
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>盲盒系列</h2>

      <div style={{ display: 'grid', gap: '16px' }}>
        {seriesList.map((item) => (
          <div
            key={item.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <h3>{item.name}</h3>
            <p>{item.desc}</p>
            <p>单盒价格：¥{item.price}</p>

            {/* 点击后跳转到对应系列的抽盒详情页 */}
            <Link to={`/blindbox/${item.id}`}>
              <button
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                进入抽盒
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Series