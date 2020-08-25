const List = require('../models/list')
const Card = require('../models/card')

const initialLists = [
    {
        title: 'To dos',
        creationDate: new Date()
    },
    {
        title: 'WIP',
        creationDate: new Date()
    },
    {
        title: 'Done',
        creationDate: new Date()
    }
]


const listsInDB = async () => {
    const lists = await List.find({})
    return lists.map(list => list.toJSON())
}


const initialCards = [
    {
        title: 'React official documentation',
        description: 'Start this task after full stack open course is complete',
        list: 0 //index of list to be added later
      },
      {
        title: 'Javascript perusteet',
        description: 'Do this course to learn some basic finnish terms related to IT',
        dueDate: new Date('September 30, 2020 23:00').toLocaleString('en-GB', {year: 'numeric', month: 'short', day: 'numeric'}),
        list: 0
      },
      {
        title: 'Full stack open course',
        description: 'Currently doing part 6 of this course, complete till part 7 by end of month',
        dueDate: new Date('August 31, 2020 23:00').toLocaleString('en-GB', {year: 'numeric', month: 'short', day: 'numeric'}),
        list: 1
      }
]

const cardsInDB = async () => {
    const cards = await Card.find({})
    return cards.map(card => card.toJSON())
}

const createInitialLists = async () => {
    for (let list of initialLists) {
        const listObject = new List(list)
        await listObject.save()
      }
}

const createInitialCards = async () => {
    for (let card of initialCards) { 
      const lists = await listsInDB()
      randomIndex = Math.floor(Math.random() * lists.length)
      card.list = lists[randomIndex].id
      const cardObject = new Card(card)
      const savedCard = await cardObject.save()
      const list = {cards: lists[randomIndex].cards.concat(savedCard.id)}
      await List.findByIdAndUpdate(lists[randomIndex].id,list)
  }
}

const nonExistingId = async () => {
    const lists = await listsInDB()
    const card = new Card({ title: 'willremovethissoon', list: lists[0].id })
    console.log(card)
    await card.save()
    await card.remove()

    return card._id.toString()

  }

module.exports = {
    createInitialLists,
    listsInDB, 
    createInitialCards,
    cardsInDB,
    nonExistingId
}