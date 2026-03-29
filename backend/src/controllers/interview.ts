import { Request, Response } from 'express'
import { existsSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, rmSync } from 'fs'
import { basename, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mergeAudio } from '../services/ffmpegService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REC_DIR = join(__dirname, '../user-recordings')

function clearRecordings(): void {
    for (const f of readdirSync(REC_DIR)) {
        if (f === '.gitkeep') continue
        try { unlinkSync(join(REC_DIR, f)) } catch {}
    }
}

// Wipe on startup and every 30 minutes in case anyone abandons mid-session
export function initRecordingsDir(): void {
    mkdirSync(REC_DIR, { recursive: true })
    clearRecordings()
    setInterval(clearRecordings, 30 * 60 * 1000)
}

export function submitAnswer(req: Request, res: Response): void {
    const { questionId, audioBase64, mimeType } = req.body

    if (!questionId || !audioBase64) {
        res.status(400).json({ status: 'error', message: 'questionId and audioBase64 are required' })
        return
    }

    const ext = mimeType?.includes('mp4') ? 'mp4'
        : mimeType?.includes('ogg') ? 'ogg'
        : 'webm'

    try {
        mkdirSync(REC_DIR, { recursive: true })
        writeFileSync(join(REC_DIR, `${questionId}.${ext}`), Buffer.from(audioBase64, 'base64'))
        res.json({ status: 'ok' })
    } catch (err) {
        console.error(err)
        res.status(500).json({ status: 'error', message: 'Failed to save recording' })
    }
}

export async function generateInterview(req: Request, res: Response): Promise<void> {
    const { segments } = req.body;

    if (!Array.isArray(segments) || !segments.length) {
        res.status(400).json({ status: 'error', message: 'segments must be a non-empty array' })
        return
    }

    const exts = ['webm', 'mp4', 'ogg']
    const files = segments.map((id: string) => {
        for (const ext of exts) {
            const p = join(REC_DIR, `${id}.${ext}`)
            if (existsSync(p)) return p
        }
        return join(__dirname, '../questions', `${id}.mp3`)
    })

    try {
        const outDir = join(__dirname, '../interviews')
        mkdirSync(outDir, { recursive: true })
        const output = join(outDir, `final-${Date.now()}.mp3`)
        await mergeAudio(files, output)
        clearRecordings()
        res.json({ status: 'ok', url: `/interviews/${basename(output)}` })
    } catch (err) {
        console.error(err)
        clearRecordings()
        res.status(500).json({ status: 'error', message: 'Failed to generate interview' })
    }
}