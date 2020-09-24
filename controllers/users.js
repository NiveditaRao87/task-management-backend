const bcrypt = require('bcrypt')
const router = require('express').Router()
const jwt = require('jsonwebtoken')
const User = require('../models/user')

router.get('/', async (request, response) => {
  const users = await User
    .find({})
    .populate('lists', { title: 1, creationDate: 1,  cards: 1})

  response.json(users.map(u => u.toJSON()))
})

router.post('/', async (request, response) => {
  const { password, username, firstName, lastName } = request.body
  const existentUser = await User.findOne({username})

  if(existentUser){
    return response.status(400).json({
      error: 'email is already registered. Would you like to login?'
    })
  }
  
  if( !password ){
    return response.status(400).send({
      error: 'password is required'
    })
  }
 
  if (password.length < 8 ) {
    return response.status(400).send({
      error: 'password must have a minimum length of 8'
    })
  }

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const user = new User({
    username, firstName, lastName,
    passwordHash,
  })

  const savedUser = await user.save()

  const userForToken = {
    username,
    id: savedUser._id
  }

  const token = jwt.sign(userForToken, process.env.SECRET)

  response
    .status(200)
    .json({token, username , name: `${firstName} ${lastName}`})
})

module.exports = router