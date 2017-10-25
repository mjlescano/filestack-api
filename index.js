const express = require('express')
const safeRequire = require('safe-require')
const batchPromises = require('batch-promises')
const config = require('dos-config')
const filestack = require('./filestack')

const app = express()

app.get('/', function (req, res) {
  res.set('Content-Type', 'text/html')
  res.write(`<h1>Filestack API</h1>`)
  res.write('<ul>')
  res.write(`<li><a href="/files/:handle"><code>/files/:handle</code></a> <small>Preview the file saved on Filestack with <code>:handle</code></small></li>`)
  res.write(`<li><a href="/files/:handle/remove"><code>/files/:handle/remove</code></a> <small>Remove the file from Filestack with <code>:handle</code></small></li>`)
  res.write(`<li><a href="/documents/:url/info"><code>/documents/:url/info</code></a> <small>Get the metadata info of a doc located at <code>:url</code></small></li>`)
  res.write(`<li><a href="/documents/:url/:page"><code>/documents/:url/:page</code></a> <small>Generate previews for the file located at <code>:url</code> of a specific <code>:page</code></small></li>`)
  res.write(`<li><a href="/data/remove"><code>/data/remove</code></a> <small>Bulk remove files listed on <code>.data/remove.json</code></small></li>`)
  res.write('</ul>')
  res.end()
})

app.get('/files/:handle', function (req, res, next) {
  res.set('Content-Type', 'text/html')
  
  const fileHandle = req.params.handle
  
  if (!fileHandle || fileHandle === ':handle') {
    res.write(`<p>Please, complete the <code>:handle</code> param on the url bar ☝️</p>`)
    res.write(`<p><a href="/"><code>&larr; Go Back</code></a></p>`)
    res.end()
    return
  }
  
  filestack.get(fileHandle).then((uri) => {
    res.write(`<h2>Filestack File: <small>${fileHandle}</small></h2>`)
    res.write(`<div><small><code><a target="_blank" href="${uri}">${uri}</a></code></small></div>`)
    res.write('<br />')
    res.write(`<img src="${uri}"/>`)
    res.write('<br />')
  }).then(() => {
    res.write('<p><a href="/"><code>&larr; Go Back</code></a></p>')
    res.end()
  }).catch((err) => {
    next(err)
  })
})

app.get('/files/:handle/remove', function (req, res, next) {
  res.set('Content-Type', 'text/html')
  
  const fileHandle = req.params.handle
  
  if (!fileHandle || fileHandle === ':handle') {
    res.write(`<p>Please, complete the <code>:handle</code> param on the url bar ☝️</p>`)
    res.write(`<p><a href="/"><code>&larr; Go Back</code></a></p>`)
    res.end()
    return
  }
  
  filestack.remove(fileHandle).then((info) => {
    res.write(`<h2>Remove File: <small>${fileHandle}</small></h2>`)
    res.write('<ul>')
    res.write(`<li>Removed ${fileHandle}</li>`)
    res.write('</ul>')
    return info
  }).then((info) => {
    res.write('<p><a href="/"><code>&larr; Go Back</code></a></p>')
    res.write('<br />')
    res.write('<p>Response:</p>')
    res.write('<code>')
    res.write(JSON.stringify(info, null, 2))
    res.write('</code>')
    res.end()
  }).catch((err) => {
    next(err)
  })
})

app.get('/documents/:url/info', function (req, res, next) {
  res.set('Content-Type', 'text/html')

  if (req.params.url === ':url') {
    res.write('<p>Please, complete the <code>:url</code> param on the url bar ☝️</p>')
    res.write('<p><a href="/"><code>&larr; Go Back</code></a></p>')
    res.end()
    return
  }
  
  filestack.getDocumentInfo(req.params.url).then((info) => {
    res.write('<code>')
    res.write(JSON.stringify(info, null, 2))
    res.write('</code>')
    
    if (info.pagesCount) {
      res.write(`<p>Generate page previews:&nbsp;`)
      
      for (let page = 1; page <= info.pagesCount; page++) {
        res.write(`<small><code>&nbsp;<a href="/documents/${encodeURIComponent(req.params.url)}/${page}">${page}</a>&nbsp;</code></small>`)
      }
      
      res.write('</p>')
    }
    
    res.write('<p><a href="/"><code>&larr; Go Back</code></a></p>')
    res.end()
  }).catch((err) => {
    next(err)
  })
})

app.get('/documents/:url/:page', function (req, res, next) {
  res.set('Content-Type', 'text/html')

  if (req.params.url === ':url') {
    res.write(`<p>Please, complete the <code>:url</code> param on the url bar ☝️</p>`)
    res.write(`<p><a href="/"><code>&larr; Go Back</code></a></p>`)
    res.end()
    return
  }
  
  if (!req.params.page) req.params.page = 1
  
  const options = {}
  
  if (req.query.basePath) options.basePath = req.query.basePath
  
  filestack.generateDocumentPage(req.params.url, req.params.page, options).then((image) => {
    res.write('<code>')
    res.write(JSON.stringify(image, null, 2))
    res.write('</code>')
    
    res.write('<p><a href="/"><code>&larr; Go Back</code></a></p>')
    res.end()
  }).catch((err) => {
    next(err)
  })
})

app.get('/data/remove', function (req, res, next) {
  const dataToRemove = safeRequire('./.data/remove.json') || []
  
  res.set('Content-Type', 'text/html')
  
  if (dataToRemove.length > 0) res.write('<ul>')
  
  batchPromises(5, dataToRemove, (fileHandle) => {
    return filestack.remove(fileHandle).then((info) => {
      res.write(`<li>Removed ${fileHandle}</li>`)
      return info
    })
  }).then(() => {
    if (dataToRemove.length > 0) res.write('</ul>')
    res.write('<p>All done.</p>')
    res.write('<p><a href="/"><code>&larr; Go Back</code></a></p>')
    res.end()
  }).catch((err) => {
    next(err)
  })
})

app.listen(config.port, function () {
  console.log(`App running.`, Math.random())
})