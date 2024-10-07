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

router.get("/", async (req, res) => {
    res.redirect('/match/lookup')
})
router.get("/lookup", async (req, res) => {
    if (req.query.failed == 'true') {
        res.render('match-lookup', {
            failed: true
        })
    }
    else {
        res.render('match-lookup', {
            failed: false
        })
    }
})
router.post("/lookup", async (req, res) => {
    res.redirect('/match/' + req.body.matchid)
})
router.get("/:id", async (req, res) => {
    if (req.params.id) {
        let match = await apiFunctions.getMatch(req.params.id)
        if (match) {
            match = await processFunctions.alterMatch(match, match['data']['players']['red'][0]['puuid'], true)
            res.render('match', {
                matchData: match
            })
        }
        else {
            res.redirect('/match/lookup?failed=true')
        }
    }
    else {
        res.redirect('/match')
    }
})

module.exports = router