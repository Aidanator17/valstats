const express = require("express");
const router = express.Router();
const apiFunctions = require('../models/valAPI.js');
const DatabaseFunctions = require("../models/databaseModel");
const processFunctions = require("../models/processModel")
const indent = `    `
const fs = require('fs');

async function createJSON(name, jsondata) {
    fs.writeFile('./extra-files/' + name, JSON.stringify(jsondata), function (err) {
        if (err) {
            console.log(err);
        }
    });
}

router.get('/', async (req, res) => {
    let start = Date.now()
    let og = Date.now()
    let matches = await DatabaseFunctions.mass_retrieve_comp()
    let end = Date.now()
    console.log(`Retrieved comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

    start = Date.now()
    let act = await apiFunctions.activeSeason()
    end = Date.now()
    console.log(`Retrieved current season (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    
    start = Date.now()
    let map_stats = await processFunctions.get_map_stats(matches)
    end = Date.now()
    console.log(`Retrieved map stats (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    
    start = Date.now()
    await createJSON('map_stats.json', map_stats)
    end = Date.now()
    console.log(`Created JSON (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    console.log(`TOTAL (${Math.round(((end - og) / 1000) * 10) / 10}s)`)

    res.redirect('/')
})


module.exports = router