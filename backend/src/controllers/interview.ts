import { Request, Response } from "express";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";

export const submitAnswer = (req: Request, res: Response) => {
    const { questionId, audioBase64 } = req.body;

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const filePath = join(__dirname, "../user-recordings", `${questionId}.mp3`);
    
    writeFileSync(filePath, audioBuffer);

    res.json({ status: "ok", file: filePath });
}

export const generateInterview = async (req: Request, res: Response) => {
    const { segments } = req.body; // ["q1", "a1", "q2", "a2", ...]

    const files = segments.map((id: string) =>
        existsSync(join(__dirname, "../user-recordings", `${id}.mp3`))
            ? join(__dirname, "../user-recordings", `${id}.mp3`)
            : join(__dirname, "../questions", `${id}.mp3`)
    )

    console.log(files)

    const outputPath = join(__dirname, "../interviews", `final-${Date.now()}.mp3`);
    
    // merge & effects with ffmpeg
    res.json({ status: "ok", url: outputPath });
}
