var fs = require('fs');

module.exports = function(src, dst) {
    var BUF_LENGTH = 4096;
    var buf = new Buffer(BUF_LENGTH);
    var fd_src = fs.openSync(src, 'r');
    var fd_dst = fs.openSync(dst, 'w');
    var bytesRead = 1;
    var pos = 0;
    while (bytesRead > 0) {
        bytesRead = fs.readSync(fd_src, buf, 0, BUF_LENGTH, pos);
        fs.writeSync(fd_dst,buf,0,bytesRead);
        pos += bytesRead;
    }

    fs.closeSync(fd_src);
    fs.closeSync(fd_dst);
};
