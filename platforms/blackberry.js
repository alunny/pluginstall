var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    et = require('elementtree'),
    zip = require('adm-zip'),
    otherZip = require('node-native-zip'),
    nCallbacks = require('../util/ncallbacks'),
    asyncCopy = require('../util/asyncCopy'),
    syncCopy = require('../util/syncCopy'),
    rmrf = require('../util/rmrf'),
    assetsDir = 'www', // relative path to project's web assets
    jarDir = 'www/ext', // relative path to cordova jar
    counter = {};


exports.installPlugin = function (config, plugin, callback) {
    // look for assets in the plugin 
    var assets = plugin.xmlDoc.findall('./asset'),
        platformTag = plugin.xmlDoc.find('./platform[@name="blackberry"]'),
        sourceFiles = platformTag.findall('./source-file'),
        pluginsChanges = platformTag.findall('./config-file[@target="www/plugins.xml"]'),
        manifestChanges = platformTag.findall('./config-file[@target="www/config.xml"]'),

        callbackCount = assets.length + pluginsChanges.length + manifestChanges.length + 1, // the 1 is for the create jar archive async call
        endCallback = nCallbacks(callbackCount, callback)

    // move asset files
    assets.forEach(function (asset) {
        var srcPath = path.resolve(
                        config.pluginPath,
                        asset.attrib['src']);

        var targetPath = path.resolve(
                            config.projectPath,
                            assetsDir,
                            asset.attrib['target']);

        asyncCopy(srcPath, targetPath, endCallback);
    });


    // move source files
    // first extract the jar
    var extPath = path.resolve(config.projectPath, jarDir);
    var jarFile = fs.readdirSync(extPath)[0];
    var jarPath = path.resolve(config.projectPath, jarDir, jarFile);
    var jar = new zip(jarPath);
    jar.extractAllTo(extPath, true);
    fs.unlinkSync(jarPath); // delete old jar
    // copy the source files in
    sourceFiles.forEach(function (sourceFile) {
        var srcDir = path.resolve(config.projectPath,
                                sourceFile.attrib['target-dir'])
        mkdirp.sync(srcDir);
        var srcFile = path.resolve(config.pluginPath,
                                    sourceFile.attrib['src']),
            destFile = path.resolve(srcDir,
                                    path.basename(sourceFile.attrib['src']));

        syncCopy(srcFile, destFile);

    })

    // finally jar the shizzle back up
    // recursively collect all files to be jar'ed up
    var archive = new otherZip();
    var archiveFiles = [];
    var libContents = fs.readdirSync(extPath);

    function recursivelyAddFiles(dir) {
        var list = fs.readdirSync(dir);
        for (var i = 0; i < list.length; i++) {
          var filename = path.join(dir, list[i]);
          var stat = fs.statSync(filename);

          if (filename == "." || filename == "..") {
              // pass these files
          } else if (stat.isDirectory()) {
              // recurse
              recursivelyAddFiles(filename);
          } else {
              // push to array
              archiveFiles.push(filename);
          }
        }
    }

    libContents.forEach(function(sourcePath) {
        var fullPath = path.resolve(extPath, sourcePath);
        var stat = fs.statSync(fullPath);
        if (stat.isFile()) {
            archiveFiles.push(fullPath);
        } else {
            recursivelyAddFiles(fullPath);
        }
    });

    archiveFiles = archiveFiles.map(function(f) { 
      return {
        name:f.replace(extPath + '/', ''),
        path:f
      };
    });

    // write out the jar file
    archive.addFiles(archiveFiles, function (err) {
        if (err) return endCallback(err);

        var buff = archive.toBuffer();

        fs.writeFile(jarPath, buff, function () {
            // clean up
            libContents.forEach(function(sourcePath) {
                var fullPath = path.resolve(extPath, sourcePath);
                var stat = fs.statSync(fullPath);
                if (stat.isFile()) {
                    fs.unlinkSync(fullPath);
                } else {
                    rmrf(fullPath);
                }
                endCallback();
            });
        });
    });

    // edit plugins.xml
    pluginsChanges.forEach(function (configNode) {
        var pluginsPath = path.resolve(config.projectPath, 'www/plugins.xml'),
            pluginsDoc = readAsETSync(pluginsPath),
            selector = configNode.attrib["parent"],
            child = configNode.find('*');

        if (addToDoc(pluginsDoc, child, selector)) {
            fs.writeFile(pluginsPath, pluginsDoc.write(), function (err) {
                if (err) endCallback(err);

                endCallback();
            });
        } else {
            endCallback('failed to add node to plugins.xml');
        }
    });

    // edit config.xml
    manifestChanges.forEach(function (configNode) {
        var manifestPath = path.resolve(config.projectPath, 'www/config.xml'),
            manifestDoc  = readAsETSync(manifestPath),
            selector = configNode.attrib["parent"],
            child = configNode.find('*');

        if (addToDoc(manifestDoc, child, selector)) {
            fs.writeFile(manifestPath, manifestDoc.write(), function (err) {
                if (err) endCallback(err);

                endCallback();
            });
        } else {
            endCallback('failed to add node to config.xml')
        }
    })
}

// adds node to doc at selector
function addToDoc(doc, node, selector) {
    var ROOT = /^\/([^\/]*)/,
        ABSOLUTE = /^\/([^\/]*)\/(.*)/,
        parent, tagName, subSelector;

    // handle absolute selector (which elementtree doesn't like)
    if (ROOT.test(selector)) {
        tagName = selector.match(ROOT)[1];
        if (tagName === doc._root.tag) {
            parent = doc._root;

            // could be an absolute path, but not selecting the root
            if (ABSOLUTE.test(selector)) {
                subSelector = selector.match(ABSOLUTE)[2];
                parent = parent.find(subSelector)
            }
        } else {
            return false;
        }
    } else {
        parent = doc.find(selector)
    }

    parent.append(node);
    return true;
}

function readAsETSync(filename) {
    var contents = fs.readFileSync(filename, 'utf-8');

    return new et.ElementTree(et.XML(contents));
}

