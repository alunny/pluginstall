#!/usr/bin/env node
var pluginstall = require('./pluginstall'),
    platform, projectDir, pluginDir, variables,
    config, plugin, package, valid_key=/^[\w-_]+$/;;

if (process.argv[0] == 'node') process.argv.shift()

process.argv.shift() // skip "cli.js"

if (process.argv.length == 0) {
    console.log('Usage: pluginstall platform projectdirectory plugindirectory [key=value]...')
} else if (process.argv[0] === '-v') {
    package = require('./package')
    console.log('pluginstall version ' + package.version + ' (PGB)')
} else {
    platform = process.argv.shift()
    projectDir = process.argv.shift()
    pluginDir = process.argv.shift()
    variables = {}
    
    for (i in process.argv)
    {
      var args = process.argv[i].split('=')
      if (args.length < 2)
      {
        console.log('Usage: pluginstall platform projectdirectory plugindirectory [key=value]...')
        return;
      }
      key = args.shift().toUpperCase()
      if (!valid_key.test(key))
      {
        console.log('Error: key must be [a-z0-9_-]\nUsage: pluginstall platform projectdirectory plugindirectory [key=value]...')
        return;
      }
      variables[key] = args.join("=")
    }
    config = pluginstall.init(platform, projectDir, pluginDir, variables)
    plugin = pluginstall.parseXml(config)

    pluginstall.installPlugin(config, plugin, function (err) {
        if (err) {
            console.error(err)
        } else {
            console.log('plugin installed')
        }
    });
}
