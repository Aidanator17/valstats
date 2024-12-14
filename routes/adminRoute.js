const express = require("express");
const router = express.Router();
const apiFunctions = require('../models/valAPI.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const DatabaseFunctions = require("../models/databaseModel");
const processFunctions = require("../models/processModel")
const {
    machine
} = require("os");
const indent = `    `
const zlib = require('zlib');

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
    res.render('admin-password', {
        key: "mass-adjust",
        title: 'All Agents Stats',
        sheet: 'mass-adjust-style.css'
    })
})

// Helper function to decompress data
const decompressData = (data) =>
    new Promise((resolve, reject) => {
        zlib.gunzip(data, (err, decompressedBuffer) => {
            if (err) {
                console.error('Error decompressing data:', err);
                return reject(err);
            }
            try {
                const jsonData = JSON.parse(decompressedBuffer.toString());
                resolve(jsonData);
            } catch (parseError) {
                console.error('Error parsing JSON data:', parseError);
                reject(parseError);
            }
        });
    });

router.post('/mass-adjust', async (req, res) => {
    if (req.body.pw !== '123') {
        return res.redirect('/admin/mass-adjust');
    }

    console.log('MASS ADJUST INITIATED');
    const startOverall = Date.now();

    try {
        const startingPlayers = (await DatabaseFunctions.get_mass_player()).length;
        const startingPlayerMatches = (await DatabaseFunctions.get_mass_Player_Matches()).length;

        const all_matches = await DatabaseFunctions.mass_retrieve();
        const matches = await Promise.all(
            all_matches.map((match) => decompressData(match['match_info']))
        );

        let count = 0;
        const avgTimes = [];
        for (const match of matches) {
            const startIter = Date.now();
            const players = match.data.players.all_players;
            const matchId = match.data.metadata.matchid;
            const data = [];

            for (const player of players) {
                const [exists, playerId] = await DatabaseFunctions.check_player(player.puuid);
                const pid = exists
                    ? playerId
                    : await DatabaseFunctions.create_player(player.puuid)
                        .then(() => DatabaseFunctions.check_player(player.puuid))
                        .then(([_, id]) => id);

                data.push({ player_id: pid, matchid: matchId });
            }

            // Batch add player matches
            await DatabaseFunctions.add_Player_Matches(data);

            // Mark match as adjusted
            await DatabaseFunctions.mark_adjust(matchId);

            // Log progress
            const endIter = Date.now();
            avgTimes.push(endIter - startIter);
            const avgTime = avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length;
            const eta = Math.round(((all_matches.length - count - 1) * avgTime) / 1000);
            console.log(
                `${Math.round(((count + 1) / all_matches.length) * 100)}% completed. ETA: ${eta}s`
            );

            count++;
        }

        const endOverall = Date.now();
        const totalTime = ((endOverall - startOverall) / 1000).toFixed(1);
        const newPlayers = (await DatabaseFunctions.get_mass_player()).length;
        const newPlayerMatches = (await DatabaseFunctions.get_mass_Player_Matches()).length;

        console.log(`MASS ADJUST CONCLUDED (${totalTime}s)`);
        console.log(
            `Players table increased by ${newPlayers - startingPlayers} (${startingPlayers} -> ${newPlayers})\n` +
            `Player-Matches table increased by ${newPlayerMatches - startingPlayerMatches} (${startingPlayerMatches} -> ${newPlayerMatches})`
        );

        logMassAdjust(startingPlayers, newPlayers, startingPlayerMatches, newPlayerMatches, totalTime);
        res.redirect('/');
    } catch (error) {
        console.error('Error during mass adjust:', error);
        res.status(500).send('An error occurred during the process.');
    }
});


router.get('/mass-update', async (req, res) => {
    res.render('admin-password', {
        key: "mass-update",
        title: 'Mass Update',
        sheet: 'mass-adjust-style.css'
    })
})
router.post('/mass-update', async (req, res) => {
    if (req.body.pw == '123') {
        await processFunctions.massUpdateData()
        res.redirect('/')
    } else {
        res.redirect('/admin/mass-update')
    }
})

router.get('/test-api', async (req, res) => {
    res.render('admin-password', {
        key: "test-api",
        title: 'All Agents Stats',
        sheet: 'mass-adjust-style.css'
    })
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
            } catch {
                console.log(indent + `FAILED - Attempted to find match: ${chosenMatch}`)
                failedMatches++
            }
        }
        end = Date.now()
        if (failedMatches == 0) {
            console.log(indent + `Successfully found all 5 matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        } else {
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
                if (testUser.username == 'error') {
                    throw new Error()
                }
                successfulUsers.push(testUser)
            } catch {
                console.log(indent + `FAILED - Attempted to find user by PUUID: ${chosenUser}`)
                failedUsers++
            }
        }
        end = Date.now()
        if (failedUsers == 0) {
            console.log(indent + `Successfully found all 10 users by PUUID (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        } else {
            console.log(indent + `Failed to find ${failedUsers}/10 users by PUUID (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        }

        start = Date.now()
        let failedUsernames = 0
        for (u in successfulUsers) {
            try {
                chosenUsername = successfulUsers[u].username
                chosenTag = successfulUsers[u].tag
                const testUser = await apiFunctions.getBasic(chosenUsername, chosenTag)
            } catch (err) {
                console.log(indent + `FAILED - Attempted to find user by Username: ${chosenUsername}#${chosenTag}`)
                // console.log(err)
                failedUsernames++
            }
        }
        end = Date.now()
        if (failedUsernames == 0) {
            console.log(indent + `Successfully found all ${successfulUsers.length} users by PUUID (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        } else {
            console.log(indent + `Failed to find ${failedUsernames}/${successfulUsers.length} users by Username (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        }
        end = Date.now()
        if (failedUsernames == 0 && failedMatches == 0 && failedUsers == 0) {
            console.log(`API running at 100% (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
        } else {
            console.log(`API NOT running at 100%, check logs (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
        }
        res.redirect('/')
    } else {
        res.redirect('/admin/test-api')
    }
})
router.get('/boys', async (req, res) => {
    await processFunctions.fetchTheBoys()
    res.redirect('/')
})


module.exports = router