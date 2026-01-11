/**
 * Generates HTML email body
 * @param {Object} priceData - Price data object
 * @returns {string} HTML email content
 */
const generateHtmlEmail = (priceData) => {
  const { cryptocurrency, price, change24h, marketCap } = priceData;
  
  const safePrice = typeof price === 'number' && !isNaN(price) ? price : 0;
  const safeChange = typeof change24h === 'number' && !isNaN(change24h) ? change24h : 0;
  const safeCap = typeof marketCap === 'number' && !isNaN(marketCap) ? marketCap : 0;
  
  const changeColor = safeChange >= 0 ? '#10b981' : '#ef4444';
  const changeText = safeChange >= 0 ? 'increased' : 'decreased';
  const priceFormatted = safePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const marketCapFormatted = safeCap.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const cryptoName = cryptocurrency.charAt(0).toUpperCase() + cryptocurrency.slice(1);
  const timestamp = new Date().toLocaleString('en-US', { 
    dateStyle: 'medium', 
    timeStyle: 'short',
    timeZone: 'UTC'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cryptocurrency Price Update</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
        
        <!-- Header -->
        <div style="background-color: #2563eb; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #ffffff; letter-spacing: 0.3px;">
            Nimo Crypto Tracker
          </h1>
        </div>
        
        <!-- Body -->
        <div style="padding: 32px;">
          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            Your requested cryptocurrency price update is ready.
          </p>
          
          <!-- Price Card -->
          <div style="background-color: #f9fafb; padding: 24px; border-radius: 6px; border-left: 4px solid #2563eb; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                  Cryptocurrency
                </td>
                <td style="padding: 8px 0; color: #111827; font-size: 16px; font-weight: 600; text-align: right;">
                  ${cryptoName}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                  Current Price
                </td>
                <td style="padding: 8px 0; color: #111827; font-size: 24px; font-weight: 700; text-align: right;">
                  $${priceFormatted}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                  24h Change
                </td>
                <td style="padding: 8px 0; color: ${changeColor}; font-size: 16px; font-weight: 600; text-align: right;">
                  ${safeChange >= 0 ? '+' : ''}${safeChange.toFixed(2)}%
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                  Market Cap
                </td>
                <td style="padding: 8px 0; color: #111827; font-size: 15px; font-weight: 500; text-align: right;">
                  $${marketCapFormatted}
                </td>
              </tr>
            </table>
          </div>
          
          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;">
            ${cryptoName} has ${changeText} by <strong style="color: ${changeColor};">${Math.abs(safeChange).toFixed(2)}%</strong> in the last 24 hours.
          </p>
          
          <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 16px 0 0 0;">
            Updated: ${timestamp} UTC
          </p>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
            This is an automated notification from Nimo Crypto Tracker. Price data provided by CoinGecko API.
          </p>
          <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
            &copy; ${new Date().getFullYear()} Nimo Industries Pty Ltd | ABN 13 637 513 154
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;
};

/**
 * Generates plain text email body
 * @param {Object} priceData - Price data object
 * @returns {string} Plain text email content
 */
const generateTextEmail = (priceData) => {
  const { cryptocurrency, price, change24h, marketCap } = priceData;
  
  const safePrice = typeof price === 'number' && !isNaN(price) ? price : 0;
  const safeChange = typeof change24h === 'number' && !isNaN(change24h) ? change24h : 0;
  const safeCap = typeof marketCap === 'number' && !isNaN(marketCap) ? marketCap : 0;
  
  const priceFormatted = safePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const changeSign = safeChange >= 0 ? '+' : '';
  const changeText = safeChange >= 0 ? 'increased' : 'decreased';
  const marketCapFormatted = safeCap.toLocaleString('en-US');
  const cryptoName = cryptocurrency.charAt(0).toUpperCase() + cryptocurrency.slice(1);
  const timestamp = new Date().toLocaleString('en-US', { 
    dateStyle: 'medium', 
    timeStyle: 'short',
    timeZone: 'UTC'
  });
  
  return `
NIMO CRYPTO TRACKER
Price Update Notification

Your requested cryptocurrency price update is ready.

__________________________________________

Cryptocurrency:  ${cryptoName}
Current Price:   $${priceFormatted}
24h Change:      ${changeSign}${safeChange.toFixed(2)}%
Market Cap:      $${marketCapFormatted}

__________________________________________

${cryptoName} has ${changeText} by ${Math.abs(safeChange).toFixed(2)}% in the last 24 hours.

Updated: ${timestamp} UTC

This is an automated notification from Nimo Crypto Tracker.
Price data provided by CoinGecko API.

© ${new Date().getFullYear()} Nimo Industries Pty Ltd | ABN 13 637 513 154
  `.trim();
};

/**
 * Generates email subject line
 * @param {Object} priceData - Price data object
 * @returns {string} Email subject
 */
const generateEmailSubject = (priceData) => {
  const { cryptocurrency, price, change24h } = priceData;
  
  const safePrice = typeof price === 'number' && !isNaN(price) ? price : 0;
  const safeChange = typeof change24h === 'number' && !isNaN(change24h) ? change24h : 0;
  const changeIndicator = safeChange >= 0 ? 'Up' : 'Down';
  const priceFormatted = safePrice.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const cryptoName = cryptocurrency.charAt(0).toUpperCase() + cryptocurrency.slice(1);
  
  return `${cryptoName} Price Update: $${priceFormatted} (${changeIndicator} ${Math.abs(safeChange).toFixed(2)}%)`;
};

module.exports = {
  generateHtmlEmail,
  generateTextEmail,
  generateEmailSubject
};