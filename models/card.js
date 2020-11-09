const mongoose = require('mongoose')

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
  tickingFrom: Date,
  totalHours: Number,
  estimatedHours: Number,
  notes:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project' 
  },
  checklist: [{
    task: String,
    status: {
      type: String,
      enum: ['Done','To-do'],
      required: true
    }
  }],
  activityLog: [
      {
        type: String
      }
  ],
  list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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