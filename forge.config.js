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
      "^\\/[.].+",
      "^\\/.+\.md$",
      "^\\/config-overrides\.js$",
      "^\\/forge\.config\.js$"
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
      name: '@electron-forge/maker-zip',
      platforms: ["linux", "win32"],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        icon: './src/icons/icon.icns',
        name: 'otoplo-wallet-osx-1.4.0',
        overwrite: true
      }
    }
  ],
  // hooks: {
  //   postPackage: async (forgeConfig, options) => {
  //     console.info('Packages built at:', options.outputPaths);
  //     var fs = require('fs');
  //     var localeDir = options.outputPaths[0]+'/locales/';

  //     fs.readdir(localeDir, function(err, files){
  //       //files is array of filenames (basename form)
  //       if(!(files && files.length)) return;
  //       for (var i = 0, len = files.length; i < len; i++) {
  //         var match = files[i].match(/en-US\.pak/);
  //         if(match === null){
  //           fs.unlinkSync(localeDir+files[i]);
  //         }
  //       }
  //     });
  //   }
  // }
};
