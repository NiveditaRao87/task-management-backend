const cardsRouter = require('express').Router()
const Card = require('../models/card')
const List = require('../models/list')

cardsRouter.get('/:id', async (request, response) => {
  const card = await Card.findById(request.params.id)
  if (card) {
    response.json(card)
  } else {
    response.status(404).end()
  }
})

cardsRouter.post('/', async (request, response) => {
    const body = request.body
    // const token = getTokenFrom(request)
    // const decodedToken = jwt.verify(token, process.env.SECRET)
    // if(!token || !decodedToken.id){
    //   return response.status(401).json({ error: 'token missing or invalid' })
    // }
    // const user = await User.findById(decodedToken.id)

     const card = new Card({
       title: body.title.trim(),
       creationDate: new Date(),
       list: body.list
     //   user: user._id
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

    //user.notes = user.notes.concat(savedNote._id)
    // await user.save()
    response.json(savedCard)
  })

cardsRouter.put('/:id', async (request, response) => {
    const card = request.body
    if(!card.title){
      return response.status(400).send({
        error: 'title should be present'
      })
    }
  
    const updatedCard = await Card.findByIdAndUpdate(request.params.id, card, { new: true })
    response.json(updatedCard.toJSON())
})

  module.exports = cardsRouter