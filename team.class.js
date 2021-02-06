export default class Team {
    constructor(id, playerIds) {
        this.id = id;
        this.givingPoints = 13;
		this.winningPoints = 0;
		this.playerIds = playerIds;
    }
}