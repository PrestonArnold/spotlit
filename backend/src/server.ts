import express, { type Express } from 'express'
import cors from 'cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const app: Express = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// TODO
app.use('/questions', express.static("/var/www/apis/src/questions/"))
app.use('/interview', express.static("/var/www/apis/src/interviews/"))
