const listsRouter = require('express').Router()
const jwt = require('jsonwebtoken')
const List = require('../models/list')
const User = require('../models/user')

// const regExp = require('../constants/regex')

listsRouter.get('/', async (request, response) => {
    
    if (!request.token) {
      return response.status(401).json({ error: 'token missing' })
    }
    const decodedToken = jwt.verify(request.token, process.env.SECRET)
  
    if (!decodedToken.id) {
     return response.status(401).json({ error: 'token invalid' })
    }
  
    const lists = await 
    List
      .find({user: decodedToken.id}).populate('cards', {title : 1, dueDate: 1, currentTask: 1 })
      .populate('user', { username: 1, name: 1 })
    
    response.json(lists)
})

listsRouter.post('/', async (request, response) => {
    const body = request.body
    if (!request.token) {
      return response.status(401).json({ error: 'token missing' })
    }
    const decodedToken = jwt.verify(request.token, process.env.SECRET)
  
    if (!decodedToken.id) {
     return response.status(401).json({ error: 'token invalid' })
    }

    const list = new List({
      title: body.title.trim(),
      creationDate: new Date(),
      user: decodedToken.id
    })

    if(!list.title){
      return response.status(400).send({
        error: 'title should be present'
      })
    }

    const user = await User.findById(decodedToken.id)
    if(!user){
      return response.status(401).json({ error: 'non-existent user'})
    }

    const savedList = await list.save()
    user.lists = user.lists.concat(savedList.id)
    await user.save()
    response.json(savedList)
  })

listsRouter.put('/:id', async (request, response) => {
    const list = request.body

    if (!request.token) {
      return response.status(401).json({ error: 'token missing' })
    }
    const decodedToken = jwt.verify(request.token, process.env.SECRET)
  
    if (!decodedToken.id) {
     return response.status(401).json({ error: 'token invalid' })
    }

    if(!list.title){
      //treat absence of title as no change in stead of error
      return response.status(304).end()
    }
    const { user } = await List.findById(request.params.id)

    if(!user){
      return response.status(401).json({ error: 'non-existent user'})
    }

    if(user.toString() !== decodedToken.id){
      return response.status(401).json({ error: 'unauthorised user'})
    }

    const updatedList = await List.findByIdAndUpdate(request.params.id, list, { new: true })
    response.json(updatedList.toJSON())
})

module.exports = listsRouter
