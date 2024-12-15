# Simple-Authentication

A simple authentication system built with the MERN (MongoDB, Express.js, React, Node.js) stack. This project implements essential authentication features like user registration, signin, signout, and JWT-based authentication with cookies for session management.

## Table of Contents

- [Introduction](#simple-authentication)
- [Features](#features)
- [Tech Stack](#tech-stack)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
    - [Clone the repository](#1-clone-the-repository)
    - [Install dependencies](#2-install-dependencies)
      - [Backend](#backend-1)
      - [Frontend](#frontend-1)
    - [Set up environment variables](#3-set-up-environment-variables)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

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

---

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
---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/FeatureName`)
3. Commit your Changes (`git commit -m 'Add some FeatureName'`)
4. Push to the Branch (`git push origin feature/FeatureName`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/Sh1v4nk/Simple-Authentication/blob/main/LICENSE) file for details.


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
