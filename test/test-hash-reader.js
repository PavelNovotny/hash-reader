/**
 *
 * Created by pavelnovotny on 02.10.15.
 */

var hashReader = require("../lib/hash-reader.js");
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: "testHashReader"});
log.level("info");
var testFile ="../hashSeek/hashSeekFiles/jms_s1_alsb_aspect.audit.20150425.bgz";
var hashFile = testFile + ".hash_v1.bgz";

describe('pokusyHashFile', function() {
    //describe('#testParallelRead()', function() {
    //    it('should return collection', function(done) {
    //        var params = [];
    //        params.push({offset: 0, len:4});
    //        params.push({offset: 4, len:8});
    //        hashReader.readParallel(bgzReader.readInt, "hashSeekFiles/jms_s1_alsb_aspect.audit.20150425.bgz.hash_v1.bgz", params,function(results) {
    //            log.info("Results:",results);
    //            done();
    //        });
    //    });
    //});
    describe('#seek()', function() {
        it('should return positions for seekedString(s)', function(done) {
            hashReader.seek("1-8DJP-3597-1429974338532-1316066106",testFile, hashFile, 10,function(err, result) {
                if (err) {
                    log.error(err);
                    return done();
                }
                log.info("Result:",result);
                log.info("Result from array:", result[0]);
                done();
            });
        });
    });
    describe('#seek()', function() {
        it('should not return positions for seekedString(s)', function(done) {
            hashReader.seek("1-P-3CCCCCCCCCCCCCC597-1429974338532-1316066106",testFile, hashFile, 10,function(err, result) {
                if (err) {
                    log.error(err);
                    return done();
                }
                log.info("Result:",result);
                log.info("Result from array:", result[0]);
                done();
            });
        });
    });
    describe('#seek()', function() {
        it('should be extremely quick (cached)', function(done) {
            hashReader.seek("1-8DJP-3597-1429974338532-1316066106",testFile, hashFile, 10,function(err, result) {
                if (err) {
                    log.error(err);
                    return done();
                }
                log.info("Result:",result);
                log.info("Result from array:", result[0]);
                done();
            });
        });
    });
});

