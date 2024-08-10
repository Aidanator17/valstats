const express = require("express");
const router = express.Router();
const apiFunctions = require('../models/valAPI');
const DatabaseFunctions = require("../models/databaseModel");
const indent = `    `

async function createJSON(name, jsondata) {
    fs.writeFile('./extra-files/' + name, JSON.stringify(jsondata), function (err) {
        if (err) {
            console.log(err);
        }
    });
}

router.get('/', async (req, res) => {
    if (req.query.failed == 'true') {
        res.render('agentLookup', { failed: true })
    }
    else {
        res.render('agentLookup', { failed: false })
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
        "Fade"
    ]
    if (agentList.includes(req.body.agent)){
        res.redirect('/agent/'+req.body.agent)
    }
    else {
        res.redirect('/agent?failed=true')
    }
})

router.get('/:agent', async (req, res) => {
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
        "Fade"
    ]
    let agentData = {
        kills:0,
        deaths:0,
        assists:0,
        picks:0,
        maps:{
            "Abyss":{
                picks:0,
                wins:0,
                losses:0,
                draws:0
            },
            "Ascent":{
                picks:0,
                wins:0,
                losses:0,
                draws:0
            },
            "Bind":{
                picks:0,
                wins:0,
                losses:0,
                draws:0
            },
            "Breeze":{
                picks:0,
                wins:0,
                losses:0,
                draws:0
            },
            "Fracture":{
                picks:0,
                wins:0,
                losses:0,
                draws:0
            },
            "Haven":{
                picks:0,
                wins:0,
                losses:0,
                draws:0
            },
            "Icebox":{
                picks:0,
                wins:0,
                losses:0,
                draws:0
            },
            "Lotus":{
                picks:0,
                wins:0,
                losses:0,
                draws:0
            },
            "Pearl":{
                picks:0,
                wins:0,
                losses:0,
                draws:0
            },
            "Split":{
                picks:0,
                wins:0,
                losses:0,
                draws:0
            },
            "Sunset":{
                picks:0,
                wins:0,
                losses:0,
                draws:0
            },
        },
        wins:0,
        losses:0,
        draws:0,

    }
    if (agentList.includes(req.params.agent)){
        let matches = await DatabaseFunctions.mass_retrieve_comp()
        for (m in matches){

        }
        res.render('agent')
    }
    else {
        res.redirect('/agent?failed=true')
    }
})

module.exports = router