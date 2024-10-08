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
    res.redirect('/userMatchSearch/lookup')
})
router.get('/lookup', async (req, res) => {
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
    ].sort()
    res.render('userMatchesSearch',
        {
            agents: agentList
        }
    )
})
router.post('/lookup', async (req, res) => {
    let mainUser = await apiFunctions.getBasic(req.body.username,req.body.tag)
    if (req.body.agent){
        req.session.agent = req.body.agent
    }
    if (req.body.extraUsername){
        req.session.extraUsername = req.body.extraUsername
        req.session.extraTag = req.body.extraTag
    }
    res.redirect('/user/'+req.body.username+'/'+req.body.tag)
})

module.exports = router