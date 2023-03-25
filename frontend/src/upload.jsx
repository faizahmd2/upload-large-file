import { useRef, useState } from 'react';
import './upload.css'
const apiBaseUrl = 'http://localhost:4100'

function Upload() {
  const [upload, setUpload] = useState(false)
  const [fileInfo, setFileInfo] = useState({})
  const inputRef = useRef(null)
  
  async function uploadLargeFile() {
    if(fileInfo.file) {
      setUpload(true)
      const file = fileInfo.file;
      const CHUNK_SIZE = 1024 * 1024
      const fileSize = fileInfo.fileSize;
      const SIZE_IN_MEGABITE = fileSize / CHUNK_SIZE

      const chunkCount = Math.ceil(SIZE_IN_MEGABITE / 4)
      const chunkSize = 4 * CHUNK_SIZE
      const fileName = fileInfo.fileName

      // Initiate upload event
      const event = await handleUploadEvent(fileName,'start',fileSize)
      if(!event) {
        alert("Something bad happened, Please try again!")
        return setUpload(false)
      }

      let isFailed = false
      let alertMessage = ""
      let successCount=0
      for (let i = 0; i < chunkCount; i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, fileSize)
        const chunk = file.slice(start, end)
        const formData = new FormData()
        formData.append('file', chunk)

        const options = {
          method: 'POST',
          body: formData
        };

        try {
          const response = await fetch(`${apiBaseUrl}/upload?fileName=${fileName}`, options);
          if(!response.ok) {
            isFailed = true
            alertMessage = "Something Went Wrong!!"
            break
          }
          const responseData = await response.json()
  
          alertMessage = responseData.message
          if(responseData.status === 1) {
            successCount++
          } else {
            isFailed = true;
            break;
          }
        } catch (error) {
          console.error(error)
        }
      }

      if((successCount == chunkCount) || isFailed) {
        alert(alertMessage)
        await handleUploadEvent(fileName,isFailed ? 'drop' : 'end')
        if(!isFailed) inputRef.current.value = null
      }
      setUpload(false)
    } else alert("Please Select File")
  }

  async function handleUploadEvent(fileName,type,fileSize) {
    try {
      const response = await fetch(`${apiBaseUrl}/upload-event/${type}?fileName=${fileName}&fileSize=${fileSize}`);
      if(!response.ok) {
        return false
      }
  
      const responseData = await response.json()
      if(responseData.status === 0) {
        return false
      }
  
      return responseData.message || true
    } catch (error) {
      console.error(error)
      return false
    }
  }

  const handleChange = (e) => {
    const file = e.target.files && e.target.files[0] || null
    if(file) {
      var fileName = Date.now() + "_" + file.name;
      var fileSize = file.size;
    }

    setFileInfo({file, fileName, fileSize})
  }

  return (
    <>
      <label  htmlFor="images" className={`${upload ? 'disabled' : ''} drop-container`}>
        <span className="drop-title">Drop files here</span>
        or
        <input onChange={handleChange} ref={inputRef} type="file" id="images" accept="*" required />
      </label>
      <div className="submit">
        <button disabled={upload} className={upload ? 'disabled' : ''} onClick={uploadLargeFile}>{upload ? 'Uploading...' : 'Submit'}</button>
      </div>
    </>
  );
}

export default Upload
