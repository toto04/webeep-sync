const path = require('path')
require('dotenv').config()

module.exports = {
    packagerConfig: {
        icon: path.resolve(__dirname, "static/icons/icon")
    },
    makers: [{
        name: "@electron-forge/maker-squirrel",
        config: {
            name: "webeep-sync",
            setupIcon: "./static/icons/icon.ico",
            setupExe: "WeBeep Sync Windows Setup.exe",
            loadingGif: "./static/icons/load.gif"
        }
    }, {
        name: "@electron-forge/maker-dmg",
        config: {
            format: "ULFO",
            overwrite: true,
            background: path.resolve(__dirname, "static/dmg/bg@2x.png"),
            icon: path.resolve(__dirname, "static/dmg/icon.icns"),
            contents: [
                {
                    path: path.resolve(__dirname, 'out/WeBeep Sync-darwin-x64/WeBeep Sync.app'),
                    type: 'file',
                    x: 120,
                    y: 90,
                },
                {
                    path: '/Applications',
                    type: 'link',
                    x: 380,
                    y: 90
                }
            ],
            additionalDMGOptions: {
                window: { size: { height: 200, width: 500 } }
            },
            platforms: ["darwin"]
        }
    }, {
        name: "@electron-forge/maker-deb",
        config: {}
    }, {
        name: "@electron-forge/maker-rpm",
        config: {}
    }],
    publishers: [{
        name: '@electron-forge/publisher-github',
        config: {
            repository: {
                name: 'webeep-sync',
                owner: 'toto04'
            },
            draft: true,
            prerelease: true
        }
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