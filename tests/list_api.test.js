const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const List = require('../models/list')
const Card = require('../models/card')

const api = supertest(app)

beforeEach(async () => {
    await List.deleteMany({})
    await Card.deleteMany({})
  
    await helper.createInitialLists()
    await helper.createInitialCards() //Lists should have already been created before this can be called
})

describe('when there are initially some lists saved', () => {
  test('lists are returned as json', async () => {
    await api
      .get('/api/lists')
      .expect(200)
      .expect('Content-Type', /application\/json/)
   })
   test('all lists are returned', async () => {
    const listsInDB = await helper.listsInDB()
    const response = await api.get('/api/lists')

    expect(response.body).toHaveLength(listsInDB.length)
  })  
  test('a specific list is within the returned lists', async () => {
    const response = await api.get('/api/lists')

    const titles = response.body.map(r => r.title)
    expect(titles).toContain('To dos')
  })
  test('a specific card on a list is within the returned lists', async () => {
    //find the list of any one of the cards
    const cardsInDB = await helper.cardsInDB()
    await helper.listsInDB()
    
    const response = await api.get('/api/lists')
    const list = response.body.find(l => l.id.toString() === cardsInDB[0].list.toString())
    const cards = list.cards.map(card =>card.id)
    expect(cards).toContain(cardsInDB[0].id)
  })
})

describe('viewing a specific card', () => {
  test('succeeds with a valid id', async () => {
    const cardsAtStart = await helper.cardsInDB()

    const cardToView = cardsAtStart[0]

    const resultCard = await api
      .get(`/api/cards/${cardToView.id}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    console.log(typeof cardToView.list, typeof resultCard.body.list)
    expect(resultCard.body).toEqual({...cardToView,list: cardToView.list.toString()})
  })

  test('fails with statuscode 404 if card does not exist', async () => {
    const validNonexistingId = await helper.nonExistingId()

    console.log(validNonexistingId)

    await api
      .get(`/api/cards/${validNonexistingId}`)
      .expect(404)
  })

  test('fails with statuscode 400 id is invalid', async () => {
    const invalidId = '5a3d5da59070081a82a3445'

    await api
      .get(`/api/cards/${invalidId}`)
      .expect(400)
  })
})

describe('creation of a new list',() =>{
    test('succeeds with valid data', async () => {
        const listsAtStart = await helper.listsInDB()
        const newList = {
            title: 'Parked'
        }

        await api
          .post('/api/lists')
          .send(newList)
          .expect(200)
          .expect('Content-Type', /application\/json/)

        const listsAtEnd = await helper.listsInDB()
        expect(listsAtEnd).toHaveLength(listsAtStart.length + 1)

        const titles = (await listsAtEnd).map(r => r.title)
        expect(titles).toContain('Parked')
        expect(listsAtEnd.find(l => l.title === 'Parked').creationDate).toBeDefined()

    } )
    test('fails with a status code 400 if title is empty', async () => {
        
        const listsAtStart = await helper.listsInDB()
        
        const newList = {
            title: ' '
        }

        await api
          .post('/api/lists')
          .send(newList)
          .expect(400)

        const listsAtEnd = await helper.listsInDB()

        expect(listsAtEnd).toHaveLength(listsAtStart.length)
    })
})

describe('creation of a new card on a list',() =>{
    test('succeeds with valid data', async () => {
        
        const listsInDB = await helper.listsInDB()
        const cardsAtStart = await helper.cardsInDB()
        
        const newCard = {
            title: 'Task Management App',
            list: listsInDB[0].id
        }

        await api
          .post('/api/cards')
          .send(newCard)
          .expect(200)
          .expect('Content-Type', /application\/json/)

        const cardsAtEnd = await helper.cardsInDB()
        expect(cardsAtEnd).toHaveLength(cardsAtStart.length + 1)

        const titles = (await cardsAtEnd).map(r => r.title)
        expect(titles).toContain('Task Management App')
        const createdCard = cardsAtEnd.find(c => c.title === 'Task Management App')
        expect(createdCard.creationDate).toBeDefined()
        expect(createdCard.list.toString()).toBe(listsInDB[0].id.toString())
        //The list is also updated with the card id
        const listsAtEnd = await helper.listsInDB()
        expect(listsAtEnd[0].cards.toString()).toContain(createdCard.id)
    } )
    test('fails with a status code 400 if title is empty', async () => {
        
        const listsInDB = await helper.listsInDB()
        const cardsAtStart = await helper.cardsInDB()

        const newCard = {
            title: '',
            list: listsInDB[0].id
        }

        const { body } = await api
          .post('/api/cards')
          .send(newCard)
          .expect(400)

        const cardsAtEnd = await helper.cardsInDB()

        expect(cardsAtEnd).toHaveLength(cardsAtStart.length)
        expect(body.error).toBe('title should be present')
    })
    test('fails with a status code 400 if list is not present', async () => {
        
        const cardsAtStart = await helper.cardsInDB()
        
        const newCard = {
            title: 'FCC projects '
        }

        const { body } = await api
          .post('/api/cards')
          .send(newCard)
          .expect(400)

        const cardsAtEnd = await helper.cardsInDB()

        expect(cardsAtEnd).toHaveLength(cardsAtStart.length)
        expect(body.error).toContain('Card validation failed: list: Path `list` is required')
    })

})

describe('updation of a list',() => {
  test('succeeds when the title is updated', async () => {
    const [ aList ] = await helper.listsInDB()
    const editList = {...aList, title: 'Update the list title to this'}

    await api
      .put(`/api/lists/${aList.id}`)
      .send(editList)
      .expect(200)

    const listsAtEnd = await helper.listsInDB()
    const editedList = listsAtEnd.find(l => l.id === aList.id)
    expect(editedList.title).toBe(editList.title)
  })
  test.only('fails when the title is not present', async () => {
    const [ aList ] = await helper.listsInDB()
    const editList = {...aList, title: ''}

    await api
      .put(`/api/lists/${aList.id}`)
      .send(editList)
      .expect(400)

    const listsAtEnd = await helper.listsInDB()
    const editedList = listsAtEnd.find(l => l.id === aList.id)
    expect(editedList.title).not.toBe('')
  })
})

describe('updation of a card',() => {
  test('succeeds when the title is updated', async () => {
    const [ aCard ] = await helper.cardsInDB()
    const editCard = {...aCard, title: 'Update the card title to this'}

    await api
      .put(`/api/cards/${aCard.id}`)
      .send(editCard)
      .expect(200)

    const cardsAtEnd = await helper.cardsInDB()
    const editedCard = cardsAtEnd.find(c => c.id === aCard.id)
    expect(editedCard.title).toBe(editCard.title)
  })
  test('fails when the title is not present', async () => {
    const [ aCard ] = await helper.cardsInDB()
    const editCard = {...aCard, title: ''}

    await api
      .put(`/api/cards/${aCard.id}`)
      .send(editCard)
      .expect(400)

    const cardsAtEnd = await helper.cardsInDB()
    const editedCard = cardsAtEnd.find(c => c.id === aCard.id)
    expect(editedCard.title).not.toBe('')
  })
})

afterAll(() => {
  mongoose.connection.close()
})