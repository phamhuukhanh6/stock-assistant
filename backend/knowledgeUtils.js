const fs = require('fs');
const path = require('path');

const KNOWLEDGE_BASE_DIR = path.join(__dirname, '..', 'knowledge');

function getKnowledgeContext(query) {
  const queryUpper = query.toUpperCase();
  let context = "";

  // 1. Check for basic concepts
  if (["P/E", "P/B", "ROE", "BCTC", "CƠ BẢN", "CHỈ SỐ"].some(k => queryUpper.includes(k))) {
    context += readKnowledgeFile('khai_niem_co_ban.md');
  }

  // 2. Check for macro
  if (["VĨ MÔ", "LÃI SUẤT", "TỶ GIÁ", "GDP", "CPI"].some(k => queryUpper.includes(k))) {
    context += readKnowledgeFile('vi_mo_viet_nam.md');
  }

  // 3. Check for industries (Consolidated)
  const sectors = ["NGÂN HÀNG", "BANK", "BẤT ĐỘNG SẢN", "BĐS", "THÉP", "STEEL", "TIÊU DÙNG", "SỮA", "BÁN LẺ", "CÔNG NGHỆ", "ĐIỆN", "DẦU KHÍ", "THỦY SẢN", "DỆT MAY", "HÓA CHẤT", "LOGISTICS", "XÂY DỰNG", "Y TẾ", "NÔNG NGHIỆP"];
  if (sectors.some(k => queryUpper.includes(k))) {
    context += readKnowledgeFile('nganh/all_sectors.md');
  }

  // 4. Check for specific companies
  if (queryUpper.includes("VNM")) context += readKnowledgeFile('doanh_nghiep/VNM.md');
  if (queryUpper.includes("VCB")) context += readKnowledgeFile('doanh_nghiep/VCB.md');
  if (queryUpper.includes("HPG")) context += readKnowledgeFile('doanh_nghiep/HPG.md');

  return context;
}

function readKnowledgeFile(relativePath) {
  const filePath = path.join(KNOWLEDGE_BASE_DIR, relativePath);
  try {
    if (fs.existsSync(filePath)) {
      return `\n--- KIẾN THỨC NỀN TRONG HỆ THỐNG ---\n${fs.readFileSync(filePath, 'utf8')}\n`;
    }
  } catch (e) {
    console.error(`Error reading knowledge file ${relativePath}:`, e.message);
  }
  return "";
}

module.exports = { getKnowledgeContext };
