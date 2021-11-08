const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
const pkg = require("./package.json");

const LIBRARY_NAME = pkg.name;
const PROJECT_NAME = pkg.name.replace("@", "").replace("/", "-");

const defaultConfig = env => ({
  mode: env.prod ? "production" : "development",
  devtool: 'source-map',
  resolve: {
    alias: {
      typescript: false,
    },
    fallback: {
      path: false,
      fs: false,
      os: false,
      util: false,
      stream: false,
      url: false,
      assert: false,
      tls: false,
      net: false
    }
  },
  optimization: {
    minimize: env.prod,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          keep_classnames: true,
          sourceMap: true,
        }
      })
    ],
    portableRecords: true,
    usedExports: true,
    providedExports: true
  },
  performance: {
    hints: false,
    maxEntrypointSize: 300000,
    maxAssetSize: 300000
  },
});

const bundle = (env, module) => ({
  name: PROJECT_NAME,
  entry: `./dist/${module ? "esm" : "cjs"}/index.js`,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `web/${PROJECT_NAME}${module ? ".es" : ""}${env.prod ? ".min" : ""}.js`,
    library: module ? undefined : ['OpenHPS', LIBRARY_NAME.substr(LIBRARY_NAME.indexOf("/") + 1)],
    libraryTarget: module ? "module" : "umd",
    umdNamedDefine: !module,
    globalObject: module ? undefined : `(typeof self !== 'undefined' ? self : this)`,
    environment: { module },
  },
  experiments: {
    outputModule: module,
  },
  externalsType: module ? "module" : undefined,
  externals: {
    '@openhps/core': module ? "./openhps-core.es" + (env.prod ? ".min" : "") + ".js" : {
      commonjs: '@openhps/core',
      commonjs2: '@openhps/core',
      amd: 'core',
      root: ['OpenHPS', 'core']
    }
  },
  devtool: 'source-map',
  plugins: [],
  ...defaultConfig(env)
});

module.exports = env => [
  bundle(env, true),
  bundle(env, false),
];
