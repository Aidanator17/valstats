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
    const Eps = await DatabaseFunctions.getEpiData()
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
router.get('/all', async (req, res) => {
    let start = Date.now()
    let og = Date.now()
    
    start = Date.now()
    let map_stats = await DatabaseFunctions.getMapStats('all')
    // console.log(map_stats)
    let end = Date.now()
    console.log(`Retrieved map stats (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    
    // start = Date.now()
    // await createJSON('map_stats.json', map_stats)
    // end = Date.now()
    // console.log(`Created JSON (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    let totalPlayCount = 0
    for (m in map_stats){
        totalPlayCount += map_stats[m].count
    }
    console.log(`TOTAL (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
    res.render('maps',{
        maps:map_stats,
        totalPlayCount
    })
})
router.get('/id/:id', async (req, res) => {
    let start = Date.now()
    let og = Date.now()
    
    start = Date.now()
    let map_stats = await DatabaseFunctions.getMapStats(req.params.id)
    // console.log(map_stats)
    let end = Date.now()
    console.log(`Retrieved map stats (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    
    // start = Date.now()
    // await createJSON('map_stats.json', map_stats)
    // end = Date.now()
    // console.log(`Created JSON (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    let totalPlayCount = 0
    for (m in map_stats){
        totalPlayCount += map_stats[m].count
    }
    console.log(`TOTAL (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
    res.render('maps',{
        maps:map_stats,
        totalPlayCount
    })
})


module.exports = router