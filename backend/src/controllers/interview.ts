import { Request, Response } from "express";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { basename, join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { mergeAudio } from "../services/ffmpegService.js";

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const submitAnswer = (req: Request, res: Response) => {
    const { questionId, audioBase64, mimeType } = req.body;
    // mimeType e.g. "audio/webm;codecs=opus" or "audio/mp4"
    // derive file extension from mimeType, fallback to webm
    const ext = mimeType?.includes('mp4') ? 'mp4'
              : mimeType?.includes('ogg') ? 'ogg'
              : 'webm';

    const recordingsDir = join(__dirname, "../user-recordings");
    mkdirSync(recordingsDir, { recursive: true });

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const filePath = join(recordingsDir, `${questionId}.${ext}`);
    
    writeFileSync(filePath, audioBuffer);

    res.json({ status: "ok", file: filePath });
}

export const generateInterview = async (req: Request, res: Response) => {
    const { segments } = req.body; // ["q1", "a1", "q2", "a2", ...]

    const RECORDING_EXTS = ['webm', 'mp4', 'ogg'];

    const files = segments.map((id: string) => {
        // Check user-recordings first, trying all possible extensions
        for (const ext of RECORDING_EXTS) {
            const p = join(__dirname, "../user-recordings", `${id}.${ext}`);
            if (existsSync(p)) return p;
        }
        // Fall back to pre-recorded question mp3
        return join(__dirname, "../questions", `${id}.mp3`);
    });

    console.log(files);

    const interviewsDir = join(__dirname, "../interviews");
    mkdirSync(interviewsDir, { recursive: true });

    const outputPath = join(interviewsDir, `final-${Date.now()}.mp3`);

    await mergeAudio(files, outputPath);
    
    res.json({ status: "ok", url: `/interviews/${basename(outputPath)}` });
}
