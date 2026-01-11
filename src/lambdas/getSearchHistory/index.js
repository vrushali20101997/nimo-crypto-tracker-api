const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const {
  DYNAMODB_CONFIG,
  VALIDATION_RULES,
  STATUS_CODES,
  ERROR_MESSAGES,
  CORS_HEADERS,
  DEFAULTS
} = require('./config');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.CRYPTO_HISTORY_TABLE;

const log = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ level: 'INFO', msg, ...meta })),
  error: (msg, meta = {}) => console.error(JSON.stringify({ level: 'ERROR', msg, ...meta })),
  warn: (msg, meta = {}) => console.warn(JSON.stringify({ level: 'WARN', msg, ...meta }))
};

if (!TABLE_NAME) {
  log.error('Missing TABLE_NAME environment variable');
  throw new Error(ERROR_MESSAGES.MISSING_TABLE_NAME);
}

const validateQueryParams = (queryParams) => {
  const validated = {};
  
  if (queryParams.limit) {
    const limit = parseInt(queryParams.limit, 10);
    if (isNaN(limit) || limit < 1) {
      throw new Error(ERROR_MESSAGES.INVALID_LIMIT);
    }
    if (limit > DYNAMODB_CONFIG.MAX_LIMIT) {
      throw new Error(ERROR_MESSAGES.LIMIT_EXCEEDED);
    }
    validated.limit = limit;
  } else {
    validated.limit = DYNAMODB_CONFIG.DEFAULT_LIMIT;
  }
  
  if (queryParams.email) {
    const email = queryParams.email.toLowerCase().trim();
    
    if (!email || 
        !VALIDATION_RULES.EMAIL_PATTERN.test(email) || 
        email.length > VALIDATION_RULES.EMAIL_MAX_LENGTH) {
      throw new Error(ERROR_MESSAGES.INVALID_EMAIL_FORMAT);
    }
    validated.email = email;
  }
  
  if (queryParams.cryptocurrency) {
    const crypto = queryParams.cryptocurrency.toLowerCase().trim();
    
    if (!crypto || 
        crypto.length > VALIDATION_RULES.CRYPTO_MAX_LENGTH || 
        !VALIDATION_RULES.CRYPTO_PATTERN.test(crypto)) {
      throw new Error(ERROR_MESSAGES.INVALID_CRYPTO_FORMAT);
    }
    validated.cryptocurrency = crypto;
  }
  
  if (queryParams.nextToken) {
    try {
      const decoded = Buffer.from(queryParams.nextToken, 'base64').toString('utf-8');
      JSON.parse(decoded);
      validated.nextToken = queryParams.nextToken;
    } catch (error) {
      throw new Error(ERROR_MESSAGES.INVALID_PAGINATION_TOKEN);
    }
  }
  
  return validated;
};

const queryHistoryByEmail = async (email, limit, nextToken = null) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: DYNAMODB_CONFIG.GSI_NAME,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      ScanIndexForward: false,
      Limit: limit
    };
    
    if (nextToken) {
      const decoded = Buffer.from(nextToken, 'base64').toString('utf-8');
      params.ExclusiveStartKey = JSON.parse(decoded);
    }
    
    const result = await docClient.send(new QueryCommand(params));
    
    log.info('Query by email completed', { email, count: result.Items?.length || 0 });
    
    let paginationToken = null;
    if (result.LastEvaluatedKey) {
      paginationToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }
    
    return { items: result.Items || [], nextToken: paginationToken };
  } catch (error) {
    log.error('Query by email failed', { email, error: error.message, errorCode: error.name });
    
    if (error.name === 'ResourceNotFoundException') {
      throw new Error(ERROR_MESSAGES.TABLE_NOT_FOUND);
    }
    if (error.name === 'ValidationException' && error.message.includes('index')) {
      throw new Error(ERROR_MESSAGES.INDEX_NOT_AVAILABLE);
    }
    if (error.name === 'ProvisionedThroughputExceededException') {
      throw new Error(ERROR_MESSAGES.HIGH_LOAD);
    }
    
    throw new Error(`${ERROR_MESSAGES.QUERY_FAILED}: ${error.message}`);
  }
};

/**
 * Query all recent searches via type-timestamp-index GSI (no table scan)
 */
const queryRecentHistory = async (limit, nextToken = null) => {
  try {
    log.info('Querying recent history via type-timestamp-index', { limit });
    
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'type-timestamp-index',
      KeyConditionExpression: 'recordType = :type',
      ExpressionAttributeValues: { 
        ':type': 'SEARCH' 
      },
      ScanIndexForward: false,
      Limit: limit
    };
    
    if (nextToken) {
      const decoded = Buffer.from(nextToken, 'base64').toString('utf-8');
      params.ExclusiveStartKey = JSON.parse(decoded);
    }
    
    const result = await docClient.send(new QueryCommand(params));
    
    log.info('Query completed', { count: result.Items?.length || 0 });
    
    let paginationToken = null;
    if (result.LastEvaluatedKey) {
      paginationToken = Buffer.from(
        JSON.stringify(result.LastEvaluatedKey)
      ).toString('base64');
    }
    
    return { items: result.Items || [], nextToken: paginationToken };
  } catch (error) {
    log.error('Query failed', { error: error.message, errorCode: error.name });
    
    if (error.name === 'ResourceNotFoundException') {
      throw new Error(ERROR_MESSAGES.TABLE_NOT_FOUND);
    }
    if (error.name === 'ValidationException' && error.message.includes('index')) {
      throw new Error(ERROR_MESSAGES.INDEX_NOT_AVAILABLE);
    }
    if (error.name === 'ProvisionedThroughputExceededException') {
      throw new Error(ERROR_MESSAGES.HIGH_LOAD);
    }
    
    throw new Error(`${ERROR_MESSAGES.QUERY_FAILED}: ${error.message}`);
  }
};

const filterByCryptocurrency = (items, cryptocurrency) => {
  if (!cryptocurrency) return items;
  return items.filter(item => 
    item.cryptocurrency && 
    item.cryptocurrency.toLowerCase() === cryptocurrency.toLowerCase()
  );
};

const sanitizeItems = (items) => {
  if (!Array.isArray(items)) return [];
  
  return items.map(item => ({
    id: item.id || DEFAULTS.ITEM_ID,
    cryptocurrency: item.cryptocurrency || DEFAULTS.ITEM_CRYPTOCURRENCY,
    price: typeof item.price === 'number' ? item.price : DEFAULTS.ITEM_PRICE,
    currency: item.currency || DEFAULTS.ITEM_CURRENCY,
    change24h: typeof item.change24h === 'number' ? item.change24h : DEFAULTS.ITEM_CHANGE_24H,
    marketCap: typeof item.marketCap === 'number' ? item.marketCap : DEFAULTS.ITEM_MARKET_CAP,
    email: item.email || DEFAULTS.ITEM_EMAIL,
    timestamp: item.timestamp || new Date().toISOString()
  }));
};

const mapErrorToStatusCode = (error) => {
  if (error.message.includes('Database') || 
      error.message.includes('not found') || 
      error.message.includes('not available') ||
      error.message.includes('high load')) {
    return STATUS_CODES.SERVICE_UNAVAILABLE;
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
    const queryParams = event.queryStringParameters || {};
    
    let validated;
    try {
      validated = validateQueryParams(queryParams);
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
    
    let result;
    if (validated.email) {
      result = await queryHistoryByEmail(
        validated.email, 
        validated.limit, 
        validated.nextToken
      );
    } else {
      result = await queryRecentHistory(validated.limit, validated.nextToken);
    }
    
    let filteredItems = result.items;
    if (validated.cryptocurrency) {
      filteredItems = filterByCryptocurrency(result.items, validated.cryptocurrency);
    }
    
    const sanitizedItems = sanitizeItems(filteredItems);
    
    const duration = Date.now() - startTime;
    log.info('Success', { requestId, count: sanitizedItems.length, duration });
    
    return {
      statusCode: STATUS_CODES.SUCCESS,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        count: sanitizedItems.length,
        limit: validated.limit,
        email: validated.email || null,
        cryptocurrency: validated.cryptocurrency || null,
        data: sanitizedItems,
        nextToken: result.nextToken || null,
        hasMore: !!result.nextToken,
        requestId,
        duration
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
    
    return {
      statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: false, 
        error: error.message, 
        requestId, 
        duration 
      })
    };
  }
};