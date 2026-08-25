import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from "express"

 const auth = (req: Request, res: Response, next: NextFunction) => {
  let token = req.cookies?.Authorization

  if (!token) {
    return res.status(401).json({ message: 'Access denied. Missing required parameters.' })
  }

  try {
    const jwtSecret = process.env.JWT_SECRET

    if(!jwtSecret)
      throw new Error('missing required env')

    const user = jwt.verify(token, jwtSecret )
    if (!user) 
      return res.status(401).json({message: 'Access denied. Invalid credentials'})

    if (typeof user === 'string') {
  return res.status(401).json({ message: 'Invalid token payload' })
}

req.user = {
  id: String(user.id),
  email: String(user.email),
  accountNumber: String(user.accountNumber),
  hasAdminAccess: Boolean(user.hasAdminAccess),
  name: String(user.name),
  ...(typeof user.role === 'string' ? { role: user.role } : {})
}
    return next()
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Token is not valid' })
  }
}

export default auth