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

Then open up your bespoke initialisation javascript and add tell it to run the
`remote` plugin:

```javascript
bespoke.horizontal.from('article', {
  bullets: 'li, .bullet',
  hash: true,
  state: true,
  remote: true  // <-- Here we go!
});
```

After this run your server, visit [http://localhost:8000/remote/](http://localhost:8000/remote/)
and control your bespoke deck.

index.js
--------

Contains the `connect` middleware. Currently it injects `socket.io` and the `remote.js`.

Current options:

* `socketio`  
  Default: creates it's own http and `socket.io` server  
  An already configured `socket.io` instance.
* `userSockets`  
  A function (receiving socket.io's `socket` as first and the complete `io`
  object as second argument). Here you may define your own callbacks for
  websocket events.
* `remoteUrl`  
  Default: `remote` (visiting [/remote/](http://localhost:8001/remote/) will get
  the remote control)  
  Set this to the URL you want the remote to be on. A simple and dumb "security
  by obscurity" approach. F.e. settings this to `ctrl128e12f` would make the
  remote accessible under [/ctrl128e12f/](http://localhost:80001/ctrl128e12f/).

### Using userSockets ###

Let's say you want to extend the `bespoke-remote.next` event and add a new event for the
server to handle.

```javascript
var otherActions = function(socket, io) {
  socket.off('bespoke-remote.next')  // Turn off default handler.
  socket.on('bespoke-remote.next', function(data, ack) {
    io.sockets.emit('bespoke-remote.next')  // Broadcast to every connected client.
    console.log('Successfully sent out "bespoke-remote.next" event')
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

remote.js
-----------

`remote` is a normal bespoke plugin that receives events sent from the remote server.

Current options:

* `socketUrl`  
  Default: `http://localhost:8001/`  
  The URL `socket.io` should connect to.

Dev Note
--------

In case you are messing around with the middleware and the http server is
starting to shutdown because of weird reasons (port already used etc.) this is
happening due to leftover processes. Just run:

```shell
ps aux | grep -i node | grep -v grep | awk '{print $2}' | xargs kill -9
```

This will kill *all* remaining `node.js` processes.
