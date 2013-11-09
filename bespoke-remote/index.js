var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    websockets = require('socket.io'),
    assetManager = require('connect-assetmanager'),
    esprima = require('esprima'),
    esquery = require('esquery'),
    escodegen = require('escodegen');

module.exports = function(options) {
  var config = _.extend({ hostname: 'localhost', port: 8001, remoteUrl: 'remote', }, options),
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

  io.enable('browser client minification')
  io.enable('browser client cache')
  io.enable('browser client etag')
  io.enable('browser client gzip')

  io.set('heartbeat timeout', 30)
  io.set('heartbeat interval', 15)
  io.set('origins', 'http://*:*')

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
    socket.on('bespoke-remote.reset', function(data, ack) {
      io.sockets.emit('bespoke-remote.reset');
    })
    socket.on('bespoke-remote.notes', function(data, ack) {
      io.sockets.emit('bespoke-remote.notes', data);
    })

    user_sockets(socket, io)
  })

  function socketIOSnippet() {
    return [
      '<!-- socket.io websockets -->',
      '<script src="http://' + config.hostname + ':' + config.port + '/socket.io/socket.io.v0.9.15.js"></script>',
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
      hostname: config.hostname,
      port: config.port,
    });
  }

  function modifyHTML(src) {
    return src.replace(/(<script)/, socketIOSnippet() + '$1');
  }

  function modifyJS(src) {
    var ast = esprima.parse(src);
      esquery(ast, '[expression.callee.object.object.name=bespoke] > [arguments]').forEach(function(callExpression) {
        var args = callExpression.arguments,
          secondArg = callExpression.arguments[1],
          pluginsObjectWithRemote = esprima.parse('({remote:true})').body[0].expression,
          remotePluginProperty = pluginsObjectWithRemote.properties[0];

        if (args.length === 2 && _.isObject(secondArg) && _.isArray(secondArg.properties)) {
          secondArg.properties.push(remotePluginProperty);
        } else if (args.length === 1) {
          args.push(pluginsObjectWithRemote);
        }
      });

      return escodegen.generate(ast, {
          format: {
            indent: {
              style: '  '
            }
          }
        }).replace(bespokeJsRegExp, receiverSnippet() + '$1');
  }

  var assetManagerMiddleware = assetManager({
    html: {
      route: options.html.route,
      path: options.html.path,
      dataType: 'html',
      files: [options.html.file],
      preManipulate: {
        '^': [
          function(file, path, index, isLast, callback) {
            callback(modifyHTML(file));
          }
        ]
      }
    },
    js: {
      route: options.js.route,
      path: options.js.path,
      dataType: 'javascript',
      files: [options.js.file],
      preManipulate: {
        '^': [
          function(file, path, index, isLast, callback) {
            callback(modifyJS(file));
          }
        ]
      }
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
      assetManagerMiddleware(req, res, next);
    }
  };
};
