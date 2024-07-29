const express = require("express");
const router = express.Router();
const fetch = require("node-fetch")
const UserData = require('../models/valAPI');
const db = require('../models/databaseModel');
const key = "?api_key=HDEV-cbf520fc-b91f-4235-b15b-a4d663f6bc9b&size=20"
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const DatabaseFunctions = require("../models/databaseModel");
const { userInfo } = require("os");
const { match } = require("assert");
const indent = `    `

async function createJSON(name, jsondata) {
    fs.writeFile('./extra-files/' + name, JSON.stringify(jsondata), function (err) {
        if (err) {
            console.log(err);
        }
    });
}

function logMassAdjust(startingP, newP, startingPM, newPM, duration) {
    // Path to the log file
    const logFilePath = path.join(__dirname, '..', 'logs', 'mass-adjust-log.txt');

    // Get the current time in PST
    const formattedDate = moment().tz('America/Vancouver').format('YYYY-MM-DD HH:mm');


    // Format the log entry
    const logEntry = `MASS ADJUST --- ${formattedDate}
  Duration: ${duration}s
  Players table increased by ${newP - startingP} (${startingP} -> ${newP})
  Player-Matches table increased by ${newPM - startingPM} (${startingPM} -> ${newPM})
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  `;

    // Read the existing log file content
    let existingLog = '';
    if (fs.existsSync(logFilePath)) {
        existingLog = fs.readFileSync(logFilePath, 'utf8');
    }

    // Append the new log entry at the top
    fs.writeFileSync(logFilePath, logEntry + "\n" + existingLog);
}

router.get('/', async (req, res) => {
    // const id = (await UserData.getBasic('Fish','4484')).puuid
    // console.log(await db.check_player(id))

    res.redirect('/userlookup')
})
router.get('/user', async (req, res) => {
    // const id = (await UserData.getBasic('Fish','4484')).puuid
    // console.log(await db.check_player(id))

    res.redirect('/userlookup')
})


router.get('/userlookup', async (req, res) => {
    res.render('userlookup')
})
router.post('/userlookup', async (req, res) => {
    res.redirect('/user/' + req.body.user + '/' + req.body.tag)
})
router.get('/user/mass-adjust', async (req, res) => {
    res.render('mass-adjust')
})
router.get('/user/:puuid', async (req, res) => {
    let data = await UserData.getBasic_by_puuid(req.params.puuid)
    res.redirect(`/user/${data['username']}/${data['tag']}`)
})
router.get('/user/:user/:tag', async (req, res) => {
    console.log(`Attempting to retrieve data for ${req.params.user}#${req.params.tag}`)

    let start = Date.now()
    let og = Date.now()

    let UserInfo = {
        username: req.params.user,
        tag: req.params.tag,
        matches: [],
        stats: {
            overall: {},
            past5: {}
        }
    }
    const info = await UserData.getBasic(req.params.user, req.params.tag)
    let end = Date.now()
    console.log(indent + `Retrieved basic data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

    let checker = await DatabaseFunctions.check_player(info.puuid)
    let exist = checker[0]
    let pid = checker[1]
    if (!exist) {
        const addplayer = await DatabaseFunctions.create_player(info.puuid)
        console.log(indent + `Player Added To Database`)
        checker = await DatabaseFunctions.check_player(info.puuid)
        pid = checker[1]
    }

    UserInfo['puuid'] = info.puuid
    UserInfo['img'] = info.small_card
    UserInfo['lvl'] = info.acc_lvl
    UserInfo['region'] = info.reg

    start = Date.now()
    let matchlist = await UserData.getMatchList(UserInfo['puuid'], UserInfo['region'])
    // createJSON('matchlist.json', matchlist)
    let rawmatchlist = matchlist
    end = Date.now()
    if (matchlist) {
        console.log(indent + `Retrieved match list data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    }
    start = Date.now()
    const playerMatches = await DatabaseFunctions.get_Player_Matches(pid)
    let returned_matches = matchlist.length
    let toRemove = []
    if (playerMatches.length > 0) {
        for (matchid in matchlist) {
            for (playerMatch in playerMatches) {
                if (matchlist[matchid] == playerMatches[playerMatch].matchid) {
                    toRemove.push(matchlist[matchid])
                }
                else {
                    continue
                }
            }
        }
        for (item in toRemove) {
            const index = matchlist.indexOf(toRemove[item]);
            if (index > -1) {
                matchlist.splice(index, 1);
                returned_matches--
            }
        }
        end = Date.now()
    }
    console.log(indent + `${returned_matches} undocumented matches found (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

    queue = 1
    if (matchlist.length > 0) {
        let newmatches = []
        for (m in matchlist) {
            start = Date.now()
            newmatches.push(await UserData.getMatch(matchlist[m]))
            end = Date.now()
            console.log(indent + `retrieved match ${queue}/${returned_matches} data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            queue++
        }
        start = Date.now()
        await DatabaseFunctions.mass_add(newmatches, rawmatchlist, pid)
        end = Date.now()
        console.log(indent + `All ${returned_matches} matches successfully added (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    }
    start = Date.now()
    real_matches = (await DatabaseFunctions.get_matches_by_pid(pid)).sort((a, b) => b.match_starttime - a.match_starttime)

    let totalkills = 0
    let totaldeaths = 0
    let totalheadshots = 0
    let totalbodyshots = 0
    let totallegshots = 0
    let totalwins = 0
    let totallosses = 0
    let past5kills = 0
    let past5deaths = 0
    let past5headshots = 0
    let past5bodyshots = 0
    let past5legshots = 0
    let past5wins = 0
    let past5losses = 0
    for (m in real_matches) {
        UserInfo['matches'].push(await UserData.alterMatch(JSON.parse(real_matches[m]['match_info']), UserInfo['puuid'],false))
    }
    for (m in UserInfo['matches']) {

        if (UserInfo['matches'][m]['data']['metadata']['mode_id'] == 'competitive') {
            for (p in UserInfo['matches'][m]['data']['players']['all_players']) {
                if (UserInfo['matches'][m]['data']['players']['all_players'][p]['puuid'] == UserInfo['puuid']) {
                    totalkills = totalkills + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['kills']
                    totaldeaths = totaldeaths + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['deaths']
                    totalheadshots = totalheadshots + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['headshots']
                    totalbodyshots = totalbodyshots + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['bodyshots']
                    totallegshots = totallegshots + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['legshots']
                    if (m < 5) {
                        past5kills = past5kills + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['kills']
                        past5deaths = past5deaths + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['deaths']
                        past5headshots = past5headshots + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['headshots']
                        past5bodyshots = past5bodyshots + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['bodyshots']
                        past5legshots = past5legshots + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['legshots']
                    }
                }
            }
            if (UserInfo['matches'][m]['data']['metadata']['result'] == 'Win') {
                if (m < 5) {
                    past5wins = past5wins + 1
                }
                totalwins = totalwins + 1
            }
            else {
                if (m < 5) {
                    past5losses = past5losses + 1
                }
                totallosses = totallosses + 1
            }
        }
    }
    UserInfo['stats']['overall']['HSP'] = Math.round((totalheadshots / (totalbodyshots + totalheadshots + totallegshots)) * 1000) / 10
    UserInfo['stats']['past5']['HSP'] = Math.round((past5headshots / (past5bodyshots + past5headshots + past5legshots)) * 1000) / 10
    UserInfo['stats']['overall']['KD'] = Math.round((totalkills / totaldeaths) * 100) / 100
    UserInfo['stats']['past5']['KD'] = Math.round((past5kills / past5deaths) * 100) / 100
    UserInfo['stats']['overall']['wp'] = Math.round((totalwins / (totalwins + totallosses)) * 1000) / 10
    UserInfo['stats']['past5']['wp'] = Math.round((past5wins / (past5wins + past5losses)) * 1000) / 10
    // console.log(UserInfo['stats'])
    end = Date.now()
    console.log(indent + `All matches retrieved and formatted (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

    // createJSON("test.json",UserInfo['matches'][0])

    end = Date.now()
    console.log(`Data for ${UserInfo['username']}#${UserInfo['tag']} retrieved (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
    // console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)
    res.render('user', { UserInfo })

})
router.get('/user/:user/:tag/:matchid', async (req, res) => {
    let start = Date.now()
    const match = JSON.parse((await DatabaseFunctions.get_match_by_match_id(req.params.matchid))['match_info'])
    const puuid = (await UserData.getBasic(req.params.user, req.params.tag)).puuid
    match['data']['metadata']['main-username'] = req.params.user
    match['data']['metadata']['main-tag'] = req.params.tag

    const matchData = await UserData.alterMatch(match,puuid,true)
    let end = Date.now()
    console.log(`Match data for ${req.params.matchid} retrieved (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    res.render('user-match',{matchData})
})

router.post('/user/mass-adjust', async (req, res) => {
    if (req.body.pw == '123') {
        console.log('MASS ADJUST INITIATED')
        const startingP = (await DatabaseFunctions.get_mass_player()).length
        const startingPM = (await DatabaseFunctions.get_mass_Player_Matches()).length
        let data = []
        let count = 1
        const all_matches = await DatabaseFunctions.mass_retrieve()

        let start
        let end
        let og = Date.now()
        for (m in all_matches) {
            start = Date.now()
            let players = JSON.parse(all_matches[m]['match_info'])['data']['players']['all_players']
            // createJSON("player.json",players)
            for (p in players) {
                let checker = await DatabaseFunctions.check_player(players[p]['puuid'])
                let exist = checker[0]
                let pid = checker[1]
                if (!exist) {
                    const addplayer = await DatabaseFunctions.create_player(players[p]['puuid'])
                    checker = await DatabaseFunctions.check_player(players[p]['puuid'])
                    pid = checker[1]
                }
                data.push({
                    player_id: pid,
                    matchid: JSON.parse(all_matches[m]['match_info'])['data']['metadata']['matchid']
                })
            }
            await DatabaseFunctions.add_Player_Matches(data)
            end = Date.now()
            console.log(`${Math.round((count / all_matches.length) * 10000) / 100}%`)
            count++
        }
        end = Date.now()
        console.log(`MASS ADJUST CONCLUDED (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
        const newP = (await DatabaseFunctions.get_mass_player()).length
        const newPM = (await DatabaseFunctions.get_mass_Player_Matches()).length
        console.log(`Players table increased by ${newP - startingP} (${startingP} -> ${newP})\nPlayer-Matches table increased by ${newPM - startingPM} (${startingPM} -> ${newPM})`)
        logMassAdjust(startingP, newP, startingPM, newPM, Math.round(((end - og) / 1000) * 10) / 10)
        res.redirect('/')
    }
    else {
        res.redirect('/user/mass-adjust')
    }
})
module.exports = router