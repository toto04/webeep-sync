const fs = require('fs')
const path = require('path')
require('dotenv').config()
const AdmZip = require("adm-zip")

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
            // TODO: loading gif
        }
    }, {
        name: "@electron-forge/maker-dmg",
        config: arch => {
            return {
                name: `WeBeep Sync macOS-${arch}`,
                format: "ULFO",
                overwrite: true,
                background: path.resolve(__dirname, "static/dmg/bg@2x.png"),
                icon: path.resolve(__dirname, "static/dmg/icon.icns"),
                contents: [
                    {
                        path: path.resolve(__dirname, `out/WeBeep Sync-darwin-${arch}/WeBeep Sync.app`),
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
    ]],
    hooks: {
        postMake: (_config, makeResults) => {
            // this hook is here to zip the .exe installer, because windows doesnt trust when you
            // download an unsigned .exe from the internet, but it's ok if you unzip it first
            let winRelease = makeResults.find(m => m.platform === 'win32')
            if (winRelease) {
                // TODO: keep the nupkg and RELEASE files when autoupdate is implemented
                let zipPath // will be set to the .zip file, will be used for new artifact array
                console.log('Zipping exe installer...')
                winRelease.artifacts.forEach(art => {
                    if (art.endsWith('.exe')) {
                        zipPath = art.slice(0, -3) + 'zip'
                        const zip = new AdmZip
                        zip.addFile(path.basename(art), fs.readFileSync(art))
                        fs.writeFileSync(zipPath, zip.toBuffer())
                    }
                    fs.unlinkSync(art)
                })
                winRelease.artifacts = [zipPath]
                return makeResults
            }
        },
    },
}