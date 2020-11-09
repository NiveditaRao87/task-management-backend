const mongoose = require('mongoose')

const trackerSchema = new mongoose.Schema({
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: true
  },
  start: String,
  stop: String,
  day: String,
  week: String,
  month: String,
  time: Number
})

trackerSchema.set('toJSON', {
    transform: (document, returnedObject) => {
      returnedObject.id = returnedObject._id.toString()
      delete returnedObject._id
      delete returnedObject.__v
    }
  })
  
  module.exports = mongoose.model('Tracker', trackerSchema)