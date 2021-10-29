const path = require('path')

module.exports = {
    packagerConfig: {
        icon: path.resolve(__dirname, "static/icons/icon")
    },
    makers: [{
        name: "@electron-forge/maker-squirrel",
        config: { "name": "webeep_sync" }
    }, {
        name: "@electron-forge/maker-zip",
        platforms: ["darwin"]
    }, {
        name: "@electron-forge/maker-deb",
        config: {}
    }, {
        name: "@electron-forge/maker-rpm",
        config: {}
    }],
    plugins: [[
        "@electron-forge/plugin-webpack",
        {
            mainConfig: "./webpack.main.config.js",
            renderer: {
                config: "./webpack.renderer.config.js",
                entryPoints: [{
                    "html": "./src/index.html",
                    "js": "./src/renderer.ts",
                    "name": "main_window"
                }]
            }
        }
    ]]
}