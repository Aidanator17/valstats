const express = require("express");
const router = express.Router();
const apiFunctions = require('../models/valAPI');
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
    let agentList = [
        "Phoenix",
        "Raze",
        "Jett",
        "Yoru",
        "Neon",
        "Reyna",
        "Sage",
        "Cypher",
        "Chamber",
        "Killjoy",
        "Omen",
        "Viper",
        "Brimstone",
        "Astra",
        "Harbor",
        "Sova",
        "Breach",
        "Skye",
        "KAY/O",
        "Fade",
        "Clove",
        "Gekko",
        "Iso",
        "Deadlock"
    ]
    if (req.query.failed == 'true') {
        res.render('agentLookup', { failed: true, agents:agentList.sort()})
    }
    else {
        res.render('agentLookup', { failed: false, agents:agentList.sort() })
    }
})

router.post('/', async (req, res) => {
    let agentList = [
        "Phoenix",
        "Raze",
        "Jett",
        "Yoru",
        "Neon",
        "Reyna",
        "Sage",
        "Cypher",
        "Chamber",
        "Killjoy",
        "Omen",
        "Viper",
        "Brimstone",
        "Astra",
        "Harbor",
        "Sova",
        "Breach",
        "Skye",
        "KAY/O",
        "Fade",
        "Clove",
        "Gekko",
        "Iso",
        "Deadlock"
    ]
    if (agentList.includes(req.body.agent)){
        res.redirect('/agent/'+req.body.agent)
    }
    else {
        res.redirect('/agent?failed=true')
    }
})

router.get('/all', async (req, res) => {
    let start = Date.now()
    const matches = await DatabaseFunctions.mass_retrieve_comp()
    let agentData = await processFunctions.get_all_agent_stats(matches)
    let totalMatches = matches.length
    const agentsByClass = agentData.sort((a, b) => a.role.localeCompare(b.role));
    const agentsByPickAsc = [...agentData].sort((a, b) => ((a.wins + a.losses + a.draws) / totalMatches) - ((b.wins + b.losses + b.draws) / totalMatches));
    const agentsByPickDesc = [...agentData].sort((a, b) => ((b.wins + b.losses + b.draws) / totalMatches) - ((a.wins + a.losses + a.draws) / totalMatches));
    const agentsByWinAsc = [...agentData].sort((a, b) => (a.wins / (a.wins + a.losses + a.draws)) - (b.wins / (b.wins + b.losses + b.draws)));
    const agentsByWinDesc = [...agentData].sort((a, b) => (b.wins / (b.wins + b.losses + b.draws)) - (a.wins / (a.wins + a.losses + a.draws)));
    const agentsByKDAsc = [...agentData].sort((a, b) => (a.kills / a.deaths) - (b.kills / b.deaths));
    const agentsByKDDesc = [...agentData].sort((a, b) => (b.kills / b.deaths) - (a.kills / a.deaths));
    let end = Date.now()
    console.log(`Retrieved mass agent stats (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    res.render('allAgents', {
        agentsByClass,
        agentsByPickAsc,
        agentsByPickDesc,
        agentsByWinAsc,
        agentsByWinDesc,
        agentsByKDAsc,
        agentsByKDDesc,
        totalMatches
    });
})

router.get('/:agent', async (req, res) => {
    let start = Date.now()
    let agentList = [
        "Phoenix",
        "Raze",
        "Jett",
        "Yoru",
        "Neon",
        "Reyna",
        "Sage",
        "Cypher",
        "Chamber",
        "Killjoy",
        "Omen",
        "Viper",
        "Brimstone",
        "Astra",
        "Harbor",
        "Sova",
        "Breach",
        "Skye",
        "KAY/O",
        "Fade",
        "Clove",
        "Gekko",
        "Iso",
        "Deadlock"
    ]
    if (agentList.includes(req.params.agent)){
        let matches = await DatabaseFunctions.mass_retrieve_comp()
        let agentRaw = await processFunctions.get_agent_stats(req.params.agent,matches)
        const map_pickrate = await processFunctions.get_map_pickrate(matches)
        let agent = agentRaw[0]
        // createJSON(`/agentData/${req.params.agent}-agent.json`,agent)
        let end = Date.now()
        console.log(`Retrieved agent stats for ${(req.params.agent).toLowerCase()} (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        res.render('agent',{
            agentData:agent,
            agentName:req.params.agent,
            agentImage:agentRaw[2],
            totalPicks:agentRaw[1],
            map_picks:map_pickrate
        })
    }
    else {
        let end = Date.now()
        console.log(`Failed to retrieve agent stats for ${req.params.agent} (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        res.redirect('/agent?failed=true')
    }
})

module.exports = router