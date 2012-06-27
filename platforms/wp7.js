var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    et = require('elementtree'),
    nCallbacks = require('../util/ncallbacks'),
    asyncCopy = require('../util/asyncCopy'),
    assetsDir = 'www'; // relative path to project's web assets

 exports.installPlugin = function (config, plugin, callback) {

 	// otherwise the parser no-likey the xmlns in the root
 	et.register_namespace("csproj", "http://schemas.microsoft.com/developer/msbuild/2003");

 	// look for assets in the plugin 
    var assets = plugin.xmlDoc.findall('./asset');
    var platformTag = plugin.xmlDoc.find('./platform[@name="wp7"]');
    var sourceFiles = platformTag.findall('./source-file');
    var projectChanges = platformTag.findall('./config-file[@target=".csproj"]');

    var callbackCount = assets.length + sourceFiles.length + projectChanges.length;
    var endCallback = nCallbacks(callbackCount, callback);

    // move asset files
    assets.forEach(function (asset) {
        var srcPath = path.resolve(config.pluginPath, asset.attrib['src']);
        var targetPath = path.resolve(config.projectPath, assetsDir, asset.attrib['target']);
        asyncCopy(srcPath, targetPath, endCallback);
    });

    // move source files
    sourceFiles.forEach(function (sourceFile) {
        var srcDir = path.resolve(config.projectPath, sourceFile.attrib['target-dir'])

        mkdirp(srcDir, function (err) {
            var srcFile = path.resolve(config.pluginPath,  sourceFile.attrib['src']);
            var destFile = path.resolve(srcDir, path.basename(sourceFile.attrib['src']));
            asyncCopy(srcFile, destFile, endCallback);
        });
    });

    // add the new files to the project file
    fs.readdir(config.projectPath,function(err,files) {

		for(var n=0; n<files.length;n++) {
			//files[n] == "TestPluggr.xml")//
 			if( path.extname(files[n]) == ".csproj")
 			{
 				var projPath = path.join(config.projectPath,files[n]);

 				projectChanges.forEach(function (configNode) {

					var projDoc = new et.ElementTree(et.XML(fs.readFileSync(projPath,'utf8')));
            		var child = configNode.find('*');

            		projDoc.getroot().append(child);

            		var newDocStr = projDoc.write(); // this should really be called toString(), but whatevs
            		// the escaping in it sux
            		newDocStr = newDocStr.split("&#xA;").join("\n");
            		newDocStr = newDocStr.split("&#xD;").join("\r");
            		// save the mod'd file
            		fs.writeFile(projPath, newDocStr, function (err) {
            			if (err) { 
            				endCallback(err);
            			}
            			endCallback();
        			});
 				})
 				break;
 			}
 		}
    });
 }  




 	
 



