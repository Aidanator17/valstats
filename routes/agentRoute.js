const express = require("express");
const router = express.Router();
const apiFunctions = require('../models/valAPI.js');
const DatabaseFunctions = require("../models/databaseModel");
const processFunctions = require("../models/processModel")
const indent = `    `

const fs = require('fs').promises;
const path = require('path');

async function createJSON(name, jsondata) {
    try {
        // Ensure directory exists
        const dir = './extra-files/';
        await fs.mkdir(dir, {
            recursive: true
        });

        // Write the file
        const filePath = path.join(dir, name);
        // console.log('Writing file to:', filePath);
        // console.log('Data to write:', JSON.stringify(jsondata));
        await fs.writeFile(filePath, JSON.stringify(jsondata, null, 2));
        // console.log('File written successfully');
    } catch (err) {
        console.log('Error writing file:', err);
    }
}

function combineAgentActs(arr) {
    const combined = {};

    arr.forEach(obj => {
        Object.keys(obj).forEach(key => {
            // If the key is an object, recurse into it
            if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
                if (!combined[key]) {
                    combined[key] = {};
                }
                // Recursively combine the nested object
                combined[key] = combineAgentActs([combined[key], obj[key]]);
            }
            // If it's a string, just set it (assuming they are the same in all objects)
            else if (typeof obj[key] === 'string') {
                combined[key] = obj[key];
            }
            // If it's a number or something else, sum or assign the value
            else {
                combined[key] = (combined[key] || 0) + obj[key];
            }
        });
    });

    return combined;
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
        res.render('agentLookup', {
            failed: true,
            agents: agentList.sort(),
            title: 'Agent Lookup',
            sheet: 'agentLookup.css'
        })
    } else {
        res.render('agentLookup', {
            failed: false,
            agents: agentList.sort(),
            title: 'Agent Lookup',
            sheet: 'agentLookup.css'
        })
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
    } else {
        res.redirect('/agent?failed=true')
    }
})

router.get('/all', async (req, res) => {
    let og = Date.now()
    let act = await apiFunctions.activeSeason()
    // const matches = await DatabaseFunctions.mass_retrieve_comp()
    // const act_matches = await DatabaseFunctions.get_act_comp_matches(act[0].id)
    let agentData = await DatabaseFunctions.getMassAgentData()
    let agentRawActData = await DatabaseFunctions.getMassAgentData(act[0].id)
    let agentActData = agentRawActData[0]
    let totalMatches = await DatabaseFunctions.getCompMatchNum()
    let totalActMatches = agentRawActData[1]
    let start = Date.now()
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
    console.log(`Sorted mass agent stats (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    console.log(`Retrieved mass agent stats (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
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

router.get('/KAY/O', async (req, res) => {
    let start = Date.now()
    let og = Date.now()
    req.params.agent = 'KAY/O'
    let agentRaw = await DatabaseFunctions.getAgentData(req.params.agent);
    let agent = combineAgentActs(agentRaw)
    const map_pickrate = await DatabaseFunctions.getMapPicks()
    // createJSON(`/agentData/${req.params.agent}-agent.json`,agent)
    let totalPicks = 0;

    Object.keys(map_pickrate).forEach(map => {
        totalPicks += map_pickrate[map].count;
    });

    data = {
        agentData: agent,
        agentActData: agentRaw,
        agentName: req.params.agent,
        agentImage: agent.img,
        totalPicks
    }
    data.map_picks = map_pickrate
    data.title = data.agentName + ' Stats'
    data.sheet = 'agent.css'
    end = Date.now()
    console.log(`Retrieved agent stats for ${(req.params.agent).toLowerCase()} (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
    res.render('agent', data)
})
router.get('/:agent', async (req, res) => {
    let start = Date.now()
    let og = Date.now()
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
        let agentRaw = await DatabaseFunctions.getAgentData(req.params.agent);
        let agent = combineAgentActs(agentRaw)
        const map_pickrate = await DatabaseFunctions.getMapPicks()
        // createJSON(`/agentData/${req.params.agent}-agent.json`,agentRaw)
        let totalPicks = 0;

        Object.keys(map_pickrate).forEach(map => {
            totalPicks += map_pickrate[map].count;
        });

        data = {
            agentData: agent,
            agentActData: agentRaw,
            agentName: req.params.agent,
            agentImage: agent.img,
            totalPicks
        }
        data.map_picks = map_pickrate
        data.title = data.agentName + ' Stats'
        data.sheet = 'agent.css'
        end = Date.now()
        console.log(`Retrieved agent stats for ${(req.params.agent).toLowerCase()} (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
        res.render('agent', data)
    } else {
        let end = Date.now()
        console.log(`Failed to retrieve agent stats for ${req.params.agent} (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        res.redirect('/agent?failed=true')
    }
})

module.exports = router