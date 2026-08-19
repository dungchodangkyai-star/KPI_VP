import { drizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema.ts';
import fs from 'fs';
import path from 'path';

declare global {
  var _pgliteClient: PGlite | undefined;
  var _drizzleDb: any | undefined;
}

const DB_DIR = path.resolve(process.cwd(), 'data', 'kpi-pglite');

export const initDb = async () => {
  if (!global._pgliteClient) {
    try {
      if (!fs.existsSync(path.dirname(DB_DIR))) {
        fs.mkdirSync(path.dirname(DB_DIR), { recursive: true });
      }
      global._pgliteClient = new PGlite(DB_DIR);
    } catch (e) {
      console.warn("Failed to create file-based PGlite, falling back to memory:", e);
      global._pgliteClient = new PGlite();
    }
  }

  // Ensure all tables exist by executing each CREATE TABLE
  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS users (
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
    );`,

    `CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      properties JSONB,
      status TEXT NOT NULL DEFAULT 'Đang dùng',
      "order" INTEGER DEFAULT 0
    );`,

    `CREATE TABLE IF NOT EXISTS works (
      id SERIAL PRIMARY KEY,
      work_id TEXT UNIQUE NOT NULL,
      month TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
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
      days INTEGER,
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
      source TEXT,
      data_status TEXT DEFAULT 'OK',
      sys_note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY,
      assignment_id TEXT UNIQUE NOT NULL,
      month TEXT NOT NULL,
      assigner_id INTEGER NOT NULL REFERENCES users(id),
      receiver_id INTEGER NOT NULL REFERENCES users(id),
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
    );`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      notify_id TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sender_id INTEGER REFERENCES users(id),
      receiver_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT,
      title TEXT,
      content TEXT,
      related_target TEXT,
      status TEXT DEFAULT 'Chưa xem',
      view_date TIMESTAMP,
      note TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS overtimes (
      id SERIAL PRIMARY KEY,
      ot_id TEXT UNIQUE NOT NULL,
      month TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
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
    );`,

    `CREATE TABLE IF NOT EXISTS kpi_results (
      id SERIAL PRIMARY KEY,
      kpi_id TEXT UNIQUE NOT NULL,
      month TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
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
    );`,

    `CREATE TABLE IF NOT EXISTS system_logs (
      id SERIAL PRIMARY KEY,
      log_id TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id),
      action TEXT,
      target TEXT,
      result TEXT,
      note TEXT,
      details JSONB
    );`
  ];

  for (const sql of tableStatements) {
    try {
      await global._pgliteClient.exec(sql);
    } catch (e) {
      console.error("Error executing table statement:", e);
    }
  }

  if (!global._drizzleDb) {
    global._drizzleDb = drizzle(global._pgliteClient, { schema });
  }

  return global._drizzleDb;
};

// Initialize synchronously for immediate export
if (!global._pgliteClient) {
  try {
    if (!fs.existsSync(path.dirname(DB_DIR))) {
      fs.mkdirSync(path.dirname(DB_DIR), { recursive: true });
    }
    global._pgliteClient = new PGlite(DB_DIR);
  } catch (e) {
    console.warn("Failed to create file-based PGlite, falling back to memory:", e);
    global._pgliteClient = new PGlite();
  }
}

export const client = global._pgliteClient;
export const db = drizzle(client, { schema });

