const express = require("express");
const router = express.Router();
const session = require('express-session');
const apiFunctions = require('../models/valAPI.js');
const fs = require('fs');
const DatabaseFunctions = require("../models/databaseModel");
const processFunctions = require("../models/processModel");
const { userInfo } = require("os");

async function createJSON(name, jsondata) {
    fs.writeFile('./extra-files/' + name, JSON.stringify(jsondata), function (err) {
        if (err) {
            console.log(err);
        }
    });
}
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}
function compare_count(a, b) {
    if (a.count < b.count) {
        return 1;
    }
    if (a.count > b.count) {
        return -1;
    }
    return 0;
}
function winCheck(match, puuid) {
    for (p in match['data']['players']['all_players']) {
        if (match['data']['players']['all_players'][p]['puuid'] == puuid) {
            if (match['data']['players']['all_players'][p]['team'] == 'Red') {
                if (match['data']['teams']['red']['has_won']) {
                    return true
                }
                else {
                    return false
                }
            }
            else {
                if (match['data']['teams']['blue']['has_won']) {
                    return true
                }
                else {
                    return false
                }
            }
        }
    }
}
function winCheckNum(match, puuid) {
    for (p in match['data']['players']['all_players']) {
        if (match['data']['players']['all_players'][p]['puuid'] == puuid) {
            if (match['data']['players']['all_players'][p]['team'] == 'Red') {
                if (match['data']['teams']['red']['has_won']) {
                    return 1
                }
                else {
                    return 0
                }
            }
            else {
                if (match['data']['teams']['blue']['has_won']) {
                    return 1
                }
                else {
                    return 0
                }
            }
        }
    }
}



router.get('/', async (req, res) => {
    res.redirect('/userBatch/lookup')
})
router.get('/lookup', async (req, res) => {
    res.render('userBatchLookup')
})
router.post('/lookup', async (req, res) => {
    let userCount = Object.keys(req.body).length / 2
    let userList = []
    for (let i = 0; i < userCount; i++) {
        userList.push(req.body['user'+(i+1)]+'#'+req.body['tag'+(i+1)])
      }
    req.session.userList = userList
    res.redirect('/userBatch/group')
})
router.get('/group', async (req, res) => {
    const batch = await processFunctions.get_batch_user(req.session.userList)
    // await createJSON('batchTestMatch.json',batch)
    res.render('userBatch',{
        title:'Batch Check',
        sheet:'user.css',
        UserInfo:batch
    })
})


module.exports = router