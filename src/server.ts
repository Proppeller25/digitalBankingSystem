import express from "express"
import 'dotenv/config'
const app = express()
import cookieParser from 'cookie-parser'
import userRoutes from "./routes/userRoutes.js"

import connectDb from './config/databaseConfig.js'

const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cookieParser())

app.get('/', (_req, res) => {
  res.send('Welcome to the Digital Banking System API')
})

app.use(async (_req, _res, next) => {
  try {
    await connectDb()
    next()
  } catch (error) {
    next(error)
  }
})

app.use('/api', userRoutes)
if(process.env.ENVIRONMENT === 'development') {
  app.listen(PORT, async () => {
    await connectDb()
    console.log(`Server connected at http://localhost:${PORT}`)
  })
}

export default app