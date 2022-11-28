const os = require("os");

if (os.platform().toLocaleLowerCase() === "darwin") {
    module.exports = require("./src/darwin");
} else {
    module.exports = require("./src/non-darwin");
}