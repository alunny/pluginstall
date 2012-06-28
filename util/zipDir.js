var zip = require('node-native-zip');
var map = require('./mapAllFiles');
var fs = require('fs');

module.exports = function zipDir(dir, dest, callback) {
    var archive = new zip();

    // map all files in the approot thru this function
    map(dir, function (path, stats, callback) {
        // prepare for the .addFiles function
        callback({ 
            name: path.replace(dir, "").substr(1), 
            path: path 
        });
    }, function (err, data) {
        if (err) return callback(err);

        // add the files to the zip
        archive.addFiles(data, function (err) {
            if (err) return callback(err);

            // write the zip file
            fs.writeFile(dest, archive.toBuffer(), function (err) {
                if (err) return callback(err);

                callback(null, dest);
            });                    
        });
    });    
}