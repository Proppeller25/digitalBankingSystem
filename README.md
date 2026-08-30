# Digital Banking System API

Digital Banking System is a TypeScript + Express + MongoDB backend for a simple digital banking workflow. It supports:

- Account creation
- User login and logout
- JWT-based authentication
- Balance enquiry
- Account-to-account transfers
- Transaction status lookup
- BVN registration and verification through an external NIBSS service

The application stores users, BVN records, and transaction records in MongoDB and delegates banking operations to the configured NIBSS API.

## Tech Stack

- Node.js
- TypeScript
- Express 5
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password and PIN hashing
- axios for external API calls
- cookie-parser for token cookies
- helmet, cors, and express-rate-limit for API hardening

## Project Structure

```text
src/
  config/
    databaseConfig.ts
  controllers/
    UserController.ts
  middleware/
    auth.ts
    role.ts
  models/
    Bvn.ts
    Transactions.ts
    Users.ts
  routes/
    userRoutes.ts
  services/
    nibbsService.ts
  types/
    express.d.ts
  server.ts
```

## Features

### Account Creation

Creates a new user account after:

- generating a BVN
- inserting the BVN into NIBSS
- validating the BVN
- creating a NIBSS bank account
- storing the user in MongoDB
- storing the BVN audit record in MongoDB

### Authentication

Users log in with email and password. On success, the API signs a JWT and returns it in:

- the `Authorization` cookie
- the `Authorization` response header as `Bearer <token>`
- the `x-auth-token` response header

Protected routes read the token from the `Authorization` cookie.

### Transfers

Authenticated users can transfer money to another account number after:

- checking the destination account exists
- checking available balance
- verifying the transaction PIN
- submitting the transfer to NIBSS
- storing the transaction in MongoDB

### Transaction Tracking

Users can query transaction status by reference ID. The status is fetched from NIBSS and saved locally if it is not already in the database.

### Admin Account Listing

The `GET /api/account` endpoint returns all accounts from NIBSS, but it is restricted to users with `hasAdminAccess = true`.

## API Base

- Local development: `http://localhost:3000`
- Root health message: `GET /`
- API prefix: `/api`

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/digitalBankingSystem
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1h
NIBSS_BASE_URL=https://your-nibss-base-url
NIBSS_API_KEY=your_nibss_api_key
NIBSS_API_SECRET=your_nibss_api_secret
```

### Variable Notes

- `PORT`: Server port. Defaults to `3000` if omitted.
- `MONGO_URI`: MongoDB connection string.
- `JWT_SECRET`: Secret used to sign and verify access tokens.
- `JWT_EXPIRES_IN`: JWT lifetime. Defaults to `1h` if omitted.
- `NIBSS_BASE_URL`: Base URL for the NIBSS service.
- `NIBSS_API_KEY`: NIBSS API key.
- `NIBSS_API_SECRET`: NIBSS API secret.

## Installation

```bash
npm install
```

## Development

Run the server in watch mode:

```bash
npm run dev
```

This starts `src/server.ts` through `tsx`.

## Build

Compile the TypeScript project:

```bash
npm run build
```

The TypeScript compiler outputs compiled files into `dist/`.

## Production Run

After building, run the compiled server entry file directly:

```bash
node dist/server.js
```

Note: the current `package.json` `start` script points to `dist/index.js`, while the actual compiled entry produced from `src/server.ts` is `dist/server.js`.

## Authentication Flow

1. User logs in with `POST /api/login`.
2. Server verifies the password.
3. Server signs a JWT.
4. The token is stored in a cookie and returned in headers.
5. Protected routes use the cookie to authenticate the request.

## Data Models

### User

Stores identity, credentials, account metadata, and security flags.

Important fields:

- `firstName`
- `lastName`
- `dateOfBirth`
- `email`
- `phone`
- `password`
- `bvn`
- `accountNumber`
- `transactionPin`
- `failedLoginAttempts`
- `isLocked`
- `hasAdminAccess`

Passwords are hashed before save. Transaction PINs are also stored hashed.

### BVN

Stores the BVN verification audit trail.

Important fields:

- `user`
- `bvn`
- `firstName`
- `lastName`
- `dob`
- `phone`
- `status`
- `provider`
- `rawResponse`

### Transaction

Stores transfer history and transaction status updates.

Important fields:

- `user`
- `amount`
- `from`
- `to`
- `currency`
- `type`
- `status`
- `referenceId`

## API Reference

### `GET /`

Returns a simple welcome message.

Response:

```json
{
  "message": "Welcome to the Digital Banking System API"
}
```

### `POST /api/account`

Creates a new user account.

Request body:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1998-04-12",
  "email": "john@example.com",
  "phone": "08012345678",
  "password": "strongpassword",
  "transactionPin": "1234"
}
```

Possible response outcomes:

- `201`: account created successfully
- `400`: missing or invalid parameters
- `404`: BVN validation failed
- `502`: NIBSS account creation failed

### `POST /api/login`

Authenticates a user and issues a JWT.

Request body:

```json
{
  "email": "john@example.com",
  "password": "strongpassword"
}
```

Successful response:

```json
{
  "message": "Login successful"
}
```

### `POST /api/logout`

Clears the auth cookie and token headers.

Authentication: required

### `GET /api/account`

Lists all accounts from NIBSS.

Authentication: required

Authorization rule:

- only users with `hasAdminAccess = true`

### `GET /api/account/balance`

Returns the authenticated user's account balance from NIBSS.

Authentication: required

Successful response:

```json
{
  "message": "Account query successful",
  "accountBalance": {
    "balance": 10000
  }
}
```

### `POST /api/account/transfer`

Transfers funds from the authenticated user to another account.

Authentication: required

Request body:

```json
{
  "to": "0123456789",
  "amount": 2500,
  "currency": "naira",
  "transactionPin": "1234"
}
```

Validation rules:

- `to` must be a string
- `amount` must be a finite number
- `transactionPin` must be a string

### `GET /api/transaction/:transactionId`

Fetches transfer status from NIBSS and stores it locally when needed.

Authentication: required

Example:

```bash
GET /api/transaction/abc123reference
```

## Security Notes

- Passwords are hashed with bcrypt before being stored.
- Transaction PINs are hashed before saving.
- JWT tokens are verified on protected routes.
- Sensitive account routes require authentication.
- The app uses common hardening middleware such as `helmet` and `express-rate-limit` in the dependency set.

## External Dependency

This app depends on a NIBSS-compatible API for:

- token generation
- BVN insertion
- BVN validation
- account creation
- name enquiry
- balance lookup
- money transfer
- transaction status lookup

The integration lives in `src/services/nibbsService.ts`.

## Development Notes

- The app listens on the port from `PORT` or falls back to `3000`.
- MongoDB connection is initialized when the server starts.
- The auth middleware expects the JWT to be present in the `Authorization` cookie.
- The `role.ts` middleware exists for role-based protection, although it is not currently wired into the routes.

## Troubleshooting

### MongoDB connection fails

Check that `MONGO_URI` is set and reachable.

### JWT authentication fails

Make sure `JWT_SECRET` is present and the client sends the cookie back on requests.

### NIBSS calls fail

Verify:

- `NIBSS_BASE_URL` is correct
- `NIBSS_API_KEY` is valid
- `NIBSS_API_SECRET` is valid
- the remote service is reachable

### Build succeeds but production start fails

Use `node dist/server.js` after running `npm run build`. The compiled entry is emitted from `src/server.ts`.

## License

ISC
