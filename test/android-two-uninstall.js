// Test uninstallation on Cordova 2 project


var fs = require('fs')
  , path = require('path')
  , plist = require('plist')
  , xcode = require('xcode')
  , osenv = require('osenv')
  , shell = require('shelljs')
  , et = require('elementtree')
  , android = require(path.join(__dirname, '..', 'platforms', 'android'))

  , test_dir = path.join(osenv.tmpdir(), 'test_plugman')
  , test_project_dir = path.join(test_dir, 'projects', 'android_two')
  , test_plugin_dir = path.join(test_dir, 'plugins', 'ChildBrowser')
  , xml_path     = path.join(test_dir, 'plugins', 'ChildBrowser', 'plugin.xml')
  , xml_text, plugin_et;


exports.setUp = function(callback) {
    shell.mkdir('-p', test_dir);
    
    // copy the ios test project to a temp directory
    shell.cp('-r', path.join(__dirname, 'projects'), test_dir);

    // copy the ios test plugin to a temp directory
    shell.cp('-r', path.join(__dirname, 'plugins'), test_dir);

    // parse the plugin.xml into an elementtree object
    xml_text   = fs.readFileSync(xml_path, 'utf-8')
    plugin_et  = new et.ElementTree(et.XML(xml_text));

    callback();
}

exports.tearDown = function(callback) {
    // remove the temp files (projects and plugins)
    shell.rm('-rf', test_dir);
    callback();
}

exports['should remove the js file'] = function (test) {
    var jsPath = path.join(test_dir, 'projects', 'android_two', 'assets', 'www', 'childbrowser.js');

    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    android.handlePlugin('uninstall', test_project_dir, test_plugin_dir, plugin_et);

    test.ok(!fs.existsSync(jsPath));
    test.done();
}

exports['should remove the directory'] = function (test) {
    var assetPath = path.join(test_dir, 'projects', 'android_two', 'assets', 'www', 'childbrowser');

    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    test.ok(fs.existsSync(assetPath));

    android.handlePlugin('uninstall', test_project_dir, test_plugin_dir, plugin_et);
    test.ok(!fs.existsSync(assetPath));

    test.done();
}

exports['should remove the src file'] = function (test) {
    var javaPath = path.join(test_dir, 'projects', 'android_two', 'src', 'com', 'phonegap', 'plugins', 'childBrowser', 'ChildBrowser.java');
    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    test.ok(fs.statSync(javaPath));

    android.handlePlugin('uninstall', test_project_dir, test_plugin_dir, plugin_et);
    test.ok(fs.existsSync(path.resolve(test_dir + '/projects/android_two/src')));
    test.ok(!fs.existsSync(path.resolve(javaPath)));
    test.ok(!fs.existsSync(path.resolve(javaPath + '/..')));
    test.ok(!fs.existsSync(path.resolve(javaPath + '/../..')));
    test.ok(!fs.existsSync(path.resolve(javaPath + '/../../..')));
    test.ok(!fs.existsSync(path.resolve(javaPath + '/../../../..')));
    test.done();
}

exports['should not remove common package directories when two plugins share a package subname'] = function (test) {
    
    // setting up a DummyPlugin
    var dummy_plugin_dir = path.join(test_dir, 'plugins', 'DummyPlugin')
    var dummy_xml_path = path.join(test_dir, 'plugins', 'DummyPlugin', 'plugin.xml')
    dummy_plugin_et  = new et.ElementTree(et.XML(fs.readFileSync(dummy_xml_path, 'utf-8')));

    var javaPath = path.join(test_dir, 'projects', 'android_two', 'src', 'com', 'phonegap', 'plugins', 'childBrowser', 'ChildBrowser.java');

    // installing two plugins that share some common package directory structure
    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    android.handlePlugin('install', test_project_dir, dummy_plugin_dir, dummy_plugin_et);

    // uninstalling DummyPlugin should not delete existing ChildBrowser package dir structure
    android.handlePlugin('uninstall', test_project_dir, dummy_plugin_dir, dummy_plugin_et);
    
    var stat = fs.statSync(javaPath);
    test.ok(stat.isFile());

    test.done();
}

exports['should remove ChildBrowser from config.xml'] = function (test) {
    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    android.handlePlugin('uninstall', test_project_dir, test_plugin_dir, plugin_et);
    
    var pluginsXmlPath = path.join(test_dir, 'projects', 'android_two', 'res', 'xml', 'config.xml');
    var pluginsTxt = fs.readFileSync(pluginsXmlPath, 'utf-8'),
        pluginsDoc = new et.ElementTree(et.XML(pluginsTxt)),
        expected = 'plugins/plugin[@name="ChildBrowser"]' +
                    '[@value="com.phonegap.plugins.childBrowser.ChildBrowser"]';
    test.ok(!pluginsDoc.find(expected));
    test.done();
}

exports['should remove ChildBrowser from AndroidManifest.xml'] = function (test) {
    android.handlePlugin('install', test_project_dir, test_plugin_dir, plugin_et);
    android.handlePlugin('uninstall', test_project_dir, test_plugin_dir, plugin_et);

    var manifestPath = path.join(test_dir, 'projects', 'android_two', 'AndroidManifest.xml');
    var manifestTxt = fs.readFileSync(manifestPath, 'utf-8'),
        manifestDoc = new et.ElementTree(et.XML(manifestTxt)),
        activities = manifestDoc.findall('application/activity'), i;

    var found = false;
    for (i=0; i<activities.length; i++) {
        if ( activities[i].attrib['android:name'] === 'com.phonegap.plugins.childBrowser.ChildBrowser' ) {
            found = true;
            break;
        }
    }
    test.ok(!found);
    test.done();
}

exports['should not uninstall a plugin that is not installed'] = function (test) {
    var jsPath = path.join(test_dir, 'projects', 'android_two', 'assets', 'www', 'childbrowser.js');

    test.throws(function() {android.handlePlugin('uninstall', test_project_dir, test_plugin_dir, plugin_et);}, 
                /not installed/
               );

    test.done();
}
