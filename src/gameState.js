export class GameState {
    constructor() {
        this.playerName = "Detective";
        this.inventory = [];
        this.discoveredClues = new Set();
        this.interviewedSuspects = new Set();
        this.currentLocation = 'entrance_hall';
        this.gameOver = false;
        this.accusationMade = false;
        this.turns = 0;
        this.maxTurns = 20;
        
        this.locations = {
            "entrance_hall": {
                name: "Entrance Hall",
                description: "A grand entrance hall with a magnificent chandelier. The marble floor shows recent signs of activity.",
                items: ["muddy_footprint"],
                connections: ["library", "dining_room", "grand_staircase"],
                suspects: ["butler"]
            },
            "library": {
                name: "Library",
                description: "Walls of ancient books and a cozy fireplace. Something seems out of place...",
                items: ["torn_page", "strange_letter"],
                connections: ["entrance_hall", "study"],
                suspects: ["professor"]
            },
            "dining_room": {
                name: "Dining Room",
                description: "An elegant dining room with a long table. Dinner appears to have been interrupted.",
                items: ["wine_glass", "napkin_note"],
                connections: ["entrance_hall", "kitchen"],
                suspects: ["maid"]
            },
            "kitchen": {
                name: "Kitchen",
                description: "A well-equipped kitchen with modern appliances. There's a strange smell in the air.",
                items: ["knife", "recipe_book"],
                connections: ["dining_room", "servant_quarters"],
                suspects: ["chef"]
            },
            "grand_staircase": {
                name: "Grand Staircase",
                description: "A sweeping staircase leading to the upper floor. A portrait watches your every move.",
                items: ["dropped_key"],
                connections: ["entrance_hall", "master_bedroom"],
                suspects: []
            },
            "master_bedroom": {
                name: "Master Bedroom",
                description: "The owner's luxurious bedroom. The bed is still made, but there are signs of a struggle.",
                items: ["broken_glasses", "secret_diary"],
                connections: ["grand_staircase"],
                suspects: ["heir"]
            }
        };

        this.items = {
            "muddy_footprint": "A fresh muddy footprint leading towards the library. The shoe size appears to be quite large.",
            "torn_page": "A page ripped from a diary: 'I know what they're planning. I must act tonight before it's too late.'",
            "strange_letter": "A threatening letter: 'Sign over the estate by midnight, or face the consequences.'",
            "wine_glass": "A wine glass with lipstick marks and traces of an unusual powder at the bottom.",
            "napkin_note": "A crumpled napkin with a hasty note: 'Kitchen. Midnight. Bring the documents.'",
            "knife": "A kitchen knife with an unusual stain. Could be rust... or something else.",
            "recipe_book": "A recipe book opened to a page about rare poisons, with recent annotations.",
            "dropped_key": "An ornate key to the master bedroom. Someone dropped it in a hurry.",
            "broken_glasses": "The owner's broken reading glasses. Signs of a struggle?",
            "secret_diary": "The owner's private diary, with recent entries about changing their will."
        };

        this.suspects = {
            "butler": {
                name: "Mr. Hawthorne (The Butler)",
                description: "A stern-looking butler who's served the family for 30 years.",
                dialogue: {
                    alibi: "I was polishing silver in the dining room all evening.",
                    motive: "The master recently mentioned reducing my pension.",
                    others: "I saw the professor acting suspiciously in the library."
                }
            },
            "professor": {
                name: "Professor Blackwood (The Owner's Brother)",
                description: "A scholarly man with a desperate need for research funding.",
                dialogue: {
                    alibi: "I was in the library, researching my next book.",
                    motive: "My research funding depends on my brother's approval.",
                    others: "The chef and maid were whispering about something in the kitchen."
                }
            },
            "maid": {
                name: "Miss Rose (The Maid)",
                description: "A young maid who knows all the mansion's secrets.",
                dialogue: {
                    alibi: "I was turning down the beds upstairs.",
                    motive: "The master caught me stealing once but gave me a second chance.",
                    others: "The heir was arguing with the master about the will earlier."
                }
            },
            "chef": {
                name: "Chef Laurent",
                description: "A temperamental French chef with a knowledge of exotic ingredients.",
                dialogue: {
                    alibi: "I was preparing tomorrow's menu in my quarters.",
                    motive: "The master threatened to replace me with a younger chef.",
                    others: "The butler was not in the dining room as he claims."
                }
            },
            "heir": {
                name: "Ms. Victoria Blackwood (The Heir)",
                description: "The owner's ambitious niece and primary heir.",
                dialogue: {
                    alibi: "I was in the garden taking an evening walk.",
                    motive: "Uncle was planning to change his will. Not that it matters now.",
                    others: "I heard the professor and butler arguing about money."
                }
            }
        };

        this.solution = {
            culprit: "professor",
            requiredClues: new Set(["strange_letter", "torn_page", "recipe_book"]),
            story: "Professor Blackwood, desperate for research funding, poisoned his brother to inherit the estate."
        };

        this.initializeUI();
    }

    initializeUI() {
        this.updateLocationName();
        this.updateTurnsRemaining();
        this.updateInventoryDisplay();
    }

    updateLocationName() {
        const locationNames = {
            'entrance_hall': 'Entrance Hall',
            'library': 'Library',
            'dining_room': 'Dining Room',
            'kitchen': 'Kitchen',
            'grand_staircase': 'Grand Staircase',
            'master_bedroom': 'Master Bedroom'
        };
        
        const locationElement = document.getElementById('location-name');
        if (locationElement) {
            locationElement.textContent = locationNames[this.currentLocation] || this.currentLocation;
        }
    }

    updateTurnsRemaining() {
        const turnsElement = document.getElementById('turns-remaining');
        if (turnsElement) {
            turnsElement.textContent = `Turns remaining: ${this.maxTurns - this.turns}`;
        }
    }

    updateInventoryDisplay() {
        const inventoryElement = document.getElementById('inventory-items');
        if (!inventoryElement) return;

        inventoryElement.innerHTML = '';
        this.inventory.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.textContent = item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            inventoryElement.appendChild(itemElement);
        });
    }

    addToInventory(item) {
        if (!this.inventory.includes(item)) {
            this.inventory.push(item);
            this.discoveredClues.add(item);
            this.updateInventoryDisplay();
            this.showNotification(`Added ${item.replace(/_/g, ' ')} to inventory`);
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    incrementTurns() {
        this.turns++;
        this.updateTurnsRemaining();
        
        if (this.turns >= this.maxTurns && !this.accusationMade) {
            this.gameOver = true;
            this.showNotification('Time\'s up! The trail has gone cold...');
            return true;
        }
        return false;
    }

    checkAccusation(accused) {
        this.accusationMade = true;
        this.gameOver = true;
        
        if (accused === this.solution.culprit && 
            Array.from(this.solution.requiredClues).every(clue => this.discoveredClues.has(clue))) {
            this.showNotification('Congratulations! You\'ve solved the case!');
            return true;
        } else {
            this.showNotification('Your accusation is incorrect or you lack sufficient evidence!');
            return false;
        }
    }

    setLocation(location) {
        this.currentLocation = location;
        this.updateLocationName();
    }

    addClue(clue) {
        if (this.items[clue]) {
            this.inventory.push(clue);
            this.discoveredClues.add(clue);
            return true;
        }
        return false;
    }

    addInterviewedSuspect(suspect) {
        if (this.suspects[suspect]) {
            this.interviewedSuspects.add(suspect);
            return true;
        }
        return false;
    }

    getLocationInfo(locationId) {
        return this.locations[locationId];
    }

    getSuspectInfo(suspectId) {
        return this.suspects[suspectId];
    }

    getItemInfo(itemId) {
        return this.items[itemId];
    }
} 