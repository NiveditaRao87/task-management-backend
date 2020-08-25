const mongoose = require('mongoose')

mongoose.set('useFindAndModify', false)

const listSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  creationDate: Date,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cards: [
      {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Card'
      }
  ]
})

listSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('List', listSchema)