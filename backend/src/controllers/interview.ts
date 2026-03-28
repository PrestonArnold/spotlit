import { Request, Response } from "express";
import { writeFileSync } from "fs";
import { join } from "path";

export const submitAnswer = (req: Request, res: Response) => {
    const { questionId, audioBase64 } = req.body;

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const filePath = join(__dirname, "../user-recordings", `${questionId}.mp3`);
    
    writeFileSync(filePath, audioBuffer);

    res.json({ status: "ok", file: filePath });
}

export const generateInterview = async (req: Request, res: Response) => {
    // TODO
}