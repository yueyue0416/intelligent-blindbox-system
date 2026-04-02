import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

function BlindBox() {
  // 从路由参数中拿到当前系列 id
  // 比如 /blindbox/fruit-party 里，seriesId 就是 fruit-party
  const { seriesId } = useParams()

  // 保存当前系列详情数据
  const [boxDetail, setBoxDetail] = useState(null)

  // 保存抽取结果
  const [drawResult, setDrawResult] = useState('')

  // 控制页面加载状态
  const [loading, setLoading] = useState(true)

  // 保存错误信息
  const [error, setError] = useState('')

  useEffect(() => {
    // 定义一个异步函数，请求后端获取当前系列详情
    const fetchSeriesDetail = async () => {
      try {
        // 请求后端接口：获取某个系列详情
        const response = await axios.get(`http://localhost:3001/api/series/${seriesId}`)

        // 把后端返回的系列详情保存到状态中
        setBoxDetail(response.data)
      } catch (err) {
        // 如果接口请求失败，显示错误提示
        setError('获取盲盒详情失败，请检查后端是否启动')
        console.error('获取盲盒详情失败：', err)
      } finally {
        // 无论成功失败，都结束加载状态
        setLoading(false)
      }
    }

    // 页面首次加载、或者 seriesId 变化时执行
    fetchSeriesDetail()
  }, [seriesId])

  // 点击“立即抽取”时调用
  const handleDraw = async () => {
    try {
      // 向后端发送 POST 请求，请后端执行抽盒
      const response = await axios.post('http://localhost:3001/api/draw', {
        seriesId: seriesId,
      })

      // 后端返回的抽取结果在 response.data.result 里
      setDrawResult(response.data.result)
    } catch (err) {
      console.error('抽盒失败：', err)
      alert('抽盒失败，请检查后端是否正常运行')
    }
  }

  // 页面加载中时，显示提示
  if (loading) {
    return <h2>盲盒详情加载中...</h2>
  }

  // 如果请求出错，显示错误信息
  if (error) {
    return <h2>{error}</h2>
  }

  // 如果后端没返回数据，兜底处理
  if (!boxDetail) {
    return <h2>未找到该盲盒系列</h2>
  }

  return (
    <div>
      <h2>{boxDetail.name}</h2>
      <p style={{ marginTop: '12px' }}>{boxDetail.desc}</p>
      <p style={{ marginTop: '12px' }}>单盒价格：¥{boxDetail.price}</p>
      <p style={{ marginTop: '12px', color: '#c25' }}>{boxDetail.hiddenTip}</p>

      <div style={{ marginTop: '24px' }}>
        <h3>款式列表</h3>
        <ul>
          {boxDetail.items.map((item, index) => (
            <li key={index} style={{ marginTop: '8px' }}>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={handleDraw}
        style={{
          marginTop: '24px',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        立即抽取
      </button>

      {drawResult && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            border: '1px solid #ddd',
            borderRadius: '10px',
            backgroundColor: '#f9f9f9',
          }}
        >
          <h3>抽取结果</h3>
          <p>恭喜你抽中了：{drawResult}</p>
        </div>
      )}
    </div>
  )
}

export default BlindBox