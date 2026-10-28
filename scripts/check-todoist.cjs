const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/todoist.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { validTaskDate, validTaskTime, addDays, visibleTasks, parseTaskDateInput } = context.exports;
assert(validTaskDate(null)); assert(validTaskDate('2028-02-29'));
for (const bad of ['2026-02-29', '2026-13-01', '2026-04-31', '', 1, {}, '2026-1-01']) assert.equal(validTaskDate(bad), false);
assert.equal(addDays('2026-12-31', 1), '2027-01-01');

// Test validTaskTime
assert(validTaskTime(null));
assert(validTaskTime('14:30'));
assert(validTaskTime('00:00'));
assert(validTaskTime('23:59'));
for (const bad of ['24:00', '12:60', '7:30', '', 123, {}]) assert.equal(validTaskTime(bad), false);

// Test natural language date & time parsing
// 2026-10-28 adalah Rabu (Wednesday)
assert.equal(parseTaskDateInput('benerin sepedah di hari jumat jam 15:30', '2026-10-28').dueDate, '2026-10-30');
assert.equal(parseTaskDateInput('benerin sepedah di hari jumat jam 15:30', '2026-10-28').dueTime, '15:30');
assert.equal(parseTaskDateInput('benerin sepedah di hari jumat jam 15:30', '2026-10-28').label, 'benerin sepedah');

assert.equal(parseTaskDateInput('beli susu besok jam 3 sore', '2026-10-28').dueDate, '2026-10-29');
assert.equal(parseTaskDateInput('beli susu besok jam 3 sore', '2026-10-28').dueTime, '15:00');
assert.equal(parseTaskDateInput('beli susu besok jam 3 sore', '2026-10-28').label, 'beli susu');

assert.equal(parseTaskDateInput('rapat penting hari ini jam 8 malam', '2026-10-28').dueDate, '2026-10-28');
assert.equal(parseTaskDateInput('rapat penting hari ini jam 8 malam', '2026-10-28').dueTime, '20:00');
assert.equal(parseTaskDateInput('rapat penting hari ini jam 8 malam', '2026-10-28').label, 'rapat penting');

assert.equal(parseTaskDateInput('Nanti Jam 12 malam udah harus kelar tugas tugas kuliah', '2026-10-28').dueDate, '2026-10-28');
assert.equal(parseTaskDateInput('Nanti Jam 12 malam udah harus kelar tugas tugas kuliah', '2026-10-28').dueTime, '00:00');
assert.equal(parseTaskDateInput('Nanti Jam 12 malam udah harus kelar tugas tugas kuliah', '2026-10-28').label, 'udah harus kelar tugas tugas kuliah');

assert.equal(parseTaskDateInput('meeting jam 14:00', '2026-10-28').dueDate, '2026-10-28');
assert.equal(parseTaskDateInput('meeting jam 14:00', '2026-10-28').dueTime, '14:00');
assert.equal(parseTaskDateInput('meeting jam 14:00', '2026-10-28').label, 'meeting');

assert.equal(parseTaskDateInput('service laptop lusa at 10:00 am', '2026-10-28').dueDate, '2026-10-30');
assert.equal(parseTaskDateInput('service laptop lusa at 10:00 am', '2026-10-28').dueTime, '10:00');
assert.equal(parseTaskDateInput('service laptop lusa at 10:00 am', '2026-10-28').label, 'service laptop');

assert.equal(parseTaskDateInput('tugas kuliah senin depan', '2026-10-28').dueDate, '2026-11-09');
assert.equal(parseTaskDateInput('tugas kuliah senin depan', '2026-10-28').dueTime, null);
assert.equal(parseTaskDateInput('tugas kuliah senin depan', '2026-10-28').label, 'tugas kuliah');

assert.equal(parseTaskDateInput('baca buku', '2026-10-28').dueDate, null);
assert.equal(parseTaskDateInput('baca buku', '2026-10-28').dueTime, null);
assert.equal(parseTaskDateInput('baca buku', '2026-10-28').label, 'baca buku');
const tasks = [
 {id:'1',label:'Overdue',done:false,priority:'LOW',due_date:'2026-10-27'},
 {id:'2',label:'Today',done:false,priority:'HIGH',due_date:'2026-10-28'},
 {id:'3',label:'Future',done:false,priority:'MEDIUM',due_date:'2026-10-30'},
 {id:'4',label:'No date',done:false,priority:'LOW',due_date:null},
 {id:'5',label:'Done',done:true,priority:'HIGH',due_date:'2026-10-28'}
];
const ids = (view, done=false, priority='all', search='', sort='default') => Array.from(visibleTasks(tasks,view,'2026-10-28','2026-10-28',done,priority,search,sort), t=>t.id);
assert.deepEqual(ids('today'),['1','2']);
assert.deepEqual(ids('upcoming'),['2','3']);
assert.deepEqual(ids('inbox'),['1','2','3','4']);
assert.deepEqual(ids('today',true),['1','2','5']);
assert.deepEqual(ids('inbox',false,'HIGH'),['2']);
assert.deepEqual(ids('inbox',false,'all',' FUTURE '),['3']);
assert.deepEqual(ids('today',false,'all','','priority'),['2','1']);
assert.equal(tasks[0].id,'1');
const idsRange = (view, start, end, done=false) => Array.from(visibleTasks(tasks,view,'2026-10-28',start,done,'all','','default',end), t=>t.id);
assert.deepEqual(idsRange('upcoming','2026-10-28','2026-10-31'),['2','3']);
assert.deepEqual(idsRange('upcoming','2026-10-29','2026-10-31'),['3']);
assert.deepEqual(idsRange('upcoming','2026-11-01','2026-11-30'),[]);
console.log('Todoist checks passed: dates, leap years, rollover, views, completed, priority, search, sorting.');
