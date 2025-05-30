// routes/health.routes.ts
import { Router } from "express";
import { checkHealth,  } from "../controllers/health.controller";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";

const router = Router();


router.get("/", asyncHandler(checkHealth));

export default router;
