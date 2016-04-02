"use strict";
/*
 * フロントからはここの関数を呼び出す
 */

var constants = require("./lib/constants");
var db = require("./lib/database");
var rss = require("./lib/rss");
var util = require("./lib/util");

var common = {};

// フィードの新規登録
common.reg_new_feed = function(url){
    var mylistid = util.url.pick_mylistid(url);
    console.log("mylsitid: "+mylistid);

    db.feed_from_mylistid(mylistid, function(err, items){
        if(!err){
            if(items.length == 0){
                rss.get_mylist_rss(mylistid, function(data){
                    if(util.mylist.is_publication(data)){
                        db.reg_feed(data);
                    }else{ console.log("failed: is not publicated"); }
                });
            }else{ console.log("failed: already registed"); }
        }else{
            console.log("common.reg_new_feed err: "+err);
        }
    });
};


// フィードと同期を取る
common.sync = function(){
    db.mylists(function(err, feed){
        console.log("mylist: "+feed.title);
        if(!err){
            util.mylist.pull(feed.mylistid, function cb_new_item(movies){
                movies.forEach(function(movie){
                    console.log("new: "+movie.title);
                    db.reg_movie(movie.movieid, movie.title, movie.posted_at, movie.thumbnail, movie.description, feed.id);
                });
            }, function cb_del_item(movies){
                movies.forEach(function(movie){
                    console.log("del: "+movie.title);
                    db.del_movie(movie.movieid, feed.id);
                });
            });
        }else{
            console.log("common.pull error: "+err);
        }
    });
};


// 視聴ずみとする
common.toWatched = function toWatched(item_id){
    db.change_watch_status(item_id, true, function(err, row){
        if(err){
            console.log("更新失敗");
        }
    });
};

// フィードの削除
common.rmFeed = function rmFeed(feed_id){
    db.del_feed_recursively(feed_id);
};


// 新着動画ありに表示するデータを取得&整形
common.unwatchFeedList = function unwatchFeedList(cb){
    /*
     * db(feed_data)
     */
    var feeds = [];
    var feed;

    db.mylists(cb_feeds);

    function cb_feeds(err, row){
        if(!err){
            db.unwatched_movie_num_at_feed(row.id, function(num){
                if(0 < num){
                    feed = Object.assign({}, constants.template.FEEDLIST);
                    feed.id = row.id;
                    feed.title = row.title;
                    feed.unwatch_movie_num = num;
                    cb(feed);
                }
            });
        }
    };
};


// フィードリストに表示するデータを取得&整形
common.allWatchedFeedList = function allWatchedFeedList(cb){
    /*
     * db(feed_data)
     */
    var feeds = [];
    var feed;

    db.mylists(cb_feeds);

    function cb_feeds(err, row){
        if(!err){
            db.unwatched_movie_num_at_feed(row.id, function(unwatch_num){
                if(unwatch_num == 0){
                    feed = Object.assign({}, constants.template.FEEDLIST);
                    feed.id = row.id;
                    feed.title = row.title;
                    cb(feed);
                }
            });
        }
    };
};


// 動画一覧のデータを取得&整形
common.movieList = function movieList(feed_id, cb){
    /*
     * feed_id
     *  0の場合はマイリスト横断で未視聴動画を取得する
     * cb(動画データ)
     */

    if(feed_id == 0){   // 全マイリスト通しての未視聴動画一覧
        db.unwatch_movies(function(err, row){
            shaping(row);
        });
    }else{              // マイリストごとの未視聴動画一覧
        db.movies_in_feed(feed_id, function(err, row){
            shaping(row);
        });
    }

    function shaping(row){      // データを整形してCBを呼び出す
        var movie = Object.assign({}, constants.template.MOVIE);
        movie.title = row.title;
        movie.link = constants.url.WATCH_FRONT + row.movieid + constants.url.WATCH_BACK;
        movie.posted_at = new Date(row.posted_at);
        movie.thumbnail = row.thumbnail;
        movie.description = row.description;
        movie.watched = row.watched;
        cb(movie);
    }

};

module.exports = common;
