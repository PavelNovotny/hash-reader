/**
 * Created by pavelnovotny on 08.10.15.
 */
var bgzReader = require( "bgz-reader" );
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: "HashReader"});
var Long = require('long');
var async = require('async');
log.level("error");
HASH_SPACE_RECORD_SIZE = 12; //délka int a long

exports.seek = seek;

//todo implementace seekLimit
function seek(seekedString, seekedFile, seekLimit, callback) {
    async.series([
        function(callback) {
            bgzReader.readInt(seekedFile.hashFile, 0, 4, callback); //version, první načte spoustu věcí do cache, pokud tam už není.
        }
    ], function (err, results) {
        if (err) return callback(err);
        readHashHeader(seekedFile, seekedString, seekLimit, callback); //kvůli času pro cache je zbytek až po prvním pokusu, jinak bychom měli z důvodu asynchronního IO víc otevřených descriptorů než je zdrávo.
    });
}

function readHashHeader(seekedFile, seekedString, seekLimit, callback) { //zbytek po nacachování.
    async.parallel([
        function(callback) {
            bgzReader.readInt(seekedFile.hashFile, 4, 8, callback); //hashSpacePosition
        },
        function(callback) {
            bgzReader.readInt(seekedFile.hashFile, 12, 4, callback); //hashSpaceSize
        },
        function(callback) {
            bgzReader.readInt(seekedFile.hashFile, 16, 4, callback); //blockKind
        },
        function(callback) {
            bgzReader.readInt(seekedFile.hashFile, 20, 4, callback); //blockSize
        }
    ], function (err, results) {
        if (err) return callback(err);
        seekBlockByHash(results, seekedFile, seekedString, seekLimit, callback);
    });
}

function seekBlockByHash(results ,seekedFile, seekedString, seekLimit, callback) {
    var hash = javaHashNormalized(seekedString, results[1]); // plusové číslo
    var hashAddress = results[0] + (hash * HASH_SPACE_RECORD_SIZE);
    async.parallel([
        function(callback) {
            bgzReader.readInt(seekedFile.hashFile, hashAddress, 8, callback); //pointersPosition
        },
        function(callback) {
            bgzReader.readInt(seekedFile.hashFile, hashAddress + 8, 4, callback); //pointersCount
        }
    ], function (err, results) {
        if (err) return callback(err);
        if (results[1] === 0) return callback(null, []);
        readFirstBlockNumber(results ,seekedFile, seekedString, seekLimit, callback);
    });
}

function readFirstBlockNumber(parResults ,seekedFile, seekedString, seekLimit, callback) {
    async.parallel([
        function(callback) {
            bgzReader.getFd(seekedFile.dataFile.bgzFile, callback);
        },
        function(callback) {
            bgzReader.getFd(seekedFile.dataFile.bgzIndexFile, callback);
        }
    ], function (err, results) {
        if (err) return callback(err);
        readBlockNumbers(parResults ,seekedFile, seekedString, seekLimit, callback);
    });
}

function readBlockNumbers(results ,seekedFile, seekedString, seekLimit, callback) {
    var concurrent = results[1];
    var foundStrings = [];
    for (var pointerPosition = 0; pointerPosition < results[1]; pointerPosition++) {
        bgzReader.readInt(seekedFile.hashFile, results[0] + (pointerPosition * 4), 4, function (err, blockNumber) {
            log.info("blockNumber:",blockNumber);
            findStringBlock(seekedFile, blockNumber, function(err, foundString) {
                if (err) return callback(err);
                log.info("verifyingString", foundString);
                if (foundString.indexOf(seekedString) >=0) {
                    log.info("Found:", foundString);
                    foundStrings.push(foundString);
                }
                if (--concurrent <= 0) { //callback se zavolá na konci
                    return callback(null, foundStrings);
                }
            });
        });
    }
}

function findStringBlock(seekedFile, blockNumber, callback) {
    var blockAddress = 24 + (blockNumber * 8);
    async.parallel([
        function(callback) {
            bgzReader.readInt(seekedFile.hashFile, blockAddress, 8, callback); //blockPosition
        },
        function(callback) {
            bgzReader.readInt(seekedFile.hashFile, blockAddress + 8, 8, callback); //nextBlockPosition
        }
    ], function (err, results) {
        if (err) return callback(err);
        bgzReader.readString(seekedFile.dataFile, results[0], results[1] - results[0], function (err, foundString) {
            if (err) return callback(err);
            return callback(null,foundString);
        });
    });
}

function javaHashNormalized(hashedString, hashSpace) {
    var hash = new Long(0, true);
    for (var i=0; i < hashedString.length; i++) {
        hash = hash.multiply(31).add(hashedString.charCodeAt(i));
    }
    return hash.and(0x7fffffff).modulo(hashSpace);
}

