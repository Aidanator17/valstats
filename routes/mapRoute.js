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
    res.redirect('/map/lookup')
})
router.get('/lookup', async (req, res) => {
    const unfEps = await apiFunctions.getData()
    const Eps = await processFunctions.reformatEpisodes(unfEps['acts'])
    if (req.query.failed == 'true') {
        res.render('map_lookup', {
            failed: true,
            title: 'User Lookup',
            sheet: 'lookup-style.css',
            episodes: Eps.reverse()
        })
    }
    else {
        res.render('map_lookup', {
            failed: false,
            title: 'User Lookup',
            sheet: 'lookup-style.css',
            episodes: Eps.reverse()
        })
    }
})
router.post('/lookup', async (req, res) => {
    res.redirect('/map/id/'+req.body.act)
})

router.get('/id/:id', async (req, res) => {
    let start = Date.now()
    let og = Date.now()
    let matches = await DatabaseFunctions.mass_retrieve_comp(req.params.id)
    let end = Date.now()
    console.log(`Retrieved comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    
    start = Date.now()
    let map_stats = await processFunctions.get_map_stats(matches,req.params.id)
    end = Date.now()
    console.log(`Retrieved map stats (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    
    // start = Date.now()
    // await createJSON('map_stats.json', map_stats)
    // end = Date.now()
    // console.log(`Created JSON (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    console.log(`TOTAL (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
    let totalPlayCount = 0
    for (m in map_stats){
        totalPlayCount += map_stats[m].count
    }
    res.render('maps',{
        maps:map_stats,
        totalPlayCount
    })
})


module.exports = router