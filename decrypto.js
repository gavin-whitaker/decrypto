var wordList;

function loadWordList() {
	var wordList;

	$.ajax({
            url : "wordlist.txt",
            dataType: "text",
            success : function (data) {
            	wordList = data.split("\n");
            },
            async: false
        });
	return wordList;
}

function pickWords(numWords) {
	return _.sample(wordList, numWords);
}

function generateCode() {
	var code = _.sample([1,2,3,4], 3);
	Cookies.set("code", code);
	setCode(code);
	$('#codeModal').modal('show');
}

function setCode(code) {
	for(idx = 0; idx < 3; idx++) {
		$('#code' + idx).text(code[idx]);
	}
	$('#revealCodeButton').show();
}

function setWords(words) {
	for(idx = 0; idx < 4; idx++) {
		$('#word' + idx).text(words[idx]);
	}
}

function loadWords() {
	return Cookies.getJSON("words");
}

function loadCode() {
	var code = Cookies.getJSON("code");
	if (code) {
		setCode(code);
	} else {
		$('#revealCodeButton').hide();
	}
}

function newGame() {
	var words = pickWords(4);
	Cookies.set("words", words);
	Cookies.remove("code");
	Cookies.remove("hintState");
	activeTeam = "Our team";
	renderHints();
	$('#revealCodeButton').hide();
	return words;
}

function toggleFullScreen() {
	if (screenfull.isFullscreen) {
		screenfull.exit();
	} else {
		screenfull.request();
	}
	setFullScreenIcon();
}

function setFullScreenIcon() {
    if (screenfull.isFullscreen) {
		$('#enableFullScreen').hide();
		$('#disableFullScreen').show();
    } else {
		$('#enableFullScreen').show();
		$('#disableFullScreen').hide();
    }
}

function startNewGame() {
	setWords(newGame());
}

function disableScreenLock() {
	var noSleep = new NoSleep();
	noSleep.enable();
}

function initScreenfull() {
	var noSleep = new NoSleep();

	if (screenfull.enabled) {
		screenfull.on('change', () => {
			if (screenfull.isFullscreen) {
				noSleep.enable();
			} else {
				noSleep.disable();
			}
		});
        setInterval(setFullScreenIcon, 200);
    } else {
        $('#fullScreenButton').hide();
        $('#disableScreenLockModal').modal('show');
    }
}

function initialize() {
	initScreenfull();
	renderHints();

	wordList = loadWordList();
	loadCode();

	var words = loadWords();

	if (words) {
		setWords(words);
	} else {
		/*
		startNewGame();
		$('#newGameModalCancelButton').hide();
		$('#newGameModal').modal({
			show: true,
			keyboard: false,
			backdrop: 'static'
		});
		*/
		$('#newGameModal').modal('show');
	}
}

function defaultHintState() {
	return { teams: ["Our team", "Team 2"], hints: { "Our team": [], "Team 2": [] }, notes: {} };
}

function loadHintState() {
	return Cookies.getJSON("hintState") || defaultHintState();
}

function saveHintState(state) {
	Cookies.set("hintState", state);
}

var activeTeam = "Our team";

function renderTeamTabs() {
	var state = loadHintState();
	var tabs = $("#teamTabs");
	tabs.empty();
	state.teams.forEach(function(team) {
		var li = $("<li class='nav-item'>");
		var a = $("<a class='nav-link' href='#'>").text(team);
		if (team === activeTeam) {
			a.addClass("active");
		}
		a.click(function(e) {
			e.preventDefault();
			activeTeam = team;
			renderHints();
		});
		li.append(a);
		tabs.append(li);
	});
	var addLi = $("<li class='nav-item'>");
	var addA = $("<a class='nav-link' href='#'>").text("+ Add team");
	addA.click(function(e) {
		e.preventDefault();
		addTeam();
	});
	addLi.append(addA);
	tabs.append(addLi);
}

function addTeam() {
	var state = loadHintState();
	var name = "Team " + (state.teams.length + 1);
	state.teams.push(name);
	state.hints[name] = [];
	saveHintState(state);
	activeTeam = name;
	renderHints();
}

function renderHints() {
	var state = loadHintState();
	if (state.teams.indexOf(activeTeam) === -1) {
		activeTeam = state.teams[0];
	}
	renderTeamTabs();
	var list = $("#hintList");
	list.empty();
	var rounds = state.hints[activeTeam] || [];
	for (idx = 0; idx < rounds.length; idx++) {
		list.append($("<li>").text("Round " + (idx + 1) + ": " + rounds[idx].join(" / ")));
	}
	if (activeTeam === "Our team") {
		$("#teamNotesWrap").hide();
	} else {
		$("#teamNotesWrap").show();
		$("#teamNotesLabel").text("Your guesses for " + activeTeam);
		$("#teamNotes").val(state.notes[activeTeam] || "");
	}
}

function addHints() {
	var round = [$("#hint1").val(), $("#hint2").val(), $("#hint3").val()];
	round = round.map(function(s) { return s.trim(); });
	if (!round.some(function(s) { return s.length > 0; })) {
		return;
	}
	var state = loadHintState();
	if (!state.hints[activeTeam]) {
		state.hints[activeTeam] = [];
	}
	state.hints[activeTeam].push(round);
	saveHintState(state);
	renderHints();
	$("#hint1, #hint2, #hint3").val("");
	$("#hint1").focus();
}

function saveTeamNotes() {
	var state = loadHintState();
	state.notes[activeTeam] = $("#teamNotes").val();
	saveHintState(state);
}
