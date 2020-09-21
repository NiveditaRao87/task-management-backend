const jwt = require('jsonwebtoken')

const tokenVerifier = (request, response, next) => {
    const authorisation = request.get('authorization')
    if(!authorisation || !authorisation.toLowerCase().startsWith('bearer ') || !authorisation.substring(7)){
        return response.status(401).json({ error: 'token missing' })
    }
    const token = authorisation.substring(7)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!decodedToken.id){
      return response.status(401).json({ error: 'token invalid' })
    }
    request.decodedToken = decodedToken
    next()
}

module.exports = tokenVerifier