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
	clearHintState();
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
	var state = null;
	try { state = JSON.parse(localStorage.getItem("hintState")); } catch (e) {}
	if (!state) { state = Cookies.getJSON("hintState"); }
	state = state || defaultHintState();
	state.notes = state.notes || {};
	state.guesses = state.guesses || {};
	state.teams.forEach(function(t) {
		state.hints[t] = (state.hints[t] || []).map(function(r) {
			return Array.isArray(r) ? { hints: r, code: "" } : r;
		});
	});
	return state;
}

function saveHintState(state) {
	localStorage.setItem("hintState", JSON.stringify(state));
	Cookies.remove("hintState");
}

function clearHintState() {
	localStorage.removeItem("hintState");
	Cookies.remove("hintState");
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

function codeDigits(code) {
	return (code || "").replace(/[^1-4]/g, "").slice(0, 3);
}

function renderHints() {
	var state = loadHintState();
	if (state.teams.indexOf(activeTeam) === -1) {
		activeTeam = state.teams[0];
	}
	renderTeamTabs();
	renderBoard(state);
	var list = $("#hintList");
	list.empty();
	var rounds = state.hints[activeTeam] || [];
	rounds.forEach(function(r, idx) {
		var li = $("<li>");
		li.append($("<span class='round-n'>").text("Round " + (idx + 1)));
		if (r.code) {
			li.append($("<span class='round-code'>").text(r.code.split("").join("-")));
		} else {
			var inp = $("<input type='text' class='form-control form-control-sm round-code-input' inputmode='numeric' maxlength='3' placeholder='code?'>");
			inp.on("change", function() {
				var d = codeDigits($(this).val());
				if (d.length === 3) { setRoundCode(idx, d); }
			});
			li.append(inp);
		}
		li.append($("<span class='round-hints'>").text(r.hints.join(" / ")));
		list.append(li);
	});
	if (activeTeam === "Our team") {
		$("#teamNotesWrap").hide();
	} else {
		$("#teamNotesWrap").show();
		$("#teamNotesLabel").text("Your guesses for " + activeTeam);
		$("#teamNotes").val(state.notes[activeTeam] || "");
	}
}

function renderBoard(state) {
	var board = $("#numberBoard");
	board.empty();
	$("#teamBoardLabel").text(activeTeam === "Our team" ? "Our hints by number" : activeTeam + ": your guess for each number");
	var guesses = (state.guesses[activeTeam] || ["", "", "", ""]);
	var rounds = state.hints[activeTeam] || [];
	for (var n = 1; n <= 4; n++) {
		var bank = [];
		rounds.forEach(function(r) {
			var d = (r.code || "").split("");
			for (var i = 0; i < 3; i++) {
				if (d[i] === String(n) && r.hints[i]) { bank.push(r.hints[i]); }
			}
		});
		var card = $("<div class='num-card'>");
		card.append($("<div class='num-badge'>").text(n));
		var g = $("<input type='text' class='form-control form-control-sm guess-input' placeholder='Guess for " + n + "'>").val(guesses[n - 1] || "");
		(function(num) {
			g.on("input", function() { saveGuess(num, $(this).val()); });
		})(n);
		card.append(g);
		var chips = $("<div class='bank'>");
		if (bank.length === 0) {
			chips.append($("<span class='bank-empty'>").text("no hints yet"));
		}
		bank.forEach(function(w) { chips.append($("<span class='chip'>").text(w)); });
		card.append(chips);
		board.append($("<div class='col-6 col-md-3 mb-2'>").append(card));
	}
}

function saveGuess(num, val) {
	var state = loadHintState();
	var g = state.guesses[activeTeam] || ["", "", "", ""];
	g[num - 1] = val;
	state.guesses[activeTeam] = g;
	saveHintState(state);
}

function setRoundCode(idx, code) {
	var state = loadHintState();
	state.hints[activeTeam][idx].code = code;
	saveHintState(state);
	renderHints();
}

function addHints() {
	var round = [$("#hint1").val(), $("#hint2").val(), $("#hint3").val()];
	round = round.map(function(s) { return s.trim(); });
	if (!round.some(function(s) { return s.length > 0; })) {
		return;
	}
	var code = codeDigits($("#hintCode").val());
	if (code.length !== 3) { code = ""; }
	if (!code && activeTeam === "Our team") {
		var c = Cookies.getJSON("code");
		if (c) { code = c.join(""); }
	}
	var state = loadHintState();
	if (!state.hints[activeTeam]) {
		state.hints[activeTeam] = [];
	}
	state.hints[activeTeam].push({ hints: round, code: code });
	saveHintState(state);
	renderHints();
	$("#hint1, #hint2, #hint3, #hintCode").val("");
	$("#hint1").focus();
}

function saveTeamNotes() {
	var state = loadHintState();
	state.notes[activeTeam] = $("#teamNotes").val();
	saveHintState(state);
}

function prefillCustomWords() {
	var words = loadWords() || ["", "", "", ""];
	for (idx = 0; idx < 4; idx++) {
		$("#customWord" + idx).val(words[idx]);
	}
}

function saveCustomWords() {
	var words = [];
	for (idx = 0; idx < 4; idx++) {
		words.push($("#customWord" + idx).val().trim().toUpperCase());
	}
	if (words.some(function(w) { return w.length === 0; })) {
		return;
	}
	Cookies.set("words", words);
	setWords(words);
	$("#setWordsModal").modal("hide");
}

function saveCustomCode() {
	var digits = $("#customCodeInput").val().replace(/[^1-4]/g, "");
	if (digits.length !== 3) {
		$("#customCodeInput").addClass("is-invalid");
		return;
	}
	$("#customCodeInput").removeClass("is-invalid");
	var code = digits.split("").map(function(d) { return parseInt(d, 10); });
	Cookies.set("code", code);
	setCode(code);
	$("#customCodeModal").modal("hide");
}
