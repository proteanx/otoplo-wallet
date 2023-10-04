module.exports = {
  packagerConfig: {
    name: "Otoplo Wallet",
    icon: './resources/icons/icon',
    appBundleId: 'com.otoplo.dwallet',
    ignore: [
      "^\\/public$",
      "^\\/src$",
      "^\\/node_modules$",
      "^\\/electron$",
      "^\\/ios$",
      "^\\/android$",
      "^\\/assets$",
      "^\\/resources$",
      "^\\/[.].+",
      "^\\/.+\.md$",
      "^\\/config-overrides\.js$",
      "^\\/forge\.config\.cjs$",
      "^\\/capacitor\.config\.ts$",
      "^\\/tsconfig.*\.json$",
      "^\\/vite\.config\.ts$",
      "^\\/index\.html$"
    ],
    osxSign: {
      platform: "darwin",
    },
    osxNotarize: {
      tool: "notarytool",
      keychain: "~/Library/Keychains/login.keychain-db",
      keychainProfile: "otoplo-electron"
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        icon: './resources/icons/icon.icns',
        name: 'otoplo-wallet-osx-1.4.0',
        overwrite: true
      }
    }
  ],
  hooks: {
    postPackage: async (forgeConfig, options) => {
      if (options.platform === 'darwin') {
        return;
      }

      const fs = require('fs')

      const oldDirName = options.outputPaths[0];
      const newDirName = oldDirName.replace("Otoplo Wallet", "otoplo-wallet");

      try {
        fs.renameSync(oldDirName, newDirName);

        console.log('Directory renamed successfully.')
      } catch (err) {
        console.log(err)
      }
    }
  }
};
