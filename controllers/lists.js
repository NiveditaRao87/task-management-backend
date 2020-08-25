const listsRouter = require('express').Router()
const List = require('../models/list')
// const regExp = require('../constants/regex')

listsRouter.get('/', async (request, response) => {
    const lists = await List.find({}).populate('cards', {title : 1, dueDate: 1, currentTask: 1 })
    // .populate('user', { username: 1, name: 1 })
    response.json(lists)
})

listsRouter.post('/', async (request, response) => {
    const body = request.body
    // const token = getTokenFrom(request)
    // const decodedToken = jwt.verify(token, process.env.SECRET)
    // if(!token || !decodedToken.id){
    //   return response.status(401).json({ error: 'token missing or invalid' })
    // }
    // const user = await User.findById(decodedToken.id)

    const list = new List({
      title: body.title.trim(),
      creationDate: new Date(),
    //   user: user._id
    })

    if(!list.title){
      return response.status(400).send({
        error: 'title should be present'
      })
    }

    const savedList = await list.save()
    // user.notes = user.notes.concat(savedNote._id)
    // await user.save()
    response.json(savedList)
  })

listsRouter.put('/:id', async (request, response) => {
    const list = request.body

    if(!list.title){
      return response.status(400).send({
        error: 'title should be present'
      })
    }
  
    const updatedList = await List.findByIdAndUpdate(request.params.id, list, { new: true })
    response.json(updatedList.toJSON())
})

module.exports = listsRouter
