import BidList from "./bidList.class.js";

export default class Round {
    constructor(deck, players, startingPlayerIndex) {
        this.deck = deck;
        this.startingPlayerIndex = startingPlayerIndex;
        this.players = players;
        this.bidList = null;

        this.finalBid = 0;
        this.finalTrump = null;
        this.setupRound();
    }

    setupRound() {
        this.deck.shuffle();
        this.dealFirstHalf();
    }

    dealFirstHalf() {
        let playerIndex = this.startingPlayerIndex;
        for (var i = 0; i < 16; i++) {
            let player = this.players[playerIndex];
            player.addToHand(this.deck.cardAt(i));
            if (player.hasFourCards()) {
                this.players.push(player);
                playerIndex = (playerIndex + 1) % 4;
            } 
        }
    }

    beginFirstBid(socket, io) {
        this.bidList = new BidList(this.players, this.startingPlayerIndex, socket, io);
    }

}

