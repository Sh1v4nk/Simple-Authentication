import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import connectDB from "@/configs/Database";
import AuthRoute from "@/routes/AuthRouter";

const app = express();

const corsOptions = {
  origin:
    process.env.NODE_ENV === "development"
      ? "http://localhost:5173"
      : process.env.CLIENT_URL,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

async function startServer(): Promise<void> {
  try {
    await connectDB();

    const PORT: number = parseInt(process.env.PORT || "3000", 10);

    // API routes
    app.use("/api/auth", AuthRoute);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
}

startServer();
