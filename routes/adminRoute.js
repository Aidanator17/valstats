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

router.get('/', async (req, res) => {
    res.redirect('/admin/index')
})
router.get('/index', async (req, res) => {
    res.render('adminIndex')
})


router.get('/mass-adjust', async (req, res) => {
    res.render('admin-password', {
        key: "mass-adjust",
        title: 'All Agents Stats',
        sheet: 'mass-adjust-style.css'
    })
})
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
        if (matches.length > 0) {
            logMassAdjust(startingPlayers, newPlayers, startingPlayerMatches, newPlayerMatches, totalTime);
        }
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
        res.redirect('/user/Aidanator/JAX')
    } else {
        res.redirect('/admin/mass-update')
    }
})

router.get('/update-friends', async (req, res) => {
    await processFunctions.fetchTheBoys()
    res.redirect('/')
})
router.get('/update-episodes', async (req, res) => {
    let start = Date.now()
    const unfEps = await apiFunctions.getData()
    let Eps = await processFunctions.reformatEpisodes(unfEps['acts'])
    await DatabaseFunctions.updateEpiData(Eps)
    let end = Date.now()
    console.log(`Updated Episode Data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    res.redirect('/')
})
router.get('/update-agent-data', async (req, res) => {
    let og = Date.now()

    const unfEps = await apiFunctions.getData()
    let Eps = await processFunctions.reformatEpisodes(unfEps['acts'])

    let start = Date.now()
    const matches = await DatabaseFunctions.mass_retrieve_comp()
    let end = Date.now()
    console.log(`Retrieved ${matches.length} matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

    await DatabaseFunctions.updateAgentData(matches, Eps, processFunctions.get_agent_stats)
    await DatabaseFunctions.updateMassAgentData(matches, Eps, processFunctions.get_all_agent_stats)

    end = Date.now()

    console.log(`Updated Agent Data (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
    res.redirect('/')
})
router.get('/update-map-data', async (req, res) => {
    let og = Date.now()

    const unfEps = await apiFunctions.getData()
    let Eps = await processFunctions.reformatEpisodes(unfEps['acts'])

    let start = Date.now()
    const matches = await DatabaseFunctions.mass_retrieve_comp()
    let end = Date.now()
    console.log(`Retrieved ${matches.length} matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

    await DatabaseFunctions.updateMapPicks(matches)
    await DatabaseFunctions.updateMapStats(matches, Eps, processFunctions.get_map_stats)

    end = Date.now()

    console.log(`Updated Map Data (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
    res.redirect('/')
})
router.get('/update-leaderboard', async (req, res) => {
    let og = Date.now()

    const unfEps = await apiFunctions.getData()
    let Eps = await processFunctions.reformatEpisodes(unfEps['acts'])

    let start = Date.now()
    const matches = await DatabaseFunctions.mass_retrieve_comp()
    let end = Date.now()
    console.log(`Retrieved ${matches.length} matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

    await DatabaseFunctions.updateLeaderboard(matches, Eps)

    end = Date.now()

    console.log(`Updated the leaderboard (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
    res.redirect('/')
})
router.get('/batch-add', async (req, res) => {
    res.render('run-limit', {
        key: "batch-add",
        title: 'Batch Add',
        sheet: 'mass-adjust-style.css'
    })
})
router.post('/batch-add', async (req, res) => {
    if (req.body.iter.trim() === "") {
        return res.redirect('/admin/batch-add');
    } else {
        let num = Number(req.body.iter);
        let players = []
        if (isNaN(num)) {
            return res.redirect('/admin/batch-add');
        } else if (Number.isInteger(num)) {
            players = await DatabaseFunctions.getRandomPlayers(num)
            await processFunctions.batchAdd(players)
        } else {
            num = Math.round(num);
            players = await DatabaseFunctions.getRandomPlayers(num)
            await processFunctions.batchAdd(players)
        }
    }
    res.redirect('/admin/');
});


module.exports = router