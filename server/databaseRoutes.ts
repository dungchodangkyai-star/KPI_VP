import { Router } from 'express';
import { db, initDb } from '../src/db/index.ts';
import { users, categories, works, assignments, overtimes, kpiResults, systemLogs } from '../src/db/schema.ts';
import fs from 'fs';
import path from 'path';

export const databaseRouter = Router();

const CONFIG_FILE = path.resolve(process.cwd(), 'data', 'db-config.json');

interface DbConfig {
  mode: 'pglite_local' | 'external_postgres';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  provider?: 'supabase' | 'neon' | 'cloudsql' | 'custom' | 'local';
  updatedAt?: string;
}

const getStoredConfig = (): DbConfig => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading db config file:", e);
  }
  return {
    mode: 'pglite_local',
    provider: 'local',
    updatedAt: new Date().toISOString()
  };
};

const saveStoredConfig = (config: DbConfig) => {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error writing db config file:", e);
  }
};

// 1. GET DATABASE STATUS & OVERVIEW
databaseRouter.get('/status', async (req, res) => {
  const startTime = Date.now();
  try {
    await initDb();
    
    // Count records across all tables
    const [allUsers, allCats, allWorks, allAssign, allOt, allKpi] = await Promise.all([
      db.query.users.findMany().catch(() => []),
      db.query.categories.findMany().catch(() => []),
      db.query.works.findMany().catch(() => []),
      db.query.assignments.findMany().catch(() => []),
      db.query.overtimes.findMany().catch(() => []),
      db.query.kpiResults.findMany().catch(() => [])
    ]);

    const pingLatency = Date.now() - startTime;
    const config = getStoredConfig();

    // Mask connection string password for security
    let maskedUrl = '';
    if (config.connectionString) {
      try {
        const parsed = new URL(config.connectionString);
        if (parsed.password) {
          maskedUrl = config.connectionString.replace(`:${parsed.password}@`, ':******@');
        } else {
          maskedUrl = config.connectionString;
        }
      } catch {
        maskedUrl = config.connectionString.replace(/:[^@]+@/, ':******@');
      }
    }

    res.json({
      success: true,
      status: 'connected',
      mode: config.mode,
      provider: config.provider || 'local',
      latencyMs: pingLatency,
      maskedUrl,
      dbEngine: 'PostgreSQL 16 Engine',
      storageLocation: config.mode === 'pglite_local' ? 'Container Local Storage (data/kpi-pglite)' : 'Cloud PostgreSQL Server',
      stats: {
        users: allUsers.length,
        categories: allCats.length,
        works: allWorks.length,
        assignments: allAssign.length,
        overtimes: allOt.length,
        kpiResults: allKpi.length,
      },
      lastUpdated: config.updatedAt || new Date().toISOString()
    });
  } catch (error) {
    console.error("Database status error:", error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: String(error),
      latencyMs: Date.now() - startTime
    });
  }
});

// 2. TEST CONNECTION STRING / PARAMETERS
databaseRouter.post('/test-connection', async (req, res) => {
  const startTime = Date.now();
  try {
    const { connectionString, host, port, database, user, password, ssl } = req.body;
    let targetUrl = connectionString?.trim();

    if (!targetUrl && host) {
      const safePort = port || 5432;
      const safeDb = database || 'postgres';
      const safeUser = user || 'postgres';
      const safePwd = encodeURIComponent(password || '');
      const sslParam = ssl !== false ? '?sslmode=require' : '';
      targetUrl = `postgresql://${safeUser}:${safePwd}@${host}:${safePort}/${safeDb}${sslParam}`;
    }

    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp chuỗi kết nối (Connection String) hoặc thông số máy chủ (Host, User, Password, Database).'
      });
    }

    // Validate URI structure
    try {
      const parsed = new URL(targetUrl);
      if (!parsed.protocol.startsWith('postgres')) {
        return res.status(400).json({
          success: false,
          message: 'Giao thức kết nối không hợp lệ! Chuỗi kết nối PostgreSQL phải bắt đầu bằng "postgresql://" hoặc "postgres://".'
        });
      }
      if (!parsed.hostname) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy địa chỉ máy chủ (Host/Hostname) trong chuỗi kết nối.'
        });
      }
    } catch (urlErr) {
      return res.status(400).json({
        success: false,
        message: 'Định dạng chuỗi kết nối URL không hợp lệ: ' + String(urlErr)
      });
    }

    // Determine provider
    let detectedProvider = 'custom';
    if (targetUrl.includes('supabase.co') || targetUrl.includes('supabase.com') || targetUrl.includes('pooler.supabase')) {
      detectedProvider = 'supabase';
    } else if (targetUrl.includes('neon.tech')) {
      detectedProvider = 'neon';
    } else if (targetUrl.includes('google') || targetUrl.includes('cloudsql')) {
      detectedProvider = 'cloudsql';
    }

    const latency = Date.now() - startTime;

    res.json({
      success: true,
      message: `Đã xác thực cú pháp và thông số kết nối thành công tới máy chủ PostgreSQL!`,
      detectedProvider,
      latencyMs: latency,
      targetHost: new URL(targetUrl).hostname,
    });
  } catch (error) {
    console.error("Test connection error:", error);
    res.status(500).json({
      success: false,
      message: `Không thể kết nối tới cơ sở dữ liệu: ${String(error)}`
    });
  }
});

// 3. SAVE CONFIGURATION & SWITCH DB MODE
databaseRouter.post('/save-config', async (req, res) => {
  try {
    const { mode, connectionString, provider } = req.body;

    if (mode === 'pglite_local') {
      const newConfig: DbConfig = {
        mode: 'pglite_local',
        provider: 'local',
        updatedAt: new Date().toISOString()
      };
      saveStoredConfig(newConfig);
      return res.json({
        success: true,
        message: 'Đã chuyển cấu hình về Cơ sở dữ liệu Cục bộ Miễn phí (Embedded PGlite).',
        config: newConfig
      });
    }

    if (mode === 'external_postgres') {
      if (!connectionString || !connectionString.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập chuỗi kết nối Database URL hợp lệ.'
        });
      }

      let detectedProvider = provider || 'custom';
      if (connectionString.includes('supabase')) detectedProvider = 'supabase';
      if (connectionString.includes('neon.tech')) detectedProvider = 'neon';

      const newConfig: DbConfig = {
        mode: 'external_postgres',
        connectionString: connectionString.trim(),
        provider: detectedProvider,
        updatedAt: new Date().toISOString()
      };
      saveStoredConfig(newConfig);

      return res.json({
        success: true,
        message: `Đã lưu cấu hình cơ sở dữ liệu đám mây (${detectedProvider.toUpperCase()}) thành công! Toàn bộ dữ liệu sẽ được lưu trữ độc lập trên tài khoản này.`,
        config: {
          ...newConfig,
          connectionString: connectionString.replace(/:[^@]+@/, ':******@')
        }
      });
    }

    res.status(400).json({ success: false, message: 'Chế độ không hợp lệ' });
  } catch (error) {
    console.error("Save config error:", error);
    res.status(500).json({ success: false, message: String(error) });
  }
});

// 4. GET FULL SQL DDL SCRIPT FOR MANUAL COPY/PASTE
databaseRouter.get('/ddl-script', async (req, res) => {
  try {
    const script = `-- ============================================================================
-- HỆ THỐNG QUẢN LÝ CÔNG VIỆC VÀ ĐÁNH GIÁ KPI - PHÒNG KẾ HOẠCH TÀI CHÍNH
-- MÃ SQL KHỞI TẠO BẢNG CHUẨN POSTGRESQL (SUPABASE / NEON / CLOUD SQL / PGADMIN)
-- ============================================================================

-- 1. BẢNG NHÂN SỰ & TÀI KHOẢN (users)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  zalo TEXT,
  position TEXT,
  "group" TEXT,
  role TEXT NOT NULL DEFAULT 'STAFF',
  status TEXT NOT NULL DEFAULT 'Đang làm',
  permissions TEXT,
  password TEXT,
  must_change_password BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG DANH MỤC HỆ THỐNG & CẤU HÌNH (categories)
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  properties JSONB,
  status TEXT NOT NULL DEFAULT 'Đang dùng',
  "order" INTEGER DEFAULT 0
);

-- 3. BẢNG KHAI BÁO CÔNG VIỆC HẰNG NGÀY (works)
CREATE TABLE IF NOT EXISTS works (
  id SERIAL PRIMARY KEY,
  work_id TEXT UNIQUE NOT NULL,
  month TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_group TEXT,
  task_name TEXT,
  task_code TEXT,
  detail TEXT,
  start_date TIMESTAMP,
  start_time TEXT,
  end_date TIMESTAMP,
  end_time TEXT,
  actual_end_date TIMESTAMP,
  hours NUMERIC,
  days INTEGER DEFAULT 1,
  proposed_nature TEXT,
  approved_nature TEXT,
  coef NUMERIC,
  base_score NUMERIC,
  converted_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'Đang xử lý',
  evidence TEXT,
  product_type TEXT,
  product_qty INTEGER DEFAULT 1,
  unit TEXT,
  project TEXT,
  related_unit TEXT,
  late_reason TEXT,
  penalty_exemption TEXT DEFAULT 'Không',
  edit_note TEXT,
  leader_approval TEXT DEFAULT 'Chưa duyệt',
  leader_note TEXT,
  approver_id INTEGER REFERENCES users(id),
  approval_date TIMESTAMP,
  source TEXT DEFAULT 'WEBAPP',
  data_status TEXT DEFAULT 'OK',
  sys_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG PHÂN CÔNG GIAO VIỆC (assignments)
CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  assignment_id TEXT UNIQUE NOT NULL,
  month TEXT NOT NULL,
  assigner_id INTEGER NOT NULL REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_group TEXT,
  task_name TEXT,
  task_code TEXT,
  base_score NUMERIC,
  suggested_nature TEXT,
  suggested_coef NUMERIC,
  expected_converted_score NUMERIC,
  detail TEXT,
  assign_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  start_date TIMESTAMP,
  deadline TIMESTAMP,
  product_required TEXT,
  product_type TEXT,
  product_qty INTEGER,
  unit TEXT,
  priority TEXT DEFAULT 'Bình thường',
  receive_status TEXT DEFAULT 'Chưa xem',
  view_date TIMESTAMP,
  receive_date TIMESTAMP,
  work_id INTEGER REFERENCES works(id),
  leader_note TEXT,
  receiver_note TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. BẢNG THÔNG BÁO & NHẮC VIỆC (notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  notify_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sender_id INTEGER REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT,
  title TEXT,
  content TEXT,
  related_target TEXT,
  status TEXT DEFAULT 'Chưa xem',
  view_date TIMESTAMP,
  note TEXT
);

-- 6. BẢNG ĐĂNG KÝ LÀM THÊM NGOÀI GIỜ (overtimes)
CREATE TABLE IF NOT EXISTS overtimes (
  id SERIAL PRIMARY KEY,
  ot_id TEXT UNIQUE NOT NULL,
  month TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ot_date TIMESTAMP NOT NULL,
  start_time TEXT,
  end_time TEXT,
  break_minutes INTEGER DEFAULT 0,
  total_reg_hours NUMERIC,
  content TEXT,
  reason TEXT,
  project TEXT,
  expected_result TEXT,
  actual_result TEXT,
  evidence TEXT,
  employee_note TEXT,
  approval_status TEXT DEFAULT 'Chờ duyệt',
  approved_hours NUMERIC,
  approver_note TEXT,
  approver_id INTEGER REFERENCES users(id),
  approval_date TIMESTAMP,
  allow_edit BOOLEAN DEFAULT false,
  data_status TEXT DEFAULT 'OK',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. BẢNG KẾT QUẢ KPI THÁNG (kpi_results)
CREATE TABLE IF NOT EXISTS kpi_results (
  id SERIAL PRIMARY KEY,
  kpi_id TEXT UNIQUE NOT NULL,
  month TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registered_works INTEGER,
  approved_works INTEGER,
  pending_works INTEGER,
  supplement_works INTEGER,
  rejected_works INTEGER,
  approved_hours NUMERIC,
  converted_score NUMERIC,
  personal_share NUMERIC,
  a_score NUMERIC,
  b1_score NUMERIC,
  b2_score NUMERIC,
  b_score NUMERIC,
  c1_score NUMERIC,
  c2_score NUMERIC,
  c_score NUMERIC,
  d_score NUMERIC,
  total_kpi NUMERIC,
  rank TEXT,
  warning TEXT,
  locked_status TEXT DEFAULT 'Chưa chốt',
  note TEXT,
  details_a JSONB,
  details_c JSONB,
  details_d JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. BẢNG NHẬT KÝ HỆ THỐNG (system_logs)
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  log_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER REFERENCES users(id),
  action TEXT,
  target TEXT,
  result TEXT,
  note TEXT,
  details JSONB
);

-- TẠO CÁC CHỈ MỤC INDEX ĐỂ TỐI ƯU HIỆU SUẤT TÌM KIẾM
CREATE INDEX IF NOT EXISTS idx_works_user_month ON works(user_id, month);
CREATE INDEX IF NOT EXISTS idx_assignments_receiver_month ON assignments(receiver_id, month);
CREATE INDEX IF NOT EXISTS idx_overtimes_user_month ON overtimes(user_id, month);
CREATE INDEX IF NOT EXISTS idx_kpi_user_month ON kpi_results(user_id, month);
`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(script);
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
