import { assert } from 'chai';
import * as fs from 'fs';
import * as _ from 'lodash';
import { 
  convertTableHTMLToPerformance, 
  getStatsTableHtmlForPerformance,
  getTournamentsPlayedInByPlayer
} from '..';

describe('Unit Tests', function() {

  this.timeout(120000);

  describe('#getStatsTableHtmlForPerformance', function() {

    let tests = JSON.parse(fs.readFileSync('test_data/stats_tables.json', 'utf8'));

    _.each(tests, (testObj, index) => {
      it (`should get correct table for test ${index}`, async function() {
        let expectedHtml = testObj.html;
        const actualHtml = await getStatsTableHtmlForPerformance(testObj.url, testObj.tourneyName);
        assert.deepEqual(actualHtml, expectedHtml);
      })
    })

  })
  
  describe('#convertTableHTMLToPerformance', function() {

    it ('should convert successfully', async function() {
      let expectation = JSON.parse(fs.readFileSync('test_data/jordan_expected.json', 'utf8'));
      let statsHtml = fs.readFileSync('test_data/jordan_stats.html', 'utf8');
      assert.deepEqual(await convertTableHTMLToPerformance(statsHtml), expectation);
      
    })

  })

  describe.only('#getTournamentsPlayedInByPlayer', function() {

    it ('should return the tournament names', async function() {
      
      // Dustin Johnson
      let playerUrl = 'https://www.pgatour.com/players/player.30925.dustin-johnson.html/scorecards';

      const tourneyNames = await getTournamentsPlayedInByPlayer(playerUrl);

      assert.notInclude(tourneyNames, '----- PGA TOUR -----');
      assert.includeDeepMembers(tourneyNames, [
        'Hero World Challenge',
        'World Golf Championships-HSBC Champions',
        'Sentry Tournament of Champions'
      ]);

    })

  });


})