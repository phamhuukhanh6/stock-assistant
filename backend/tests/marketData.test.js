const { getMarketOverview, getStockFullIntelligence } = require('../server');

describe('Market Data Intelligence Audit', () => {
  
  it('getMarketOverview should return real-time indices and news', async () => {
    const result = await getMarketOverview();
    expect(result).toContain('[Toàn cảnh Thị trường lúc');
    expect(result).toMatch(/VNINDEX|VN30|HNXIndex/);
    expect(result.length).toBeGreaterThan(50);
  }, 30000);

  it('getStockFullIntelligence should return deep analysis for FPT', async () => {
    const result = await getStockFullIntelligence('FPT');
    expect(result).toContain('--- DỮ LIỆU THỰC TẾ MÃ FPT');
    expect(result).toContain('[Hồ sơ]: Tên: Công ty Cổ phần FPT');
    expect(result).toContain('[Kỹ thuật]: Giá hiện tại');
    expect(result).toContain('[Cổ đông]:');
  }, 30000);

  it('getStockFullIntelligence should handle invalid tickers gracefully', async () => {
    const result = await getStockFullIntelligence('INVALID123');
    // It should still return the header but mostly empty sections
    expect(result).toContain('--- DỮ LIỆU THỰC TẾ MÃ INVALID123');
  });

});
