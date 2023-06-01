module.exports = {
  packagerConfig: {
    name: "otoplo-wallet",
    icon: './src/icons/icon',
    ignore: [
      "^\\/nexcore-lib$",
      "^\\/public$",
      "^\\/src$",
      "^\\/node_modules$",
      "^\\/[.].+",
      "^\\/.+\.md$",
      "^\\/config-overrides\.js$",
      "^\\/forge\.config\.js$"
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ["darwin", "linux", "win32"],
    },
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
