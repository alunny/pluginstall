// copyright (c) 2012 Andrew Lunny, Adobe Systems
var fs = require('fs'),
    path = require('path'),
    et = require('elementtree'),
    platforms = require('./platforms'),
    platformModules = {

        'wp7': require('./platforms/wp7')
    }


    /*
        'android': require('./platforms/android'),
        'ios': require('./platforms/ios'),
    */



// check arguments and resolve file paths
exports.init = function (platform, projectPath, pluginPath) {
    var projectPath = fs.realpathSync(projectPath),
        pluginPath = fs.realpathSync(pluginPath);

    if (platforms.indexOf(platform) < 0)
        throw { name: "Platform Error", message: platform + " not supported" }

    return {
        platform:    platform,
        projectPath: projectPath,
        pluginPath:  pluginPath
    }
}

exports.parseXml = function (config) {
    var xmlPath     = path.join(config.pluginPath, 'plugin.xml');
    

    var xmlText     = fs.readFileSync(xmlPath, 'utf-8');

    var xmlDoc      = new et.ElementTree(et.XML(xmlText));
    var rootAttr    = xmlDoc._root.attrib;
    
    var supportedPlatforms = xmlDoc.findall('platform').map(function (platform) {
        return platform.attrib['name'];
    });

    return {
        xmlDoc: xmlDoc,
        _id: rootAttr['id'],
        version: rootAttr['version'],
        platforms: supportedPlatforms
    };
}

// should move all asset and source files into the right places
// and then edit all appropriate files (manifests and the like)
exports.installPlugin = function (config, plugin, callback) {
    // get the platform-specific fn
    var platformInstall = platformModules[config.platform].installPlugin;

    return platformInstall(config, plugin, callback)
}
