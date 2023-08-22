const express = require('express');
const session = require('express-session');
const querystring = require('querystring');
const request = require('request');
const path = require('path');

const app = express();

app.use(express.static('public'));

require('dotenv').config();
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';

app.use(session({
    secret: CLIENT_SECRET,
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/index/login.html'));
});

app.listen(3000, function(){
    console.log('Server started on http://localhost:3000');
});

app.get('/login', function(req, res){
    const scope = 'user-read-private user-read-email user-top-read';
    const state = 'ioioioioioioioio';
  
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: scope,
            redirect_uri: REDIRECT_URI,
            state : state
        }));
});

app.get('/callback', function(req, res){
    const code = req.query.code || null;
    const state = req.query.state || null;
    
    if(state === null){
        res.redirect('/#' + querystring.stringify({error: 'state_mismatch'}));
    } else {
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
            },
            json: true
        };
    
        request.post(authOptions, function(error, response, body){
            if(!error && response.statusCode === 200){
                req.session.userAccessToken = body.access_token;
                res.redirect('index/tracks.html');
                console.log('Authorization Successful');
            }else{
                res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
                console.log('Authorization Unsuccessful');
            }
        });
    }
});

app.get('/getTopTracks', async (req, res) => {
    const token = req.session.userAccessToken;

    try{
        const tracks = await _getTopTracks(token);
        res.json(tracks);
    }catch (error){
        console.error('Error fetching top tracks:', error);
        res.status(500).send('Error fetching top tracks.');
    }
});

// Get user's top tracks
const _getTopTracks = async (token, limit = 50) => {
    try{
        const response = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=${limit}`, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await response.json();
        return data.items.map(track => ({
            name: track.name,
            artist: track.artists[0].name,
            image: track.album.images[0].url
        }));
    }catch (error){
        console.error('Error in _getTopTracks:', error);
        throw error;
    }
}
