import { Request, Response } from "express";

export const submitAnswer = (req: Request, res: Response) => {
    const { questionId, audioBase64 } = req.body;
    // get buffer from base64
    // save to user-recordings
    // return response
}

export const generateInterview = async (req: Request, res: Response) => {
    // TODO
}