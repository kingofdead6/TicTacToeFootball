import 'dotenv/config'
import { createServer } from 'node:http'
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import apiRouter from './src/routes/api.js'
import { attachRealtime } from './src/realtime/rooms.js'
import { connectDb } from './src/db.js'

const PORT = process.env.PORT || 4000
const origins = (process.env.CLIENT_ORIGIN || '*').split(',').map((s) => s.trim())
const corsOrigin = origins.includes('*') ? '*' : origins

const app = express()
app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '50kb' }))
app.get('/', (_req, res) => res.json({ name: 'TicTacToe Football API', docs: '/api/health' }))
app.use('/api', apiRouter)

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: corsOrigin },
  pingInterval: 20000,
  pingTimeout: 20000,
})
attachRealtime(io)

// Start listening right away (Render health checks), connect to MongoDB in parallel
httpServer.listen(PORT, () => console.log(`TicTacToe Football API + sockets on http://localhost:${PORT}`))
connectDb(process.env.MONGODB_URI)
