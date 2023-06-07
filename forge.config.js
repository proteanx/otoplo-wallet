module.exports = {
  packagerConfig: {
    name: "Otoplo Wallet",
    icon: './src/icons/icon',
    appBundleId: 'com.otoplo.dwallet',
    ignore: [
      "^\\/nexcore-lib$",
      "^\\/public$",
      "^\\/src$",
      "^\\/node_modules$",
      "^\\/ios$",
      "^\\/android$",
      "^\\/assets$",
      "^\\/[.].+",
      "^\\/.+\.md$",
      "^\\/config-overrides\.js$",
      "^\\/forge\.config\.js$",
      "^\\/capacitor\.config\.ts$"
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
        icon: './src/icons/icon.icns',
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
