const express = require("express");
const app = express();
const cors = require('cors');
const busboy = require('connect-busboy');
const utils = require('./utils/utils')

app.use(busboy());

app.use(express.json());

app.use(cors());

app.post("/upload", async (req, res) => {
    const fileName = req.query.fileName

    try {
        const cacheValue = utils.getCacheValue(fileName)
        if(!cacheValue) return res.json({status: 0, message: "Invalid Operation"})
    
        let write = await utils.convertBusboyAndWriteStream(req, fileName)
        res.json({message: "File Successfully Uploaded", status: 1})
    } catch (error) {
        console.log("Error occured @ upload api",error)
        res.json({message: "Something bad happened!", status: 0})
    }
});

app.get("/upload-event/:type", async (req, res) => {
    try {
        let { fileName, fileSize } = req.query;
        let type = req.params.type
    
        if(!fileName || !type || (type == 'start' && !fileSize)) return res.json({status: 0, message: "Parameters missing"})
    
        let {status, message} = await utils.handleUploadEvent(fileName, type, +fileSize)
        // console.log("STATUS -",status)
        // console.log("MESSAGE -",message)
        return res.json({status, message})
    } catch (error) {
        console.log("Error occured @ upload-event api",error)
        res.json({status: 0, message: "Something bad happened"})
    }
})

app.all('*', (req, res) => {
    res.status(404).json({message: "Invalid route"})
})

app.listen(4100, () => {
    console.log("Listen on the port 4100...");
});

