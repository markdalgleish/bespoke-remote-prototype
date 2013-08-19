/* grunt-findip
 *
 * Find your network and external IPs (v4 + v6)
 */
'use strict';

var os = require('os'),
    http = require('http'),
    _ = require('lodash')


module.exports = function(grunt) {
  grunt.registerTask('findip', 'Find your network and external ip', function() {
    var done = this.async(),
        interfaces = os.networkInterfaces(),
        addresses_ipv4 = [],
        addresses_ipv6 = []

    _.forEach(interfaces, function(addresses) {
      _.forEach(addresses, function(address) {
        if (address.internal) return
        if (address.family === 'IPv4') addresses_ipv4.push(address.address)
        else addresses_ipv6.push(address.address)
      })
    })
    grunt.log.subhead('Your Network IPs (v4) are:', addresses_ipv4)
    grunt.log.subhead('Your Network IPs (v6) are:', addresses_ipv6)

    var req = http.get('http://icanhazip.com/', function(res) {
      var data = ''
      res.on('data', function(chunk) { data += chunk })
      res.on('end', function() { grunt.log.subhead('Your External IP is:', data); done(); })
      res.on('error', done)
    })
  })
}
