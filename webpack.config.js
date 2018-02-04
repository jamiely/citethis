const path = require("path");

module.exports = {
    entry: {
        extractFields: "./src/extractFields.js",
        citethis: "./src/citethis.js"
    },
    output: {
        path: path.resolve(__dirname, "sidebar"),
        filename: "[name].js"
    }
};
