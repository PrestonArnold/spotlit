import { spawn } from 'child_process'

export function mergeAudio(files: string[], output: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!files.length) return reject(new Error('No files provided'))

        const args: string[] = []

        args.push('-err_detect', 'ignore_err')
        files.forEach(f => args.push('-i', f))

        const inputs = files.map((_, i) => `[${i}:a]`).join('')
        args.push('-filter_complex', `${inputs}concat=n=${files.length}:v=0:a=1[out]`, '-map', '[out]', output)

        const ffmpeg = spawn('ffmpeg', args)
        ffmpeg.stderr.on('data', d => process.stderr.write(d))
        ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))
    })
}
