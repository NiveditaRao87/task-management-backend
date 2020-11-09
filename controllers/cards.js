const cardsRouter = require('express').Router()
const Card = require('../models/card')
const List = require('../models/list')
const Project = require('../models/project')
const User = require('../models/user')
const Tracker = require('../models/tracker')
const _ = require('lodash')

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

    console.log(card)

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
      if(currentProject && currentProject !== card.project){
        const oldProject = await Project.findById(currentProject)
        oldProject.cards = oldProject.cards.filter(c => c !== card.id)
        await oldProject.save()
      }
      if(!currentProject){
        project.cards = [...project.cards, card.id]
        await project.save()
      }
    }

    // if(JSON.stringify(card.timeSpent) !== JSON.stringify(currentTimeSpent)){
    //  const addOrUpdateTracker = card.timeSpent.map(t => 
    //   !t._id 
    //     ? {...t , action: 'create'}
    //     : !_isEqual(t,currentTimeSpent.filter(ct => ct.id === t.id))
    //     && {...t, action: 'update'}
    //   ) 
    

    // addOrUpdateTracker = [...addOrUpdateTracker,
    // {...currentTimeSpent.filter(t => !card.timeSpent.find(ct => ct.id === t.id)),action: 'delete'}]

    // const trackedOnCard = await Tracker.findAll({card: card.id})

    // addOrUpdateTracker.map(t =>
    //   t.action === 'delete'
    //     ? trackedOnCard.filter(tc => tc.start !== t.start)  
    //   )
    // }
    // if(!_.isEqual(card.timeSpent,currentTimeSpent)){

    //   const timeSpentString = card.timeSpent.map(t => 
    //     ({start: t.start.toString(), stop: t.stop.toString(), _id: t._id.toString()}))
    //   currentTimeSpent.map(t => 
    //     ({start: t.start.toString(), stop: t.stop.toString(), _id: t._id.toString()}))
    //   const newStuff = _.differenceWith(timeSpentString, currentTimeSpent, _.isEqual)
    //   // const deletedStuff = _.difference(currentTimeSpent, card.timeSpent)

    //   // console.log(_.differenceWith([{a:1, b:2},{a:3, b:2}],[{a:1, b:2},{a:3, b:4}], _.isEqual))




    //    console.log(`card.timeSpent ${JSON.stringify(card.timeSpent)}
    //    currentTimeSpent ${JSON.stringify(currentTimeSpent)}
    //    newStuff ${JSON.stringify(newStuff)}`)

    //   newStuff.forEach((t,index) => {
    //     if(new Date(t.start).getDate() !== new Date(t.stop).getDate()){
    //       t = {...t, stop: new Date(t.start).setHours(24,0,0,0)}
    //       newStuff.splice(index + 1, 0, {
    //         start: new Date().setDate(new Date(t.start).getDate() + 1).setHours(0,0,0,0),
    //         stop: t.stop}  )
    //     }
    //   })

    //   console.log('after',newStuff)
    // }


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