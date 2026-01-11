/**
 * getSearchHistory Lambda
 */

// DynamoDB Config
const DYNAMODB_CONFIG = {
  GSI_NAME: 'email-timestamp-index',
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 500
};

// Validation Rules
const VALIDATION_RULES = {
  EMAIL_MAX_LENGTH: 254,
  EMAIL_PATTERN: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  CRYPTO_MAX_LENGTH: 50,
  CRYPTO_PATTERN: /^[a-z0-9-]+$/
};

// HTTP Status Codes
const STATUS_CODES = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Error Messages
const ERROR_MESSAGES = {
  MISSING_TABLE_NAME: 'Lambda misconfigured - missing TABLE_NAME',
  INVALID_LIMIT: 'Limit must be a valid number greater than 0',
  LIMIT_EXCEEDED: `Limit cannot exceed ${DYNAMODB_CONFIG.MAX_LIMIT}`,
  INVALID_EMAIL_FORMAT: 'Invalid email format',
  INVALID_CRYPTO_FORMAT: 'Invalid cryptocurrency format',
  INVALID_PAGINATION_TOKEN: 'Invalid pagination token',
  TABLE_NOT_FOUND: 'Database table or index not found. Please contact support.',
  INDEX_NOT_AVAILABLE: 'Email search index not available. Please contact support.',
  HIGH_LOAD: 'Service experiencing high load. Please try again.',
  QUERY_FAILED: 'Database query failed',
  SCAN_FAILED: 'Database scan failed'
};

// CORS Headers
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-api-key',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

// Default Values
const DEFAULTS = {
  ITEM_ID: 'unknown',
  ITEM_CRYPTOCURRENCY: 'unknown',
  ITEM_PRICE: 0,
  ITEM_CURRENCY: 'usd',
  ITEM_CHANGE_24H: 0,
  ITEM_MARKET_CAP: 0,
  ITEM_EMAIL: ''
};

module.exports = {
  DYNAMODB_CONFIG,
  VALIDATION_RULES,
  STATUS_CODES,
  ERROR_MESSAGES,
  CORS_HEADERS,
  DEFAULTS
};