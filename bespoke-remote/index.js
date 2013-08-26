var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    websockets = require('socket.io'),
    inject = require('connect-injector');

module.exports = function(options) {
  var config = _.extend({ port: 8001, remoteUrl: 'remote', }, options),
      // Need to start an extra server since grunt-connect does not pass on the
      // "server" to the middleware section of the Gruntfile task :(
      // Forking and pull request might be an option ;-)
      io = config.socketio || websockets.listen(config.port)
      // Option for users to extend the provided actions.
      user_sockets = config.userSockets || function() {},
      // Users can set their own remote control URL ("security by obscurity")
      remote_url_rex = RegExp('^\/'+config.remoteUrl+'($|\/)'),
      remotePluginSnippet = ',remote: true',
      bespokeJsRegExp = /(bespoke\.((horizontal|vertical)\.)?from)/;

  io.set('browser client minification', true)
  io.set('browser client cache', true)
  io.set('browser client gzip', true)

  io.sockets.on('connection', function(socket) {
    socket.emit('bespoke-remote.established')

    // Note: event names can be anything inside the string
    //       socket.on('jump to next slide', ...)
    socket.on('bespoke-remote.next', function(data, ack) {
      io.sockets.emit('bespoke-remote.next')
    })
    socket.on('bespoke-remote.prev', function(data, ack) {
      io.sockets.emit('bespoke-remote.prev')
    })
    socket.on('bespoke-remote.ready', function(data, ack) {
      io.sockets.emit('bespoke-remote.connected');
    })

    user_sockets(socket, io)
  })

  function socketIOSnippet() {
    return [
      '<!-- socket.io websockets -->',
      '<script src="http://localhost:' + config.port + '/socket.io/socket.io.v0.9.15.js"></script>',
      ].join('\n')
  }

  function receiverSnippet(isScriptBlock) {
    // NOTE: Would it make sense to use the async read method?
    //       (or cache this) -- definitely, I'll get to this later ;) -MD
    return [
      isScriptBlock ? '<script>' : '',
      interpolate(fs.readFileSync(path.join(__dirname, 'remote.js'), 'utf8')),
      isScriptBlock ? '</script>' : '',
    ].join('\n')
  }

  function interpolate(content) {
    return _.template(content, {
      port: config.port
    });
  }

  function isCleanBespokeJS(res, data) {
    return /application\/javascript/.test(res.getHeader('content-type')) &&
      bespokeJsRegExp.test(data.toString()) &&
      data.toString().indexOf(remotePluginSnippet) === -1 &&
      data.toString().indexOf(socketIOSnippet()) === -1;
  }

  function isCleanHTML(res, data) {
    return /text\/html/.test(res.getHeader('content-type')) &&
      data.toString().indexOf(receiverSnippet()) === -1;
  }

  var injector = inject(function when(req, res) {
    // This used to be conditional using 'isCleanFooBar' fns, but any response
    // after the first response would be blank. Fix later, or leave it?
    return true;
  }, function converter(callback, data, req, res) {
    if (remote_url_rex.test(req.url)) {
      var remote_html = interpolate(fs.readFileSync(path.join(__dirname, 'remote.html'), 'utf8'))
      // Override push so we don't give connect-livereload a change to manipulate
      // the html.
      res.push = function(chunk) { res.data = remote_html }
      // Write our html and end this response cycle
      res.end(remote_html)
      // No next() because nothing shall be run after us, ceiling cat spoketh!
      return
    }

    if (isCleanHTML(res, data)) {
      callback(null, data.toString().replace(/(<script)/, socketIOSnippet() + '$1'));
    } else if (isCleanBespokeJS(res, data)) {
      callback(null, data.toString()
        .replace(bespokeJsRegExp, receiverSnippet() + '$1')
        .replace(/(bespoke\.((horizontal|vertical)\.)?from\(['"].+['"],\s?{[\Wa-z]+)(})/, '$1' + remotePluginSnippet + '$4')
      );
    } else {
      callback(null, data);
    }
  });

  return function bespokeRemoteMiddleware(req, res, next) {
    if (remote_url_rex.test(req.url)) {
      var remote_html = interpolate(fs.readFileSync(path.join(__dirname, 'remote.html'), 'utf8'))
      // Override push so we don't give connect-livereload a change to manipulate
      // the html.
      res.push = function(chunk) { res.data = remote_html }
      // Write our html and end this response cycle
      res.end(remote_html)
      // No next() because nothing shall be run after us, ceiling cat spoketh!
      return
    } else {
      injector(req, res, next);
    }
  };
};
