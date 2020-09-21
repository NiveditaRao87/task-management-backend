const listsRouter = require('express').Router()
const jwt = require('jsonwebtoken')
const List = require('../models/list')
const User = require('../models/user')

listsRouter.get('/', async (request, response) => {
    
    const lists = await 
    List
      .find({user: request.decodedToken.id}).populate('cards', {id: 1, title : 1, dueDate: 1, tickingFrom: 1 })
      .populate('user', { username: 1, name: 1 })
    
    response.json(lists)
})

listsRouter.post('/', async (request, response) => {
    const body = request.body

    const list = new List({
      title: body.title.trim(),
      creationDate: new Date(),
      user: request.decodedToken.id
    })

    if(!list.title){
      return response.status(400).send({
        error: 'title should be present'
      })
    }

    const user = await User.findById(request.decodedToken.id)
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

    if(!list.title){
      //treat absence of title as no change in stead of error
      return response.status(304).end()
    }
    const { user } = await List.findById(request.params.id)

    if(!user){
      return response.status(401).json({ error: 'non-existent user'})
    }

    if(user.toString() !== request.decodedToken.id){
      return response.status(401).json({ error: 'unauthorised user'})
    }

    const updatedList = await List.findByIdAndUpdate(request.params.id, list, { new: true })
    response.json(updatedList.toJSON())
})

listsRouter.delete('/:id', async (request,response) => {
  const user = await User.findById(request.decodedToken.id)
  const list = await List.findById(request.params.id)

  if (list.user.toString() !== user.id.toString()) {
    return response.status(401).json({ error: 'only the owner can delete the list' })
  }
  if(list.cards.length !== 0){
    return response.status(400).json({ error: 'only an empty list may be deleted' })
  }

  await list.remove()

  response.status(204).end()

})

module.exports = listsRouter
