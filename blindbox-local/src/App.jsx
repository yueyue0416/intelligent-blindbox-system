import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Series from './pages/Series'
import BlindBox from './pages/BlindBox'
import History from './pages/History'
import Recommend from './pages/Recommend'

function App() {
  return (
    <div>
      <nav style={{ padding: '16px', borderBottom: '1px solid #ddd' }}>
        <Link to="/" style={{ marginRight: '16px' }}>首页</Link>
        <Link to="/series" style={{ marginRight: '16px' }}>系列页</Link>
        <Link to="/blindbox/fruit-party" style={{ marginRight: '16px' }}>抽盒页</Link>
        <Link to="/history">历史记录</Link>
        <Link to="/recommend" style={{ marginRight: '16px' }}>推荐Agent</Link>
      </nav>

      <div style={{ padding: '24px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/series" element={<Series />} />
          <Route path="/blindbox/:seriesId" element={<BlindBox />} />
          <Route path="/history" element={<History />} />
          <Route path="/recommend" element={<Recommend />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
