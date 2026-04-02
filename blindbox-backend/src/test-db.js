const pool = require('./db')

async function test() {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok')
    console.log('数据库连接成功：', rows)
  } catch (err) {
    console.error('数据库连接失败：', err.message)
  } finally {
    process.exit()
  }
}

test()