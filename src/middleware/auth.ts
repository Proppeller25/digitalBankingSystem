const jwt = require('jsonwebtoken')
import type { NextFunction, Request, Response } from "express";

interface AuthenticatedUser {
  role: string;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

const auth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token = req.cookies?.Authorization

  if (!token) {
    return res.status(401).json({ message: 'Access denied. Missing required parameters.' })
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET)
    if (!user) 
      return res.status(401).json({message: 'Access denied. Invalid credentials'})
    req.user = user
    return next()
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Token is not valid' })
  }
}

module.exports = auth