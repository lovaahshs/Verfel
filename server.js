const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
const CREDIT = 'Purchase from @sahilxalone';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// CORS
app.use(cors());

// Rate limiting (DDoS protection)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Too many requests. Please wait 1 minute.',
    credit: CREDIT
  }
});

app.use('/api/', limiter);
app.use(express.json({ limit: '10kb' }));

// No root page
app.get('/', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    credit: CREDIT
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    credit: CREDIT
  });
});

// MAIN API - With key=trail format
app.get('/api/challan/key=trail/:number', async (req, res) => {
  const challanNumber = req.params.number;
  
  if (!challanNumber || challanNumber.length < 8 || challanNumber.length > 20) {
    return res.status(400).json({
      success: false,
      error: 'Invalid challan number',
      credit: CREDIT
    });
  }
  
  try {
    const targetUrl = `http://104.248.231.22:5000/challan/${challanNumber}`;
    
    const response = await axios.get(targetUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract data
    const title = $('title').text().trim();
    const bodyText = $('body').text().trim();
    
    // Try to find structured data
    let amount = '';
    let status = '';
    let vehicleNo = '';
    
    $('td, th, .amount, .status, .vehicle').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('₹') || text.match(/\d{2,5}/)) amount = text;
      if (text.toLowerCase().includes('pending') || text.toLowerCase().includes('paid')) status = text;
      if (text.match(/[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}/)) vehicleNo = text;
    });
    
    res.json({
      success: true,
      challan: challanNumber,
      data: {
        title: title.substring(0, 200),
        content: bodyText.substring(0, 3000),
        amount: amount || 'Not found',
        status: status || 'Unknown',
        vehicle_number: vehicleNo || 'Not found'
      },
      credit: CREDIT,
      developer: '@sahilxalone'
    });
    
  } catch (error) {
    res.status(502).json({
      success: false,
      challan: challanNumber,
      error: error.code === 'ECONNABORTED' ? 'Timeout' : 'Service unavailable',
      message: error.message,
      credit: CREDIT
    });
  }
});

// Simple endpoint without key=trail
app.get('/api/challan/:number', async (req, res) => {
  const challanNumber = req.params.number;
  
  try {
    const targetUrl = `http://104.248.231.22:5000/challan/${challanNumber}`;
    const response = await axios.get(targetUrl, { timeout: 8000 });
    const $ = cheerio.load(response.data);
    
    res.json({
      success: true,
      challan: challanNumber,
      data: $('body').text().substring(0, 2000),
      credit: CREDIT
    });
  } catch (error) {
    res.json({
      success: false,
      error: 'Failed to fetch',
      credit: CREDIT
    });
  }
});

// Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'Challan API',
    version: '2.0.0',
    endpoints: {
      'GET /api/challan/key=trail/:number': 'Get challan details',
      'GET /api/challan/:number': 'Simple challan data',
      'GET /health': 'Health check'
    },
    example: '/api/challan/key=trail/UP42BB2572',
    credit: CREDIT
  });
});

// 404 for unknown routes
app.all('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    credit: CREDIT
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Challan API running on port ${PORT}`);
  console.log(`🔗 Credit: @sahilxalone`);
  console.log(`📡 Ready at http://localhost:${PORT}`);
});
