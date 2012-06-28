// From https://github.com/c9/azure-packager-node/blob/master/folder.js

var NativeFs = require("fs");
var path = require("path");
var async = require("async");

/**
 * Mapping function on all files in a folder and it's subfolders
 * @param dir {string} Source directory
 * @param action {Function} Mapping function in the form of (path, stats, callback), where callback is Function(result)
 * @param callback {Function} Callback fired after all files have been processed with (err, aggregatedResults)
 */
module.exports = function mapAllFiles(dir, action, callback, concurrency) {
    var output = [];
    
    // create a queue object with concurrency 2
    var q = async.queue(function (filename, next) {
        NativeFs.stat(filename, function (err, stats) {
            if (err) return next(err);
            
            if (stats.isDirectory()) {
                readFolder(filename, next);
            }
            else {
                action(filename, stats, function (res) {
                    if (res) {
                        output.push(res);
                    }
                    
                    next();
                });                
            }
        });
    }, concurrency || 5);
    
    // read folder and push stuff to queue
    function readFolder (dir, next) {
        NativeFs.readdir(dir, function (err, files) {
            if (err) return next(err);
            
            q.push(files.map(function (file) {
                return path.join(dir, file);
            }));
            
            next();
        });
    };
    
    readFolder(dir, function () {
        // on drain we're done
        q.drain = function (err) {
            callback(err, output);
        };
    });
};