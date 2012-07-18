    // core
var fs = require('fs'),
    path = require('path'),

    // libs
    rimraf = require('rimraf'),
    et = require('elementtree'),

    // parts of this lib
    pluginstall = require('../pluginstall'),
    blackberry = require('../platforms/blackberry'),
    nCallbacks = require('../util/ncallbacks'),

    // setup
    config = {
        platform: 'blackberry',
        projectPath: fs.realpathSync('test/project/blackberry'),
        pluginPath: fs.realpathSync('test/plugin')
    },
    plugin = pluginstall.parseXml(config),
    assetsDir = path.resolve(config.projectPath, 'www'),
    jarDir = path.resolve(assetsDir, 'ext'),
    jsPath = path.resolve(assetsDir, 'childbrowser.js'),
    assetPath = path.resolve(assetsDir, 'childbrowser'),
    jarPath = path.resolve(jarDir, ''),
    pluginsXml = path.resolve(assetsDir, 'plugins.xml');

function moveProjFile(origFile, dest, callback) {
    var src = path.resolve(assetsDir, origFile);
    if (!callback) {
        callback = dest;
        dest = src.replace('.orig', '');
    } else {
        dest = path.resolve(assetsDir, dest);
    }

    fs.createReadStream(src)
        .pipe(fs.createWriteStream(dest))
        .on('close', callback);
}

// global setup
exports.setUp = function (callback) {
    var ASYNC_OPS = 7,
        end = nCallbacks(ASYNC_OPS, callback);

    // remove JS (that should be moved)
    fs.stat(jsPath, function (err, stats) {
        if (stats) {
            fs.unlinkSync(jsPath)
        }

        end(null);
    });

    // remove web assets (www/childbrowser)
    rimraf(assetPath, function () {
        end(null)
    });

    // copy in original plugins.xml
    moveProjFile('plugins.orig.xml', end)

    // copy in original corodva.jar
    moveProjFile('cordova.orig.jar', 'ext/cordova.jar', end)

    // clean out jar contents that may have been extracted
    rimraf(path.resolve(jarDir, 'com'), function() {
        end(null);
    });
    rimraf(path.resolve(jarDir, 'META-INF'), function() {
        end(null);
    });
    var dummy = path.resolve(jarDir, 'dummy.java');
    fs.stat(dummy, function (err, stats) {
        if (stats) {
            fs.unlinkSync(dummy)
        }

        end(null);
    });

}

exports['should move the js file'] = function (test) {
    blackberry.installPlugin(config, plugin, function (err) {
        test.ok(fs.statSync(jsPath))
        test.done();
    })
}

exports['should move the directory'] = function (test) {
    blackberry.installPlugin(config, plugin, function (err) {
        var assets = fs.statSync(assetPath);

        test.ok(assets.isDirectory())
        test.ok(fs.statSync(assetPath + '/image.jpg'))
        test.done();
    })
}

exports['should add ChildBrowser to plugins.xml'] = function (test) {
    blackberry.installPlugin(config, plugin, function (err) {
        var pluginsTxt = fs.readFileSync(pluginsXml, 'utf-8'),
            pluginsDoc = new et.ElementTree(et.XML(pluginsTxt)),
            expected = 'plugin[@name="ChildBrowser"]' +
                        '[@value="com.phonegap.plugins.childbrowser.ChildBrowser"]';

        test.ok(pluginsDoc.find(expected));
        test.done();
    })
}
