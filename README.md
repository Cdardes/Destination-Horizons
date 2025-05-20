# The Mansion Mystery - 3D

A 3D web-based mystery game where you play as a detective investigating a disappearance at Blackwood Manor. Explore rooms, collect clues, interview suspects, and solve the mystery before time runs out!

## Features

- Immersive 3D environment using Three.js
- First-person exploration of the mansion
- Interactive objects and evidence collection
- Character dialogues and suspect interviews
- Time-based gameplay mechanics
- Beautiful atmospheric lighting
- Modern user interface

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mansion-mystery-3d.git
cd mansion-mystery-3d
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## How to Play

1. Use your mouse to look around and WASD keys to move
2. Click on objects to interact with them
3. Collect clues and evidence
4. Interview suspects
5. Make an accusation when you think you've solved the case
6. Be careful - you only have 20 turns to solve the mystery!

## Controls

- WASD: Move around
- Mouse: Look around
- Left Click: Interact with objects/suspects
- E: Open inventory
- ESC: Open menu

## Development

The game is built using:
- Three.js for 3D rendering
- Vite for development and building
- JavaScript ES6+

### Project Structure

```
mansion-mystery-3d/
├── src/
│   ├── main.js           # Main game initialization
│   ├── gameState.js      # Game state management
│   ├── models/           # 3D models and assets
│   └── components/       # Game components
├── public/              # Static assets
├── index.html           # Entry point
└── package.json         # Project configuration
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Original text-based game concept
- Three.js community
- All contributors and testers
