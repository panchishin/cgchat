"use strict";

const mutations = [
	(x,i)=>x*(.5+Math.random()),
	(x,i)=>x*(2*Math.random()-1),
	(x,i)=>x*(1 + (Math.random()-0.5)*10/(i*i) ),
	(x,i)=>x+1,
	(x,i)=>x-1,
	(x,i)=>Math.round(x)
]

function isQuestion(text) {
	if (text != text.replace(/[^x0-9 \-\+\*%=\/\(\)\^\.]/,"")) return false;
	if (text.split("=").length != 2) return false;
	if (text.indexOf("x") == -1) return false;
	return true;
}

function parseQuestion(text) {
	text = text.replace(/[^x0-9 \-\+\*%=\/\(\)\^\.]/g,"");
	text = text.replace(/\^/g,"**");
	const parts = text.split("=");
	const equation = "(x)=>"+parts[0]+" - (" + parts[1] + ")";
	return eval(equation);
}

function solveQuestion(f) {
	if (typeof(f) == 'string') f = parseQuestion(f);
	let [x,e] = [0,1e99];
	for(let i=0; i<10000; i++) {
		for(let mutation of mutations) {
			let temp_x = mutation(x,i);
			let temp_e = Math.abs(f(temp_x));
			if (temp_e < e) {
				[x,e] = [temp_x,temp_e];
			}
		}
	}
	if (Math.abs(f(x)) < 0.001) { 
		return x;
	} else {
		return "end of the universe";
	}
}

exports.isQuestion = isQuestion;
exports.solveQuestion = solveQuestion;
