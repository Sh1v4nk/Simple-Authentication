# Simple Authentication Backend

A secure Express.js backend with TypeScript, JWT authentication, MongoDB, and email verification.

## Features

-   🔐 **JWT Authentication** - Secure token-based authentication with HTTP-only cookies
-   📧 **Email Verification** - Account activation via email
-   🔑 **Password Reset** - Secure password recovery flow
-   🚪 **Multi-device Logout** - Sign out from all devices
-   🛡️ **Security Middleware** - Rate limiting, CORS, helmet protection
-   📊 **MongoDB Integration** - User data and session management
-   📧 **Email Service** - Nodemailer integration for notifications

## Tech Stack

-   **Runtime**: Bun.js
-   **Framework**: Express.js with TypeScript
-   **Database**: MongoDB with Mongoose
-   **Authentication**: JWT tokens with bcrypt hashing
-   **Validation**: Zod schema validation
-   **Email**: Nodemailer with email templates
-   **Security**: Helmet, CORS, rate limiting

## Quick Start

```bash
# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Then run the server
bun run dev
```

Server runs on `http://localhost:3000`

## Environment Variables

Create a `.env` file with:

-   [Backend .env.example](https://github.com/Sh1v4nk/Simple-Authentication/blob/main/backend/.env.example)

## API Endpoints

### Authentication

-   `POST /api/auth/signup` - User registration
-   `POST /api/auth/signin` - User login
-   `POST /api/auth/signout` - User logout
-   `POST /api/auth/verify-email` - Email verification
-   `POST /api/auth/forgot-password` - Password reset request
-   `POST /api/auth/reset-password` - Password reset
-   `GET /api/auth/verify` - Check authentication status
-   `POST /api/auth/refresh` - Refresh access token
-   `POST /api/auth/revoke-all` - Logout from all devices
-   `POST /api/auth/resend-otp` - Resend verification email

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route handlers
│   ├── middlewares/     # Express middlewares
│   ├── models/         # MongoDB schemas
│   ├── routes/         # API routes
│   ├── types/          # TypeScript types
│   ├── utils/          # Helper functions
│   ├── validations/    # Zod schemas
│   └── configs/        # Configuration files
├── .env.example        # Environment template
├── package.json        # Dependencies
└── tsconfig.json       # TypeScript config
```

## Available Scripts

```bash
bun run dev      # Development server with hot reload
bun run build    # Build for production
bun run start    # Production server
bun run clean    # Clean build files
```

## Security Features

-   **Password Hashing**: bcrypt with configurable salt rounds
-   **JWT Tokens**: Access and refresh tokens with expiration
-   **Rate Limiting**: Prevents brute force attacks
-   **CORS Protection**: Configured for frontend origin
-   **Helmet**: Security headers
-   **Input Validation**: Zod schemas for all inputs

## Development

```bash
# Development server
bun run dev

# Build for production
bun run build

# Run production build
bun run start
```

## API Response Format

All responses follow this structure:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "user": { ... } // Only for auth endpoints
}
```

Error responses:

```json
{
    "success": false,
    "message": "Error description",
    "errors": ["Detailed error messages"]
}
```
