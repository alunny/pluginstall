var glob = require('glob'),
    fs = require('fs');

module.exports = function searchAndReplace(srcGlob, search, replace) {
  var files = glob.sync(srcGlob);
  for (i in files) {
    var file = files[i];
    if (fs.lstatSync(file).isFile()) {
      var contents = fs.readFileSync(file, "utf-8");
      var regExp = new RegExp(search, "g");
      contents = contents.replace(regExp, replace);
      fs.writeFileSync(file, contents);
    }
  }
}
