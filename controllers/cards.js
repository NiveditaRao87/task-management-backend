const cardsRouter = require('express').Router()
const jwt = require('jsonwebtoken')
const Card = require('../models/card')
const List = require('../models/list')
const User = require('../models/user')

cardsRouter.get('/:id', async (request, response) => {
  
  if (!request.token) {
    return response.status(401).json({ error: 'token missing' })
  }
   const decodedToken = jwt.verify(request.token, process.env.SECRET)

   if (!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
   }
  
  const card = await Card.findById(request.params.id)
               .populate('list', {title: 1, id: 1, user: 1})
  
  !card 
  ? response.status(404).end()
  : card.user.toString() === decodedToken.id 
  ? response.json(card)
  : response.status(401).end()
  
})

cardsRouter.post('/', async (request, response) => {
     const body = request.body
     if (!request.token) {
      return response.status(401).json({ error: 'token missing' })
    }
     const decodedToken = jwt.verify(request.token, process.env.SECRET)

     if (!decodedToken.id) {
      return response.status(401).json({ error: 'token invalid' })
     }

     const user = await User.findById(decodedToken.id)

     if(!user){
      return response.status(401).json({ error: 'non-existent user'})
    }

     const card = new Card({
       title: body.title.trim(),
       creationDate: new Date(),
       list: body.list,
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

    if (!request.token) {
      return response.status(401).json({ error: 'token missing' })
    }
    const decodedToken = jwt.verify(request.token, process.env.SECRET)
  
    if (!decodedToken.id) {
     return response.status(401).json({ error: 'token invalid' })
    }

    if(!card.title){
      //treat absence of title as no change in stead of error
      return response.status(304).end()
    }
    const { user } = await Card.findById(request.params.id)

    if(!user){
      return response.status(401).json({ error: 'non-existent user'})
    }

    if(user.toString() !== decodedToken.id){
      return response.status(401).json({ error: 'unauthorised user'})
    }
  
    const updatedCard = await Card.findByIdAndUpdate(request.params.id, card, { new: true })
    response.json(updatedCard.toJSON())
})

  module.exports = cardsRouter