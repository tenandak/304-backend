import Team from './team.class.js';
import Deck from './deck.class.js';
import Round from './round.class.js';

export default class Game {
    constructor(players) {
        this.players = players;
        this.deck = new Deck();
        this.teams = this.createTeams(players);
        this.rounds = [];
        this.rounds.push(new Round(this.deck, players, 0));
        // this.beginRound();
    }

    createTeams() {
        for (var i = 0; i < 4; i++) {
    		var j = i % 2;
    		var teamId = j === 0 ? 'team13' : 'team24';
    		this.players[i].setTeamId(teamId);
    	}
        var team13 = new Team("team13", [this.players[0].getId(), this.players[2].getId()]);
        var team24 = new Team("team24", [this.players[1].getId(), this.players[3].getId()]);
    	return [team13, team24];
    }

    getActiveRound() {
        console.log('GET ACTIVE ROUNUD');
        return this.rounds[this.rounds.length -1];
    }
}