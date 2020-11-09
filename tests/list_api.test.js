const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const List = require('../models/list')
const Card = require('../models/card')
const User = require('../models/user')
const Note = require('../models/note')
const Project = require('../models/project')

const api = supertest(app)

beforeEach(async () => {
    await List.deleteMany({})
    await Card.deleteMany({})
    await User.deleteMany({})
    await Note.deleteMany({})
    await Project.deleteMany({})

    const { id } = await helper.createUser()

    await helper.createInitialLists(id)
    await helper.createInitialCards(id) //Lists should have already been created before this can be called
    await helper.createInitialNotes(id)
    await helper.createInitialProjects(id)

})

afterAll(() => {
  mongoose.connection.close()
})

const login = async () => {

  const username = 'infocus@email.com' 
  const password = 'password'
  const { id } = await User.findOne({username})
  
  const response = await api
    .post('/api/login')
    .send({ username, password })
    .expect(200)

  const token = `bearer ${response.body.token}`

  return { token, id }
}

describe('when there are initially some lists saved', () => {
  
  test('lists are returned as json', async () => {
    
    const {token} = await login()
    
    await api
      .get('/api/lists')
      .set('Authorization', token)
      .expect(200)
      .expect('Content-Type', /application\/json/)
   })
   test('only lists of the user are returned', async () => {
    
    //Create lists of another user so that the database has data of more than one user

    await helper.createListsOfAnotherUser()
    const listsInDB = await helper.listsInDB()

    const {token, id} = await login()
    
    const listsOfUser = await List.find({user: id})
    const response = await api.get('/api/lists').set('Authorization', token)

    expect(response.body.length).toBeLessThan(listsInDB.length)
    expect(response.body).toHaveLength(listsOfUser.length)
  })  
  test('a user is unable to retrieve another users list', async () => {
    
    const listsInDB = await helper.listsInDB()
    const { username, password } = await helper.createUnauthorisedUser()

    const loginResponse = await api
    .post('/api/login')
    .send({ username, password })
    .expect(200)
    
    const token = `bearer ${loginResponse.body.token}`

    //This user has no lists so returned length should be zero
    
    const response = await api.get('/api/lists').set('Authorization', token)

    expect(listsInDB.length).toBeGreaterThan(0)
    expect(response.body).toHaveLength(0)
  })  
  test('a specific list is within the returned lists', async () => {
    
    const {token} = await login()
    
    const response = await api.get('/api/lists').set('Authorization', token)

    const titles = response.body.map(r => r.title)
    expect(titles).toContain('To dos')
  })
  test('a specific card on a list is within the returned lists', async () => {
    
    const {token, id} = await login()

    //find the list of any one of the cards
    const userCardsInDB = await Card.find({user: id})

    const response = await api.get('/api/lists').set('Authorization', token)
    const list = response.body.find(l => l.id.toString() === userCardsInDB[0].list.toString())
    const cards = list.cards.map(card =>card.id)
    expect(cards).toContain(userCardsInDB[0].id)
  })
})

describe('viewing a specific card', () => {
  test('succeeds with a valid id when requested by the owner', async () => {
    const cardsAtStart = await helper.cardsInDB()
    const listsAtStart = await helper.listsInDB()

    const cardToView = cardsAtStart[0]
    const cardList = listsAtStart.find(list => list.id.toString() === cardToView.list.toString())

    const {token, id} = await login()

    const resultCard = await api
      .get(`/api/cards/${cardToView.id}`)
      .set('Authorization', token)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    cardToView.user = cardToView.user.toString()
    
    expect(resultCard.body).toEqual({...cardToView,
                                     list: {id: cardList.id.toString(), 
                                     title: cardList.title, 
                                     user: cardList.user.toString()}})
    expect(resultCard.body.user).toBe(id.toString())
  })

  test('fails with a status code 401 when not requested by owner', async () => {

    const cardsAtStart = await helper.cardsInDB()

    const cardToView = cardsAtStart[0]
    
    const { username, password } = await helper.createUnauthorisedUser()

    const response = await api
    .post('/api/login')
    .send({ username, password })
    .expect(200)
    
    const token = `bearer ${response.body.token}`

    const repsonse = await api
      .get(`/api/cards/${cardToView.id}`)
      .set('Authorization', token)
      .expect(401)

  })
  test('fails with statuscode 404 if card does not exist', async () => {
    
    const {token, id} = await login()
    
    const validNonexistingId = await helper.nonExistingId(id)

    console.log(validNonexistingId)

    await api
      .get(`/api/cards/${validNonexistingId}`)
      .set('Authorization',token)
      .expect(404)
  })

  test('fails with statuscode 400 id is invalid', async () => {
    const invalidId = '5a3d5da59070081a82a3445'

    const {token} = await login()

    await api
      .get(`/api/cards/${invalidId}`)
      .set('Authorization',token)
      .expect(400)
  })
})

describe('creation of a new list',() =>{
    test('succeeds with valid data if token is present', async () => {
        const listsAtStart = await helper.listsInDB()

        const {token, id} = await login()

        const newList = {
            title: 'Parked'
        }

        await api
          .post('/api/lists')
          .set('Authorization',token)
          .send(newList)
          .expect(200)
          .expect('Content-Type', /application\/json/)

        const listsAtEnd = await helper.listsInDB()
        expect(listsAtEnd).toHaveLength(listsAtStart.length + 1)
        const titles = listsAtEnd.map(r => r.title)
        expect(titles).toContain('Parked')
        const createdList = listsAtEnd.find(l => l.title === 'Parked')
        expect(createdList.creationDate).toBeDefined()
        expect(createdList.user.toString()).toBe(id)

    } )
    test('fails with a status code 401 if token is missing', async() => {
      const listsAtStart = await helper.listsInDB()

        const newList = {
            title: `Won't be created`
        }

        await api
          .post('/api/lists')
          .set('Authorization','bearer ')
          .send(newList)
          .expect(401)

        const listsAtEnd = await helper.listsInDB()
        expect(listsAtEnd).toHaveLength(listsAtStart.length)
        const titles = listsAtEnd.map(r => r.title)
        expect(titles).not.toContain(`Won't be created`)

    })
    test('fails with a status code 400 if title is empty', async () => {
        
        const listsAtStart = await helper.listsInDB()

        const {token} = await login()
        
        const newList = {
            title: ' '
        }

        const { body } = await api
          .post('/api/lists')
          .set('Authorization', token)
          .send(newList)
          .expect(400)

        const listsAtEnd = await helper.listsInDB()

        expect(listsAtEnd).toHaveLength(listsAtStart.length)
        expect(body.error).toBe('title should be present')

    })
})

describe('creation of a new card on a list',() =>{
    test('succeeds with valid data', async () => {
        
        const {token, id} = await login()
      
        const listsInDB = await helper.listsInDB()
        const cardsAtStart = await helper.cardsInDB()
        
        const newCard = {
            title: 'Task Management App',
            list: listsInDB[0].id
        }

        await api
          .post('/api/cards')
          .send(newCard)
          .set('Authorization', token)
          .expect(200)
          .expect('Content-Type', /application\/json/)

        const cardsAtEnd = await helper.cardsInDB()
        expect(cardsAtEnd).toHaveLength(cardsAtStart.length + 1)
        //Right now it is a little bit dirty data since the list is on a different user id and card is on a 
        //different one but once list is also created with user it can be fixed 
        const titles = cardsAtEnd.map(r => r.title)
        expect(titles).toContain('Task Management App')
        const createdCard = cardsAtEnd.find(c => c.title === 'Task Management App')
        expect(createdCard.creationDate).toBeDefined()
        expect(createdCard.list.toString()).toBe(listsInDB[0].id.toString())
        expect(createdCard.user.toString()).toBe(id.toString())
        //The list is also updated with the card id
        const listsAtEnd = await helper.listsInDB()
        expect(listsAtEnd[0].cards.toString()).toContain(createdCard.id)
    } )
    test('fails with a status code 400 if title is empty', async () => {
        
        const {token} = await login()
      
        const listsInDB = await helper.listsInDB()
        const cardsAtStart = await helper.cardsInDB()

        const newCard = {
            title: '',
            list: listsInDB[0].id
        }

        const { body } = await api
          .post('/api/cards')
          .send(newCard)
          .set('Authorization', token)
          .expect(400)

        const cardsAtEnd = await helper.cardsInDB()

        expect(cardsAtEnd).toHaveLength(cardsAtStart.length)
        expect(body.error).toBe('title should be present')
    })
    test('fails with a status code 400 if list is not present', async () => {
        
        const {token} = await login()
      
        const cardsAtStart = await helper.cardsInDB()
        
        const newCard = {
            title: 'FCC projects '
        }

        const { body } = await api
          .post('/api/cards')
          .send(newCard)
          .set('Authorization', token)
          .expect(400)

        const cardsAtEnd = await helper.cardsInDB()

        expect(cardsAtEnd).toHaveLength(cardsAtStart.length)
        expect(body.error).toContain('Card validation failed: list: Path `list` is required')
    })
    test('fails with status 401 if token is missing', async () => {

      const listsInDB = await helper.listsInDB()
        
      const cardsAtStart = await helper.cardsInDB()
        
      const newCard = {
          title: 'Task Management App',
          list: listsInDB[0].id
      }
  
      const response = await api
        .post('/api/cards')
        .send(newCard)
        .set('Authorization', 'bearer ')
        .expect(401)

      const cardsAtEnd = await helper.cardsInDB()
  
      expect(response.body.error).toContain('token missing')
      expect(cardsAtStart.length).toBe(cardsAtEnd.length)
    })

})

describe('updating a list',() => {
  test('succeeds when the title is updated by the owner', async () => {
    
    const {token, id} = await login()
    
    const [ aList ] = (await List.find({user: id})).map(list => list.toJSON())
    const editList = {...aList, title: 'Update the list title to this'}

    await api
      .put(`/api/lists/${aList.id}`)
      .set('Authorization', token)
      .send(editList)
      .expect(200)

    const listsAtEnd = await helper.listsInDB()
    const editedList = listsAtEnd.find(l => l.id === aList.id)
    expect(editedList.title).toBe(editList.title)
  })
  test('fails with status 304 when the title is not present', async () => {
    const { token, id } = await login()
    
    const [ aList ] = (await List.find({user: id})).map(list => list.toJSON())
    const editList = {...aList, title: ''}

    await api
      .put(`/api/lists/${aList.id}`)
      .set('Authorization', token)
      .send(editList)
      .expect(304) //Not modified
      
    const listsAtEnd = await helper.listsInDB()
    const uneditedList = listsAtEnd.find(l => l.id === aList.id)
    // title should remain unchanged
    expect(uneditedList.title).toBe(aList.title)
  })
  test('fails with status 401 when request is sent by another user', async () => {
    const [aList] = await helper.listsInDB()
    const editList = {...aList, title: 'This update should fail'}

    //Create a new user who has no lists
    const { username, password } = await helper.createUnauthorisedUser()

    const response = await api
    .post('/api/login')
    .send({ username, password })
    .expect(200)
    
    const token = `bearer ${response.body.token}`

    await api
      .put(`/api/lists/${aList.id}`)
      .set('Authorization', token)
      .send(editList)
      .expect(401)
    
    const listsAtEnd = await helper.listsInDB()
    const uneditedList = listsAtEnd.find(l => l.id === aList.id)
    expect(uneditedList.title).not.toBe('This update should fail')
  })
})

describe('updating a card',() => {
  test('succeeds when the title is updated by the owner', async () => {
    const {token, id} = await login()
    
    const [ aCard ] = (await Card.find({user: id})).map(card => card.toJSON())
    const editCard = {...aCard, title: 'Update the card title to this'}

    await api
      .put(`/api/cards/${aCard.id}`)
      .set('Authorization', token)
      .send(editCard)
      .expect(200)

    const cardsAtEnd = await helper.cardsInDB()
    const editedCard = cardsAtEnd.find(c => c.id === aCard.id)
    expect(editedCard.title).toBe(editCard.title)
  })
  test('fails when the title is not present', async () => {
    const { token, id } = await login()
    
    const [ aCard ] = (await Card.find({user: id})).map(card => card.toJSON())

    const editCard = {...aCard, title: ''}

    await api
      .put(`/api/cards/${aCard.id}`)
      .set('Authorization', token)
      .send(editCard)
      .expect(304)

    const cardsAtEnd = await helper.cardsInDB()
    const editedCard = cardsAtEnd.find(c => c.id === aCard.id)
    // title should remain unchanged
    expect(editedCard.title).toBe(aCard.title)
  })
  test('succeeds when a project is added to the card', async() => {
    const { token, id } = await login()

    const [ aCard ] = (await Card.find({user: id})).map(card => card.toJSON())

    const [aProject] = (await Project.find({user: id})).map(p => p.toJSON())

    const editCard = {...aCard, project: aProject.id}

    await api
      .put(`/api/cards/${aCard.id}`)
      .set('Authorization', token)
      .send(editCard)
      .expect(200)

    const cardsAtEnd = await helper.cardsInDB()
    const projectAtEnd = (await helper.projectsInDB()).find(p => p.id === aProject.id)
    const editedCard = cardsAtEnd.find(c => c.id === aCard.id)

    expect(editedCard.project.toString()).toBe(editCard.project)
    expect(projectAtEnd.cards).toHaveLength(aProject.cards.length + 1)
    expect(projectAtEnd.cards.toString()).toContain(aCard.id)
    
  })
  test('succeeds when a project is updated to the card', async() => {
    const { token, id } = await login()

    const [ aCard ] = (await Card.find({user: id})).map(card => card.toJSON())

    const [aProject, anotherProject] = (await Project.find({user: id})).map(p => p.toJSON())

    const editCard = {...aCard, project: aProject.id}

    // Added project to the card
    await api
      .put(`/api/cards/${aCard.id}`)
      .set('Authorization', token)
      .send(editCard)
      .expect(200)

    // Update new project to card
    
    const updatedCard = (await Card.findById(aCard.id)).toJSON()

    const secondEditOnCard = {...updatedCard, project: anotherProject.id}

    await api
      .put(`/api/cards/${aCard.id}`)
      .set('Authorization', token)
      .send(secondEditOnCard)
      .expect(200) 

      const cardsAtEnd = await helper.cardsInDB()
      const projectAtEnd = (await helper.projectsInDB()).find(p => p.id === anotherProject.id)
      const editedCard = cardsAtEnd.find(c => c.id === aCard.id)
  
      expect(editedCard.project.toString()).toBe(secondEditOnCard.project)
      expect(projectAtEnd.cards).toHaveLength(anotherProject.cards.length + 1)
      expect(projectAtEnd.cards.toString()).toContain(aCard.id)
    
  })
  test('fails with status 401 when request is sent by another user', async () => {
    const [aCard] = await helper.cardsInDB()
    const editCard = {...aCard, title: 'This update should fail'}

    //Create a new user who has no lists
    const { username, password } = await helper.createUnauthorisedUser()

    const response = await api
    .post('/api/login')
    .send({ username, password })
    .expect(200)
    
    const token = `bearer ${response.body.token}`

    await api
      .put(`/api/cards/${aCard.id}`)
      .set('Authorization', token)
      .send(editCard)
      .expect(401)
    
    const cardsAtEnd = await helper.cardsInDB()
    const uneditedCard = cardsAtEnd.find(c => c.id === aCard.id)
    expect(uneditedCard.title).not.toBe('This update should fail')
  })
})

describe('moving a card to another list', () => {
  test('succeeds when the new list exists', async () => {
    const {token, id} = await login()
    
    const [ aCard ] = (await Card.find({user: id})).map(card => card.toJSON())
    
    const listsAtStart = await helper.listsInDB()
    const newList = listsAtStart
      .find(list => list.id !== aCard.list.toString() && list.user.toString() === aCard.user.toString())
    const editCard = {...aCard, list: newList.id}


    await api
      .put(`/api/cards/${aCard.id}`)
      .set('Authorization', token)
      .send(editCard)
      .expect(200)
    
    const cardsAtEnd = await helper.cardsInDB()
    const listsAtEnd = await helper.listsInDB()
    const updatedCard = cardsAtEnd.find(card => card.id === aCard.id)
    const newListCards = listsAtEnd.find(list => list.id === newList.id).cards.map(card => card.toString())
    const oldListCards = listsAtEnd.find(list => list.id === aCard.list.toString()).cards.map(card => card.toString())
    //Check the card, new list and the old list
    expect(listsAtEnd).toHaveLength(listsAtStart.length)
    expect(updatedCard.list.toString()).toBe(newList.id)
    expect(newListCards).toContain(aCard.id.toString())
    expect(oldListCards).not.toContain(aCard.id.toString())
    
  })
  test('fails with status 400 when new list does not exist ', async () => {
    const {token, id} = await login()

    const [ aCard ] = (await Card.find({user: id})).map(card => card.toJSON())
    
    const listsAtStart = await helper.listsInDB()
    const validNonexistingId = await helper.nonExistingId(id)

    const editCard = {...aCard, list: validNonexistingId}

    const result = await api
      .put(`/api/cards/${aCard.id}`)
      .set('Authorization', token)
      .send(editCard)
      .expect(400)

      const cardsAtEnd = await helper.cardsInDB()
      const uneditedCard = cardsAtEnd.find(c => c.id === aCard.id)
      const listsAtEnd = await helper.listsInDB()
      expect(uneditedCard.list).toEqual(aCard.list)
      expect(listsAtStart).toEqual(listsAtEnd)
      expect(result.body.error).toContain('no such list')
      
  })
})

describe('deleting a card', () =>{
  test('succeeds when the owner sends the request', async() => {
    const {token, id} = await login()
    const [ aCard ] = (await Card.find({user: id})).map(card => card.toJSON())
    const cardsAtStart = await helper.cardsInDB()
    const listsAtStart = await helper.listsInDB()

    const cardsOnListBefore = listsAtStart
      .find(list => list.id === aCard.list.toString()).cards
      .map(card => card.toString())
    await api
      .delete(`/api/cards/${aCard.id}`)
      .set('Authorization', token)
      .expect(204)
    
    const cardsAtEnd = await helper.cardsInDB()
    const listsAtEnd = await helper.listsInDB()
    const cardsOnListAfter = listsAtEnd
      .find(list => list.id === aCard.list.toString()).cards
      .map(card => card.toString())

    expect(cardsAtEnd).toHaveLength(cardsAtStart.length - 1)
    expect(cardsOnListBefore).toContain(aCard.id.toString())
    expect(cardsOnListAfter).not.toContain(aCard.id.toString())

  })
  test('fails when another user sends the request', async () => {
    const { username, password } = await helper.createUnauthorisedUser()

    const loginResponse = await api
    .post('/api/login')
    .send({ username, password })
    .expect(200)
    
    const token = `bearer ${loginResponse.body.token}`

    const cardsAtStart = await helper.cardsInDB()
    const listsAtStart = await helper.listsInDB()

    const result = await api
      .delete(`/api/cards/${cardsAtStart[0].id}`)
      .set('Authorization', token)
      .expect(401)

    const cardsAtEnd = await helper.cardsInDB()
    const listsAtEnd = await helper.listsInDB()

    expect(cardsAtEnd).toHaveLength(cardsAtStart.length)
    expect(cardsAtEnd).toEqual(cardsAtStart)
    expect(listsAtEnd).toEqual(listsAtStart)
    expect(result.body.error).toContain('only the owner can delete the card')
  })
})

describe('deletion of a list', () => {
  test('fails when there are cards on the list', async() => {
    const {token} = await login()
    const listsAtStart = await helper.listsInDB()
    const cardsAtStart = await helper.cardsInDB()

    const list = listsAtStart.find(list => list.cards.length !== 0)

    const result = await api
      .delete(`/api/lists/${list.id}`)
      .set('Authorization', token)
      .expect(400)

    const listsAtEnd = await helper.listsInDB()
    const cardsAtEnd = await helper.cardsInDB()

    expect(listsAtStart).toEqual(listsAtEnd)
    expect(cardsAtStart).toEqual(cardsAtEnd)
    expect(result.body.error).toContain('only an empty list may be deleted')
  })
  test('succeeds when there are no cards on the list', async() => {
    const {token,id} = await login()
    
    const emptyList = await helper.createEmptyList(id)
    const listsAtStart = await helper.listsInDB()
    const cardsAtStart = await helper.cardsInDB()

    await api
      .delete(`/api/lists/${emptyList.id}`)
      .set('Authorization', token)
      .expect(204)

    const listsAtEnd = await helper.listsInDB()
    const cardsAtEnd = await helper.cardsInDB()
    const listsAtEndIds = listsAtEnd.map(list => list.id)

    expect(listsAtEnd).toHaveLength(listsAtStart.length - 1)
    expect(cardsAtEnd).toEqual(cardsAtStart)
    expect(listsAtEndIds).not.toContain(emptyList.id)

  })
  test('fails when another user sends the request', async () => {
    const {id} = await login()
    
    const emptyList = await helper.createEmptyList(id)
    const listsAtStart = await helper.listsInDB()
    const cardsAtStart = await helper.cardsInDB()
    
    const { username, password } = await helper.createUnauthorisedUser()

    const loginResponse = await api
    .post('/api/login')
    .send({ username, password })
    .expect(200)
    
    const token = `bearer ${loginResponse.body.token}`

    const result = await api
      .delete(`/api/lists/${emptyList.id}`)
      .set('Authorization', token)
      .expect(401)

    const cardsAtEnd = await helper.cardsInDB()
    const listsAtEnd = await helper.listsInDB()

    expect(cardsAtEnd).toEqual(cardsAtStart)
    expect(listsAtEnd).toEqual(listsAtStart)
    expect(result.body.error).toContain('only the owner can delete the list')
  })

})

describe('adding a new project ', () => {
  test('succeeds when there is valid data and user', async () => {
    const {token, id} = await login()
    
    const newProject = {
      title: 'A new project',
      dueDate: new Date(Date.now())
    }
    const projectsAtStart = await helper.projectsInDB()

    await api
      .post(`/api/projects`)
      .set('Authorization', token)
      .send(newProject)
      .expect(200)

    const projectsAtEnd = await helper.projectsInDB()
    const projectTitles = projectsAtEnd.map(p => p.title)
    expect(projectTitles).toContain('A new project')
    expect(projectsAtEnd).toHaveLength(projectsAtStart.length + 1)
  })
  test('fails when token is missing ', async () => {
    
    const newProject = {
      title: 'Project added by non-existent user', 
      dueDate: new Date(Date.now())
    }
    const projectsAtStart = await helper.projectsInDB()

    await api
      .post(`/api/projects`)
      .set('Authorization', 'bearer ')
      .send(newProject)
      .expect(401)

    const projectsAtEnd = await helper.projectsInDB()
    const projectTitles = projectsAtEnd.map(p => p.title)
    expect(projectTitles).not.toContain('Project added by non-existent user')
    expect(projectsAtEnd).toHaveLength(projectsAtStart.length)
  })
})

describe('updating a project ', () =>{
  test('succeeds with valid data when the owner sends a request', async () => {
    const {token, id} = await login()
    
    const [ aProject ] = (await Project.find({user: id})).map(p => p.toJSON())
    const updateProject = {
      ...aProject,
      dueDate: new Date(2020,12,31), 
    }
    const projectsAtStart = await helper.projectsInDB()

    await api
      .put(`/api/projects/${aProject.id}`)
      .set('Authorization', token)
      .send(updateProject)
      .expect(200)

    const projectsAtEnd = await helper.projectsInDB()
    const updatedProject = projectsAtEnd.find(p => p.id === aProject.id)
    expect(projectsAtEnd).toHaveLength(projectsAtStart.length)
    expect(updatedProject.dueDate).toEqual(new Date(2020,12,31))
  })
  test('fails when another user requests it', async() =>{
    
    const [ aProject] = (await Project.find({})).map(p => p.toJSON())

    const updatedProject = {
      ...aProject,
      title: 'Trying to update another users project'
    }

    const { username, password } = await helper.createUnauthorisedUser()

    const response = await api
    .post('/api/login')
    .send({ username, password })
    .expect(200)
    
    const token = `bearer ${response.body.token}`

    const projectsAtStart = await helper.projectsInDB()

    await api
      .put(`/api/projects/${aProject.id}`)
      .set('Authorization', token)
      .send(updatedProject)
      .expect(401)

    const projectsAtEnd = await helper.projectsInDB()

    expect(projectsAtStart).toEqual(projectsAtEnd)

  })
  test('fails when title is missing', async () => {
    const {token, id} = await login()
    
    const [ aProject] = (await Project.find({user: id})).map(p => p.toJSON())
    const updateProject = {
      ...aProject,
      title: '', 
    }
    const projectsAtStart = await helper.projectsInDB()

    await api
      .put(`/api/notes/${aProject.id}`)
      .set('Authorization', token)
      .send(updateProject)
      .expect(304)

    const projectsAtEnd = await helper.projectsInDB()
    const projectTitles = projectsAtEnd.map(p => p.title)
    expect(projectTitles).not.toContain('')
    expect(projectsAtEnd).toHaveLength(projectsAtStart.length)
  })
})

describe('deleting a project ', () =>{
  test('succeeds when the owner sends a request', async () => {
    const {token, id} = await login()
    
    const [ aProject] = (await Project.find({user: id})).map(p => p.toJSON())
   
    const projectsAtStart = await helper.projectsInDB()

    await api
      .delete(`/api/projects/${aProject.id}`)
      .set('Authorization', token)
      .expect(204)

    const projectsAtEnd = await helper.projectsInDB()
    const projectIds = projectsAtEnd.map(p => p.id)
    expect(projectIds).not.toContain(aProject.id)
    expect(projectsAtEnd).toHaveLength(projectsAtStart.length - 1)
  })
  test('fails when another user sends a request', async () => {
    const [ aProject] = (await Project.find({})).map(project => project.toJSON())

    const { username, password } = await helper.createUnauthorisedUser()

    const response = await api
    .post('/api/login')
    .send({ username, password })
    .expect(200)
    
    const token = `bearer ${response.body.token}`

    const projectsAtStart = await helper.projectsInDB()

    await api
      .delete(`/api/projects/${aProject.id}`)
      .set('Authorization', token)
      .expect(401)

    const projectsAtEnd = await helper.projectsInDB()

    expect(projectsAtStart).toHaveLength(projectsAtEnd.length)

  })
  test('succeeds when there are cards and notes which belong to that project', async() => {
    const {token, id} = await login()
    
    const [ aProject] = (await Project.find({user: id})).map(p => p.toJSON())

    //This is a dirty update for testing purposes, normally the project would also have a list of
    //all the cards, but since it is a deletion test, ok to ignore this.
    await Card.updateMany({user: id},{project: aProject.id})
    await Note.updateMany({user: id},{project: aProject.id})
   
    const projectsAtStart = await helper.projectsInDB()
    const cardsWithProjectBefore = await Card.find({project: aProject.id})
    const notesWithProjectBefore = await Note.find({project: aProject.id})
    const cardsAtStart = await helper.cardsInDB()
    const notesAtStart = await helper.notesInDB()

    await api
      .delete(`/api/projects/${aProject.id}`)
      .set('Authorization', token)
      .expect(204)

    const projectsAtEnd = await helper.projectsInDB()
    const projectIds = projectsAtEnd.map(p => p.id)
    const cardsWithProjectAfter = await Card.find({project: aProject.id})
    const notesWithProjectAfter = await Note.find({project: aProject.id})
    const cardsAtEnd = await helper.cardsInDB()
    const notesAtEnd = await helper.notesInDB()
    expect(projectIds).not.toContain(aProject.id)
    expect(projectsAtEnd).toHaveLength(projectsAtStart.length - 1)
    expect(cardsWithProjectBefore).not.toHaveLength(0)
    expect(cardsWithProjectAfter).toHaveLength(0)
    expect(notesWithProjectBefore).not.toHaveLength(0)
    expect(notesWithProjectAfter).toHaveLength(0)
    expect(cardsAtEnd).toHaveLength(cardsAtStart.length)
    expect(notesAtEnd).toHaveLength(notesAtStart.length)
  })
})

describe('adding a new note succeeds', () => {
  test('when it is added to a card', async () => {
    const {token, id} = await login()
    
    const [ aCard ] = (await Card.find({user: id})).map(card => card.toJSON())
    const newNote = {
      content: 'Note added for testing', 
      title: 'A new note',
      card: aCard.id,
      project: aCard.project,
      label: 'Testing'
    }
    const notesAtStart = await helper.notesInDB()

    await api
      .post(`/api/notes`)
      .set('Authorization', token)
      .send(newNote)
      .expect(200)

    const notesAtEnd = await helper.notesInDB()
    const cardsAtEnd = await helper.cardsInDB()
    const notesOnCard = cardsAtEnd.find(c => c.id === aCard.id).notes
    const noteTitles = notesAtEnd.map(note => note.title)
    expect(noteTitles).toContain('A new note')
    expect(notesAtEnd).toHaveLength(notesAtStart.length + 1)
    const createdNote = notesAtEnd.find(n => n.title === 'A new note')
    expect(notesOnCard.toString()).toContain(createdNote.id.toString())
  })
  test('when it is not added on any card', async () => {
    const { token } = await login()
    
    const newNote = {
      content: 'Note added for testing', 
      title: 'A new note, not associated with any card',
      label: 'Testing'
    }
    const notesAtStart = await helper.notesInDB()

    await api
      .post(`/api/notes`)
      .set('Authorization', token)
      .send(newNote)
      .expect(200)

    const notesAtEnd = await helper.notesInDB()
    const noteTitles = notesAtEnd.map(note => note.title)
    expect(noteTitles).toContain('A new note, not associated with any card')
    expect(notesAtEnd).toHaveLength(notesAtStart.length + 1)
  })
})

describe('updating a note ', () =>{
  test('succeeds with valid data when the owner sends a request', async () => {
    const {token, id} = await login()
    
    const [ aCard ] = (await Card.find({user: id})).map(card => card.toJSON())
    const [ aNote] = (await Note.find({user: id})).map(note => note.toJSON())
    const updatedNote = {
      ...aNote,
      content: 'Update the contents of the note and add it to a card', 
      card: aCard.id,
      project: aCard.project,
    }
    const notesAtStart = await helper.notesInDB()

    await api
      .put(`/api/notes/${aNote.id}`)
      .set('Authorization', token)
      .send(updatedNote)
      .expect(200)

    const notesAtEnd = await helper.notesInDB()
    const cardsAtEnd = await helper.cardsInDB()
    const notesOnCard = cardsAtEnd.find(c => c.id === aCard.id).notes
    const notesContents = notesAtEnd.map(note => note.content)
    expect(notesContents).toContain('Update the contents of the note and add it to a card')
    expect(notesAtEnd).toHaveLength(notesAtStart.length)
    const createdNote = notesAtEnd.find(n => n.content === 'Update the contents of the note and add it to a card')
    expect(notesOnCard.toString()).toContain(createdNote.id.toString())
  })
  test('fails when another user requests it', async() =>{
    
    const [ aNote] = (await Note.find({})).map(note => note.toJSON())

    const updatedNote = {
      ...aNote,
      content: 'Trying to update another users note'
    }

    const { username, password } = await helper.createUnauthorisedUser()

    const response = await api
    .post('/api/login')
    .send({ username, password })
    .expect(200)
    
    const token = `bearer ${response.body.token}`

    const notesAtStart = await helper.notesInDB()

    await api
      .put(`/api/notes/${aNote.id}`)
      .set('Authorization', token)
      .send(updatedNote)
      .expect(401)

    const notesAtEnd = await helper.notesInDB()

    expect(notesAtStart).toEqual(notesAtEnd)

  })
  test('fails when content is missing', async () => {
    const {token, id} = await login()
    
    const [ aNote] = (await Note.find({user: id})).map(note => note.toJSON())
    const updatedNote = {
      ...aNote,
      content: '', 
    }
    const notesAtStart = await helper.notesInDB()

    await api
      .put(`/api/notes/${aNote.id}`)
      .set('Authorization', token)
      .send(updatedNote)
      .expect(304)

    const notesAtEnd = await helper.notesInDB()
    const notesContents = notesAtEnd.map(note => note.content)
    expect(notesContents).not.toContain('')
    expect(notesAtEnd).toHaveLength(notesAtStart.length)
  })
})

describe('deleting a note ', () =>{
  test('succeeds when the owner sends a request', async () => {
    const {token, id} = await login()
    
    const [ aNote] = (await Note.find({user: id})).map(note => note.toJSON())
   
    const notesAtStart = await helper.notesInDB()

    await api
      .delete(`/api/notes/${aNote.id}`)
      .set('Authorization', token)
      .expect(204)

    const notesAtEnd = await helper.notesInDB()
    const noteIds = notesAtEnd.map(note => note.id)
    expect(noteIds).not.toContain(aNote.id)
    expect(notesAtEnd).toHaveLength(notesAtStart.length - 1)
  })
  test('fails when another user sends a request', async () => {
    const [ aNote] = (await Note.find({})).map(note => note.toJSON())

    const { username, password } = await helper.createUnauthorisedUser()

    const response = await api
    .post('/api/login')
    .send({ username, password })
    .expect(200)
    
    const token = `bearer ${response.body.token}`

    const notesAtStart = await helper.notesInDB()

    await api
      .delete(`/api/notes/${aNote.id}`)
      .set('Authorization', token)
      .expect(401)

    const notesAtEnd = await helper.notesInDB()

    expect(notesAtStart).toHaveLength(notesAtEnd.length)

  })
})

describe('when there is initially one user in db', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('shhhhhhh', 10)
    const user = new User({ username: 'root@admin.com', passwordHash, firstName: 'Super', lastName: 'User' })

    await user.save()
  })
  test('creation succeeds with a fresh valid username', async () => {
    const usersAtStart = await helper.usersInDB()

    const newUser = {
      username: 'nroar@email.com',
      firstName: 'Nivedita R',
      lastName: 'Rao',
      password: 'password',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDB()
    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    expect(usernames).toContain(newUser.username)
  })
  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDB()

    const newUser = {
      username: 'root@admin.com',
      firstName: 'Super',
      lastName: 'Man',
      password: 'something',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('email is already registered. Would you like to login?')

    const usersAtEnd = await helper.usersInDB()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })
  test('creation fails with proper statuscode and message if username is missing', async () => {
    const usersAtStart = await helper.usersInDB()
    const newUser = {
      name: 'Anonymous',
      password: 'password',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('`username` is required.')

    const usersAtEnd = await helper.usersInDB()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })

  test('creation fails with proper statuscode and message if password is missing', async () => {
    const usersAtStart = await helper.usersInDB()
    const newUser = {
      username: 'forgetmenot@email.com',
      firstName: 'Forgot',
      lastName: 'Password'
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('password is required')

    const usersAtEnd = await helper.usersInDB()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })
  test('creation fails with proper statuscode and message if password is less than 8 characters', async () => {
    const usersAtStart = await helper.usersInDB()
    const newUser = {
      username: 'Short@sweet.com',
      firstName: 'Short',
      lastName: 'Hand',
      password: 'minimum',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('password must have a minimum length of 8')

    const usersAtEnd = await helper.usersInDB()
    expect(usersAtEnd).toHaveLength(usersAtStart.length)
  })


})
