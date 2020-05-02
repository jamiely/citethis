const path = require("path");
var glob = require("glob");
var nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: glob.sync("./src/**/*.test.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "tests.js",
    // use absolute paths in sourcemaps (important for debugging via IDE)
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
  },
  target: 'node', // webpack should compile node compatible code
  externals: [nodeExternals()],
  devtool: "inline-cheap-module-source-map"
};
