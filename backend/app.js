import cors from 'cors'
import express from 'express'
import catalogRoutes from './routes/catalogRoutes.js'

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}))
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.use('/api', catalogRoutes)

app.use((_request, response) => {
  response.status(404).json({ error: 'The requested API route does not exist.' })
})

// One error handler keeps database and route errors in one predictable format.
app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ error: 'Something went wrong. Check the API logs for details.' })
})

export default app
