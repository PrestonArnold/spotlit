import { Router } from "express";
import { submitAnswer, generateInterview, cleanupSession_route } from "../controllers/interview.js";

const router: Router = Router();

router.post("/submit", submitAnswer);
router.post("/generate", generateInterview);
router.post("/cleanup", cleanupSession_route);

export default router;