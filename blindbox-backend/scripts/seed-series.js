const fs = require('fs')
const path = require('path')
const pool = require('../src/db')

const seriesPath = path.join(__dirname, '../data/series.json')

async function seedSeries() {
  const conn = await pool.getConnection()

  try {
    const raw = fs.readFileSync(seriesPath, 'utf-8')
    const seriesList = JSON.parse(raw)

    await conn.beginTransaction()

    for (const s of seriesList) {
      await conn.query(
        `
        INSERT INTO series (id, name, price, description, hidden_tip)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          price = VALUES(price),
          description = VALUES(description),
          hidden_tip = VALUES(hidden_tip)
        `,
        [
          s.id,
          s.name,
          s.price,
          s.desc || '',
          s.hiddenTip || ''
        ]
      )

      await conn.query(`DELETE FROM series_items WHERE series_id = ?`, [s.id])

      for (const item of s.items || []) {
        await conn.query(
          `
          INSERT INTO series_items (series_id, item_name, is_hidden)
          VALUES (?, ?, ?)
          `,
          [s.id, item, 0]
        )
      }
    }

    await conn.commit()
    console.log('series 和 series_items 导入完成')
  } catch (error) {
    await conn.rollback()
    console.error('导入失败：', error)
  } finally {
    conn.release()
    process.exit()
  }
}

seedSeries()