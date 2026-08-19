import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  Download,
  FileCode,
  HardDrive,
  Cpu,
  KeyRound,
  Info,
  Layers,
  Terminal,
  Settings,
  HelpCircle,
  Lock
} from 'lucide-react';

interface DbStatus {
  success: boolean;
  status: string;
  mode: 'pglite_local' | 'external_postgres';
  provider: 'supabase' | 'neon' | 'cloudsql' | 'custom' | 'local';
  latencyMs: number;
  maskedUrl?: string;
  dbEngine: string;
  storageLocation: string;
  stats: {
    users: number;
    categories: number;
    works: number;
    assignments: number;
    overtimes: number;
    kpiResults: number;
  };
  lastUpdated: string;
}

export default function AdminDatabase() {
  const [activeTab, setActiveTab] = useState<'config' | 'guide_supabase' | 'guide_neon' | 'guide_nas' | 'guide_windows' | 'ddl_script'>('config');
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Configuration Form State
  const [selectedMode, setSelectedMode] = useState<'pglite_local' | 'external_postgres'>('pglite_local');
  const [connectionString, setConnectionString] = useState('');
  const [showManualInputs, setShowManualInputs] = useState(false);
  const [manualHost, setManualHost] = useState('');
  const [manualPort, setManualPort] = useState('5432');
  const [manualDb, setManualDb] = useState('postgres');
  const [manualUser, setManualUser] = useState('postgres');
  const [manualPassword, setManualPassword] = useState('');
  const [manualSsl, setManualSsl] = useState(true);

  // Action Results
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [ddlScript, setDdlScript] = useState<string>('');

  useEffect(() => {
    fetchStatus();
    fetchDdlScript();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/database/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data);
        setSelectedMode(data.mode);
        if (data.maskedUrl) {
          setConnectionString(data.maskedUrl);
        }
      }
    } catch (e) {
      console.error('Error fetching db status:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDdlScript = async () => {
    try {
      const res = await fetch('/api/database/ddl-script');
      const text = await res.text();
      setDdlScript(text);
    } catch (e) {
      console.error('Error fetching DDL script:', e);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      let payload: any = {};
      if (showManualInputs) {
        payload = {
          host: manualHost.trim(),
          port: parseInt(manualPort) || 5432,
          database: manualDb.trim(),
          user: manualUser.trim(),
          password: manualPassword,
          ssl: manualSsl,
        };
      } else {
        payload = { connectionString: connectionString.trim() };
      }

      const res = await fetch('/api/database/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Kết nối thành công!' : 'Lỗi kết nối'),
        latencyMs: data.latencyMs,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Lỗi mạng: ' + String(err),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      let finalUri = connectionString.trim();
      if (showManualInputs && selectedMode === 'external_postgres') {
        const safeUser = manualUser.trim() || 'postgres';
        const safePwd = encodeURIComponent(manualPassword || '');
        const safeHost = manualHost.trim();
        const safePort = manualPort.trim() || '5432';
        const safeDb = manualDb.trim() || 'postgres';
        const sslParam = manualSsl ? '?sslmode=require' : '';
        finalUri = `postgresql://${safeUser}:${safePwd}@${safeHost}:${safePort}/${safeDb}${sslParam}`;
      }

      const res = await fetch('/api/database/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: selectedMode,
          connectionString: selectedMode === 'external_postgres' ? finalUri : undefined,
        }),
      });

      const data = await res.json();
      setSaveResult({
        success: data.success,
        message: data.message || (data.success ? 'Đã lưu cấu hình thành công!' : 'Lỗi lưu cấu hình'),
      });

      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      setSaveResult({
        success: false,
        message: 'Lỗi kết nối: ' + String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2500);
  };

  const downloadDdlScript = () => {
    const blob = new Blob([ddlScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Khoi_Tao_Database_KPI_KHTC_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1280px] mx-auto flex flex-col gap-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1F4E78] to-[#2B6CB0] text-white flex items-center justify-center shadow-md shadow-blue-900/20 shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              Cấu hình Lưu trữ & Cơ sở Dữ liệu Đám mây
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Chuyển giao & Quản trị
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấu hình tài khoản Database của khách hàng, chuyển giao dữ liệu độc lập và hướng dẫn tạo CSDL miễn phí
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới trạng thái</span>
          </button>
        </div>
      </div>

      {/* Active Database Status Overview Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Trạng thái CSDL</div>
            <div className="text-sm font-black text-slate-900 flex items-center gap-1.5 mt-0.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {status?.mode === 'external_postgres' ? `Cloud PostgreSQL (${status.provider.toUpperCase()})` : 'PGlite Cục bộ (Miễn phí)'}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Độ trễ phản hồi (Ping)</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">
              {status ? `${status.latencyMs} ms` : '...'}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng số bản ghi</div>
            <div className="text-sm font-black text-slate-900 mt-0.5 truncate">
              {status ? `${status.stats.works} công việc | ${status.stats.users} nhân sự` : '...'}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tính độc lập dữ liệu</div>
            <div className="text-sm font-black text-slate-900 mt-0.5 text-amber-900">
              {status?.mode === 'external_postgres' ? 'Tài khoản khách hàng' : 'Cục bộ Applet'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100/90 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'config'
              ? 'bg-white text-[#1F4E78] shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Settings className="w-4 h-4" />
          1. Cấu hình Kết nối CSDL Khách hàng
        </button>

        <button
          onClick={() => setActiveTab('guide_supabase')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'guide_supabase'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Cloud className="w-4 h-4 text-emerald-600" />
          2. Hướng dẫn Supabase (Miễn phí 2 phút)
        </button>

        <button
          onClick={() => setActiveTab('guide_neon')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'guide_neon'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Zap className="w-4 h-4 text-teal-600" />
          3. Hướng dẫn Neon.tech (1 phút)
        </button>

        <button
          onClick={() => setActiveTab('guide_nas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'guide_nas'
              ? 'bg-white text-indigo-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <HardDrive className="w-4 h-4 text-indigo-600" />
          4. Máy chủ NAS XPEnology (Private Cloud)
        </button>

        <button
          onClick={() => setActiveTab('guide_windows')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'guide_windows'
              ? 'bg-white text-blue-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Cpu className="w-4 h-4 text-blue-600" />
          5. Máy tính Windows Phòng ban
        </button>

        <button
          onClick={() => setActiveTab('ddl_script')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'ddl_script'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileCode className="w-4 h-4 text-purple-600" />
          6. Mã SQL Khởi tạo bảng (DDL)
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: DATABASE CONFIGURATION */}
      {/* ===================================================================== */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Configuration */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-[#1F4E78]" />
                Lựa chọn Chế độ Lưu trữ CSDL
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Chọn phương thức lưu trữ để ứng dụng ghi nhận dữ liệu độc lập trên tài khoản của khách hàng
              </p>
            </div>

            {/* Mode Selector Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mode 1: Local PGlite */}
              <div
                onClick={() => setSelectedMode('pglite_local')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 ${
                  selectedMode === 'pglite_local'
                    ? 'border-[#1F4E78] bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-[#1F4E78]" />
                    Chế độ 1: Cục bộ Applet (Miễn phí)
                  </span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMode === 'pglite_local' ? 'border-[#1F4E78] bg-[#1F4E78]' : 'border-slate-300'}`}>
                    {selectedMode === 'pglite_local' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Dữ liệu lưu trực tiếp trong container của applet bằng công nghệ PostgreSQL nhúng (PGlite). Không cần tài khoản ngoài.
                </p>
                <div className="mt-auto pt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>0 VNĐ - Tự động sẵn sàng</span>
                </div>
              </div>

              {/* Mode 2: External PostgreSQL */}
              <div
                onClick={() => setSelectedMode('external_postgres')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 ${
                  selectedMode === 'external_postgres'
                    ? 'border-[#1F4E78] bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-emerald-600" />
                    Chế độ 2: CSDL Đám mây của Khách hàng
                  </span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMode === 'external_postgres' ? 'border-[#1F4E78] bg-[#1F4E78]' : 'border-slate-300'}`}>
                    {selectedMode === 'external_postgres' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Kết nối tới tài khoản CSDL riêng của khách hàng (Supabase / Neon / Cloud SQL). Dữ liệu 100% thuộc sở hữu của họ.
                </p>
                <div className="mt-auto pt-2 flex items-center gap-1 text-[10px] font-bold text-blue-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Khuyên dùng khi bàn giao chính thức</span>
                </div>
              </div>
            </div>

            {/* External DB Settings Panel */}
            {selectedMode === 'external_postgres' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#1F4E78]" />
                    Chuỗi kết nối (Database Connection String URL):
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowManualInputs(!showManualInputs)}
                    className="text-[11px] font-bold text-[#1F4E78] hover:underline"
                  >
                    {showManualInputs ? '← Dán dạng URL đầy đủ' : 'Nhập từng ô thủ công →'}
                  </button>
                </div>

                {!showManualInputs ? (
                  <div>
                    <input
                      type="text"
                      value={connectionString}
                      onChange={(e) => setConnectionString(e.target.value)}
                      placeholder="postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres?sslmode=require"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:border-[#1F4E78] focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Ví dụ định dạng Supabase: <code className="bg-slate-200 px-1 py-0.5 rounded">postgresql://postgres:matkhau@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres</code>
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Máy chủ (Host / Endpoint)</label>
                      <input
                        type="text"
                        value={manualHost}
                        onChange={(e) => setManualHost(e.target.value)}
                        placeholder="db.xxxxxx.supabase.co hoặc ep-xxxx.neon.tech"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Cổng (Port)</label>
                      <input
                        type="number"
                        value={manualPort}
                        onChange={(e) => setManualPort(e.target.value)}
                        placeholder="5432"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tên Database</label>
                      <input
                        type="text"
                        value={manualDb}
                        onChange={(e) => setManualDb(e.target.value)}
                        placeholder="postgres"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tên người dùng (User)</label>
                      <input
                        type="text"
                        value={manualUser}
                        onChange={(e) => setManualUser(e.target.value)}
                        placeholder="postgres"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Mật khẩu CSDL (Password)</label>
                      <input
                        type="password"
                        value={manualPassword}
                        onChange={(e) => setManualPassword(e.target.value)}
                        placeholder="Nhập mật khẩu database của khách hàng..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Test Connection Button */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testing ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>Kiểm tra kết nối (Ping Test)</span>
                  </button>

                  {testResult && (
                    <span className={`text-xs font-bold flex items-center gap-1 ${testResult.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {testResult.message} {testResult.latencyMs ? `(${testResult.latencyMs}ms)` : ''}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Save & Apply Button */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                {saveResult && (
                  <span className={`text-xs font-bold flex items-center gap-1 ${saveResult.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {saveResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {saveResult.message}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-6 py-2.5 bg-[#1F4E78] hover:bg-[#173a5a] text-white rounded-xl text-xs font-black transition shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Lưu & Áp dụng Cấu hình CSDL</span>
              </button>
            </div>
          </div>

          {/* Right Column: Handover & Backup Card */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-slate-900">Bàn giao & Độc lập Tài khoản</h4>
                  <p className="text-[10px] text-slate-500">Quyền sở hữu và thanh toán thuộc về khách hàng</p>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p>
                  ✅ <strong>Không tốn phí tài khoản của bạn</strong>: Khi khách hàng tạo tài khoản Supabase / Neon riêng, dung lượng và request sẽ trừ vào hạn mức của họ.
                </p>
                <p>
                  ✅ <strong>Dung lượng miễn phí thoải mái</strong>: 500MB của Supabase đủ dùng cho 30 nhân sự ghi nhận KPI trong hơn 5 năm.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  onClick={downloadDdlScript}
                  className="w-full px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-between border border-slate-200"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-purple-600" />
                    Tải File SQL Khởi tạo bảng (.sql)
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => setActiveTab('guide_supabase')}
                  className="w-full px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold transition flex items-center justify-between border border-emerald-200"
                >
                  <span className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-emerald-600" />
                    Xem Hướng dẫn tạo Supabase (2 phút)
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: SUPABASE STEP-BY-STEP GUIDE */}
      {/* ===================================================================== */}
      {activeTab === 'guide_supabase' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-black text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Hướng dẫn Miễn phí 100% (Khuyên dùng nhất)
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                Cách tạo Cơ sở Dữ liệu PostgreSQL trên Supabase (Mất 2 phút)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Supabase cung cấp 500MB lưu trữ và 50.000 người dùng miễn phí vĩnh viễn, đủ vận hành phòng ban 5-10 năm.
              </p>
            </div>

            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <span>Mở trang Supabase.com</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* 4 Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <h4 className="font-bold text-sm text-slate-900">Đăng ký & Tạo Project</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Vào <strong>supabase.com</strong>, bấm <strong>Start your project</strong> và đăng nhập bằng tài khoản Gmail của khách hàng.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bấm <strong>New project</strong>:
              </p>
              <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                <li><strong>Name</strong>: Đặt tên (VD: <code className="bg-slate-100 px-1 py-0.5 rounded">kpi-khtc</code>)</li>
                <li><strong>Database Password</strong>: Nhập mật khẩu CSDL (Hãy ghi nhớ mật khẩu này!)</li>
                <li><strong>Region</strong>: Chọn <strong>Singapore (ap-southeast-1)</strong> để tốc độ nhanh nhất tại Việt Nam.</li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <h4 className="font-bold text-sm text-slate-900">Lấy chuỗi kết nối (URI)</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sau khi tạo xong project, ở thanh menu bên trái Supabase:
              </p>
              <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                <li>Bấm vào biểu tượng <strong>Project Settings</strong> (bánh răng ở góc dưới bên trái).</li>
                <li>Chọn mục <strong>Database</strong>.</li>
                <li>Kéo xuống phần <strong>Connection string</strong> -&gt; Chọn tab <strong>URI</strong>.</li>
                <li>Bấm nút <strong>Copy</strong> chuỗi kết nối.</li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <h4 className="font-bold text-sm text-slate-900">Dán vào Tab Cấu hình của App này</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Quay lại tab <strong>1. Cấu hình Kết nối CSDL Khách hàng</strong>:
              </p>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <p>1. Dán chuỗi kết nối vừa copy vào ô nhập liệu.</p>
                <p>2. Thay thế <code className="bg-amber-100 text-amber-900 font-bold px-1 py-0.5 rounded">[YOUR-PASSWORD]</code> bằng mật khẩu CSDL đã đặt ở Bước 1.</p>
                <p>3. Bấm nút <strong>Kiểm tra kết nối</strong> -&gt; Bấm <strong>Lưu & Áp dụng</strong>.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  4
                </span>
                <h4 className="font-bold text-sm text-slate-900">(Tùy chọn) Chạy SQL Editor trên Supabase</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Nếu muốn tự tay khởi tạo toàn bộ bảng trước trên giao diện Supabase:
              </p>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2">
                <p>Bấm vào tab <strong>SQL Editor</strong> trên Supabase -&gt; Bấm <strong>New Query</strong> -&gt; Dán toàn bộ mã DDL từ tab <strong>4. Mã SQL Khởi tạo bảng</strong> và bấm <strong>RUN</strong>.</p>
                <button
                  onClick={() => copyToClipboard(ddlScript, 'supabase_ddl')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5"
                >
                  {copiedItem === 'supabase_ddl' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedItem === 'supabase_ddl' ? 'Đã sao chép mã SQL DDL!' : 'Sao chép mã SQL DDL ngay'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: NEON.TECH STEP-BY-STEP GUIDE */}
      {/* ===================================================================== */}
      {activeTab === 'guide_neon' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-black text-teal-700 uppercase tracking-wider bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                Serverless PostgreSQL Cực nhanh (1 phút)
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                Cách tạo CSDL PostgreSQL trên Neon.tech
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Neon tự động co giãn, tạo database trong 10 giây và có sẵn chuỗi kết nối đầy đủ mật khẩu.
              </p>
            </div>

            <a
              href="https://neon.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <span>Mở trang Neon.tech</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
              <span className="w-7 h-7 rounded-full bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0">1</span>
              <h4 className="font-bold text-sm text-slate-900">Đăng ký tài khoản Neon</h4>
              <p className="text-xs text-slate-600">Truy cập <strong>neon.tech</strong> và đăng nhập bằng tài khoản Google.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
              <span className="w-7 h-7 rounded-full bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0">2</span>
              <h4 className="font-bold text-sm text-slate-900">Tạo Project & Copy URL</h4>
              <p className="text-xs text-slate-600">Đặt tên project, chọn Region <strong>Singapore</strong>. Trên Dashboard, bấm nút <strong>Copy</strong> chuỗi <code>Connection string</code>.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
              <span className="w-7 h-7 rounded-full bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0">3</span>
              <h4 className="font-bold text-sm text-slate-900">Dán & Hoàn tất</h4>
              <p className="text-xs text-slate-600">Dán vào mục <strong>Cấu hình Kết nối CSDL</strong> bên trên và bấm Lưu. Dữ liệu sẽ đồng bộ tức thì.</p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: NAS XPENOLOGY (SYNOLOGY DSM) PRIVATE CLOUD GUIDE */}
      {/* ===================================================================== */}
      {activeTab === 'guide_nas' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-black text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                Đám Mây Riêng Biệt (Private Cloud Tối Ưu Nhất)
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                Biến Máy NAS XPEnology (Synology) thành Máy Chủ CSDL Online 24/7
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Giải pháp hoàn hảo: Vừa làm chủ 100% phần cứng trong phòng, vừa giải quyết triệt để vấn đề nhân viên truy cập từ xa ngoài mạng cơ quan.
              </p>
            </div>

            <div className="px-3.5 py-1.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Chống hỏng ổ đĩa RAID + Hoạt động 24/7</span>
            </div>
          </div>

          {/* Solution Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 flex flex-col gap-1.5">
              <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-600" />
                1. Chạy cực nhẹ qua Docker
              </h4>
              <p className="text-[11px] text-indigo-900 leading-relaxed">
                Synology DSM có sẵn <strong>Container Manager / Docker</strong>, chỉ cần kéo image <code>postgres:16</code> là chạy ngay, tốn chưa tới 150MB RAM.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col gap-1.5">
              <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-emerald-600" />
                2. Ra ngoài mạng không cần IP tĩnh
              </h4>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                Dùng <strong>Cloudflare Tunnel (Miễn phí)</strong> hoặc <strong>Tailscale / DDNS</strong>: Nhân viên ở nhà, đi công tác kết nối an toàn mà không cần mở port modem.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 flex flex-col gap-1.5">
              <h4 className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-purple-600" />
                3. Dữ liệu an toàn tuyệt đối
              </h4>
              <p className="text-[11px] text-purple-900 leading-relaxed">
                Thư mục dữ liệu mount vào Volume RAID của NAS. Cho dù có cập nhật hay khởi động lại Docker, dữ liệu vẫn nguyên vẹn 100%.
              </p>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="space-y-6">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-700" />
              Quy trình cài đặt trên giao diện Synology DSM (Mất khoảng 10 phút)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step 1: Docker Compose */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <h4 className="font-bold text-sm text-slate-900">Cài đặt PostgreSQL qua Container Manager</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Vào <strong>Container Manager</strong> trên DSM -&gt; Chọn mục <strong>Project</strong> -&gt; Bấm <strong>Create</strong>:
                </p>
                <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-[11px] space-y-1 relative">
                  <pre className="overflow-x-auto custom-scrollbar">
{`version: '3.8'
services:
  kpi-postgres:
    image: postgres:16-alpine
    container_name: kpi_db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: matkhau_kpi_2026
      POSTGRES_DB: postgres
    ports:
      - "5432:5432"
    volumes:
      - /volume1/docker/kpi-postgres:/var/lib/postgresql/data`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`version: '3.8'
services:
  kpi-postgres:
    image: postgres:16-alpine
    container_name: kpi_db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: matkhau_kpi_2026
      POSTGRES_DB: postgres
    ports:
      - "5432:5432"
    volumes:
      - /volume1/docker/kpi-postgres:/var/lib/postgresql/data`, 'docker_compose')}
                    className="absolute top-2 right-2 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-sans font-bold shadow-xs"
                  >
                    {copiedItem === 'docker_compose' ? 'Đã sao chép!' : 'Copy Compose YAML'}
                  </button>
                </div>
              </div>

              {/* Step 2: Out of network access */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <h4 className="font-bold text-sm text-slate-900">Mở kết nối ra ngoài Internet</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Để nhân viên ở nhà hoặc đi công tác kết nối được, bạn chọn 1 trong 2 cách cực kỳ đơn giản:
                </p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="p-2 bg-indigo-50/70 rounded-md border border-indigo-100">
                    <p className="font-bold text-indigo-950">Cách A (Khuyên dùng - Cloudflare Tunnel):</p>
                    <p className="text-[11px] text-indigo-900 mt-0.5">
                      Chạy container <code className="bg-white px-1 rounded">cloudflared</code> trên NAS. Không cần mở cổng modem, không cần IP tĩnh, tự động có SSL HTTPS bảo mật tuyệt đối.
                    </p>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-md">
                    <p className="font-bold text-slate-900">Cách B (DDNS + Port Forwarding):</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Dùng tên miền DDNS miễn phí (như DuckDNS/No-IP) và mở port 5432 trên Modem trỏ vào IP nội bộ của máy NAS.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3: Connection String */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <h4 className="font-bold text-sm text-slate-900">Dán chuỗi kết nối vào Phần mềm</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lấy địa chỉ IP mạng LAN (hoặc tên miền từ xa) của NAS dán vào tab <strong>1. Cấu hình Kết nối CSDL</strong>:
                </p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5">
                  <p className="font-bold text-slate-900">Khi dùng nội bộ trong cơ quan:</p>
                  <code className="block bg-slate-100 text-slate-900 font-mono text-[11px] p-1.5 rounded break-all">
                    postgresql://postgres:matkhau_kpi_2026@192.168.1.150:5432/postgres
                  </code>
                  <p className="font-bold text-slate-900 mt-2">Khi dùng qua tên miền ra ngoài mạng:</p>
                  <code className="block bg-indigo-50 text-indigo-950 font-mono text-[11px] p-1.5 rounded break-all border border-indigo-200">
                    postgresql://postgres:matkhau_kpi_2026@nas.tenphongban.com:5432/postgres
                  </code>
                </div>
              </div>

              {/* Step 4: Auto Backup */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0">4</span>
                  <h4 className="font-bold text-sm text-slate-900">Tự động sao lưu & Bền bỉ</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  NAS XPEnology hỗ trợ các tính năng bảo vệ cao cấp nhất:
                </p>
                <ul className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                  <li><strong>Hyper Backup:</strong> Tự động sao lưu toàn bộ dữ liệu KPI mỗi đêm lên Google Drive hoặc USB.</li>
                  <li><strong>Snapshot Replication:</strong> Chống Ransomware (virus mã hóa tống tiền), khôi phục dữ liệu tức thì.</li>
                  <li><strong>Tiết kiệm điện:</strong> Công suất tiêu thụ chỉ 15–25W, chạy êm ái năm này qua năm khác.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: WINDOWS ON-PREMISE SERVER GUIDE */}
      {/* ===================================================================== */}
      {activeTab === 'guide_windows' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-black text-blue-700 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                Tận dụng Máy tính Phòng làm Máy chủ (On-Premise)
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                Cách Biến Máy tính Windows 24/24 thành Máy chủ CSDL Nội bộ
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chủ động 100% phần cứng, dung lượng ổ cứng không giới hạn, tốc độ phản hồi cực nhanh trong mạng LAN cơ quan.
              </p>
            </div>

            <a
              href="https://www.postgresql.org/download/windows/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <span>Trang tải PostgreSQL Windows</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Pros & Cons Evaluation Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Ưu điểm khi dùng máy Windows nội bộ
              </h4>
              <ul className="mt-2 text-xs text-emerald-950 space-y-1 list-disc list-inside">
                <li><strong>Tốc độ cực nhanh:</strong> Ping mạng LAN dưới 1–5ms, phản hồi tức thì.</li>
                <li><strong>Dung lượng không giới hạn:</strong> Thoải mái lưu hàng triệu bản ghi theo dung lượng ổ cứng máy tính (500GB – 2TB).</li>
                <li><strong>Hoàn toàn làm chủ:</strong> Dữ liệu nằm trong phòng, không phụ thuộc internet quốc tế.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
              <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Lưu ý quan trọng cần duy trì
              </h4>
              <ul className="mt-2 text-xs text-amber-950 space-y-1 list-disc list-inside">
                <li><strong>Nguồn điện & Mạng:</strong> Máy cần bật liên tục và cắm dây mạng LAN cố định. Nên có bộ lưu điện UPS.</li>
                <li><strong>Sao lưu định kỳ:</strong> Cần đặt lịch sao lưu file sao lưu ra ổ đĩa di động hoặc Google Drive phòng rủi ro hỏng ổ cứng máy tính.</li>
              </ul>
            </div>
          </div>

          {/* Step-by-step Setup instructions */}
          <div className="space-y-6">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-700" />
              Các bước cài đặt & cấu hình (Mất khoảng 10–15 phút, làm 1 lần duy nhất)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step 1 */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-blue-700 text-white font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <h4 className="font-bold text-sm text-slate-900">Cài đặt PostgreSQL for Windows</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tải bộ cài đặt <strong>PostgreSQL Installer</strong> (khuyên dùng bản 15 hoặc 16 x86-64) từ trang chủ:
                </p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                  <p>1. Chạy file <code className="bg-slate-100 px-1 py-0.5 rounded">postgresql-xx-windows-x64.exe</code>.</p>
                  <p>2. Bấm Next theo mặc định, tick chọn <strong>PostgreSQL Server</strong> và <strong>pgAdmin 4</strong>.</p>
                  <p>3. Đặt mật khẩu cho tài khoản <code className="bg-slate-100 px-1 py-0.5 rounded font-bold">postgres</code> (Ví dụ: <code>123456@kpi</code>).</p>
                  <p>4. Giữ nguyên Port mặc định là <strong>5432</strong> -&gt; Bấm Next để hoàn tất cài đặt.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-blue-700 text-white font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <h4 className="font-bold text-sm text-slate-900">Mở Port 5432 trên Windows Firewall</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mở <strong>PowerShell</strong> (với quyền <em>Run as Administrator</em>) trên máy tính đó và chạy 1 dòng lệnh sau để mở cổng mạng LAN:
                </p>
                <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-[11px] flex items-center justify-between">
                  <span>New-NetFirewallRule -DisplayName "PostgreSQL 5432" -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Allow</span>
                  <button
                    onClick={() => copyToClipboard('New-NetFirewallRule -DisplayName "PostgreSQL 5432" -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Allow', 'ps_fw')}
                    className="ml-2 px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] shrink-0 font-sans font-bold"
                  >
                    {copiedItem === 'ps_fw' ? 'Đã chép!' : 'Copy lệnh'}
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-blue-700 text-white font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <h4 className="font-bold text-sm text-slate-900">Cho phép kết nối từ mạng nội bộ</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mở thư mục cài đặt <code className="bg-white px-1 py-0.5 rounded border border-slate-200">C:\Program Files\PostgreSQL\16\data\</code>:
                </p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5">
                  <p>1. Mở file <code className="font-bold">postgresql.conf</code> bằng Notepad -&gt; Tìm dòng <code>listen_addresses</code> sửa thành: <br/><code className="bg-slate-100 text-blue-800 font-bold px-1 py-0.5 rounded">listen_addresses = '*'</code></p>
                  <p>2. Mở file <code className="font-bold">pg_hba.conf</code> -&gt; Thêm vào cuối file dòng: <br/><code className="bg-slate-100 text-blue-800 font-bold px-1 py-0.5 rounded">host all all 0.0.0.0/0 scram-sha-256</code></p>
                  <p>3. Mở <strong>Services.msc</strong> trên Windows -&gt; Bấm chuột phải vào <strong>postgresql-x64-16</strong> chọn <strong>Restart</strong>.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-blue-700 text-white font-black text-xs flex items-center justify-center shrink-0">4</span>
                  <h4 className="font-bold text-sm text-slate-900">Lấy IP máy tính & Dán vào App</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mở CMD gõ lệnh <code>ipconfig</code> để xem địa chỉ IP mạng LAN của máy chủ đó (Ví dụ: <code className="bg-blue-50 text-blue-900 font-bold px-1 py-0.5 rounded">192.168.1.100</code>).
                </p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5">
                  <p>Định dạng chuỗi kết nối dán vào Tab 1:</p>
                  <code className="block bg-slate-100 text-slate-900 font-mono text-[11px] p-2 rounded break-all">
                    postgresql://postgres:matkhau@192.168.1.100:5432/postgres
                  </code>
                  <p className="text-[10px] text-slate-500">
                    Bấm <strong>Kiểm tra kết nối</strong> -&gt; <strong>Lưu cấu hình</strong> là hoàn tất!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: FULL DDL SQL SCRIPT */}
      {/* ===================================================================== */}
      {activeTab === 'ddl_script' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-purple-600" />
                Mã Lệnh SQL Khởi tạo Cơ sở Dữ liệu Chuẩn (DDL Script)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chứa toàn bộ cấu trúc 8 bảng chuẩn hóa, khóa ngoại, chỉ mục index tương thích 100% với PostgreSQL
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(ddlScript, 'ddl_tab')}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-purple-200"
              >
                {copiedItem === 'ddl_tab' ? <Check className="w-3.5 h-3.5 text-purple-700" /> : <Copy className="w-3.5 h-3.5 text-purple-700" />}
                <span>{copiedItem === 'ddl_tab' ? 'Đã sao chép mã SQL!' : 'Sao chép toàn bộ SQL'}</span>
              </button>

              <button
                onClick={downloadDdlScript}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Tải file .sql</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-[520px] custom-scrollbar leading-relaxed">
              {ddlScript || '-- Đang tải mã SQL...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
