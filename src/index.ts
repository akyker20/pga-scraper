// imports

import * as cheerio from 'cheerio';
import * as phantom from 'phantom';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as moment from 'moment';
const Table = require('cli-table');
const colors = require('colors/safe');

import { ITournament, IPlayer } from './models';
import { MongoData } from './data/mongo';
import { IPerformance } from './models';
import { performance } from 'perf_hooks';
import { ITimes } from './data/index';

// map

const StatStrMap: {[key: string]: string} = {
  'SG: OFF THE TEE': 'SG:OTT',
  'SG: APPROACH TO THE GREEN': 'SG:APPTG',
  'SG: AROUND THE GREEN': 'SG:ATG',
  'SG: PUTTING': 'SG:PUTT',
  'SG: TEE TO GREEN': 'SG:TTG',
  'SG: TOTAL': 'SG:TOTAL',
}

// constants

const dbHost = process.env.MONGO_HOST || 'localhost';
const dbPort = process.env.MONGO_PORT || '27017';
const dbName = process.env.MONGO_DB_NAME || 'pga';

const DataLayer = new MongoData(`mongodb://${dbHost}:${dbPort}/${dbName}`);

const YearPattern = /(?:^|\b)(2017|2018|2019)(?=\b|$)/
const MonthDayPattern = /^(\w+) (\d{2})/

declare var $: any;

// helpers

/**
 * Useful to delay phantom so that certain actions (changing dropdown value) can take effect
 * and the desired data can be scraped.
 * @param seconds 
 */
function delaySec(seconds: number) {
  return new Promise((res, rej) => setTimeout(res, seconds * 1000.0))
}

/**
 * 
 * @param dateRangeStr Two formats I have seen
 * 1. JANUARY 4-7, 2018
 * 2. NOVEMBER 28 - DECEMBER 1, 2018
 */
function parseStartDate(dateRangeStr: string): string {

  // get year
  const yearMatches = YearPattern.exec(dateRangeStr);
  let year = null;
  if (yearMatches !== null) {
    year = yearMatches[1];
  } else {
    throw new Error(`Could not parse year from date range ${dateRangeStr}`)
  }

  // get month and day
  const monthDayMatches = MonthDayPattern.exec(dateRangeStr);
  let monthDay = null;
  if (monthDayMatches !== null) {
    monthDay = monthDayMatches[0];
  } else {
    throw new Error(`Could not parse month and day from date range ${dateRangeStr}`);
  }

  return moment(`${monthDay}, ${year}`, 'MMMM DD, YYYY').toISOString();

}

async function pullMissingPlayerStatsForAllPlayers() {
  let allPlayers = readAllPlayers();
  let errors = validatePlayers(allPlayers);
  if (!_.isEmpty(errors)) {
    console.log(`Errors:\n  ${errors.join('\n  ')}`)
    return null;
  }
  console.log(`Read ${allPlayers.length} players from players.json.`)
  await Promise.all(allPlayers.map(pullMissingPlayerStats));
}

function printPerformance(performance: IPerformance) {
  console.log('\n');
  console.log(colors.cyan.bold(performance.playerName));
  console.log(performance.tourneyName);
  let timeSince = moment(performance.startDate).fromNow();
  let formattedTime = moment(performance.startDate).format('MM/DD/YY');
  console.log(`${formattedTime} (${timeSince})`);

  let topHeaders = _.keys(performance.stats);
  let topHeaderLabels = _.map(topHeaders, header => colors.white.bold(header));
  const table = new Table({ 
    head: ["", ...topHeaderLabels]
  });


  let statHeaders = _.keys(performance.stats[topHeaders[0]]);
  
  let tableData: { [header: string]: string[] }[] = [];
  // go through each stat
  _.each(statHeaders, statHeader => {

    let statLabel = colors.bold.white((statHeader in StatStrMap) ? StatStrMap[statHeader] : statHeader);

    // for a stat, get all values (i.e. Round 1 val, Round 2 val, Round 3 val)
    let rowValues = _.map(topHeaders, topHeader => performance.stats[topHeader][statHeader])
    tableData.push({ [statLabel]: rowValues });
  })

  table.push(...tableData);
  console.log(table.toString());
  console.log('\n');
}

function readAllPlayers(): IPlayer[] {
  let players: IPlayer[] = [];
  try {
    players = <IPlayer[]>JSON.parse(fs.readFileSync('players.json', 'utf8'));
  } catch (err) {
    console.error(err);
    throw new Error('Issue parsing players. The JSON is invalid');
  }
  return players;
}

function validatePlayers(players: IPlayer[]): string[] {
  let errors: string[] = [];
  if (!_.isArray(players)) {
    errors.push('Players must be an array');
  }
  if (_.isEmpty(players)) {
    errors.push('players.json cannot be an empty array')
  }
  _.each(players, player => {
    if (!("scorecardUrl" in player) || !("name" in player)) {
      errors.push(`Player JSON ${JSON.stringify(player)} is invalid... Each player should have 'scorecardUrl' and 'name'`)
    }
  })
  return errors;
}

/**
 * 1. Scrape all the tournaments the player has played in.
 * 2. Check the database to see what tournaments we have already scraped data for for the player.
 * 3a. If there are no new tournaments, tell the user this and finish.
 * 3b. If there are new tournaments, for each new tournament, scrape the HTML table
 * 4. For each tournament, convert the HTML to structured data with numerical values.
 * 5. Write the new tournament data (performances) to the database.
 * @param player 
 */
export async function pullMissingPlayerStats(player: IPlayer) {

  const { scorecardUrl, name } = player;

  // 1. Scrape all the tournaments the player has played in.
  const tourneyNames = await getTournamentsPlayedInByPlayer(player);
  if (tourneyNames === null) {
    console.log(`No tournaments found for player ${name}`);
    return null;
  }

  // 2. Check which performances already exist in database
  const existingPlayerPerformances = await DataLayer.getPeformancesByPlayer(name);
  const existingTourneyNames = _.map(existingPlayerPerformances, 'tourneyName');
  console.log(`Tournaments we already have ${name}'s stats for:\n  ${existingTourneyNames.join('\n  ')}`)

  const newTourneyNames = _.difference(tourneyNames, existingTourneyNames);
  // 3a. If there are no new tournaments, tell the user this and finish.
  if (_.isEmpty(newTourneyNames)) {
    console.log(`No new tournament exist for player ${name}...`);
    return null;
  }
  console.log(`Fetching new tournaments for ${name}:\n  ${newTourneyNames.join('\n  ')}\n`)

  // 3b. If there are new tournaments, for each new tournament, scrape the HTML table
  // 4. Process the html into structured data
  const playerPerformancePromises = _.map(newTourneyNames, tourneyName => getPerformanceForPlayer(player, tourneyName))
  const playerPerformances = await Promise.all(playerPerformancePromises);

  const nonNullPlayerPerformances = <IPerformance[]>_.filter(playerPerformances, p => p !== null);

  // 5. Write the new tournament data (performances) to the database.
  await DataLayer.insertPerformances(nonNullPlayerPerformances);

  console.log(`Successfully stored ${player.name} stats for ${_.map(nonNullPlayerPerformances, 'tourneyName').join(', ')}.`);

}

/**
 * Sometimes there is no data for a player's tournament even though
 * that tournament exists in the dropdown of tournaments the player played in.
 * @param player 
 * @param tourneyName 
 */
export async function getPerformanceForPlayer(player: IPlayer, tourneyName: string): Promise<IPerformance | null> {
  
  const rawData = await getRawDataForPerformance(player, tourneyName);

  if (rawData === null) {
    console.log(`No data exists for ${player.name}, ${tourneyName}.\nCheck ${player.scorecardUrl}`)
    return null;
  }

  const {
    html,
    dateRange
  } = rawData;

  let stats = getPerformanceStatsFromHtml(html);

  let startDate = parseStartDate(dateRange);

  return {
    playerName: player.name,
    startDate,
    tourneyName,
    stats
  }

}

export async function getTournamentsPlayedInByPlayer(player: IPlayer): Promise<string[]> {
  
  console.log(`Fetching all tournaments ${player.name} played in...`)
  
  const instance = await phantom.create();
  const page = await instance.createPage();
  page.setting("loadImages", false);
  const status = await page.open(player.scorecardUrl);

  console.log(`Successfully opened ${player.name} scorecard webpage...`);

  let names = null;

  try {
    names = await page.evaluate(function() {
      let tournamentNames = $('.tournament-select .hasCustomSelect option')
        .get()
        .slice(1) // option 1 is ----- PGA Tour ----- (not a tournament)
        .map((option: HTMLElement) => option.innerHTML);
      return tournamentNames;
    });
  } catch (err) {
    console.error(`Error in getting tournament names for ${player.name}`, err);
  }

  console.log(`${player.name} has played in:\n  ${names.join('\n  ')}`);

  return names;

}

export async function getRawDataForPerformance(player: IPlayer, tournamentName: string): Promise<{ html: string, dateRange: string} | null> {
  
  const tourneyPlayerStr = `${player.name}, ${tournamentName}`;

  const instance = await phantom.create();
  const page = await instance.createPage();
  page.setting("loadImages", false);
  const status = await page.open(player.scorecardUrl);

  console.log(`Fetching raw data for ${player.name}, ${tournamentName}`);
  
  try {
    await page.evaluate(function(tourneyName) {
      let tourneyOptionNode = $(`.tournament-select .hasCustomSelect option:contains(\'${tourneyName}\')`);
      let tourneyOptionVal =  tourneyOptionNode.attr('value');
      $('.tournament-select .hasCustomSelect').val(tourneyOptionVal).change()
    }, tournamentName);
    console.log(`Set dropdown to ${tournamentName} success`)
  } catch (err) {
    console.error(`Error setting tournament option ${player.scorecardUrl}, ${tournamentName}`);
  }

  await delaySec(3.0);

  console.log(`Delayed three seconds for ${tourneyPlayerStr} data to load...`);

  let statsTableHtml = null;

  try {
    statsTableHtml = await page.evaluate(function() {
      if ($('.player-tournament-statistics-table')[0] === undefined) {
        return null;
      }
      return $('.player-tournament-statistics-table')[0].outerHTML;
    });
    if (_.isEmpty(statsTableHtml)) {
      console.log(`No stats table for ${tourneyPlayerStr}.`)
      return null;
    }
    console.log(`Scraped html table for ${tourneyPlayerStr} successfully`)
  } catch (err) {
    console.error(`Error getting stats table html ${tourneyPlayerStr}`, err);
  }

  let dateRange = null;
  try {
    dateRange = await page.evaluate(function() {
      return $('.date').text();
    });
    console.log(`Fetched date range for ${tourneyPlayerStr} successfully`);
  } catch (err) {
    console.error(`Error getting stats table html ${tourneyPlayerStr}`, err);
  }

  instance.exit();

  return {
    html: statsTableHtml,
    dateRange 
  };

}

/**
 * 1. Convert HTML table into structured data
 * 2. Filter stats that aren't needed
 * 3. Convert values of remaining stats to numbers.
 * @param html raw html table that was scraped
 */
function getPerformanceStatsFromHtml(html: string) {
  let structuredStats = getStructuredDataFromHTML(html);
  let filteredStats = filterStats(structuredStats);
  let numericStats = parseNumbers(filteredStats);
  return numericStats;
}

/**
 * Takes the scraped HTML table, and creates a stats object of
 * string key-value pairs
 * @param html 
 */
export function getStructuredDataFromHTML(html: string) {
  
  const $c = cheerio.load(html);

  let headings: string[] = [];
  $c('.holder thead tr th').each((index, el) => {
    headings.push(($c(el).text()));
  });
  
  let titles: string[] = [];
  $c('.titles .table tbody tr td').each((index, el) => {
    titles.push($c(el).text());
  });

  let obj: any = {};

  for(var i = 0; i < headings.length; i++) {
    obj[headings[i]] = {};
  }

  $c('.holder table tbody tr').each((rowIndex, row) => {
    
    $c(row).find('td').each((colIndex, el) => {

      let heading = headings[colIndex];
      let title = titles[rowIndex];

      obj[heading][title] = $c(el).text();

    });

  });

  return obj;

}

const statsToInclude = [
  'SG: OFF THE TEE',
  'SG: APPROACH TO THE GREEN',
  'SG: AROUND THE GREEN',
  'SG: PUTTING',
  'SG: TEE TO GREEN',
  'SG: TOTAL'
];

/**
 * After raw HTML is converted to structured data,
 * this method is called and removes many of the unecessary statistics
 * @param stats after data has been structured
 */
export function filterStats(stats: any) {
  let filteredStats: any = {};
  _.forOwn(stats, (value, key) => {
    filteredStats[key] = _.pick(value, statsToInclude)
  })
  return filteredStats;
}

/**
 * After HTML has been converted to structured data and uneccessary stats
 * have been removed, this method converts the values to numbers before
 * they are stored in database.
 * @param stats
 */
export function parseNumbers(stats: any) {
  let numericStats: any = {};
  _.forOwn(stats, (value, key) => {
    numericStats[key] = _.mapValues(stats[key], v => Number.parseFloat(v))
  })
  return numericStats;
}

// handle command line inputs

// print process.argv

function printCommands() {
  console.log(`${colors.cyan.bold('pull')}: Pulls new tournament stats for players in players.json`)
  console.log(`${colors.cyan.bold('stats')}: Gets stats for a player or between a date.`)
}

if (process.argv.length < 3) {
  console.log('\n');
  console.log(colors.red.underline('You must enter one of the following commands:'));
  printCommands();
  console.log('\n');
  process.exit(1);
}

let commandMap: { [cmd: string]: () => any } = {
  pull: pullMissingPlayerStatsForAllPlayers,
  stats: getStats
}

if (!(process.argv[2] in commandMap)) {
  console.log('\n');
  console.log(colors.red.underline(`${process.argv[2]} is not a valid command. Use one of the following:`))
  printCommands();
  console.log('\n');
  process.exit(1);
}

function sortPerformancesByDate(performances: IPerformance[]) {
  return _.orderBy(performances, 'startDate', 'desc');
}

async function getStats() {
  let args = _.slice(process.argv, 3);

  let times: ITimes = {};

  let beforeArg = _.find(args, arg => _.startsWith(arg, '-before='));
  if (!_.isUndefined(beforeArg)) {
    times.before = moment(beforeArg.substring(8)).toISOString();
  }
  let afterArg = _.find(args, arg => _.startsWith(arg, '-after='));
  if (!_.isUndefined(afterArg)) {
    times.after = moment(afterArg.substring(7)).toISOString();
  }

  let playerArg  = _.find(args, arg => _.startsWith(arg, '-player='));
  if (!_.isUndefined(playerArg)) {
    let playerName = playerArg.substring(8);
    const sortedPerformances = await DataLayer.getPeformancesByPlayer(playerName, times)
      .then(sortPerformancesByDate);

    if (_.isEmpty(sortedPerformances)) {
      console.log(`No stats for player ${playerName}`);
      process.exit(0);
    }

    _.each(sortedPerformances, printPerformance);
    process.exit(0);

  } else {
    
    const sortedPerformances = await DataLayer.getPerformancesBetween(times)
      .then(sortPerformancesByDate);

    if (_.isEmpty(sortedPerformances)) {
      console.log('Could not find any matching stats. Check the dates');
    }

    _.each(sortedPerformances, printPerformance);
    process.exit(0);

  }
  
}

commandMap[process.argv[2]]();

// console.log(process.argv)