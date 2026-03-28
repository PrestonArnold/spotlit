import { spawn } from "child_process";

export const mergeAudio = (files: string[], output: string) => {
    return new Promise<void>((resolve, reject) => {
        if (files.length === 0) return reject(new Error("No files to merge!"));
        
        const filter = `concat=n=${files.length}:v=0:a=1[out]`;
        const args: string[] = [];
        files.forEach(f => args.push("-i", f));
        args.push("-filter_complex", filter, "-map", "[out]", output);

        const ffmpeg = spawn("ffmpeg", args);

        ffmpeg.stdout.on("data", d => console.log(d.toString()));
        ffmpeg.stderr.on("data", d => console.error(d.toString()));
        
        ffmpeg.on("close", code => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg exited with code ${code}`));
        });
    })
}