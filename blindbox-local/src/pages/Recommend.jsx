import { useState } from 'react'
import axios from 'axios'

function Recommend() {
  const [budget, setBudget] = useState('')
  const [style, setStyle] = useState('')
  const [wantHidden, setWantHidden] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleRecommend = async () => {
    try {
      setError('')

      const response = await axios.post('http://localhost:3001/api/agent', {
        budget: Number(budget),
        style,
        wantHidden,
      })

      setResult(response.data)
    } catch (err) {
      console.error('推荐失败：', err)
      setError('推荐失败，请检查后端是否正常运行')
    }
  }

  return (
    <div>
      <h2>盲盒推荐 Agent</h2>

      <div style={{ marginTop: '20px', display: 'grid', gap: '16px', maxWidth: '400px' }}>
        <div>
          <label>预算：</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="请输入你的预算"
            style={{ marginLeft: '12px', padding: '6px' }}
          />
        </div>

        <div>
          <label>喜欢的风格：</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            style={{ marginLeft: '12px', padding: '6px' }}
          >
            <option value="">请选择风格</option>
            <option value="清新可爱">清新可爱</option>
            <option value="甜美梦幻">甜美梦幻</option>
            <option value="可爱治愈">可爱治愈</option>
            <option value="科幻童趣">科幻童趣</option>
          </select>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={wantHidden}
              onChange={(e) => setWantHidden(e.target.checked)}
            />
            我想追隐藏款
          </label>
        </div>

        <button
          onClick={handleRecommend}
          style={{
            width: '160px',
            padding: '10px 16px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          开始推荐
        </button>
      </div>

      {error && (
        <p style={{ marginTop: '20px', color: 'red' }}>
          {error}
        </p>
      )}

      {result && result.result?.type === 'recommendation' && (
        <div
          style={{
            marginTop: '30px',
            padding: '16px',
            border: '1px solid #ddd',
            borderRadius: '12px',
            maxWidth: '500px',
            backgroundColor: '#fafafa',
          }}
        >
          <h3>推荐结果</h3>
          <p><strong>推荐系列：</strong>{result.result.recommendation.name}</p>
          <p><strong>系列ID：</strong>{result.result.recommendation.id}</p>
          <p><strong>推荐理由：</strong>{result.result.recommendation.reason}</p>
        </div>
      )}

      {result && result.result?.type === 'recommendation_with_explanation' && (
        <div
          style={{
            marginTop: '30px',
            padding: '16px',
            border: '1px solid #ddd',
            borderRadius: '12px',
            maxWidth: '600px',
            backgroundColor: '#fafafa',
          }}
        >
          <h3>推荐结果</h3>
          <p><strong>推荐系列：</strong>{result.result.recommendation.name}</p>
          <p><strong>系列ID：</strong>{result.result.recommendation.id}</p>
          <p><strong>推荐理由：</strong>{result.result.recommendation.reason}</p>
          <p><strong>补充解释：</strong>{result.result.explanation.answer}</p>
        </div>
      )}

      {result && result.result?.type === 'rule_answer' && (
        <div
          style={{
            marginTop: '30px',
            padding: '16px',
            border: '1px solid #ddd',
            borderRadius: '12px',
            maxWidth: '600px',
            backgroundColor: '#fafafa',
          }}
        >
          <h3>规则解释结果</h3>
          <p>{result.result.explanation.answer}</p>
        </div>
      )}
    </div>
  )
}

export default Recommend