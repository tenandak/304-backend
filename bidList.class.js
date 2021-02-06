export default class BidList {

    constructor(players, starterIndex, socket, io) {
        this.bidList = [];
        this.starterIndex = starterIndex;
        this.socket = socket;
        this.io = io;
        this.createBidList(players);
    }

    createBidList(players) {
        players.forEach(p => {
            this.bidList.push({
                playerId: p.getId(),
                bid: 0
            })
        });

        const player = players[this.starterIndex];
        this.io.emit('promptBid', player.getId(), 170, false, true, this.bidList, "Player " + player.getName() + " is selecting a bid", false);
    }

    manageBidList() {
    this.socket.on('promptBid', function (id, minimum, isForced, canAskPartner, bidList, title, keepPrevBid) {
        //TODO: bid management (keep all values here and just display popups)
        // console.log('RECEIVED BID:')
    });

    }
    
}