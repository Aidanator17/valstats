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
router.get('/massAdd', async (req, res) => {
    if (req.query.failed == 'true') {
        res.render('match-add', {
            failed: true
        })
    }
    else {
        res.render('match-add', {
            failed: false
        })
    }
})
router.post('/massAdd', async (req, res) => {
    let stored = await apiFunctions.getStoredComp('na',req.body.user,req.body.tag)
    // await createJSON('stored_matches.json',stored)
    let matches = []
    for (m in stored['data']){
        matches.push(stored['data'][m]['meta']['id'])
    }
    console.log(`Attempting to add ${matches.length} matches to database`)
    let old_matches = await DatabaseFunctions.get_old_match_ids()
    let new_matches = []
    for (m in matches) {
        let found = false
        for (om in old_matches) {
            if (matches[m] == old_matches[om]['match_id']) {
                found = true
                break
            }
        }
        if (!found) {
            new_matches.push(matches[m])
        }
    }
    console.log(`Found ${new_matches.length} new matches to add`)
    let fullMatches = []
    for (m in new_matches) {
        try {
            let fullMatch = await apiFunctions.getMatch(new_matches[m])
            if (fullMatch){
                fullMatches.push(fullMatch)
            }
            else {
                console.log(`FAILED TO ADD MATCH ${new_matches[m]}`)
                continue
            }
        }
        catch (err) {
            console.log(`FAILED TO ADD MATCH ${new_matches[m]}, error: ${err}`)
            res.redirect('/match/add?failed=true')
        }
    }
    await DatabaseFunctions.mass_add(fullMatches)
    res.redirect('/')
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