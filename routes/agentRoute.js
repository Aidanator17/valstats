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
        "Deadlock",
        "Vyse"
    ]
    if (req.query.failed == 'true') {
        res.render('agentLookup', { failed: true, agents: agentList.sort(),
            title: 'Agent Lookup',
            sheet: 'agentLookup.css' })
    }
    else {
        res.render('agentLookup', { failed: false, agents: agentList.sort(),
            title: 'Agent Lookup',
            sheet: 'agentLookup.css' })
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
        "Deadlock",
        "Vyse"
    ]
    if (agentList.includes(req.body.agent)) {
        res.redirect('/agent/' + req.body.agent)
    }
    else {
        res.redirect('/agent?failed=true')
    }
})

router.get('/all', async (req, res) => {
    let start = Date.now()
    let act = await apiFunctions.activeSeason()
    const matches = await DatabaseFunctions.mass_retrieve_comp()
    // const act_matches = await DatabaseFunctions.get_act_comp_matches(act[0].id)
    let agentData = await processFunctions.get_all_agent_stats(matches)
    let agentRawActData = await processFunctions.get_all_agent_stats(matches, act[0].id)
    let agentActData = agentRawActData[0]
    let totalMatches = matches.length
    let totalActMatches = agentRawActData[1]
    const agentsByClass = agentData.sort((a, b) => a.role.localeCompare(b.role));
    const agentsByPickAsc = [...agentData].sort((a, b) => ((a.wins + a.losses + a.draws) / totalMatches) - ((b.wins + b.losses + b.draws) / totalMatches));
    const agentsByPickDesc = [...agentData].sort((a, b) => ((b.wins + b.losses + b.draws) / totalMatches) - ((a.wins + a.losses + a.draws) / totalMatches));
    const agentsByWinAsc = [...agentData].sort((a, b) => (a.wins / (a.wins + a.losses + a.draws)) - (b.wins / (b.wins + b.losses + b.draws)));
    const agentsByWinDesc = [...agentData].sort((a, b) => (b.wins / (b.wins + b.losses + b.draws)) - (a.wins / (a.wins + a.losses + a.draws)));
    const agentsByKDAsc = [...agentData].sort((a, b) => (a.kills / a.deaths) - (b.kills / b.deaths));
    const agentsByKDDesc = [...agentData].sort((a, b) => (b.kills / b.deaths) - (a.kills / a.deaths));
    const agentsActByClass = agentActData.sort((a, b) => a.role.localeCompare(b.role));
    const agentsActByPickAsc = [...agentActData].sort((a, b) => ((a.wins + a.losses + a.draws) / totalMatches) - ((b.wins + b.losses + b.draws) / totalMatches));
    const agentsActByPickDesc = [...agentActData].sort((a, b) => ((b.wins + b.losses + b.draws) / totalMatches) - ((a.wins + a.losses + a.draws) / totalMatches));
    const agentsActByWinAsc = [...agentActData].sort((a, b) => (a.wins / (a.wins + a.losses + a.draws)) - (b.wins / (b.wins + b.losses + b.draws)));
    const agentsActByWinDesc = [...agentActData].sort((a, b) => (b.wins / (b.wins + b.losses + b.draws)) - (a.wins / (a.wins + a.losses + a.draws)));
    const agentsActByKDAsc = [...agentActData].sort((a, b) => (a.kills / a.deaths) - (b.kills / b.deaths));
    const agentsActByKDDesc = [...agentActData].sort((a, b) => (b.kills / b.deaths) - (a.kills / a.deaths));
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
        agentsActByClass,
        agentsActByPickAsc,
        agentsActByPickDesc,
        agentsActByWinAsc,
        agentsActByWinDesc,
        agentsActByKDAsc,
        agentsActByKDDesc,
        totalMatches,
        totalActMatches,
        title: 'All Agents Stats',
        sheet: 'allAgents.css'
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
        "Deadlock",
        "Vyse"
    ]
    if (agentList.includes(req.params.agent)) {
        let act = await apiFunctions.activeSeason()
        let matches = await DatabaseFunctions.mass_retrieve_comp()
        let agentRaw = await processFunctions.get_agent_stats(req.params.agent, matches)
        let agentRawACT = await processFunctions.get_agent_stats(req.params.agent, matches, act[0].id)
        const map_pickrate = await processFunctions.get_map_pickrate(matches)
        const map_act_pickrate = await processFunctions.get_map_pickrate(matches, act[0].id)
        let agent = agentRaw[0]
        let agentACT = agentRawACT[0]
        // createJSON(`/agentData/${req.params.agent}-agent.json`,agent)
        let end = Date.now()
        console.log(`Retrieved agent stats for ${(req.params.agent).toLowerCase()} (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        res.render('agent', {
            agentData: agent,
            agentActData: agentACT,
            agentName: req.params.agent,
            agentImage: agentRaw[2],
            totalPicks: agentRaw[1],
            totalActPicks: agentRawACT[1],
            map_picks: map_pickrate,
            map_act_picks: map_act_pickrate,
            title: req.params.agent+' Stats',
            sheet: 'agent.css'
        })
    }
    else {
        let end = Date.now()
        console.log(`Failed to retrieve agent stats for ${req.params.agent} (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        res.redirect('/agent?failed=true')
    }
})

module.exports = router