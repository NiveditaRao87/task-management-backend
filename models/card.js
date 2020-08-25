const mongoose = require('mongoose')

mongoose.set('useFindAndModify', false)

const cardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  creationDate: Date,
  description: String,
  dueDate: Date,
  timeSpent: [
      {
        start: String,
        stop: String
      }
  ],
  currentTask: Boolean,
  totalHours: Number,
  estimatedHours: Number,
  overDue: Boolean,
  activityLog: [
      {
        type: String
      }
  ],
  list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: true
  }
})

cardSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Card', cardSchema)