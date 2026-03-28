import { spawn } from "child_process";

export const mergeAudio = (files: string[], output: string) => {
    return new Promise<void>((resolve, reject) => {
        if (files.length === 0) return reject(new Error("No files to merge!"));

        const args: string[] = [];

        // Be lenient about malformed packets (common with Chrome WebM/Opus recordings)
        args.push("-err_detect", "ignore_err");

        files.forEach(f => args.push("-i", f));

        const perInput = files.map((_, i) =>
            `[${i}:a]` +
            `highpass=f=80,` +
            `afftdn=nf=-25,` +
            `acompressor=threshold=0.1:ratio=3:attack=5:release=50:makeup=1` + // makeup=1 (no boost)
            `[clean${i}]`
        ).join('; ');

        let crossfadeChain = '';
        let lastLabel = `[clean0]`;

        for (let i = 1; i < files.length; i++) {
            const outLabel = i === files.length - 1 ? '[merged]' : `[cf${i}]`;
            crossfadeChain += `; ${lastLabel}[clean${i}]acrossfade=d=0.3:c1=exp:c2=exp${outLabel}`;
            lastLabel = outLabel;
        }

        const finalMerge = files.length === 1
            ? `; [clean0]anull[merged]`
            : crossfadeChain;

        // -23 LUFS (broadcast standard, quieter than podcast)
        const loudnorm = `[merged]loudnorm=I=-23:TP=-2:LRA=11[out]`;

        const filterComplex = `${perInput}${finalMerge}; ${loudnorm}`;

        args.push("-filter_complex", filterComplex, "-map", "[out]", output);

        console.log("ffmpeg filter_complex:", filterComplex);

        const ffmpeg = spawn("ffmpeg", args);

        ffmpeg.stdout.on("data", d => console.log(d.toString()));
        ffmpeg.stderr.on("data", d => console.error(d.toString()));

        ffmpeg.on("close", code => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg exited with code ${code}`));
        });
    })
}
