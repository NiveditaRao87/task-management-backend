const notesRouter = require('express').Router()
const Card = require('../models/card')
const User = require('../models/user')
const Note = require('../models/note')

notesRouter.get('/', async (request, response) => {
    
    const notes = await 
    Note
      .find({user: request.decodedToken.id})
      .populate('cards', {id: 1, title : 1, project: 1})
      .populate('user', { username: 1, name: 1 })
      .populate('project',{ title: 1, id: 1})
    
    response.json(notes)
})

notesRouter.post('/', async (request, response) => {
    const body = request.body

    const note = new Note({
      title: body.title.trim(),
      content: body.content.trim(),
      label: body.label,
      project: body.project,
      card: body.card,
      colour: body.colour,
      date: new Date(),
      user: request.decodedToken.id
    })

    if(!note.content){
      return response.status(400).send({
        error: 'content should be present'
      })
    }

    const user = await User.findById(request.decodedToken.id)
    if(!user){
      return response.status(401).json({ error: 'non-existent user'})
    }

    const card = await Card.findById(note.card)

    const savedNote = await note.save()

    if(card){
        card.notes = card.notes.concat(savedNote.id)
        await card.save()
    }
    
    response.json(savedNote)
  })

notesRouter.put('/:id', async (request, response) => {
    const note = request.body

    if(!note.content){
      //treat absence of content as no change in stead of error
      return response.status(304).end()
    }
    const oldNote = await Note.findById(request.params.id)
    const user = await User.findById(request.decodedToken.id)

    if (oldNote.user.toString() !== user.id.toString()) {
      return response.status(401).json({ error: 'only the owner can update the note' })
    }

    if(oldNote.card !== note.card){
        if(oldNote.card){
            const card = await Card.findById(oldNote.card)
            card.notes = card.notes.filter(n => n.id === oldNote.id)
            await card.save()
        }
        if(note.card){
            const card = await Card.findById(note.card)
            card.notes = [...card.notes, note.id]
            await card.save()
        }
    }

    const updatedNote = await Note.findByIdAndUpdate(request.params.id, note, { new: true })
    response.json(updatedNote.toJSON())
})

notesRouter.delete('/:id', async (request,response) => {
  const user = await User.findById(request.decodedToken.id)
  const note = await Note.findById(request.params.id)

  if(!note){
    return response.status(404).json({ error: 'note not found'}) 
  }

  if (note.user.toString() !== user.id.toString()) {
    return response.status(401).json({ error: 'only the owner can delete the note' })
  }

  await note.remove()

  if(note.card){
    return response.status(204).end()
  }

  const card = await Card.findById(note.card)

  if(card){
      card.notes = card.notes.filter(n => n.id !== note.id)
      await Card.findByIdAndUpdate(note.card)
  }

  response.status(204).end()

})

module.exports = notesRouter
