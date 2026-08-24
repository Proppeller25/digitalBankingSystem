const express = require("express")
const app = express()
require('dotenv').config()

const connectDb = require('./config/databaseConfig')

const PORT = process.env.PORT || 3000

app.listen(PORT, async () => {
  await connectDb()
  console.log(`Server connected at http://localhost:${PORT}`)
})