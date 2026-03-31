const API = 'https://spotapi.prestonarnold.uk' // TODO

function interview() {
    return {
        questions: [
            { id: 1, text: 'Who are you and what do you do?' },
            { id: 2, text: 'What first got you into tech?' },
            { id: 3, text: 'What does your typical working day look like?' },
            { id: 4, text: "What's your setup? Software and hardware." },
            { id: 5, text: "What's the last piece of work you feel proud of?" },
            { id: 6, text: "What's one thing about your profession you wish more people knew?" },
            { id: 7, text: 'Share something worth checking out — shameless plugs welcomed!' },
        ],

        screen: 'question',
        current: 0,
        recMap: {},
        recording: false,
        recSecs: 0,
        guardModal: false,
        pendingNav: null,
        generating: false,
        generateStatus: '',
        generatedUrl: null,
        _mr: null,
        _recInterval: null,

        get q()           { return this.questions[this.current] },
        get rec()         { return this.recMap[this.current] ?? null },
        get isLast()      { return this.current === this.questions.length - 1 },
        get allAnswered()  { return Object.keys(this.recMap).length === this.questions.length },
        get progress()    { return this.screen === 'finish' ? 100 : (this.current / this.questions.length) * 100 },
        get progressLabel() {
            if (this.screen === 'finish') return 'All questions answered'
            return `Question ${this.current + 1} of ${this.questions.length} — ${Object.keys(this.recMap).length} recorded`
        },

        fmt(s) {
            s = Math.max(0, Math.floor(s))
            return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
        },

        async startRec() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
                const mimeType = preferred.find(t => MediaRecorder.isTypeSupported(t)) || ''
                const chunks = []
                const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
                this._mr = mr
                mr.ondataavailable = e => e.data.size > 0 && chunks.push(e.data)
                mr.onstop = () => {
                    stream.getTracks().forEach(t => t.stop())
                    clearInterval(this._recInterval)
                    this.recording = false
                    const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })
                    this.recMap[this.current] = { blob, url: URL.createObjectURL(blob), duration: this.recSecs, mimeType }
                }
                mr.start(100)
                this.recSecs = 0
                this.recording = true
                this._recInterval = setInterval(() => this.recSecs++, 1000)
            } catch {
                alert('Microphone access was denied or unavailable.')
            }
        },

        stopRec() {
            if (this._mr) this._mr.stop()
        },

        deleteRec() {
            URL.revokeObjectURL(this.recMap[this.current]?.url)
            delete this.recMap[this.current]
        },

        async submitAnswer(index) {
            const rec = this.recMap[index]
            if (!rec) return
            const base64 = await new Promise(res => {
                const reader = new FileReader()
                reader.onload = () => res(reader.result.split(',')[1])
                reader.readAsDataURL(rec.blob)
            })
            await fetch(`${API}/interview/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId: `a${index + 1}`, audioBase64: base64, mimeType: rec.mimeType })
            }).catch(e => console.error('submit failed:', e))
        },

        async advance() {
            await this.submitAnswer(this.current)
            this.isLast ? this.screen = 'finish' : this.current++
        },

        async generate() {
            this.generating = true
            this.generateStatus = 'Sending to server…'
            this.generatedUrl = null
            const segments = this.questions.flatMap((_, i) => this.recMap[i] ? [`q${i + 1}`, `a${i + 1}`] : [`q${i + 1}`])
            try {
                const res = await fetch(`${API}/interview/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ segments })
                })
                const data = await res.json()
                this.generatedUrl = res.ok ? `${API}${data.url}` : null
                this.generateStatus = res.ok ? 'Done!' : `Error: ${data.message}`
            } catch (e) {
                this.generateStatus = `Request failed: ${e.message}`
            }
            this.generating = false
        },

        guardNav(cb) {
            this.recording ? (this.pendingNav = cb, this.guardModal = true) : cb()
        },

        discardAndNav() {
            if (this._mr) {
                this._mr.onstop = null
                try { this._mr.stop() } catch {}
                this._mr = null
            }
            clearInterval(this._recInterval)
            this.recording = false
            this.guardModal = false
            this.pendingNav?.()
            this.pendingNav = null
        },

        prev() { this.current-- },

        restart() {
            Object.values(this.recMap).forEach(r => URL.revokeObjectURL(r?.url))
            this.recMap = {}
            this.current = 0
            this.screen = 'question'
            this.generatedUrl = null
            this.generateStatus = ''
        },
    }
}
