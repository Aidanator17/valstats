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
    await DatabaseFunctions.getLeaderboard()
    res.redirect('/')
})

router.get('/x', async (req, res) => {
    const matches = await DatabaseFunctions.small_retrieve_comp()
    const leaderboard = {}; 

    let start = Date.now()
    matches.forEach(match => {
        const players = match.data.players.all_players; // Access players array
        const totalRounds = match.data.metadata.rounds_played; // Total rounds played in the match
        const redTeamWon = match.data.teams.red.has_won; // Check if Red team won
        const blueTeamWon = match.data.teams.blue.has_won; // Check if Blue team won
        const matchDate = match.data.metadata.game_start; // Game start timestamp (Unix)

        // Loop through each player in the match
        players.forEach(player => {
            const playerId = player.puuid; // Unique player identifier
            const playerName = player.name; // Player name
            const playerTag = player.tag; // Player tag
            const stats = player.stats; // Player stats for the match
            const currentTier = player.currenttier_patched; // Player's rank (string)

            if (!leaderboard[playerId]) {
                // If player does not exist in the leaderboard, add them
                leaderboard[playerId] = {
                    id: playerId,
                    name: playerName,
                    tag: playerTag,
                    matchesPlayed: 0,
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    score: 0,
                    bodyshots: 0,
                    headshots: 0,
                    legshots: 0,
                    totalRounds: 0,
                    wins: 0, // Initialize wins to 0
                    last_known_rank: currentTier, // Initialize rank with current match's rank
                    last_known_rank_date: matchDate, // Initialize rank date with current match's timestamp
                };
            }

            // Update player's stats in the leaderboard
            leaderboard[playerId].matchesPlayed += 1;
            leaderboard[playerId].kills += stats.kills;
            leaderboard[playerId].deaths += stats.deaths;
            leaderboard[playerId].assists += stats.assists;
            leaderboard[playerId].score += stats.score;
            leaderboard[playerId].bodyshots += stats.bodyshots;
            leaderboard[playerId].headshots += stats.headshots;
            leaderboard[playerId].legshots += stats.legshots;
            leaderboard[playerId].totalRounds += totalRounds;

            // Update wins if the player's team won
            if ((player.team === 'Red' && redTeamWon) || (player.team === 'Blue' && blueTeamWon)) {
                leaderboard[playerId].wins += 1;
            }

            // Update last_known_rank and last_known_rank_date if this match is more recent
            if (matchDate > leaderboard[playerId].last_known_rank_date) {
                leaderboard[playerId].last_known_rank = currentTier;
                leaderboard[playerId].last_known_rank_date = matchDate;
                leaderboard[playerId].name = playerName;
                leaderboard[playerId].tag = playerTag;
            }
        });
    });
    let end = Date.now()
    console.log(`Recorded stats for ${matches.length} matches (${Math.round(((end - start) / 1000) * 100) / 100}s)`)

    start = Date.now()
    // Step 1: Filter out players with less than 20 matches played
    const filteredLeaderboard = Object.values(leaderboard).filter(player => player.matchesPlayed >= 20);

    // Step 2: Loop through each player and calculate new stats
    filteredLeaderboard.forEach(player => {
        const totalShots = player.headshots + player.bodyshots + player.legshots;
        player.headshot_percentage = totalShots > 0 ? (player.headshots / totalShots) * 100 : 0;
        player.KD = player.deaths > 0 ? player.kills / player.deaths : player.kills;
        player.KDA = player.deaths > 0 ? (player.kills + player.assists) / player.deaths : player.kills + player.assists;
        player.win_percentage = (player.wins / player.matchesPlayed) * 100;
        player.ACS = player.totalRounds > 0 ? player.score / player.totalRounds : 0;
    });
    const sortedByHeadshotPercentage = [...filteredLeaderboard].sort((a, b) => b.headshot_percentage - a.headshot_percentage);
    const sortedByKD = [...filteredLeaderboard].sort((a, b) => b.KD - a.KD);
    const sortedByKDA = [...filteredLeaderboard].sort((a, b) => b.KDA - a.KDA);
    const sortedByWinPercentage = [...filteredLeaderboard].sort((a, b) => b.win_percentage - a.win_percentage);
    const sortedByACS = [...filteredLeaderboard].sort((a, b) => b.ACS - a.ACS);

    res.redirect('/')
})



module.exports = router