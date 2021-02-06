// const cards = require('./cards.json');

export default class Deck {
    constructor() {
        this.cards = this.createNewCards();
    }

    getDeck() {
        return this.cards;
    }

    shuffle() {
        this.cards.sort(() => Math.random() - 0.5);
        // Phaser.Utils.Array.Shuffle(this.cards);
    }

    cardAt(index) {
        return this.cards[index];
    }

    //TODO: unable to import json, need to refactor this out
    createNewCards() {
        return [{
            "filename": "clubs10",
            "value": 10,
            "type": "10",
            "suit": "club",
        },
        {
            "filename": "clubs7",
            "value": 0,
            "type": "7",
            "suit": "club",
        },
        {
            "filename": "clubs8",
            "value": 0,
            "type": "8",
            "suit": "club",
        },
        {
            "filename": "clubs9",
            "value": 20,
            "type": "9",
            "suit": "club",
        },
        {
            "filename": "clubsAce",
            "value": 11,
            "type": "ace",
            "suit": "club",
        },
        {
            "filename": "clubsJack",
            "value": 30,
            "type": "jack",
            "suit": "club",
        },
        {
            "filename": "clubsKing",
            "value": 3,
            "type": "10",
            "suit": "club",
        },
        {
            "filename": "clubsQueen",
            "value": 2,
            "type": "queen",
            "suit": "club",
        },
        {
            "filename": "diamonds10",
            "value": 10,
            "type": "10",
            "suit": "diamond",
        },
        {
            "filename": "diamonds7",
            "value": 0,
            "type": "7",
            "suit": "diamond",
        },
        {
            "filename": "diamonds8",
            "value": 0,
            "type": "8",
            "suit": "diamond",
        },
        {
            "filename": "diamonds9",
            "value": 20,
            "type": "9",
            "suit": "diamond",
        },
        {
            "filename": "diamondsAce",
            "value": 11,
            "type": "ace",
            "suit": "diamond",
        },
        {
            "filename": "diamondsJack",
            "value": 30,
            "type": "jack",
            "suit": "diamond",
        },
        {
            "filename": "diamondsKing",
            "value": 3,
            "type": "king",
            "suit": "diamond",
        },
        {
            "filename": "diamondsQueen",
            "value": 2,
            "type": "queen",
            "suit": "diamond",
        },
        {
            "filename": "hearts10",
            "value": 10,
            "type": "10",
            "suit": "heart",
        },
        {
            "filename": "hearts7",
            "value": 0,
            "type": "7",
            "suit": "heart",
        },
        {
            "filename": "hearts8",
            "value": 0,
            "type": "8",
            "suit": "heart",
        },
        {
            "filename": "hearts9",
            "value": 20,
            "type": "9",
            "suit": "heart",
        },
        {
            "filename": "heartsAce",
            "value": 11,
            "type": "ace",
            "suit": "heart",
        },
        {
            "filename": "heartsJack",
            "value": 30,
            "type": "jack",
            "suit": "heart",
        },
        {
            "filename": "heartsKing",
            "value": 3,
            "type": "king",
            "suit": "heart",
        },
        {
            "filename": "heartsQueen",
            "value": 2,
            "type": "queen",
            "suit": "heart",
        },
        {
            "filename": "spades10",
            "value": 10,
            "type": "10",
            "suit": "spade",
        },
        {
            "filename": "spades7",
            "value": 0,
            "type": "7",
            "suit": "spade",
        },
        {
            "filename": "spades8",
            "value": 0,
            "type": "8",
            "suit": "spade",
        },
        {
            "filename": "spades9",
            "value": 20,
            "type": "9",
            "suit": "spade",
        },
        {
            "filename": "spadesAce",
            "value": 11,
            "type": "ace",
            "suit": "spade",
        },
        {
            "filename": "spadesJack",
            "value": 30,
            "type": "jack",
            "suit": "spade",
        },
        {
            "filename": "spadesKing",
            "value": 3,
            "type": "king",
            "suit": "spade",
        },
        {
            "filename": "spadesQueen",
            "value": 2,
            "type": "queen",
            "suit": "spade",
        }];
    }

}