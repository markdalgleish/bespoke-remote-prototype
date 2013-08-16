+function(bespoke, window, document, undefined) {
  bespoke.plugins.receiver = function(deck, options) {
    var options = {} || options,
        socket = io.connect(options.socketUrl || 'http://localhost:<%= port %>/');


    socket.on('bespoke-remote.established', function() {
      console.info('Connection with server established.')
      console.info('Awaiting paired remote control...')
    })
    socket.on('bespoke-remote.connected', function() {
      console.info('Paired with remote control. Happy RCing!')
    })

    socket.on('bespoke-remote.next', deck.next);
    socket.on('bespoke-remote.prev', deck.prev);
  }
}(bespoke, this, document)
