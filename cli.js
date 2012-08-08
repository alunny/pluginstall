#!/usr/bin/env node
var pluginstall = require('./pluginstall'),
    platform, 
    projectDir, 
    pluginDir,
    config, 
    plugin, 
    package;

var args = process.argv.slice();
var firstArgIndex = 0;

// note: windows expands node to the full node.exe path
if (args[0] == "node" || args[0].indexOf("node.exe") > 0) {
    firstArgIndex++;
}

//args.shift() // skip "cli.js"
firstArgIndex++;

//console.log("args.length = " + args.length + " : " + firstArgIndex + " " + args);

if (args.length == firstArgIndex) {
    console.log('Usage: pluginstall [platform] [project directory] [plugin directory]');
} 
else if (args[firstArgIndex] === '-v') {
    package = require('./package');
    console.log('pluginstall version ' + package.version);
} 
else {
    platform = args[firstArgIndex];
    projectDir = args[firstArgIndex+1];
    pluginDir = args[firstArgIndex+2];

    // console.log("platform = " + platform);
    // console.log("projectDir = " + projectDir);
    // console.log("pluginDir = " + pluginDir);

    config = pluginstall.init(platform, projectDir, pluginDir);

    plugin = pluginstall.parseXml(config);

    pluginstall.installPlugin(config, plugin, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log('plugin installed for platform::' + platform);
        }
    });
}
