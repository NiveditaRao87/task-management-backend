const projectsRouter = require('express').Router()
const Project = require('../models/project')
const User = require('../models/user')
const Card = require('../models/card')
const Note = require('../models/note')

projectsRouter.get('/', async (request, response) => {
    
    const projects = await 
    Project
      .find({user: request.decodedToken.id}).populate('cards', {timeSpent: 1, title : 1, dueDate: 1})
      .populate('user', { username: 1, name: 1 })
    
    response.json(projects)
})

projectsRouter.get('/:id', async (request, response) => {
    
  const project = await 
  Project
    .findById(request.params.id).populate('cards', {timeSpent: 1, title : 1, dueDate: 1})
    .populate('user', { username: 1, name: 1, id: 1 })

  if(project.user.id.toString() !== request.decodedToken.id){
    return response.status(401).json({ error: 'Only the owner may view the project'})
  }
  
  response.json(projects)
})

projectsRouter.post('/', async (request, response) => {
    const body = request.body

    const project = new Project({
      title: body.title.trim(),
      dueDate: body.dueDate,
      user: request.decodedToken.id
    })

    if(!project.title){
      return response.status(400).send({
        error: 'title should be present'
      })
    }

    const user = await User.findById(request.decodedToken.id)
    if(!user){
      return response.status(401).json({ error: 'non-existent user'})
    }

    const savedProject = await project.save()
    response.json(savedProject)
  })

projectsRouter.put('/:id', async (request, response) => {
    const project = request.body

    if(!project.title){
      //treat absence of title as no change in stead of error
      return response.status(304).end()
    }
    const { user } = await Project.findById(request.params.id)

    if(!user){
      return response.status(401).json({ error: 'non-existent user'})
    }

    if(user.toString() !== request.decodedToken.id){
      return response.status(401).json({ error: 'unauthorised user'})
    }

    const updatedProject = await Project.findByIdAndUpdate(request.params.id, project, { new: true })
    response.json(updatedProject.toJSON())
})

projectsRouter.delete('/:id', async (request,response) => {
  const user = await User.findById(request.decodedToken.id)
  const project = await Project.findById(request.params.id)

  if (project.user.toString() !== user.id.toString()) {
    return response.status(401).json({ error: 'only the owner can delete the project' })
  }
  
  await Card.updateMany({project: project.id},{project: null})
  await Note.updateMany({project: project.id},{project: null})

  await project.remove()

  response.status(204).end()

})

module.exports = projectsRouter
