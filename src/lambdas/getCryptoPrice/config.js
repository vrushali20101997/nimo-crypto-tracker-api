/**
 * getCryptoPrice Lambda
 */

// API Config
const API_CONFIG = {
  COINGECKO_BASE_URL: 'https://api.coingecko.com/api/v3',
  TIMEOUT: 10000,
  MAX_RETRIES: 3,
  BACKOFF_BASE: 1000,
  USER_AGENT: 'Nimo-Crypto-Tracker/1.0'
};

// Supported Crypto
const SUPPORTED_CRYPTOS = [
  'bitcoin',
  'ethereum',
  'solana',
  'cardano',
  'dogecoin',
  'ripple',
  'polkadot',
  'litecoin',
  'chainlink',
  'stellar'
];

// Validation Rules
const VALIDATION_RULES = {
  CRYPTO_MAX_LENGTH: 50,
  CRYPTO_PATTERN: /^[a-z0-9-]+$/,
  EMAIL_MAX_LENGTH: 254,
  EMAIL_PATTERN: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
};

// HTTP Status Codes
const STATUS_CODES = {
  SUCCESS: 200,
  PARTIAL_SUCCESS: 207,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  RATE_LIMIT: 429,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Error Messages
const ERROR_MESSAGES = {
  MISSING_ENV_VARS: 'Lambda misconfigured - missing environment variables',
  INVALID_JSON: 'Invalid JSON in request body',
  MISSING_FIELDS: 'Missing required fields: cryptocurrency and email',
  CRYPTO_REQUIRED: 'Cryptocurrency is required and must be a string',
  INVALID_CRYPTO_FORMAT: 'Invalid cryptocurrency format',
  UNSUPPORTED_CRYPTO: `Unsupported cryptocurrency. Supported: ${SUPPORTED_CRYPTOS.join(', ')}`,
  EMAIL_REQUIRED: 'Email is required and must be a string',
  INVALID_EMAIL_FORMAT: 'Invalid email format',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
  API_UNAVAILABLE: 'CoinGecko API temporarily unavailable. Please try again.',
  CRYPTO_NOT_FOUND: 'Cryptocurrency not found.',
  EMPTY_API_RESPONSE: 'API returned empty response',
  INVALID_PRICE_DATA: 'Invalid price data from API',
  NETWORK_UNREACHABLE: 'Unable to reach CoinGecko API. Please check network.',
  CONNECTION_TIMEOUT: 'Connection to CoinGecko API timed out.',
  TABLE_NOT_FOUND: 'Database table not found. Please contact support.',
  EMAIL_REJECTED: 'Email rejected. Please verify the recipient address.',
  EMAIL_NOT_VERIFIED: 'Email address not verified in SES.',
  CONFIG_ERROR: 'Service configuration error. Please contact support.'
};

// CORS Headers
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-api-key',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

module.exports = {
  API_CONFIG,
  SUPPORTED_CRYPTOS,
  VALIDATION_RULES,
  STATUS_CODES,
  ERROR_MESSAGES,
  CORS_HEADERS
};