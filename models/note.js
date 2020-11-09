const mongoose = require('mongoose')

const noteSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  title: String,
  date: Date,
  label: String,
  colour: String,
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card' 
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project' 
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
})

noteSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Note', noteSchema)