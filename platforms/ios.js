var path = require('path'),
    mkdirp = require('mkdirp'),
    fs = require('fs'),
    glob = require('glob'),
    xcode = require('xcode'),
    plist = require('plist'),
    nCallbacks = require('../util/ncallbacks'),
    asyncCopy = require('../util/asyncCopy'),
    assetsDir = 'www'; // relative path to project's web assets

exports.installPlugin = function (config, plugin, callback) {
    function prepare(then) {
        var store = {},
            end = nCallbacks(2, function (err) {
                if (err) throw err;

                else
                    then(store.pbxPath, store.xcodeproj, store.plistPath,
                        store.plist, store.pluginsDir);
            });

        // grab and parse pbxproj
        glob(config.projectPath + '/**/project.pbxproj', function (err, files) {
            if (!files.length) throw "does not appear to be an xcode project";

            store.pbxPath = files[0];
            store.xcodeproj = xcode.project(files[0]);
            store.xcodeproj.parse(end);
        });

        // grab and parse plist file
        glob(config.projectPath + '/**/{PhoneGap,Cordova}.plist', function (err, files) {
            if (!files.length) throw "does not appear to be a PhoneGap project";

            files = files.filter(function (val) {
                return !(/^build\//.test(val))
            });

            store.plistPath = files[0];
            store.pluginsDir = path.resolve(files[0], '..', 'Plugins');

            plist.parseFile(store.plistPath, function (err, obj) {
                store.plist = obj;
                end();
            });
        });
    }

    function getRelativeDir(file) {
        var targetDir = file.attrib['target-dir'],
            preserveDirs = file.attrib['preserve-dirs'];

        if (preserveDirs && preserveDirs.toLowerCase() == 'true') {
            return path.dirname(file.attrib['src']);
        } else if (targetDir) {
            return targetDir;
        } else {
            return '';
        }
    }

    prepare(function (pbxPath, xcodeproj, plistPath, plistObj, pluginsDir) {
        var assets = plugin.xmlDoc.findall('./asset'),
            hosts = plugin.xmlDoc.findall('./access'),
            platformTag = plugin.xmlDoc.find('./platform[@name="ios"]'),
            sourceFiles = platformTag.findall('./source-file'),
            headerFiles = platformTag.findall('./header-file'),
            resourceFiles = platformTag.findall('./resource-file'),
            frameworks = platformTag.findall('./framework'),
            plistEle = platformTag.find('./plugins-plist'),

            callbackCount = 0, end;

        // callback for every file/dir to add
        callbackCount += assets.length;
        callbackCount += sourceFiles.length;
        callbackCount += headerFiles.length;
        callbackCount += resourceFiles.length;
        // adding framework is sync, so don't add that
        callbackCount++; // for writing the plist file
        callbackCount++; // for writing the pbxproj file

        end = nCallbacks(callbackCount, callback);

        // move asset files into www
        assets.forEach(function (asset) {
            var srcPath = path.resolve(
                            config.pluginPath, asset.attrib['src']);

            var targetPath = path.resolve(
                                config.projectPath,
                                assetsDir, asset.attrib['target']);

            asyncCopy(srcPath, targetPath, end);
        });

        // move native files (source/header/resource)
        sourceFiles.forEach(function (sourceFile) {
            var src = sourceFile.attrib['src'],
                srcFile = path.resolve(config.pluginPath, 'src/ios', src),
                targetDir = path.resolve(pluginsDir, getRelativeDir(sourceFile)),
                destFile = path.resolve(targetDir, path.basename(src)),
                targetFile = 'Plugins/' + path.relative(pluginsDir, destFile);

            if (/[.]a$/.test(src)) {
                xcodeproj.addStaticLibrary(targetFile, { plugin: true });
            } else {
                xcodeproj.addSourceFile(targetFile);
            }

            mkdirp(targetDir, function (err) {
                asyncCopy(srcFile, destFile, end);
            })
        })

        headerFiles.forEach(function (headerFile) {
            var src = headerFile.attrib['src'],
                srcFile = path.resolve(config.pluginPath, 'src/ios', src),
                targetDir = path.resolve(pluginsDir, getRelativeDir(headerFile)),
                destFile = path.resolve(targetDir, path.basename(src));

            xcodeproj.addHeaderFile('Plugins/' + path.relative(pluginsDir, destFile));

            mkdirp(targetDir, function (err) {
                asyncCopy(srcFile, destFile, end);
            })
        })

        resourceFiles.forEach(function (resource) {
            var src = resource.attrib['src'],
                srcFile = path.resolve(config.pluginPath, 'src/ios', src),
                destFile = path.resolve(pluginsDir, path.basename(src));

            xcodeproj.addResourceFile('Plugins/' + path.basename(src),
                                        { plugin: true });

            asyncCopy(srcFile, destFile, end);
        })

        frameworks.forEach(function (framework) {
            var src = framework.attrib['src'],
                weak = framework.attrib['weak'];
            
            var opt = { weak: (weak && weak.toLowerCase() == 'true') };
            xcodeproj.addFramework(src, opt);
        });

        // weirdness with node-plist and top-level <plist>
        if (plistObj[0]) {
            plistObj = plistObj[0];
        }

        // add hosts to whitelist (ExternalHosts) in plist
        hosts.forEach(function(host) {
            plistObj.ExternalHosts.push(host.attrib['origin']);
        });
        
        // add plugin to plist
        plistObj.Plugins[plistEle.attrib['key']] = plistEle.attrib['string'];
        
        // write out plist
        fs.writeFile(plistPath, plist.stringify(plistObj), end);

        // write out xcodeproj file
        fs.writeFile(pbxPath, xcodeproj.writeSync(), end);
    });
}
