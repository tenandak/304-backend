export default class Player {
    constructor(id, index) {
        this.id = id;
        this.name = "PLAYER " + (index + 1);
        this.number = index;
        this.teamId = '';
        this.hand = [];
        this.isFirstHalfDealt = false;
    }

    setTeamId(id) {
        this.teamId = id;
    }

    getId() {
        return this.id;
    }

    getName() {
        return this.name;
    }

    getHand() {
        return this.hand;
    }

    addToHand(card) {
        this.hand.push(card);
    }

    hasFourCards() {
        return this.hand.length >= 4;
    }

    setIsFirstHalfDealt(isFirstHalfDealt) {
        this.isFirstHalfDealt = isFirstHalfDealt;
    }

    getIsFirstHalfDealt() {
        return this.isFirstHalfDealt;
    }
    
}