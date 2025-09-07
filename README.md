<div align="center">

# Simple Authentication

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

A secure authentication system with React frontend and Express.js backend, featuring JWT tokens, email verification, and password reset.

</div>

## Features

-   🔐 **Secure Authentication** - JWT tokens with HTTP-only cookies
-   📧 **Email Verification** - Account activation via email
-   🔑 **Password Reset** - Secure password recovery
-   🚪 **Multi-device Logout** - Sign out from all devices
-   🐳 **Docker Support** - Complete containerized development
-   ⚡ **Modern Stack** - React, TypeScript, Express.js, MongoDB

## Tech Stack

**Backend:** Express.js, TypeScript, MongoDB, JWT, bcrypt, Nodemailer  
**Frontend:** React, TypeScript, Tailwind CSS, Zustand, Vite  
**Tools:** Docker, Bun, Zod validation

## Prerequisites

-   Node.js or Bun
-   Docker

## Quick Start

1. Clone the repository & navigate to the project directory

```bash
  git clone https://github.com/Sh1v4nk/Simple-Authentication.git
  cd Simple-Authentication
```

2. Start the application:

### Docker (Recommended)

```bash
docker compose up
```

Access the app at [http://localhost:5173](http://localhost:5173)

### Manual Setup

```bash
# Backend
cd backend && bun install && bun run dev

# Frontend (new terminal)
cd frontend && bun install && bun run dev
```

## Project Structure

```
Simple-Authentication/
├── backend/
├── frontend/
└── docker-compose.yml
```

## Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories. See `.env.example` files for required variables.

-   [Backend .env.example](https://github.com/Sh1v4nk/Simple-Authentication/blob/main/backend/.env.example)

-   [Frontend .env.example](https://github.com/Sh1v4nk/Simple-Authentication/blob/main/frontend/.env.example)

#### Environment Variables for Docker

The docker-compose.yml includes default environment variables for development.

---

### Sign Up Page

![Sign Up Page](https://i.ibb.co/2PHhRYg/signup.png)

### Sign In Page

![Sign In Page](https://i.ibb.co/H2n5hQC/signin.png)

### Forgot Password Page

![Forgot Password Page](https://i.ibb.co/7jRDt2w/forgot-password.png)

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Thank you for visiting my Simple-Authentication repository. If you have any suggestions or feedback, feel free to reach out to me.

Connect with me:

<div align="center">
  <a href="mailto:shivankpandey113@gmail.com" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Gmail&logo=gmail&label=&color=D14836&logoColor=white&labelColor=&style=for-the-badge" height="30" alt="gmail logo"  />
  </a>
  <a href="https://twitter.com/sh1v4nk" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Twitter&logo=twitter&label=&color=1DA1F2&logoColor=white&labelColor=&style=for-the-badge" height="30" alt="twitter logo"  />
  </a>
    <a href="https://www.linkedin.com/in/sh1v4nk/" target="_blank">
    <img src="https://img.shields.io/static/v1?message=LinkedIn&logo=linkedin&label=&color=0077B5&logoColor=white&labelColor=&style=for-the-badge" height="30" alt="linkedin logo"  />
  </a>
  <a href="https://discord.com/users/571299781096505344" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Discord&logo=discord&label=&color=7289DA&logoColor=white&labelColor=&style=for-the-badge" height="30" alt="discord logo"  />
  </a>
</div>
