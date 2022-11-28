const os = require("os");

if (os.platform().toLocaleLowerCase() === "darwin") {
    module.exports = require("./darwin");
} else {
    module.exports = require("./non-darwin");
}