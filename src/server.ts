import express from "express"
const app = express()
require('dotenv').config()
import cookieParser from 'cookie-parser'


const connectDb = require('./config/databaseConfig')

const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cookieParser())

app.get('/', (_req, res) => {
  res.send('Welcome to the Digital Banking System API')
})

app.listen(PORT, async () => {
  await connectDb()
  console.log(`Server connected at http://localhost:${PORT}`)
})
