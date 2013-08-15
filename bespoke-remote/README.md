# bespoke-remote prototype

Hey mate, this is the folder of the remote control prototype.

Install
-------

To use this prototype, just copy the `bespoke-remote` to your project and
change the `middleware` section in your Gruntfile to this:

```javascript
    middleware: function(connect, options) {
      return [
        require('connect-livereload')({
          port: config.watch.public.options.livereload
        }),
        require('./bespoke-remote')(),  // remote control
        connect.static(options.base)
      ];
    }
```

index.js
--------

Contains the `connect` middleware. Currently it injects `socket.io` and the `receiver.js`.

Current options:

* `socketio`  
  Default: creates it's own http and `socket.io` server  
  An already configured `socket.io` instance.
* `userSockets`  
  A function (receiving socket.io's `socket` as first and the complete `io`
  object as second argument). Here you may define your own callbacks for
  websocket events.

### Using userSockets ###

Let's say you want to extend the `nextSlide` event and add a new event for the
server to handle.

```javascript
    var otherActions = function(socket, io) {
      socket.off('nextSlide')  // Turn off default nextSlide handler.
      socket.on('nextSlide', function(data, ack) {
        io.sockets.emit('nextSlide')  // Broadcast to every connected client.
        console.log('Successfully sent out "nextSlide" event')
      })

      socket.on('speakOutLoud', function(data, ack) {
        var exec = require('child_process').exec
        // Assuming you are on OSX, this will make your laptop speak.
        exec("say -v 'Hello, this is your Bespoke Presentation speaking. Listen up!")
      })
    }
```

Now that you have your custom handling written down, simply pass it on to the
middleware.

```javascript
    middleware: function(connect, options) {
      return [
        require('connect-livereload')({
          port: config.watch.public.options.livereload
        }),
        require('./bespoke-remote')({userSockets: otherActions}),  // Customized remote control.
        connect.static(options.base)
      ];
    }
```

receiver.js
-----------

Well, obviously the receiver for the remote control. `receiver` is a normal bespoke plugin.

Current options:

* `socketUrl`  
  Default: `http://localhost:8001/`  
  The URL `socket.io` should connect to.
