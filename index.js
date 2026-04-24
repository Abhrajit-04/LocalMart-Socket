import express from "express"
import http from "http"
import dotenv from "dotenv"
import { Server } from "socket.io"
import axios from "axios"

dotenv.config()

const app = express()
app.use(express.json())

const server = http.createServer(app)
const port = process.env.PORT || 5000

const io = new Server(server, {
  cors: {
    origin: process.env.NEXTAUTH_URL
  },
  pingTimeout: 60000,
  pingInterval: 25000
})

io.on("connection", (socket) => {
  console.log(`🟢 CONNECTED: ${socket.id}`)

  socket.on("identity", async (userId) => {
    if (!userId) {
      console.log("❌ Invalid userId")
      return
    }

    if (socket.userId === userId) return
    socket.userId = userId

    try {
      const res = await axios.post(
        `${process.env.NEXTAUTH_URL}/api/socket/connect`,
        { userId, socketId: socket.id }
      )

      console.log("API RESPONSE:", res.data)

    } catch (err) {
      console.log("❌ API ERROR:", err.response?.data || err.message)
    }
  })

  socket.on("update-location", async ({ userId, latitude, longitude }) => {
    try {
      if (!userId || !latitude || !longitude) {
        console.log("❌ Invalid location data")
        return
      }

      const location = {
        type: "Point",
        coordinates: [longitude, latitude]
      }

      const res = await axios.post(
        `${process.env.NEXTAUTH_URL}/api/socket/update-location`,
        { userId, location }
      )

      console.log("📍 LOCATION UPDATED:", res.data)

    } catch (err) {
      console.log("❌ LOCATION ERROR:", err.response?.data || err.message)
    }
  })

  socket.on("disconnect", async () => {
    console.log(`🔴 DISCONNECTED: ${socket.id}`)

    try {
      await axios.post(
        `${process.env.NEXTAUTH_URL}/api/socket/disconnect`,
        { socketId: socket.id }
      )
    } catch (err) {
      console.log("❌ DISCONNECT API ERROR:", err.response?.data || err.message)
    }
  })
})


// 🔥 FIXED + ADDED (IMPORTANT FOR REALTIME)
app.post("/emit", (req, res) => {
  const { event, data, socketId } = req.body

  console.log("📡 EMIT EVENT:", event, data)

  if (socketId) {
    io.to(socketId).emit(event, data)
  } else {
    io.emit(event, data)
  }

  return res.status(200).json({ success: true })
})


server.listen(port, () => {
  console.log("🚀 server started at", port)
})