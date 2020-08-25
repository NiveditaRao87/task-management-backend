const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

mongoose.set('useFindAndModify', false)

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    //later make required to true
    //required: true
  },
  name: String,
  passwordHash: String,
  lists: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'List'
    }
  ],
})

userSchema.plugin(uniqueValidator)

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    // the passwordHash should not be revealed
    delete returnedObject.passwordHash
  }
})

const User = mongoose.model('User', userSchema)

module.exports = User