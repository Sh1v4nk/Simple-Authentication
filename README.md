# Simple-Authentication

A simple authentication system built with the MERN (MongoDB, Express.js, React, Node.js) stack. This project implements essential authentication features like user registration, signin, signout, and JWT-based authentication with cookies for session management.

## Features

- **User Registration**: Signup with email and username validations to avoid duplicates.
- **User SignIn**: Secure signin with JWT-based authentication.
- **Secure Cookies**: JWT tokens are stored in HTTP-only cookies for added security.
- **SignOut**: Clear user sessions by removing cookies.
- **Password Hashing**: Uses bcrypt for secure password storage.
- **Validation**: Zod is used for validating user input.
- **Frontend & Backend Separation**: Monorepo structure with separate frontend and backend directories.

---

## Tech Stack

### Backend:
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Tools & Libraries**:
  - `bcrypt` for password hashing.
  - `zod` for input validation.
  - Nodemailer for email functionality (e.g., account activation/reset password).

### Frontend:
- React.js
- Tailwind CSS
- Zustand
---

## Getting Started

Follow these steps to get the project up and running on your local machine:

### Prerequisites

- Node.js
- MongoDB
- Bun.js

---

### Installation

#### 1. Clone the repository:

```bash
git clone https://github.com/Sh1v4nk/Simple-Authentication

cd Simple-Authentication
```
#### 2. Install dependencies:
Navigate to the respective directories and install the required dependencies:

##### Backend:

```bash
cd backend

bun install
```

##### Frontend:
```bash
cd ../frontend

bun install
```

#### 3. Set up environment variables:

Refer to the `.env.example` file in the `/backend` directory for the required environment variables. Copy the file and rename it to `.env` in the `/backend` folder, then populate the values as needed.

Bun will automatically load these environment variables during runtime.

### Project Structure

The project is structured as a monorepo with the following directories:

```plaintext
Simple-Authentication/
├── backend/
│   ├── src/
│   │   ├── configs/
│   │   ├── constants/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── types/
│   │   ├── utils/
│   │   └── validations/
│   │   └── App.ts
│   ├── .env.example
│   ├── alias.js
│   
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   │   └── App.tsx
│   │   └── main.tsx
```
