const Discord = require('discord.js');
const { performance } = require('perf_hooks');
const client = new Discord.Client();
const keys = require('./keys.json');
const ytdl = require('ytdl-core');
const yts = require('yt-search');

var currentMessage = null;
var lastStatus = null;
var pinged = false;
var t0 = 0
var t1 = 0
var queue = [];
var isPaused = false;
var repeat = false;

// Login
client.login(keys.token);

// Notify when client is ready for commands
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Event for when the prefix is called
client.on('message', msg => {
    // Receive previous ping message
    if (msg.author.username === client.user.username && pinged) {
        pingTime(msg);
    } 
    
    // Send initial ping message
    else if (msg.content === `${keys.prefix}ping`) {
        ping(msg);
    } 
    
    else if (msg.content === `${keys.prefix}join`) {
        join(msg);
    } 
    
    else if (msg.content === `${keys.prefix}dc`) {
        dc(msg);
    } 
    
    else if (msg.content.startsWith(`${keys.prefix}play `)) {
        lookup(msg);
    } 
    
    else if (msg.content === `${keys.prefix}pause`) {
        pause(msg);
    } 
    
    else if (msg.content === `${keys.prefix}resume`) {
        resume();
    }

    else if (msg.content === `${keys.prefix}queue`) {
        loadQueue(msg);
    }

    else if (msg.content === `${keys.prefix}clear`) {
        queue = []
    }

    else if (msg.content === `${keys.prefix}skip`) {
        skip(msg);
    }

    else if (msg.content === `${keys.prefix}stop`) {
        dc(msg);
    } 

    else if (msg.content.startsWith(`${keys.prefix}playlist `)){
        playlist(msg);
    }

    else if (msg.content.startsWith(`${keys.prefix}remove `)) {
        if (msg.content.length > 8) {
            removalIndex = Number(msg.content.slice(7).trim());
            if(removalIndex > queue.length) {
                msg.reply("There is no song at that position in the queue");
            } else if (removalIndex <= 0) {
                msg.reply("What the fuck were you trying to do here")
            } else {
                msg.reply(queue[removalIndex][0] + " has successfully been removed from the queue.");
                queue.splice(removalIndex, 1);
            }
        } 
        // If message is only -remove
        else {
            skip(msg);
        }
    }

    else if(msg.content.startsWith(keys.prefix + "seek")) {
        seekIndex = Number(msg.content.slice(5).trim());
        seek(seekIndex);
    }

    else if(msg.content === `${keys.prefix}help`){
        help(msg);
    }

    else if(msg.content[0] === keys.prefix){
        //When the prefix is used in tandem with an unknown command.
        msg.reply("I'm sorry, I don't quite understand.");
    }
});

// Receive pause/resume and loop commands from react removals.
client.on("messageReactionRemove", (messageReact) => {
    var output = "";
    if(messageReact.emoji.name == '⏯' && messageReact.message === currentMessage){
        if(isPaused) {
            resume();
            output = "Resuming music.";
            isPaused = false;
        } else {
            pause(messageReact.message);
            output = "The music is now paused.";
            isPaused = true;
        }
    } else if(messageReact.emoji.name == '🔂' && messageReact.message === currentMessage){
        if(repeat) {
            output = "Current song has stopped looping.";
            repeat = false;
        } else {
            output = "Current song is now looping.";
            repeat = true;
        }
    }
    if(output.length > 0) {
        if(lastStatus != null) {
            lastStatus.delete();
        } 
        messageReact.message.channel.send(output).then(newMessage => {
            lastStatus = newMessage;
        });
    }
});


// Response functions
// BEWARE OF THE GROTESQUE CODE

function playlist(msg){
    var playlistName = msg.content.slice(10).trim();
    var Id;
    if (playlistName != '') {
        yts(playlistName, (err, r) => {
            let index = 0;
            let found = false;
            while (index < r.playlists.length) {
                if(r.playlists[index].author.name !== 'YouTube'){
                    found = true;
                    break;
                }
                index++;
            }
            if (found){
                Id = r.playlists[index].listId;
                const opts = { listId: Id}
                yts(opts, ( err, playlist ) => {

                    var size = playlist.items.length;
                    for(let i = 0; i < size - 1; i++){
                        if(playlist.items[i].title !='[Deleted video]'){
                            videoId = playlist.items[i].videoId;
                            const opts2 = { videoId: videoId };
                            yts(opts2, (err, v) => {
                                if(!err) {
                                    queue.push([v.title, v.url, v.thumbnail, v.seconds]);
                                }
                            });
                        }
                    }
                    play(msg);
                    msg.reply(size + " songs queued");
                } );
            } else{
                msg.reply("could not find a playlist");
            }
        });
    }
}

function pingTime(msg){
    t1 = performance.now();
    pinged = false;
    msg.channel.send(((t1 - t0).toFixed(2) + " milliseconds."));
}

function ping(msg){
    t0 = performance.now();
    pinged = true
    msg.reply('pong');
}

function join(message) {
    if(message.member.voice.channel === null) {
        message.reply("Please join a voice channel");
    } else {
        return message.member.voice.channel.join();
    } 
}

function dc(msg) {
    if(msg.guild.me.voice.channel === null) {
        msg.reply("I'm not in a voice channel right now.");
    } else {
        queue = [];
        msg.guild.me.voice.channel.leave();
    }
}

function pause(msg){
    if(queue.length > 0){
        var disp = client.voice.connections.firstKey();
        client.voice.connections.get(disp).dispatcher.pause(true);
    } else {
        msg.reply("nothing to pause.");
    }
}

function resume(msg) {
    if(queue.length > 0){
        var disp = client.voice.connections.firstKey();
        client.voice.connections.get(disp).dispatcher.resume();
    } else if(currentMessage != null){
        currentMessage.channel.send('nothing to resume.');
    }
}

function help(msg){
    msg.channel.send({embed: {
            color: "#FF6AD5",
            author: {
                name: "Here to help!",
                icon_url: "https://cdn.dribbble.com/users/213309/screenshots/3708228/gradient_sunset.jpg"
            },
            fields: [{
                    name: `${keys.prefix}ping`,
                    value: "Test the server latency"
                },
                {
                    name: `${keys.prefix}join`,
                    value: "Bring Sunsets to your voice channel"
                },
                {
                    name: `${keys.prefix}dc`,
                    value: "Disconnect Sunsets from the channel it's currently in"
                },
                {
                    name: `${keys.prefix}play [song name/url]`,
                    value: "Searches youtube for the given url or video"
                },
                {
                    name: `${keys.prefix}pause`,
                    value: "Pauses the given playback"
                },
                {
                    name: `${keys.prefix}resume`,
                    value: "Resumes a paused playback"
                },
                {
                    name: `${keys.prefix} queue`,
                    value: "Prints out the current queue"
                },
                {
                    name: `${keys.prefix}clear`,
                    value: "Clears the current queue"
                },
                {
                    name: `${keys.prefix}skip`,
                    value: "Skips the current song"
                },
                {
                    name: `${keys.prefix}stop`,
                    value: "Stops the playback and disconnects Sunsets from the channel"
                },
                {
                    name: `${keys.prefix}remove [index]`,
                    value: "Removes the given song in Sunsets' queue"
                },
                {
                    name: `${keys.prefix}seek [index]`,
                    value: "Starts playing a given song in Sunsets' queue and removes it from the current queue"
                },
                {
                    name: `${keys.prefix}help`,
                    value: "try \"" + `${keys.prefix}help` + "\" for an infinite help loop"
                }
            ],

        }
    });
}

function loadQueue(msg) {
    if (queue.length > 0) {
        let timeLeft = timeConversion(timeRemaining());
        var output = "Now Playing: " + queue[0][0] + " \nTime remaining: " + timeLeft;
        if(queue.length == 1){
            output += "\n\nNo other songs in queue.";
        } else {
            output += "\n\nQueue:";
            for(let i = 1; i < queue.length; i++){
                output += "\n" + i + ". " + queue[i][0];
            }
        }
        msg.channel.send({embed: {
                color: "#FF6AD5",
                author: {
                    name: "Enqueued Songs: ",
                    icon_url: "https://images-na.ssl-images-amazon.com/images/I/71e7DkexvHL._AC_SX425_.jpg",
                },
                thumbnail: {
                    url: queue[0][2],
                },
                description: output,
            }
        });
    }
    else {
        msg.reply(`the queue is empty, use the ${keys.prefix}play command to get started`);
    }
}


function seek(ind) {
    if(ind > 0){
        if(currentMessage != null){
            if(ind < queue.length){
                queue.unshift(queue[ind]);
                queue.splice(1,1);
                queue.splice((ind), 1);
                play(currentMessage);
            } else {
                currentMessage.channel.send("Sorry, there are less than " + (ind) + " songs queued");
            }
        } else {
            currentMessage.channel.send("Please queue a song first");
        }
    
    } else {
        currentMessage.channel.send("bruh");
    }
}

function skip(msg) {
    if(queue.length > 0) {
        repeat = false;
        queue.shift();
        if(queue.length > 0) {
            play(msg);
        }
        else {
            queue = [];
            var disp = client.voice.connections.firstKey();
            client.voice.connections.get(disp).dispatcher.destroy();
            msg.reply("the queue is now empty, add some songs!");
        }
        if(queue.length == 0){
            currentMessage.reactions.removeAll();
        }
    } else {
        msg.reply("nothing to skip.");
    }
}

function play(msg) {
    join(msg).then(connection => {
        if(currentMessage != null){
            currentMessage.reactions.removeAll();
        }
        msg.channel.send({ embed: {
                color: "#FF6AD5",
                author: {
                    name: "Now Playing",
                    icon_url: "https://i.imgur.com/jaKXbNt.png",
                },
                title: queue[0][0],
                url: queue[0][1],
                thumbnail: {
                    url: queue[0][2],
                },
                fields: [{
                        name: "Play Time:",
                        value: timeConversion(queue[0][3])
                    }
                ],
            }
        }).then(message => {
            currentMessage = message;
            let stopFlag = false;
            currentMessage.react('🔂').then(currentMessage.react('⏯').then(currentMessage.react('⏩').then(currentMessage.react('⏹️').then(temp => {
                const filter = (reaction) => {return (reaction.emoji.name == '🔂' || 
                                                reaction.emoji.name == '⏯' || 
                                                reaction.emoji.name == '⏩' ||
                                                reaction.emoji.name == '⏹️')};
                
                const reactionCollector = currentMessage.createReactionCollector(filter);
                reactionCollector.on("collect", reaction => {
                    var output = "";
                    if(lastStatus != null){
                        lastStatus.delete();
                    }
                    if(reaction.emoji.name == '⏩'){
                        skip(message);
                    } else if (reaction.emoji.name == '⏹️' && stopFlag) {
                        dc(message);
                    } else if (reaction.emoji.name == '⏹️' && !stopFlag) {
                        stopFlag = true;
                    } else if (reaction.emoji.name == '⏯' && isPaused){
                        resume();
                        isPaused = false;
                        output = "Resuming music.";
                    } else if (reaction.emoji.name == '⏯' && !isPaused){
                        pause(message);
                        isPaused = true;
                        output = "The music is now paused.";
                    } else if (reaction.emoji.name == '🔂' && repeat){
                        repeat = false;
                        output = "Current song has stopped looping.";
                    } else if (reaction.emoji.name == '🔂' && !repeat){
                        repeat = true;
                        output = "Current song is now looping.";
                    }
                    if(output.length > 0) {
                        reaction.message.channel.send(output).then(newMessage => {
                            lastStatus = newMessage;
                        });
                    }  
                }); 
            }))));
        });
        const stream = connection.play(ytdl(queue[0][1], {quality: 'lowestaudio', highWaterMark: (1024 * 1024 * 150)}));
        stream.setFEC(true)
        stream.on('speaking', speak => {
            if(speak == false && repeat) {
                play(msg);
            }
            else if(speak == false && queue.length > 1) {
                skip(msg);
            } else if (speak == false && queue.length == 1) {
                queue = []
            }
        });
    });
    connection = this.connection;
}


// Helper functions
function timeConversion(time) {
    let remaining = time;
    if(remaining >= 60 * 60) {
        let hours = Math.floor(remaining / 3600);
        remaining = remaining - (hours * 3600);
        let minutes = Math.floor(remaining / 60);
        remaining = remaining - (minutes * 60);
        return String(zeroFill(hours) + ":" + zeroFill(minutes) + ":" + zeroFill(remaining));
    } else if (remaining >= 60) {
        let minutes = Math.floor(remaining / 60);
        remaining = remaining - (minutes * 60);
        return String(zeroFill(minutes) + ":" + zeroFill(remaining));
    } else {
        return String(remaining + " seconds");
    }
}

function timeRemaining() {
    var disp = client.voice.connections.firstKey();
    if(client.voice.connections.get(disp).dispatcher.streamTime != null) {
        return (queue[0][3] - Math.trunc(client.voice.connections.get(disp).dispatcher.streamTime / 1000));
    }
    return 0
}

function zeroFill(str) {
    temp = String(str)
    if (temp.length < 2) {
        temp = "0" + temp;
    }
    return temp;
}

function lookup(msg) {
    var songName = msg.content.slice(6).trim();
    if (songName != '') {
        const opts = {
            query: songName,
            pageStart: 1,
            pageEnd: 1,
        }

        yts(opts, function(err, r) {
            if ( err ) return msg.reply("Sorry, I couldn't quite find that");
            const v = r.videos[0];
            queue.push([v.title, v.url, v.thumbnail, v.seconds]);
            if(queue.length == 1){
                play(msg)
            } else {
                let timeUntil = timeRemaining();
                for(let i = 1; i < queue.length - 1; i++) {
                    timeUntil += queue[i][3];
                }
                msg.channel.send({embed: {
                    color: "#FF6AD5",
                    author: {
                        name: "Added to queue:",
                        icon_url: "https://cmkt-image-prd.freetls.fastly.net/0.1.0/ps/565722/910/607/m1/fpnw/wm0/env_18_cm-.jpg?1444727495&s=394a46519cd95f63b119199d9218b6dd",
                    },
                    title: v.title,
                    url: v.url,
                    thumbnail: {
                        url: v.thumbnail,
                    } ,
                    fields: [{
                            name: "Estimated time until play:",
                            value: timeConversion(timeUntil)
                            }
                        ],
                    }
                });
            }
        });
    }
    else {
        msg.reply("You didn't put in a song name.");
    }
}