var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    websockets = require('socket.io')


module.exports = function bespokeRemote(options) {
  var config = _.extend({ port: 8001 }, options),
      // Need to start an extra server since grunt-connect does not pass on the
      // "server" to the middleware section of the Gruntfile task :(
      // Forking and pull request might be an option ;-)
      io = config.socketio || websockets.listen(config.port)
      // Option for users to extend the provided actions.
      user_sockets = config.userSockets || function() {}

  io.set('browser client minification', true)
  io.set('browser client cache', true)
  io.set('browser client gzip', true)

  io.sockets.on('connection', function(socket) {
    socket.emit('established')

    // Note: event names can be anything inside the string
    //       socket.on('jump to next slide', ...)
    socket.on('nextSlide', function(data, ack) {
      io.sockets.emit('nextSlide')
    })
    socket.on('prevSlide', function(data, ack) {
      io.sockets.emit('prevSlide')
    })
    socket.on('remoteReady', function(data, ack) {
      io.sockets.emit('remoteConnected');
    })

    user_sockets(socket, io)
  })

  // Nearly everything down from here is shamelessly adapted from connect-livereload
  function interpolate(content) {
    return _.template(content, {
      port: config.port
    });
  }
  function socketIOSnippet() {
    return [
      '<!-- socket.io websockets -->',
      '<script src="http://localhost:' + config.port + '/socket.io/socket.io.v0.9.15.js"></script>',
      ].join('\n')
  }
  function receiverSnippet() {
    // NOTE: Would it make sense to use the async read method?
    //       (or cache this) -- definitely, I'll get to this later ;) -MD
    return [
      '<script>',
      interpolate(fs.readFileSync(path.join(__dirname, 'receiver.js'), 'utf8')),
      '</script>'
    ].join('\n')
  }

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
    // Request URL ending with '/' or .html, or not containing a '.', is hopefully.. well.. HTML
    return /(\/|\.html)$/.test(req.url) || !/\./.test(req.url);
  }

  return function bespokeRemoteMiddleware(req, res, next) {
    var writeHead = res.writeHead,
        write = res.write,
        end = res.end

    if (!isHTML(req)) {
      return next()
    }

    if (/^\/remote($|\/)/.test(req.url)) {
      var remote_html = interpolate(fs.readFileSync(path.join(__dirname, 'remote.html'), 'utf8'))
      // Override push so we don't give connect-livereload a change to manipulate
      // the html.
      res.push = function(chunk) { res.data = remote_html }
      // Write our html and end this response cycle
      res.end(remote_html)
      // No next() because nothing shall be run after us, ceiling cat spoketh!
      return
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
          // Add socket.io *before* bespoke itself, after bespoke add the receiver plugin
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

    // If we redefine this we add the body a second time.
    // This happesn due to connect-livereload already overriding this.
    // TODO: would be cool to find out if this was already overwritten, if yes
    //       by who and then act on that.
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
