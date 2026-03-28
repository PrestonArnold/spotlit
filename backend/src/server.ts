import express, { type Express } from 'express'
import { join } from 'path'

export const app: Express = express()

app.use("/questions", express.static(join(__dirname, "questions")));
app.use("/user-recordings", express.static(join(__dirname, "user-recordings")));
app.use("/interviews", express.static(join(__dirname, "interviews")));