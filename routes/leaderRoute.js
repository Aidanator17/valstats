const express = require("express");
const router = express.Router();
const DatabaseFunctions = require("../models/databaseModel");
const fs = require('fs');

async function createJSON(name, jsondata) {
    fs.writeFile('./extra-files/' + name, JSON.stringify(jsondata), function (err) {
        if (err) {
            console.log(err);
        }
    });
}

router.get('/', async (req, res) => {
    const leaderboard = await DatabaseFunctions.getLeaderboard()
    const acts = await DatabaseFunctions.getEpiData()
    
    res.render('leaderboard', {
        acts,
        leaderboard
    })
})

module.exports = router