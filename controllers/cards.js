const cardsRouter = require('express').Router()
const Card = require('../models/card')
const List = require('../models/list')
const Project = require('../models/project')
const User = require('../models/user')
const _ = require('lodash')
const { response } = require('express')
const project = require('../models/project')

cardsRouter.get('/timer', async (request,response) => {
  const card = await Card.findOne({tickingFrom: {$ne: new Date(0)}})
  if(!card){
    return response.json({noTimerOn: true})
  }

  response.json(card)
})

cardsRouter.get('/:id', async (request, response) => {
  
  const card = await Card.findById(request.params.id)
               .populate('list', {title: 1, id: 1, user: 1})
               .populate('project', {title: 1, id: 1})
  
  !card 
  ? response.status(404).end()
  : card.user.toString() === request.decodedToken.id 
  ? response.json(card)
  : response.status(401).end()
  
})


cardsRouter.post('/', async (request, response) => {
     const body = request.body

     const user = await User.findById(request.decodedToken.id)

     if(!user){
      return response.status(401).json({ error: 'non-existent user'})
    }

     const card = new Card({
       title: body.title.trim(),
       creationDate: new Date(),
       list: body.list,
       tickingFrom: new Date(0),
       user: user.id
     })

     if(!card.title){
       return response.status(400).send({
         error: 'title should be present'
       })
     }

    const savedCard = await card.save()
    const list = await List.findById(body.list)
    list.cards = list.cards.concat(savedCard.id)
    await list.save()

    response.json(savedCard)
  })

cardsRouter.put('/:id', async (request, response) => {
    const card = request.body

    if(!card.title){
      //treat absence of title as no change in stead of error
      return response.status(304).end()
    }
    const { user, list, project: currentProject, timeSpent: currentTimeSpent } = await Card.findById(request.params.id)
    
    if(!user){
      return response.status(401).json({ error: 'non-existent user'})
    }

    if(user.toString() !== request.decodedToken.id){
      return response.status(401).json({ error: 'unauthorised user'})
    }

    //Check if card is being moved to another list as this will involve modification of the List Collection as well
    //To find out :- How to do rollbacks, should I have used SQL instead.
    if(list.toString() !== card.list){
      const listTo = await List.findOne({_id: card.list, user})
      if(!listTo){
        return response.status(400).json({error: 'no such list'})
      }
      listTo.cards = listTo.cards.concat(request.params.id)
      const listFrom = await List.findById(list)
      listFrom.cards = listFrom.cards.filter(card => card.toString() !== request.params.id)
      await listTo.save()
      await listFrom.save()
    }

    //Check if project is being changed

    if(card.project){
      const project = await Project.findById(card.project)
      if(card.project !== currentProject){
        project.cards = [...project.cards, card.id]
        await project.save()
      }
    }

    if(currentProject && (!card.project || (currentProject !== card.project))){
      const oldProject = await Project.findById(currentProject)
      oldProject.cards = oldProject.cards.filter(c => c.toString() !== card.id)
      await oldProject.save()
    }

    card.project = card.project === '' ? null : card.project

    const updatedCard = 
      await Card
        .findByIdAndUpdate(request.params.id, card, { new: true })
        .populate('list', {title: 1, id: 1, user: 1})
        .populate('project',{title: 1, id: 1, dueDate: 1})

    response.json(updatedCard.toJSON())
})

cardsRouter.delete('/:id', async (request, response) => {
  const user = await User.findById(request.decodedToken.id)
  const card = await Card.findById(request.params.id)
  if (card.user.toString() !== user.id.toString()) {
    return response.status(401).json({ error: 'only the owner can delete the card' })
  }

  await card.remove()
  const list = await List.findById(card.list)
  list.cards = list.cards.filter(card => card.toString() !== request.params.id)
  await list.save()

  response.status(204).end()
})

  module.exports = cardsRouter