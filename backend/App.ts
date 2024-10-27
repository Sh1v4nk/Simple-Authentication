import express from "express";
import dotenv from "dotenv";

import connectDB from "./configs/Database";
import AuthRoute from "./src/routes/AuthRouter";

dotenv.config();
const app = express();
app.use(express.json());

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
