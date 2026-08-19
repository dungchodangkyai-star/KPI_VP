import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ExportColumn {
  header: string;
  key: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  numFmt?: string;
}

const BRAND_NAVY = '1F4E78';      // #1F4E78 - Primary Brand Navy
const BRAND_SECONDARY = '2B6CB0'; // #2B6CB0 - Sub-headers
const BORDER_COLOR = 'D1D5DB';    // #D1D5DB - Light Gray Border
const STRIPE_COLOR = 'F8FAFC';    // #F8FAFC - Subtle Row Stripe

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: BRAND_NAVY }
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  color: { argb: 'FFFFFF' },
  bold: true,
  name: 'Arial',
  size: 11
};

const CELL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } }
};

const DOUBLE_BOTTOM_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'double', color: { argb: '1F4E78' } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } }
};

/**
 * General purpose styled single sheet export
 */
export const exportStyledExcel = async (
  data: any[],
  columns: ExportColumn[],
  filename: string,
  sheetName = 'Dữ liệu'
) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Phần mềm KPI KHTC';
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  ws.columns = columns.map(c => ({
    header: c.header,
    key: c.key,
    width: c.width
  }));

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = CELL_BORDER;
  });

  // Add data rows with alternating fill and proper alignments
  data.forEach((rowData, idx) => {
    const row = ws.addRow(rowData);
    row.height = 22;
    const isEven = idx % 2 === 1;

    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.border = CELL_BORDER;
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.align || 'left',
        wrapText: true
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: STRIPE_COLOR }
        };
      }
      if (col.numFmt) {
        cell.numFmt = col.numFmt;
      }
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
};

/**
 * Standard input template generator with helper rows and protection
 */
export const downloadStyledTemplate = async (
  templateData: any[],
  columns: ExportColumn[],
  filename: string,
  sheetName = 'Mẫu nhập liệu'
) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Phần mềm KPI KHTC';
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  ws.columns = columns.map(c => ({
    header: c.header,
    key: c.key,
    width: c.width
  }));

  // Style header
  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = CELL_BORDER;
  });

  // Add sample rows
  templateData.forEach((rowData) => {
    const row = ws.addRow(rowData);
    row.height = 24;
    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.border = CELL_BORDER;
      cell.alignment = { vertical: 'middle', horizontal: col.align || 'left', wrapText: true };
      cell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '475569' } };
    });
  });

  // Add extra empty rows for easy pasting
  for (let i = 0; i < 50; i++) {
    const row = ws.addRow({});
    row.height = 22;
    for (let col = 1; col <= columns.length; col++) {
      const cell = row.getCell(col);
      cell.border = CELL_BORDER;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
};

/**
 * Department KPI Summary Excel Export (Chuẩn văn bản Hành chính/Doanh nghiệp)
 */
export interface DepartmentKpiUserRow {
  stt: number;
  name: string;
  position: string;
  totalTasks: number;
  approvedTasks: number;
  selfScore: number | string;
  approvedScore: number | string;
  selfRank: string;
  leaderRank: string;
  note?: string;
}

export const exportDepartmentKpiReportExcel = async ({
  month,
  orgName = 'PHÒNG KẾ HOẠCH TÀI CHÍNH',
  subOrgName = 'ỦY BAN NHÂN DÂN',
  users,
  stats
}: {
  month: string;
  orgName?: string;
  subOrgName?: string;
  users: DepartmentKpiUserRow[];
  stats?: {
    totalUsers: number;
    avgSelfScore?: number;
    avgApprovedScore?: number;
    excellentCount?: number;
    goodCount?: number;
    completedCount?: number;
    uncompletedCount?: number;
  };
}) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Phần mềm KPI KHTC';
  wb.created = new Date();

  const ws = wb.addWorksheet(`KPI_Thang_${month.replace('/', '_')}`, {
    views: [{ state: 'frozen', ySplit: 6 }]
  });

  // 1. Column Definitions
  ws.columns = [
    { key: 'stt', width: 8 },             // A: STT
    { key: 'name', width: 26 },            // B: Họ và tên
    { key: 'position', width: 22 },        // C: Chức vụ / Vị trí
    { key: 'totalTasks', width: 14 },      // D: Tổng số việc
    { key: 'approvedTasks', width: 14 },   // E: Số việc duyệt
    { key: 'selfScore', width: 16 },       // F: Điểm tự ĐG
    { key: 'approvedScore', width: 16 },   // G: Điểm LĐ duyệt
    { key: 'selfRank', width: 22 },        // H: Tự xếp loại
    { key: 'leaderRank', width: 24 },      // I: Lãnh đạo xếp
  ];

  // 2. Organization & Republic Header (Row 1-2)
  ws.mergeCells('A1:C1');
  const orgCell = ws.getCell('A1');
  orgCell.value = subOrgName.toUpperCase();
  orgCell.font = { name: 'Arial', size: 10, bold: true };
  orgCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:C2');
  const subOrgCell = ws.getCell('A2');
  subOrgCell.value = orgName.toUpperCase();
  subOrgCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1F4E78' } };
  subOrgCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('G1:I1');
  const repCell = ws.getCell('G1');
  repCell.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  repCell.font = { name: 'Arial', size: 10, bold: true };
  repCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('G2:I2');
  const mottoCell = ws.getCell('G2');
  mottoCell.value = 'Độc lập - Tự do - Hạnh phúc';
  mottoCell.font = { name: 'Arial', size: 10, italic: true };
  mottoCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 3. Main Title Banner (Row 4)
  ws.mergeCells('A4:I4');
  const titleCell = ws.getCell('A4');
  titleCell.value = `BẢNG TỔNG HỢP ĐÁNH GIÁ KẾT QUẢ CÔNG VIỆC (KPI) THÁNG ${month}`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1F4E78' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 32;

  // Subtitle / Date (Row 5)
  ws.mergeCells('A5:I5');
  const dateCell = ws.getCell('A5');
  dateCell.value = `Thời gian xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} | Tổng số nhân sự: ${users.length} cán bộ`;
  dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: '64748B' } };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(5).height = 18;

  // 4. Table Header Row (Row 6)
  const headers = [
    'STT',
    'Họ và tên cán bộ',
    'Vị trí công tác',
    'Số việc thực hiện',
    'Số việc đã duyệt',
    'Điểm tự đánh giá',
    'Điểm Lãnh đạo duyệt',
    'Tự xếp loại',
    'Lãnh đạo xếp loại'
  ];

  const headerRow = ws.getRow(6);
  headerRow.height = 30;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = CELL_BORDER;
  });

  // 5. Data Rows
  let startDataRow = 7;
  users.forEach((u, index) => {
    const row = ws.getRow(startDataRow + index);
    row.height = 24;

    const rowData = [
      u.stt,
      u.name,
      u.position,
      u.totalTasks,
      u.approvedTasks,
      typeof u.selfScore === 'number' ? u.selfScore : u.selfScore,
      typeof u.approvedScore === 'number' ? u.approvedScore : u.approvedScore,
      u.selfRank,
      u.leaderRank
    ];

    rowData.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.border = CELL_BORDER;
      cell.font = { name: 'Arial', size: 10 };

      // Alignments
      if (colIdx === 0) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colIdx === 1) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.font = { name: 'Arial', size: 10, bold: true };
      } else if (colIdx === 2) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (colIdx === 3 || colIdx === 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colIdx === 5 || colIdx === 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
        if (typeof val === 'number') {
          cell.numFmt = '#,##0.00';
        }
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Alternating row background
      if (index % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: STRIPE_COLOR }
        };
      }

      // Highlight Rank badges in Leader column
      if (colIdx === 8 && typeof val === 'string') {
        if (val.includes('Xuất sắc')) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '047857' } }; // Emerald
        } else if (val.includes('Tốt')) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1D4ED8' } }; // Blue
        } else if (val.includes('Không hoàn thành')) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'B91C1C' } }; // Red
        }
      }
    });
  });

  const lastDataRowIndex = startDataRow + users.length - 1;

  // 6. Summary / Average Row
  const summaryRowIndex = lastDataRowIndex + 1;
  const summaryRow = ws.getRow(summaryRowIndex);
  summaryRow.height = 26;

  summaryRow.getCell(1).value = '';
  summaryRow.getCell(2).value = 'TỔNG CỘNG / TRUNG BÌNH PHÒNG';
  summaryRow.getCell(3).value = `${users.length} nhân sự`;
  summaryRow.getCell(4).value = users.reduce((acc, cur) => acc + (cur.totalTasks || 0), 0);
  summaryRow.getCell(5).value = users.reduce((acc, cur) => acc + (cur.approvedTasks || 0), 0);

  // Compute averages
  const validSelfScores = users.map(u => typeof u.selfScore === 'number' ? u.selfScore : parseFloat(u.selfScore as string)).filter(n => !isNaN(n));
  const avgSelf = validSelfScores.length ? validSelfScores.reduce((a, b) => a + b, 0) / validSelfScores.length : 0;
  summaryRow.getCell(6).value = avgSelf;

  const validAppScores = users.map(u => typeof u.approvedScore === 'number' ? u.approvedScore : parseFloat(u.approvedScore as string)).filter(n => !isNaN(n));
  const avgApp = validAppScores.length ? validAppScores.reduce((a, b) => a + b, 0) / validAppScores.length : 0;
  summaryRow.getCell(7).value = avgApp;

  summaryRow.getCell(8).value = '';
  summaryRow.getCell(9).value = '';

  for (let c = 1; c <= 9; c++) {
    const cell = summaryRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E293B' } };
    cell.border = DOUBLE_BOTTOM_BORDER;
    if (c === 4 || c === 5 || c === 6 || c === 7) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (c === 6 || c === 7) cell.numFmt = '#,##0.00';
    } else {
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }
  }

  // 7. Signature Footer
  const signRowIndex = summaryRowIndex + 3;
  ws.mergeCells(`A${signRowIndex}:C${signRowIndex}`);
  const prepSign = ws.getCell(`A${signRowIndex}`);
  prepSign.value = 'NGƯỜI LẬP BIỂU';
  prepSign.font = { name: 'Arial', size: 10, bold: true };
  prepSign.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`D${signRowIndex}:F${signRowIndex}`);
  const leadSign = ws.getCell(`D${signRowIndex}`);
  leadSign.value = 'TRƯỞNG PHÒNG';
  leadSign.font = { name: 'Arial', size: 10, bold: true };
  leadSign.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`G${signRowIndex}:I${signRowIndex}`);
  const appSign = ws.getCell(`G${signRowIndex}`);
  appSign.value = 'LÃNH ĐẠO ĐƠN VỊ PHÊ DUYỆT';
  appSign.font = { name: 'Arial', size: 10, bold: true };
  appSign.alignment = { horizontal: 'center', vertical: 'middle' };

  const signNoteRowIndex = signRowIndex + 1;
  ws.mergeCells(`A${signNoteRowIndex}:C${signNoteRowIndex}`);
  ws.getCell(`A${signNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
  ws.getCell(`A${signNoteRowIndex}`).font = { name: 'Arial', size: 9, italic: true };
  ws.getCell(`A${signNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`D${signNoteRowIndex}:F${signNoteRowIndex}`);
  ws.getCell(`D${signNoteRowIndex}`).value = '(Ký, ghi rõ họ tên)';
  ws.getCell(`D${signNoteRowIndex}`).font = { name: 'Arial', size: 9, italic: true };
  ws.getCell(`D${signNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(`G${signNoteRowIndex}:I${signNoteRowIndex}`);
  ws.getCell(`G${signNoteRowIndex}`).value = '(Ký, đóng dấu)';
  ws.getCell(`G${signNoteRowIndex}`).font = { name: 'Arial', size: 9, italic: true };
  ws.getCell(`G${signNoteRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

  const fileName = `Tong_Hop_KPI_Phong_${month.replace('/', '_')}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};

/**
 * Enterprise Multi-Sheet System Backup Excel Generator
 */
export const exportMultiSheetBackupExcel = async (data: {
  works?: any[];
  users?: any[];
  workCodes?: any[];
  categories?: any[];
  assignments?: any[];
  overtimes?: any[];
  kpiResults?: any[];
}) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Phần mềm KPI KHTC';
  wb.created = new Date();

  // Helper to add a formatted sheet
  const addStyledSheet = (sheetName: string, items: any[], columns: ExportColumn[]) => {
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    ws.columns = columns.map(c => ({
      header: c.header,
      key: c.key,
      width: c.width
    }));

    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = CELL_BORDER;
    });

    items.forEach((item, idx) => {
      const row = ws.addRow(item);
      row.height = 22;
      const isEven = idx % 2 === 1;

      columns.forEach((col, cIdx) => {
        const cell = row.getCell(cIdx + 1);
        cell.border = CELL_BORDER;
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: col.align || 'left', wrapText: true };
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE_COLOR } };
        }
        if (col.numFmt) cell.numFmt = col.numFmt;
      });
    });
  };

  // 1. Works Sheet
  if (data.works && data.works.length > 0) {
    const workCols: ExportColumn[] = [
      { header: 'Mã công việc', key: 'workId', width: 16, align: 'center' },
      { header: 'Tháng', key: 'month', width: 12, align: 'center' },
      { header: 'Nhân sự', key: 'userName', width: 24, align: 'left' },
      { header: 'Nhóm công việc', key: 'taskGroup', width: 22, align: 'left' },
      { header: 'Tên nhiệm vụ', key: 'taskName', width: 32, align: 'left' },
      { header: 'Mã nhiệm vụ', key: 'taskCode', width: 16, align: 'center' },
      { header: 'Chi tiết công việc', key: 'detail', width: 36, align: 'left' },
      { header: 'Ngày bắt đầu', key: 'startDate', width: 14, align: 'center' },
      { header: 'Ngày kết thúc', key: 'endDate', width: 14, align: 'center' },
      { header: 'Giờ làm', key: 'hours', width: 12, align: 'center', numFmt: '#,##0.0' },
      { header: 'Tính chất đề xuất', key: 'proposedNature', width: 18, align: 'center' },
      { header: 'Tính chất duyệt', key: 'approvedNature', width: 18, align: 'center' },
      { header: 'Điểm chuẩn', key: 'baseScore', width: 12, align: 'center' },
      { header: 'Điểm quy đổi', key: 'convertedScore', width: 14, align: 'center', numFmt: '#,##0.00' },
      { header: 'Minh chứng', key: 'evidence', width: 30, align: 'left' },
      { header: 'Trạng thái duyệt', key: 'leaderApproval', width: 18, align: 'center' },
      { header: 'Ý kiến Lãnh đạo', key: 'leaderNote', width: 28, align: 'left' },
    ];
    const mappedWorks = data.works.map(w => ({
      workId: w.workId || `W-${w.id}`,
      month: w.month || '',
      userName: w.user?.name || w.userId || '',
      taskGroup: w.taskGroup || '',
      taskName: w.taskName || '',
      taskCode: w.taskCode || '',
      detail: w.detail || '',
      startDate: w.startDate || '',
      endDate: w.endDate || '',
      hours: w.hours ? parseFloat(w.hours) : 0,
      proposedNature: w.proposedNature || '',
      approvedNature: w.approvedNature || '',
      baseScore: w.baseScore || '',
      convertedScore: w.convertedScore ? parseFloat(w.convertedScore) : 0,
      evidence: w.evidence || '',
      leaderApproval: w.leaderApproval || 'Chờ duyệt',
      leaderNote: w.leaderNote || ''
    }));
    addStyledSheet('1_Khai_Bao_Cong_Viec', mappedWorks, workCols);
  }

  // 2. Users Sheet
  if (data.users && data.users.length > 0) {
    const userCols: ExportColumn[] = [
      { header: 'ID', key: 'id', width: 8, align: 'center' },
      { header: 'Họ và tên', key: 'name', width: 24, align: 'left' },
      { header: 'Email', key: 'email', width: 28, align: 'left' },
      { header: 'Chức danh', key: 'title', width: 20, align: 'left' },
      { header: 'Vị trí công tác', key: 'position', width: 20, align: 'left' },
      { header: 'Phòng ban', key: 'department', width: 24, align: 'left' },
      { header: 'Vai trò hệ thống', key: 'role', width: 16, align: 'center' },
      { header: 'Hệ số A', key: 'coefA', width: 12, align: 'center', numFmt: '0.00' },
      { header: 'Hệ số B', key: 'coefB', width: 12, align: 'center', numFmt: '0.00' },
      { header: 'Hệ số C', key: 'coefC', width: 12, align: 'center', numFmt: '0.00' },
      { header: 'Trạng thái', key: 'status', width: 14, align: 'center' }
    ];
    addStyledSheet('2_Danh_Sach_Nhan_Su', data.users, userCols);
  }

  // 3. Work Codes Sheet
  if (data.workCodes && data.workCodes.length > 0) {
    const codeCols: ExportColumn[] = [
      { header: 'Mã nhiệm vụ', key: 'code', width: 16, align: 'center' },
      { header: 'Tên nhiệm vụ', key: 'name', width: 34, align: 'left' },
      { header: 'Nhóm nhiệm vụ', key: 'category', width: 24, align: 'left' },
      { header: 'Mô tả quy trình', key: 'description', width: 36, align: 'left' },
      { header: 'Điểm chuẩn', key: 'baseScore', width: 14, align: 'center' },
      { header: 'Đơn vị tính', key: 'unit', width: 14, align: 'center' },
      { header: 'Thời gian định mức (h)', key: 'standardHours', width: 22, align: 'center' }
    ];
    addStyledSheet('3_Danh_Muc_Nhiem_Vu', data.workCodes, codeCols);
  }

  // 4. Assignments Sheet
  if (data.assignments && data.assignments.length > 0) {
    const assignCols: ExportColumn[] = [
      { header: 'Mã giao việc', key: 'assignId', width: 16, align: 'center' },
      { header: 'Tháng', key: 'month', width: 12, align: 'center' },
      { header: 'Người giao', key: 'assignerName', width: 22, align: 'left' },
      { header: 'Người nhận việc', key: 'receiverName', width: 22, align: 'left' },
      { header: 'Tên nhiệm vụ', key: 'taskName', width: 32, align: 'left' },
      { header: 'Nội dung chi tiết', key: 'detail', width: 36, align: 'left' },
      { header: 'Mức ưu tiên', key: 'priority', width: 14, align: 'center' },
      { header: 'Ngày giao', key: 'assignDate', width: 14, align: 'center' },
      { header: 'Hạn hoàn thành', key: 'deadline', width: 14, align: 'center' },
      { header: 'Trạng thái', key: 'receiveStatus', width: 18, align: 'center' }
    ];
    const mappedAssigns = data.assignments.map(a => ({
      assignId: a.assignId || `ASG-${a.id}`,
      month: a.month || '',
      assignerName: a.assigner?.name || a.assignerId || '',
      receiverName: a.receiver?.name || a.receiverId || '',
      taskName: a.taskName || '',
      detail: a.detail || '',
      priority: a.priority || 'Bình thường',
      assignDate: a.assignDate || '',
      deadline: a.deadline || '',
      receiveStatus: a.receiveStatus || 'Chờ tiếp nhận'
    }));
    addStyledSheet('4_Nhiem_Vu_Giao_Viec', mappedAssigns, assignCols);
  }

  // 5. Overtimes Sheet
  if (data.overtimes && data.overtimes.length > 0) {
    const otCols: ExportColumn[] = [
      { header: 'Tháng', key: 'month', width: 12, align: 'center' },
      { header: 'Nhân sự', key: 'userName', width: 22, align: 'left' },
      { header: 'Ngày làm thêm', key: 'date', width: 14, align: 'center' },
      { header: 'Giờ BĐ', key: 'startTime', width: 10, align: 'center' },
      { header: 'Giờ KT', key: 'endTime', width: 10, align: 'center' },
      { header: 'Giờ đăng ký', key: 'totalRegHours', width: 14, align: 'center' },
      { header: 'Giờ duyệt', key: 'approvedHours', width: 14, align: 'center' },
      { header: 'Nội dung làm thêm', key: 'content', width: 34, align: 'left' },
      { header: 'Lý do', key: 'reason', width: 28, align: 'left' },
      { header: 'Trạng thái', key: 'approvalStatus', width: 16, align: 'center' }
    ];
    const mappedOt = data.overtimes.map(o => ({
      month: o.month || '',
      userName: o.user?.name || o.userId || '',
      date: o.date || '',
      startTime: o.startTime || '',
      endTime: o.endTime || '',
      totalRegHours: o.totalRegHours || '',
      approvedHours: o.approvedHours || '',
      content: o.content || '',
      reason: o.reason || '',
      approvalStatus: o.approvalStatus || 'Chờ duyệt'
    }));
    addStyledSheet('5_Dang_Ky_Lam_Them', mappedOt, otCols);
  }

  // 6. KPI Results Sheet
  if (data.kpiResults && data.kpiResults.length > 0) {
    const kpiCols: ExportColumn[] = [
      { header: 'Tháng', key: 'month', width: 12, align: 'center' },
      { header: 'Nhân sự', key: 'userName', width: 24, align: 'left' },
      { header: 'Số việc ĐK', key: 'regWorks', width: 12, align: 'center' },
      { header: 'Số việc duyệt', key: 'appWorks', width: 12, align: 'center' },
      { header: 'Điểm A (Chuyên môn)', key: 'aScore', width: 18, align: 'center', numFmt: '#,##0.00' },
      { header: 'Điểm B (Hiệu suất)', key: 'bScore', width: 18, align: 'center', numFmt: '#,##0.00' },
      { header: 'Điểm C (Chấp hành)', key: 'cScore', width: 18, align: 'center', numFmt: '#,##0.00' },
      { header: 'TỔNG ĐIỂM KPI', key: 'totalKpi', width: 16, align: 'center', numFmt: '#,##0.00' },
      { header: 'XẾP LOẠI', key: 'rank', width: 18, align: 'center' },
      { header: 'Trạng thái chốt', key: 'lockedStatus', width: 16, align: 'center' }
    ];
    const mappedKpi = data.kpiResults.map(k => ({
      month: k.month || '',
      userName: k.user?.name || k.userId || '',
      regWorks: k.registeredWorks || 0,
      appWorks: k.approvedWorks || 0,
      aScore: k.aScore || 0,
      bScore: k.bScore || 0,
      cScore: k.cScore || 0,
      totalKpi: k.totalKpi || 0,
      rank: k.rank || 'B',
      lockedStatus: k.lockedStatus || 'Chưa chốt'
    }));
    addStyledSheet('6_Ket_Qua_KPI', mappedKpi, kpiCols);
  }

  const fileName = `Backup_He_Thong_KPI_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};

/**
 * Standard Import/Sync Template Generator (V8)
 */
export const exportStandardSyncTemplateV8 = async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Phần mềm KPI KHTC';
  wb.created = new Date();

  // Helper
  const addTemplateSheet = (sheetName: string, items: any[], columns: ExportColumn[]) => {
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    ws.columns = columns.map(c => ({
      header: c.header,
      key: c.key,
      width: c.width
    }));

    const headerRow = ws.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = CELL_BORDER;
    });

    items.forEach((item) => {
      const row = ws.addRow(item);
      row.height = 24;
      columns.forEach((col, cIdx) => {
        const cell = row.getCell(cIdx + 1);
        cell.border = CELL_BORDER;
        cell.alignment = { vertical: 'middle', horizontal: col.align || 'left', wrapText: true };
        cell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '334155' } };
      });
    });

    // 20 empty ready-to-paste rows
    for (let i = 0; i < 20; i++) {
      const row = ws.addRow({});
      row.height = 22;
      for (let c = 1; c <= columns.length; c++) {
        row.getCell(c).border = CELL_BORDER;
      }
    }
  };

  // 1. Sheet Khai báo công việc
  addTemplateSheet('Khai_Bao_Cong_Viec', [
    {
      'Tháng': '08-2026',
      'Họ và tên nhân sự': 'Huỳnh Trọng Hiếu',
      'Nhóm công việc': 'Kế hoạch và Đầu tư',
      'Mã nhiệm vụ': 'NV-KH-01',
      'Tên nhiệm vụ': 'Tổng hợp kế hoạch vốn đầu tư công',
      'Chi tiết nội dung': 'Tổng hợp, rà soát tiến độ giải ngân vốn đầu tư công tháng 8 năm 2026',
      'Ngày bắt đầu': '01/08/2026',
      'Giờ bắt đầu': '08:00',
      'Ngày kết thúc': '05/08/2026',
      'Giờ kết thúc': '17:00',
      'Ngày hoàn thành thực tế': '05/08/2026',
      'Số giờ làm việc': 40,
      'Tính chất đề xuất': 'Đột xuất, phức tạp',
      'Điểm chuẩn': 10,
      'Số lượng SP': 1,
      'Đơn vị tính': 'Báo cáo',
      'Link minh chứng': 'https://drive.google.com/drive/folders/sample-minh-chung-kpi',
      'Dự án liên quan': 'Kế hoạch vốn đầu tư công 2026',
      'Trạng thái': 'Đã duyệt'
    }
  ], [
    { header: 'Tháng', key: 'Tháng', width: 12, align: 'center' },
    { header: 'Họ và tên nhân sự', key: 'Họ và tên nhân sự', width: 24, align: 'left' },
    { header: 'Nhóm công việc', key: 'Nhóm công việc', width: 22, align: 'left' },
    { header: 'Mã nhiệm vụ', key: 'Mã nhiệm vụ', width: 16, align: 'center' },
    { header: 'Tên nhiệm vụ', key: 'Tên nhiệm vụ', width: 32, align: 'left' },
    { header: 'Chi tiết nội dung', key: 'Chi tiết nội dung', width: 36, align: 'left' },
    { header: 'Ngày bắt đầu', key: 'Ngày bắt đầu', width: 14, align: 'center' },
    { header: 'Giờ bắt đầu', key: 'Giờ bắt đầu', width: 12, align: 'center' },
    { header: 'Ngày kết thúc', key: 'Ngày kết thúc', width: 14, align: 'center' },
    { header: 'Giờ kết thúc', key: 'Giờ kết thúc', width: 12, align: 'center' },
    { header: 'Ngày hoàn thành thực tế', key: 'Ngày hoàn thành thực tế', width: 16, align: 'center' },
    { header: 'Số giờ làm việc', key: 'Số giờ làm việc', width: 14, align: 'center' },
    { header: 'Tính chất đề xuất', key: 'Tính chất đề xuất', width: 18, align: 'center' },
    { header: 'Điểm chuẩn', key: 'Điểm chuẩn', width: 12, align: 'center' },
    { header: 'Số lượng SP', key: 'Số lượng SP', width: 12, align: 'center' },
    { header: 'Đơn vị tính', key: 'Đơn vị tính', width: 14, align: 'center' },
    { header: 'Link minh chứng', key: 'Link minh chứng', width: 32, align: 'left' },
    { header: 'Dự án liên quan', key: 'Dự án liên quan', width: 26, align: 'left' },
    { header: 'Trạng thái', key: 'Trạng thái', width: 16, align: 'center' }
  ]);

  // 2. Sheet Danh sách nhân sự
  addTemplateSheet('Danh_Sach_Nhan_Su', [
    {
      'Họ và tên': 'Huỳnh Trọng Hiếu',
      'Email': 'hieuht@kpi.gov.vn',
      'Chức danh': 'Trưởng phòng',
      'Vị trí công tác': 'Trưởng phòng Kế hoạch Tài chính',
      'Phòng ban': 'Phòng Kế hoạch Tài chính',
      'Vai trò': 'lead',
      'Hệ số A': 1.0,
      'Hệ số B': 1.0,
      'Hệ số C': 1.0,
      'Trạng thái': 'Đang công tác'
    }
  ], [
    { header: 'Họ và tên', key: 'Họ và tên', width: 24, align: 'left' },
    { header: 'Email', key: 'Email', width: 28, align: 'left' },
    { header: 'Chức danh', key: 'Chức danh', width: 20, align: 'left' },
    { header: 'Vị trí công tác', key: 'Vị trí công tác', width: 24, align: 'left' },
    { header: 'Phòng ban', key: 'Phòng ban', width: 24, align: 'left' },
    { header: 'Vai trò', key: 'Vai trò', width: 14, align: 'center' },
    { header: 'Hệ số A', key: 'Hệ số A', width: 12, align: 'center' },
    { header: 'Hệ số B', key: 'Hệ số B', width: 12, align: 'center' },
    { header: 'Hệ số C', key: 'Hệ số C', width: 12, align: 'center' },
    { header: 'Trạng thái', key: 'Trạng thái', width: 16, align: 'center' }
  ]);

  // 3. Sheet Danh mục nhiệm vụ
  addTemplateSheet('Danh_Muc_Nhiem_Vu', [
    {
      'Mã nhiệm vụ': 'NV-KH-01',
      'Tên nhiệm vụ': 'Tổng hợp kế hoạch vốn đầu tư công',
      'Nhóm nhiệm vụ': 'Kế hoạch và Đầu tư',
      'Mô tả quy trình': 'Thu thập, đối chiếu số liệu giải ngân từ các chủ đầu tư',
      'Điểm chuẩn': 10,
      'Đơn vị tính': 'Báo cáo',
      'Thời gian định mức (giờ)': 40
    }
  ], [
    { header: 'Mã nhiệm vụ', key: 'Mã nhiệm vụ', width: 16, align: 'center' },
    { header: 'Tên nhiệm vụ', key: 'Tên nhiệm vụ', width: 34, align: 'left' },
    { header: 'Nhóm nhiệm vụ', key: 'Nhóm nhiệm vụ', width: 24, align: 'left' },
    { header: 'Mô tả quy trình', key: 'Mô tả quy trình', width: 36, align: 'left' },
    { header: 'Điểm chuẩn', key: 'Điểm chuẩn', width: 14, align: 'center' },
    { header: 'Đơn vị tính', key: 'Đơn vị tính', width: 14, align: 'center' },
    { header: 'Thời gian định mức (giờ)', key: 'Thời gian định mức (giờ)', width: 22, align: 'center' }
  ]);

  // 4. Sheet Nhiệm vụ giao việc
  addTemplateSheet('Nhiem_Vu_Giao_Viec', [
    {
      'Mã giao việc': 'GV-2026-08-001',
      'Tháng': '08-2026',
      'Người giao việc': 'Huỳnh Trọng Hiếu',
      'Người nhận việc': 'Nguyễn Văn Minh',
      'Tên nhiệm vụ': 'Rà soát dự toán chi thường xuyên quý 3',
      'Nội dung chi tiết': 'Kiểm tra hồ sơ chứng từ thanh quyết toán của các đơn vị dự toán trực thuộc',
      'Ngày giao việc': '05/08/2026',
      'Hạn hoàn thành': '15/08/2026',
      'Mức độ ưu tiên': 'Cao'
    }
  ], [
    { header: 'Mã giao việc', key: 'Mã giao việc', width: 16, align: 'center' },
    { header: 'Tháng', key: 'Tháng', width: 12, align: 'center' },
    { header: 'Người giao việc', key: 'Người giao việc', width: 22, align: 'left' },
    { header: 'Người nhận việc', key: 'Người nhận việc', width: 22, align: 'left' },
    { header: 'Tên nhiệm vụ', key: 'Tên nhiệm vụ', width: 32, align: 'left' },
    { header: 'Nội dung chi tiết', key: 'Nội dung chi tiết', width: 36, align: 'left' },
    { header: 'Ngày giao việc', key: 'Ngày giao việc', width: 14, align: 'center' },
    { header: 'Hạn hoàn thành', key: 'Hạn hoàn thành', width: 14, align: 'center' },
    { header: 'Mức độ ưu tiên', key: 'Mức độ ưu tiên', width: 16, align: 'center' }
  ]);

  // 5. Sheet Đăng ký làm thêm giờ
  addTemplateSheet('Dang_Ky_Lam_Them', [
    {
      'Mã OT': 'OT-2026-08-001',
      'Tháng': '08-2026',
      'Nhân sự': 'Huỳnh Trọng Hiếu',
      'Ngày làm thêm': '11/08/2026',
      'Giờ bắt đầu': '17:00',
      'Giờ kết thúc': '20:30',
      'Số giờ đăng ký': 3.5,
      'Nội dung công việc': 'Tổng hợp số liệu điều chỉnh kế hoạch vốn đợt 3 trình UBND tỉnh',
      'Lý do làm thêm': 'Hồ sơ gấp theo chỉ đạo hỏa tốc của UBND tỉnh phục vụ phiên họp thường kỳ',
      'Dự án': 'Kế hoạch vốn đầu tư công năm 2026',
      'Kết quả dự kiến': 'Dự thảo Tờ trình và Bảng tổng hợp chi tiết',
      'Trạng thái duyệt': 'Đã duyệt',
      'Số giờ được duyệt': 3.5
    }
  ], [
    { header: 'Mã OT', key: 'Mã OT', width: 16, align: 'center' },
    { header: 'Tháng', key: 'Tháng', width: 12, align: 'center' },
    { header: 'Nhân sự', key: 'Nhân sự', width: 22, align: 'left' },
    { header: 'Ngày làm thêm', key: 'Ngày làm thêm', width: 14, align: 'center' },
    { header: 'Giờ bắt đầu', key: 'Giờ bắt đầu', width: 12, align: 'center' },
    { header: 'Giờ kết thúc', key: 'Giờ kết thúc', width: 12, align: 'center' },
    { header: 'Số giờ đăng ký', key: 'Số giờ đăng ký', width: 14, align: 'center' },
    { header: 'Nội dung công việc', key: 'Nội dung công việc', width: 34, align: 'left' },
    { header: 'Lý do làm thêm', key: 'Lý do làm thêm', width: 30, align: 'left' },
    { header: 'Dự án', key: 'Dự án', width: 26, align: 'left' },
    { header: 'Kết quả dự kiến', key: 'Kết quả dự kiến', width: 30, align: 'left' },
    { header: 'Trạng thái duyệt', key: 'Trạng thái duyệt', width: 16, align: 'center' },
    { header: 'Số giờ được duyệt', key: 'Số giờ được duyệt', width: 16, align: 'center' }
  ]);

  const fileName = 'Mau_Chuan_Dong_Bo_Du_Lieu_KPI_V8.xlsx';
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};
