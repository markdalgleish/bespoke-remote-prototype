// Generated on 2013-08-15 using generator-bespoke v0.1.1
var os = require('os'),
    http = require('http'),
    _ = require('lodash')


module.exports = function(grunt) {
  // Let's check if we can find any local-network-wide IP address for us.
  // If so, then we will use that IP to open the browser at this address.
  // This way, if we have the /remote enabled, one can simply use f.e.
  // Chrome's cross-device tab sync to open the /remote on the mobile device.
  function get_local_ips() {
    var interfaces = os.networkInterfaces(),
        addresses_ipv4 = [],
        addresses_ipv6 = []

    _.forEach(interfaces, function(addresses) {
      _.forEach(addresses, function(address) {
        if (address.internal) {
          return
        }
        if (address.family === 'IPv4') {
          addresses_ipv4.push(address.address)
        } else {
          addresses_ipv6.push(address.address)
        }
      })
    })
    return { ipv4: addresses_ipv4, ipv6: addresses_ipv6, }
  }

  var local_ips = get_local_ips(),
      host_address = 'localhost'

  if (local_ips.ipv4.length === 1 && local_ips.ipv4[0]) {
    host_address = local_ips.ipv4[0]
  }


  // Grunt tasks
  var config = {
    clean: {
      public: 'public/**/*'
    },
    jade: {
      src: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: '**/*.jade',
          dest: 'public/',
          ext: '.html'
        }]
      }
    },
    stylus: {
      src: {
        files: [{
          expand: true,
          cwd: 'src/styles/',
          src: '**/*.styl',
          dest: 'public/styles/',
          ext: '.css'
        }],
        options: {
          compress: false
        }
      }
    },
    coffee: {
      src: {
        files: [{
          expand: true,
          cwd: 'src/scripts/',
          src: '**/*.coffee',
          dest: 'public/scripts/',
          ext: '.js'
        }]
      }
    },
    copy: {
      src: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: [
            '**/*',
            '!<%= jade.src.files[0].src %>',
            '!<%= stylus.src.files[0].src %>',
            '!<%= coffee.src.files[0].src %>'
          ],
          dest: 'public/'
        }]
      }
    },
    watch: {
      jade: {
        files: '<%= jade.src.files[0].cwd + jade.src.files[0].src %>',
        tasks: 'jade'
      },
      stylus: {
        files: '<%= stylus.src.files[0].cwd + stylus.src.files[0].src %>',
        tasks: 'stylus'
      },
      coffee: {
        files: '<%= coffee.src.files[0].cwd + coffee.src.files[0].src %>',
        tasks: 'coffee'
      },
      copy: {
        files: [
          '<%= copy.src.files[0].cwd + copy.src.files[0].src[0] %>',
          '!<%= jade.src.files[0].cwd + jade.src.files[0].src %>',
          '!<%= stylus.src.files[0].cwd + stylus.src.files[0].src %>',
          '!<%= coffee.src.files[0].cwd + coffee.src.files[0].src %>'
        ],
        tasks: 'copy:src'
      },
      public: {
        files: [
          'public/**/*',
          '!public/bower_components/**/*'
        ],
        options: {
          livereload: 35729
        }
      }
    },
    connect: {
      server: {
        options: {
          port: 8000,
          hostname: '0.0.0.0',
          base: 'public',
          keepalive: true,
          middleware: function(connect, options) {
            return (!grunt.option('remote') ? [] : [
                require('./bespoke-remote')({
                  hostname: host_address,
                  port: 8001,
                  html: {
                    route: /^\/(index.html)?$/,
                    path: './public/',
                    file: 'index.html'
                  },
                  js: {
                    route: /^\/scripts\/main\.js$/,
                    path: './public/scripts/',
                    file: 'main.js'
                  }
                })
              ]).concat([
                require('connect-livereload')({
                  port: config.watch.public.options.livereload
                }),
                connect.static(options.base)
              ])
          }
        }
      }
    },
    open: {
      server: {
        path: 'http://' + host_address + ':<%= connect.server.options.port %>'
      },
      remote: {
        path: 'http://' + host_address + ':<%= connect.server.options.port %>/remote'
      }
    },
    concurrent: {
      compile: {
        tasks: [
          'jade',
          'stylus',
          'coffee',
          'copy'
        ],
        options: {
            logConcurrentOutput: false
        }
      },
      server: {
        tasks: [
          'connect',
          'open' + (grunt.option('remote') ? '' : ':server'),
          'watch:jade',
          'watch:stylus',
          'watch:coffee',
          'watch:copy',
          'watch:public',
        ],
        options: {
            logConcurrentOutput: true
        }
      }
    },
    'gh-pages': {
      public: {
        options: {
          base: 'public',
          message: 'Generated by generator-bespoke'
        },
        src: '**/*'
      }
    }
  }

  grunt.initConfig(config)

  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-connect')
  grunt.loadNpmTasks('grunt-contrib-jade')
  grunt.loadNpmTasks('grunt-contrib-stylus')
  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-open')
  grunt.loadNpmTasks('grunt-gh-pages')
  grunt.loadNpmTasks('grunt-concurrent')

  grunt.registerTask('default', ['clean', 'concurrent:compile'])
  grunt.registerTask('server', ['default', 'concurrent:server'])
  grunt.registerTask('deploy', ['default', 'gh-pages:public'])
}
