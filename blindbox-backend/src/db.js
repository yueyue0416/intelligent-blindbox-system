const mysql = require('mysql2/promise')
require('dotenv').config()

// 先加载 MySQL 驱动和环境变量配置，然后根据 .env 中提供的主机、端口、用户名、密码和数据库名，创建一个最多可维护 10 个连接的 MySQL 连接池，最后把这个连接池导出，供项目其他模块复用。
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

module.exports = pool