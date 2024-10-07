const express = require("express");
const router = express.Router();
const apiFunctions = require('../models/valAPI.js');
const DatabaseFunctions = require("../models/databaseModel");
const processFunctions = require("../models/processModel")
const fs = require('fs');

async function createJSON(name, jsondata) {
    fs.writeFile('./extra-files/' + name, JSON.stringify(jsondata), function (err) {
        if (err) {
            console.log(err);
        }
    });
}

router.get('/', async (req, res) => {
    let matches = await DatabaseFunctions.mass_retrieve_comp()
    await createJSON("half_stats.json",await processFunctions.getHalfStats(matches))
    // res.render('misc')
    res.redirect('/')
})

module.exports = router