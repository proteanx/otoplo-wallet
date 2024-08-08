const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

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
    if (dirPath.endsWith('.AppImage')) {
      archive.file(dirPath, { name: path.basename(dirPath) });
    } else {
      archive.directory(`${dirPath}/`, dirPath.substring(dirPath.lastIndexOf('otoplo-wallet')));
    }
  
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

module.exports = async function(context) {
  const { appOutDir, packager, electronPlatformName, arch } = context;
  const version = packager.appInfo.version;

  if (electronPlatformName === 'darwin') {
    return;
  }

  if (electronPlatformName === 'win32') {
    return;
  }

  const oldDirName = appOutDir;
  const newDirName = path.join(path.dirname(oldDirName), `otoplo-wallet-${electronPlatformName}-${arch}-${version}`);

  try {
    if (electronPlatformName === 'linux') {
      const appImagePath = path.join(oldDirName, `Otoplo-Wallet-${version}.AppImage`);
      await createTarGz(appImagePath);
    } else {
      fs.renameSync(oldDirName, newDirName);
      console.log('Directory renamed successfully.');
      await createTarGz(newDirName);
    }
  } catch (err) {
    console.log(err);
  }
};