const express = require("express");
const router = express.Router();
const apiFunctions = require('../models/valAPI.js');
const fs = require('fs');
const fetch = require("node-fetch")
const DatabaseFunctions = require("../models/databaseModel");
const processFunctions = require("../models/processModel");
const UserFunctions = require("../models/userModel.js")
const { tr } = require("date-fns/locale");
const indent = `    `

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
    // const id = (await UserData.getBasic('Fish','4484')).puuid
    // console.log(await db.check_player(id))

    // for (let i = 0; i < 10; i++){
    //     res.render('test',{testValue:getRandomInt(500)})
    // }
    await apiFunctions.activeSeason()
    res.redirect('/user-by-act/lookup')
})

router.get('/lookup', async (req, res) => {
    const Eps = await DatabaseFunctions.getEpiData()
    // console.log(Eps)
    if (req.query.failed == 'true') {
        res.render('useractlookup', {
            failed: true,
            title: 'User Lookup',
            sheet: 'lookup-style.css',
            episodes: Eps.reverse()
        })
    }
    else {
        res.render('useractlookup', {
            failed: false,
            title: 'User Lookup',
            sheet: 'lookup-style.css',
            episodes: Eps.reverse()
        })
    }
})

router.post('/lookup', async (req, res) => {
    res.redirect('/user-by-act/' + req.body.user + '/' + req.body.tag + '/' + req.body.act)
})

// router.get('/:puuid', async (req, res) => {
//     let data = await apiFunctions.getBasic_by_puuid(req.params.puuid)
//     res.redirect(`/user-by-act/${data['username']}/${data['tag']}`)
// })

router.get('/:user/:tag/:act', async (req, res) => {

    let start = Date.now()
    let og = Date.now()

    const UserInfo = await processFunctions.get_user_data(req.params.user,req.params.tag,true,req.session.agent,req.session.extraUsername,req.session.extraTag,req.params.act)
    if (UserInfo) {
        UserInfo.roundKills = await processFunctions.getRoundKills(UserInfo.comp_matches,UserInfo.puuid)
        // createJSON("kills.json", UserInfo.roundKills)

        res.render('user', {
            UserInfo,
            title: UserInfo['username'],
            sheet: 'user.css',
            ifAct: true
        })
    }
    else {
        res.redirect('/user/lookup?failed=true')
    }
})

router.get('/:user/:tag/:matchid', async (req, res) => {
    let start = Date.now()
    const match = JSON.parse((await DatabaseFunctions.get_match_by_match_id(req.params.matchid))['match_info'])
    const puuid = (await apiFunctions.getBasic(req.params.user, req.params.tag)).puuid
    match['data']['metadata']['main-username'] = req.params.user
    match['data']['metadata']['main-tag'] = req.params.tag

    const matchData = await processFunctions.alterMatch(match, puuid, true)
    let end = Date.now()
    console.log(`Match data for ${req.params.matchid} retrieved (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    res.render('user-match', {
        matchData,
        title: 'Match Details',
        sheet: 'user-match.css'
    })
})

module.exports = router