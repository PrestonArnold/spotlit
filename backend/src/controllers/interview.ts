import { Request, Response } from 'express'
import { existsSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, rmSync } from 'fs'
import { basename, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mergeAudio } from '../services/ffmpegService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function cleanupAllSessions(): void {
    const recDir = join(__dirname, '../user-recordings')
    mkdirSync(recDir, { recursive: true })
    for (const entry of readdirSync(recDir)) {
        if (entry === '.gitkeep') continue
        try {
            rmSync(join(recDir, entry), { recursive: true, force: true })
        } catch (err) {
            console.error(`Failed to remove leftover session ${entry}:`, err)
        }
    }
}

function sessionDir(sessionId: string): string {
    return join(__dirname, '../user-recordings', sessionId)
}

function cleanupSession(sessionId: string): void {
    try {
        rmSync(sessionDir(sessionId), { recursive: true, force: true })
    } catch (err) {
        console.error(`Failed to clean up session ${sessionId}:`, err)
    }
}

export function submitAnswer(req: Request, res: Response): void {
    const { sessionId, questionId, audioBase64, mimeType } = req.body

    if (!sessionId || !questionId || !audioBase64) {
        res.status(400).json({ status: 'error', message: 'sessionId, questionId, and audioBase64 are required' })
        return
    }

    const ext = mimeType?.includes('mp4') ? 'mp4'
        : mimeType?.includes('ogg') ? 'ogg'
        : 'webm'

    try {
        const dir = sessionDir(sessionId)
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, `${questionId}.${ext}`), Buffer.from(audioBase64, 'base64'))
        res.json({ status: 'ok' })
    } catch (err) {
        console.error(err)
        res.status(500).json({ status: 'error', message: 'Failed to save recording' })
    }
}

export async function generateInterview(req: Request, res: Response): Promise<void> {
    const { sessionId, segments } = req.body

    if (!sessionId || !Array.isArray(segments) || !segments.length) {
        res.status(400).json({ status: 'error', message: 'sessionId and non-empty segments are required' })
        return
    }

    const exts = ['webm', 'mp4', 'ogg']
    const files = segments.map((id: string) => {
        for (const ext of exts) {
            const p = join(sessionDir(sessionId), `${id}.${ext}`)
            if (existsSync(p)) return p
        }
        return join(__dirname, '../questions', `${id}.mp3`)
    })

    try {
        const outDir = join(__dirname, '../interviews')
        mkdirSync(outDir, { recursive: true })

        const output = join(outDir, `final-${Date.now()}.mp3`)
        await mergeAudio(files, output)

        cleanupSession(sessionId)

        res.json({ status: 'ok', url: `/interviews/${basename(output)}` })
    } catch (err) {
        console.error(err)
        cleanupSession(sessionId)
        res.status(500).json({ status: 'error', message: 'Failed to generate interview' })
    }
}

// called by frontend on page unload via beacon
export function cleanupSession_route(req: Request, res: Response): void {
    const { sessionId } = req.body
    if (!sessionId) {
        res.status(400).json({ status: 'error', message: 'sessionId is required' })
        return
    }
    cleanupSession(sessionId)
    res.json({ status: 'ok' })
}