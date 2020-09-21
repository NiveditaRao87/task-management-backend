const config = require('./utils/config')
const express = require('express')
require('express-async-errors') //For async-await error handling
const app = express()
const cors = require('cors') //To allow requests from other origins
const loginRouter = require('./controllers/login')
const listsRouter = require('./controllers/lists')
const cardsRouter = require('./controllers/cards')
const usersRouter = require('./controllers/users')
const tokenVerifier = require('./utils/tokenVerifier')
const middleware = require('./utils/middleware')
const logger = require('./utils/logger')
const mongoose = require('mongoose')

logger.info('connecting to task management app database')

mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    logger.info('connected to MongoDB')
  })
  .catch((error) => {
    logger.error('error connection to MongoDB:', error.message)
  })

app.use(cors())
app.use(express.static('build'))
app.use(express.json())
app.use(middleware.requestLogger)

app.use('/api/lists', tokenVerifier,  listsRouter)
app.use('/api/cards', tokenVerifier, cardsRouter)
app.use('/api/users', usersRouter)
app.use('/api/login', loginRouter)

//For clearing database for e2e testing
// if (process.env.NODE_ENV === 'test') {
//   const testingRouter = require('./controllers/testing')
//   app.use('/api/testing', testingRouter)
// }

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app