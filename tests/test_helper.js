const bcrypt = require('bcrypt')
const List = require('../models/list')
const Card = require('../models/card')
const User = require('../models/user')

const initialLists = [
    {
        title: 'To dos',
        creationDate: new Date(),
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
        list: 0
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

const createInitialLists = async (user) => {
    for (let list of initialLists) {
        const listObject = new List({...list, user})
        await listObject.save()
      }
}

const createInitialCards = async (user) => {
    for (let card of initialCards) { 
      const lists = await listsInDB()
      randomIndex = Math.floor(Math.random() * lists.length)
      card.list = lists[randomIndex].id
      const cardObject = new Card({...card, user})
      const savedCard = await cardObject.save()
      const list = {cards: lists[randomIndex].cards.concat(savedCard.id)}
      await List.findByIdAndUpdate(lists[randomIndex].id,list)
  }
}

const nonExistingId = async (user) => {
    const lists = await listsInDB()
    const card = new Card({ title: 'willremovethissoon', list: lists[0].id, user })
    await card.save()
    await card.remove()

    return card._id.toString()

  }

  const usersInDB = async () => {
    const users = await User.find({})
    return users.map(u => u.toJSON())
  }
  
  const createUser = async () => {
    const username = 'infocus@email.com'
    const password = 'password'
    const passwordHash = await bcrypt.hash(password, 10)
    const user = new User({
      username,
      firstName: 'Planahead',
      lastName: 'Bruce',
      passwordHash
    })
    const savedUser = await user.save()
  
    return { id: savedUser._id, username, password }
  }
  const createUnauthorisedUser = async () => {
    const username = 'nosy@parker.com'
    const password = 'password'
    const passwordHash = await bcrypt.hash(password, 10)
    const user = new User({
      username,
      firstName: 'Curious',
      lastName: 'Hedgehog',
      passwordHash
    })
    const savedUser = await user.save()
  
    return { id: savedUser._id, username, password }
  }

  const createListsOfAnotherUser = async () => {
    const username = 'makesome@email.com'
    const password = 'fillerdata'
    const passwordHash = await bcrypt.hash(password, 10)
    const user = new User({
      username,
      passwordHash,
      firstName: 'Another',
      lastName: 'User'
    })
    const savedUser = await user.save()

    for (let list of initialLists) {
      const listObject = new List({...list, user: savedUser.id})
      await listObject.save()
    }

  }

  const createEmptyList = async (user) => {
    const list = {
      title: 'Empty list',
      creationDate: new Date(),
    }
    const listObject = new List({...list, user: user.toString()})
    const returnedList = await listObject.save()
    return returnedList.toJSON()
  }

module.exports = {
    createInitialLists,
    listsInDB, 
    createInitialCards,
    cardsInDB,
    nonExistingId,
    usersInDB,
    createUser,
    createUnauthorisedUser,
    createListsOfAnotherUser,
    createEmptyList
}