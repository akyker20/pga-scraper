import * as cheerio from 'cheerio';
import * as phantom from 'phantom';

declare var $: any;

function delaySec(seconds: number) {
  return new Promise((res, rej) => setTimeout(res, seconds * 1000.0))
}

export async function getStatsForPlayer(playerUrl: string, playerName: string) {
  
  const tourneyNames = await getTournamentsPlayedInByPlayer(playerUrl);
  const promises = tourneyNames.map(tourneyName => {
    return getStatsTableHtmlForPerformance(playerUrl, tourneyName)
      .then(convertTableHTMLToPerformance)
  });

  const stats = await Promise.all(promises);

  for(var i = 0; i < stats.length; i++) {
    console.log('Player: ', playerName);
    console.log('Tournament: ', tourneyNames[i]);
    console.log('Stats:');
    console.log(stats[i]);
    console.log('\n\n');
  }

}

export async function getTournamentsPlayedInByPlayer(playerUrl: string): Promise<string[]> {
  
  const instance = await phantom.create();
  const page = await instance.createPage();
  page.setting("loadImages", false);
  const status = await page.open(playerUrl);

  console.log('opened page');

  try {
    const names = await page.evaluate(function() {
      let tournamentNames = $('.tournament-select .hasCustomSelect option')
        .get()
        .slice(1) // option 1 is ----- PGA Tour ----- (not a tournament)
        .map((option: HTMLElement) => option.innerHTML);
      return tournamentNames;
    });
  } catch (err) {
    console.error('Error in getting tournament names', err);
  }

  console.log('got tournament names');

  return names;

}

export async function getStatsTableHtmlForPerformance(playerUrl: string, tournamentName: string): Promise<string> {
  
  const instance = await phantom.create();
  const page = await instance.createPage();
  page.setting("loadImages", false);
  const status = await page.open(playerUrl);

  console.log('opened page');
  
  try {
    await page.evaluate(function(tourneyName) {
      let tourneyOptionNode = $(`.tournament-select .hasCustomSelect option:contains(\'${tourneyName}\')`);
      let tourneyOptionVal =  tourneyOptionNode.attr('value');
      $('.tournament-select .hasCustomSelect').val(tourneyOptionVal).change()
    }, tournamentName);
  } catch (err) {
    console.error(`Error setting tournament option ${playerUrl}, ${tournamentName}`);
  }

  console.log('changed value');

  await delaySec(2.0);

  console.log('delayed two seconds');

  let statsTableHtml = null;

  try {
    statsTableHtml = await page.evaluate(function() {
      return $('.player-tournament-statistics-table')[0].outerHTML;
    });
  } catch (err) {
    console.error(`Error getting stats table html ${playerUrl}, ${tournamentName}`, err);
  }

  console.log('fetched stats table html');

  instance.exit();

  console.log('phantom exit');

  return statsTableHtml;

}

export function convertTableHTMLToPerformance(html: string) {
  
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


getStatsForPlayer("https://www.pgatour.com/players/player.34046.jordan-spieth.html/scorecards", "Jordan Spieth");