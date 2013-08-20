+function(bespoke, window, document, undefined) {
  bespoke.plugins.remote = function(deck, options) {
    var options = {} || options,
        socket = io.connect(options.socketUrl || 'http://localhost:<%= port %>/'),
        indicator = document.createElement('div');

    indicator.className = 'bespoke-remote-indicator';
    deck.parent.appendChild(indicator);

    socket.on('bespoke-remote.established', function() {
      console.info('Connection with server established.')
      console.info('Awaiting paired remote control...')
      indicator.classList.add('bespoke-remote-indicator-established');
    })
    socket.on('bespoke-remote.connected', function() {
      console.info('Paired with remote control. Happy RCing!')
      indicator.classList.add('bespoke-remote-indicator-connected');
    })

    socket.on('bespoke-remote.next', deck.next);
    socket.on('bespoke-remote.prev', deck.prev);
  }
}(bespoke, this, document)
