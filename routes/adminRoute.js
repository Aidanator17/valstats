const express = require("express");
const router = express.Router();
const apiFunctions = require('../models/valAPI');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const DatabaseFunctions = require("../models/databaseModel");
const processFunctions = require("../models/processModel")
const { machine } = require("os");
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
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

router.get('/', async (req, res) => {
    res.redirect('/')
})

router.get('/mass-adjust', async (req, res) => {
    res.render('admin-password', { key: "mass-adjust",title: 'All Agents Stats', sheet: 'mass-adjust-style.css' })
})
router.post('/mass-adjust', async (req, res) => {
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
        res.redirect('/admin/mass-adjust')
    }
})

router.get('/test-api', async (req, res) => {
    res.render('admin-password', { key: "test-api",title: 'All Agents Stats', sheet: 'mass-adjust-style.css' })
})
router.post('/test-api', async (req, res) => {
    if (req.body.pw == '123') {
        console.log('API TEST INITIATED')
        // let testMatches = true
        // let testUserPUUID = true 
        // let testUsernames = true

        let start = Date.now()
        let og = Date.now()
        const matches = await DatabaseFunctions.mass_retrieve()
        let end = Date.now()
        console.log(indent + `Retrieved ${matches.length} matches from local database (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

        start = Date.now()
        let failedMatches = 0
        for (let i = 0; i < 5; i++) {
            try {
                chosenMatch = matches[getRandomInt(matches.length)].match_id
                await apiFunctions.getMatch(chosenMatch)
            }
            catch {
                console.log(indent + `FAILED - Attempted to find match: ${chosenMatch}`)
                failedMatches++
            }
        }
        end = Date.now()
        if (failedMatches == 0) {
            console.log(indent + `Successfully found all 5 matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        }
        else {
            console.log(indent + `Failed to find ${failedMatches}/5 matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        }

        start = Date.now()
        const users = await DatabaseFunctions.get_mass_player()
        end = Date.now()
        console.log(indent + `Retrieved ${users.length} players from local database (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

        start = Date.now()
        let failedUsers = 0
        let successfulUsers = []
        for (let i = 0; i < 10; i++) {
            try {
                chosenUser = users[getRandomInt(users.length)].puuid
                const testUser = await apiFunctions.getBasic_by_puuid(chosenUser)
                if (testUser.username == 'error'){
                    throw new Error()
                }
                successfulUsers.push(testUser)
            }
            catch {
                console.log(indent + `FAILED - Attempted to find user by PUUID: ${chosenUser}`)
                failedUsers++
            }
        }
        end = Date.now()
        if (failedUsers == 0) {
            console.log(indent + `Successfully found all 10 users by PUUID (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        }
        else {
            console.log(indent + `Failed to find ${failedUsers}/10 users by PUUID (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        }

        start = Date.now()
        let failedUsernames = 0
        for (u in successfulUsers) {
            try {
                chosenUsername = successfulUsers[u].username
                chosenTag = successfulUsers[u].tag
                const testUser = await apiFunctions.getBasic(chosenUsername, chosenTag)
            }
            catch (err) {
                console.log(indent + `FAILED - Attempted to find user by Username: ${chosenUsername}#${chosenTag}`)
                // console.log(err)
                failedUsernames++
            }
        }
        end = Date.now()
        if (failedUsernames == 0) {
            console.log(indent + `Successfully found all ${successfulUsers.length} users by PUUID (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        }
        else {
            console.log(indent + `Failed to find ${failedUsernames}/${successfulUsers.length} users by Username (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        }
        end = Date.now()
        if (failedUsernames == 0 && failedMatches == 0 && failedUsers == 0) {
            console.log(`API running at 100% (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
        }
        else {
            console.log(`API NOT running at 100%, check logs (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
        }
        res.redirect('/')
    }
    else {
        res.redirect('/admin/test-api')
    }
})


module.exports = router