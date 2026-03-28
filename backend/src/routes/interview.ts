import { Router } from "express";
import { submitAnswer, generateInterview } from "../controllers/interview.js";

const router: Router = Router();

router.post("/submit", submitAnswer);
router.post("/generate", generateInterview);

export default router;