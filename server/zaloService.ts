import fs from 'fs';
import path from 'path';

export interface ZaloConfig {
  method: 'webhook' | 'oa_zns' | 'group_webhook' | 'direct_app';
  senderPhone?: string;
  senderName?: string;
  webhookUrl?: string;
  groupWebhookUrl?: string;
  oaAccessToken?: string;
  oaTemplateId?: string;
  autoSendOnAssign?: boolean;
  messageTemplate: string;
  updatedAt?: string;
}

const CONFIG_FILE = path.join(process.cwd(), 'data', 'zalo-config.json');

export const DEFAULT_ZALO_TEMPLATE = `📌 THÔNG BÁO GIAO NHIỆM VỤ - {PHONG_BAN}
━━━━━━━━━━━━━━━━━━━━━
👤 Kính gửi: Anh/Chị {NGUOI_NHAN} ({CHUC_VU})
👑 Vai trò phân công: {VAI_TRO}
━━━━━━━━━━━━━━━━━━━━━
🎯 Tên nhiệm vụ: {TEN_VIEC}
🏷️ Mã nhiệm vụ: {MA_VIEC}
📂 Nhóm công việc: {NHOM_VIEC}
📅 Hạn hoàn thành: {HAN_CHOT}
📊 Điểm chuẩn: {DIEM_CHUAN} điểm | Hệ số K: {HE_SO_K}
📦 Sản phẩm yêu cầu: {SAN_PHAM}
🚨 Mức độ ưu tiên: {MUC_UU_TIEN}
{Y_KIEN_CHI_DAO}━━━━━━━━━━━━━━━━━━━━━
👉 Vui lòng truy cập hệ thống để tiếp nhận & báo cáo tiến độ:
🔗 {LINK_APP}`;

export const DEFAULT_ZALO_CONFIG: ZaloConfig = {
  method: 'webhook',
  senderPhone: '0905636344',
  senderName: 'Khuất Văn Sơn (Trưởng phòng KHTC)',
  webhookUrl: '',
  groupWebhookUrl: '',
  oaAccessToken: '',
  oaTemplateId: '',
  autoSendOnAssign: true,
  messageTemplate: DEFAULT_ZALO_TEMPLATE,
  updatedAt: new Date().toISOString()
};

export function getZaloConfig(): ZaloConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_ZALO_CONFIG, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error reading zalo-config.json:', error);
  }
  return DEFAULT_ZALO_CONFIG;
}

export function saveZaloConfig(config: Partial<ZaloConfig>): ZaloConfig {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const current = getZaloConfig();
    const updated: ZaloConfig = {
      ...current,
      ...config,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (error) {
    console.error('Error saving zalo-config.json:', error);
    throw error;
  }
}

export function formatZaloMessage(template: string, data: {
  receiverName: string;
  receiverPosition?: string;
  role: string;
  taskName: string;
  taskCode?: string;
  taskGroup?: string;
  deadline?: string;
  baseScore?: string | number;
  coef?: string | number;
  productRequired?: string;
  productQty?: number;
  unit?: string;
  priority?: string;
  leaderNote?: string;
  assignerName?: string;
  departmentName?: string;
  appUrl?: string;
}): string {
  let msg = template || DEFAULT_ZALO_TEMPLATE;
  const roleText = data.role === 'Chủ trì' ? '⭐ CHỦ TRÌ (CHÍNH)' : '👥 PHỐI HỢP THỰC HIỆN';
  const chiDaoText = data.leaderNote ? `💬 Chỉ đạo của Lãnh đạo: "${data.leaderNote}"\n` : '';
  const productText = data.productRequired || `${data.productQty || 1} ${data.unit || 'Sản phẩm'}`;

  msg = msg.replace(/{PHONG_BAN}/g, data.departmentName || 'PHÒNG KHTC');
  msg = msg.replace(/{NGUOI_NHAN}/g, data.receiverName || 'Chuyên viên');
  msg = msg.replace(/{CHUC_VU}/g, data.receiverPosition || 'Chuyên viên');
  msg = msg.replace(/{VAI_TRO}/g, roleText);
  msg = msg.replace(/{TEN_VIEC}/g, data.taskName || '');
  msg = msg.replace(/{MA_VIEC}/g, data.taskCode || 'NV-01');
  msg = msg.replace(/{NHOM_VIEC}/g, data.taskGroup || 'Chung');
  msg = msg.replace(/{HAN_CHOT}/g, data.deadline || 'Trong tháng');
  msg = msg.replace(/{DIEM_CHUAN}/g, String(data.baseScore || '10'));
  msg = msg.replace(/{HE_SO_K}/g, String(data.coef || '0.8'));
  msg = msg.replace(/{SAN_PHAM}/g, productText);
  msg = msg.replace(/{MUC_UU_TIEN}/g, data.priority || 'Bình thường');
  msg = msg.replace(/{Y_KIEN_CHI_DAO}/g, chiDaoText);
  msg = msg.replace(/{NGUOI_GIAO}/g, data.assignerName || 'Lãnh đạo phòng');
  msg = msg.replace(/{LINK_APP}/g, data.appUrl || 'https://kpi-khtc.local/my-works');

  return msg;
}

export async function sendZaloNotification(payload: {
  receiverPhone: string;
  receiverName: string;
  role: string;
  message: string;
  taskData: any;
  config?: ZaloConfig;
}): Promise<{ success: boolean; message: string; details?: any }> {
  const config = payload.config || getZaloConfig();
  const cleanPhone = payload.receiverPhone.replace(/[^0-9]/g, '');

  try {
    // 1. Webhook or Zalo Bot API
    if (config.method === 'webhook' && config.webhookUrl) {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          name: payload.receiverName,
          role: payload.role,
          message: payload.message,
          task: payload.taskData,
          sentAt: new Date().toISOString()
        })
      });
      return {
        success: true,
        message: `Đã gửi tự động qua Webhook Zalo tới ${payload.receiverName} (${cleanPhone})`,
        details: { status: response.status }
      };
    }

    // 2. Group Webhook
    if (config.method === 'group_webhook' && config.groupWebhookUrl) {
      const response = await fetch(config.groupWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: payload.message,
          task: payload.taskData,
          sentAt: new Date().toISOString()
        })
      });
      return {
        success: true,
        message: `Đã gửi thông báo tự động vào Nhóm Zalo phòng KHTC`,
        details: { status: response.status }
      };
    }

    // 3. Zalo OA ZNS API
    if (config.method === 'oa_zns' && config.oaAccessToken) {
      const response = await fetch('https://business.openapi.zalo.me/message/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': config.oaAccessToken
        },
        body: JSON.stringify({
          phone: cleanPhone.startsWith('0') ? '84' + cleanPhone.slice(1) : cleanPhone,
          template_id: config.oaTemplateId || 'default',
          template_data: {
            name: payload.receiverName,
            task: payload.taskData.taskName,
            deadline: payload.taskData.deadline
          }
        })
      });
      const data = await response.json();
      return {
        success: data.error === 0,
        message: data.error === 0 ? `Đã gửi ZNS thành công tới ${cleanPhone}` : (data.message || 'Lỗi gửi ZNS'),
        details: data
      };
    }

    // Default: Logged and ready for 1-click dispatch
    return {
      success: true,
      message: `Đã xử lý thông báo Zalo cho ${payload.receiverName} (${cleanPhone})`,
      details: { mode: 'direct_prepared' }
    };
  } catch (error: any) {
    console.error('Error sending Zalo notification:', error);
    return {
      success: false,
      message: `Lỗi kết nối Zalo: ${error.message || String(error)}`
    };
  }
}
