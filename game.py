import os
import time
import random
from colorama import init, Fore, Style
import pyfiglet

# Initialize colorama
init()

class Game:
    def __init__(self):
        self.player_name = ""
        self.inventory = []
        self.current_location = "entrance_hall"
        self.discovered_clues = set()
        self.interviewed_suspects = set()
        self.game_over = False
        self.accusation_made = False
        self.turns = 0
        self.max_turns = 20  # Add some urgency to the game
        
        # Game state
        self.locations = {
            "entrance_hall": {
                "name": "Entrance Hall",
                "description": "A grand entrance hall with a magnificent chandelier. The marble floor shows recent signs of activity.",
                "items": ["muddy_footprint"],
                "connections": ["library", "dining_room", "grand_staircase"],
                "suspects": ["butler"]
            },
            "library": {
                "name": "Library",
                "description": "Walls of ancient books and a cozy fireplace. Something seems out of place...",
                "items": ["torn_page", "strange_letter"],
                "connections": ["entrance_hall", "study"],
                "suspects": ["professor"]
            },
            "dining_room": {
                "name": "Dining Room",
                "description": "An elegant dining room with a long table. Dinner appears to have been interrupted.",
                "items": ["wine_glass", "napkin_note"],
                "connections": ["entrance_hall", "kitchen"],
                "suspects": ["maid"]
            },
            "kitchen": {
                "name": "Kitchen",
                "description": "A well-equipped kitchen with modern appliances. There's a strange smell in the air.",
                "items": ["knife", "recipe_book"],
                "connections": ["dining_room", "servant_quarters"],
                "suspects": ["chef"]
            },
            "grand_staircase": {
                "name": "Grand Staircase",
                "description": "A sweeping staircase leading to the upper floor. A portrait watches your every move.",
                "items": ["dropped_key"],
                "connections": ["entrance_hall", "master_bedroom"],
                "suspects": []
            },
            "master_bedroom": {
                "name": "Master Bedroom",
                "description": "The owner's luxurious bedroom. The bed is still made, but there are signs of a struggle.",
                "items": ["broken_glasses", "secret_diary"],
                "connections": ["grand_staircase"],
                "suspects": ["heir"]
            }
        }
        
        self.items = {
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
        }

        self.suspects = {
            "butler": {
                "name": "Mr. Hawthorne (The Butler)",
                "description": "A stern-looking butler who's served the family for 30 years.",
                "dialogue": {
                    "alibi": "I was polishing silver in the dining room all evening.",
                    "motive": "The master recently mentioned reducing my pension.",
                    "others": "I saw the professor acting suspiciously in the library."
                }
            },
            "professor": {
                "name": "Professor Blackwood (The Owner's Brother)",
                "description": "A scholarly man with a desperate need for research funding.",
                "dialogue": {
                    "alibi": "I was in the library, researching my next book.",
                    "motive": "My research funding depends on my brother's approval.",
                    "others": "The chef and maid were whispering about something in the kitchen."
                }
            },
            "maid": {
                "name": "Miss Rose (The Maid)",
                "description": "A young maid who knows all the mansion's secrets.",
                "dialogue": {
                    "alibi": "I was turning down the beds upstairs.",
                    "motive": "The master caught me stealing once but gave me a second chance.",
                    "others": "The heir was arguing with the master about the will earlier."
                }
            },
            "chef": {
                "name": "Chef Laurent",
                "description": "A temperamental French chef with a knowledge of exotic ingredients.",
                "dialogue": {
                    "alibi": "I was preparing tomorrow's menu in my quarters.",
                    "motive": "The master threatened to replace me with a younger chef.",
                    "others": "The butler was not in the dining room as he claims."
                }
            },
            "heir": {
                "name": "Ms. Victoria Blackwood (The Heir)",
                "description": "The owner's ambitious niece and primary heir.",
                "dialogue": {
                    "alibi": "I was in the garden taking an evening walk.",
                    "motive": "Uncle was planning to change his will. Not that it matters now.",
                    "others": "I heard the professor and butler arguing about money."
                }
            }
        }

        # The actual solution to the mystery
        self.solution = {
            "culprit": "professor",
            "required_clues": {"strange_letter", "torn_page", "recipe_book"},
            "story": "Professor Blackwood, desperate for research funding, poisoned his brother to inherit the estate."
        }

    def clear_screen(self):
        os.system('cls' if os.name == 'nt' else 'clear')

    def print_title(self):
        title = pyfiglet.figlet_format("The Mansion Mystery", font="big")
        print(Fore.RED + title + Style.RESET_ALL)

    def print_location(self):
        location = self.locations[self.current_location]
        print(f"\n{Fore.YELLOW}=== {location['name']} ==={Style.RESET_ALL}")
        print(f"{Fore.CYAN}{location['description']}{Style.RESET_ALL}\n")
        
        # Show available suspects in the room
        if location['suspects']:
            print(f"{Fore.MAGENTA}People present in this room:{Style.RESET_ALL}")
            for suspect in location['suspects']:
                print(f"- {self.suspects[suspect]['name']}")

    def get_player_name(self):
        self.clear_screen()
        self.print_title()
        print(Fore.GREEN + "\nWelcome, Detective. Before we begin, please state your name:" + Style.RESET_ALL)
        self.player_name = input("> ").strip()
        print(f"\n{Fore.YELLOW}Detective {self.player_name}, you've been called to investigate a mysterious disappearance at Blackwood Manor...")
        print("\nThe owner of the manor, Lord Richard Blackwood, has vanished during dinner.")
        print("Time is of the essence - you have limited time to solve this case.")
        print(f"You must gather evidence and interview suspects to uncover the truth!{Style.RESET_ALL}")
        time.sleep(3)

    def show_menu(self):
        print(f"\n{Fore.YELLOW}Time remaining: {self.max_turns - self.turns} turns{Style.RESET_ALL}")
        print("\nWhat would you like to do?")
        print("1. Look around")
        print("2. Check inventory")
        print("3. Move to another room")
        print("4. Examine something")
        print("5. Talk to someone")
        print("6. Make an accusation")
        print("7. Quit game")
        
        choice = input("\nEnter your choice (1-7): ")
        return choice

    def look_around(self):
        location = self.locations[self.current_location]
        print("\nYou carefully examine the room...")
        time.sleep(1)
        if location['items']:
            print(f"\n{Fore.GREEN}You notice:{Style.RESET_ALL}")
            for item in location['items']:
                print(f"- {item.replace('_', ' ').title()}")
        else:
            print("\nThere's nothing notable here.")

    def check_inventory(self):
        if not self.inventory:
            print("\nYour inventory is empty.")
            return
        print(f"\n{Fore.GREEN}Inventory contents:{Style.RESET_ALL}")
        for item in self.inventory:
            print(f"- {item.replace('_', ' ').title()}")
            print(f"  {Fore.CYAN}Note: {self.items[item]}{Style.RESET_ALL}")

    def move_to_room(self):
        location = self.locations[self.current_location]
        print("\nConnected rooms:")
        for i, room in enumerate(location['connections'], 1):
            print(f"{i}. {self.locations[room]['name']}")
        
        try:
            choice = int(input("\nEnter room number to move to: ")) - 1
            if 0 <= choice < len(location['connections']):
                self.current_location = location['connections'][choice]
                self.print_location()
                self.turns += 1
            else:
                print("\nInvalid room number!")
        except ValueError:
            print("\nPlease enter a valid number!")

    def examine_something(self):
        location = self.locations[self.current_location]
        if not location['items']:
            print("\nThere's nothing here to examine.")
            return
            
        print("\nWhat would you like to examine?")
        for i, item in enumerate(location['items'], 1):
            print(f"{i}. {item.replace('_', ' ').title()}")
            
        try:
            choice = int(input("\nEnter item number: ")) - 1
            if 0 <= choice < len(location['items']):
                item = location['items'][choice]
                print(f"\n{Fore.GREEN}{self.items[item]}{Style.RESET_ALL}")
                if item not in self.inventory:
                    self.inventory.append(item)
                    location['items'].remove(item)
                    print(f"{Fore.YELLOW}Item added to your inventory.{Style.RESET_ALL}")
                    self.discovered_clues.add(item)
                    self.turns += 1
            else:
                print("\nInvalid item number!")
        except ValueError:
            print("\nPlease enter a valid number!")

    def talk_to_suspect(self):
        location = self.locations[self.current_location]
        if not location['suspects']:
            print("\nThere's no one here to talk to.")
            return

        print("\nWho would you like to talk to?")
        for i, suspect in enumerate(location['suspects'], 1):
            print(f"{i}. {self.suspects[suspect]['name']}")

        try:
            choice = int(input("\nEnter person number: ")) - 1
            if 0 <= choice < len(location['suspects']):
                suspect = location['suspects'][choice]
                self.interview_suspect(suspect)
                self.interviewed_suspects.add(suspect)
                self.turns += 1
            else:
                print("\nInvalid person number!")
        except ValueError:
            print("\nPlease enter a valid number!")

    def interview_suspect(self, suspect):
        suspect_info = self.suspects[suspect]
        print(f"\n{Fore.YELLOW}Interviewing {suspect_info['name']}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{suspect_info['description']}{Style.RESET_ALL}\n")

        while True:
            print("\nWhat would you like to ask about?")
            print("1. Where were you at the time of the disappearance?")
            print("2. What was your relationship with the victim?")
            print("3. Did you notice anything suspicious?")
            print("4. End conversation")

            choice = input("\nEnter your choice (1-4): ")

            if choice == '1':
                print(f"\n{suspect_info['name']}: {suspect_info['dialogue']['alibi']}")
            elif choice == '2':
                print(f"\n{suspect_info['name']}: {suspect_info['dialogue']['motive']}")
            elif choice == '3':
                print(f"\n{suspect_info['name']}: {suspect_info['dialogue']['others']}")
            elif choice == '4':
                break
            else:
                print("\nInvalid choice!")

            input("\nPress Enter to continue...")

    def make_accusation(self):
        if len(self.discovered_clues) < 3:
            print(f"\n{Fore.RED}Warning: You haven't gathered many clues yet. Are you sure you want to make an accusation?{Style.RESET_ALL}")
        
        print("\nWho do you want to accuse of the crime?")
        for i, (suspect_id, suspect) in enumerate(self.suspects.items(), 1):
            print(f"{i}. {suspect['name']}")

        try:
            choice = int(input("\nEnter suspect number: ")) - 1
            if 0 <= choice < len(self.suspects):
                suspect_id = list(self.suspects.keys())[choice]
                self.check_accusation(suspect_id)
            else:
                print("\nInvalid suspect number!")
        except ValueError:
            print("\nPlease enter a valid number!")

    def check_accusation(self, accused):
        self.accusation_made = True
        self.game_over = True
        
        print(f"\n{Fore.YELLOW}You've accused {self.suspects[accused]['name']}!{Style.RESET_ALL}")
        time.sleep(1)
        
        if accused == self.solution['culprit'] and self.solution['required_clues'].issubset(self.discovered_clues):
            print(f"\n{Fore.GREEN}Congratulations! You've solved the case!{Style.RESET_ALL}")
            print(f"\n{self.solution['story']}")
            print(f"\nYou solved the case in {self.turns} turns!")
        else:
            print(f"\n{Fore.RED}Your accusation is incorrect or you lack sufficient evidence!{Style.RESET_ALL}")
            print("\nThe real culprit gets away, and your reputation as a detective is tarnished...")
            print(f"\nGame Over! You played for {self.turns} turns.")

    def check_game_over(self):
        if self.turns >= self.max_turns and not self.accusation_made:
            print(f"\n{Fore.RED}Time's up! You took too long to solve the case.{Style.RESET_ALL}")
            print("\nThe trail has gone cold, and the culprit has escaped...")
            self.game_over = True
            return True
        return False

    def play(self):
        self.get_player_name()
        
        while not self.game_over:
            self.clear_screen()
            self.print_title()
            self.print_location()
            
            if self.check_game_over():
                break
                
            choice = self.show_menu()
            
            if choice == '1':
                self.look_around()
            elif choice == '2':
                self.check_inventory()
            elif choice == '3':
                self.move_to_room()
            elif choice == '4':
                self.examine_something()
            elif choice == '5':
                self.talk_to_suspect()
            elif choice == '6':
                self.make_accusation()
            elif choice == '7':
                print("\nThank you for playing The Mansion Mystery!")
                self.game_over = True
            else:
                print("\nInvalid choice! Please try again.")
            
            if not self.game_over:
                input("\nPress Enter to continue...")

if __name__ == "__main__":
    game = Game()
    game.play() 