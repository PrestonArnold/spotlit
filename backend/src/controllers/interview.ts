import { Request, Response } from 'express'
import { existsSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, rmSync } from 'fs'
import { basename, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mergeAudio } from '../services/ffmpegService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Walk up from dist/controllers or src/controllers to find the actual project root
// so paths work correctly in both `pnpm dev` (tsx, runs src/) and `pnpm start` (node, runs dist/)
function findProjectRoot(start: string): string {
    let dir = start
    while (true) {
        const parent = join(dir, '..')
        if (parent === dir) return start // filesystem root, give up
        if (existsSync(join(parent, 'package.json'))) return parent
        dir = parent
    }
}

const PROJECT_ROOT = findProjectRoot(__dirname)
const REC_DIR = join(PROJECT_ROOT, 'src', 'user-recordings')
const QUESTIONS_DIR = process.env.QUESTIONS_DIR ?? join(PROJECT_ROOT, 'dist', 'questions')

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
    const files = segments.flatMap((id: string) => {
        for (const ext of exts) {
            const p = join(REC_DIR, `${id}.${ext}`)
            if (existsSync(p)) return [p]
        }
        const q = join(QUESTIONS_DIR, `${id}.mp3`)
        if (existsSync(q)) return [q]
        // answer recording not found — skip it silently
        return []
    })

    try {
        const outDir = join(PROJECT_ROOT, 'src', 'interviews')
        mkdirSync(outDir, { recursive: true })
        const existing = existsSync(outDir) ? readdirSync(outDir).filter(f => /^\d+\.mp3$/.test(f)) : []
        const nextId = existing.length > 0 ? Math.max(...existing.map(f => parseInt(f))) + 1 : 1
        const output = join(outDir, `${nextId}.mp3`)
        await mergeAudio(files, output)
        clearRecordings()
        res.json({ status: 'ok', url: `/interview/${basename(output)}` })
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[generate]', message)
        clearRecordings()
        res.status(500).json({ status: 'error', message: 'Failed to generate interview', detail: message })
    }
}
