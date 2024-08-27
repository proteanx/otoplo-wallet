const { version } = require('./package.json');
const archiver = require('archiver');
const fs = require('fs');
const { execSync } = require('child_process');

function getGitCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (error) {
    console.error('Failed to get Git commit hash:', error);
    return '';
  }
}

async function createArchive(dirPath, archive, output) {
  // listen for all archive data to be written
  // 'close' event is fired only when a file descriptor is involved
  output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
  });

  // This event is fired when the data source is drained no matter what was the data source.
  // It is not part of this library but rather from the NodeJS Stream API.
  // @see: https://nodejs.org/api/stream.html#stream_event_end
  output.on('end', function() {
    console.log('Data has been drained');
  });

  // good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      // log warning
      console.warn('got ENOENT');
    } else {
      // throw error
      throw err;
    }
  });

  // good practice to catch this error explicitly
  archive.on('error', function(err) {
    throw err;
  });

  // pipe archive data to the file
  archive.pipe(output);

  // append files from a sub-directory and naming it `new-subdir` within the archive
  archive.directory(`${dirPath}/`, dirPath.substring(dirPath.lastIndexOf('otoplo-wallet')));

  // finalize the archive (ie we are done appending files but streams have to finish yet)
  // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
  await archive.finalize();
}

async function createTarGz(dirPath) {
  const output = fs.createWriteStream(`${dirPath}.tar.gz`);
  const archive = archiver('tar', {
    gzip: true,
    gzipOptions: { level: 9 }
  });

  await createArchive(dirPath, archive, output);
}

module.exports = {
  packagerConfig: {
    name: "Otoplo-Wallet",
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
        name: `otoplo-wallet-osx-${version}`,
        overwrite: true
      }
    }
  ],
  hooks: {
    postPackage: async (forgeConfig, options) => {
      if (options.platform === 'darwin') {
        return;
      }

      const oldDirName = options.outputPaths[0];
      let newVersion = version;
      
      // Check if the current commit is tagged as a release
      try {
        const taggedVersion = execSync('git describe --exact-match --tags HEAD').toString().trim();
        if (taggedVersion !== `v${version}`) {
          throw new Error('Not a tagged release');
        }
      } catch (error) {
        // Not a tagged release, add commit hash to binary package
        const commitHash = getGitCommitHash();
        newVersion = `${version}-${commitHash}`;
      }

      const newDirName = oldDirName.replace("Otoplo-Wallet", "otoplo-wallet") + `-${newVersion}`;
      try {
        fs.renameSync(oldDirName, newDirName);
        console.log('Directory renamed successfully.');
        if (options.platform !== 'win') {
          await createTarGz(newDirName);
        }

      } catch (err) {
        console.log(err)
      }
    }
  }
};
