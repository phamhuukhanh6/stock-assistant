const { getMarketOverview } = require('./server');
require('dotenv').config();

async function test() {
  try {
    const result = await getMarketOverview();
    console.log('MARKET_OVERVIEW_RESULT:', result);
  } catch (e) {
    console.error('ERROR:', e);
  }
}

test();
