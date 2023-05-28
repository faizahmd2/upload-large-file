import { useRef, useState } from 'react';
import './upload.css'
import useExitPrompt from './useExitPrompt';
const apiBaseUrl = 'http://localhost:4100'
let controller = new AbortController()
const UPLOAD_CHUNK_SIZE_PER_REQUEST = 4 // In Megabite

function Upload() {
  const [upload, setUpload] = useState(false)
  const [fileInfo, setFileInfo] = useState({})
  const inputRef = useRef(null)
  const progressRef = useRef(null)
  const percentageRef = useRef(null)
  
  async function uploadLargeFile() {
    if(fileInfo.file) {
      setUpload(true)
      const file = fileInfo.file;
      const CHUNK_SIZE = 1024 * 1024
      const fileSize = fileInfo.fileSize;
      const SIZE_IN_MEGABITE = fileSize / CHUNK_SIZE

      const chunkCount = Math.ceil(SIZE_IN_MEGABITE / UPLOAD_CHUNK_SIZE_PER_REQUEST)
      const chunkSize = UPLOAD_CHUNK_SIZE_PER_REQUEST * CHUNK_SIZE
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
        if(controller.signal.aborted) break
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, fileSize)

        // handle progress percentage
        const percentage = (((start + chunkSize)/fileSize)*100).toFixed(0)
        updateProgress(percentage)
        
        // create request chunk of size 4mb on each request
        const chunk = file.slice(start, end)
        const formData = new FormData()
        formData.append('file', chunk)

        const options = {
          method: 'POST',
          body: formData,
          signal: controller.signal
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

  const handleReloadDuringUpload = () => {
    if (upload && fileInfo.fileName) {
      // Send request to backend for Cleanup of dropped request in between
      controller.abort()
      const img = new Image();
      img.src = `${apiBaseUrl}/upload-event/drop?fileName=${fileInfo.fileName}`
    }
  }

  useExitPrompt(upload, handleReloadDuringUpload)

  function updateProgress(percent) {
    if(progressRef.current) progressRef.current.style.width = percent + '%'
    if(percentageRef.current) percentageRef.current.textContent = percent + '%'
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
      { upload && <div className="progress">
        <div className="progress-container">
          <div ref={progressRef} className="progress-bar"></div>
          <div ref={percentageRef} className="progress-text"></div>
        </div>
      </div>}
      <div className="submit">
        <button disabled={upload} className={upload ? 'disabled' : ''} onClick={uploadLargeFile}>{upload ? 'Uploading...' : 'Submit'}</button>
      </div>
    </>
  );
}

export default Upload
