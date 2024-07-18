module.exports = {
    chainWebpack: config => {
      config
        .entry("app")
        .clear()
        .add("./webview-src/main.js")
        .add("./webview-src/node.js")
        .add("./webview-src/app.css")
        .end()
      config.plugins.delete('html')
      config.plugins.delete('preload')
      config.plugins.delete('prefetch')
    },
    outputDir: 'webview',
    filenameHashing: false
  };