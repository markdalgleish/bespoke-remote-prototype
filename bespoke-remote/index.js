var fs = require('fs'),
    path = require('path'),
    websockets = require('socket.io')


module.exports = function bespokeRemote(opts) {
  var opts = opts || {}
      // Need to start an extra server since grunt-connect does not pass on the
      // "server" to the middleware section of the Gruntfile task :(
      // Forking and pull request might be an option ;-)
      io = opts.socketio || websockets.listen(8001)
      // Option for users to extend the provided actions.
      user_sockets = opts.userSockets || function() {}

  io.set('browser client minification', true)
    io.set('browser client cache', true)
    io.set('browser client gzip', true)

    io.sockets.on('connection', function(socket) {
      socket.emit('established')

      socket.on('nextSlide', function(data, ack) {
        io.sockets.emit('nextSlide')
      })
      socket.on('prevSlide', function(data, ack) {
        io.sockets.emit('prevSlide')
      })

      user_sockets(socket, io)
    })

  function socketIOSnippet() {
    return [
      '<!-- socket.io websockets -->',
      '<script src="http://localhost:8001/socket.io/socket.io.v0.9.15.js"></script>',
      ].join('\n')
  }
  function receiverSnippet() {
    // NOTE: Would it make sense to use the async read method?
    //       (or cache this)
    return [
      '<script>',
      fs.readFileSync(path.join(__dirname, 'receiver.js'), 'utf8'),
      '</script>'
    ].join('\n')
  }

  // Shamelessly ripped and adapted from connect-livereload
  function bodyExists(body) {
    if (!body) return false
    return ~body.lastIndexOf('</body>')
  }
  function socketIOExists(body) {
    if (!body) return true
    // Leave off the version string since it might be possible that the
    // user already included a version.
    return ~body.lastIndexOf('/socket.io/socket.io')
  }
  function isHTML(req) {
    // Request URL ending with '/' or .html is hopefully.. well.. HTML
    return /(\/|\.html)$/.test(req.url)
  }

  return function bespokeRemoteMiddleware(req, res, next) {
    var writeHead = res.writeHead,
        write = res.write,
        end = res.end

    if (!isHTML(req)) {
      return next()
    }

    // Only redefine this if connect-livereload has not run before us.
    if (!res.push) {
      res.push = function(chunk) {
        res.data = (res.data || '') + chunk
      }
    }

    res.inject = res.write = function(string, encoding) {
      res.write = write
      if (string !== undefined) {
        var content = string instanceof Buffer ? string.toString(encoding) : string
        if ((bodyExists(content) || bodyExists(res.data)) &&
              !socketIOExists(content) &&
              (!res.data || !socketIOExists(res.data))) {
          res.push(content.replace(/<script.+bespoke(.min)?.js.+?>\s*<\/script>/, function(bespoke) {
            return socketIOSnippet() + bespoke + receiverSnippet()
          }))
          return true
        } else {
          return res.write(string, encoding)
        }
      }
      return true
    }

    // Only redefine this if connect-livereload has not run before us.
    // Also, if we would override this again, we would inject the whole
    // body twice.
    if (!res.end) {
      res.end = function(string, encoding) {
        res.writeHead = writeHead
        res.end = end
        var result = res.inject(string, encoding)
        if (!result) return res.end(string, encoding)
        if (res.data !== undefined && !res._header) {
          res.setHeader('content-length', Buffer.byteLength(res.data, encoding))
        }
        res.end(res.data, encoding)
      }
    }

    next()
  }
}
