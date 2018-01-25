var Table = require('cli-table');
var table = new Table({ head: ["", "Top Header 1", "Top Header 2"] });

table.push(
    { 'Left Header 1': [1, 2] }
  , { 'Left Header 2': [3, 4] }
);

console.log(table.toString());