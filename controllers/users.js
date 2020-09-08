const bcrypt = require('bcrypt')
const router = require('express').Router()
const User = require('../models/user')

router.get('/', async (request, response) => {
  const users = await User
    .find({})
    .populate('lists', { title: 1, creationDate: 1,  cards: 1})

  response.json(users.map(u => u.toJSON()))
})

router.post('/', async (request, response) => {
  const { password, name, username } = request.body

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
    username, name,
    passwordHash,
  })

  const savedUser = await user.save()

  response.json(savedUser)
})

module.exports = router