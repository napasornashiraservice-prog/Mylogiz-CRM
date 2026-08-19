import { Lead, StatusLabels } from "../types";

/**
 * Export Leads list to UTF-8 BOM CSV format for Google Sheets / Excel compatibility
 */
export function exportLeadsToCSV(leads: Lead[], filename = "Mylogiz_CRM_Leads.csv") {
  const headers = [
    "ID",
    "ชื่อร้านค้า (Shop Name)",
    "ชื่อผู้ติดต่อ (Contact)",
    "เบอร์โทรศัพท์ (Phone)",
    "LINE ID",
    "จังหวัด (Province)",
    "สถานะ Pipeline (Status)",
    "คะแนนความสนใจ (Score 1-5)",
    "ยอดส่งสินค้า/เดือน (ชิ้น)",
    "ผู้ดูแล / เซลส์ (Assigned Sales)",
    "ช่องทางที่มา (Channel)",
    "ขนส่งที่สนใจ",
    "ขนส่งเดิมที่ใช้อยู่",
    "ที่อยู่ (Address)",
    "วันที่อัปเดตล่าสุด (Updated At)"
  ];

  const rows = leads.map(lead => [
    lead.id || "",
    lead.shopName || "",
    lead.contactName || "",
    lead.phone || "",
    lead.lineId || "",
    lead.province || "",
    StatusLabels[lead.status] || lead.status || "",
    lead.score || 0,
    lead.shipmentsPerDay || 0,
    lead.salesPerson || "",
    lead.channel || "",
    (lead.preferredTransport || []).join(", "),
    lead.competitor || "",
    lead.address || "",
    lead.updatedAt ? new Date(lead.updatedAt).toLocaleString("th-TH") : ""
  ]);

  // Convert to CSV string with proper escaping
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
  ].join("\r\n");

  // UTF-8 BOM byte order mark \uFEFF for Thai language in Excel & Google Sheets
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Send Leads data directly to Google Apps Script Web App
 */
export async function pushLeadsToGoogleSheet(
  webAppUrl: string,
  sheetName: string,
  leads: Lead[]
): Promise<{ success: boolean; message: string }> {
  if (!webAppUrl || !webAppUrl.startsWith("http")) {
    return {
      success: false,
      message: "กรุณาระบุ Web App URL ของ Google Apps Script ที่ถูกต้อง"
    };
  }

  try {
    const formattedData = leads.map(lead => ({
      id: lead.id,
      shopName: lead.shopName,
      contactName: lead.contactName,
      phone: lead.phone,
      lineId: lead.lineId,
      province: lead.province,
      status: StatusLabels[lead.status] || lead.status,
      score: lead.score,
      shipmentsPerMonth: lead.shipmentsPerDay,
      assignedSalesperson: lead.salesPerson,
      channel: lead.channel,
      preferredTransport: (lead.preferredTransport || []).join(", "),
      competitor: lead.competitor,
      address: lead.address,
      updatedAt: lead.updatedAt
    }));

    const payload = {
      sheetName: sheetName || "Mylogiz_CRM_Sync",
      leads: formattedData,
      total: formattedData.length,
      syncedAt: new Date().toISOString()
    };

    // Send payload to Apps Script Web App using no-cors or JSON body
    await fetch(webAppUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      mode: "no-cors"
    });

    return {
      success: true,
      message: `ส่งข้อมูล ${leads.length} รายการไปยัง Google Sheet ทันทีสำเร็จ!`
    };
  } catch (err: any) {
    console.error("Google Sheets Web App Sync Error:", err);
    return {
      success: false,
      message: `ไม่สามารถเชื่อมต่อ Google Apps Script Web App: ${err.message || err}`
    };
  }
}

/**
 * Clean Google Apps Script Template code for end-users to paste into Google Sheet Script Editor
 */
export const GOOGLE_APPS_SCRIPT_CODE = `
// ==========================================
// Google Apps Script สำหรับรับข้อมูลจาก Mylogiz CRM
// ==========================================
// วิธีใช้งาน:
// 1. เปิด Google Sheet ของคุณ
// 2. ไปที่เมนู "ส่วนขยาย (Extensions)" -> "Apps Script"
// 3. วางโค้ดนี้ทั้งหมดแทนที่โค้ดเดิม
// 4. กด "พ้องข้อมูล/บันทึก" (Save)
// 5. กด "ทำให้ใช้งานได้ (Deploy)" -> "การทำให้ใช้งานได้รายการใหม่ (New deployment)"
// 6. เลือกประเภท: "เว็บแอป (Web app)"
// 7. สิทธิ์การเข้าถึง (Who has access): เลือก "ทุกคน (Anyone)"
// 8. กด "ทำให้ใช้งานได้ (Deploy)" และคัดลอก URL สั้นๆ มาวางในระบบ CRM
// ==========================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheetName = data.sheetName || "Mylogiz_CRM_Sync";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // เคลียร์ข้อมูลเดิมและใส่ Header
    sheet.clear();
    var headers = [
      "ID", "ชื่อร้านค้า", "ชื่อผู้ติดต่อ", "เบอร์โทร", "LINE ID", 
      "จังหวัด", "สถานะ Pipeline", "คะแนนความสนใจ", "ยอดส่ง/เดือน", 
      "เซลส์ดูแล", "ช่องทาง", "ขนส่งที่สนใจ", "คู่แข่งเดิม", "ที่อยู่", "อัปเดตล่าสุด"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#4285F4").setFontColor("#FFFFFF");
    
    var rows = [];
    if (data.leads && data.leads.length > 0) {
      for (var i = 0; i < data.leads.length; i++) {
        var l = data.leads[i];
        rows.push([
          l.id || "",
          l.shopName || "",
          l.contactName || "",
          l.phone || "",
          l.lineId || "",
          l.province || "",
          l.status || "",
          l.score || 0,
          l.shipmentsPerMonth || 0,
          l.assignedSalesperson || "",
          l.channel || "",
          l.preferredTransport || "",
          l.competitor || "",
          l.address || "",
          l.updatedAt || new Date().toLocaleString()
        ]);
      }
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`.trim();
