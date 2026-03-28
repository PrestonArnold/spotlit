import { Request, Response } from "express";
import { existsSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { basename, join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { mergeAudio } from "../services/ffmpegService.js";

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const submitAnswer = (req: Request, res: Response): void => {
    const { questionId, audioBase64, mimeType } = req.body;

    if (!questionId || !audioBase64) {
        res.status(400).json({ status: "error", message: "questionId and audioBase64 are required" });
        return;
    }

    const ext = mimeType?.includes('mp4') ? 'mp4'
            : mimeType?.includes('ogg') ? 'ogg'
            : 'webm';

    try {
        const recordingsDir = join(__dirname, "../user-recordings");
        mkdirSync(recordingsDir, { recursive: true });
        writeFileSync(join(recordingsDir, `${questionId}.${ext}`), Buffer.from(audioBase64, "base64"));
        res.json({ status: "ok" });
    } catch (err) {
        console.error("submitAnswer error:", err);
        res.status(500).json({ status: "error", message: "Failed to save recording" });
    }
}

export const generateInterview = async (req: Request, res: Response): Promise<void> => {
    const { segments } = req.body;

    if (!Array.isArray(segments) || segments.length === 0) {
        res.status(400).json({ status: "error", message: "segments must be a non-empty array" });
        return;
    }

    const RECORDING_EXTS = ['webm', 'mp4', 'ogg'];

    const files = segments.map((id: string) => {
        for (const ext of RECORDING_EXTS) {
            const p = join(__dirname, "../user-recordings", `${id}.${ext}`);
            if (existsSync(p)) return p;
        }
        return join(__dirname, "../questions", `${id}.mp3`);
    });

    try {
        const interviewsDir = join(__dirname, "../interviews");
        mkdirSync(interviewsDir, { recursive: true });

        const outputPath = join(interviewsDir, `final-${Date.now()}.mp3`);

        console.log(files);
        await mergeAudio(files, outputPath);

        // Clean up user recordings after successful merge
        const recordingsDir = join(__dirname, "../user-recordings");
        for (const file of readdirSync(recordingsDir)) {
            unlinkSync(join(recordingsDir, file));
        }
        console.log("Cleaned up user-recordings");

        res.json({ status: "ok", url: `/interviews/${basename(outputPath)}` });
    } catch (err) {
        console.error("generateInterview error:", err);
        res.status(500).json({ status: "error", message: "Failed to generate interview" });
    }
}
