import React, { useState, useEffect } from 'react';
import { 
  Send, UserCheck, Clock, CheckCircle2, AlertCircle, RefreshCw, 
  Search, Edit3, Trash2, BellRing, Eye, FileText, Download, 
  ChevronDown, Layers, ShieldCheck, HelpCircle, Sparkles, Filter, Check, X, ArrowUpDown,
  Smartphone, MessageSquare, Copy, ExternalLink, Users, Crown, UserPlus, UserMinus, Phone, 
  Settings, Zap, CheckSquare, Sliders, ArrowRight, Radio
} from 'lucide-react';
import { exportStyledExcel } from '../excelUtils';
import { 
  STANDARD_MONTHS, 
  WORK_NATURE_COEFS, 
  DEFAULT_TASK_GROUPS, 
  DEFAULT_TASKS, 
  DEFAULT_PRODUCT_TYPES,
  formatDate, 
  formatDateInput, 
  formatMonth,
  getActiveLoggedInUser 
} from '../utils';
import { User, Assignment, Work } from '../types';

interface AssigneeRoleItem {
  userId: number;
  user: User;
  role: 'Chủ trì' | 'Phối hợp';
  customCoef?: number;
}

interface ZaloConfigState {
  method: 'webhook' | 'oa_zns' | 'group_webhook' | 'direct_app';
  senderPhone: string;
  senderName: string;
  webhookUrl: string;
  groupWebhookUrl: string;
  oaAccessToken: string;
  oaTemplateId: string;
  autoSendOnAssign: boolean;
  messageTemplate: string;
  updatedAt?: string;
}

const DEFAULT_TEMPLATE = `📌 THÔNG BÁO GIAO NHIỆM VỤ - {PHONG_BAN}
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

export default function AssignTask() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyToast, setCopyToast] = useState("");

  // Multi-assignee state
  const [selectedAssignees, setSelectedAssignees] = useState<AssigneeRoleItem[]>([]);

  // Filter state for assigned table
  const [selectedFilterMonth, setSelectedFilterMonth] = useState('08-2026');
  const [filterReceiverId, setFilterReceiverId] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState("");

  // Edit / Details / Remind modal state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [remindTarget, setRemindTarget] = useState<Assignment | null>(null);
  const [remindNote, setRemindNote] = useState("");
  const [isReminding, setIsReminding] = useState(false);

  // Zalo Config & Modal State
  const [showZaloConfigModal, setShowZaloConfigModal] = useState(false);
  const [zaloConfig, setZaloConfig] = useState<ZaloConfigState>({
    method: 'webhook',
    senderPhone: '0905636344',
    senderName: 'Khuất Văn Sơn (Trưởng phòng KHTC)',
    webhookUrl: '',
    groupWebhookUrl: '',
    oaAccessToken: '',
    oaTemplateId: '',
    autoSendOnAssign: true,
    messageTemplate: DEFAULT_TEMPLATE
  });
  const [isSavingZaloConfig, setIsSavingZaloConfig] = useState(false);
  const [isTestingZalo, setIsTestingZalo] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; previewText?: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    month: '08-2026',
    taskGroup: 'Kế hoạch vốn',
    taskName: 'Theo dõi kế hoạch vốn theo dự án, nguồn vốn',
    taskCode: 'KH01',
    baseScore: 10,
    suggestedNature: 'Trung bình',
    suggestedCoef: 0.8,
    productType: 'Bảng tổng hợp',
    unit: 'Bảng',
    productQty: 1,
    detail: '',
    startDate: formatDateInput(new Date()),
    deadline: formatDateInput(new Date(Date.now() + 3 * 86400000)),
    productRequired: 'Bảng tổng hợp vốn',
    priority: 'Bình thường',
    leaderNote: ''
  });

  // Calculate expected converted score
  const expectedScore = Math.round((Number(formData.baseScore) * Number(formData.suggestedCoef) * Number(formData.productQty || 1)) * 10) / 10;

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [resUsers, resAssign, resWorks, resZaloConfig] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/assignments'),
        fetch('/api/works'),
        fetch('/api/zalo/config')
      ]);

      const [dUsers, dAssign, dWorks, dZaloConfig] = await Promise.all([
        resUsers.json(),
        resAssign.json(),
        resWorks.json(),
        resZaloConfig.json()
      ]);

      if (dUsers.success && dUsers.data?.length > 0) {
        setUsers(dUsers.data);
        const active = getActiveLoggedInUser(dUsers.data);
        setCurrentUser(active);
        
        // If no assignee chosen yet, select first available staff member
        if (selectedAssignees.length === 0 && dUsers.data.length > 0) {
          const firstStaff = dUsers.data.find((u: User) => u.role === 'STAFF') || dUsers.data[0];
          if (firstStaff) {
            setSelectedAssignees([{
              userId: firstStaff.id,
              user: firstStaff,
              role: 'Chủ trì',
              customCoef: formData.suggestedCoef
            }]);
          }
        }
      }
      if (dAssign.success) setAssignments(dAssign.data || []);
      if (dWorks.success) setWorks(dWorks.data || []);
      if (dZaloConfig.success && dZaloConfig.data) {
        setZaloConfig(prev => ({ ...prev, ...dZaloConfig.data }));
      }
    } catch (e) {
      console.error("Fetch assign data error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    const handleUserChange = () => {
      if (users.length > 0) {
        const active = getActiveLoggedInUser(users);
        setCurrentUser(active);
      }
    };
    window.addEventListener('kpi_user_changed', handleUserChange);
    return () => window.removeEventListener('kpi_user_changed', handleUserChange);
  }, [users.length]);

  // Toggle user in assignee list
  const toggleUserAssignee = (u: User) => {
    const exists = selectedAssignees.find(a => a.userId === u.id);
    if (exists) {
      const remaining = selectedAssignees.filter(a => a.userId !== u.id);
      if (exists.role === 'Chủ trì' && remaining.length > 0 && !remaining.some(r => r.role === 'Chủ trì')) {
        remaining[0].role = 'Chủ trì';
      }
      setSelectedAssignees(remaining);
    } else {
      const hasLeader = selectedAssignees.some(a => a.role === 'Chủ trì');
      const newRole: 'Chủ trì' | 'Phối hợp' = hasLeader ? 'Phối hợp' : 'Chủ trì';
      setSelectedAssignees(prev => [
        ...prev,
        {
          userId: u.id,
          user: u,
          role: newRole,
          customCoef: newRole === 'Chủ trì' ? formData.suggestedCoef : 0.6
        }
      ]);
    }
  };

  // Toggle role between 'Chủ trì' and 'Phối hợp'
  const toggleAssigneeRole = (userId: number) => {
    setSelectedAssignees(prev => prev.map(item => {
      if (item.userId === userId) {
        const newRole = item.role === 'Chủ trì' ? 'Phối hợp' : 'Chủ trì';
        return {
          ...item,
          role: newRole,
          customCoef: newRole === 'Chủ trì' ? formData.suggestedCoef : 0.6
        };
      }
      return item;
    }));
  };

  // Select all staff members
  const handleSelectAllStaff = () => {
    const all = users.map((u, idx) => ({
      userId: u.id,
      user: u,
      role: (idx === 0 ? 'Chủ trì' : 'Phối hợp') as 'Chủ trì' | 'Phối hợp',
      customCoef: idx === 0 ? formData.suggestedCoef : 0.6
    }));
    setSelectedAssignees(all);
  };

  // Clear all assignees
  const handleClearAssignees = () => {
    setSelectedAssignees([]);
  };

  // Handle task group change
  const handleGroupChange = (group: string) => {
    const defaultTasks = DEFAULT_TASKS[group] || [];
    const firstTask = defaultTasks[0];
    if (firstTask) {
      const nature = firstTask.nature || 'Trung bình';
      const coefObj = WORK_NATURE_COEFS[nature] || { coef: 0.8 };
      setFormData(prev => ({
        ...prev,
        taskGroup: group,
        taskName: firstTask.name,
        taskCode: firstTask.code,
        baseScore: firstTask.score,
        suggestedNature: nature,
        suggestedCoef: coefObj.coef,
        productType: firstTask.productType || 'Báo cáo',
        unit: firstTask.unit || 'Sản phẩm',
        productRequired: firstTask.productType || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        taskGroup: group,
        taskName: '',
        taskCode: '',
        baseScore: 10,
        suggestedNature: 'Trung bình',
        suggestedCoef: 0.8
      }));
    }
  };

  // Handle task selection
  const handleTaskSelect = (taskName: string) => {
    const list = DEFAULT_TASKS[formData.taskGroup] || [];
    const found = list.find(t => t.name === taskName);
    if (found) {
      const coefObj = WORK_NATURE_COEFS[found.nature] || { coef: 0.8 };
      setFormData(prev => ({
        ...prev,
        taskName: found.name,
        taskCode: found.code,
        baseScore: found.score,
        suggestedNature: found.nature,
        suggestedCoef: coefObj.coef,
        productType: found.productType || 'Báo cáo',
        unit: found.unit || 'Sản phẩm',
        productRequired: found.productType || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, taskName }));
    }
  };

  // Handle nature change
  const handleNatureChange = (nature: string) => {
    const coefObj = WORK_NATURE_COEFS[nature] || { coef: 0.8 };
    setFormData(prev => ({
      ...prev,
      suggestedNature: nature,
      suggestedCoef: coefObj.coef
    }));
  };

  // Reset Form
  const handleResetForm = () => {
    setEditingId(null);
    setFormData({
      month: selectedFilterMonth,
      taskGroup: 'Kế hoạch vốn',
      taskName: 'Theo dõi kế hoạch vốn theo dự án, nguồn vốn',
      taskCode: 'KH01',
      baseScore: 10,
      suggestedNature: 'Trung bình',
      suggestedCoef: 0.8,
      productType: 'Bảng tổng hợp',
      unit: 'Bảng',
      productQty: 1,
      detail: '',
      startDate: formatDateInput(new Date()),
      deadline: formatDateInput(new Date(Date.now() + 3 * 86400000)),
      productRequired: 'Bảng tổng hợp vốn',
      priority: 'Bình thường',
      leaderNote: ''
    });
  };

  // Generate live preview text for Zalo message template
  const getLiveZaloPreview = (template: string, sampleReceiverName = "Nguyễn Văn A", sampleRole = "⭐ CHỦ TRÌ (CHÍNH)") => {
    let msg = template || DEFAULT_TEMPLATE;
    const chiDaoText = formData.leaderNote ? `💬 Chỉ đạo của Lãnh đạo: "${formData.leaderNote}"\n` : '';
    const productText = formData.productRequired || `${formData.productQty || 1} ${formData.unit || 'Sản phẩm'}`;
    const deadlineText = formData.deadline ? formatDate(formData.deadline) : 'Trong tháng';

    msg = msg.replace(/{PHONG_BAN}/g, 'PHÒNG KHTC');
    msg = msg.replace(/{NGUOI_NHAN}/g, sampleReceiverName);
    msg = msg.replace(/{CHUC_VU}/g, 'Chuyên viên');
    msg = msg.replace(/{VAI_TRO}/g, sampleRole);
    msg = msg.replace(/{TEN_VIEC}/g, formData.taskName || 'Theo dõi kế hoạch vốn');
    msg = msg.replace(/{MA_VIEC}/g, formData.taskCode || 'KH01');
    msg = msg.replace(/{NHOM_VIEC}/g, formData.taskGroup || 'Kế hoạch vốn');
    msg = msg.replace(/{HAN_CHOT}/g, deadlineText);
    msg = msg.replace(/{DIEM_CHUAN}/g, String(formData.baseScore || '10'));
    msg = msg.replace(/{HE_SO_K}/g, String(formData.suggestedCoef || '0.8'));
    msg = msg.replace(/{SAN_PHAM}/g, productText);
    msg = msg.replace(/{MUC_UU_TIEN}/g, formData.priority || 'Bình thường');
    msg = msg.replace(/{Y_KIEN_CHI_DAO}/g, chiDaoText);
    msg = msg.replace(/{NGUOI_GIAO}/g, zaloConfig.senderName || 'Khuất Văn Sơn');
    msg = msg.replace(/{LINK_APP}/g, `${window.location.origin}/my-works`);

    return msg;
  };

  // Save Zalo Config
  const handleSaveZaloConfig = async () => {
    setIsSavingZaloConfig(true);
    try {
      const res = await fetch('/api/zalo/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zaloConfig)
      });
      const d = await res.json();
      if (d.success) {
        setCopyToast("Đã lưu cấu hình Zalo & Mẫu tin nhắn thành công!");
        setShowZaloConfigModal(false);
        setTimeout(() => setCopyToast(""), 3500);
      } else {
        alert("Lỗi lưu cấu hình: " + (d.error || d.message));
      }
    } catch (e: any) {
      alert("Lỗi: " + String(e));
    } finally {
      setIsSavingZaloConfig(false);
    }
  };

  // Test Zalo Notification
  const handleTestZalo = async () => {
    setIsTestingZalo(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/zalo/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zaloConfig)
      });
      const d = await res.json();
      setTestResult(d);
    } catch (e: any) {
      setTestResult({ success: false, message: "Lỗi kết nối test: " + String(e) });
    } finally {
      setIsTestingZalo(false);
    }
  };

  // Insert template variable at cursor position
  const insertTemplateVar = (varName: string) => {
    setZaloConfig(prev => ({
      ...prev,
      messageTemplate: prev.messageTemplate + varName
    }));
  };

  // Copy text helper
  const handleCopyText = (text: string, title?: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(title || "Đã sao chép tin nhắn Zalo vào bộ nhớ đệm!");
    setTimeout(() => setCopyToast(""), 3000);
  };

  // =========================================================================
  // SUBMIT FLOWS:
  // Luồng 1: Giao việc nội bộ (sendWithZalo = false)
  // Luồng 2: Giao việc & Tự động gửi Zalo 1-Click (sendWithZalo = true)
  // =========================================================================
  const handleExecuteAssign = async (sendWithZalo: boolean) => {
    if (selectedAssignees.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất một nhân viên nhận việc!");
      return;
    }
    if (!formData.taskName.trim()) {
      setErrorMessage("Vui lòng nhập hoặc chọn tên nhiệm vụ!");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const receiversPayload = selectedAssignees.map(a => ({
        userId: a.userId,
        role: a.role,
        coef: a.customCoef || formData.suggestedCoef
      }));

      const payload = {
        ...formData,
        assignerId: currentUser?.id || 1,
        assignerName: currentUser?.name || zaloConfig.senderName || 'Khuất Văn Sơn',
        receivers: receiversPayload,
        expectedConvertedScore: expectedScore,
        baseScore: String(formData.baseScore),
        suggestedCoef: String(formData.suggestedCoef),
        productQty: Number(formData.productQty) || 1
      };

      // 1. Save assignment to Database
      let res;
      if (editingId) {
        res = await fetch(`/api/assignments/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            receiverId: selectedAssignees[0]?.userId
          })
        });
      } else {
        res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const d = await res.json();
      if (!d.success) {
        setErrorMessage(d.error || d.message || "Có lỗi xảy ra khi giao việc!");
        setIsSubmitting(false);
        return;
      }

      // 2. If Luồng 2: Auto-send Zalo Notification
      if (sendWithZalo) {
        const zaloPayload = {
          task: { ...formData, deadline: formData.deadline },
          receivers: selectedAssignees.map(a => ({
            userId: a.userId,
            role: a.role,
            coef: a.customCoef || formData.suggestedCoef
          })),
          customTemplate: zaloConfig.messageTemplate
        };

        const resZalo = await fetch('/api/zalo/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(zaloPayload)
        });

        const dZalo = await resZalo.json();

        // Sample message for first assignee
        const firstReceiver = selectedAssignees[0]?.user;
        const firstRole = selectedAssignees[0]?.role === 'Chủ trì' ? '⭐ CHỦ TRÌ (CHÍNH)' : '👥 PHỐI HỢP';
        const sampleMsg = getLiveZaloPreview(zaloConfig.messageTemplate, firstReceiver?.name, firstRole);
        navigator.clipboard.writeText(sampleMsg);

        // If Webhook was configured and called
        if (zaloConfig.method === 'webhook' && zaloConfig.webhookUrl) {
          setSuccessMessage(`⚡ ĐÃ GIAO VIỆC & BẮN BOT ZALO TỰ ĐỘNG CHO ${selectedAssignees.length} NHÂN SỰ! (${dZalo.message || 'Thành công'})`);
        } else if (zaloConfig.method === 'group_webhook' && zaloConfig.groupWebhookUrl) {
          setSuccessMessage(`⚡ ĐÃ GIAO VIỆC & BẮN TIN VÀO NHÓM ZALO PHÒNG KHTC THÀNH CÔNG!`);
        } else {
          // Direct Zalo mode: Open Zalo chat and alert
          const firstPhone = (firstReceiver?.phone || firstReceiver?.zalo || '').replace(/[^0-9]/g, '');
          if (firstPhone) {
            window.open(`https://zalo.me/${firstPhone}`, '_blank');
          }
          setSuccessMessage(`⚡ ĐÃ GIAO VIỆC THÀNH CÔNG! Đã sao chép tin nhắn chuẩn & mở Zalo của ${firstReceiver?.name || 'nhân viên'}. Bạn chỉ cần nhấn Dán (Ctrl+V) và Gửi!`);
        }
      } else {
        // Luồng 1: Internal only
        setSuccessMessage(`Đã giao việc nội bộ thành công cho ${selectedAssignees.length} nhân sự (Đã tạo thông báo trên Web App).`);
      }

      handleResetForm();
      fetchAllData();
      setTimeout(() => setSuccessMessage(""), 7000);
    } catch (err: any) {
      setErrorMessage(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Edit Assignment
  const handleStartEdit = (a: Assignment) => {
    setEditingId(a.id);
    const assignedUser = users.find(u => u.id === a.receiverId);
    if (assignedUser) {
      setSelectedAssignees([{
        userId: assignedUser.id,
        user: assignedUser,
        role: (a.detail?.includes('Phối hợp') || a.leaderNote?.includes('Phối hợp')) ? 'Phối hợp' : 'Chủ trì',
        customCoef: a.suggestedCoef ? parseFloat(a.suggestedCoef) : 0.8
      }]);
    }

    setFormData({
      month: a.month || selectedFilterMonth,
      taskGroup: a.taskGroup || 'Kế hoạch vốn',
      taskName: a.taskName || '',
      taskCode: a.taskCode || '',
      baseScore: a.baseScore ? parseFloat(a.baseScore) : 10,
      suggestedNature: a.suggestedNature || 'Trung bình',
      suggestedCoef: a.suggestedCoef ? parseFloat(a.suggestedCoef) : 0.8,
      productType: a.productType || 'Báo cáo',
      unit: a.unit || 'Sản phẩm',
      productQty: a.productQty || 1,
      detail: (a.detail || '').replace(/^\[(Chủ trì|Phối hợp)\]\s*/, ''),
      startDate: a.startDate ? formatDateInput(new Date(a.startDate)) : formatDateInput(new Date()),
      deadline: a.deadline ? formatDateInput(new Date(a.deadline)) : formatDateInput(new Date(Date.now() + 3 * 86400000)),
      productRequired: a.productRequired || '',
      priority: a.priority || 'Bình thường',
      leaderNote: (a.leaderNote || '').replace(/^\[Phối hợp thực hiện\]\s*/, '')
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Revoke Assignment
  const handleRevoke = async (a: Assignment) => {
    if (!confirm(`Bạn có chắc chắn muốn thu hồi nhiệm vụ [${a.taskCode || ''}] "${a.taskName}" đã giao cho ${a.receiver?.name}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/assignments/${a.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: "Lãnh đạo thu hồi nhiệm vụ" })
      });
      const d = await res.json();
      if (d.success) {
        setSuccessMessage("Đã thu hồi nhiệm vụ thành công!");
        fetchAllData();
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        alert(d.error || d.message || "Không thể thu hồi nhiệm vụ!");
      }
    } catch (e) {
      alert("Lỗi khi thu hồi: " + String(e));
    }
  };

  // Send Remind
  const handleSendRemind = async () => {
    if (!remindTarget) return;
    setIsReminding(true);
    try {
      const res = await fetch(`/api/assignments/${remindTarget.id}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: remindNote || `Lãnh đạo nhắc nhở nhiệm vụ: [${remindTarget.taskCode || ''}] ${remindTarget.taskName}. Vui lòng khẩn trương tiếp nhận và báo cáo tiến độ!`,
          senderName: currentUser?.name || zaloConfig.senderName || 'Khuất Văn Sơn'
        })
      });
      const d = await res.json();
      if (d.success) {
        alert(d.message);
        setRemindTarget(null);
        setRemindNote("");
      }
    } catch (e) {
      alert("Lỗi khi gửi nhắc việc: " + String(e));
    } finally {
      setIsReminding(false);
    }
  };

  // Send Direct Zalo for single assignment in table
  const handleSendSingleZalo = async (a: Assignment) => {
    if (!a.receiver) return;
    try {
      const zaloPayload = {
        task: a,
        receivers: [{
          userId: a.receiver.id,
          role: a.detail?.includes('Phối hợp') ? 'Phối hợp' : 'Chủ trì'
        }],
        customTemplate: zaloConfig.messageTemplate
      };

      const res = await fetch('/api/zalo/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zaloPayload)
      });
      const d = await res.json();

      const sampleMsg = getLiveZaloPreview(zaloConfig.messageTemplate, a.receiver.name, a.detail?.includes('Phối hợp') ? '👥 PHỐI HỢP' : '⭐ CHỦ TRÌ (CHÍNH)');
      navigator.clipboard.writeText(sampleMsg);

      if (zaloConfig.method === 'webhook' && zaloConfig.webhookUrl) {
        setCopyToast(`⚡ Đã bắn bot Zalo tự động cho ${a.receiver.name}!`);
      } else if (zaloConfig.method === 'group_webhook' && zaloConfig.groupWebhookUrl) {
        setCopyToast(`⚡ Đã bắn tin vào Nhóm Zalo phòng KHTC!`);
      } else {
        const cleanPhone = (a.receiver.phone || a.receiver.zalo || '').replace(/[^0-9]/g, '');
        if (cleanPhone) {
          window.open(`https://zalo.me/${cleanPhone}`, '_blank');
        }
        setCopyToast(`Đã sao chép tin nhắn chuẩn & mở Zalo của ${a.receiver.name}! Nhấn Ctrl+V và Gửi.`);
      }
      setTimeout(() => setCopyToast(""), 4500);
    } catch (e: any) {
      alert("Lỗi gửi Zalo: " + String(e));
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    const dataToExport = filteredAssignments.map((a, idx) => ({
      stt: idx + 1,
      assignmentId: a.assignmentId,
      month: a.month,
      receiverName: a.receiver?.name || '-',
      receiverPosition: a.receiver?.position || 'Chuyên viên',
      receiverPhone: a.receiver?.phone || a.receiver?.zalo || '',
      taskGroup: a.taskGroup || '-',
      taskCode: a.taskCode || '-',
      taskName: a.taskName || '-',
      suggestedNature: a.suggestedNature || 'Trung bình',
      suggestedCoef: a.suggestedCoef || '0.8',
      baseScore: a.baseScore || '10',
      expectedConvertedScore: a.expectedConvertedScore || '-',
      productRequired: a.productRequired || '-',
      productQty: a.productQty || 1,
      unit: a.unit || 'Sản phẩm',
      priority: a.priority || 'Bình thường',
      assignDate: formatDate(a.assignDate),
      deadline: formatDate(a.deadline),
      receiveStatus: a.receiveStatus || 'Chờ nhận việc',
      receiveDate: formatDate(a.receiveDate),
      leaderNote: a.leaderNote || '',
      receiverNote: a.receiverNote || ''
    }));

    const columns = [
      { header: 'STT', key: 'stt', width: 8, align: 'center' as const },
      { header: 'Mã giao việc', key: 'assignmentId', width: 16, align: 'center' as const },
      { header: 'Tháng', key: 'month', width: 12, align: 'center' as const },
      { header: 'Nhân viên nhận việc', key: 'receiverName', width: 22, align: 'left' as const },
      { header: 'Vị trí/Chức danh', key: 'receiverPosition', width: 20, align: 'left' as const },
      { header: 'Số điện thoại/Zalo', key: 'receiverPhone', width: 18, align: 'center' as const },
      { header: 'Nhóm công việc', key: 'taskGroup', width: 22, align: 'left' as const },
      { header: 'Mã việc', key: 'taskCode', width: 14, align: 'center' as const },
      { header: 'Tên nhiệm vụ', key: 'taskName', width: 30, align: 'left' as const },
      { header: 'Tính chất', key: 'suggestedNature', width: 16, align: 'center' as const },
      { header: 'Hệ số K', key: 'suggestedCoef', width: 12, align: 'center' as const },
      { header: 'Điểm chuẩn', key: 'baseScore', width: 14, align: 'center' as const },
      { header: 'Điểm QĐ dự kiến', key: 'expectedConvertedScore', width: 16, align: 'center' as const },
      { header: 'Sản phẩm yêu cầu', key: 'productRequired', width: 24, align: 'left' as const },
      { header: 'Số lượng', key: 'productQty', width: 12, align: 'center' as const },
      { header: 'Đơn vị tính', key: 'unit', width: 14, align: 'center' as const },
      { header: 'Mức ưu tiên', key: 'priority', width: 14, align: 'center' as const },
      { header: 'Ngày giao', key: 'assignDate', width: 14, align: 'center' as const },
      { header: 'Hạn hoàn thành', key: 'deadline', width: 14, align: 'center' as const },
      { header: 'Trạng thái tiếp nhận', key: 'receiveStatus', width: 20, align: 'center' as const },
      { header: 'Ngày tiếp nhận', key: 'receiveDate', width: 14, align: 'center' as const },
      { header: 'Ghi chú lãnh đạo', key: 'leaderNote', width: 26, align: 'left' as const },
      { header: 'Phản hồi nhân viên', key: 'receiverNote', width: 26, align: 'left' as const }
    ];

    await exportStyledExcel(dataToExport, columns, `Danh_Sach_Giao_Viec_${selectedFilterMonth.replace('/', '_')}.xlsx`, 'Giao_Viec');
  };

  // Filtered Assignments
  const filteredAssignments = assignments.filter(a => {
    if (selectedFilterMonth !== 'Tất cả' && formatMonth(a.month) !== selectedFilterMonth) return false;
    if (filterReceiverId !== 'all' && a.receiverId !== filterReceiverId) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending' && (a.receiveStatus?.includes('Chưa') || a.receiveStatus?.includes('Chờ'))) return true;
      if (filterStatus === 'accepted' && a.receiveStatus?.includes('Đã nhận')) return true;
      if (filterStatus === 'declined' && a.receiveStatus?.includes('Từ chối')) return true;
      if (filterStatus === 'revoked' && a.receiveStatus?.includes('thu hồi')) return true;
      if (filterStatus === 'completed' && a.receiveStatus?.includes('hoàn thành')) return true;
      if (a.receiveStatus !== filterStatus) return false;
    }
    if (filterPriority !== 'all' && a.priority !== filterPriority) return false;

    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchName = (a.taskName || '').toLowerCase().includes(kw);
      const matchCode = (a.taskCode || '').toLowerCase().includes(kw);
      const matchUser = (a.receiver?.name || '').toLowerCase().includes(kw);
      const matchDetail = (a.detail || '').toLowerCase().includes(kw);
      if (!matchName && !matchCode && !matchUser && !matchDetail) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed top-5 right-5 z-50 bg-[#0068FF] text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce border border-blue-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-[#1F4E78] uppercase tracking-wider">
                Giao việc 2 luồng: Nội bộ & Tự động Zalo
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-600" /> Tự động hóa 1-Click
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#1F4E78] tracking-tight">Giao việc cho nhiều người & Tự động gửi Zalo</h1>
            <p className="text-xs text-slate-600 max-w-4xl mt-1 leading-relaxed">
              Tách biệt <strong>2 luồng giao việc</strong> rõ ràng: Giao việc nội bộ hoặc Giao việc kèm tự động bắn thông báo qua Zalo. 
              Lãnh đạo chỉ cần <strong>khai báo Zalo 1 lần duy nhất</strong> trên ứng dụng và tùy chỉnh mẫu tin nhắn theo ý muốn.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Zalo Config Button */}
            <button
              onClick={() => setShowZaloConfigModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-[#0068FF] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>⚙️ Cấu hình Zalo & Mẫu tin</span>
            </button>

            <button 
              onClick={fetchAllData} 
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Đồng bộ</span>
            </button>

            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Notifications / Alerts */}
        {successMessage && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Main Form: Giao việc cho nhân viên */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#1F4E78]" />
            <h2 className="text-base font-black text-[#1F4E78]">
              {editingId ? `Chỉnh sửa nhiệm vụ đã giao (#${editingId})` : 'Thông tin giao nhiệm vụ mới'}
            </h2>
          </div>
          {editingId && (
            <button 
              onClick={handleResetForm}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 underline cursor-pointer"
            >
              Hủy sửa / Tạo mới
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Section: Chọn nhân sự nhận việc (Multi-Assignee Selection) */}
          <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/60 pb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1F4E78]" />
                <label className="text-sm font-black text-[#1F4E78]">
                  Nhân sự nhận nhiệm vụ <span className="text-red-500">*</span>
                </label>
                <span className="text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                  Đã chọn {selectedAssignees.length} người
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllStaff}
                  className="text-xs font-bold text-[#1F4E78] hover:text-blue-900 hover:bg-white px-2.5 py-1 rounded-lg transition border border-transparent hover:border-blue-200 cursor-pointer"
                >
                  + Chọn tất cả ({users.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearAssignees}
                  className="text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-white px-2.5 py-1 rounded-lg transition cursor-pointer"
                >
                  Xóa chọn
                </button>
              </div>
            </div>

            {/* Quick staff grid checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
              {users.map(u => {
                const isSelected = selectedAssignees.some(a => a.userId === u.id);
                const assignedItem = selectedAssignees.find(a => a.userId === u.id);
                const isLeader = assignedItem?.role === 'Chủ trì';

                return (
                  <div
                    key={u.id}
                    onClick={() => toggleUserAssignee(u)}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer select-none relative ${
                      isSelected 
                        ? isLeader
                          ? 'bg-[#1F4E78] text-white border-blue-900 shadow-sm'
                          : 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-black truncate">{u.name}</div>
                      {isSelected && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                          isLeader ? 'bg-amber-400 text-slate-900' : 'bg-indigo-200 text-indigo-800'
                        }`}>
                          {isLeader ? 'Chủ trì' : 'Phối hợp'}
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] truncate ${isSelected && isLeader ? 'text-blue-100' : 'text-slate-500'}`}>
                      {u.position || 'Chuyên viên'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Assignees Role Details Panel */}
            {selectedAssignees.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-blue-200 space-y-2 mt-2">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Phân công vai trò & điều chỉnh hệ số (Bấm vào vai trò để đổi giữa Chủ trì và Phối hợp):</span>
                  <span className="text-[11px] text-slate-500 italic">⭐ Chủ trì nhận 100% hệ số | 👥 Phối hợp nhận hệ số riêng</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedAssignees.map(item => {
                    const isLeader = item.role === 'Chủ trì';

                    return (
                      <div 
                        key={item.userId}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-2xs ${
                          isLeader 
                            ? 'bg-amber-50 border-amber-300 text-amber-950'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                        }`}
                      >
                        <span className="font-black text-slate-900">{item.user.name}</span>
                        
                        {/* Toggle Role Button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleAssigneeRole(item.userId); }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition flex items-center gap-1 ${
                            isLeader 
                              ? 'bg-[#1F4E78] text-white hover:bg-blue-900' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                          title="Bấm để chuyển đổi vai trò"
                        >
                          {isLeader ? <Crown className="w-3 h-3 text-amber-300" /> : <Users className="w-3 h-3" />}
                          <span>{item.role}</span>
                        </button>

                        {/* Custom Coef for Coordinator */}
                        {!isLeader && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-600">
                            <span>K:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={item.customCoef || 0.6}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0.6;
                                setSelectedAssignees(prev => prev.map(p => p.userId === item.userId ? { ...p, customCoef: val } : p));
                              }}
                              className="w-12 bg-white border border-slate-300 rounded px-1 text-center font-bold text-slate-800"
                              title="Hệ số K của người phối hợp"
                            />
                          </div>
                        )}

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => toggleUserAssignee(item.user)}
                          className="text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Row 1: Tháng | Nhóm công việc | Tên nhiệm vụ | Mã việc */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Tháng</label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              >
                {STANDARD_MONTHS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Nhóm công việc</label>
              <select
                value={formData.taskGroup}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              >
                {DEFAULT_TASK_GROUPS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Tên nhiệm vụ</label>
              <select
                value={formData.taskName}
                onChange={(e) => handleTaskSelect(e.target.value)}
                className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78] truncate"
              >
                <option value="">-- Chọn nhiệm vụ chuẩn --</option>
                {(DEFAULT_TASKS[formData.taskGroup] || []).map(t => (
                  <option key={t.code} value={t.name}>{t.code} - {t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Mã việc</label>
              <input
                type="text"
                value={formData.taskCode}
                onChange={(e) => setFormData({ ...formData, taskCode: e.target.value })}
                placeholder="VD: KH01, BC02..."
                className="w-full bg-white border border-slate-300 text-sm font-bold text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              />
            </div>
          </div>

          {/* Row 2: Điểm chuẩn | Tính chất | Hệ số K | Điểm QĐ dự kiến */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Điểm chuẩn</label>
              <input
                type="number"
                step="0.5"
                value={formData.baseScore}
                onChange={(e) => setFormData({ ...formData, baseScore: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white border border-slate-300 text-sm font-bold text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Tính chất công việc</label>
              <select
                value={formData.suggestedNature}
                onChange={(e) => handleNatureChange(e.target.value)}
                className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              >
                {Object.keys(WORK_NATURE_COEFS).map(nat => (
                  <option key={nat} value={nat}>{nat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Hệ số K (Chủ trì)</label>
              <input
                type="number"
                step="0.1"
                value={formData.suggestedCoef}
                onChange={(e) => setFormData({ ...formData, suggestedCoef: parseFloat(e.target.value) || 0.8 })}
                className="w-full bg-white border border-slate-300 text-sm font-bold text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Điểm QĐ dự kiến (Chủ trì)</span>
                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">Tự tính</span>
              </label>
              <input
                type="text"
                readOnly
                value={expectedScore}
                className="w-full bg-slate-100 border border-slate-200 text-sm font-black text-[#1F4E78] rounded-xl px-3.5 py-2.5 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Row 3: Loại sản phẩm | Đơn vị tính | Số lượng | Mức ưu tiên */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Loại sản phẩm</label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              >
                {DEFAULT_PRODUCT_TYPES.map(pt => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Đơn vị tính</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              >
                <option value="Sản phẩm">Sản phẩm</option>
                <option value="Báo cáo">Báo cáo</option>
                <option value="Tờ trình">Tờ trình</option>
                <option value="Hồ sơ">Hồ sơ</option>
                <option value="Dự án">Dự án</option>
                <option value="Bảng">Bảng</option>
                <option value="Bộ">Bộ</option>
                <option value="Văn bản">Văn bản</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Số lượng</label>
              <input
                type="number"
                min="1"
                value={formData.productQty}
                onChange={(e) => setFormData({ ...formData, productQty: parseInt(e.target.value) || 1 })}
                className="w-full bg-white border border-slate-300 text-sm font-bold text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Mức ưu tiên</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              >
                <option value="Bình thường">Bình thường</option>
                <option value="Cao">Cao</option>
                <option value="Khẩn cấp">Khẩn cấp</option>
              </select>
            </div>
          </div>

          {/* Row 4: Nội dung/yêu cầu giao việc */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">Nội dung / Yêu cầu nhiệm vụ chi tiết</label>
            <textarea
              rows={2}
              value={formData.detail}
              onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
              placeholder="Nhập chi tiết yêu cầu, phạm vi xử lý, chỉ đạo cụ thể của lãnh đạo đối với các nhân sự..."
              className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-800 rounded-xl p-3 outline-none focus:border-[#1F4E78]"
            />
          </div>

          {/* Row 5: Ngày bắt đầu | Hạn hoàn thành | Sản phẩm yêu cầu | Ghi chú lãnh đạo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Ngày bắt đầu</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Hạn hoàn thành</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Sản phẩm yêu cầu</label>
              <input
                type="text"
                value={formData.productRequired}
                onChange={(e) => setFormData({ ...formData, productRequired: e.target.value })}
                placeholder="VD: Báo cáo GSDT, Tờ trình..."
                className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Ý kiến chỉ đạo của Lãnh đạo</label>
              <input
                type="text"
                value={formData.leaderNote}
                onChange={(e) => setFormData({ ...formData, leaderNote: e.target.value })}
                placeholder="Lưu ý quan trọng từ Lãnh đạo..."
                className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1F4E78]"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TWO DEDICATED ACTION FLOWS (2 LUỒNG GIAO VIỆC RÕ RÀNG) */}
          {/* ========================================================================= */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* LUỒNG 1: GIAO VIỆC NỘI BỘ */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleExecuteAssign(false)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
                  title="Chỉ lưu vào hệ thống và phát thông báo trên ứng dụng, không gửi Zalo"
                >
                  <Send className="w-4 h-4" />
                  <span>🔘 Luồng 1: Giao việc nội bộ</span>
                </button>

                {/* LUỒNG 2: GIAO VIỆC & TỰ ĐỘNG GỬI ZALO 1-CHẠM */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleExecuteAssign(true)}
                  className="flex items-center gap-2 bg-[#0068FF] hover:bg-[#0052cc] text-white text-sm font-black px-6 py-3 rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer border border-blue-400"
                  title="Tự động lưu nhiệm vụ và kích hoạt gửi thông báo qua Zalo cho tất cả nhân sự được chọn"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>⚡ Luồng 2: Giao việc & Tự động gửi Zalo</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-3 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Làm mới form
                </button>
              </div>
            </div>

            {/* Hint & Current Zalo Status */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#0068FF]" />
                <span>
                  <strong>Phương thức Zalo đang kích hoạt:</strong>{' '}
                  <span className="text-[#0068FF] font-bold">
                    {zaloConfig.method === 'webhook' ? '🚀 Webhook / Zalo Bot API (Tự động)' :
                     zaloConfig.method === 'group_webhook' ? '👥 Bắn tin vào Nhóm Zalo phòng KHTC' :
                     zaloConfig.method === 'oa_zns' ? '💼 Zalo OA ZNS' : '📱 Ứng dụng Zalo 1-Chạm'}
                  </span>
                  {' '}(SĐT Lãnh đạo: {zaloConfig.senderPhone || '0905636344'})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowZaloConfigModal(true)}
                className="text-[#0068FF] font-bold hover:underline self-start sm:self-auto cursor-pointer"
              >
                Chỉnh sửa cấu hình & mẫu tin ➔
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Tasks Management Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#1F4E78] uppercase tracking-wide">
              Bảng theo dõi & Báo cáo công việc đã giao
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi tương tác 2 chiều, trạng thái nhận việc và gửi lại Zalo 1-Click
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedFilterMonth}
              onChange={(e) => setSelectedFilterMonth(e.target.value)}
              className="bg-white border border-slate-300 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none"
            >
              <option value="Tất cả">Tất cả các tháng</option>
              {STANDARD_MONTHS.map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>

            <select
              value={filterReceiverId}
              onChange={(e) => setFilterReceiverId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="bg-white border border-slate-300 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none"
            >
              <option value="all">Tất cả nhân sự nhận</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-300 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ tiếp nhận</option>
              <option value="accepted">Đã tiếp nhận</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="declined">Từ chối việc</option>
              <option value="revoked">Đã thu hồi</option>
            </select>

            <div className="relative">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm mã, tên..."
                className="w-40 bg-white border border-slate-300 text-xs font-medium text-slate-800 rounded-xl pl-8 pr-3 py-2 outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#1F4E78] text-white font-bold border-b border-blue-900">
                <th className="py-3 px-3 text-center w-10">STT</th>
                <th className="py-3 px-3">Mã & Nhóm việc</th>
                <th className="py-3 px-3">Tên nhiệm vụ</th>
                <th className="py-3 px-3">Người nhận</th>
                <th className="py-3 px-3 text-center">Hạn chót</th>
                <th className="py-3 px-3 text-center">Ưu tiên</th>
                <th className="py-3 px-3 text-center">Điểm QĐ</th>
                <th className="py-3 px-3">Trạng thái 2 chiều</th>
                <th className="py-3 px-3 text-center">Gửi Zalo & Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    Không có nhiệm vụ giao việc nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a, idx) => {
                  const isAccepted = a.receiveStatus?.includes('Đã nhận');
                  const isDeclined = a.receiveStatus?.includes('Từ chối');
                  const isRevoked = a.receiveStatus?.includes('thu hồi');
                  const isPending = !isAccepted && !isDeclined && !isRevoked;
                  const isCoordinator = a.detail?.includes('Phối hợp') || a.leaderNote?.includes('Phối hợp');

                  return (
                    <tr key={a.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-[#1F4E78] block">{a.taskCode || a.assignmentId}</span>
                        <span className="text-[10px] text-slate-500 truncate block max-w-[120px]">{a.taskGroup}</span>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-bold text-slate-800 line-clamp-2">{a.taskName}</div>
                        {a.detail && (
                          <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{a.detail}</div>
                        )}
                        {a.productRequired && (
                          <div className="text-[10px] text-blue-700 font-semibold mt-0.5">
                            Sản phẩm: {a.productRequired} ({a.productQty || 1} {a.unit || 'SP'})
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{a.receiver?.name || '-'}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                            isCoordinator ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {isCoordinator ? 'Phối hợp' : 'Chủ trì'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <span>{a.receiver?.position || 'Chuyên viên'}</span>
                          {(a.receiver?.phone || a.receiver?.zalo) && (
                            <span className="text-blue-600 font-medium">({a.receiver?.phone || a.receiver?.zalo})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">
                        {formatDate(a.deadline)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {a.priority === 'Khẩn cấp' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200">
                            Khẩn cấp
                          </span>
                        ) : a.priority === 'Cao' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                            Cao
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Bình thường
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-black text-[#1F4E78]">
                        {a.expectedConvertedScore || a.baseScore || '-'}
                      </td>
                      <td className="py-3 px-3">
                        {isPending && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" /> Chờ nhận việc
                            </span>
                            <div className="text-[10px] text-slate-400">Giao lúc: {formatDate(a.assignDate)}</div>
                          </div>
                        )}
                        {isAccepted && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Đã nhận việc
                            </span>
                            <div className="text-[10px] text-emerald-700">Nhận lúc: {formatDate(a.receiveDate)}</div>
                          </div>
                        )}
                        {isDeclined && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                              <X className="w-3 h-3" /> Từ chối nhận
                            </span>
                            {a.receiverNote && (
                              <div className="text-[10px] text-red-600 font-medium">Lý do: {a.receiverNote}</div>
                            )}
                          </div>
                        )}
                        {isRevoked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                            Đã thu hồi
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Zalo 1-Click Fast Button */}
                          {a.receiver && (
                            <button
                              onClick={() => handleSendSingleZalo(a)}
                              title="Tự động gửi / Bắn lại thông báo Zalo cho nhân sự"
                              className="px-2 py-1 bg-[#0068FF] hover:bg-[#0052cc] text-white rounded-lg transition font-bold text-[10px] flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <Zap className="w-3 h-3 text-amber-300" />
                              <span>Zalo</span>
                            </button>
                          )}

                          {/* Remind Button */}
                          {isPending && (
                            <button
                              onClick={() => { setRemindTarget(a); setRemindNote(""); }}
                              title="Nhắc nhở nhân viên nhận việc"
                              className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <BellRing className="w-4 h-4" />
                            </button>
                          )}

                          {/* View Details */}
                          <button
                            onClick={() => setViewingAssignment(a)}
                            title="Xem chi tiết 2 chiều"
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          {!isAccepted && !isRevoked && (
                            <button
                              onClick={() => handleStartEdit(a)}
                              title="Chỉnh sửa nhiệm vụ"
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Revoke Button */}
                          {!isRevoked && (
                            <button
                              onClick={() => handleRevoke(a)}
                              title="Thu hồi việc đã giao"
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL CẤU HÌNH ZALO & MẪU TIN NHẮN TÙY BIẾN (CHỈ KHAI BÁO 1 LẦN) */}
      {/* ========================================================================= */}
      {showZaloConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0068FF] text-white flex items-center justify-center font-black shadow-md">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Cấu hình Tự động hóa Zalo & Mẫu tin nhắn</h3>
                  <p className="text-xs text-slate-500">Chỉ cần khai báo 1 lần duy nhất để hệ thống tự động gửi tin 1-Click</p>
                </div>
              </div>
              <button 
                onClick={() => setShowZaloConfigModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Thông tin Lãnh đạo gửi tin */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-[#1F4E78] uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#0068FF]" /> 1. Khai báo Zalo của Lãnh đạo (Người giao việc)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại Zalo của bạn</label>
                  <input
                    type="text"
                    value={zaloConfig.senderPhone}
                    onChange={(e) => setZaloConfig({ ...zaloConfig, senderPhone: e.target.value })}
                    placeholder="VD: 0905636344"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0068FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Họ tên & Chức vụ hiển thị</label>
                  <input
                    type="text"
                    value={zaloConfig.senderName}
                    onChange={(e) => setZaloConfig({ ...zaloConfig, senderName: e.target.value })}
                    placeholder="VD: Khuất Văn Sơn (Trưởng phòng KHTC)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0068FF]"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Phương thức gửi tự động */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-[#1F4E78] uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> 2. Chọn phương thức gửi tự động
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition ${
                  zaloConfig.method === 'webhook' ? 'bg-blue-50/80 border-[#0068FF] text-[#0068FF] font-bold shadow-2xs' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="zaloMethod"
                    checked={zaloConfig.method === 'webhook'}
                    onChange={() => setZaloConfig({ ...zaloConfig, method: 'webhook' })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-black text-slate-900">🚀 Webhook / Zalo Bot API (Tự động 100%)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Gửi ngầm trực tiếp qua API bot hoặc Webhook không cần mở app Zalo trên máy.</div>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition ${
                  zaloConfig.method === 'group_webhook' ? 'bg-blue-50/80 border-[#0068FF] text-[#0068FF] font-bold shadow-2xs' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="zaloMethod"
                    checked={zaloConfig.method === 'group_webhook'}
                    onChange={() => setZaloConfig({ ...zaloConfig, method: 'group_webhook' })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-black text-slate-900">👥 Bắn vào Nhóm Zalo phòng KHTC</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Tự động đẩy thông báo giao việc vào nhóm chat chung của phòng.</div>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition ${
                  zaloConfig.method === 'oa_zns' ? 'bg-blue-50/80 border-[#0068FF] text-[#0068FF] font-bold shadow-2xs' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="zaloMethod"
                    checked={zaloConfig.method === 'oa_zns'}
                    onChange={() => setZaloConfig({ ...zaloConfig, method: 'oa_zns' })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-black text-slate-900">💼 Zalo OA ZNS (Doanh nghiệp)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Dành cho tài khoản Zalo Official Account chính thức.</div>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition ${
                  zaloConfig.method === 'direct_app' ? 'bg-blue-50/80 border-[#0068FF] text-[#0068FF] font-bold shadow-2xs' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="zaloMethod"
                    checked={zaloConfig.method === 'direct_app'}
                    onChange={() => setZaloConfig({ ...zaloConfig, method: 'direct_app' })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-black text-slate-900">📱 Mở ứng dụng Zalo 1-Chạm</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Tự động sao chép tin nhắn chuẩn và mở ngay hội thoại Zalo tương ứng.</div>
                  </div>
                </label>
              </div>

              {/* Dynamic Inputs based on Method */}
              {zaloConfig.method === 'webhook' && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Webhook URL của Zalo Bot / n8n / Make / Chatbot
                  </label>
                  <input
                    type="text"
                    value={zaloConfig.webhookUrl}
                    onChange={(e) => setZaloConfig({ ...zaloConfig, webhookUrl: e.target.value })}
                    placeholder="https://your-bot-server.com/api/zalo-webhook..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-[#0068FF]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    💡 Nếu chưa có server bot riêng, bạn có thể để trống hoặc dùng webhook từ n8n/make để chuyển tiếp tin nhắn trực tiếp vào Zalo.
                  </p>
                </div>
              )}

              {zaloConfig.method === 'group_webhook' && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Group Webhook URL (Nhóm Zalo phòng KHTC)
                  </label>
                  <input
                    type="text"
                    value={zaloConfig.groupWebhookUrl}
                    onChange={(e) => setZaloConfig({ ...zaloConfig, groupWebhookUrl: e.target.value })}
                    placeholder="https://zalo-bot.com/groups/khtc-notify..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-[#0068FF]"
                  />
                </div>
              )}

              {zaloConfig.method === 'oa_zns' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Zalo OA Access Token</label>
                    <input
                      type="password"
                      value={zaloConfig.oaAccessToken}
                      onChange={(e) => setZaloConfig({ ...zaloConfig, oaAccessToken: e.target.value })}
                      placeholder="Nhập Access Token từ Zalo Developer..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-[#0068FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ZNS Template ID</label>
                    <input
                      type="text"
                      value={zaloConfig.oaTemplateId}
                      onChange={(e) => setZaloConfig({ ...zaloConfig, oaTemplateId: e.target.value })}
                      placeholder="VD: 283912..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-[#0068FF]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Trình soạn thảo Mẫu tin nhắn Zalo (Template Editor) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-black text-[#1F4E78] uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-emerald-600" /> 3. Tùy chỉnh Mẫu tin nhắn Zalo (Có thể sửa bổ sung tự do)
                </h4>
                <button
                  type="button"
                  onClick={() => setZaloConfig({ ...zaloConfig, messageTemplate: DEFAULT_TEMPLATE })}
                  className="text-xs font-bold text-slate-500 hover:text-[#1F4E78] underline cursor-pointer"
                >
                  🔄 Khôi phục mẫu mặc định
                </button>
              </div>

              {/* Tag variables quick insert buttons */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-600">Bấm để chèn nhanh biến tự động vào mẫu tin:</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Tên người nhận', val: '{NGUOI_NHAN}' },
                    { label: 'Chức vụ', val: '{CHUC_VU}' },
                    { label: 'Vai trò (Chủ trì/Phối hợp)', val: '{VAI_TRO}' },
                    { label: 'Tên nhiệm vụ', val: '{TEN_VIEC}' },
                    { label: 'Mã việc', val: '{MA_VIEC}' },
                    { label: 'Hạn hoàn thành', val: '{HAN_CHOT}' },
                    { label: 'Điểm chuẩn', val: '{DIEM_CHUAN}' },
                    { label: 'Hệ số K', val: '{HE_SO_K}' },
                    { label: 'Sản phẩm yêu cầu', val: '{SAN_PHAM}' },
                    { label: 'Mức ưu tiên', val: '{MUC_UU_TIEN}' },
                    { label: 'Chỉ đạo lãnh đạo', val: '{Y_KIEN_CHI_DAO}' },
                    { label: 'Link ứng dụng', val: '{LINK_APP}' }
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => insertTemplateVar(item.val)}
                      className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 text-slate-800 text-[10px] font-bold rounded-lg transition cursor-pointer"
                    >
                      + {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea for Template */}
              <textarea
                rows={7}
                value={zaloConfig.messageTemplate}
                onChange={(e) => setZaloConfig({ ...zaloConfig, messageTemplate: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-mono leading-relaxed outline-none focus:border-[#0068FF]"
              />

              {/* Live Preview Box */}
              <div>
                <div className="text-[11px] font-bold text-slate-600 mb-1">Xem trước tin nhắn sẽ gửi:</div>
                <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto border border-slate-800 select-all">
                  {getLiveZaloPreview(zaloConfig.messageTemplate)}
                </div>
              </div>
            </div>

            {/* Test Result Alert */}
            {testResult && (
              <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                testResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'
              }`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  <span>{testResult.message}</span>
                </div>
                {testResult.previewText && (
                  <button
                    onClick={() => handleCopyText(testResult.previewText!)}
                    className="px-2.5 py-1 bg-white rounded-lg border text-[10px] font-black hover:bg-slate-50 cursor-pointer"
                  >
                    Sao chép tin test
                  </button>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestZalo}
                  disabled={isTestingZalo}
                  className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isTestingZalo ? 'Đang gửi test...' : '🧪 Gửi thử nghiệm kết nối'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowZaloConfigModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  onClick={handleSaveZaloConfig}
                  disabled={isSavingZaloConfig}
                  className="px-6 py-2.5 bg-[#0068FF] hover:bg-[#0052cc] text-white text-xs font-black rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingZaloConfig ? 'Đang lưu...' : '💾 Lưu cấu hình Zalo'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remind Modal */}
      {remindTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <BellRing className="w-4 h-4" />
                <span>Gửi thông báo nhắc việc</span>
              </div>
              <button onClick={() => setRemindTarget(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p><span className="font-bold text-slate-700">Người nhận:</span> {remindTarget.receiver?.name} ({remindTarget.receiver?.position})</p>
              <p><span className="font-bold text-slate-700">Nhiệm vụ:</span> [{remindTarget.taskCode}] {remindTarget.taskName}</p>
              <p><span className="font-bold text-slate-700">Hạn chót:</span> {formatDate(remindTarget.deadline)}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung nhắc nhở / Chỉ đạo thêm</label>
              <textarea
                rows={3}
                value={remindNote}
                onChange={(e) => setRemindNote(e.target.value)}
                placeholder="VD: Đề nghị khẩn trương tiếp nhận nhiệm vụ và nộp sản phẩm trước 17h00 hôm nay..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl outline-none focus:border-[#1F4E78]"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              {remindTarget.receiver && (
                <button
                  type="button"
                  onClick={() => handleSendSingleZalo(remindTarget)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-[#0068FF] hover:bg-[#0052cc] rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Bắn Zalo</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRemindTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={handleSendRemind}
                  disabled={isReminding}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isReminding ? 'Đang gửi...' : 'Gửi trên hệ thống'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Assignment Details Modal (2-Way Log) */}
      {viewingAssignment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#1F4E78] font-bold text-sm">
                <FileText className="w-4 h-4" />
                <span>Chi tiết báo cáo tương tác 2 chiều</span>
              </div>
              <button onClick={() => setViewingAssignment(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 text-xs space-y-2">
              <div className="font-bold text-[#1F4E78] text-sm">[{viewingAssignment.taskCode}] {viewingAssignment.taskName}</div>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div><span className="font-bold">Tháng:</span> {viewingAssignment.month}</div>
                <div><span className="font-bold">Mức ưu tiên:</span> {viewingAssignment.priority}</div>
                <div><span className="font-bold">Người giao:</span> {viewingAssignment.assigner?.name || 'Lãnh đạo phòng'}</div>
                <div><span className="font-bold">Người nhận:</span> {viewingAssignment.receiver?.name}</div>
                <div><span className="font-bold">Ngày giao:</span> {formatDate(viewingAssignment.assignDate)}</div>
                <div><span className="font-bold">Hạn hoàn thành:</span> {formatDate(viewingAssignment.deadline)}</div>
                <div><span className="font-bold">Điểm chuẩn:</span> {viewingAssignment.baseScore}</div>
                <div><span className="font-bold">Điểm QĐ dự kiến:</span> {viewingAssignment.expectedConvertedScore}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Nội dung / Yêu cầu chi tiết của Lãnh đạo:</h4>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 leading-relaxed">
                  {viewingAssignment.detail || 'Không có yêu cầu chi tiết bằng văn bản.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">Tiến trình tương tác 2 chiều:</h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-600">1. Lãnh đạo phát lệnh giao việc</span>
                    <span className="font-bold text-[#1F4E78]">{formatDate(viewingAssignment.assignDate)}</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-600">2. Trạng thái tiếp nhận</span>
                    <span className={`font-bold ${viewingAssignment.receiveStatus?.includes('Đã nhận') ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {viewingAssignment.receiveStatus || 'Chờ nhận việc'}
                    </span>
                  </div>
                  {viewingAssignment.receiveDate && (
                    <div className="p-2.5 flex items-center justify-between">
                      <span className="text-slate-600">3. Thời gian nhân viên tiếp nhận</span>
                      <span className="font-bold text-emerald-700">{formatDate(viewingAssignment.receiveDate)}</span>
                    </div>
                  )}
                  {viewingAssignment.receiverNote && (
                    <div className="p-2.5">
                      <span className="text-slate-600 block mb-0.5">Phản hồi / Ghi chú của nhân viên:</span>
                      <span className="font-medium text-slate-800 italic">"{viewingAssignment.receiverNote}"</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {viewingAssignment.receiver && (
                <button
                  onClick={() => handleSendSingleZalo(viewingAssignment)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0068FF] hover:bg-[#0052cc] rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Bắn Zalo cho {viewingAssignment.receiver.name}</span>
                </button>
              )}

              <button
                onClick={() => setViewingAssignment(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
