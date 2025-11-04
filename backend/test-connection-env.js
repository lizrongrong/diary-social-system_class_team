// MySQL 連線測試（會優先讀取 .env，若不存在會回退到 .env.example）
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function loadEnvExampleIfNeeded() {
    if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
        return;
    }

    const examplePath = path.resolve(__dirname, '..', '.env.example');
    if (!fs.existsSync(examplePath)) return;

    const content = fs.readFileSync(examplePath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        const idx = line.indexOf('=');
        if (idx === -1) return;
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        if (!process.env[key]) {
            process.env[key] = val;
        }
    });
}

async function testConnection() {
    try {
        console.log('🔍 使用環境變數測試 MySQL 連線...');

        loadEnvExampleIfNeeded();

        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3307;
        const user = process.env.DB_USER || 'root';
        const password = process.env.DB_PASSWORD || '';
        const database = process.env.DB_NAME; // 可選

        console.log(`使用設定: host=${host} port=${port} user=${user} database=${database || '<none>'}`);

        const connection = await mysql.createConnection({ host, port, user, password, database });

        console.log('✅ MySQL 連線成功！');

        const [rows] = await connection.query('SELECT VERSION() as version');
        console.log(`📊 MySQL 版本: ${rows[0].version}`);

        await connection.end();
        console.log('✅ 測試完成');
    } catch (error) {
        console.error('❌ 連線失敗:');
        console.error(error && error.message ? error.message : error);
        if (error && error.code) console.error('錯誤代碼:', error.code);
        if (error && error.errno) console.error('errno:', error.errno);
        if (error && error.sqlMessage) console.error('sqlMessage:', error.sqlMessage);
    }
}

testConnection();
