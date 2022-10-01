const fs = require("fs");
const path = require("path");
require("dotenv").config();
const AdmZip = require("adm-zip");

module.exports = {
    packagerConfig: {
        icon: path.resolve(__dirname, "static/icons/icon"),
        appBundleId: "org.polinetwork.webeep-sync",
        osxSign: {
            identity:
                process.env.MACOS_IDENTITY ||
                "Developer ID Application: PoliNetwork APS (842636PS9J)",
            "hardened-runtime": true,
            entitlements: "entitlements.plist",
            "entitlements-inherit": "entitlements.plist",
            "signature-flags": "library",
            "gatekeeper-assess": false,
        },
        osxNotarize: {
            appleId: process.env.APPLEID,
            appleIdPassword: process.env.APPLEPWD,
            teamId: process.env.TEAMID,
            ascProvider: process.env.TEAMID,
        },
    },
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                name: "webeep-sync",
                setupIcon: "./static/icons/icon.ico",
                setupExe: "WeBeep Sync Windows Setup.exe",
                // TODO: loading gif
            },
        },
        {
            name: "@electron-forge/maker-dmg",
            config: (arch) => {
                return {
                    name: `WeBeep Sync macOS-${arch}`,
                    format: "ULFO",
                    overwrite: true,
                    background: path.resolve(__dirname, "static/dmg/bg@2x.png"),
                    icon: path.resolve(__dirname, "static/dmg/icon.icns"),
                    contents: [
                        {
                            path: path.resolve(
                                __dirname,
                                `out/WeBeep Sync-darwin-${arch}/WeBeep Sync.app`
                            ),
                            type: "file",
                            x: 120,
                            y: 90,
                        },
                        {
                            path: "/Applications",
                            type: "link",
                            x: 380,
                            y: 90,
                        },
                    ],
                    additionalDMGOptions: {
                        window: { size: { height: 200, width: 500 } },
                    },
                    platforms: ["darwin"],
                };
            },
        },
        {
            name: "@electron-forge/maker-deb",
            config: {
                bin: "WeBeep Sync",
                name: "webeep-sync",
                productName: "WeBeep Sync",
                description:
                    "Keep all your WeBeep files synced on your computer!",
                productDescription:
                    "Keep all your WeBeep files synced on your computer!",
                categories: ["Utility"],
                // According to the documentation of @electron-forge/maker-deb `icon` should be a single file path,
                // however this config option gets passed straight to the electron-installer-debian package,
                // wich says in its documentation that multiple icons sizes are allowed.
                icon: {
                    "32x32": "./static/icons/icon-32x32.png",
                    "48x48": "./static/icons/icon-48x48.png",
                    "64x64": "./static/icons/icon-64x64.png",
                    "72x72": "./static/icons/icon-72x72.png",
                    "80x80": "./static/icons/icon-80x80.png",
                    "96x96": "./static/icons/icon-96x96.png",
                    "128x128": "./static/icons/icon-128x128.png",
                    "256x256": "./static/icons/icon-256x256.png",
                },
            },
        },
        {
            name: "@electron-forge/maker-rpm",
            config: {
                bin: "WeBeep Sync",
                name: "webeep-sync",
                productName: "WeBeep Sync",
                description:
                    "Keep all your WeBeep files synced on your computer!",
                productDescription:
                    "Keep all your WeBeep files synced on your computer!",
                categories: ["Utility"],
                // According to the documentation of @electron-forge/maker-rpm icon should be a single file path,
                // however this config option gets passed straight to the electron-installer-redhat package,
                // wich says in its documentation that multiple icons sizes are allowed.
                icon: {
                    "32x32": "./static/icons/icon-32x32.png",
                    "48x48": "./static/icons/icon-48x48.png",
                    "64x64": "./static/icons/icon-64x64.png",
                    "72x72": "./static/icons/icon-72x72.png",
                    "80x80": "./static/icons/icon-80x80.png",
                    "96x96": "./static/icons/icon-96x96.png",
                    "128x128": "./static/icons/icon-128x128.png",
                    "256x256": "./static/icons/icon-256x256.png",
                },
            },
        },
    ],
    publishers: [
        {
            name: "@electron-forge/publisher-github",
            config: {
                repository: {
                    name: "webeep-sync",
                    owner: "toto04",
                },
                prerelease: !!process.env.PRERELEASE,
                draft: true,
            },
        },
    ],
    plugins: [
        [
            "@electron-forge/plugin-webpack",
            {
                mainConfig: "./webpack.main.config.js",
                renderer: {
                    config: "./webpack.renderer.config.js",
                    entryPoints: [
                        {
                            html: "./src/index.html",
                            js: "./src/renderer.ts",
                            name: "main_window",
                        },
                    ],
                },
            },
        ],
    ],
    hooks: {
        postMake: (_config, makeResults) => {
            // this hook is here to zip the .exe installer, because windows doesnt trust when you
            // download an unsigned .exe from the internet, but it's ok if you unzip it first
            let winRelease = makeResults.find((m) => m.platform === "win32");
            if (winRelease) {
                // TODO: keep the nupkg and RELEASE files when autoupdate is implemented
                let zipPath; // will be set to the .zip file, will be used for new artifact array
                console.log("Zipping exe installer...");
                winRelease.artifacts.forEach((art) => {
                    if (art.endsWith(".exe")) {
                        zipPath = art.slice(0, -3) + "zip";
                        const zip = new AdmZip();
                        zip.addFile(path.basename(art), fs.readFileSync(art));
                        fs.writeFileSync(zipPath, zip.toBuffer());
                    }
                    fs.unlinkSync(art);
                });
                winRelease.artifacts.append(zipPath);
                return makeResults;
            }
        },
    },
};
