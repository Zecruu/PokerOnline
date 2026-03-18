// Poker Online - WebSocket Server with MongoDB
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const { Room } = require('./models');
const { createDeck, shuffleDeck, evaluateHand, makeAIDecision, getRandomTaunt } = require('./gameLogic');

const app = express();
const server = http.createServer(app);

// Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:8000", "http://localhost:3000", "https://poker-online.vercel.app", "*"],
        methods: ["GET", "POST"]
    }
});

// Middleware - CORS for games subdomain and main site
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8000',
        'https://www.zecrugames.com',
        'https://zecrugames.com',
        'https://games.zecrugames.com'
    ],
    credentials: true
}));
// Parse JSON for all routes EXCEPT the Stripe webhook (which needs raw body)
app.use((req, res, next) => {
    if (req.originalUrl === '/api/games/webhook') {
        next();
    } else {
        express.json()(req, res, next);
    }
});
// Serve the Next.js static export from hub/out
app.use(express.static(path.join(__dirname, '../hub/out')));

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI?.trim();
let mongoConnected = false;

async function connectMongoDB() {
    if (!mongoUri || (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://'))) {
        console.error('❌ MONGODB_URI is missing or invalid. It must start with "mongodb://" or "mongodb+srv://"');
        console.error('   Current value:', mongoUri ? mongoUri.substring(0, 15) + '...' : 'undefined');
        console.error('   Please check your Railway variables or .env file.');
        return;
    }

    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });
        mongoConnected = true;
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        mongoConnected = false;
        // Retry connection after 5 seconds
        setTimeout(connectMongoDB, 5000);
    }
}

// Handle disconnection
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected. Attempting to reconnect...');
    mongoConnected = false;
    setTimeout(connectMongoDB, 5000);
});

mongoose.connection.on('connected', () => {
    mongoConnected = true;
});

// Initial connection
connectMongoDB();

// Generate room code
function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Generate player ID
function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
}

// In-memory rooms (no DB needed, rooms are ephemeral)
const tdRooms = {};
const pokerRooms = {};
const clueRooms = {};
const wmRooms = {};

const CLUE_WORD_BANK = [
    // Animals
    'dog','cat','horse','eagle','shark','dolphin','tiger','lion','bear','wolf','rabbit','snake','turtle','penguin',
    'elephant','monkey','parrot','whale','fox','deer','owl','spider','butterfly','octopus','crab','falcon','panther',
    'gorilla','seal','hawk','cheetah','bison','otter','raven','scorpion',
    // Food & Drink
    'pizza','burger','sushi','pasta','bread','cheese','apple','banana','grape','lemon','chocolate','cookie','cake',
    'steak','salad','rice','soup','taco','waffle','bacon','honey','butter','pepper','cherry','mango','coconut',
    'pretzel','popcorn','pancake','cinnamon',
    // Nature
    'mountain','ocean','river','forest','desert','island','volcano','glacier','canyon','meadow','jungle','coral',
    'rainbow','tornado','sunset','waterfall','cliff','valley','lagoon','prairie','geyser','aurora','cavern','marsh',
    'tsunami',
    // Objects
    'phone','laptop','camera','clock','mirror','candle','bottle','blanket','pillow','trophy','compass','diamond',
    'crystal','hammer','ladder','umbrella','basket','helmet','guitar','piano','telescope','lantern','whistle',
    'magnet','anchor','barrel','beacon','flag','drum','microscope',
    // Weapons & Tools
    'sword','shield','arrow','blade','cannon','drill','wrench','chisel','anvil','axe','dagger','spear','crossbow',
    'catapult','mace','trident','slingshot','boomerang','javelin','harpoon',
    // Body
    'heart','brain','muscle','skeleton','lungs','shoulder','elbow','spine','throat','knuckle','ribcage','temple',
    'marrow','tendon','skull',
    // Places
    'castle','palace','museum','library','stadium','theater','bridge','tunnel','lighthouse','factory','dungeon',
    'fortress','cathedral','monument','pyramid','tower','vault','harbor','mansion','prison',
    // Professions
    'doctor','teacher','pilot','chef','soldier','detective','astronaut','painter','surgeon','engineer','scientist',
    'architect','lawyer','farmer','blacksmith',
    // Weather
    'blizzard','hurricane','drought','frost','lightning','thunder','breeze','avalanche','monsoon','hailstorm',
    // Clothing & Accessories
    'jacket','gloves','boots','scarf','sandals','crown','belt','armor','cloak','turban',
    // Vehicles
    'rocket','submarine','helicopter','tractor','ambulance','spaceship','chariot','gondola','sailboat','locomotive',
    // Mythology & Fantasy
    'dragon','wizard','knight','pirate','ninja','samurai','vampire','zombie','phoenix','griffin','mermaid','centaur',
    'cyclops','minotaur','unicorn','kraken','sphinx','banshee','werewolf','goblin','troll','fairy','demon','angel',
    'sorcerer',
    // Science & Tech
    'gravity','oxygen','neutron','plasma','circuit','laser','radar','prism','fossil','enzyme','genome','quasar',
    'nebula','comet','asteroid',
    // Music & Arts
    'violin','trumpet','symphony','canvas','mosaic','sculpture','pottery','origami','opera','ballet','melody',
    'rhythm','chorus','encore','fresco',
    // Miscellaneous
    'feather','pearl','marble','ribbon','silk','ivory','jade','ember','spark','flame','steam','cobalt','scarlet',
    'crimson','amber','velvet','mercury','copper','granite','obsidian','sapphire','emerald','ruby','topaz','quartz',
    'shadow','whisper','echo','puzzle','riddle','treasure','secret','legend','phantom','spirit','ghost','mystery',
    'prophecy','illusion','mirage','paradox','enigma','karma','destiny','chaos','voyage','horizon','summit',
    'tempest','serpent','gargoyle','labyrinth','obelisk','relic','talisman','vortex'
];

const WORDMASTER_WORDS = [
    // Animals
    'dog','cat','horse','whale','eagle','shark','tiger','bear','wolf','snake','lion','hawk','fox','deer','rabbit',
    'dolphin','penguin','parrot','monkey','zebra','giraffe','elephant','gorilla','panther','falcon','turtle','frog',
    'crab','lobster','octopus','squid','jellyfish','butterfly','beetle','ant','spider','scorpion','bat','owl','crow',
    'swan','pelican','flamingo','peacock','rooster','donkey','camel','moose','bison','ram','goat','pig','sheep',
    'duck','goose','salmon','trout','tuna','seal','walrus','otter','beaver','raccoon','skunk','porcupine','mole',
    'hamster','mouse','rat','ferret','lizard','cobra','python','viper','cheetah','leopard','jaguar','hyena','rhino',
    'hippo','koala','kangaroo','panda','sloth','armadillo','hedgehog','chameleon','iguana','gecko','stingray','clam',
    // Food & Drink
    'pizza','bread','cheese','apple','steak','pasta','rice','cake','cookie','pie','soup','salad','burger','taco',
    'sushi','waffle','pancake','donut','muffin','bagel','pretzel','popcorn','candy','chocolate','honey','butter',
    'cream','yogurt','cereal','oatmeal','bacon','sausage','ham','turkey','chicken','shrimp','oyster','grape','lemon',
    'orange','banana','mango','peach','cherry','plum','melon','coconut','avocado','tomato','potato','carrot','onion',
    'garlic','pepper','corn','bean','peanut','almond','walnut','olive','pickle','mustard','ketchup','vinegar','coffee',
    'milk','juice','wine','beer','whiskey','vodka','brandy','cider','smoothie','milkshake','espresso',
    // Objects & Things
    'chair','table','clock','mirror','phone','lamp','book','key','door','window','wall','floor','roof','fence',
    'bridge','tower','wheel','engine','battery','cable','wire','pipe','chain','rope','nail','screw','bolt','hammer',
    'wrench','drill','saw','blade','needle','thread','button','zipper','buckle','hinge','lock','safe','vault',
    'chest','barrel','bucket','basket','bottle','jar','cup','plate','bowl','fork','knife','spoon','pan','pot',
    'oven','stove','fridge','sink','toilet','shower','bathtub','pillow','blanket','curtain','carpet','shelf',
    'drawer','cabinet','closet','bench','couch','desk','ladder','staircase','elevator','crane','anchor','compass',
    'telescope','microscope','camera','projector','speaker','microphone','headphones','remote','antenna','satellite',
    'umbrella','candle','torch','lantern','lighter','match','broom','mop','sponge','brush','comb','razor','scissors',
    // Places & Locations
    'beach','school','church','park','airport','museum','garden','library','hospital','prison','castle','palace',
    'temple','mosque','cathedral','stadium','arena','theater','cinema','casino','hotel','motel','resort','cabin',
    'cottage','mansion','apartment','penthouse','basement','attic','garage','barn','warehouse','factory','office',
    'market','mall','pharmacy','bakery','restaurant','cafe','bar','pub','nightclub','gym','spa','salon','studio',
    'gallery','aquarium','zoo','circus','carnival','playground','fountain','monument','statue','pyramid','tunnel',
    'subway','harbor','dock','pier','lighthouse','island','volcano','canyon','valley','cliff','cave','glacier',
    'desert','jungle','swamp','meadow','prairie','forest','mountain','river','lake','ocean','waterfall','spring',
    // Body & Health
    'heart','brain','hand','eye','bone','skull','tooth','blood','muscle','nerve','spine','lung','liver','kidney',
    'stomach','throat','tongue','finger','thumb','elbow','knee','ankle','wrist','shoulder','neck','chest','rib',
    'skin','hair','nail','vein','artery','joint','tendon','cell','tissue','organ','pulse','breath','fever',
    'wound','bruise','scar','rash','cough','sneeze','hiccup','cramp','ache',
    // Professions & Roles
    'doctor','pilot','chef','judge','artist','nurse','farmer','teacher','lawyer','soldier','sailor','pirate',
    'knight','wizard','ninja','samurai','cowboy','sheriff','detective','spy','thief','bandit','guard','captain',
    'general','president','queen','king','prince','princess','emperor','pope','monk','priest','bishop','angel',
    'demon','ghost','vampire','zombie','robot','alien','clone','giant','dwarf','elf','troll','goblin','witch',
    'mermaid','centaur','dragon','phoenix','unicorn','griffin',
    // Sports & Games
    'soccer','tennis','boxing','skiing','golf','rugby','hockey','cricket','baseball','football','basketball',
    'volleyball','wrestling','fencing','archery','bowling','darts','billiards','chess','poker','dice','domino',
    'puzzle','maze','race','sprint','marathon','relay','hurdle','javelin','discus','shotput','gymnastics',
    'diving','surfing','sailing','rowing','kayak','canoe','skateboard','snowboard','trophy','medal','champion',
    // Technology & Science
    'robot','laser','rocket','radar','drone','pixel','server','network','database','software','hardware','browser',
    'virus','malware','firewall','password','algorithm','binary','quantum','atom','molecule','electron','proton',
    'neutron','plasma','magnet','gravity','friction','voltage','circuit','transistor','chip','sensor','motor',
    'turbine','reactor','satellite','telescope','spectrum','frequency','wavelength','radiation','isotope','enzyme',
    'protein','genome','fossil','mineral','crystal','prism','lens','fiber','carbon','oxygen','nitrogen','hydrogen',
    // Nature & Weather
    'river','ocean','desert','volcano','glacier','thunder','rain','snow','hail','frost','fog','mist','cloud',
    'rainbow','tornado','hurricane','tsunami','earthquake','avalanche','flood','drought','lightning','blizzard',
    'breeze','gale','storm','sunrise','sunset','eclipse','comet','meteor','asteroid','nebula','galaxy','orbit',
    'tide','wave','current','reef','coral','pebble','boulder','gravel','sand','mud','clay','soil','moss',
    'vine','thorn','root','trunk','branch','leaf','petal','bloom','seed','acorn','mushroom','algae','bamboo',
    // Clothing & Fashion
    'jacket','helmet','boots','gloves','scarf','belt','crown','cape','armor','shield','mask','goggles','visor',
    'bandana','turban','beret','fedora','bowler','sombrero','sandal','sneaker','slipper','heel','loafer','tie',
    'vest','sweater','hoodie','blazer','tuxedo','gown','robe','apron','uniform','jersey','shorts','jeans',
    'skirt','dress','blouse','collar','pocket','sleeve','cuff','hem','stitch','fabric','silk','cotton','leather',
    'denim','velvet','lace','satin','wool','linen','nylon','fleece',
    // Vehicles & Transport
    'truck','plane','train','bicycle','rocket','canoe','tank','submarine','helicopter','blimp','glider','yacht',
    'ferry','gondola','chariot','wagon','carriage','sled','motorcycle','scooter','tractor','bulldozer','ambulance',
    'firetruck','limousine','convertible','minivan','jeep','trailer','hovercraft','spaceship',
    // Music & Art
    'guitar','piano','drum','violin','trumpet','flute','harp','cello','banjo','saxophone','clarinet','trombone',
    'harmonica','accordion','tambourine','cymbal','xylophone','organ','synthesizer','melody','rhythm','harmony',
    'chorus','verse','lyric','opera','symphony','concert','album','record','canvas','portrait','sculpture',
    'mosaic','mural','sketch','painting','gallery','easel','palette','brush','ink','charcoal','crayon','pastel',
    // Abstract & Concepts
    'dream','ghost','secret','riddle','magic','chaos','shadow','silence','echo','whisper','scream','fear',
    'anger','joy','sorrow','pride','shame','guilt','envy','greed','lust','sloth','wrath','mercy','grace',
    'faith','hope','love','hate','peace','war','truth','lie','honor','glory','fame','fortune','destiny',
    'karma','spirit','soul','mind','memory','thought','idea','theory','logic','reason','wisdom','knowledge',
    'power','energy','force','speed','time','space','void','infinity','zero','origin','end','cycle','pattern',
    'balance','chaos','order','freedom','justice','revenge','sacrifice','betrayal','alliance','truce','oath',
    'curse','blessing','miracle','legend','myth','fable','tale','saga','quest','journey','voyage','adventure',
    // Actions & Verbs as Nouns
    'punch','dance','climb','swim','sleep','escape','vanish','whistle','juggle','tackle','sprint','dodge',
    'stumble','tumble','crawl','leap','dive','glide','soar','plunge','strike','block','parry','thrust',
    'slash','crush','smash','shatter','explode','ignite','melt','freeze','boil','evaporate','dissolve',
    'absorb','reflect','deflect','bounce','spin','twist','bend','fold','wrap','squeeze','stretch','snap',
    'crack','split','merge','blend','stir','pour','drip','splash','spray','scatter','gather','stack','pile',
    // Materials & Substances
    'steel','diamond','marble','copper','ivory','crystal','gold','silver','bronze','platinum','iron','tin',
    'lead','mercury','titanium','aluminum','cobalt','nickel','zinc','brass','granite','obsidian','jade',
    'ruby','emerald','sapphire','pearl','amber','coral','glass','ceramic','porcelain','concrete','cement',
    'plaster','wax','rubber','plastic','foam','gel','resin','tar','ash','charcoal','gunpowder','dynamite',
    // Warfare & Combat
    'sword','shield','arrow','spear','cannon','bomb','grenade','missile','rifle','pistol','shotgun','sniper',
    'dagger','axe','mace','crossbow','catapult','siege','fortress','bunker','trench','barricade','ambush',
    'raid','assault','retreat','surrender','victory','defeat','medal','rank','squad','platoon','battalion',
    // Furniture & Home
    'sofa','recliner','ottoman','mattress','headboard','nightstand','dresser','wardrobe','bookcase','mantle',
    'fireplace','chimney','porch','balcony','patio','gazebo','greenhouse','shed','mailbox','doorbell','knocker',
    'peephole','deadbolt','threshold','hallway','stairway','banister','railing','chandelier','sconce','fixture',
    // Misc
    'ticket','stamp','coin','token','badge','medal','ribbon','trophy','banner','flag','sign','poster','label',
    'tag','sticker','magnet','puzzle','riddle','maze','map','globe','atlas','compass','chart','graph','diagram',
    'blueprint','model','prototype','sample','specimen','artifact','relic','fossil','antique','vintage','classic',
    'legend','icon','symbol','emblem','crest','seal','brand','logo','trademark','patent','copyright','license',
    'permit','warrant','contract','treaty','charter','decree','mandate','verdict','sentence','pardon','ransom',
    'bounty','reward','prize','jackpot','lottery','gamble','wager','stake','bluff','trick','trap','decoy',
    'bait','lure','hook','net','cage','leash','collar','muzzle','saddle','harness','bridle','stirrup','spur',
    'whip','reins','yoke','plow','sickle','scythe','anvil','forge','kiln','furnace','bellows','tongs','chisel',
    'lathe','clamp','vise','lever','pulley','gear','spring','valve','gasket','piston','crankshaft','flywheel',
    'pendulum','sundial','hourglass','metronome','thermostat','barometer','gauge','meter','dial','switch','knob',
    'pedal','throttle','brake','clutch','steering','rudder','propeller','turbine','exhaust','muffler','bumper',
    'fender','hubcap','windshield','dashboard','console','compartment','cargo','freight','parcel','package',
    'crate','pallet','container','dumpster','manhole','gutter','drain','sewer','hydrant','sprinkler','nozzle',
    'valve','faucet','spigot','hose','duct','vent','flue','grate','grille','filter','strainer','funnel',
    'sieve','colander','mortar','pestle','grinder','blender','mixer','toaster','kettle','thermos','cooler',
    'freezer','pantry','cupboard','counter','island','backsplash','tile','grout','caulk','putty','spackle',
    'primer','varnish','lacquer','enamel','glaze','stain','polish','wax','shellac','epoxy','adhesive','tape',
    'glue','staple','paperclip','thumbtack','pushpin','marker','highlighter','eraser','sharpener','ruler',
    'protractor','stencil','template','binder','folder','envelope','postcard','letter','journal','diary',
    'notebook','ledger','scroll','manuscript','pamphlet','brochure','catalog','manual','handbook','almanac',
    'encyclopedia','dictionary','thesaurus','novel','biography','memoir','anthology','volume','chapter','verse',
    'paragraph','sentence','phrase','syllable','vowel','consonant','accent','dialect','slang','jargon','cipher',
    'code','signal','beacon','siren','alarm','whistle','gong','bell','chime','horn','bugle','drum','rattle'
];

function shuffleClueBank(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Socket.IO Connection Handler
io.on('connection', (socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);

    // Create Room (in-memory, like TD)
    socket.on('createRoom', (data) => {
        const { playerName, settings, withAI, avatarId } = data;
        const roomCode = generateRoomCode();
        const playerId = generatePlayerId();

        const room = {
            roomCode,
            players: [{
                odId: socket.id,
                oderId: playerId,
                name: playerName,
                avatarId: avatarId || 'avatar1',
                chips: (settings?.startingChips) || 1000,
                bet: 0,
                cards: [],
                folded: false,
                isHost: true,
                isActive: false,
                isAI: false,
                buyBacksUsed: 0,
                isConnected: true
            }],
            settings: {
                startingChips: 1000,
                smallBlind: 10,
                bigBlind: 20,
                turnTimeLimit: 30,
                allowBuyBack: true,
                maxBuyBacks: 3,
                buyBackAmount: 1000,
                ...(settings || {})
            },
            deck: [],
            communityCards: [],
            pot: 0,
            currentBet: 0,
            currentPlayerIndex: 0,
            gamePhase: 'waiting',
            dealerIndex: 0,
            chatMessages: [],
            playersActedThisRound: [],
            revealedCards: {}
        };

        // Add AI player if requested
        if (withAI) {
            room.players.push({
                odId: 'AI_DEALER',
                oderId: generatePlayerId(),
                name: 'Dealer',
                chips: room.settings.startingChips,
                bet: 0,
                cards: [],
                folded: false,
                isHost: false,
                isActive: false,
                isAI: true,
                buyBacksUsed: 0,
                isConnected: true
            });
        }

        pokerRooms[roomCode] = room;

        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.oderId = playerId;

        socket.emit('roomCreated', {
            roomCode,
            playerId,
            room: sanitizeRoom(room)
        });

        console.log(`🏠 Room ${roomCode} created by ${playerName}`);
    });

    // Join Room
    socket.on('joinRoom', (data) => {
        const { roomCode, playerName, avatarId } = data;
        const code = (roomCode || '').toUpperCase();
        const room = pokerRooms[code];

        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        if (room.players.length >= 8) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }
        if (room.gamePhase !== 'waiting') {
            socket.emit('error', { message: 'Game already in progress' });
            return;
        }

        const playerId = generatePlayerId();
        room.players.push({
            odId: socket.id,
            oderId: playerId,
            name: playerName,
            avatarId: avatarId || 'avatar1',
            chips: room.settings.startingChips || 1000,
            bet: 0,
            cards: [],
            folded: false,
            isHost: false,
            isActive: false,
            isAI: false,
            buyBacksUsed: 0,
            isConnected: true
        });

        socket.join(code);
        socket.roomCode = code;
        socket.oderId = playerId;

        socket.emit('roomJoined', {
            roomCode: code,
            playerId,
            room: sanitizeRoom(room)
        });

        socket.to(code).emit('playerJoined', {
            player: { name: playerName, oderId: playerId },
            room: sanitizeRoom(room)
        });

        console.log(`👤 ${playerName} joined room ${code}`);
    });

    // Start Game
    socket.on('startGame', () => {
        const room = pokerRooms[socket.roomCode];
        if (!room) return;

        const player = room.players.find(p => p.oderId === socket.oderId);
        if (!player || !player.isHost) {
            socket.emit('error', { message: 'Only host can start the game' });
            return;
        }
        if (room.players.length < 2) {
            socket.emit('error', { message: 'Need at least 2 players' });
            return;
        }

        startNewRound(room);

        io.to(socket.roomCode).emit('gameStarted', {
            room: sanitizeRoom(room)
        });

        scheduleAITurn(room);
    });

    // Player Action
    socket.on('playerAction', (data) => {
        const { action, amount } = data;
        const room = pokerRooms[socket.roomCode];
        if (!room) return;

        const playerIndex = room.players.findIndex(p => p.oderId === socket.oderId);
        if (playerIndex === -1 || playerIndex !== room.currentPlayerIndex) {
            socket.emit('error', { message: 'Not your turn' });
            return;
        }

        const player = room.players[playerIndex];
        if (!player.isActive || player.folded) {
            socket.emit('error', { message: 'Cannot act' });
            return;
        }

        const result = processAction(room, playerIndex, action, amount);
        if (!result.success) {
            socket.emit('error', { message: result.message });
            return;
        }

        io.to(socket.roomCode).emit('gameUpdate', {
            room: sanitizeRoom(room),
            lastAction: { playerId: socket.oderId, action, amount }
        });

        const activePlayers = room.players.filter(p => !p.folded);
        if (activePlayers.length === 1) {
            handleWinner(room, activePlayers[0], 'All others folded');
        } else if (isBettingRoundComplete(room)) {
            advanceGamePhase(room);
        } else {
            moveToNextPlayer(room);
            io.to(socket.roomCode).emit('gameUpdate', {
                room: sanitizeRoom(room)
            });
            scheduleAITurn(room);
        }
    });

    // Chat Message
    socket.on('chatMessage', (data) => {
        const { message } = data;
        const room = pokerRooms[socket.roomCode];
        if (!room) return;

        const player = room.players.find(p => p.oderId === socket.oderId);
        if (!player) return;

        const chatMessage = {
            playerId: socket.oderId,
            playerName: player.name,
            message: message.substring(0, 200),
            isAI: false,
            timestamp: new Date()
        };

        room.chatMessages.push(chatMessage);
        if (room.chatMessages.length > 50) {
            room.chatMessages.shift();
        }

        io.to(socket.roomCode).emit('newChatMessage', chatMessage);
    });

    // Next Round
    socket.on('nextRound', () => {
        const room = pokerRooms[socket.roomCode];
        if (!room) return;

        room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
        startNewRound(room);

        io.to(socket.roomCode).emit('gameStarted', {
            room: sanitizeRoom(room)
        });

        scheduleAITurn(room);
    });

    // Buy Back
    socket.on('buyBack', () => {
        const room = pokerRooms[socket.roomCode];
        if (!room) return;

        const player = room.players.find(p => p.oderId === socket.oderId);
        if (!player) return;

        if (!room.settings.allowBuyBack) {
            socket.emit('error', { message: 'Buy-backs not allowed' });
            return;
        }
        if (player.buyBacksUsed >= room.settings.maxBuyBacks) {
            socket.emit('error', { message: 'Max buy-backs reached' });
            return;
        }
        if (player.chips > 0) {
            socket.emit('error', { message: 'You still have chips' });
            return;
        }

        player.chips = room.settings.buyBackAmount || 1000;
        player.buyBacksUsed++;

        socket.emit('buyBackSuccess', {
            chips: player.chips,
            buyBacksRemaining: room.settings.maxBuyBacks - player.buyBacksUsed
        });

        io.to(socket.roomCode).emit('gameUpdate', {
            room: sanitizeRoom(room)
        });
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`🔌 Player disconnected: ${socket.id}`);

        // Handle TD room disconnect
        if (socket.tdRoom) {
            const room = tdRooms[socket.tdRoom];
            if (room) {
                room.players = room.players.filter(p => p.id !== socket.id);
                if (room.players.length === 0) {
                    delete tdRooms[socket.tdRoom];
                } else {
                    if (room.host === socket.id) room.host = room.players[0].id;
                    io.to('td:' + socket.tdRoom).emit('td:roomUpdate', {
                        players: room.players, host: room.host
                    });
                    io.to('td:' + socket.tdRoom).emit('td:playerLeft', {
                        playerId: socket.id
                    });
                }
            }
        }

        // Handle Clue room disconnect
        if (socket.clueRoom) {
            const cRoom = clueRooms[socket.clueRoom];
            if (cRoom) {
                cRoom.players = cRoom.players.filter(p => p.id !== socket.id);
                if (cRoom.players.length === 0) {
                    delete clueRooms[socket.clueRoom];
                } else {
                    if (cRoom.host === socket.id) cRoom.host = cRoom.players[0].id;
                    if (cRoom.state === 'playing' || cRoom.state === 'wordSelection') {
                        cRoom.state = 'gameOver';
                        cRoom.winner = 'disconnect';
                    }
                    io.to('clue:' + socket.clueRoom).emit('clue:playerLeft', {
                        playerId: socket.id,
                        players: cRoom.players
                    });
                }
            }
        }

        // Handle WordMaster room disconnect
        if (socket.wmRoom) {
            const wRoom = wmRooms[socket.wmRoom];
            if (wRoom) {
                wRoom.players = wRoom.players.filter(p => p.id !== socket.id);
                if (wRoom.players.length === 0) {
                    delete wmRooms[socket.wmRoom];
                } else {
                    if (wRoom.host === socket.id) wRoom.host = wRoom.players[0].id;
                    if (wRoom.state === 'playing') {
                        wRoom.state = 'gameOver';
                        io.to('wm:' + socket.wmRoom).emit('wm:gameOver', {
                            winner: 'disconnect',
                            safeFound: wRoom.safeFound,
                            hintsGiven: wRoom.hintsGiven,
                            board: wRoom.board
                        });
                    }
                    io.to('wm:' + socket.wmRoom).emit('wm:playerLeft', {
                        playerId: socket.id,
                        players: wRoom.players
                    });
                }
            }
        }

        // Handle poker room disconnect
        if (socket.roomCode) {
            const room = pokerRooms[socket.roomCode];
            if (room) {
                const player = room.players.find(p => p.odId === socket.id);
                if (player) {
                    player.isConnected = false;
                    io.to(socket.roomCode).emit('playerDisconnected', {
                        playerId: player.oderId,
                        room: sanitizeRoom(room)
                    });
                }
                // Clean up empty rooms
                const connected = room.players.filter(p => p.isConnected && !p.isAI);
                if (connected.length === 0) {
                    delete pokerRooms[socket.roomCode];
                }
            }
        }
    });

    // ── ZECRU TOWER DEFENSE MULTIPLAYER ──────────────────────
    socket.on('td:createRoom', (data) => {
        const code = Math.random().toString(36).substr(2, 6).toUpperCase();
        const player = { id: socket.id, name: data.name || 'Player 1' };
        tdRooms[code] = { players: [player], host: socket.id, started: false, waveActive: false, wave: 0 };
        socket.tdRoom = code;
        socket.join('td:' + code);
        socket.emit('td:roomCreated', { code, players: [player], host: socket.id });
        console.log(`🏰 TD Room ${code} created by ${player.name}`);
    });

    socket.on('td:joinRoom', (data) => {
        const code = (data.code || '').toUpperCase();
        const room = tdRooms[code];
        if (!room) return socket.emit('td:error', { msg: 'Room not found' });
        if (room.players.length >= 4) return socket.emit('td:error', { msg: 'Room full' });
        if (room.started) return socket.emit('td:error', { msg: 'Game already started' });
        const player = { id: socket.id, name: data.name || 'Player ' + (room.players.length + 1) };
        room.players.push(player);
        socket.tdRoom = code;
        socket.join('td:' + code);
        socket.emit('td:roomJoined', { code, players: room.players, host: room.host });
        socket.to('td:' + code).emit('td:roomUpdate', { players: room.players, host: room.host });
        console.log(`🏰 ${player.name} joined TD room ${code}`);
    });

    socket.on('td:startGame', () => {
        const room = tdRooms[socket.tdRoom];
        if (!room || room.host !== socket.id) return;
        room.started = true;
        io.to('td:' + socket.tdRoom).emit('td:gameStart', { players: room.players });
    });

    socket.on('td:placeTower', (data) => {
        if (!socket.tdRoom) return;
        socket.to('td:' + socket.tdRoom).emit('td:towerPlaced', {
            playerId: socket.id, ...data
        });
    });

    socket.on('td:sellTower', (data) => {
        if (!socket.tdRoom) return;
        socket.to('td:' + socket.tdRoom).emit('td:towerSold', {
            playerId: socket.id, ...data
        });
    });

    socket.on('td:upgradeTower', (data) => {
        if (!socket.tdRoom) return;
        socket.to('td:' + socket.tdRoom).emit('td:towerUpgraded', {
            playerId: socket.id, ...data
        });
    });

    socket.on('td:sendWave', () => {
        if (!socket.tdRoom) return;
        const room = tdRooms[socket.tdRoom];
        if (!room || room.waveActive) return;  // prevent double wave
        room.waveActive = true;
        room.wave++;
        io.to('td:' + socket.tdRoom).emit('td:waveStart');
    });

    socket.on('td:waveComplete', () => {
        if (!socket.tdRoom) return;
        const room = tdRooms[socket.tdRoom];
        if (room) room.waveActive = false;
    });

    socket.on('td:sendGold', (data) => {
        if (!socket.tdRoom) return;
        socket.to('td:' + socket.tdRoom).emit('td:goldReceived', {
            from: socket.id, amount: data.amount
        });
    });

    socket.on('td:syncState', (data) => {
        if (!socket.tdRoom) return;
        socket.to('td:' + socket.tdRoom).emit('td:allyState', {
            playerId: socket.id, gold: data.gold, name: data.name
        });
    });

    socket.on('td:setSpeed', (data) => {
        if (!socket.tdRoom) return;
        const speed = [1, 2, 3].includes(data.speed) ? data.speed : 1;
        socket.to('td:' + socket.tdRoom).emit('td:speedChanged', { speed });
    });

    // ── ZECRU 15 CLUES ──────────────────────────────────────
    socket.on('clue:createRoom', (data) => {
        const code = Math.random().toString(36).substr(2, 6).toUpperCase();
        const player = { id: socket.id, name: (data.name || 'Player 1').substring(0, 16) };
        clueRooms[code] = {
            roomCode: code,
            host: socket.id,
            players: [player],
            state: 'lobby',
            words: [],
            foundWords: [],
            guessesRemaining: 15,
            currentClue: null,
            currentClueCount: 0,
            clueGuessesLeft: 0,
            guessHistory: [],
            winner: null,
            hostRole: 'wordmaster'
        };
        socket.clueRoom = code;
        socket.join('clue:' + code);
        socket.emit('clue:roomCreated', { code, players: [player] });
        console.log(`Clue Room ${code} created by ${player.name}`);
    });

    socket.on('clue:joinRoom', (data) => {
        const code = ((data.code || '') + '').toUpperCase();
        const room = clueRooms[code];
        if (!room) return socket.emit('clue:error', { msg: 'Room not found' });
        if (room.players.length >= 2) return socket.emit('clue:error', { msg: 'Room is full (2 players max)' });
        if (room.state !== 'lobby') return socket.emit('clue:error', { msg: 'Game already in progress' });

        const player = { id: socket.id, name: (data.name || 'Player 2').substring(0, 16) };
        room.players.push(player);
        socket.clueRoom = code;
        socket.join('clue:' + code);
        socket.emit('clue:roomJoined', { code, players: room.players });
        socket.to('clue:' + code).emit('clue:playerJoined', { players: room.players });
        console.log(`${player.name} joined Clue room ${code}`);
    });

    socket.on('clue:startGame', (data) => {
        const room = clueRooms[socket.clueRoom];
        if (!room || room.host !== socket.id) return;
        if (room.players.length !== 2) return socket.emit('clue:error', { msg: 'Need exactly 2 players' });

        room.hostRole = data.hostRole || 'wordmaster';
        room.guessedTokens = [];

        // Assign roles
        room.players.forEach(p => {
            if (p.id === room.host) {
                p.role = room.hostRole;
            } else {
                p.role = room.hostRole === 'wordmaster' ? 'guesser' : 'wordmaster';
            }
        });

        // Wordmaster will submit words — set state to wordSelection
        room.state = 'wordSelection';

        // Send roles — wordmaster goes to word input, guesser waits
        room.players.forEach(p => {
            io.to(p.id).emit('clue:gameStarted', { role: p.role });
        });
        console.log(`Clue game started in room ${socket.clueRoom}, waiting for word submission`);
    });

    // Wordmaster submits their 10 custom words
    socket.on('clue:submitWords', (data) => {
        const room = clueRooms[socket.clueRoom];
        if (!room || room.state !== 'wordSelection') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.role !== 'wordmaster') {
            return socket.emit('clue:error', { msg: 'Only the Wordmaster can submit words' });
        }

        const words = data.words;
        if (!Array.isArray(words) || words.length !== 10) {
            return socket.emit('clue:error', { msg: 'Must submit exactly 10 words' });
        }

        const cleaned = [];
        for (let i = 0; i < 10; i++) {
            const w = ((words[i] || '') + '').trim().toLowerCase();
            if (!w || w.includes(' ')) {
                return socket.emit('clue:error', { msg: 'Word ' + (i + 1) + ' is invalid' });
            }
            if (cleaned.includes(w)) {
                return socket.emit('clue:error', { msg: 'Duplicate word: ' + w });
            }
            cleaned.push(w);
        }

        room.words = cleaned;
        room.foundWords = new Array(10).fill(false);
        room.state = 'playing';
        room.guessesRemaining = 15;
        room.currentClue = null;
        room.currentClueCount = 0;
        room.clueGuessesLeft = 0;
        room.guessHistory = [];
        room.winner = null;

        // Send to both — wordmaster gets the words, guesser does not
        room.players.forEach(p => {
            if (p.role === 'wordmaster') {
                io.to(p.id).emit('clue:wordsSubmitted', { words: room.words });
            } else {
                io.to(p.id).emit('clue:wordsSubmitted', { wordCount: 10 });
            }
        });
        console.log(`Clue words submitted in room ${socket.clueRoom}:`, room.words);
    });

    socket.on('clue:giveClue', (data) => {
        const room = clueRooms[socket.clueRoom];
        if (!room || room.state !== 'playing') {
            return socket.emit('clue:error', { msg: 'Game not active' });
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.role !== 'wordmaster') {
            return socket.emit('clue:error', { msg: 'Only the Wordmaster can give clues' });
        }
        if (room.currentClue !== null) {
            return socket.emit('clue:error', { msg: 'Clue already given' });
        }

        const clue = ((data.clue || '') + '').trim().toLowerCase();
        if (!clue || clue.includes(' ')) {
            return socket.emit('clue:error', { msg: 'Clue must be exactly one word' });
        }

        // Clue cannot be one of the unguessed words
        for (let i = 0; i < room.words.length; i++) {
            if (!room.foundWords[i] && clue === room.words[i]) {
                return socket.emit('clue:error', { msg: 'Clue cannot be one of the words!' });
            }
        }

        const count = Math.max(1, Math.min(10, parseInt(data.count) || 1));
        room.currentClue = clue;
        room.currentClueCount = count;
        room.clueGuessesLeft = count;

        io.to('clue:' + socket.clueRoom).emit('clue:clueGiven', { clue, count });
        console.log(`[Clue] Clue given in ${socket.clueRoom}: "${clue}" for ${count}`);
    });

    socket.on('clue:makeGuess', (data) => {
        const room = clueRooms[socket.clueRoom];
        if (!room || room.state !== 'playing') {
            return socket.emit('clue:error', { msg: 'Game not active' });
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.role !== 'guesser') {
            return socket.emit('clue:error', { msg: 'Only the Guesser can guess' });
        }
        if (room.currentClue === null || room.clueGuessesLeft <= 0) {
            return socket.emit('clue:error', { msg: 'Wait for a clue first' });
        }

        const guess = ((data.guess || '') + '').trim().toLowerCase();
        if (!guess || guess.includes(' ')) return;

        // Prevent re-guessing a token already guessed
        if (room.guessedTokens && room.guessedTokens.includes(guess)) {
            return socket.emit('clue:error', { msg: 'Already guessed' });
        }

        // Track guessed word
        if (!room.guessedTokens) room.guessedTokens = [];
        room.guessedTokens.push(guess);

        // Check against all unguessed words
        let matchedIndex = -1;
        for (let i = 0; i < room.words.length; i++) {
            if (!room.foundWords[i] && guess === room.words[i]) {
                matchedIndex = i;
                break;
            }
        }

        const correct = matchedIndex >= 0;
        if (correct) {
            room.foundWords[matchedIndex] = true;
        } else {
            room.guessesRemaining--;
        }
        room.clueGuessesLeft--;

        const entry = {
            clue: room.currentClue,
            guess,
            correct,
            word: correct ? room.words[matchedIndex] : null,
            wordIndex: matchedIndex
        };
        room.guessHistory.push(entry);

        const wordsFound = room.foundWords.filter(Boolean).length;
        // Turn ends on wrong guess OR all clue guesses used
        const turnOver = !correct || room.clueGuessesLeft <= 0;

        let gameOver = false;
        if (wordsFound >= 10) {
            room.state = 'gameOver';
            room.winner = 'guesser';
            gameOver = true;
        } else if (room.guessesRemaining <= 0) {
            room.state = 'gameOver';
            room.winner = 'wordmaster';
            gameOver = true;
        }

        if (turnOver || gameOver) {
            room.currentClue = null;
            room.currentClueCount = 0;
            room.clueGuessesLeft = 0;
        }

        io.to('clue:' + socket.clueRoom).emit('clue:guessResult', {
            correct, guess,
            clue: entry.clue,
            word: entry.word,
            wordIndex: matchedIndex,
            wordsFound,
            guessesRemaining: room.guessesRemaining,
            clueGuessesLeft: room.clueGuessesLeft,
            turnOver,
            gameOver,
            foundWords: room.foundWords
        });

        if (gameOver) {
            io.to('clue:' + socket.clueRoom).emit('clue:gameOver', {
                winner: room.winner,
                wordsGuessed: wordsFound,
                guessesUsed: 15 - room.guessesRemaining,
                words: room.words,
                foundWords: room.foundWords,
                guessHistory: room.guessHistory
            });
            console.log(`Clue game over in room ${socket.clueRoom}: ${room.winner} wins`);
        }
    });

    socket.on('clue:passTurn', () => {
        const room = clueRooms[socket.clueRoom];
        if (!room || room.state !== 'playing') return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.role !== 'guesser') return;
        if (room.currentClue === null) return;

        room.currentClue = null;
        room.clueGuessesLeft = 0;
        room.currentClueCount = 0;

        io.to('clue:' + socket.clueRoom).emit('clue:turnPassed', {
            guessesRemaining: room.guessesRemaining,
            wordsFound: room.foundWords.filter(Boolean).length,
            foundWords: room.foundWords
        });
    });

    // ── ZECRU'S WORDMASTER ─────────────────────────────────
    socket.on('wm:createRoom', (data) => {
        const code = Math.random().toString(36).substr(2, 6).toUpperCase();
        const player = { id: socket.id, name: (data.name || 'Player 1').substring(0, 16) };
        wmRooms[code] = {
            roomCode: code,
            host: socket.id,
            players: [player],
            state: 'lobby',
            board: [],
            hostRole: 'wordmaster',
            currentHint: null,
            guessesLeft: 0,
            safeFound: 0,
            hintsGiven: 0
        };
        socket.wmRoom = code;
        socket.join('wm:' + code);
        socket.emit('wm:roomCreated', { code, players: [player] });
        console.log(`WordMaster room ${code} created by ${player.name}`);
    });

    socket.on('wm:joinRoom', (data) => {
        const code = ((data.code || '') + '').toUpperCase();
        const room = wmRooms[code];
        if (!room) return socket.emit('wm:error', { msg: 'Room not found' });
        if (room.players.length >= 2) return socket.emit('wm:error', { msg: 'Room is full' });
        if (room.state !== 'lobby') return socket.emit('wm:error', { msg: 'Game already in progress' });

        const player = { id: socket.id, name: (data.name || 'Player 2').substring(0, 16) };
        room.players.push(player);
        socket.wmRoom = code;
        socket.join('wm:' + code);
        socket.emit('wm:roomJoined', { code, players: room.players });
        socket.to('wm:' + code).emit('wm:playerJoined', { players: room.players });
        console.log(`${player.name} joined WordMaster room ${code}`);
    });

    socket.on('wm:startGame', (data) => {
        const room = wmRooms[socket.wmRoom];
        if (!room || room.host !== socket.id) return;
        if (room.players.length !== 2) return socket.emit('wm:error', { msg: 'Need exactly 2 players' });

        room.state = 'playing';
        room.hostRole = data.hostRole || 'wordmaster';

        // Pick 25 random words
        const shuffled = shuffleClueBank(WORDMASTER_WORDS);
        const picked = shuffled.slice(0, 25);

        // Assign types: 8 safe, 1 doom, 16 neutral
        const indices = Array.from({ length: 25 }, (_, i) => i);
        // Shuffle indices for random assignment
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const safeIndices = new Set(indices.slice(0, 8));
        const doomIndex = indices[8];

        room.board = picked.map((word, i) => ({
            word,
            type: safeIndices.has(i) ? 'safe' : (i === doomIndex ? 'doom' : 'neutral'),
            revealed: false
        }));
        room.currentHint = null;
        room.guessesLeft = 0;
        room.safeFound = 0;
        room.hintsGiven = 0;

        // Assign roles
        room.players.forEach(p => {
            if (p.id === room.host) {
                p.role = room.hostRole;
            } else {
                p.role = room.hostRole === 'wordmaster' ? 'guesser' : 'wordmaster';
            }
        });

        // Send board: WordMaster sees types, Guesser does not
        room.players.forEach(p => {
            if (p.role === 'wordmaster') {
                io.to(p.id).emit('wm:gameStarted', {
                    role: 'wordmaster',
                    board: room.board.map(c => ({ word: c.word, type: c.type, revealed: false }))
                });
            } else {
                io.to(p.id).emit('wm:gameStarted', {
                    role: 'guesser',
                    board: room.board.map(c => ({ word: c.word, revealed: false }))
                });
            }
        });
        console.log(`WordMaster game started in room ${socket.wmRoom}`);
    });

    socket.on('wm:giveHint', (data) => {
        const room = wmRooms[socket.wmRoom];
        if (!room || room.state !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.role !== 'wordmaster') {
            return socket.emit('wm:error', { msg: 'Only the WordMaster can give hints' });
        }
        if (room.currentHint && room.guessesLeft > 0) {
            return socket.emit('wm:error', { msg: 'Guesser is still guessing' });
        }

        const hint = ((data.hint || '') + '').trim().toLowerCase();
        const number = parseInt(data.number);
        if (!hint || hint.includes(' ')) {
            return socket.emit('wm:error', { msg: 'Hint must be a single word' });
        }
        if (!number || number < 1 || number > 8) {
            return socket.emit('wm:error', { msg: 'Number must be between 1 and 8' });
        }
        // Hint cannot be a word on the board
        if (room.board.some(c => c.word === hint)) {
            return socket.emit('wm:error', { msg: 'Hint cannot be a word on the board' });
        }

        room.currentHint = { word: hint, number };
        room.guessesLeft = number + 1;
        room.hintsGiven++;

        io.to('wm:' + socket.wmRoom).emit('wm:hintGiven', {
            hint: hint,
            number: number,
            guessesLeft: room.guessesLeft
        });
    });

    socket.on('wm:pickWord', (data) => {
        const room = wmRooms[socket.wmRoom];
        if (!room || room.state !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.role !== 'guesser') {
            return socket.emit('wm:error', { msg: 'Only the Guesser can pick words' });
        }
        if (!room.currentHint || room.guessesLeft <= 0) {
            return socket.emit('wm:error', { msg: 'Wait for a hint first' });
        }

        const index = parseInt(data.index);
        if (isNaN(index) || index < 0 || index >= 25) return;
        if (room.board[index].revealed) {
            return socket.emit('wm:error', { msg: 'Word already revealed' });
        }

        const card = room.board[index];
        card.revealed = true;
        room.guessesLeft--;

        let turnEnded = false;
        let gameOver = false;
        let winner = null;

        if (card.type === 'doom') {
            gameOver = true;
            winner = 'wordmaster';
            room.state = 'gameOver';
        } else if (card.type === 'safe') {
            room.safeFound++;
            if (room.safeFound >= 8) {
                gameOver = true;
                winner = 'guesser';
                room.state = 'gameOver';
            } else if (room.guessesLeft <= 0) {
                turnEnded = true;
            }
        } else {
            // neutral — turn ends
            turnEnded = true;
            room.guessesLeft = 0;
        }

        if (turnEnded) {
            room.currentHint = null;
        }

        io.to('wm:' + socket.wmRoom).emit('wm:wordRevealed', {
            index,
            word: card.word,
            type: card.type,
            safeFound: room.safeFound,
            guessesLeft: room.guessesLeft,
            turnEnded,
            gameOver,
            winner
        });

        if (gameOver) {
            io.to('wm:' + socket.wmRoom).emit('wm:gameOver', {
                winner,
                safeFound: room.safeFound,
                hintsGiven: room.hintsGiven,
                board: room.board
            });
            console.log(`WordMaster game over in room ${socket.wmRoom}: ${winner} wins`);
        }
    });

    socket.on('wm:endTurn', () => {
        const room = wmRooms[socket.wmRoom];
        if (!room || room.state !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.role !== 'guesser') return;
        if (!room.currentHint || room.guessesLeft <= 0) return;

        room.guessesLeft = 0;
        room.currentHint = null;

        io.to('wm:' + socket.wmRoom).emit('wm:turnEnded', {
            safeFound: room.safeFound
        });
    });
});

// Game Logic Functions
function startNewRound(room) {
    room.deck = shuffleDeck(createDeck());
    room.communityCards = [];
    room.pot = 0;
    room.currentBet = room.settings.bigBlind || 20;
    room.gamePhase = 'preflop';
    room.playersActedThisRound = [];
    room.revealedCards = {};

    // Reset players
    room.players.forEach(p => {
        p.bet = 0;
        p.cards = [];
        p.folded = p.chips <= 0;
        p.isActive = false;
    });

    // Deal cards
    room.players.forEach(p => {
        if (!p.folded) {
            p.cards = [room.deck.pop(), room.deck.pop()];
        }
    });

    // Post blinds
    const sb = room.settings.smallBlind || 10;
    const bb = room.settings.bigBlind || 20;

    let sbIndex, bbIndex;
    if (room.players.length === 2) {
        sbIndex = room.dealerIndex;
        bbIndex = (room.dealerIndex + 1) % room.players.length;
    } else {
        sbIndex = (room.dealerIndex + 1) % room.players.length;
        bbIndex = (room.dealerIndex + 2) % room.players.length;
    }

    const sbPlayer = room.players[sbIndex];
    const sbAmount = Math.min(sb, sbPlayer.chips);
    sbPlayer.bet = sbAmount;
    sbPlayer.chips -= sbAmount;
    room.pot += sbAmount;

    const bbPlayer = room.players[bbIndex];
    const bbAmount = Math.min(bb, bbPlayer.chips);
    bbPlayer.bet = bbAmount;
    bbPlayer.chips -= bbAmount;
    room.pot += bbAmount;

    // Set first player
    if (room.players.length === 2) {
        room.currentPlayerIndex = room.dealerIndex;
    } else {
        room.currentPlayerIndex = (room.dealerIndex + 3) % room.players.length;
    }

    while (room.players[room.currentPlayerIndex].folded) {
        room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    }

    room.players[room.currentPlayerIndex].isActive = true;
}

function processAction(room, playerIndex, action, amount) {
    const player = room.players[playerIndex];

    switch (action) {
        case 'fold':
            player.folded = true;
            break;

        case 'check':
            if (player.bet < room.currentBet) {
                return { success: false, message: 'Cannot check' };
            }
            break;

        case 'call':
            const callAmount = Math.min(room.currentBet - player.bet, player.chips);
            player.chips -= callAmount;
            player.bet += callAmount;
            room.pot += callAmount;
            break;

        case 'raise':
            if (amount <= room.currentBet) {
                return { success: false, message: 'Raise must be higher' };
            }
            const raiseTotal = Math.min(amount - player.bet, player.chips);
            player.chips -= raiseTotal;
            player.bet += raiseTotal;
            room.pot += raiseTotal;
            room.currentBet = player.bet;
            room.playersActedThisRound = [player.oderId];
            return { success: true };
    }

    room.playersActedThisRound.push(player.oderId);
    player.isActive = false;

    return { success: true };
}

function moveToNextPlayer(room) {
    room.players[room.currentPlayerIndex].isActive = false;

    let nextIndex = (room.currentPlayerIndex + 1) % room.players.length;
    let attempts = 0;

    while (room.players[nextIndex].folded && attempts < room.players.length) {
        nextIndex = (nextIndex + 1) % room.players.length;
        attempts++;
    }

    room.currentPlayerIndex = nextIndex;
    room.players[nextIndex].isActive = true;
}

function isBettingRoundComplete(room) {
    const activePlayers = room.players.filter(p => !p.folded);
    if (activePlayers.length <= 1) return true;

    const allActed = activePlayers.every(p => room.playersActedThisRound.includes(p.oderId));
    const betsEqual = activePlayers.every(p => p.bet === room.currentBet || p.chips === 0);

    return allActed && betsEqual;
}

function advanceGamePhase(room) {
    const activePlayers = room.players.filter(p => !p.folded);

    if (activePlayers.length === 1) {
        handleWinner(room, activePlayers[0], 'All others folded');
        return;
    }

    switch (room.gamePhase) {
        case 'preflop':
            room.deck.pop(); // Burn
            room.communityCards.push(room.deck.pop(), room.deck.pop(), room.deck.pop());
            room.gamePhase = 'flop';
            break;
        case 'flop':
            room.deck.pop();
            room.communityCards.push(room.deck.pop());
            room.gamePhase = 'turn';
            break;
        case 'turn':
            room.deck.pop();
            room.communityCards.push(room.deck.pop());
            room.gamePhase = 'river';
            break;
        case 'river':
            showdown(room);
            return;
    }

    // Reset for new betting round
    room.currentBet = 0;
    room.playersActedThisRound = [];
    room.players.forEach(p => {
        p.bet = 0;
        p.isActive = false;
    });

    let startIndex = (room.dealerIndex + 1) % room.players.length;
    while (room.players[startIndex].folded) {
        startIndex = (startIndex + 1) % room.players.length;
    }
    room.currentPlayerIndex = startIndex;
    room.players[startIndex].isActive = true;

    io.to(room.roomCode).emit('gameUpdate', {
        room: sanitizeRoom(room)
    });

    scheduleAITurn(room);
}

function showdown(room) {
    room.gamePhase = 'showdown';

    const activePlayers = room.players.filter(p => !p.folded);

    // Evaluate hands
    const hands = activePlayers.map(player => {
        const allCards = [...player.cards, ...room.communityCards];
        const hand = evaluateHand(allCards);
        return { player, hand };
    });

    hands.sort((a, b) => b.hand.value - a.hand.value);
    const winner = hands[0].player;
    const winAmount = room.pot;
    winner.chips += winAmount;

    // Reveal AI cards
    room.players.forEach(p => {
        if (p.isAI && !p.folded) {
            room.revealedCards[p.oderId] = [0, 1];
        }
    });

    // Send AI taunt
    const aiPlayer = room.players.find(p => p.isAI);
    if (aiPlayer && winner.isAI) {
        setTimeout(() => {
            const tauntCategory = winAmount > 100 ? 'bigWin' : 'win';
            const taunt = getRandomTaunt(tauntCategory);
            if (taunt) {
                const chatMessage = {
                    playerId: aiPlayer.oderId,
                    playerName: aiPlayer.name,
                    message: taunt,
                    isAI: true,
                    isTaunt: true,
                    timestamp: new Date()
                };
                room.chatMessages.push(chatMessage);
                io.to(room.roomCode).emit('newChatMessage', chatMessage);
            }
        }, 500);
    }

    io.to(room.roomCode).emit('showdown', {
        room: sanitizeRoom(room),
        winner: {
            playerId: winner.oderId,
            name: winner.name,
            hand: hands[0].hand,
            winAmount
        },
        hands: hands.map(h => ({
            playerId: h.player.oderId,
            playerName: h.player.name,
            cards: h.player.cards,
            hand: h.hand
        }))
    });
}

function handleWinner(room, winner, reason) {
    const winAmount = room.pot;
    winner.chips += winAmount;
    room.gamePhase = 'showdown';

    // AI taunt when player folds
    const aiPlayer = room.players.find(p => p.isAI);
    if (aiPlayer && winner.isAI && reason === 'All others folded') {
        setTimeout(() => {
            const taunt = getRandomTaunt('playerFolded');
            if (taunt) {
                const chatMessage = {
                    playerId: aiPlayer.oderId,
                    playerName: aiPlayer.name,
                    message: taunt,
                    isAI: true,
                    isTaunt: true,
                    timestamp: new Date()
                };
                room.chatMessages.push(chatMessage);
                io.to(room.roomCode).emit('newChatMessage', chatMessage);
            }
        }, 500);
    }

    io.to(room.roomCode).emit('roundEnd', {
        room: sanitizeRoom(room),
        winner: {
            playerId: winner.oderId,
            name: winner.name,
            winAmount,
            reason
        }
    });
}

// AI Turn Handler
const aiTimers = new Map();

function scheduleAITurn(room) {
    const currentPlayer = room.players[room.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isAI) return;
    if (room.gamePhase === 'showdown' || room.gamePhase === 'waiting') return;

    // Clear existing timer
    if (aiTimers.has(room.roomCode)) {
        clearTimeout(aiTimers.get(room.roomCode));
    }

    const timer = setTimeout(() => {
        try {
            const freshRoom = pokerRooms[room.roomCode];
            if (!freshRoom || freshRoom.gamePhase === 'showdown') return;

            const aiPlayer = freshRoom.players[freshRoom.currentPlayerIndex];
            if (!aiPlayer || !aiPlayer.isAI || !aiPlayer.isActive) return;

            const gameState = {
                currentBet: freshRoom.currentBet,
                pot: freshRoom.pot,
                myBet: aiPlayer.bet,
                myChips: aiPlayer.chips,
                bigBlind: freshRoom.settings.bigBlind || 20
            };

            const decision = makeAIDecision(gameState, aiPlayer.cards, freshRoom.communityCards);

            // Process AI action
            const result = processAction(freshRoom, freshRoom.currentPlayerIndex, decision.action, decision.amount);
            if (!result.success) return;

            // Send taunt if applicable
            if (decision.taunt) {
                const chatMessage = {
                    playerId: aiPlayer.oderId,
                    playerName: aiPlayer.name,
                    message: decision.taunt,
                    isAI: true,
                    isTaunt: true,
                    timestamp: new Date()
                };
                freshRoom.chatMessages.push(chatMessage);
                io.to(freshRoom.roomCode).emit('newChatMessage', chatMessage);
            }

            io.to(freshRoom.roomCode).emit('gameUpdate', {
                room: sanitizeRoom(freshRoom),
                lastAction: { playerId: aiPlayer.oderId, action: decision.action, amount: decision.amount }
            });

            // Check game state
            const activePlayers = freshRoom.players.filter(p => !p.folded);
            if (activePlayers.length === 1) {
                handleWinner(freshRoom, activePlayers[0], 'All others folded');
            } else if (isBettingRoundComplete(freshRoom)) {
                advanceGamePhase(freshRoom);
            } else {
                moveToNextPlayer(freshRoom);
                io.to(freshRoom.roomCode).emit('gameUpdate', {
                    room: sanitizeRoom(freshRoom)
                });
                scheduleAITurn(freshRoom);
            }

        } catch (error) {
            console.error('AI turn error:', error);
        }
    }, 2000);

    aiTimers.set(room.roomCode, timer);
}

// Sanitize room data (hide other players' cards, strip deck)
function sanitizeRoom(room) {
    const data = JSON.parse(JSON.stringify(room));

    // Remove deck from response
    delete data.deck;

    // Only show revealed cards
    data.players = data.players.map(p => {
        const revealed = (data.revealedCards && data.revealedCards[p.oderId]) || [];
        return {
            ...p,
            cards: p.isAI && data.gamePhase !== 'showdown' && revealed.length === 0
                ? []
                : p.cards
        };
    });

    return data;
}

// ================== USER AUTHENTICATION & DOTS SURVIVOR API ==================

const { User, LeaderboardEntry, Session } = require('./userModels');

// Generate session token (simple implementation)
function generateToken() {
    return require('crypto').randomBytes(32).toString('hex');
}

// Session expiry time: 7 days
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Middleware to check auth (MongoDB-backed sessions)
async function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const session = await Session.findOne({
            token,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Update last activity (don't await to avoid slowing down requests)
        Session.updateOne({ _id: session._id }, { lastActivity: new Date() }).exec();

        req.userId = session.userId;
        req.username = session.username;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

// Middleware to check admin (MongoDB-backed sessions)
async function authenticateAdmin(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const session = await Session.findOne({
            token,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const user = await User.findById(session.userId);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.userId = session.userId;
        req.username = session.username;
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

// Profanity filter
const BANNED_WORDS = [
    'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'pussy', 'cock', 'nigger', 'nigga',
    'faggot', 'fag', 'retard', 'whore', 'slut', 'bastard', 'damn', 'piss', 'penis',
    'vagina', 'anus', 'dildo', 'porn', 'sex', 'rape', 'nazi', 'hitler', 'kill', 'murder',
    'suicide', 'terrorist', 'bomb', 'kys', 'kms', 'n1gger', 'n1gga', 'f4g', 'f4ggot',
    'b1tch', 'sh1t', 'a55', 'd1ck', 'p0rn', 'wh0re', 'sl00t'
];

function containsProfanity(text) {
    const normalized = text.toLowerCase().replace(/[0-9@!$]/g, match => {
        const replacements = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a', '!': 'i', '$': 's' };
        return replacements[match] || match;
    });

    return BANNED_WORDS.some(word => normalized.includes(word));
}

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        // Check MongoDB connection
        if (!mongoConnected || mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database temporarily unavailable. Please try again.' });
        }

        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: 'Username must be 3-20 characters' });
        }

        // Profanity check
        if (containsProfanity(username)) {
            return res.status(400).json({ error: 'Username contains inappropriate language' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if username or email exists
        const existingUser = await User.findOne({ $or: [{ username }, { email: email.toLowerCase() }] });
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            return res.status(400).json({ error: 'Email already registered' });
        }

        const user = new User({ username, email: email.toLowerCase() });
        user.setPassword(password);
        await user.save();

        // Auto-login after registration - create persistent session
        const token = generateToken();
        await Session.create({
            token,
            userId: user._id,
            username: user.username,
            expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
            deviceInfo: req.headers['user-agent'] || 'Unknown'
        });

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin || false,
                isTester: user.isTester || false,
                library: user.library || [],
                savedGame: user.savedGame,
                stats: user.dotsSurvivorStats
            }
        });

        console.log(`✅ User registered: ${username}`);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        // Check MongoDB connection
        if (!mongoConnected || mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database temporarily unavailable. Please try again.' });
        }

        const { login, password, rememberMe, deviceInfo } = req.body;

        if (!login || !password) {
            return res.status(400).json({ error: 'Login and password required' });
        }

        // Find by username or email
        const user = await User.findOne({
            $or: [{ username: login }, { email: login.toLowerCase() }]
        });

        if (!user || !user.validatePassword(password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user is banned
        if (user.isBanned) {
            return res.status(403).json({
                error: 'Account banned',
                reason: user.banReason || 'No reason provided',
                bannedAt: user.bannedAt
            });
        }

        user.lastLogin = new Date();

        // Create persistent session in MongoDB
        const token = generateToken();
        await Session.create({
            token,
            userId: user._id,
            username: user.username,
            expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
            deviceInfo: deviceInfo || req.headers['user-agent'] || 'Unknown'
        });

        let rememberToken = null;
        if (rememberMe) {
            // Generate a persistent remember token (30 days)
            rememberToken = generateToken();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            // Remove old tokens for this device if exists, keep max 5 tokens
            if (user.rememberTokens && user.rememberTokens.length >= 5) {
                user.rememberTokens.shift();
            }
            if (!user.rememberTokens) user.rememberTokens = [];
            
            user.rememberTokens.push({
                token: rememberToken,
                deviceInfo: deviceInfo || 'Unknown device',
                createdAt: new Date(),
                expiresAt
            });
        }

        await user.save();

        res.json({
            success: true,
            token,
            rememberToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin || false,
                isTester: user.isTester || false,
                library: user.library || [],
                savedGame: user.savedGame,
                stats: user.dotsSurvivorStats
            }
        });

        console.log(`✅ User logged in: ${user.username}${rememberMe ? ' (remembered)' : ''}${user.isAdmin ? ' [ADMIN]' : ''}${user.isTester ? ' [TESTER]' : ''}`);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const { rememberToken } = req.body || {};

    // Delete session from MongoDB
    try {
        await Session.deleteOne({ token });
    } catch (e) {
        console.error('Error deleting session:', e);
    }

    // Also remove remember token if provided
    if (rememberToken) {
        try {
            const user = await User.findById(req.userId);
            if (user && user.rememberTokens) {
                user.rememberTokens = user.rememberTokens.filter(t => t.token !== rememberToken);
                await user.save();
            }
        } catch (e) {
            console.error('Error removing remember token:', e);
        }
    }

    res.json({ success: true });
});

// Auto-login with remember token
app.post('/api/auth/remember', async (req, res) => {
    try {
        if (!mongoConnected || mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database temporarily unavailable' });
        }

        const { rememberToken } = req.body;
        
        if (!rememberToken) {
            return res.status(400).json({ error: 'Remember token required' });
        }

        // Find user with this remember token
        const user = await User.findOne({
            'rememberTokens.token': rememberToken,
            'rememberTokens.expiresAt': { $gt: new Date() }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid or expired remember token' });
        }

        user.lastLogin = new Date();
        await user.save();

        // Generate new session token and persist to MongoDB
        const token = generateToken();
        await Session.create({
            token,
            userId: user._id,
            username: user.username,
            expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
            deviceInfo: req.headers['user-agent'] || 'Unknown'
        });

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin || false,
                isTester: user.isTester || false,
                library: user.library || [],
                savedGame: user.savedGame,
                stats: user.dotsSurvivorStats
            }
        });

        console.log(`✅ User auto-logged in via remember token: ${user.username}${user.isAdmin ? ' [ADMIN]' : ''}${user.isTester ? ' [TESTER]' : ''}`);
    } catch (error) {
        console.error('Remember login error:', error);
        res.status(500).json({ error: 'Auto-login failed' });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin || false,
            isTester: user.isTester || false,
            library: user.library || [],
            savedGame: user.savedGame,
            stats: user.dotsSurvivorStats
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// ================== DOTS SURVIVOR SAVE/LOAD ==================

// Save game
app.post('/api/dots-survivor/save', authenticateToken, async (req, res) => {
    try {
        const { gameState } = req.body;

        if (!gameState) {
            return res.status(400).json({ error: 'No game state provided' });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.savedGame = {
            exists: true,
            savedAt: new Date(),
            gameState
        };
        await user.save();

        res.json({ success: true, savedAt: user.savedGame.savedAt });
        console.log(`💾 Game saved for ${user.username}`);
    } catch (error) {
        console.error('Save game error:', error);
        res.status(500).json({ error: 'Failed to save game' });
    }
});

// Load game
app.get('/api/dots-survivor/load', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.savedGame?.exists) {
            return res.status(404).json({ error: 'No saved game found' });
        }

        res.json({
            success: true,
            savedAt: user.savedGame.savedAt,
            gameState: user.savedGame.gameState
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load game' });
    }
});

// Delete saved game
app.delete('/api/dots-survivor/save', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.savedGame = { exists: false };
        await user.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete save' });
    }
});

// ─── CRITTER COLONY ENDPOINTS ────────────────────────────────

app.post('/api/colony/save', authenticateToken, async (req, res) => {
    try {
        const { gameState } = req.body;
        if (!gameState) return res.status(400).json({ error: 'No game state provided' });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.colonyData = {
            exists: true,
            lastActive: new Date(),
            savedAt: new Date(),
            gameState
        };
        await user.save();

        res.json({ success: true, savedAt: user.colonyData.savedAt });
    } catch (error) {
        console.error('Colony save error:', error);
        res.status(500).json({ error: 'Failed to save colony' });
    }
});

app.get('/api/colony/load', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.colonyData?.exists) {
            return res.status(404).json({ error: 'No saved colony found' });
        }

        const elapsed = Math.min(
            (Date.now() - new Date(user.colonyData.lastActive).getTime()) / 1000,
            8 * 3600
        );

        res.json({
            success: true,
            savedAt: user.colonyData.savedAt,
            lastActive: user.colonyData.lastActive,
            elapsed: Math.floor(elapsed),
            gameState: user.colonyData.gameState
        });
    } catch (error) {
        console.error('Colony load error:', error);
        res.status(500).json({ error: 'Failed to load colony' });
    }
});

app.delete('/api/colony/save', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.colonyData = { exists: false };
        await user.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete colony save' });
    }
});

// Submit score (end of game)
app.post('/api/dots-survivor/submit-score', authenticateToken, async (req, res) => {
    try {
        const { score, wave, kills, timePlayed } = req.body;

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const stats = user.dotsSurvivorStats;
        let updated = false;

        // Update personal bests
        if (score > stats.highestScore) {
            stats.highestScore = score;
            updated = true;
        }
        if (wave > stats.highestWave) {
            stats.highestWave = wave;
            updated = true;
        }
        if (kills > stats.highestKills) {
            stats.highestKills = kills;
            updated = true;
        }

        stats.totalGamesPlayed++;
        stats.totalTimePlayed += timePlayed || 0;

        // ========== ACCOUNT PROGRESSION ==========
        // Initialize account progression if not exists
        if (!user.accountProgression) {
            user.accountProgression = {
                level: 1,
                xp: 0,
                xpToNextLevel: 1000, // Base 1000 XP for level 1
                tokens: 0,
                totalTokensEarned: 0
            };
        }

        // Calculate XP earned:
        // - 1 XP per kill
        // - Wave XP scales with wave survived: wave 1 = 10, wave 2 = 20, wave 3 = 30, etc.
        // Total wave XP = sum of (10 * i) for i from 1 to wave = 10 * (wave * (wave + 1) / 2)
        const waveXP = 10 * (wave * (wave + 1) / 2);
        const killXP = kills;
        const xpEarned = Math.floor(waveXP + killXP);
        let levelsGained = 0;
        let tokensEarned = 0;

        user.accountProgression.xp += xpEarned;

        // Check for level ups
        while (user.accountProgression.xp >= user.accountProgression.xpToNextLevel) {
            user.accountProgression.xp -= user.accountProgression.xpToNextLevel;
            user.accountProgression.level++;
            levelsGained++;

            // Award tokens per level (starts at 1, increases every 5 levels)
            const tokenReward = Math.floor(user.accountProgression.level / 5) + 1;
            tokensEarned += tokenReward;
            user.accountProgression.tokens += tokenReward;
            user.accountProgression.totalTokensEarned += tokenReward;

            // XP requirement: 1000 base + 300 per level
            // Level 1 = 1000, Level 2 = 1300, Level 3 = 1600, etc.
            user.accountProgression.xpToNextLevel = 1000 + (user.accountProgression.level - 1) * 300;
        }

        // Clear saved game on submission
        user.savedGame = { exists: false };
        await user.save();

        // Update leaderboards (only wave and kills - score removed)
        await updateLeaderboard(user._id, user.username, 'wave', wave);
        await updateLeaderboard(user._id, user.username, 'kills', kills);

        res.json({
            success: true,
            newPersonalBest: updated,
            stats: user.dotsSurvivorStats,
            // Account progression info
            accountProgression: {
                level: user.accountProgression.level,
                xp: user.accountProgression.xp,
                xpToNextLevel: user.accountProgression.xpToNextLevel,
                tokens: user.accountProgression.tokens,
                xpEarned,
                levelsGained,
                tokensEarned
            }
        });

        if (levelsGained > 0) {
            console.log(`🎉 ${user.username} leveled up! Now level ${user.accountProgression.level} (+${tokensEarned} tokens)`);
        }
        console.log(`🏆 Score submitted: ${user.username} - Wave ${wave}, ${kills} kills, +${xpEarned} XP`);
    } catch (error) {
        console.error('Submit score error:', error);
        res.status(500).json({ error: 'Failed to submit score' });
    }
});

async function updateLeaderboard(userId, username, category, value) {
    try {
        // Only update if new value is higher than existing value
        const existing = await LeaderboardEntry.findOne({ userId, category });
        if (!existing || value > existing.value) {
            await LeaderboardEntry.findOneAndUpdate(
                { userId, category },
                { userId, username, category, value: Math.max(value, 0), achievedAt: new Date() },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }
    } catch (error) {
        console.error('Leaderboard update error:', error);
    }
}

// ================== LEADERBOARDS ==================

// Get leaderboard
app.get('/api/leaderboard/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        if (!['wave', 'kills'].includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const entries = await LeaderboardEntry
            .find({ category })
            .sort({ value: -1 })
            .limit(limit)
            .lean();

        res.json({
            category,
            entries: entries.map((e, i) => ({
                rank: i + 1,
                username: e.username,
                value: e.value,
                achievedAt: e.achievedAt
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// Get user rank
app.get('/api/leaderboard/:category/rank', authenticateToken, async (req, res) => {
    try {
        const { category } = req.params;

        if (!['wave', 'kills'].includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const userEntry = await LeaderboardEntry.findOne({ userId: req.userId, category });
        if (!userEntry) {
            return res.json({ rank: null, value: 0 });
        }

        const rank = await LeaderboardEntry.countDocuments({
            category,
            value: { $gt: userEntry.value }
        }) + 1;

        res.json({ rank, value: userEntry.value });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get rank' });
    }
});

// ================== ADMIN API ==================

// Get all users (admin only)
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        const query = search ? {
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        } : {};

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-passwordHash -salt -rememberTokens -savedGame.gameState')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query)
        ]);

        res.json({
            users: users.map(u => ({
                id: u._id,
                username: u.username,
                email: u.email,
                createdAt: u.createdAt,
                lastLogin: u.lastLogin,
                isAdmin: u.isAdmin,
                isTester: u.isTester,
                isBanned: u.isBanned,
                banReason: u.banReason,
                bannedAt: u.bannedAt,
                stats: u.dotsSurvivorStats,
                hasSavedGame: u.savedGame?.exists || false,
                library: u.library || []
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Admin get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Ban user (admin only)
app.post('/api/admin/ban/:userId', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.isAdmin) {
            return res.status(400).json({ error: 'Cannot ban admin users' });
        }

        user.isBanned = true;
        user.banReason = reason || 'No reason provided';
        user.bannedAt = new Date();
        await user.save();

        // Remove all active sessions for this user from MongoDB
        await Session.deleteMany({ userId: user._id });

        res.json({ success: true, message: `User ${user.username} has been banned` });
        console.log(`🚫 User banned: ${user.username} by ${req.username}. Reason: ${reason || 'None'}`);
    } catch (error) {
        console.error('Admin ban error:', error);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

// Unban user (admin only)
app.post('/api/admin/unban/:userId', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.isBanned = false;
        user.banReason = '';
        user.bannedAt = null;
        await user.save();

        res.json({ success: true, message: `User ${user.username} has been unbanned` });
        console.log(`✅ User unbanned: ${user.username} by ${req.username}`);
    } catch (error) {
        console.error('Admin unban error:', error);
        res.status(500).json({ error: 'Failed to unban user' });
    }
});

// Change user role (admin only)
app.post('/api/admin/role/:userId', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { isAdmin, isTester } = req.body;

        // Prevent self-demotion
        if (userId === req.userId.toString() && isAdmin === false) {
            return res.status(400).json({ error: 'Cannot demote yourself' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const oldRole = user.isAdmin ? 'Admin' : (user.isTester ? 'Tester' : 'User');

        // Update roles based on what was passed
        if (typeof isAdmin === 'boolean') user.isAdmin = isAdmin;
        if (typeof isTester === 'boolean') user.isTester = isTester;

        const newRole = user.isAdmin ? 'Admin' : (user.isTester ? 'Tester' : 'User');

        await user.save();

        res.json({ success: true, message: `${user.username} role changed: ${oldRole} → ${newRole}` });
        console.log(`👑 Role changed: ${user.username} (${oldRole} → ${newRole}) by ${req.username}`);
    } catch (error) {
        console.error('Admin role change error:', error);
        res.status(500).json({ error: 'Failed to change role' });
    }
});

// Get admin stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const [totalUsers, bannedUsers, activeToday] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isBanned: true }),
            User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        ]);

        res.json({
            totalUsers,
            bannedUsers,
            activeToday
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// ================== GAME LIBRARY & PURCHASES ==================

// Game pricing configuration
const GAME_PRICES = {
    'veltharas-dominion': { price: 500, name: "Velthara's Dominion" }, // 500 cents = $5
    'stripe-test': { price: 50, name: "Stripe Test Game" } // 50 cents = $0.50 (Stripe minimum)
};

// Check if user owns a game
app.get('/api/games/check-ownership/:gameId', authenticateToken, async (req, res) => {
    try {
        const { gameId } = req.params;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Admins and testers get all games free
        if (user.isAdmin || user.isTester) {
            return res.json({
                ownsGame: true,
                reason: user.isAdmin ? 'admin' : 'tester',
                gameId
            });
        }

        // Check if game is in library
        const owned = user.library?.some(g => g.gameId === gameId);
        res.json({
            ownsGame: owned,
            reason: owned ? 'purchased' : 'not_owned',
            gameId,
            price: GAME_PRICES[gameId]?.price || 0
        });
    } catch (error) {
        console.error('Check ownership error:', error);
        res.status(500).json({ error: 'Failed to check ownership' });
    }
});

// Get user's game library
app.get('/api/games/library', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Admins and testers get all games
        if (user.isAdmin || user.isTester) {
            const allGames = Object.keys(GAME_PRICES).map(gameId => ({
                gameId,
                name: GAME_PRICES[gameId].name,
                purchasedAt: user.createdAt,
                price: 0,
                reason: user.isAdmin ? 'admin' : 'tester'
            }));
            return res.json({ library: allGames });
        }

        res.json({ library: user.library || [] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get library' });
    }
});

// Add game to user's library (admin only - for gifting)
app.post('/api/admin/gift-game/:userId', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { gameId } = req.body;

        if (!GAME_PRICES[gameId]) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Check if already owns
        if (user.library?.some(g => g.gameId === gameId)) {
            return res.status(400).json({ error: 'User already owns this game' });
        }

        if (!user.library) user.library = [];
        user.library.push({
            gameId,
            purchasedAt: new Date(),
            price: 0, // Gifted
            stripePaymentId: 'GIFT'
        });
        await user.save();

        res.json({ success: true, message: `${GAME_PRICES[gameId].name} gifted to ${user.username}` });
        console.log(`🎁 Game gifted: ${gameId} to ${user.username} by ${req.username}`);
    } catch (error) {
        console.error('Gift game error:', error);
        res.status(500).json({ error: 'Failed to gift game' });
    }
});

// Create Stripe checkout session for game purchase
app.post('/api/games/purchase/:gameId', authenticateToken, async (req, res) => {
    try {
        const { gameId } = req.params;

        if (!GAME_PRICES[gameId]) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Check if already owns
        if (user.isAdmin || user.isTester || user.library?.some(g => g.gameId === gameId)) {
            return res.status(400).json({ error: 'You already own this game' });
        }

        // Check if Stripe is configured
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(503).json({
                error: 'Payments not configured yet. Contact admin.',
                stripeEnabled: false
            });
        }

        // Initialize Stripe
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const gameInfo = GAME_PRICES[gameId];

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: gameInfo.name,
                        description: `Full access to ${gameInfo.name}`,
                    },
                    unit_amount: gameInfo.price,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `https://games.zecrugames.com/${gameId}/?purchase_success=1&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://games.zecrugames.com/${gameId}/?purchase_cancelled=1`,
            metadata: {
                gameId,
                userId: user._id.toString(),
                username: user.username
            }
        });

        res.json({ checkoutUrl: session.url, sessionId: session.id });
        console.log(`💳 Checkout created for ${gameId} by ${user.username}`);
    } catch (error) {
        console.error('Game purchase error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Confirm game purchase after successful Stripe redirect (fallback when webhook not configured)
app.post('/api/games/confirm-purchase/:gameId', authenticateToken, async (req, res) => {
    try {
        const { gameId } = req.params;
        const { sessionId } = req.body;

        if (!GAME_PRICES[gameId]) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Already owns?
        if (user.library?.some(g => g.gameId === gameId)) {
            return res.json({ success: true, message: 'Already owned' });
        }

        // Verify with Stripe that payment was successful
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);

            // Verify session belongs to this user and game
            if (session.metadata?.userId !== user._id.toString() || session.metadata?.gameId !== gameId) {
                return res.status(403).json({ error: 'Session mismatch' });
            }

            // Verify payment was successful
            if (session.payment_status !== 'paid') {
                return res.status(400).json({ error: 'Payment not completed' });
            }

            // Add to library
            if (!user.library) user.library = [];
            user.library.push({
                gameId,
                purchasedAt: new Date(),
                price: session.amount_total,
                stripePaymentId: session.payment_intent || sessionId
            });
            await user.save();

            console.log(`✅ Game confirmed: ${gameId} by ${user.username} (session: ${sessionId})`);
            res.json({ success: true, message: 'Purchase confirmed!' });
        } catch (stripeError) {
            console.error('Stripe session verification failed:', stripeError);
            return res.status(400).json({ error: 'Could not verify payment' });
        }
    } catch (error) {
        console.error('Confirm purchase error:', error);
        res.status(500).json({ error: 'Failed to confirm purchase' });
    }
});

// Stripe webhook to confirm game purchase
app.post('/api/games/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(503).json({ error: 'Stripe not configured' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];

    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const { gameId, userId } = session.metadata;

            if (gameId && userId) {
                const user = await User.findById(userId);
                if (user && !user.library?.some(g => g.gameId === gameId)) {
                    if (!user.library) user.library = [];
                    user.library.push({
                        gameId,
                        purchasedAt: new Date(),
                        price: session.amount_total,
                        stripePaymentId: session.payment_intent
                    });
                    await user.save();
                    console.log(`✅ Game purchased: ${gameId} by ${user.username} ($${session.amount_total / 100})`);
                }
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: 'Webhook error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', mongodb: mongoose.connection.readyState === 1 });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Poker server running on port ${PORT}`);
});
