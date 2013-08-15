+function(bespoke, window, document, undefined) {
  bespoke.plugins.receiver = function(deck, options) {
    var options = {} || options,
        socket = io.connect(options.socketUrl || 'http://localhost:<%= port %>/');


    socket.on('established', function() {
      console.info('Connection with server established.')
      console.info('Awaiting paired remote control...')
    })
    socket.on('remoteConnected', function() {
      console.info('Paired with remote control. Happy RCing!')
    })

    socket.on('nextSlide', deck.next);
    socket.on('prevSlide', deck.prev);
  }
}(bespoke, this, document)
