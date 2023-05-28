const fs = require('fs')
const path = require('path')
const UPLOADED_FILE_PATH = path.resolve(__dirname,'../files')
const { exec } = require('child_process');
const cache = require('memory-cache');
const constants = require('./constants')

var utils = {
  convertBusboyAndWriteStream: function(request, fileName) {
    return new Promise((resolve, reject) => {
        let fstream;

        request.pipe(request.busboy);
        request.busboy.on('file', function (fieldname, file, filename) {
            let fullPath = UPLOADED_FILE_PATH + "/" + fileName
            fstream = utils.createAppendStream(fullPath);
            // file.pipe(fstream);
            file.on('data', function(data) {
              console.log("WRITING")
              fstream.write(data)
            })
            file.on('end', function () {
              console.log("ON END")
              fstream.end()
              resolve(fullPath)
            });
        });

        const abort = (e) => reject(e)
        request.on("aborted", abort);
        request.busboy.on("error", abort);
    })
  },
  createAppendStream: function(filePath) {
      let stream;
    
      if (fs.existsSync(filePath)) {
        // If file already exists, open in append mode
        stream = fs.createWriteStream(filePath, { flags: 'a' });
      } else {
        // Otherwise, create new file
        stream = fs.createWriteStream(filePath);
      }
    
      return stream;
  },
  getOsMemory: function() {
    return new Promise((resolve, reject) => {
      exec(`df ${UPLOADED_FILE_PATH}`, (err, stdout, stderr) => {
        if (err) {
          resolve(0)
        }
      
        // Parse the output of the df command
        const output = stdout.trim().split('\n')[1].split(/\s+/);
        // const totalSpace = parseInt(output[1], 10) * 1024; // Total space in bytes
        // const usedSpace = parseInt(output[2], 10) * 1024; // Used space in bytes
        const freeSpace = parseInt(output[3], 10) * 1024; // Free space in bytes
      
        // Log the available space
        const freeSpaceMB = freeSpace / (1024 * 1024);
        // console.log(`Free Space: ${freeSpaceMB.toFixed(2)} MB`);
        resolve(freeSpace)
      });
    })
  },
  handleUploadEvent: async function(fileName, type, fileSize) {
    const cacheValue = utils.getCacheValue(fileName)
    let status=0,message="Invalid type - " + type

    switch(type) {
      case 'start':
        if(cacheValue) {
            message = "Upload of this file is already in process"
            break;
        }

        let freeSpace = await utils.getOsMemory()
        if(freeSpace < (2 * fileSize)) {
          message = "File is too large, can not Upload now"
          break;
        }

        cache.put(fileName, true, constants.UPLOAD_START_EVENT_CACHE_TIME)
        status = 1;
        message = "Upload Event Initiated of file - "+fileName
        break;
      
      case 'end':
        if(!cacheValue) {
            message = "Nothing to end the process of file - "+ fileName
            break;
        }

        cache.del(fileName)
        status = 1;
        message = "Upload Event closed for - "+fileName
        break;

      case 'drop':
        if(!cacheValue) {
            message = "Nothing to drop the upload event - "+ fileName
            break;
        }
        
        if (fs.existsSync(UPLOADED_FILE_PATH + "/" + fileName)) {
          fs.unlinkSync(UPLOADED_FILE_PATH + "/" + fileName)
        }

        cache.del(fileName)
        status = 1;
        message = "Upload Event dropped for - "+fileName
        break;

      default :
        break;
    }

    return {status, message}
  },
  getCacheValue: (fileName) => cache.get(fileName)
}

module.exports = utils