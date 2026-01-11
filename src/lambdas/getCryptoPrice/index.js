const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const { 
  API_CONFIG, 
  SUPPORTED_CRYPTOS, 
  VALIDATION_RULES, 
  STATUS_CODES, 
  ERROR_MESSAGES, 
  CORS_HEADERS 
} = require('./config');
const { 
  generateHtmlEmail, 
  generateTextEmail, 
  generateEmailSubject 
} = require('./emailTemplate');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({});

const TABLE_NAME = process.env.CRYPTO_HISTORY_TABLE;
const SENDER_EMAIL = process.env.SENDER_EMAIL;
const CACHE_TTL = 60000;

const log = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ level: 'INFO', msg, ...meta })),
  error: (msg, meta = {}) => console.error(JSON.stringify({ level: 'ERROR', msg, ...meta })),
  warn: (msg, meta = {}) => console.warn(JSON.stringify({ level: 'WARN', msg, ...meta }))
};

if (!TABLE_NAME || !SENDER_EMAIL) {
  log.error('Missing environment variables', { 
    TABLE_NAME: !!TABLE_NAME, 
    SENDER_EMAIL: !!SENDER_EMAIL 
  });
  throw new Error(ERROR_MESSAGES.MISSING_ENV_VARS);
}

const validateInput = (cryptocurrency, email) => {
  if (!cryptocurrency || typeof cryptocurrency !== 'string') {
    throw new Error(ERROR_MESSAGES.CRYPTO_REQUIRED);
  }

  const crypto = cryptocurrency.toLowerCase().trim();
  
  if (!crypto || 
      crypto.length > VALIDATION_RULES.CRYPTO_MAX_LENGTH || 
      !VALIDATION_RULES.CRYPTO_PATTERN.test(crypto)) {
    throw new Error(ERROR_MESSAGES.INVALID_CRYPTO_FORMAT);
  }

  if (!SUPPORTED_CRYPTOS.includes(crypto)) {
    throw new Error(ERROR_MESSAGES.UNSUPPORTED_CRYPTO);
  }

  if (!email || typeof email !== 'string') {
    throw new Error(ERROR_MESSAGES.EMAIL_REQUIRED);
  }

  const emailTrimmed = email.toLowerCase().trim();
  
  if (!VALIDATION_RULES.EMAIL_PATTERN.test(emailTrimmed) || 
      emailTrimmed.length > VALIDATION_RULES.EMAIL_MAX_LENGTH) {
    throw new Error(ERROR_MESSAGES.INVALID_EMAIL_FORMAT);
  }

  return { cryptocurrency: crypto, email: emailTrimmed };
};

const getCachedPrice = async (cryptoId) => {
  const cacheKey = `price_cache_${cryptoId}`;
  
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: cacheKey }
    }));
    
    if (result.Item) {
      const cacheAge = Date.now() - new Date(result.Item.timestamp).getTime();
      
      if (cacheAge < CACHE_TTL) {
        log.info('Cache hit', { cryptoId, ageMs: cacheAge });
        return result.Item.priceData;
      }
    }
  } catch (error) {
    log.warn('Cache read failed', { cryptoId, error: error.message });
  }
  
  return null;
};

const setCachedPrice = async (cryptoId, priceData) => {
  const cacheKey = `price_cache_${cryptoId}`;
  
  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        id: cacheKey,
        priceData,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 120
      }
    }));
    
    log.info('Price cached', { cryptoId });
  } catch (error) {
    log.warn('Cache write failed', { cryptoId, error: error.message });
  }
};

const fetchCryptoPrice = (cryptoId, attempt = 1) => {
  return new Promise((resolve, reject) => {
    const url = `${API_CONFIG.COINGECKO_BASE_URL}/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
    
    log.info('Fetching crypto price', { cryptoId, attempt });
    
    const request = https.get(url, {
      headers: {
        'User-Agent': API_CONFIG.USER_AGENT,
        'Accept': 'application/json'
      }
    }, (res) => {
      const chunks = [];
      
      if (res.statusCode !== 200) {
        res.resume();
        const errorMsg = res.statusCode === 429 ? ERROR_MESSAGES.RATE_LIMIT_EXCEEDED
          : res.statusCode >= 500 ? ERROR_MESSAGES.API_UNAVAILABLE
          : res.statusCode === 404 ? `${ERROR_MESSAGES.CRYPTO_NOT_FOUND}`
          : `API request failed with status ${res.statusCode}`;
        
        log.error('API error', { cryptoId, statusCode: res.statusCode });
        return reject(new Error(errorMsg));
      }
      
      const contentType = res.headers['content-type'] || '';
      if (!contentType.includes('application/json')) {
        res.resume();
        log.error('Invalid content type', { cryptoId, contentType });
        return reject(new Error('API returned unexpected content type'));
      }
      
      res.on('data', chunk => chunks.push(chunk));
      
      res.on('end', () => {
        try {
          const rawData = Buffer.concat(chunks).toString('utf8');
          if (!rawData || rawData.trim().length === 0) {
            throw new Error(ERROR_MESSAGES.EMPTY_API_RESPONSE);
          }
          
          const parsed = JSON.parse(rawData);
          
          if (!parsed || !parsed[cryptoId]) {
            throw new Error(`Cryptocurrency '${cryptoId}' not found in API response`);
          }

          const cryptoData = parsed[cryptoId];
          
          if (typeof cryptoData.usd !== 'number' || 
              isNaN(cryptoData.usd) || 
              cryptoData.usd < 0) {
            throw new Error(ERROR_MESSAGES.INVALID_PRICE_DATA);
          }

          resolve({
            cryptocurrency: cryptoId,
            price: cryptoData.usd,
            currency: 'usd',
            change24h: typeof cryptoData.usd_24h_change === 'number' ? cryptoData.usd_24h_change : 0,
            marketCap: typeof cryptoData.usd_market_cap === 'number' ? cryptoData.usd_market_cap : 0
          });
        } catch (error) {
          log.error('Parse error', { cryptoId, error: error.message });
          reject(error);
        }
      });
    });

    request.on('error', error => {
      const errorMsg = error.code === 'ENOTFOUND' ? ERROR_MESSAGES.NETWORK_UNREACHABLE
        : error.code === 'ETIMEDOUT' ? ERROR_MESSAGES.CONNECTION_TIMEOUT
        : `Network error: ${error.message}`;
      
      log.error('Network error', { cryptoId, code: error.code });
      reject(new Error(errorMsg));
    });

    const timeoutId = setTimeout(() => {
      request.destroy();
      log.error('Request timeout', { cryptoId, timeout: API_CONFIG.TIMEOUT });
      reject(new Error(`Request timeout after ${API_CONFIG.TIMEOUT}ms`));
    }, API_CONFIG.TIMEOUT);
    
    request.on('close', () => clearTimeout(timeoutId));
  });
};

const isRetryableError = (error) => {
  return error.message.includes('timeout') ||
    error.message.includes('temporarily unavailable') ||
    error.message.includes('Rate limit') ||
    error.message.includes('Network error') ||
    error.message.includes('status 5');
};

const fetchCryptoPriceWithRetry = async (cryptoId) => {
  const cachedData = await getCachedPrice(cryptoId);
  if (cachedData) {
    return cachedData;
  }
  
  let lastError;
  
  for (let attempt = 1; attempt <= API_CONFIG.MAX_RETRIES; attempt++) {
    try {
      const priceData = await fetchCryptoPrice(cryptoId, attempt);
      await setCachedPrice(cryptoId, priceData);
      return priceData;
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error) || attempt === API_CONFIG.MAX_RETRIES) {
        break;
      }
      
      const delay = API_CONFIG.BACKOFF_BASE * Math.pow(2, attempt - 1);
      log.warn('Retrying', { cryptoId, attempt, delay });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Failed to fetch price after ${API_CONFIG.MAX_RETRIES} attempts: ${lastError.message}`);
};

const storeSearchHistory = async (data, attempt = 1) => {
  const ttlDays = 90;
  const item = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    recordType: 'SEARCH',
    ttl: Math.floor(Date.now() / 1000) + (ttlDays * 24 * 60 * 60),
    ...data
  };
  
  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(id)'
    }));
    
    log.info('Stored history', { id: item.id });
    return item;
  } catch (error) {
    log.error('DynamoDB error', { error: error.message, errorCode: error.name });
    
    if (error.name === 'ProvisionedThroughputExceededException' && 
        attempt < API_CONFIG.MAX_RETRIES) {
      const delay = API_CONFIG.BACKOFF_BASE * Math.pow(2, attempt - 1);
      log.warn('DynamoDB throttled, retrying', { attempt, delay });
      await new Promise(resolve => setTimeout(resolve, delay));
      return storeSearchHistory(data, attempt + 1);
    }
    
    if (error.name === 'ResourceNotFoundException') {
      throw new Error(ERROR_MESSAGES.TABLE_NOT_FOUND);
    }
    
    throw new Error(`Failed to store search history: ${error.message}`);
  }
};

const sendEmailNotification = async (recipientEmail, priceData) => {
  try {
    const response = await sesClient.send(new SendEmailCommand({
      Source: SENDER_EMAIL,
      Destination: { ToAddresses: [recipientEmail] },
      Message: {
        Subject: { 
          Data: generateEmailSubject(priceData),
          Charset: 'UTF-8'
        },
        Body: { 
          Html: { Data: generateHtmlEmail(priceData), Charset: 'UTF-8' },
          Text: { Data: generateTextEmail(priceData), Charset: 'UTF-8' }
        }
      }
    }));
    
    log.info('Email sent', { recipientEmail, messageId: response.MessageId });
  } catch (error) {
    log.error('SES error', { recipientEmail, error: error.message, errorCode: error.name });
    
    const errorMsg = error.name === 'MessageRejected' ? ERROR_MESSAGES.EMAIL_REJECTED
      : error.message.includes('not verified') ? ERROR_MESSAGES.EMAIL_NOT_VERIFIED
      : `Email delivery failed: ${error.message}`;
    
    throw new Error(errorMsg);
  }
};

const parseRequestBody = (event) => {
  try {
    return JSON.parse(event.body || '{}');
  } catch (parseError) {
    throw new Error(ERROR_MESSAGES.INVALID_JSON);
  }
};

const mapErrorToStatusCode = (error) => {
  if (error.message.includes('Failed to fetch')) {
    return STATUS_CODES.SERVICE_UNAVAILABLE;
  }
  if (error.message.includes('Failed to store')) {
    return STATUS_CODES.SERVICE_UNAVAILABLE;
  }
  if (error.message.includes('Rate limit')) {
    return STATUS_CODES.RATE_LIMIT;
  }
  if (error.message.includes('not found')) {
    return STATUS_CODES.NOT_FOUND;
  }
  if (error.message.includes('misconfigured')) {
    return STATUS_CODES.SERVER_ERROR;
  }
  return STATUS_CODES.SERVER_ERROR;
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  const startTime = Date.now();
  const requestId = event.requestContext?.requestId || 'unknown';
  log.info('Lambda invoked', { 
    requestId, 
    method: event.httpMethod, 
    path: event.path 
  });
  
  try {
    const body = parseRequestBody(event);
    const { cryptocurrency, email } = body;
    
    if (!cryptocurrency || !email) {
      return {
        statusCode: STATUS_CODES.BAD_REQUEST,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false, 
          error: ERROR_MESSAGES.MISSING_FIELDS, 
          requestId 
        })
      };
    }
    
    let validated;
    try {
      validated = validateInput(cryptocurrency, email);
    } catch (validationError) {
      log.warn('Validation failed', { requestId, error: validationError.message });
      return {
        statusCode: STATUS_CODES.BAD_REQUEST,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false, 
          error: validationError.message, 
          requestId 
        })
      };
    }
    
    const priceData = await fetchCryptoPriceWithRetry(validated.cryptocurrency);
    
    const storedData = await storeSearchHistory({
      ...priceData,
      email: validated.email
    });
    
    try {
      await sendEmailNotification(validated.email, priceData);
    } catch (emailError) {
      log.error('Email failed', { requestId, error: emailError.message });
      
      return {
        statusCode: STATUS_CODES.PARTIAL_SUCCESS,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          warning: 'Email delivery failed, but data was saved successfully',
          data: { 
            id: storedData.id, 
            ...priceData, 
            timestamp: storedData.timestamp 
          },
          requestId,
          duration: Date.now() - startTime
        })
      };
    }
    
    log.info('Success', { requestId, duration: Date.now() - startTime });
    
    return {
      statusCode: STATUS_CODES.SUCCESS,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: 'Price fetched and email sent successfully',
        data: { 
          id: storedData.id, 
          ...priceData, 
          timestamp: storedData.timestamp 
        },
        requestId,
        duration: Date.now() - startTime
      })
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('Lambda failed', { 
      requestId, 
      error: error.message, 
      stack: error.stack, 
      duration 
    });
    
    const statusCode = mapErrorToStatusCode(error);
    let errorMessage = error.message;
    
    if (statusCode === STATUS_CODES.SERVER_ERROR && 
        !error.message.includes('misconfigured')) {
      errorMessage = 'Internal server error';
    }
    
    return {
      statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: false, 
        error: errorMessage, 
        requestId, 
        duration 
      })
    };
  }
};