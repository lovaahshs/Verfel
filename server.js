const express = require('express');
const axios = require('axios');
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

// Body parser limit
app.use(express.json({ limit: '10kb' }));

// DDoS Protection - Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: 'Too many requests. Please wait 1 minute.',
    credit: CREDIT
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// ========== ROOT (404 as requested) ==========
app.get('/', (req, res) => {
  res.status(404).send('');
});

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'active',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    credit: CREDIT,
    developer: '@sahilxalone'
  });
});

// ========== MAIN API - FULL DATA (NO FILTER) ==========
app.get('/api/challan/key=trail/:number', async (req, res) => {
  const challanNumber = req.params.number;
  
  // Validate challan number
  if (!challanNumber || challanNumber.length < 8 || challanNumber.length > 30) {
    return res.status(400).json({
      success: false,
      error: 'Invalid challan number',
      message: 'Challan number must be between 8-30 characters',
      credit: CREDIT
    });
  }

  try {
    // Call original source API
    const targetUrl = `http://104.248.231.22:5000/challan/${challanNumber}`;
    
    const response = await axios.get(targetUrl, {
      timeout: 15000, // 15 seconds timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
      }
    });
    
    // Get complete data from source
    const fullData = response.data;
    
    // Send EVERYTHING as-is, just add credit info
    res.json({
      success: true,
      source: 'original',
      challan_number_queried: challanNumber,
      data: fullData.data || fullData,
      summary: fullData.summary || null,
      message: fullData.message || 'Challans details fetched successfully',
      original_status: fullData.status || true,
      credit: CREDIT,
      developer: '@sahilxalone',
      fetched_at: new Date().toISOString(),
      request_id: Math.random().toString(36).substring(7)
    });
    
  } catch (error) {
    console.error(`Error fetching challan ${challanNumber}:`, error.message);
    
    // Handle different error types
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        error: 'Gateway Timeout',
        message: 'Source server took too long to respond',
        credit: CREDIT
      });
    }
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: 'Source server error',
        status: error.response.status,
        message: error.response.data || 'Unknown error from source',
        credit: CREDIT
      });
    }
    
    res.status(502).json({
      success: false,
      error: 'Bad Gateway',
      message: error.message || 'Unable to fetch challan data',
      credit: CREDIT
    });
  }
});

// ========== SIMPLE ENDPOINT (without key=trail) ==========
app.get('/api/challan/:number', async (req, res) => {
  const challanNumber = req.params.number;
  
  if (!challanNumber || challanNumber.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Invalid challan number',
      credit: CREDIT
    });
  }

  try {
    const targetUrl = `http://104.248.231.22:5000/challan/${challanNumber}`;
    const response = await axios.get(targetUrl, { timeout: 10000 });
    
    // Send COMPLETE data, no filtering
    res.json({
      success: true,
      data: response.data.data || response.data,
      summary: response.data.summary || null,
      message: response.data.message || 'Challans fetched',
      credit: CREDIT,
      developer: '@sahilxalone'
    });
    
  } catch (error) {
    res.status(502).json({
      success: false,
      error: 'Service unavailable',
      message: error.message,
      credit: CREDIT
    });
  }
});

// ========== API DOCUMENTATION ==========
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'Challan API - Full Data',
    version: '3.0.0',
    description: 'Returns complete, unfiltered challan data from source API',
    endpoints: {
      'GET /api/challan/key=trail/:number': {
        description: 'Get complete challan data',
        example: '/api/challan/key=trail/UP42BB2572',
        returns: 'Full array of challans + summary + all original fields'
      },
      'GET /api/challan/:number': {
        description: 'Simpler endpoint, same full data',
        example: '/api/challan/UP42BB2572'
      },
      'GET /health': 'Health check',
      'GET /api/docs': 'This documentation'
    },
    rate_limit: '30 requests per minute',
    credit: CREDIT,
    developer: '@sahilxalone'
  });
});

// ========== CATCH ALL 404 ==========
app.all('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'Use /api/challan/key=trail/YOUR_CHALLAN_NUMBER',
    credit: CREDIT
  });
});

// ========== START SERVER ==========
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`🚀 Challan API - Full Data Mode`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`👤 Developer: @sahilxalone`);
  console.log(`💳 Credit: ${CREDIT}`);
  console.log(`✅ API Ready at: http://localhost:${PORT}`);
  console.log('='.repeat(50));
});
