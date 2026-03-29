import { Request, Response } from 'express'
import { existsSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { basename, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mergeAudio } from '../services/ffmpegService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
        const dir = join(__dirname, '../user-recordings')
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, `${questionId}.${ext}`), Buffer.from(audioBase64, 'base64'))
        res.json({ status: 'ok' })
    } catch (err) {
        console.error(err)
        res.status(500).json({ status: 'error', message: 'Failed to save recording' })
    }
}

export async function generateInterview(req: Request, res: Response): Promise<void> {
    const { segments } = req.body

    if (!Array.isArray(segments) || !segments.length) {
        res.status(400).json({ status: 'error', message: 'segments must be a non-empty array' })
        return
    }

    const exts = ['webm', 'mp4', 'ogg']
    const files = segments.map((id: string) => {
        for (const ext of exts) {
            const p = join(__dirname, '../user-recordings', `${id}.${ext}`)
            if (existsSync(p)) return p
        }
        return join(__dirname, '../questions', `${id}.mp3`)
    })

    try {
        const outDir = join(__dirname, '../interviews')
        mkdirSync(outDir, { recursive: true })

        const output = join(outDir, `final-${Date.now()}.mp3`)
        await mergeAudio(files, output)

        const recDir = join(__dirname, '../user-recordings')
        for (const f of readdirSync(recDir)) unlinkSync(join(recDir, f))

        res.json({ status: 'ok', url: `/interviews/${basename(output)}` })
    } catch (err) {
        console.error(err)
        res.status(500).json({ status: 'error', message: 'Failed to generate interview' })
    }
}
