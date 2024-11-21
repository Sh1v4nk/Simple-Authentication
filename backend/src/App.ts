import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import connectDB from "@/configs/Database";
import AuthRoute from "@/routes/AuthRouter";

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
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
