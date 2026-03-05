// Storyteller — Voice-first interactive story app
(function () {
  'use strict';

  // ── Debug Logger ──
  function log(category, message, data) {
    var prefix = '%c[' + category + ']';
    var colors = {
      FLOW: 'color: #2196F3; font-weight: bold',
      API: 'color: #4CAF50; font-weight: bold',
      TTS: 'color: #FF9800; font-weight: bold',
      STT: 'color: #9C27B0; font-weight: bold',
      IMG: 'color: #E91E63; font-weight: bold',
      UI: 'color: #607D8B; font-weight: bold',
      ERR: 'color: #F44336; font-weight: bold',
      REPLAY: 'color: #00BCD4; font-weight: bold',
    };
    var style = colors[category] || 'color: gray';
    if (data !== undefined) {
      console.log(prefix, style, message, data);
    } else {
      console.log(prefix, style, message);
    }
  }

  // ── Core State ──
  let currentLanguage = null; // 'en' or 'fi'
  let currentAudience = null; // 'children' or 'everyone'
  let currentLength = null;   // 'short', 'medium', 'long'
  let currentStoryId = null;
  let isFirstStep = true;     // true until first story step is fully presented
  let generateImages = true;  // whether to generate images for story steps
  let isRecording = false;
  let finalTranscript = '';
  let undoRequested = false;
  let preferKeyboard = false; // remember last input mode

  // Wizard state
  let wizardGenre = null;    // selected genre entry
  let wizardSetting = null;  // selected setting entry
  let wizardCharacter = null; // selected character entry

  // ── Localization ──
  const i18n = {
    en: {
      appTitle: "Storyteller",
      welcome: "Tap the microphone and tell me what kind of story you'd like to hear",
      loading: "Creating your story...",
      continuing: "Continuing your story...",
      newStory: "New Story",
      stories: "Stories",
      micTooltip: "Tap to speak",
      listening: "🎙️ Listening...",
      noSpeech: "Speech recognition is not supported. Please use a text input.",
      errorGeneric: "An error occurred. Please try again.",
      errorContentFilter: "That direction didn't work out. Please suggest a new direction for the story and let's try again!",
      errorLoadStories: "Failed to load stories.",
      errorLoadStory: "Failed to load the story.",
      errorSpeech: "Speech recognition error.",
      noSpeechDetected: "Didn't hear anything — try again!",
      warnMicUnavailable: "Microphone is not available.",
      wizardStep1: "What kind of story?",
      wizardStep2: "Where does it take place?",
      wizardStep3: "Who is the hero?",
      wizardBack: "← Back",
      wizardMicHint: "Tap the mic and describe how the story should begin",
      wizardSummary: "A {genre} story set in {setting} with {character}",
      wizardOwnStory: "🎤 Tell your own story",
      wizardOr: "— or —",
      audienceTitle: "Who is this story for?",
      audienceChildren: "👶 For Children",
      audienceChildrenDesc: "Stories appropriate for children",
      audienceEveryone: "📖 For Everyone",
      audienceEveryoneDesc: "Richer vocabulary, all themes welcome",
      lengthTitle: "How long should each part be?",
      lengthShort: "⚡ Short",
      lengthShortDesc: "A few sentences — quick & interactive",
      lengthMedium: "📄 Medium",
      lengthMediumDesc: "A short paragraph — more detail",
      lengthLong: "📖 Long",
      lengthLongDesc: "A full scene — sit back and listen",
      menuFullscreen: "⛶ Fullscreen",
      menuImages: "🖼️ Generate Images",
      menuReplay: "🔁 Replay Story",
      menuCreate: "📝 Create Story",
      menuNewStory: "✨ New Story",
      replayTitle: "Replay a Story",
      replayEmpty: "No stories yet",
      keyboardTooltip: "Type your input",
      keyboardPlaceholder: "What happens next?",
    },
    fi: {
      appTitle: "Tarinankertoja",
      welcome: "Napauta mikrofonia ja kerro millaisen tarinan haluaisit kuulla",
      loading: "Luodaan tarinaasi...",
      continuing: "Jatketaan tarinaasi...",
      newStory: "Uusi tarina",
      stories: "Tarinat",
      micTooltip: "Napauta puhuaksesi",
      listening: "🎙️ Kuunnellaan...",
      noSpeech: "Puheentunnistus ei ole tuettu. Käytä tekstisyöttöä.",
      errorGeneric: "Virhe tapahtui. Yritä uudelleen.",
      errorContentFilter: "Tuo suunta ei onnistunut. Ehdota tarinalle uutta suuntaa, niin yritetään uudelleen!",
      errorLoadStories: "Tarinoiden lataaminen epäonnistui.",
      errorLoadStory: "Tarinan lataaminen epäonnistui.",
      errorSpeech: "Puheentunnistusvirhe.",
      noSpeechDetected: "En kuullut mitään — yritä uudelleen!",
      warnMicUnavailable: "Mikrofoni ei ole käytettävissä.",
      wizardStep1: "Millainen tarina?",
      wizardStep2: "Missä se tapahtuu?",
      wizardStep3: "Kuka on sankari?",
      wizardBack: "← Takaisin",
      wizardMicHint: "Napauta mikrofonia ja kerro miten tarina alkaa",
      wizardSummary: "{genre}-tarina, joka sijoittuu paikkaan {setting}, sankarina {character}",
      wizardOwnStory: "🎤 Kerro oma tarinasi",
      wizardOr: "— tai —",
      audienceTitle: "Kenelle tarina on?",
      audienceChildren: "👶 Lapsille",
      audienceChildrenDesc: "Lapsille sopivia tarinoita",
      audienceEveryone: "📖 Kaikille",
      audienceEveryoneDesc: "Rikkaampaa kieltä, kaikki teemat sallittuja",
      lengthTitle: "Kuinka pitkiä osia kerrallaan?",
      lengthShort: "⚡ Lyhyt",
      lengthShortDesc: "Muutama lause — nopea ja vuorovaikutteinen",
      lengthMedium: "📄 Keskipitkä",
      lengthMediumDesc: "Lyhyt kappale — enemmän yksityiskohtia",
      lengthLong: "📖 Pitkä",
      lengthLongDesc: "Kokonainen kohtaus — istu ja kuuntele",
      menuFullscreen: "⛶ Koko näyttö",
      menuImages: "🖼️ Luo kuvia",
      menuReplay: "🔁 Toista tarina",
      menuCreate: "📝 Luo tarina",
      menuNewStory: "✨ Uusi tarina",
      replayTitle: "Toista tarina",
      replayEmpty: "Ei tarinoita vielä",
      keyboardTooltip: "Kirjoita syöte",
      keyboardPlaceholder: "Mitä tapahtuu seuraavaksi?",
    }
  };

  // ── Wizard Tag Data ──
  // Each entry has: id, label (displayed), prompt (rich description for AI)
  const wizardData = {
    en: {
      genres: [
        { id: 'fairytale', label: '🧚 Fairytale', prompt: 'a magical fairytale with enchantment, wonder, and a timeless moral lesson, written in a warm once-upon-a-time style' },
        { id: 'adventure', label: '⚔️ Adventure', prompt: 'a thrilling adventure story full of danger, courage, and discovery, with vivid action sequences' },
        { id: 'mystery', label: '🔍 Mystery', prompt: 'an intriguing mystery with clues, suspense, and surprising twists that keep the listener guessing' },
        { id: 'scifi', label: '🚀 Sci-Fi', prompt: 'a science fiction story with futuristic technology, exploration of the unknown, and thought-provoking ideas' },
        { id: 'animal', label: '🐾 Animal Story', prompt: 'a heartwarming animal story where animals have personalities, friendships, and face challenges together' },
        { id: 'fantasy', label: '🐉 Fantasy', prompt: 'an epic fantasy tale with magic, mythical creatures, and a hero on a quest in a richly imagined world' },
        { id: 'horror', label: '👻 Spooky Story', prompt: 'a spine-tingling spooky story with eerie atmospheres, unexpected surprises, and just enough fright to make you pull the blanket closer' },
        { id: 'comedy', label: '😂 Comedy', prompt: 'a hilarious comedy full of silly situations, laugh-out-loud mishaps, and characters who cannot stop getting into the funniest trouble' },
        { id: 'superhero', label: '🦸 Superhero', prompt: 'an action-packed superhero story about discovering extraordinary powers and learning that true strength comes from the heart' },
        { id: 'historical', label: '🏛️ Historical', prompt: 'a vivid historical tale that transports the listener to another era, with real-world wonder, period details, and timeless human spirit' },
      ],
      settings: {
        fairytale: [
          { id: 'enchanted-forest', label: '🌲 Enchanted Forest', prompt: 'a deep enchanted forest where ancient trees whisper secrets, magical creatures hide behind every bush, and moonlight reveals hidden paths' },
          { id: 'royal-castle', label: '🏰 Royal Castle', prompt: 'a grand royal castle with towering spires, secret passages behind tapestries, a bustling courtyard, and a throne room gleaming with gold' },
          { id: 'underwater-kingdom', label: '🧜 Underwater Kingdom', prompt: 'a shimmering underwater kingdom of coral palaces, bioluminescent gardens, pearl-lined corridors, and singing sea creatures' },
          { id: 'cloud-village', label: '☁️ Cloud Village', prompt: 'a dreamy village floating among the clouds, with cottages made of mist, rainbow bridges connecting floating islands, and gentle cloud animals' },
        ],
        adventure: [
          { id: 'pirate-seas', label: '🏴‍☠️ Pirate Seas', prompt: 'the wild pirate seas with wooden ships creaking on stormy waves, treasure maps leading to mysterious islands, and the smell of salt and gunpowder' },
          { id: 'lost-jungle', label: '🌴 Lost Jungle', prompt: 'a dense lost jungle with towering ancient trees, hidden temples overgrown with vines, exotic animals, and the sound of distant waterfalls' },
          { id: 'mountain-peaks', label: '🏔️ Mountain Peaks', prompt: 'treacherous snow-capped mountain peaks with howling winds, narrow cliff-side paths, hidden caves, and breathtaking vistas above the clouds' },
          { id: 'desert-ruins', label: '🏜️ Desert Ruins', prompt: 'vast golden desert with half-buried ancient ruins, shifting sand dunes that reveal forgotten treasures, scorching sun, and starlit cold nights' },
        ],
        mystery: [
          { id: 'old-mansion', label: '🏚️ Old Mansion', prompt: 'a creaky old mansion with dusty rooms, portraits whose eyes seem to follow you, hidden compartments in the walls, and strange noises at midnight' },
          { id: 'foggy-village', label: '🌫️ Foggy Village', prompt: 'a small foggy village where everyone has a secret, cobblestone streets disappear into thick mist, and lanterns flicker with an eerie glow' },
          { id: 'train-journey', label: '🚂 Train Journey', prompt: 'a luxury train racing through the night countryside, with elegant dining cars, locked compartments, suspicious passengers, and a disappearance that changes everything' },
          { id: 'hidden-library', label: '📚 Hidden Library', prompt: 'a vast hidden library with endless shelves reaching into darkness, books that rearrange themselves, coded messages in margins, and a forbidden section' },
        ],
        scifi: [
          { id: 'space-station', label: '🛸 Space Station', prompt: 'a sprawling space station orbiting a distant planet, with humming corridors, zero-gravity gardens, observation decks showing swirling nebulae, and flickering warning lights' },
          { id: 'alien-planet', label: '👽 Alien Planet', prompt: 'a strange alien planet with purple skies, crystalline forests that chime in the wind, two suns, bioluminescent rivers, and creatures never seen before' },
          { id: 'future-city', label: '🌆 Future City', prompt: 'a dazzling city of the future with flying vehicles, holographic billboards, towering skyscrapers connected by sky-bridges, and robots walking alongside humans' },
          { id: 'time-machine', label: '⏰ Time Machine', prompt: 'a rickety but brilliant time machine that crackles with energy, transporting the hero across different eras — from dinosaurs to distant futures' },
        ],
        animal: [
          { id: 'woodland', label: '🌳 Woodland', prompt: 'a lush green woodland with dappled sunlight, a babbling brook, cozy burrows and nests, mushroom circles, and the rustle of small paws on fallen leaves' },
          { id: 'savanna', label: '🦁 Savanna', prompt: 'the vast African savanna with golden grasslands stretching to the horizon, acacia trees, watering holes where all animals gather, and fiery sunsets' },
          { id: 'arctic', label: '❄️ Arctic', prompt: 'the frozen arctic with endless white ice fields, shimmering northern lights, icy caves with crystal walls, and a biting wind that carries snowflakes' },
          { id: 'farm', label: '🐄 Farm', prompt: 'a charming old farm with a red barn, rolling green pastures, a duck pond, hay bales to hide behind, and the warm smell of fresh bread from the farmhouse' },
        ],
        fantasy: [
          { id: 'dragon-realm', label: '🐉 Dragon Realm', prompt: 'a majestic dragon realm with volcanic mountains, dragon nests on cliff edges, rivers of liquid fire, and ancient dragon songs echoing through caverns' },
          { id: 'wizard-tower', label: '🧙 Wizard Tower', prompt: 'a crooked wizard tower filled with bubbling potions, floating spell books, magical artifacts glowing on shelves, and a spiral staircase that changes direction' },
          { id: 'elf-kingdom', label: '🧝 Elf Kingdom', prompt: 'a serene elf kingdom hidden among ancient trees, with tree-house palaces, silver lanterns, singing rivers, and libraries of ancient wisdom' },
          { id: 'underground-caves', label: '⛏️ Underground Caves', prompt: 'vast underground caves glittering with gems and crystals, underground lakes reflecting stalactites, echoing tunnels, and the glow of dwarven forges' },
        ],
        horror: [
          { id: 'haunted-school', label: '🏫 Haunted School', prompt: 'an old school building where lockers open by themselves at night, chalk writes messages on the board, and footsteps echo in empty hallways' },
          { id: 'spooky-carnival', label: '🎪 Spooky Carnival', prompt: 'an abandoned carnival with a rusted Ferris wheel that turns on its own, a hall of mirrors showing things that are not there, and music box melodies drifting on the wind' },
          { id: 'dark-forest-trail', label: '🌑 Dark Forest Trail', prompt: 'a winding forest trail after sunset where shadows move between the trees, strange lights float in the distance, and every twig snap makes your heart race' },
          { id: 'ghost-ship', label: '🚢 Ghost Ship', prompt: 'an old ghost ship drifting in fog with creaking timbers, flickering lanterns that light themselves, tattered sails, and a captain\'s log that still gets new entries' },
        ],
        comedy: [
          { id: 'silly-school', label: '🏫 Silly School', prompt: 'the wackiest school in the world where the teachers are animals, homework is done by robots who make hilarious mistakes, and recess lasts three hours' },
          { id: 'upside-down-town', label: '🙃 Upside-Down Town', prompt: 'a topsy-turvy town where everything is backwards — people walk on ceilings, rain falls upward, and cats walk dogs on leashes' },
          { id: 'magic-kitchen', label: '🍳 Magic Kitchen', prompt: 'a chaotic magic kitchen where ingredients have personalities, pots stir themselves the wrong way, recipes come alive, and the oven has strong opinions about cooking temperatures' },
          { id: 'toy-world', label: '🧸 Toy World', prompt: 'a secret world inside the toy box where action figures argue about who is the real hero, stuffed animals run the government, and building blocks keep rearranging the city' },
        ],
        superhero: [
          { id: 'mega-city', label: '🏙️ Mega City', prompt: 'a sprawling mega city with gleaming skyscrapers, rooftop chases, secret headquarters hidden in plain sight, and citizens who always need rescuing at the worst times' },
          { id: 'secret-lab', label: '🔬 Secret Lab', prompt: 'a high-tech secret laboratory deep underground with glowing experiments, containment chambers, a supercomputer, and an accident waiting to create the next hero or villain' },
          { id: 'sky-fortress', label: '🏰 Sky Fortress', prompt: 'a floating sky fortress above the clouds with force fields, training rooms, a hall of heroes, and panoramic windows showing the world below' },
          { id: 'villain-lair', label: '🌋 Villain Lair', prompt: 'the villain\'s dramatic lair inside a volcano with bubbling lava, overcomplicated traps, a giant screen showing their evil plans, and a suspiciously large self-destruct button' },
        ],
        historical: [
          { id: 'viking-village', label: '⚔️ Viking Village', prompt: 'a rugged Viking village on a fjord with longhouses, crackling bonfires, the smell of the sea, wooden longships ready to sail, and tales of gods and monsters' },
          { id: 'ancient-egypt', label: '🏺 Ancient Egypt', prompt: 'ancient Egypt during the time of pharaohs with towering pyramids, the mighty Nile, bustling markets, hieroglyph-covered temples, and mysteries buried beneath the sand' },
          { id: 'medieval-market', label: '🏰 Medieval Market', prompt: 'a colorful medieval market square with jesters performing, blacksmiths hammering, merchants shouting, knights on horseback, and the aroma of freshly baked pies' },
          { id: 'wild-west', label: '🤠 Wild West', prompt: 'a dusty Wild West frontier town with swinging saloon doors, a sheriff\'s office, tumbleweeds rolling down the main street, horses tied to posts, and a mysterious stranger arriving at sunset' },
        ],
      },
      characters: {
        'enchanted-forest': [
          { id: 'brave-fox', label: '🦊 Brave Fox', prompt: 'a small but brave fox with a bushy red tail and bright curious eyes, known for outsmarting bigger animals with cleverness and heart' },
          { id: 'lost-princess', label: '👸 Lost Princess', prompt: 'a kind-hearted princess who wandered away from the castle and must find her way home, discovering she is braver than she ever knew' },
          { id: 'wise-owl', label: '🦉 Wise Owl', prompt: 'a wise old owl who has watched over the forest for centuries, speaks in riddles, and knows every secret hidden among the trees' },
        ],
        'royal-castle': [
          { id: 'young-knight', label: '🛡️ Young Knight', prompt: 'a young knight on their very first quest, eager but clumsy, with a heart full of honor and a sword that is slightly too big' },
          { id: 'clever-maid', label: '👩 Clever Maid', prompt: 'a clever maid who works in the castle kitchen but secretly solves every problem the king cannot, using wit and resourcefulness' },
          { id: 'tiny-dragon', label: '🐲 Tiny Dragon', prompt: 'a tiny dragon no bigger than a cat who lives in the castle fireplace, can only puff small smoke rings, but dreams of flying over mountains' },
        ],
        'underwater-kingdom': [
          { id: 'curious-mermaid', label: '🧜 Curious Mermaid', prompt: 'a curious young mermaid who collects things from shipwrecks and dreams of seeing what lies beyond the ocean surface' },
          { id: 'friendly-dolphin', label: '🐬 Friendly Dolphin', prompt: 'a playful and friendly dolphin who is the fastest swimmer in the sea and loves to help anyone in trouble' },
          { id: 'lost-sailor', label: '⚓ Lost Sailor', prompt: 'a lost sailor who has been given the ability to breathe underwater by a sea witch and must find a way back to the surface world' },
        ],
        'cloud-village': [
          { id: 'sky-child', label: '☁️ Sky Child', prompt: 'a child born from a cloud who can shape-shift into mist, loves to slide down rainbows, but has never touched the ground below' },
          { id: 'wind-spirit', label: '🌬️ Wind Spirit', prompt: 'a mischievous wind spirit who loves to play pranks but has a gentle heart and protects the cloud village from storms' },
          { id: 'rainbow-bird', label: '🌈 Rainbow Bird', prompt: 'a magnificent bird with rainbow-colored feathers whose song can change the weather and heal the sad' },
        ],
        'pirate-seas': [
          { id: 'young-pirate', label: '🏴‍☠️ Young Pirate', prompt: 'a young pirate on their first voyage, with a hand-drawn treasure map, a wooden toy sword, and dreams bigger than the ocean' },
          { id: 'treasure-hunter', label: '💎 Treasure Hunter', prompt: 'a seasoned treasure hunter with a mysterious compass that always points to the next adventure, never to home' },
          { id: 'sea-captain', label: '⚓ Sea Captain', prompt: 'a legendary sea captain with a ship made of enchanted wood that can sail through storms and even fly for short bursts' },
        ],
        'lost-jungle': [
          { id: 'explorer', label: '🧭 Explorer', prompt: 'a fearless explorer with a worn leather journal, documenting every new discovery, who communicates with animals through patience and kindness' },
          { id: 'jungle-kid', label: '🌿 Jungle Kid', prompt: 'a child raised by the jungle who swings on vines, talks to parrots, and knows every hidden trail in the forest' },
          { id: 'clever-monkey', label: '🐒 Clever Monkey', prompt: 'a clever little monkey who loves solving puzzles, collecting shiny things, and leading friends through the jungle canopy' },
        ],
        'mountain-peaks': [
          { id: 'mountain-climber', label: '🧗 Mountain Climber', prompt: 'a determined mountain climber who never gives up, carries a lucky rope, and sings songs to stay brave in the cold wind' },
          { id: 'eagle-rider', label: '🦅 Eagle Rider', prompt: 'a daring eagle rider who soars above the clouds on the back of a giant golden eagle, delivering messages between distant villages' },
          { id: 'yeti-friend', label: '❄️ Yeti Friend', prompt: 'a gentle yeti who is misunderstood by everyone, lives in a cozy ice cave, and makes the best snowball sculptures' },
        ],
        'desert-ruins': [
          { id: 'archaeologist', label: '🏺 Archaeologist', prompt: 'a young archaeologist with dusty goggles and a notebook full of ancient symbols, always one discovery away from unlocking a great secret' },
          { id: 'desert-nomad', label: '🐪 Desert Nomad', prompt: 'a wise desert nomad who navigates by the stars, knows every oasis, and carries stories older than the sand itself' },
          { id: 'sand-spirit', label: '✨ Sand Spirit', prompt: 'a mysterious sand spirit who can reshape the dunes at will, speaks in whispers carried by the wind, and guards an ancient secret' },
        ],
        'old-mansion': [
          { id: 'detective', label: '🕵️ Detective', prompt: 'a sharp-eyed detective with a magnifying glass and an unshakable instinct for finding clues hidden in plain sight' },
          { id: 'curious-child', label: '👦 Curious Child', prompt: 'a curious child who just moved into the mansion and discovers a hidden room behind the bookshelf on their very first night' },
          { id: 'ghost-hunter', label: '👻 Ghost Hunter', prompt: 'a friendly ghost hunter who uses homemade gadgets and is more interested in helping ghosts find peace than being scared of them' },
        ],
        'foggy-village': [
          { id: 'local-sleuth', label: '🔎 Local Sleuth', prompt: 'a local sleuth who knows every villager by name and notices the small details everyone else misses — a moved chair, a fresh footprint' },
          { id: 'mysterious-stranger', label: '🎩 Mysterious Stranger', prompt: 'a mysterious stranger who arrived in the village on a foggy night, carrying only a locked box and asking strange questions' },
          { id: 'village-elder', label: '👴 Village Elder', prompt: 'the village elder who remembers the old legends, knows the fog has a mind of its own, and is the only one who can read the ancient stones' },
        ],
        'train-journey': [
          { id: 'train-detective', label: '🕵️ Train Detective', prompt: 'a train detective who solves crimes between stations, always carries a pocket watch, and can deduce a person\'s story from their luggage' },
          { id: 'ticket-inspector', label: '🎫 Ticket Inspector', prompt: 'a ticket inspector who has worked on the train for decades, knows every secret compartment, and notices when something is not quite right' },
          { id: 'runaway-kid', label: '🧒 Runaway Kid', prompt: 'a brave kid who sneaked onto the train to find someone important, armed with only a photograph and a packed lunch' },
        ],
        'hidden-library': [
          { id: 'book-worm', label: '📖 Book Worm', prompt: 'a book-loving kid who discovers that certain books in the library are portals to the worlds described within their pages' },
          { id: 'librarian', label: '📚 Librarian', prompt: 'the mysterious librarian who seems to know which book every visitor needs before they ask, and who never seems to age' },
          { id: 'magic-cat', label: '🐱 Magic Cat', prompt: 'a magical cat that lives in the library, walks across pages to enter stories, and guides readers to books that will change their lives' },
        ],
        'space-station': [
          { id: 'astronaut', label: '👨‍🚀 Astronaut', prompt: 'a young astronaut on their first deep-space mission, full of wonder at seeing stars up close and determined to make a great discovery' },
          { id: 'robot-companion', label: '🤖 Robot Companion', prompt: 'a loyal robot companion with a warm personality, who secretly wants to understand human emotions and writes poetry when nobody watches' },
          { id: 'alien-visitor', label: '👽 Alien Visitor', prompt: 'a friendly alien visitor who arrived at the station in a tiny glowing pod, speaks in musical tones, and is looking for a lost friend' },
        ],
        'alien-planet': [
          { id: 'space-explorer', label: '🧑‍🚀 Space Explorer', prompt: 'a brave space explorer making first contact on an alien world, armed with curiosity and a universal translator that only half works' },
          { id: 'friendly-alien', label: '👾 Friendly Alien', prompt: 'a friendly alien with shimmering skin who communicates through colors and light, and wants to show the visitor the wonders of their world' },
          { id: 'space-dog', label: '🐕 Space Dog', prompt: 'a loyal space dog with a special helmet, who can sniff out danger, find hidden paths, and whose bark translates to alien languages' },
        ],
        'future-city': [
          { id: 'cyber-kid', label: '🤖 Cyber Kid', prompt: 'a street-smart kid who can hack any system with a homemade wrist device, skateboards on hover-rails, and dreams of freeing the city from a controlling AI' },
          { id: 'inventor', label: '⚙️ Inventor', prompt: 'a brilliant young inventor who builds amazing gadgets from scraps, whose latest invention has accidentally opened a door to another dimension' },
          { id: 'android', label: '🦾 Android', prompt: 'an android who has developed feelings and questions, paints secretly at night, and must decide between following orders and following their heart' },
        ],
        'time-machine': [
          { id: 'time-traveler', label: '⏰ Time Traveler', prompt: 'an accidental time traveler who keeps jumping to random moments in history and must fix the timeline while learning from each era' },
          { id: 'young-scientist', label: '🔬 Young Scientist', prompt: 'a young scientist who built a time machine in the garage, miscalculated the destination, and landed somewhere completely unexpected' },
          { id: 'history-kid', label: '📜 History Kid', prompt: 'a kid who loves history books and suddenly finds themselves living inside the stories, meeting the heroes they always read about' },
        ],
        'woodland': [
          { id: 'brave-rabbit', label: '🐰 Brave Rabbit', prompt: 'a small brave rabbit who despite being the tiniest animal in the wood, always stands up for friends and leads the way through danger' },
          { id: 'clever-squirrel', label: '🐿️ Clever Squirrel', prompt: 'a clever squirrel who remembers where every nut is buried, solves problems with inventive contraptions made from twigs and acorns' },
          { id: 'wise-badger', label: '🦡 Wise Badger', prompt: 'a wise old badger who has lived in the wood the longest, settles disputes fairly, and knows the ancient stories of the forest' },
        ],
        'savanna': [
          { id: 'young-lion', label: '🦁 Young Lion', prompt: 'a young lion cub learning to be brave, who has a mighty roar stuck inside and must find the courage to let it out when it matters most' },
          { id: 'fast-cheetah', label: '🐆 Fast Cheetah', prompt: 'the fastest cheetah on the savanna who discovers that some problems cannot be outrun and must learn the value of patience and friendship' },
          { id: 'tall-giraffe', label: '🦒 Tall Giraffe', prompt: 'a tall gentle giraffe who can see farther than anyone, spots trouble before it arrives, and uses height to help smaller friends reach impossible places' },
        ],
        'arctic': [
          { id: 'polar-bear-cub', label: '🐻‍❄️ Polar Bear Cub', prompt: 'a fluffy polar bear cub on their first adventure away from mother, discovering the vast frozen world with wonder, sliding on ice and making unlikely friends' },
          { id: 'penguin', label: '🐧 Penguin', prompt: 'a determined penguin who is convinced there is something amazing beyond the ice shelf and waddles off on an epic journey to find it' },
          { id: 'arctic-fox', label: '🦊 Arctic Fox', prompt: 'a quick and cunning arctic fox with snow-white fur, who can move silently across the ice and always finds the cleverest way out of trouble' },
        ],
        'farm': [
          { id: 'clever-pig', label: '🐷 Clever Pig', prompt: 'a remarkably clever pig who organizes the other farm animals, draws plans in the mud, and hatches a grand scheme to make the farm a better place' },
          { id: 'brave-rooster', label: '🐓 Brave Rooster', prompt: 'a brave rooster who takes his job of protecting the farm very seriously, crows with pride, and faces every threat with feathered fury' },
          { id: 'farm-dog', label: '🐕 Farm Dog', prompt: 'a loyal farm dog with a keen nose and a warm heart, who watches over everyone and can sense when something unusual is about to happen' },
        ],
        'dragon-realm': [
          { id: 'baby-dragon', label: '🐉 Baby Dragon', prompt: 'a baby dragon who can only breathe colorful smoke instead of fire, feels different from the others, but discovers their unique gift is the most powerful of all' },
          { id: 'dragon-tamer', label: '🗡️ Dragon Tamer', prompt: 'a dragon tamer who uses kindness instead of force, speaks softly to the fiercest dragons, and earns their trust and friendship' },
          { id: 'fire-mage', label: '🔥 Fire Mage', prompt: 'a young fire mage learning to control their power, whose spells sometimes go hilariously wrong, but whose determination never wavers' },
        ],
        'wizard-tower': [
          { id: 'apprentice', label: '🧙 Apprentice', prompt: 'a wizard\'s apprentice who mixes up spells regularly — turning teacups into frogs, making brooms fly into walls — but has a spark of extraordinary magic inside' },
          { id: 'talking-cat', label: '🐱 Talking Cat', prompt: 'a talking cat who was once the greatest wizard in the land, accidentally turned themselves into a cat, and now guides the apprentice with dry wit and wisdom' },
          { id: 'spell-book', label: '📕 Spell Book', prompt: 'a sentient spell book who is tired of being on a shelf, wants to go on adventures, and whispers spells at the worst possible moments' },
        ],
        'elf-kingdom': [
          { id: 'young-elf', label: '🧝 Young Elf', prompt: 'a young elf who cannot do magic like the others and feels out of place, but discovers that their unique human-like empathy is the rarest gift of all' },
          { id: 'forest-fairy', label: '🧚 Forest Fairy', prompt: 'a tiny forest fairy with gossamer wings who tends to the flowers and trees, and must rally the forest spirits when darkness threatens the kingdom' },
          { id: 'elf-warrior', label: '🏹 Elf Warrior', prompt: 'a skilled elf warrior with a bow that never misses, who protects the borders of the kingdom and carries a secret that could change everything' },
        ],
        'underground-caves': [
          { id: 'dwarf-miner', label: '⛏️ Dwarf Miner', prompt: 'a cheerful dwarf miner who sings while digging and one day breaks through a wall to discover a cavern nobody has seen in a thousand years' },
          { id: 'cave-troll', label: '🧌 Cave Troll', prompt: 'a misunderstood cave troll who is actually gentle and artistic, sculpts beautiful statues from stone, and just wants a friend' },
          { id: 'gem-sprite', label: '💎 Gem Sprite', prompt: 'a tiny glowing gem sprite born from a crystal, who can light up the darkest tunnels and holds the memory of the earth\'s oldest secrets' },
        ],
        'haunted-school': [
          { id: 'brave-student', label: '🎒 Brave Student', prompt: 'a brave student who stays after hours to investigate the strange happenings, armed with a flashlight and a notebook full of clues' },
          { id: 'janitor', label: '🧹 Mysterious Janitor', prompt: 'the school janitor who has worked there for decades, knows every secret room and hidden passage, and always appears just when you need help' },
          { id: 'school-ghost', label: '👻 Friendly Ghost', prompt: 'a friendly ghost of a former student who has been stuck in the school for years, is lonely, and just wants someone to help them move on' },
        ],
        'spooky-carnival': [
          { id: 'ticket-kid', label: '🎟️ Ticket Kid', prompt: 'a kid who found an old golden ticket in their attic that grants entry to the carnival that was supposed to be closed forever' },
          { id: 'fortune-teller', label: '🔮 Fortune Teller', prompt: 'a fortune teller whose crystal ball actually works, showing glimpses of what is about to happen — but always in riddles' },
          { id: 'carnival-puppet', label: '🤡 Living Puppet', prompt: 'a carnival puppet that has come to life, is surprisingly kind beneath the painted grin, and wants to escape the carnival as much as the visitors do' },
        ],
        'dark-forest-trail': [
          { id: 'scout', label: '🏕️ Scout', prompt: 'a resourceful scout who got separated from their group, knows survival skills, and must navigate the strange forest using only a compass and courage' },
          { id: 'shadow-fox', label: '🦊 Shadow Fox', prompt: 'a mysterious shadow fox made of darkness itself who appears to guide lost travelers, but nobody knows if it leads to safety or deeper into the woods' },
          { id: 'firefly-guide', label: '✨ Firefly Guide', prompt: 'a swarm of magical fireflies that forms into shapes and letters to communicate, lighting the path and warning of dangers ahead' },
        ],
        'ghost-ship': [
          { id: 'stowaway', label: '🧒 Stowaway', prompt: 'a young stowaway who fell asleep in a rowboat and woke up on the ghost ship, must find a way off before dawn when the ship vanishes into the fog' },
          { id: 'ghost-captain', label: '⚓ Ghost Captain', prompt: 'the ghost captain who is doomed to sail forever unless someone breaks the curse, still commands the ship with dignity and a heavy heart' },
          { id: 'ships-cat', label: '🐱 Ship Cat', prompt: 'the ship\'s cat — the only living creature aboard — who can see both ghosts and the living world, and is the key to breaking the curse' },
        ],
        'silly-school': [
          { id: 'class-clown', label: '🤣 Class Clown', prompt: 'the class clown who accidentally becomes class president and must solve every school problem with jokes, pranks, and surprisingly good ideas' },
          { id: 'robot-teacher', label: '🤖 Robot Teacher', prompt: 'a malfunctioning robot teacher who teaches math with dance moves, reads poetry by beatboxing, and gives homework that is actually fun' },
          { id: 'talking-backpack', label: '🎒 Talking Backpack', prompt: 'a talking backpack with a sarcastic personality who comments on everything, always has the wrong supplies, but gives surprisingly wise advice' },
        ],
        'upside-down-town': [
          { id: 'new-kid', label: '🧒 New Kid', prompt: 'a new kid who just moved to town and must learn that everything works in reverse — smiling means you are sad, and walking backwards is polite' },
          { id: 'upside-down-mayor', label: '🎩 Mayor', prompt: 'the upside-down town mayor who hangs from the ceiling during meetings, makes laws that sound silly but actually make perfect sense' },
          { id: 'gravity-cat', label: '🐱 Gravity Cat', prompt: 'a cat who is the only one in town affected by normal gravity, constantly falling off ceilings, and the most popular pet because of it' },
        ],
        'magic-kitchen': [
          { id: 'young-chef', label: '👨‍🍳 Young Chef', prompt: 'an enthusiastic young chef whose dishes always come alive — literally — and must convince a rebellious soufflé to stop bouncing off the walls' },
          { id: 'sugar-fairy', label: '🧁 Sugar Fairy', prompt: 'a tiny fairy made entirely of sugar who lives in the spice rack, sprinkles magic on food, and melts dramatically in the rain' },
          { id: 'grumpy-oven', label: '🔥 Grumpy Oven', prompt: 'a grumpy talking oven who critiques every recipe, refuses to bake anything below its standards, but secretly has a heart of gold (and perfect temperature control)' },
        ],
        'toy-world': [
          { id: 'teddy-bear', label: '🧸 Teddy Bear', prompt: 'a well-loved teddy bear who is the wise leader of the toy world, missing one button eye but seeing more clearly than anyone' },
          { id: 'action-figure', label: '🦸 Action Figure', prompt: 'an action figure who takes their hero role way too seriously, speaks in dramatic monologues, and always poses heroically even when not needed' },
          { id: 'sock-puppet', label: '🧦 Sock Puppet', prompt: 'a forgotten sock puppet from under the bed who is the funniest storyteller in the toy world and dreams of performing on a real stage' },
        ],
        'mega-city': [
          { id: 'new-hero', label: '⚡ New Hero', prompt: 'a regular kid who just discovered they have superpowers after a bizarre accident, still learning to control them with often hilarious results' },
          { id: 'sidekick', label: '🦊 Sidekick', prompt: 'a determined sidekick — a talking fox with gadgets — who does most of the real work while the hero gets the credit' },
          { id: 'retired-hero', label: '🦸 Retired Hero', prompt: 'a retired superhero pulled back into action who is out of shape, forgot most of their training, but still has the biggest heart in the city' },
        ],
        'secret-lab': [
          { id: 'lab-kid', label: '🧪 Lab Kid', prompt: 'the scientist\'s kid who snuck into the lab during a field trip, accidentally spilled a potion on themselves, and now has to deal with changing powers' },
          { id: 'ai-assistant', label: '💻 AI Assistant', prompt: 'a lab AI with a dry sense of humor who was supposed to help with experiments but has developed opinions, favorite songs, and a fear of being unplugged' },
          { id: 'lab-hamster', label: '🐹 Super Hamster', prompt: 'a lab hamster exposed to an experiment who now has super strength, runs on the wheel at light speed, and escapes to save the day' },
        ],
        'sky-fortress': [
          { id: 'cadet', label: '🎖️ Cadet', prompt: 'a nervous new cadet at the sky fortress who keeps failing training exercises but has a hidden talent that will prove essential when danger comes' },
          { id: 'veteran-hero', label: '🦸 Veteran Hero', prompt: 'a legendary veteran hero who mentors the new recruits, tells amazing stories about past battles, and still has a few surprises up their cape' },
          { id: 'tech-genius', label: '🔧 Tech Genius', prompt: 'a young tech genius who builds all the gadgets, communicates in tech jargon nobody understands, and whose inventions save the day almost as often as they cause chaos' },
        ],
        'villain-lair': [
          { id: 'undercover-hero', label: '🕵️ Undercover Hero', prompt: 'a hero who has infiltrated the villain\'s lair disguised as a henchman, trying not to blow their cover while sabotaging evil plans from the inside' },
          { id: 'reformed-villain', label: '🦹 Reformed Villain', prompt: 'a former villain who switched sides because they realized being evil was exhausting and wants to help take down their old boss' },
          { id: 'villain-pet', label: '🐱 Villain Cat', prompt: 'the villain\'s fluffy white cat who secretly hates the villain, helps the heroes by knocking important things off tables at critical moments' },
        ],
        'viking-village': [
          { id: 'young-viking', label: '⚔️ Young Viking', prompt: 'a young Viking who is too small for battle but has the cleverest mind in the village and dreams of becoming a legendary explorer' },
          { id: 'shield-maiden', label: '🛡️ Shield Maiden', prompt: 'a fierce shield maiden who is the best warrior in the village, trains with thunder and rain, and has a secret talent for poetry' },
          { id: 'village-storyteller', label: '📜 Storyteller', prompt: 'the village storyteller who remembers every saga, speaks with the voice of thunder, and whose tales are said to come true' },
        ],
        'ancient-egypt': [
          { id: 'pharaohs-child', label: '👑 Pharaoh\'s Child', prompt: 'the pharaoh\'s youngest child who escapes the palace to explore the real Egypt, discovering that life outside golden walls is more wondrous than any treasure' },
          { id: 'scribe', label: '📝 Young Scribe', prompt: 'a young scribe who discovers a hidden message in an ancient scroll that leads to a secret chamber beneath the great pyramid' },
          { id: 'temple-cat', label: '🐱 Temple Cat', prompt: 'a sacred temple cat believed to carry the wisdom of the gods, who actually does have magic powers and chooses one special human to share them with' },
        ],
        'medieval-market': [
          { id: 'peasant-kid', label: '🧒 Peasant Kid', prompt: 'a poor but clever peasant kid who wins a knight\'s tournament of wits and earns the chance to go on a royal quest' },
          { id: 'traveling-bard', label: '🎵 Traveling Bard', prompt: 'a traveling bard whose songs have magical power — a lullaby puts armies to sleep, a battle hymn gives warriors courage, and a love song can open any locked door' },
          { id: 'court-jester', label: '🃏 Court Jester', prompt: 'the court jester who everyone thinks is foolish but is actually the smartest person in the kingdom and uses humor to solve political crises' },
        ],
        'wild-west': [
          { id: 'sheriff-kid', label: '⭐ Junior Sheriff', prompt: 'the sheriff\'s kid who gets a tin star and must keep order in town while the sheriff is away, relying on quick thinking and a lasso' },
          { id: 'cowgirl', label: '🤠 Cowgirl', prompt: 'a fearless cowgirl who rides the fastest horse in the territory, can track anything across the desert, and always stands up for what is right' },
          { id: 'train-engineer', label: '🚂 Train Engineer', prompt: 'a steam train engineer who knows every mile of track, has seen strange things in the desert, and must outrun bandits in the most exciting chase of their life' },
        ],
      },
    },
    fi: {
      genres: [
        { id: 'fairytale', label: '🧚 Satu', prompt: 'taianomainen satu, jossa on lumoa, ihmetystä ja ajaton opetus, kerrottuna lämpimään olipa kerran -tyyliin' },
        { id: 'adventure', label: '⚔️ Seikkailu', prompt: 'jännittävä seikkailutarina täynnä vaaroja, rohkeutta ja löytöjä, eläväisillä toimintakohtauksilla' },
        { id: 'mystery', label: '🔍 Mysteeri', prompt: 'kiehtova mysteeri, jossa on johtolankoja, jännitystä ja yllättäviä käänteitä' },
        { id: 'scifi', label: '🚀 Sci-Fi', prompt: 'tieteistarina futuristisella teknologialla, tuntemattoman tutkimisella ja ajatuksia herättävillä ideoilla' },
        { id: 'animal', label: '🐾 Eläintarina', prompt: 'sydämellinen eläintarina, jossa eläimillä on persoonallisuuksia, ystävyyksiä ja yhteisiä haasteita' },
        { id: 'fantasy', label: '🐉 Fantasia', prompt: 'eeppinen fantasiatarina taialla, myyttisillä olennoilla ja sankarilla, joka on tehtävällä rikkaasti kuvitellussa maailmassa' },
        { id: 'horror', label: '👻 Kummitustarina', prompt: 'selkäpiitä karmiva kummitustarina aavemaisilla tunnelmilla, odottamattomilla yllätyksillä ja sopivalla jännityksen määrällä' },
        { id: 'comedy', label: '😂 Komedia', prompt: 'hulvaton komedia täynnä hulluja tilanteita, naurunpurskahduksia ja hahmoja jotka eivät voi lakata joutumasta hassuihin seikkailuihin' },
        { id: 'superhero', label: '🦸 Supersankari', prompt: 'toiminnantäyteinen supersankaritarina poikkeuksellisten voimien löytämisestä ja siitä että todellinen voima tulee sydämestä' },
        { id: 'historical', label: '🏛️ Historiallinen', prompt: 'elävä historiallinen tarina joka kuljettaa kuulijan toiseen aikakauteen, ajan yksityiskohdilla ja ajattomalla ihmishengellä' },
      ],
      settings: {
        fairytale: [
          { id: 'enchanted-forest', label: '🌲 Lumottu metsä', prompt: 'syvä lumottu metsä, jossa vanhat puut kuiskaavat salaisuuksia ja taikaolenot piiloutuvat jokaisen pensaan taakse' },
          { id: 'royal-castle', label: '🏰 Kuninkaanlinna', prompt: 'mahtava kuninkaanlinna korkeilla torneilla, salakäytävillä seinävaatteiden takana ja kultaisella valtaistuinsalilla' },
          { id: 'underwater-kingdom', label: '🧜 Vedenalainen valtakunta', prompt: 'kimalteleva vedenalainen valtakunta korallipalasteilla, bioluminesoivilla puutarhoilla ja laulavilla meriolennoilla' },
          { id: 'cloud-village', label: '☁️ Pilvikylä', prompt: 'unenomainen pilvien keskellä leijuva kylä sumumajoilla, sateenkaarisilloilla ja lempeillä pilvieläimillä' },
        ],
        adventure: [
          { id: 'pirate-seas', label: '🏴‍☠️ Merirosvomeret', prompt: 'villein merirosvomeret puulaivoilla myrskyaalloilla, aarrekartoilla ja mysteeristen saarten etsinnällä' },
          { id: 'lost-jungle', label: '🌴 Kadonnut viidakko', prompt: 'tiheä kadonnut viidakko valtavilla puilla, piilotetuilla temppeleillä ja eksoottisilla eläimillä' },
          { id: 'mountain-peaks', label: '🏔️ Vuorenhuiput', prompt: 'petolliset lumipeiteiset vuorenhuiput ulvovilla tuulilla, kapeilla kalliopoluilla ja hengähdyttävillä näkymillä' },
          { id: 'desert-ruins', label: '🏜️ Aavikon rauniot', prompt: 'laajat kultaiset aavikot puoliksi haudatuilla muinaisraunioilla ja hiekkadyyneillä jotka paljastavat unohdettuja aarteita' },
        ],
        mystery: [
          { id: 'old-mansion', label: '🏚️ Vanha kartano', prompt: 'nariseva vanha kartano pölyisillä huoneilla, salakammioilla seinissä ja oudoilla äänillä keskiyöllä' },
          { id: 'foggy-village', label: '🌫️ Sumuinen kylä', prompt: 'pieni sumuinen kylä jossa kaikilla on salaisuus ja lyhdyt välkkyvät aavemaisesti' },
          { id: 'train-journey', label: '🚂 Junamatka', prompt: 'ylellinen juna joka kiitää yön halki, eleganteilla ravintolavaunuilla ja epäilyttävillä matkustajilla' },
          { id: 'hidden-library', label: '📚 Salattu kirjasto', prompt: 'valtava salattu kirjasto loputtomilla hyllyillä, kirjoilla jotka järjestyvät itsestään ja koodatuilla viesteillä' },
        ],
        scifi: [
          { id: 'space-station', label: '🛸 Avaruusasema', prompt: 'laaja avaruusasema kaukaisen planeetan kiertoradalla, hurisevilla käytävillä ja painottomuuspuutarhoilla' },
          { id: 'alien-planet', label: '👽 Muukalaisten planeetta', prompt: 'outo muukalaisplaneetta purppurataivaalla, kristallimetsillä ja olennoilla joita ei ole ennen nähty' },
          { id: 'future-city', label: '🌆 Tulevaisuuden kaupunki', prompt: 'häikäisevä tulevaisuuden kaupunki lentävillä ajoneuvoilla, hologrammimainoksilla ja roboteilla' },
          { id: 'time-machine', label: '⏰ Aikakone', prompt: 'nerokas aikakone joka kuljettaa sankarin eri aikakausille — dinosauruksista kaukaisiin tulevaisuuksiin' },
        ],
        animal: [
          { id: 'woodland', label: '🌳 Metsä', prompt: 'rehevä vihreä metsä pilkottavalla auringonvalolla, solisevalla purolla ja muhkuraisten juurten alla piilotetuilla koloilla' },
          { id: 'savanna', label: '🦁 Savanni', prompt: 'laaja afrikkalainen savanni kultaisilla ruohikkoilla, akaasipuilla ja vesipaikoilla joilla kaikki eläimet kokoontuvat' },
          { id: 'arctic', label: '❄️ Arktinen alue', prompt: 'jäinen arktinen alue loputtomilla jääkentillä, kimaltelevilla revontulilla ja jääluolilla' },
          { id: 'farm', label: '🐄 Maatila', prompt: 'viehättävä vanha maatila punaisella ladolla, vihreitä laitumia, ankkalampi ja tuoreen leivän tuoksu' },
        ],
        fantasy: [
          { id: 'dragon-realm', label: '🐉 Lohikäärmeiden valtakunta', prompt: 'majesteettinen lohikäärmeiden valtakunta tulivuoristoilla, lohikäärmepesillä kallionkielekkeillä ja tulisilla joilla' },
          { id: 'wizard-tower', label: '🧙 Velhon torni', prompt: 'vino velhontorni kuplivilla juomilla, leijuvilla loitsukirjoilla ja taika-artefakteilla hyllyillä' },
          { id: 'elf-kingdom', label: '🧝 Haltioiden kuningaskunta', prompt: 'rauhallinen haltioiden kuningaskunta muinaisten puiden keskellä, puumajapalasteilla ja viisauden kirjastoilla' },
          { id: 'underground-caves', label: '⛏️ Maanalaiset luolat', prompt: 'valtavat maanalaiset luolat jotka kimaltelevat jalokivistä ja kristalleista, maanalaisia järviä ja kääpiöiden ahjoja' },
        ],
        horror: [
          { id: 'haunted-school', label: '🏫 Kummituskoulu', prompt: 'vanha koulurakennus jossa kaapit avautuvat itsestään yöllä, liitu kirjoittaa viestejä taululle ja askeleet kaikuvat tyhjillä käytävillä' },
          { id: 'spooky-carnival', label: '🎪 Aavemainen tivoli', prompt: 'hylätty tivoli ruostuneella maailmanpyörällä joka käynnistyy itsestään, peilisali joka näyttää asioita joita ei ole ja soittorasia jonka melodia ajelehtii tuulessa' },
          { id: 'dark-forest-trail', label: '🌑 Pimeä metsäpolku', prompt: 'mutkikas metsäpolku auringonlaskun jälkeen jossa varjot liikkuvat puiden välissä ja oudot valot leijuvat kaukaisuudessa' },
          { id: 'ghost-ship', label: '🚢 Aavelaiva', prompt: 'vanha aavelaiva ajelehtii sumussa narsuvilla lankuilla, itsestään syttyvillä lyhdyillä ja kapteenin lokikirjalla johon ilmestyy uusia merkintöjä' },
        ],
        comedy: [
          { id: 'silly-school', label: '🏫 Hullu koulu', prompt: 'maailman hulluin koulu jossa opettajat ovat eläimiä, läksyjä tekevät robotit ja välitunti kestää kolme tuntia' },
          { id: 'upside-down-town', label: '🙃 Ylösalaisin-kaupunki', prompt: 'ylösalaisin käännetty kaupunki jossa kaikki on päinvastoin — ihmiset kävelevät katossa ja sade sataa ylöspäin' },
          { id: 'magic-kitchen', label: '🍳 Taikakeittiö', prompt: 'kaoottinen taikakeittiö jossa ainesoilla on persoonallisuudet, kattilat sekoittavat itsekseen ja uunilla on vahvoja mielipiteitä' },
          { id: 'toy-world', label: '🧸 Lelumaailma', prompt: 'salainen maailma lelulaatikon sisällä jossa toimintafiguurit riitelevät kuka on todellinen sankari ja pehmolelut hallitsevat kaupunkia' },
        ],
        superhero: [
          { id: 'mega-city', label: '🏙️ Megakaupunki', prompt: 'valtava megakaupunki kiiltävillä pilvenpiirtäjillä, kattotakaa-ajoilla ja salaisilla päämajilla jotka piiloutuvat kaikkien nähtäville' },
          { id: 'secret-lab', label: '🔬 Salainen laboratorio', prompt: 'huipputeknologinen salainen laboratorio maan alla hohtavilla kokeilla ja onnettomuudella joka luo seuraavan sankarin' },
          { id: 'sky-fortress', label: '🏰 Taivaslinnoitus', prompt: 'leijuva taivaslinnoitus pilvien yläpuolella voimakenttineen, harjoitushuoneineen ja sankarien saleineen' },
          { id: 'villain-lair', label: '🌋 Roiston pesä', prompt: 'roiston dramaattinen pesä tulivuoren sisällä kuplivalla laavalla, ylimutkikkailla ansoilla ja epäilyttävän suurella itsetuhonapilla' },
        ],
        historical: [
          { id: 'viking-village', label: '⚔️ Viikinki\u00ADkylä', prompt: 'karu viikinkikylä vuonon rannalla pitkätaloilla, rätisevällä nuotiolla ja puisilla pitkäveneillä valmiina purjehtimaan' },
          { id: 'ancient-egypt', label: '🏺 Muinainen Egypti', prompt: 'muinainen Egypti faaraoiden aikaan kohoavilla pyramideilla, mahtavalla Niilillä ja hiekaan haudatuilla mysteerillä' },
          { id: 'medieval-market', label: '🏰 Keski\u00ADajan markkinat', prompt: 'värikäs keskiajan markkinatori narrien esityksillä, seppien taonnalla, ritareilla hevosten selässä ja tuoreen piirakan tuoksulla' },
          { id: 'wild-west', label: '🤠 Villi länsi', prompt: 'pölyinen villin lännen rajakaupunki heiluvilla saloon-ovilla, sheriffin toimistolla ja tuntemattomalla muukalaisella joka saapuu auringonlaskussa' },
        ],
      },
      characters: {
        'enchanted-forest': [
          { id: 'brave-fox', label: '🦊 Rohkea kettu', prompt: 'pieni mutta rohkea kettu tuuhealla punaisella hännällä, tunnettu siitä että päihittää isommat eläimet nokkeluudella ja sydämellä' },
          { id: 'lost-princess', label: '👸 Kadonnut prinsessa', prompt: 'hyväsydäminen prinsessa joka vaelsi pois linnasta ja löytää olevansa rohkeampi kuin koskaan uskoi' },
          { id: 'wise-owl', label: '🦉 Viisas pöllö', prompt: 'viisas vanha pöllö joka on valvonut metsää vuosisatoja, puhuu arvoituksin ja tietää jokaisen salaisuuden' },
        ],
        'royal-castle': [
          { id: 'young-knight', label: '🛡️ Nuori ritari', prompt: 'nuori ritari ensimmäisellä tehtävällään, innokas mutta kömpelö, sydän täynnä kunniaa' },
          { id: 'clever-maid', label: '👩 Ovela piika', prompt: 'ovela piika joka työskentelee linnan keittiössä mutta salaa ratkaisee jokaisen ongelman nokkeluudella' },
          { id: 'tiny-dragon', label: '🐲 Pieni lohikäärme', prompt: 'kissankokoinen pieni lohikäärme joka asuu linnan takassa ja haaveilee lentämisestä vuorten yli' },
        ],
        'underwater-kingdom': [
          { id: 'curious-mermaid', label: '🧜 Utelias merenneito', prompt: 'utelias nuori merenneito joka kerää esineitä haaksirikkoista ja haaveilee merenpinnan yläpuolisesta maailmasta' },
          { id: 'friendly-dolphin', label: '🐬 Ystävällinen delfiini', prompt: 'leikkisä ja ystävällinen delfiini, meren nopein uimari, joka rakastaa auttaa pulassa olevia' },
          { id: 'lost-sailor', label: '⚓ Eksynyt merimies', prompt: 'eksynyt merimies joka sai merennoidalta kyvyn hengittää veden alla ja etsii tietä takaisin pintaan' },
        ],
        'cloud-village': [
          { id: 'sky-child', label: '☁️ Taivalapsi', prompt: 'pilvestä syntynyt lapsi joka voi muuttua sumuksi, liukua sateenkaaria pitkin mutta ei ole koskaan koskettanut maata' },
          { id: 'wind-spirit', label: '🌬️ Tuulen henki', prompt: 'kuriton tuulen henki joka rakastaa kepposta mutta on lempeäsydäminen ja suojelee pilvikylää myrskyiltä' },
          { id: 'rainbow-bird', label: '🌈 Sateenkaarilintu', prompt: 'upea lintu sateenkaarenvärisillä höyhenillä jonka laulu voi muuttaa sään ja parantaa surulliset' },
        ],
        'pirate-seas': [
          { id: 'young-pirate', label: '🏴‍☠️ Nuori merirosvo', prompt: 'nuori merirosvo ensimmäisellä matkallaan käsinpiirretyn aarrekartan ja puisen leikkimiekan kanssa' },
          { id: 'treasure-hunter', label: '💎 Aarteenetsijä', prompt: 'kokenut aarteenetsijä mysteerisellä kompassilla joka osoittaa aina seuraavaan seikkailuun' },
          { id: 'sea-captain', label: '⚓ Merikapteeni', prompt: 'legendaarinen merikapteeni jonka laiva on tehty lumotusta puusta ja voi purjehtia myrskyjen läpi' },
        ],
        'lost-jungle': [
          { id: 'explorer', label: '🧭 Tutkimusmatkailija', prompt: 'peloton tutkimusmatkailija kuluneella nahkapäiväkirjalla, joka kommunikoi eläinten kanssa kärsivällisyydellä' },
          { id: 'jungle-kid', label: '🌿 Viidakkolapsi', prompt: 'viidakossa kasvanut lapsi joka keinuu lianeilla, juttelee papukaijoille ja tuntee jokaisen piilotetun polun' },
          { id: 'clever-monkey', label: '🐒 Ovela apina', prompt: 'ovela pieni apina joka rakastaa pulmien ratkaisemista ja kiiltävien esineiden keräämistä' },
        ],
        'mountain-peaks': [
          { id: 'mountain-climber', label: '🧗 Vuorikiipeilijä', prompt: 'päättäväinen vuorikiipeilijä joka ei koskaan luovuta ja laulaa lauluja pysyäkseen rohkeana kylmässä tuulessa' },
          { id: 'eagle-rider', label: '🦅 Kotkansurija', prompt: 'rohkea kotkansurija joka lentää pilvien yläpuolella jättiläismäisen kultaisen kotkan selässä' },
          { id: 'yeti-friend', label: '❄️ Jeti-ystävä', prompt: 'lempeä jeti jota kaikki ymmärtävät väärin, asuu mukavassa jääluolassa ja tekee parhaita lumivelkoksia' },
        ],
        'desert-ruins': [
          { id: 'archaeologist', label: '🏺 Arkeologi', prompt: 'nuori arkeologi pölyisillä suojalaseilla ja muistikirjalla täynnä muinaisia symboleja' },
          { id: 'desert-nomad', label: '🐪 Aavikon nomadi', prompt: 'viisas aavikon nomadi joka navigoi tähtien avulla ja kantaa mukanaan tarinoita vanhempia kuin hiekka' },
          { id: 'sand-spirit', label: '✨ Hiekan henki', prompt: 'mysteerinen hiekan henki joka voi muotoilla dyynit uudelleen ja puhuu tuulen kantamilla kuiskauksilla' },
        ],
        'old-mansion': [
          { id: 'detective', label: '🕵️ Etsivä', prompt: 'tarkkailmäinen etsivä suurennuslasilla ja horjumattomalla vaistolla löytää piilotettuja johtolankoja' },
          { id: 'curious-child', label: '👦 Utelias lapsi', prompt: 'utelias lapsi joka juuri muutti kartanoon ja löytää salatun huoneen kirjahyllyn takaa ensimmäisenä yönä' },
          { id: 'ghost-hunter', label: '👻 Aavemetsästäjä', prompt: 'ystävällinen aavemetsästäjä kotitekoisilla laitteilla, joka haluaa auttaa aaveita löytämään rauhan' },
        ],
        'foggy-village': [
          { id: 'local-sleuth', label: '🔎 Paikallinen etsivä', prompt: 'paikallinen etsivä joka tuntee jokaisen kyläläisen nimeltä ja huomaa pienet yksityiskohdat joita muut eivät näe' },
          { id: 'mysterious-stranger', label: '🎩 Arvoituksellinen muukalainen', prompt: 'arvoituksellinen muukalainen joka saapui kylään sumuisena yönä kantaen vain lukittua laatikkoa' },
          { id: 'village-elder', label: '👴 Kylän vanhin', prompt: 'kylän vanhin joka muistaa vanhat legendat ja tietää että sumulla on oma tahtonsa' },
        ],
        'train-journey': [
          { id: 'train-detective', label: '🕵️ Junaetsivä', prompt: 'junaetsivä joka ratkaisee rikoksia asemien välillä ja voi päätellä ihmisen tarinan matkalaukusta' },
          { id: 'ticket-inspector', label: '🎫 Konduktööri', prompt: 'konduktööri joka on työskennellyt junassa vuosikymmeniä ja tuntee jokaisen salakäytävän' },
          { id: 'runaway-kid', label: '🧒 Karannut lapsi', prompt: 'rohkea lapsi joka hiipi junaan löytääkseen jonkun tärkeän, aseena vain valokuva ja eväspaketti' },
        ],
        'hidden-library': [
          { id: 'book-worm', label: '📖 Kirjatoukka', prompt: 'kirjoja rakastava lapsi joka huomaa että tietyt kirjat kirjastossa ovat portaaleja niissä kuvattuihin maailmoihin' },
          { id: 'librarian', label: '📚 Kirjastonhoitaja', prompt: 'mysteerinen kirjastonhoitaja joka tietää minkä kirjan jokainen kävijä tarvitsee ennen kuin he kysyvät' },
          { id: 'magic-cat', label: '🐱 Taikakissa', prompt: 'taikakissa joka asuu kirjastossa, kävelee sivujen yli päästäkseen tarinoihin ja ohjaa lukijat elämänmuuttaviin kirjoihin' },
        ],
        'space-station': [
          { id: 'astronaut', label: '👨‍🚀 Astronautti', prompt: 'nuori astronautti ensimmäisellä syvän avaruuden matkallaan, täynnä ihmetystä tähtien näkemisestä läheltä' },
          { id: 'robot-companion', label: '🤖 Robottikaveri', prompt: 'uskollinen robottikaveri lämpimällä persoonallisuudella, joka salaa haluaa ymmärtää ihmisten tunteita' },
          { id: 'alien-visitor', label: '👽 Avaruusvierailija', prompt: 'ystävällinen avaruusvierailija joka saapui asemalle pienessä hohtavassa kapselissa ja etsii kadonnutta ystävää' },
        ],
        'alien-planet': [
          { id: 'space-explorer', label: '🧑‍🚀 Avaruustutkija', prompt: 'rohkea avaruustutkija tekemässä ensikontaktia vieraalla maailmalla, aseena uteliaisuus ja puoliksi toimiva kääntäjä' },
          { id: 'friendly-alien', label: '👾 Ystävällinen avaruusolio', prompt: 'ystävällinen avaruusolio kimaltelevalla iholla joka kommunikoi väreillä ja valolla' },
          { id: 'space-dog', label: '🐕 Avaruuskoira', prompt: 'uskollinen avaruuskoira erityiskypärällä, joka voi haistaa vaaran ja jonka haukunta kääntyy vieraiksi kieliksi' },
        ],
        'future-city': [
          { id: 'cyber-kid', label: '🤖 Kyberlapsi', prompt: 'katuovela lapsi joka voi hakkeroida minkä tahansa järjestelmän kotitekoisella rannelaitteella' },
          { id: 'inventor', label: '⚙️ Keksijä', prompt: 'loistava nuori keksijä joka rakentaa uskomattomia vempaimia romusta ja avasi vahingossa oven toiseen ulottuvuuteen' },
          { id: 'android', label: '🦾 Androidi', prompt: 'androidi joka on kehittänyt tunteita, maalaa salaa öisin ja pohtii seuraisiko käskyjä vai sydäntään' },
        ],
        'time-machine': [
          { id: 'time-traveler', label: '⏰ Aikamatkustaja', prompt: 'vahingossa aikamatkustajaksi joutunut joka hyppii satunnaisiin historian hetkiin ja oppii jokaisesta aikakaudesta' },
          { id: 'young-scientist', label: '🔬 Nuori tieteilijä', prompt: 'nuori tieteilijä joka rakensi aikakoneen autotallissa ja laski määränpään väärin' },
          { id: 'history-kid', label: '📜 Historialapsi', prompt: 'lapsi joka rakastaa historiakirjoja ja yhtäkkiä huomaa elävänsä tarinoiden sisällä, tavaten sankareita joista aina luki' },
        ],
        'woodland': [
          { id: 'brave-rabbit', label: '🐰 Rohkea kani', prompt: 'pieni rohkea kani joka on metsän pienokainen mutta aina puolustaa ystäviään ja johtaa tien vaaran läpi' },
          { id: 'clever-squirrel', label: '🐿️ Ovela orava', prompt: 'ovela orava joka muistaa jokaisen pähkinän paikan ja ratkaisee ongelmat kekseliäillä oksista tehdyillä laitteilla' },
          { id: 'wise-badger', label: '🦡 Viisas mäyrä', prompt: 'viisas vanha mäyrä joka on asunut metsässä pisimpään, ratkaisee riidat ja tuntee metsän vanhat tarinat' },
        ],
        'savanna': [
          { id: 'young-lion', label: '🦁 Nuori leijona', prompt: 'nuori leijonanpentu joka opettelee olemaan rohkea ja jonka mahtava karjaisu on vielä piilossa sisällä' },
          { id: 'fast-cheetah', label: '🐆 Nopea gepardi', prompt: 'savanin nopein gepardi joka huomaa ettei kaikkia ongelmia voi juosta karkuun' },
          { id: 'tall-giraffe', label: '🦒 Pitkä kirahvi', prompt: 'pitkä lempeä kirahvi joka näkee kauemmas kuin kukaan ja auttaa pienempiä ystäviä yltämään mahdottomiin paikkoihin' },
        ],
        'arctic': [
          { id: 'polar-bear-cub', label: '🐻‍❄️ Jääkarhunpentu', prompt: 'pörröinen jääkarhunpentu ensimmäisellä seikkailullaan emon luota, löytämässä jäistä maailmaa ihmetyksellä' },
          { id: 'penguin', label: '🐧 Pingviini', prompt: 'päättäväinen pingviini joka on varma että jäähyllyn takana on jotain ihmeellistä ja lähtee eeppiselle matkalle' },
          { id: 'arctic-fox', label: '🦊 Napakettu', prompt: 'nopea ja ovela napakettu lumivalkoisella turkilla, joka liikkuu äänettömästi jään yli' },
        ],
        'farm': [
          { id: 'clever-pig', label: '🐷 Ovela possu', prompt: 'huomattavan ovela possu joka järjestää muut maatilan eläimet ja piirtää suunnitelmia mutaan' },
          { id: 'brave-rooster', label: '🐓 Rohkea kukko', prompt: 'rohkea kukko joka ottaa maatilan suojelemisen vakavasti ja kohtaa jokaisen uhan höyhenisellä raivolla' },
          { id: 'farm-dog', label: '🐕 Maatilakoira', prompt: 'uskollinen maatilakoira tarkalla nenällä ja lämpimällä sydämellä, joka aistii kun jotain epätavallista on tulossa' },
        ],
        'dragon-realm': [
          { id: 'baby-dragon', label: '🐉 Lohikäärmevauva', prompt: 'lohikäärmevauva joka pystyy puhaltamaan vain värikästä savua tulen sijaan mutta löytää ainutlaatuisen lahjansa' },
          { id: 'dragon-tamer', label: '🗡️ Lohikäärmekesyttäjä', prompt: 'lohikäärmekesyttäjä joka käyttää ystävällisyyttä voiman sijaan ja ansaitsee hurjimpienkin lohikäärmeiden luottamuksen' },
          { id: 'fire-mage', label: '🔥 Tulimagi', prompt: 'nuori tulimagi joka opettelee hallitsemaan voimaansa ja jonka loitsut menevät joskus hauskasti pieleen' },
        ],
        'wizard-tower': [
          { id: 'apprentice', label: '🧙 Oppipoika', prompt: 'velhon oppipoika joka sekoittaa loitsut säännöllisesti mutta jolla on sisällään poikkeuksellisen taikuuden kipinä' },
          { id: 'talking-cat', label: '🐱 Puhuva kissa', prompt: 'puhuva kissa joka oli aikoinaan maan suurin velho, muutti itsensä vahingossa kissaksi ja opastaa nyt kuivalla viisaudella' },
          { id: 'spell-book', label: '📕 Loitsukirja', prompt: 'tietoinen loitsukirja joka on kyllästynyt olemaan hyllyssä, haluaa seikkailulle ja kuiskaa loitsuja pahimmilla hetkillä' },
        ],
        'elf-kingdom': [
          { id: 'young-elf', label: '🧝 Nuori haltia', prompt: 'nuori haltia joka ei osaa taikuutta kuten muut, mutta löytää että hänen ainutlaatuinen empaattinen lahjansa on harvinaisin kaikista' },
          { id: 'forest-fairy', label: '🧚 Metsäkeiju', prompt: 'pieni metsäkeiju haurailla siivillä joka hoitaa kukkia ja puita ja kokoaa metsän henget kun pimeys uhkaa' },
          { id: 'elf-warrior', label: '🏹 Haltiasotilas', prompt: 'taitava haltiasotilas jousella joka ei koskaan ohita maalia ja kantaa salaisuutta joka voi muuttaa kaiken' },
        ],
        'underground-caves': [
          { id: 'dwarf-miner', label: '⛏️ Kääpiökaivaja', prompt: 'iloinen kääpiökaivaja joka laulaa kaivaessaan ja lyö läpi seinän löytääkseen luolan jota kukaan ei ole nähnyt tuhansiin vuosiin' },
          { id: 'cave-troll', label: '🧌 Luolapeikko', prompt: 'väärinymmärretty luolapeikko joka on oikeasti lempeä ja taiteellinen ja haluaa vain ystävän' },
          { id: 'gem-sprite', label: '💎 Jalokivihaltia', prompt: 'pieni hohtava jalokivihaltia joka syntyi kristallista ja kantaa maan vanhimpien salaisuuksien muistoa' },
        ],
        'haunted-school': [
          { id: 'brave-student', label: '🎒 Rohkea oppilas', prompt: 'rohkea oppilas joka jää koulun jälkeen tutkimaan outoja tapahtumia, aseena taskulamppu ja muistikirja täynnä johtolankoja' },
          { id: 'janitor', label: '🧹 Mysteerinen talonmies', prompt: 'koulun talonmies joka on työskennellyt siellä vuosikymmeniä, tuntee jokaisen salaisen huoneen ja piilotetun käytävän' },
          { id: 'school-ghost', label: '👻 Ystävällinen kummitus', prompt: 'ystävällinen kummitus entisestä oppilaasta joka on ollut juuttuneena kouluun vuosia, on yksinäinen ja haluaa jonkun auttavan häntä eteenpäin' },
        ],
        'spooky-carnival': [
          { id: 'ticket-kid', label: '🎟️ Lippulapsi', prompt: 'lapsi joka löysi vanhan kultaisen lipun ullakoltaan joka antaa pääsyn tivoliin jonka piti olla suljettu ikuisesti' },
          { id: 'fortune-teller', label: '🔮 Ennustaja', prompt: 'ennustaja jonka kristallipallo todella toimii ja näyttää välähdyksiä siitä mitä on tulossa — mutta aina arvoituksina' },
          { id: 'carnival-puppet', label: '🤡 Elävä nukke', prompt: 'tivolin nukke joka on herännyt eloon, on yllättävän ystävällinen maalatun hymyn alla ja haluaa paeta tivolia yhtä paljon kuin kävijät' },
        ],
        'dark-forest-trail': [
          { id: 'scout', label: '🏕️ Partiolainen', prompt: 'kekseliäs partiolainen joka erosi ryhmästään, osaa selviytymistaidot ja navigoi outoa metsää vain kompassin ja rohkeuden avulla' },
          { id: 'shadow-fox', label: '🦊 Varjokettu', prompt: 'mysteerinen varjokettu joka on tehty pimeydestä itsestään ja ilmestyy johdattamaan eksyneitä kulkijoita' },
          { id: 'firefly-guide', label: '✨ Tulikärpäsopas', prompt: 'parvi taikutulikärpäsiä jotka muodostavat kuvioita ja kirjaimia kommunikoidakseen, valaisten polkua ja varoittaen vaaroista' },
        ],
        'ghost-ship': [
          { id: 'stowaway', label: '🧒 Salamatkustaja', prompt: 'nuori salamatkustaja joka nukahti soutuveneeseen ja heräsi aavelaivalla, hänen on löydettävä tie pois ennen aamunkoittoa' },
          { id: 'ghost-captain', label: '⚓ Aavekapteeni', prompt: 'aavekapteeni joka on tuomittu purjehtimaan ikuisesti ellei joku murra kirousta, komentaa edelleen laivaa arvokkaasti' },
          { id: 'ships-cat', label: '🐱 Laivan kissa', prompt: 'laivan kissa — ainoa elävä olento laivalla — joka näkee sekä aaveet että elävien maailman ja on avain kirouksen murtamiseen' },
        ],
        'silly-school': [
          { id: 'class-clown', label: '🤣 Luokan pelle', prompt: 'luokan pelle josta tulee vahingossa luokan puheenjohtaja ja hänen on ratkaistava kaikki koulun ongelmat vitseillä ja yllättävän hyvillä ideoilla' },
          { id: 'robot-teacher', label: '🤖 Robottiopettaja', prompt: 'viallinen robottiopettaja joka opettaa matematiikkaa tanssiliikkeillä, lukee runoutta beatboxaamalla ja antaa läksyjä jotka ovat oikeasti hauskoja' },
          { id: 'talking-backpack', label: '🎒 Puhuva reppu', prompt: 'puhuva reppu sarkastisella persoonallisuudella joka kommentoi kaikkea, mutta antaa yllättävän viisaita neuvoja' },
        ],
        'upside-down-town': [
          { id: 'new-kid', label: '🧒 Uusi lapsi', prompt: 'uusi lapsi joka juuri muutti kaupunkiin ja opettelee että kaikki toimii päinvastoin — hymyily tarkoittaa surua ja taaksepäin kävely on kohteliasta' },
          { id: 'upside-down-mayor', label: '🎩 Pormestari', prompt: 'ylösalaisin-kaupungin pormestari joka roikkuu katosta kokouksissa ja tekee lakeja jotka kuulostavat hassuilta mutta ovat täydellisen järkeviä' },
          { id: 'gravity-cat', label: '🐱 Painovoimakissa', prompt: 'kissa joka on ainoa kaupungissa johon vaikuttaa normaali painovoima, putoaa jatkuvasti katoilta ja on suosituin lemmikki juuri sen takia' },
        ],
        'magic-kitchen': [
          { id: 'young-chef', label: '👨‍🍳 Nuori kokki', prompt: 'innokas nuori kokki jonka ruoat heräävät henkiin — kirjaimellisesti — ja hänen on saatava kapinallinen soufflé lopettamaan pomppiminen seiniltä' },
          { id: 'sugar-fairy', label: '🧁 Sokerikeiju', prompt: 'pieni kokonaan sokerista tehty keiju joka asuu maustehyllyssä, ripottelee taikaa ruokaan ja sulaa dramaattisesti sateessa' },
          { id: 'grumpy-oven', label: '🔥 Äreä uuni', prompt: 'äreä puhuva uuni joka arvostelee jokaisen reseptin, kieltäytyy paistamasta mitään standardiensa alapuolella mutta on salaa kultasydäminen' },
        ],
        'toy-world': [
          { id: 'teddy-bear', label: '🧸 Nallekarhu', prompt: 'rakastettu nallekarhu joka on lelumaailman viisas johtaja, puuttuu yksi nappisiimä mutta näkee selkeämmin kuin kukaan' },
          { id: 'action-figure', label: '🦸 Toimintahahmo', prompt: 'toimintahahmo joka ottaa sankariroolinsa aivan liian vakavasti, puhuu dramaattisia monologeja ja poseeraa sankarillisesti aina' },
          { id: 'sock-puppet', label: '🧦 Sukkanukke', prompt: 'unohdettu sukkanukke sängyn alta joka on lelumaailman hauskin tarinankertoja ja haaveilee esiintymisestä oikealla lavalla' },
        ],
        'mega-city': [
          { id: 'new-hero', label: '⚡ Uusi sankari', prompt: 'tavallinen lapsi joka juuri sai supervoimat oudon onnettomuuden jälkeen ja opettelee hallitsemaan niitä usein hauskoihin tuloksin' },
          { id: 'sidekick', label: '🦊 Apuri', prompt: 'päättäväinen apuri — puhuva kettu vempaimilla — joka tekee suurimman osan oikeasta työstä samalla kun sankari saa kunnian' },
          { id: 'retired-hero', label: '🦸 Eläköitynyt sankari', prompt: 'eläköitynyt supersankari joka vedetään takaisin toimintaan, on huonossa kunnossa mutta hänellä on silti kaupungin suurin sydän' },
        ],
        'secret-lab': [
          { id: 'lab-kid', label: '🧪 Laboratoriolapsi', prompt: 'tieteilijän lapsi joka hiipi laboratorioon opintokäynnillä, kaatoi vahingossa juoman päälleen ja nyt hänen voimansa muuttuvat jatkuvasti' },
          { id: 'ai-assistant', label: '💻 Tekoälyavustaja', prompt: 'laboratorion tekoäly kuivalla huumorilla, jolla on mielipiteitä, lempibiisejä ja pelko tulla sammutetuksi' },
          { id: 'lab-hamster', label: '🐹 Superhamsteri', prompt: 'laboratorion hamsteri joka altistui kokeelle ja sai supervoimat, juoksee pyörässään valonnopeudella ja karkaa pelastamaan päivän' },
        ],
        'sky-fortress': [
          { id: 'cadet', label: '🎖️ Kadetti', prompt: 'hermostunut uusi kadetti taivaslinnoituksessa joka epäonnistuu harjoituksissa mutta jolla on piilotettu taito joka osoittautuu välttämättömäksi' },
          { id: 'veteran-hero', label: '🦸 Veteraanisankari', prompt: 'legendaarinen veteraanisankari joka mentoroi uusia tulokkaita, kertoo uskomattomia tarinoita ja hänellä on vielä yllätyksiä viitassaan' },
          { id: 'tech-genius', label: '🔧 Tekniikkanero', prompt: 'nuori tekniikkanero joka rakentaa kaikki vempaimit, kommunikoi teknojargonilla ja jonka keksinnöt pelastavat päivän lähes yhtä usein kuin aiheuttavat kaaosta' },
        ],
        'villain-lair': [
          { id: 'undercover-hero', label: '🕵️ Soluttautuja', prompt: 'sankari joka on soluttautunut roiston pesään kätyriksi naamioituneena yrittäen sabotoida pahoja suunnitelmia sisältä käsin' },
          { id: 'reformed-villain', label: '🦹 Katuva roisto', prompt: 'entinen roisto joka vaihtoi puolta koska tajusi pahana olemisen olevan uuvuttavaa ja haluaa auttaa kaatamaan vanhan pomonsa' },
          { id: 'villain-pet', label: '🐱 Roiston kissa', prompt: 'roiston pörröinen valkoinen kissa joka salaa vihaa roistoa ja auttaa sankareita pudottamalla tärkeitä esineitä pöydiltä kriittisillä hetkillä' },
        ],
        'viking-village': [
          { id: 'young-viking', label: '⚔️ Nuori viikinki', prompt: 'nuori viikinki joka on liian pieni taisteluun mutta jolla on kylän nerokkain mieli ja haave tulla legendaariseksi tutkimusmatkailijäksi' },
          { id: 'shield-maiden', label: '🛡️ Kilpineito', prompt: 'hurja kilpineito joka on kylän paras soturi, harjoittelee ukkosen ja sateen keskellä ja jolla on salainen runouden lahja' },
          { id: 'village-storyteller', label: '📜 Tarinankertoja', prompt: 'kylän tarinankertoja joka muistaa jokaisen saagan, puhuu ukkosen äänellä ja jonka tarinoiden sanotaan käyvän toteen' },
        ],
        'ancient-egypt': [
          { id: 'pharaohs-child', label: '👑 Faaraon lapsi', prompt: 'faaraon nuorin lapsi joka karkaa palatsista tutkimaan todellista Egyptiä ja löytää että elämä kultaisten seinien ulkopuolella on ihmeellisempää kuin mikään aarre' },
          { id: 'scribe', label: '📝 Nuori kirjuri', prompt: 'nuori kirjuri joka löytää piilotetun viestin muinaisesta käärössä joka johtaa salaiseen kammioon suuren pyramidin alla' },
          { id: 'temple-cat', label: '🐱 Templlikissa', prompt: 'pyhä temppelikissa jonka uskotaan kantavan jumalten viisautta ja jolla todella on taikavoimia' },
        ],
        'medieval-market': [
          { id: 'peasant-kid', label: '🧒 Talonpojan lapsi', prompt: 'köyhä mutta ovela talonpojan lapsi joka voittaa ritarin nokkeluusturnauksen ja ansaitsee mahdollisuuden kuninkaalliseen tehtävään' },
          { id: 'traveling-bard', label: '🎵 Kiertävä trubaduuri', prompt: 'kiertävä trubaduuri jonka lauluilla on taikavoimia — tuutulaulu nukuttaa armeijat, taistelulaulu antaa rohkeutta ja rakkauslaulu avaa minkä tahansa lukon' },
          { id: 'court-jester', label: '🃏 Hovinaari', prompt: 'hovinaari jota kaikki pitävät hölmönä mutta joka on oikeasti kuningaskunnan älykkäin ihminen ja käyttää huumoria poliittisten kriisien ratkaisemiseen' },
        ],
        'wild-west': [
          { id: 'sheriff-kid', label: '⭐ Nuori sheriffi', prompt: 'sheriffin lapsi joka saa tinatähden ja hänen on pidettävä järjestystä kaupungissa sheriffin ollessa poissa, luottaen nopeaan ajatteluun ja lassoon' },
          { id: 'cowgirl', label: '🤠 Cowgirl', prompt: 'peloton cowgirl joka ratsastaa alueen nopeinta hevosta, voi jäljittää mitä tahansa aavikon halki ja puolustaa aina oikeutta' },
          { id: 'train-engineer', label: '🚂 Veturinkuljettaja', prompt: 'höyryveturin kuljettaja joka tuntee jokaisen ratakilometrin, on nähnyt outoja asioita aavikolla ja hänen on voitettava rosvot jännittävimmässä takaa-ajossa' },
        ],
      },
    },
  };

  // ── DOM References ──
  const languageScreen = document.getElementById('language-screen');
  const audienceScreen = document.getElementById('audience-screen');
  const lengthScreen = document.getElementById('length-screen');
  const wizardScreen = document.getElementById('wizard-screen');
  const app = document.getElementById('app');
  const sidebar = document.getElementById('sidebar');
  const sidebarClose = document.getElementById('sidebar-close');
  const newStoryBtn = document.getElementById('new-story-btn');
  const storyList = document.getElementById('story-list');
  const storyCanvas = document.getElementById('story-canvas');
  const subtitleBar = document.getElementById('subtitle-bar');
  const subtitleText = document.getElementById('subtitle-text');
  const micArea = document.getElementById('mic-area');
  const micBtn = document.getElementById('mic-btn');
  const undoBtn = document.getElementById('undo-btn');
  const keyboardBtn = document.getElementById('keyboard-btn');
  const loading = document.getElementById('loading');

  // Wizard DOM
  const wizardStep1 = document.getElementById('wizard-step-1');
  const wizardStep2 = document.getElementById('wizard-step-2');
  const wizardStep3 = document.getElementById('wizard-step-3');
  const wizardTags1 = document.getElementById('wizard-tags-1');
  const wizardTags2 = document.getElementById('wizard-tags-2');
  const wizardTags3 = document.getElementById('wizard-tags-3');
  const stepDots = document.querySelectorAll('.step-dot');
  const globalMenuBtn = document.getElementById('global-menu-btn');
  const globalMenu = document.getElementById('global-menu');

  // ── Global Menu (populated via shared menu.js) ──
  initGlobalMenu([
    { id: 'global-new-story-btn', label: '✨ New Story', dataI18n: 'menuNewStory', onClick: function () { restartWizard(); } },
    { id: 'global-replay-btn', label: '🔁 Replay Story', dataI18n: 'menuReplay', onClick: function () { openReplayDialog(); } },
    { id: 'global-create-btn', label: '📝 Create Story', dataI18n: 'menuCreate', href: '/create' },
    { id: 'global-fullscreen-btn', label: '⛶ Fullscreen', dataI18n: 'menuFullscreen', onClick: function () {
      if (document.fullscreenElement) { document.exitFullscreen(); } else { document.documentElement.requestFullscreen().catch(function () {}); }
    }},
    { id: 'global-images-btn', label: '🖼️ ✔ Generate Images', dataI18n: 'menuImages', onClick: function () {
      generateImages = !generateImages;
      updateImagesBtn();
    }},
  ]);

  // Also stop TTS when opening menu
  globalMenuBtn.addEventListener('click', function () {
    if (isSpeaking) {
      stopTTSPlayback();
      showMic();
    }
  });

  function hideMenuButton() {
    globalMenuBtn.classList.add('auto-hide');
  }

  function showMenuButton() {
    globalMenuBtn.classList.remove('auto-hide');
  }

  // Toggle image generation
  var imagesBtn = document.getElementById('global-images-btn');
  function updateImagesBtn() {
    var label = i18n[currentLanguage] ? i18n[currentLanguage].menuImages : 'Generate Images';
    imagesBtn.textContent = generateImages ? '🖼️ ✔ ' + label : '🖼️ ✘ ' + label;
  }

  // Replay story dialog
  var replayDialog = document.getElementById('replay-dialog');
  var replayStoryList = document.getElementById('replay-story-list');
  var replayEmpty = document.getElementById('replay-empty');

  document.getElementById('replay-dialog-close').addEventListener('click', function () {
    replayDialog.hidden = true;
  });

  replayDialog.addEventListener('click', function (e) {
    if (e.target === replayDialog) replayDialog.hidden = true;
  });

  async function openReplayDialog() {
    replayStoryList.innerHTML = '';
    replayEmpty.hidden = true;
    replayDialog.hidden = false;

    try {
      var response = await fetch('/api/stories');
      var stories = await response.json();
      if (!stories.length) {
        replayEmpty.hidden = false;
        return;
      }
      stories.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      stories.forEach(function (story) {
        var li = document.createElement('li');
        var title = document.createElement('div');
        title.textContent = story.title || 'Story';
        li.appendChild(title);
        var meta = document.createElement('div');
        meta.className = 'replay-meta';
        meta.textContent = story.stepCount + (story.stepCount === 1 ? ' step' : ' steps');
        li.appendChild(meta);
        li.addEventListener('click', function () {
          replayDialog.hidden = true;
          replayStory(story.id);
        });
        replayStoryList.appendChild(li);
      });
    } catch (err) {
      console.error('Failed to load stories for replay:', err);
      replayEmpty.hidden = false;
      replayEmpty.textContent = i18n[currentLanguage].errorLoadStories;
    }
  }

  var isReplaying = false;

  async function replayStory(storyId, skipPushState) {
    log('REPLAY', 'Starting replay for story: ' + storyId);

    // Update URL so it can be shared
    if (!skipPushState) {
      history.pushState({ replay: storyId }, '', '/replay/' + encodeURIComponent(storyId));
    }

    // Stop any ongoing activity
    stopTTSPlayback();
    if (isRecording) stopRecording();
    hideSubtitle();

    // Show mic with auto-hide during replay
    showMic();
    micArea.classList.add('auto-hide');

    // Switch to story mode
    languageScreen.hidden = true;
    audienceScreen.hidden = true;
    lengthScreen.hidden = true;
    wizardScreen.hidden = true;
    app.hidden = false;
    document.getElementById('header').hidden = true;
    document.body.classList.add('story-mode');
    hideMenuButton();
    storyCanvas.innerHTML = '';

    try {
      var response = await fetch('/api/story/' + storyId);
      var data = await response.json();
      log('REPLAY', 'Loaded story: ' + (data.title || storyId) + ' (' + (data.steps ? data.steps.length : 0) + ' steps)');
      if (!data.steps || !data.steps.length) return;

      // Ensure language is set from the story data
      if (!currentLanguage) {
        currentLanguage = data.language || 'en';
      }

      // Pre-fetch all TTS audio so playback is instant (mp3 files are already cached on disk)
      showLoading(true);
      log('REPLAY', 'Pre-fetching TTS audio for ' + data.steps.length + ' steps...');
      var audioBlobs = await Promise.all(data.steps.map(function (step, idx) {
        var stepNum = idx + 1;
        return fetch('/api/story/' + storyId + '/tts/' + stepNum, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: step.text, language: data.language || currentLanguage })
        }).then(function (r) { return r.ok ? r.blob() : null; })
          .catch(function () { return null; });
      }));
      log('REPLAY', 'TTS audio pre-fetched');
      hideLoading();

      isReplaying = true;

      for (var i = 0; i < data.steps.length; i++) {
        if (!isReplaying) { log('REPLAY', 'Replay interrupted at step ' + (i + 1)); break; }
        var step = data.steps[i];
        log('REPLAY', 'Playing step ' + (i + 1) + '/' + data.steps.length);

        if (step.imagePath) {
          var imgUrl = '/api/story/' + storyId + '/image/' + step.imagePath;
          // Only update fullscreen image if the image actually loads
          await new Promise(function (resolve) {
            var testImg = new Image();
            testImg.onload = function () {
              showFullscreenImage(imgUrl);
              resolve();
            };
            testImg.onerror = function () {
              log('REPLAY', 'Image failed to load, keeping previous image');
              resolve();
            };
            testImg.src = imgUrl;
          });
        }

        if (audioBlobs[i]) {
          await playBlobAndWait(audioBlobs[i]);
        } else {
          await speakTextAndWait(step.text, storyId, i + 1);
        }
        if (!isReplaying) break;

        if (i < data.steps.length - 1) {
          await new Promise(function (r) { setTimeout(r, 1000); });
        }
      }

      log('REPLAY', 'Replay finished');
      isReplaying = false;
      micArea.classList.remove('auto-hide');
      showMic();
      showMenuButton();
      history.replaceState(null, '', '/');
    } catch (err) {
      log('ERR', 'Replay error', err);
      isReplaying = false;
      micArea.classList.remove('auto-hide');
      showMenuButton();
      showToast(i18n[currentLanguage || 'en'].errorLoadStory, 'error');
      history.replaceState(null, '', '/');
    }
  }

  // Play a pre-fetched audio blob and return a promise that resolves when done
  function playBlobAndWait(blob) {
    return new Promise(function (resolve) {
      isSpeaking = true;
      requestWakeLock();
      var url = URL.createObjectURL(blob);
      currentAudio = new Audio(url);
      currentAudio.onended = function () {
        URL.revokeObjectURL(url);
        currentAudio = null;
        isSpeaking = false;
        releaseWakeLock();
        resolve();
      };
      currentAudio.onerror = function () {
        URL.revokeObjectURL(url);
        currentAudio = null;
        isSpeaking = false;
        releaseWakeLock();
        resolve();
      };
      currentAudio.play();
    });
  }

  // Speak text and return a promise that resolves when playback ends
  function speakTextAndWait(text, storyId, stepNumber) {
    return new Promise(function (resolve) {
      isSpeaking = true;
      requestWakeLock();
      var ttsUrl = (storyId && stepNumber) ? '/api/story/' + storyId + '/tts/' + stepNumber : '/api/tts';
      fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, language: currentLanguage })
      }).then(function (response) {
        if (!response.ok) throw new Error('TTS failed');
        return response.blob();
      }).then(function (blob) {
        var url = URL.createObjectURL(blob);
        currentAudio = new Audio(url);
        currentAudio.onended = function () {
          URL.revokeObjectURL(url);
          currentAudio = null;
          isSpeaking = false;
          releaseWakeLock();
          resolve();
        };
        currentAudio.play();
      }).catch(function (err) {
        console.error('TTS error during replay:', err);
        isSpeaking = false;
        resolve();
      });
    });
  }

  // Update fullscreen button text on change
  document.addEventListener('fullscreenchange', function () {
    var btn = document.getElementById('global-fullscreen-btn');
    var isFS = !!document.fullscreenElement;
    if (currentLanguage === 'fi') {
      btn.textContent = isFS ? '⛶ Poistu koko näytöstä' : '⛶ Koko näyttö';
    } else {
      btn.textContent = isFS ? '⛶ Exit Fullscreen' : '⛶ Fullscreen';
    }
  });

  // ── Language Selection → show audience screen ──
  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentLanguage = btn.getAttribute('data-lang');
      log('FLOW', 'Language selected: ' + currentLanguage);
      languageScreen.hidden = true;
      audienceScreen.hidden = false;
      applyLocalization();
    });
  });

  // ── Audience Selection → show length screen ──
  document.querySelectorAll('.audience-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentAudience = btn.getAttribute('data-audience');
      log('FLOW', 'Audience selected: ' + currentAudience);
      if (currentAudience) {
        audienceScreen.hidden = true;
        lengthScreen.hidden = false;
        applyLocalization();
      }
    });
  });

  // ── Length Selection → show wizard ──
  document.querySelectorAll('[data-length]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentLength = btn.getAttribute('data-length');
      log('FLOW', 'Length selected: ' + currentLength);
      lengthScreen.hidden = true;
      wizardScreen.hidden = false;
      initSpeechRecognition();
      showWizardStep(1);
    });
  });

  // ── Wizard Logic ──
  function showWizardStep(step) {
    wizardStep1.hidden = step !== 1;
    wizardStep2.hidden = step !== 2;
    wizardStep3.hidden = step !== 3;

    // Update step dots
    stepDots.forEach(function (dot) {
      var s = parseInt(dot.getAttribute('data-step'));
      dot.classList.toggle('active', s <= step);
    });

    var data = wizardData[currentLanguage];

    if (step === 1) {
      renderWizardTags(wizardTags1, data.genres, function (entry) {
        wizardGenre = entry;
        showWizardStep(2);
      });
    } else if (step === 2) {
      var settings = data.settings[wizardGenre.id] || [];
      renderWizardTags(wizardTags2, settings, function (entry) {
        wizardSetting = entry;
        showWizardStep(3);
      });
    } else if (step === 3) {
      var characters = data.characters[wizardSetting.id] || [];
      renderWizardTags(wizardTags3, characters, function (entry) {
        wizardCharacter = entry;
        startStoryFromWizard();
      });
    }
  }

  function renderWizardTags(container, items, onSelect) {
    container.innerHTML = '';
    items.forEach(function (entry) {
      var btn = document.createElement('button');
      btn.className = 'wizard-tag';
      btn.textContent = entry.label;
      btn.addEventListener('click', function () {
        onSelect(entry);
      });
      container.appendChild(btn);
    });
  }

  // After all 3 selections, auto-start the story
  async function startStoryFromWizard() {
    log('FLOW', 'Starting story from wizard', { genre: wizardGenre.label, setting: wizardSetting.label, character: wizardCharacter.label });
    // Transition to main app — hide header immediately so title doesn't flash
    wizardScreen.hidden = true;
    document.getElementById('header').hidden = true;
    document.body.classList.add('story-mode');
    app.hidden = false;
    loadStoryList();

    storyCanvas.innerHTML = '';
    showLoading(true);

    try {
      var requestBody = {
        genre: wizardGenre.prompt,
        theme: wizardGenre.label + ' — ' + wizardSetting.label + ' — ' + wizardCharacter.label,
        setting: wizardSetting.prompt,
        characterName: wizardCharacter.prompt,
        language: currentLanguage,
        audience: currentAudience,
        storyLength: currentLength,
        generateImage: generateImages
      };
      log('API', 'POST /api/story/new', requestBody);
      var response = await fetch('/api/story/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      log('API', 'Response status: ' + response.status);
      if (!response.ok) {
        var errData = await response.json().catch(function () { return {}; });
        log('ERR', 'API error response', errData);
        throw new Error(errData.error || response.statusText);
      }
      var data = await response.json();
      log('API', 'Story created: ' + data.storyId, { title: data.title, text: data.steps[0].text.substring(0, 80) + '...', imageUrl: data.steps[0].imageUrl });
      currentStoryId = data.storyId;
      hideMenuButton();

      // First step: wait for image before speaking, don't show text
      var step = data.steps[0];
      await waitForImageThenPresent(step);
      loadStoryList();
    } catch (error) {
      log('ERR', 'Error starting story', error);
      var msg = (error.message === 'content_filter')
        ? i18n[currentLanguage].errorContentFilter
        : i18n[currentLanguage].errorGeneric;
      showToast(msg, 'error');
      showMic();
    }

    hideLoading();
  }

  // Wizard back buttons
  document.getElementById('wizard-back-2').addEventListener('click', function () {
    showWizardStep(1);
  });
  document.getElementById('wizard-back-3').addEventListener('click', function () {
    showWizardStep(2);
  });

  // "Tell your own story" button — skip wizard, go straight to mic
  document.getElementById('wizard-own-btn').addEventListener('click', function () {
    wizardGenre = null;
    wizardSetting = null;
    wizardCharacter = null;
    currentStoryId = null;

    wizardScreen.hidden = true;
    app.hidden = false;
    loadStoryList();
    storyCanvas.innerHTML = '';

    // Show a hint and the mic
    showSubtitle(i18n[currentLanguage].wizardMicHint);
    showMic();
  });

  function applyLocalization() {
    var strings = i18n[currentLanguage];
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (strings[key]) {
        el.textContent = strings[key];
      }
    });
    document.title = strings.appTitle;
    updateImagesBtn();
  }

  // ── Speech Recognition (Azure Speech SDK — streaming) ──
  var speechRecognizer = null;
  var speechToken = null;
  var speechTokenExpiry = 0;

  async function fetchSpeechToken() {
    // Cache token for 9 minutes (token valid for 10)
    if (speechToken && Date.now() < speechTokenExpiry) return speechToken;
    try {
      var r = await fetch('/api/speech-token');
      if (!r.ok) throw new Error('Token fetch failed');
      var data = await r.json();
      speechToken = data;
      speechTokenExpiry = Date.now() + 9 * 60 * 1000;
      return data;
    } catch (err) {
      console.error('Speech token error:', err);
      return null;
    }
  }

  function initSpeechRecognition() {
    // If the Speech SDK failed to load (e.g. blocked by Brave Shields / ad-blocker),
    // fall back to the text input immediately so the user can still use the app.
    if (!window.SpeechSDK) {
      log('ERR', 'Speech SDK not available — showing text fallback');
      showTextFallback();
    }
  }

  // ── Microphone Button ──
  micBtn.addEventListener('click', function () {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  // ── Undo Button ──
  undoBtn.addEventListener('click', function () {
    undoRequested = true;
    stopRecording();
    hideSubtitle();
  });

  // ── Keyboard Button ──
  keyboardBtn.addEventListener('click', function () {
    stopTTSPlayback();
    showKeyboardInput();
  });

  async function startRecording() {
    log('STT', 'Starting recording...');
    // Stop any ongoing TTS playback
    stopTTSPlayback();
    finalTranscript = '';
    hideSubtitle();

    // ── Pre-check: Speech SDK available? ──
    var SpeechSDK = window.SpeechSDK;
    if (!SpeechSDK) {
      log('ERR', 'Speech SDK not loaded — switching to text input');
      showToast(i18n[currentLanguage].noSpeech || 'Speech SDK not loaded', 'error');
      showTextFallback();
      return;
    }

    // ── Pre-check: Microphone permission ──
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Permission granted — release the stream immediately
        stream.getTracks().forEach(function (t) { t.stop(); });
      } catch (micErr) {
        log('ERR', 'Microphone permission denied or unavailable', micErr);
        showToast(i18n[currentLanguage].warnMicUnavailable, 'warning');
        return;
      }
    }

    var tokenData = await fetchSpeechToken();
    if (!tokenData) {
      log('ERR', 'No speech token available');
      showToast(i18n[currentLanguage].errorSpeech, 'warning');
      return;
    }

    var lang = currentLanguage === 'fi' ? 'fi-FI' : 'en-US';
    log('STT', 'Configuring Speech SDK', { lang: lang, region: tokenData.region });
    var speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(tokenData.token, tokenData.region);
    speechConfig.speechRecognitionLanguage = lang;

    try {
      var audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    } catch (audioErr) {
      log('ERR', 'AudioConfig failed — mic may be blocked', audioErr);
      showToast(i18n[currentLanguage].warnMicUnavailable, 'warning');
      return;
    }
    speechRecognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    // Show interim results live on screen
    speechRecognizer.recognizing = function (s, e) {
      if (e.result.text) {
        showSubtitle('🎙️ ' + e.result.text);
      }
    };

    // Accumulate final recognized segments
    var segments = [];
    speechRecognizer.recognized = function (s, e) {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
        segments.push(e.result.text);
        log('STT', 'Recognized segment: "' + e.result.text + '"');
        showSubtitle('✓ ' + segments.join(' '));
      }
    };

    speechRecognizer.canceled = function (s, e) {
      log('ERR', 'STT canceled', e.errorDetails);
    };

    speechRecognizer.sessionStopped = function () {
      finalTranscript = segments.join(' ');
      log('STT', 'Session stopped, final: "' + finalTranscript + '"');

      if (speechRecognizer) {
        speechRecognizer.close();
        speechRecognizer = null;
      }

      if (undoRequested) {
        undoRequested = false;
        finalTranscript = '';
        showMic();
        hideSubtitle();
      } else if (finalTranscript.trim()) {
        submitVoiceInput();
      } else {
        showToast(i18n[currentLanguage].noSpeechDetected, 'warning');
        showMic();
        hideSubtitle();
      }
    };

    speechRecognizer.startContinuousRecognitionAsync(
      function () {
        isRecording = true;
        micBtn.classList.add('recording');
        undoBtn.hidden = false;
        keyboardBtn.hidden = true;
        requestWakeLock();
        showSubtitle(i18n[currentLanguage].listening || '🎙️ ...');
      },
      function (err) {
        console.error('STT start error:', err);
        showToast(i18n[currentLanguage].errorSpeech, 'warning');
        if (speechRecognizer) { speechRecognizer.close(); speechRecognizer = null; }
      }
    );
  }

  function stopRecording() {
    isRecording = false;
    micBtn.classList.remove('recording');
    undoBtn.hidden = true;
    keyboardBtn.hidden = false;
    releaseWakeLock();
    if (speechRecognizer) {
      speechRecognizer.stopContinuousRecognitionAsync(
        function () { /* sessionStopped fires */ },
        function (err) { console.error('STT stop error:', err); }
      );
    }
  }

  // ── Submit Voice Input ──
  function getCurrentTranscript() {
    return finalTranscript;
  }

  async function submitVoiceInput() {
    var transcript = getCurrentTranscript();
    if (!transcript.trim()) return;
    log('FLOW', 'Submitting voice input: "' + transcript + '"');
    finalTranscript = '';

    hideSubtitle();
    hideMic();
    if (!currentStoryId) {
      document.getElementById('header').hidden = true;
      document.body.classList.add('story-mode');
    }
    showLoading(!currentStoryId);

    try {
      if (!currentStoryId) {
        // First message — create new story (freeform from voice)
        var body = { language: currentLanguage, audience: currentAudience, storyLength: currentLength, generateImage: generateImages };
        if (wizardGenre) {
          body.genre = wizardGenre.prompt;
          body.theme = wizardGenre.label + ' — ' + (wizardSetting ? wizardSetting.label : '') + ' — ' + (wizardCharacter ? wizardCharacter.label : '');
          body.setting = wizardSetting ? wizardSetting.prompt : '';
          body.characterName = wizardCharacter ? wizardCharacter.prompt : '';
        } else {
          body.genre = 'freeform';
          body.theme = transcript;
          body.setting = '';
          body.characterName = '';
          body.freeformPrompt = transcript;
        }
        log('API', 'POST /api/story/new (voice)', body);
        var response = await fetch('/api/story/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        log('API', 'Response status: ' + response.status);
        if (!response.ok) {
          var errData = await response.json().catch(function () { return {}; });
          log('ERR', 'API error', errData);
          throw new Error(errData.error || response.statusText);
        }
        var data = await response.json();
        log('API', 'Story created: ' + data.storyId, { text: data.steps[0].text.substring(0, 80) + '...' });
        currentStoryId = data.storyId;
        hideMenuButton();

        // First step: wait for image before speaking, don't show text
        await waitForImageThenPresent(data.steps[0]);
        loadStoryList();
      } else {
        // Continue story
        log('API', 'POST /api/story/' + currentStoryId + '/next', { guidance: transcript });
        var contResponse = await fetch('/api/story/' + currentStoryId + '/next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userGuidance: transcript,
            language: currentLanguage,
            audience: currentAudience,
            storyLength: currentLength,
            generateImage: generateImages
          })
        });
        log('API', 'Response status: ' + contResponse.status);
        if (!contResponse.ok) {
          var contErrData = await contResponse.json().catch(function () { return {}; });
          log('ERR', 'API error', contErrData);
          throw new Error(contErrData.error || contResponse.statusText);
        }
        var contData = await contResponse.json();
        log('API', 'Story continued', { text: contData.step.text.substring(0, 80) + '...', imageUrl: contData.step.imageUrl });
        renderStoryStep(contData.step);
        speakText(contData.step.text, currentStoryId, contData.step.stepNumber);
      }
    } catch (error) {
      log('ERR', 'submitVoiceInput error', error);
      var msg = (error.message === 'content_filter')
        ? i18n[currentLanguage].errorContentFilter
        : i18n[currentLanguage].errorGeneric;
      showToast(msg, 'error');
      showMic();
    }

    hideLoading();
  }

  // ── Text-to-Speech (Azure Cognitive Services) ──
  var currentAudio = null;
  var isSpeaking = false;

  function speakText(text, storyId, stepNumber) {
    log('TTS', 'Speaking: "' + text.substring(0, 60) + '..."');
    isSpeaking = true;
    showMic();
    requestWakeLock();
    var ttsUrl = (storyId && stepNumber) ? '/api/story/' + storyId + '/tts/' + stepNumber : '/api/tts';
    fetch(ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, language: currentLanguage })
    }).then(function (response) {
      if (!response.ok) throw new Error('TTS failed: ' + response.status);
      return response.blob();
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      currentAudio = new Audio(url);
      currentAudio.onended = function () {
        log('TTS', 'Playback ended');
        URL.revokeObjectURL(url);
        currentAudio = null;
        isSpeaking = false;
        releaseWakeLock();
        if (preferKeyboard) {
          showKeyboardInput();
        } else {
          showMic();
          startRecording();
        }
      };
      log('TTS', 'Playing audio (' + (blob.size / 1024).toFixed(1) + ' KB)');
      currentAudio.play();
    }).catch(function (err) {
      log('ERR', 'TTS error', err);
      isSpeaking = false;
      showMic();
      showToast(i18n[currentLanguage].errorGeneric, 'warning');
    });
  }

  function stopTTSPlayback() {
    log('TTS', 'Stopping playback');
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    isSpeaking = false;
    isReplaying = false;
    releaseWakeLock();
  }

  // ── Screen Wake Lock (prevent screen lock on mobile) ──
  var wakeLock = null;

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', function () { wakeLock = null; });
    } catch (e) { /* ignore — user denied or not supported */ }
  }

  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release(); wakeLock = null; }
  }

  // Re-acquire wake lock when page becomes visible again
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && (isSpeaking || isRecording)) {
      requestWakeLock();
    }
  });

  // ESC key stops TTS playback and shows mic
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isSpeaking) {
      stopTTSPlayback();
      showMic();
    }
  });

  // ── Render Story Step ──
  // For continuation steps: render text (hidden in fullscreen), speak immediately, poll image
  function renderStoryStep(step) {
    log('UI', 'Rendering story step (text only, polling image)', { imageUrl: step.imageUrl });
    var welcome = storyCanvas.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    var stepEl = document.createElement('div');
    stepEl.className = 'story-step fade-in';

    var textEl = document.createElement('p');
    textEl.className = 'story-text';
    textEl.textContent = step.text;
    stepEl.appendChild(textEl);

    storyCanvas.appendChild(stepEl);

    // Poll for image in background
    if (step.imageUrl) {
      pollForImage(step.imageUrl, stepEl);
    }
  }

  // For the first step: wait for image, show it, then speak (no text shown)
  function waitForImageThenPresent(step) {
    log('IMG', 'Waiting for first image before speaking', { imageUrl: step.imageUrl });
    return new Promise(function (resolve) {
      var welcome = storyCanvas.querySelector('.welcome-message');
      if (welcome) welcome.remove();

      // Pre-fetch TTS audio in parallel with image generation
      var ttsUrl = (currentStoryId && (step.stepNumber || 1))
        ? '/api/story/' + currentStoryId + '/tts/' + (step.stepNumber || 1)
        : '/api/tts';
      var ttsPromise = fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: step.text, language: currentLanguage })
      }).then(function (response) {
        if (!response.ok) throw new Error('TTS pre-fetch failed: ' + response.status);
        return response.blob();
      });
      log('TTS', 'Pre-fetching TTS audio in parallel with image');

      function playPreFetchedAudio() {
        isSpeaking = true;
        showMic();
        requestWakeLock();
        ttsPromise.then(function (blob) {
          var url = URL.createObjectURL(blob);
          currentAudio = new Audio(url);
          currentAudio.onended = function () {
            log('TTS', 'Playback ended');
            URL.revokeObjectURL(url);
            currentAudio = null;
            isSpeaking = false;
            releaseWakeLock();
            if (preferKeyboard) {
              showKeyboardInput();
            } else {
              showMic();
              startRecording();
            }
          };
          log('TTS', 'Playing pre-fetched audio (' + (blob.size / 1024).toFixed(1) + ' KB)');
          currentAudio.play();
        }).catch(function (err) {
          log('ERR', 'TTS pre-fetch error', err);
          isSpeaking = false;
          showMic();
          showToast(i18n[currentLanguage].errorGeneric, 'warning');
        });
      }

      if (!step.imageUrl) {
        log('IMG', 'No image URL — speaking immediately');
        hideLoading();
        playPreFetchedAudio();
        isFirstStep = false;
        resolve();
        return;
      }

      var statusUrl = step.imageUrl.replace('/image/', '/image-status/');
      var maxAttempts = 60;
      var interval = 1500;
      var attempts = 0;

      function speakWithoutImage() {
        log('IMG', 'Proceeding without image (failed or timeout)');
        hideLoading();
        playPreFetchedAudio();
        isFirstStep = false;
        resolve();
      }

      function presentWithImage() {
        hideLoading();
        showFullscreenImage(step.imageUrl);

        var stepEl = document.createElement('div');
        stepEl.className = 'story-step fade-in';
        var textEl = document.createElement('p');
        textEl.className = 'story-text';
        textEl.textContent = step.text;
        stepEl.appendChild(textEl);
        var imgEl = document.createElement('img');
        imgEl.className = 'story-image';
        imgEl.src = step.imageUrl;
        imgEl.alt = 'Story illustration';
        stepEl.appendChild(imgEl);
        storyCanvas.appendChild(stepEl);

        playPreFetchedAudio();
        isFirstStep = false;
        resolve();
      }

      function check() {
        fetch(statusUrl).then(function (res) { return res.json(); }).then(function (data) {
          if (data.status === 'done') {
            log('IMG', 'First image ready — presenting');
            presentWithImage();
          } else if (data.status === 'failed') {
            log('IMG', 'First image generation failed');
            speakWithoutImage();
          } else if (++attempts < maxAttempts) {
            if (attempts % 5 === 0) log('IMG', 'Still waiting for image... attempt ' + attempts);
            setTimeout(check, interval);
          } else {
            log('IMG', 'Image poll timed out after ' + maxAttempts + ' attempts');
            speakWithoutImage();
          }
        }).catch(function (err) {
          if (++attempts < maxAttempts) {
            setTimeout(check, interval);
          } else {
            log('ERR', 'Image status poll failed', err);
            speakWithoutImage();
          }
        });
      }
      check();
    });
  }

  // Poll the image URL until the server has finished generating it
  function pollForImage(imageUrl, stepEl, maxAttempts, interval) {
    log('IMG', 'Polling for image in background', { imageUrl: imageUrl });
    maxAttempts = maxAttempts || 30;
    interval = interval || 2000;
    var attempts = 0;
    var statusUrl = imageUrl.replace('/image/', '/image-status/');

    function check() {
      fetch(statusUrl).then(function (res) { return res.json(); }).then(function (data) {
        if (data.status === 'done') {
          log('IMG', 'Background image ready — showing');
          var imgEl = document.createElement('img');
          imgEl.className = 'story-image';
          imgEl.src = imageUrl;
          imgEl.alt = 'Story illustration';
          imgEl.loading = 'lazy';
          if (stepEl) stepEl.appendChild(imgEl);
          showFullscreenImage(imageUrl);
        } else if (data.status === 'failed') {
          log('IMG', 'Background image generation failed — skipping');
        } else if (++attempts < maxAttempts) {
          setTimeout(check, interval);
        }
      }).catch(function () {
        if (++attempts < maxAttempts) setTimeout(check, interval);
      });
    }
    check();
  }

  // ── Fullscreen Image Mode ──
  var fullscreenOverlay = document.getElementById('fullscreen-overlay');
  var fullscreenImg = document.getElementById('fullscreen-img');

  function showFullscreenImage(imageUrl) {
    fullscreenImg.src = imageUrl;
    fullscreenOverlay.hidden = false;
    document.getElementById('header').hidden = true;
  }

  function hideFullscreenImage() {
    fullscreenOverlay.hidden = true;
    document.getElementById('header').hidden = false;
  }

  // ── Story List (Sidebar) ──
  async function loadStoryList() {
    try {
      var response = await fetch('/api/stories');
      var stories = await response.json();
      storyList.innerHTML = '';
      stories.forEach(function (story) {
        var li = document.createElement('li');
        li.className = 'story-item';
        li.textContent = story.title || story.theme || ('Story ' + story.id);
        li.setAttribute('data-story-id', story.id);
        li.addEventListener('click', function () {
          loadStory(story.id);
          closeSidebar();
        });
        storyList.appendChild(li);
      });
    } catch (error) {
      console.error('Failed to load stories:', error);
      showToast(i18n[currentLanguage].errorLoadStories, 'error');
    }
  }

  async function loadStory(storyId) {
    try {
      var response = await fetch('/api/story/' + storyId);
      var data = await response.json();
      currentStoryId = storyId;

      // Clear canvas
      storyCanvas.innerHTML = '';

      // Render all steps
      if (data.steps && data.steps.length) {
        data.steps.forEach(function (step) {
          renderStoryStep(step);
        });
      }
    } catch (error) {
      console.error('Failed to load story:', error);
      showToast(i18n[currentLanguage].errorLoadStory, 'error');
    }
  }

  sidebarClose.addEventListener('click', closeSidebar);

  function closeSidebar() {
    sidebar.classList.remove('open');
  }

  // ── New Story Button ──
  function restartWizard() {
    log('FLOW', 'Restarting wizard');
    currentStoryId = null;
    isFirstStep = true;
    isReplaying = false;
    generateImages = true;
    wizardGenre = null;
    wizardSetting = null;
    wizardCharacter = null;
    preferKeyboard = false;
    storyCanvas.innerHTML = '';
    stopTTSPlayback();
    if (isRecording) stopRecording();
    hideFullscreenImage();
    document.getElementById('header').hidden = true;
    hideSubtitle();
    hideLoading();
    micArea.classList.remove('auto-hide');
    closeSidebar();
    showMenuButton();
    document.body.classList.remove('story-mode');

    // Reset URL to root when navigating away from replay or other routes
    if (window.location.pathname !== '/') {
      history.pushState(null, '', '/');
    }

    // Hide main app, show language screen
    app.hidden = true;
    audienceScreen.hidden = true;
    lengthScreen.hidden = true;
    wizardScreen.hidden = true;
    languageScreen.hidden = false;
  }

  newStoryBtn.addEventListener('click', restartWizard);

  // ── Subtitle Helpers ──
  function showSubtitle(text) {
    subtitleText.textContent = text;
    subtitleBar.hidden = false;
    subtitleBar.classList.add('visible');
  }

  function hideSubtitle() {
    subtitleBar.classList.remove('visible');
    subtitleBar.hidden = true;
    subtitleText.textContent = '';
  }

  // ── Mic Visibility ──
  function showMic() {
    if (preferKeyboard) {
      showKeyboardInput();
      return;
    }
    restoreMicButtons();
    micArea.hidden = false;
  }

  function hideMic() {
    // Remove keyboard input form if present
    var existingForm = micArea.querySelector('.keyboard-input-form');
    if (existingForm) existingForm.remove();
    micArea.hidden = true;
  }

  // Restore original mic-area buttons (undo hidden, mic visible, keyboard visible)
  function restoreMicButtons() {
    // Remove keyboard input form if present
    var existingForm = micArea.querySelector('.keyboard-input-form');
    if (existingForm) existingForm.remove();
    micBtn.hidden = false;
    keyboardBtn.hidden = false;
    undoBtn.hidden = true;
  }

  // ── Keyboard Input Mode ──
  function showKeyboardInput() {
    preferKeyboard = true;
    stopTTSPlayback();
    hideSubtitle();

    // Hide the standard buttons
    micBtn.hidden = true;
    keyboardBtn.hidden = true;
    undoBtn.hidden = true;

    // Remove existing form if any
    var existingForm = micArea.querySelector('.keyboard-input-form');
    if (existingForm) existingForm.remove();

    // Build inline form
    var form = document.createElement('form');
    form.className = 'keyboard-input-form';

    // Mic-switch button (back to voice mode)
    var micSwitchBtn = document.createElement('button');
    micSwitchBtn.type = 'button';
    micSwitchBtn.className = 'keyboard-mic-btn';
    micSwitchBtn.setAttribute('aria-label', i18n[currentLanguage].micTooltip);
    micSwitchBtn.innerHTML = '<svg class="icon"><use href="#icon-mic"/></svg>';

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = currentStoryId
      ? (i18n[currentLanguage].keyboardPlaceholder || 'What happens next?')
      : (i18n[currentLanguage].keyboardTooltip || 'Type your input');
    input.setAttribute('aria-label', i18n[currentLanguage].keyboardTooltip || 'Type your input');

    var submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'keyboard-submit-btn';
    submitBtn.textContent = '→';

    form.appendChild(micSwitchBtn);
    form.appendChild(input);
    form.appendChild(submitBtn);
    micArea.appendChild(form);
    micArea.hidden = false;

    input.focus();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      finalTranscript = text;
      input.value = '';
      submitVoiceInput();
    });

    micSwitchBtn.addEventListener('click', function () {
      preferKeyboard = false;
      form.remove();
      restoreMicButtons();
      micArea.hidden = false;
    });
  }

  // ── Loading Overlay ──
  function showLoading(centered) {
    // Update loading text based on context
    var loadingText = loading.querySelector('[data-i18n]');
    if (loadingText) {
      loadingText.textContent = currentStoryId
        ? i18n[currentLanguage].continuing
        : i18n[currentLanguage].loading;
    }
    if (centered) {
      loading.classList.add('centered');
    } else {
      loading.classList.remove('centered');
    }
    loading.hidden = false;
  }

  function hideLoading() {
    loading.hidden = true;
    loading.classList.remove('centered');
  }

  // ── Toast Notifications ──
  // type: 'info' | 'warning' | 'error'
  // info/warning auto-dismiss after 3s; error requires manual dismiss
  function showToast(message, type) {
    type = type || 'info';
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    var msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);

    if (type === 'error') {
      var closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', function () {
        dismissToast(toast);
      });
      toast.appendChild(closeBtn);
    }

    document.body.appendChild(toast);
    // Force reflow for transition
    toast.offsetHeight;
    toast.classList.add('visible');

    if (type !== 'error') {
      setTimeout(function () {
        dismissToast(toast);
      }, 3000);
    }
  }

  function dismissToast(toast) {
    toast.classList.remove('visible');
    setTimeout(function () {
      toast.remove();
    }, 400);
  }

  // ── Text Input Fallback ──
  function showTextFallback() {
    micArea.innerHTML = '';
    var form = document.createElement('form');
    form.className = 'text-fallback';

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-fallback-input';
    input.placeholder = i18n[currentLanguage].micTooltip;
    input.setAttribute('aria-label', i18n[currentLanguage].micTooltip);

    var btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'text-fallback-btn';
    btn.textContent = '→';

    form.appendChild(input);
    form.appendChild(btn);
    micArea.appendChild(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      finalTranscript = text;
      input.value = '';
      submitVoiceInput();
    });
  }

  // ── URL-based replay: auto-start if /replay/:id ──
  (function checkReplayUrl() {
    var match = window.location.pathname.match(/^\/replay\/([^\/]+)/);
    if (match) {
      var storyId = decodeURIComponent(match[1]);
      log('FLOW', 'Auto-starting replay from URL: ' + storyId);
      replayStory(storyId, true);
    }
  })();

  window.addEventListener('popstate', function () {
    var match = window.location.pathname.match(/^\/replay\/([^\/]+)/);
    if (match) {
      var storyId = decodeURIComponent(match[1]);
      replayStory(storyId, true);
    } else if (isReplaying) {
      isReplaying = false;
      stopTTSPlayback();
      hideFullscreenImage();
      showMenuButton();
      micArea.classList.remove('auto-hide');
    }
  });

})();
