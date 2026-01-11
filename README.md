NIMO CRYPTO TRACKER - A serverless cryptocurrency price tracking system built on AWS, featuring real-time price retrieval, email notifications, and search history management.

I have 2 microservices:
  1. getCryptoPrice - Fetches cryptocurrency prices and sends email notifications
  2. getSearchHistory - Retrieves historical search data using DynamoDB GSI

Backend-
  1. AWS Lambda - Serverless compute for microservices (Node.js)
  2. API Gateway - RESTful API with API key authentication and rate limiting
  3. DynamoDB - NoSQL database with GSI for efficient querying
  4. SES (Simple Email Service) - Email delivery system
  5. SAM - Infrastructure as Code
  6. CoinGecko API - External cryptocurrency price data

FrontEnd-
  1. React 18 + Vite
  2. Tailwind CSS

Architecture Diagram-
<img width="1276" height="1154" alt="image" src="https://github.com/user-attachments/assets/856bdedc-a2ad-4f60-aca9-7fde3fbc683c" />

Installation and Deployment
1. Clone Repository
   a. git clone (repo url)
2. Navigate to the directory and install dependances
  a. cd src\lambdas\getCryptoPrice
  b. npm install
  c. cd ..\getSearchHistory
  d. npm install
3. Update template.yaml with your verified SES email: if you want to recieve mail in your inbox (check junk folder)
4. Build and Deploy
   a. sam build
   b. sam deploy --guided (guided for first time-this deploys to aws)
   c.During deploy confirm/configure stack name, region and parameters. Allow SAM CLI to create IAM roles
5. Retrive API KEY
  a. aws apigateway get-api-key --api-key --include-value --region (your aws region)
  b. Note API KEY

Testing
1. Test getCryptoPrice - 
  a. Invoke-RestMethod -Uri "https://.execute-api.ap-southeast-2.amazonaws.com/prod/crypto/price" -Method POST -Headers @{"Content-Type"="application/json"; "X-API-Key"=""} -Body '{"cryptocurrency":"bitcoin","email":"test@example.com"}'
<img width="2218" height="262" alt="image" src="https://github.com/user-attachments/assets/70738fab-bd56-4638-bec1-fbb679ec13a0" />

2. Test getSearchHistory - 
  a. Invoke-RestMethod -Uri "https://.execute-api.ap-southeast-2.amazonaws.com/prod/crypto/history" -Method GET -Headers @{"X-API-Key"=""}
<img width="2270" height="764" alt="image" src="https://github.com/user-attachments/assets/2015c0ed-4c6e-4332-9f30-af276a225e91" />

Authentication-
All requests require an API key header:
X-API-Key: <your-api-key>
Rate Limits- Rate: 10 requests/second

Performance Optimizations
1. 60-Second Caching - Reduces external API calls by ~95%, stores prices in DynamoDB cache
2. GSI Queries - No table scans; uses Global Secondary Indexes for O(log n) performance
3. Retry Logic - Exponential backoff (3 attempts) for transient failures

Security
1. API Key Authentication - Required for all endpoints
2. IAM Least Privilege - Lambdas have minimal permissions
3. CORS Configuration - Configurable allowed origins
4. Input Validation - RFC 5322 email validation, crypto whitelist
5. Rate Limiting - Enforced at API Gateway level

DynamoDB
<img width="1868" height="818" alt="image" src="https://github.com/user-attachments/assets/3cf5706b-2df4-4849-98e2-fff27538ad32" />

Application
<img width="2396" height="1666" alt="image" src="https://github.com/user-attachments/assets/15b5796a-5463-40fe-94e2-325465ee7d95" />

Email
<img width="1556" height="1200" alt="image" src="https://github.com/user-attachments/assets/0890e809-e8d9-4a25-a038-4efd9b6c1926" />


